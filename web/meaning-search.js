import {referenceBody} from './library.js';
import {fingerprint} from './initiatives.js';

const labels = {title: '标题', goal: '目标', progress: '进展', description: '正文', waitingOn: '等待条件'};
const sourceKey = (type, id) => JSON.stringify([type, id]);
function visibleTitle(text) {
  if (text.length <= 512) return text;
  const points = Array.from(text);
  return points.length <= 512 ? text : points.slice(0, 511).join('') + '…';
}

// Keep exact source slices and SQLite's one-based Unicode scalar offsets.
function* chunks(text) {
  const points = Array.from(text);
  let start = 0;
  while (start < points.length) {
    while (start < points.length && /\s/u.test(points[start])) start++;
    if (start >= points.length) return;
    let end = Math.min(points.length, start + 500);
    const window = points.slice(start, end);
    const paragraph = window.lastIndexOf('\n');
    if (end < points.length && paragraph >= 200) end = start + paragraph;
    const passage = points.slice(start, end).join('').trimEnd();
    if (passage) yield [start + 1, passage];
    start = end;
  }
}

export function meaningNoteChunks(record, text, workspaceId) {
  if (fingerprint(text) !== record.fingerprint) throw Error('Source changed during indexing');
  return {
    source: {type: 'note', workspaceId, title: visibleTitle(record.title), path: record.path,
      entityId: record.path, fingerprint: record.fingerprint, summaryVersion: 1},
    chunks: Array.from(chunks(referenceBody(text)), ([start, passage]) => ({start, passage})),
  };
}

export function meaningRecordChunks(type, record, workspaceId) {
  const title = visibleTitle(type === 'initiative' ? record.title : record.description);
  const fields = type === 'initiative' ? ['title', 'goal', 'progress'] : ['description', 'waitingOn'];
  return {
    source: {type, workspaceId, title, entityId: record.entityId,
      revision: record.revision, modifiedAt: record.modifiedAt},
    chunks: fields.flatMap(field => Array.from(chunks(record[field] || ''),
      ([start, passage]) => ({start, passage, field}))),
  };
}

function toResult({source, chunk}) {
  const {workspaceId, type, entityId, title} = source;
  const {start, passage, field} = chunk;
  if (type === 'note') return {
    ...source, passage, passageStart: start, meaning: true,
    identity: JSON.stringify([workspaceId, type, entityId, `body:${start}`]),
    contextLabel: `${source.path} · ${start}`, locator: source.path,
  };
  return {
    ...source, passage, passageId: field, meaning: true,
    identity: JSON.stringify([workspaceId, type, entityId, `${field}:${start}`]),
    contextLabel: `${labels[field]} · ${source.modifiedAt} · ${entityId.slice(0, 8)}`,
    locator: `${type === 'initiative' ? '事项' : '行动'}：${title} · ${entityId.slice(0, 8)}`,
  };
}

function overlaps(first, second) {
  if (first.type !== second.type || first.entityId !== second.entityId) return false;
  if (first.type !== 'note') return first.passageId === second.passageId;
  const end = row => row.passageStart + Array.from(row.passage).length;
  return first.passageStart < end(second) && second.passageStart < end(first);
}

export function appendMeaningResults(literal, related, term) {
  const rows = [...literal];
  const query = term.toLowerCase();
  // A literal match in this excerpt/title may follow on another keyword page.
  for (const match of related) {
    if (match.passage.toLowerCase().includes(query) || match.title.toLowerCase().includes(query)) continue;
    if (!rows.some(row => overlaps(row, match))) rows.push(match);
    if (rows.length >= literal.length + 5) break;
  }
  return rows;
}

export class MeaningSearch {
  constructor(adapter, changed) {
    this.adapter = adapter;
    this.changed = changed;
    this.reset();
  }
  reset() {
    this.session = Symbol();
    this.workspaceId = null;
    this.supported = false;
    this.enabled = false;
    this.state = '';
    this.loading = null;
    this.running = null;
    this.pendingEnabled = null;
    this.stale = new Set();
    this.again = false;
  }
  call(workspaceId, operation, data = {}) {
    return this.adapter('meaningSearch', {workspaceId, operation, ...data});
  }
  open(workspaceId) {
    if (this.workspaceId === workspaceId) return this.loading;
    this.reset();
    this.workspaceId = workspaceId;
    const session = this.session;
    this.loading = this.call(workspaceId, 'preference').then(preference => {
      if (this.session !== session || typeof preference.enabled !== 'boolean') return;
      this.supported = true;
      this.enabled = preference.enabled;
    }).catch(() => {}).finally(() => {
      if (this.session !== session) return;
      this.loading = null;
      this.changed();
    });
    return this.loading;
  }
  async configure(enabled) {
    const workspaceId = this.workspaceId, session = this.session;
    if (!this.supported || this.pendingEnabled !== null) return;
    const wasEnabled = this.enabled;
    this.pendingEnabled = enabled;
    if (!enabled) this.enabled = false;
    try {
      const result = await this.call(workspaceId, 'configure', {enabled});
      if (session !== this.session) return;
      this.enabled = result.enabled;
      this.state = this.enabled ? 'indexing' : '';
    } catch (error) {
      if (session === this.session) this.enabled = wasEnabled;
      throw error;
    } finally {
      if (session === this.session) { this.pendingEnabled = null; this.changed(); }
    }
  }
  sync(sources) {
    if (!this.enabled) return;
    if (this.running) { this.again = true; return this.running; }
    const workspaceId = this.workspaceId;
    const owns = () => this.enabled && this.workspaceId === workspaceId && this.running === operation;
    const bounded = (name, data) => this.call(workspaceId, name, data);
    this.state = 'indexing';
    const operation = (async () => {
      await bounded('status');
      if (!owns()) return;
      const {sources: previous} = await bounded('inventory');
      let partial = false;
      const existing = new Map(previous.map(item => [sourceKey(item.type, item.id), item]));
      for await (const source of sources()) {
        if (!owns()) return;
        const key = sourceKey(source.type, source.entityId);
        if (existing.get(key)?.version !== source.version) {
          try {
            const pieces = await source.read();
            if (!owns()) return;
            await bounded('put', {type: source.type, entityId: source.entityId, version: source.version, ...pieces});
            if (!owns()) return;
            this.stale.delete(key);
          } catch {
            if (!owns()) return;
            this.stale.add(key);
            partial = true;
          }
        } else this.stale.delete(key);
        existing.delete(key);
      }
      if (!owns()) return;
      for (const {type, id} of existing.values()) {
        if (!owns()) return;
        await bounded('remove', {type, entityId: id});
        if (owns()) this.stale.delete(sourceKey(type, id));
      }
      if (owns()) this.state = partial ? 'partial' : 'ready';
    })().catch(() => {
      if (owns()) this.state = 'unavailable';
    }).finally(() => {
      if (this.running !== operation) return;
      this.running = null;
      if (this.enabled && this.again) { this.again = false; this.sync(sources); }
      else this.changed();
    });
    this.running = operation;
    return operation;
  }
  accepts(result, scope) {
    return this.enabled && result?.workspaceId === this.workspaceId &&
      (scope === 'all' || result.type === scope) && !this.stale.has(sourceKey(result.type, result.entityId));
  }
  async query(query, scope) {
    const workspaceId = this.workspaceId, session = this.session;
    if (!this.enabled || !['ready', 'partial'].includes(this.state)) return [];
    try {
      const {matches} = await this.call(workspaceId, 'query', {query: Array.from(query).slice(0, 512).join(''), scope});
      if (!this.enabled || this.session !== session) return [];
      return matches.filter(({source}) => this.accepts(source, scope)).map(toResult);
    } catch {
      if (this.enabled && this.session === session && this.state !== 'indexing') {
        this.state = 'unavailable';
        this.changed();
      }
      return [];
    }
  }
}
