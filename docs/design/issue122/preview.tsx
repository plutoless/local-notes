import {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '../../../web/react/components';
import {Input} from '../../../web/react/preview-controls/input';
import {Textarea} from '../../../web/react/preview-controls/textarea';
import {notes,paragraphs,code,searchEntries} from './fixtures';
import './preview.css';
const directions={a:'A · 紧凑索引',b:'B · 阅读书页',c:'C · 分组工作台'};
function Preview(){
 const key=new URLSearchParams(location.search).get('direction')||'a';
 const direction=key in directions?key as keyof typeof directions:'a';
 const [selected,setSelected]=useState(0),[reader,setReader]=useState(false),[panel,setPanel]=useState<'form'|'search'|null>(null);
 const [title,setTitle]=useState(''),[detail,setDetail]=useState('保留出处，再决定下一步。'),[invalid,setInvalid]=useState(true),[receipt,setReceipt]=useState('');
 const [query,setQuery]=useState('阅读'),[scope,setScope]=useState('all'),[passage,setPassage]=useState('demo-01');
 const opener=useRef<HTMLButtonElement|null>(null),panelRef=useRef<HTMLElement|null>(null);
 const open=(kind:'form'|'search',node:HTMLButtonElement)=>{opener.current=node;setPanel(kind);requestAnimationFrame(()=>panelRef.current?.querySelector<HTMLInputElement>('input')?.focus());};
 const close=()=>{setPanel(null);opener.current?.focus();};
 const matches=searchEntries.filter(n=>(scope==='all'||n.kind===scope)&&(n.title+n.excerpt).includes(query));
 const note=notes[selected];
 return <div className={`preview ${direction}`} onKeyDown={e=>{if(e.key==='Escape'&&panel)close();}}>
 <div className="comparison"><strong>设计预览 · 未接入存储</strong><nav aria-label="比较方向">{Object.entries(directions).map(([id,name])=><a href={`?direction=${id}`} aria-current={direction===id?'page':undefined} key={id}>{name}</a>)}</nav></div>
 <header className="shell"><b>拾记</b><span>示例工作区</span><Button onClick={e=>open('search',e.currentTarget)}>搜索</Button></header>
 <div className="workspace"><aside className="rail"><strong>资料库</strong><span>全部笔记</span><span>收藏</span><span>知识管理</span><small>示例资料 · 5 篇</small></aside>
 <main className={reader?'reading':''}><section className="collection" aria-label="笔记列表"><header><div><small>示例资料</small><h1>资料库</h1></div><span>5 篇</span></header>
 <div className="collection-label">最近更新</div><div className="rows">{notes.map((n,i)=><Button key={n.id} className={`row ${selected===i?'selected':''}`} aria-current={selected===i?'true':undefined} onClick={()=>{setSelected(i);setReader(true);}}><strong>{n.title}</strong><p>{n.excerpt}</p><small>{n.tag} · {n.date}</small><small className="path">{n.path}</small></Button>)}</div></section>
 <section className="document" aria-label="Markdown 阅读"><header className="reader-tools"><Button className="back" onClick={()=>setReader(false)}>返回列表</Button><span>笔记 / {note.tag}</span><Button onClick={e=>open('form',e.currentTarget)}>新建行动</Button></header>
 <article><small className="source">{note.path}</small><h1>{note.title}</h1><div className="byline">{note.date} · 示例笔记 · 只读</div><p className="lead">{note.excerpt}</p><h2>保留阅读的上下文</h2>{paragraphs.map(p=><p key={p}>{p}</p>)}<blockquote>先保留上下文，再决定怎样组织。</blockquote><h2>从记录到复用</h2><ol><li>保留原文与出处。</li><li>记录自己正在回答的问题。</li><li>需要时，再作出明确决定。</li></ol><div className="table-scroll" tabIndex={0} aria-label="示例表格，可横向滚动"><table><thead><tr><th>材料</th><th>保留内容</th><th>下一次使用</th></tr></thead><tbody><tr><td>阅读笔记</td><td>原文、问题、出处</td><td>准备研究提纲时核对证据</td></tr><tr><td>会议记录</td><td>讨论背景与未决问题</td><td>下一次讨论前恢复上下文</td></tr></tbody></table></div><pre tabIndex={0} aria-label="示例代码"><code>{code}</code></pre><h2>再次打开时</h2>{paragraphs.map((p,i)=><p key={i}>{p}</p>)}</article></section></main></div>
 {panel&&<section ref={panelRef} className={`stage ${panel}`} aria-label={panel==='form'?'新建行动预览':'全局搜索预览'}><header><div><small>来自：{note.title}</small><h2>{panel==='form'?'新建行动':'搜索'}</h2></div><Button onClick={close}>关闭</Button></header>
 {panel==='form'?<form onSubmit={e=>{e.preventDefault();setInvalid(!title.trim());setReceipt(title.trim()?'预览已更新，未保存到工作区。':'');if(!title.trim())document.getElementById('action-title')?.focus();}} noValidate><div className="panel-body"><label htmlFor="action-title">行动名称</label><Input id="action-title" value={title} onChange={e=>{setTitle(e.target.value);setInvalid(!e.target.value.trim());}} aria-invalid={invalid} aria-describedby={invalid?'title-error':undefined}/>{invalid&&<p id="title-error" className="error">请输入行动名称。</p>}<label htmlFor="detail">补充说明（可选）</label><Textarea id="detail" value={detail} onChange={e=>setDetail(e.target.value)}/><p className="context">来源：{note.path}</p><p role="status">{receipt}</p></div><footer><Button onClick={close}>取消</Button><Button type="submit" className="primary">预览确认</Button></footer></form>:<div className="panel-body"><label htmlFor="query">搜索笔记</label><Input id="query" value={query} onChange={e=>setQuery(e.target.value)}/><label htmlFor="scope">范围</label><select id="scope" value={scope} onChange={e=>setScope(e.target.value)}><option value="all">全部内容</option><option value="note">笔记</option><option value="initiative">事项</option><option value="action">行动</option></select><p role="status">{matches.length} 条结果 · 示例数据</p>{matches.map(n=><div className={`result ${passage===n.id?'chosen':''}`} key={n.id}><small>{n.kind==='note'?'笔记':n.kind==='initiative'?'事项':'行动'}</small><Button className="passage" aria-pressed={passage===n.id} onClick={()=>setPassage(n.id)}><strong>{n.title}</strong><p>{n.excerpt}</p></Button><small>{n.path}</small>{passage===n.id&&<p className="selection-receipt">已选择片段</p>}<Button onClick={()=>{setSelected(n.sourceIndex);setReader(true);close();}}>打开来源笔记</Button></div>)}{!matches.length&&<p>没有匹配的笔记。请调整关键词或范围。</p>}</div>}</section>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
