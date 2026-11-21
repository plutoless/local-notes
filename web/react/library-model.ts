import {safePath} from '../core.js';
export interface LibraryNote {path: string; title: string; excerpt?: string; modified?: number; fingerprint?: string; archived?: boolean}
export interface LibraryPage {notes: LibraryNote[]; total?: number; hasMore: boolean}
export function libraryPage(value: unknown): LibraryPage {
  if (!value || typeof value !== 'object') throw Error('笔记列表数据无效，请刷新重试。');
  const page = value as Record<string, unknown>;
  if (!Array.isArray(page.notes) || typeof page.hasMore !== 'boolean' ||
      (page.total !== undefined && (!Number.isSafeInteger(page.total) || (page.total as number) < 0))) throw Error('笔记列表数据无效，请刷新重试。');
  for (const note of page.notes) {
    if (!note || typeof note !== 'object' || typeof note.path !== 'string' || !safePath(note.path) ||
        typeof note.title !== 'string' || (note.excerpt !== undefined && typeof note.excerpt !== 'string') ||
        (note.modified !== undefined && !Number.isFinite(note.modified))) throw Error('笔记列表数据无效，请刷新重试。');
  }
  return value as LibraryPage;
}
export interface LibraryControlsModel {
  order: string; archives: string; topic: string; topics: {entityId: string; description: string}[];
  directory: string; progress: string; detail?: string; count: string;
  refreshing: boolean; previous: boolean; next: boolean;
}
export interface LibraryCallbacks {
  filter: (key: 'order'|'archives'|'topic', value: string) => void;
  refresh: () => void; parent: () => void; page: (direction: number) => void;
  createTopic: (opener: HTMLButtonElement) => void; renameTopic: (opener: HTMLButtonElement) => void;
}

export function noteReply(value: unknown): {text:string} {
  if (!value || typeof value !== 'object' || typeof (value as Record<string,unknown>).text !== 'string') throw Error('笔记数据无效，请重新打开。');
  return value as {text:string};
}
