import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {workspacePageLabels} from '../presentation-labels.js';

export type ShellPage = keyof typeof workspacePageLabels;
interface ShellModel {page:ShellPage; root:string; count:number|string}
interface ShellCallbacks {navigate:(page:ShellPage)=>unknown; capture:()=>unknown; search:()=>unknown; choose:()=>unknown; icon:(name:string)=>string}
const readingPages = ['focus','notes','favorites'] as const;
const managementPages = ['actions','initiatives','organize'] as const;
export function ShellContent({model:m, callbacks:c}:{model:ShellModel; callbacks:ShellCallbacks}) {
  const pageButton = (page:ShellPage) => (
    <Button key={page} data-view={page} className={`quiet ui-compact ${m.page===page?'active':''}`}
      aria-current={m.page===page?'page':'false'} onClick={()=>c.navigate(page)}>
      <span className="contents" dangerouslySetInnerHTML={{__html:c.icon(page)}}/>{workspacePageLabels[page]}
      {page==='notes' && <span id="note-count" hidden>{m.count}</span>}
    </Button>
  );
  return <>
    <div className="brand"><span aria-hidden="true">拾</span>拾记</div>
    <div className="shell-commands">
      <Button id="new" className="quiet ui-compact" onClick={c.capture}>
        <span className="contents" dangerouslySetInnerHTML={{__html:c.icon('plus')}}/>随手记
      </Button>
      <Button id="global-search-open" className="quiet ui-compact" aria-haspopup="dialog"
        aria-controls="global-search" aria-keyshortcuts="Meta+K Control+K" onClick={c.search}>
        <span className="contents" dangerouslySetInnerHTML={{__html:c.icon('search')}}/>搜索
      </Button>
      <span id="shell-search-return" className="contents"/>
    </div>
    <nav aria-label="主导航">
      <div className="shell-nav-group">{readingPages.map(pageButton)}</div>
      <div className="shell-nav-group">{managementPages.map(pageButton)}<span id="shell-utilities" className="contents"/></div>
    </nav>
    <DirectoryOptions root={m.root} choose={c.choose} folderIcon={c.icon('folder')}/>
  </>;
}

function DirectoryOptions({root, choose, folderIcon}: {root:string; choose:ShellCallbacks['choose']; folderIcon:string}) {
  const name = root.split(/[\\/]/).filter(Boolean).pop() || '本地笔记';
  return <div className="shell-directory">
    <div className="workspace-identity">
      <span className="folder-label">当前目录</span>
      <span id="root-name">{root === 'Sample' ? '样本笔记' : name}</span>
    </div>
    <details className="directory-details" onKeyDown={event => {
      if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.open = false;
      event.currentTarget.querySelector('summary')?.focus();
    }}>
      <summary>目录选项</summary>
      <div className="directory-options">
        <dl>
          <dt>目录位置</dt>
          <dd id="root-label">{root === 'Sample' ? '样本笔记' : root}</dd>
        </dl>
        <Button className="quiet ui-compact" id="choose" onClick={choose}>
          <span className="contents" dangerouslySetInnerHTML={{__html:folderIcon}}/>选择本地目录
        </Button>
      </div>
    </details>
  </div>;
}
// The application owns one shell for its document lifetime. Utility view hosts
// occupy an explicit empty slot without mutating React-owned navigation.
let update:((patch:Partial<ShellModel>)=>void)|null=null;
export function shellUpdate(patch:Partial<ShellModel>) {update?.(patch);}
export function shellView(container:HTMLElement, callbacks:ShellCallbacks) {
  const root=createRoot(container);
  let model:ShellModel={page:'focus',root:'样本笔记',count:''};
  update=patch=>{model={...model,...patch}; flushSync(()=>root.render(<ShellContent model={model} callbacks={callbacks}/>));};
  update({});
  return {dispose(){update=null;flushSync(()=>root.unmount());}};
}
