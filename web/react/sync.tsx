import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {actionLabels, initiativeLabels, statusLabel} from '../presentation-labels.js';

export interface Revision {revision:string; title?:string; description?:string; modifiedAt?:string; deleted?:boolean; [key:string]:unknown}
export interface ConflictRecord {
  key:string; id:string; type:string; name:string; versions:Revision[]; tips:Revision[];
  hasDraft?:boolean; incomplete:boolean; cyclic:boolean; selected:string; value:Revision; json:string;
  invalid:boolean; committed:boolean; message:string; detail:string; saving:boolean;
}
export interface SyncModel {cacheWarning?:string;records:ConflictRecord[]; warnings:string[]; running:boolean; checked:boolean; active:string; message:string; detail:string}
export interface SyncCallbacks {close:()=>unknown; refresh:()=>unknown; jump:(key:string)=>unknown; choose:(key:string,revision:string)=>unknown; edit:(key:string,field:string,value:string)=>unknown; discard:(key:string)=>unknown; save:(key:string)=>unknown; recover:(key:string)=>unknown}
export const syncFields:Record<string,string>={description:'内容',title:'名称',status:'状态',goal:'目标',progress:'当前进展',dueDate:'截止日期',waitingOn:'等待对象或条件',initiativeId:'所属事项标识',focusPosition:'重点排序',placement:'建议归属',reasoning:'建议理由',relevance:'当前相关性',deleted:'删除状态',sources:'来源引用',review:'已保存的审核决定',candidateType:'建议类型'};
const labels:Record<string,string>={todo:'待办',doing:'进行中',waiting:'等待中',done:'已完成',canceled:'已取消',active:'进行中',later:'以后再做',ended:'已结束',suggested:'待审核',action:'行动',initiative:'事项',progress:'进展',relationship:'关联'};
export function syncValue(key:string,value:unknown):string {
  if(value==null||value==='')return '未设置';
  if(key==='sources'&&Array.isArray(value))return value.length?value.map(s=>`${s.path}：${s.quote}${s.role?`（${s.role==='reference'?'参考资料':s.role==='working-note'?'工作笔记':s.role}）`:''}`).join('\n'):'无来源引用';
  if(key==='review'&&typeof value==='object') {const r=value as {state:string;decision:string};return `审核进度：${r.state==='done'?'已完成':'待完成'}；决定：${({confirm:'确认',ignore:'忽略',later:'以后再做',reference:'作为参考',attach:'关联'} as Record<string,string>)[r.decision]||'待核对'}`;}
  if(key==='status')return value==='suggested'?'待审核':statusLabel(value);
  if(key==='candidateType')return labels[String(value)]||String(value);
  if(key==='deleted')return value?'已删除':'保留';
  return typeof value==='object'?JSON.stringify(value,null,2):String(value);
}
function Feedback({message,detail=''}:{message:string;detail?:string}) {return <>{message&&<p>{message}</p>}{detail&&<details><summary>查看技术详情</summary><pre>{detail}</pre></details>}</>;}
export function ConflictComparison({record:r,callbacks:c,inert=false}:{record:ConflictRecord;callbacks:SyncCallbacks;inert?:boolean}) {
  const blocked=r.incomplete||r.cyclic;
  const keys=r.type==='initiative'?['title','goal','progress','status']:r.type==='action'?['description','status','dueDate','waitingOn','initiativeId','focusPosition']:r.type==='topic'?['description']:['description','placement','reasoning','relevance'];
  const editorDisabled=!r.selected||r.committed||r.saving;
  const saveDisabled=blocked||!r.selected;
  const statusId=`sync-resolution-${r.type}-${r.id}`;
  const tips = new Set(r.tips.map(version => version.revision));
  const differences = new Set(Object.keys(syncFields).filter(key =>
    r.tips.some(version => JSON.stringify(version[key]) !== JSON.stringify(r.tips[0]?.[key]))));
  function versionDetails(version:Revision) {
    const index = r.versions.findIndex(entry => entry.revision === version.revision);
    const tip = tips.has(version.revision);
    const selected = r.selected === version.revision;
    return <details className="sync-version ui-disclosure" data-selected={selected || undefined} key={version.revision} open={tip || undefined}>
      <summary>版本 {index + 1} · {tip ? '待解决分支' : '历史版本'}{selected && ' · 已选择'}</summary>
      <p className="sync-version-meta">{version.modifiedAt || '时间未知'} · {version.deleted ? '已删除' : '保留记录'}</p>
      <dl>{Object.entries(syncFields).filter(([key]) => Object.hasOwn(version,key) || (tip && differences.has(key))).map(([key,label]) =>
        <div key={key} className={`ui-comparison-row${tip && differences.has(key) ? ' changed' : ''}`}>
          <dt>{label}{tip && differences.has(key) && ' · 有差异'}</dt><dd>{syncValue(key,version[key])}</dd>
        </div>)}</dl>
      <Button className="secondary" disabled={blocked || r.committed || r.saving || Boolean(r.selected && !selected)}
        aria-label={`${r.name}：选择版本 ${index + 1}`} data-revision={version.revision} aria-pressed={selected}
        onClick={() => c.choose(r.key,version.revision)}>选择版本 {index + 1}</Button>
    </details>;
  }
  const history = r.versions.filter(version => !tips.has(version.revision));
  return <article aria-label={r.name} data-sync-key={r.key} data-record-id={r.id} data-entity-type={r.type} data-selected-revision={r.selected||undefined} inert={inert}>
    <h3 tabIndex={-1}>{r.name}</h3>
    <p className="sync-record-state" data-blocked={blocked || undefined}>{r.cyclic?'版本历史形成循环，暂不能保存。请从保留的副本恢复历史，再重新检查。':r.incomplete?'缺少前序版本，暂不能保存。请等待文件到达后重新检查。':'发现冲突版本，请比较后选择或合并。'}</p>
    <h4>比较版本</h4>
    <div className="sync-branches">{r.tips.map(versionDetails)}</div>
    {history.length > 0 && <div className="sync-history"><h5>历史版本</h5>{history.map(versionDetails)}</div>}
    {r.hasDraft&&!r.selected&&<Button onClick={()=>c.recover(r.key)}>恢复未保存解决内容</Button>}
    <h4>审核与编辑解决内容</h4><div id={statusId} role="status" data-state={r.saving?'saving':undefined}><Feedback message={r.invalid && !r.saving ? '' : r.message} detail={r.detail}/></div>
    <div className="sync-editor grid min-w-0">{keys.map(key=><label className="ui-field" key={key}><span>{syncFields[key]}</span>{key==='status'?<select aria-label={syncFields[key]} data-field={key} value={String(r.value[key]??'')} disabled={editorDisabled||r.invalid} onChange={e=>c.edit(r.key,key,e.currentTarget.value)}>{Object.entries(r.type==='initiative'?initiativeLabels:actionLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>:['dueDate','focusPosition'].includes(key)?<Input aria-label={syncFields[key]} type={key==='dueDate'?'date':'number'} data-field={key} value={String(r.value[key]??'')} disabled={editorDisabled||r.invalid} onInput={e=>c.edit(r.key,key,e.currentTarget.value)} onChange={()=>{}}/>:<Textarea rows={2} aria-label={syncFields[key]} data-field={key} value={String(r.value[key]??'')} disabled={editorDisabled||r.invalid} onInput={e=>c.edit(r.key,key,e.currentTarget.value)} onChange={()=>{}}/>}</label>)}</div>
    <details className="ui-disclosure" data-sync-json>
      <summary>高级：完整 JSON 与版本诊断{r.invalid && ' · JSON 格式无效'}</summary>
      <pre>{JSON.stringify({entityId:r.id,tips:r.tips.map(t=>t.revision),versions:r.versions},null,2)}</pre>
      <Textarea className="sync-json" rows={8} aria-label="合并版本 JSON"
        aria-describedby={r.invalid ? `${statusId}-json-error` : statusId} aria-invalid={r.invalid} disabled={editorDisabled}
        value={r.json} onInput={e=>c.edit(r.key,'json',e.currentTarget.value)} onChange={()=>{}}/>
      <div id={`${statusId}-json-error`} className="sync-json-error" role="status">
        {r.invalid && 'JSON 格式无效。请修正后保存，编辑仍保留。'}
      </div>
    </details>
    <footer className="sync-resolution-actions">
      <p>{r.committed
        ? '重试会恢复已保留的本机版本。'
        : '保存会创建引用全部待解决分支的新版本，原始历史和来源笔记均保留。请在高级详情核对删除状态、来源引用和审核决定。'}</p>
      <div className="sync-controls">
        <Button className="secondary" disabled={!r.selected||r.saving} onClick={()=>c.discard(r.key)}>放弃编辑</Button>
        <Button className="primary" disabled={saveDisabled} aria-disabled={r.saving || undefined} onClick={()=>c.save(r.key)}>{r.committed ? '重试本地恢复' : '保存解决结果到本地'}</Button>
      </div>
    </footer>
  </article>;
}
export function SyncContent({model:m,callbacks:c}:{model:SyncModel;callbacks:SyncCallbacks}) {return <>
  <header className="sync-header">
    <div><h2 className="ui-heading">同步检查</h2><p>这里只检查本地版本；无法确认其他设备是否收到。</p></div>
    <div className="sync-controls"><Button onClick={c.close}>关闭检查</Button><Button className="secondary" data-sync-refresh disabled={m.running || Boolean(m.active)} onClick={c.refresh}>重新检查</Button></div>
  </header>
  <div className="sync-body">
  <div role="status" className="ui-feedback" data-sync-status><Feedback message={m.message} detail={m.detail}/></div>
  {m.cacheWarning&&<p role="status" className="ui-feedback">{m.cacheWarning}</p>}
  {m.warnings.length>0&&<div className="ui-feedback"><Feedback message="部分版本需要核对；原文件和历史均保留。缺失历史请等待文件到达后重新检查；损坏文件请从保留的副本恢复。" detail={m.warnings.join('\n')}/></div>}
  {m.records.length > 0 && <nav className="sync-records" aria-label="冲突记录"><h3>冲突记录</h3>
    {m.records.map(r => <Button key={r.key} className="quiet ui-row" disabled={m.running || Boolean(m.active && m.active !== r.key) || r.saving} onClick={() => c.jump(r.key)}>{r.name}</Button>)}
  </nav>}
  {m.records.map(r=><ConflictComparison key={r.key} record={r} callbacks={c} inert={m.running||Boolean(m.active&&m.active!==r.key)}/>)}
  {!m.records.length&&m.checked&&!m.running&&!m.detail&&<p>{m.warnings.length?'未发现可解决的冲突，请先核对上方异常详情。':'现有版本中未发现待处理冲突。'}</p>}
  </div>
</>;}
export function syncView(container:HTMLElement,callbacks:SyncCallbacks) {const root=createRoot(container);return {render(model:SyncModel){flushSync(()=>root.render(<SyncContent model={model} callbacks={callbacks}/>));}};}
export function fileConflictView(container:HTMLElement,copy:()=>unknown,reload:()=>unknown) {const root=createRoot(container);flushSync(()=>root.render(<div className="dialog ui-panel ui-dialog"><h2 id="conflict-heading">文件在其他地方发生了修改</h2><p>你的编辑还在这里。可以另存一份，也可以查看磁盘上的版本。</p><Button busyOnAction id="copy" className="primary" onClick={copy}>将我的编辑另存为副本</Button><Button busyOnAction id="reload" onClick={reload}>载入磁盘版本（放弃当前编辑）</Button></div>));}
