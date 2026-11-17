import {button as makeButton, errorFeedback, feedback} from './presentation.js';
import {native} from './bridge.js';
import {CandidateRepository, Organization, CandidateReview, SYSTEM_PROMPT} from './organization.js';
import {allRecords} from './initiatives.js';
const $ = selector => document.querySelector(selector);
export class OrganizeScreen {
  constructor(openNote) {
    this.openNote = openNote; this.repository = new CandidateRepository(native); this.organization = new Organization(native, this.repository); this.offset = 0; this.review = new CandidateReview(native, this.repository); this.drafts = new Map(); this.selected = new Set();
    $('#ai-settings').onsubmit = event => { event.preventDefault(); this.attempt(async () => { await native('aiConfigure', {address: $('#ai-address').value, model: $('#ai-model').value, token: $('#ai-token').value}); $('#ai-token').value = ''; await this.settings(); this.controls(); this.status('设置已保存在此设备。'); }); };
    $('#ai-preview').onclick = () => this.attempt(async () => {
      if (this.organization.running) throw Error('请先取消正在进行的分析');
      const paths = [...this.selected];
      const batches = await this.organization.preview(paths);
      $('#ai-input').textContent = '系统消息：\n' + SYSTEM_PROMPT + '\n\n用户消息（每个片段一次请求）：\n' + batches.map(batch => JSON.stringify(batch)).join('\n\n');
      $('#ai-readable').replaceChildren();
      for (const batch of batches) {
        const article = document.createElement('article'), title = document.createElement('h3'), text = document.createElement('pre');
        title.textContent = `${batch.path} · ${batch.start}–${batch.end} / ${batch.total}`; text.textContent = batch.text;
        article.append(title, text); $('#ai-readable').append(article);
      }
      this.controls(); this.status(batches.length ? `预览已就绪：${paths.length} 篇笔记，${batches.length} 个片段。请核对后发送。` : '所选笔记没有可发送的正文，请重新选择。');
    });
    $('#ai-send').onclick = () => this.attempt(async () => {
      const operation = this.organization.run(text => this.status(text)); this.controls();
      try { await operation; } finally { this.controls(); await this.candidates(); }
    });
    $('#ai-cancel').onclick = () => this.attempt(async () => { await this.organization.cancel(); this.controls(); this.status(`已取消。已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段，已保存的建议仍保留。`); });
    $('#ai-directory').onchange = () => { this.selectionOffset = 0; this.inventory(); };
    $('#ai-notes-next').onclick = () => { this.selectionOffset += 50; this.inventory(); };
    $('#ai-notes-previous').onclick = () => { this.selectionOffset = Math.max(0, this.selectionOffset - 50); this.inventory(); };
    $('#ai-results-next').onclick = () => { this.offset += 50; this.candidates(); };
    $('#ai-results-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.candidates(); };
  }
  status(text) {
    const analyzing = text.match(/^Analyzing fragment (\d+)\/(\d+); completed (\d+)/);
    const complete = text.match(/^Complete: (\d+)\/(\d+)/);
    $('#ai-status').textContent = analyzing ? `正在分析 ${analyzing[1]} / ${analyzing[2]} 个片段，已完成 ${analyzing[3]} 个。` : complete ? `已完成 ${complete[1]} / ${complete[2]} 个片段。建议仍需核对当前适用性。` : text;
  }
  controls() {
    const running = this.organization.running, batches = this.organization.batches;
    $('#ai-preview').disabled = running;
    $('#ai-send').disabled = running || !this.configured || !batches?.length || this.organization.covered === batches.length;
    $('#ai-send').textContent = this.organization.covered && this.organization.covered < batches?.length ? '继续分析剩余内容' : '发送并分析';
    $('#ai-cancel').disabled = !running;
    $('#ai-selection').inert = running; $('#ai-directory').disabled = running;
    $('#ai-notes-next').disabled = running || !this.selectionHasMore;
    $('#ai-notes-previous').disabled = running || !this.selectionOffset;
    $('#ai-settings').inert = running;
  }
  invalidate() {
    this.organization.batches = null; this.organization.covered = 0;
    $('#ai-readable').replaceChildren(); $('#ai-input').textContent = '';
    $('#ai-selection-state').textContent = `已选择 ${this.selected.size} 篇笔记`;
    this.controls(); this.status('选择已更新，请重新预览后发送。');
  }
  async settings() {
    const settings = await native('aiSettings'); this.configured = Boolean(settings.configured && settings.address && settings.model);
    $('#ai-address').value = settings.address; $('#ai-model').value = settings.model;
    $('#ai-token').placeholder = settings.configured ? '已保存在此设备，留空则保留' : '输入服务凭证';
    $('#ai-service-state').textContent = this.configured ? '已配置' : '未配置，请先设置';
    $('#ai-configuration').open = !this.configured;
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
      feedback($('#ai-status'), message + (this.organization.covered ? ` 已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段。` : ''), diagnostic);
    } finally { this.controls(); }
  }
  async show(library) {
    $('#organize-tools').hidden = false; $('#view-title').textContent = '整理'; $('#items').replaceChildren(); $('#filters').hidden = true;
    await this.attempt(async () => {
      const previousWorkspace = this.repository.workspaceId;
      await this.repository.open(); await this.review.open();
      if (previousWorkspace !== this.repository.workspaceId) { this.drafts.clear(); this.selected.clear(); this.offset = 0; this.invalidate(); }
      this.status('正在载入已保存的建议…');
      try { await this.review.recover(); } catch (error) { errorFeedback($('#ai-status'), error.message); }
      await this.settings();
      this.library = library; await library.open(); await library.sync();
      this.selectionOffset = 0; $('#ai-directory').replaceChildren();
      for (const path of ['*', '', ...(library.directories || [])]) { const option = document.createElement('option'); option.value = path; option.textContent = path === '*' ? '全部目录（逐篇选择笔记）' : path || '/'; $('#ai-directory').append(option); }
      await this.inventory(); await this.candidates(); this.controls(); this.status(this.configured ? '请选择来源笔记，或继续核对已保存的建议。' : '请先配置 AI 服务；已有建议仍可核对。');
    });
    $('#index-state').textContent = '';
  }
  async inventory() {
    const result = await this.library.query({directory: $('#ai-directory').value, offset: this.selectionOffset, limit: 50});
    $('#ai-selection').replaceChildren();
    for (const note of result.notes) { const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.value = note.path; input.checked = this.selected.has(note.path); input.onchange = () => { input.checked ? this.selected.add(note.path) : this.selected.delete(note.path); this.invalidate(); }; label.append(input, document.createTextNode(note.path)); $('#ai-selection').append(label); }
    this.selectionHasMore = result.hasMore; this.controls(); if (!result.notes.length) $('#ai-selection').textContent = '此目录没有可选择的笔记。';
  }
  async candidates() {
    if (this.reviewing) return;
    const destinations = await allRecords(this.review.targets.initiative);
    const page = await this.repository.query({offset: this.offset, limit: 50}); $('#ai-results').replaceChildren();
    for (const record of page.actions) {
      const card = document.createElement('article'); card.className = 'card suggestion-card';
      for (const text of [`${{initiative:'事项', action:'行动', topic:'主题', relationship:'关联', progress:'进展'}[record.candidateType] || '建议'}：${record.description}`, `建议归属：${record.placement}`, `理由：${record.reasoning}`, `当前适用性：${record.relevance}`]) { const p = document.createElement(text.startsWith('建议归属') || text.startsWith('理由') || text.startsWith('当前适用性') ? 'p' : 'h3'); p.textContent = text; card.append(p); }
      for (const source of record.sources) { const quote = document.createElement('blockquote'); quote.textContent = source.quote; const button = makeButton(`${source.path} [${source.start}–${source.end}]`, () => this.openNote(source.path)); card.append(quote, button); }
      const state = document.createElement('p');
      state.textContent = record.syncState ? '存在同步冲突，请打开「同步检查」。' : record.review ? `处理决定：${{confirm:'确认',ignore:'忽略',later:'留待以后',reference:'作为参考',attach:'关联事项'}[record.review.decision] || '待核对'}，${record.review.state === 'done' ? '已保存' : '待恢复'}` : '等待你确认';
      card.append(state);
      if (record.review?.suggestion && record.review.suggestion !== record.description) { const approved = document.createElement('p'); approved.textContent = `保存的建议：${record.review.suggestion}`; card.append(approved); }
      if (!record.syncState && (!record.review || (record.review.decision === 'later' && !record.review.target && record.review.state === 'done'))) {
        const editDetails = document.createElement('details'), editSummary = document.createElement('summary'), draftState = document.createElement('p'); editSummary.textContent = '确认前编辑建议'; editDetails.append(editSummary); card.append(editDetails);
        const edit = document.createElement('textarea'); edit.setAttribute('aria-label', '编辑建议'); edit.value = this.drafts.get(record.entityId) ?? record.review?.suggestion ?? record.description;
        edit.oninput = () => { this.drafts.set(record.entityId, edit.value); draftState.textContent = '编辑尚未保存，选择处理方式后保存。'; }; editDetails.append(edit, draftState); if (this.drafts.has(record.entityId)) { editDetails.open = true; draftState.textContent = '编辑尚未保存，选择处理方式后保存。'; }
        const target = document.createElement('select'); target.setAttribute('aria-label', '已有事项');
        target.append(Object.assign(document.createElement('option'), {value: '', textContent: '选择要关联的已有事项'}));
        for (const initiative of destinations.filter(r => !r.syncState)) target.append(Object.assign(document.createElement('option'), {value: initiative.entityId, textContent: initiative.title}));
        const targetLabel = document.createElement('label'); targetLabel.textContent = '归入已有事项（关联、参考或进展建议时选择）'; targetLabel.append(target); card.append(targetLabel);
        const decisions = document.createElement('div'); decisions.className = 'organization-actions'; card.append(decisions);
        for (const [decision, label] of [['confirm', '确认此建议'], ['attach', '关联到事项'], ['reference', '作为参考资料'], ['later', '留待以后'], ['ignore', '忽略']]) {
          const button = document.createElement('button'); button.textContent = label; if (decision === 'confirm') button.className = 'primary';
          button.onclick = () => this.attempt(async () => {
            this.reviewing = true; const buttons = [...card.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
            try { await this.review.decide(record, decision, {description: edit.value, targetId: target.value}); this.drafts.delete(record.entityId); this.status('决定已保存到本地。每条建议都需要单独确认。'); }
            finally { this.reviewing = false; buttons.forEach(b => b.disabled = false); await this.candidates(); }
          }); decisions.append(button);
        }
      } else if (record.review?.state === 'pending' && !record.syncState) {
        const retry = document.createElement('button'); retry.textContent = '恢复已确认的决定'; retry.onclick = () => this.attempt(async () => { await this.review.recover(); await this.candidates(); }); card.append(retry);
      }
      const details = document.createElement('details'), summary = document.createElement('summary'), raw = document.createElement('pre');
      summary.textContent = '建议记录详情'; raw.textContent = JSON.stringify({entityId: record.entityId, revision: record.revision, review: record.review || null}, null, 2); details.append(summary, raw); card.append(details);
      $('#ai-results').append(card);
    }
    if (!page.actions.length) $('#ai-results').textContent = '还没有保存的建议。选择笔记并分析后，在这里逐条核对。';
    $('#ai-results-previous').disabled = this.offset === 0; $('#ai-results-next').disabled = !page.hasMore;
  }
}
