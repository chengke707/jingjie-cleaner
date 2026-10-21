import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { decodeRepairLog, summarizeRepair } from './repair-results.mjs';

export const repairSteps = {
  'flush-dns': [{ id: 'dns', title: '清掉旧的网址解析缓存' }],
  'repair-components': [{ id: 'dism', title: '修复 Windows 组件库' }, { id: 'dism-verify', title: '深度复检 Windows 组件库' }, { id: 'sfc', title: '检查并修复 Windows 系统文件' }, { id: 'sfc-verify', title: '复检 Windows 系统文件' }]
};
const validId = id => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const stepIds = Object.values(repairSteps).flat().map(step => step.id);
const systemFreeSpace = async () => { const disk = await fs.statfs(path.parse(process.env.SystemRoot || 'C:\\Windows').root); return Number(disk.bavail) * Number(disk.bsize); };
const active = job => ['starting', 'running'].includes(job?.status);
const readJson = async file => JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
async function writeJson(file, value) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value), 'utf8');
  await fs.rename(temp, file);
}
const psQuote = value => `'${value.replace(/'/g, "''")}'`;

// One elevated worker executes the selected fixed operations. No command comes from the browser.
export function launchRepair({ appDir, directory, actions }) {
  const worker = `& ${psQuote(path.join(appDir, 'repair-system.ps1'))} -JobDirectory ${psQuote(directory)} -Actions ${psQuote(actions.join(','))}`;
  const encoded = Buffer.from(worker, 'utf16le').toString('base64');
  const command = `$ErrorActionPreference='Stop'; try { $p=Start-Process -FilePath "$env:SystemRoot\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}' -Wait -PassThru; exit $p.ExitCode } catch { exit 1223 }`;
  const child = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, stdio: 'ignore' });
  const completion = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code)); });
  return { pid: child.pid, completion };
}

export function createRepairJobs({ dataDir, appDir, launch = launchRepair, freeSpace = systemFreeSpace, alive = pid => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } } }) {
  const root = path.join(dataDir, '.repairs');
  const latest = path.join(root, 'latest.json');
  let starting = false;
  let inFlight = false;
  async function get(id) {
    let meta;
    if (id && !validId(id)) throw new Error('无效的修复记录');
    try { meta = await readJson(latest); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (id && meta?.id !== id) {
      try { meta = await readJson(path.join(root, id, 'job.json')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.access(path.join(root, id, 'progress.json')); const stat = await fs.stat(path.join(root, id)); meta = { id, createdAt: stat.birthtime.toISOString() }; }
    }
    if (!meta) return null;
    const directory = path.join(root, meta.id);
    let job;
    try { job = { ...meta, ...await readJson(path.join(directory, 'progress.json')) }; } catch { job = meta; }
    if (active(job) && !inFlight && !alive(job.pid) && !alive(meta.launcherPid)) {
      job = { ...job, status: 'interrupted', message: '修复进程已退出，未收到完整结果。请查看记录后再决定是否重试。', finishedAt: new Date().toISOString() };
      job.steps = job.steps.map(step => ['pending', 'running'].includes(step.status) ? { ...step, status: 'interrupted' } : step);
      await writeJson(path.join(directory, 'progress.json'), job);
    }
    job.steps = (job.steps || []).map(step => ({ ...step, title: step.title || Object.values(repairSteps).flat().find(item => item.id === step.id)?.title || step.id }));
    const texts = {};
    if (!active(job)) for (const step of job.steps) { if (stepIds.includes(step.id)) texts[step.id] = (await log(job.id, step.id)).text; }
    return summarizeRepair(job, texts);
  }
  async function history() {
    let entries;
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const results = await Promise.all(entries.filter(entry => entry.isDirectory() && validId(entry.name)).map(async entry => { try { return await get(entry.name); } catch { return null; } }));
    return results.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async function start(actions) {
    if (!Array.isArray(actions) || !actions.length || actions.length > 2 || new Set(actions).size !== actions.length || actions.some(action => !Object.hasOwn(repairSteps, action))) throw new Error('请选择支持的修复项目');
    if (starting) throw new Error('已有修复正在启动');
    starting = true;
    try {
      if (inFlight || active(await get())) throw new Error('已有修复正在执行，请等待结果');
      const id = crypto.randomUUID();
      const directory = path.join(root, id);
      await fs.mkdir(directory, { recursive: true });
      const job = { id, actions, status: 'starting', createdAt: new Date().toISOString(), message: '等待 Windows 管理员授权；同意后自动执行所选项目。', steps: actions.flatMap(action => repairSteps[action].map(step => ({ ...step, status: 'pending', message: '等待执行' }))) };
      if (actions.includes('repair-components')) {
        const available = await freeSpace();
        if (!Number.isFinite(available)) throw new Error('无法读取系统盘可用空间，本次未启动修复。请先检查磁盘。');
        if (available < 5 * 1024 ** 3) {
          job.status = 'blocked'; job.finishedAt = new Date().toISOString();
          job.message = `系统盘仅剩 ${(available / 1024 ** 3).toFixed(1)} GB。本批次未执行任何修复，请先释放至至少 5 GB（建议 10 GB）后重试。`;
          job.steps = job.steps.map(step => ({ ...step, status: 'skipped', message: '空间不足，本批次未执行。' }));
          job.steps.find(step => step.id === 'dism').nextAction = { type: 'cleanup', label: '去清理系统盘', detail: '先审查候选文件。移入同盘隔离区不会释放空间，确认不再需要后永久删除才会释放。' };
          await writeJson(path.join(directory, 'job.json'), job); await writeJson(latest, job);
          return job;
        }
      }
      inFlight = true;
      try { await writeJson(path.join(directory, 'job.json'), job); await writeJson(latest, job); } catch (error) { inFlight = false; throw error; }
      let launched;
      try { launched = launch({ appDir, directory, actions }); }
      catch (error) { launched = { completion: Promise.reject(error) }; }
      const completed = launched.completion.then(code => ({ code }), error => ({ error: error.message }));
      job.launcherPid = launched.pid;
      let persistenceError;
      try { await writeJson(path.join(directory, 'job.json'), job); await writeJson(latest, job); }
      catch (error) { persistenceError = error; }
      void (async () => {
        const outcome = await completed;
        try {
          const current = await get();
          if (active(current)) {
            const cancelled = outcome.code === 1223;
            const result = { ...current, status: cancelled ? 'cancelled' : 'failed', finishedAt: new Date().toISOString(), message: cancelled ? '管理员授权被取消或无法启动，未执行修复。可重新点击开始修复。' : `修复进程结束但未返回完整结果（${outcome.error || outcome.code}）。请查看记录。` };
            result.steps = result.steps.map(step => ['pending', 'running'].includes(step.status) ? { ...step, status: cancelled ? 'skipped' : 'interrupted' } : step);
            await writeJson(path.join(directory, 'progress.json'), result);
          }
        } catch (error) { console.error('Repair result persistence:', error.message); }
        finally { inFlight = false; }
      })();
      if (persistenceError) throw new Error('已请求启动，但无法更新修复记录。请查看下方进度，勿重复启动。' + (persistenceError.code === 'ENOSPC' ? '磁盘空间已用尽。' : persistenceError.message));
      return job;
    } finally { starting = false; }
  }
  async function log(id, step) {
    if (!validId(id) || !stepIds.includes(step)) throw new Error('无效的修复记录');
    const file = path.join(root, id, `${step}.log`);
    try {
      const handle = await fs.open(file, 'r');
      try { const { size } = await handle.stat(); const buffer = Buffer.alloc(Math.min(size, 128 * 1024)); await handle.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length)); return { text: decodeRepairLog(buffer), truncated: size > buffer.length }; }
      finally { await handle.close(); }
    } catch (error) { if (error.code === 'ENOENT') return { text: '这一步尚未产生日志。', truncated: false }; throw error; }
  }
  return { get, history, start, log };
}
