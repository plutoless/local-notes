import {initiativeSources, initiativeEnding, mountInitiativeControls, initiativeRows, initiativeLinks, initiativeActions, initiativeDecisions, mountInitiativeSource, openInitiativeAction, receiptView} from './assets/react-host.js';
import {recoverTaskDraft} from './task-drafts.js';
import {pageAvailability, requestTaskLeave, statusLabel, errorFeedback, progressLabel, drawer} from './presentation.js';
import {InitiativeRepository, allRecords, endInitiative, unfinished, fingerprint, sourceState} from './initiatives.js';
import {native} from './bridge.js';
const $ = selector => document.querySelector(selector);
export class InitiativeScreen {
  constructor(actions, notice, openNote, createNote, listReferences, beforeEdit = async () => true) {
    this.beforeEdit = beforeEdit; this.detailKind = 'overview'; this.listReferences = listReferences; this.actions = actions; this.notice = notice; this.openNote = openNote; this.createNote = createNote; this.repository = new InitiativeRepository(native); this.active = false; this.dirty = false; this.offset = 0; this.search = ''; this.listGeneration = 0;
    this.receipt = receiptView(() => $('#initiative-save-state'));
    this.endingCommitted = new Set();
    this.setupDrawer();
    $('#initiative-recover').onclick = async () => {
      const draft = recoverTaskDraft('initiative', this.repository.workspaceId);
      if (!draft) { this.notice('没有待恢复的事项草稿。', true); return; }
      await this.edit(draft.value.previous || null, true, draft);
    };
    $('#initiative-new').onclick = event => this.edit(null, true, null, event.currentTarget);
    $('#initiative-next').onclick = () => { this.offset += 50; this.list().catch(e => notice(e.message)); };
    $('#initiative-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.list().catch(e => notice(e.message)); };
    $('#initiative-form').oninput = event => {
      const input = event.target;
      if (input.matches('[aria-invalid]') && input.validity?.valid) {
        input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
      }
      this.changed(); this.ending();
    };
    $('#initiative-form').addEventListener('invalid', event => {
      event.preventDefault();
      const input = event.target;
      if ($('#initiative-form').querySelector(':invalid') !== input) return;
      if (input.closest('#initiative-link-details')) $('#initiative-link-details').open = true;
      input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'initiative-save-state'); input.focus();
      errorFeedback($('#initiative-save-state'), '请填写标题、路径和引用原文后重试。');
    }, true);
    $('#initiative-status').onchange = () => { this.changed(); this.ending(); };
    $('#initiative-cancel-ending').onclick = () => { $('#initiative-status').value = this.previous?.status || 'active'; this.changed(); this.ending(); };
    $('#initiative-form').onsubmit = event => { event.preventDefault(); this.save(); };
    $('#initiative-discard').onclick = () => this.leaveDrawer();
    $('#initiative-back').textContent = '‹ 行动与资料';
    $('#initiative-back').onclick = () => this.returnContext();
    $('#workspace-back').onclick = async () => {
      if (!await this.beforeEdit()) return;
      this.editGeneration = (this.editGeneration || 0) + 1;
      $('.app').classList.remove('editing', 'detail-open');
      $('#workspace-context').hidden = true;
      $('#initiative-editor').hidden = true;
      $('#empty').hidden = false;
      this.restoreList();
    };
    $('#workspace-overview').onclick = event => this.edit(this.previous, true, null, event.currentTarget).catch(e => notice(e.message));
    $('#initiative-add-link').onclick = () => { this.addLink({path: '', quote: '', fingerprint: '', role: 'working-note'}); this.changed(); };
    $('#initiative-new-action').onclick = event => this.createAction(event.currentTarget);
    $('#initiative-new-note').onclick = async event => {
      const opener = event.currentTarget, record = this.previous;
      if (!record || !await this.beforeEdit() || this.previous !== record) return;
      this.rememberContext(opener);
      await this.createNote(record, opener);
    };
  }
  async createAction(opener) {
    const record = this.previous;
    if (!record || record.status === 'ended' || !await this.beforeEdit() || this.previous !== record) return;
    await openInitiativeAction(this.actions, null, opener, record.entityId);
  }
  setupDrawer() {
    this.drawer = drawer({id: 'initiative-drawer', title: '新建事项', onDismiss: () => this.leaveDrawer()});
    this.drawer.panel.classList.add('ui-drawer-wide');
    mountInitiativeControls(this.drawer.body, this.drawer.footer, $('#initiative-tools'), $('#workspace-context'));
    this.contextViews = Object.fromEntries([
      ['#initiative-actions', initiativeActions], ['#initiative-retired', initiativeActions],
      ['#workspace-notes', initiativeLinks], ['#workspace-references', initiativeLinks]
    ].map(([selector, mount]) => [selector, mount($(selector))]));
    this.decisionsView = initiativeDecisions($('#initiative-decisions'));
    this.sourceReleases = [];
  }
  release() { this.listGeneration++; this.rowsView?.release(); this.rowsView = null; }
  contextSnapshot() { return Object.fromEntries(Object.entries(this.contextViews).map(([selector, view]) => [selector, view.snapshot()])); }
  restoreSnapshot(snapshot) { for (const [selector, model] of Object.entries(snapshot)) if (model) this.contextViews[selector].restore(model); }

  selectInitiative(record) {
    this.rowsView?.select(record?.entityId);
  }

  rememberCommit(record) {
    if (this.drawerContext?.previous?.entityId === record.entityId) {
      this.drawerContext.previous = record; this.drawerContext.committed = true;
    }
  }
  async closeDrawer(discard = false) {
    if (!this.drawer.panel.open) return true;
    if (this.closing) return false;
    this.closing = true;
    try {
      try {
        if (this.drawerContext?.refreshWorkspace || this.drawerContext?.refreshAction) {
          await this.actions.repository.serialize(() => this.actions.repository.recover());
          await this.repository.serialize(() => this.repository.recover());
        }
        if (this.drawerContext?.refreshWorkspace) {
          await this.details();
          this.drawerContext.views = null; this.drawerContext.text = {}; this.drawerContext.refreshWorkspace = false;
        }
        if (this.drawerContext?.refreshAction) {
          const record = (await allRecords(this.actions.repository)).find(action => action.entityId === this.drawerContext.refreshAction);
          if (!record) throw Error('所选行动暂不可用，请恢复目录后重试。');
          if (!this.drawerContext.hidden['#action-editor']) { this.actions.showForm(record, record); this.actions.state('已保存到本地'); }
          else this.actions.previous = record;
          this.drawerContext.refreshAction = null;
        }
      } catch (error) {
        if (!discard) {
          this.recoveryPending = true;
          this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline; this.draft();
          this.receipt.failure(error.message, '关联行动尚未恢复，草稿仍保留。请重试关闭，或继续编辑。'); return false;
        }
        this.notice('已放弃尚未提交的更改。已提交的版本仍保留，关联列表稍后需要刷新。');
        if (this.drawerContext?.committedAction) this.actions.showForm(this.drawerContext.committedAction, this.drawerContext.committedAction);
      }
      if (!this.dirty) localStorage.removeItem(this.key());
      if (discard) {
        localStorage.removeItem(this.key()); this.dirty = false; this.recoveredDraft = false; this.retry = null;
      }
      if (this.drawerContext) {
        const context = this.drawerContext;
        this.previous = context.previous;
        if (context.views) this.restoreSnapshot(context.views);
        for (const [selector, text] of Object.entries(context.text)) $(selector).textContent = text;
        if (context.committed) this.renderContext();
        this.selectContext(context.selectedContext); this.detailKind = context.detailKind;
        for (const [selector, hidden] of Object.entries(context.hidden)) $(selector).hidden = hidden;
        $('.app').className = context.classes;
        for (const [selector, scroll] of Object.entries(context.scroll)) $(selector).scrollTop = scroll;
        this.updateActionAvailability();
        $('#initiative-new-note').disabled = !this.previous;
        this.drawerContext = null;
        if (context.committedAction) { this.actions.showForm(context.committedAction, context.committedAction); this.actions.dirty = false; this.actions.state('已保存到本地'); }
        if (context.actionOpen) { this.actions.drawerContext = context.actionDrawerContext; this.actions.drawer.open($('#action-description')); }
        this.selectInitiative(this.previous);
      }
      this.recoveryPending = false; this.drawer.hide();
      if (document.activeElement === document.body || !document.activeElement?.getClientRects().length) {
        const fallback = ['#action-description', '#mode', '#workspace-overview', '#initiative-new'].map(selector => $(selector)).find(node => !node.disabled && node.getClientRects().length);
        fallback?.focus({preventScroll: true});
      }
      return true;
    } finally { this.closing = false; }
  }
  leaveDrawer() { return this.drawer.panel.open ? requestTaskLeave(this.task()) : Promise.resolve(true); }
  task() {
    return {label: '事项', pending: () => this.saving, dirty: () => this.dirty || this.recoveryPending, committed: () => Boolean(this.retry || this.recoveryPending || this.endingCommitted.size),
      save: () => this.save(), discard: () => {
        localStorage.removeItem(this.key()); this.dirty = false; this.recoveredDraft = false; this.retry = null;
        this.editGeneration = (this.editGeneration || 0) + 1;
        // Explicit discard cannot be held hostage by a failed refresh after a
        // completed business transaction. Its saved revisions remain intact.
        return this.closeDrawer(true);
      }, close: () => this.closeDrawer()};
  }
  openDrawer(origin) {
    this.drawer.setTitle(this.previous ? '编辑事项' : '新建事项');
    this.drawer.open($('#initiative-title'), origin);
  }
  state(message) {
    const target = $('#initiative-save-state'); target.textContent = message;
    target.dataset.state = /恢复/.test(message) ? 'recovered' : /正在保存/.test(message) ? 'saving' : /尚未保存|新建/.test(message) ? 'dirty' : 'saved';
  }
  recoveredMessage() {
    return this.endingCommitted.size ? '已恢复事项草稿。已保存的行动处理仍然有效。' : '已恢复事项草稿，请核对后保存。';
  }
  updateActionAvailability(record = this.previous) {
    const disabled = !record || record.status === 'ended';
    $('#initiative-new-action').disabled = disabled;
    this.onActionAvailability?.(disabled);
  }
  selectContext(key = '') {
    this.selectedContext = key;
    for (const view of Object.values(this.contextViews)) view.select(key);
  }
  selectNote(path) {
    const origin = this.contextReturn;
    this.selectContext(origin?.path === path ? origin.source || path : path);
  }

  rememberContext(node = document.activeElement) {
    if (this.detailKind !== 'overview') return;
    if (!$('#workspace-context').contains(node)) return;
    this.contextReturn = {
      id: node.id, action: node.dataset.actionId, path: node.dataset.path,
      sourceRole: node.dataset.sourceRole, source: node.dataset.initiativeSource,
      mainScroll: $('main').scrollTop
    };
  }
  restoreContext() {
    this.detailKind = 'overview';
    $('.app').classList.remove('detail-open');
    const origin = this.contextReturn;
    const controls = [...$('#workspace-context').querySelectorAll('button')];
    const node = origin && (controls.find(node => origin.id ? node.id === origin.id
      : origin.action ? node.dataset.actionId === origin.action
      : origin.source && node.dataset.initiativeSource === origin.source)
      || controls.find(node => origin.path && node.dataset.path === origin.path && node.dataset.sourceRole === origin.sourceRole));
    if (origin?.action || origin?.path) this.selectContext(origin.action || node?.dataset.initiativeSource || origin.path);
    (node || $('#workspace-title')).focus({preventScroll: true});
    $('main').scrollTop = origin?.mainScroll || 0;
  }
  async returnContext() {
    if (await this.beforeEdit() && await this.flush() && await this.actions.flush()) this.restoreContext();
  }
  restoreList() {
    const row = [...$('#items').querySelectorAll('[data-initiative-id]')].find(node => node.dataset.initiativeId === this.previous?.entityId);
    (row || $('#initiative-new')).focus({preventScroll: true});
    if (this.listScroll !== undefined) $('#items').scrollTop = this.listScroll;
  }
  key() { return this.draftKey || `initiative-draft:${this.repository.workspaceId}:${this.previous?.entityId || 'new'}`; }
  async openWorkspace(cached = false) {
    this.recoveredDraft = false;
    this.contextReturn = null; this.listScroll = undefined;
    this.active = false; this.previous = null; this.recoveredDraft = false; this.dirty = false; this.retry = null; this.offset = 0;
    $('#initiative-editor').hidden = true;
    const repository = new InitiativeRepository(native); this.repository = repository;
    const result = await repository.open({cached, progress: message => { if (this.repository === repository) $('#index-state').textContent = progressLabel(message); }});
    if (repository !== this.repository) return;
    if (result.warnings.length) this.notice(result.warnings.join('\n'));
    const recovered = recoverTaskDraft('initiative', this.repository.workspaceId);
    this.draftKey = recovered?.key; const draft = recovered?.value;
    this.endingCommitted = new Set(draft?.committedActions);
    if (draft) { this.form(draft.previous || {}, draft.previous); const baseline = this.baseline; this.recoveredDraft = true; this.form(draft.fields, draft.previous); this.baseline = baseline; this.retry = draft.retry; this.pendingDecisions = draft.decisions || {}; this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline; await this.details(); this.state(this.recoveredMessage()); }
  }
  async show() {
    $('.app').classList.remove('library-view', 'home'); $('.app').classList.add('workspace');
    $('.app').classList.remove('detail-open');
    $('#workspace-context').hidden = !this.previous && !this.dirty;
    $('#library-tools').hidden = true;
    if (!this.repository.ready) await this.openWorkspace();
    this.active = true;
    if (this.recoveredDraft && !this.drawer.panel.open) $('.app').classList.remove('editing');
    const wasEditing = $('.app').classList.contains('editing');
    if (this.previous && !this.dirty) {
      const latest = (await allRecords(this.repository)).find(i => i.entityId === this.previous.entityId);
      if (latest) { this.form(latest, latest); await this.details(); }
      if (!wasEditing) $('.app').classList.remove('editing');
    }
    $('#view-title').textContent = '事项'; $('#search').setAttribute('aria-label', '搜索事项'); $('#search').placeholder = '搜索事项…';
    $('#action-tools').hidden = true; $('#initiative-tools').hidden = false;
    $('#editor').hidden = true; $('#action-editor').hidden = true;
    $('#initiative-editor').hidden = !this.previous && !this.dirty; $('#empty').hidden = !$('#initiative-editor').hidden;
    await this.list(); $('#index-state').textContent = '';

  }
  async list() {
    const repository = this.repository, generation = ++this.listGeneration;
    const query = `${this.search}:${this.offset}`, sameQuery = this.lastListQuery === query;
    this.lastListQuery = query;
    $('#index-state').textContent = '正在载入事项…';
    const page = await repository.query({limit: 50, offset: this.offset, search: this.search});
    if (!this.active || repository !== this.repository || generation !== this.listGeneration) return;
    const scroll = sameQuery ? $('#items').scrollTop : 0;
    const focusedRow = document.activeElement.closest('#items [data-initiative-id]')?.dataset.initiativeId;
    $('#index-state').textContent = '';
    this.rowsView ||= initiativeRows($('#items'));
    this.rowsView.render({records: page.actions, selected: this.previous?.entityId,
      empty: this.search ? '没有找到匹配事项。请缩短关键词，或清空搜索。' : '还没有事项。点击「新建事项」记录目标和进展。',
      open: record => this.edit(record).catch(e => this.notice(e.message))});
    if (focusedRow) [...$('#items').querySelectorAll('[data-initiative-id]')].find(node => node.dataset.initiativeId === focusedRow)?.focus({preventScroll: true});
    $('#items').scrollTop = scroll;
    pageAvailability($('#initiative-previous'), $('#initiative-next'), this.offset > 0, page.hasMore);
  }
  fields() {
    return {title: $('#initiative-title').value, goal: $('#initiative-goal').value, progress: $('#initiative-progress').value, status: $('#initiative-status').value,
      sources: [...document.querySelectorAll('.initiative-source')].map(row => ({path: row.querySelector('input').value.trim(), quote: row.querySelector('textarea').value, role: row.querySelector('select').value, fingerprint: row.dataset.fingerprint || ''}))};
  }
  changed() { this.recoveredDraft = false; const edited = JSON.stringify(this.fields()) !== this.baseline; this.dirty = Boolean(this.retry) || edited; if (edited) this.retry = null; this.draft(); this.state(this.dirty ? '事项草稿尚未保存' : '已保存到本地'); }
  draft() { if (!this.dirty) { localStorage.removeItem(this.key()); return; } localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry, decisions: this.decisions(), committedActions: [...this.endingCommitted]})); }
  nameSource(row) {
    const identity = row.querySelector('input').value.trim() || `新关联 ${row.dataset.ordinal}`;
    row.setAttribute('role', 'group'); row.setAttribute('aria-label', `来源关联：${identity}`);
    for (const [selector, label] of [['input', 'Markdown 路径'], ['textarea', '引用原文'], ['select', '用途'], ['button', '移除关联'], ['.source-open', '打开来源']]) row.querySelector(selector).setAttribute('aria-label', `${label}：${identity}`);
  }
  addLink(source) {
    const row = document.createElement('div'); row.className = 'initiative-source'; row.dataset.fingerprint = source.fingerprint; row.dataset.ordinal = this.sourceSequence = (this.sourceSequence || 0) + 1;
    const release = mountInitiativeSource(row, source); this.sourceReleases.push(release);
    row.querySelector('input').oninput = row.querySelector('textarea').oninput = () => { row.dataset.fingerprint = ''; this.nameSource(row); };
    row.querySelector('button').onclick = () => { release(); this.sourceReleases = this.sourceReleases.filter(item => item !== release); row.remove(); this.changed(); $('#initiative-add-link').focus(); };
    row.querySelector('.source-open').onclick = async () => { if (await this.flush()) this.openNote(row.querySelector('input').value); };
    const place = () => $(row.querySelector('select').value === 'reference' ? '#initiative-references' : '#initiative-working-notes').append(row);
    row.querySelector('select').onchange = () => { const select = row.querySelector('select'); place(); select.focus(); this.changed(); };
    place(); this.nameSource(row);
  }
  form(fields, previous) {
    this.editGeneration = (this.editGeneration || 0) + 1;
    if (this.previous?.entityId !== previous?.entityId) this.pendingDecisions = {};
    this.previous = previous; this.detailKind = 'overview'; this.selectedContext = '';
    $('#workspace-context').hidden = false; $('.app').classList.add('workspace');
    $('.app').classList.remove('detail-open');
    this.selectInitiative(previous);
    this.drawer.setTitle(previous ? '编辑事项' : '新建事项');
    for (const field of $('#initiative-form').querySelectorAll('[aria-invalid=true]')) {
      field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby');
    }
    for (const field of ['title', 'goal', 'progress']) $(`#initiative-${field}`).value = fields[field] || '';
    $('#initiative-status').value = fields.status || 'active';
    for (const release of this.sourceReleases) release(); this.sourceReleases = [];
    $('#initiative-working-notes').replaceChildren(); $('#initiative-references').replaceChildren(); this.sourceSequence = 0;
    // Working notes precede reference material regardless of the order links were added.
    for (const source of [...(fields.sources || [])].sort((a, b) => (a.role === 'reference') - (b.role === 'reference'))) this.addLink(source);
    $('#initiative-editor').hidden = false; $('#action-editor').hidden = true; $('#editor').hidden = true; $('#empty').hidden = true; $('.app').classList.add('editing');
    this.baseline = JSON.stringify(this.fields());
    this.ending();
    this.updateActionAvailability(previous); $('#initiative-new-note').disabled = !previous;
  }
  async edit(record, metadata = false, recovered = null, origin = document.activeElement) {
    if (this.opening) return;
    this.opening = true; $('#workspace-overview').disabled = true;
    try { await this.prepareEdit(record, metadata, recovered, origin); }
    finally { this.opening = false; $('#workspace-overview').disabled = false; }
  }
  async prepareEdit(record, metadata, recovered, origin) {
    const owner = this.actions.owner?.(), repository = this.repository;
    const ownsOpen = () => owner === this.actions.owner?.() && repository === this.repository;
    const leaving = this.previous;
    if (!await this.leaveDrawer() || !ownsOpen()) return;
    const intent = this.editGeneration;
    const layout = metadata ? {
      classes: $('.app').className, selectedContext: this.selectedContext, detailKind: this.detailKind,
      actionOpen: this.actions.drawer.panel.open, actionDrawerContext: this.actions.drawerContext,
      hidden: Object.fromEntries(['#editor', '#action-editor', '#initiative-editor', '#workspace-context', '#empty'].map(selector => [selector, $(selector).hidden])),
      scroll: Object.fromEntries(['.collection', '#items', '#workspace-context', '#workspace-detail', 'main'].map(selector => [selector, $(selector).scrollTop]))
    } : null;
    if (!await this.beforeEdit() || !await this.flush() || !await this.actions.flush() || !ownsOpen() || intent !== this.editGeneration) return;
    if (record && record.entityId === leaving?.entityId && this.previous?.revision !== leaving.revision) record = this.previous;
    if (!metadata && !$('.app').classList.contains('editing')) this.listScroll = $('#items').scrollTop;
    if (!metadata && record?.entityId !== leaving?.entityId) this.contextReturn = null;
    if (metadata) this.drawerContext = {
      actionId: record && this.actions.previous?.initiativeId === record.entityId ? this.actions.previous.entityId : null,
      ...layout, previous: this.previous,
      views: this.contextSnapshot(),
      text: Object.fromEntries(['#workspace-title', '#workspace-progress', '#workspace-goal', '#workspace-state', '#initiative-help', '#initiative-actions-state'].map(selector => [selector, $(selector).textContent]))
    };
    this.draftKey = recovered?.key || `initiative-draft:${this.repository.workspaceId}:${record?.entityId || 'new'}`;
    const draft = JSON.parse(localStorage.getItem(this.key()) || 'null');
    this.retry = null; this.endingCommitted = new Set(draft?.committedActions);
    this.form(record || {}, record); const baseline = this.baseline;
    if (draft) { this.form(draft.fields, draft.previous); this.baseline = baseline; this.retry = draft.retry; this.pendingDecisions = draft.decisions || {}; }
    this.recoveredDraft = Boolean(draft); this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline;
    this.state(draft ? this.recoveredMessage() : record ? '已保存到本地' : '新建事项');
    if (metadata) this.restoreDrawerLayout(this.drawerContext);
    const preparation = this.editGeneration;
    const taskOwner = this.taskOwner?.();
    const ownsPreparation = () => ownsOpen() && preparation === this.editGeneration &&
      (!metadata || (taskOwner === this.taskOwner?.() && !document.querySelector('dialog[open]')));
    try {
      await this.details();
    } catch (error) {
      if (metadata && ownsPreparation()) {
        const context = this.drawerContext;
        this.previous = context.previous;
        this.detailKind = context.detailKind;
        this.restoreDrawerLayout(context);
        this.selectContext(context.selectedContext);
        this.drawerContext = null;
        $('#workspace-overview').disabled = false;
        origin?.focus({preventScroll: true});
      }
      throw error;
    }
    if (!ownsPreparation()) { this.drawerContext = null; return; }
    if (draft) {
      this.recoveredDraft = true;
      this.state(this.recoveredMessage());
    }
    if (metadata) {
      this.restoreDrawerLayout(this.drawerContext);
      this.openDrawer(origin);
    } else this.restoreContext();
  }
  restoreDrawerLayout(context) {
    for (const [selector, hidden] of Object.entries(context.hidden)) $(selector).hidden = hidden;
    $('.app').className = context.classes;
    this.restoreSnapshot(context.views);
    for (const [selector, text] of Object.entries(context.text)) $(selector).textContent = text;
    for (const [selector, scroll] of Object.entries(context.scroll)) $(selector).scrollTop = scroll;
    this.selectInitiative(context.previous);
    this.updateActionAvailability(context.previous);
  }
  renderContext() {
    const record = this.previous;
    $('#workspace-title').textContent = record?.title || '新建事项';
    $('#workspace-progress').textContent = record?.progress || '尚未记录进展';
    $('#workspace-goal').textContent = record?.goal || '尚未填写目标';
    $('#workspace-state').textContent = record ? statusLabel(record.status) : '尚未保存';
    $('#initiative-help').textContent = !record ? '保存事项后可添加行动与笔记。' : record.status === 'ended' ? '事项已结束。重新开启后可添加行动。' : '';
    for (const [selector, role] of [['#workspace-notes', 'working-note'], ['#workspace-references', 'reference']]) {
      const sources = initiativeSources(record?.sources || [], role);
      this.contextViews[selector].render({sources, selected: this.selectedContext,
        empty: role === 'reference' ? '尚未关联参考资料。' : '尚未关联工作笔记。',
        open: async (path, opener) => { this.rememberContext(opener); await this.openNote(path); }});
    }
  }

  async details() {
    const generation = this.editGeneration, owner = this.actions.owner?.(), repository = this.repository;
    const ownsDetails = () => record === this.previous && generation === this.editGeneration && owner === this.actions.owner?.() && repository === this.repository;
    const decisions = this.pendingDecisions || this.decisions();
    const clear = () => { for (const selector of ['#initiative-actions', '#initiative-retired']) this.contextViews[selector].render({actions: [], empty: '', open: () => {}}); this.decisionsView.render({choices: [], targets: []}); };
    const record = this.previous; this.renderContext();
    const status = $('#initiative-actions-state');
    if (!record) { clear(); status.textContent = ''; this.ending(); return; }
    if (this.actionContextId !== record.entityId) clear();
    status.textContent = '正在载入行动…';
    let linked, initiatives;
    try {
      [linked, initiatives] = await Promise.all([
        allRecords(this.actions.repository, {initiativeId: record.entityId}), allRecords(this.repository)
      ]);
    } catch (error) {
      if (ownsDetails()) status.textContent = '行动暂不可用，请重新打开事项。';
      throw error;
    }
    if (!ownsDetails()) return;
    this.actionContextId = record.entityId;
    status.textContent = '';
    const open = async (action, opener) => {
      this.rememberContext(opener);
      if (await this.beforeEdit() && await this.flush() && await this.actions.flush()) {
        await openInitiativeAction(this.actions, action, opener); this.selectContext(action.entityId);
      }
    };
    this.contextViews['#initiative-actions'].render({actions: linked.filter(unfinished), open,
      empty: record.status === 'ended' ? '没有未完成行动。将状态改为「进行中」或「以后再做」并保存，即可重新开启事项。' : '没有未完成行动。可新建下一步行动。'});
    this.contextViews['#initiative-retired'].render({actions: linked.filter(action => !unfinished(action)), open, empty: '没有已完成或已取消的行动。'});
    this.decisionsView.render(initiativeEnding(linked, initiatives, record.entityId, decisions));
    this.pendingDecisions = null;
    this.ending(); this.selectContext(this.selectedContext);
    for (const source of record.sources) {
      const rows = [...document.querySelectorAll('.initiative-source')];
      // A recovered private draft may already contain the uniquely repaired path.
      // Resolve persisted context independently; never match an ambiguous edited row.
      const exact = rows.find(row => row.querySelector('input').value === source.path && row.querySelector('select').value === source.role);
      const matching = rows.filter(row => source.fingerprint && row.dataset.fingerprint === source.fingerprint && row.querySelector('textarea').value === source.quote && row.querySelector('select').value === source.role);
      const row = exact || (matching.length === 1 ? matching[0] : null);
      const view = this.contextViews[source.role === 'reference' ? '#workspace-references' : '#workspace-notes'];
      try {
        const result = await sourceState(source, path => native('read', {path, workspaceId: repository.workspaceId}), this.listReferences);
        if (!ownsDetails()) return;
        const message = result.state === 'moved' ? `来源已移至 ${result.path}，请核对后保存。` : statusLabel(result.state);
        if (row) row.querySelector('.source-state').textContent = message;
        if (!['unchanged', 'available', 'valid'].includes(result.state)) {
          $('#initiative-link-details').open = true;
          view.status(source.path, message, result.path);
        }
        if (row && result.state === 'moved') { row.querySelector('input').value = result.path; this.nameSource(row); this.changed(); }
        if (row) row.querySelector('.source-open').disabled = !result.path;
      } catch (error) {
        if (!ownsDetails()) return;
        const message = '来源暂不可用，请检查目录后重试。';
        if (row) row.querySelector('.source-state').textContent = message;
        $('#initiative-link-details').open = true;
        view.status(source.path, message);
      }
    }
  }

  decisions() { return Object.fromEntries([...document.querySelectorAll('#initiative-decisions select')].map(select => [select.dataset.action, select.value])); }
  ending() {
    const ending = $('#initiative-status').value === 'ended' && this.previous?.status !== 'ended';
    $('#initiative-ending').open = ending;
    const count = $('#initiative-decisions').querySelectorAll('select:not(:disabled)').length;
    const committed = $('#initiative-committed-actions');
    committed.hidden = this.endingCommitted.size === 0;
    committed.textContent = committed.hidden ? '' : `已保存 ${this.endingCommitted.size} 项行动处理，重试时仍然有效。`;
    $('#initiative-ending-help').textContent = count ? `还有 ${count} 项未完成行动。必须为每项选择处理方式，才可结束事项。` : '没有未完成行动。保存后结束事项，之后仍可将状态改为「进行中」或「以后再做」重新开启。';
    const reopening = this.previous?.status === 'ended' && $('#initiative-status').value !== 'ended';
    $('#initiative-reopening').hidden = !reopening;
    $('#initiative-save').textContent = reopening ? '保存并重新开启' : ending ? '保存并结束事项' : this.previous ? '保存事项' : '创建事项';
  }
  async save() {
    if (this.saving) return this.saving;
    if (!this.dirty && this.previous) { this.state('已保存到本地'); return this.closeDrawer(); }
    if (!$('#initiative-form').reportValidity()) return false;
    if (!$('#initiative-title').value.trim()) {
      const title = $('#initiative-title');
      title.setAttribute('aria-invalid', 'true'); title.setAttribute('aria-describedby', 'initiative-save-state');
      errorFeedback($('#initiative-save-state'), '请填写事项标题。');
      title.focus();
      return false;
    }
    const focus = document.activeElement;
    this.saving = (async () => {
      await Promise.resolve();
      $('#initiative-form').inert = true; $('#initiative-save').disabled = true; this.state('正在保存事项…');
      let committed = null;
      try {
        const fields = this.fields();
        for (const source of fields.sources) if (!source.fingerprint) {
          const {text} = await native('read', {path: source.path, workspaceId: this.repository.workspaceId});
          if (!source.quote || !text.includes(source.quote)) throw Error(`Quote not found in ${source.path}`);
          source.fingerprint = fingerprint(text);
        }
        let result;
        if (fields.status === 'ended' && this.previous?.status !== 'ended' && this.previous) {
          const decisions = {};
          for (const select of document.querySelectorAll('[data-action]')) {
            const [kind, target] = select.value.split(':'); decisions[select.dataset.action] = {kind, target};
          }
          // Keep the previous revision as the parent while committing the user's fields.
          if (this.drawerContext) this.drawerContext.refreshWorkspace = true;
          if (this.drawerContext?.actionId) this.drawerContext.refreshAction = this.drawerContext.actionId;
          result = await endInitiative(this.repository, this.actions.repository, this.previous, decisions, fields, record => {
            this.endingCommitted.add(record.entityId);
            this.draft();
            if (record.entityId === this.actions.previous?.entityId && this.drawerContext) this.drawerContext.committedAction = record;
          });
        } else result = await this.repository.save(fields, this.previous, this.retry);
        committed = result.record; this.rememberCommit(result.record);
        this.endingCommitted.clear();
        this.recoveredDraft = false; this.dirty = false; this.retry = null; localStorage.removeItem(this.key()); this.draftKey = `initiative-draft:${this.repository.workspaceId}:${result.record.entityId}`; this.form(result.record, result.record);
        this.state(result.recovered ? '已恢复并保存到本地' : '已保存到本地'); await this.list(); await this.details();
        if (this.drawerContext) this.drawerContext.refreshWorkspace = false;
        if (this.drawer.panel.open) {
          const saved = result.record;
          if (this.drawerContext?.previous?.entityId === saved.entityId) {
            this.drawerContext.previous = saved; this.drawerContext.views = null;
            this.drawerContext.text = {};
          }
          if (!await this.closeDrawer()) return false;
          if (this.previous?.entityId === saved.entityId) { this.previous = saved; this.renderContext(); }
        }
        return true;
      } catch (error) {
        if (error.revisionSaved && error.record?.entityType === 'action' && error.record.entityId === this.drawerContext?.actionId) {
          this.drawerContext.committedAction = error.record;
          this.actions.previous = error.record;
        }
        const saved = committed || (error.revisionSaved && error.record?.entityType === 'initiative' ? error.record : null);
        this.retry = saved; if (saved) { this.previous = saved; this.baseline = JSON.stringify(this.fields()); this.rememberCommit(saved); }
        if (error.revisionSaved && error.record?.entityType === 'action') this.endingCommitted.add(error.record.entityId);
        this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline; this.draft();
        const endingRequired = /Choose how to handle|Actions changed|destination initiative/.test(error.message);
        if (endingRequired) $('#initiative-ending').open = true;
        for (const input of $('#initiative-decisions').querySelectorAll('select')) {
          if (input.disabled || !this.endingCommitted.has(input.dataset.action)) continue;
          input.disabled = true;
          const receipt = document.createElement('small');
          receipt.textContent = '此项处理已保存';
          input.after(receipt);
        }
        if (this.endingCommitted.size && !saved) this.ending();
        const partial = this.endingCommitted.size > 0;
        const message = partial && !saved ? '事项尚未结束。已保存的行动处理仍然有效。未保存的编辑仍保留，可重试。'
          : endingRequired ? '尚未结束事项。请为每项未完成行动选择处理方式，再保存；可选择「暂不结束」。'
          : saved ? '版本已保存，恢复尚未完成。可重试恢复，或关闭并保留已保存版本。' : undefined;
        this.receipt.failure(error.message, message);
        return false;
      } finally {
        this.saving = null; $('#initiative-form').inert = false; $('#initiative-save').disabled = false;
        if (this.drawer.panel.open && focus?.isConnected) focus.focus({preventScroll: true});
      }
    })(); return this.saving;
  }
  flush() { return this.leaveDrawer(); }
}
