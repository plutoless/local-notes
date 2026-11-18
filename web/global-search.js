import {referenceRecord, referenceSearchText} from './library.js';
import {fingerprint} from './initiatives.js';
import {safePath} from './core.js';

// One workspace-aware boundary for indexed descriptors and validated source context.
export class NoteSearch {
  constructor(adapter, changed = () => {}) { this.adapter = adapter; this.changed = changed; this.generation = 0; }
  reset() { this.generation++; this.workspaceId = null; this.running = null; this.again = false; }
  async open() { const generation = this.generation; const workspace = await this.adapter('workspace'); if (generation !== this.generation) throw Error('Workspace changed'); if (workspace.workspaceId !== this.workspaceId) { this.reset(); this.workspaceId = workspace.workspaceId; } }
  call(cmd, args = {}) { return this.adapter(cmd, {workspaceId: this.workspaceId, ...args}); }
  sync() {
    if (this.running) { this.again = true; return this.running; }
    const generation = this.generation, workspaceId = this.workspaceId;
    const call = (cmd, args = {}) => this.adapter(cmd, {workspaceId, ...args});
    this.indexing = true; this.error = false;
    this.running = (async () => {
      const previous = new Map();
      for (let offset = 0;; offset += 50) { const page = await call('referenceInventory', {offset}); for (const note of page.notes) previous.set(note.path, note); if (!page.hasMore) break; }
      const metadata = await call('metadata'); const seen = new Set(); let failed = Boolean(metadata.warnings?.length);
      for (const note of metadata.notes) {
        if (generation !== this.generation) return;
        if (!safePath(note.path)) continue;
        seen.add(note.path); const old = previous.get(note.path);
        if (!old || old.modified !== note.modified || old.size !== note.size || old.searchVersion !== 1) {
          try { const {text} = await call('read', {path: note.path}); const record = referenceRecord(note, text); await call('referencePut', {record, search: referenceSearchText(record.title, text)}); }
          catch { failed = true; }
        }
        // Yield between bodies so input and dismissal never wait for indexing.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (!failed) for (const path of previous.keys()) if (!seen.has(path)) await call('referenceRemove', {path});
      if (generation === this.generation) this.error = failed;
    })().catch(() => { if (generation === this.generation) this.error = true; }).finally(() => {
      if (generation === this.generation) { this.indexing = false; this.running = null; this.changed(); if (this.again) { this.again = false; this.sync(); } }
    }); return this.running;
  }
  async query(search, offset = 0) {
    const page = await this.call('referenceSearch', {search, offset, limit: 20});
    return page;
  }
  async context(note, query) {
    const {text} = await this.call('read', {path: note.path});
    if (fingerprint(text) !== note.fingerprint) throw Error('来源已改变，请刷新搜索结果');
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
    const position = Math.max(0, body.toLowerCase().indexOf(query.toLowerCase()));
    const start = Math.max(0, body.lastIndexOf('\n', Math.max(0, position - 300)) + 1);
    const end = body.indexOf('\n', position + Math.max(query.length, 600));
    return body.slice(start, end < 0 ? Math.min(body.length, position + 900) : end);
  }
}
