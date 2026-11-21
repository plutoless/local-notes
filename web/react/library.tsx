import {createRoot, type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import type {LibraryControlsModel, LibraryCallbacks, LibraryNote} from './library-model';
function Controls({model:m, callbacks:c}: {model:LibraryControlsModel; callbacks:LibraryCallbacks}) {
  return <>
    <div className="library-filter-group" role="group" aria-label="笔记筛选与管理">
      <label className="library-browse-control">排序<select id="library-order" aria-label="排序" value={m.order} onChange={e=>c.filter('order',e.target.value)}><option value="current">非归档优先</option><option value="path">路径</option><option value="title">标题</option></select></label>
      <label className="library-browse-control">归档范围<select id="library-archives" aria-label="归档范围" value={m.archives} onChange={e=>c.filter('archives',e.target.value)}><option value="include">包含归档</option><option value="exclude">不含归档</option><option value="only">仅归档</option></select></label>
      <select id="library-topic" aria-label="筛选主题" value={m.topic} onChange={e=>c.filter('topic',e.target.value)}><option value="">全部主题</option><option value="uncategorized">未分类</option>{m.topics.map(t=><option key={t.entityId} value={t.entityId}>{t.description}</option>)}</select>
      <Button id="library-create-topic" className="quiet ui-compact" onClick={e=>c.createTopic(e.currentTarget)}>新建主题</Button>
      <Button id="library-rename-topic" className="quiet ui-compact" disabled={!m.topics.some(t=>t.entityId===m.topic)} onClick={e=>c.renameTopic(e.currentTarget)}>重命名主题</Button>
    </div>
    <div className="library-location-group" role="group" aria-label="目录导航"><span id="library-location">{m.directory==='*'?'全部目录':m.directory||'/'}</span><Button id="library-back" className="quiet ui-compact" disabled={m.directory==='*'} onClick={c.parent}>上一级目录</Button><Button id="library-refresh" className="secondary ui-compact" disabled={m.refreshing} onClick={c.refresh}>刷新</Button></div>
    <div className="ui-pagination" aria-label="笔记分页"><Button id="library-previous" className="secondary ui-compact" disabled={!m.previous} onClick={()=>c.page(-1)}>上一页</Button><Button id="library-next" className="secondary ui-compact" disabled={!m.next} onClick={()=>c.page(1)}>下一页</Button></div><p id="library-page" role="status">{m.count}</p>
    <div id="library-progress" role="status">{m.progress}{m.detail&&<details><summary>查看详情</summary><pre>{m.detail}</pre></details>}</div>
  </>;
}
interface RowsModel {notes:LibraryNote[]; directories:string[]; selectedPath?:string; empty:string; root:boolean; open:(path:string)=>void; browse:(path:string)=>void}
export function LibraryRows({notes,directories,selectedPath,empty,root,open,browse}:RowsModel) {
  return <>{root&&<Button onClick={()=>browse('')}>浏览目录</Button>}{directories.map(path=><Button key={path} onClick={()=>browse(path)}>目录：{path}</Button>)}
    {empty&&<p className="no-items text-secondary" role="status">{empty}</p>}
    {notes.map(note=><Button key={note.path} type="button" data-path={note.path} className={`quiet ui-row card w-full text-left ${note.path===selectedPath?'selected':''}`} aria-current={note.path===selectedPath?'true':undefined} onClick={()=>open(note.path)}><h3>{note.title}</h3><p>{note.excerpt||'暂无正文摘要'}</p><small>{note.archived?'归档 · ':''}{note.path}</small><small>{Number.isFinite(note.modified)?'文件修改：'+new Date(note.modified!*1000).toLocaleDateString():'文件修改时间未知'}</small></Button>)}
  </>;
}
export function libraryView(container:HTMLElement, tools:HTMLElement, callbacks:LibraryCallbacks) {
  const controls=createRoot(tools); let rows:Root|null=null;
  return {
    controls(model:LibraryControlsModel) {
      const focused=document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
      flushSync(()=>controls.render(<Controls model={model} callbacks={callbacks}/>));
      const control=focused&&tools.querySelector<HTMLButtonElement>('#'+focused);
      if(['library-previous','library-next'].includes(focused)&&control&&control.disabled) (tools.querySelector<HTMLButtonElement>('#library-previous:not(:disabled)') || tools.querySelector<HTMLButtonElement>('#library-next:not(:disabled)') || tools.querySelector<HTMLButtonElement>('#library-refresh:not(:disabled)'))?.focus({preventScroll:true});
    },
    rows(model:RowsModel) {rows ||= createRoot(container); flushSync(()=>rows!.render(<LibraryRows {...model}/>));},
    release() {if(rows){flushSync(()=>rows!.unmount());rows=null;}}
  };
}
