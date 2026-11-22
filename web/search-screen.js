import {native} from './bridge.js';
import {WorkspaceSearch} from './global-search.js';
import {appendMeaningResults} from './meaning-search.js';
import {bindModal, escapeInComposition} from './presentation.js';
import {searchView, searchRows} from './assets/react-host.js';

export class SearchScreen {
  /** @param {import('./react/search-model').SearchNavigation} navigation */
  constructor(navigation = {}) {
    this.navigation = navigation;
    this.service = new WorkspaceSearch(native, () => {
      if (this.panel.open && !this.openingSource) { this.paint(); this.query(); }
    });
    this.scope = 'all'; this.sequence = 0; this.session = 0; this.ready = false; this.rows = []; this.offset = 0;
    const panel = this.panel = document.createElement('dialog'); panel.id = 'global-search'; panel.className = 'ui-panel ui-modal search-dialog';
    panel.setAttribute('aria-labelledby', 'global-search-title');
    this.message = ''; this.hasNext = false;
    this.view = searchView(panel, {
      scope: scope => { this.scope = scope; this.offset = 0; this.selected = null; this.updateScopes(); return this.query(); },
      close: () => this.close(), page: direction => { this.offset = Math.max(0, this.offset + direction * 20); return this.query(); },
      refresh: () => { this.service.sync(); this.service.refreshMeaning(); return this.query(); },
      meaning: enabled => this.configureMeaning(enabled),
      expand: (row, toggle) => this.expand(row, toggle), copy: row => this.copy(row), open: row => this.openSource(row)
    });
    this.paint();
    this.input = panel.querySelector('#global-search-input');
    this.results = panel.querySelector('.search-results');
    this.include = panel.querySelector('.search-attribution input');
    document.body.append(panel);
    const imeOwnsEscape = escapeInComposition(this.input);
    this.input.oninput = () => { this.offset = 0; this.query(); };
    bindModal(panel, event => { if (!imeOwnsEscape(event)) this.close(); });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); if (!imeOwnsEscape(event)) this.close(); return; }
      if (event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.shiftKey) return;
      if (event.key === 'Enter' && event.metaKey) { event.preventDefault(); this.copy(this.rows.find(row => row.note.identity === this.selected)); return; }
      if (event.metaKey || !(event.target === this.input || event.target.classList.contains('search-select'))) return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && this.rows.length) {
        event.preventDefault(); let index = this.rows.findIndex(row => row.note.identity === this.selected); index = Math.max(0, Math.min(this.rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))); this.select(this.rows[index]);
      } else if (event.key === 'Enter') { event.preventDefault(); this.expand(this.rows.find(row => row.note.identity === this.selected)); }
    });
    window.addEventListener('reference-change', () => {
      if (this.panel.open && this.service.workspaceId) this.service.sync();
      this.service.refreshMeaning();
    });
    document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k' && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); this.open(); } });
  }
  paint() {
    const meaning = this.service.meaning;
    this.view.render({scope:this.scope, rows:this.rows, selected:this.selected || null, status:this.message,
      tone:this.tone, previous:this.offset > 0, next:this.hasNext,
      meaning: meaning.supported ? {enabled: meaning.pendingEnabled ?? meaning.enabled, configuring: meaning.pendingEnabled !== null, state: meaning.state} : undefined});
  }
  prepareMeaning() { return this.service.prepareMeaning().catch(() => {}); }
  async configureMeaning(enabled) {
    try {
      const operation = this.service.meaning.configure(enabled);
      if (!enabled) {
        clearTimeout(this.meaningQueryTimer);
        this.rows = this.rows.filter(row => !row.note.meaning);
        if (!this.rows.some(row => row.note.identity === this.selected)) this.selected = this.rows[0]?.note.identity;
      }
      this.paint();
      await operation;
      if (enabled) this.service.refreshMeaning();
    } catch { if (this.panel.open) this.setStatus('无法保存本机语义检索设置，请重试', 'warning'); }
  }
  setStatus(message, tone) { this.message = message; this.tone = tone; this.paint(); }
  updateScopes() { this.paint(); }
  async open() {
    if (this.continuation) return this.returnToSearch();
    if (this.panel.open) { this.input.focus(); return; }
    if (document.querySelector('dialog[open]')) return;
    this.invocation = this.navigation.capture?.();
    this.opener = document.activeElement; this.panel.showModal(); this.input.focus();
    const session = ++this.session; this.ready = false; this.setStatus('正在打开搜索…', 'loading');
    try { await this.service.open(); if (!this.panel.open || session !== this.session) return; this.ready = true; this.service.sync(); void this.service.meaning.open(this.service.workspaceId); await this.query(); }
    catch { if (this.panel.open && session === this.session) this.setStatus('搜索暂不可用，请关闭后重试', 'error'); }
  }
  close() { clearTimeout(this.meaningQueryTimer); this.continuation = null; this.session++; this.ready = false; this.sequence++; this.panel.close(); (this.opener?.isConnected ? this.opener : document.querySelector('#global-search-open'))?.focus({preventScroll: true}); }
  reset() { this.close(); this.service.reset(); this.input.value = ''; this.scope = 'all'; this.include.checked = false; this.rows = []; this.selected = null; this.offset = 0; this.hasNext = false; this.results.inert = false; this.setStatus('输入关键词搜索内容'); }
  async query() {
    const token = ++this.sequence, query = this.input.value.trim();
    if (!this.ready) { this.setStatus('正在打开搜索…', 'loading'); return; }
    if (!query) { this.rows = []; this.selected = null; this.hasNext = false; this.results.inert = false; this.setStatus(this.service.indexing || this.service.entitiesRunning ? '索引正在更新，请输入关键词' : '输入关键词搜索内容'); return; }
    this.setStatus('正在搜索…', 'loading');
    const focusedRow = this.rows.find(row => row.node.contains(document.activeElement));
    const focusedNode = focusedRow?.node;
    const focusedButton = focusedRow ? [...focusedRow.node.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    this.results.inert = true;
    try {
      const page = await this.service.query(query, this.offset, this.scope);
      if (token !== this.sequence || !this.panel.open) return;
      this.results.inert = false;
      const scroll = this.results.scrollTop, previous = this.rows;
      const meaning = this.service.meaning;
      const retained = this.offset === 0 && meaning.enabled && meaning.state !== 'unavailable'
        ? previous.filter(row => row.note.meaning && row.query === query && meaning.accepts(row.note, this.scope))
          .map(row => row.note)
        : [];
      this.rows = searchRows(appendMeaningResults(page.notes, retained, query), query, previous);
      this.hasNext = page.hasMore; this.paint();
      const selected = this.rows.find(row => row.note.identity === this.selected) || this.rows[0]; if (selected) this.select(selected, false);
      // Inert results can move focus to the body. A newly chosen control owns
      // focus instead; a late refresh must not take it back.
      if (focusedRow && focusedButton >= 0 && (document.activeElement === document.body || focusedNode.contains(document.activeElement))) (this.rows.find(row => row.note.identity === focusedRow.note.identity)?.node.querySelectorAll('button')[focusedButton] || this.input).focus({preventScroll: true});
      this.results.scrollTop = scroll;
      if (this.service.error || page.partial) this.setStatus('索引未完整更新，请刷新重试；以下为缓存结果', 'warning');
      else if (this.service.indexing || this.service.entitiesRunning) this.setStatus('索引正在更新；以下为已有结果');
      else this.setStatus(this.rows.length ? `本页 ${this.rows.length} 条结果` : '没有匹配的内容');
      if (this.offset === 0 && this.service.meaning.enabled) {
        clearTimeout(this.meaningQueryTimer);
        this.meaningQueryTimer = setTimeout(() => this.showMeaning(page, query, token), 150);
      }
    } catch { if (token === this.sequence && this.panel.open) { this.rows = []; this.hasNext = false; this.results.inert = false; this.setStatus('搜索失败，请刷新重试', 'error'); } }
  }
  async showMeaning(page, query, token) {
    const meaning = this.service.meaning;
    if (token !== this.sequence || !this.panel.open || !['ready', 'partial'].includes(meaning.state)) return;
    const related = await this.service.meaningQuery(query, this.scope, page.hasMore);
    if (token !== this.sequence || !this.panel.open || !meaning.enabled) return;
    const rows = appendMeaningResults(page.notes, related, query);
    this.rows = searchRows(rows, query, this.rows);
    if (!this.rows.some(row => row.note.identity === this.selected)) this.selected = this.rows[0]?.note.identity;
    if (!page.notes.length && !this.tone) {
      this.setStatus(rows.length ? `本页 ${rows.length} 条语义相关结果` : '没有匹配的内容');
    } else this.paint();
  }
  highlight(node, text, query) {
    node.replaceChildren(); let start = 0, position; const lower = text.toLowerCase(), term = query.toLowerCase();
    while (term && (position = lower.indexOf(term, start)) >= 0) { node.append(document.createTextNode(text.slice(start, position))); const mark = document.createElement('mark'); mark.textContent = text.slice(position, position + term.length); node.append(mark); start = position + term.length; }
    node.append(document.createTextNode(text.slice(start)));
  }
  select(row, scroll = true) { this.selected = row.note.identity; this.paint(); if (scroll) row.node.scrollIntoView({block: 'nearest'}); }
  async expand(row, toggle = false) {
    if (!row || row.expanding || this.results.inert) return;
    this.select(row, false);
    if (row.expanded) {
      if (toggle) { row.expanded = false; row.text = row.note.passage; this.paint(); }
      return;
    }
    const token = this.sequence;
    try {
      row.expanding = this.service.context(row.note, row.query);
      const text = await row.expanding;
      if (!this.panel.open || token !== this.sequence || !row.node?.isConnected) return;
      row.text = text; row.expanded = true; this.paint();
    }
    catch { if (this.panel.open && token === this.sequence) this.setStatus('来源已改变或不可读取，请刷新重试', 'warning'); }
    finally { row.expanding = undefined; }
  }
  resume(focus = this.input) {
    if (document.querySelector('dialog[open]')) return false;
    this.panel.showModal();
    this.panel.scrollTop = this.savedPanelScroll;
    this.results.scrollTop = this.savedScroll;
    (focus?.isConnected ? focus : this.input).focus({preventScroll: true});
    return true;
  }
  async openSource(row) {
    if (!row || this.openingSource || this.results.inert || !this.navigation.open) return;
    this.openingSource = true;
    const session = this.session, sequence = this.sequence, invocation = this.invocation;
    const valid = () => session === this.session && sequence === this.sequence && this.navigation.owns(invocation);
    this.savedScroll = this.results.scrollTop;
    this.savedPanelScroll = this.panel.scrollTop;
    // Return to the stable source control after restoring the original page.
    const focus = row.source;
    try {
      // Capture before the first read; closing/dismissal invalidates this intent.
      await this.service.source(row.note);
      if (!valid() || !this.panel.open) return;
      this.panel.close();
      this.continuation = {session, invocation, focus};
      const opened = await this.navigation.open(row.note, invocation, valid);
      if (session !== this.session) return;
      if (!opened) {
        this.continuation = null;
        if (this.navigation.owns(invocation)) this.resume(focus);
        return;
      }
      this.continuation = {session, invocation, focus};
      this.navigation.returnAvailable(true);
    } catch {
      if (!this.panel.open && session === this.session && this.navigation.sameWorkspace(invocation)) {
        this.navigation.returnAvailable(true);
        this.navigation.error('来源打开失败，可返回搜索结果后重试');
      }
      if (valid()) {
        this.continuation = null; this.navigation.returnAvailable(false);
        if (!this.panel.open) this.resume(focus);
        this.setStatus('来源已移动、改变或不可读取，请刷新后重试；搜索与原页面仍可返回', 'warning');
      }
    } finally { this.openingSource = false; }
  }
  async returnToSearch() {
    const continuation = this.continuation;
    if (!continuation || this.returning) return;
    this.returning = true;
    try {
      if (!await this.navigation.restore(continuation.invocation, () => this.continuation === continuation)) return;
      if (this.continuation !== continuation || continuation.session !== this.session) return;
      this.navigation.returnAvailable(false); this.continuation = null;
      this.resume(continuation.focus);
    } catch { this.navigation.error('返回原页面失败，请重试；搜索状态已保留'); }
    finally { this.returning = false; }
  }
  async copy(row) {
    if (!row || row.copying || this.results.inert) return; row.copying = true; const token = this.sequence;
    try {
      // Revalidate before copying an indexed passage; displayed text stays the copy boundary.
      await (row.expanding ?? this.service.context(row.note, row.query));
      if (!this.panel.open || token !== this.sequence) return;
      const text = row.text + (this.include.checked ? `\n\n${row.note.title}\n${row.note.locator}` : '');
      await this.service.call('clipboardWrite', {text});
      if (this.panel.open && token === this.sequence) this.setStatus('已复制片段', 'success');
    } catch { if (this.panel.open && token === this.sequence) this.setStatus('未能复制，请刷新重试或手动选择文字复制', 'error'); }
    finally { row.copying = false; }
  }
}
