import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Fragment} from 'react';
import {Button} from './components';

import type {SearchScope, SearchRow} from './search-model';
export type {SearchNavigation} from './search-model';
export interface SearchModel {
  scope:SearchScope; rows:SearchRow[]; selected:string|null; status:string;
  previous:boolean; next:boolean;
}
export interface SearchCallbacks {
  scope:(scope:SearchScope)=>unknown; close:()=>unknown; page:(direction:number)=>unknown;
  refresh:()=>unknown; expand:(row:SearchRow)=>unknown; copy:(row:SearchRow)=>unknown;
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
  return <><h2 id="global-search-title">搜索内容</h2>
    <label className="ui-field"><span>关键词</span><input id="global-search-input" type="search" aria-invalid="false"/></label>
    <Button onClick={c.close}>关闭搜索</Button>
    <div className="search-scopes flex flex-wrap" role="group" aria-label="搜索范围">{([['all','全部内容'],['note','笔记'],['initiative','事项'],['action','行动']] as const).map(([scope,label])=><Button key={scope} data-scope={scope} aria-pressed={scope===m.scope} onClick={()=>c.scope(scope)}>{label}</Button>)}</div>
    <p role="status">{m.status}</p>
    <div className="search-results" aria-label="搜索结果">{m.rows.map(row=><section key={row.note.identity} className="search-result" ref={node=>{row.node=node;}}>
      <Button className={`quiet ui-row search-select${m.selected===row.note.identity?' selected':''}`} aria-current={m.selected===row.note.identity?'true':'false'} onClick={()=>c.expand(row)}>{row.note.title}</Button>
      <p>{{note:'笔记',initiative:'事项',action:'行动'}[row.note.type]} · {row.note.contextLabel}</p>
      <pre className="search-passage" aria-label="复制范围"><SearchPassage text={row.text} query={row.query}/></pre>
      <Button busyOnAction onClick={()=>c.copy(row)}>复制片段</Button>
      <Button busyOnAction onClick={()=>c.open(row)}>{{note:'打开原文',initiative:'打开事项',action:'打开行动'}[row.note.type]}</Button>
    </section>)}</div>
    <div className="ui-pagination"><Button disabled={!m.previous} onClick={()=>c.page(-1)}>上一页</Button><Button disabled={!m.next} onClick={()=>c.page(1)}>下一页</Button></div>
    <label className="ui-selection search-attribution"><input type="checkbox"/>附带来源</label>
    <Button busyOnAction onClick={c.refresh}>刷新索引</Button>
    <small>本地关键词 · ↑↓ 选择 · Enter 展开 · ⌘Enter 复制</small>
  </>;
}
export function searchView(panel:HTMLElement,callbacks:SearchCallbacks){
  const root=createRoot(panel);
  return {render(model:SearchModel){
    flushSync(()=>root.render(<SearchContent model={model} callbacks={callbacks}/>));
    for(const row of model.rows)row.source=row.node?.querySelectorAll('button')[2];
  },dispose(){flushSync(()=>root.unmount());}};
}
