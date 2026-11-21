// Presentation-only projections preserve record/source identity and input order.
export function initiativeSources(sources, role) {
  return sources.filter(source => source.role === role);
}
export function initiativeEnding(actions, initiatives, currentId, decisions = {}) {
  const unfinished = actions.filter(action => action.initiativeId === currentId && !['completed', 'canceled'].includes(action.status));
  return {
    choices: unfinished.map(action => ({action, value: decisions[action.entityId] || ''})),
    targets: initiatives.filter(item => item.entityId !== currentId && item.status !== 'ended')
  };
}
