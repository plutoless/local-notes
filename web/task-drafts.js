// Migrate the old single workspace draft without deleting any other task's draft.
export function recoverTaskDraft(kind, workspaceId) {
  const prefix = `${kind}-draft:${workspaceId}`;
  const read = key => { try { const value = JSON.parse(localStorage.getItem(key)); return value?.fields ? value : null; } catch { return null; } };
  const legacy = read(prefix);
  if (legacy) {
    const key = `${prefix}:${legacy.previous?.entityId || 'new'}`;
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(legacy));
    // If another uncommitted draft already owns the canonical key, retain the
    // legacy candidate under its original identity for explicit recovery.
    if (localStorage.getItem(key) === JSON.stringify(legacy)) localStorage.removeItem(prefix);
    else return {key: prefix, value: legacy};
  }
  for (const key of Object.keys(localStorage).filter(key => key.startsWith(prefix + ':')).sort()) {
    const value = read(key); if (value) return {key, value};
  }
  return null;
}
