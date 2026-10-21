import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
if (process.platform !== 'win32') throw new Error('These integration tests require Windows.');
await fs.mkdir('work', { recursive: true });
for (const file of ['verify-cleaner.mjs', 'verify-new-features.mjs', 'verify-repair-jobs.mjs', 'verify-repair-worker.ps1']) {
  const isPowerShell = file.endsWith('.ps1');
  const command = isPowerShell ? 'powershell.exe' : process.execPath;
  const args = isPowerShell ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', `tests/${file}`] : [`tests/${file}`];
  const child = spawn(command, args, { stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  if (code !== 0) process.exit(code || 1);
}
