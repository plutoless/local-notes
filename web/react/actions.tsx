import {actionLabels} from '../presentation-labels.js';
import {useState, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {TaskFormActions} from './note-forms';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import './action-workspace.css';

export interface ActionSource {path:string; quote:string; fingerprint:string}
export interface ActionFields {description:string; status:string; initiativeId?:string|null; dueDate?:string|null; waitingOn?:string|null; sources:ActionSource[]}
export interface ActionRecord extends ActionFields {entityId:string; workspaceId:string; revision:string; parents?:string[]; modifiedAt:string; focusPosition:number|null}
/** Stable entry contract shared by legacy callers and migrated Initiative consumers. */
export interface ActionEntry {record:ActionRecord|null; initiativeId?:string; opener?:HTMLElement; returnToOrigin?:()=>unknown}
export interface ActionEntryPort {open:(entry:ActionEntry)=>Promise<void>}
export interface ActionRow extends ActionFields {entityId:string; overdue:boolean; initiativeName:string}
const labels:Record<string,string>=actionLabels;
export function ActionStatus({status, label = labels[status]}:{status:string; label?:string}) {
  return <span className="action-status" data-status={status}>{label}</span>;
}
export function ActionField({label,children}:{label:string;children:ReactNode}) {return <label className="ui-field ui-compact"><span>{label}</span><span className="ui-field-target">{children}</span></label>;}
export function ActionEditor() {
  return <form id="action-form" className="document text-content bg-surface" noValidate>
      <ActionField label="行动描述"><Textarea id="action-description" required rows={3} aria-describedby="action-save-state"/></ActionField>
      <ActionField label="状态"><select id="action-status">{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></ActionField>
      <details id="action-options" className="ui-disclosure"><summary>事项、日期与等待条件（可选）</summary>
        <ActionField label="事项"><select id="action-initiative"/></ActionField>
        <p id="action-initiative-help">选择事项后可打开。</p><Button id="action-open-initiative" aria-describedby="action-initiative-help">打开事项</Button>
        <ActionField label="截止日期（可选）"><Input id="action-due" type="date"/></ActionField><ActionField label="等待的人或条件（可选）"><Input id="action-waiting"/></ActionField>
      </details>
      <details id="action-source-options" className="ui-disclosure"><summary>来源引用（可选）</summary><div id="action-sources"/><Button id="action-add-source">添加来源引用</Button></details>
      <div id="action-save-state" role="status" aria-live="polite"/>
      <section className="action-utilities" aria-label="行动管理"><details className="ui-disclosure"><summary>记录详情</summary><span id="action-id"/></details><details className="ui-disclosure"><summary>当前重点与历史</summary><p id="focus-help">保存后，待办或进行中的行动可加入当前重点。</p><Button id="action-focus" aria-describedby="focus-help">加入当前重点</Button><p id="history-help">保存行动后可查看版本历史。</p><Button id="action-history" aria-describedby="history-help">查看历史</Button><div id="action-revisions" aria-live="polite"/></details><details className="ui-disclosure"><summary>放弃编辑</summary><Button id="action-discard" className="danger ui-compact">放弃未保存的草稿</Button></details></section>
    </form>;
}
export function ActionTools() {
  return <>
    <div className="action-list-filters">
      <ActionField label="状态"><select id="action-filter"><option value="">全部状态</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></ActionField>
      <ActionField label="事项"><select id="action-initiative-filter"/></ActionField>
    </div>
    <div className="action-list-controls">
      <Button id="action-new" className="primary ui-compact">新建行动</Button>
      <Button id="action-recover" className="quiet ui-compact">恢复行动草稿</Button>
      <div className="action-pagination ui-pagination">
        <Button id="action-previous" className="quiet ui-compact">上一页</Button><span id="action-page"/>
        <Button id="action-next" className="quiet ui-compact">下一页</Button>
      </div>
    </div>
  </>;
}
export function ActionRows({rows,selected,empty,open}:{rows:ActionRow[];selected?:string;empty:string;open:(row:ActionRow,opener:HTMLButtonElement)=>unknown}) {
  return <>{rows.map(row=><Button key={row.entityId} className="quiet ui-row action-list-row" data-entity-id={row.entityId}
    aria-current={selected===row.entityId?'true':undefined} onClick={event=>open(row,event.currentTarget)}>
    <span className="action-list-title">{row.description}</span>
    <span className="action-list-meta"><ActionStatus status={row.status}/><span>{row.initiativeName}</span></span>
    {(row.dueDate || row.waitingOn) && <span className="action-list-meta">
      {row.dueDate && <span className={row.overdue?'action-overdue':undefined}>{row.overdue?'已逾期':'截止'}：{row.dueDate}</span>}
      {row.waitingOn && <span>等待：{row.waitingOn}</span>}
    </span>}
  </Button>)}{!rows.length&&<div className="no-items">{empty}</div>}</>;
}
export function actionRows(container:HTMLElement) {
  const root=createRoot(container);
  let current:Parameters<typeof ActionRows>[0];
  const render=(props:Parameters<typeof ActionRows>[0])=>{current=props;flushSync(()=>root.render(<ActionRows {...props}/>));};
  return {render,select(selected?:string){if(current)render({...current,selected});},release(){flushSync(()=>root.unmount());}};
}
/** Mount once: legacy task adapter owns form properties and focus in existing modal slots.
 * These inert component shells never rerender over the adapter's control ports. */
export function mountActionControls(editor:HTMLElement,tools:HTMLElement,footer:HTMLElement,cancel:()=>unknown) {
  const a=createRoot(editor),b=createRoot(tools),c=createRoot(footer);
  flushSync(()=>{a.render(<ActionEditor/>);b.render(<ActionTools/>);c.render(<TaskFormActions formId="action-form" cancelId="action-back" cancel={cancel} submitLabel="保存行动"/>);});
}
function SourceOptions({initiallyOpen,children}:{initiallyOpen:boolean;children:ReactNode}) {
  const [open,setOpen]=useState(initiallyOpen);
  return <details className="ui-disclosure" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>{children}</details>;
}
export function ActionSourceEvidence({source}:{source:ActionSource}) {
  return <>
    <h3>{source.path.split('/').pop() || '新来源'}</h3>
    <small>{source.path || '填写笔记路径并引用原文'}</small>
    {source.quote ? <blockquote>{source.quote}</blockquote> : <p className="action-source-state">{source.path ? '引用整篇笔记' : '未添加原文引用'}</p>}
  </>;
}
export function actionSources(container:HTMLElement, changed:()=>void, open:(path:string,index:number)=>unknown) {
  const root=createRoot(container);
  let sequence=0;
  let sources:(ActionSource&{key:number;state?:string;resolvedPath?:string})[]=[];
  function render(){flushSync(()=>root.render(<>{sources.map((source,index)=><div className="action-source" data-fingerprint={source.fingerprint} key={source.key}>
    <ActionSourceEvidence source={source}/>
    <SourceOptions initiallyOpen={!source.path}><summary>编辑来源引用</summary><ActionField label="笔记相对路径"><Input className="source-path" value={source.path} onChange={e=>update(index,'path',e.target.value)}/></ActionField><ActionField label="引用原文"><Textarea className="source-quote" rows={2} value={source.quote} onChange={e=>update(index,'quote',e.target.value)}/></ActionField><Button className="danger" aria-label={`移除引用：${source.path||'新来源'}`} onClick={()=>{sources.splice(index,1);render();changed();document.getElementById('action-add-source')?.focus();}}>移除引用</Button></SourceOptions>
    {source.state&&<p className="action-source-state">{source.state}</p>}{source.resolvedPath&&<Button aria-label={`打开来源：${source.resolvedPath}`} data-action-source-index={index} data-action-source-path={source.resolvedPath} onClick={()=>open(source.resolvedPath!,index)}>打开来源</Button>}
  </div>)}</>));}
  function update(index:number,key:'path'|'quote',value:string){sources[index]={...sources[index],[key]:value,fingerprint:'',state:undefined,resolvedPath:undefined};render();changed();}
  return {set(value:ActionSource[]){sources=value.map(s=>({...s,key:++sequence}));render();},add(source:ActionSource){sources.push({...source,key:++sequence});render();},
    get:()=>sources.map(({path,quote,fingerprint})=>({path:path.trim(),quote,fingerprint})),
    status(index:number,state:string,path?:string){if(!sources[index])return;sources[index]={...sources[index],state,resolvedPath:path};render();}};
}
const historyFields={description:'描述',status:'状态',initiativeId:'所属事项',dueDate:'截止日期',waitingOn:'等待条件',sources:'来源引用',focusPosition:'当前重点'};
function revisionChanges(record:ActionRecord,older?:ActionRecord) {
  if(!record.parents?.length)return '创建行动';
  if(record.parents.length > 1)return '合并版本';
  if(!older)return '上一版本不可用';
  return (Object.keys(historyFields) as (keyof typeof historyFields)[]).filter(key=>JSON.stringify(record[key])!==JSON.stringify(older[key])).map(key=>historyFields[key]).join('、')||'保存记录';
}
export function ActionHistory({records}:{records:ActionRecord[]|string|null}) {
  if (records === null) return '正在载入历史…';
  if (typeof records === 'string') return records;
  if (!records.length) return '暂无可用历史。';
  const revisions = new Map(records.map(record => [record.revision, record]));
  return records.map(record => <article className="action-revision" key={record.revision}>
    <h3>{labels[record.status]}</h3>
    <time dateTime={record.modifiedAt}>{new Date(record.modifiedAt).toLocaleString('zh-CN',{hour12:false})}</time>
    <p>{record.description}</p>
    <small>{revisionChanges(record, revisions.get(record.parents?.[0] || ''))}</small>
    <details className="ui-disclosure"><summary>完整版本与记录详情</summary><pre>{JSON.stringify(record,null,2)}</pre></details>
  </article>);
}
export function actionHistory(container:HTMLElement) {
  const root=createRoot(container);
  return (records:ActionRecord[]|string|null)=>flushSync(()=>root.render(<ActionHistory records={records}/>));
}

export function actionOptions(container:HTMLSelectElement,empty:string) {
  const root=createRoot(container);
  let options:{entityId:string;title:string}[]=[];
  const render=()=>flushSync(()=>root.render(<><option value="">{empty}</option>{options.map(item=><option key={item.entityId} value={item.entityId}>{item.title}</option>)}</>));
  render();
  return {set(items:typeof options){options=items;render();},ensure(entityId:string,title=entityId){if(entityId&&!options.some(item=>item.entityId===entityId)){options=[...options,{entityId,title}];render();}}};
}
