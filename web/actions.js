export const ACTION_STATES = ['todo', 'in-progress', 'waiting', 'completed', 'canceled'];
const newUUID = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function validateAction(record) {
  if (record.formatVersion !== 1 || record.entityType !== 'action' || !uuid(record.entityId) || !uuid(record.revision) || !uuid(record.workspaceId)) throw Error('Invalid or unsupported action record');
  if (!Array.isArray(record.parents) || record.parents.some(parent => !uuid(parent)) || record.parents.includes(record.revision)) throw Error('Invalid revision parents');
  if (!ACTION_STATES.includes(record.status) || typeof record.description !== 'string' || !record.description.trim()) throw Error('An action needs a description and valid state');
  if (record.initiativeId !== null && (typeof record.initiativeId !== 'string' || !record.initiativeId.trim())) throw Error('Invalid initiative assignment');
  if (record.dueDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(record.dueDate) || new Date(record.dueDate).toISOString().slice(0, 10) !== record.dueDate)) throw Error('Invalid due date');
  if (record.waitingOn !== null && typeof record.waitingOn !== 'string') throw Error('Invalid waiting condition');
  if (!Array.isArray(record.sources) || record.sources.some(source => !source || typeof source.path !== 'string' || !source.path || source.path.startsWith('/') || source.path.includes('\\') || source.path.split('/').some(part => !part || part.startsWith('.') || ['credentials', 'localnotesdata'].includes(part.toLowerCase())) || !/\.md$/i.test(source.path) || typeof source.quote !== 'string' || typeof source.fingerprint !== 'string')) throw Error('Invalid source reference');
  if (typeof record.modifiedAt !== 'string' || !Number.isFinite(Date.parse(record.modifiedAt))) throw Error('Invalid modification time');
  return record;
}
export function isOverdue(action, today = new Date().toLocaleDateString('en-CA')) {
  return Boolean(action.dueDate && action.dueDate < today && !['completed', 'canceled'].includes(action.status));
}

// The adapter is the file/index boundary. All commits on this device are serialized here.
export class ActionRepository {
  constructor(adapter, {newId = newUUID, now = () => new Date().toISOString()} = {}) {
    this.adapter = adapter; this.newId = newId; this.now = now; this.queue = Promise.resolve(); this.workspaceId = null; this.heads = new Map();
  }
  serialize(operation) {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  request(cmd, args = {}) { return this.adapter(cmd, {workspaceId: this.workspaceId, ...args}); }
  async open() {
    const workspace = await this.adapter('workspace');
    this.workspaceId = workspace.workspaceId;
    const recovery = await this.recover();
    return {...workspace, ...recovery};
  }
  async recover() {
    const {files} = await this.request('actionFiles');
    const revisions = new Map(), currents = new Map(), warnings = [];
    for (const [path, text] of Object.entries(files)) {
      try {
        const record = validateAction(JSON.parse(text));
        if (record.workspaceId !== this.workspaceId) throw Error('Record belongs to another workspace');
        const revisionPath = `revisions/${record.entityId}/${record.revision}.json`;
        if (path === revisionPath) {
          if (!revisions.has(record.entityId)) revisions.set(record.entityId, new Map());
          revisions.get(record.entityId).set(record.revision, record);
        } else if (path === `actions/${record.entityId}.json`) currents.set(record.entityId, record);
        else throw Error('Record path does not match its ID');
      } catch (error) { warnings.push(`${path}: ${error.message}`); }
    }
    const records = [];
    for (const [id, history] of revisions) {
      const parents = new Set([...history.values()].flatMap(record => record.parents));
      const tips = [...history.values()].filter(record => !parents.has(record.revision));
      const incomplete = [...history.values()].some(record => record.parents.some(parent => !history.has(parent)));
      if (incomplete || tips.length !== 1) {
        warnings.push(`${id}: ${incomplete ? 'Incomplete revision history' : 'Divergent revisions retained; synchronization resolution is required'}`);
        // Keep the last fully indexed view when possible; never choose a winner by time.
        const current = currents.get(id);
        if (current && history.has(current.revision)) records.push(current);
        continue;
      }
      const record = tips[0];
      if (currents.get(id)?.revision !== record.revision || JSON.stringify(currents.get(id)) !== JSON.stringify(record)) {
        await this.request('actionWrite', {path: `actions/${id}.json`, text: JSON.stringify(record)});
      }
      records.push(record);
    }
    for (const id of currents.keys()) if (!revisions.has(id)) warnings.push(`${id}: Current record has no committed revision; original retained`);
    await this.request('actionIndex', {records});
    this.heads = new Map(records.map(record => [record.entityId, record.revision]));
    return {warnings};
  }
  async query(options = {}) {
    try { return await this.request('actionQuery', options); }
    catch (error) {
      if (!error.message.includes('INDEX_REBUILD_REQUIRED')) throw error;
      await this.serialize(() => this.recover());
      return this.request('actionQuery', options);
    }
  }
  async history(entityId) {
    const {files} = await this.request('actionFiles');
    return Object.entries(files).filter(([path]) => path.startsWith(`revisions/${entityId}/`)).flatMap(([, text]) => {
      try { return [validateAction(JSON.parse(text))]; } catch { return []; }
    });
  }
  save(fields, previous = null, retry = null) {
    return this.serialize(async () => {
      if (!retry && previous && this.heads.get(previous.entityId) !== previous.revision) throw Error('Action changed; reopen it before editing');
      const record = retry || validateAction({
        formatVersion: 1, entityType: 'action', workspaceId: this.workspaceId,
        entityId: previous?.entityId || this.newId(), revision: this.newId(), parents: previous ? [previous.revision] : [],
        description: fields.description.trim(), status: fields.status || 'todo', initiativeId: fields.initiativeId?.trim() || null,
        dueDate: fields.dueDate || null, waitingOn: fields.waitingOn?.trim() || null,
        sources: structuredClone(fields.sources || []), modifiedAt: this.now()
      });
      validateAction(record);
      let revisionSaved = false;
      try {
        await this.request('actionWrite', {path: `revisions/${record.entityId}/${record.revision}.json`, text: JSON.stringify(record)});
        revisionSaved = true;
        await this.request('actionWrite', {path: `actions/${record.entityId}.json`, text: JSON.stringify(record)});
        await this.request('actionIndex', {record});
        this.heads.set(record.entityId, record.revision);
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
