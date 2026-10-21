import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
const root = process.cwd();
await fs.mkdir(path.join(root, 'work'), { recursive: true });
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'jingjie-ui-'));
await fs.mkdir(path.join(fixture, 'Temp'));
const leftoverRoot = path.join(fixture, 'Leftovers');
const leftoverDirectory = path.join(leftoverRoot, 'SyntheticOldAppData');
await fs.mkdir(leftoverDirectory, { recursive: true });
await fs.writeFile(path.join(leftoverDirectory, 'old.cfg'), 'synthetic old application data');
const leftoverDate = new Date(Date.now() - 45 * 86400000);
await fs.utimes(path.join(leftoverDirectory, 'old.cfg'), leftoverDate, leftoverDate); await fs.utimes(leftoverDirectory, leftoverDate, leftoverDate);
const testFile = path.join(fixture, 'Temp', 'interface-fixture.tmp');
await fs.writeFile(testFile, 'synthetic interface fixture');
const date = new Date(Date.now() - 12 * 86400000); await fs.utimes(testFile, date, date);
const backend = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, JINGJIE_PORT: '4176', LOCALAPPDATA: fixture, JINGJIE_LEFTOVER_ROOTS: leftoverRoot, JINGJIE_DATA_DIR: fixture }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => { backend.stdout.once('data', resolve); backend.once('error', reject); });
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=old', '--disable-gpu', '--disable-software-rasterizer', '--no-sandbox', '--remote-debugging-port=9226', `--user-data-dir=${path.join(fixture, 'browser')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws; let next = 0; const pending = new Map(); const errors = [];
async function cdp(method, params = {}) {
  const id = ++next;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Condition not met: ${expression}`);
}
try {
  let tabs;
  for (let i = 0; i < 80; i++) { try { tabs = await (await fetch('http://127.0.0.1:9226/json')).json(); break; } catch { await delay(100); } }
  assert.ok(tabs?.length, 'Browser debugging connection');
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { const task = pending.get(message.id); if (task) { pending.delete(message.id); message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result); } }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  };
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:4176' });
  await until("document.querySelector('#serviceLabel')?.textContent === '本机服务已连接'");
  await delay(300);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#scanBadge')).display"), 'none');
  const desktop = await cdp('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path.join(root, 'work/overview-verified.png'), Buffer.from(desktop.data, 'base64'));
  await evaluate("document.querySelector('#heroScanBtn').click()");
  await until("!document.querySelector('#resultTable').hidden && !document.querySelector('#scanBtn').disabled");
  assert.equal(await evaluate("document.querySelectorAll('#resultBody tr').length"), 1);
  assert.equal(await evaluate("document.querySelector('#selectedCount').textContent"), '0');
  await evaluate("document.querySelector('#resultBody input').click()");
  assert.equal(await evaluate("document.querySelector('#selectedCount').textContent"), '1');
  await evaluate("document.querySelector('#quarantineBtn').click()");
  assert.equal(await evaluate("document.querySelector('#confirmDialog').open"), true);
  await evaluate("document.querySelector('#dialogCancel').click()");
  assert.equal(await evaluate("document.querySelector('#confirmDialog').open"), false);
  await evaluate("document.querySelector('#quarantineBtn').click(); document.querySelector('#dialogConfirm').click()");
  await until("state.history.length === 1 && !document.querySelector('#dialogConfirm').disabled");
  await evaluate("document.querySelector('[data-view=quarantine]').click()");
  assert.equal(await evaluate("document.querySelectorAll('.history-item').length"), 1);
  await evaluate("document.querySelector('.history-detail-btn').click()");
  assert.equal(await evaluate("document.querySelector('#historyDialog').open && document.querySelectorAll('.history-file').length === 1"), true);
  await evaluate("document.querySelector('#historyDialogDone').click()");
  await evaluate("document.querySelector('[data-view=apps]').click(); document.querySelector('#leftoverScanBtn').click()");
  await until("state.leftovers.length === 1 && !document.querySelector('#leftoverScanBtn').disabled");
  assert.equal(await evaluate("document.querySelectorAll('.leftover-row:not(.header)').length"), 1);
  assert.equal(await evaluate("document.querySelector('#leftoverActionbar').hidden"), true);
  await evaluate("document.querySelector('[data-leftover-id]').click()");
  assert.equal(await evaluate("document.querySelector('#leftoverActionbar').hidden"), false);
  const appsScreen = await cdp('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path.join(root, 'work/jingjie-apps-verified.png'), Buffer.from(appsScreen.data, 'base64'));
  await evaluate("document.querySelector('[data-view=repair]').click()");
  assert.equal(await evaluate("document.querySelectorAll('.repair-check-btn').length"), 4);
  await evaluate("document.querySelector('.repair-check-btn[data-id=disk]').click()");
  await until("state.repairResults.disk?.summary");
  assert.equal(await evaluate("document.querySelector('[data-repair-status=disk] strong').textContent.length > 0"), true);
  assert.equal(await evaluate("document.querySelector('#startRepairBtn').disabled"), true);
  assert.equal(await evaluate("document.querySelectorAll('[data-repair-select]').length"), 2);
  // Intercept repair execution in the browser. Never run real repair commands during UI testing.
  await evaluate(`window.repairRequests=[]; window.confirmCalls=0; window.confirm=()=>{window.confirmCalls++; return false;};
    window.originalFetch=window.fetch; window.fixtureJob=null;
    window.fetch=async (url, options)=>{
      if(url==='/api/repair/start') { window.repairRequests.push(JSON.parse(options.body)); window.fixtureJob={id:'synthetic-job',createdAt:new Date().toISOString(),status:'running',message:'测试：执行中',steps:[{id:'dns',title:'清掉旧的网址解析缓存',status:'running',message:'测试：处理中'}]}; return new Response(JSON.stringify({job:window.fixtureJob}),{status:202}); }
      if(url==='/api/repair/job') return new Response(JSON.stringify({job:window.fixtureJob}));
      if(url==='/api/repair/history') return new Response(JSON.stringify({jobs:window.fixtureHistory || []}));
      if(url==='/api/repair/log') return new Response(JSON.stringify({text:'测试输出：旧网址缓存已清除',truncated:false}));
      return window.originalFetch(url,options);
    };
    document.querySelector('[data-repair-select="flush-dns"]').click();`);
  assert.equal(await evaluate("document.querySelector('#startRepairBtn').disabled"), false);
  await evaluate("document.querySelector('#startRepairBtn').click(); document.querySelector('#startRepairBtn').click()");
  await until("window.repairRequests.length===1 && repairJob?.status==='running'");
  assert.deepEqual(await evaluate('window.repairRequests[0]'), { actions: ['flush-dns'], confirm: true });
  assert.equal(await evaluate('window.confirmCalls'), 0);
  assert.equal(await evaluate("document.querySelector('#startRepairBtn').disabled && document.querySelector('[data-repair-select]').disabled"), true);
  await evaluate("(async()=>{window.fixtureJob.status='failed'; window.fixtureJob.message='测试：有项目未成功'; window.fixtureJob.steps[0].status='failed'; await pollRepairJob()})()");
  assert.match(await evaluate("document.querySelector('#repairJob').textContent"), /未成功/);
  await evaluate("document.querySelector('.repair-log-btn').click()");
  await until("!document.querySelector('#repairLogPanel').hidden");
  assert.match(await evaluate("document.querySelector('#repairLogText').textContent"), /旧网址缓存/);
  await evaluate(`(async()=>{
    window.fixtureJob.steps[0].nextAction={type:'cleanup',label:'去清理系统盘',detail:'系统盘空间不足，请先释放至少 5 GB'};
    window.fixtureHistory=[{id:'older-record',createdAt:'2026-10-20T00:00:00Z',status:'review',message:'旧版记录未进行复检',steps:[{id:'sfc',title:'系统文件',status:'succeeded',message:'Windows 未发现受保护系统文件损坏'}]}];
    await pollRepairJob();
  })()`);
  assert.match(await evaluate("document.querySelector('#repairJob').textContent"), /空间不足/);
  await evaluate("document.querySelector('.repair-next-btn').click()");
  assert.equal(await evaluate("document.querySelector('.nav-item.active').dataset.view"), 'scan');
  await evaluate("setView('repair'); document.querySelector('#repairHistory').value='older-record'; document.querySelector('#repairHistory').dispatchEvent(new Event('change'))");
  assert.match(await evaluate("document.querySelector('#repairJob').textContent"), /旧版记录未进行复检/);
  assert.match(await evaluate("document.querySelector('#repairJob').textContent"), /未发现受保护系统文件损坏/);
  await evaluate("document.querySelector('#repairHistory').value=''; document.querySelector('#repairHistory').dispatchEvent(new Event('change'))");
  await evaluate("document.querySelector('.repair-report').scrollIntoView({block:'start'})");
  await delay(350);
  const resultsScreen = await cdp('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path.join(root, 'work/jingjie-repair-results-verified.png'), Buffer.from(resultsScreen.data, 'base64'));
  await evaluate("window.fetch=window.originalFetch; repairJob=null; document.querySelector('#repairJob').textContent='还没有修复记录。执行后会显示每一步做了什么、是否完成。'; document.querySelector('#repairLogPanel').hidden=true; updateRepairControls()");
  const repairScreen = await cdp('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path.join(root, 'work/jingjie-repair-verified.png'), Buffer.from(repairScreen.data, 'base64'));
  await evaluate("document.querySelector('[data-view=settings]').click()");
  assert.equal(await evaluate("[...document.querySelectorAll('.settings-group input')].every(input => input.disabled)"), true);
  await evaluate("document.querySelector('[data-view=overview]').click()");
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(350);
  const widths = await evaluate("({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth})");
  assert.ok(widths.scroll <= widths.client, JSON.stringify(widths));
  const mobile = await cdp('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path.join(root, 'work/jingjie-mobile-verified.png'), Buffer.from(mobile.data, 'base64'));
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await evaluate("document.querySelector('[data-view=repair]').click()");
  const repairWidths = await evaluate("({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth})");
  assert.ok(repairWidths.scroll <= repairWidths.client, JSON.stringify(repairWidths));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-repair-status=disk]')).display !== 'none'"), true);
  console.log('PASS browser: cleaning/history, leftovers, real disk check; repair selection, single click/no confirmation, duplicate prevention, failure/log UI, mobile layout and no JS errors.');
  console.log('Real user files were not modified.');
} finally {
  if (ws?.readyState === 1) { try { await cdp('Browser.close'); } catch {} ws.close(); }
  if (backend.exitCode === null) backend.kill();
  if (edge.exitCode === null) edge.kill();
}
