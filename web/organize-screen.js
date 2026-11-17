import {errorFeedback, feedback} from './presentation.js';
import {native} from './bridge.js';
import {CandidateRepository, Organization, CandidateReview, SYSTEM_PROMPT} from './organization.js';
import {allRecords} from './initiatives.js';
const $ = selector => document.querySelector(selector);
export class OrganizeScreen {
  constructor(openNote) {
    this.openNote = openNote; this.repository = new CandidateRepository(native); this.organization = new Organization(native, this.repository); this.offset = 0; this.review = new CandidateReview(native, this.repository); this.drafts = new Map();
    $('#ai-settings').onsubmit = event => { event.preventDefault(); this.attempt(async () => { await native('aiConfigure', {address: $('#ai-address').value, model: $('#ai-model').value, token: $('#ai-token').value}); $('#ai-token').value = ''; this.status('设置已保存在此设备。'); }); };
    $('#ai-preview').onclick = () => this.attempt(async () => {
      if (this.organization.running) throw Error('请先取消正在进行的分析');
      const paths = [...$('#ai-selection').querySelectorAll('input:checked')].map(input => input.value);
      const batches = await this.organization.preview(paths);
      $('#ai-input').textContent = '系统消息：\n' + SYSTEM_PROMPT + '\n\n用户消息（每个片段一次请求）：\n' + batches.map(batch => JSON.stringify(batch)).join('\n\n');
      $('#ai-send').disabled = !batches.length; this.status(`预览已就绪：${paths.length} 篇笔记，${batches.length} 个完整片段。点击「开始分析 / 重试」才会发送。`);
    });
    $('#ai-send').onclick = () => this.attempt(async () => { $('#ai-preview').disabled = true; try { await this.organization.run(text => this.status(text)); } finally { $('#ai-preview').disabled = false; await this.candidates(); } });
    $('#ai-cancel').onclick = () => this.attempt(async () => { await this.organization.cancel(); this.status(`已取消。已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段，已保存的建议仍保留。`); });
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
  async attempt(operation) { try { await operation(); } catch (error) { errorFeedback($('#ai-status'), error.message); } }
  async show(library) {
    $('#organize-tools').hidden = false; $('#view-title').textContent = '整理'; $('#items').replaceChildren(); $('#filters').hidden = true;
    await this.attempt(async () => {
      await this.repository.open(); await this.review.open(); this.status('请逐条核对建议。保存到本地不代表其他设备已收到。');
      try { await this.review.recover(); } catch (error) { errorFeedback($('#ai-status'), error.message); }
      const settings = await native('aiSettings'); $('#ai-address').value = settings.address; $('#ai-model').value = settings.model; $('#ai-token').placeholder = settings.configured ? '已保存在此设备，留空则保留' : 'API key';
      this.library = library; await library.open(); await library.sync();
      this.selectionOffset = 0; $('#ai-directory').replaceChildren();
      for (const path of ['*', '', ...(library.directories || [])]) { const option = document.createElement('option'); option.value = path; option.textContent = path === '*' ? '全部目录（逐篇选择笔记）' : path || '/'; $('#ai-directory').append(option); }
      await this.inventory(); await this.candidates();
    });
  }
  async inventory() {
    const result = await this.library.query({directory: $('#ai-directory').value, offset: this.selectionOffset, limit: 50});
    $('#ai-selection').replaceChildren();
    for (const note of result.notes) { const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.value = note.path; label.append(input, document.createTextNode(note.path)); $('#ai-selection').append(label); }
    $('#ai-notes-previous').disabled = this.selectionOffset === 0; $('#ai-notes-next').disabled = !result.hasMore;
  }
  async candidates() {
    if (this.reviewing) return;
    const destinations = await allRecords(this.review.targets.initiative);
    const page = await this.repository.query({offset: this.offset, limit: 50}); $('#ai-results').replaceChildren();
    for (const record of page.actions) {
      const card = document.createElement('article'); card.className = 'card';
      for (const text of [`${{initiative:'事项', action:'行动', topic:'主题', relationship:'关联', progress:'进展'}[record.candidateType] || '建议'}：${record.description}`, `建议归属：${record.placement}`, `理由：${record.reasoning}`, `当前适用性：${record.relevance}`]) { const p = document.createElement('p'); p.textContent = text; card.append(p); }
      for (const source of record.sources) { const quote = document.createElement('blockquote'); quote.textContent = source.quote; const button = document.createElement('button'); button.textContent = `${source.path} [${source.start}–${source.end}]`; button.onclick = () => this.openNote(source.path); card.append(quote, button); }
      const state = document.createElement('p');
      state.textContent = record.syncState ? '存在同步冲突，请打开「同步检查」。' : record.review ? `处理决定：${{confirm:'确认',ignore:'忽略',later:'留待以后',reference:'作为参考',attach:'关联事项'}[record.review.decision] || '待核对'}，${record.review.state === 'done' ? '已保存' : '待恢复'}` : '等待你确认';
      card.append(state);
      if (!record.syncState && (!record.review || (record.review.decision === 'later' && !record.review.target && record.review.state === 'done'))) {
        const edit = document.createElement('textarea'); edit.setAttribute('aria-label', '编辑建议'); edit.value = this.drafts.get(record.entityId) ?? record.review?.suggestion ?? record.description;
        edit.oninput = () => this.drafts.set(record.entityId, edit.value); card.append(edit);
        const target = document.createElement('select'); target.setAttribute('aria-label', '已有事项');
        target.append(Object.assign(document.createElement('option'), {value: '', textContent: '选择要关联的已有事项'}));
        for (const initiative of destinations.filter(r => !r.syncState)) target.append(Object.assign(document.createElement('option'), {value: initiative.entityId, textContent: initiative.title}));
        card.append(target);
        for (const [decision, label] of [['confirm', '确认'], ['ignore', '忽略'], ['later', '留待以后'], ['reference', '作为参考资料'], ['attach', '关联到事项']]) {
          const button = document.createElement('button'); button.textContent = label;
          button.onclick = () => this.attempt(async () => {
            this.reviewing = true; const buttons = [...card.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
            try { await this.review.decide(record, decision, {description: edit.value, targetId: target.value}); this.drafts.delete(record.entityId); this.status('决定已保存到本地。每条建议都需要单独确认。'); }
            finally { this.reviewing = false; buttons.forEach(b => b.disabled = false); await this.candidates(); }
          }); card.append(button);
        }
      } else if (record.review?.state === 'pending' && !record.syncState) {
        const retry = document.createElement('button'); retry.textContent = '恢复已确认的决定'; retry.onclick = () => this.attempt(async () => { await this.review.recover(); await this.candidates(); }); card.append(retry);
      }
      $('#ai-results').append(card);
    }
    $('#ai-results-previous').disabled = this.offset === 0; $('#ai-results-next').disabled = !page.hasMore;
  }
}
