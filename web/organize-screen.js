import {button as makeButton, errorFeedback, feedback, field, disclosure, drawer, requestTaskLeave} from './presentation.js';
import {native} from './bridge.js';
import {CandidateRepository, Organization, CandidateReview, SYSTEM_PROMPT} from './organization.js';
import {allRecords} from './initiatives.js';
const $ = selector => document.querySelector(selector);
export class OrganizeScreen {
  constructor(openNote) {
    this.openNote = openNote; this.repository = new CandidateRepository(native); this.organization = new Organization(native, this.repository); this.offset = 0; this.review = new CandidateReview(native, this.repository); this.drafts = new Map(); this.selected = new Set();
    this.selectionOffset = 0; this.inventoryRequest = 0;
    this.settingsDrawer = drawer({id: 'ai-settings-drawer', title: 'AI 服务设置', onDismiss: () => this.leaveSettings()});
    this.settingsDrawer.body.append($('#ai-settings'));
    for (const label of $('#ai-settings').querySelectorAll('label')) label.classList.add('ui-field');
    $('#ai-settings').querySelector('button').remove();
    this.settingsSave = makeButton('保存设备设置', () => this.attempt(() => this.saveSettings()), {variant: 'primary'});
    this.settingsDrawer.footer.append(makeButton('取消设置', () => this.leaveSettings()), this.settingsSave);
    $('#ai-configure').onclick = () => this.attempt(async () => { await this.settings(); this.settingsDrawer.open($('#ai-address'), $('#ai-configure')); });
    $('#ai-search').oninput = () => { this.selectionOffset = 0; this.attempt(() => this.inventory()); };
    $('#ai-notes-retry').onclick = () => this.attempt(() => this.inventory());
    for (const node of document.querySelectorAll('#organize-tools button')) node.classList.add('ui-action', node.classList.contains('primary') ? 'primary' : 'secondary');
    for (const node of document.querySelectorAll('#organize-tools details')) node.classList.add('ui-disclosure');
    for (const node of document.querySelectorAll('#organize-tools label')) node.classList.add('ui-field');
    $('#ai-settings').onsubmit = event => { event.preventDefault(); this.attempt(() => this.saveSettings()); };
    $('#ai-preview').onclick = () => this.attempt(async () => {
      if (this.organization.running || this.previewing) throw Error('请先等待当前操作完成');
      this.previewing = true; this.controls(); this.status('正在读取所选内容…');
      try {
      const paths = [...this.selected];
      const batches = await this.organization.preview(paths);
      $('#ai-input').textContent = `服务地址：${$('#ai-address').value}\n模型：${$('#ai-model').value}\nstream: false\n\n` + '系统消息：\n' + SYSTEM_PROMPT + '\n\n用户消息（每个片段一次请求）：\n' + batches.map(batch => JSON.stringify(batch)).join('\n\n');
      $('#ai-readable').replaceChildren();
      for (const batch of batches) {
        const article = document.createElement('article'), title = document.createElement('h3'), text = document.createElement('pre');
        title.textContent = `${batch.path} · ${batch.start}–${batch.end} / ${batch.total}`; text.textContent = batch.text;
        article.append(title, text); $('#ai-readable').append(article);
      }
      this.controls(); this.status(batches.length ? `预览已就绪：${paths.length} 篇笔记，${batches.length} 个片段。请核对后发送。` : '所选笔记没有可发送的正文，请重新选择。');
      } finally { this.previewing = false; this.controls(); }
    });
    $('#ai-send').onclick = () => this.attempt(async () => {
      const operation = this.organization.run(text => this.status(text)); this.controls();
      try { await operation; } finally { this.controls(); await this.candidates(); }
    });
    $('#ai-cancel').onclick = () => this.attempt(async () => { await this.organization.cancel(); this.controls(); this.status(`已取消。已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段，已保存的建议仍保留。`); });
    $('#ai-directory').onchange = () => { this.selectionOffset = 0; this.attempt(() => this.inventory()); };
    $('#ai-notes-next').onclick = () => { this.selectionOffset += 50; this.attempt(() => this.inventory()); };
    $('#ai-notes-previous').onclick = () => { this.selectionOffset = Math.max(0, this.selectionOffset - 50); this.attempt(() => this.inventory()); };
    $('#ai-results-next').onclick = () => { this.offset += 50; this.candidates(); };
    $('#ai-results-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.candidates(); };
  }
  status(text) {
    const analyzing = text.match(/^Analyzing fragment (\d+)\/(\d+); completed (\d+)/);
    const complete = text.match(/^Complete: (\d+)\/(\d+)/);
    $('#ai-progress').value = this.organization.covered || 0;
    $('#ai-status').classList.add('ui-feedback');
    $('#ai-status').dataset.state = analyzing ? 'loading' : complete ? 'saved' : 'idle';
    $('#ai-status').textContent = analyzing ? `正在分析 ${analyzing[1]} / ${analyzing[2]} 个片段，已完成 ${analyzing[3]} 个。` : complete ? `已完成 ${complete[1]} / ${complete[2]} 个片段。建议仍需核对当前适用性。` : text;
  }
  controls() {
    const running = this.organization.running || this.previewing, batches = this.organization.batches;
    const ready = Boolean(batches?.length);
    $('#ai-preview').classList.toggle('primary', !ready);
    $('#ai-preview').classList.toggle('secondary', ready);
    $('#ai-send').classList.toggle('primary', ready);
    $('#ai-send').classList.toggle('secondary', !ready);
    $('#ai-preview').disabled = running || !this.selected.size;
    $('#ai-send').disabled = running || !this.configured || !batches?.length || this.organization.covered === batches.length;
    $('#ai-send').textContent = this.organization.covered && this.organization.covered < batches?.length ? '继续分析剩余内容' : '发送并分析';
    $('#ai-cancel').disabled = !this.organization.running;
    $('#ai-progress').hidden = !this.organization.running;
    $('#ai-progress').max = batches?.length || 1; $('#ai-progress').value = this.organization.covered || 0;
    $('#ai-selection').inert = running; $('#ai-directory').disabled = running; $('#ai-search').disabled = running; $('#ai-configure').disabled = running;
    $('#ai-notes-next').disabled = running || !this.selectionHasMore;
    $('#ai-notes-previous').disabled = running || !this.selectionOffset;
    $('#ai-settings').inert = running;
  }
  invalidate() {
    this.organization.batches = null; this.organization.covered = 0;
    $('#ai-readable').replaceChildren(); $('#ai-input').textContent = '';
    $('#ai-selection-state').textContent = `已选择 ${this.selected.size} / 20 篇笔记（跨搜索、目录和分页保留）`;
    this.controls(); this.status('选择已更新，请重新预览后发送。');
  }
  async settings(force = false) {
    if (this.settingsDrawer.panel.open && !force) return;
    const settings = await native('aiSettings'); this.configured = Boolean(settings.configured && settings.address && settings.model);
    $('#ai-address').value = settings.address; $('#ai-model').value = settings.model;
    $('#ai-token').placeholder = settings.configured ? '已保存在此设备，留空则保留' : '输入服务凭证';
    $('#ai-service-state').textContent = this.configured ? '服务已配置。核对预览后可主动发送。' : '尚未配置服务。可先选择并预览；发送前请设置 AI 服务。';
    this.savedSettings = {address: settings.address, model: settings.model};
  }
  settingsTask() {
    return {label: 'AI 服务设置', dirty: () => Boolean($('#ai-token').value || $('#ai-address').value !== (this.savedSettings?.address || '') || $('#ai-model').value !== (this.savedSettings?.model || '')),
      pending: () => this.settingsPending?.catch(() => {}),
      save: async () => { await this.saveSettings(); return true; },
      discard: () => { $('#ai-token').value = ''; $('#ai-address').value = this.savedSettings?.address || ''; $('#ai-model').value = this.savedSettings?.model || ''; },
      close: () => this.closeSettings()};
  }
  leaveSettings() { return requestTaskLeave(this.settingsTask()); }
  saveSettings() {
    if (this.settingsPending) return this.settingsPending;
    this.settingsSave.disabled = true; $('#ai-settings').inert = true;
    const operation = (async () => {
      await native('aiConfigure', {address: $('#ai-address').value, model: $('#ai-model').value, token: $('#ai-token').value});
      $('#ai-token').value = ''; await this.settings(true); this.closeSettings(); this.invalidate();
      this.status('设置已保存在此设备。请重新预览请求后主动发送。');
    })().finally(() => { this.settingsPending = null; this.settingsSave.disabled = false; $('#ai-settings').inert = false; });
    this.settingsPending = operation; return operation;
  }
  closeSettings() {
    $('#ai-token').value = '';
    $('#ai-address').value = this.savedSettings?.address || '';
    $('#ai-model').value = this.savedSettings?.model || '';
    this.settingsDrawer.hide();
  }
  resetSelection() {
    this.inventoryRequest++; this.organization.generation++; this.selected.clear(); this.selectionOffset = 0;
    $('#ai-search').value = ''; $('#ai-directory').value = '*'; this.drafts.clear(); this.offset = 0; this.invalidate();
  }
  async attempt(operation) {
    try { await operation(); } catch (error) {
      const diagnostic = error.message;
      let message = '操作未完成。请重试，已保存的建议和未保存的编辑仍保留。';
      if (/canceled|cancelled/i.test(diagnostic)) message = '已取消分析，已保存的建议仍保留。';
      else if (/configuration|HTTPS|endpoint|model/i.test(diagnostic)) message = '服务尚不可用，请检查 AI 服务地址、模型和凭证后重试。';
      else if (/offline|connection|network/i.test(diagnostic)) message = '连接失败。请检查网络和服务设置后重试，已保存的建议仍可核对。';
      else if (/timeout|rate limit|service failed/i.test(diagnostic)) message = '服务暂时未完成分析，请稍后重试。已保存的建议仍保留。';
      else if (/invalid response/i.test(diagnostic)) message = '返回的建议无法核验，请重试分析。已保存的建议仍保留。';
      else if (/Select 1|Preview nonempty/i.test(diagnostic)) message = '请选择 1–20 篇有正文的笔记，并先预览发送内容。';
      else if (/source.*changed|evidence|source unavailable/i.test(diagnostic)) message = '来源已变化或无法核验。请打开来源核对，再重新分析；本次未新增确认。';
      else if (/Choose an existing initiative/i.test(diagnostic)) message = '请先选择一个已有事项，再保存这个决定。';
      else if (/suggestion needs text/i.test(diagnostic)) message = '建议内容不能为空，请填写后再确认。';
      else if (/conflict|changed|workspace/i.test(diagnostic)) { errorFeedback($('#ai-status'), diagnostic); return; }
      if (this.settingsDrawer.panel.open) feedback($('#ai-settings-error'), message, diagnostic);
      feedback($('#ai-status'), message + (this.organization.covered ? ` 已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段。` : ''), diagnostic);
    } finally { this.controls(); }
  }
  async show(library) {
    $('#organize-tools').hidden = false; $('#view-title').textContent = '整理'; $('#items').replaceChildren(); $('#filters').hidden = true;
    await this.attempt(async () => {
      const previousWorkspace = this.repository.workspaceId;
      await this.repository.open(); await this.review.open();
      if (previousWorkspace !== this.repository.workspaceId) { this.resetSelection(); }
      this.status('正在载入已保存的建议…');
      let recoveryError;
      try { await this.review.recover(); } catch (error) { recoveryError = error; }
      try { await this.settings(); } catch { this.configured = false; $('#ai-service-state').textContent = '服务状态暂不可用。可继续选择来源或核对已保存的建议，设置时重试。'; }
      this.library = library; await library.open(); await library.sync();
      const directory = $('#ai-directory').options.length ? $('#ai-directory').value : '*'; $('#ai-directory').replaceChildren();
      for (const path of ['*', '', ...(library.directories || [])]) { const option = document.createElement('option'); option.value = path; option.textContent = path === '*' ? '全部目录（逐篇选择笔记）' : path || '/'; $('#ai-directory').append(option); }
      if ([...$('#ai-directory').options].some(option => option.value === directory)) $('#ai-directory').value = directory;
      await this.inventory(); await this.candidates(); this.controls(); if (recoveryError) throw recoveryError; this.status(this.configured ? '请选择来源笔记，或继续核对已保存的建议。' : '可先选择来源并预览；发送前请设置 AI 服务，已有建议仍可核对。');
    });
    $('#index-state').textContent = '';
  }
  async inventory() {
    const request = ++this.inventoryRequest, workspace = this.library.workspaceId;
    const current = () => request === this.inventoryRequest && workspace === this.library.workspaceId;
    $('#ai-inventory-state').textContent = '正在查找本机索引…'; $('#ai-notes-retry').hidden = true;
    try {
      const result = await this.library.query({search: $('#ai-search').value.slice(0, 200), directory: $('#ai-directory').value, offset: this.selectionOffset, limit: 50});
      if (!current()) return;
      $('#ai-selection').replaceChildren();
      for (const note of result.notes) {
        const label = document.createElement('label'), input = document.createElement('input'), context = document.createElement('span'), title = document.createElement('strong'), path = document.createElement('small');
        input.type = 'checkbox'; input.value = note.path; input.checked = this.selected.has(note.path);
        input.onchange = () => {
          if (input.checked && this.selected.size >= 20) { input.checked = false; this.status('每次最多选择 20 篇笔记。请先取消部分选择。'); return; }
          input.checked ? this.selected.add(note.path) : this.selected.delete(note.path); this.invalidate();
        };
        title.textContent = note.title || note.path; path.textContent = note.path;
        context.append(title, document.createElement('br'), path); label.className = 'ui-selection'; label.append(input, context); $('#ai-selection').append(label);
      }
      this.selectionHasMore = result.hasMore;
      $('#ai-selection-state').textContent = `已选择 ${this.selected.size} / 20 篇笔记（跨搜索、目录和分页保留）`;
      $('#ai-inventory-state').textContent = `本页 ${result.notes.length} 篇${result.hasMore ? '，还有下一页' : ''}。` + (this.library.running || this.library.warnings?.length ? '索引尚未完整，结果可能不全。' : '来自当前本机索引。');
      if (!result.notes.length) $('#ai-selection').textContent = '没有匹配的笔记。请更改搜索或目录。';
    } catch (error) {
      if (!current()) return;
      this.selectionHasMore = false; $('#ai-selection').replaceChildren();
      $('#ai-inventory-state').textContent = '查找未完成，已选笔记仍保留。'; $('#ai-notes-retry').hidden = false;
      throw error;
    } finally { if (current()) this.controls(); }
  }
  async candidates() {
    if (this.reviewing) return;
    const focused = document.activeElement.closest('[data-candidate]');
    const focusId = focused?.dataset.candidate, focusName = document.activeElement.getAttribute('aria-label');
    const scroll = $('#organize-tools').scrollTop;
    const destinations = await allRecords(this.review.targets.initiative);
    const page = await this.repository.query({offset: this.offset, limit: 50}); $('#ai-results').replaceChildren();
    for (const record of page.actions) {
      const card = document.createElement('article'); card.className = 'card suggestion-card'; card.dataset.candidate = record.entityId; card.tabIndex = -1; card.setAttribute('aria-label', `建议：${record.description}`);
      for (const text of [`${{initiative:'事项', action:'行动', topic:'主题', relationship:'关联', progress:'进展'}[record.candidateType] || '建议'}：${record.description}`, `建议归属：${record.placement}`, `理由：${record.reasoning}`, `当前适用性：${record.relevance}`]) { const p = document.createElement(text.startsWith('建议归属') || text.startsWith('理由') || text.startsWith('当前适用性') ? 'p' : 'h3'); p.textContent = text; card.append(p); }
      for (const source of record.sources) { const quote = document.createElement('blockquote'); quote.textContent = source.quote; const button = makeButton(`${source.path} [${source.start}–${source.end}]`, () => this.openNote(source.path), {label: `打开来源：${source.path}，建议：${record.description}`}); card.append(quote, button); }
      const state = document.createElement('p');
      state.textContent = record.syncState ? '存在同步冲突，请打开「同步检查」。' : record.review ? `处理决定：${{confirm:'确认',ignore:'忽略',later:'留待以后',reference:'作为参考',attach:'关联事项'}[record.review.decision] || '待核对'}，${record.review.state === 'done' ? '已保存' : '待恢复'}` : '等待你确认';
      state.className = 'ui-feedback'; state.setAttribute('role', 'status'); card.append(state);
      if (record.review?.suggestion && record.review.suggestion !== record.description) { const approved = document.createElement('p'); approved.textContent = `保存的建议：${record.review.suggestion}`; card.append(approved); }
      if (!record.syncState && (!record.review || (record.review.decision === 'later' && !record.review.target && record.review.state === 'done'))) {
        const editDetails = disclosure('确认前编辑建议'), draftState = document.createElement('p'); draftState.setAttribute('role', 'status'); card.append(editDetails);
        const edit = document.createElement('textarea'); edit.setAttribute('aria-label', '编辑建议'); edit.value = this.drafts.get(record.entityId) ?? record.review?.suggestion ?? record.description;
        edit.oninput = () => { edit.setAttribute('aria-invalid', String(!edit.value.trim())); this.drafts.set(record.entityId, edit.value); draftState.textContent = '编辑尚未保存，选择处理方式后保存。'; }; editDetails.append(field('编辑建议', edit, {invalid: !edit.value.trim()}), draftState); if (this.drafts.has(record.entityId)) { editDetails.open = true; draftState.textContent = '编辑尚未保存，选择处理方式后保存。'; }
        const target = document.createElement('select'); target.setAttribute('aria-label', '已有事项');
        target.append(Object.assign(document.createElement('option'), {value: '', textContent: '选择要关联的已有事项'}));
        for (const initiative of destinations.filter(r => !r.syncState)) target.append(Object.assign(document.createElement('option'), {value: initiative.entityId, textContent: initiative.title}));
        card.append(field('归入已有事项', target, {help: '关联、参考或进展建议时选择。'}));
        const decisions = document.createElement('div'); decisions.className = 'organization-actions'; card.append(decisions);
        for (const [decision, label] of [['confirm', '确认此建议'], ['attach', '关联到事项'], ['reference', '作为参考资料'], ['later', '留待以后'], ['ignore', '忽略']]) {
          const button = makeButton(label, () => this.attempt(async () => {
            this.reviewing = true; state.textContent = '正在保存决定…'; const buttons = [...card.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
            try { await this.review.decide(record, decision, {description: edit.value, targetId: target.value}); this.drafts.delete(record.entityId); this.status('决定已保存到本地。每条建议都需要单独确认。'); }
            finally { this.reviewing = false; buttons.forEach(b => b.disabled = false); await this.candidates(); }
          }), {variant: decision === 'confirm' ? 'primary' : 'quiet', label: `${label}：${record.description}`}); decisions.append(button);
        }
      } else if (record.review?.state === 'pending' && !record.syncState) {
        const retry = makeButton('恢复已确认的决定', () => this.attempt(async () => { await this.review.recover(); await this.candidates(); }), {variant: 'secondary'}); card.append(retry);
      }
      const raw = document.createElement('pre');
      raw.textContent = JSON.stringify({entityId: record.entityId, revision: record.revision, review: record.review || null}, null, 2); card.append(disclosure('建议记录详情', [raw]));
      $('#ai-results').append(card);
    }
    if (!page.actions.length) $('#ai-results').textContent = '还没有保存的建议。选择笔记并分析后，在这里逐条核对。';
    if (focusId) {
      const card = [...$('#ai-results').children].find(node => node.dataset.candidate === focusId);
      const control = [...(card?.querySelectorAll('[aria-label]') || [])].find(node => node.getAttribute('aria-label') === focusName);
      (control || card)?.focus({preventScroll: true}); $('#organize-tools').scrollTop = scroll;
    }
    $('#ai-results-previous').disabled = this.offset === 0; $('#ai-results-next').disabled = !page.hasMore;
  }
}
