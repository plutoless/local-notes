import {ActionRepository, validateAction} from './actions.js';
export const INITIATIVE_STATES = ['active', 'later', 'ended'];
export function validateInitiative(record) {
  validateAction({...record, entityType: 'action', status: 'todo'});
  if (record.entityType !== 'initiative' || !INITIATIVE_STATES.includes(record.status) || typeof record.title !== 'string' || !record.title.trim() || typeof record.goal !== 'string' || typeof record.progress !== 'string') throw Error('Invalid initiative');
  if (record.sources.some(source => !['working-note', 'reference'].includes(source.role))) throw Error('Invalid note role');
  return record;
}
export class InitiativeRepository extends ActionRepository {
  constructor(adapter, options = {}) { super(adapter, {...options, entityType: 'initiative', validate: validateInitiative}); }
}
export async function allRecords(repository) {
  const records = [];
  for (let offset = 0; ; offset += 50) {
    const page = await repository.query({limit: 50, offset}); records.push(...page.actions);
    if (!page.hasMore) return records;
  }
}
export const unfinished = action => !['completed', 'canceled'].includes(action.status);
export async function endInitiative(repository, actions, initiative, decisions, fields = initiative, onActionCommitted = () => {}) {
  await actions.serialize(() => actions.recover());
  // Each action is an independent commit. A retry only needs to handle those still unfinished.
  for (const action of (await allRecords(actions)).filter(a => a.initiativeId === initiative.entityId && unfinished(a))) {
    const decision = decisions[action.entityId];
    if (!decision || !['completed', 'canceled', 'independent', 'move'].includes(decision.kind)) throw Error('Choose how to handle every unfinished action');
    if (decision.kind === 'move') {
      const target = (await allRecords(repository)).find(item => item.entityId === decision.target && item.status !== 'ended' && item.entityId !== initiative.entityId);
      if (!target) throw Error('Choose an active or later destination initiative');
    }
  }
  for (const action of (await allRecords(actions)).filter(a => a.initiativeId === initiative.entityId && unfinished(a))) {
    const decision = decisions[action.entityId];
    if (!decision) throw Error('Actions changed; review unfinished actions again');
    const fields = {...action};
    if (['completed', 'canceled'].includes(decision.kind)) fields.status = decision.kind;
    else fields.initiativeId = decision.kind === 'move' ? decision.target : null;
    const result = await actions.save(fields, action); onActionCommitted(result.record);
  }
  if ((await allRecords(actions)).some(a => a.initiativeId === initiative.entityId && unfinished(a))) throw Error('Actions changed; review unfinished actions again');
  return repository.save({...fields, status: 'ended'}, initiative);
}
export function fingerprint(text) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}
export async function sourceState(source, read, list) {
  try {
    const {text} = await read(source.path);
    if (fingerprint(text) === source.fingerprint) return {state: 'available', path: source.path};
    return {state: 'changed', path: source.path};
  } catch {
    const matches = (await list()).filter(note => (note.fingerprint || (note.text && fingerprint(note.text))) === source.fingerprint && (!note.text || note.text.includes(source.quote)));
    if (matches.length === 1) return {state: 'moved', path: matches[0].path};
    return {state: matches.length ? 'ambiguous' : 'unavailable', path: null};
  }
}
// Moving in the app updates every confirmed reference, preserving action and initiative IDs.
export async function moveReferences(repositories, from, to) {
  for (const repository of repositories) {
    await repository.serialize(() => repository.recover());
    for (const record of await allRecords(repository)) {
    if (record.sources.some(source => source.path === from)) await repository.save({...record, sources: record.sources.map(source => source.path === from ? {...source, path: to} : source)}, record);
    }
  }
}
