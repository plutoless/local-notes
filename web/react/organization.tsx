import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
export interface OrganizationModel {
  search:string; directory:string; directories:string[];
  notes:{path:string; title?:string}[]; selected:string[];
  inventory:string; retry:boolean; previous:boolean; next:boolean;
  running:boolean; previewing:boolean; configured:boolean; covered:number;
  batches:{path:string;start:number;end:number;total:number;text:string}[];
  request:string; status:string; statusState:string; service:string;
  address:string; model:string; token:string; savedCredential:boolean;
  settingsPending:boolean; settingsError:string;
}
export interface OrganizationCallbacks {
  search:(value:string)=>void; directory:(value:string)=>void;
  select:(path:string,checked:boolean)=>void; page:(direction:number)=>void;
  retry:()=>void; preview:()=>void; send:()=>void; cancel:()=>void; configure:()=>void;
  setting:(key:'address'|'model'|'token',value:string)=>void; save:()=>void;
}
export function OrganizationContent({model:m,callbacks:c}:{model:OrganizationModel;callbacks:OrganizationCallbacks}) {
  const busy=m.running||m.previewing,ready=Boolean(m.batches.length);
  return <>
    <section aria-labelledby="ai-select-title">
      <h2 id="ai-select-title">1 · 选择来源笔记</h2>
      <p>每次选择 1–20 篇。只有点击「发送并分析」才会发送预览内容。</p>
      <label className="ui-field">来源目录<select id="ai-directory" aria-label="选择分析目录" disabled={busy} value={m.directory} onChange={e=>c.directory(e.target.value)}>{['*','',...m.directories].map(path=><option key={path} value={path}>{path==='*'?'全部目录（逐篇选择笔记）':path||'/'}</option>)}</select></label>
      <label className="ui-field">搜索标题或正文<input id="ai-search" type="search" maxLength={200} disabled={busy} value={m.search} onChange={e=>c.search(e.target.value)}/></label>
      <p id="ai-inventory-state" role="status">{m.inventory}</p>
      <Button id="ai-notes-retry" hidden={!m.retry} onClick={c.retry}>重试查找</Button>
      <div id="ai-selection" inert={busy}>{m.notes.map(note=><label className="ui-selection" key={note.path}><input type="checkbox" value={note.path} checked={m.selected.includes(note.path)} onChange={e=>c.select(note.path,e.target.checked)}/><span><strong>{note.title||note.path}</strong><br/><small>{note.path}</small></span></label>)}{!m.notes.length&&!m.retry&&'没有匹配的笔记。请更改搜索或目录。'}</div>
      <div className="organization-actions ui-pagination"><Button id="ai-notes-previous" className="secondary" disabled={busy||!m.previous} onClick={()=>c.page(-1)}>上一页笔记</Button><Button id="ai-notes-next" className="secondary" disabled={busy||!m.next} onClick={()=>c.page(1)}>下一页笔记</Button></div>
      <p id="ai-selection-state" role="status">已选择 {m.selected.length} / 20 篇笔记（跨搜索、目录和分页保留）</p>
      <Button id="ai-preview" className={ready?'secondary':'primary'} disabled={busy||!m.selected.length} onClick={c.preview}>预览所选内容</Button>
    </section>
    <section aria-labelledby="ai-preview-title">
      <h2 id="ai-preview-title">2 · 核对并发送</h2>
      <p id="ai-help">先选择笔记并预览，才能开始分析。离线时仍可核对已保存的建议。</p>
      <p id="ai-service-state" role="status">{m.service}</p>
      <Button id="ai-configure" className="secondary" disabled={busy} onClick={c.configure}>设置 AI 服务</Button>
      <div id="ai-readable">{m.batches.map(batch=><article key={`${batch.path}:${batch.start}`}><h3>{batch.path} · {batch.start}–{batch.end} / {batch.total}</h3><pre>{batch.text}</pre></article>)}</div>
      <details id="ai-request-details" className="ui-disclosure"><summary>查看完整请求详情</summary><pre id="ai-input">{m.request}</pre></details>
      <div className="organization-actions"><Button id="ai-send" className={ready?'primary':'secondary'} aria-describedby="ai-help" disabled={busy||!m.configured||!ready||m.covered===m.batches.length} onClick={c.send}>{m.covered&&m.covered<m.batches.length?'继续分析剩余内容':'发送并分析'}</Button><Button id="ai-cancel" className="secondary" disabled={!m.running} onClick={c.cancel}>取消分析</Button></div>
      <progress id="ai-progress" aria-label="已完成的分析片段" hidden={!m.running} max={m.batches.length||1} value={m.covered}/><div id="ai-status" className="ui-feedback" data-state={m.statusState} role="status">{m.status}</div>
    </section>
  </>;
}
export function OrganizationSettings({model:m,callbacks:c}:{model:OrganizationModel;callbacks:OrganizationCallbacks}) {
  return <form id="ai-settings" inert={m.running||m.previewing||m.settingsPending} onSubmit={e=>{e.preventDefault();c.save();}}>
    <p>设置仅保存在此设备。使用 OpenAI 兼容服务；服务地址需支持 HTTPS（本机测试可用 127.0.0.1）。</p>
    <label className="ui-field">完整服务地址<input id="ai-address" type="url" required placeholder="https://service.example/v1/chat/completions" value={m.address} onChange={e=>c.setting('address',e.target.value)}/></label>
    <label className="ui-field">模型<input id="ai-model" required value={m.model} onChange={e=>c.setting('model',e.target.value)}/></label>
    <label className="ui-field">凭证<input id="ai-token" type="password" autoComplete="off" placeholder={m.savedCredential?'已保存在此设备，留空则保留':'输入服务凭证'} value={m.token} onChange={e=>c.setting('token',e.target.value)}/></label>
    <div id="ai-settings-error" className="ui-feedback" data-state={m.settingsError?'failed':'idle'} role="status">{m.settingsError}</div>
  </form>;
}
export function organizationView(container:HTMLElement,settings:HTMLElement,callbacks:OrganizationCallbacks) {
  const root=createRoot(container),form=createRoot(settings);
  return {render(model:OrganizationModel){
    const focused=document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    flushSync(()=>{root.render(<OrganizationContent model={model} callbacks={callbacks}/>);form.render(<OrganizationSettings model={model} callbacks={callbacks}/>);});
    const control=focused&&container.querySelector<HTMLButtonElement>('#'+focused);
    if (['ai-notes-previous','ai-notes-next'].includes(focused)&&control&&control.disabled) {
      const fallback=container.querySelector<HTMLButtonElement>('#ai-notes-previous:not(:disabled), #ai-notes-next:not(:disabled)');
      const target=fallback||document.querySelector<HTMLElement>('#view-title');
      if(target){if(!fallback)target.tabIndex=-1;target.focus({preventScroll:true});}
    }
  }};
}
