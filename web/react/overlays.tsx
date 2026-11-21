import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter} from './ui/alert-dialog-content';
import {Button} from './components';

/** Empty body/footer slots belong to the consuming view, never two renderers. */
export interface DrawerContentPort {
  body: HTMLDivElement;
  footer: HTMLElement;
  close: HTMLButtonElement;
  setTitle: (title: string) => void;
}
export function drawerContent(panel: HTMLDialogElement, id: string, initialTitle: string, dismiss: () => unknown): DrawerContentPort {
  const root = createRoot(panel);
  let close: HTMLButtonElement | null = null;
  let body: HTMLDivElement | null = null;
  let footer: HTMLElement | null = null;
  // Stable empty slots preserve nested view roots through title changes.
  const render = (title:string) => flushSync(() => root.render(<><header className="ui-drawer-header">
    <h2 className="ui-heading" id={`${id}-title`}>{title}</h2>
    <button type="button" className="ui-action quiet ui-compact" aria-label={`关闭${title}`} ref={node => { close = node; }} onClick={async event => {
      const control = event.currentTarget;
      control.disabled = true;
      try { await dismiss(); } finally { control.disabled = false; }
    }}>关闭</button>
  </header><div className="ui-drawer-body" ref={node => { body = node; }}/><footer className="ui-drawer-footer" ref={node => { footer = node; }}/></>));
  render(initialTitle);
  return {body: body!, footer: footer!, close: close!, setTitle: render};
}

export type LeaveChoice = 'continue' | 'discard' | 'save';
export interface LeaveModel { label: string; failure: string; committed: boolean }
export function LeaveContent({model, choose}: {model: LeaveModel; choose: (choice: LeaveChoice) => void}) {
  return <><AlertDialogHeader><AlertDialogTitle id="task-leave-title">离开{model.label}</AlertDialogTitle>
    <AlertDialogDescription>{model.committed ? '版本已保存，恢复尚未完成。保存并离开会重试恢复；放弃更改并离开只会清除本机待处理状态，已保存版本仍保留。' : '当前编辑尚未保存。请选择保存并离开、放弃更改并离开，或继续编辑。'}</AlertDialogDescription></AlertDialogHeader>
    <p role="alert">{model.failure}</p><AlertDialogFooter className="ui-actions">
      <Button onClick={() => choose('continue')}>继续编辑</Button>
      <Button className="danger" onClick={() => choose('discard')}>放弃更改并离开</Button>
      <Button className="primary" onClick={() => choose('save')}>保存并离开</Button>
    </AlertDialogFooter></>;
}
export function leaveContent(panel: HTMLDialogElement, model: LeaveModel, choose: (choice: LeaveChoice) => void) {
  const root = createRoot(panel);
  flushSync(() => root.render(<LeaveContent model={model} choose={choose}/>));
  return {keep: panel.querySelector<HTMLButtonElement>('button')!, footer: panel.querySelector<HTMLElement>('.ui-actions')!, dispose() {flushSync(() => root.unmount());}};
}
