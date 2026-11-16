import {InitiativeRepository, allRecords, endInitiative, unfinished, fingerprint, sourceState} from './initiatives.js';
import {native} from './bridge.js';
const $ = selector => document.querySelector(selector);
export class InitiativeScreen {
  constructor(actions, notice, openNote, createNote) {
    this.actions = actions; this.notice = notice; this.openNote = openNote; this.createNote = createNote; this.repository = new InitiativeRepository(native); this.active = false; this.dirty = false; this.offset = 0; this.search = '';
    $('#initiative-new').onclick = () => this.edit(null);
    $('#initiative-next').onclick = () => { this.offset += 50; this.list().catch(e => notice(e.message)); };
    $('#initiative-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.list().catch(e => notice(e.message)); };
    $('#initiative-form').oninput = () => this.changed();
    $('#initiative-form').onsubmit = event => { event.preventDefault(); this.save(); };
    $('#initiative-discard').onclick = () => { localStorage.removeItem(this.key()); this.dirty = false; this.retry = null; this.previous = null; $('#initiative-editor').hidden = true; $('.app').classList.remove('editing'); };
    $('#initiative-back').onclick = async () => { if (await this.flush()) $('.app').classList.remove('editing'); };
    $('#initiative-add-link').onclick = () => { this.addLink({path: '', quote: '', fingerprint: '', role: 'working-note'}); this.changed(); };
    $('#initiative-new-action').onclick = async () => {
      if (!await this.flush() || !this.previous || this.previous.status === 'ended') return;
      await this.actions.edit(null); $('#action-initiative').value = this.previous.entityId; this.actions.changed(); $('#initiative-editor').hidden = true;
    };
    $('#initiative-new-note').onclick = async () => { if (await this.flush() && this.previous) this.createNote(this.previous.entityId); };
  }
  key() { return `initiative-draft:${this.repository.workspaceId}`; }
  async openWorkspace() {
    this.active = false; this.previous = null; this.dirty = false; this.retry = null; this.offset = 0;
    $('#initiative-editor').hidden = true;
    const repository = new InitiativeRepository(native); this.repository = repository;
    const result = await repository.open();
    if (repository !== this.repository) return;
    if (result.warnings.length) this.notice(result.warnings.join('\n'));
    const draft = JSON.parse(localStorage.getItem(this.key()) || 'null');
    if (draft) { this.form(draft.fields, draft.previous); this.retry = draft.retry; this.dirty = true; $('#initiative-save-state').textContent = 'Recovered unsaved initiative; review and save.'; }
  }
  async show() {
    if (!this.repository.ready) await this.openWorkspace();
    this.active = true;
    if (this.previous && !this.dirty) {
      const latest = (await allRecords(this.repository)).find(i => i.entityId === this.previous.entityId);
      if (latest) { this.form(latest, latest); await this.details(); }
    }
    $('#view-title').textContent = 'Initiatives'; $('#search').placeholder = 'Search initiatives…';
    $('#filters').hidden = true; $('#action-tools').hidden = true; $('#initiative-tools').hidden = false;
    $('#editor').hidden = true; $('#action-editor').hidden = true;
    $('#initiative-editor').hidden = !this.previous && !this.dirty; $('#empty').hidden = !$('#initiative-editor').hidden;
    await this.list();
  }
  async list() {
    const repository = this.repository;
    const page = await repository.query({limit: 50, offset: this.offset, search: this.search});
    if (!this.active || repository !== this.repository) return;
    $('#items').replaceChildren();
    for (const record of page.actions) {
      const button = document.createElement('button'); button.className = 'card';
      const heading = document.createElement('h3'); heading.textContent = record.title;
      const summary = document.createElement('p'); summary.textContent = `${record.status} · ${record.progress}`;
      button.append(heading, summary); button.onclick = () => this.edit(record).catch(e => this.notice(e.message)); $('#items').append(button);
    }
    if (!page.actions.length) $('#items').textContent = 'No initiatives. Create one to track an ongoing undertaking.';
    $('#initiative-next').disabled = !page.hasMore; $('#initiative-previous').disabled = !this.offset;
  }
  fields() {
    return {title: $('#initiative-title').value, goal: $('#initiative-goal').value, progress: $('#initiative-progress').value, status: $('#initiative-status').value,
      sources: [...document.querySelectorAll('.initiative-source')].map(row => ({path: row.querySelector('input').value.trim(), quote: row.querySelector('textarea').value, role: row.querySelector('select').value, fingerprint: row.dataset.fingerprint || ''}))};
  }
  changed() { this.dirty = true; this.retry = null; this.draft(); $('#initiative-save-state').textContent = 'Unsaved initiative draft'; }
  draft() { localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry})); }
  addLink(source) {
    const row = document.createElement('div'); row.className = 'initiative-source'; row.dataset.fingerprint = source.fingerprint;
    row.innerHTML = '<label>Markdown path<input required></label><label>Quoted fragment<textarea rows="2" required></textarea></label><label>Role<select><option value="working-note">Working note</option><option value="reference">Reference</option></select></label><button type="button">Remove link</button><span class="source-state"></span><button type="button" class="source-open">Open source</button>';
    row.querySelector('input').value = source.path; row.querySelector('textarea').value = source.quote; row.querySelector('select').value = source.role;
    row.querySelector('input').oninput = row.querySelector('textarea').oninput = () => { row.dataset.fingerprint = ''; };
    row.querySelector('button').onclick = () => { row.remove(); this.changed(); };
    row.querySelector('.source-open').onclick = async () => { if (await this.flush()) this.openNote(row.querySelector('input').value); };
    $('#initiative-sources').append(row);
  }
  form(fields, previous) {
    this.previous = previous;
    for (const field of ['title', 'goal', 'progress']) $(`#initiative-${field}`).value = fields[field] || '';
    $('#initiative-status').value = fields.status || 'active';
    $('#initiative-sources').replaceChildren();
    // Working notes precede reference material regardless of the order links were added.
    for (const source of [...(fields.sources || [])].sort((a, b) => (a.role === 'reference') - (b.role === 'reference'))) this.addLink(source);
    $('#initiative-editor').hidden = false; $('#action-editor').hidden = true; $('#editor').hidden = true; $('#empty').hidden = true; $('.app').classList.add('editing');
    $('#initiative-new-action').disabled = !previous || previous.status === 'ended'; $('#initiative-new-note').disabled = !previous;
  }
  async edit(record) {
    if (!await this.flush() || !await this.actions.flush()) return;
    this.retry = null; this.form(record || {}, record); $('#initiative-save-state').textContent = record ? 'Saved locally' : 'Create an initiative';
    if (!record) this.changed();
    await this.details();
  }
  async details() {
    $('#initiative-actions').replaceChildren(); $('#initiative-retired').replaceChildren(); $('#initiative-decisions').replaceChildren();
    const record = this.previous;
    if (!record) return;
    const [actions, initiatives] = await Promise.all([allRecords(this.actions.repository), allRecords(this.repository)]);
    if (record !== this.previous) return;
    for (const action of actions.filter(a => a.initiativeId === record.entityId)) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `${action.description} · ${action.status}`;
      button.onclick = async () => { if (await this.flush()) { $('#initiative-editor').hidden = true; await this.actions.edit(action); } };
      (unfinished(action) ? $('#initiative-actions') : $('#initiative-retired')).append(button);
      if (unfinished(action)) {
        const label = document.createElement('label'); label.textContent = `When ending: ${action.description}`;
        const select = document.createElement('select'); select.dataset.action = action.entityId;
        select.add(new Option('Choose explicitly…', '')); select.add(new Option('Complete', 'completed')); select.add(new Option('Cancel', 'canceled')); select.add(new Option('Retain independently', 'independent'));
        for (const target of initiatives.filter(i => i.entityId !== record.entityId && i.status !== 'ended')) select.add(new Option(`Move to ${target.title}`, `move:${target.entityId}`));
        label.append(select); $('#initiative-decisions').append(label);
      }
    }
    for (const row of document.querySelectorAll('.initiative-source')) {
      const source = record.sources.find(s => s.path === row.querySelector('input').value);
      if (!source) continue;
      try {
        const result = await sourceState(source, path => native('read', {path, workspaceId: this.repository.workspaceId}), async () => (await native('list', {workspaceId: this.repository.workspaceId})).notes);
        if (record !== this.previous) return;
        row.querySelector('.source-state').textContent = result.state === 'moved' ? `Moved to ${result.path}; review and save the updated link.` : result.state;
        if (result.state === 'moved') { row.querySelector('input').value = result.path; this.changed(); }
        row.querySelector('.source-open').disabled = !result.path;
      } catch (error) { row.querySelector('.source-state').textContent = `Unavailable: ${error.message}`; }
    }
  }
  async save() {
    if (this.saving) return this.saving;
    if (!this.dirty) return true;
    this.saving = (async () => {
      $('#initiative-form').inert = true;
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
          result = await endInitiative(this.repository, this.actions.repository, this.previous, decisions, fields);
        } else result = await this.repository.save(fields, this.previous, this.retry);
        this.dirty = false; this.retry = null; localStorage.removeItem(this.key()); this.form(result.record, result.record);
        $('#initiative-save-state').textContent = result.recovered ? 'Saved locally after recovery' : 'Saved locally'; await this.list(); await this.details(); return true;
      } catch (error) {
        const initiativeCommitted = error.revisionSaved && error.record?.entityType === 'initiative';
        this.retry = initiativeCommitted ? error.record : null; if (initiativeCommitted) this.previous = error.record;
        this.dirty = true; this.draft(); $('#initiative-save-state').textContent = `${error.message} · Edit retained; retry Save.`; return false;
      } finally { this.saving = null; $('#initiative-form').inert = false; }
    })(); return this.saving;
  }
  flush() { return this.saving || (this.dirty ? this.save() : Promise.resolve(true)); }
}
