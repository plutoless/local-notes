import {ActionRepository, ACTION_STATES, isOverdue} from './actions.js';
import {native} from './bridge.js';
import {escapeHTML as esc} from './core.js';
const labels = {'todo': 'To do', 'in-progress': 'In progress', waiting: 'Waiting', completed: 'Completed', canceled: 'Canceled'};
const $ = selector => document.querySelector(selector);
const fingerprint = text => {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
};
export class ActionScreen {
  constructor(notice) {
    this.repository = new ActionRepository(native); this.notice = notice; this.dirty = false; this.active = false;
    this.previous = null; this.retry = null; this.offset = 0; this.status = ''; this.search = ''; this.saving = null;
    $('#action-status').innerHTML = ACTION_STATES.map(state => `<option value="${state}">${labels[state]}</option>`).join('');
    $('#action-filter').innerHTML = '<option value="">All states</option>' + $('#action-status').innerHTML;
    $('#action-filter').onchange = () => { this.status = $('#action-filter').value; this.offset = 0; this.list().catch(error => notice(error.message)); };
    $('#action-next').onclick = () => { this.offset += 30; this.list().catch(error => notice(error.message)); };
    $('#action-previous').onclick = () => { this.offset = Math.max(0, this.offset - 30); this.list().catch(error => notice(error.message)); };
    $('#action-new').onclick = () => this.edit(null);
    $('#action-back').onclick = async () => { if (await this.flush()) $('.app').classList.remove('editing'); };
    $('#action-discard').onclick = () => { localStorage.removeItem(this.key()); this.dirty = false; this.retry = null; this.previous = null; $('#action-editor').hidden = true; $('#empty').hidden = false; $('.app').classList.remove('editing'); };
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
  async openWorkspace() {
    this.previous = null; this.retry = null; this.dirty = false;
    this.listRequest = (this.listRequest || 0) + 1;
    const repository = new ActionRepository(native);
    this.repository = repository;
    $('#action-editor').hidden = true;
    const workspace = await repository.open();
    if (this.repository !== repository) return null;
    this.root = workspace.root; this.previous = null; this.retry = null; this.dirty = false;
    $('#root-label').textContent = workspace.root;
    if (workspace.warnings.length) this.notice(workspace.warnings.join('\n'));
    const draft = JSON.parse(localStorage.getItem(this.key()) || 'null');
    if (draft) { this.showForm(draft.fields, draft.previous); this.retry = draft.retry; this.dirty = true; this.state('Recovered unsaved action; review and save.'); }
    else $('#action-editor').hidden = true;
    return workspace;
  }
  async show() {
    this.active = true;
    if (!this.repository.ready && !await this.openWorkspace()) return;
    if (!this.active) return;
    $('#action-tools').hidden = false; $('#filters').hidden = true; $('#view-title').textContent = 'Confirmed actions';
    $('#search').placeholder = 'Search actions…';
    $('#editor').hidden = true;
    $('#action-editor').hidden = !this.dirty && !this.previous;
    $('#empty').hidden = !$('#action-editor').hidden;
    await this.list();
  }
  async list() {
    const repository = this.repository;
    const request = this.listRequest = (this.listRequest || 0) + 1;
    const page = await repository.query({status: this.status, search: this.search, limit: 30, offset: this.offset});
    if (!this.active || request !== this.listRequest || repository !== this.repository) return;
    $('#items').replaceChildren();
    for (const action of page.actions) {
      const row = document.createElement('button'); row.className = 'card';
      row.innerHTML = `<h3>${esc(action.description)}</h3><p>${labels[action.status]}${action.dueDate ? ` · ${esc(action.dueDate)}${isOverdue(action) ? ' · Overdue' : ''}` : ''}</p><small>${esc(action.waitingOn || action.initiativeId || 'Independent action')}</small>`;
      row.onclick = () => this.edit(action); $('#items').append(row);
    }
    if (!page.actions.length) $('#items').innerHTML = '<div class="no-items">No confirmed actions.<br>Create an action when you decide to act.</div>';
    $('#action-next').disabled = !page.hasMore; $('#action-previous').disabled = this.offset === 0;
    $('#action-page').textContent = `Page ${this.offset / 30 + 1}`;
  }
  fields() {
    return {description: $('#action-description').value, status: $('#action-status').value, initiativeId: $('#action-initiative').value,
      dueDate: $('#action-due').value, waitingOn: $('#action-waiting').value,
      sources: [...document.querySelectorAll('.action-source')].map(row => ({path: row.querySelector('.source-path').value.trim(), quote: row.querySelector('.source-quote').value, fingerprint: row.dataset.fingerprint || ''}))};
  }
  state(message) { $('#action-save-state').textContent = message; }
  changed() {
    this.dirty = true; this.retry = null;
    localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry}));
    this.state('Unsaved action draft');
  }
  addSource(source) {
    const row = document.createElement('div'); row.className = 'action-source'; row.dataset.fingerprint = source.fingerprint;
    row.innerHTML = '<label>Source Markdown path<input class="source-path" placeholder="Notes/reference.md"></label><label>Quoted fragment<textarea class="source-quote" rows="2"></textarea></label><button type="button">Remove reference</button>';
    row.querySelector('.source-path').value = source.path; row.querySelector('.source-quote').value = source.quote;
    row.querySelector('.source-path').oninput = () => { row.dataset.fingerprint = ''; };
    row.querySelector('button').onclick = () => { row.remove(); this.changed(); }; $('#action-sources').append(row);
  }
  showForm(fields, previous) {
    this.previous = previous; this.retry = null;
    $('#action-description').value = fields.description || ''; $('#action-status').value = fields.status || 'todo';
    $('#action-initiative').value = fields.initiativeId || ''; $('#action-due').value = fields.dueDate || ''; $('#action-waiting').value = fields.waitingOn || '';
    $('#action-sources').replaceChildren(); for (const source of fields.sources || []) this.addSource(source);
    $('#action-revisions').replaceChildren(); $('#action-id').textContent = previous?.entityId || 'New action'; $('#action-history').disabled = !previous;
    $('#empty').hidden = true; $('#editor').hidden = true; $('#action-editor').hidden = false; $('.app').classList.add('editing');
  }
  async edit(action) {
    if (action && action.workspaceId !== this.repository.workspaceId) { this.notice('Workspace changed; reopen the action'); return; }
    if (!await this.flush()) return;
    this.showForm(action || {}, action); this.state(action ? 'Saved locally' : 'Describe a next step you have confirmed.');
    if (!action) this.changed();
    $('#action-description').focus();
  }
  async save() {
    if (this.saving) return this.saving;
    if (!this.dirty) return true;
    this.saving = (async () => {
      this.state('Saving…'); $('#action-save').disabled = true; $('#action-form').inert = true;
      try {
        const fields = this.fields();
        for (const source of fields.sources) if (!source.fingerprint) {
          const result = await native('read', {path: source.path, workspaceId: this.repository.workspaceId}); source.fingerprint = fingerprint(result.text);
          if (source.quote && !result.text.includes(source.quote)) throw Error(`Quoted fragment was not found in ${source.path}`);
        }
        const result = await this.repository.save(fields, this.previous, this.retry);
        this.previous = result.record; this.retry = null; this.dirty = false; localStorage.removeItem(this.key());
        this.showForm(result.record, result.record);
        this.state(result.recovered ? 'Saved locally after recovery' : 'Saved locally');
        await this.list(); return true;
      } catch (error) {
        this.retry = error.revisionSaved ? error.record : null;
        if (error.revisionSaved) this.previous = error.record;
        this.dirty = true;
        localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry}));
        this.state(error.message + ' · Your edit is retained. Retry Save.'); return false;
      } finally { this.saving = null; $('#action-save').disabled = false; $('#action-form').inert = false; }
    })();
    return this.saving;
  }
  flush() { return this.saving || (this.dirty ? this.save() : Promise.resolve(true)); }
}
