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
  const controls = () => [...panel.querySelectorAll('button:not(:disabled), input, textarea, select, summary')].filter(node => node.getClientRects().length);
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

// Icons are fixed presentation assets, never generated from user content.
export function icon(name) {
  const paths = {
    focus: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 3 3 5-6"/>',
    notes: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
    actions: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    initiatives: '<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M6 10v7h8M10 7h8v7"/>',
    organize: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    favorites: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    folder: '<path d="M3 7V5h7l2 2h9v13H3z"/>',
    sync: '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.notes}</svg>`;
}

export function directoryLabel(root) {
  const label = document.querySelector('#root-label');
  label.textContent = root;
  document.querySelector('#root-name').textContent = root === 'Sample' ? '样本笔记' : root?.split(/[\\/]/).filter(Boolean).pop() || '本地笔记';
}
