import {mountActionControls, actionRows, actionSources, actionHistory, actionOptions} from './assets/react-host.js';
import {recoverTaskDraft} from './task-drafts.js';
import {pageAvailability, requestTaskLeave, statusLabel, errorFeedback, progressLabel, directoryLabel, feedback, drawer} from './presentation.js';
import {ActionRepository, isOverdue} from './actions.js';
import {allRecords, sourceState, fingerprint} from './initiatives.js';
import {native} from './bridge.js';
const $ = selector => document.querySelector(selector);
export class ActionScreen {
  constructor(notice) {
    this.repository = new ActionRepository(native); this.notice = notice; this.dirty = false; this.active = false;
    this.previous = null; this.retry = null; this.offset = 0; this.status = ''; this.search = ''; this.saving = null;
    this.setupDrawer();
    mountActionControls(this.drawer.body, $('#action-tools'), this.drawer.footer);
    this.drawer.body.addEventListener('focusin', event => {
      if (event.target.matches('input, textarea, select, button, summary, [tabindex]')) this.editingFocus = event.target;
    });
    this.assignmentView = actionOptions($('#action-initiative'), '独立行动');
    this.filterView = actionOptions($('#action-initiative-filter'), '全部事项');
    this.sourcesView = actionSources($('#action-sources'), () => this.changed(), path => this.initiatives.openNote(path));
    this.historyView = actionHistory($('#action-revisions'));
    $('#action-recover').onclick = async () => {
      if (!await this.leaveDrawer()) return;
      const draft = recoverTaskDraft('action', this.repository.workspaceId);
      if (!draft) { this.notice('没有待恢复的行动草稿。', true); return; }
      await this.edit(draft.value.previous || null, draft);
    };
    $('#action-filter').onchange = () => { this.status = $('#action-filter').value; this.offset = 0; this.list().catch(error => notice(error.message)); };
    $('#action-initiative-filter').onchange = () => { this.initiativeFilter = $('#action-initiative-filter').value; this.offset = 0; this.list().catch(error => notice(error.message)); };
    $('#action-focus').onclick = () => this.changeFocus();
    $('#action-next').onclick = () => { this.offset += 30; this.list().catch(error => notice(error.message)); };
    $('#action-previous').onclick = () => { this.offset = Math.max(0, this.offset - 30); this.list().catch(error => notice(error.message)); };
    $('#action-new').onclick = event => this.edit(null, null, null, event.currentTarget);
    $('#action-discard').onclick = () => this.leaveDrawer();
    $('#action-back').textContent = '取消';
    $('#action-back').onclick = () => this.dismissDrawer();
    $('#action-description').setAttribute('aria-describedby', 'action-save-state');
    $('#action-form').oninput = () => { $('#action-open-initiative').disabled = !$('#action-initiative').value; this.changed(); };
    $('#action-form').onsubmit = event => { event.preventDefault(); this.save(); };
    $('#action-add-source').onclick = () => { $('#action-source-options').open = true; this.addSource({path: '', quote: '', fingerprint: ''}); this.changed(); };
    $('#action-history').onclick = async () => {
      const repository = this.repository, entityId = this.previous?.entityId, request = this.editRequest;
      try {
        if (!this.previous) return;
        this.historyView(null);
        const records = await repository.history(entityId);
        if (repository !== this.repository || entityId !== this.previous?.entityId || request !== this.editRequest || !this.drawer.panel.open) return;
        this.historyView(records.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)));
      } catch (error) { if (repository === this.repository && entityId === this.previous?.entityId && request === this.editRequest && this.drawer.panel.open) errorFeedback($('#action-save-state'), error.message); }
    };
  }
  async changeFocus() {
    if (!await this.save() || !this.previous) return false;
    if (this.saving) return this.saving;
    const repository = this.repository, current = this.previous, owner = this.owner?.(), request = this.editRequest;
    const owns = () => repository === this.repository && owner === this.owner?.() && request === this.editRequest && current.entityId === this.previous?.entityId;
    this.saving = (async () => {
      await Promise.resolve();
      $('#action-form').inert = true; $('#action-focus').disabled = true;
      try {
        const tail = await repository.query({focus: true, lastFocus: true, limit: 1});
        if (!owns()) return false;
        const position = current.focusPosition == null ? (tail.actions[0]?.focusPosition ?? 0) + 1 : null;
        const result = await repository.save({...current, focusPosition: position}, current);
        if (!owns()) return true;
        this.showForm(result.record, result.record); this.state('已保存到本地');
        return true;
      } catch (error) { if (owns()) errorFeedback($('#action-save-state'), error.message); return false; }
      finally {
        this.saving = null;
        if (repository === this.repository && owner === this.owner?.() && current.entityId === this.previous?.entityId) {
          $('#action-form').inert = false;
          $('#action-focus').disabled = this.dirty || !['todo', 'in-progress'].includes(this.previous.status);
        }
      }
    })();
    return this.saving;
  }
  // Typed ActionEntry port; legacy edit(...) remains supported for sibling consumers.
  async open(entry) {
    const request = (this.openRequest || 0) + 1;
    if (await this.edit(entry.record, null, null, entry.opener) && request === this.openRequest && this.drawer.panel.open) this.returnToFocus = entry.returnToOrigin || null;
  }
  setupDrawer() {
    this.drawer = drawer({id: 'action-drawer', title: '新建行动', onDismiss: () => this.dismissDrawer()});
    this.drawer.panel.classList.add('ui-drawer-wide');
  }

  closeDrawer(discard = false) {
    if (!this.drawer.panel.open) return true;
    if (this.saving) return false;
    if (discard) { localStorage.removeItem(this.key()); this.dirty = false; this.retry = null; this.recoveredDraft = false; }
    if (!this.dirty && !this.creationUncertain) localStorage.removeItem(this.key());
    const opener = this.drawerContext?.opener;
    this.editRequest = (this.editRequest || 0) + 1;
    this.drawer.hide();
    const proposal = this.contextualProposal; this.contextualProposal = null; this.creationAttempt = null;
    if (this.drawerContext) {
      if (!this.drawerContext.committed) this.previous = this.drawerContext.previous;
      this.rowsView?.select(this.previous?.entityId);
      $('.app').className = this.drawerContext.classes;
      $('#editor').hidden = this.drawerContext.noteHidden;
      $('#empty').hidden = this.drawerContext.emptyHidden;
      if (this.initiatives?.active) { this.initiatives.detailKind = this.drawerContext.detailKind; this.initiatives.selectContext(this.drawerContext.selectedContext); }
      $('.collection').scrollTop = this.drawerContext.scroll;
      $('#workspace-detail').scrollTop = this.drawerContext.detailScroll;
      this.drawerContext = null;
    }
    $('#action-editor').hidden = true;
    const selected = [...document.querySelectorAll('[data-entity-id], [data-action-id]')].find(node => (node.dataset.entityId || node.dataset.actionId) === this.previous?.entityId && node.getClientRects().length);
    const fallback = [opener, selected, $('#action-new'), $('#workspace-overview'), $('.home-tools .primary')].find(node => node?.isConnected && !node.disabled && node.getClientRects().length);
    fallback?.focus({preventScroll: true});
    proposal?.restore();
    return true;
  }
  async dismissDrawer() { const contextual = this.contextualProposal; if (await this.leaveDrawer() && !contextual) await this.returnToFocus?.(); }
  leaveDrawer() { return this.drawer.panel.open ? requestTaskLeave(this.task()) : Promise.resolve(true); }
  task() {
    return {label: '行动', pending: () => this.saving, dirty: () => this.dirty, committed: () => Boolean(this.retry),
      focusOrigin: () => {
        const control = this.editingFocus;
        return control?.isConnected && this.drawer.body.contains(control) && control.tabIndex >= 0 && !control.matches(':disabled') && !control.closest('[inert]') && control.getClientRects().length ? control : $('#action-description');
      },
      save: () => this.save(), discard: () => {
        if (!this.creationUncertain) localStorage.removeItem(this.key()); this.dirty = false; this.retry = null; this.recoveredDraft = false;
        this.editRequest = (this.editRequest || 0) + 1;
        this.showForm(this.previous || {}, this.previous); this.dirty = false;
      }, close: () => this.closeDrawer()};
  }
  key() { return this.draftKey || `action-draft:${this.repository.workspaceId}:${this.previous?.entityId || 'new'}`; }
  async openWorkspace(cached = false) {
    this.recoveredDraft = false;
    this.previous = null; this.retry = null; this.dirty = false;
    this.listRequest = (this.listRequest || 0) + 1;
    const repository = new ActionRepository(native);
    this.repository = repository;
    $('#action-editor').hidden = true;
    const workspace = await repository.open({cached, progress: message => { if (this.repository === repository) $('#index-state').textContent = progressLabel(message); }});
    if (this.repository !== repository) return null;
    this.root = workspace.root; this.previous = null; this.retry = null; this.dirty = false;
    directoryLabel(workspace.root);
    if (workspace.warnings.length) this.notice(workspace.warnings.join('\n'));
    const recovered = recoverTaskDraft('action', this.repository.workspaceId);
    this.draftKey = recovered?.key; const draft = recovered?.value;
    if (draft) { this.showForm(draft.previous || {}, draft.previous); const baseline = this.baseline; this.recoveredDraft = true; this.showForm(draft.fields, draft.previous); this.baseline = baseline; this.retry = draft.retry; this.dirty = Boolean(this.retry || this.creationAttempt) || JSON.stringify(this.fields()) !== this.baseline; this.state('已恢复行动草稿，请核对后保存。'); }
    else $('#action-editor').hidden = true;
    return workspace;
  }
  async show({recover = true} = {}) {
    $('#library-tools').hidden = true;
    this.active = true;
    if (!this.repository.ready && !await this.openWorkspace()) return;
    if (!this.active) return;
    if (this.previous && !this.dirty) {
      const latest = (await allRecords(this.repository)).find(record => record.entityId === this.previous.entityId);
      if (latest) this.previous = latest;
    }
    $('#action-tools').hidden = false; $('#filters').hidden = true; $('#view-title').textContent = '行动';
    $('#search').placeholder = '搜索行动…';
    $('#editor').hidden = true;
    $('#action-editor').hidden = !this.dirty && !this.previous;
    $('#empty').hidden = !$('#action-editor').hidden;
    await this.assignments();

    await this.list(); $('#index-state').textContent = '';
  }
  async list() {
    if (!this.active) return;
    const repository = this.repository;
    const request = this.listRequest = (this.listRequest || 0) + 1;
    $('#index-state').textContent = '正在载入行动…';
    let page;
    try { page = await repository.query({status: this.status, initiativeId: this.initiativeFilter || '', search: this.search, limit: 30, offset: this.offset}); }
    catch (error) { if (this.active && request === this.listRequest && repository === this.repository) { $('#index-state').textContent = ''; this.release(); errorFeedback($('#items'), error.message); } return; }
    if (!this.active || request !== this.listRequest || repository !== this.repository) return;
    const scroll = $('#items').scrollTop;
    const focusedRow = document.activeElement.closest('#items [data-entity-id]')?.dataset.entityId;
    $('#index-state').textContent = '';
    this.rowsView ||= actionRows($('#items'));
    this.rowsView.render({rows: page.actions.map(action => ({...action, overdue: isOverdue(action), initiativeName: this.initiativeNames?.get(action.initiativeId) || (action.initiativeId ? '关联事项不可用' : '独立行动')})), selected: this.previous?.entityId,
      empty: this.search || this.status || this.initiativeFilter ? '没有符合条件的行动。请调整搜索词或筛选条件。' : this.offset ? '本页没有行动，请返回上一页。' : '还没有行动。决定要做什么后，点击「新建行动」。',
      open: action => this.edit(action)});
    if (focusedRow) [...$('#items').querySelectorAll('[data-entity-id]')].find(node => node.dataset.entityId === focusedRow)?.focus({preventScroll: true});
    $('#items').scrollTop = scroll;
    pageAvailability($('#action-previous'), $('#action-next'), this.offset > 0, page.hasMore);
    $('#action-page').textContent = `第 ${this.offset / 30 + 1} 页`;
  }
  async assignments(selected = $('#action-initiative').value || '') {
    if (!this.initiatives?.repository.ready) return;
    const repository = this.initiatives.repository, editRequest = this.editRequest;
    const request = this.assignmentRequest = (this.assignmentRequest || 0) + 1;
    const select = $('#action-initiative'), initial = select.value;
    const records = await allRecords(repository);
    if (repository !== this.initiatives.repository || editRequest !== this.editRequest || request !== this.assignmentRequest) return;
    // Loading options must not undo a choice made while the drawer was usable.
    if (select.value !== initial) selected = select.value;
    this.initiativeNames = new Map(records.map(record => [record.entityId, record.title]));
    this.assignmentView.set(records.filter(i => i.status !== 'ended' || i.entityId === selected));
    this.assignmentView.ensure(selected, '事项不可用，请重新选择');
    select.value = selected;
    const filter = $('#action-initiative-filter');
    this.filterView.set(records);
    filter.value = this.initiativeFilter || '';
  }
  fields() {
    return {description: $('#action-description').value, status: $('#action-status').value, initiativeId: $('#action-initiative').value,
      dueDate: $('#action-due').value, waitingOn: $('#action-waiting').value,
      sources: this.sourcesView.get()};
  }
  state(message) {
    feedback($('#action-save-state'), message);
    $('#action-save-state').dataset.state = message === '正在保存…' ? 'saving' : this.recoveredDraft ? 'recovered' : this.dirty ? 'dirty' : 'saved';
  }
  changed() {
    this.recoveredDraft = false; const edited = JSON.stringify(this.fields()) !== this.baseline; this.dirty = Boolean(this.retry || this.creationAttempt) || edited; if (edited) this.retry = null;
    $('#action-description').setAttribute('aria-invalid', 'false');
    $('#action-focus').disabled = true;
    if (this.dirty) localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry, attempt: this.creationAttempt})); else localStorage.removeItem(this.key());
    this.state(this.dirty ? '行动草稿尚未保存' : '已保存到本地');
  }
  addSource(source) { this.sourcesView.add(source); }
  release() { this.listRequest = (this.listRequest || 0) + 1; this.rowsView?.release(); this.rowsView = null; }
  captureContext(previous) { return {opener: document.activeElement, previous: previous || this.previous, detailKind: this.initiatives?.detailKind, selectedContext: this.initiatives?.selectedContext, classes: $('.app').className, noteHidden: $('#editor').hidden, emptyHidden: $('#empty').hidden, scroll: $('.collection').scrollTop, detailScroll: $('#workspace-detail').scrollTop}; }
  showForm(fields, previous) {
    if (!this.drawer.panel.open) this.drawerContext = this.captureContext(previous);
    this.previous = previous; this.retry = null;
    this.rowsView?.select(previous?.entityId);
    $('#action-open-initiative').disabled = !fields.initiativeId;
    $('#action-options').open = !!(fields.initiativeId || fields.dueDate || fields.waitingOn);
    $('#action-source-options').open = !!fields.sources?.length;
    $('#action-focus').disabled = !previous || !['todo', 'in-progress'].includes(fields.status);
    $('#action-focus').textContent = previous?.focusPosition == null ? '加入当前重点' : '移出当前重点';
    $('#action-description').value = fields.description || ''; $('#action-status').value = fields.status || 'todo';
    this.assignmentView.ensure(fields.initiativeId);
    $('#action-initiative').value = fields.initiativeId || ''; $('#action-due').value = fields.dueDate || ''; $('#action-waiting').value = fields.waitingOn || '';
    this.sourcesView.set(fields.sources || []);
    this.historyView([]); $('#action-id').textContent = previous?.entityId || '新建行动'; $('#action-history').disabled = !previous;
    $('#action-editor').hidden = false;
    this.drawer.setTitle(previous ? '编辑行动' : '新建行动');
    $('#action-save').textContent = previous ? '保存行动' : '创建行动';

    this.baseline = JSON.stringify(this.fields());
    // Source availability is advisory and must survive every form reconstruction.
    if (!this.contextualProposal) this.refreshSources(fields).catch(error => { if (this.drawer.panel.open) errorFeedback($('#action-save-state'), error.message); });
  }
  async edit(action, recovered = null, proposal = null, origin = document.activeElement) {
    const request = this.openRequest = (this.openRequest || 0) + 1;
    const repository = this.repository;

    if (action && action.workspaceId !== this.repository.workspaceId) { this.notice('笔记目录已切换，请重新打开行动。'); return; }
    const owner = this.owner?.();
    if (!await this.flush()) return;
    if (action && !recovered?.value.retry) {
      try {
        const current = (await repository.query({entityId: action.entityId, limit: 1})).actions[0] || action;
        const known = this.previous;
        // A failed current-file/index repair can lag a known immutable commit.
        action = known?.entityId === current.entityId && known.workspaceId === current.workspaceId && known.parents?.includes(current.revision) ? known : current;
      }
      catch (error) { this.notice(error.message); return; }
    }
    if (request !== this.openRequest || repository !== this.repository || owner !== this.owner?.()) return;
    this.draftKey = recovered?.key || proposal?.key || `action-draft:${this.repository.workspaceId}:${action?.entityId || 'new'}`;
    const draft = JSON.parse(localStorage.getItem(this.key()) || 'null');
    const context = this.captureContext(action); context.opener = origin;
    // The shared row is temporarily disabled during opening, which can move DOM focus to body.
    if (context.opener === document.body && action) context.opener = [...document.querySelectorAll('#items [data-entity-id]')].find(node => node.dataset.entityId === action.entityId) || context.opener;
    this.contextualProposal = proposal;
    this.showForm(proposal?.fields || action || {}, action);
    const baseline = this.baseline;
    if (draft) { this.showForm(draft.fields, draft.previous); this.baseline = baseline; this.retry = draft.retry; }
    this.drawerContext = context;
    this.creationAttempt = proposal ? draft?.attempt || null : null;
    this.creationUncertain = Boolean(this.creationAttempt);
    this.recoveredDraft = Boolean(draft);
    this.drawer.open($('#action-description'), context.opener);
    // Once the modal owns input, the underlying row must remain a usable return target.
    if (context.opener?.matches('#items .ui-row')) context.opener.disabled = false;
    this.dirty = Boolean(this.retry || this.creationAttempt) || JSON.stringify(this.fields()) !== this.baseline;
    await this.assignments($('#action-initiative').value || '');
    if (request !== this.openRequest || repository !== this.repository || owner !== this.owner?.() || !this.drawer.panel.open) return;
    if (draft) this.state('已恢复行动草稿，请核对后保存。');
    if (!this.dirty) this.state(action ? '已保存到本地' : '写下你已决定执行的下一步。');
    // Opening already placed focus; late option loading must not move it again.
    return true;
  }
  async refreshSources(action) {
    this.editRequest = (this.editRequest || 0) + 1; const request = this.editRequest, repository = this.repository;
    const sources = this.sourcesView.get();
    for (const [index, source] of sources.entries()) {
      if (!source.path || !source.fingerprint) continue;
      const result = await sourceState(source, path => native('read', {path, workspaceId: repository.workspaceId}), this.initiatives.listReferences);
      if (request !== this.editRequest || repository !== this.repository) return;
      // An advisory reply cannot replace an edited quote or newly added source.
      if (JSON.stringify(this.sourcesView.get()[index]) !== JSON.stringify(source)) continue;
      this.sourcesView.status(index, statusLabel(result.state), result.path, result.state === 'moved');
      if (result.state === 'moved') this.changed();
    }
  }

  async save() {
    if (this.saving) return this.saving;
    if (!this.dirty && this.previous) { this.state('已保存到本地'); return true; }
    this.dirty = true;
    const focused = document.activeElement;
    const repository = this.repository, owner = this.owner?.(), proposal = this.contextualProposal;
    const owns = () => repository === this.repository && owner === this.owner?.();
    this.saving = (async () => {
      await Promise.resolve();
      this.state('正在保存…'); $('#action-save').disabled = true; $('#action-form').inert = true;
      let committed = null;
      try {
        const fields = this.fields();
        if (!owns()) throw Error('笔记目录或页面已切换，请重新打开行动。');
        // A committed revision must be recovered even if its source later changes.
        let attemptedCommit = false;
        if (proposal && this.creationAttempt && !this.retry) {
          const history = await repository.history(this.creationAttempt.entityId);
          attemptedCommit = history.some(record => record.revision === this.creationAttempt.revision);
          if (!owns()) throw Error('笔记目录或页面已切换，请重新打开行动。');
        }
        if (proposal && !this.retry && !attemptedCommit) {
          await proposal.validate(fields);

        }
        if (!owns()) throw Error('笔记目录或页面已切换，请重新打开行动。');
        if (!fields.description.trim()) { $('#action-description').setAttribute('aria-invalid', 'true'); throw Error('请填写行动描述。'); }
        if (fields.initiativeId && fields.initiativeId !== this.previous?.initiativeId) {
          const target = (await allRecords(this.initiatives.repository)).find(i => i.entityId === fields.initiativeId && i.status !== 'ended');
          if (!target) throw Error('请选择进行中或以后再做的事项。');
        }
        for (const source of fields.sources) if (!source.fingerprint) {
          const result = await native('read', {path: source.path, workspaceId: this.repository.workspaceId}); source.fingerprint = fingerprint(result.text);
          if (source.quote && !result.text.includes(source.quote)) throw Error(`未在来源中找到引用原文，请核对：${source.path}`);
        }
        if (!owns()) throw Error('笔记目录或页面已切换，请重新打开行动。');
        if (proposal && !this.retry && !attemptedCommit) {
          // Persist the identity before crossing the bridge, including lost replies/restarts.
          this.creationAttempt = repository.prepare(fields);
          localStorage.setItem(this.key(), JSON.stringify({fields, previous: this.previous, retry: this.retry, attempt: this.creationAttempt}));
        }
        let result = await repository.save(fields, this.previous, this.retry || (proposal ? this.creationAttempt : null));
        if (proposal && attemptedCommit && JSON.stringify(fields) !== JSON.stringify({description: result.record.description, status: result.record.status, initiativeId: result.record.initiativeId || '', dueDate: result.record.dueDate || '', waitingOn: result.record.waitingOn || '', sources: result.record.sources})) {
          this.previous = result.record; this.retry = result.record;
          localStorage.setItem(this.key(), JSON.stringify({fields, previous: this.previous, retry: this.retry}));
          result = await repository.save(fields, result.record);
        }
        committed = result.record;
        if (!owns()) return true;
        if (this.drawerContext) this.drawerContext.committed = true;
        this.previous = result.record; this.retry = null; this.creationAttempt = null; this.recoveredDraft = false; this.dirty = false; localStorage.removeItem(this.key());
        this.draftKey = `action-draft:${this.repository.workspaceId}:${result.record.entityId}`;
        this.showForm(result.record, result.record);
        this.state(result.recovered ? '已恢复并保存到本地' : '已保存到本地');
        $('#action-save-state').dataset.state = 'saved';
        await this.list();
        if ($('.app').classList.contains('workspace')) await this.initiatives.details();
        if (proposal) { this.saving = null; this.closeDrawer(); }
        return true;
      } catch (error) {
        if (!owns()) return false;
        this.retry = error.revisionSaved ? error.record : committed;
        if (proposal && this.creationAttempt && !this.retry) {
          this.creationUncertain = true;
          try {
            const history = await repository.history(this.creationAttempt.entityId);
            if (!owns()) return false;
            this.creationUncertain = false;
            if (history.some(record => record.revision === this.creationAttempt.revision)) this.retry = this.creationAttempt;
          } catch { /* Retain the private identity when persistence cannot be verified. */ }
        }
        if (this.retry) {
          const record = this.retry;
          this.baseline = JSON.stringify({description:record.description || '',status:record.status || 'todo',initiativeId:record.initiativeId || '',dueDate:record.dueDate || '',waitingOn:record.waitingOn || '',sources:record.sources || []});
          this.previous = record; if (this.drawerContext) this.drawerContext.committed = true; }
        this.dirty = Boolean(this.retry || this.creationAttempt) || JSON.stringify(this.fields()) !== this.baseline;
        if (this.dirty) localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry, attempt: this.creationAttempt})); else localStorage.removeItem(this.key());
        errorFeedback($('#action-save-state'), error.message); if (this.creationUncertain) $('#action-save-state p').textContent = '保存结果尚未确认。重试会核对同一版本；关闭不会撤销可能已保存的版本。'; if (this.retry) $('#action-save-state p').textContent = '版本已保存，恢复尚未完成。可重试恢复，或关闭并保留已保存版本。'; return false;
      } finally { this.saving = null; $('#action-save').disabled = false; $('#action-form').inert = false; if ($('#action-description').getAttribute('aria-invalid') === 'true') $('#action-description').focus(); else if (this.drawer.panel.open && focused?.isConnected) focused.focus({preventScroll: true}); }
    })();
    return this.saving;
  }
  flush() { return this.leaveDrawer(); }
}
