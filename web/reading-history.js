// Private navigation hints only: never a source of formal records or source text.
export class ReadingHistory {
  constructor(storage) { this.storage = storage; this.limit = 3; }
  key(workspace) { return 'reading-history:v1:' + workspace; }
  list(workspace) {
    if (!workspace) return [];
    try {
      const value = JSON.parse(this.storage.getItem(this.key(workspace)) || '[]');
      return Array.isArray(value) ? value.filter(item => item && typeof item.path === 'string' && typeof item.title === 'string' && typeof item.fingerprint === 'string' && item.scroll && Object.values(item.scroll).every(n => Number.isFinite(n) && n >= 0)).slice(0, this.limit) : [];
    } catch { return []; }
  }
  write(workspace, entries) {
    if (!workspace) return;
    this.storage.setItem(this.key(workspace), JSON.stringify(entries.slice(0, this.limit)));
  }
  remember(workspace, entry) {
    this.write(workspace, [entry, ...this.list(workspace).filter(item => item.path !== entry.path)]);
  }
  remove(workspace, path) { this.write(workspace, this.list(workspace).filter(item => item.path !== path)); }
  moved(workspace, from, to) {
    this.write(workspace, this.list(workspace).map(item => item.path === from ? {...item, path: to} : item).filter((item, index, all) => all.findIndex(other => other.path === item.path) === index));
  }
}
