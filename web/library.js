import {ActionRepository, validateAction} from './actions.js';
import {allRecords, fingerprint} from './initiatives.js';
import {titleOf, safePath} from './core.js';

export class TopicRepository extends ActionRepository {
  constructor(adapter) {
    super(adapter, {entityType: 'topic', validate(record) {
      validateAction({...record, entityType: 'action'});
      if (record.entityType !== 'topic') throw Error('Invalid topic');
      return record;
    }});
  }
}
export function referenceRecord(note, text) {
  const directory = note.path.includes('/') ? note.path.slice(0, note.path.lastIndexOf('/')) : '';
  return {...note, directory, title: titleOf(text, note.path), excerpt: text.replace(/^# .+\r?\n?/m, '').replace(/\s+/g, ' ').trim().slice(0, 180), fingerprint: fingerprint(text)};
}
// One body at a time keeps editor requests responsive while the initial index fills.
export class Library {
  constructor(adapter, changed = () => {}) { this.adapter = adapter; this.changed = changed; this.generation = 0; this.topics = new TopicRepository(adapter); this.running = null; }
  request(cmd, args = {}) { return this.adapter(cmd, {workspaceId: this.workspaceId, ...args}); }
  async open() {
    const workspace = await this.adapter('workspace');
    if (this.workspaceId === workspace.workspaceId && this.topics.ready) return;
    this.generation++; this.workspaceId = workspace.workspaceId; this.running = null;
    const recovery = await this.topics.open(); this.warnings = recovery.warnings; this.records = await allRecords(this.topics);
  }
  async inventory() {
    const notes = [];
    for (let offset = 0;; offset += 50) { const page = await this.request('referenceInventory', {offset}); notes.push(...page.notes); if (!page.hasMore) return notes; }
  }
  sync() {
    if (this.running) { this.again = true; return this.running; }
    const generation = this.generation;
    const operation = this.reconcile(generation).finally(() => { if (generation === this.generation) { this.running = null; this.changed(); if (this.again) { this.again = false; this.sync().catch(error => { this.warnings = [error.message]; this.changed(); }); } } });
    this.running = operation; return operation;
  }
  async reconcile(generation) {
    const workspace = this.workspaceId;
    const call = (cmd, args = {}) => this.adapter(cmd, {workspaceId: workspace, ...args});
    const previous = new Map((await this.inventory()).map(note => [note.path, note]));
    const result = await call('metadata');
    if (generation !== this.generation) return;
    this.directories = [...new Set(result.notes.filter(n => safePath(n.path)).map(n => n.path.includes('/') ? n.path.slice(0,n.path.lastIndexOf('/')) : ''))];
    this.root = result.root; this.warnings = result.warnings || [];
    await this.topics.serialize(() => this.topics.recover()); this.records = await allRecords(this.topics);
    const seen = new Set(); let reads = 0;
    for (const [position, note] of result.notes.entries()) {
      if (generation !== this.generation) return;
      if (!safePath(note.path)) continue;
      seen.add(note.path); const old = previous.get(note.path);
      if (!old || old.modified !== note.modified || old.size !== note.size) {
        try {
          const {text} = await call('read', {path: note.path}); reads++;
          const record = referenceRecord(note, text);
          await call('referencePut', {record, search: `${record.title}\n${text}`});
        } catch (error) { this.warnings.push(`${note.path}: ${error.message}`); }
      }
      const topics = this.records.filter(topic => topic.sources.some(source => source.path === note.path)).map(topic => topic.entityId).join(',');
      await call('referenceTags', {path: note.path, topics});
      this.progress = `${position + 1}/${result.notes.length}; ${reads} bodies read`;
      if (position % 25 === 0) { this.changed(); await new Promise(resolve => setTimeout(resolve, 0)); }
    }
    // An incomplete enumeration is never evidence that files disappeared.
    if (!this.warnings.length) for (const path of previous.keys()) if (!seen.has(path)) await call('referenceRemove', {path});
    this.lastReads = reads; this.changed();
  }
  query(options = {}) { return this.request('referenceQuery', options); }
  async saveTopic(name, previous = null, retry = null) {
    if (!name?.trim()) throw Error('请填写主题名称');
    const saved = await this.topics.save({...previous, description: name.trim()}, previous, retry);
    try { this.records = await allRecords(this.topics); this.changed(); }
    catch (error) { error.record = saved.record; error.revisionSaved = true; throw error; }
  }
  async link(topic, note, linked) {
    const sources = topic.sources.filter(source => source.path !== note.path);
    if (linked) sources.push({path: note.path, quote: '', fingerprint: note.fingerprint});
    let committed = false;
    try {
      await this.topics.save({...topic, sources}, topic); committed = true;
      this.records = await allRecords(this.topics);
      await this.request('referenceTags', {path: note.path, topics: this.records.filter(t => t.sources.some(s => s.path === note.path)).map(t => t.entityId).join(',')});
      this.changed();
    } catch (error) {
      // A persisted association needs index recovery, not another stale-parent save.
      error.associationSaved = committed || Boolean(error.revisionSaved); throw error;
    }
  }
}
