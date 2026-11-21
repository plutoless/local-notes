export interface BrowseContext {
  order:string; archives:string; offset:number; directory:string; topic:string; search:string;
  selectedPath?:string|null; browseScroll:number; browseListScroll:number;
}
export class CollectionContexts {
  private contexts=new Map<string,BrowseContext>();
  private active:string|null=null;
  switch(next:string,current:BrowseContext):BrowseContext|null {
    if(this.active)this.contexts.set(this.active,{...current});
    if(!['notes','favorites'].includes(next))return null;
    this.active=next;
    return {...(this.contexts.get(next)||{order:'current',archives:'include',offset:0,directory:'*',topic:'',search:'',selectedPath:null,browseScroll:0,browseListScroll:0})};
  }
}
