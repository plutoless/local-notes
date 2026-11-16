import {titleOf,toggleTask,withTitle,safePath,escapeHTML as esc,renderMarkdown} from './core.js';
import {native} from './bridge.js';
import {InitiativeScreen} from './initiative-screen.js';
import {allRecords, moveReferences, fingerprint} from './initiatives.js';
import {ActionScreen} from './action-screen.js';
const $=s=>document.querySelector(s);let rootKey='',legacyRoot='',currentWorkspace='',workspaceGeneration=0,notes=[],current=null,base='',dirty=false,view='actions',filter='recent',timer,saving=null,blocked=false,readMode=false;const stars=new Set(JSON.parse(localStorage.getItem('stars')||'[]'));
function notice(msg){$('#notice').textContent=msg;$('#notice').hidden=false;setTimeout(()=>$('#notice').hidden=true,5000);}
const actions = new ActionScreen(notice);
const initiatives = new InitiativeScreen(actions, notice, async path => {
  if (!await flush()) return;
  view = 'notes'; actions.active = false; initiatives.active = false; hideInitiatives();
  $('#action-tools').hidden = true; $('#action-editor').hidden = true;
  await refresh(); await openNote(path);
}, id => createNote(id));
actions.initiatives = initiatives;
$('#action-open-initiative').onclick = async () => {
  if (!await flush()) return;
  const record = (await allRecords(initiatives.repository)).find(i => i.entityId === $('#action-initiative').value);
  if (record) { view = 'initiatives'; actions.active = false; await initiatives.show(); await initiatives.edit(record); }
};
function hideInitiatives() { $('#initiative-editor').hidden = true; $('#initiative-tools').hidden = true; }
async function prepareInitiatives() { if (!initiatives.repository.ready || initiatives.repository.workspaceId !== actions.repository.workspaceId) await initiatives.openWorkspace(); }
function note(cmd,args={}){return native(cmd,{workspaceId:rootKey,...args});}
function content(){return withTitle($('#body').value,$('#title').value||'无标题');}
function state(msg){$('#save-state').textContent=msg;}
async function refresh(){const generation=workspaceGeneration;if(view==='initiatives'){await actions.show();actions.active=false;await prepareInitiatives();await initiatives.show();return;}if(view==='actions'){await actions.show();await prepareInitiatives();await actions.assignments();if(generation===workspaceGeneration)rootKey=actions.repository.workspaceId;return;}const workspace=await native('workspace');if(generation!==workspaceGeneration)return;rootKey=workspace.workspaceId;const r=await note('list');if(generation!==workspaceGeneration)return;notes=r.notes;legacyRoot=r.root;$('#root-label').textContent=r.root;render();}
function render(){const query=$('#search').value.toLowerCase();$('#note-count').textContent=notes.length;$('#view-title').textContent=({notes:'所有笔记',favorites:'我的收藏'})[view];$('#filters').hidden=false;const list=$('#items');list.replaceChildren();let filtered=notes.filter(n=>(view!=='favorites'||stars.has(n.path))&&(n.path+'\n'+n.text).toLowerCase().includes(query));filtered.sort(filter==='folder'?(a,b)=>a.path.localeCompare(b.path):(a,b)=>b.modified-a.modified);for(const n of filtered){const card=document.createElement('button');card.className='card'+(n.path===current?' selected':'');card.innerHTML=`<h3>${stars.has(n.path)?'☆ ':''}${esc(titleOf(n.text,n.path))}</h3><p>${esc(n.text.replace(/^# .+\r?\n?/m,'').replace(/\n/g,' ').trim())}</p><small>${esc(n.path)} · ${new Date(n.modified*1000).toLocaleDateString('zh-CN')}</small>`;card.onclick=()=>openNote(n.path);list.append(card);}if(!list.childElementCount)list.innerHTML='<div class="no-items">这里还没有内容<br>点「随手记」开始记录</div>';}
async function load(path){const workspaceId=rootKey;const r=await note('read',{path});if(workspaceId!==rootKey)return;currentWorkspace=workspaceId;current=path;base=r.text;dirty=false;blocked=false;$('#conflict').hidden=true;$('#title').value=titleOf(r.text,path);$('#body').value=r.text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');$('#file-path').textContent=path;$('#star').textContent=stars.has(path)?'★':'☆';$('#empty').hidden=true;$('#editor').hidden=false;$('.app').classList.add('editing');state('已保存到本地');const draft=readDraft();if(draft){$('#title').value=titleOf(draft.text,path);$('#body').value=draft.text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');dirty=true;base=draft.base;if(base!==r.text){blocked=true;$('#conflict').hidden=false;state('发现未保存草稿和外部修改');}else{state('已恢复未保存草稿');timer=setTimeout(save,650);}}updateReading();render();await noteInitiatives(path);}
async function openNote(path){try{if(await flush())await load(path);}catch(e){notice(e.message);}}
async function save(){if(saving){await saving;return save();}if(!dirty)return true;if(blocked)return false;clearTimeout(timer);const path=current,text=content(),expected=base;state('正在保存…');saving=(async()=>{try{await note('save',{path,text,expected,workspaceId:currentWorkspace});base=text;dirty=content()!==text;if(!dirty)localStorage.removeItem(draftKey());state(dirty?'尚有编辑未保存':'已保存到本地');await refresh();return true;}catch(e){state('未保存 · 编辑仍保留');if(e.message.includes('CONFLICT')){blocked=true;$('#conflict').hidden=false;}else notice(e.message);return false;}finally{saving=null;}})();return saving;}
async function flush(){clearTimeout(timer);if(!await initiatives.flush()||!await actions.flush())return false;return save();}
function draftKey(){return 'draft:'+(currentWorkspace||rootKey)+':'+current;}
function readDraft(){const key=draftKey(),legacyKey='draft:'+legacyRoot+':'+current;let value=localStorage.getItem(key);if(value===null&&legacyRoot){value=localStorage.getItem(legacyKey);if(value!==null){localStorage.setItem(key,value);localStorage.removeItem(legacyKey);}}return JSON.parse(value||'null');}
function changed(){dirty=true;localStorage.setItem(draftKey(),JSON.stringify({text:content(),base}));state('编辑中…');clearTimeout(timer);timer=setTimeout(save,650);}
function updateReading(){$('#reading').innerHTML=renderMarkdown(content());}
$('#title').oninput=$('#body').oninput=changed;
$('#search').oninput=()=>{if(view==='initiatives'){initiatives.search=$('#search').value;initiatives.offset=0;initiatives.list().catch(e=>notice(e.message));}else if(view==='actions'){actions.search=$('#search').value;actions.offset=0;actions.list().catch(e=>notice(e.message));}else render();};
for(const b of document.querySelectorAll('nav button'))b.onclick=async()=>{if(!await flush())return;view=b.dataset.view;initiatives.active=view==='initiatives';hideInitiatives();actions.active=view==='actions';$('#action-tools').hidden=!actions.active;$('#action-editor').hidden=true;$('#search').placeholder=actions.active?'Search actions…':'搜索标题与正文…';document.querySelector('nav .active')?.classList.remove('active');b.classList.add('active');$('.app').classList.remove('editing');await refresh();};
for(const b of document.querySelectorAll('#filters button'))b.onclick=()=>{filter=b.dataset.filter;document.querySelector('#filters .active')?.classList.remove('active');b.classList.add('active');render();};
async function createNote(initiativeId = null) {
  try {
    if (!await flush()) return;
    const path = `Notes/note-${Date.now()}.md`, text = '# Untitled\n\n';
    await note('create', {path, text});
    if (initiativeId) {
      const initiative = (await allRecords(initiatives.repository)).find(i => i.entityId === initiativeId);
      const linked = await initiatives.repository.save({...initiative, sources: [...initiative.sources, {path, quote: '# Untitled', fingerprint: fingerprint(text), role: 'working-note'}]}, initiative);
      if (initiatives.previous?.entityId === initiativeId) initiatives.previous = linked.record;
    }
    view = 'notes'; actions.active = false; initiatives.active = false; hideInitiatives();
    $('#action-tools').hidden = true; $('#action-editor').hidden = true;
    await refresh(); await load(path); $('#title').focus(); $('#title').select();
  } catch (error) { notice(error.message); }
}
$('#new').onclick = () => createNote();
$('#choose').onclick=async()=>{try{if(!await flush())return;const r=await native('choose');if(r.cancelled)return;workspaceGeneration++;initiatives.active=false;initiatives.repository.ready=false;initiatives.previous=null;hideInitiatives();current=null;currentWorkspace='';base='';rootKey='';legacyRoot='';notes=[];$('#items').replaceChildren();$('#root-label').textContent='Opening workspace…';$('#editor').hidden=true;$('#action-editor').hidden=true;$('#action-tools').hidden=true;$('#empty').hidden=false;$('.app').classList.remove('editing');await actions.openWorkspace();rootKey=actions.repository.workspaceId;await prepareInitiatives();await refresh();}catch(e){notice(e.message);}};
$('#star').onclick=()=>{stars.has(current)?stars.delete(current):stars.add(current);localStorage.setItem('stars',JSON.stringify([...stars]));$('#star').textContent=stars.has(current)?'★':'☆';render();};
$('#back').onclick=async()=>{if(await flush())$('.app').classList.remove('editing');};
$('#mode').onclick=()=>{readMode=!readMode;$('#body').hidden=readMode;$('#reading').hidden=!readMode;$('#title').disabled=readMode;$('#mode').textContent=readMode?'编辑':'阅读';updateReading();};
$('#reading').onchange=async e=>{if(!e.target.matches('input[data-line]'))return;try{const text=toggleTask(content(),Number(e.target.dataset.line),e.target.checked);$('#body').value=text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');changed();await save();updateReading();}catch(err){notice(err.message);}};
$('#rename').onclick=async()=>{try{if(!await flush())return;await repairMovedLinks();const path=prompt('输入相对于笔记目录的路径（以 .md 结尾）',current);if(!path||path===current)return;if(!safePath(path))throw Error('请使用有效的相对 Markdown 路径');await note('move',{path:current,target:path,expected:base,workspaceId:currentWorkspace});localStorage.setItem('pending-note-move:'+rootKey,JSON.stringify({from:current,to:path}));let linkError=null;try{await repairMovedLinks();}catch(error){linkError=error;} if(stars.delete(current)){stars.add(path);localStorage.setItem('stars',JSON.stringify([...stars]));}await refresh();await load(path);if(linkError)notice('Note moved; link updates pending. Use Retry link updates. '+linkError.message);}catch(e){notice(e.message);}};
$('#copy').onclick=async()=>{try{const path=current.replace(/\.md$/i,`-conflict-${Date.now()}.md`);await note('create',{path,text:content(),workspaceId:currentWorkspace});localStorage.removeItem(draftKey());dirty=false;blocked=false;$('#conflict').hidden=true;await refresh();await load(path);}catch(e){notice(e.message);}};
$('#reload').onclick=async()=>{try{localStorage.removeItem(draftKey());await load(current);await refresh();}catch(e){notice(e.message);}};
window.hasUnsavedChanges=()=>dirty||actions.dirty||initiatives.dirty||Boolean(initiatives.saving)||Boolean(saving)||Boolean(actions.saving);
window.addEventListener('beforeunload',e=>{if(window.hasUnsavedChanges()){e.preventDefault();e.returnValue='';}});
window.addEventListener('blur',()=>{if(dirty)save();});
setInterval(async()=>{try{if(view==='actions'||view==='initiatives'||dirty||saving||blocked)return;await refresh();if(current){const r=await note('read',{path:current});if(r.text!==base&&!dirty&&!saving)await load(current);}}catch(e){state('文件暂不可用 · '+e.message);}},4000);
refresh().catch(e=>notice(e.message));

async function noteInitiatives(path) {
  $('#repair-links').hidden = !localStorage.getItem('pending-note-move:'+rootKey);
  await prepareInitiatives();
  const records = await allRecords(initiatives.repository);
  if (current !== path) return;
  $('#note-initiatives').replaceChildren();
  for (const record of records.filter(i => i.sources.some(source => source.path === path))) {
    const button = document.createElement('button'); button.textContent = `Initiative: ${record.title}`;
    button.onclick = async () => { if (await flush()) { view = 'initiatives'; actions.active = false; await initiatives.show(); await initiatives.edit(record); } };
    $('#note-initiatives').append(button);
  }
}

async function repairMovedLinks() {
  const intent = JSON.parse(localStorage.getItem('pending-note-move:'+rootKey) || 'null');
  if (!intent) return;
  await prepareInitiatives();
  await moveReferences([actions.repository, initiatives.repository], intent.from, intent.to);
  localStorage.removeItem('pending-note-move:'+rootKey); $('#repair-links').hidden = true;
}
$('#repair-links').onclick = async () => { try { if (await flush()) { await repairMovedLinks(); await noteInitiatives(current); notice('Moved links updated.'); } } catch (error) { notice('Link updates pending: '+error.message); } };
