import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createComponentCheck, interpretComponentCheck, runComponentCheckDirect, runComponentCheckElevated } from '../component-check.mjs';

const healthy = { exitCode: 0, output: 'No component store corruption detected. The operation completed successfully.' };
const fixture = await fs.mkdtemp(path.join(process.cwd(), 'work', 'component-check-'));
let elevations = 0, release;
const check = createComponentCheck({ appDir: process.cwd(), dataDir: fixture, direct: async () => ({ exitCode: 740 }), elevated: () => { elevations++; return new Promise(resolve => { release = resolve; }); } });
const first = check(), second = check();
assert.equal(first, second);
await new Promise(resolve => setImmediate(resolve));
assert.equal(elevations, 1);
release(healthy);
assert.equal((await first).status, 'good');
const retry = check();
await new Promise(resolve => setImmediate(resolve));
release({ exitCode: 1223 });
assert.equal((await retry).status, 'error');
assert.match((await retry).summary, /取消/);
assert.equal(elevations, 2);
console.log('PASS reused non-admin backend elevates only the check; duplicate requests share one UAC; cancellation permits retry');

for (const result of [healthy, { exitCode: 112 }, { exitCode: null, timedOut: true }, { exitCode: 0, output: 'partial log' }]) {
  const direct = createComponentCheck({ direct: async () => result, elevated: () => { throw new Error('Must not elevate'); } });
  const actual = await direct();
  assert.equal(actual.status, result === healthy ? 'good' : 'error');
}
assert.equal(interpretComponentCheck({ exitCode: 0, output: 'The component store is repairable.' }).status, 'warning');
assert.match(interpretComponentCheck({ exitCode: 0, output: 'The component store cannot be repaired.' }).summary, /无法/);
assert.match(interpretComponentCheck({ exitCode: 740 }).detail, /740/);
assert.match(interpretComponentCheck({ exitCode: -1, output: 'Error 0x80070070' }).detail, /空间不足/);
console.log('PASS disk-full, timeout, cancelled UAC, incomplete output and damaged health never report success');

const directResult = await runComponentCheckDirect(async (file, args) => {
  assert.match(file, /System32[\\/]DISM.exe$/i);
  assert.deepEqual(args, ['/Online', '/Cleanup-Image', '/CheckHealth', '/English']);
  throw Object.assign(new Error('permission denied'), { code: 740, stdout: 'Error: 740', stderr: '' });
});
assert.equal(directResult.exitCode, 740);
assert.match(directResult.output, /740/);
console.log('PASS direct check uses absolute Windows executable and preserves real failure code');

const options = { appDir: process.cwd(), dataDir: fixture };
const elevated = await runComponentCheckElevated({ ...options, run: async (file, args) => {
  assert.match(file, /System32[\\/]WindowsPowerShell[\\/]v1.0[\\/]powershell.exe$/i);
  assert.match(args.at(-1), /-Verb RunAs/);
  const encoded = args.at(-1).match(/-EncodedCommand ([A-Za-z0-9+/=]+)/)[1];
  const worker = Buffer.from(encoded, 'base64').toString('utf16le');
  assert.match(worker, /check-system\.ps1/);
  assert.doesNotMatch(worker, /repair-system|RestoreHealth|scannow/);
  const directory = worker.match(/-ResultDirectory '([^']+)'$/)[1];
  await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(healthy));
  return { stdout: '', stderr: '' };
} });
assert.deepEqual(elevated, healthy);
const cancelled = await runComponentCheckElevated({ ...options, run: async () => { throw Object.assign(new Error('cancel'), { code: 1223 }); } });
assert.equal(cancelled.exitCode, 1223);
const missing = await runComponentCheckElevated({ ...options, run: async () => ({ stdout: '' }) });
assert.equal(interpretComponentCheck(missing).status, 'error');
console.log('PASS elevated check reads persisted native result; cancellation and missing result stay failed, with no real UAC or repairs in tests');
