import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const appDir = path.resolve('.');
const fixture = await fs.mkdtemp(path.resolve('work/cleaner-fixture-'));
await fs.mkdir(path.join(fixture, 'Temp'));
await fs.mkdir(path.join(fixture, 'Documents'));
const oldFile = path.join(fixture, 'Temp', 'old.tmp');
const recentFile = path.join(fixture, 'Temp', 'recent.tmp');
const personal = path.join(fixture, 'Documents', 'important.txt');
await fs.writeFile(oldFile, 'synthetic-fixture-old');
await fs.writeFile(recentFile, 'synthetic-fixture-new');
await fs.writeFile(personal, 'synthetic-personal-file');
const oldDate = new Date(Date.now() - 15 * 86400000);
await fs.utimes(oldFile, oldDate, oldDate);
let child;
async function launch() {
  child = spawn(process.execPath, ['server.mjs'], { cwd: appDir, env: { ...process.env, LOCALAPPDATA: fixture, JINGJIE_DATA_DIR: fixture, JINGJIE_PORT: '4175' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('error', reject); child.once('exit', (code) => { if (code) reject(new Error(`Server exited ${code}`)); }); });
}
async function stop() { if (!child || child.exitCode !== null) return; const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited; }
const base = 'http://127.0.0.1:4175';
async function request(url, body, extra = {}) {
  const response = await fetch(`${base}${url}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) } : extra);
  const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data)); return data;
}
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log(`PASS ${message}`); }
try {
  await launch();
  const system = await request('/api/system'); check(system.disk.total > 0, 'real disk information');
  for (const target of ['/server.mjs', '/.quarantine/manifest.json', '/start.cmd']) {
    check((await fetch(base + target)).status === 404, `private file blocked: ${target}`);
  }
  check((await fetch(`${base}/api/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' }, body: '{}' })).status === 403, 'cross-origin mutation rejected');
  let scan = await request('/api/scan', { category: 'all' });
  check(scan.results.length === 1 && scan.results[0].fileCount === 1, 'only old whitelisted fixture identified');
  let id = scan.results[0].id;
  await fs.writeFile(oldFile, 'changed-since-scan');
  let move = await request('/api/quarantine', { ids: [id] });
  check(move.skipped === 1 && !move.quarantined.length, 'changed file skipped after scan');
  await fs.utimes(oldFile, oldDate, oldDate);
  scan = await request('/api/scan', { category: 'temp' }); id = scan.results[0].id;
  move = await request('/api/quarantine', { ids: [id] });
  check(move.quarantined.length === 1, 'fixture moved to quarantine');
  let history = await request('/api/history');
  check(history.history[0].action === 'quarantine' && history.history[0].files[0].path === oldFile, 'quarantine history records original path');
  check(await fs.readFile(recentFile, 'utf8') === 'synthetic-fixture-new' && await fs.readFile(personal, 'utf8') === 'synthetic-personal-file', 'recent and personal fixtures untouched');
  await stop(); await launch();
  const persisted = await request('/api/system'); check(persisted.quarantine.some(item => item.id === id), 'manifest persists after server restart');
  await fs.writeFile(oldFile, 'newer-conflicting-file');
  let restored = await request('/api/restore', { id });
  check(restored.remaining === 1 && await fs.readFile(oldFile, 'utf8') === 'newer-conflicting-file', 'restore refuses overwrite and retains quarantine');
  await fs.unlink(oldFile);
  restored = await request('/api/restore', { id });
  check(restored.remaining === 0 && await fs.readFile(oldFile, 'utf8') === 'changed-since-scan', 'restore preserves original content');
  history = await request('/api/history');
  check(history.history[0].action === 'restore', 'restore is recorded in history');
  await fs.utimes(oldFile, oldDate, oldDate);
  scan = await request('/api/scan', { category: 'temp' }); id = scan.results[0].id;
  await request('/api/quarantine', { ids: [id] });
  check((await fetch(`${base}/api/purge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })).status === 400, 'permanent deletion requires explicit confirmation');
  const purged = await request('/api/purge', { id, confirm: 'PERMANENT_DELETE' });
  check(purged.freed > 0 && purged.remaining === 0, 'only quarantined fixture permanently deleted');
  history = await request('/api/history');
  check(history.history[0].action === 'purge' && history.history[0].size === purged.freed, 'permanent deletion and freed size recorded');
  console.log(`${checks} checks passed. Fixture location: ${fixture}`);
} finally { await stop(); }
