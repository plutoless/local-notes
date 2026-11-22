import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from './components';
import {Field, FieldError, FieldLabel} from './ui/field';
import {Textarea} from './ui/textarea';
import {candidateEditable} from '../candidate-review-model.js';

export type CandidateDecision = 'confirm'|'attach'|'reference'|'later'|'ignore';
export interface CandidateRecord {
  entityId:string; workspaceId:string; revision:string; description:string;
  candidateType:'initiative'|'action'|'topic'|'relationship'|'progress';
  placement:string; reasoning:string; relevance:string; syncState?:string;
  sources:{path:string;quote:string;start:number;end:number;fingerprint:string;fragmentId:string}[];
  review?:{decision:CandidateDecision;state:'pending'|'done';suggestion:string;target?:unknown};
}
export interface CandidateCardModel {
  record:CandidateRecord; description:string; target:string; dirty:boolean; recovered?:boolean; stale?:boolean;
  disclosures:Record<string,boolean>;
}
export interface CandidateReviewModel {
  cards:CandidateCardModel[]; destinations:{entityId:string;title:string}[]; busy:boolean;
}
export interface CandidateReviewCallbacks {
  activate:(id:string)=>void;
  edit:(id:string,value:string)=>void; target:(id:string,value:string)=>void;
  disclosure:(id:string,label:string,open:boolean)=>void;
  source:(path:string,opener:HTMLButtonElement)=>void;
  decide:(record:CandidateRecord,decision:CandidateDecision,owner:HTMLButtonElement)=>unknown;
  recover:(owner:HTMLButtonElement)=>unknown;
}
const types={initiative:'事项',action:'行动',topic:'主题',relationship:'关联',progress:'进展'};
const decisions:Record<CandidateDecision,string>={confirm:'确认此建议',attach:'关联到事项',reference:'作为参考资料',later:'留待以后',ignore:'忽略'};
const receipts:Record<CandidateDecision,string>={confirm:'确认',attach:'关联事项',reference:'作为参考',later:'留待以后',ignore:'忽略'};
export function CandidateReviewContent({model,callbacks:c}:{model:CandidateReviewModel;callbacks:CandidateReviewCallbacks}) {
  return <>{!model.cards.length?'还没有保存的建议。选择笔记并分析后，在这里逐条核对。':model.cards.map(({record:r,description,target,dirty,recovered,stale,disclosures})=>{
    const editable=candidateEditable(r);
    const details=(label:string,children:React.ReactNode)=><details className="ui-disclosure" open={disclosures[label]??(label==='确认前编辑建议'&&dirty)} onToggle={e=>c.disclosure(r.entityId,label,e.currentTarget.open)}><summary>{label}</summary>{children}</details>;
    return <article key={`${r.workspaceId}:${r.entityId}`} className="card suggestion-card" data-candidate={r.entityId} data-workspace={r.workspaceId} tabIndex={-1} onFocus={()=>c.activate(r.entityId)} aria-label={`建议：${r.description}`}>
      <h3>{types[r.candidateType]}：{r.description}</h3>
      <div className="candidate-context">
        <dl className="candidate-assessment">
          <div><dt>建议归属</dt><dd>{r.placement}</dd></div>
          <div><dt>建议理由</dt><dd>{r.reasoning}</dd></div>
          <div className="candidate-relevance"><dt>当前适用性</dt><dd>{r.relevance}</dd></div>
        </dl>
        <div className="candidate-evidence">
          <h4>来源证据</h4>
          {r.sources.map((source,index) => <figure key={`${source.fragmentId}:${index}`}>
            <blockquote>{source.quote}</blockquote>
            <figcaption>
              <Button className="quiet" disabled={model.busy} aria-label={`打开来源：${source.path}，建议：${r.description}`} onClick={e => c.source(source.path,e.currentTarget)}>{source.path} [{source.start}–{source.end}]</Button>
            </figcaption>
          </figure>)}
        </div>
      </div>
      <p className="ui-feedback" role="status">{model.busy?'正在保存决定…':r.syncState?'存在同步冲突，请打开「同步检查」。':r.review?`处理决定：${receipts[r.review.decision]}，${r.review.state==='done'?'已保存':'待恢复'}`:'等待你确认'}</p>
      {r.review?.suggestion&&r.review.suggestion!==r.description&&<p>保存的建议：{r.review.suggestion}</p>}
      {editable&&<>
        {details('确认前编辑建议', <Field>
          <FieldLabel htmlFor={`candidate-edit-${r.entityId}`}>编辑建议</FieldLabel>
          <Textarea id={`candidate-edit-${r.entityId}`} aria-label="编辑建议" aria-invalid={!description.trim()}
            aria-describedby={`candidate-edit-${r.entityId}-hint`} disabled={model.busy}
            value={description} onChange={e => c.edit(r.entityId,e.target.value)}/>
          {!description.trim()
            ? <FieldError id={`candidate-edit-${r.entityId}-hint`}>建议内容不能为空，请填写后再确认。</FieldError>
            : <p id={`candidate-edit-${r.entityId}-hint`} role="status">{stale?'建议版本已变化，请重新核对并编辑，或放弃旧草稿。':recovered?'已恢复本机编辑草稿，尚未确认。':dirty?'编辑尚未保存，选择处理方式后保存。':''}</p>}
        </Field>)}
        <label className="ui-field">已有事项<select aria-label="已有事项" value={target} disabled={model.busy} onChange={e=>c.target(r.entityId,e.target.value)}><option value="">选择要关联的已有事项</option>{model.destinations.map(i=><option key={i.entityId} value={i.entityId}>{i.title}</option>)}</select></label>
        <div className="organization-actions">{(Object.keys(decisions) as CandidateDecision[]).map(decision=><Button key={decision} className={decision==='confirm'?'primary':'quiet'} disabled={model.busy} aria-label={`${decisions[decision]}：${r.description}`} onClick={e=>c.decide(r,decision,e.currentTarget)}>{decisions[decision]}</Button>)}</div>
      </>}
      {r.review?.state==='pending'&&!r.syncState&&<Button className="secondary" disabled={model.busy} aria-label={`恢复已确认的决定：${r.description}`} onClick={e=>c.recover(e.currentTarget)}>恢复已确认的决定</Button>}
      {details('建议记录详情', <>
        <ul>{r.sources.map((source,index) => <li key={`${source.fragmentId}:${index}`}>{source.path} [{source.start}–{source.end}]：{source.fingerprint}</li>)}</ul>
        <pre>{JSON.stringify({entityId:r.entityId,revision:r.revision,review:r.review||null},null,2)}</pre>
      </>)}
    </article>;
  })}</>;
}
export function candidateReviewView(container:HTMLElement,callbacks:CandidateReviewCallbacks) {
  const root=createRoot(container);
  return {render(model:CandidateReviewModel){flushSync(()=>root.render(<CandidateReviewContent model={model} callbacks={callbacks}/>));}};
}
