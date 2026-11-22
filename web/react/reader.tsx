import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {useState} from 'react';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {Button} from './components';
export interface ReaderModel {path:string; title:string; body:string; reading:boolean; html:string; status:string; statusKind:string; statusDetail:string; saveHidden:boolean; statusHidden:boolean; capture:boolean; searchFallback:boolean; initiative:boolean}
type ReaderAction = 'back'|'capture'|'save'|'mode'|'noteAction'|'passageAction'|'changed'|'remember';
export function readerView(container:HTMLElement) {
  const callbacks:Partial<Record<ReaderAction,()=>void>>={};
  let openInfo: (opener: HTMLButtonElement) => void = () => {};
  let editInitiative: (opener: HTMLButtonElement) => void = () => {};
  let newInitiativeAction: typeof editInitiative = () => {};
  let wiki:(target:string, opener:HTMLElement)=>void=()=>{};
  let model:ReaderModel={path:'',title:'',body:'',reading:false,html:'',status:'已保存到本地',statusKind:'saved',statusDetail:'',saveHidden:false,statusHidden:false,capture:false,searchFallback:false,initiative:false};
  function Reader() {
    const [reference,setReference]=useState({path:model.path,open:false});
    const context=reference.path===model.path && reference.open;
    const setContext=(open:boolean)=>setReference({path:model.path,open});
    const invoke=(action:ReaderAction)=>()=>callbacks[action]?.();
    const input=(key:'title'|'body', value:string)=>{model={...model,[key]:value}; render(); callbacks.changed?.();};
    return <><div className="toolbar">
      <Button id="back" className="quiet" onClick={invoke('back')}>{model.initiative?'‹ 返回事项':'‹ 返回列表'}</Button>
      <Button id="reader-edit-initiative" hidden={!model.initiative} onClick={event=>editInitiative(event.currentTarget)}>编辑事项</Button>
      <Button id="reader-new-initiative-action" hidden={!model.initiative} onClick={event=>newInitiativeAction(event.currentTarget)}>新建事项行动</Button>
      <Button id="capture-return" className="quiet" hidden={!model.capture} onClick={invoke('capture')}>保存并返回原任务</Button>
      <Button id="note-save" className="secondary" hidden={model.saveHidden} onClick={invoke('save')}>保存笔记</Button>
      <Button id="note-info-open" onClick={event => openInfo(event.currentTarget)}>笔记信息与整理</Button>
      <span id="note-mode">{model.reading?'阅读笔记':'编辑笔记'}</span>
      <span id="save-state" role="status" hidden={model.statusHidden} data-state={model.statusKind}>{model.status}{model.statusDetail&&<details><summary>查看详情</summary><pre>{model.statusDetail}</pre></details>}</span>
      <Button id="mode" className="secondary" onClick={invoke('mode')}>{model.reading?'编辑':'阅读'}</Button>
      <Button busyOnAction id="note-create-action" onClick={invoke('noteAction')}>从笔记创建行动</Button>
      <Button busyOnAction id="passage-create-action" onClick={invoke('passageAction')}>从选段创建行动</Button>
    </div><div className={`reader-layout ${context?'has-reference':''}`}><div className={`document text-content bg-surface ${model.reading?'reader-mode':'editor-mode'}`}>
      <Input id="title" aria-label="笔记标题" placeholder="无标题" readOnly={model.reading} value={model.title} onInput={e=>input('title',e.currentTarget.value)} onChange={()=>{}}/>
      <Button id="note-reference-open" aria-expanded={context} aria-controls="note-reference" onClick={()=>setContext(!context)}>笔记信息</Button>
      <Textarea id="body" aria-label="笔记正文" placeholder="输入笔记正文…" spellCheck={false} hidden={model.reading} value={model.body} onInput={e=>input('body',e.currentTarget.value)} onChange={()=>{}}/>
      <article id="reading" tabIndex={model.searchFallback?-1:undefined} aria-label={model.searchFallback?'搜索匹配原文':'笔记阅读内容'} hidden={!model.reading} dangerouslySetInnerHTML={{__html:model.html}} onScroll={invoke('remember')} onClick={e=>{
        const node=(e.target as Element).closest<HTMLElement>('[data-wiki-target]');
        if(node){e.preventDefault();wiki(node.dataset.wikiTarget!,node);}
      }}/>
    </div><ReferenceDesk path={model.path} hidden={!context} collapse={()=>{setContext(false);container.querySelector<HTMLButtonElement>('#note-reference-open')?.focus({preventScroll:true});}} organize={openInfo}/></div></>;
  }
  const root=createRoot(container);
  function render(){flushSync(()=>root.render(<Reader/>));}
  render();
  return {
    on(action:ReaderAction, callback:()=>void){callbacks[action]=callback;},
    info(callback: typeof openInfo){openInfo=callback;},
    initiative(edit: typeof editInitiative, createAction: typeof newInitiativeAction){editInitiative=edit;newInitiativeAction=createAction;},
    wiki(callback:typeof wiki){wiki=callback;},
    set(patch:Partial<ReaderModel>){model={...model,...patch,...(patch.html!==undefined?{searchFallback:false}:{})};render();},
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
export function ReferenceDesk({path,hidden,collapse,organize}:{path:string;hidden:boolean;collapse:()=>void;organize:(opener:HTMLButtonElement)=>void}) {
  return <aside id="note-reference" className="reference-desk" aria-label="笔记信息" hidden={hidden}>
    <header><h2>笔记信息</h2><Button onClick={collapse}>收起</Button></header>
    <dl><dt>来源位置</dt><dd>{path || '尚未保存'}</dd></dl>
    <p>主题与事项目标独立管理，关联不会改写原文。</p>
    <Button onClick={event => organize(event.currentTarget)}>笔记信息与整理</Button>
  </aside>;
}
