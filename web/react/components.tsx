import {OfficialButton} from './ui/button';
import {flushSync} from 'react-dom';
import {useState, type ComponentProps, type MouseEvent} from 'react';
type ButtonProps = Omit<ComponentProps<'button'>, 'onClick'> & {
  busyOnAction?:boolean;
  onClick?: (event:MouseEvent<HTMLButtonElement>)=>unknown;
};
export function Button({className = 'quiet', onClick, disabled, busyOnAction = false, ...props}:ButtonProps) {
  const [pending,setPending]=useState(false);
  return <OfficialButton type="button" className={`ui-action ${className}`} {...props} disabled={disabled||pending} onClick={async event=>{
    if(disabled||pending)return;
    const result=onClick?.(event);
    if(busyOnAction&&result&&typeof (result as PromiseLike<unknown>).then==='function') {
      flushSync(()=>setPending(true));
      try{await result;}finally{
        // Dialog return can run before React commits its pending-state render.
        // Keep the real stable receiver available when the action has settled.
        flushSync(()=>setPending(false));
      }
    }
  }}/>;
}
