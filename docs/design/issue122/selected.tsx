import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {Button} from '../../../web/react/components';
import {Input} from '../../../web/react/preview-controls/input';
import {Textarea} from '../../../web/react/preview-controls/textarea';
import {drawer} from '../../../web/presentation.js';
import {notes,paragraphs,code,searchEntries} from './fixtures';
import './selected.css';

type Page = 'reader'|'library'|'actions'|'initiatives';
type Task = 'form'|'search'|null;
// The controller mounts its shared React slots synchronously, outside a React
// render/effect. Only one existing modal owner serves both preview tasks.
let dismissPreview = () => {};
const previewDrawer=drawer({id:'selected-preview-task',title:'任务预览',onDismiss:()=>dismissPreview()});
function SelectedPreview() {
  const [page,setPage]=useState<Page>('reader');
  const [selected,setSelected]=useState(0);
  const [context,setContext]=useState(false);
  const [task,setTask]=useState<Task>(null);
  const portal=previewDrawer;
  const [title,setTitle]=useState(''),[description,setDescription]=useState('保留出处，再决定下一步。');
  const [invalid,setInvalid]=useState(false),[receipt,setReceipt]=useState('');
  const [query,setQuery]=useState('阅读'),[scope,setScope]=useState('all'),[passage,setPassage]=useState('demo-01');
  const [sourceReturn,setSourceReturn]=useState(false);
  const currentTask=useRef<Task>(null);
  const panel=useRef(previewDrawer);
  const contextOpener=useRef<HTMLButtonElement>(null);
  const readingHeading=useRef<HTMLHeadingElement>(null);
  const searchContext=useRef({selected:0,page:'reader' as Page,scroll:0});
  const note=notes[selected];
  const matches=searchEntries.filter(entry=>(scope==='all'||entry.kind===scope)&&(entry.title+entry.excerpt).includes(query));

  function dismiss() {
    panel.current?.hide();
    currentTask.current=null;
    setTask(null);
  }
  function open(next:Exclude<Task,null>,origin:HTMLElement|null) {
    if(currentTask.current) {
      if(currentTask.current==='search'&&next==='search') document.getElementById('selected-query')?.focus();
      return;
    }
    if(next==='search'&&!sourceReturn) searchContext.current={selected,page,scroll:window.scrollY};
    currentTask.current=next;
    setTask(next);
    panel.current?.setTitle(next==='search'?'搜索':'新建行动');
    if(panel.current) panel.current.panel.className=`ui-drawer selected-task ${next}`;
    requestAnimationFrame(()=>{
      const receiver=document.getElementById(next==='search'?'selected-query':'selected-title');
      panel.current?.open(receiver,origin||document.activeElement);
    });
  }
  useEffect(()=>{dismissPreview=dismiss;return ()=>{dismissPreview=()=>{};};},[]);
  useEffect(()=>{
    function shortcut(event:KeyboardEvent) {
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k') {
        event.preventDefault();
        open('search',document.activeElement as HTMLElement);
      }
    }
    document.addEventListener('keydown',shortcut);
    return ()=>document.removeEventListener('keydown',shortcut);
  });
  function pick(index:number) {
    setSelected(index);setPage('reader');setSourceReturn(false);
    requestAnimationFrame(()=>{readingHeading.current?.focus({preventScroll:true});window.scrollTo(0,0);});
  }
  function openSource(index:number) {
    setSelected(index);setPage('reader');setSourceReturn(true);dismiss();
    requestAnimationFrame(()=>{readingHeading.current?.focus({preventScroll:true});window.scrollTo(0,0);});
  }
  function returnToSearch(origin:HTMLElement) {
    const previous=searchContext.current;
    setSelected(previous.selected);setPage(previous.page);
    requestAnimationFrame(()=>{
      window.scrollTo(0,previous.scroll);
      open('search',document.querySelector<HTMLButtonElement>('[data-global-search]')||origin);
    });
    setSourceReturn(false);
  }
  const form=<form id="selected-form" noValidate onSubmit={event=>{
    event.preventDefault();setInvalid(!title.trim());
    setReceipt(title.trim()?'预览已更新，未保存到工作区。':'');
    if(!title.trim()) document.getElementById('selected-title')?.focus();
  }}><label htmlFor="selected-title">行动名称</label><Input id="selected-title" value={title} onChange={event=>{setTitle(event.target.value);setReceipt('');setInvalid(false);}} aria-invalid={invalid} aria-describedby={invalid?'selected-error':undefined}/>
    {invalid&&<p className="error" id="selected-error">请输入行动名称。</p>}
    <label htmlFor="selected-description">补充说明（可选）</label><Textarea id="selected-description" value={description} onChange={event=>{setDescription(event.target.value);setReceipt('');}}/>
    <p className="task-source">来源：{note.path}</p><p role="status">{receipt}</p></form>;
  const search=<div className="search-content"><label htmlFor="selected-query">搜索内容</label><Input id="selected-query" value={query} onChange={event=>setQuery(event.target.value)}/>
    <label htmlFor="selected-scope">范围</label><select id="selected-scope" value={scope} onChange={event=>setScope(event.target.value)}><option value="all">全部内容</option><option value="note">笔记</option><option value="initiative">事项</option><option value="action">行动</option></select>
    <p className="search-count" role="status">{matches.length} 条结果 · 示例数据</p>
    {matches.map(entry=><section className="search-result" key={entry.id}><small>{entry.kind==='note'?'笔记':entry.kind==='initiative'?'事项':'行动'} · {entry.path}</small><Button className={`passage ${passage===entry.id?'chosen':''}`} aria-pressed={passage===entry.id} onClick={()=>setPassage(entry.id)}><strong>{entry.title}</strong><span>{entry.excerpt}</span></Button>{passage===entry.id&&<p className="selection-receipt">已选择片段</p>}<Button onClick={()=>openSource(entry.sourceIndex)}>打开来源笔记</Button></section>)}
    {!matches.length&&<p>没有匹配内容。请调整关键词或范围。</p>}
  </div>;
  return <div className="selected-app">
    <div className="study-bar"><strong>设计预览 · 未接入存储</strong><span>01 文档工作台 ＋ 08 按需上下文</span><a href="?direction=a">查看首轮探索</a></div>
    <div className="page-workspace"><aside className="navigation" aria-label="工作区导航"><div className="workspace-name"><b>拾</b><strong>示例工作区</strong></div>
      <nav aria-label="常用入口"><Button aria-current={page==='library'||page==='reader'?'page':undefined} onClick={()=>setPage('library')}>资料库</Button><Button aria-current={page==='actions'?'page':undefined} onClick={()=>setPage('actions')}>行动</Button><Button aria-current={page==='initiatives'?'page':undefined} onClick={()=>setPage('initiatives')}>事项</Button></nav>
      <div className="common-notes"><h2>常用笔记</h2>{notes.slice(0,4).map((entry,index)=><Button key={entry.id} className={`common-note ${page==='reader'&&selected===index?'current':''}`} aria-current={page==='reader'&&selected===index?'true':undefined} onClick={()=>pick(index)}><span>{entry.title}</span>{entry.title==='会议记录'&&<small>{entry.path}</small>}</Button>)}<Button onClick={()=>setPage('library')}>查看全部笔记</Button></div>
      <p className="workspace-footnote">虚构示例 · 本地预览</p></aside>
      <main><header className="page-toolbar"><span>示例工作区 / {page==='reader'?note.tag:page==='library'?'资料库':page==='actions'?'行动':'事项'}</span><Button data-global-search onClick={event=>open('search',event.currentTarget)}>搜索 <kbd>⌘K</kbd></Button></header>
        {page==='reader'?<><div className="reading-toolbar"><Button onClick={()=>setPage('library')}>返回资料库</Button><div>{sourceReturn&&<Button onClick={event=>returnToSearch(event.currentTarget)}>返回搜索结果</Button>}<Button aria-expanded={context} aria-controls="reference-context" onClick={event=>{contextOpener.current=event.currentTarget;setContext(!context);}}>笔记信息</Button><Button onClick={event=>open('form',event.currentTarget)}>新建行动</Button></div></div>
          <div className={`reading-layout ${context?'has-context':''}`}><article aria-label="Markdown 阅读"><small className="source-path">{note.path}</small><h1 ref={readingHeading} tabIndex={-1}>{note.title}</h1><p className="metadata">{note.date} · {note.tag} · 只读</p><p className="lead">{note.excerpt}</p><h2>保留阅读的上下文</h2>{paragraphs.map(text=><p key={text}>{text}</p>)}<blockquote>先保留上下文，再决定怎样组织。</blockquote><h2>从记录到复用</h2><ol><li>保留原文与出处。</li><li>记录自己正在回答的问题。</li><li>需要时，再作出明确决定。</li></ol><div className="table-scroll" tabIndex={0} aria-label="示例表格，可横向滚动"><table><thead><tr><th>材料</th><th>保留内容</th><th>下一次使用</th></tr></thead><tbody><tr><td>阅读笔记</td><td>原文、问题、出处</td><td>准备研究提纲时核对证据</td></tr><tr><td>会议记录</td><td>讨论背景与未决问题</td><td>下一次讨论前恢复上下文</td></tr></tbody></table></div><pre tabIndex={0} aria-label="示例代码"><code>{code}</code></pre><h2>再次打开时</h2>{paragraphs.map((text,index)=><p key={index}>{text}</p>)}</article>
          {context&&<aside id="reference-context" className="reference-context" aria-label="笔记信息"><header><h2>笔记信息</h2><Button onClick={()=>{setContext(false);contextOpener.current?.focus();}}>收起</Button></header><dl><dt>主题</dt><dd>{note.tag}</dd><dt>修改时间</dt><dd>{note.date}</dd><dt>来源位置</dt><dd>{note.path}</dd></dl><h3>关联行动</h3><p>整理阅读提纲</p><small>示例行动 · 未完成</small><Button onClick={event=>open('form',event.currentTarget)}>从笔记新建行动</Button></aside>}</div></>:page==='library'?<section className="library-page" aria-label="全部笔记"><h1>资料库</h1><p className="metadata">5 篇示例笔记</p>{notes.map((entry,index)=><Button className="library-row" key={entry.id} onClick={()=>pick(index)}><strong>{entry.title}</strong><span>{entry.excerpt}</span><small>{entry.path} · {entry.date}</small></Button>)}</section>:<section className="entity-page"><h1>{page==='actions'?'行动':'事项'}</h1><p>独立管理 · 示例内容</p><h2>{page==='actions'?'整理阅读提纲':'建立可复用的阅读资料'}</h2><p>{page==='actions'?'未完成 · 来源：阅读笔记':'进行中 · 保留原始出处和判断依据'}</p><Button onClick={()=>pick(0)}>查看来源笔记</Button></section>}
      </main></div>
    {portal&&task&&createPortal(task==='form'?form:search,portal.body)}
    {portal&&task&&createPortal(<><span className="preview-only">仅预览，不写入工作区</span><Button onClick={dismiss}>{task==='form'?'取消':'关闭搜索'}</Button>{task==='form'&&<Button form="selected-form" type="submit" className="primary">预览确认</Button>}</>,portal.footer)}
  </div>;
}
createRoot(document.getElementById('root')!).render(<SelectedPreview/>);
