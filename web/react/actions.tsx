import {useState, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';

export interface ActionSource {path:string; quote:string; fingerprint:string}
export interface ActionFields {description:string; status:string; initiativeId?:string|null; dueDate?:string|null; waitingOn?:string|null; sources:ActionSource[]}
export interface ActionRecord extends ActionFields {entityId:string; workspaceId:string; revision:string; modifiedAt:string; focusPosition:number|null}
/** Stable entry contract shared by legacy callers and migrated Initiative consumers. */
export interface ActionEntry {record:ActionRecord|null; opener?:HTMLElement; returnToOrigin?:()=>unknown}
export interface ActionEntryPort {open:(entry:ActionEntry)=>Promise<void>}
export interface ActionRow extends ActionFields {entityId:string; overdue:boolean; initiativeName:string}
const labels:Record<string,string>={'todo':'待办','in-progress':'进行中',waiting:'等待中',completed:'已完成',canceled:'已取消'};
function Field({label,children}:{label:string;children:ReactNode}) {return <label className="ui-field ui-compact"><span>{label}</span><span className="ui-field-target">{children}</span></label>;}
export function ActionEditor() {
  return <><div className="toolbar"><Button id="action-back">取消</Button><details className="ui-disclosure"><summary>记录详情</summary><span id="action-id"/></details></div>
    <form id="action-form" className="document text-content bg-surface" noValidate><h2>行动详情</h2>
      <Field label="行动描述"><textarea id="action-description" required rows={3} aria-describedby="action-save-state"/></Field>
      <Field label="状态"><select id="action-status">{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
      <details id="action-options" className="ui-disclosure"><summary>事项、日期与等待条件（可选）</summary>
        <Field label="事项"><select id="action-initiative"><option value="">独立行动</option></select></Field>
        <p id="action-initiative-help">选择事项后可打开。</p><Button id="action-open-initiative" aria-describedby="action-initiative-help">打开事项</Button>
        <Field label="截止日期（可选）"><input id="action-due" type="date"/></Field><Field label="等待的人或条件（可选）"><input id="action-waiting"/></Field>
      </details>
      <details id="action-source-options" className="ui-disclosure"><summary>来源引用（可选）</summary><div id="action-sources"/><Button id="action-add-source">添加来源引用</Button></details>
      <div id="action-save-state" role="status" aria-live="polite"/>
      <div className="action-save-controls"><button id="action-save" type="submit" className="ui-action primary ui-compact">保存行动</button></div>
      <section className="action-utilities" aria-label="行动管理"><details className="ui-disclosure"><summary>当前重点与历史</summary><p id="focus-help">保存后，待办或进行中的行动可加入当前重点。</p><Button id="action-focus" aria-describedby="focus-help">加入当前重点</Button><p id="history-help">保存行动后可查看版本历史。</p><Button id="action-history" aria-describedby="history-help">查看历史</Button><div id="action-revisions" aria-live="polite"/></details><details className="ui-disclosure"><summary>放弃编辑</summary><Button id="action-discard" className="danger ui-compact">放弃未保存的草稿</Button></details></section>
    </form></>;
}
export function ActionTools() {return <><Button id="action-new" className="primary">＋ 新建行动</Button><Field label="状态"><select id="action-filter"><option value="">全部状态</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field><Field label="事项"><select id="action-initiative-filter"><option value="">全部事项</option></select></Field><div className="action-pagination ui-pagination"><Button id="action-previous">上一页</Button><span id="action-page"/><Button id="action-next">下一页</Button></div><Button id="action-recover">恢复行动草稿</Button></>;}
export function ActionRows({rows,selected,empty,open}:{rows:ActionRow[];selected?:string;empty:string;open:(row:ActionRow)=>unknown}) {return <>{rows.map(row=><Button key={row.entityId} className={`quiet ui-row card${selected===row.entityId?' selected':''}`} data-entity-id={row.entityId} aria-current={selected===row.entityId?'true':'false'} onClick={()=>open(row)}><h3>{row.description}</h3><p>{labels[row.status]}{row.dueDate?` · ${row.dueDate}${row.overdue?' · 已逾期':''}`:' · 未设日期'}</p><small>{row.initiativeName}{row.waitingOn&&` · 等待：${row.waitingOn}`}</small></Button>)}{!rows.length&&<div className="no-items">{empty}</div>}</>;}
export function actionRows(container:HTMLElement) {
  const root=createRoot(container);
  return {render(props:Parameters<typeof ActionRows>[0]) {flushSync(()=>root.render(<ActionRows {...props}/>));},release(){flushSync(()=>root.unmount());}};
}
/** Mount once: legacy task adapter owns form properties, focus and modal placement.
 * These inert component shells never rerender over the adapter's control ports. */
export function mountActionControls(editor:HTMLElement,tools:HTMLElement) {
  const a=createRoot(editor),b=createRoot(tools);
  flushSync(()=>{a.render(<ActionEditor/>);b.render(<ActionTools/>);});
}
function SourceOptions({initiallyOpen,children}:{initiallyOpen:boolean;children:ReactNode}) {
  const [open,setOpen]=useState(initiallyOpen);
  return <details className="ui-disclosure" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>{children}</details>;
}
export function actionSources(container:HTMLElement, changed:()=>void, open:(path:string)=>unknown) {
  const root=createRoot(container);
  let sequence=0;
  let sources:(ActionSource&{key:number;state?:string;resolvedPath?:string})[]=[];
  function render(){flushSync(()=>root.render(<>{sources.map((source,index)=><div className="action-source" data-fingerprint={source.fingerprint} key={source.key}>
    <h3>{source.path.split('/').pop()||'新来源'}</h3><small>{source.path||'填写笔记路径并引用原文'}</small><blockquote>{source.quote||'未添加原文引用'}</blockquote>
    <SourceOptions initiallyOpen={!source.path}><summary>编辑来源引用</summary><Field label="笔记相对路径"><input className="source-path" value={source.path} onChange={e=>update(index,'path',e.target.value)}/></Field><Field label="引用原文"><textarea className="source-quote" rows={2} value={source.quote} onChange={e=>update(index,'quote',e.target.value)}/></Field><Button className="danger" aria-label={`移除引用：${source.path||'新来源'}`} onClick={()=>{sources.splice(index,1);render();changed();document.getElementById('action-add-source')?.focus();}}>移除引用</Button></SourceOptions>
    {source.state&&<p>{source.state}</p>}{source.resolvedPath&&<Button aria-label={`打开来源：${source.resolvedPath}`} onClick={()=>open(source.resolvedPath!)}>打开来源</Button>}
  </div>)}</>));}
  function update(index:number,key:'path'|'quote',value:string){sources[index]={...sources[index],[key]:value,fingerprint:'',state:undefined,resolvedPath:undefined};render();changed();}
  return {set(value:ActionSource[]){sources=value.map(s=>({...s,key:++sequence}));render();},add(source:ActionSource){sources.push({...source,key:++sequence});render();},
    get:()=>sources.map(({path,quote,fingerprint})=>({path:path.trim(),quote,fingerprint})),
    status(index:number,state:string,path?:string,moved=false){if(!sources[index])return;sources[index]={...sources[index],state,resolvedPath:path,...(moved?{path:path!}:{})};render();}};
}
const historyFields={description:'描述',status:'状态',initiativeId:'所属事项',dueDate:'截止日期',waitingOn:'等待条件',sources:'来源引用',focusPosition:'当前重点'};
function revisionChanges(record:ActionRecord,older?:ActionRecord) {
  if(!older)return '创建行动';
  return (Object.keys(historyFields) as (keyof typeof historyFields)[]).filter(key=>JSON.stringify(record[key])!==JSON.stringify(older[key])).map(key=>historyFields[key]).join('、')||'保存记录';
}
export function actionHistory(container:HTMLElement) {
  const root=createRoot(container);
  return (records:ActionRecord[]|null)=>flushSync(()=>root.render(records===null?'正在载入历史…':records.length?records.map((record,index)=><article className="action-revision" key={record.revision}><h3>{labels[record.status]} · {new Date(record.modifiedAt).toLocaleString('zh-CN',{hour12:false})}</h3><p>{record.description}</p><small>{revisionChanges(record,records[index+1])}</small><details className="ui-disclosure"><summary>完整版本与记录详情</summary><pre>{JSON.stringify(record,null,2)}</pre></details></article>):'暂无可用历史。'));
}
