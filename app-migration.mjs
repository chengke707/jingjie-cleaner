import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const systemDrive = (process.env.SystemDrive || 'C:').replace(/[\\/]$/, '').toUpperCase();
const under = (candidate, parent) => {
  if (!candidate || !parent) return false;
  const file = path.win32.resolve(candidate).toLowerCase();
  const root = path.win32.resolve(parent).toLowerCase();
  const separator = String.fromCharCode(92);
  const prefix = root.endsWith(separator) ? root : `${root}${separator}`;
  return file === root || file.startsWith(prefix);
};

export function buildAppMigrationInventory({ apps = [], disks = [], appxVolumes = [], windowsDrive = systemDrive } = {}) {
  const system = windowsDrive.replace(/[\\/]$/, '').toUpperCase();
  const targets = disks.filter(disk => disk.DriveLetter && disk.DriveType === 'Fixed' && `${disk.DriveLetter.toUpperCase()}:` !== system)
    .map(disk => {
      const volume = appxVolumes.find(item => !item.IsOffline && !item.IsSystemVolume && String(item.PackageStorePath || '').match(/^[A-Za-z]:/)?.[0].slice(0, 2).toUpperCase() === `${disk.DriveLetter.toUpperCase()}:`);
      return { drive: disk.DriveLetter.toUpperCase(), label: disk.FileSystemLabel || '', free: Number(disk.SizeRemaining || 0), appxVolumeName: volume?.Name || null };
    });
  const found = apps.filter(item => item.InstallLocation && under(item.InstallLocation, `${system}\\`))
    .filter(item => item.Kind !== 'store' || (!item.NonRemovable && !item.IsFramework && !item.IsResourcePackage && under(item.InstallLocation, `${system}\\Program Files\\WindowsApps`)))
    .filter(item => !under(item.InstallLocation, `${system}\\Windows`))
    .map(item => {
      const isStore = item.Kind === 'store';
      return {
        name: item.DisplayName || item.Name || '未知应用',
        publisher: item.Publisher || '发布者未知',
        path: item.InstallLocation,
        size: Number(item.EstimatedSize || 0) * 1024,
        used: /^\d{8}$/.test(item.InstallDate || '') ? `${item.InstallDate.slice(0, 4)}-${item.InstallDate.slice(4, 6)}-${item.InstallDate.slice(6, 8)}` : '未知',
        kind: isStore ? 'store' : 'desktop',
        packageFullName: isStore ? item.PackageFullName : null,
        moveSupported: isStore && targets.some(target => target.appxVolumeName)
      };
    });
  const unique = new Map();
  for (const app of found) {
    const key = app.packageFullName || `${app.name.toLocaleLowerCase()}|${app.path.toLocaleLowerCase()}`;
    if (!unique.has(key)) unique.set(key, app);
  }
  return { apps: [...unique.values()].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name)), targets };
}

async function runElevatedMove({ appDir, dataDir, packageFullName, targetVolumeName }) {
  const root = path.join(dataDir, '.migrations');
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, 'appx-'));
  const psQuote = value => `'${value.replace(/'/g, "''")}'`;
  const worker = `& ${psQuote(path.join(appDir, 'move-appx.ps1'))} -ResultDirectory ${psQuote(directory)} -PackageFullName ${psQuote(packageFullName)} -TargetVolumeName ${psQuote(targetVolumeName)}`;
  const encoded = Buffer.from(worker, 'utf16le').toString('base64');
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const launcherFile = path.join(directory, 'launcher.json');
  const command = `$ErrorActionPreference='Stop'; $record=[ordered]@{status='starting';exitCode=$null;error=''}; try { $p=Start-Process -FilePath '${powershell.replace(/'/g, "''")}' -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}' -Wait -PassThru; $record.status='exited'; $record.exitCode=$p.ExitCode } catch { $record.status='launch-failed'; $record.error=$_.Exception.Message; if ($_.Exception.NativeErrorCode -eq 1223 -or $_.Exception.InnerException.NativeErrorCode -eq 1223) { $record.exitCode=1223 } else { $record.exitCode=1 }; Write-Output $record.error } finally { try { [IO.File]::WriteAllText('${launcherFile.replace(/'/g, "''")}',($record | ConvertTo-Json -Compress),[System.Text.UTF8Encoding]::new($false)) } catch { Write-Output $_.Exception.Message } }; exit $record.exitCode`;
  let exitCode = 0, launcherOutput = '';
  try {
    const result = await execute(powershell, ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, encoding: 'utf8', timeout: 600000, maxBuffer: 1024 * 1024 });
    launcherOutput = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  } catch (error) {
    exitCode = typeof error.code === 'number' ? error.code : null;
    launcherOutput = `${error.stdout || ''}\n${error.stderr || ''}`.trim();
    if (error.killed) return { status: 'failed', summary: '迁移等待超时', detail: 'Windows 操作超过 10 分钟。请先在 Windows 设置中确认应用实际位置，再决定是否重试。' };
  }
  try {
    const result = JSON.parse((await fs.readFile(path.join(directory, 'result.json'), 'utf8')).replace(/^\uFEFF/, ''));
    return { ...result, output: result.output || launcherOutput };
  } catch {
    let launcher;
    try { launcher = JSON.parse(await fs.readFile(launcherFile, 'utf8')); } catch {}
    let started;
    try { started = JSON.parse(await fs.readFile(path.join(directory, 'started.json'), 'utf8')); } catch {}
    const actualExitCode = launcher?.exitCode ?? exitCode;
    if (actualExitCode === 1223) return { status: 'cancelled', summary: '已取消管理员授权', detail: '应用没有迁移；可以再次选择目标盘并重试。', output: launcher?.error || launcherOutput };
    const reason = launcher?.error || launcherOutput || (started ? 'Windows 已启动迁移操作，但工作程序未保存最终结果。' : 'Windows 管理员工作程序没有写入启动记录。');
    const code = `进程退出代码：${actualExitCode ?? '未返回'}。`;
    return { status: 'failed', summary: 'Windows 未返回迁移结果', detail: `${reason} ${code}没有确认应用已移动，不能视为成功。请查看 Windows 输出并重新扫描确认位置，再决定下一步。`, output: [reason, code].join('\n') };
  }
}

export function createAppMover({ appDir, dataDir, inventory, targets, move = runElevatedMove }) {
  let moving = false;
  return async function moveApp({ packageFullName, targetVolumeName, confirm }) {
    if (confirm !== true) throw new Error('请先确认应用和目标盘');
    if (typeof packageFullName !== 'string' || packageFullName.length > 300 || typeof targetVolumeName !== 'string' || targetVolumeName.length > 100) throw new Error('应用或目标盘信息无效');
    if (moving) throw new Error('已有应用正在迁移，请等待完成');
    moving = true;
    try {
      const [apps, volumes] = await Promise.all([inventory(), targets()]);
      const app = apps.find(item => item.Kind === 'store' && item.PackageFullName === packageFullName && !item.NonRemovable && !item.IsFramework && !item.IsResourcePackage && under(item.InstallLocation, `${systemDrive}\\Program Files\\WindowsApps`));
      if (!app) throw new Error('找不到这款可迁移的 Windows 应用。请重新扫描后再试。');
      const volume = volumes.find(item => item.Name === targetVolumeName && !item.IsOffline && !item.IsSystemVolume && /^[A-Za-z]:\\WindowsApps\\?$/i.test(item.PackageStorePath || '') && item.PackageStorePath.slice(0, 2).toUpperCase() !== systemDrive);
      if (!volume) throw new Error('目标盘不是 Windows 已登记的应用迁移盘。请重新扫描并选择列表中的目标盘。');
      const result = await move({ appDir, dataDir, packageFullName: app.PackageFullName, targetVolumeName: volume.Name });
      const current = (await inventory()).find(item => item.Kind === 'store' && item.PackageFullName === app.PackageFullName);
      return { ...result, currentLocation: current?.InstallLocation || '', appName: app.DisplayName || app.Name, targetDrive: volume.PackageStorePath.slice(0, 1).toUpperCase() };
    } finally { moving = false; }
  };
}
