import {useId, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {ActionStatus} from './actions';
import {focusDirections} from './focus-model';
import './focus-workspace.css';

export interface FocusAction {entityId:string; description:string; status:string; dueDate?:string|null; waitingOn?:string|null; focusPosition:number|null}
export interface FocusInitiative {entityId:string; title:string; progress?:string}
export interface ReadingEntry {path:string; title:string; fingerprint:string; scroll:Record<string,number>}
interface Page<T> {actions:T[]; hasMore:boolean}
export interface FocusModel {
  focused:Page<FocusAction>; waiting:Page<FocusAction>; initiatives:Page<FocusInitiative>;
  recent:ReadingEntry[]; limit:number; offset:number; priorityBusy?:boolean;
}
export interface FocusCallbacks {
  openAction:(action:FocusAction|null, opener:HTMLButtonElement)=>unknown; navigate:(view:string)=>unknown;
  createInitiative:()=>unknown; openInitiative:(record:FocusInitiative, opener:HTMLButtonElement)=>unknown;
  recover:()=>unknown; remove:(action:FocusAction, control:HTMLButtonElement)=>unknown; move:(action:FocusAction,direction:number,control:HTMLButtonElement)=>unknown;
  more:()=>unknown; page:(offset:number)=>unknown; waiting:()=>unknown;
  resume:(entry:ReadingEntry, opener:HTMLButtonElement)=>unknown; removeReading:(path:string, control:HTMLButtonElement)=>unknown;
  status:(value:string)=>string; overdue:(action:FocusAction)=>boolean;
}
function FocusDisclosure({className, focusKey, title, label, description, children}: {
  className:string; focusKey:string; title?:string; label?:string; description?:string; children:ReactNode;
}) {
  const rowMenu = className === 'row-menu';
  return <details className={`ui-disclosure focus-disclosure ${className}`} onBlur={event => {
    if (rowMenu && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }} onKeyDown={event => {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.open = false;
    event.currentTarget.querySelector('summary')?.focus();
  }}>
    <summary data-focus-key={focusKey} aria-label={label} aria-describedby={description}
      onClick={rowMenu ? event => event.currentTarget.focus({preventScroll: true}) : undefined}>
      {rowMenu ? <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>
      </svg> : title}
    </summary>
    <div className="focus-disclosure-actions">{children}</div>
  </details>;
}

export function FocusContent({model:m, callbacks:c}:{model:FocusModel; callbacks:FocusCallbacks}) {
  const descriptionId = useId();
  const visibleCount = Math.min(m.focused.actions.length, m.limit);
  const hasNext = m.focused.hasMore || m.focused.actions.length > m.limit;
  const actionRow = (action:FocusAction, index?:number) => {
    const overdue = Boolean(action.dueDate && c.overdue(action));
    const isNext = m.offset === 0 && index === 0;
    const rowId = `${descriptionId}-${action.entityId}`;
    const description = [isNext && `${rowId}-next`, `${rowId}-status`, action.waitingOn && `${rowId}-waiting`].filter(Boolean).join(' ');
    return <div className="card focus-row" key={action.entityId}>
      <Button busyOnAction className="quiet ui-row focus-row-open" data-focus-row={action.entityId} data-entity-id={action.entityId} aria-label={`打开行动：${action.description}`} aria-describedby={description} onClick={event => c.openAction(action, event.currentTarget)}>
        <span className="focus-action-content">
          <span className="focus-action-title">
            <h3>{action.description}</h3>
            {isNext && <span className="focus-next" id={`${rowId}-next`}>下一步</span>}
          </span>
          <span className="row-meta focus-action-meta" id={`${rowId}-status`}>
            <ActionStatus status={action.status} label={c.status(action.status)}/>
            {action.dueDate && <span className={overdue ? 'action-overdue' : undefined}>{action.dueDate}{overdue && ' · 已逾期'}</span>}
          </span>
          {action.waitingOn && <span className="waiting-condition" id={`${rowId}-waiting`}>{action.waitingOn}</span>}
        </span>
      </Button>
      {index !== undefined && <FocusDisclosure className="row-menu" focusKey={'action:' + action.entityId} label={`管理：${action.description}`}>
        {focusDirections(index, visibleCount, m.offset > 0, hasNext).map(direction =>
          <Button disabled={m.priorityBusy} key={direction} className="quiet ui-compact" onClick={event => c.move(action, direction, event.currentTarget)}>{direction < 0 ? '上移' : '下移'}</Button>)}
        <Button disabled={m.priorityBusy} className="danger ui-compact" onClick={event => c.remove(action, event.currentTarget)}>移出重点</Button>
      </FocusDisclosure>}
    </div>;
  };
  return <>
    <header className="home-tools">
      <h2 className="ui-heading">当前重点</h2>
      <Button busyOnAction className="quiet ui-compact focus-new-action" onClick={event => c.openAction(null, event.currentTarget)}>新建行动</Button>
      <Button busyOnAction className="quiet ui-compact" onClick={() => c.navigate('actions')}>全部行动</Button>
      <FocusDisclosure className="home-utilities" focusKey="utilities" title="更多操作">
        <Button busyOnAction className="quiet ui-compact" onClick={c.createInitiative}>新建事项</Button>
        <Button busyOnAction className="quiet ui-compact" onClick={() => c.navigate('organize')}>整理所选笔记</Button>
        <Button busyOnAction className="quiet ui-compact" onClick={c.recover}>刷新本地记录</Button>
      </FocusDisclosure>
    </header>
    <section className="focus-priorities" data-focus-section="priorities">
      <h2 className="ui-heading">优先处理</h2>
      {!m.focused.actions.length && <div className="focus-empty">
        <p>暂无重点行动。</p><Button busyOnAction className="quiet ui-compact" onClick={() => c.navigate('actions')}>选择重点行动</Button>
      </div>}
      {m.focused.actions.slice(0, m.limit).map((action, index) => actionRow(action, index))}
      {m.limit < 99 && hasNext && <Button busyOnAction onClick={c.more}>展开更多重点行动</Button>}
      {(m.offset > 0 || m.limit === 99) && <div className="ui-pagination">
        <Button busyOnAction disabled={!m.offset} onClick={() => c.page(Math.max(0, m.offset - 99))}>上一页</Button>
        <Button busyOnAction disabled={m.limit !== 99 || !hasNext} onClick={() => c.page(m.offset + 99)}>下一页</Button>
      </div>}
    </section>
    <section data-focus-section="waiting">
      <h2 className="ui-heading">等待与跟进</h2>
      {!m.waiting.actions.length && <p className="focus-empty">没有等待中的行动。</p>}
      {m.waiting.actions.map(action => actionRow(action))}
      {m.waiting.hasMore && <Button busyOnAction onClick={c.waiting}>全部等待行动</Button>}
    </section>
    <section data-focus-section="initiatives">
      <h2 className="ui-heading">继续推进</h2>
      {!m.initiatives.actions.length && <div className="focus-empty">
        <p>暂无进行中的事项。</p><Button busyOnAction className="quiet ui-compact" onClick={c.createInitiative}>新建事项</Button>
      </div>}
      {m.initiatives.actions.map(initiative => {
        const progressId = `${descriptionId}-${initiative.entityId}-progress`;
        return <div className="card focus-row focus-initiative" key={initiative.entityId}>
          <Button busyOnAction className="quiet ui-row" data-focus-row={initiative.entityId}
            aria-label={`打开事项：${initiative.title}`} aria-describedby={progressId} onClick={event => c.openInitiative(initiative, event.currentTarget)}>
            <span className="focus-record-content"><h3>{initiative.title}</h3><span className="row-meta" id={progressId}>{initiative.progress || '暂无进展记录。'}</span></span>
          </Button>
        </div>;
      })}
      {m.initiatives.hasMore && <Button busyOnAction onClick={() => c.navigate('initiatives')}>全部事项</Button>}
    </section>
    {m.recent.length > 0 && <section className="recent-reading" data-focus-section="reading">
      <h2 className="ui-heading">继续阅读</h2>
      {m.recent.map((entry, index) => {
        const pathId = `${descriptionId}-reading-${index}`;
        return <div className="card focus-row" key={entry.path}>
          <Button busyOnAction className="quiet ui-row" data-focus-row={entry.path} data-reading-path={entry.path} aria-label={`继续阅读：${entry.title}`} aria-describedby={pathId} onClick={event => c.resume(entry, event.currentTarget)}>
            <span className="focus-record-content"><h3>{entry.title}</h3><span className="row-meta" id={pathId}>{entry.path}</span></span>
          </Button>
          <FocusDisclosure className="row-menu" focusKey={'reading:' + entry.path} label={`管理阅读入口：${entry.title}`} description={pathId}>
            <Button busyOnAction className="quiet ui-compact" onClick={event => c.removeReading(entry.path, event.currentTarget)}>移除此阅读入口</Button>
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
