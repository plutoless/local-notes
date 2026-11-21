import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';

export interface NoteField {
  id:string; label?:string; value?:string; multiline?:boolean; hidden?:boolean;
  help?:string; required?:boolean; invalid?:boolean; disabled?:boolean; describedBy?:string;
}
export function NoteFields({fields,change}:{fields:NoteField[];change?:(id:string,value:string)=>void}) {
  return <>{fields.map(f=>{
    const props={id:f.id,value:f.value || '',required:f.required,disabled:f.disabled,onChange:()=>{},'aria-invalid':f.invalid || undefined,'aria-describedby':[f.describedBy,f.help?f.id+'-help':null].filter(Boolean).join(' ') || undefined,
      onInput:(e:React.FormEvent<HTMLInputElement|HTMLTextAreaElement>)=>change?.(f.id,e.currentTarget.value)};
    const input=f.multiline?<textarea {...props} rows={7}/>:<input {...props} type={f.hidden?'hidden':'text'}/>;
    return f.hidden?<span key={f.id} hidden>{input}</span>:<label key={f.id} className="ui-field"><span>{f.label}</span>{input}{f.help&&<small id={f.id+'-help'}>{f.help}</small>}</label>;
  })}</>;
}
// Each opening gets fresh fields. Existing task controllers own drafts,
// validation and focus; unrelated status updates never remount an active receiver.
export function noteFieldsView(container:HTMLElement) {
  const root=createRoot(container);let opening=0;let fields:NoteField[]=[];let inputListener=()=>{};
  const render=()=>flushSync(()=>root.render(<NoteFields key={opening} fields={fields} change={(id,value)=>{set(id,{value,invalid:false});inputListener();}}/>));
  function set(id:string,patch:Partial<NoteField>){fields=fields.map(field=>field.id===id?{...field,...patch}:field);render();}
  return {onInput(callback:()=>void){inputListener=callback;},show(next:NoteField[]){fields=next;opening++;render();},set};
}
export interface ClassificationItem {id:string; title:string; checked:boolean; disabled?:boolean; open?:()=>unknown}
export function Classification({items,kind,create,change}:{items:ClassificationItem[];kind:'topic'|'initiative';create?:()=>unknown;change:(id:string,checked:boolean)=>unknown}) {
  return <>{!items.length&&<p>{kind==='topic'?'尚未关联主题，可新建或选择已有主题。':'尚无事项。可先保存笔记，稍后关联已有事项。'}</p>}
    {create&&<Button id="note-create-topic" className="quiet ui-compact" onClick={create}>新建并关联主题</Button>}
    {items.map(item=><div key={item.id}><label className="ui-selection"><input type="checkbox" data-topic-id={kind==='topic'?item.id:undefined} data-initiative-id={kind==='initiative'?item.id:undefined} checked={item.checked} disabled={item.disabled} onChange={e=>change(item.id,e.currentTarget.checked)}/>{item.title}</label>{item.checked&&item.open&&<Button onClick={item.open}>打开事项：{item.title}</Button>}</div>)}</>;
}
export function classificationView(container:HTMLElement) {
  const content=document.createElement('div'), receipts=document.createElement('div');
  container.replaceChildren(content,receipts);
  const root=createRoot(content);let revision=0;let model:Parameters<typeof Classification>[0];
  const render=()=>flushSync(()=>root.render(<Classification key={revision} {...model} change={(id,checked)=>{model={...model,items:model.items.map(item=>item.id===id?{...item,checked}:item)};render();model.change(id,checked);}}/>));
  return {receipts,show(props:typeof model){receipts.replaceChildren();model=props;revision++;render();},set(id:string|null,patch:Partial<ClassificationItem>){model={...model,items:model.items.map(item=>id===null||item.id===id?{...item,...patch}:item)};render();}};
}
export function noteInformationView(container:HTMLElement) {
  const root=createRoot(container);
  let model={path:'',starred:false,repair:false};const callbacks:Record<string,()=>unknown>={};
  const render=()=>flushSync(()=>root.render(<>
    <p>来源位置：<span id="file-path">{model.path}</span></p>
    <Button id="star" className="icon-action" title={model.starred?'取消收藏笔记':'收藏笔记'} aria-label={model.starred?'取消收藏笔记':'收藏笔记'} aria-pressed={model.starred} onClick={()=>callbacks.star?.()}>{model.starred?'★':'☆'}</Button>
    <Button id="rename" onClick={()=>callbacks.rename?.()}>移动 / 改名</Button><Button id="repair-links" hidden={!model.repair} onClick={()=>callbacks.repair?.()}>重试更新关联</Button>
    <p>来源位置是文件目录；主题用于跨目录归类；事项用于跟踪目标与进展。关联不会移动或改写笔记。</p>
    <h2>主题归类</h2><div id="note-topics"/>
    <h2>事项 · 目标与进展</h2><div id="note-initiatives"/>
    <p>笔记中的复选框只记录原文。需要跟进时，请从「当前重点」打开「全部行动」，单独新建行动。</p>
  </>));
  render();return {set(patch:Partial<typeof model>){model={...model,...patch};render();},on(action:string,callback:()=>unknown){callbacks[action]=callback;}};
}

export interface TaskFormOptions {id:string;statusId:string;errorId?:string;cancelId?:string;document?:boolean;cancel:()=>unknown}
/** Stable fields and receipt ports; controllers retain draft and write authority. */
export function taskFormView(body:HTMLElement,footer:HTMLElement,options:TaskFormOptions) {
  const content=createRoot(body),actions=createRoot(footer);
  flushSync(()=>content.render(<>
    {options.errorId&&<div><div id={options.statusId} role="status"/><div id={options.errorId} role="alert" tabIndex={-1}/></div>}
    <form id={options.id} className={options.document?'document':undefined} noValidate/>
    {!options.errorId&&<div id={options.statusId} role="status"/>}
  </>));
  flushSync(()=>actions.render(<><Button id={options.cancelId} className="quiet ui-compact" busyOnAction onClick={options.cancel}>取消</Button><button type="submit" form={options.id} className="ui-action primary ui-compact"/></>));
  return {form:body.querySelector<HTMLFormElement>('form')!,status:body.querySelector<HTMLElement>(`#${options.statusId}`)!,error:options.errorId?body.querySelector<HTMLElement>(`#${options.errorId}`)!:null,submit:footer.querySelector<HTMLButtonElement>('button[type=submit]')!};
}
