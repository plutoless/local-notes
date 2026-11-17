import {actionLabels, statusLabel, errorFeedback, progressLabel} from './presentation.js';
import {ActionRepository, ACTION_STATES, isOverdue} from './actions.js';
import {allRecords, sourceState, fingerprint} from './initiatives.js';
import {native} from './bridge.js';
import {escapeHTML as esc} from './core.js';
const labels = actionLabels;
const $ = selector => document.querySelector(selector);
export class ActionScreen {
  constructor(notice) {
    this.repository = new ActionRepository(native); this.notice = notice; this.dirty = false; this.active = false;
    this.previous = null; this.retry = null; this.offset = 0; this.status = ''; this.search = ''; this.saving = null;
    $('#action-status').innerHTML = ACTION_STATES.map(state => `<option value="${state}">${labels[state]}</option>`).join('');
    $('#action-filter').innerHTML = '<option value="">全部状态</option>' + $('#action-status').innerHTML;
    $('#action-filter').onchange = () => { this.status = $('#action-filter').value; this.offset = 0; this.list().catch(error => notice(error.message)); };
    $('#action-initiative-filter').onchange = () => { this.initiativeFilter = $('#action-initiative-filter').value; this.offset = 0; this.list().catch(error => notice(error.message)); };
    $('#action-focus').onclick = async () => {
      if (!await this.flush() || !this.previous) return;
      try {
        const current = this.previous;
        const tail = await this.repository.query({focus: true, lastFocus: true, limit: 1});
        const position = current.focusPosition == null ? (tail.actions[0]?.focusPosition ?? 0) + 1 : null;
        const result = await this.repository.save({...current, focusPosition: position}, current);
        this.showForm(result.record, result.record); this.state('已保存到本地');
      } catch (error) { notice(error.message); }
    };
    $('#action-next').onclick = () => { this.offset += 30; this.list().catch(error => notice(error.message)); };
    $('#action-previous').onclick = () => { this.offset = Math.max(0, this.offset - 30); this.list().catch(error => notice(error.message)); };
    $('#action-new').onclick = () => this.edit(null);
    $('#action-back').onclick = async () => { if (await this.flush()) $('.app').classList.remove('editing'); };
    $('#action-discard').onclick = () => { localStorage.removeItem(this.key()); this.recoveredDraft = false; this.dirty = false; this.retry = null; this.previous = null; $('#action-editor').hidden = true; $('#empty').hidden = false; $('.app').classList.remove('editing'); };
    $('#action-form').oninput = () => this.changed();
    $('#action-form').onsubmit = event => { event.preventDefault(); this.save(); };
    $('#action-add-source').onclick = () => { this.addSource({path: '', quote: '', fingerprint: ''}); this.changed(); };
    $('#action-history').onclick = async () => {
      try {
        if (!this.previous) return;
        const repository = this.repository, entityId = this.previous.entityId;
        const records = await repository.history(entityId);
        if (repository !== this.repository || entityId !== this.previous?.entityId) return;
        $('#action-revisions').replaceChildren();
        for (const record of records) {
          const item = document.createElement('p');
          item.textContent = `${labels[record.status]} · ${record.description} · ${record.modifiedAt} · ${record.revision}`;
          $('#action-revisions').append(item);
        }
      } catch (error) { notice(error.message); }
    };
  }
  key() { return `action-draft:${this.repository.workspaceId}`; }
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
    $('#root-label').textContent = workspace.root;
    if (workspace.warnings.length) this.notice(workspace.warnings.join('\n'));
    const draft = JSON.parse(localStorage.getItem(this.key()) || 'null');
    if (draft) { this.recoveredDraft = true; this.showForm(draft.fields, draft.previous); this.retry = draft.retry; this.dirty = true; this.state('已恢复行动草稿，请核对后保存。'); }
    else $('#action-editor').hidden = true;
    return workspace;
  }
  async show() {
    $('#library-tools').hidden = true;
    this.active = true;
    if (!this.repository.ready && !await this.openWorkspace()) return;
    if (!this.active) return;
    const wasEditing = $('.app').classList.contains('editing');
    if (this.previous && !this.dirty) {
      const latest = (await allRecords(this.repository)).find(a => a.entityId === this.previous.entityId);
      if (latest) this.showForm(latest, latest);
      if (!wasEditing) $('.app').classList.remove('editing');
    }
    $('#action-tools').hidden = false; $('#filters').hidden = true; $('#view-title').textContent = '已确认行动';
    $('#search').placeholder = '搜索行动…';
    $('#editor').hidden = true;
    $('#action-editor').hidden = !this.dirty && !this.previous;
    $('#empty').hidden = !$('#action-editor').hidden;
    await this.list(); $('#index-state').textContent = '';
  }
  async list() {
    const repository = this.repository;
    const request = this.listRequest = (this.listRequest || 0) + 1;
    const page = await repository.query({status: this.status, initiativeId: this.initiativeFilter || '', search: this.search, limit: 30, offset: this.offset});
    if (!this.active || request !== this.listRequest || repository !== this.repository) return;
    $('#index-state').textContent = ''; $('#items').replaceChildren();
    for (const action of page.actions) {
      const row = document.createElement('button'); row.className = 'card';
      row.innerHTML = `<h3>${esc(action.description)}</h3><p>${labels[action.status]}${action.dueDate ? ` · ${esc(action.dueDate)}${isOverdue(action) ? ' · 已逾期' : ''}` : ''}</p><small>${esc(action.waitingOn || (action.initiativeId ? '已关联事项' : '独立行动'))}</small>`;
      row.onclick = () => this.edit(action); $('#items').append(row);
    }
    if (!page.actions.length) $('#items').innerHTML = '<div class="no-items">还没有已确认行动。<br>决定要做什么后，点击「新建行动」。</div>';
    $('#action-next').disabled = !page.hasMore; $('#action-previous').disabled = this.offset === 0;
    $('#action-page').textContent = `第 ${this.offset / 30 + 1} 页`;
  }
  async assignments(selected = $('#action-initiative').value || '') {
    if (!this.initiatives?.repository.ready) return;
    const records = await allRecords(this.initiatives.repository);
    const select = $('#action-initiative'); select.replaceChildren(new Option('独立行动', ''));
    for (const record of records.filter(i => i.status !== 'ended' || i.entityId === selected)) select.add(new Option(record.title, record.entityId));
    if (selected && !records.some(i => i.entityId === selected)) select.add(new Option(`事项不可用：${selected}`, selected));
    select.value = selected;
    const filter = $('#action-initiative-filter'); filter.replaceChildren(new Option('全部事项', ''));
    for (const record of records) filter.add(new Option(record.title, record.entityId));
    filter.value = this.initiativeFilter || '';
  }
  fields() {
    return {description: $('#action-description').value, status: $('#action-status').value, initiativeId: $('#action-initiative').value,
      dueDate: $('#action-due').value, waitingOn: $('#action-waiting').value,
      sources: [...document.querySelectorAll('.action-source')].map(row => ({path: row.querySelector('.source-path').value.trim(), quote: row.querySelector('.source-quote').value, fingerprint: row.dataset.fingerprint || ''}))};
  }
  state(message) { $('#action-save-state').textContent = message; }
  changed() {
    this.recoveredDraft = false; this.dirty = true; this.retry = null;
    localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry}));
    this.state('行动草稿尚未保存');
  }
  addSource(source) {
    const row = document.createElement('div'); row.className = 'action-source'; row.dataset.fingerprint = source.fingerprint;
    row.innerHTML = '<label>来源 Markdown 路径<input class="source-path" placeholder="Notes/reference.md"></label><label>引用原文<textarea class="source-quote" rows="2"></textarea></label><button type="button">移除引用</button>';
    row.querySelector('.source-path').value = source.path; row.querySelector('.source-quote').value = source.quote;
    row.querySelector('.source-path').oninput = () => { row.dataset.fingerprint = ''; };
    row.querySelector('button').onclick = () => { row.remove(); this.changed(); }; $('#action-sources').append(row);
  }
  showForm(fields, previous) {
    this.previous = previous; this.retry = null;
    $('#action-focus').disabled = !previous || !['todo', 'in-progress'].includes(fields.status);
    $('#action-focus').textContent = previous?.focusPosition == null ? '加入当前重点' : '移出当前重点';
    $('#action-description').value = fields.description || ''; $('#action-status').value = fields.status || 'todo';
    if (fields.initiativeId && ![...$('#action-initiative').options].some(o => o.value === fields.initiativeId)) $('#action-initiative').add(new Option(fields.initiativeId, fields.initiativeId));
    $('#action-initiative').value = fields.initiativeId || ''; $('#action-due').value = fields.dueDate || ''; $('#action-waiting').value = fields.waitingOn || '';
    $('#action-sources').replaceChildren(); for (const source of fields.sources || []) this.addSource(source);
    $('#action-revisions').replaceChildren(); $('#action-id').textContent = previous?.entityId || '新建行动'; $('#action-history').disabled = !previous;
    $('#empty').hidden = true; $('#editor').hidden = true; $('#action-editor').hidden = false; $('.app').classList.add('editing');
  }
  async edit(action) {
    if (action && action.workspaceId !== this.repository.workspaceId) { this.notice('Workspace changed; reopen the action'); return; }
    if (!await this.flush()) return;
    this.showForm(action || {}, action);
    await this.assignments(action?.initiativeId || '');
    for (const row of document.querySelectorAll('.action-source')) {
      const source = action?.sources.find(s => s.path === row.querySelector('.source-path').value);
      if (!source) continue;
      const result = await sourceState(source, path => native('read', {path, workspaceId: this.repository.workspaceId}), async () => (await native('list', {workspaceId: this.repository.workspaceId})).notes);
      const status = document.createElement('p'); status.textContent = statusLabel(result.state); row.append(status);
      if (result.state === 'moved') { row.querySelector('.source-path').value = result.path; this.changed(); }
      if (result.path && this.initiatives) { const open = document.createElement('button'); open.type = 'button'; open.textContent = '打开来源'; open.onclick = async () => { if (await this.flush()) this.initiatives.openNote(result.path); }; row.append(open); }
    } this.state(action ? '已保存到本地' : '写下你已决定执行的下一步。');
    if (!action) this.changed();
    $('#action-description').focus();
  }
  async save() {
    if (this.saving) return this.saving;
    if (!this.dirty) return true;
    this.saving = (async () => {
      this.state('正在保存…'); $('#action-save').disabled = true; $('#action-form').inert = true;
      try {
        const fields = this.fields();
        if (fields.initiativeId && fields.initiativeId !== this.previous?.initiativeId) {
          const target = (await allRecords(this.initiatives.repository)).find(i => i.entityId === fields.initiativeId && i.status !== 'ended');
          if (!target) throw Error('Choose an active or later initiative');
        }
        for (const source of fields.sources) if (!source.fingerprint) {
          const result = await native('read', {path: source.path, workspaceId: this.repository.workspaceId}); source.fingerprint = fingerprint(result.text);
          if (source.quote && !result.text.includes(source.quote)) throw Error(`Quoted fragment was not found in ${source.path}`);
        }
        const result = await this.repository.save(fields, this.previous, this.retry);
        this.previous = result.record; this.retry = null; this.recoveredDraft = false; this.dirty = false; localStorage.removeItem(this.key());
        this.showForm(result.record, result.record);
        this.state(result.recovered ? '已恢复并保存到本地' : '已保存到本地');
        await this.list(); return true;
      } catch (error) {
        this.retry = error.revisionSaved ? error.record : null;
        if (error.revisionSaved) this.previous = error.record;
        this.dirty = true;
        localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry}));
        errorFeedback($('#action-save-state'), error.message); return false;
      } finally { this.saving = null; $('#action-save').disabled = false; $('#action-form').inert = false; }
    })();
    return this.saving;
  }
  flush() { return this.saving || (this.dirty ? this.save() : Promise.resolve(true)); }
}
