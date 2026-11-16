import {revisionState, conflictView} from './revision-graph.js';
import {safePath} from './core.js';
export const ACTION_STATES = ['todo', 'in-progress', 'waiting', 'completed', 'canceled'];
export const newUUID = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function validateAction(record) {
  if (record.formatVersion !== 1 || record.entityType !== 'action' || !uuid(record.entityId) || !uuid(record.revision) || !uuid(record.workspaceId)) throw Error('Invalid or unsupported action record');
  if (record.deleted !== undefined && typeof record.deleted !== 'boolean') throw Error('Invalid tombstone');
  if (!Array.isArray(record.parents) || record.parents.some(parent => !uuid(parent)) || record.parents.includes(record.revision)) throw Error('Invalid revision parents');
  if (!ACTION_STATES.includes(record.status) || typeof record.description !== 'string' || !record.description.trim()) throw Error('An action needs a description and valid state');
  if (record.focusPosition != null && (!Number.isFinite(record.focusPosition) || !['todo', 'in-progress'].includes(record.status))) throw Error('Invalid focus selection');
  if (record.initiativeId !== null && (typeof record.initiativeId !== 'string' || !record.initiativeId.trim())) throw Error('Invalid initiative assignment');
  if (record.dueDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(record.dueDate) || new Date(record.dueDate).toISOString().slice(0, 10) !== record.dueDate)) throw Error('Invalid due date');
  if (record.waitingOn !== null && typeof record.waitingOn !== 'string') throw Error('Invalid waiting condition');
  if (!Array.isArray(record.sources) || record.sources.some(source => !source || typeof source.path !== 'string' || !safePath(source.path) || typeof source.quote !== 'string' || typeof source.fingerprint !== 'string')) throw Error('Invalid source reference');
  if (typeof record.modifiedAt !== 'string' || !Number.isFinite(Date.parse(record.modifiedAt))) throw Error('Invalid modification time');
  return record;
}
export function isOverdue(action, today = new Date().toLocaleDateString('en-CA')) {
  return Boolean(action.dueDate && action.dueDate < today && !['completed', 'canceled'].includes(action.status));
}

// The adapter is the file/index boundary. All commits on this device are serialized here.
export class ActionRepository {
  constructor(adapter, {newId = newUUID, now = () => new Date().toISOString(), entityType = 'action', validate = validateAction} = {}) {
    this.entityType = entityType; this.validate = validate; this.collection = entityType === 'action' ? 'actions' : entityType === 'topic' ? 'topics' : 'initiatives'; this.adapter = adapter; this.newId = newId; this.now = now; this.queue = Promise.resolve(); this.workspaceId = null; this.heads = new Map(); this.ready = false;
  }
  serialize(operation) {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  request(cmd, args = {}) { return this.adapter(cmd, {workspaceId: this.workspaceId, entityType: this.entityType, ...args}); }
  async open({cached = false, progress = () => {}} = {}) {
    this.ready = false; this.indexedSnapshot = null;
    const workspace = await this.adapter('workspace');
    this.workspaceId = workspace.workspaceId;
    this.progress = progress;
    if (cached) {
      try { await this.request('actionQuery', {limit: 1}); this.ready = true; this.needsRefresh = true; return {...workspace, warnings: []}; }
      catch (error) {
        if (!/INDEX_REBUILD_REQUIRED|malformed|not a database|corrupt/i.test(error.message)) throw error;
        await this.request('actionIndex', {records: []});
        this.ready = true; this.needsRefresh = true;
        this.progress?.(`Building ${this.collection} index in background…`);
        return {...workspace, warnings: []};
      }
    }
    const recovery = await this.recover();
    this.ready = true;
    return {...workspace, ...recovery};
  }
  async recover() {
    this.progress?.('Reading confirmed revisions…');
    const result = await this.request('actionFiles', {known: this.fileStamps || {}});
    const fileWarnings = result.warnings || [];
    const files = result.stamps ? Object.fromEntries(Object.keys(result.stamps).map(path => [path, result.files[path] ?? this.fileCache?.[path]]).filter(([,text]) => text !== undefined)) : result.files;
    this.fileCache = files; this.fileStamps = result.stamps;
    this.parsedFiles ||= new Map();
    this.progress?.(`Rebuilding ${this.collection}: ${Object.keys(files).length} record files…`);
    const revisions = new Map(), currents = new Map(), warnings = fileWarnings.map(warning => `${warning.path}: ${warning.message}`);
    this.conflicts = new Map();
    const damaged = new Set(fileWarnings.map(warning => warning.path));
    let processed = 0; const fileCount = Object.keys(files).length;
    for (const [path, text] of Object.entries(files)) {
      if (++processed % 50 === 0) { this.progress?.(`Indexing ${this.collection}: ${processed}/${fileCount} files`); await new Promise(resolve => setTimeout(resolve, 0)); }
      try {
        const cached = this.parsedFiles.get(path);
        const parsed = cached?.text === text ? cached.record : JSON.parse(text);
        this.parsedFiles.set(path, {text, record: parsed});
        if (parsed.entityType !== this.entityType) continue;
        const record = this.validate(parsed);
        if (record.workspaceId !== this.workspaceId) throw Error('Record belongs to another workspace');
        const revisionPath = `revisions/${record.entityId}/${record.revision}.json`;
        const canonical = path === revisionPath || path === `${this.collection}/${record.entityId}.json`;
        const conflictCopy = path.includes('.sync-conflict-') && path.endsWith('.json');
        if (!canonical && !conflictCopy) throw Error('Record path does not match its ID');
        const history = revisions.get(record.entityId) || new Map();
        if (history.has(record.revision) && JSON.stringify(history.get(record.revision)) !== JSON.stringify(record)) throw Error('Revision identity has incompatible content');
        // Preserve a current file or Syncthing conflict copy before any repair can replace it.
        if (path !== revisionPath && !Object.hasOwn(files, revisionPath)) await this.request('actionWrite', {path: revisionPath, text: JSON.stringify(record)});
        history.set(record.revision, record);
        revisions.set(record.entityId, history);
        if (path === `${this.collection}/${record.entityId}.json`) currents.set(record.entityId, record);
      } catch (error) { damaged.add(path); warnings.push(`${path}: ${error.message}`); }
    }
    const records = [];
    for (const [id, history] of revisions) {
      const state = revisionState(history);
      if ([...damaged].some(path => path.startsWith(`revisions/${id}/`) || path.startsWith(`${this.collection}/${id}`))) state.incomplete = true;
      if (state.incomplete || state.cyclic || state.tips.length !== 1) {
        warnings.push(`${id}: ${state.incomplete ? 'Incomplete revision history' : 'Divergent or cyclic revisions retained; synchronization resolution is required'}`);
        this.conflicts.set(id, {...state, versions: [...history.values()]});
        records.push(conflictView(history, state));
        continue;
      }
      const record = state.tips[0];
      if (!damaged.has(`${this.collection}/${id}.json`) && (currents.get(id)?.revision !== record.revision || JSON.stringify(currents.get(id)) !== JSON.stringify(record))) {
        await this.request('actionWrite', {path: `${this.collection}/${id}.json`, text: JSON.stringify(record)});
      }
      records.push(record);
    }
    for (const id of currents.keys()) if (!revisions.has(id)) warnings.push(`${id}: Current record has no committed revision; original retained`);
    if (damaged.size) {
      try {
        for (let offset = 0;; offset += 100) {
          const page = await this.request('actionQuery', {limit: 100, offset});
          for (const old of page.actions) if (!revisions.has(old.entityId)) {
            records.push(conflictView(new Map([[old.revision, old]]), {incomplete: true}));
            this.conflicts.set(old.entityId, {incomplete: true, tips: [], versions: [old]});
          }
          if (!page.hasMore) break;
        }
      } catch (error) { if (!/INDEX_REBUILD_REQUIRED|malformed|not a database|corrupt/i.test(error.message)) throw error; }
    }
    const snapshot = JSON.stringify(records.filter(record => !record.deleted).sort((a,b) => a.entityId.localeCompare(b.entityId)));
    if (this.indexedSnapshot !== snapshot) {
      if (!this.indexedSnapshot) await this.request('actionIndex', {records: JSON.parse(snapshot)});
      else {
        const previous = new Map(JSON.parse(this.indexedSnapshot).map(record => [record.entityId, record]));
        for (const record of JSON.parse(snapshot)) {
          if (JSON.stringify(previous.get(record.entityId)) !== JSON.stringify(record)) await this.request('actionIndex', {record});
          previous.delete(record.entityId);
        }
        for (const entityId of previous.keys()) await this.request('actionIndex', {record: {entityId, deleted: true}});
      }
      this.indexedSnapshot = snapshot;
    }
    this.heads = new Map(records.map(record => [record.entityId, record.revision]));
    this.progress?.(`${this.collection} index ready`);
    return {warnings};
  }
  async query(options = {}) {
    if (!this.ready) throw Error('Workspace is not ready; reopen it');
    try { const page = await this.request('actionQuery', options); for (const record of page.actions) if (!this.heads.has(record.entityId)) this.heads.set(record.entityId, record.revision); return page; }
    catch (error) {
      if (!/INDEX_REBUILD_REQUIRED|malformed|not a database|corrupt/i.test(error.message)) throw error;
      this.indexedSnapshot = null;
      await this.serialize(() => this.recover());
      return this.request('actionQuery', options);
    }
  }
  async history(entityId) {
    const {files} = await this.request('actionFiles');
    return Object.entries(files).filter(([path]) => path.startsWith(`revisions/${entityId}/`)).flatMap(([, text]) => {
      try { return [this.validate(JSON.parse(text))]; } catch { return []; }
    });
  }
  async resolve(entityId, fields, reviewedHeads = this.conflicts?.get(entityId)?.tips.map(record => record.revision)) {
    // save() owns the queue; the parent set is checked again inside its serialized operation.
    return this.save(fields, {entityId, workspaceId: this.workspaceId, revision: fields.revision}, null, reviewedHeads || []);
  }
  remove(previous) { return this.save({...previous, deleted: true}, previous); }
  save(fields, previous = null, retry = null, resolution = false) {
    return this.serialize(async () => {
      if (!this.ready) throw Error('Workspace is not ready; reopen it');
      if ((previous && previous.workspaceId !== this.workspaceId) || (retry && retry.workspaceId !== this.workspaceId)) throw Error('Workspace changed; reopen the action');
      if (previous || this.needsRefresh) await this.recover(); this.needsRefresh = false;
      this.resolving = null;
      if (resolution) {
        const conflict = this.conflicts?.get(previous.entityId);
        if (!conflict || conflict.incomplete || conflict.cyclic) throw Error('Wait for complete valid history before resolving');
        this.resolving = conflict.tips.map(record => record.revision);
        if (JSON.stringify([...resolution].sort()) !== JSON.stringify([...this.resolving].sort())) throw Error('Conflict changed; refresh and review all versions again');
      }
      if (previous && this.conflicts?.has(previous.entityId) && !this.resolving) throw Error('Resolve synchronization conflict before editing');
      if (previous && !this.heads.has(previous.entityId)) await this.query({entityId: previous.entityId, limit: 1});
      if (!resolution && !retry && previous && this.heads.get(previous.entityId) !== previous.revision) throw Error('Action changed; reopen it before editing');
      const record = retry || this.validate({
        ...fields,
        formatVersion: 1, entityType: this.entityType, workspaceId: this.workspaceId,
        entityId: previous?.entityId || this.newId(), revision: this.newId(), parents: this.resolving || (previous ? [previous.revision] : []),
        description: (this.entityType === 'initiative' ? fields.title : fields.description || '').trim(), status: fields.status || 'todo', initiativeId: fields.initiativeId?.trim() || null,
        focusPosition: this.entityType === 'action' && ['todo', 'in-progress'].includes(fields.status || 'todo') ? (Object.hasOwn(fields, 'focusPosition') ? fields.focusPosition : previous?.focusPosition ?? null) : null,
        dueDate: fields.dueDate || null, waitingOn: fields.waitingOn?.trim() || null,
        sources: structuredClone(fields.sources || []), modifiedAt: this.now()
      });
      delete record.syncState; this.resolving = null;
      this.validate(record);
      let revisionSaved = false;
      try {
        await this.request('actionWrite', {path: `revisions/${record.entityId}/${record.revision}.json`, text: JSON.stringify(record)});
        revisionSaved = true;
        this.heads.set(record.entityId, record.revision);
        await this.request('actionWrite', {path: `${this.collection}/${record.entityId}.json`, text: JSON.stringify(record)});
        if (record.deleted) await this.recover();
        else {
          await this.request('actionIndex', {record});
          if (this.indexedSnapshot) { const rows = JSON.parse(this.indexedSnapshot).filter(row => row.entityId !== record.entityId); rows.push(record); rows.sort((a,b) => a.entityId.localeCompare(b.entityId)); this.indexedSnapshot = JSON.stringify(rows); }
        }
        return {record, recovered: false};
      } catch (cause) {
        // A verified immutable revision is a recoverable commit. Recovery must finish before success.
        if (revisionSaved) {
          try { const recovery = await this.recover(); return {record, recovered: true, ...recovery}; }
          catch (recoveryError) { cause = Error(`${cause.message}; recovery pending: ${recoveryError.message}`); }
        }
        const error = Error(`${revisionSaved ? 'Revision saved; recovery pending' : 'Not saved'}: ${cause.message}`);
        error.record = record; error.revisionSaved = revisionSaved; throw error;
      }
    });
  }
}
