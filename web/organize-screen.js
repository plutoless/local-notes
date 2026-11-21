import {organizationView} from './assets/react-host.js';
import {button as makeButton, field, disclosure, drawer, requestTaskLeave, pageAvailability} from './presentation.js';
import {native} from './bridge.js';
import {CandidateRepository, Organization, CandidateReview, SYSTEM_PROMPT} from './organization.js';
import {allRecords} from './initiatives.js';
const $ = selector => document.querySelector(selector);
export class OrganizeScreen {
  constructor(openNote) {
    this.openNote = openNote; this.repository = new CandidateRepository(native); this.organization = new Organization(native, this.repository); this.offset = 0; this.review = new CandidateReview(native, this.repository); this.drafts = new Map(); this.selected = new Set();
    this.session = 0; this.selectionOffset = 0; this.inventoryRequest = 0; this.candidateContext = new Map();
    this.settingsDrawer = drawer({id: 'ai-settings-drawer', title: 'AI 服务设置', onDismiss: () => this.leaveSettings()});
    this.state = {search: '', directory: '*', directories: [], notes: [], inventory: '', retry: false,
      request: '', status: '', statusState: 'idle', service: '正在载入服务状态…', address: '', model: '', token: '', savedCredential: false, settingsError: ''};
    this.ui = organizationView($('#organization-react'), this.settingsDrawer.body, {
      search: value => { this.state.search = value; this.selectionOffset = 0; this.attempt(() => this.inventory()); },
      directory: value => { this.state.directory = value; this.selectionOffset = 0; this.attempt(() => this.inventory()); },
      select: (path, checked) => {
        if (checked && this.selected.size >= 20) { this.status('每次最多选择 20 篇笔记。请先取消部分选择。'); return; }
        checked ? this.selected.add(path) : this.selected.delete(path); this.invalidate();
      },
      page: direction => { this.selectionOffset = Math.max(0, this.selectionOffset + direction * 50); this.attempt(() => this.inventory()); },
      retry: () => this.attempt(() => this.inventory()),
      configure: () => this.openSettings(),
      setting: (key, value) => { this.state[key] = value; this.controls(); },
      save: () => this.attempt(() => this.saveSettings()),
      preview: () => this.attempt(() => this.preview()),
      send: () => this.attempt(async () => {
        const generation = this.session;
        const operation = this.organization.run(text => { if (generation === this.session) this.status(text); }); this.controls();
        try { await operation; } finally { if (generation === this.session) { this.controls(); await this.candidates(); } }
      }),
      cancel: () => this.attempt(async () => { await this.organization.cancel(); this.controls(); this.status(`已取消。已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段，已保存的建议仍保留。`); })
    });
    this.settingsSave = makeButton('保存设备设置', () => this.attempt(() => this.saveSettings()), {variant: 'primary'});
    this.settingsDrawer.footer.append(makeButton('取消设置', () => this.leaveSettings()), this.settingsSave);
    this.controls();
    $('#ai-results-next').onclick = () => { this.offset += 50; this.candidates(); };
    $('#ai-results-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.candidates(); };
  }
  async preview() {
    if (this.organization.running || this.previewing) throw Error('请先等待当前操作完成');
    const session = this.session;
    this.previewing = true; this.status('正在读取所选内容…');
    try {
      const paths = [...this.selected], batches = await this.organization.preview(paths);
      if (session !== this.session) return;
      this.state.request = `服务地址：${this.savedSettings?.address || ''}\n模型：${this.savedSettings?.model || ''}\nstream: false\n\n系统消息：\n${SYSTEM_PROMPT}\n\n用户消息（每个片段一次请求）：\n` + batches.map(batch => JSON.stringify(batch)).join('\n\n');
      this.status(batches.length ? `预览已就绪：${paths.length} 篇笔记，${batches.length} 个片段。请核对后发送。` : '所选笔记没有可发送的正文，请重新选择。');
    } finally { if (session === this.session) { this.previewing = false; this.controls(); } }
  }
  status(text, state) {
    const analyzing = text.match(/^Analyzing fragment (\d+)\/(\d+); completed (\d+)/);
    const complete = text.match(/^Complete: (\d+)\/(\d+)/);
    this.state.statusState = state || (analyzing ? 'loading' : complete ? 'saved' : 'idle');
    this.state.status = analyzing ? `正在分析 ${analyzing[1]} / ${analyzing[2]} 个片段，已完成 ${analyzing[3]} 个。` : complete ? `已完成 ${complete[1]} / ${complete[2]} 个片段。建议仍需核对当前适用性。` : text;
    this.controls();
  }
  controls() {
    this.ui.render({...this.state, selected: [...this.selected], previous: Boolean(this.selectionPrevious), next: Boolean(this.selectionHasMore),
      running: Boolean(this.organization.running), previewing: Boolean(this.previewing), configured: Boolean(this.configured),
      covered: this.organization.covered || 0, batches: this.organization.batches || [], settingsPending: Boolean(this.settingsPending)});
  }
  invalidate() {
    this.organization.batches = null; this.organization.covered = 0; this.state.request = '';
    this.status('选择已更新，请重新预览后发送。');
  }
  openSettings() {
    const session = this.session, request = this.showRequest, openRequest = this.settingsOpenRequest = (this.settingsOpenRequest || 0) + 1;
    const current = () => session === this.session && request === this.showRequest && openRequest === this.settingsOpenRequest && !$('#organize-tools').hidden && !document.querySelector('dialog[open]');
    return this.attempt(async () => {
      await this.settings(false, current);
      if (!current()) return;
      this.state.settingsError = ''; this.controls();
      this.settingsDrawer.open($('#ai-address'), $('#ai-configure'));
    }, current);
  }
  async settings(force = false, owns = () => true) {
    if (this.settingsDrawer.panel.open && !force) return;
    const session = this.session, settings = await native('aiSettings');
    if (session !== this.session || !owns() || (this.settingsDrawer.panel.open && !force)) return;
    this.configured = Boolean(settings.configured && settings.address && settings.model);
    this.state.address = settings.address; this.state.model = settings.model; this.state.savedCredential = Boolean(settings.configured);
    this.state.service = this.configured ? '服务已配置。核对预览后可主动发送。' : '尚未配置服务。可先选择并预览；发送前请设置 AI 服务。';
    if (this.savedSettings && (this.savedSettings.address !== settings.address || this.savedSettings.model !== settings.model)) this.invalidate();
    this.savedSettings = {address: settings.address, model: settings.model}; this.controls();
  }
  settingsTask() {
    return {label: 'AI 服务设置', dirty: () => Boolean(this.state.token || this.state.address !== (this.savedSettings?.address || '') || this.state.model !== (this.savedSettings?.model || '')),
      pending: () => this.settingsPending?.catch(() => {}),
      save: async () => { await this.saveSettings(); return true; },
      discard: () => { this.state.token = ''; this.state.address = this.savedSettings?.address || ''; this.state.model = this.savedSettings?.model || ''; this.controls(); },
      close: () => this.closeSettings()};
  }
  leaveSettings() { return requestTaskLeave(this.settingsTask()); }
  saveSettings() {
    if (this.settingsPending) return this.settingsPending;
    if (!$('#ai-settings').reportValidity()) return Promise.reject(Error('Invalid configuration fields'));
    this.settingsSave.disabled = true;
    const session = this.session;
    const operation = (async () => {
      await native('aiConfigure', {address: this.state.address, model: this.state.model, token: this.state.token});
      if (session !== this.session) return;
      this.state.token = ''; await this.settings(true); this.closeSettings(); this.invalidate();
      this.status('设置已保存在此设备。请重新预览请求后主动发送。');
    })().finally(() => { this.settingsPending = null; this.settingsSave.disabled = false; this.controls(); });
    this.settingsPending = operation; this.controls(); return operation;
  }
  closeSettings() {
    this.state.token = '';
    this.state.address = this.savedSettings?.address || '';
    this.state.model = this.savedSettings?.model || '';
    this.controls(); this.settingsDrawer.hide();
  }
  resetSelection(fromShow = false) {
    if (!fromShow) this.showRequest = (this.showRequest || 0) + 1;
    this.session = (this.session || 0) + 1; this.previewing = false; this.inventoryRequest++; this.organization.generation++; this.selected.clear(); this.selectionOffset = 0;
    this.state.search = ''; this.state.directory = '*'; this.state.notes = []; this.state.token = ''; this.selectionHasMore = false; this.selectionPrevious = false; this.drafts.clear(); this.candidateContext.clear(); this.offset = 0; this.invalidate();
  }
  async attempt(operation, owns) {
    const owner = document.activeElement, session = this.session;
    const current = owns || (() => session === this.session);
    try { await operation(); } catch (error) {
      if (!current()) return;
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
      else if (/conflict|changed|workspace/i.test(diagnostic)) message = '工作目录或内容已变化，请重新打开并核对。';
      if (this.settingsDrawer.panel.open) this.state.settingsError = message;
      this.status(message + (this.organization.covered ? ` 已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段。` : ''), 'failed');
    } finally {
      this.controls();
      if (current() && document.activeElement === document.body && owner?.isConnected && !owner.closest('[hidden], [inert]') && !owner.disabled) owner.focus({preventScroll: true});
    }
  }
  async show(library) {
    const request = this.showRequest = (this.showRequest || 0) + 1;
    const current = () => request === this.showRequest;
    $('#organize-tools').hidden = false; $('#view-title').textContent = '整理'; $('#items').replaceChildren(); $('#filters').hidden = true;
    await this.attempt(async () => {
      const previousWorkspace = this.repository.workspaceId;
      await this.repository.open(); if (!current()) return;
      await this.review.open(); if (!current()) return;
      if (previousWorkspace !== this.repository.workspaceId) { this.resetSelection(true); }
      this.status('正在载入已保存的建议…');
      let recoveryError;
      try { await this.review.recover(); } catch (error) { recoveryError = error; }
      if (!current()) return;
      try { await this.settings(); } catch { this.configured = false; this.state.service = '服务状态暂不可用。可继续选择来源或核对已保存的建议，设置时重试。'; }
      if (!current()) return;
      this.library = library; await library.open(); if (!current()) return;
      await library.sync(); if (!current()) return;
      this.state.directories = library.directories || [];
      if (!['*', '', ...this.state.directories].includes(this.state.directory)) this.state.directory = '*';
      await this.inventory(); if (!current()) return;
      await this.candidates(); if (!current()) return; this.controls(); if (recoveryError) throw recoveryError; this.status(this.configured ? '请选择来源笔记，或继续核对已保存的建议。' : '可先选择来源并预览；发送前请设置 AI 服务，已有建议仍可核对。');
    }, current);
    if (current()) $('#index-state').textContent = '';
  }
  async inventory() {
    const request = ++this.inventoryRequest, workspace = this.library.workspaceId;
    const current = () => request === this.inventoryRequest && workspace === this.library.workspaceId;
    this.state.inventory = '正在查找本机索引…'; this.state.retry = false; this.controls();
    try {
      const result = await this.library.query({search: this.state.search.slice(0, 200), directory: this.state.directory, offset: this.selectionOffset, limit: 50});
      if (!current()) return;
      this.selectionPrevious = Boolean(this.selectionOffset); this.state.notes = result.notes; this.selectionHasMore = result.hasMore;
      this.state.inventory = `本页 ${result.notes.length} 篇${result.hasMore ? '，还有下一页' : ''}。` + (this.library.running || this.library.warnings?.length ? '索引尚未完整，结果可能不全。' : '来自当前本机索引。');
    } catch (error) {
      if (!current()) return;
      this.selectionPrevious = Boolean(this.selectionOffset); this.selectionHasMore = false; this.state.notes = [];
      this.state.inventory = '查找未完成，已选笔记仍保留。'; this.state.retry = true;
      throw error;
    } finally { if (current()) this.controls(); }
  }
  captureCandidates() {
    for (const card of $('#ai-results').querySelectorAll('[data-candidate]')) {
      if (card.dataset.workspace !== this.repository.workspaceId) continue;
      const edit = card.querySelector('textarea'), target = card.querySelector('select');
      this.candidateContext.set(card.dataset.candidate, {
        target: target?.value, range: edit ? [edit.selectionStart, edit.selectionEnd, edit.selectionDirection] : null,
        disclosures: Object.fromEntries([...card.querySelectorAll('details')].map(node => [node.querySelector('summary').textContent, node.open]))
      });
    }
  }
  async candidates(returnFocus) {
    if (this.reviewing) return;
    const session = this.session, request = this.candidateRequest = (this.candidateRequest || 0) + 1;
    this.captureCandidates();
    const owner = returnFocus?.owner || document.activeElement;
    const focused = owner.closest('[data-candidate]');
    const focusId = focused?.dataset.candidate, focusName = owner.getAttribute('aria-label');
    const scroll = $('#organize-tools').scrollTop;
    const destinations = await allRecords(this.review.targets.initiative);
    const page = await this.repository.query({offset: this.offset, limit: 50});
    if (session !== this.session || request !== this.candidateRequest) return;
    const restoreFocus = document.activeElement === owner || document.activeElement === document.body;
    $('#ai-results').replaceChildren();
    for (const record of page.actions) {
      const context = this.candidateContext.get(record.entityId);
      const card = document.createElement('article'); card.className = 'card suggestion-card'; card.dataset.candidate = record.entityId; card.dataset.workspace = this.repository.workspaceId; card.tabIndex = -1; card.setAttribute('aria-label', `建议：${record.description}`);
      for (const text of [`${{initiative:'事项', action:'行动', topic:'主题', relationship:'关联', progress:'进展'}[record.candidateType] || '建议'}：${record.description}`, `建议归属：${record.placement}`, `理由：${record.reasoning}`, `当前适用性：${record.relevance}`]) { const p = document.createElement(text.startsWith('建议归属') || text.startsWith('理由') || text.startsWith('当前适用性') ? 'p' : 'h3'); p.textContent = text; card.append(p); }
      for (const source of record.sources) { const quote = document.createElement('blockquote'); quote.textContent = source.quote; const button = makeButton(`${source.path} [${source.start}–${source.end}]`, () => this.openNote(source.path, button), {label: `打开来源：${source.path}，建议：${record.description}`}); card.append(quote, button); }
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
        if (context?.target && [...target.options].some(option => option.value === context.target)) target.value = context.target;
        if (context?.range) edit.setSelectionRange(...context.range);
        card.append(field('归入已有事项', target, {help: '关联、参考或进展建议时选择。'}));
        const decisions = document.createElement('div'); decisions.className = 'organization-actions'; card.append(decisions);
        for (const [decision, label] of [['confirm', '确认此建议'], ['attach', '关联到事项'], ['reference', '作为参考资料'], ['later', '留待以后'], ['ignore', '忽略']]) {
          const button = makeButton(label, () => this.attempt(async () => {
            const owner = button;
            this.reviewing = true; state.textContent = '正在保存决定…'; const buttons = [...card.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
            try { await this.review.decide(record, decision, {description: edit.value, targetId: target.value}); this.drafts.delete(record.entityId); this.status('决定已保存到本地。每条建议都需要单独确认。'); }
            finally { this.reviewing = false; buttons.forEach(b => b.disabled = false); await this.candidates({owner}); }
          }), {variant: decision === 'confirm' ? 'primary' : 'quiet', label: `${label}：${record.description}`}); decisions.append(button);
        }
      } else if (record.review?.state === 'pending' && !record.syncState) {
        const retry = makeButton('恢复已确认的决定', () => this.attempt(async () => { try { await this.review.recover(); } finally { await this.candidates({owner: retry}); } }), {variant: 'secondary', label: `恢复已确认的决定：${record.description}`}); card.append(retry);
      }
      const raw = document.createElement('pre');
      raw.textContent = JSON.stringify({entityId: record.entityId, revision: record.revision, review: record.review || null}, null, 2); card.append(disclosure('建议记录详情', [raw]));
      if (context) [...card.querySelectorAll('details')].forEach(node => { node.open = context.disclosures[node.querySelector('summary').textContent] ?? node.open; });
      $('#ai-results').append(card);
    }
    if (!page.actions.length) $('#ai-results').textContent = '还没有保存的建议。选择笔记并分析后，在这里逐条核对。';
    if (focusId && restoreFocus) {
      const card = [...$('#ai-results').children].find(node => node.dataset.candidate === focusId);
      const control = [...(card?.querySelectorAll('[aria-label]') || [])].find(node => node.getAttribute('aria-label') === focusName);
      (control || card)?.focus({preventScroll: true}); $('#organize-tools').scrollTop = scroll;
    }
    pageAvailability($('#ai-results-previous'), $('#ai-results-next'), this.offset > 0, page.hasMore);
  }
}
