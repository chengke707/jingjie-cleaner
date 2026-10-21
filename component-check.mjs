import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const windows = process.env.SystemRoot || 'C:\\Windows';
const powershell = path.join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const quote = value => `'${value.replace(/'/g, "''")}'`;
const outputOf = result => `${result.stdout || ''}\n${result.stderr || ''}`.trim();

export function interpretComponentCheck({ exitCode, output = '', timedOut = false, error = '' }) {
  const result = { status: 'error', summary: '组件库检查未完成', detail: '', output: output.slice(-16384) };
  if (timedOut) result.detail = '检查或管理员授权等待超时，尚不能判断是否损坏。请确认授权窗口，并等待 Windows 更新结束后重试。';
  else if (exitCode === 1223) { result.summary = '已取消管理员授权'; result.detail = '本次没有完成检查。再次点击“检查”，在 Windows 授权窗口中选择“是”。'; }
  else if (exitCode === 740) result.detail = 'Windows 拒绝执行：检查进程仍没有管理员权限（740）。请检查管理员授权是否被系统策略阻止。';
  else if (exitCode === 112 || /0x80070070|not enough space/i.test(output)) result.detail = 'Windows 报告磁盘空间不足（112）。请先释放系统盘空间再检查。';
  else if (exitCode !== 0) result.detail = `Windows 检查失败（代码 ${exitCode ?? '未知'}）。${error || '展开下方输出查看实际原因。'}`;
  else {
    result.detail = '本次只查询组件库已有的损坏记录，没有修复系统文件，也不能替代全面检查。';
    if (/No component store corruption detected/i.test(output)) { result.status = 'good'; result.summary = '快速检查未发现组件库损坏记录'; }
    else if (/(?:cannot be repaired|non-repairable)/i.test(output)) { result.status = 'warning'; result.summary = 'Windows 报告组件库无法常规修复'; }
    else if (/component store is repairable/i.test(output)) { result.status = 'warning'; result.summary = 'Windows 报告组件库需要修复'; }
    else result.detail = '命令已退出，但输出中没有可确认的检查结论。请查看输出；本次不记为检查通过。';
  }
  return result;
}

export async function runComponentCheckDirect(run = execute) {
  try {
    const result = await run(path.join(windows, 'System32', 'DISM.exe'), ['/Online', '/Cleanup-Image', '/CheckHealth', '/English'], { windowsHide: true, encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
    return { exitCode: 0, output: outputOf(result) };
  } catch (error) { return { exitCode: typeof error.code === 'number' ? error.code : null, output: outputOf(error), timedOut: !!error.killed, error: error.message.slice(0, 1000) }; }
}

export async function runComponentCheckElevated({ appDir, dataDir, run = execute }) {
  const root = path.join(dataDir, '.checks');
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, 'components-'));
  const worker = `& ${quote(path.join(appDir, 'check-system.ps1'))} -ResultDirectory ${quote(directory)}`;
  const encoded = Buffer.from(worker, 'utf16le').toString('base64');
  const command = `$ErrorActionPreference='Stop'; try { $p=Start-Process -FilePath ${quote(powershell)} -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}' -Wait -PassThru; exit $p.ExitCode } catch { if ($_.Exception.NativeErrorCode -eq 1223 -or $_.Exception.InnerException.NativeErrorCode -eq 1223) { exit 1223 }; Write-Output $_.Exception.Message; exit 1 }`;
  try {
    await run(powershell, ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 1024 * 1024 });
  } catch (error) {
    return { exitCode: typeof error.code === 'number' ? error.code : null, timedOut: !!error.killed, output: outputOf(error), error: error.code === 1223 ? '' : '管理员检查进程未成功返回。' };
  }
  try { return JSON.parse((await fs.readFile(path.join(directory, 'result.json'), 'utf8')).replace(/^\uFEFF/, '')); }
  catch { return { exitCode: null, error: '未收到完整的管理员检查结果，本次不记为通过。' }; }
}

export function createComponentCheck({ appDir, dataDir, direct = runComponentCheckDirect, elevated = runComponentCheckElevated }) {
  let pending;
  return () => {
    if (!pending) pending = (async () => {
      try {
        let result = await direct();
        // Elevate only the fixed read-only check, even when a non-admin server is reused.
        if (result.exitCode === 740) result = await elevated({ appDir, dataDir });
        return interpretComponentCheck(result);
      } catch (error) { return interpretComponentCheck({ exitCode: null, error: error.code === 'ENOSPC' ? '磁盘空间不足，无法保存检查结果。' : error.message }); }
    })().finally(() => { pending = null; });
    return pending;
  };
}
