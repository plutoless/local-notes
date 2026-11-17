import {escapeHTML as esc} from './core.js';

// Presentation vocabulary never changes persisted enum values or user content.
export const actionLabels = {todo: '待办', 'in-progress': '进行中', waiting: '等待中', completed: '已完成', canceled: '已取消'};
export const initiativeLabels = {active: '进行中', later: '以后再做', ended: '已结束'};
export const sourceLabels = {unchanged: '来源未变', available: '来源可用', changed: '来源已修改，请核对引用', valid: '来源可用', unavailable: '来源不可用，请重新关联', missing: '来源缺失，请重新关联', moved: '来源已移动', ambiguous: '找到多个来源，请手动关联'};
export const statusLabel = value => actionLabels[value] || initiativeLabels[value] || sourceLabels[value] || '需要核对';

export function button(text, run, {primary = false} = {}) {
  const node = document.createElement('button'); node.type = 'button'; node.textContent = text;
  if (primary) node.className = 'primary';
  node.onclick = async () => { node.disabled = true; try { await run(); } finally { node.disabled = false; } };
  return node;
}

export function feedback(target, message, diagnostic = '') {
  target.replaceChildren();
  const explanation = document.createElement('p'); explanation.textContent = message; target.append(explanation);
  if (diagnostic) {
    const details = document.createElement('details');
    details.innerHTML = `<summary>查看技术详情</summary><pre>${esc(diagnostic)}</pre>`;
    target.append(details);
  }
}

export function errorFeedback(target, diagnostic) {
  let message = '操作未完成。请检查目录是否可用，然后重试；未保存的编辑仍保留。';
  if (/conflict|CONFLICT|branch/i.test(diagnostic)) message = '发现版本冲突。请打开「同步检查」核对版本后重试，现有内容仍保留。';
  else if (/请填写|请选择|引用原文|required|description|title|date|Choose|Quote|fragment|handle every unfinished/i.test(diagnostic)) message = '内容需要核对。请检查必填项、日期和来源引用后重新保存。';
  else if (/workspace changed/i.test(diagnostic)) message = '笔记目录已切换。请从当前目录重新打开内容。';
  else if (/有效.*路径|路径超出|relative.*path|invalid.*path/i.test(diagnostic)) message = '路径无效。请填写笔记目录内、以 .md 结尾的相对路径，再重试。';
  feedback(target, message, diagnostic);
}

export function progressLabel(message) {
  const match = message.match(/Indexing .*: (\d+)\/(\d+) files/);
  return match ? `正在载入：${match[1]} / ${match[2]} 个文件` : /index ready/.test(message) ? '' : /Reading confirmed|Rebuilding|Building .* index/.test(message) ? '正在载入本地记录…' : message;
}

// Bind after the modal exists; return focus to its opener on every close path.
export function bindDialog(panel) {
  let origin;
  const controls = () => [...panel.querySelectorAll('button:not(:disabled), input, textarea, select, summary')].filter(node => node.getClientRects().length && !node.closest('[inert]'));
  new MutationObserver(() => {
    if (panel.hidden) { origin?.focus(); origin = null; }
    else if (!panel.contains(document.activeElement)) { origin ||= document.activeElement; controls()[0]?.focus(); }
  }).observe(panel, {attributes: true, attributeFilter: ['hidden']});
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('sync-panel')) { panel.hidden = true; return; }
    const nodes = controls(), index = nodes.indexOf(document.activeElement);
    if (event.key === 'Tab' && nodes.length && ((event.shiftKey && index <= 0) || (!event.shiftKey && index === nodes.length - 1))) {
      event.preventDefault(); nodes[event.shiftKey ? nodes.length - 1 : 0].focus();
    }
  });
}
