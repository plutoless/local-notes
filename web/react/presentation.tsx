import {createRoot, type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {failureMessage} from '../presentation-labels.js';
import {Button} from './components';
export interface ActionOptions {variant?:string; label?:string; density?:string; icon?:string}
export function actionControl(text:string, run:()=>unknown, {variant='quiet',label,density,icon}:ActionOptions={}) {
  const host=document.createElement('span'); host.className='contents';
  const root=createRoot(host);
  flushSync(()=>root.render(<Button className={`${variant}${density==='compact'?' ui-compact':''}`} aria-label={label} busyOnAction onClick={run}>{icon&&<span className="contents" aria-hidden="true" dangerouslySetInnerHTML={{__html:icon}}/>}{text}</Button>));
  return {host, control:host.querySelector<HTMLButtonElement>('button')!, dispose(){flushSync(()=>root.unmount());host.remove();}};
}
export function Feedback({message,diagnostic=''}:{message:string;diagnostic?:string}) {
  return <>{message&&<p>{message}</p>}{diagnostic&&<details><summary>查看技术详情</summary><pre>{diagnostic}</pre></details>}</>;
}
const receipts=new WeakMap<HTMLElement,Root>();
/** The target is a controller-owned receipt slot; React owns only its content host. */
export function feedbackContent(target:HTMLElement,message:string,diagnostic='') {
  const previous=receipts.get(target);
  if(previous) flushSync(()=>previous.unmount());
  const host=document.createElement('div'); host.className='contents';
  target.replaceChildren(host);
  const root=createRoot(host); receipts.set(target,root);
  flushSync(()=>root.render(<Feedback message={message} diagnostic={diagnostic}/>));
}

export interface FeedbackPort {failure:(diagnostic:string,message?:string)=>void}
export function receiptView(target:()=>HTMLElement):FeedbackPort {
  return {failure(diagnostic,message=failureMessage(diagnostic)) {
    const slot=target();slot.classList.add('ui-feedback');slot.dataset.state='failed';
    feedbackContent(slot,message,diagnostic);
  }};
}
