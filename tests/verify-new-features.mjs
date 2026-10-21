import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
const root = process.cwd();
const appDir = root;
// Keep identity fixtures outside the checkout: its name may match an installed app.
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'jingjie-features-'));
const candidates = path.join(fixture, 'Candidates');
const stale = path.join(candidates, 'SyntheticUninstalledTool');
const recent = path.join(candidates, 'SyntheticRecentTool');
await fs.mkdir(stale, { recursive: true }); await fs.mkdir(recent, { recursive: true });
await fs.writeFile(path.join(stale, 'settings.dat'), 'synthetic leftover data');
await fs.writeFile(path.join(recent, 'active.dat'), 'synthetic recent data');
const old = new Date(Date.now() - 45 * 86400000);
await fs.utimes(path.join(stale, 'settings.dat'), old, old); await fs.utimes(stale, old, old);
const child = spawn(process.execPath, ['server.mjs'], { cwd: appDir, env: { ...process.env, LOCALAPPDATA: fixture, APPDATA: path.join(fixture, 'Roaming'), JINGJIE_LEFTOVER_ROOTS: candidates, JINGJIE_DATA_DIR: fixture, JINGJIE_PORT: '4177' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('error', reject); });
const base = 'http://127.0.0.1:4177';
async function request(url, body) { const response = await fetch(base + url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined); const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data)); return data; }
try {
  const scan = await request('/api/leftovers', {});
  assert.equal(scan.leftovers.length, 1); assert.equal(scan.leftovers[0].name, 'SyntheticUninstalledTool'); assert.equal(scan.leftovers[0].risk, 'review');
  console.log('PASS strict leftover scan finds stale directory and excludes recent directory');
  const moved = await request('/api/quarantine', { ids: [scan.leftovers[0].id] });
  assert.equal(moved.quarantined.length, 1); await assert.rejects(fs.access(path.join(stale, 'settings.dat')));
  const history = await request('/api/history'); assert.equal(history.history[0].action, 'quarantine'); assert.match(history.history[0].files[0].path, /SyntheticUninstalledTool/);
  console.log('PASS leftover uses quarantine and persistent path history');
  const restored = await request('/api/restore', { id: scan.leftovers[0].id }); assert.equal(restored.remaining, 0); assert.equal(await fs.readFile(path.join(stale, 'settings.dat'), 'utf8'), 'synthetic leftover data');
  console.log('PASS leftover restoration preserves content');
  for (const id of ['disk', 'update', 'network']) { const result = await request('/api/repair/check', { id }); assert.ok(['good', 'warning', 'error'].includes(result.status)); assert.ok(result.summary); }
  console.log('PASS disk, Windows Update and network checks return structured real results');
  const rejected = await fetch(base + '/api/repair/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'flush-dns' }) }); assert.equal(rejected.status, 400);
  console.log('PASS repair actions require explicit confirmation');
} finally { if (child.exitCode === null) child.kill(); }
