import {native} from './bridge.js';
import {WorkspaceSearch} from './global-search.js';
import {bindDialog} from './presentation.js';
import {searchView, searchRows} from './assets/react-host.js';

export class SearchScreen {
  /** @param {import('./react/search-model').SearchNavigation} navigation */
  constructor(navigation = {}) {
    this.navigation = navigation;
    this.service = new WorkspaceSearch(native, () => { if (this.panel.open && !this.openingSource) this.query(); });
    this.scope = 'all'; this.sequence = 0; this.session = 0; this.ready = false; this.rows = []; this.offset = 0;
    const panel = this.panel = document.createElement('dialog'); panel.id = 'global-search'; panel.className = 'ui-panel search-dialog';
    panel.setAttribute('aria-labelledby', 'global-search-title');
    this.message = ''; this.hasNext = false;
    this.view = searchView(panel, {
      scope: scope => { this.scope = scope; this.offset = 0; this.selected = null; this.updateScopes(); return this.query(); },
      close: () => this.close(), page: direction => { this.offset = Math.max(0, this.offset + direction * 20); return this.query(); },
      refresh: () => { this.service.sync(); return this.query(); },
      expand: row => this.expand(row), copy: row => this.copy(row), open: row => this.openSource(row)
    });
    this.paint();
    this.input = panel.querySelector('#global-search-input');
    this.results = panel.querySelector('.search-results');
    this.include = panel.querySelector('.search-attribution input');
    document.body.append(panel); bindDialog(panel);
    // WebKit may end IME composition before delivering its cancelling Escape.
    // Protect that same event turn, without swallowing a later ordinary Escape.
    let composing = false, compositionEndedThisTurn = false, compositionTurn;
    this.input.addEventListener('compositionstart', () => { composing = true; compositionEndedThisTurn = false; clearTimeout(compositionTurn); });
    this.input.addEventListener('compositionend', () => {
      composing = false; compositionEndedThisTurn = true;
      compositionTurn = setTimeout(() => { compositionEndedThisTurn = false; }, 0);
    });
    const imeOwnsEscape = event => composing || compositionEndedThisTurn || event.isComposing || event.keyCode === 229;
    this.input.oninput = () => { this.offset = 0; this.query(); };
    panel.addEventListener('cancel', event => { event.preventDefault(); if (!imeOwnsEscape(event)) this.close(); });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); if (!imeOwnsEscape(event)) this.close(); return; }
      if (event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.shiftKey) return;
      if (event.key === 'Enter' && event.metaKey) { event.preventDefault(); this.copy(this.rows.find(row => row.note.identity === this.selected)); return; }
      if (event.metaKey || !(event.target === this.input || event.target.classList.contains('search-select'))) return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && this.rows.length) {
        event.preventDefault(); let index = this.rows.findIndex(row => row.note.identity === this.selected); index = Math.max(0, Math.min(this.rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))); this.select(this.rows[index]);
      } else if (event.key === 'Enter') { event.preventDefault(); this.expand(this.rows.find(row => row.note.identity === this.selected)); }
    });
    window.addEventListener('reference-change', () => { if (this.panel.open && this.service.workspaceId) this.service.sync(); });
    document.addEventListener('keydown', event => { if (event.metaKey && event.key.toLowerCase() === 'k' && !event.isComposing) { event.preventDefault(); this.open(); } });
  }
  paint() { this.view.render({scope:this.scope, rows:this.rows, selected:this.selected || null, status:this.message, previous:this.offset > 0, next:this.hasNext}); }
  setStatus(message) { this.message = message; this.paint(); }
  updateScopes() { this.paint(); }
  async open() {
    if (this.continuation) return this.returnToSearch();
    if (this.panel.open) { this.input.focus(); return; }
    if (document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])')) return;
    this.invocation = this.navigation.capture?.();
    this.opener = document.activeElement; this.panel.showModal(); this.input.focus();
    const session = ++this.session; this.ready = false;
    try { await this.service.open(); if (!this.panel.open || session !== this.session) return; this.ready = true; this.service.sync(); await this.query(); }
    catch { if (this.panel.open && session === this.session) this.setStatus('搜索暂不可用，请关闭后重试'); }
  }
  close() { this.continuation = null; this.session++; this.ready = false; this.sequence++; this.panel.close(); (this.opener?.isConnected ? this.opener : document.querySelector('#global-search-open'))?.focus({preventScroll: true}); }
  reset() { this.close(); this.service.reset(); this.input.value = ''; this.scope = 'all'; this.include.checked = false; this.rows = []; this.selected = null; this.offset = 0; this.hasNext = false; this.results.inert = false; this.setStatus('输入关键词搜索内容'); }
  async query() {
    const token = ++this.sequence, query = this.input.value.trim();
    if (!this.ready) { this.setStatus('正在打开搜索…'); return; }
    if (!query) { this.rows = []; this.selected = null; this.hasNext = false; this.results.inert = false; this.setStatus(this.service.indexing || this.service.entitiesRunning ? '索引正在更新，请输入关键词' : '输入关键词搜索内容'); return; }
    this.setStatus('正在搜索…');
    const focusedRow = this.rows.find(row => row.node.contains(document.activeElement));
    const focusedNode = focusedRow?.node;
    const focusedButton = focusedRow ? [...focusedRow.node.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    this.results.inert = true;
    try {
      const page = await this.service.query(query, this.offset, this.scope);
      if (token !== this.sequence || !this.panel.open) return;
      this.results.inert = false;
      const scroll = this.results.scrollTop, previous = this.rows;
      this.rows = searchRows(page.notes, query, previous);
      this.hasNext = page.hasMore; this.paint();
      const selected = this.rows.find(row => row.note.identity === this.selected) || this.rows[0]; if (selected) this.select(selected, false);
      // Inert results can move focus to the body. A newly chosen control owns
      // focus instead; a late refresh must not take it back.
      if (focusedRow && focusedButton >= 0 && (document.activeElement === document.body || focusedNode.contains(document.activeElement))) (this.rows.find(row => row.note.identity === focusedRow.note.identity)?.node.querySelectorAll('button')[focusedButton] || this.input).focus({preventScroll: true});
      this.results.scrollTop = scroll;
      this.setStatus(this.service.error || page.partial ? '索引未完整更新，请刷新重试；以下为缓存结果' : this.service.indexing || this.service.entitiesRunning ? '索引正在更新；以下为已有结果' : this.rows.length ? `本页 ${this.rows.length} 条结果` : '没有匹配的内容');
    } catch { if (token === this.sequence && this.panel.open) { this.rows = []; this.hasNext = false; this.results.inert = false; this.setStatus('搜索失败，请刷新重试'); } }
  }
  highlight(node, text, query) {
    node.replaceChildren(); let start = 0, position; const lower = text.toLowerCase(), term = query.toLowerCase();
    while (term && (position = lower.indexOf(term, start)) >= 0) { node.append(document.createTextNode(text.slice(start, position))); const mark = document.createElement('mark'); mark.textContent = text.slice(position, position + term.length); node.append(mark); start = position + term.length; }
    node.append(document.createTextNode(text.slice(start)));
  }
  select(row, scroll = true) { this.selected = row.note.identity; this.paint(); if (scroll) row.node.scrollIntoView({block: 'nearest'}); }
  async expand(row) {
    if (!row || this.results.inert) return; this.select(row, false); const token = this.sequence;
    try { const text = await this.service.context(row.note, row.query); if (!this.panel.open || token !== this.sequence || !row.node.isConnected) return; row.text = text; this.paint(); }
    catch { if (this.panel.open && token === this.sequence) this.setStatus('来源已改变或不可读取，请刷新重试'); }
  }
  resume(focus = this.input) {
    if (document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])')) return false;
    const scroll = this.savedScroll;
    this.panel.showModal(); this.results.scrollTop = scroll;
    (focus?.isConnected ? focus : this.input).focus({preventScroll: true});
    return true;
  }
  async openSource(row) {
    if (!row || this.openingSource || this.results.inert || !this.navigation.open) return;
    this.openingSource = true;
    const session = this.session, sequence = this.sequence, invocation = this.invocation;
    const valid = () => session === this.session && sequence === this.sequence && this.navigation.owns(invocation);
    this.savedScroll = this.results.scrollTop;
    // The shared action disables itself before running; retain its real opener
    // rather than the body focus that native WebKit may expose at that point.
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
        this.setStatus('来源已移动、改变或不可读取，请刷新后重试；搜索与原页面仍可返回');
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
      await this.service.context(row.note, row.query);
      if (!this.panel.open || token !== this.sequence) return;
      const text = row.text + (this.include.checked ? `\n\n${row.note.title}\n${row.note.locator}` : '');
      await this.service.call('clipboardWrite', {text});
      if (this.panel.open && token === this.sequence) this.setStatus('已复制片段');
    } catch { if (this.panel.open && token === this.sequence) this.setStatus('未能复制，请刷新重试或手动选择文字复制'); }
    finally { row.copying = false; }
  }
}
