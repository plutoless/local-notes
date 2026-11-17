import {actionLabels, statusLabel, errorFeedback, progressLabel, directoryLabel, button, field, disclosure, selectionRow, feedback} from './presentation.js';
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
    // Adopt the catalogue's form and control vocabulary without moving persistence here.
    for (const label of document.querySelectorAll('#action-form label, #action-tools label')) {
      const control = label.querySelector('input, textarea, select');
      if (control) label.replaceWith(field(label.firstChild.textContent.trim(), control));
    }
    for (const control of document.querySelectorAll('#action-editor button, #action-tools button')) {
      control.classList.add('ui-action', control.id === 'action-save' || control.id === 'action-new' ? 'primary' : 'quiet');
    }
    for (const details of document.querySelectorAll('#action-editor details')) details.classList.add('ui-disclosure');
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
    $('#action-back').onclick = async () => {
      if (!await this.flush()) return;
      try {
        if ($('.app').classList.contains('workspace')) {
          await this.initiatives.edit(this.initiatives.previous);
          this.initiatives.restoreContext();
        } else {
          $('.app').classList.remove('editing');
          const row = [...document.querySelectorAll('#items [data-entity-id]')].find(node => node.dataset.entityId === this.previous?.entityId);
          (row || $('#action-new')).focus({preventScroll: true});
        }
      } catch (error) {
        // Initiative rendering can fail after hiding the originating action.
        this.showForm(this.fields(), this.previous);
        this.initiatives.detailKind = 'action';
        $('#initiative-editor').hidden = true; $('.app').classList.add('detail-open');
        errorFeedback($('#action-save-state'), error.message); $('#action-back').focus();
      }
    };
    $('#action-discard').onclick = () => { localStorage.removeItem(this.key()); this.recoveredDraft = false; this.dirty = false; this.retry = null; this.previous = null; $('#action-editor').hidden = true; $('#empty').hidden = false; $('.app').classList.remove('editing'); };
    $('#action-form').oninput = () => { $('#action-open-initiative').disabled = !$('#action-initiative').value; this.changed(); };
    $('#action-form').onsubmit = event => { event.preventDefault(); this.save(); };
    $('#action-add-source').onclick = () => { $('#action-source-options').open = true; this.addSource({path: '', quote: '', fingerprint: ''}); this.changed(); };
    $('#action-history').onclick = async () => {
      try {
        if (!this.previous) return;
        const repository = this.repository, entityId = this.previous.entityId;
        $('#action-revisions').textContent = '正在载入历史…';
        const records = await repository.history(entityId);
        if (repository !== this.repository || entityId !== this.previous?.entityId) return;
        const history = $('#action-revisions'); history.replaceChildren();
        const ordered = records.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
        for (const [index, record] of ordered.entries()) {
          const item = document.createElement('article'); item.className = 'action-revision';
          const older = ordered[index + 1];
          const changes = older ? ['description', 'status', 'initiativeId', 'dueDate', 'waitingOn', 'sources', 'focusPosition'].filter(key => JSON.stringify(record[key]) !== JSON.stringify(older[key])).map(key => ({description:'描述', status:'状态', initiativeId:'所属事项', dueDate:'截止日期', waitingOn:'等待条件', sources:'来源引用', focusPosition:'当前重点'})[key]) : ['创建行动'];
          item.innerHTML = `<h3>${esc(labels[record.status])} · ${esc(new Date(record.modifiedAt).toLocaleString('zh-CN', {hour12: false}))}</h3><p>${esc(record.description)}</p><small>${esc(changes.join('、') || '保存记录')}</small><details class="ui-disclosure"><summary>完整版本与记录详情</summary><pre>${esc(JSON.stringify(record, null, 2))}</pre></details>`;
          history.append(item);
        }
        if (!ordered.length) history.textContent = '暂无可用历史。';
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
    directoryLabel(workspace.root);
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
    await this.assignments();
    await this.list(); $('#index-state').textContent = '';
  }
  async list() {
    if (!this.active) return;
    const scroll = $('#items').scrollTop;
    const repository = this.repository;
    const request = this.listRequest = (this.listRequest || 0) + 1;
    $('#index-state').textContent = '正在载入行动…';
    let page;
    try { page = await repository.query({status: this.status, initiativeId: this.initiativeFilter || '', search: this.search, limit: 30, offset: this.offset}); }
    catch (error) { if (this.active && request === this.listRequest && repository === this.repository) { $('#index-state').textContent = ''; errorFeedback($('#items'), error.message); } return; }
    if (!this.active || request !== this.listRequest || repository !== this.repository) return;
    $('#index-state').textContent = ''; $('#items').replaceChildren();
    for (const action of page.actions) {
      const row = selectionRow('', () => this.edit(action), {selected: action.entityId === this.previous?.entityId}); row.classList.add('card'); row.dataset.entityId = action.entityId; row.classList.toggle('selected', action.entityId === this.previous?.entityId); row.setAttribute('aria-current', action.entityId === this.previous?.entityId ? 'true' : 'false');
      row.innerHTML = `<h3>${esc(action.description)}</h3><p>${labels[action.status]}${action.dueDate ? ` · ${esc(action.dueDate)}${isOverdue(action) ? ' · 已逾期' : ''}` : ' · 未设日期'}</p><small>${esc(this.initiativeNames?.get(action.initiativeId) || (action.initiativeId ? '关联事项不可用' : '独立行动'))}${action.waitingOn ? ` · 等待：${esc(action.waitingOn)}` : ''}</small>`;
      $('#items').append(row);
    }
    if (!page.actions.length) $('#items').innerHTML = `<div class="no-items">${this.search || this.status || this.initiativeFilter ? '没有符合条件的行动。请调整搜索词或筛选条件。' : this.offset ? '本页没有行动，请返回上一页。' : '还没有已确认行动。<br>决定要做什么后，点击「新建行动」。'}</div>`;
    $('#items').scrollTop = scroll;
    $('#action-next').disabled = !page.hasMore; $('#action-previous').disabled = this.offset === 0;
    $('#action-page').textContent = `第 ${this.offset / 30 + 1} 页`;
  }
  async assignments(selected = $('#action-initiative').value || '') {
    if (!this.initiatives?.repository.ready) return;
    const records = await allRecords(this.initiatives.repository);
    this.initiativeNames = new Map(records.map(record => [record.entityId, record.title]));
    const select = $('#action-initiative'); select.replaceChildren(new Option('独立行动', ''));
    for (const record of records.filter(i => i.status !== 'ended' || i.entityId === selected)) select.add(new Option(record.title, record.entityId));
    if (selected && !records.some(i => i.entityId === selected)) select.add(new Option('事项不可用，请重新选择', selected));
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
  state(message) {
    feedback($('#action-save-state'), message);
    $('#action-save-state').dataset.state = message === '正在保存…' ? 'saving' : this.recoveredDraft ? 'recovered' : this.dirty ? 'dirty' : 'saved';
  }
  changed() {
    this.recoveredDraft = false; this.dirty = true; this.retry = null;
    $('#action-description').setAttribute('aria-invalid', 'false');
    $('#action-focus').disabled = true;
    localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry}));
    this.state('行动草稿尚未保存');
  }
  addSource(source) {
    const row = document.createElement('div'); row.className = 'action-source'; row.dataset.fingerprint = source.fingerprint;
    const heading = document.createElement('h3'); heading.textContent = source.path?.split('/').pop() || '新来源';
    const path = document.createElement('small'); path.textContent = source.path || '填写笔记路径并引用原文';
    const quote = document.createElement('blockquote'); quote.textContent = source.quote || '未添加原文引用';
    const pathInput = document.createElement('input'); pathInput.className = 'source-path'; pathInput.value = source.path;
    const quoteInput = document.createElement('textarea'); quoteInput.className = 'source-quote'; quoteInput.rows = 2; quoteInput.value = source.quote;
    pathInput.oninput = quoteInput.oninput = () => { row.dataset.fingerprint = ''; };
    const remove = button('移除引用', () => { row.remove(); this.changed(); $('#action-add-source').focus(); }, {variant: 'danger', label: `移除引用：${source.path || '新来源'}`});
    const options = disclosure('编辑来源引用', [field('笔记相对路径', pathInput), field('引用原文', quoteInput), remove]);
    options.open = !source.path;
    row.append(heading, path, quote, options); $('#action-sources').append(row);
  }
  showForm(fields, previous) {
    this.previous = previous; this.retry = null;
    for (const row of document.querySelectorAll('#items .card[data-entity-id]')) { const selected = row.dataset.entityId === previous?.entityId; row.classList.toggle('selected', selected); row.setAttribute('aria-current', String(selected)); }
    $('#action-open-initiative').disabled = !fields.initiativeId;
    $('#action-options').open = !!(fields.initiativeId || fields.dueDate || fields.waitingOn);
    $('#action-source-options').open = !!fields.sources?.length;
    $('#action-focus').disabled = !previous || !['todo', 'in-progress'].includes(fields.status);
    $('#action-focus').textContent = previous?.focusPosition == null ? '加入当前重点' : '移出当前重点';
    $('#action-description').value = fields.description || ''; $('#action-status').value = fields.status || 'todo';
    if (fields.initiativeId && ![...$('#action-initiative').options].some(o => o.value === fields.initiativeId)) $('#action-initiative').add(new Option(fields.initiativeId, fields.initiativeId));
    $('#action-initiative').value = fields.initiativeId || ''; $('#action-due').value = fields.dueDate || ''; $('#action-waiting').value = fields.waitingOn || '';
    $('#action-sources').replaceChildren(); for (const source of fields.sources || []) this.addSource(source);
    $('#action-revisions').replaceChildren(); $('#action-id').textContent = previous?.entityId || '新建行动'; $('#action-history').disabled = !previous;
    $('#empty').hidden = true; $('#editor').hidden = true; $('#action-editor').hidden = false; $('.app').classList.add('editing');
    // Source availability is advisory and must survive every form reconstruction.
    this.refreshSources(fields).catch(error => this.notice(error.message));
  }
  async edit(action) {
    if (action && action.workspaceId !== this.repository.workspaceId) { this.notice('笔记目录已切换，请重新打开行动。'); return; }
    if (!await this.flush()) return;
    // A flush may commit a relocated source before the selected list row refreshes.
    if (action && action.entityId === this.previous?.entityId) action = this.previous;
    this.showForm(action || {}, action);
    await this.assignments(action?.initiativeId || '');
    if (!this.dirty) this.state(action ? '已保存到本地' : '写下你已决定执行的下一步。');
    if (!action) this.changed();
    $('#action-description').focus();
  }
  async refreshSources(action) {
    this.editRequest = (this.editRequest || 0) + 1; const request = this.editRequest, repository = this.repository;
    for (const row of document.querySelectorAll('.action-source')) {
      const source = action?.sources.find(s => s.path === row.querySelector('.source-path').value);
      if (!source?.path || !source.fingerprint) continue;
      const result = await sourceState(source, path => native('read', {path, workspaceId: this.repository.workspaceId}), this.initiatives.listReferences);
      if (request !== this.editRequest || repository !== this.repository || !row.isConnected) return;
      const status = document.createElement('p'); status.textContent = statusLabel(result.state); row.append(status);
      if (result.state === 'moved') { row.querySelector('.source-path').value = result.path; row.querySelector('h3').textContent = result.path.split('/').pop(); row.querySelector('small').textContent = result.path; this.changed(); }
      if (result.path && this.initiatives) { const open = button('打开来源', async () => { if (await this.flush()) await this.initiatives.openNote(result.path); }, {label: `打开来源：${result.path}`}); row.append(open); }
    }
  }
  async save() {
    if (this.saving) return this.saving;
    if (!this.dirty) return true;
    const focused = document.activeElement;
    this.saving = (async () => {
      this.state('正在保存…'); $('#action-save').disabled = true; $('#action-form').inert = true;
      try {
        const fields = this.fields();
        if (!fields.description.trim()) { $('#action-description').setAttribute('aria-invalid', 'true'); throw Error('请填写行动描述。'); }
        if (fields.initiativeId && fields.initiativeId !== this.previous?.initiativeId) {
          const target = (await allRecords(this.initiatives.repository)).find(i => i.entityId === fields.initiativeId && i.status !== 'ended');
          if (!target) throw Error('请选择进行中或以后再做的事项。');
        }
        for (const source of fields.sources) if (!source.fingerprint) {
          const result = await native('read', {path: source.path, workspaceId: this.repository.workspaceId}); source.fingerprint = fingerprint(result.text);
          if (source.quote && !result.text.includes(source.quote)) throw Error(`未在来源中找到引用原文，请核对：${source.path}`);
        }
        const result = await this.repository.save(fields, this.previous, this.retry);
        this.previous = result.record; this.retry = null; this.recoveredDraft = false; this.dirty = false; localStorage.removeItem(this.key());
        this.showForm(result.record, result.record);
        this.state(result.recovered ? '已恢复并保存到本地' : '已保存到本地');
        $('#action-save-state').dataset.state = 'saved';
        await this.list();
        if ($('.app').classList.contains('workspace')) await this.initiatives.details();
        return true;
      } catch (error) {
        this.retry = error.revisionSaved ? error.record : null;
        if (error.revisionSaved) this.previous = error.record;
        this.dirty = true;
        localStorage.setItem(this.key(), JSON.stringify({fields: this.fields(), previous: this.previous, retry: this.retry}));
        errorFeedback($('#action-save-state'), error.message); return false;
      } finally { this.saving = null; $('#action-save').disabled = false; $('#action-form').inert = false; if (focused?.isConnected) focused.focus({preventScroll: true}); }
    })();
    return this.saving;
  }
  flush() { return this.saving || (this.dirty ? this.save() : Promise.resolve(true)); }
}
