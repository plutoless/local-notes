export type SearchScope = 'all'|'note'|'initiative'|'action';
interface SearchIdentity {
  identity:string; workspaceId:string; entityId:string;
  title:string; contextLabel:string; passage:string; locator:string;
}
export type SearchResult = SearchIdentity & (
  {type:'note';path:string;passageStart:number;fingerprint:string;revision?:never} |
  {type:'initiative'|'action';revision:string;fingerprint?:never}
);
// Opaque invocation context belongs to app.js, never the presentation layer.
export interface SearchNavigation<Invocation = unknown> {
  capture?:()=>Invocation; owns:(origin:Invocation)=>boolean;
  sameWorkspace:(origin:Invocation)=>boolean;
  open?:(result:SearchResult,origin:Invocation,valid:()=>boolean)=>Promise<boolean>;
  restore:(origin:Invocation,valid:()=>boolean)=>Promise<boolean>;
  returnAvailable:(available:boolean)=>void; error:(message:string)=>void;
}
export interface SearchRow {
  note:SearchResult; query:string; text:string;
  node?:HTMLElement|null; source?:HTMLButtonElement|null;
}

// Expansion belongs to the exact indexed source version and typed query.
export function searchRows(notes:SearchResult[], query:string, previous:SearchRow[]):SearchRow[] {
  return notes.map(note=>{
    const old=previous.find(row=>row.note.identity===note.identity &&
      (row.note.fingerprint || row.note.revision)===(note.fingerprint || note.revision) && row.query===query);
    return {note,query,text:old?old.text:note.passage};
  });
}
