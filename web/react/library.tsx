import {createRoot, type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import type {LibraryControlsModel, LibraryCallbacks, LibraryNote} from './library-model';
function Controls({model, callbacks}: {model:LibraryControlsModel; callbacks:LibraryCallbacks}) {
  const {order, archives, topic, topics, directory, count, progress, detail, refreshing, previous, next} = model;
  return <>
    <div className="library-filter-group" role="group" aria-label="笔记筛选与管理">
      <label className="library-browse-control">排序
        <select id="library-order" aria-label="排序" value={order} onChange={event=>callbacks.filter('order',event.target.value)}>
          <option value="current">非归档优先</option><option value="path">路径</option><option value="title">标题</option>
        </select>
      </label>
      <label className="library-browse-control">归档范围
        <select id="library-archives" aria-label="归档范围" value={archives} onChange={event=>callbacks.filter('archives',event.target.value)}>
          <option value="include">包含归档</option><option value="exclude">不含归档</option><option value="only">仅归档</option>
        </select>
      </label>
      <label className="library-browse-control">主题
        <select id="library-topic" aria-label="筛选主题" value={topic} onChange={event=>callbacks.filter('topic',event.target.value)}>
          <option value="">全部主题</option><option value="uncategorized">未分类</option>
          {topics.map(item=><option key={item.entityId} value={item.entityId}>{item.description}</option>)}
        </select>
      </label>
      <div className="library-topic-actions">
        <Button id="library-create-topic" className="quiet ui-compact" onClick={event=>callbacks.createTopic(event.currentTarget)}>新建主题</Button>
        <Button id="library-rename-topic" className="quiet ui-compact" disabled={!topics.some(item=>item.entityId===topic)} onClick={event=>callbacks.renameTopic(event.currentTarget)}>重命名主题</Button>
      </div>
    </div>
    <div className="library-location-group" role="group" aria-label="目录导航">
      <span id="library-location">{directory==='*'?'全部目录':directory||'/'}</span>
      <Button id="library-back" className="quiet ui-compact" disabled={directory==='*'} onClick={callbacks.parent}>上一级目录</Button>
      <Button id="library-refresh" className="quiet ui-compact" disabled={refreshing} onClick={callbacks.refresh}>刷新</Button>
    </div>
    <div className="ui-pagination" role="group" aria-label="笔记分页">
      <p id="library-page" role="status">{count}</p>
      <Button id="library-previous" className="quiet ui-compact" disabled={!previous} onClick={()=>callbacks.page(-1)}>上一页</Button>
      <Button id="library-next" className="quiet ui-compact" disabled={!next} onClick={()=>callbacks.page(1)}>下一页</Button>
    </div>
    <div id="library-progress" className={progress || detail ? 'library-progress-active' : undefined}>
      <span role="status">{progress}</span>
      {detail&&<details><summary>查看详情</summary><pre>{detail}</pre></details>}
    </div>
  </>;
}

interface RowsModel {notes:LibraryNote[]; directories:string[]; selectedPath?:string; empty:string; root:boolean; open:(path:string)=>void; browse:(path:string)=>void}
export function LibraryRows({notes,directories,selectedPath,empty,root,open,browse}:RowsModel) {
  return <>
    {(root || directories.length > 0) && <div className="library-directory-links" role="group" aria-label="浏览目录">
      {root&&<Button className="quiet ui-compact" busyOnAction onClick={()=>browse('')}>浏览目录</Button>}
      {directories.map(path=><Button className="quiet ui-compact" busyOnAction key={path} onClick={()=>browse(path)}>目录：{path}</Button>)}
    </div>}
    {empty&&<p className="no-items library-empty" role="status">{empty}</p>}
    {notes.map(note=>{
      const selected = note.path === selectedPath;
      return <Button key={note.path} data-path={note.path} className={`quiet ui-row card library-note-row${selected?' selected':''}`}
        aria-current={selected?'true':undefined} onClick={()=>open(note.path)}>
        <h3>{note.title}</h3>
        <p>{note.excerpt||'暂无正文摘要'}</p>
        <span className="library-note-meta">
          <small>{note.archived?'归档 · ':''}{note.path}</small>
          <small>{note.modified === undefined ? '文件修改时间未知' : '修改：'+new Date(note.modified*1000).toLocaleDateString()}</small>
        </span>
      </Button>;
    })}
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
