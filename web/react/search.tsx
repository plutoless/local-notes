import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Fragment} from 'react';
import {Button} from './components';
import {Input} from './ui/input';

import type {SearchScope, SearchRow} from './search-model';
export type {SearchNavigation} from './search-model';
export interface SearchModel {
  scope:SearchScope; rows:SearchRow[]; selected:string|null; status:string;
  previous:boolean; next:boolean; initialQuery?:string; tone?:'loading'|'warning'|'error'|'success';
}
export interface SearchCallbacks {
  scope:(scope:SearchScope)=>unknown; close:()=>unknown; page:(direction:number)=>unknown;
  refresh:()=>unknown; expand:(row:SearchRow, toggle?:boolean)=>unknown; copy:(row:SearchRow)=>unknown;
  open:(row:SearchRow)=>unknown;
}
export function SearchPassage({text,query}:{text:string;query:string}) {
  const parts=[]; let start=0, position; const lower=text.toLowerCase(), term=query.toLowerCase();
  while(term&&(position=lower.indexOf(term,start))>=0){
    parts.push(<Fragment key={start}>{text.slice(start,position)}<mark>{text.slice(position,position+term.length)}</mark></Fragment>);
    start=position+term.length;
  }
  return <>{parts}{text.slice(start)}</>;
}
export function SearchContent({model:m,callbacks:c}:{model:SearchModel;callbacks:SearchCallbacks}) {
  return <>
    <h2 id="global-search-title">搜索内容</h2>
    <div className="search-toolbar">
      <label className="search-query">
        <span>关键词</span>
        <Input id="global-search-input" type="search" defaultValue={m.initialQuery} placeholder="搜索标题和正文"/>
      </label>
      <Button onClick={c.close}>关闭搜索</Button>
    </div>
    <div className="search-scopes" role="group" aria-label="搜索范围">
      {([['all','全部内容'],['note','笔记'],['initiative','事项'],['action','行动']] as const).map(([scope,label])=>
        <Button busyOnAction key={scope} data-scope={scope} aria-pressed={scope===m.scope} onClick={()=>c.scope(scope)}>{label}</Button>)}
    </div>
    <p className="search-status" data-tone={m.tone} role="status">{m.status}</p>
    <div className="search-results" aria-label="搜索结果" aria-busy={m.tone==='loading'}>
      {m.rows.map(row=>{
        const selected=m.selected===row.note.identity;
        return <section key={row.note.identity} className="search-result" ref={node=>{row.node=node;}} data-selected={selected}>
          <Button className={`quiet ui-row search-select${selected?' selected':''}`} aria-current={selected} aria-expanded={!!row.expanded}
            onClick={()=>c.expand(row)}>{row.note.title}</Button>
          <p className="search-source">{{note:'笔记',initiative:'事项',action:'行动'}[row.note.type]} · {row.note.contextLabel}</p>
          <span className="search-passage-label">{row.expanded?'展开片段':'匹配片段'}</span>
          <pre className="search-passage" aria-label="复制范围"><SearchPassage text={row.text} query={row.query}/></pre>
          <div className="search-actions">
            <Button aria-expanded={!!row.expanded} onClick={()=>c.expand(row,true)}>{row.expanded?'收起片段':'展开片段'}</Button>
            <Button onClick={()=>c.copy(row)}>复制片段</Button>
            <Button data-search-source onClick={()=>c.open(row)}>{{note:'打开原文',initiative:'打开事项',action:'打开行动'}[row.note.type]}</Button>
          </div>
        </section>;
      })}
    </div>
    <footer className="search-footer">
      <label className="ui-selection search-attribution"><input type="checkbox"/>附带来源</label>
      <div className="search-actions">
        {(m.previous||m.next)&&<>
          <Button busyOnAction disabled={!m.previous} onClick={()=>c.page(-1)}>上一页</Button>
          <Button busyOnAction disabled={!m.next} onClick={()=>c.page(1)}>下一页</Button>
        </>}
        <Button onClick={c.refresh}>刷新索引</Button>
      </div>
    </footer>
    <small className="search-keys">↑↓ 选择 · Enter 展开 · ⌘Enter 复制</small>
  </>;
}
export function searchView(panel:HTMLElement,callbacks:SearchCallbacks){
  const root=createRoot(panel);
  return {render(model:SearchModel){
    flushSync(()=>root.render(<SearchContent model={model} callbacks={callbacks}/>));
    for(const row of model.rows)row.source=row.node?.querySelector<HTMLButtonElement>('[data-search-source]');
  },dispose(){flushSync(()=>root.unmount());}};
}
