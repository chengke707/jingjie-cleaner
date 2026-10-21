// Icons include Lucide/Feather paths and adaptations; see THIRD_PARTY_NOTICES.md.
const iconPaths = {
  "layout-dashboard": '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  "scan-search": '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="11" cy="11" r="4"/><path d="m16 16-2.8-2.8"/>',
  "package-search": '<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l3 1.7M3.3 7 12 12l8.7-5M12 22V12"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="m20.3 20.3 1.7 1.7"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5-5L7 4l3 3-2 2-3-3-2.7 2.7a4 4 0 0 0 5 5L17 23l6-6-9.3-10.7Z"/>',
  "archive-restore": '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h2M20 8v4M10 12h4"/><path d="m16 19-3-3 3-3"/><path d="M13 16h5a3 3 0 0 1 3 3v1"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  "shield-check": '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/><path d="m9 12 2 2 4-4"/>',
  bell: '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>',
  "scan-line": '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "trash-2": '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
  "file-warning": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 11v4M12 18h.01"/>',
  "package-x": '<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14M3.3 7 12 12l8.7-5M12 22V12"/><path d="m17 14 5 5M22 14l-5 5"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  "folder-lock": '<rect width="8" height="5" x="14" y="13" rx="1"/><path d="M10 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1.5M18 13v-2a2 2 0 0 0-4 0v2"/>',
  "list-checks": '<path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  ellipsis: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  "clock-3": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  "loader-circle": '<path d="M21 12a9 9 0 1 1-6.2-8.56"/>',
  radar: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34M4 6h.01M2.29 9.62a10 10 0 1 0 19.02-1.27M16.24 7.76a6 6 0 1 0 1.66 3.49M12 18a6 6 0 0 0 0-12v6l4.24-4.24"/><circle cx="12" cy="12" r="2"/>',
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  "refresh-cw": '<path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7l3-2.7M21 21v-5h-5"/>',
  "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  "hard-drive": '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
  "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  "monitor-cog": '<path d="M12 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M8 21h4M9 17v4"/><circle cx="18" cy="18" r="3"/><path d="M18 13v2M18 21v2M13 18h2M21 18h2"/>',
  network: '<rect width="6" height="6" x="9" y="2" rx="1"/><rect width="6" height="6" x="3" y="16" rx="1"/><rect width="6" height="6" x="15" y="16" rx="1"/><path d="M12 8v4M6 16v-2h12v2"/>',
  "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  "file-box": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>'
};

document.querySelectorAll('[data-icon]').forEach((node) => {
  const name = node.dataset.icon;
  node.outerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${node.className || ''}">${iconPaths[name] || iconPaths.info}</svg>`;
});

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = { live: false, results: [], selected: new Set(), filter: 'all', quarantine: [], history: [], apps: [], leftovers: [], leftoverSelected: new Set(), repairResults: {} };
const demoResults = [
  { id: 'demo-temp', name: '过期临时文件', detail: '183 个超过 7 天的文件', path: '%LOCALAPPDATA%\\Temp', risk: 'safe', size: 684392448, category: 'temp' },
  { id: 'demo-crash', name: '应用崩溃转储', detail: '6 个诊断文件', path: '%LOCALAPPDATA%\\CrashDumps', risk: 'safe', size: 128974848, category: 'crash' },
  { id: 'demo-shader', name: 'DirectX 着色器缓存', detail: '可由系统重新生成', path: '%LOCALAPPDATA%\\D3DSCache', risk: 'safe', size: 94266982, category: 'cache' },
  { id: 'demo-browser', name: '浏览器过期缓存', detail: '30 天未访问', path: '浏览器缓存目录', risk: 'review', size: 341835776, category: 'cache' },
  { id: 'demo-installer', name: '旧安装包缓存', detail: '建议确认关联应用已安装', path: '%TEMP%\\Installers', risk: 'review', size: 226492416, category: 'leftover' }
];

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const svg = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`;
let toastTimer;
function toast(message) { const el = $('#toast'); el.querySelector('span').textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800); }

function setView(view) {
  $$('.view').forEach((el) => el.classList.toggle('active', el.id === `${view}View`));
  $$('.nav-item[data-view]').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  const copy = { overview: ['设备总览', '晚上好，今天也给 C 盘松口气'], scan: ['空间清理', '找到问题，也解释清楚问题'], apps: ['软件管理', '卸载干净，不留尾巴'], repair: ['系统健康', '使用可信的 Windows 修复能力'], quarantine: ['安全防护', '所有清理都有后悔药'], settings: ['偏好设置', '按你的方式守护空间'] };
  $('#eyebrow').textContent = copy[view][0]; $('#pageTitle').textContent = copy[view][1];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
$$('[data-view-jump]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.viewJump)));

async function api(path, options) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `服务响应 ${response.status}`);
  return data;
}

async function loadSystem() {
  try {
    const data = await api('/api/system');
    state.live = true;
    $('.service-state').classList.add('online');
    $('#serviceLabel').textContent = '本机服务已连接';
    $('#diskFree').textContent = formatBytes(data.disk.free);
    $('#diskUsage').textContent = `已用 ${data.disk.usedPercent}%`;
    $('#healthLabel').innerHTML = `${svg('shield-check')} ${data.disk.usedPercent >= 85 ? 'C 盘可用空间偏低' : '本机空间已读取'}`;
    $('#diskRing').style.background = `conic-gradient(#b9ebdc 0 ${100 - data.disk.usedPercent}%, rgba(255,255,255,.16) ${100 - data.disk.usedPercent}% 100%)`;
    state.quarantine = data.quarantine || [];
    renderQuarantine();
    loadHistory();
    loadApps();
  } catch {
    state.live = false;
    $('.service-state').classList.add('demo');
    $('#serviceLabel').textContent = '演示模式';
    $('#diskFree').textContent = '42.8 GB';
    $('#diskUsage').textContent = '已用 78%';
    toast('当前为演示模式；用启动脚本打开即可读取本机数据');
    state.apps = demoApps(); renderApps();
  }
}

function animateScan(fetchPromise) {
  const stages = [
    [12, '正在检查临时目录', '%LOCALAPPDATA%\\Temp'],
    [34, '正在识别崩溃报告', '%LOCALAPPDATA%\\CrashDumps'],
    [58, '正在分析可重建缓存', '%LOCALAPPDATA%\\D3DSCache'],
    [76, '正在核对文件安全规则', '个人文件夹已跳过'],
    [91, '正在整理扫描结果', '计算可释放空间']
  ];
  let index = 0;
  const update = () => {
    const [percent, stage, path] = stages[Math.min(index, stages.length - 1)];
    $('#scanPercent').textContent = `${percent}%`; $('#progressBar').style.width = `${percent}%`; $('#scanStage').textContent = stage; $('#scanPath').textContent = path; index++;
  };
  update(); const timer = setInterval(update, 520);
  return fetchPromise.finally(() => clearInterval(timer));
}

async function startScan(category) {
  setView('scan');
  if ($('#scanBtn').disabled) return;
  $('#scanProgress').hidden = false; $('#scanBtn').disabled = true; $('#heroScanBtn').disabled = true; $('#selectionBar').hidden = true; $('#resultPlaceholder').hidden = true; $('#resultTable').hidden = true;
  try {
    const promise = state.live ? api('/api/scan', { method: 'POST', body: JSON.stringify({ category: category || 'all' }) }) : new Promise((resolve) => setTimeout(() => resolve({ results: category ? demoResults.filter((r) => r.category === category) : demoResults }), 2200));
    const data = await animateScan(promise);
    state.results = data.results || [];
    state.selected = new Set();
    $('#scanPercent').textContent = '100%'; $('#progressBar').style.width = '100%'; $('#scanStage').textContent = '扫描完成'; $('#scanPath').textContent = `已找到 ${state.results.length} 类可处理项目`;
    setTimeout(() => { $('#scanProgress').hidden = true; }, 900);
    renderResults(); updateOverview();
    $('#scanBadge').hidden = !state.results.length; $('#scanBadge').textContent = state.results.length;
    recordActivity('完成扫描', `${state.results.length} 类候选项目`);
    toast(`扫描完成，找到 ${state.results.length} 类项目，请先查看详情`);
  } catch (error) {
    $('#resultPlaceholder').hidden = false; $('#resultPlaceholder').querySelector('h3').textContent = '扫描未完成'; $('#resultPlaceholder').querySelector('p').textContent = error.message;
    toast('扫描遇到问题，请重新启动应用后再试');
  } finally { $('#scanBtn').disabled = false; $('#heroScanBtn').disabled = false; }
}
$('#heroScanBtn').addEventListener('click', () => startScan()); $('#scanBtn').addEventListener('click', () => startScan());
$$('[data-scan-category]').forEach((button) => button.addEventListener('click', () => startScan(button.dataset.scanCategory)));

function renderResults() {
  const filtered = state.results.filter((item) => state.filter === 'all' || item.risk === state.filter);
  $('#resultPlaceholder').hidden = state.results.length > 0; $('#resultTable').hidden = state.results.length === 0;
  if (!state.results.length) { $('#resultPlaceholder h3').textContent = '当前扫描范围内没有候选文件'; $('#resultPlaceholder p').textContent = '这不代表整个 C 盘没有残留；本版本只检查四类目录。'; }
  $('#resultBody').innerHTML = filtered.map((item) => `<tr>
    <td><input type="checkbox" data-id="${escapeHtml(item.id)}" ${state.selected.has(item.id) ? 'checked' : ''} aria-label="选择 ${escapeHtml(item.name)}"></td>
    <td><div class="item-name"><span class="item-symbol">${svg(item.category === 'crash' ? 'file-warning' : item.category === 'temp' ? 'trash-2' : 'file-box')}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small></span></div></td>
    <td><div class="path-text" title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</div></td>
    <td><span class="risk-${item.risk}">${item.risk === 'safe' ? '较低风险' : '建议审查'}</span></td>
    <td><strong>${formatBytes(item.size)}</strong></td><td><button class="row-menu" data-detail="${escapeHtml(item.id)}" title="查看完整路径与规则">${svg('ellipsis')}</button></td>
  </tr>`).join('');
  $$('#resultBody input').forEach((input) => input.addEventListener('change', () => { input.checked ? state.selected.add(input.dataset.id) : state.selected.delete(input.dataset.id); updateSelection(); }));
  $$('[data-detail]').forEach((button) => button.addEventListener('click', () => {
    const item = state.results.find((result) => result.id === button.dataset.detail);
    window.alert(`${item.name}\n${item.detail}\n${item.path}\n\n只识别特定目录中的过期文件；文件可能仍有诊断用途。请关闭相关应用后再隔离。`);
  }));
  updateSelection();
}
function updateSelection() {
  const selectedItems = state.results.filter((item) => state.selected.has(item.id));
  const size = selectedItems.reduce((sum, item) => sum + item.size, 0);
  $('#selectedCount').textContent = selectedItems.length; $('#selectedSize').textContent = formatBytes(size); $('#selectionBarCount').textContent = `${selectedItems.length} 项 · ${formatBytes(size)}`;
  $('#selectionBar').hidden = selectedItems.length === 0;
  const visible = state.results.filter((item) => state.filter === 'all' || item.risk === state.filter);
  $('#selectAll').checked = visible.length > 0 && visible.every((item) => state.selected.has(item.id));
}
$('#selectAll').addEventListener('change', (event) => { state.results.filter((item) => state.filter === 'all' || item.risk === state.filter).forEach((item) => event.target.checked ? state.selected.add(item.id) : state.selected.delete(item.id)); renderResults(); });
$('#clearSelection').addEventListener('click', () => { state.selected.clear(); renderResults(); });
$$('.segmented button').forEach((button) => button.addEventListener('click', () => { $$('.segmented button').forEach((b) => b.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter; renderResults(); }));

$('#quarantineBtn').addEventListener('click', () => { const items = state.results.filter((item) => state.selected.has(item.id)); const size = items.reduce((sum, item) => sum + item.size, 0); $('#dialogCopy').textContent = `${items.length} 类项目（${formatBytes(size)}）将被移动到隔离区。`; $('#confirmDialog').showModal(); });
$('#dialogCancel').addEventListener('click', () => $('#confirmDialog').close());
$('#dialogConfirm').addEventListener('click', async () => {
  const ids = [...state.selected]; $('#dialogConfirm').disabled = true;
  try {
    let data;
    if (state.live) data = await api('/api/quarantine', { method: 'POST', body: JSON.stringify({ ids }) });
    else data = { quarantined: state.results.filter((item) => ids.includes(item.id)).map((item) => ({ ...item, quarantinedAt: new Date().toISOString() })) };
    state.quarantine.push(...data.quarantined); state.results = state.results.filter((item) => !ids.includes(item.id)); state.selected.clear(); renderResults(); renderQuarantine(); updateOverview(); await loadHistory();
    $('#confirmDialog').close();
    recordActivity('文件隔离', `${data.quarantined.length} 类；跳过 ${data.skipped || 0} 个文件`);
    toast(`${data.quarantined.length} 类已隔离；跳过 ${data.skipped || 0} 个，请重新扫描核对`);
  } catch (error) { toast(`操作未完成：${error.message}`); } finally { $('#dialogConfirm').disabled = false; }
});

function updateOverview() {
  const total = state.results.reduce((sum, item) => sum + item.size, 0);
  $('#reclaimableHero').textContent = total ? formatBytes(total) : '--';
  $('#lastScanText').textContent = total ? `扫描完成，共识别 ${state.results.length} 类候选项目。请审查后勾选；隔离不会立即释放同盘空间。` : '本次范围内没有候选项，不代表整个系统没有残留。';
  const byCategory = (category) => state.results.filter((item) => item.category === category).reduce((sum, item) => sum + item.size, 0);
  $('#quickTemp').textContent = byCategory('temp') ? formatBytes(byCategory('temp')) : '未发现'; $('#quickCrash').textContent = byCategory('crash') ? formatBytes(byCategory('crash')) : '未发现';
}

function recordActivity(title, detail) {
  $('#activityEmpty').hidden = true; $('#activityList').hidden = false;
  const row = document.createElement('div'); row.className = 'activity-item';
  row.innerHTML = `${svg('circle-check')}<span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span><b>${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</b>`;
  $('#activityList').prepend(row);
  while ($('#activityList').children.length > 3) $('#activityList').lastElementChild.remove();
}

async function loadHistory() {
  if (!state.live) return renderHistory();
  try { const data = await api('/api/history'); state.history = data.history || []; }
  catch { state.history = []; }
  renderHistory();
}

function historyAction(item) {
  if (item.action === 'purge') return { title: '已永久删除', icon: 'trash-2', detail: `释放 ${formatBytes(item.size)} · ${item.count} 个文件` };
  if (item.action === 'restore') return { title: '已恢复', icon: 'rotate-ccw', detail: `${formatBytes(item.size)} · ${item.count} 个文件` };
  return { title: '已移入隔离区', icon: 'archive', detail: `${formatBytes(item.size)} · ${item.count} 个文件${item.skipped ? ` · 跳过 ${item.skipped}` : ''}` };
}

function renderHistory() {
  $('#historyCount').textContent = `${state.history.length} 条`;
  $('#historyEmpty').hidden = state.history.length > 0;
  $('#historyList').hidden = state.history.length === 0;
  $('#historyList').innerHTML = state.history.map((item) => {
    const action = historyAction(item);
    const when = new Date(item.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<div class="history-item"><span class="history-symbol ${item.action}">${svg(action.icon)}</span><span><strong>${action.title} · ${escapeHtml(item.label || '文件')}</strong><small>${action.detail}</small></span><time class="history-time">${escapeHtml(when)}</time><button class="secondary-btn history-detail-btn" data-id="${escapeHtml(item.id)}">查看详情</button></div>`;
  }).join('');
  $$('.history-detail-btn').forEach((button) => button.addEventListener('click', () => showHistoryDetail(button.dataset.id)));
}

function showHistoryDetail(id) {
  const item = state.history.find((entry) => entry.id === id); if (!item) return;
  const action = historyAction(item);
  $('#historyDialogTitle').textContent = `${action.title} · ${item.label || '文件'}`;
  $('#historyDialogMeta').textContent = `${new Date(item.at).toLocaleString('zh-CN')} · ${action.detail}`;
  $('#historyFileList').innerHTML = (item.files || []).map((file) => `<div class="history-file"><span>${escapeHtml(file.path)}</span><span>${formatBytes(file.size)}</span></div>`).join('') || '<div class="history-file"><span>早期操作没有逐文件记录</span></div>';
  $('#historyOmitted').hidden = !item.omitted;
  $('#historyOmitted').textContent = item.omitted ? `另有 ${item.omitted} 个文件未在详情中展示。` : '';
  $('#historyDialog').showModal();
}

function closeHistoryDialog() { $('#historyDialog').close(); }
$('#historyDialogClose').addEventListener('click', closeHistoryDialog);
$('#historyDialogDone').addEventListener('click', closeHistoryDialog);

function renderQuarantine() {
  $('#quarantineBadge').hidden = state.quarantine.length === 0; $('#quarantineBadge').textContent = state.quarantine.length;
  $('#quarantineEmpty').hidden = state.quarantine.length > 0; $('#quarantineList').hidden = state.quarantine.length === 0;
  $('#quarantineList').innerHTML = state.quarantine.map((item) => `<div class="quarantine-item">${svg('archive')}<span><strong>${escapeHtml(item.name || '已隔离项目')}</strong><small>${escapeHtml(item.path || '')} · ${formatBytes(item.size || 0)}</small></span><button class="secondary-btn restore-btn" data-id="${escapeHtml(item.id)}">恢复</button><button class="danger-text-btn purge-btn" data-id="${escapeHtml(item.id)}">永久删除</button></div>`).join('');
  $$('.restore-btn').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      let remaining = 0;
      if (state.live) { const result = await api('/api/restore', { method: 'POST', body: JSON.stringify({ id: button.dataset.id }) }); remaining = result.remaining; await loadSystem(); }
      else state.quarantine = state.quarantine.filter((item) => item.id !== button.dataset.id);
      renderQuarantine(); await loadHistory(); toast(remaining ? `${remaining} 个文件未恢复（可能有重名），仍保留在隔离区` : '已恢复到原始位置');
      recordActivity('恢复文件', remaining ? `${remaining} 个待处理` : '恢复完成');
    } catch (error) { toast(`恢复失败：${error.message}`); } finally { button.disabled = false; }
  }));
  $$('.purge-btn').forEach((button) => button.addEventListener('click', async () => {
    const item = state.quarantine.find((entry) => entry.id === button.dataset.id);
    if (!window.confirm(`永久删除「${item.name}」（${formatBytes(item.size)}）？\n\n这会释放文件占用的空间。删除后无法从净界恢复，请先确认电脑和相关应用运行正常。`)) return;
    button.disabled = true;
    try {
      let message = '演示项目已移除';
      if (state.live) { const result = await api('/api/purge', { method: 'POST', body: JSON.stringify({ id: item.id, confirm: 'PERMANENT_DELETE' }) }); message = `已删除 ${formatBytes(result.freed)}；${result.remaining} 个未删除`; await loadSystem(); }
      else state.quarantine = state.quarantine.filter((entry) => entry.id !== item.id);
      renderQuarantine(); await loadHistory(); toast(message); recordActivity('永久删除', message);
    } catch (error) { toast(`删除未完成：${error.message}`); } finally { button.disabled = false; }
  }));
}

function demoApps() { return [
  { name: 'Microsoft Edge', publisher: 'Microsoft Corporation', size: 684510208, used: '今天', status: '系统组件', color: '#2672ec' },
  { name: 'Visual Studio Code', publisher: 'Microsoft Corporation', size: 412090368, used: '2 天前', status: '正常', color: '#2087c7' },
  { name: 'WeChat', publisher: 'Tencent Technology', size: 1958739968, used: '今天', status: '可清缓存', color: '#27ae60' },
  { name: '旧版截图工具', publisher: 'Unknown Publisher', size: 126877696, used: '91 天前', status: '建议审查', color: '#d66a4f' }
]; }
async function loadApps() { try { const data = await api('/api/apps'); state.apps = data.apps; } catch { state.apps = []; toast('安装清单读取失败，未替换为演示数据'); } renderApps(); }
function renderApps(filter = '') {
  const apps = state.apps.filter((app) => app.name.toLowerCase().includes(filter.toLowerCase()));
  $('#appRows').innerHTML = apps.slice(0, 30).map((app, index) => `<div class="app-row"><span class="app-identity"><span class="app-logo" style="background:${app.color || ['#438a7b','#55799c','#9b7653','#786a9d'][index % 4]}">${escapeHtml(app.name.slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.publisher || '发布者未知')}</small></span></span><span>${formatBytes(app.size || 0)}</span><span>${escapeHtml(app.used || '未知')}</span><span class="${app.status === '正常' ? 'risk-safe' : 'risk-review'}">${escapeHtml(app.status || '正常')}</span><span><button class="secondary-btn app-action">详情</button></span></div>`).join('');
  $$('.app-action').forEach((button) => button.addEventListener('click', () => toast('当前仅展示安装信息，不执行卸载或残留清理')));
}
$('#appSearch').addEventListener('input', (event) => renderApps(event.target.value));

async function scanLeftovers() {
  if (!state.live) return toast('请通过桌面入口启动本机服务后再扫描');
  const button = $('#leftoverScanBtn'); button.disabled = true; button.querySelector('span').textContent = '正在核对...';
  $('#leftoverRows').innerHTML = '<div class="leftover-placeholder">正在读取安装清单、商店应用和运行中的程序...</div>';
  try {
    const data = await api('/api/leftovers', { method: 'POST', body: '{}' });
    state.leftovers = data.leftovers || []; state.leftoverSelected.clear(); renderLeftovers();
    const size = state.leftovers.reduce((sum, item) => sum + item.size, 0);
    $('#quickLeftover').textContent = state.leftovers.length ? `${state.leftovers.length} 项` : '未发现';
    toast(state.leftovers.length ? `找到 ${state.leftovers.length} 个疑似残留目录，共 ${formatBytes(size)}` : '没有发现符合严格规则的疑似残留');
  } catch (error) { $('#leftoverRows').innerHTML = `<div class="leftover-placeholder">扫描失败：${escapeHtml(error.message)}</div>`; toast(`残留扫描失败：${error.message}`); }
  finally { button.disabled = false; button.querySelector('span').textContent = '重新扫描'; }
}

function renderLeftovers() {
  const total = state.leftovers.reduce((sum, item) => sum + item.size, 0);
  $('#leftoverSummary').textContent = state.leftovers.length ? `发现 ${state.leftovers.length} 个疑似目录 · ${formatBytes(total)}` : '没有发现疑似残留';
  $('#leftoverNote').textContent = state.leftovers.some((item) => item.truncated) ? '部分超大目录只统计前 5 万个条目，隔离前请特别审查。' : '结果已排除已安装、商店和运行中的应用。';
  $('#leftoverRows').innerHTML = state.leftovers.length ? state.leftovers.map((item) => `<div class="leftover-row">
    <span><input type="checkbox" data-leftover-id="${escapeHtml(item.id)}" ${state.leftoverSelected.has(item.id) ? 'checked' : ''} aria-label="选择 ${escapeHtml(item.name)}"></span>
    <span><strong>${escapeHtml(item.name)}</strong><small class="leftover-path" title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</small><small>${escapeHtml(item.reason)}${item.truncated ? '；目录过大，统计已截断' : ''}</small></span>
    <time>${new Date(item.lastModified).toLocaleDateString('zh-CN')}</time><span>${item.fileCount.toLocaleString('zh-CN')}</span><strong>${formatBytes(item.size)}</strong><button class="secondary-btn leftover-open-btn" data-path="${escapeHtml(item.path)}">查看目录</button>
  </div>`).join('') : '<div class="leftover-placeholder">未发现超过 30 天未修改且无法匹配现有应用的目录。</div>';
  $$('[data-leftover-id]').forEach((input) => input.addEventListener('change', () => { input.checked ? state.leftoverSelected.add(input.dataset.leftoverId) : state.leftoverSelected.delete(input.dataset.leftoverId); updateLeftoverSelection(); }));
  $$('.leftover-open-btn').forEach((button) => button.addEventListener('click', () => api('/api/open-folder', { method: 'POST', body: JSON.stringify({ path: button.dataset.path }) }).catch((error) => toast(error.message))));
  updateLeftoverSelection();
}

function updateLeftoverSelection() {
  const items = state.leftovers.filter((item) => state.leftoverSelected.has(item.id));
  const size = items.reduce((sum, item) => sum + item.size, 0);
  $('#leftoverActionbar').hidden = !items.length; $('#leftoverSelectedSummary').textContent = `已选择 ${items.length} 项 · ${formatBytes(size)}`;
  $('#leftoverSelectAll').checked = state.leftovers.length > 0 && items.length === state.leftovers.length;
}
$('#leftoverScanBtn').addEventListener('click', scanLeftovers);
$('#leftoverSelectAll').addEventListener('change', (event) => { state.leftoverSelected = new Set(event.target.checked ? state.leftovers.map((item) => item.id) : []); renderLeftovers(); });
$('#leftoverQuarantineBtn').addEventListener('click', async () => {
  const items = state.leftovers.filter((item) => state.leftoverSelected.has(item.id));
  const size = items.reduce((sum, item) => sum + item.size, 0);
  if (!window.confirm(`将 ${items.length} 个疑似残留目录（${formatBytes(size)}）移入隔离区？\n\n它们可能含有应用设置或用户数据。隔离后不会立即释放同盘空间，但可以恢复。`)) return;
  const button = $('#leftoverQuarantineBtn'); button.disabled = true;
  try {
    const data = await api('/api/quarantine', { method: 'POST', body: JSON.stringify({ ids: items.map((item) => item.id) }) });
    state.quarantine.push(...data.quarantined); state.leftovers = state.leftovers.filter((item) => !state.leftoverSelected.has(item.id)); state.leftoverSelected.clear();
    renderLeftovers(); renderQuarantine(); await loadHistory();
    toast(`${data.quarantined.length} 项已隔离，跳过 ${data.skipped || 0} 个发生变化或占用中的文件`);
  } catch (error) { toast(`隔离失败：${error.message}`); } finally { button.disabled = false; }
});

const repairs = [
  { id: 'network', icon: 'network', title: '部分网页打不开：刷新网址缓存', action: 'flush-dns', desc: '会做什么：清掉电脑保存的旧网址解析记录，让下次访问重新查询。', impact: '适合：网络已连接，但部分网址打不开。不会删除浏览记录、修改 Wi-Fi 密码、DNS 服务器或代理设置；不能解决所有断网问题。通常几秒完成。' },
  { id: 'components', icon: 'monitor-cog', title: '系统报错或功能异常：修复系统文件', action: 'repair-components', desc: '会做什么：先用 Windows 自带工具修复组件库，再检查并修复受保护的系统文件（DISM → SFC）。', impact: '适合：Windows 功能异常或提示系统文件损坏。会修改受损的系统文件，可能联网下载官方修复文件；请保持联网和供电，可能需要几十分钟。不会重装你的第三方应用。' },
  { id: 'update', icon: 'download', title: 'Windows 更新状态', desc: '检查更新服务是否被禁用、是否等待重启。', impact: '打开设置后，由你在 Windows 中选择更新。这不属于本次自动修复，也不会记作修复成功。', helper: 'open-update', helperLabel: '打开更新设置' },
  { id: 'disk', icon: 'hard-drive', title: '系统盘空间', desc: '查看 C 盘还剩多少空间。', impact: '打开设置不会删除文件或释放空间。需要清理时，可使用左侧“智能清理”，先看清文件再选择。', helper: 'open-storage', helperLabel: '打开存储设置' }
];
const repairSelection = new Set();
const repairChecks = new Set();
let checkingAll = false, repairSubmitting = false, repairJob = null, repairPollTimer, repairPollFailed = false;
const repairIsActive = () => repairSubmitting || ['starting', 'running'].includes(repairJob?.status);
function updateRepairControls() {
  const busy = repairIsActive();
  $('#repairSelection').textContent = repairSelection.size ? `已选择 ${repairSelection.size} 项 · ${repairs.filter(item => repairSelection.has(item.action)).map(item => item.id === 'network' ? '刷新网址缓存' : '修复系统文件').join('、')}` : '请选择要修复的项目';
  $('#startRepairBtn').disabled = busy || !repairSelection.size || repairChecks.size > 0 || checkingAll;
  $('#startRepairBtn').textContent = busy ? '修复进行中…' : '开始修复';
  $('#checkAllBtn').disabled = busy || checkingAll || repairChecks.size > 0;
  $$('[data-repair-select]').forEach(input => { input.disabled = busy; });
  $$('.repair-check-btn').forEach(button => { button.disabled = busy || checkingAll || repairChecks.has(button.dataset.id); button.textContent = repairChecks.has(button.dataset.id) ? '检查中…' : '检查'; });
}
function renderRepairs() {
  $('#repairList').innerHTML = repairs.map(item => {
    const result = state.repairResults[item.id];
    return `<div class="repair-item"><span class="repair-icon">${svg(item.icon)}</span><div class="repair-copy"><h3>${item.title}</h3><p>${item.desc}</p><p class="repair-impact">${item.impact}</p><div class="repair-status ${result?.status || ''}" data-repair-status="${item.id}"><strong>${escapeHtml(result?.summary || '尚未检查：尚不能判断是否有故障')}</strong>${result?.detail ? `<small>${escapeHtml(result.detail)}</small>` : ''}</div></div><div class="repair-actions">${item.action ? `<label class="repair-choice"><input type="checkbox" data-repair-select="${item.action}" ${repairSelection.has(item.action) ? 'checked' : ''}>修复这一项</label>` : `<button class="secondary-btn repair-helper-btn" data-action="${item.helper}">${item.helperLabel}</button>`}<button class="secondary-btn repair-check-btn" data-id="${item.id}">检查</button></div></div>`;
  }).join('');
  bindRepairButtons(); updateRepairControls();
}
function bindRepairButtons() {
  $$('.repair-check-btn').forEach((button) => button.addEventListener('click', () => checkRepair(button.dataset.id)));
  $$('[data-repair-select]').forEach(input => input.addEventListener('change', () => { input.checked ? repairSelection.add(input.dataset.repairSelect) : repairSelection.delete(input.dataset.repairSelect); updateRepairControls(); }));
  $$('.repair-helper-btn').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    try { const result = await api('/api/repair/action', { method: 'POST', body: JSON.stringify({ action: button.dataset.action, confirm: true }) }); toast(`${result.message}，请在设置中继续操作`); }
    catch (error) { toast(`操作失败：${error.message}`); } finally { button.disabled = false; }
  }));
}
async function checkRepair(id) {
  if (repairIsActive() || repairChecks.has(id)) return;
  repairChecks.add(id); updateRepairControls();
  try { state.repairResults[id] = await api('/api/repair/check', { method: 'POST', body: JSON.stringify({ id }) }); }
  catch (error) { state.repairResults[id] = { status: 'error', summary: '检查失败', detail: error.message }; }
  finally { repairChecks.delete(id); renderRepairs(); }
}
$('#checkAllBtn').addEventListener('click', async () => { checkingAll = true; updateRepairControls(); try { for (const item of repairs) await checkRepair(item.id); } finally { checkingAll = false; updateRepairControls(); } });
function renderRepairJob() {
  if (!repairJob) return;
  const labels = { pending: '等待', starting: '等待授权', running: '执行中', succeeded: '已完成', completed: '已完成', review: '请查看结果', failed: '未成功', cancelled: '已取消', interrupted: '结果未确认', skipped: '未执行' };
  $('#repairJob').innerHTML = `<p class="repair-job-heading">${escapeHtml(new Date(repairJob.createdAt).toLocaleString('zh-CN'))} · ${labels[repairJob.status] || '未知状态'}</p><p>${escapeHtml(repairJob.message)}</p>${repairJob.steps.map(step => `<div class="repair-step"><div><strong>${escapeHtml(step.title)} · ${labels[step.status] || '未知状态'}</strong><p>${escapeHtml(step.message || '')}${step.exitCode !== undefined ? `（返回代码 ${step.exitCode}）` : ''}</p></div><button class="secondary-btn repair-log-btn" data-step="${step.id}">查看输出</button></div>`).join('')}`;
  $$('.repair-log-btn').forEach(button => button.addEventListener('click', async () => {
    try { const data = await api('/api/repair/log', { method: 'POST', body: JSON.stringify({ id: repairJob.id, step: button.dataset.step }) }); $('#repairLogTitle').textContent = `${repairJob.steps.find(step => step.id === button.dataset.step).title} · Windows 输出${data.truncated ? '（最近 128 KB）' : ''}`; $('#repairLogText').textContent = data.text; $('#repairLogPanel').hidden = false; $('#repairLogPanel').open = true; }
    catch (error) { toast(`记录读取失败：${error.message}`); }
  }));
}
async function pollRepairJob() {
  clearTimeout(repairPollTimer);
  try {
    const data = await api('/api/repair/job');
    if (repairPollFailed || JSON.stringify(data.job) !== JSON.stringify(repairJob)) { repairJob = data.job; renderRepairJob(); }
    repairPollFailed = false;
    updateRepairControls();
  } catch (error) { repairPollFailed = true; if (repairIsActive()) $('#repairJob').textContent = '暂时无法获取进度，修复可能仍在执行。正在重新连接，请勿重复启动。'; }
  repairPollTimer = setTimeout(pollRepairJob, 2500);
}
$('#startRepairBtn').addEventListener('click', async () => {
  if (!state.live || repairIsActive() || !repairSelection.size) return;
  repairSubmitting = true; updateRepairControls();
  try {
    const data = await api('/api/repair/start', { method: 'POST', body: JSON.stringify({ actions: [...repairSelection], confirm: true }) });
    repairJob = data.job; $('#repairLogPanel').hidden = true; renderRepairJob();
  } catch (error) { toast(`启动未确认：${error.message}。正在读取最新状态。`); }
  finally { await pollRepairJob(); repairSubmitting = false; updateRepairControls(); }
});

$$('.settings-group input').forEach((input) => { input.disabled = true; });
$$('.settings-group:nth-child(2) input').forEach((input) => { input.checked = false; });
$('.top-actions .icon-btn').addEventListener('click', () => toast('本版本没有后台通知'));
$('.activity-panel .icon-btn').addEventListener('click', () => toast('仅显示本次会话的最近 3 条操作'));
renderRepairs(); loadSystem(); pollRepairJob();
