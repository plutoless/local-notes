import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';

export type ShellPage = 'focus'|'notes'|'initiatives'|'organize'|'favorites'|'actions';
interface ShellModel {page:ShellPage; root:string; count:number|string}
interface ShellCallbacks {navigate:(page:ShellPage)=>unknown; capture:()=>unknown; choose:()=>unknown; icon:(name:string)=>string}
const pages = [['focus','当前重点'],['notes','笔记库'],['initiatives','事项'],['organize','整理'],['favorites','收藏']] as const;
export function ShellContent({model:m, callbacks:c}:{model:ShellModel; callbacks:ShellCallbacks}) {
  return <><div className="brand">拾记</div><Button id="new" className="secondary" onClick={c.capture}><span className="contents" dangerouslySetInnerHTML={{__html:c.icon('plus')}}/>随手记</Button><nav aria-label="主导航">{pages.map(([page,label])=><Button key={page} data-view={page} className={m.page===page?'active':''} aria-current={m.page===page?'page':'false'} onClick={()=>c.navigate(page)}><span className="contents" dangerouslySetInnerHTML={{__html:c.icon(page)}}/>{label}{page==='notes'&&<span id="note-count" hidden>{m.count}</span>}</Button>)}<span id="shell-legacy-utilities" className="contents"/></nav><details className="directory-details"><summary><span id="root-name">{m.root==='Sample'?'样本笔记':m.root.split(/[\\/]/).filter(Boolean).pop()||'本地笔记'}</span></summary><div className="folder-label">当前笔记目录</div><div id="root-label">{m.root}</div><Button id="choose" onClick={c.choose}>选择本地目录</Button></details></>;
}
// The application owns one shell for its document lifetime. Legacy utilities have
// an explicit empty island and must never append into React-owned navigation.
let update:((patch:Partial<ShellModel>)=>void)|null=null;
export function shellUpdate(patch:Partial<ShellModel>) {update?.(patch);}
export function shellView(container:HTMLElement, callbacks:ShellCallbacks) {
  const root=createRoot(container);
  let model:ShellModel={page:'focus',root:'样本笔记',count:''};
  update=patch=>{model={...model,...patch}; flushSync(()=>root.render(<ShellContent model={model} callbacks={callbacks}/>));};
  update({});
  return {dispose(){update=null;flushSync(()=>root.unmount());}};
}
