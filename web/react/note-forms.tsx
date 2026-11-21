import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';

export interface NoteField {
  id:string; label?:string; value?:string; multiline?:boolean; hidden?:boolean;
  help?:string; required?:boolean; invalid?:boolean; describedBy?:string;
}
export function NoteFields({fields}:{fields:NoteField[]}) {
  return <>{fields.map(f=>{
    const props={id:f.id,defaultValue:f.value || '',required:f.required,'aria-invalid':f.invalid || undefined,'aria-describedby':[f.describedBy,f.help?f.id+'-help':null].filter(Boolean).join(' ') || undefined,
      onInput:(e:React.FormEvent<HTMLInputElement|HTMLTextAreaElement>)=>e.currentTarget.setAttribute('aria-invalid','false')};
    const input=f.multiline?<textarea {...props} rows={7}/>:<input {...props} type={f.hidden?'hidden':'text'}/>;
    return f.hidden?<span key={f.id} hidden>{input}</span>:<label key={f.id} className="ui-field"><span>{f.label}</span>{input}{f.help&&<small id={f.id+'-help'}>{f.help}</small>}</label>;
  })}</>;
}
// Each opening gets fresh uncontrolled fields. Existing task controllers own drafts,
// validation and focus; unrelated status updates never remount an active receiver.
export function noteFieldsView(container:HTMLElement) {
  const root=createRoot(container);let opening=0;
  return {show(fields:NoteField[]){flushSync(()=>root.render(<NoteFields key={++opening} fields={fields}/>));}};
}
export interface ClassificationItem {id:string; title:string; checked:boolean; open?:()=>unknown}
export function Classification({items,kind,create,change}:{items:ClassificationItem[];kind:'topic'|'initiative';create?:()=>unknown;change:(id:string,checked:boolean)=>unknown}) {
  return <>{!items.length&&<p>{kind==='topic'?'尚未关联主题，可新建或选择已有主题。':'尚无事项。可先保存笔记，稍后关联已有事项。'}</p>}
    {create&&<Button id="note-create-topic" className="quiet ui-compact" onClick={create}>新建并关联主题</Button>}
    {items.map(item=><div key={item.id}><label className="ui-selection"><input type="checkbox" data-topic-id={kind==='topic'?item.id:undefined} data-initiative-id={kind==='initiative'?item.id:undefined} defaultChecked={item.checked} onChange={e=>change(item.id,e.currentTarget.checked)}/>{item.title}</label>{item.checked&&item.open&&<Button onClick={item.open}>打开事项：{item.title}</Button>}</div>)}</>;
}
export function classificationView(container:HTMLElement) {
  const content=document.createElement('div'), receipts=document.createElement('div');
  container.replaceChildren(content,receipts);
  const root=createRoot(content);let revision=0;
  return {receipts,show(props:Parameters<typeof Classification>[0]){receipts.replaceChildren();flushSync(()=>root.render(<Classification key={++revision} {...props}/>));}};
}
export function noteInformationView(container:HTMLElement) {
  const root=createRoot(container);
  flushSync(()=>root.render(<>
    <p>来源位置：<span id="file-path"/></p>
    <Button id="star" className="icon-action" aria-label="收藏笔记" aria-pressed="false">☆ 收藏</Button>
    <Button id="rename">移动 / 改名</Button><Button id="repair-links" hidden>重试更新关联</Button>
    <p>来源位置是文件目录；主题用于跨目录归类；事项用于跟踪目标与进展。关联不会移动或改写笔记。</p>
    <h2>主题归类</h2><div id="note-topics"/>
    <h2>事项 · 目标与进展</h2><div id="note-initiatives"/>
    <p>笔记中的复选框只记录原文。需要跟进时，请从「当前重点」打开「全部行动」，单独新建行动。</p>
  </>));
}
