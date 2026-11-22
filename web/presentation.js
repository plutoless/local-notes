import {failureMessage} from './presentation-labels.js';
import {drawerContent, leaveContent, feedbackContent} from './assets/react-host.js';

export {actionLabels, initiativeLabels, sourceLabels, statusLabel} from './presentation-labels.js';

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
  feedbackContent(target, message, diagnostic);
}

export function errorFeedback(target, diagnostic) {
  const message = failureMessage(diagnostic);
  feedback(target, message, diagnostic);
}

export function progressLabel(message) {
  const match = message.match(/Indexing .*: (\d+)\/(\d+) files/);
  return match ? `正在载入：${match[1]} / ${match[2]} 个文件` : /index ready/.test(message) ? '' : /Reading confirmed|Rebuilding|Building .* index/.test(message) ? '正在载入本地记录…' : message;
}

// The native top layer owns inertness. Step through controls explicitly for
// WKWebView's text-fields-only Tab setting.
export function bindModal(panel, dismiss) {
  panel.addEventListener('cancel', event => { event.preventDefault(); dismiss(event); });
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const closed = [...panel.querySelectorAll('details:not([open])')];
    const controls = [...panel.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')]
      .filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length
        && !node.closest('[inert]') && !closed.some(detail =>
          detail.contains(node) && !detail.querySelector(':scope > summary')?.contains(node)));
    if (!controls.length) return;
    const index = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const next = index < 0
      ? (event.shiftKey ? controls.length - 1 : 0)
      : (index + direction + controls.length) % controls.length;
    event.preventDefault();
    controls[next].focus();
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

export {bindDirectoryLabel, directoryLabel} from './directory-label.js';

// The native modal top layer owns background inertness and keyboard containment.
// Consumers own validation, persistence and the unsaved-data decision.
export function drawer({id, title, onDismiss}) {
  const panel = document.createElement('dialog'); panel.id = id; panel.className = 'ui-drawer';
  panel.setAttribute('aria-labelledby', `${id}-title`);
  const content = drawerContent(panel, id, title, onDismiss);
  const {body, footer, close} = content;
  document.body.append(panel);
  bindModal(panel, onDismiss);
  panel.addEventListener('click', event => {
    const rect = panel.getBoundingClientRect();
    if (event.target === panel && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onDismiss();
  });
  let opener, autofocusTarget;
  return {panel, body, footer, close, setTitle: content.setTitle,
    open(first, origin = document.activeElement) {
      if (panel.open) return;
      opener = origin;
      // WKWebView's native dialog autofocus can run after keyboard activation.
      // Declare the intended receiver as well as focusing it synchronously.
      if (first && !first.hasAttribute('autofocus')) { autofocusTarget = first; first.setAttribute('autofocus', ''); }
      panel.showModal(); first?.focus();
    },
    hide() { panel.close(); autofocusTarget?.removeAttribute('autofocus'); autofocusTarget = null; (opener?.isConnected ? opener : document.querySelector('#library-create-topic'))?.focus({preventScroll: true}); }
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
    const selection = typeof origin?.selectionStart === 'number'
      ? [origin.selectionStart, origin.selectionEnd, origin.selectionDirection] : null;
    const panel = document.createElement('dialog'); panel.id = 'task-leave-decision'; panel.className = 'task-leave-decision ui-panel ui-modal';
    panel.setAttribute('aria-labelledby', 'task-leave-title');
    const content = leaveContent(panel, {label, failure, committed:Boolean(committed)}, finish);
    const {keep} = content;
    document.body.append(panel);
    bindModal(panel, () => finish('continue'));
    function finish(choice) {
      const restoreSelection = () => {
        if (choice === 'continue' && selection && document.activeElement === origin) origin.setSelectionRange(...selection);
      };
      panel.close(); content.dispose(); panel.remove(); origin?.focus({preventScroll:true}); restoreSelection();
      // The fallback belongs to this return only. New input or focus supersedes it.
      let superseded = false;
      const supersede = () => { superseded = true; };
      const intents = ['focusin', 'keydown', 'pointerdown', 'beforeinput', 'input'];
      for (const type of intents) document.addEventListener(type, supersede, true);
      resolve(choice);
      // An async dismissal button is re-enabled only after its leave promise
      // settles. Restore that opener after its event handler has completed.
      setTimeout(() => {
        for (const type of intents) document.removeEventListener(type, supersede, true);
        if (!superseded && !document.getElementById('task-leave-decision') && origin?.isConnected) {
          origin.focus({preventScroll:true}); restoreSelection();
        }
      }, 0);
    }
    panel.showModal(); keep.focus();
  });
}
