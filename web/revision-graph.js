// Arrival order and wall-clock time never establish ancestry.
export function revisionState(history) {
  const parents = new Set([...history.values()].flatMap(record => record.parents));
  const tips = [...history.values()].filter(record => !parents.has(record.revision));
  const visiting = new Set(), visited = new Set();
  let incomplete = false, cyclic = false;
  function visit(id) {
    if (visiting.has(id)) { cyclic = true; return; }
    if (visited.has(id)) return;
    const record = history.get(id);
    if (!record) { incomplete = true; return; }
    visiting.add(id); record.parents.forEach(visit); visiting.delete(id); visited.add(id);
  }
  history.forEach(record => visit(record.revision));
  return {tips, incomplete, cyclic};
}
export function conflictView(history, state) {
  // Show a deterministic review placeholder; never expose a completed/ended branch as resolved.
  const record = structuredClone([...history.values()].sort((a, b) => a.revision.localeCompare(b.revision))[0]);
  record.syncState = state.incomplete ? 'incomplete' : 'conflict';
  record.status = record.entityType === 'initiative' ? 'active' : 'todo';
  record.deleted = false;
  record.description = `[${record.syncState === 'incomplete' ? 'Sync incomplete' : 'Conflict'}] ${record.description}`;
  if (record.entityType === 'initiative') record.title = record.description;
  record.focusPosition = null;
  return record;
}
