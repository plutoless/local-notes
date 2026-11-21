// Private candidates never participate in the active task until explicit recovery.
export const syncDraftKey = (workspaceId, type, id) => `sync-draft:${workspaceId}:${type}:${id}`;
export function readSyncDraft(storage, key, identity) {
  try {
    const value=JSON.parse(storage.getItem(key));
    if(value?.retryRecord && (!identity || !syncRetryIdentity(value.retryRecord,identity)))return null;
    return value && typeof value.json==='string' && typeof value.selected==='string' &&
      Array.isArray(value.tips) && value.tips.every(t=>typeof t==='string') ? value : null;
  } catch { return null; }
}
export function editSyncValue(value, field, input) {
  if(field==='json') {
    try {const parsed=JSON.parse(input);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid resolution');return {value:parsed,json:input,invalid:false};}
    catch{return {value,json:input,invalid:true};}
  }
  const next={...value,[field]:field==='focusPosition'?(input===''?null:Number(input)):input};
  return {value:next,json:JSON.stringify(next,null,2),invalid:false};
}

export function syncRetryIdentity(record, identity) {
  return record?.workspaceId===identity.workspaceId && record?.entityType===identity.entityType &&
    record?.entityId===identity.entityId && typeof record?.revision==='string';
}
export async function verifiedSyncRetry(repository, retry, identity) {
  if(!syncRetryIdentity(retry,identity))throw Error('Recovery record does not belong to this task');
  const stored=(await repository.history(identity.entityId)).find(record=>record.revision===retry.revision);
  if(!stored || JSON.stringify(stored)!==JSON.stringify(retry))throw Error('Retained revision changed or is unavailable; inspect local history before retrying');
  return stored;
}
export function updateSyncDraft(storage,key,value) {
  try {if(value===null)storage.removeItem(key);else storage.setItem(key,JSON.stringify(value));return true;}
  catch{return false;}
}
