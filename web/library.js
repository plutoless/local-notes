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
// Strip only a complete leading frontmatter block; malformed/plain text stays source text.
export function referenceBody(text) {
  return text.replace(/^\uFEFF?---[^\S\r\n]*\r?\n(?:[\s\S]*?\r?\n)?(?:---|\.\.\.)[^\S\r\n]*(?:\r?\n|$)/, '');
}
function referenceExcerpt(body) {
  let fence = null;
  const lines = body.replace(/^# .+\r?\n?/, '').split(/\r?\n/).map(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker && (!fence || (marker[1][0] === fence[0] && marker[1].length >= fence.length))) {
      fence = fence ? null : marker[1]; return '';
    }
    if (fence) return line;
    return line.replace(/^\s*(?:#{1,6}\s+|>\s?|[-+*]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)/, '')
      .split(/(`+[^`]*`+)/g).map((part, index) => index % 2 ? part.replace(/^`+|`+$/g, '') : part
        .replace(/!?\[([^\]]*)\]\([^\n)]*\)/g, '$1')
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/(?<![\p{L}\p{N}_])(\*\*|__|~~|\*|_)(?=\S)(.+?)\1(?![\p{L}\p{N}_])/gu, '$2')).join('');
  });
  return lines.join(' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}
export function archivedPath(path) { return path.split('/').slice(0, -1).some(part => ['archive', 'archives', 'archived', '归档'].includes(part.toLowerCase())); }
export function referenceRecord(note, text) {
  const directory = note.path.includes('/') ? note.path.slice(0, note.path.lastIndexOf('/')) : '';
  const body = referenceBody(text);
  return {...note, searchVersion: 1, summaryVersion: 1, directory, title: titleOf(body, note.path), excerpt: referenceExcerpt(body), fingerprint: fingerprint(text)};
}
export function referenceSearchText(title, text) { return `${title}\n${referenceBody(text)}`; }
// One body at a time keeps editor requests responsive while the initial index fills.
export class Library {
  constructor(adapter, changed = () => {}) { this.adapter = adapter; this.changed = changed; this.generation = 0; this.topics = new TopicRepository(adapter); this.running = null; this.revision = 0; }
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
      if (!old || old.modified !== note.modified || old.size !== note.size || old.searchVersion !== 1 || old.summaryVersion !== 1) {
        try {
          const {text} = await call('read', {path: note.path});
          if (generation !== this.generation) return;
          reads++;
          const record = referenceRecord(note, text);
          await call('referencePut', {record, search: referenceSearchText(record.title, text)}); this.revision++;
        } catch (error) {
          if (generation !== this.generation) return;
          this.warnings.push(`${note.path}: ${error.message}`);
        }
      }
      if (generation !== this.generation) return;
      const topics = this.records.filter(topic => topic.sources.some(source => source.path === note.path)).map(topic => topic.entityId).join(',');
      if ((await call('referenceTags', {path: note.path, topics})).changed) this.revision++;
      this.progress = `${position + 1}/${result.notes.length}; ${reads} bodies read`;
      if (position % 25 === 0) { this.changed(); await new Promise(resolve => setTimeout(resolve, 0)); }
    }
    // An incomplete enumeration is never evidence that files disappeared.
    if (!this.warnings.length) for (const path of previous.keys()) if (!seen.has(path)) { await call('referenceRemove', {path}); this.revision++; }
    this.lastReads = reads; this.changed();
  }
  async indexSource(note, text) {
    // A direct reader route rebuilds only its already-read source descriptor.
    const workspace = this.workspaceId, record = referenceRecord(note, text);
    const topics = this.records.filter(topic => topic.sources.some(source => source.path === note.path)).map(topic => topic.entityId).join(',');
    const previous = (await this.query({exactPath: note.path})).notes[0];
    await this.adapter('referencePut', {workspaceId: workspace, record, search: referenceSearchText(record.title, text)});
    if (['fingerprint', 'modified', 'size', 'title', 'summaryVersion', 'searchVersion'].some(key => previous?.[key] !== record[key])) this.revision++;
    if ((await this.adapter('referenceTags', {workspaceId: workspace, path: note.path, topics})).changed) this.revision++;
  }
  query(options = {}) { return this.request('referenceQuery', options); }
  async saveTopic(name, previous = null, retry = null, note = null) {
    if (!name?.trim()) throw Error('请填写主题名称');
    if (!retry && (await allRecords(this.topics)).some(topic => topic.entityId !== previous?.entityId && topic.description.trim() === name.trim())) throw Error('已存在同名主题，请选择已有主题。');
    const fields = {...previous, description: name.trim()};
    if (!previous && note) fields.sources = [{path: note.path, quote: '', fingerprint: note.fingerprint}];
    const saved = await this.topics.save(fields, previous, retry);
    try {
      this.records = await allRecords(this.topics);
      if (note && (await this.request('referenceTags', {path: note.path, topics: this.records.filter(t => t.sources.some(s => s.path === note.path)).map(t => t.entityId).join(',')})).changed) this.revision++;
      this.changed(); return saved.record;
    }
    catch (error) { error.record = saved.record; error.revisionSaved = true; throw error; }
  }
  async link(topic, note, linked) {
    const sources = topic.sources.filter(source => source.path !== note.path);
    if (linked) sources.push({path: note.path, quote: '', fingerprint: note.fingerprint});
    let committed = false;
    try {
      await this.topics.save({...topic, sources}, topic); committed = true;
      this.records = await allRecords(this.topics);
      if ((await this.request('referenceTags', {path: note.path, topics: this.records.filter(t => t.sources.some(s => s.path === note.path)).map(t => t.entityId).join(',')})).changed) this.revision++;
      this.changed();
    } catch (error) {
      // A persisted association needs index recovery, not another stale-parent save.
      error.associationSaved = committed || Boolean(error.revisionSaved); throw error;
    }
  }
}
