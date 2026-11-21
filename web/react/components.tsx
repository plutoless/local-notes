import {useState, type ButtonHTMLAttributes, type MouseEvent} from 'react';
type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  busyOnAction?:boolean;
  onClick?: (event:MouseEvent<HTMLButtonElement>)=>unknown;
};
export function Button({className = 'quiet', onClick, disabled, busyOnAction = false, ...props}:ButtonProps) {
  const [pending,setPending]=useState(false);
  return <button type="button" className={`ui-action ${className}`} {...props} disabled={disabled||pending} onClick={async event=>{
    if(disabled||pending)return;
    const result=onClick?.(event);
    if(busyOnAction&&result&&typeof (result as PromiseLike<unknown>).then==='function') {
      setPending(true);
      try{await result;}finally{setPending(false);}
    }
  }}/>;
}
