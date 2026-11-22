import {organizationView, candidateReviewView, readCandidateDraft, actionControl} from './assets/react-host.js';
import {drawer, requestTaskLeave, pageAvailability} from './presentation.js';
import {native} from './bridge.js';
import {CandidateRepository, Organization, CandidateReview} from './organization.js';
import {allRecords} from './initiatives.js';
const $ = selector => document.querySelector(selector);
const invalidSettings = '请修正服务地址或模型后再保存。';
export class OrganizeScreen {
  constructor(openNote) {
    this.openNote = openNote; this.repository = new CandidateRepository(native); this.organization = new Organization(native, this.repository); this.offset = 0; this.review = new CandidateReview(native, this.repository); this.drafts = new Map(); this.selected = new Set();
    this.session = 0; this.selectionOffset = 0; this.inventoryRequest = 0; this.candidateContext = new Map(); this.recoveredDrafts = new Set(); this.draftRevisions = new Map();
    this.settingsDrawer = drawer({id: 'ai-settings-drawer', title: 'AI 服务设置', onDismiss: () => this.leaveSettings()});
    this.state = {search: '', directory: '*', directories: [], notes: [], inventory: '', inventoryLoading: true, retry: false,
      request: '', status: '', statusState: 'idle', service: '正在载入服务状态…', address: '', model: '', token: '', savedCredential: false, settingsError: '', settingsFields: {}};
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
      setting: (key, value) => {
        this.state[key] = value;
        delete this.state.settingsFields[key];
        this.controls();
      },
      save: () => this.attempt(() => this.saveSettings()),
      preview: () => this.attempt(() => this.preview()),
      send: () => this.attempt(async () => {
        const generation = this.session;
        const operation = this.organization.run(text => { if (generation === this.session) this.status(text); }); this.controls();
        try { await operation; } finally {
          if (generation === this.session) {
            this.state.request = this.organization.requestPreview(this.savedSettings) || this.state.request;
            this.controls(); await this.candidates();
          }
        }
      }),
      cancel: () => this.attempt(async () => {
        const session = this.session;
        const cancellation = this.canceling = this.organization.cancel();
        this.state.request = this.organization.requestPreview(this.savedSettings) || this.state.request;
        this.controls();
        try { await cancellation; } finally { if (this.canceling === cancellation) this.canceling = null; }
        if (session !== this.session) return;
        this.status(`已取消。已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段，已保存的建议仍保留。`);
      })
    });
    this.candidateUI = candidateReviewView($('#ai-results'), {
      activate: id => { this.activeCandidate = id; },
      edit: (id, value) => { this.activeCandidate = id; this.recoveredDrafts.delete(id); this.drafts.set(id, value); const record = this.candidateRecords.find(r => r.entityId === id); this.draftRevisions.set(id, record.revision); localStorage.setItem(this.candidateDraftKey(id), JSON.stringify({revision: record.revision, description: value})); this.renderCandidates(); },
      target: (id, value) => { const context = this.candidateContext.get(id) || {}; context.target = value; this.candidateContext.set(id, context); this.renderCandidates(); },
      disclosure: (id, label, open) => { const context = this.candidateContext.get(id) || {}; context.disclosures = {...context.disclosures, [label]: open}; this.candidateContext.set(id, context); },
      source: (path, opener) => this.openNote(path, opener),
      decide: (record, decision, owner) => this.attempt(async () => {
        if (this.reviewing) return;
        if (this.drafts.has(record.entityId) && this.draftRevisions.get(record.entityId) !== record.revision) throw Error('Candidate changed; review again');
        const session = this.session;
        this.reviewing = record.entityId; this.renderCandidates();
        try {
          await this.review.decide(record, decision, {description: this.drafts.get(record.entityId) ?? record.review?.suggestion ?? record.description, targetId: this.candidateContext.get(record.entityId)?.target || ''});
          if (session !== this.session) return;
          this.drafts.delete(record.entityId); this.clearCandidateDraft(record.entityId);
          this.status('决定已保存到本地。每条建议都需要单独确认。');
        } finally { this.reviewing = false; this.renderCandidates(); if (session === this.session) await this.candidates({owner}); }
      }, undefined, {candidateId: record.entityId}),
      recover: owner => {
        const id = owner.closest('[data-candidate]').dataset.candidate;
        return this.attempt(async () => {
          if (this.reviewing) return;
          this.reviewing = id; this.renderCandidates();
          try { await this.review.recover(); } finally { this.reviewing = false; await this.candidates({owner}); }
        }, undefined, {reviewSection: true});
      }
    });
    const settingsSave = actionControl('保存设备设置', () => this.attempt(() => this.saveSettings()), {variant: 'primary'});
    this.settingsSave = settingsSave.control;
    this.settingsDrawer.footer.append(actionControl('取消设置', () => this.leaveSettings()).host, settingsSave.host);
    this.controls();
    this.renderCandidates();
    $('#ai-review-jump').onclick = () => $('#ai-review-title').focus();
    $('#ai-results-next').onclick = () => this.pageCandidates(50);
    $('#ai-results-previous').onclick = () => this.pageCandidates(-50);
  }
  async preview() {
    if (this.organization.running || this.previewing) throw Error('请先等待当前操作完成');
    const session = this.session;
    this.previewing = true; this.status('正在读取所选内容…', 'loading');
    try {
      const paths = [...this.selected], batches = await this.organization.preview(paths);
      if (session !== this.session) return;
      this.state.request = this.organization.requestPreview(this.savedSettings);
      this.status(batches.length ? `预览已就绪：${paths.length} 篇笔记，${batches.length} 个片段。请核对后发送。` : '所选笔记没有可发送的正文，请重新选择。');
    } finally { if (session === this.session) { this.previewing = false; this.controls(); } }
  }
  status(text, state, inReview = false) {
    const analyzing = text.match(/^Analyzing fragment (\d+)\/(\d+); completed (\d+)/);
    const complete = text.match(/^Complete: (\d+)\/(\d+)/);
    this.state.statusState = state || (analyzing ? 'loading' : complete ? 'saved' : 'idle');
    this.state.statusInReview = inReview;
    this.state.status = analyzing ? `正在分析 ${analyzing[1]} / ${analyzing[2]} 个片段，已完成 ${analyzing[3]} 个。` : complete ? `已完成 ${complete[1]} / ${complete[2]} 个片段。建议仍需核对当前适用性。` : text;
    this.controls();
  }
  controls() {
    this.ui.render({...this.state, selected: [...this.selected], previous: Boolean(this.selectionPrevious), next: Boolean(this.selectionHasMore),
      running: Boolean(this.organization.running), previewing: Boolean(this.previewing), canceling: Boolean(this.canceling), configured: Boolean(this.configured),
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
      this.state.settingsError = ''; this.state.settingsFields = {}; this.controls();
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
    const address = $('#ai-address'), model = $('#ai-model');
    const endpoint = address.validity.valid ? new URL(address.value) : null;
    const fields = {};
    if (!endpoint?.hostname || !(endpoint.protocol === 'https:' ||
        (endpoint.protocol === 'http:' && endpoint.hostname === '127.0.0.1')) ||
        endpoint.username || endpoint.password || /[?#]/.test(address.value)) {
      fields.address = '请输入完整的 HTTPS 服务地址。本机测试可使用 127.0.0.1，地址不能包含凭证、查询或片段。';
    }
    if (!model.value.trim()) fields.model = '请输入模型名称。';
    this.state.settingsFields = fields;
    if (fields.address || fields.model) {
      this.controls();
      if (document.activeElement?.closest('dialog') === this.settingsDrawer.panel) {
        (fields.address ? address : model).focus();
      }
      return Promise.reject(Error(invalidSettings));
    }
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
    this.session = (this.session || 0) + 1; this.previewing = false; this.canceling = null; this.inventoryRequest++; this.organization.generation++; this.selected.clear(); this.selectionOffset = 0;
    this.state.search = ''; this.state.directory = '*'; this.state.notes = []; this.state.inventoryLoading = true; this.state.token = ''; this.selectionHasMore = false; this.selectionPrevious = false; this.drafts.clear(); this.draftRevisions.clear(); this.recoveredDrafts.clear(); this.candidateContext.clear(); this.offset = 0; this.candidateRecords = null; this.activeCandidate = null; this.candidateError = null; this.reviewSectionError = ''; this.candidateLoadFailed = false; this.renderCandidates(); this.invalidate();
  }
  async attempt(operation, owns, {candidateId, reviewSection} = {}) {
    const owner = document.activeElement, session = this.session;
    const current = owns || (() => session === this.session);
    if (candidateId) this.candidateError = null;
    if (reviewSection) { this.reviewSectionError = ''; this.renderCandidates(); }
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
      if (this.settingsDrawer.panel.open) this.state.settingsError = diagnostic === invalidSettings ? '' : message;
      if (candidateId) {
        this.candidateError = {id: candidateId, message};
        this.renderCandidates();
      }
      if (reviewSection) {
        this.reviewSectionError = message;
        this.renderCandidates();
      }
      this.status(message + (this.organization.covered && !candidateId && !reviewSection ? ` 已完成 ${this.organization.covered}/${this.organization.batches?.length || 0} 个片段。` : ''), 'failed', Boolean(candidateId || reviewSection));
    } finally {
      this.controls();
      if (current() && document.activeElement === document.body && owner?.isConnected && !owner.closest('[hidden], [inert]') && !owner.disabled) owner.focus({preventScroll: true});
    }
  }
  async show(library) {
    const request = this.showRequest = (this.showRequest || 0) + 1;
    const current = () => request === this.showRequest;
    $('#organize-tools').hidden = false; $('#view-title').textContent = '整理'; $('#items').replaceChildren();
    this.candidateLoadFailed = false; this.renderCandidates();
    await this.attempt(async () => {
      const previousWorkspace = this.repository.workspaceId;
      await this.repository.open(); if (!current()) return;
      await this.review.open(); if (!current()) return;
      if (previousWorkspace !== this.repository.workspaceId) { this.resetSelection(true); }
      this.status('正在载入已保存的建议…');
      let recoveryError;
      try { await this.review.recover(); } catch (error) { recoveryError = error; }
      if (!current()) return;
      await this.candidates(); if (!current()) return;
      try { await this.settings(); } catch { this.configured = false; this.state.service = '服务状态暂不可用。可继续选择来源或核对已保存的建议，设置时重试。'; }
      if (!current()) return;
      this.library = library; await library.open(); if (!current()) return;
      await library.sync(); if (!current()) return;
      this.state.directories = library.directories || [];
      if (!['*', '', ...this.state.directories].includes(this.state.directory)) this.state.directory = '*';
      await this.inventory(); if (!current()) return;
      if (recoveryError) throw recoveryError; this.status(this.configured ? '请选择来源笔记，或继续核对已保存的建议。' : '可先选择来源并预览；发送前请设置 AI 服务，已有建议仍可核对。');
    }, current);
    if (current()) {
      this.candidateLoadFailed = !this.candidateRecords;
      this.renderCandidates();
      $('#index-state').textContent = '';
    }
  }
  async inventory() {
    const request = ++this.inventoryRequest, workspace = this.library.workspaceId;
    const current = () => request === this.inventoryRequest && workspace === this.library.workspaceId;
    this.state.inventory = '正在查找本机索引…'; this.state.inventoryLoading = true; this.state.retry = false; this.controls();
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
    } finally { if (current()) { this.state.inventoryLoading = false; this.controls(); } }
  }
  candidateDraftKey(id) { return `candidate-draft:${this.repository.workspaceId}:${id}`; }
  clearCandidateDraft(id) { localStorage.removeItem(this.candidateDraftKey(id)); }
  candidateTask() {
    if (this.reviewing && !$('#organize-tools').hidden) return {label: '建议决定', dirty: () => false, pending: () => this.review.queue};
    const record = this.candidateRecords?.find(r => r.entityId === this.activeCandidate);
    if (!record || !this.drafts.has(record.entityId) || $('#organize-tools').hidden || this.sourceDetour) return null;
    return {kind: 'candidate', label: '建议编辑', dirty: () => this.activeCandidate === record.entityId && this.drafts.has(record.entityId), pending: () => this.review.queue,
      save: () => { localStorage.setItem(this.candidateDraftKey(record.entityId), JSON.stringify({revision: this.draftRevisions.get(record.entityId), description: this.drafts.get(record.entityId)})); this.activeCandidate = null; return true; },
      discard: () => { this.drafts.delete(record.entityId); this.clearCandidateDraft(record.entityId); this.activeCandidate = null; this.renderCandidates(); }};
  }
  renderCandidates() {
    if (!this.candidateUI) return;
    const records = this.candidateRecords || [];
    const error = this.candidateError;
    const errorHasCard = records.some(record => record.entityId === error?.id);
    const feedback = $('#ai-review-feedback'), message = this.reviewSectionError || (!errorHasCard && error?.message) || '';
    if (feedback.textContent !== message) feedback.textContent = message;
    this.candidateUI.render({cards: records.map(record => ({record,
      description: this.drafts.get(record.entityId) ?? record.review?.suggestion ?? record.description,
      dirty: this.drafts.has(record.entityId), recovered: this.recoveredDrafts.has(record.entityId), stale: this.drafts.has(record.entityId) && this.draftRevisions.get(record.entityId) !== record.revision, target: this.candidateContext.get(record.entityId)?.target || '', disclosures: this.candidateContext.get(record.entityId)?.disclosures || {}})),
      destinations: this.destinations || [], busy: Boolean(this.reviewing),
      pendingId: this.reviewing || undefined, error,
      availability: this.candidateLoadFailed ? 'failed' : this.candidateRecords ? undefined : 'loading'});
  }
  pageCandidates(delta) {
    if (this.reviewing) return;
    this.offset = Math.max(0, this.offset + delta);
    this.attempt(() => this.candidates(), undefined, {reviewSection: true});
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
    this.candidateRecords = page.actions; this.destinations = destinations.filter(r => !r.syncState);
    for (const record of page.actions) {
      if (!this.drafts.has(record.entityId)) {
        const draft = readCandidateDraft(localStorage.getItem(this.candidateDraftKey(record.entityId)), record.revision); if (draft !== null) { this.drafts.set(record.entityId, draft); this.recoveredDrafts.add(record.entityId); this.draftRevisions.set(record.entityId, record.revision); }
      }
    }
    this.renderCandidates();
    if (focusId && restoreFocus) {
      const card = [...$('#ai-results').children].find(node => node.dataset.candidate === focusId);
      const control = [...(card?.querySelectorAll('[aria-label]') || [])].find(node => node.getAttribute('aria-label') === focusName);
      (control || card)?.focus({preventScroll: true}); $('#organize-tools').scrollTop = scroll;
    }
    pageAvailability($('#ai-results-previous'), $('#ai-results-next'), this.offset > 0, page.hasMore);
  }
}
