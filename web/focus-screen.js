import {statusLabel} from './presentation.js';
import {focusView, focusPosition} from './assets/react-host.js';
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
      openAction: action => this.run(() => this.openAction(action)),
      navigate: page => this.run(() => this.navigate(page), true),
      createInitiative: () => this.run(async () => { if (await this.navigate('initiatives')) await this.initiatives.edit(null); }, true),
      openInitiative: record => this.run(async () => { if (await this.navigate('initiatives')) await this.initiatives.edit(record); }, true),
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
      remove: action => this.run(async () => {
        const repository = this.actions.repository, request = this.request;
        await repository.save({...action, focusPosition:null}, action);
        if (!this.active || repository !== this.actions.repository || request !== this.request) return;
        if (await this.refreshOwned(repository)) $('#items .focus-row-open, .home-tools .primary')?.focus();
      }),
      move: (action, index, direction) => this.run(async () => {
        const repository = this.actions.repository, request = this.request;
        const position = focusPosition(this.focused.actions, index, direction);
        await repository.save({...action, focusPosition:position}, action);
        if (!this.active || repository !== this.actions.repository || request !== this.request) return;
        if (await this.refreshOwned(repository)) [...document.querySelectorAll('.focus-row-open')].find(node => node.dataset.entityId === action.entityId)?.focus();
      }),
      more: () => this.run(async () => { this.limit = Math.min(99, this.limit + 50); await this.show(); }),
      page: offset => this.pageFocus(offset),
      waiting: () => this.run(async () => { this.actions.status='waiting'; this.actions.offset=0; this.actions.search=''; this.actions.initiativeFilter=''; $('#search').value=''; if (await this.navigate('actions')) $('#action-filter').value='waiting'; }, true),
      resume: entry => this.run(() => this.resumeReading(entry)),
      removeReading: path => this.run(() => this.removeReading(path))
    });
    return this.view;
  }
  async show() {
    const readingFocus = document.activeElement?.dataset.readingPath;
    $('.app').classList.remove('workspace'); $('#workspace-context').hidden = true; $('.app').classList.add('home'); $('#library-tools').hidden = true; $('#index-state').textContent = '正在载入重点…';
    const request = this.request = (this.request || 0) + 1;
    const repository = this.actions.repository;
    $('#view-title').textContent = '当前重点'; $('#search').hidden = true;
    $('#filters').hidden = true; $('#action-tools').hidden = true; $('#initiative-tools').hidden = true;
    $('#editor').hidden = true; $('#action-editor').hidden = true; $('#initiative-editor').hidden = true; $('#empty').hidden = true;
    const [focused, waiting, initiatives] = await Promise.all([
      repository.query({focus: true, offset: this.focusOffset || 0, limit: this.limit + 1}),
      repository.query({status: 'waiting', limit: this.waitingLimit}),
      this.initiatives.repository.query({status: 'active', limit: this.initiativeLimit})
    ]);
    if (!this.active || repository !== this.actions.repository || request !== this.request) return;
    $('#index-state').textContent = ''; const list = $('#items');
    const active = document.activeElement;
    const focusedAction = list.contains(active) ? active.dataset.entityId : null;
    const focusedSummary = list.contains(active) && active.tagName === 'SUMMARY' ? active.dataset.focusKey : null;
    const expanded = [...list.querySelectorAll('details[open] > summary')].map(node => node.dataset.focusKey);
    const listScroll = list.scrollTop, collectionScroll = $('.collection').scrollTop;
    this.focused = focused;
    this.mount(list).render({focused, waiting, initiatives, recent:this.recentReading?.() || [], limit:this.limit, offset:this.focusOffset || 0});
    if (readingFocus && document.activeElement === document.body) [...list.querySelectorAll('[data-reading-path]')].find(node => node.dataset.readingPath === readingFocus)?.focus({preventScroll:true});
    for (const summary of list.querySelectorAll('summary')) {
      const key = summary.dataset.focusKey;
      if (expanded.includes(key)) summary.parentElement.open = true;
      if (focusedSummary === key) summary.focus({preventScroll: true});
    }
    if (focusedAction) [...list.querySelectorAll('.focus-row-open')].find(node => node.dataset.entityId === focusedAction)?.focus({preventScroll: true});
    list.scrollTop = listScroll; $('.collection').scrollTop = collectionScroll;
    return true;
  }
  async pageFocus(offset) {
    const previous = this.focusOffset;
    this.focusOffset = offset;
    const repository = this.actions.repository, request = (this.request || 0) + 1;
    try { if (await this.show() && this.active && repository === this.actions.repository && request === this.request) $('#items .focus-row-open')?.focus({preventScroll: true}); }
    catch (error) { this.focusOffset = previous; $('#index-state').textContent = ''; this.notice(error.message); }
  }
  async openAction(action) {
    const scroll = $('.collection').scrollTop, listScroll = $('#items').scrollTop;
    const repository = this.actions.repository, request = (this.actions.openRequest || 0) + 1;
    const owns = () => repository === this.actions.repository && request === this.actions.openRequest;
    const returnToFocus = async () => {
      if (!owns()) return;
      if (!this.active) { if (!await this.navigate('focus')) return; }
      else if (!await this.show()) return;
      if (!owns() || !this.active) return;
      const opener = [...document.querySelectorAll('.focus-row-open')].find(node => node.dataset.entityId === action?.entityId);
      (opener || $('.home-tools .primary')).focus({preventScroll: true});
      $('.collection').scrollTop = scroll; $('#items').scrollTop = listScroll;
      if (this.actions.returnToFocus === returnToFocus) this.actions.returnToFocus = null;
    };
    // Install the opener-owned return before option loading so early Cancel has the correct origin.
    this.actions.returnToFocus = returnToFocus;
    await this.actions.edit(action);
    if ((!owns() || !this.active || !this.actions.drawer.panel.open) && this.actions.returnToFocus === returnToFocus) this.actions.returnToFocus = null;
  }

}
