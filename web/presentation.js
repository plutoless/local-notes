import {escapeHTML as esc} from './core.js';

// Presentation vocabulary never changes persisted enum values or user content.
export const actionLabels = {todo: '待办', 'in-progress': '进行中', waiting: '等待中', completed: '已完成', canceled: '已取消'};
export const initiativeLabels = {active: '进行中', later: '以后再做', ended: '已结束'};
export const sourceLabels = {unchanged: '来源未变', available: '来源可用', changed: '来源已修改，请核对引用', valid: '来源可用', unavailable: '来源不可用，请重新关联', missing: '来源缺失，请重新关联', moved: '来源已移动', ambiguous: '找到多个来源，请手动关联'};
export const statusLabel = value => actionLabels[value] || initiativeLabels[value] || sourceLabels[value] || '需要核对';

export function button(text, run, {primary = false, variant = primary ? 'primary' : 'quiet', label, density} = {}) {
  const node = document.createElement('button'); node.type = 'button'; node.textContent = text;
  node.className = `ui-action ${variant}${density === 'compact' ? ' ui-compact' : ''}`;
  if (label) node.setAttribute('aria-label', label);
  node.onclick = async () => { node.disabled = true; try { await run(); } finally { node.disabled = false; } };
  return node;
}

// Keep keyboard position meaningful when the activated page direction becomes disabled.
export function pageAvailability(previous, next, hasPrevious, hasNext) {
  const active = document.activeElement;
  previous.disabled = !hasPrevious; next.disabled = !hasNext;
  if ((active === previous || active === next) && active.disabled) {
    const fallback = previous.disabled ? next : previous;
    if (!fallback.disabled) fallback.focus({preventScroll: true});
    else {
      const result = document.querySelector('#items .ui-row') || document.querySelector('#view-title');
      if (result) { if (result.id === 'view-title') result.tabIndex = -1; result.focus({preventScroll: true}); }
    }
  }
}

export function feedback(target, message, diagnostic = '') {
  target.classList.add('ui-feedback');
  target.dataset.state = diagnostic ? 'failed' : 'saved';
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
  const controls = () => [...panel.querySelectorAll('button:not(:disabled), input, textarea, select, summary')].filter(node => !node.matches(':disabled') && node.getClientRects().length && !node.closest('[inert]'));
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
  return {open() {
    if (!panel.hidden) return;
    origin = document.activeElement;
    panel.hidden = false;
    controls()[0]?.focus();
  }};
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

// These constructors own DOM presentation only; callers retain queries and mutations.
export function disclosure(label, children = [], className = '') {
  const node = document.createElement('details'); node.className = `ui-disclosure ${className}`;
  const summary = document.createElement('summary'); summary.textContent = label;
  node.append(summary, ...children); return node;
}

export function sectionHeading(text, {level = 2, className = ''} = {}) {
  const node = document.createElement(`h${level}`); node.className = `ui-heading ${className}`;
  node.textContent = text; return node;
}

export function field(label, control, {help = '', invalid = false, density} = {}) {
  const node = document.createElement('label'); node.className = 'ui-field';
  const name = document.createElement('span'); name.textContent = label;
  control.setAttribute('aria-invalid', String(invalid));
  if (density === 'compact') {
    const target = document.createElement('span'); target.className = 'ui-field-target';
    target.append(control); node.append(name, target);
  } else node.append(name, control);
  if (help) {
    const hint = document.createElement('small'); hint.id = `field-help-${++field.sequence}`;
    hint.textContent = help; node.append(hint); control.setAttribute('aria-describedby', hint.id);
  }
  return node;
}
field.sequence = 0;

export function selectionRow(label, run, {selected = false} = {}) {
  const node = button(label, run); node.classList.add('ui-row');
  node.classList.toggle('selected', selected); node.setAttribute('aria-current', String(selected));
  return node;
}

export function pagination(previous, next, {hasPrevious = false, hasNext = false} = {}) {
  const node = document.createElement('div'); node.className = 'ui-pagination';
  const back = button('上一页', previous, {variant: 'secondary'});
  const forward = button('下一页', next, {variant: 'secondary'});
  back.disabled = !hasPrevious; forward.disabled = !hasNext; node.append(back, forward); return node;
}

// A definition row keeps long field evidence readable without horizontal tables.
export function comparisonRow(label, value, {changed = false} = {}) {
  const node = document.createElement('div'); node.className = 'ui-comparison-row';
  const term = document.createElement('dt'), detail = document.createElement('dd');
  term.textContent = label + (changed ? ' · 有差异' : ''); detail.textContent = value;
  node.append(term, detail); return node;
}

// The native modal top layer owns background inertness and keyboard containment.
// Consumers own validation, persistence and the unsaved-data decision.
export function drawer({id, title, onDismiss}) {
  const panel = document.createElement('dialog'); panel.id = id; panel.className = 'ui-drawer';
  const heading = sectionHeading(title); heading.id = `${id}-title`;
  panel.setAttribute('aria-labelledby', heading.id);
  const header = document.createElement('header'); header.className = 'ui-drawer-header';
  const close = button('关闭', () => onDismiss(), {label: '关闭' + title, density: 'compact'});
  header.append(heading, close);
  const body = document.createElement('div'); body.className = 'ui-drawer-body';
  const footer = document.createElement('footer'); footer.className = 'ui-drawer-footer';
  panel.append(header, body, footer); document.body.append(panel);
  panel.addEventListener('cancel', event => { event.preventDefault(); onDismiss(); });
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...panel.querySelectorAll('button, input, select, textarea, summary, [tabindex]')]
      .filter(node => !node.matches(':disabled') && node.tabIndex >= 0 && node.getClientRects().length);
    const index = controls.indexOf(document.activeElement);
    if (controls.length) {
      // WKWebView can skip buttons under the system text-fields-only Tab setting.
      // Advance explicitly so every short-task control stays reachable and contained.
      const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      event.preventDefault(); controls[next].focus();
    }
  });
  panel.addEventListener('click', event => {
    const rect = panel.getBoundingClientRect();
    if (event.target === panel && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onDismiss();
  });
  let opener;
  return {panel, body, footer, close, setTitle(text) { heading.textContent = text; close.setAttribute('aria-label', '关闭' + text); },
    open(first, origin = document.activeElement) { if (panel.open) return; opener = origin; panel.showModal(); first?.focus(); },
    hide() { panel.close(); (opener?.isConnected ? opener : document.querySelector('#library-create-topic'))?.focus({preventScroll: true}); }
  };
}

// One leave intent owns one captured task. A second navigation cannot reuse its result.
let leavingTask = false;
export function taskLeavePending() { return leavingTask; }
export async function requestTaskLeave(task) {
  if (!task) return true;
  if (leavingTask) return false;
  leavingTask = true;
  task.suspend?.();
  try {
    // Submitted writes are not cancellable. Establish their result before discarding
    // any remaining input; a committed revision is never silently rolled back.
    await task.pending?.();
    let failure = '';
    while (task.dirty()) {
      const choice = await taskLeaveChoice(task.label, failure, task.committed?.(), task.focusOrigin?.());
      if (choice === 'continue') return false;
      if (choice === 'discard') { await task.discard(); break; }
      try {
        if (await task.save()) continue;
        failure = '保存尚未完成。可重试保存、放弃尚未提交的更改，或继续编辑。已保存的版本仍保留。';
      } catch (error) { failure = '保存尚未完成：' + error.message; }
    }
    return await task.close?.() !== false;
  } finally { leavingTask = false; task.resume?.(); }
}

function taskLeaveChoice(label, failure, committed, focusOrigin) {
  return new Promise(resolve => {
    const origin = focusOrigin || document.activeElement;
    const panel = document.createElement('dialog'); panel.id = 'task-leave-decision'; panel.className = 'task-leave-decision ui-panel';
    panel.setAttribute('aria-labelledby', 'task-leave-title');
    const title = document.createElement('h2'); title.id = 'task-leave-title'; title.textContent = '离开' + label;
    const message = document.createElement('p'); message.textContent = committed ? '版本已保存，恢复尚未完成。保存并离开会重试恢复；放弃更改并离开只会清除本机待处理状态，已保存版本仍保留。' : '当前编辑尚未保存。请选择保存并离开、放弃更改并离开，或继续编辑。';
    const status = document.createElement('p'); status.setAttribute('role', 'alert'); status.textContent = failure;
    const footer = document.createElement('div'); footer.className = 'ui-actions';
    const keep = button('继续编辑', () => finish('continue'));
    footer.append(keep,
      button('放弃更改并离开', () => finish('discard'), {variant: 'danger'}),
      button('保存并离开', () => finish('save'), {primary: true}));
    panel.append(title, message, status, footer); document.body.append(panel);
    panel.addEventListener('cancel', event => { event.preventDefault(); finish('continue'); });
    panel.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...footer.querySelectorAll('button')], index = controls.indexOf(document.activeElement);
      if (event.shiftKey ? index <= 0 : index === controls.length - 1) {
        event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0].focus();
      }
    });
    function finish(choice) {
      panel.close(); panel.remove(); origin?.focus({preventScroll:true}); resolve(choice);
      // An async dismissal button is re-enabled only after its leave promise
      // settles. Restore that opener after its event handler has completed.
      setTimeout(() => { if (!document.getElementById('task-leave-decision') && origin?.isConnected) origin.focus({preventScroll:true}); }, 0);
    }
    panel.showModal(); keep.focus();
  });
}
