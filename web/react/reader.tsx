import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {Button} from './components';
export interface ReaderModel {path:string; title:string; body:string; backLabel:string; reading:boolean; html:string; status:string; statusKind:string; statusDetail:string; saveHidden:boolean; statusHidden:boolean; capture:boolean; searchFallback:boolean; initiative:boolean; initiativeActionDisabled:boolean}
type ReaderAction = 'back'|'capture'|'save'|'mode'|'noteAction'|'passageAction'|'changed'|'remember';
export function readerView(container:HTMLElement) {
  const callbacks:Partial<Record<ReaderAction,()=>void>>={};
  let openInfo: (opener: HTMLButtonElement) => void = () => {};
  let editInitiative: (opener: HTMLButtonElement) => void = () => {};
  let newInitiativeAction: typeof editInitiative = () => {};
  let wiki:(target:string, opener:HTMLElement)=>void=()=>{};
  let model:ReaderModel={path:'',title:'',body:'',backLabel:'笔记库',reading:false,html:'',status:'已保存到本地',statusKind:'saved',statusDetail:'',saveHidden:false,statusHidden:false,capture:false,searchFallback:false,initiative:false,initiativeActionDisabled:true};
  let detailsOpen = false;
  function setDetailsOpen(open: boolean, restoreFocus = true) {
    if (detailsOpen === open) return false;
    detailsOpen = open;
    render();
    if (restoreFocus) container.querySelector<HTMLButtonElement>('#note-reference-open')?.focus();
    return true;
  }
  function Reader() {
    const invoke=(action:ReaderAction)=>()=>callbacks[action]?.();
    const input=(key:'title'|'body', value:string)=>{model={...model,[key]:value}; render(); callbacks.changed?.();};
    const dismissDetailsForReaderFocus = () => setDetailsOpen(false, false);
    return <>
      <div className="reader-header">
        <div className="toolbar reader-toolbar">
          <div className="reader-breadcrumb">
            <Button id="back" className="quiet ui-compact" onClick={invoke('back')} aria-label={`返回：${model.backLabel}`}>{model.backLabel}</Button>
            <span className="reader-breadcrumb-title"><span aria-hidden="true">/</span>{model.title || '无标题'}</span>
          </div>
          <Button id="mode" className="quiet ui-compact" onClick={invoke('mode')}>{model.reading?'编辑':'阅读'}</Button>
          <Button id="note-reference-open" className="quiet ui-compact" aria-expanded={detailsOpen}
            aria-controls="note-reference" onClick={()=>setDetailsOpen(!detailsOpen)}>笔记详情</Button>
        </div>
        <ReferenceDesk path={model.path} hidden={!detailsOpen} collapse={()=>setDetailsOpen(false)} organize={openInfo}>
          <Button busyOnAction id="note-create-action" className="quiet ui-compact" onClick={invoke('noteAction')}>从笔记创建行动</Button>
          <Button busyOnAction id="passage-create-action" className="quiet ui-compact" onClick={invoke('passageAction')}>从选段创建行动</Button>
        </ReferenceDesk>
      </div>
      <div className="reader-edit-tools" hidden={!model.initiative && !model.capture && model.saveHidden && model.statusHidden}
        onFocus={dismissDetailsForReaderFocus}>
        <Button id="reader-edit-initiative" className="quiet ui-compact" hidden={!model.initiative} onClick={event=>editInitiative(event.currentTarget)}>编辑事项</Button>
        <Button id="reader-new-initiative-action" className="quiet ui-compact" hidden={!model.initiative} disabled={model.initiativeActionDisabled} aria-describedby={model.initiativeActionDisabled ? 'reader-initiative-action-help' : undefined} onClick={event=>newInitiativeAction(event.currentTarget)}>新建事项行动</Button>
        {model.initiative && model.initiativeActionDisabled && <span id="reader-initiative-action-help">重新开启事项后可新建行动。</span>}
        <Button id="capture-return" className="quiet ui-compact" hidden={!model.capture} onClick={invoke('capture')}>保存并返回原任务</Button>
        <Button id="note-save" className="secondary ui-compact" hidden={model.saveHidden} onClick={invoke('save')}>保存笔记</Button>
        <span id="save-state" role="status" hidden={model.statusHidden} data-state={model.statusKind}>{model.status}{model.statusDetail&&<details><summary>查看详情</summary><pre>{model.statusDetail}</pre></details>}</span>
      </div>
      <div className={`document reader-document text-content bg-surface ${model.reading?'reader-mode':'editor-mode'}`}
        onFocus={dismissDetailsForReaderFocus}>
        {model.reading && <h1 className="reader-title">{model.title || '无标题'}</h1>}
        <Input id="title" aria-label="笔记标题" placeholder="无标题" hidden={model.reading} readOnly={model.reading} value={model.title} onInput={e=>input('title',e.currentTarget.value)} onChange={()=>{}}/>
        <Textarea id="body" aria-label="笔记正文" placeholder="输入笔记正文…" spellCheck={false} hidden={model.reading} value={model.body} onInput={e=>input('body',e.currentTarget.value)} onChange={()=>{}}/>
        <article id="reading" tabIndex={model.searchFallback?-1:undefined} aria-label={model.searchFallback?'搜索匹配原文':'笔记阅读内容'} hidden={!model.reading} dangerouslySetInnerHTML={{__html:model.html}} onScroll={invoke('remember')} onClick={e=>{
          const node=(e.target as Element).closest<HTMLElement>('[data-wiki-target]');
          if(node){e.preventDefault();wiki(node.dataset.wikiTarget!,node);}
        }}/>
      </div>
    </>;
  }
  const root=createRoot(container);
  function render(){flushSync(()=>root.render(<Reader/>));}
  render();
  return {
    on(action:ReaderAction, callback:()=>void){callbacks[action]=callback;},
    info(callback: typeof openInfo){openInfo=callback;},
    initiative(edit: typeof editInitiative, createAction: typeof newInitiativeAction){editInitiative=edit;newInitiativeAction=createAction;},
    wiki(callback:typeof wiki){wiki=callback;},
    dismissDetails(){return setDetailsOpen(false);},
    set(patch:Partial<ReaderModel>){
      if (patch.path !== undefined || (patch.reading !== undefined && patch.reading !== model.reading)) detailsOpen = false;
      model={...model,...patch,...(patch.html!==undefined?{searchFallback:false}:{})};render();
    },
    text(key:'title'|'body',value?:string){if(value!==undefined){model={...model,[key]:value};render();}return model[key];},
    highlight(line:number,query:string,highlight:(container:HTMLElement,text:string,query:string)=>void){
      const template=document.createElement('template');template.innerHTML=model.html;
      const blocks=[...template.content.querySelectorAll<HTMLElement>('[data-source-line]')];
      const match=blocks.filter(node=>Number(node.dataset.sourceLine)<=line).at(-1);
      if(!match){model={...model,searchFallback:true};render();return container.querySelector<HTMLElement>('#reading')!;}
      const walker=document.createTreeWalker(match,NodeFilter.SHOW_TEXT), nodes:Node[]=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){const fragment=document.createElement('span');highlight(fragment,node.textContent||'',query);node.parentNode!.replaceChild(fragment,node);}
      match.tabIndex=-1;match.setAttribute('aria-label','搜索匹配原文');match.dataset.searchMatch='true';
      model={...model,html:template.innerHTML};render();
      return container.querySelector<HTMLElement>('[data-search-match]')!;
    }
  };
}

/** Read-only context; organization retains the existing drawer and task authority. */
export function ReferenceDesk({path,hidden,collapse,organize,children}:{
  path:string; hidden:boolean; collapse:()=>void; organize:(opener:HTMLButtonElement)=>void; children?:React.ReactNode;
}) {
  return <aside id="note-reference" className="reference-desk" aria-label="笔记详情" hidden={hidden}>
    <header><h2>笔记详情</h2><Button className="quiet ui-compact" onClick={collapse}>收起</Button></header>
    <dl><dt>来源位置</dt><dd>{path || '尚未保存'}</dd></dl>
    <div className="reference-actions">
      <Button id="note-info-open" className="quiet ui-compact" onClick={event => organize(event.currentTarget)}>笔记信息与整理</Button>
      {children}
    </div>
  </aside>;
}
