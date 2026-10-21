const active = status => ['starting', 'running', 'pending'].includes(status);
export function decodeRepairLog(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.subarray(2).toString('utf16le');
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return Buffer.from(buffer.subarray(2, buffer.length - buffer.length % 2)).swap16().toString('utf16le');
  const sample = buffer.subarray(0, 256);
  if ([...sample].filter((byte, index) => index % 2 && byte === 0).length > sample.length / 5) return buffer.toString('utf16le');
  return buffer.toString('utf8').replace(/^\uFEFF/, '').replace(/\u0000/g, '');
}
export function classifyRepairStep(step, text = '') {
  if (active(step.status)) return step;
  const output = text.replace(/\u0000/g, '').replace(/\s+/g, ' ');
  const result = { ...step, evidence: output.slice(-1200) };
  const finish = (status, message, nextAction) => ({ ...result, status, message, nextAction });
  if (step.status === 'skipped' || step.status === 'blocked') return finish(step.status, step.message || '前一步未完成，本次未执行。', step.nextAction);
  const code = step.exitCode === undefined ? null : Number(step.exitCode) >>> 0;
  if (/not enough space|磁盘空间不足|磁盘上的空间不足|Error:\s*112\b|0x80070070/i.test(output) || code === 112 || code === 0x80070070) return finish('failed', '系统盘空间不足，修复未完成。', { type: 'cleanup', label: '去清理系统盘', detail: '请先释放至少 5 GB 可用空间，建议保留 10 GB，再重新修复。隔离后还需永久删除才能释放同盘空间。' });
  if (/0x800f081f|0x800f0906|0x800f0915|source files could not be found|repair content could not be found/i.test(output) || [0x800f081f, 0x800f0906, 0x800f0915].includes(code)) return finish('failed', 'Windows 没有找到所需的官方修复文件，组件库尚未修复。', { type: 'update', label: '打开 Windows 更新', detail: '保持联网，先在 Windows 更新安装可用更新并按提示重启，再重试。仍失败时需要与当前 Windows 版本匹配的官方安装介质；本应用不会下载来历不明的文件。' });
  if (/0x800f082f|pending.*(reboot|restart)|system repair pending|有一个系统修复处于挂起|系统修复挂起|需要重新启动计算机才能完成/i.test(output) || code === 3010) return finish('review', 'Windows 要求重启，当前结果尚未复检通过。', { type: 'reboot', label: '查看重启后复检方法', detail: '先保存工作并自己重启电脑，再勾选“修复系统文件”重新运行，应用会自动复检。不会替你重启。' });
  if (/unable to fix|could not perform|无法修复|無法修復|无法执行请求的操作|無法執行要求的作業/i.test(output)) return finish('failed', 'Windows 仍有无法修复的文件，或未能完成检查。', { type: 'update', label: '打开 Windows 更新', detail: '先安装可用的 Windows 更新并按提示重启，再重新修复；若仍失败，查看下方原始输出。' });
  if (code !== null && code !== 0) return finish('failed', `Windows 命令执行失败（0x${code.toString(16).toUpperCase()}）。`, { type: 'retry', label: '选择此项目重试', detail: '查看原始输出确认原因；原因未解决前，重复执行不保证有效。' });
  if (step.id === 'sfc' || step.id === 'sfc-verify') {
    const healthy = /did not find any integrity violations|未找到任何完整性(?:冲突|违规)|沒有發現任何完整性違規|未發現任何完整性違規/i.test(output);
    if (healthy) return finish('succeeded', step.id === 'sfc-verify' ? '系统文件复检通过，未发现完整性损坏。' : 'Windows 未发现受保护系统文件损坏，无需修复这些文件。');
    if (step.id === 'sfc-verify' && /found (?:corrupt files|integrity violations)|找到.*(?:损坏|完整性违规)|發現.*損毀/i.test(output)) return finish('failed', '复检仍发现系统文件损坏，不能确认已修好。', { type: 'retry', label: '选择系统文件修复', detail: '查看原始输出，必要时先安装 Windows 更新并重启后再修复。' });
    if (/successfully repaired|成功修复|已成功修復/i.test(output)) return finish('succeeded', 'Windows 报告已修复受损系统文件；是否通过复检请看下一步。');
  }
  if (step.id === 'dism-verify') {
    if (/No component store corruption detected/i.test(output)) return finish('succeeded', '组件库深度复检通过，未发现组件库损坏。');
    if (/(?:component store is repairable|component store cannot be repaired|component store is not repairable)/i.test(output)) return finish('failed', '复检仍发现组件库损坏，不能确认已修好。', { type: 'update', label: '打开 Windows 更新', detail: '先完成 Windows 更新并重启，再重试；仍失败时可能需要匹配版本的官方安装介质。' });
  }
  if (step.id === 'dism' && /restore operation completed successfully/i.test(output)) return finish('succeeded', 'Windows 报告组件库修复命令成功完成；是否通过复检请看下一步。');
  if (step.id === 'dns' && /successfully flushed|已成功刷新|成功地刷新|成功刷新|已成功清除/i.test(output) && code === 0) return finish('succeeded', '旧的网址解析缓存已清除。请重新打开原先打不开的网页，确认上网问题是否消失。');
  if (step.status === 'skipped') return finish('skipped', step.message || '前一步未完成，本次未执行复检。');
  return finish(step.status === 'failed' ? 'failed' : 'review', step.status === 'failed' ? step.message || '命令未能完成，请查看原始输出。' : '没有足够的完整结论，暂不能确认本项效果。', { type: 'retry', label: '选择此项目重新检查', detail: '可能是执行中断或输出不完整。先查看原始输出，再重新执行；应用会在修复后进行复检。' });
}
export function summarizeRepair(job, texts = {}) {
  if (!job || ['starting', 'running', 'cancelled', 'blocked'].includes(job.status)) return job;
  const steps = job.steps.map(step => classifyRepairStep({ ...step, status: active(step.status) ? 'interrupted' : step.status }, texts[step.id]));
  // Recognizable failure logs recover real causes even when an old worker stopped before saving its exit code.
  const failed = steps.some(step => step.status === 'failed') || (job.status === 'failed' && !steps.every(step => step.status === 'succeeded'));
  const checks = steps.filter(step => ['dism-verify', 'sfc-verify'].includes(step.id));
  const hasSystemRepair = steps.some(step => step.id === 'dism' || step.id === 'sfc');
  const verified = hasSystemRepair && checks.length === 2 && checks.every(step => step.status === 'succeeded');
  const incomplete = !steps.length || steps.some(step => !['succeeded', 'skipped'].includes(step.status)) || steps.some(step => step.status === 'skipped');
  const status = failed ? 'failed' : ['cancelled', 'blocked'].includes(job.status) ? job.status : incomplete || (hasSystemRepair && !verified) ? 'review' : 'completed';
  const message = failed ? (job.status === 'failed' && !steps.some(step => step.status === 'failed') ? job.message : '存在未修复的问题，下面列出了具体原因与下一步。') : status === 'cancelled' ? job.message : status === 'blocked' ? job.message : verified && !incomplete ? '组件库和受保护系统文件的修复、复检均已通过。请再试用原先异常的 Windows 功能，确认实际症状是否消失。' : hasSystemRepair && !checks.length ? '这是旧版修复记录，未做修复后复检。已重新解读原始日志，不能据此宣称整个系统已修好。' : status === 'review' ? '部分结果尚不能确认，查看对应项目的原因和下一步。' : '所选操作已完成。请验证原来的问题是否消失。';
  return { ...job, status, message, steps, verified };
}
