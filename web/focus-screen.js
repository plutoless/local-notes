import {statusLabel} from './presentation.js';
import {focusView, focusPosition, focusReturnIndex} from './assets/react-host.js';
import {isOverdue} from './actions.js';
const $ = selector => document.querySelector(selector);
export class FocusScreen {
  constructor(actions, initiatives, navigate, notice) {
    Object.assign(this, {actions, initiatives, navigate, notice});
    this.limit = 7; this.waitingLimit = 50; this.initiativeLimit = 50;
  }
  run = async (operation, followsNavigation = false) => {
    const repository = this.actions.repository, owner = this.ownerGeneration || 0;
    try { return await operation(); }
    catch (error) {
      if (repository === this.actions.repository && (followsNavigation || owner === (this.ownerGeneration || 0))) this.notice(error.message);
    }
  };
  async refreshOwned(repository) {
    const request = (this.request || 0) + 1;
    return await this.show() && this.active && repository === this.actions.repository && request === this.request;
  }
  release() {
    this.ownerGeneration = (this.ownerGeneration || 0) + 1;
    this.request = (this.request || 0) + 1;
    this.view?.release(); this.view = null;
    clearTimeout(this.backgroundTimer);
  }
  mount(list) {
    this.view ||= focusView(list, {
      status: statusLabel, overdue: isOverdue,
      openAction: (action, opener) => this.run(() => this.openAction(action, opener)),
      navigate: page => this.run(() => this.navigate(page), true),
      createInitiative: () => this.run(async () => { if (await this.navigate('initiatives')) await this.initiatives.edit(null); }, true),
      openInitiative: (record, opener) => this.run(() => this.openInitiative(record, opener), true),
      recover: () => this.run(async () => {
        const actions = this.actions.repository, initiatives = this.initiatives.repository;
        const request = this.request;
        const actionResult = await actions.serialize(() => actions.recover());
        const initiativeResult = await initiatives.serialize(() => initiatives.recover());
        if (!this.active || actions !== this.actions.repository || request !== this.request) return;
        const warnings = [...actionResult.warnings, ...initiativeResult.warnings];
        if (warnings.length) this.notice(warnings.join('\n'));
        await this.show();
      }),
      remove: (action, control) => this.run(() => this.managePriority(control, repository =>
        repository.save({...action, focusPosition: null}, action))),
      move: (action, direction, control) => this.run(() => this.managePriority(control, repository => {
        const index = this.priorityOrder.findIndex(record => record.entityId === action.entityId);
        if (index < 0) return;
        const position = focusPosition(this.priorityOrder, index, direction);
        return repository.save({...action, focusPosition: position}, action);
      })),
      more: () => this.run(async () => { this.limit = Math.min(99, this.limit + 50); await this.show(); }),
      page: offset => this.pageFocus(offset),
      waiting: () => this.run(async () => { this.actions.status='waiting'; this.actions.offset=0; this.actions.search=''; this.actions.initiativeFilter=''; $('#search').value=''; if (await this.navigate('actions')) $('#action-filter').value='waiting'; }, true),
      resume: (entry, opener) => this.run(() => this.resumeReading(entry, this.captureRow(opener))),
      removeReading: (path, control) => this.run(() => this.manageRow(control, () => this.removeReading(path)))
    });
    return this.view;
  }
  async show() {
    $('.app').classList.remove('workspace'); $('#workspace-context').hidden = true; $('.app').classList.add('home'); $('#library-tools').hidden = true; $('#index-state').textContent = '正在载入重点…';
    const request = this.request = (this.request || 0) + 1;
    const repository = this.actions.repository;
    $('#view-title').textContent = '当前重点'; $('#search').hidden = true;
    $('#action-tools').hidden = true; $('#initiative-tools').hidden = true;
    $('#editor').hidden = true; $('#action-editor').hidden = true; $('#initiative-editor').hidden = true; $('#empty').hidden = true;
    const owns = () => this.active && repository === this.actions.repository && request === this.request;
    let offset = this.focusOffset || 0;
    const limit = this.limit;
    let priorities, waiting, initiatives;
    try {
      [priorities, waiting, initiatives] = await Promise.all([
        this.queryPriorities(repository, offset, limit),
        repository.query({status: 'waiting', limit: this.waitingLimit}),
        this.initiatives.repository.query({status: 'active', limit: this.initiativeLimit})
      ]);
      if (owns() && offset && !priorities.focused.actions.length) {
        offset = priorities.order.length ? Math.max(0, offset - limit) : 0;
        priorities = await this.queryPriorities(repository, offset, limit);
      }
    } catch (error) {
      if (!owns()) return;
      throw error;
    }
    if (!owns()) return;
    $('#index-state').textContent = ''; const list = $('#items');
    const active = document.activeElement;
    const opener = active.closest('.card')?.querySelector('[data-focus-row]');
    const origin = opener && list.contains(opener) ? this.captureRow(opener) : null;
    const listScroll = list.scrollTop, collectionScroll = $('.collection').scrollTop;
    this.focusOffset = offset;
    this.priorityOrder = priorities.order;
    this.model = {focused: priorities.focused, waiting, initiatives, recent: this.recentReading?.() || [], limit, offset};
    this.mount(list);
    this.render();
    if (origin && document.activeElement === document.body) this.focusRow(origin, true);
    list.scrollTop = listScroll; $('.collection').scrollTop = collectionScroll;
    return true;
  }
  async queryPriorities(repository, offset, limit) {
    const [focused, previous] = await Promise.all([
      repository.query({focus: true, offset, limit: Math.min(100, limit + 2)}),
      offset ? repository.query({focus: true, offset: Math.max(0, offset - 2), limit: Math.min(offset, 2)}) : null
    ]);
    // The index caps queries at 100. A full page needs two lookahead records
    // to insert after its last row's next neighbor without skipping a priority.
    const following = limit === 99 && focused.hasMore
      ? await repository.query({focus: true, offset: offset + 100, limit: 1})
      : null;
    return {focused, order: [...(previous?.actions || []), ...focused.actions, ...(following?.actions || [])]};
  }
  render() {
    this.view?.render({...this.model, priorityBusy: this.priorityMutation === this.actions.repository});
  }
  captureRow(opener) {
    const section = opener?.closest('[data-focus-section]');
    return {
      section: section?.dataset.focusSection,
      key: opener?.dataset.focusRow,
      index: section ? [...section.querySelectorAll('[data-focus-row]')].indexOf(opener) : 0,
      offset: this.focusOffset || 0,
      scroll: $('.collection').scrollTop,
      listScroll: $('#items').scrollTop
    };
  }
  focusRow(origin, preventScroll = false) {
    const section = origin.section && $(`#items [data-focus-section="${origin.section}"]`);
    const rows = section ? [...section.querySelectorAll('[data-focus-row]')] : [];
    const previousIndex = origin.section === 'priorities' && origin.offset > this.focusOffset ? rows.length - 1 : origin.index;
    const index = focusReturnIndex(rows.map(row => row.dataset.focusRow), origin.key, previousIndex);
    const target = rows[index] || section?.querySelector('button:not(:disabled)') ||
      (origin.section === 'reading' && [...document.querySelectorAll('#items [data-focus-row]')].at(-1)) ||
      $('.home-tools .focus-new-action');
    target?.focus({preventScroll});
  }
  restoreRow(origin) {
    $('.collection').scrollTop = origin.scroll;
    $('#items').scrollTop = origin.listScroll;
    this.focusRow(origin);
  }
  async managePriority(control, change) {
    const repository = this.actions.repository;
    if (this.priorityMutation === repository) return;
    this.priorityMutation = repository;
    try {
      const result = this.manageRow(control, change);
      this.render();
      await result;
    } finally {
      if (this.priorityMutation === repository) {
        this.priorityMutation = null;
        this.render();
      }
    }
  }
  async manageRow(control, change) {
    const menu = control.closest('details');
    const trigger = menu.querySelector('summary');
    const origin = this.captureRow(menu.closest('.card').querySelector('[data-focus-row]'));
    if (menu.contains(document.activeElement)) trigger.focus({preventScroll: true});
    menu.open = false;
    const receiver = document.activeElement;
    const repository = this.actions.repository, owner = this.ownerGeneration;
    await change(repository);
    if (!this.active || repository !== this.actions.repository || owner !== this.ownerGeneration) return;
    if (!await this.refreshOwned(repository)) return;
    if (document.activeElement === receiver || (!receiver.isConnected && document.activeElement === document.body)) this.focusRow(origin);
  }
  async pageFocus(offset) {
    const previous = this.focusOffset;
    this.focusOffset = offset;
    const repository = this.actions.repository, request = (this.request || 0) + 1, owner = this.ownerGeneration || 0;
    try { if (await this.show() && this.active && repository === this.actions.repository && request === this.request) $('#items .focus-row-open')?.focus({preventScroll: true}); }
    catch (error) {
      if (!this.active || repository !== this.actions.repository || request !== this.request || owner !== (this.ownerGeneration || 0)) return;
      this.focusOffset = previous; $('#index-state').textContent = ''; this.notice(error.message);
    }
  }
  async openAction(action, opener) {
    const origin = this.captureRow(opener);
    const repository = this.actions.repository, request = (this.actions.openRequest || 0) + 1;
    const owns = () => repository === this.actions.repository && request === this.actions.openRequest;
    const returnToFocus = async () => {
      if (!owns()) return;
      if (!this.active) { if (!await this.navigate('focus')) return; }
      else if (!await this.show()) return;
      if (!owns() || !this.active) return;
      this.restoreRow(origin);
      if (this.actions.returnToFocus === returnToFocus) this.actions.returnToFocus = null;
    };
    // Install the opener-owned return before option loading so early Cancel has the correct origin.
    this.actions.returnToFocus = returnToFocus;
    await this.actions.edit(action, null, null, opener);
    if ((!owns() || !this.active || !this.actions.drawer.panel.open) && this.actions.returnToFocus === returnToFocus) this.actions.returnToFocus = null;
  }
  async openInitiative(record, opener) {
    const origin = this.captureRow(opener);
    if (!await this.navigate('initiatives')) return;
    const owner = this.actions.owner();
    const focusReturn = {
      entityId: record.entityId,
      restore: async () => { if (await this.navigate('focus')) this.restoreRow(origin); }
    };
    this.initiatives.setFocusReturn(focusReturn);
    try {
      await this.initiatives.edit(record);
    } finally {
      if (this.actions.owner() === owner && this.initiatives.focusReturn === focusReturn &&
          this.initiatives.previous?.entityId !== record.entityId) this.initiatives.setFocusReturn(null);
    }
  }
}
