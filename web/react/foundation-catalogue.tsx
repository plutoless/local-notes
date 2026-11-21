import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {ActionField} from './actions';
import {Button} from './components';
import {Feedback} from './presentation';
import {LeaveContent} from './overlays';
import {renderMarkdown} from '../core.js';

const tokens=['text','muted','surface','canvas','sidebar','accent','selected','selected-text','line','divider','focus','success','warning','danger','space','target-height','button-surface','field-surface','control-inset','radius','radius-panel'];
function FoundationCatalogue({openPanel}:{openPanel:()=>unknown}) {
  const [receipt,setReceipt]=useState('');
  return <><h1>Production primitives and states</h1><p>Maintainer reference using consumed production components and semantic tokens. No storage, model request or retrieval.</p>
    <section><h2>Computed semantic tokens</h2><div id="tokens" className="examples">{tokens.map(token=><span key={token} className="swatch">--{token}: {getComputedStyle(document.documentElement).getPropertyValue('--'+token)}</span>)}</div></section>
    <section><h2>Actions and feedback</h2><div id="actions" className="examples">{['primary','secondary','quiet','danger'].map((variant,i)=><Button key={variant} className={`${variant} ui-compact`} onClick={()=>setReceipt('已保存到本地')}>{['保存行动','保存笔记','返回任务','移出重点'][i]}</Button>)}<Button disabled className="quiet ui-compact">正在保存…</Button></div><div id="receipt" role="status"><Feedback message={receipt}/></div></section>
    <section><h2>Inline reader navigation</h2><div dangerouslySetInnerHTML={{__html:renderMarkdown('参考 [[folder/note|本地笔记]] 继续阅读。')}}/></section>
    <section><h2>Fields and validation</h2><div id="fields"><ActionField label="事项标题"><input defaultValue="持续推进的事项" required/></ActionField><ActionField label="事项标题"><input aria-invalid="true" required aria-describedby="catalogue-invalid-help"/></ActionField><small id="catalogue-invalid-help">请填写标题，编辑仍保留。</small></div></section>
    <section><h2>Feedback states</h2><div id="states">{[['normal','尚未选择内容'],['empty','还没有重点行动。'],['loading','正在载入重点…'],['dirty','编辑中…'],['saving','正在保存…'],['invalid','请填写标题，编辑仍保留'],['failed','未保存 · 编辑仍保留'],['saved','已保存到本地'],['recovered','已恢复未保存草稿']].map(([state,text])=><div key={state} role="status" className="ui-feedback" data-state={state}><Feedback message={text} diagnostic={state==='failed'?'Controlled failure example':''}/></div>)}</div></section>
    <section id="panel"><h2>Shared leave content</h2><p>The application controller owns dialog lifetime, containment and return. This example demonstrates the same decision content without persistence.</p><Button onClick={openPanel}>打开核对面板</Button><LeaveContent model={{label:'当前编辑',failure:'保存尚未完成，编辑仍保留。',committed:false}} choose={()=>{}}/></section>
  </>;
}
export function mountFoundationCatalogue(container:HTMLElement,openPanel:()=>unknown) {const root=createRoot(container);root.render(<FoundationCatalogue openPanel={openPanel}/>);return ()=>root.unmount();}
