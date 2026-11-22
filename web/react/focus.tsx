import {useId, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {ActionStatus} from './actions';
import './focus-workspace.css';

export interface FocusAction {entityId:string; description:string; status:string; dueDate?:string|null; waitingOn?:string|null; focusPosition:number|null}
export interface FocusInitiative {entityId:string; title:string; progress?:string}
export interface ReadingEntry {path:string; title:string; fingerprint:string; scroll:Record<string,number>}
interface Page<T> {actions:T[]; hasMore:boolean}
export interface FocusModel {
  focused:Page<FocusAction>; waiting:Page<FocusAction>; initiatives:Page<FocusInitiative>;
  recent:ReadingEntry[]; limit:number; offset:number;
}
export interface FocusCallbacks {
  openAction:(action:FocusAction|null)=>unknown; navigate:(view:string)=>unknown;
  createInitiative:()=>unknown; openInitiative:(record:FocusInitiative)=>unknown;
  recover:()=>unknown; remove:(action:FocusAction)=>unknown; move:(action:FocusAction,index:number,direction:number)=>unknown;
  more:()=>unknown; page:(offset:number)=>unknown; waiting:()=>unknown;
  resume:(entry:ReadingEntry)=>unknown; removeReading:(path:string)=>unknown;
  status:(value:string)=>string; overdue:(action:FocusAction)=>boolean;
}
function FocusDisclosure({className, focusKey, title, label, description, children}: {
  className:string; focusKey:string; title:string; label?:string; description?:string; children:ReactNode;
}) {
  return <details className={`ui-disclosure focus-disclosure ${className}`} onKeyDown={event => {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.open = false;
    event.currentTarget.querySelector('summary')?.focus();
  }}>
    <summary data-focus-key={focusKey} aria-label={label} aria-describedby={description}>{title}</summary>
    <div className="focus-disclosure-actions">{children}</div>
  </details>;
}

export function FocusContent({model:m, callbacks:c}:{model:FocusModel; callbacks:FocusCallbacks}) {
  const readingPathId = useId();
  const actionRow = (action:FocusAction, index?:number) => {
    const overdue = Boolean(action.dueDate && c.overdue(action));
    return <div className="card focus-row" key={action.entityId}>
      <Button busyOnAction className="quiet ui-row focus-row-open" data-entity-id={action.entityId} aria-label={`打开行动：${action.description}`} onClick={() => c.openAction(action)}>
        <span>
          <h3>{action.description}</h3>
          <span className="row-meta">
            <ActionStatus status={action.status} label={c.status(action.status)}/>
            {action.dueDate && <span className={overdue ? 'action-overdue' : undefined}>{action.dueDate}{overdue && ' · 已逾期'}</span>}
          </span>
          {action.waitingOn && <span className="waiting-condition">{action.waitingOn}</span>}
        </span>
      </Button>
      {index !== undefined && <FocusDisclosure className="row-menu" focusKey={'action:' + action.entityId} title="管理" label={`管理：${action.description}`}>
        {[-1, 1].filter(direction => index + direction >= 0 && m.focused.actions[index + direction]).map(direction =>
          <Button busyOnAction key={direction} className="quiet ui-compact" onClick={() => c.move(action, index, direction)}>{direction < 0 ? '上移' : '下移'}</Button>)}
        <Button busyOnAction className="danger ui-compact" onClick={() => c.remove(action)}>移出重点</Button>
      </FocusDisclosure>}
    </div>;
  };
  return <>
    <div className="home-tools">
      <h2 className="ui-heading">当前重点</h2>
      <Button busyOnAction className="primary ui-compact" onClick={() => c.openAction(null)}>新建行动</Button>
      <Button busyOnAction className="quiet ui-compact" onClick={() => c.navigate('actions')}>全部行动</Button>
      <FocusDisclosure className="home-utilities" focusKey="utilities" title="更多操作">
        <Button busyOnAction className="quiet ui-compact" onClick={c.createInitiative}>新建事项</Button>
        <Button busyOnAction className="quiet ui-compact" onClick={() => c.navigate('organize')}>整理所选笔记</Button>
        <Button busyOnAction className="quiet ui-compact" onClick={c.recover}>刷新本地记录</Button>
      </FocusDisclosure>
    </div>
    <section className="focus-priorities">
      <h2 className="ui-heading">优先处理</h2>
      {!m.focused.actions.length && <div className="focus-empty">
        <p>暂无重点行动。</p><Button busyOnAction className="quiet ui-compact" onClick={() => c.navigate('actions')}>选择重点行动</Button>
      </div>}
      {m.focused.actions.slice(0, m.limit).map((action, index) => actionRow(action, index))}
      {(m.focused.actions.length > m.limit || m.focused.hasMore) && <Button busyOnAction onClick={c.more}>展开更多重点行动</Button>}
      {(m.offset > 0 || m.limit === 99) && <div className="ui-pagination">
        <Button busyOnAction disabled={!m.offset} onClick={() => c.page(Math.max(0, m.offset - 99))}>上一页</Button>
        <Button busyOnAction disabled={!(m.limit === 99 && (m.focused.hasMore || m.focused.actions.length > m.limit))} onClick={() => c.page(m.offset + 99)}>下一页</Button>
      </div>}
    </section>
    <div className="home-side">
      <section>
        <h2 className="ui-heading">等待与跟进</h2>
        {!m.waiting.actions.length && <p className="focus-empty">没有等待中的行动。</p>}
        {m.waiting.actions.map(action => actionRow(action))}
        {m.waiting.hasMore && <Button busyOnAction onClick={c.waiting}>全部等待行动</Button>}
      </section>
      <section>
        <h2 className="ui-heading">继续推进</h2>
        {!m.initiatives.actions.length && <div className="focus-empty">
          <p>暂无进行中的事项。</p><Button busyOnAction className="quiet ui-compact" onClick={c.createInitiative}>新建事项</Button>
        </div>}
        {m.initiatives.actions.map(initiative => <div className="card focus-initiative" key={initiative.entityId}>
          <h3>{initiative.title}</h3><p>{initiative.progress || '暂无进展记录。'}</p>
          <Button busyOnAction className="quiet ui-compact" aria-description={initiative.title} onClick={() => c.openInitiative(initiative)}>打开事项</Button>
        </div>)}
        {m.initiatives.hasMore && <Button busyOnAction onClick={() => c.navigate('initiatives')}>全部事项</Button>}
      </section>
    </div>
    {m.recent.length > 0 && <section className="recent-reading">
      <h2 className="ui-heading">继续阅读</h2>
      {m.recent.map((entry, index) => {
        const pathId = `${readingPathId}-${index}`;
        return <div className="card" key={entry.path}>
          <Button busyOnAction className="quiet ui-row" data-reading-path={entry.path} aria-label={`继续阅读：${entry.title}`} aria-describedby={pathId} onClick={() => c.resume(entry)}>
            <span><h3>{entry.title}</h3><span className="row-meta" id={pathId}>{entry.path}</span></span>
          </Button>
          <FocusDisclosure className="row-menu" focusKey={'reading:' + entry.path} title="管理" label={`管理阅读入口：${entry.title}`} description={pathId}>
            <Button busyOnAction className="quiet ui-compact" onClick={() => c.removeReading(entry.path)}>移除此阅读入口</Button>
          </FocusDisclosure>
        </div>;
      })}
    </section>}
  </>;
}
export function focusView(container:HTMLElement, callbacks:FocusCallbacks) {
  let root:Root|null=null;
  return {render(model:FocusModel) {root ||= createRoot(container); flushSync(()=>root!.render(<FocusContent model={model} callbacks={callbacks}/>));},
    release() {if(root){flushSync(()=>root!.unmount());root=null;}}};
}
