import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {Button} from './components';
import {OfficialButton} from './ui/button';
import {Field, FieldLabel, FieldDescription, FieldError} from './ui/field';

export interface NoteField {
  id:string; label?:string; value?:string; multiline?:boolean; hidden?:boolean;
  help?:string; error?:string; optional?:boolean; required?:boolean; invalid?:boolean; disabled?:boolean; describedBy?:string;
}
export function NoteFields({fields,change}:{fields:NoteField[];change?:(id:string,value:string)=>void}) {
  return <>{fields.map(f=>{
    const props={id:f.id,value:f.value || '',required:f.required,disabled:f.disabled,onChange:()=>{},'aria-invalid':f.invalid || undefined,'aria-describedby':[f.describedBy,f.help?f.id+'-help':null,f.error?f.id+'-error':null].filter(Boolean).join(' ') || undefined,
      onInput:(e:React.FormEvent<HTMLInputElement|HTMLTextAreaElement>)=>change?.(f.id,e.currentTarget.value)};
    const input=f.multiline?<Textarea {...props} rows={7}/>:<Input {...props} type={f.hidden?'hidden':'text'}/>;
    return f.hidden?<span key={f.id} hidden>{input}</span>:<Field key={f.id} data-invalid={f.invalid || undefined}>
      <FieldLabel htmlFor={f.id}>{f.label}{f.optional && <span className="note-task-optional">可选</span>}</FieldLabel>
      {input}
      {f.help && <FieldDescription id={f.id+'-help'}>{f.help}</FieldDescription>}
      {f.error && <FieldError id={f.id+'-error'}>{f.error}</FieldError>}
    </Field>;
  })}</>;
}
// Each opening gets fresh fields. Existing task controllers own drafts,
// validation and focus; unrelated status updates never remount an active receiver.
export function noteFieldsView(container:HTMLElement) {
  const root=createRoot(container);let opening=0;let fields:NoteField[]=[];let inputListener=()=>{};
  const render=()=>flushSync(()=>root.render(<NoteFields key={opening} fields={fields} change={(id,value)=>{set(id,{value,invalid:false,error:undefined});inputListener();}}/>));
  function set(id:string,patch:Partial<NoteField>){fields=fields.map(field=>field.id===id?{...field,...patch}:field);render();}
  return {onInput(callback:()=>void){inputListener=callback;},show(next:NoteField[]){fields=next;opening++;render();},set};
}
export interface ClassificationItem {id:string; title:string; checked:boolean; disabled?:boolean; open?:()=>unknown}
export function Classification({items,kind,create,change}:{items:ClassificationItem[];kind:'topic'|'initiative';create?:()=>unknown;change:(id:string,checked:boolean)=>unknown}) {
  return <div className="note-classification">{!items.length&&<p>{kind==='topic'?'暂无主题。':'暂无事项。'}</p>}
    {create&&<Button id="note-create-topic" className="secondary ui-compact" onClick={create}>新建并关联主题</Button>}
    {items.map(item=><div key={item.id} className="note-classification-row"><label className="ui-selection"><input type="checkbox" data-topic-id={kind==='topic'?item.id:undefined} data-initiative-id={kind==='initiative'?item.id:undefined} checked={item.checked} disabled={item.disabled} onChange={e=>change(item.id,e.currentTarget.checked)}/><span>{item.title}</span></label>{item.checked&&item.open&&<Button className="quiet ui-compact" aria-label={`打开事项：${item.title}`} onClick={item.open}>打开事项</Button>}</div>)}</div>;
}
export function classificationView(container:HTMLElement) {
  const content=document.createElement('div'), receipts=document.createElement('div');
  container.replaceChildren(content,receipts);
  const root=createRoot(content);let revision=0;let model:Parameters<typeof Classification>[0];
  const render=()=>flushSync(()=>root.render(<Classification key={revision} {...model} change={(id,checked)=>{model={...model,items:model.items.map(item=>item.id===id?{...item,checked}:item)};render();model.change(id,checked);}}/>));
  return {receipts,show(props:typeof model){receipts.replaceChildren();model=props;revision++;render();},set(id:string|null,patch:Partial<ClassificationItem>){model={...model,items:model.items.map(item=>id===null||item.id===id?{...item,...patch}:item)};render();}};
}
type AssociationState = 'loading' | 'ready' | 'failed';

export function noteInformationView(container:HTMLElement) {
  const root=createRoot(container);
  let model:{path:string; starred:boolean; repair:boolean; topics:AssociationState; initiatives:AssociationState} =
    {path:'',starred:false,repair:false,topics:'ready',initiatives:'ready'};const callbacks:Record<string,()=>unknown>={};
  const render=()=>flushSync(()=>root.render(<>
    <section className="note-info-section">
      <h3>来源位置</h3>
      <p id="file-path">{model.path}</p>
      <div className="ui-actions">
        <Button id="rename" className="secondary ui-compact" onClick={()=>callbacks.rename?.()}>移动 / 改名</Button>
        <Button id="star" className="quiet ui-compact" aria-pressed={model.starred} onClick={()=>callbacks.star?.()}>{model.starred?'取消收藏笔记':'收藏笔记'}</Button>
        <Button id="repair-links" className="secondary ui-compact" hidden={!model.repair} onClick={()=>callbacks.repair?.()}>重试更新关联</Button>
      </div>
    </section>
    <section className="note-info-section">
      <h3>主题归类</h3><p className="note-info-help">关联不会移动原文。</p>
      <AssociationStatus state={model.topics} retry={() => callbacks.topics?.()}/>
      <div id="note-topics" hidden={model.topics !== 'ready'}/>
    </section>
    <section className="note-info-section">
      <h3>关联事项</h3>
      <AssociationStatus state={model.initiatives} retry={() => callbacks.initiatives?.()}/>
      <div id="note-initiatives" hidden={model.initiatives !== 'ready'}/>
    </section>
  </>));
  render();return {set(patch:Partial<typeof model>){model={...model,...patch};render();},on(action:string,callback:()=>unknown){callbacks[action]=callback;}};
}

function AssociationStatus({state,retry}:{state:AssociationState;retry:()=>unknown}) {
  if (state === 'ready') return null;
  if (state === 'loading') return <p role="status" className="note-info-help">正在载入…</p>;
  return <><p role="alert">关联暂不可用。</p><Button className="secondary ui-compact" onClick={retry}>重试载入</Button></>;
}

export function TaskFormActions({formId,cancelId,cancel,submitLabel}:{
  formId:string; cancelId?:string; cancel:()=>unknown; submitLabel?:string;
}) {
  return <>
    <Button id={cancelId} className="quiet ui-compact" busyOnAction onClick={cancel}>取消</Button>
    <OfficialButton type="submit" form={formId} variant="default" className="ui-action primary ui-compact">{submitLabel}</OfficialButton>
  </>;
}

export interface TaskFormOptions {id:string;statusId:string;errorId?:string;cancelId?:string;cancel:()=>unknown}
/** Stable fields and receipt ports; controllers retain draft and write authority. */
export function taskFormView(body:HTMLElement,footer:HTMLElement,options:TaskFormOptions) {
  const content=createRoot(body),actions=createRoot(footer);
  flushSync(()=>content.render(<>
    <div id={options.statusId} role="status" tabIndex={-1}/>
    <form id={options.id} className="note-task-form" noValidate/>
    {options.errorId && <FieldError id={options.errorId} tabIndex={-1}/>}
  </>));
  flushSync(()=>actions.render(<TaskFormActions formId={options.id} cancelId={options.cancelId} cancel={options.cancel}/>));
  return {form:body.querySelector<HTMLFormElement>('form')!,status:body.querySelector<HTMLElement>(`#${options.statusId}`)!,error:options.errorId?body.querySelector<HTMLElement>(`#${options.errorId}`)!:null,submit:footer.querySelector<HTMLButtonElement>('button[type=submit]')!};
}
