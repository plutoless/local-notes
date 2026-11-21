// Private candidates never participate in the active task until explicit recovery.
export const syncDraftKey = (workspaceId, type, id) => `sync-draft:${workspaceId}:${type}:${id}`;
export function readSyncDraft(storage, key) {
  try {
    const value=JSON.parse(storage.getItem(key));
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
