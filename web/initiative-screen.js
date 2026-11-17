import {statusLabel, errorFeedback, progressLabel} from './presentation.js';
import {InitiativeRepository, allRecords, endInitiative, unfinished, fingerprint, sourceState} from './initiatives.js';
import {native} from './bridge.js';
const $ = selector => document.querySelector(selector);
export class InitiativeScreen {
  constructor(actions, notice, openNote, createNote, listReferences) {
    this.listReferences = listReferences; this.actions = actions; this.notice = notice; this.openNote = openNote; this.createNote = createNote; this.repository = new InitiativeRepository(native); this.active = false; this.dirty = false; this.offset = 0; this.search = '';
    $('#initiative-new').onclick = () => this.edit(null);
    $('#initiative-next').onclick = () => { this.offset += 50; this.list().catch(e => notice(e.message)); };
    $('#initiative-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.list().catch(e => notice(e.message)); };
    $('#initiative-form').oninput = () => this.changed();
    $('#initiative-form').onsubmit = event => { event.preventDefault(); this.save(); };
    $('#initiative-discard').onclick = () => { localStorage.removeItem(this.key()); this.recoveredDraft = false; this.dirty = false; this.retry = null; this.previous = null; $('#initiative-editor').hidden = true; $('.app').classList.remove('editing'); };
    $('#initiative-back').onclick = async () => { if (await this.flush()) $('.app').classList.remove('editing'); };
    $('#initiative-add-link').onclick = () => { this.addLink({path: '', quote: '', fingerprint: '', role: 'working-note'}); this.changed(); };
    $('#initiative-new-action').onclick = async () => {
      if (!await this.flush() || !this.previous || this.previous.status === 'ended') return;
      await this.actions.edit(null); $('#action-initiative').value = this.previous.entityId; this.actions.changed(); $('#initiative-editor').hidden = true;
    };
    $('#initiative-new-note').onclick = async () => { if (await this.flush() && this.previous) this.createNote(this.previous.entityId); };
  }
  key() { return `initiative-draft:${this.repository.workspaceId}`; }
  async openWorkspace(cached = false) {
    this.recoveredDraft = false;
    this.active = false; this.previous = null; this.recoveredDraft = false; this.dirty = false; this.retry = null; this.offset = 0;
    $('#initiative-editor').hidden = true;
    const repository = new InitiativeRepository(native); this.repository = repository;
    const result = await repository.open({cached, progress: message => { if (this.repository === repository) $('#index-state').textContent = progressLabel(message); }});
    if (repository !== this.repository) return;
    if (result.warnings.length) this.notice(result.warnings.join('\n'));
    const draft = JSON.parse(localStorage.getItem(this.key()) || 'null');
    if (draft) { this.recoveredDraft = true; this.form(draft.fields, draft.previous); this.retry = draft.retry; this.dirty = true; $('#initiative-save-state').textContent = '已恢复事项草稿，请核对后保存。'; }
  }
  async show() {
    $('#library-tools').hidden = true;
    if (!this.repository.ready) await this.openWorkspace();
    this.active = true;
    const wasEditing = $('.app').classList.contains('editing');
    if (this.previous && !this.dirty) {
      const latest = (await allRecords(this.repository)).find(i => i.entityId === this.previous.entityId);
      if (latest) { this.form(latest, latest); await this.details(); }
      if (!wasEditing) $('.app').classList.remove('editing');
    }
    $('#view-title').textContent = '事项'; $('#search').placeholder = '搜索事项…';
    $('#filters').hidden = true; $('#action-tools').hidden = true; $('#initiative-tools').hidden = false;
    $('#editor').hidden = true; $('#action-editor').hidden = true;
    $('#initiative-editor').hidden = !this.previous && !this.dirty; $('#empty').hidden = !$('#initiative-editor').hidden;
    await this.list(); $('#index-state').textContent = '';
  }
  async list() {
    const repository = this.repository;
    const page = await repository.query({limit: 50, offset: this.offset, search: this.search});
    if (!this.active || repository !== this.repository) return;
    $('#index-state').textContent = ''; $('#items').replaceChildren();
    for (const record of page.actions) {
      const button = document.createElement('button'); button.className = 'card';
      const heading = document.createElement('h3'); heading.textContent = record.title;
      const summary = document.createElement('p'); summary.textContent = `${statusLabel(record.status)} · ${record.progress}`;
      button.append(heading, summary); button.onclick = () => this.edit(record).catch(e => this.notice(e.message)); $('#items').append(button);
    }
    if (!page.actions.length) $('#items').textContent = '还没有事项。点击「新建事项」记录目标和进展。';
    $('#initiative-next').disabled = !page.hasMore; $('#initiative-previous').disabled = !this.offset;
  }
  fields() {
    return {title: $('#initiative-title').value, goal: $('#initiative-goal').value, progress: $('#initiative-progress').value, status: $('#initiative-status').value,
      sources: [...document.querySelectorAll('.initiative-source')].map(row => ({path: row.querySelector('input').value.trim(), quote: row.querySelector('textarea').value, role: row.querySelector('select').value, fingerprint: row.dataset.fingerprint || ''}))};
  }
  changed() { this.recoveredDraft = false; this.dirty = true; this.retry = null; this.draft(); $('#initiative-save-state').textContent = '事项草稿尚未保存'; }
  draft() { localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry})); }
  addLink(source) {
    const row = document.createElement('div'); row.className = 'initiative-source'; row.dataset.fingerprint = source.fingerprint;
    row.innerHTML = '<label>Markdown 路径<input required></label><label>引用原文<textarea rows="2" required></textarea></label><label>用途<select><option value="working-note">工作笔记</option><option value="reference">参考资料</option></select></label><button type="button">移除关联</button><span class="source-state"></span><button type="button" class="source-open">打开来源</button>';
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
    this.retry = null; this.form(record || {}, record); $('#initiative-save-state').textContent = record ? '已保存到本地' : '新建事项';
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
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `${action.description} · ${statusLabel(action.status)}`;
      button.onclick = async () => { if (await this.flush()) { $('#initiative-editor').hidden = true; await this.actions.edit(action); } };
      (unfinished(action) ? $('#initiative-actions') : $('#initiative-retired')).append(button);
      if (unfinished(action)) {
        const label = document.createElement('label'); label.textContent = `结束时处理：${action.description}`;
        const select = document.createElement('select'); select.dataset.action = action.entityId;
        select.add(new Option('请选择处理方式…', '')); select.add(new Option('完成', 'completed')); select.add(new Option('取消', 'canceled')); select.add(new Option('保留为独立行动', 'independent'));
        for (const target of initiatives.filter(i => i.entityId !== record.entityId && i.status !== 'ended')) select.add(new Option(`移至 ${target.title}`, `move:${target.entityId}`));
        label.append(select); $('#initiative-decisions').append(label);
      }
    }
    for (const row of document.querySelectorAll('.initiative-source')) {
      const source = record.sources.find(s => s.path === row.querySelector('input').value);
      if (!source) continue;
      try {
        const result = await sourceState(source, path => native('read', {path, workspaceId: this.repository.workspaceId}), this.listReferences);
        if (record !== this.previous) return;
        row.querySelector('.source-state').textContent = result.state === 'moved' ? `来源已移至 ${result.path}，请核对后保存。` : statusLabel(result.state);
        if (result.state === 'moved') { row.querySelector('input').value = result.path; this.changed(); }
        row.querySelector('.source-open').disabled = !result.path;
      } catch (error) { row.querySelector('.source-state').textContent = '来源暂不可用，请检查目录后重试。'; }
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
        this.recoveredDraft = false; this.recoveredDraft = false; this.dirty = false; this.retry = null; localStorage.removeItem(this.key()); this.form(result.record, result.record);
        $('#initiative-save-state').textContent = result.recovered ? '已恢复并保存到本地' : '已保存到本地'; await this.list(); await this.details(); return true;
      } catch (error) {
        const initiativeCommitted = error.revisionSaved && error.record?.entityType === 'initiative';
        this.retry = initiativeCommitted ? error.record : null; if (initiativeCommitted) this.previous = error.record;
        this.dirty = true; this.draft(); errorFeedback($('#initiative-save-state'), error.message); return false;
      } finally { this.saving = null; $('#initiative-form').inert = false; }
    })(); return this.saving;
  }
  flush() { return this.saving || (this.dirty ? this.save() : Promise.resolve(true)); }
}
