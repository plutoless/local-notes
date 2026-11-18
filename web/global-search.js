import {referenceBody, referenceRecord, referenceSearchText} from './library.js';
import {fingerprint, InitiativeRepository} from './initiatives.js';
import {ActionRepository} from './actions.js';
import {safePath} from './core.js';

// One workspace-aware boundary for indexed descriptors and validated source context.
export class NoteSearch {
  constructor(adapter, changed = () => {}) { this.adapter = adapter; this.changed = changed; this.generation = 0; }
  reset() { this.generation++; this.workspaceId = null; this.running = null; this.again = false; this.opening = null; }
  open() {
    if (this.opening) return this.opening;
    const generation = this.generation;
    const operation = (async () => {
      const workspace = await this.adapter('workspace');
      if (generation !== this.generation) throw Error('Workspace changed');
      if (workspace.workspaceId !== this.workspaceId) { this.reset(); this.workspaceId = workspace.workspaceId; }
    })();
    this.opening = operation;
    operation.finally(() => { if (this.opening === operation) this.opening = null; }).catch(() => {});
    return operation;
  }
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
        if (!old || old.modified !== note.modified || old.size !== note.size || old.searchVersion !== 1 || old.summaryVersion !== 1) {
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
    // Cached descriptors keep offsets in their original normalization until refreshed.
    const body = note.summaryVersion === 1 ? referenceBody(text) : text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
    const position = note.passageStart ? Array.from(body).slice(0, note.passageStart - 1).join('').length : Math.max(0, body.toLowerCase().indexOf(query.toLowerCase()));
    const start = Math.max(0, body.lastIndexOf('\n', Math.max(0, position - 300)) + 1);
    const end = body.indexOf('\n', position + Math.max(query.length, 600));
    return body.slice(start, end < 0 ? Math.min(body.length, position + 900) : end);
  }
}

// The dialog knows descriptors, never the formal-record storage protocol.
export class WorkspaceSearch extends NoteSearch {
  reset() { super.reset(); this.repositories = null; this.entitiesRunning = null; this.entityErrors = false; }
  async open() {
    await super.open();
    if (!this.repositories) {
      const workspaceId = this.workspaceId;
      // Pin every repository request to this workspace, including delayed reconciliation.
      const adapter = (cmd, args = {}) => this.adapter(cmd, {workspaceId, ...args});
      this.repositories = [new ActionRepository(adapter), new InitiativeRepository(adapter)];
      for (const repository of this.repositories) { repository.workspaceId = workspaceId; repository.ready = true; }
    }
  }
  sync() {
    const notes = super.sync();
    if (!this.entitiesRunning && this.repositories) {
      const generation = this.generation;
      const operation = Promise.allSettled(this.repositories.map(repository => this.refresh(repository)));
      this.entitiesRunning = operation;
      operation.then(results => {
        if (generation !== this.generation) return;
        this.entityErrors = results.some(result => result.status === 'rejected' || result.value.warnings.length);
        this.entitiesRunning = null; this.changed();
      });
    }
    return Promise.all([notes, this.entitiesRunning]);
  }
  refresh(repository) {
    return repository.serialize(async () => {
      try { await repository.request('actionQuery', {limit: 1}); }
      catch (error) {
        if (!/INDEX_REBUILD_REQUIRED|malformed|not a database|corrupt/i.test(error.message)) throw error;
        repository.indexedSnapshot = null;
      }
      return repository.recover({readOnly: true});
    });
  }
  async query(search, offset = 0, scope = 'all') {
    if (!['all', 'note', 'initiative', 'action'].includes(scope)) throw Error('Unsupported search scope');
    const generation = this.generation, workspaceId = this.workspaceId;
    const types = scope === 'all' ? ['note', 'initiative', 'action'] : [scope];
    const pages = await Promise.allSettled(types.map(async type => {
      const found = [];
      // Merge only the bounded prefixes needed for this page, not the entire collection.
      for (let position = 0; found.length < offset + 21; position += 50) {
        const page = type === 'note'
          ? await this.adapter('referenceSearch', {workspaceId, search, offset: position, limit: 50})
          : await this.adapter('actionQuery', {workspaceId, entityType: type, globalSearch: true, search, offset: position, limit: 50});
        for (const source of type === 'note' ? page.notes : page.actions) {
          if (type !== 'note' && (source.deleted || source.syncState || source.workspaceId !== workspaceId)) continue;
          const title = type === 'note' ? source.title : type === 'initiative' ? source.title : source.description;
          const fields = type === 'note' ? [[`body:${source.passageStart}`, source.passage]] : type === 'initiative' ? [['title', source.title], ['goal', source.goal], ['progress', source.progress]] : [['description', source.description], ['waitingOn', source.waitingOn]];
          const matches = fields.filter(([, text]) => text?.toLowerCase().includes(search.toLowerCase()));
          // A title match still needs a visible, grounded excerpt.
          if (!matches.length && type === 'note') matches.push(fields[0]);
          const seen = new Set();
          for (const [passageId, passage] of matches) {
            if (seen.has(passage)) continue; seen.add(passage);
            const entityId = type === 'note' ? source.path : source.entityId;
            const position = type === 'note' ? 0 : Math.max(0, passage.toLowerCase().indexOf(search.toLowerCase()) - 180);
            const excerpt = passage.slice(position, position + 900);
            found.push({...source, title, type, entityId, workspaceId, passageId, passage: excerpt,
              contextLabel: type === 'note' ? `${source.path} · ${source.passageStart}` : {title: '标题', goal: '目标', progress: '进展', description: '正文', waitingOn: '等待条件'}[passageId] + ` · ${source.modifiedAt} · ${source.entityId.slice(0, 8)}`,
              identity: JSON.stringify([workspaceId, type, entityId, passageId]),
              locator: type === 'note' ? source.path : `${type === 'initiative' ? '事项' : '行动'}：${title} · ${source.entityId.slice(0, 8)}`});
          }
        }
        if (!page.hasMore) break;
      }
      return found;
    }));
    if (generation !== this.generation) throw Error('Workspace changed');
    const results = pages.flatMap(page => page.status === 'fulfilled' ? page.value : []);
    const partial = (scope !== 'note' && this.entityErrors) || pages.some(page => page.status === 'rejected');
    if (pages.every(page => page.status === 'rejected')) throw Error('Search unavailable');
    // Match SQLite BINARY ordering when extending each bounded source prefix.
    const binary = (a, b) => {
      const left = Array.from(a, char => char.codePointAt(0)), right = Array.from(b, char => char.codePointAt(0));
      for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i];
      return left.length - right.length;
    };
    const fold = text => text.replace(/[A-Z]/g, character => character.toLowerCase());
    results.sort((a, b) => Number(!fold(a.title).includes(fold(search))) - Number(!fold(b.title).includes(fold(search))) || binary(a.type, b.type) || binary(a.entityId, b.entityId) || (a.type === 'note' ? a.passageStart - b.passageStart : binary(a.passageId, b.passageId)));
    return {notes: results.slice(offset, offset + 20), hasMore: results.length > offset + 20, partial};
  }
  async context(result, query) {
    if (result.workspaceId !== this.workspaceId) throw Error('Workspace changed');
    if (result.type === 'note') return super.context(result, query);
    const repository = this.repositories.find(repository => repository.entityType === result.type);
    await this.refresh(repository);
    const page = await repository.request('actionQuery', {entityId: result.entityId, limit: 1});
    const current = page.actions[0];
    if (!current || current.deleted || current.syncState || current.revision !== result.revision) throw Error('Source changed');
    // Original stored field only: no JSON wrappers, lifecycle labels or hidden fields.
    return (result.type === 'initiative' ? [current.title, current.goal, current.progress] : [current.description, current.waitingOn]).filter(text => text?.trim()).join('\n\n');
  }
}
