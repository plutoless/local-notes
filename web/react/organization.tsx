import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {Field, FieldDescription, FieldError, FieldLabel} from './ui/field';
import {Input} from './ui/input';
export interface OrganizationModel {
  search:string; directory:string; directories:string[];
  notes:{path:string; title?:string}[]; selected:string[];
  inventory:string; retry:boolean; previous:boolean; next:boolean;
  running:boolean; previewing:boolean; configured:boolean; covered:number;
  batches:{path:string;start:number;end:number;total:number;text:string}[];
  request:string; status:string; statusState:string; service:string;
  address:string; model:string; token:string; savedCredential:boolean;
  settingsPending:boolean; settingsError:string;
  settingsFields?:{address?:string; model?:string};
}
export interface OrganizationCallbacks {
  search:(value:string)=>void; directory:(value:string)=>void;
  select:(path:string,checked:boolean)=>void; page:(direction:number)=>void;
  retry:()=>void; preview:()=>void; send:()=>void; cancel:()=>void; configure:()=>void;
  setting:(key:'address'|'model'|'token',value:string)=>void; save:()=>void;
}
export function OrganizationContent({model:m,callbacks:c}:{model:OrganizationModel;callbacks:OrganizationCallbacks}) {
  const busy=m.running||m.previewing,ready=Boolean(m.batches.length);
  const continuing = m.covered > 0 && m.covered < m.batches.length;
  const complete = ready && m.covered === m.batches.length;
  return <>
    <section className="organization-stage" aria-labelledby="ai-select-title">
      <h2 id="ai-select-title">选择来源笔记</h2>
      <p>每次可选 1–20 篇。预览仅读取本机笔记。</p>
      <div className="organization-filters">
        <label className="ui-field">来源目录<select id="ai-directory" aria-label="选择分析目录" disabled={busy} value={m.directory} onChange={e=>c.directory(e.target.value)}>{['*','',...m.directories].map(path=><option key={path} value={path}>{path==='*'?'全部目录（逐篇选择笔记）':path||'/'}</option>)}</select></label>
        <Field><FieldLabel htmlFor="ai-search">搜索标题或正文</FieldLabel><Input id="ai-search" type="search" maxLength={200} disabled={busy} value={m.search} onChange={e=>c.search(e.target.value)}/></Field>
      </div>
      <p id="ai-inventory-state" role="status">{m.inventory}</p>
      <Button id="ai-notes-retry" hidden={!m.retry} onClick={c.retry}>重试查找</Button>
      <div id="ai-selection" role="group" aria-label="来源笔记" inert={busy}>{m.notes.map(note=><label className="ui-selection" key={note.path}><input type="checkbox" value={note.path} checked={m.selected.includes(note.path)} onChange={e=>c.select(note.path,e.target.checked)}/><span><strong>{note.title||note.path}</strong><br/><small>{note.path}</small></span></label>)}{!m.notes.length&&!m.retry&&'没有匹配的笔记。请更改搜索或目录。'}</div>
      <div className="organization-actions ui-pagination"><Button id="ai-notes-previous" className="quiet" disabled={busy||!m.previous} onClick={()=>c.page(-1)}>上一页笔记</Button><Button id="ai-notes-next" className="quiet" disabled={busy||!m.next} onClick={()=>c.page(1)}>下一页笔记</Button></div>
      <p id="ai-selection-state" role="status">已选择 {m.selected.length} / 20 篇笔记（跨搜索、目录和分页保留）</p>
      {m.selected.length > 0 && <details className="ui-disclosure organization-scope">
        <summary>查看已选来源</summary>
        <ul>{m.selected.map(path => <li key={path}>{path}</li>)}</ul>
      </details>}
      <Button id="ai-preview" className={ready?'secondary':'primary'} disabled={busy||!m.selected.length} onClick={c.preview}>{m.previewing?'正在读取所选内容…':'预览所选内容'}</Button>
    </section>
    <section className="organization-stage" aria-labelledby="ai-preview-title">
      <h2 id="ai-preview-title">核对并发送</h2>
      <div className="organization-service">
        <div><h3>AI 服务</h3><p id="ai-service-state" role="status">{m.service}</p></div>
        <Button id="ai-configure" className="quiet ui-compact" disabled={busy} onClick={c.configure}>设置 AI 服务</Button>
      </div>
      <div id="ai-readable" className="organization-preview" role="region" aria-labelledby="ai-readable-title" tabIndex={0} hidden={!ready}>
        <h3 id="ai-readable-title">笔记片段预览</h3>
        {m.batches.map((batch,index) => <article key={`${batch.path}:${batch.start}`}>
          <h4>{batch.path} · {batch.start}–{batch.end} / {batch.total}</h4>
          {m.covered > 0 && <p>{index < m.covered ? '已完成' : '待完成'}</p>}
          <pre>{batch.text}</pre>
        </article>)}
      </div>
      <details id="ai-request-details" className="ui-disclosure"><summary>{continuing&&!m.running?'查看剩余请求详情':'查看完整请求详情'}</summary>
        {m.request ? <pre id="ai-input" role="region" aria-label="原始完整发送请求" tabIndex={0}>{m.request}</pre> : <><p>{complete?'本次预览的片段均已分析。':'选择来源并预览后可核对完整请求。'}</p><pre id="ai-input" hidden /></>}
      </details>
      <div className="organization-send">
        <p id="ai-help">{continuing
          ? `继续分析只会向所设服务发送剩余 ${m.batches.length - m.covered} 个片段。`
          : '只有点击发送才会将预览内容发往所设服务。'}离线时仍可核对已保存的建议。</p>
        <div className="organization-actions"><Button id="ai-send" className={ready?'primary':'secondary'} aria-describedby="ai-help" disabled={busy||!m.configured||!ready||complete} onClick={c.send}>{m.running?'正在分析…':continuing?'继续分析剩余内容':'发送并分析'}</Button><Button id="ai-cancel" className="quiet" disabled={!m.running} onClick={c.cancel}>取消分析</Button></div>
        <progress id="ai-progress" aria-label="已完成的分析片段" hidden={!m.running} max={m.batches.length||1} value={m.covered}/>
        <div id="ai-status" className="ui-feedback" data-state={m.statusState==='candidate-failed'?'failed':m.statusState} role="status" hidden={m.statusState==='candidate-failed'}>{m.status}</div>
      </div>
    </section>
  </>;
}
export function OrganizationSettings({model:m,callbacks:c}:{model:OrganizationModel;callbacks:OrganizationCallbacks}) {
  return <form id="ai-settings" className="organization-settings" noValidate inert={m.running||m.previewing||m.settingsPending}
    onSubmit={e => {e.preventDefault(); c.save();}}>
    <FieldDescription>设置仅保存在此设备。使用 OpenAI 兼容服务；服务地址需支持 HTTPS（本机测试可用 127.0.0.1）。</FieldDescription>
    <Field>
      <FieldLabel htmlFor="ai-address">完整服务地址</FieldLabel>
      <Input id="ai-address" type="url" required placeholder="https://service.example/v1/chat/completions" value={m.address} aria-invalid={Boolean(m.settingsFields?.address)} aria-describedby={m.settingsFields?.address ? "ai-address-error" : undefined} onChange={e => c.setting('address',e.target.value)}/>
      {m.settingsFields?.address && <FieldError id="ai-address-error">{m.settingsFields.address}</FieldError>}
    </Field>
    <Field>
      <FieldLabel htmlFor="ai-model">模型</FieldLabel>
      <Input id="ai-model" required value={m.model} aria-invalid={Boolean(m.settingsFields?.model)} aria-describedby={m.settingsFields?.model ? "ai-model-error" : undefined} onChange={e => c.setting('model',e.target.value)}/>
      {m.settingsFields?.model && <FieldError id="ai-model-error">{m.settingsFields.model}</FieldError>}
    </Field>
    <Field>
      <FieldLabel htmlFor="ai-token">凭证</FieldLabel>
      <Input id="ai-token" type="password" autoComplete="off" placeholder={m.savedCredential?'已保存在此设备，留空则保留':'输入服务凭证'} value={m.token} onChange={e => c.setting('token',e.target.value)}/>
    </Field>
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
