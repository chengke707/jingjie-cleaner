import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

export const repairSteps = {
  'flush-dns': [{ id: 'dns', title: '清掉旧的网址解析缓存' }],
  'repair-components': [{ id: 'dism', title: '修复 Windows 组件库' }, { id: 'sfc', title: '检查并修复 Windows 系统文件' }]
};
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

export function createRepairJobs({ dataDir, appDir, launch = launchRepair, alive = pid => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } } }) {
  const root = path.join(dataDir, '.repairs');
  const latest = path.join(root, 'latest.json');
  let starting = false;
  let inFlight = false;
  async function get() {
    let meta;
    try { meta = await readJson(latest); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    const directory = path.join(root, meta.id);
    let job;
    try { job = { ...meta, ...await readJson(path.join(directory, 'progress.json')) }; } catch { job = meta; }
    if (active(job) && !inFlight && !alive(job.pid) && !alive(meta.launcherPid)) {
      job = { ...job, status: 'interrupted', message: '修复进程已退出，未收到完整结果。请查看记录后再决定是否重试。', finishedAt: new Date().toISOString() };
      job.steps = job.steps.map(step => ['pending', 'running'].includes(step.status) ? { ...step, status: 'interrupted' } : step);
      await writeJson(path.join(directory, 'progress.json'), job);
    }
    return job;
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
      inFlight = true;
      try { await writeJson(latest, job); } catch (error) { inFlight = false; throw error; }
      let launched;
      try { launched = launch({ appDir, directory, actions }); }
      catch (error) { launched = { completion: Promise.reject(error) }; }
      const completed = launched.completion.then(code => ({ code }), error => ({ error: error.message }));
      job.launcherPid = launched.pid;
      await writeJson(latest, job);
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
      return job;
    } finally { starting = false; }
  }
  async function log(id, step) {
    if (!/^[a-f0-9-]{36}$/.test(id) || !['dns', 'dism', 'sfc'].includes(step)) throw new Error('无效的修复记录');
    const file = path.join(root, id, `${step}.log`);
    try {
      const handle = await fs.open(file, 'r');
      try { const { size } = await handle.stat(); const buffer = Buffer.alloc(Math.min(size, 128 * 1024)); await handle.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length)); return { text: buffer.toString('utf8').replace(/\u0000/g, ''), truncated: size > buffer.length }; }
      finally { await handle.close(); }
    } catch (error) { if (error.code === 'ENOENT') return { text: '这一步尚未产生日志。', truncated: false }; throw error; }
  }
  return { get, start, log };
}
