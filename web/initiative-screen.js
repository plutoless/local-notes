import {recoverTaskDraft} from './task-drafts.js';
import {pageAvailability, requestTaskLeave, statusLabel, errorFeedback, progressLabel, selectionRow, drawer, button} from './presentation.js';
import {InitiativeRepository, allRecords, endInitiative, unfinished, fingerprint, sourceState} from './initiatives.js';
import {native} from './bridge.js';
const $ = selector => document.querySelector(selector);
export class InitiativeScreen {
  constructor(actions, notice, openNote, createNote, listReferences, beforeEdit = async () => true) {
    this.beforeEdit = beforeEdit; this.detailKind = 'overview'; this.listReferences = listReferences; this.actions = actions; this.notice = notice; this.openNote = openNote; this.createNote = createNote; this.repository = new InitiativeRepository(native); this.active = false; this.dirty = false; this.offset = 0; this.search = ''; this.listGeneration = 0;
    this.setupDrawer();
    $('#initiative-tools').append(button('恢复事项草稿', async () => {
      const draft = recoverTaskDraft('initiative', this.repository.workspaceId);
      if (!draft) { this.notice('没有待恢复的事项草稿。', true); return; }
      await this.edit(draft.value.previous || null, true, draft);
    }));
    $('#initiative-new').onclick = event => this.edit(null, true, null, event.currentTarget);
    $('#initiative-next').onclick = () => { this.offset += 50; this.list().catch(e => notice(e.message)); };
    $('#initiative-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.list().catch(e => notice(e.message)); };
    $('#initiative-form').oninput = event => { event.target.setAttribute('aria-invalid', String(!event.target.validity?.valid)); if (event.target.validity?.valid) event.target.removeAttribute('aria-describedby'); this.changed(); this.ending(); };
    $('#initiative-form').addEventListener('invalid', event => {
      event.preventDefault(); event.target.setAttribute('aria-invalid', 'true'); event.target.setAttribute('aria-describedby', 'initiative-save-state'); event.target.focus();
      errorFeedback($('#initiative-save-state'), '请填写标题、路径和引用原文后重试。');
    }, true);
    $('#initiative-status').onchange = () => { this.changed(); this.ending(); };
    $('#initiative-cancel-ending').onclick = () => { $('#initiative-status').value = this.previous?.status || 'active'; this.changed(); this.ending(); };
    $('#initiative-form').onsubmit = event => { event.preventDefault(); this.save(); };
    $('#initiative-discard').onclick = () => this.leaveDrawer();
    $('#initiative-back').textContent = '‹ 行动与资料';
    $('#initiative-back').onclick = () => this.returnContext();
    $('#workspace-back').onclick = async () => { if (await this.beforeEdit() && await this.flush() && await this.actions.flush()) { $('.app').classList.remove('editing', 'detail-open'); this.restoreList(); } };
    $('#workspace-overview').onclick = () => { this.rememberContext(); this.edit(this.previous, true).catch(e => notice(e.message)); };
    $('#initiative-add-link').onclick = () => { this.addLink({path: '', quote: '', fingerprint: '', role: 'working-note'}); this.changed(); };
    $('#initiative-new-action').onclick = async () => {
      this.rememberContext();
      if (!await this.beforeEdit() || !await this.flush() || !await this.actions.flush() || !this.previous || this.previous.status === 'ended') return;
      await this.actions.edit(null); $('#action-initiative').value = this.previous.entityId; this.actions.baseline = JSON.stringify(this.actions.fields());
    };
    $('#initiative-new-note').onclick = async () => { this.rememberContext(); if (await this.beforeEdit() && await this.flush() && await this.actions.flush() && this.previous) { this.rememberContext(); await this.createNote(this.previous.entityId); } };
  }
  setupDrawer() {
    this.drawer = drawer({id: 'initiative-drawer', title: '新建事项', onDismiss: () => this.leaveDrawer()});
    this.drawer.panel.classList.add('ui-drawer-wide');
    const form = $('#initiative-form');
    $('#initiative-heading').remove();
    this.drawer.body.append(form);
    for (const node of form.querySelectorAll('.ui-field, .ui-action')) node.classList.add('ui-compact');
    const cancel = $('#initiative-discard'), submit = $('#initiative-save');
    cancel.textContent = '取消'; submit.setAttribute('form', form.id);
    this.drawer.footer.append(cancel, submit);

  }
  selectInitiative(record) {
    for (const row of document.querySelectorAll('#items [data-initiative-id]')) {
      const selected = row.dataset.initiativeId === record?.entityId;
      row.classList.toggle('selected', selected); row.setAttribute('aria-current', String(selected));
    }
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
          this.drawerContext.nodes = null; this.drawerContext.text = {}; this.drawerContext.refreshWorkspace = false;
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
          this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline; this.draft(); errorFeedback($('#initiative-save-state'), error.message);
          $('#initiative-save-state p').textContent = '关联行动尚未恢复，草稿仍保留。请重试关闭，或继续编辑。'; return false;
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
        if (context.nodes) for (const [selector, nodes] of Object.entries(context.nodes)) $(selector).replaceChildren(...nodes);
        for (const [selector, text] of Object.entries(context.text)) $(selector).textContent = text;
        if (context.committed) this.renderContext();
        this.selectContext(context.selectedContext); this.detailKind = context.detailKind;
        for (const [selector, hidden] of Object.entries(context.hidden)) $(selector).hidden = hidden;
        $('.app').className = context.classes;
        for (const [selector, scroll] of Object.entries(context.scroll)) $(selector).scrollTop = scroll;
        $('#initiative-new-action').disabled = !this.previous || this.previous.status === 'ended';
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
    return {label: '事项', pending: () => this.saving, dirty: () => this.dirty || this.recoveryPending, committed: () => Boolean(this.retry || this.recoveryPending),
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
  selectContext(key = '') {
    this.selectedContext = key;
    for (const node of document.querySelectorAll('#workspace-context .ui-row')) {
      const selected = (node.dataset.actionId || node.dataset.path) === key;
      node.classList.toggle('selected', selected); node.setAttribute('aria-current', String(selected));
    }
  }
  rememberContext() {
    const node = document.activeElement;
    if (!$('#workspace-context').contains(node)) return;
    this.contextReturn = {id: node?.id, action: node?.dataset.actionId, path: node?.dataset.path, scroll: $('#workspace-context').scrollTop, mainScroll: $('main').scrollTop};
  }
  restoreContext() {
    $('.app').classList.remove('detail-open');
    const origin = this.contextReturn;
    const controls = [...$('#workspace-context').querySelectorAll('button')];
    const node = origin && controls.find(node => origin.id ? node.id === origin.id : origin.action ? node.dataset.actionId === origin.action : origin.path && node.dataset.path === origin.path);
    (node || $('#workspace-overview')).focus({preventScroll: true});
    if (origin) { $('#workspace-context').scrollTop = origin.scroll; $('main').scrollTop = origin.mainScroll; }
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
    this.active = false; this.previous = null; this.recoveredDraft = false; this.dirty = false; this.retry = null; this.offset = 0;
    $('#initiative-editor').hidden = true;
    const repository = new InitiativeRepository(native); this.repository = repository;
    const result = await repository.open({cached, progress: message => { if (this.repository === repository) $('#index-state').textContent = progressLabel(message); }});
    if (repository !== this.repository) return;
    if (result.warnings.length) this.notice(result.warnings.join('\n'));
    const recovered = recoverTaskDraft('initiative', this.repository.workspaceId);
    this.draftKey = recovered?.key; const draft = recovered?.value;
    if (draft) { this.form(draft.previous || {}, draft.previous); const baseline = this.baseline; this.recoveredDraft = true; this.form(draft.fields, draft.previous); this.baseline = baseline; this.retry = draft.retry; this.pendingDecisions = draft.decisions || {}; this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline; await this.details(); this.state('已恢复事项草稿，请核对后保存。'); }
  }
  async show() {
    $('.app').classList.remove('library-view', 'home'); $('.app').classList.add('workspace');
    $('#workspace-context').hidden = !this.previous && !this.dirty;
    $('#library-tools').hidden = true;
    if (!this.repository.ready) await this.openWorkspace();
    this.active = true;
    const wasEditing = $('.app').classList.contains('editing');
    if (this.previous && !this.dirty) {
      const latest = (await allRecords(this.repository)).find(i => i.entityId === this.previous.entityId);
      if (latest) { this.form(latest, latest); await this.details(); }
      if (!wasEditing) $('.app').classList.remove('editing');
    }
    $('#view-title').textContent = '事项'; $('#search').setAttribute('aria-label', '搜索事项'); $('#search').placeholder = '搜索事项…';
    $('#filters').hidden = true; $('#action-tools').hidden = true; $('#initiative-tools').hidden = false;
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
    $('#index-state').textContent = ''; $('#items').replaceChildren();
    for (const record of page.actions) {
      const button = selectionRow('', () => this.edit(record).catch(e => this.notice(e.message)), {selected: record.entityId === this.previous?.entityId}); button.classList.add('card'); button.dataset.initiativeId = record.entityId; button.classList.toggle('selected', record.entityId === this.previous?.entityId); button.setAttribute('aria-current', String(record.entityId === this.previous?.entityId));
      const heading = document.createElement('h3'); heading.textContent = record.title;
      const summary = document.createElement('p'); summary.textContent = statusLabel(record.status);
      button.append(heading, summary); $('#items').append(button);
    }
    if (!page.actions.length) $('#items').textContent = this.search ? '没有找到匹配事项。请缩短关键词，或清空搜索。' : '还没有事项。点击「新建事项」记录目标和进展。';
    if (focusedRow) [...$('#items').querySelectorAll('[data-initiative-id]')].find(node => node.dataset.initiativeId === focusedRow)?.focus({preventScroll: true});
    $('#items').scrollTop = scroll;
    pageAvailability($('#initiative-previous'), $('#initiative-next'), this.offset > 0, page.hasMore);
  }
  fields() {
    return {title: $('#initiative-title').value, goal: $('#initiative-goal').value, progress: $('#initiative-progress').value, status: $('#initiative-status').value,
      sources: [...document.querySelectorAll('.initiative-source')].map(row => ({path: row.querySelector('input').value.trim(), quote: row.querySelector('textarea').value, role: row.querySelector('select').value, fingerprint: row.dataset.fingerprint || ''}))};
  }
  changed() { this.recoveredDraft = false; const edited = JSON.stringify(this.fields()) !== this.baseline; this.dirty = Boolean(this.retry) || edited; if (edited) this.retry = null; this.draft(); this.state(this.dirty ? '事项草稿尚未保存' : '已保存到本地'); }
  draft() { if (!this.dirty) { localStorage.removeItem(this.key()); return; } localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry, decisions: this.decisions()})); }
  nameSource(row) {
    const identity = row.querySelector('input').value.trim() || `新关联 ${row.dataset.ordinal}`;
    row.setAttribute('role', 'group'); row.setAttribute('aria-label', `来源关联：${identity}`);
    for (const [selector, label] of [['input', 'Markdown 路径'], ['textarea', '引用原文'], ['select', '用途'], ['button', '移除关联'], ['.source-open', '打开来源']]) row.querySelector(selector).setAttribute('aria-label', `${label}：${identity}`);
  }
  addLink(source) {
    const row = document.createElement('div'); row.className = 'initiative-source'; row.dataset.fingerprint = source.fingerprint; row.dataset.ordinal = this.sourceSequence = (this.sourceSequence || 0) + 1;
    row.innerHTML = '<label>Markdown 路径<input required></label><label>引用原文<textarea rows="2" required></textarea></label><label>用途<select><option value="working-note">工作笔记</option><option value="reference">参考资料</option></select></label><button type="button">移除关联</button><span class="source-state"></span><button type="button" class="source-open">打开来源</button>';
    for (const label of row.querySelectorAll('label')) label.classList.add('ui-field');
    for (const control of row.querySelectorAll('button')) control.classList.add('ui-action', 'quiet');
    row.querySelector('.source-state').setAttribute('role', 'status');
    row.querySelector('input').value = source.path; row.querySelector('textarea').value = source.quote; row.querySelector('select').value = source.role;
    row.querySelector('input').oninput = row.querySelector('textarea').oninput = () => { row.dataset.fingerprint = ''; this.nameSource(row); };
    row.querySelector('button').onclick = () => { row.remove(); this.changed(); };
    row.querySelector('.source-open').onclick = async () => { if (await this.flush()) this.openNote(row.querySelector('input').value); };
    const place = () => $(row.querySelector('select').value === 'reference' ? '#initiative-references' : '#initiative-working-notes').append(row);
    row.querySelector('select').onchange = () => { const select = row.querySelector('select'); place(); select.focus(); this.changed(); };
    place(); this.nameSource(row);
  }
  form(fields, previous) {
    this.editGeneration = (this.editGeneration || 0) + 1;
    if (this.previous?.entityId !== previous?.entityId) this.pendingDecisions = {};
    this.previous = previous; this.detailKind = 'overview'; this.selectedContext = '';
    $('#workspace-context').hidden = false; $('.app').classList.add('workspace', 'detail-open');
    this.selectInitiative(previous);
    this.drawer.setTitle(previous ? '编辑事项' : '新建事项');
    for (const field of ['title', 'goal', 'progress']) $(`#initiative-${field}`).value = fields[field] || '';
    $('#initiative-status').value = fields.status || 'active';
    $('#initiative-working-notes').replaceChildren(); $('#initiative-references').replaceChildren(); this.sourceSequence = 0;
    // Working notes precede reference material regardless of the order links were added.
    for (const source of [...(fields.sources || [])].sort((a, b) => (a.role === 'reference') - (b.role === 'reference'))) this.addLink(source);
    $('#initiative-editor').hidden = false; $('#action-editor').hidden = true; $('#editor').hidden = true; $('#empty').hidden = true; $('.app').classList.add('editing');
    this.baseline = JSON.stringify(this.fields());
    this.ending();
    $('#initiative-new-action').disabled = !previous || previous.status === 'ended'; $('#initiative-new-note').disabled = !previous;
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
    const layout = metadata ? {
      classes: $('.app').className, selectedContext: this.selectedContext, detailKind: this.detailKind,
      actionOpen: this.actions.drawer.panel.open, actionDrawerContext: this.actions.drawerContext,
      hidden: Object.fromEntries(['#editor', '#action-editor', '#initiative-editor', '#workspace-context', '#empty'].map(selector => [selector, $(selector).hidden])),
      scroll: Object.fromEntries(['.collection', '#items', '#workspace-context', '#workspace-detail', 'main'].map(selector => [selector, $(selector).scrollTop]))
    } : null;
    if (!await this.beforeEdit() || !await this.flush() || !await this.actions.flush() || !ownsOpen()) return;
    if (record && record.entityId === leaving?.entityId && this.previous?.revision !== leaving.revision) record = this.previous;
    this.listScroll = $('#items').scrollTop;
    if (metadata) this.drawerContext = {
      actionId: record && this.actions.previous?.initiativeId === record.entityId ? this.actions.previous.entityId : null,
      ...layout, previous: this.previous,
      nodes: Object.fromEntries(['#initiative-actions', '#initiative-retired', '#workspace-notes', '#workspace-references'].map(selector => [selector, [...$(selector).childNodes]])),
      text: Object.fromEntries(['#workspace-title', '#workspace-progress', '#workspace-goal', '#workspace-state', '#initiative-help'].map(selector => [selector, $(selector).textContent]))
    };
    this.draftKey = recovered?.key || `initiative-draft:${this.repository.workspaceId}:${record?.entityId || 'new'}`;
    const draft = JSON.parse(localStorage.getItem(this.key()) || 'null');
    this.retry = null; this.form(record || {}, record); const baseline = this.baseline;
    if (draft) { this.form(draft.fields, draft.previous); this.baseline = baseline; this.retry = draft.retry; }
    this.recoveredDraft = Boolean(draft); this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline;
    this.state(draft ? '已恢复事项草稿，请核对后保存。' : record ? '已保存到本地' : '新建事项');
    await this.details();
    if (!ownsOpen()) { this.drawerContext = null; return; }
    if (metadata) {
      for (const [selector, hidden] of Object.entries(this.drawerContext.hidden)) $(selector).hidden = hidden;
      $('.app').className = this.drawerContext.classes;
      for (const [selector, nodes] of Object.entries(this.drawerContext.nodes)) $(selector).replaceChildren(...nodes);
      for (const [selector, text] of Object.entries(this.drawerContext.text)) $(selector).textContent = text;
      this.selectInitiative(this.drawerContext.previous);
      this.openDrawer(origin);
    } else this.restoreContext();
  }
  renderContext() {
    const record = this.previous;
    $('#workspace-title').textContent = record?.title || '新建事项';
    $('#workspace-progress').textContent = record?.progress || '尚未记录进展';
    $('#workspace-goal').textContent = record?.goal || '尚未填写目标';
    $('#workspace-state').textContent = record ? statusLabel(record.status) : '尚未保存';
    $('#initiative-help').textContent = !record ? '保存事项后可添加行动与笔记。' : record.status === 'ended' ? '事项已结束。重新开启后可添加行动。' : '';
    $('#workspace-notes').replaceChildren(); $('#workspace-references').replaceChildren();
    for (const source of record?.sources || []) {
      const open = selectionRow('', async () => { this.rememberContext(); await this.openNote(open.dataset.path); }); open.dataset.path = source.path; open.setAttribute('aria-label', `打开${source.role === 'reference' ? '参考资料' : '工作笔记'}：${source.path}`);
      const title = document.createElement('span'); title.textContent = source.path.split('/').pop().replace(/\.md$/i, '');
      open.append(title);
      $(source.role === 'reference' ? '#workspace-references' : '#workspace-notes').append(open);
    }
    if (!$('#workspace-notes').children.length) $('#workspace-notes').textContent = '尚未关联工作笔记。';
    if (!$('#workspace-references').children.length) $('#workspace-references').textContent = '尚未关联参考资料。';
  }
  async details() {
    const generation = this.editGeneration, owner = this.actions.owner?.(), repository = this.repository;
    const ownsDetails = () => record === this.previous && generation === this.editGeneration && owner === this.actions.owner?.() && repository === this.repository;
    const decisions = this.pendingDecisions || this.decisions();
    const clear = () => { for (const selector of ['#initiative-actions', '#initiative-retired', '#initiative-decisions']) $(selector).replaceChildren(); };
    const record = this.previous; this.renderContext();
    if (!record) { clear(); this.ending(); return; }
    const [actions, initiatives] = await Promise.all([allRecords(this.actions.repository), allRecords(this.repository)]);
    if (!ownsDetails()) return;
    clear();
    for (const action of actions.filter(a => a.initiativeId === record.entityId)) {
      const button = selectionRow(`${action.description} · ${statusLabel(action.status)}`, async () => {
        this.rememberContext();
        if (await this.beforeEdit() && await this.flush() && await this.actions.flush()) {
          await this.actions.edit(action); this.selectContext(action.entityId);
        }
      }); button.dataset.actionId = action.entityId;
      (unfinished(action) ? $('#initiative-actions') : $('#initiative-retired')).append(button);
      if (unfinished(action)) {
        const label = document.createElement('label'); label.textContent = `结束时处理：${action.description}`;
        const select = document.createElement('select'); select.dataset.action = action.entityId;
        select.add(new Option('请选择处理方式…', '')); select.add(new Option('完成', 'completed')); select.add(new Option('取消', 'canceled')); select.add(new Option('保留为独立行动', 'independent'));
        for (const target of initiatives.filter(i => i.entityId !== record.entityId && i.status !== 'ended')) select.add(new Option(`移至 ${target.title}`, `move:${target.entityId}`));
        select.value = decisions[action.entityId] || ''; label.classList.add('ui-field'); label.append(select); $('#initiative-decisions').append(label);
      }
    }
    this.pendingDecisions = null;
    if (!$('#initiative-actions').children.length) $('#initiative-actions').textContent = record.status === 'ended' ? '没有未完成行动。将状态改为「进行中」或「以后再做」并保存，即可重新开启事项。' : '没有未完成行动。可新建下一步行动。';
    if (!$('#initiative-retired').children.length) $('#initiative-retired').textContent = '没有已完成或已取消的行动。';
    this.ending(); this.selectContext(this.selectedContext);
    for (const row of document.querySelectorAll('.initiative-source')) {
      const source = record.sources.find(s => s.path === row.querySelector('input').value);
      if (!source) continue;
      try {
        const result = await sourceState(source, path => native('read', {path, workspaceId: this.repository.workspaceId}), this.listReferences);
        if (!ownsDetails()) return;
        row.querySelector('.source-state').textContent = result.state === 'moved' ? `来源已移至 ${result.path}，请核对后保存。` : statusLabel(result.state);
        if (!['unchanged', 'available', 'valid'].includes(result.state)) {
          $('#initiative-link-details').open = true;
          const link = [...document.querySelectorAll('#workspace-notes button, #workspace-references button')].find(button => button.dataset.path === source.path);
          if (link) { const warning = document.createElement('small'); warning.textContent = row.querySelector('.source-state').textContent; link.append(warning); if (result.path) link.dataset.path = result.path; }
        }
        if (result.state === 'moved') { row.querySelector('input').value = result.path; this.nameSource(row); this.changed(); }
        row.querySelector('.source-open').disabled = !result.path;
      } catch (error) {
        if (!ownsDetails()) return;
        row.querySelector('.source-state').textContent = '来源暂不可用，请检查目录后重试。';
        $('#initiative-link-details').open = true;
        const link = [...document.querySelectorAll('#workspace-notes button, #workspace-references button')].find(node => node.dataset.path === source.path);
        if (link) { const warning = document.createElement('small'); warning.textContent = row.querySelector('.source-state').textContent; link.append(warning); }
      }
    }
  }
  decisions() { return Object.fromEntries([...document.querySelectorAll('#initiative-decisions select')].map(select => [select.dataset.action, select.value])); }
  ending() {
    const ending = $('#initiative-status').value === 'ended' && this.previous?.status !== 'ended';
    $('#initiative-ending').open = ending;
    const count = $('#initiative-decisions').children.length;
    $('#initiative-ending-help').textContent = count ? `还有 ${count} 项未完成行动。必须为每项选择处理方式，才可结束事项。` : '没有未完成行动。保存后结束事项，之后仍可将状态改为「进行中」或「以后再做」重新开启。';
    $('#initiative-save').textContent = ending ? '保存并结束事项' : this.previous ? '保存事项' : '创建事项';
  }
  async save() {
    if (this.saving) return this.saving;
    if (!this.dirty && this.previous) { this.state('已保存到本地'); return this.closeDrawer(); }
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
            if (record.entityId === this.actions.previous?.entityId && this.drawerContext) this.drawerContext.committedAction = record;
          });
        } else result = await this.repository.save(fields, this.previous, this.retry);
        committed = result.record; this.rememberCommit(result.record);
        this.recoveredDraft = false; this.dirty = false; this.retry = null; localStorage.removeItem(this.key()); this.draftKey = `initiative-draft:${this.repository.workspaceId}:${result.record.entityId}`; this.form(result.record, result.record);
        this.state(result.recovered ? '已恢复并保存到本地' : '已保存到本地'); await this.list(); await this.details();
        if (this.drawerContext) this.drawerContext.refreshWorkspace = false;
        if (this.drawer.panel.open) {
          const saved = result.record;
          if (this.drawerContext?.previous?.entityId === saved.entityId) {
            this.drawerContext.previous = saved; this.drawerContext.nodes = null;
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
        this.dirty = Boolean(this.retry) || JSON.stringify(this.fields()) !== this.baseline; this.draft(); errorFeedback($('#initiative-save-state'), error.message);
        if (saved) $('#initiative-save-state p').textContent = '版本已保存，恢复尚未完成。可重试恢复，或关闭并保留已保存版本。';
        if (/Choose how to handle|Actions changed|destination initiative/.test(error.message)) {
          $('#initiative-ending').open = true;
          $('#initiative-save-state p').textContent = '尚未结束事项。请为每项未完成行动选择处理方式，再保存；可选择「暂不结束」。';
        }
        return false;
      } finally { this.saving = null; $('#initiative-form').inert = false; $('#initiative-save').disabled = false; }
    })(); return this.saving;
  }
  flush() { return this.leaveDrawer(); }
}
