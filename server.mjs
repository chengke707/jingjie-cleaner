import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createRepairJobs } from './repair-jobs.mjs';
import { createComponentCheck } from './component-check.mjs';
import { buildAppMigrationInventory, createAppMover } from './app-migration.mjs';

const execFileAsync = promisify(execFile);
const appDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.JINGJIE_DATA_DIR ? path.resolve(process.env.JINGJIE_DATA_DIR) : appDir;
const repairJobs = createRepairJobs({ dataDir, appDir });
const checkComponents = createComponentCheck({ dataDir, appDir });
let inventoryCache = { at: 0, items: [], disks: [], appxVolumes: [] };
let appMoveInventoryFlight;
const freshAppMoveInventory = () => appMoveInventoryFlight ||= softwareInventory(true).finally(() => { appMoveInventoryFlight = null; });
const moveApp = createAppMover({ appDir, dataDir, inventory: async () => (await freshAppMoveInventory()).items, targets: async () => (await freshAppMoveInventory()).appxVolumes });
const quarantineDir = path.join(dataDir, '.quarantine');
const manifestPath = path.join(quarantineDir, 'manifest.json');
const historyPath = path.join(quarantineDir, 'history.json');
const appMigrationHistoryPath = path.join(dataDir, '.migrations', 'history.json');
const port = Number(process.env.JINGJIE_PORT || 4173);
const host = '127.0.0.1';
const scanSessions = new Map();
const leftoverRoots = (process.env.JINGJIE_LEFTOVER_ROOTS ? process.env.JINGJIE_LEFTOVER_ROOTS.split(';') : [
  process.env.LOCALAPPDATA,
  process.env.APPDATA,
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs') : null
]).filter(Boolean).map((root) => path.resolve(root));
const protectedFolderNames = new Set([
  'temp', 'programs', 'packages', 'microsoft', 'windows', 'connecteddevicesplatform', 'comms',
  'crashdumps', 'd3dscache', 'history', 'inetcache', 'internet explorer', 'virtualstore',
  'application data', 'desktop', 'documents', 'downloads', 'pictures', 'videos', 'music'
]);

const scanRules = [
  { category: 'temp', name: '过期临时文件', root: path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp'), ageDays: 7, risk: 'safe' },
  { category: 'crash', name: '应用崩溃转储', root: path.join(process.env.LOCALAPPDATA || '', 'CrashDumps'), ageDays: 1, risk: 'safe', extensions: ['.dmp', '.mdmp'] },
  { category: 'cache', name: 'DirectX 着色器缓存', root: path.join(process.env.LOCALAPPDATA || '', 'D3DSCache'), ageDays: 2, risk: 'safe' },
  { category: 'report', name: 'Windows 错误报告', root: path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'WER'), ageDays: 7, risk: 'safe' }
];

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
async function body(req) { let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 1_000_000) throw new Error('请求过大'); } return data ? JSON.parse(data) : {}; }
async function readManifest() { try { return JSON.parse(await fsp.readFile(manifestPath, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } }
async function writeManifest(items) {
  await fsp.mkdir(quarantineDir, { recursive: true });
  const temporary = `${manifestPath}.tmp`;
  const handle = await fsp.open(temporary, 'w');
  try { await handle.writeFile(JSON.stringify(items, null, 2), 'utf8'); await handle.sync(); } finally { await handle.close(); }
  await fsp.rename(temporary, manifestPath);
}
async function readHistory() { try { return JSON.parse(await fsp.readFile(historyPath, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } }
async function readAppMigrationHistory() { try { return JSON.parse(await fsp.readFile(appMigrationHistoryPath, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } }
async function recordAppMigration(result, packageFullName) {
  const entries = await readAppMigrationHistory();
  entries.unshift({ ...result, key: packageFullName, recordedAt: new Date().toISOString() });
  await fsp.mkdir(path.dirname(appMigrationHistoryPath), { recursive: true });
  const temporary = `${appMigrationHistoryPath}.tmp`;
  await fsp.writeFile(temporary, JSON.stringify(entries.slice(0, 100), null, 2), 'utf8');
  await fsp.rename(temporary, appMigrationHistoryPath);
}
async function appendHistory(event) {
  const history = await readHistory();
  const files = event.files || [];
  history.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), ...event, files: files.slice(0, 1000), omitted: Math.max(0, files.length - 1000) });
  await fsp.mkdir(quarantineDir, { recursive: true });
  const temporary = `${historyPath}.tmp`;
  await fsp.writeFile(temporary, JSON.stringify(history.slice(0, 200), null, 2), 'utf8');
  await fsp.rename(temporary, historyPath);
}
let mutationBusy = false;
async function mutate(action) {
  if (mutationBusy) throw new Error('有文件操作正在进行，请稍后再试');
  mutationBusy = true;
  try { return await action(); } finally { mutationBusy = false; }
}
async function validatePath(filePath) {
  if (!isInsideAllowedRoot(filePath)) throw new Error('路径不在允许范围');
  let current = path.parse(filePath).root;
  for (const part of path.relative(current, filePath).split(path.sep)) {
    current = path.join(current, part);
    try { if ((await fsp.lstat(current)).isSymbolicLink()) throw new Error('跳过链接或联接目录'); }
    catch (error) { if (error.code === 'ENOENT') break; throw error; }
  }
}
function validateStored(filePath) {
  if (path.dirname(filePath) !== quarantineDir || !/^[a-f0-9-]{36}$/.test(path.basename(filePath))) throw new Error('隔离记录路径无效');
}

async function collectFiles(root, ageDays, extensions) {
  const files = []; const cutoff = Date.now() - ageDays * 86400000; let visited = 0;
  async function walk(dir, depth = 0) {
    if (depth > 12 || visited > 80000) return;
    let entries; try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (visited++ > 80000) break;
      const fullPath = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { await walk(fullPath, depth + 1); continue; }
      if (!entry.isFile()) continue;
      if (extensions && !extensions.includes(path.extname(entry.name).toLowerCase())) continue;
      try { await validatePath(fullPath); const stats = await fsp.lstat(fullPath); if (stats.mtimeMs < cutoff) files.push({ path: fullPath, size: stats.size, mtimeMs: stats.mtimeMs, ino: stats.ino }); } catch {}
    }
  }
  await walk(root); return files;
}

async function scan(category = 'all') {
  const chosen = scanRules.filter((rule) => category === 'all' || rule.category === category);
  const results = [];
  for (const rule of chosen) {
    const files = await collectFiles(rule.root, rule.ageDays, rule.extensions);
    if (!files.length) continue;
    const id = crypto.randomUUID(); scanSessions.set(id, { ...rule, files, createdAt: Date.now() });
    results.push({ id, name: rule.name, detail: `${files.length} 个超过 ${rule.ageDays} 天的文件`, path: rule.root, risk: rule.risk, size: files.reduce((sum, file) => sum + file.size, 0), category: rule.category, fileCount: files.length });
  }
  for (const [id, session] of scanSessions) if (Date.now() - session.createdAt > 3600000) scanSessions.delete(id);
  return results;
}

function isInsideAllowedRoot(filePath) {
  const resolved = path.resolve(filePath).toLowerCase();
  return [...scanRules.map((rule) => rule.root), ...leftoverRoots].some((allowed) => {
    const root = path.resolve(allowed).toLowerCase();
    return resolved.startsWith(`${root}${path.sep}`);
  });
}

function normalizeIdentity(value = '') { return String(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }
function directoryMatchesIdentity(directory, inventory) {
  const normalized = normalizeIdentity(directory);
  if (normalized.length < 3) return true;
  return inventory.some((item) => {
    const candidates = [item.DisplayName, item.Publisher, item.Name].map(normalizeIdentity).filter((token) => token.length >= 3);
    if (candidates.some((token) => normalized.includes(token) || token.includes(normalized))) return true;
    const location = item.InstallLocation ? path.resolve(item.InstallLocation).toLowerCase() : '';
    return location && (location === directory.toLowerCase() || location.startsWith(`${directory.toLowerCase()}${path.sep}`));
  });
}

async function softwareInventory(force = false) {
  if (!force && Date.now() - inventoryCache.at < 60000) return inventoryCache;
  const script = String.raw`
    [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
    $roots = @(
      'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
      'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
      'Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
    )
    $items = foreach ($root in $roots) {
      if (Test-Path $root) { Get-ChildItem $root -ErrorAction SilentlyContinue | ForEach-Object { Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue } }
    }
    $desktop = @($items | Where-Object DisplayName | Select-Object DisplayName, Publisher, EstimatedSize, InstallDate, InstallLocation, @{N='Kind';E={'desktop'}})
    $store = @(Get-AppxPackage -ErrorAction SilentlyContinue | Select-Object @{N='DisplayName';E={$_.Name}}, Publisher, @{N='EstimatedSize';E={0}}, @{N='InstallDate';E={''}}, InstallLocation, @{N='Kind';E={'store'}}, Name, PackageFullName, NonRemovable, IsFramework, IsResourcePackage)
    $disks = @(Get-Volume -ErrorAction SilentlyContinue | Where-Object DriveLetter | Select-Object DriveLetter, FileSystemLabel, DriveType, SizeRemaining)
    $appxVolumes = @(Get-AppxVolume -ErrorAction SilentlyContinue | Select-Object Name, PackageStorePath, IsOffline, IsSystemVolume)
    [pscustomobject]@{Apps=@($desktop + $store); Disks=$disks; AppxVolumes=$appxVolumes} | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, encoding: 'utf8', timeout: 30000, maxBuffer: 24 * 1024 * 1024 });
    const parsed = JSON.parse(stdout || '{}');
    const items = Array.isArray(parsed.Apps) ? parsed.Apps : parsed.Apps ? [parsed.Apps] : [];
    const disks = Array.isArray(parsed.Disks) ? parsed.Disks : parsed.Disks ? [parsed.Disks] : [];
    const appxVolumes = Array.isArray(parsed.AppxVolumes) ? parsed.AppxVolumes : parsed.AppxVolumes ? [parsed.AppxVolumes] : [];
    inventoryCache = { at: Date.now(), items, disks, appxVolumes }; return inventoryCache;
  } catch { return inventoryCache; }
}

async function runningExecutablePaths() {
  const script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object ExecutablePath | Select-Object -ExpandProperty ExecutablePath) | ConvertTo-Json -Compress";
  try { const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, encoding: 'utf8', timeout: 15000 }); const value = JSON.parse(stdout || '[]'); return (Array.isArray(value) ? value : [value]).map((item) => path.resolve(item).toLowerCase()); }
  catch { return []; }
}

async function collectDirectoryFiles(root) {
  const files = []; let visited = 0; let truncated = false;
  async function walk(directory, depth = 0) {
    if (depth > 14 || visited >= 50000) { truncated = true; return; }
    let entries; try { entries = await fsp.readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (visited++ >= 50000) { truncated = true; break; }
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(target, depth + 1);
      else if (entry.isFile()) { try { await validatePath(target); const stats = await fsp.lstat(target); files.push({ path: target, size: stats.size, mtimeMs: stats.mtimeMs, ino: stats.ino }); } catch {} }
    }
  }
  await walk(root); return { files, truncated };
}

async function scanLeftovers() {
  const inventory = (await softwareInventory()).items;
  if (!inventory.length) throw new Error('无法读取 Windows 安装清单，为避免误判已停止残留扫描');
  const running = await runningExecutablePaths();
  const candidates = []; const cutoff = Date.now() - 30 * 86400000; const seen = new Set();
  for (const root of leftoverRoots) {
    let entries; try { entries = await fsp.readdir(root, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || protectedFolderNames.has(entry.name.toLocaleLowerCase())) continue;
      const directory = path.resolve(root, entry.name); const key = directory.toLowerCase();
      if (seen.has(key)) continue; seen.add(key);
      let stats; try { stats = await fsp.lstat(directory); } catch { continue; }
      if (stats.mtimeMs >= cutoff || directoryMatchesIdentity(directory, inventory) || running.some((file) => file.startsWith(`${key}${path.sep}`))) continue;
      const collected = await collectDirectoryFiles(directory);
      if (!collected.files.length) continue;
      const newestChange = collected.files.reduce((latest, file) => Math.max(latest, file.mtimeMs), stats.mtimeMs);
      if (newestChange >= cutoff) continue;
      const id = crypto.randomUUID();
      scanSessions.set(id, { category: 'leftover', name: `疑似残留：${entry.name}`, root: directory, files: collected.files, createdAt: Date.now() });
      candidates.push({ id, name: entry.name, path: directory, category: 'leftover', risk: 'review', reason: '超过 30 天未修改，且未匹配已安装或正在运行的应用', lastModified: stats.mtime.toISOString(), fileCount: collected.files.length, size: collected.files.reduce((sum, file) => sum + file.size, 0), truncated: collected.truncated });
      if (candidates.length >= 80) break;
    }
  }
  return candidates.sort((a, b) => b.size - a.size);
}

async function pruneEmptyDirectories(root) {
  async function visit(directory) {
    let entries; try { entries = await fsp.readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) if (entry.isDirectory() && !entry.isSymbolicLink()) await visit(path.join(directory, entry.name));
    try { await fsp.rmdir(directory); } catch {}
  }
  await visit(root);
}

async function quarantine(ids) {
  const manifest = await readManifest(); const output = []; let skipped = 0;
  for (const id of ids) {
    const session = scanSessions.get(id); if (!session || Date.now() - session.createdAt > 3600000) continue;
    const entry = { id, name: session.name, path: session.root, size: 0, quarantinedAt: new Date().toISOString(), files: [] };
    manifest.push(entry);
    for (const file of session.files) {
      if (!isInsideAllowedRoot(file.path)) continue;
      try {
        await validatePath(file.path);
        const current = await fsp.lstat(file.path);
        if (!current.isFile() || current.size !== file.size || current.mtimeMs !== file.mtimeMs || current.ino !== file.ino) throw new Error('扫描后文件已变化');
        const destination = path.join(quarantineDir, crypto.randomUUID());
        const record = { original: file.path, stored: destination, size: file.size };
        entry.files.push(record);
        await writeManifest(manifest);
        try { await fsp.rename(file.path, destination); }
        catch (error) { entry.files.pop(); throw error; }
        entry.size += file.size;
        await writeManifest(manifest);
      } catch { skipped++; }
    }
    if (entry.files.length) { output.push({ id: entry.id, name: entry.name, path: entry.path, size: entry.size, quarantinedAt: entry.quarantinedAt }); }
    else manifest.splice(manifest.indexOf(entry), 1);
    if (session.category === 'leftover') await pruneEmptyDirectories(session.root);
    scanSessions.delete(id);
  }
  await writeManifest(manifest);
  if (output.length) {
    const movedFiles = output.flatMap((item) => {
      const entry = manifest.find((candidate) => candidate.id === item.id);
      return (entry?.files || []).map((file) => ({ path: file.original, size: file.size }));
    });
    await appendHistory({ action: 'quarantine', label: output.map((item) => item.name).join('、'), count: movedFiles.length, size: movedFiles.reduce((sum, file) => sum + file.size, 0), skipped, files: movedFiles });
  }
  return { quarantined: output, skipped };
}

async function restore(id) {
  const manifest = await readManifest(); const entry = manifest.find((item) => item.id === id); if (!entry) throw new Error('未找到隔离记录');
  let failed = 0; const restoredFiles = [];
  for (const file of [...entry.files]) {
    try {
      validateStored(file.stored); await validatePath(file.original);
      await fsp.mkdir(path.dirname(file.original), { recursive: true });
      // Exclusive creation refuses to overwrite any newer file at the original path.
      await fsp.copyFile(file.stored, file.original, fs.constants.COPYFILE_EXCL);
      await fsp.unlink(file.stored);
      entry.files.splice(entry.files.indexOf(file), 1);
      entry.size -= file.size;
      restoredFiles.push({ path: file.original, size: file.size });
      await writeManifest(manifest);
    } catch { failed++; }
  }
  if (!entry.files.length) await writeManifest(manifest.filter((item) => item.id !== id));
  if (restoredFiles.length) await appendHistory({ action: 'restore', label: entry.name, count: restoredFiles.length, size: restoredFiles.reduce((sum, file) => sum + file.size, 0), failed, files: restoredFiles });
  return { remaining: failed, restored: restoredFiles.length };
}

async function purge(id) {
  const manifest = await readManifest(); const entry = manifest.find((item) => item.id === id);
  if (!entry) throw new Error('未找到隔离记录');
  let freed = 0; let failed = 0; const deletedFiles = [];
  for (const file of [...entry.files]) {
    try {
      validateStored(file.stored);
      const stats = await fsp.lstat(file.stored);
      if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('隔离文件类型异常');
      await fsp.unlink(file.stored); freed += stats.size;
      deletedFiles.push({ path: file.original, size: stats.size });
      entry.files.splice(entry.files.indexOf(file), 1); entry.size -= file.size;
      await writeManifest(manifest);
    } catch (error) {
      if (error.code === 'ENOENT') { entry.files.splice(entry.files.indexOf(file), 1); await writeManifest(manifest); }
      else failed++;
    }
  }
  if (!entry.files.length) await writeManifest(manifest.filter((item) => item.id !== id));
  if (deletedFiles.length) await appendHistory({ action: 'purge', label: entry.name, count: deletedFiles.length, size: freed, failed, files: deletedFiles });
  return { freed, remaining: failed, deleted: deletedFiles.length };
}

async function installedApps(force = false) {
  const inventory = await softwareInventory(force);
  const all = inventory.items.filter((item) => item.Kind !== 'store').map((item) => ({
    name: item.DisplayName,
    publisher: item.Publisher || '发布者未知',
    size: Number(item.EstimatedSize || 0) * 1024,
    used: /^\d{8}$/.test(item.InstallDate || '') ? `${item.InstallDate.slice(0,4)}-${item.InstallDate.slice(4,6)}-${item.InstallDate.slice(6,8)}` : '未知',
    path: item.InstallLocation || '',
    status: '未评估'
  }));
  const unique = new Map(); all.forEach((app) => { if (!unique.has(app.name)) unique.set(app.name, app); });
  const migration = buildAppMigrationInventory({ apps: inventory.items, disks: inventory.disks, appxVolumes: inventory.appxVolumes });
  return { apps: [...unique.values()].sort((a, b) => b.size - a.size).slice(0, 200), migrationApps: migration.apps, targetDrives: migration.targets };
}

async function repairCheck(id) {
  if (id === 'update') {
    const script = String.raw`
      [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
      $service = Get-Service wuauserv -ErrorAction SilentlyContinue
      $pending = (Test-Path 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or (Test-Path 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired')
      [pscustomobject]@{Service=$(if($service){$service.Status.ToString()}else{'Missing'}); StartType=$(if($service){$service.StartType.ToString()}else{'Unknown'}); PendingReboot=$pending} | ConvertTo-Json -Compress
    `;
    try { const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, encoding: 'utf8', timeout: 15000 }); const data = JSON.parse(stdout); const warning = data.StartType === 'Disabled' || data.Service === 'Missing' || data.PendingReboot; return { status: warning ? 'warning' : 'good', summary: data.PendingReboot ? '有更新等待你重启电脑' : data.Service === 'Missing' ? '未找到更新服务' : data.StartType === 'Disabled' ? 'Windows 更新服务被禁用' : '更新服务未被禁用', detail: '这里只检查服务和重启状态；是否有补丁可用，请打开 Windows 更新查看。服务暂时停止不一定是故障。', action: 'open-update', actionLabel: '打开 Windows 更新' }; }
    catch (error) { return { status: 'error', summary: '检查失败', detail: error.message }; }
  }
  if (id === 'components') {
    if (['starting', 'running'].includes((await repairJobs.get())?.status)) return { status: 'warning', summary: '请等待当前修复结束', detail: '系统修复执行期间不重复启动组件库检查。' };
    return checkComponents();
  }
  if (id === 'network') {
    const script = String.raw`[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $proxy=(netsh winhttp show proxy | Out-String); $dns=@(Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object ServerAddresses | ForEach-Object ServerAddresses | Select-Object -Unique); [pscustomobject]@{Proxy=$proxy;Dns=$dns} | ConvertTo-Json -Compress -Depth 3`;
    try { const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, encoding: 'utf8', timeout: 20000 }); const data = JSON.parse(stdout); const proxy = /Direct access|直接访问/i.test(data.Proxy || ''); return { status: data.Dns?.length ? 'good' : 'warning', summary: data.Dns?.length ? `DNS：${data.Dns.slice(0, 3).join('、')}` : '未读取到 DNS 服务器', detail: proxy ? 'WinHTTP 未设置代理' : 'WinHTTP 可能设置了代理', action: 'flush-dns', actionLabel: '刷新 DNS 缓存' }; }
    catch (error) { return { status: 'error', summary: '网络配置读取失败', detail: error.message, action: 'flush-dns', actionLabel: '刷新 DNS 缓存' }; }
  }
  if (id === 'disk') {
    const drive = process.env.SystemDrive || 'C:\\';
    try { const stats = fs.statfsSync(drive); const free = stats.bavail * stats.bsize; const total = stats.blocks * stats.bsize; const percent = Math.round(free / total * 100); return { status: percent < 10 ? 'warning' : 'good', summary: `系统盘剩余 ${Math.round(free / 1024 / 1024 / 1024 * 10) / 10} GB（${percent}%）`, detail: percent < 10 ? '空间严重不足，建议优先清理大文件或卸载应用' : '可用空间比例正常', action: 'open-storage', actionLabel: '打开存储设置' }; }
    catch (error) { return { status: 'error', summary: '磁盘信息读取失败', detail: error.message }; }
  }
  throw new Error('未知检查项目');
}

async function repairAction(action) {
  if (action === 'open-app-settings') { spawn('explorer.exe', ['ms-settings:appsfeatures'], { detached: true, stdio: 'ignore' }).unref(); return { message: '已打开 Windows 已安装的应用设置' }; }
  if (action === 'open-update') { spawn('explorer.exe', ['ms-settings:windowsupdate'], { detached: true, stdio: 'ignore' }).unref(); return { message: '已打开 Windows 更新' }; }
  if (action === 'open-storage') { spawn('explorer.exe', ['ms-settings:storagesense'], { detached: true, stdio: 'ignore' }).unref(); return { message: '已打开 Windows 存储设置' }; }
  throw new Error('未知修复操作');
}

function openScannedLeftover(directory) {
  const resolved = path.resolve(directory);
  const permitted = [...scanSessions.values()].some((session) => session.category === 'leftover' && path.resolve(session.root).toLowerCase() === resolved.toLowerCase());
  if (!permitted) throw new Error('只能打开本次扫描识别的残留目录');
  spawn('explorer.exe', [resolved], { detached: true, stdio: 'ignore' }).unref();
  return { opened: true };
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/system') {
    let disk = { total: 0, free: 0, usedPercent: 0 };
    try { const stats = fs.statfsSync(process.env.SystemDrive || 'C:\\'); disk = { total: stats.blocks * stats.bsize, free: stats.bavail * stats.bsize, usedPercent: Math.round((1 - stats.bavail / stats.blocks) * 100) }; } catch {}
    const quarantined = (await readManifest()).map(({ files, ...item }) => item); return json(res, 200, { app: 'jingjie-cleaner', version: '0.3.5', disk, hostname: os.hostname(), quarantine: quarantined });
  }
  if (req.method === 'GET' && pathname === '/api/apps') return json(res, 200, await installedApps());
  if (req.method === 'GET' && pathname === '/api/apps/migrations') return json(res, 200, { results: await readAppMigrationHistory() });
  if (req.method === 'POST' && pathname === '/api/apps/scan') return json(res, 200, await installedApps(true));
  if (req.method === 'POST' && pathname === '/api/apps/move') {
    const data = await body(req);
    try {
      const result = await moveApp(data);
      try { await recordAppMigration(result, data.packageFullName); }
      catch (error) { result.historyWarning = `结果已返回，但写入本机记录失败：${error.message}`; }
      return json(res, 200, result);
    }
    catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'GET' && pathname === '/api/history') return json(res, 200, { history: await readHistory() });
  if (req.method === 'POST' && pathname === '/api/leftovers') return json(res, 200, { leftovers: await scanLeftovers() });
  if (req.method === 'POST' && pathname === '/api/repair/check') { const data = await body(req); return json(res, 200, await repairCheck(data.id)); }
  if (req.method === 'GET' && pathname === '/api/repair/job') return json(res, 200, { job: await repairJobs.get() });
  if (req.method === 'GET' && pathname === '/api/repair/history') return json(res, 200, { jobs: await repairJobs.history() });
  if (req.method === 'POST' && pathname === '/api/repair/start') {
    const data = await body(req);
    if (data.confirm !== true) return json(res, 400, { error: '请勾选项目并点击开始修复' });
    try { return json(res, 202, { job: await repairJobs.start(data.actions) }); }
    catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && pathname === '/api/repair/log') { const data = await body(req); return json(res, 200, await repairJobs.log(data.id, data.step)); }
  if (req.method === 'POST' && pathname === '/api/repair/action') { const data = await body(req); if (data.confirm !== true) return json(res, 400, { error: '需要用户确认' }); return json(res, 200, await repairAction(data.action)); }
  if (req.method === 'POST' && pathname === '/api/open-folder') { const data = await body(req); return json(res, 200, openScannedLeftover(data.path)); }
  if (req.method === 'POST' && pathname === '/api/scan') { const data = await body(req); return json(res, 200, { results: await scan(data.category) }); }
  if (req.method === 'POST' && pathname === '/api/quarantine') { const data = await body(req); return json(res, 200, await mutate(() => quarantine(Array.isArray(data.ids) ? data.ids : []))); }
  if (req.method === 'POST' && pathname === '/api/restore') { const data = await body(req); return json(res, 200, await mutate(() => restore(data.id))); }
  if (req.method === 'POST' && pathname === '/api/purge') { const data = await body(req); if (data.confirm !== 'PERMANENT_DELETE') return json(res, 400, { error: '需要明确确认永久删除' }); return json(res, 200, await mutate(() => purge(data.id))); }
  return json(res, 404, { error: '未找到接口' });
}

const server = http.createServer(async (req, res) => {
  try {
    const expectedHost = `${host}:${port}`;
    if (req.headers.host !== expectedHost) return json(res, 403, { error: '仅允许本机访问' });
    const expectedOrigin = `http://${expectedHost}`;
    if (req.headers.origin && req.headers.origin !== expectedOrigin) return json(res, 403, { error: '拒绝跨站请求' });
    if (req.method === 'POST' && !req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: '需要 JSON 请求' });
    const url = new URL(req.url, `http://${host}:${port}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url.pathname);
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    if (!['index.html', 'app.css', 'app.js'].includes(relative)) return json(res, 404, { error: '未找到文件' });
    const target = path.resolve(appDir, relative);
    if (!target.startsWith(appDir + path.sep) && target !== path.join(appDir, 'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
    const data = await fsp.readFile(target); res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data);
  } catch (error) { json(res, error.code === 'ENOENT' ? 404 : 500, { error: error.message }); }
});

server.listen(port, host, () => console.log(`净界已启动：http://${host}:${port}`));
