import {native} from './bridge.js';
import {NoteSearch} from './global-search.js';
import {button, field, bindDialog} from './presentation.js';

export class SearchScreen {
  constructor() {
    this.service = new NoteSearch(native, () => { if (this.panel.open) this.query(); });
    this.sequence = 0; this.rows = []; this.offset = 0;
    const panel = this.panel = document.createElement('dialog'); panel.id = 'global-search'; panel.className = 'ui-panel search-dialog';
    panel.setAttribute('aria-labelledby', 'global-search-title');
    const title = document.createElement('h2'); title.id = 'global-search-title'; title.textContent = '搜索笔记';
    this.input = document.createElement('input'); this.input.id = 'global-search-input'; this.input.type = 'search';
    this.status = document.createElement('p'); this.status.setAttribute('role', 'status');
    this.results = document.createElement('div'); this.results.className = 'search-results'; this.results.setAttribute('aria-label', '搜索结果');
    this.include = document.createElement('input'); this.include.type = 'checkbox';
    const include = document.createElement('label'); include.className = 'search-attribution'; include.append(this.include, '附带来源');
    this.previous = button('上一页', () => { this.offset = Math.max(0, this.offset - 20); return this.query(); });
    this.next = button('下一页', () => { this.offset += 20; return this.query(); });
    const paging = document.createElement('div'); paging.className = 'ui-pagination'; paging.append(this.previous, this.next);
    panel.append(title, field('关键词', this.input), button('关闭搜索', () => this.close()), this.status, this.results, paging, include, button('刷新索引', () => { this.service.sync(); return this.query(); }));
    const help = document.createElement('small'); help.textContent = '笔记 · 本地关键词 · ↑↓ 选择 · Enter 展开 · ⌘Enter 复制'; panel.append(help);
    document.body.append(panel); bindDialog(panel);
    this.input.oninput = () => { this.offset = 0; this.query(); };
    panel.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); this.close(); return; }
      if (event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.shiftKey) return;
      if (event.key === 'Enter' && event.metaKey) { event.preventDefault(); this.copy(this.rows.find(row => row.note.path === this.selected)); return; }
      if (event.metaKey || !(event.target === this.input || event.target.classList.contains('search-select'))) return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && this.rows.length) {
        event.preventDefault(); let index = this.rows.findIndex(row => row.note.path === this.selected); index = Math.max(0, Math.min(this.rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))); this.select(this.rows[index]);
      } else if (event.key === 'Enter') { event.preventDefault(); this.expand(this.rows.find(row => row.note.path === this.selected)); }
    });
    window.addEventListener('reference-change', () => { if (this.panel.open && this.service.workspaceId) this.service.sync(); });
    document.addEventListener('keydown', event => { if (event.metaKey && event.key.toLowerCase() === 'k' && !event.isComposing) { event.preventDefault(); this.open(); } });
  }
  async open() {
    if (this.panel.open) { this.input.focus(); return; }
    if (document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])')) return;
    this.opener = document.activeElement; this.panel.showModal(); this.input.focus();
    const token = ++this.sequence;
    try { await this.service.open(); if (!this.panel.open || token !== this.sequence) return; this.service.sync(); await this.query(); }
    catch { if (this.panel.open && token === this.sequence) this.status.textContent = '搜索暂不可用，请关闭后重试'; }
  }
  close() { this.sequence++; this.panel.close(); this.opener?.focus({preventScroll: true}); }
  reset() { this.close(); this.service.reset(); this.input.value = ''; this.include.checked = false; this.rows = []; this.results.replaceChildren(); this.selected = null; this.offset = 0; }
  async query() {
    const token = ++this.sequence, query = this.input.value.trim();
    if (!query) { this.results.replaceChildren(); this.rows = []; this.status.textContent = this.service.indexing ? '索引正在更新，请输入关键词' : '输入关键词搜索笔记'; this.previous.disabled = this.next.disabled = true; return; }
    this.status.textContent = '正在搜索…';
    try {
      const page = await this.service.query(query, this.offset);
      if (token !== this.sequence || !this.panel.open) return;
      const scroll = this.results.scrollTop, previous = this.rows;
      this.results.replaceChildren(); this.rows = page.notes.map(note => { const row = this.row(note, query); const old = previous.find(item => item.note.path === note.path && item.note.fingerprint === note.fingerprint && item.query === query); if (old) { row.text = old.text; this.highlight(row.passage, row.text, query); } return row; });
      this.previous.disabled = this.offset === 0; this.next.disabled = !page.hasMore;
      const selected = this.rows.find(row => row.note.path === this.selected) || this.rows[0]; if (selected) this.select(selected, false);
      this.results.scrollTop = scroll;
      this.status.textContent = this.service.error ? '索引未完整更新，请刷新重试；以下为缓存结果' : this.service.indexing ? '索引正在更新；以下为已有结果' : this.rows.length ? `本页 ${this.rows.length} 条笔记` : '没有匹配的笔记';
    } catch { if (token === this.sequence && this.panel.open) this.status.textContent = '搜索失败，请刷新重试'; }
  }
  row(note, query) {
    const node = document.createElement('section'); node.className = 'search-result';
    const select = button(note.title, () => this.expand(row)); select.classList.add('search-select');
    const locator = document.createElement('p'); locator.textContent = `笔记 · ${note.path}`;
    const passage = document.createElement('pre'); passage.className = 'search-passage'; passage.setAttribute('aria-label', '复制范围');
    const row = {note, node, select, passage, query, text: note.passage};
    this.highlight(passage, row.text, query);
    node.append(select, locator, passage, button('复制片段', () => this.copy(row))); this.results.append(node); return row;
  }
  highlight(node, text, query) {
    node.replaceChildren(); let start = 0, position; const lower = text.toLowerCase(), term = query.toLowerCase();
    while (term && (position = lower.indexOf(term, start)) >= 0) { node.append(document.createTextNode(text.slice(start, position))); const mark = document.createElement('mark'); mark.textContent = text.slice(position, position + term.length); node.append(mark); start = position + term.length; }
    node.append(document.createTextNode(text.slice(start)));
  }
  select(row, scroll = true) { this.selected = row.note.path; for (const item of this.rows) item.select.setAttribute('aria-current', String(item === row)); if (scroll) row.node.scrollIntoView({block: 'nearest'}); }
  async expand(row) {
    if (!row) return; this.select(row, false); const token = this.sequence;
    try { const text = await this.service.context(row.note, row.query); if (!this.panel.open || token !== this.sequence || !row.node.isConnected) return; row.text = text; this.highlight(row.passage, text, row.query); }
    catch { if (this.panel.open && token === this.sequence) this.status.textContent = '来源已改变或不可读取，请刷新重试'; }
  }
  async copy(row) {
    if (!row || row.copying) return; row.copying = true; const token = this.sequence;
    try {
      // Revalidate before copying an indexed passage; displayed text stays the copy boundary.
      await this.service.context(row.note, row.query);
      if (!this.panel.open || token !== this.sequence) return;
      const text = row.text + (this.include.checked ? `\n\n${row.note.title}\n${row.note.path}` : '');
      await this.service.call('clipboardWrite', {text});
      if (this.panel.open && token === this.sequence) this.status.textContent = '已复制片段';
    } catch { if (this.panel.open && token === this.sequence) this.status.textContent = '未能复制，请刷新重试或手动选择文字复制'; }
    finally { row.copying = false; }
  }
}
