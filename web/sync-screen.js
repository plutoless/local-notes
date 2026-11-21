import {requestTaskLeave, bindDialog, button, icon} from './presentation.js';
import {syncView, syncDraftKey, readSyncDraft, editSyncValue, verifiedSyncRetry, updateSyncDraft} from './assets/react-host.js';

const types = {action:'行动',initiative:'事项',topic:'主题',candidate:'建议'};
// Stable legacy entry point: React owns descendants; repositories and the shared
// task decision retain persistence and overlay authority.
export class SyncScreen {
  constructor(repositories, notice, changed) {
    this.repositories=repositories; this.notice=notice; this.changed=changed;
    this.model={records:[],warnings:[],running:false,checked:false,active:'',message:'',detail:''};
    this.generation=0; this.dirty=false;
    this.panel=document.createElement('section'); this.panel.hidden=true;
    this.panel.className='sync-panel ui-panel ui-dialog'; this.panel.setAttribute('aria-label','同步检查'); this.panel.setAttribute('role','dialog'); this.panel.setAttribute('aria-modal','true');
    document.body.append(this.panel); this.dialog=bindDialog(this.panel);
    this.view=syncView(this.panel,{close:()=>this.close(),refresh:()=>this.refresh(true),jump:key=>{const article=this.article(key);article?.scrollIntoView({block:'start'});article?.querySelector('h3')?.focus();},choose:(key,revision)=>this.choose(key,revision),edit:(key,field,value)=>this.edit(key,field,value),discard:key=>this.discard(key),save:key=>this.saveResolution(key),recover:key=>this.recoverDraft(key)});
    this.panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();event.stopImmediatePropagation();this.close();}else if(event.key==='Escape'){event.stopImmediatePropagation();}},true);
    this.opener=button('同步检查',()=>this.refresh(true)); this.opener.onclick=()=>this.refresh(true); this.opener.innerHTML=icon('sync')+'同步检查';
    document.querySelector('#shell-legacy-utilities').append(this.opener);
    const refresh=()=>this.refresh(false); window.addEventListener('focus',refresh);window.addEventListener('reference-change',refresh);
    this.render();
  }
  render(){this.view.render(this.model);this.refreshButton=this.panel.querySelector('[data-sync-refresh]');this.status=this.panel.querySelector('[data-sync-status]');this.panel.setAttribute('aria-busy',String(this.model.running));}
  article(key){return [...this.panel.querySelectorAll('article')].find(node=>node.dataset.syncKey===key);}
  record(key){return this.model.records.find(r=>r.key===key);}
  message(message,detail=''){Object.assign(this.model,{message,detail});this.render();}
  canLeave(){if(!this.dirty&&!this.savePending)return true;this.panel.hidden=false;this.message('还有解决内容未保存。请继续编辑并保存，或明确放弃编辑。');return false;}
  task(){return {label:'冲突解决',committed:()=>Boolean(this.resolutionCommitted),dirty:()=>this.dirty,pending:()=>this.savePending,save:()=>this.saveResolution(this.model.active),discard:()=>this.discard(this.model.active,false),close:()=>{document.querySelector('.app').inert=false;this.panel.hidden=true;}};}
  close(){return requestTaskLeave(this.task());}
  owned(repos,generation){return generation===this.generation&&repos.every((repo,i)=>repo===this.repositories()[i]&&(!this.workspaceIds[i]||repo.workspaceId===this.workspaceIds[i]));}
  async refresh(show, afterSave=false){
    if(show){if(this.panel.hidden)this.opener.focus({preventScroll:true});this.dialog.open();document.querySelector('.app').inert=true;}
    if(this.boundRepositories && !this.owned(this.boundRepositories,this.generation) && !this.dirty && !this.savePending){this.generation++;this.model.running=false;this.model.records=[];this.model.checked=false;this.saved='';}
    if(this.model.running||(this.savePending&&!afterSave))return;
    if(this.dirty){if(show)this.canLeave();return;}
    const repos=[...this.repositories()],generation=++this.generation;
    this.boundRepositories=repos;this.workspaceIds=repos.map(repo=>repo.workspaceId);
    const restore=show||this.panel.contains(document.activeElement);
    this.model.running=true;this.message('正在检查本地版本…');
    try {
      const warnings=[];
      for(const repo of repos){if(!repo.ready)await repo.open();if(!this.owned(repos,generation))return;this.workspaceIds[repos.indexOf(repo)]=repo.workspaceId;const result=await repo.serialize(()=>repo.recover());if(!this.owned(repos,generation))return;warnings.push(...result.warnings);}
      const records=[];
      for(const repo of repos)for(const [id,conflict]of repo.conflicts||[]){const name=conflict.versions.find(v=>v.title||v.description);const value=structuredClone(conflict.tips[0]||conflict.versions[0]);records.push({key:`${repo.entityType}:${id}`,id,type:repo.entityType,repo,draftKey:syncDraftKey(repo.workspaceId,repo.entityType,id),hasDraft:Boolean(readSyncDraft(localStorage,syncDraftKey(repo.workspaceId,repo.entityType,id),{workspaceId:repo.workspaceId,entityType:repo.entityType,entityId:id})),...conflict,name:`${types[repo.entityType]}：${name?.title||name?.description||'未命名记录'}`,selected:'',value,json:JSON.stringify(value,null,2),invalid:false,committed:false,saving:false,message:'尚未选择解决版本。请先选择，再审核与编辑。',detail:''});}
      Object.assign(this.model,{records,warnings,checked:true,active:'',message:this.saved||'',detail:''});this.render();await this.changed();
    }catch(error){if(this.owned(repos,generation))this.message('检查未完成。请确认目录可用，然后点击「重新检查」；原文件仍保留。',error.message);}
    finally{if(this.owned(repos,generation)){this.model.running=false;this.render();if(!this.panel.hidden&&restore&&document.activeElement===document.body)this.refreshButton.focus();}}
  }
  choose(key,revision){
    if(this.dirty){this.message('选择其他版本会替换尚未保存的编辑。请先保存，或点击「放弃编辑」。');return;}
    const r=this.record(key);if(!r||r.incomplete||r.cyclic)return;
    r.reviewedHeads=r.tips.map(t=>t.revision);r.selected=revision;r.value=structuredClone(r.versions.find(v=>v.revision===revision));r.json=JSON.stringify(r.value,null,2);r.invalid=false;r.committed=false;this.resolutionCommitted=false;this.markDirty(r);this.article(key)?.querySelector('textarea,input,select')?.focus();
  }
  markDirty(r){this.dirty=true;this.model.active=r.key;r.message='解决内容尚未保存。原版本均会保留。';r.detail='';this.persistDraft(r);this.render();}
  persistDraft(r){r.hasDraft=updateSyncDraft(localStorage,r.draftKey,{json:r.json,selected:r.selected,tips:r.reviewedHeads||r.tips.map(t=>t.revision),retryRecord:r.retryRecord||null});if(!r.hasDraft)this.model.cacheWarning='本机草稿暂不能保留。当前编辑仍在，请保存到本地或保持窗口打开后重试。';}
  clearDraft(r){const cleared=updateSyncDraft(localStorage,r.draftKey,null);if(!cleared)this.model.cacheWarning='本机草稿暂不能移除。已保存的版本仍保留；再次恢复草稿前请核对历史。';return cleared;}
  recoverDraft(key){const r=this.record(key);if(!r||this.dirty||this.savePending)return;const draft=readSyncDraft(localStorage,r.draftKey,{workspaceId:r.repo.workspaceId,entityType:r.type,entityId:r.id});if(!draft)return;r.selected=draft.selected;r.reviewedHeads=draft.tips;r.retryRecord=draft.retryRecord;r.committed=Boolean(draft.retryRecord);this.resolutionCommitted=r.committed;Object.assign(r,editSyncValue(r.value,'json',draft.json));this.markDirty(r);r.message=r.committed?'版本已保留，恢复尚未完成。请点击保存重试恢复；已保留的内容暂不能编辑。':r.invalid?'JSON 格式无效。请修正后保存，编辑仍保留。':'已恢复未保存解决内容；请核对后保存。';this.render();this.article(key)?.querySelector('textarea:not(:disabled),button:not(:disabled)')?.focus();}
  edit(key,field,value){const r=this.record(key);if(!r||r.committed||r.key!==this.model.active)return;
    Object.assign(r,editSyncValue(r.value,field,value));
    this.markDirty(r);if(r.invalid){r.message='JSON 格式无效。请修正后保存，编辑仍保留。';this.render();}
  }
  discard(key,restore=true){const r=this.record(key),revision=r?.selected;this.dirty=false;this.resolutionCommitted=false;this.saved='';this.model.active='';if(r){r.hasDraft=!this.clearDraft(r);r.selected='';r.committed=false;r.retryRecord=null;r.invalid=false;r.message='尚未选择解决版本。请先选择，再审核与编辑。';r.detail='';r.value=structuredClone(r.tips[0]||r.versions[0]);r.json=JSON.stringify(r.value,null,2);}this.model.message='';this.model.detail='';this.render();if(restore){const opener=[...(this.article(key)?.querySelectorAll('[data-revision]')||[])].find(n=>n.dataset.revision===revision);if(opener){opener.closest('details').open=true;opener.focus();}}}
  saveResolution(key){
    if(this.savePending)return this.savePending;
    const r=this.record(key);if(!r?.selected||r.incomplete||r.cyclic)return false;
    const repo=r.repo,workspaceId=repo.workspaceId,generation=this.generation;
    const owned=()=>generation===this.generation&&this.record(key)===r&&this.repositories().includes(repo)&&repo.workspaceId===workspaceId;
    const work=(async()=>{await Promise.resolve();r.saving=true;r.message='正在保存解决结果…';this.render();
      try{const result=r.retryRecord?await repo.save({},null,await verifiedSyncRetry(repo,r.retryRecord,{workspaceId,entityType:r.type,entityId:r.id})):await repo.resolve(r.id,JSON.parse(r.json),(r.reviewedHeads||r.tips.map(t=>t.revision)));if(!owned())return false;this.clearDraft(r);this.dirty=false;this.resolutionCommitted=false;this.saved=(result.recovered||r.retryRecord)?'解决结果已从保留版本恢复并保存到本地；无法确认其他设备是否收到。':'解决结果已保存到本地；无法确认其他设备是否收到。';}
      catch(error){if(!owned())return false;if(error.revisionSaved){r.committed=true;this.resolutionCommitted=true;r.retryRecord=error.record;this.persistDraft(r);}r.message=r.retryRecord?'版本已保留，恢复尚未完成。请点击保存重试恢复；已保留的内容暂不能编辑。':'未保存 · 编辑仍保留';this.model.message=r.retryRecord?'版本已保留，本地恢复未完成。请点击保存重试恢复；无法确认其他设备是否收到。':'解决结果未保存。请核对内容和目录后重试；编辑仍保留。若版本已变化，请放弃编辑并重新检查。';this.model.detail=error.message;}
      finally{if(owned()){r.saving=false;this.render();}}
      return !this.dirty;
    })();
    this.savePending=work.then(async saved=>{if(saved&&owned())await this.refresh(!this.panel.hidden,true);return saved;}).finally(()=>{this.savePending=null;});
    return this.savePending;
  }
}
