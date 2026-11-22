import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {OfficialButton} from './ui/button';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {statusLabel} from '../presentation-labels.js';
import type {ActionRecord, ActionEntryPort} from './actions';

export interface InitiativeSource {path:string;quote:string;fingerprint:string;role:'working-note'|'reference'}
export interface InitiativeFields {title:string;goal:string;progress:string;status:'active'|'later'|'ended';sources:InitiativeSource[]}
export interface InitiativeRecord extends InitiativeFields {entityId:string;revision:string;workspaceId:string}
/** Static uncontrolled ports: controller owns properties, events and feedback slots. */
export function InitiativeEditor({example = false}: {example?:boolean} = {}){return (          <form id="initiative-form" className="document">
            <label className="ui-field ui-compact">标题<Input id="initiative-title" required aria-invalid={example || undefined} aria-describedby={example ? 'initiative-save-state' : undefined}/></label
            ><label className="ui-field ui-compact"
              >目标<Textarea id="initiative-goal" rows={3}></Textarea></label
            ><label className="ui-field ui-compact"
              >当前进展<Textarea
                id="initiative-progress"
                rows={3}
              ></Textarea></label
            ><label className="ui-field ui-compact"
              >状态<select id="initiative-status">
                <option value="active">进行中</option>
                <option value="later">以后再做</option>
                <option value="ended">已结束</option>
              </select></label
            >
            <details className="ui-disclosure" id="initiative-ending">
              <summary>结束与重新开启</summary>
              <h3>结束前处理未完成行动</h3>
              <p id="initiative-ending-help"></p>
              <p id="initiative-committed-actions" role="status" hidden></p>
              <p>完成或取消会改变行动状态。独立保留或移至其他事项会保留状态。行动逐项保存，重试时已保存的处理仍然有效。</p>
              <div id="initiative-decisions"></div>
              <Button type="button" className="quiet ui-compact" id="initiative-cancel-ending">暂不结束</Button>
            </details>
            <p id="initiative-reopening" hidden>重新开启后可添加行动。此前对行动的处理仍然有效。</p>
            <details className="ui-disclosure" id="initiative-link-details"><summary>管理笔记关联与来源引用</summary>
            <p>工作笔记记录推进过程，参考资料提供依据。移除关联不会删除原文。</p>
            <div id="initiative-sources">
              <section><h4>工作笔记</h4><div id="initiative-working-notes"></div></section>
              <section><h4>参考资料</h4><div id="initiative-references"></div></section>
            </div>
            <Button type="button" className="quiet ui-compact" id="initiative-add-link">关联已有笔记</Button></details>
            <div id="initiative-save-state" className="ui-feedback" role="status" aria-live="polite" data-state={example ? 'failed' : undefined}>{example && '请填写事项标题。'}</div>
          </form>);}
export function InitiativeSummary({record}: {record?:InitiativeRecord}) {
  return <header className="initiative-summary">
    <h1 id="workspace-title" tabIndex={-1}>{record?.title}</h1>
    <p id="workspace-state">{record && statusLabel(record.status)}</p>
    <dl>
      <dt>目标</dt><dd id="workspace-goal">{record?.goal}</dd>
      <dt>当前进展</dt><dd id="workspace-progress">{record?.progress}</dd>
    </dl>
  </header>;
}
export function InitiativeContext(){return <>          <Button id="workspace-return-action" hidden>‹ 返回原行动</Button>
          <div className="workspace-context-heading"><Button id="workspace-back">‹ 事项列表</Button><Button id="workspace-overview" className="secondary">编辑事项</Button></div>
          <InitiativeSummary/>
          <section className="workspace-section"><div className="section-heading"><h2>行动</h2><Button className="quiet" id="initiative-new-action" aria-describedby="initiative-help">新建行动</Button></div>
            <p id="initiative-help">先保存事项，再添加行动或笔记；已结束事项不能添加行动。</p>
            <p id="initiative-actions-state" role="status"></p>
            <div id="initiative-actions"></div>
            <details className="ui-disclosure"><summary>已完成和已取消</summary><div id="initiative-retired"></div></details>
          </section>
          <section className="workspace-section"><div className="section-heading"><h2>笔记与资料</h2><Button className="quiet" id="initiative-new-note" aria-describedby="initiative-help">新建笔记</Button></div>
            <h3>工作笔记</h3><div id="workspace-notes"></div><h3>参考资料</h3><div id="workspace-references"></div>
          </section>
</>;}
export function InitiativeTools(){return <><Button id="initiative-new" className="primary">新建事项</Button><Button id="initiative-previous" className="quiet">上一页</Button><Button id="initiative-next" className="quiet">下一页</Button><Button id="initiative-recover">恢复事项草稿</Button></>;}
export function mountInitiativeControls(body:HTMLElement,footer:HTMLElement,tools:HTMLElement,context:HTMLElement){
  const roots=[createRoot(body),createRoot(footer),createRoot(tools),createRoot(context)];
  flushSync(()=>{roots[0].render(<InitiativeEditor/>);roots[1].render(<><Button id="initiative-discard" className="quiet ui-compact">取消</Button><OfficialButton id="initiative-save" type="submit" form="initiative-form" className="ui-action primary ui-compact">保存事项</OfficialButton></>);roots[2].render(<InitiativeTools/>);roots[3].render(<InitiativeContext/>);});
}
export function InitiativeRows({records,selected,empty,open}:{records:InitiativeRecord[];selected?:string;empty:string;open:(record:InitiativeRecord)=>unknown}){return <>{records.map(record=><Button key={record.entityId} className={`quiet ui-row card${selected===record.entityId?' selected':''}`} data-initiative-id={record.entityId} aria-current={selected===record.entityId?'true':'false'} onClick={()=>open(record)}><h3>{record.title}</h3><p>{statusLabel(record.status)}</p></Button>)}{!records.length&&empty}</>;}
interface ContextLink extends InitiativeSource {warning?:string;resolvedPath?:string}
export function InitiativeLinks({sources,open,selected,empty}:{sources:ContextLink[];open:(path:string,opener:HTMLButtonElement)=>unknown;selected?:string;empty?:string}){
  return <>{sources.map((source,index)=>{
    const path = source.resolvedPath || source.path;
    const identity = JSON.stringify([source.role, source.path, index]);
    const current = selected === identity || selected === path;
    return <Button key={identity} className={`quiet ui-row initiative-source-link${current?' selected':''}`} aria-current={current?'true':'false'} data-path={path} data-source-role={source.role} data-initiative-source={identity} aria-label={`打开${source.role==='reference'?'参考资料':'工作笔记'}：${path}`} onClick={event=>open(path,event.currentTarget)}>
      <span>{path}</span>{source.warning&&<small>{source.warning}</small>}
    </Button>;
  })}{!sources.length&&empty}</>;
}
export function InitiativeActions({actions,open,empty,selected}:{actions:ActionRecord[];open:(action:ActionRecord,opener:HTMLButtonElement)=>unknown;empty:string;selected?:string}){return <>{actions.map(action=><Button key={action.entityId} className={`quiet ui-row${selected===action.entityId?' selected':''}`} aria-current={selected===action.entityId?'true':'false'} data-action-id={action.entityId} onClick={event=>open(action,event.currentTarget)}>{action.description} · {statusLabel(action.status)}</Button>)}{!actions.length&&empty}</>;}
export interface EndingChoice {action:ActionRecord;value:string}
export function InitiativeDecisions({choices,targets}:{choices:EndingChoice[];targets:InitiativeRecord[]}){return <>{choices.map(({action,value})=><label key={`${action.entityId}:${value}`} className="ui-field">结束时处理：{action.description}<select data-action={action.entityId} defaultValue={value}><option value="">请选择处理方式…</option><option value="completed">完成</option><option value="canceled">取消</option><option value="independent">保留为独立行动</option>{targets.map(target=><option key={target.entityId} value={`move:${target.entityId}`}>移至 {target.title}</option>)}</select></label>)}</>;}
/** Each view retains presentation data for metadata detours, never detached DOM. */
function view<P extends object>(container:HTMLElement,Component:(props:P)=>React.ReactNode){
  const root=createRoot(container);let current:P;
  const render=(props:P)=>{current=props;flushSync(()=>root.render(<Component {...props}/>));};
  return {render,snapshot:()=>current,restore:(props:P)=>render(props),select(selected?:string){if(current)render({...current,selected});},release(){flushSync(()=>root.unmount());}};
}
export const initiativeRows=(container:HTMLElement)=>view(container,InitiativeRows);
export function initiativeLinks(container:HTMLElement){
  const port=view(container,InitiativeLinks);
  return {...port,status(path:string,warning:string,resolvedPath?:string){const model=port.snapshot();if(model)port.render({...model,sources:model.sources.map(source=>source.path===path?{...source,warning,resolvedPath}:source)});}};
}
export const initiativeActions=(container:HTMLElement)=>view(container,InitiativeActions);
export const initiativeDecisions=(container:HTMLElement)=>view(container,InitiativeDecisions);
export function mountInitiativeSource(row:HTMLElement,source:InitiativeSource){
 const root=createRoot(row);
 flushSync(()=>root.render(<><label className="ui-field">Markdown 路径<Input required defaultValue={source.path}/></label><label className="ui-field">引用原文<Textarea rows={2} required defaultValue={source.quote}/></label><label className="ui-field">用途<select defaultValue={source.role}><option value="working-note">工作笔记</option><option value="reference">参考资料</option></select></label><Button className="quiet">移除关联</Button><span className="source-state" role="status"/><Button className="quiet source-open">打开来源</Button></>));
 return ()=>flushSync(()=>root.unmount());
}
/** Consumes the delivered shared editor; there is no Initiative-owned Action form. */
export function openInitiativeAction(port:ActionEntryPort,record:ActionRecord|null,opener:HTMLElement,initiativeId?:string){return port.open({record,opener,initiativeId});}
