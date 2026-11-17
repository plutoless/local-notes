import {feedback, errorFeedback, bindDialog, icon, field} from './presentation.js';
import {OrganizeScreen} from './organize-screen.js';
import {SyncScreen} from './sync-screen.js';
import {LibraryScreen} from './library-screen.js';
import {titleOf,toggleTask,withTitle,safePath,escapeHTML as esc,renderMarkdown} from './core.js';
import {native} from './bridge.js';
import {InitiativeScreen} from './initiative-screen.js';
import {allRecords, moveReferences, fingerprint} from './initiatives.js';
import {FocusScreen} from './focus-screen.js';
import {ActionScreen} from './action-screen.js';
const $=s=>document.querySelector(s);let rootKey='',legacyRoot='',currentWorkspace='',workspaceGeneration=0,notes=[],current=null,base='',dirty=false,view='focus',filter='recent',timer,saving=null,blocked=false,readMode=false;const stars=new Set(JSON.parse(localStorage.getItem('stars')||'[]'));
function notice(msg, success = false){success ? feedback($('#notice'),msg) : errorFeedback($('#notice'), msg);$('#notice').hidden=false;const close=document.createElement('button');close.textContent='关闭提示';close.onclick=()=>$('#notice').hidden=true;$('#notice').append(close);}
for (const button of document.querySelectorAll('nav [data-view]')) button.insertAdjacentHTML('afterbegin', icon(button.dataset.view));
const search = $('#search'); const searchParent = search.parentNode; searchParent.append(field('搜索', search));
$('#new').insertAdjacentHTML('afterbegin', icon('plus'));
const libraryScreen = new LibraryScreen(openNote, notice, () => ['notes', 'favorites'].includes(view), () => view === 'favorites' ? [...stars] : undefined);
const actions = new ActionScreen(notice);
const initiatives = new InitiativeScreen(actions, notice, async path => {
  if ($('.app').classList.contains('workspace') && initiatives.previous) return openContextNote(path);
  if (!await flush()) return;
  focus.active = false; $('#search').hidden = false; view = 'notes'; $('#search').setAttribute('aria-label', '搜索笔记'); actions.active = false; initiatives.active = false; hideInitiatives();
  $('#action-tools').hidden = true; $('#action-editor').hidden = true;
  await refresh(); await openNote(path);
}, id => createNote(id), async () => {
  // Explicit missing-source recovery may build the reference index without visiting Notes.
  await libraryScreen.library.open(); await libraryScreen.library.sync();
  return libraryScreen.library.inventory();
}, () => save());
actions.initiatives = initiatives;
const organize = new OrganizeScreen(async path => { if (await navigate('notes')) await openNote(path); });
const focus = new FocusScreen(actions, initiatives, navigate, notice);
const syncScreen = new SyncScreen(() => [actions.repository, initiatives.repository, libraryScreen.library.topics, organize.repository], notice, async () => {
  if (view === 'organize') { if (organize.repository.ready) await organize.candidates(); }
  else await refresh();
});
async function navigate(next) {
  if (!await flush(true)) return false;
  captureOrigin = null; $('#capture-return').hidden = true;
  if (view === 'organize' && next !== 'organize') await organize.organization.cancel();
  $('#organize-tools').hidden = next !== 'organize';
  if (next === 'initiatives') initiatives.detailKind = 'overview';
  $('.app').classList.toggle('workspace', next === 'initiatives'); $('#workspace-context').hidden = next !== 'initiatives';
  view = next; $('.app').classList.toggle('home', next === 'focus'); $('#index-state').textContent = '正在载入…'; libraryScreen.offset = 0; $('#library-tools').hidden = !['notes', 'favorites'].includes(next); focus.active = next === 'focus'; actions.active = next === 'actions'; initiatives.active = next === 'initiatives';
  hideInitiatives(); $('#action-editor').hidden = true; $('#action-tools').hidden = !actions.active; $('#search').hidden = focus.active; $('#search').setAttribute('aria-label', {notes:'搜索笔记', favorites:'搜索收藏', actions:'搜索行动', initiatives:'搜索事项', organize:'搜索笔记'}[next] || '搜索内容');
  document.querySelector('nav .active')?.classList.remove('active'); document.querySelector(`nav [data-view="${next}"]`)?.classList.add('active');
  for (const node of document.querySelectorAll('nav [data-view]')) node.setAttribute('aria-current', node.dataset.view === next ? 'page' : 'false');
  $('.app').classList.remove('editing'); await refresh(); return true;
}
async function refreshBackground() {
  for (const repository of [actions.repository, initiatives.repository]) {
    if (!repository.needsRefresh) continue;
    try { const result = await repository.serialize(() => repository.recover()); repository.needsRefresh = false; if (result.warnings.length) notice(result.warnings.join('\n')); }
    catch (error) { notice('记录尚未刷新：' + error.message); }
  }
  if (view === 'focus') await focus.show();
}
$('#action-open-initiative').onclick = async () => {
  if (!await flush()) return;
  const record = (await allRecords(initiatives.repository)).find(i => i.entityId === $('#action-initiative').value);
  if (record) {
    $('#initiative-form').inert = true;
    try { focus.active = false; $('#search').hidden = false; view = 'initiatives'; actions.active = false; document.querySelector('nav .active')?.classList.remove('active'); document.querySelector('nav [data-view=initiatives]').classList.add('active'); await initiatives.show(); await initiatives.edit(record); }
    finally { $('#initiative-form').inert = false; }
  }
};
function hideInitiatives() { $('#initiative-editor').hidden = true; $('#initiative-tools').hidden = true; }
async function prepareInitiatives(cached = false) { if (!initiatives.repository.ready || initiatives.repository.workspaceId !== actions.repository.workspaceId) await initiatives.openWorkspace(cached); }
function note(cmd,args={}){return native(cmd,{workspaceId:rootKey,...args});}
function content(){return withTitle($('#body').value,$('#title').value||'无标题');}
function updateStar(){const selected=stars.has(current);$('#star').textContent=selected?'★ 已收藏':'☆ 收藏';$('#star').setAttribute('aria-label',selected?'取消收藏笔记':'收藏笔记');$('#star').setAttribute('aria-pressed',String(selected));}
function state(msg){
  $('#save-state').textContent=msg;
  $('#save-state').dataset.state = /恢复/.test(msg) ? 'recovered' : /正在保存/.test(msg) ? 'saving' : /编辑中|尚有/.test(msg) ? 'dirty' : /未保存|外部修改/.test(msg) ? 'failed' : 'saved';
}
let captureOrigin = null;
$('#note-save').onclick = () => save();
$('#capture-return').onclick = async () => {
  if (!captureOrigin || !await flush()) return;
  const origin = captureOrigin;
  if (!await navigate(origin.view)) return;
  if (origin.initiative) {
    await initiatives.edit(origin.initiative);
    if (origin.note) await openContextNote(origin.note, origin.reading);
    else if (origin.action) { initiatives.detailKind = 'action'; $('.app').classList.add('detail-open'); await actions.edit(origin.action); }
  } else if (origin.action) await actions.edit(origin.action);
  else if (origin.note) { await load(origin.note); if (readMode !== origin.reading) $('#mode').click(); }
  captureOrigin = null; $('#capture-return').hidden = true;
  if (origin.opener?.isConnected && origin.opener.getClientRects().length) origin.opener.focus();
  else document.querySelector('nav .active')?.focus();
};
async function refresh(){const generation=workspaceGeneration;$('.app').classList.toggle('library-view',['notes','favorites'].includes(view));$('.app').classList.toggle('home', view === 'focus'); $('.app').classList.toggle('organization-view', view === 'organize'); $('.app').classList.toggle('workspace', view === 'initiatives'); $('#workspace-context').hidden = view !== 'initiatives' || (!initiatives.previous && !initiatives.dirty);
if(view==='initiatives' && ((initiatives.detailKind === 'note' && !$('#editor').hidden) || (initiatives.detailKind === 'action' && !$('#action-editor').hidden))){await initiatives.list(); await initiatives.details(); return;}
if(view==='organize'){await organize.show(libraryScreen.library);return;}
if(view==='focus'){
  if(!actions.repository.ready) await actions.openWorkspace(true);
  if(generation!==workspaceGeneration)return;
  rootKey=actions.repository.workspaceId;
  await prepareInitiatives(true);
  if(generation!==workspaceGeneration)return;
  actions.active=false;initiatives.active=false;focus.active=true;
  await focus.show();
  clearTimeout(focus.backgroundTimer); focus.backgroundTimer=setTimeout(()=>refreshBackground().catch(e=>notice(e.message)),1000);
  return;
}if(view==='initiatives'){await actions.show();actions.active=false;await prepareInitiatives();await initiatives.show();return;}if(view==='actions'){await actions.show();await prepareInitiatives();await actions.assignments();if(generation===workspaceGeneration)rootKey=actions.repository.workspaceId;return;}const workspace=await native('workspace');if(generation!==workspaceGeneration)return;rootKey=workspace.workspaceId;legacyRoot=workspace.root==='Sample'?'Sample · 样本笔记':workspace.root||'';await libraryScreen.show();}
function render(){if(['notes','favorites'].includes(view))libraryScreen.render().catch(e=>notice(e.message));}
async function load(path, loaded = null){$('#capture-return').hidden = true;const workspaceId=rootKey;const r=loaded || await note('read',{path});if(workspaceId!==rootKey)return;currentWorkspace=workspaceId;current=path;base=r.text;dirty=false;blocked=false;$('#conflict').hidden=true;$('#title').value=titleOf(r.text,path);$('#body').value=r.text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');$('#file-path').textContent=path;updateStar();libraryScreen.selectedPath=path;$('#empty').hidden=true;$('#editor').hidden=false;$('.app').classList.add('editing');state('已保存到本地');const draft=readDraft();if(draft){$('#title').value=titleOf(draft.text,path);$('#body').value=draft.text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');dirty=true;base=draft.base;if(base!==r.text){blocked=true;$('#conflict').hidden=false;state('发现未保存草稿和外部修改');}else{state('已恢复未保存草稿');timer=setTimeout(save,650);}}updateReading();render();await noteInitiatives(path);await libraryScreen.noteTopics(path);}
async function openContextNote(path, reading = true) {
  try {
    if (!await flush()) return;
    const workspaceId = rootKey, initiativeId = initiatives.previous?.entityId;
    const loaded = await note('read', {path});
    if (workspaceId !== rootKey || initiativeId !== initiatives.previous?.entityId || view !== 'initiatives') return;
    initiatives.detailKind = 'note'; $('.app').classList.add('workspace', 'detail-open', 'editing');
    $('#action-editor').hidden = true; $('#initiative-editor').hidden = true;
    await load(path, loaded); $('#workspace-detail').scrollTop = 0;
    if (readMode !== reading) $('#mode').click();
  } catch (error) { notice(error.message); }
}
async function openNote(path){try{if(await flush())await load(path);}catch(e){notice(e.message);}}
async function save(){if(saving){await saving;return save();}if(!dirty)return true;if(blocked)return false;clearTimeout(timer);const path=current,text=content(),expected=base;state('正在保存…');saving=(async()=>{try{await note('save',{path,text,expected,workspaceId:currentWorkspace});base=text;dirty=content()!==text;if(!dirty)localStorage.removeItem(draftKey());state(dirty?'尚有编辑未保存':'已保存到本地');validateReferences();await refresh();return true;}catch(e){state('未保存 · 编辑仍保留');if(e.message.includes('CONFLICT')){blocked=true;$('#conflict').hidden=false;}else notice(e.message);return false;}finally{saving=null;}})();return saving;}
async function flush(navigation = false){clearTimeout(timer);if((!navigation||!initiatives.recoveredDraft)&&!await initiatives.flush())return false;if((!navigation||!actions.recoveredDraft)&&!await actions.flush())return false;return save();}
function draftKey(){return 'draft:'+(currentWorkspace||rootKey)+':'+current;}
function readDraft(){const key=draftKey(),legacyKey='draft:'+legacyRoot+':'+current;let value=localStorage.getItem(key);if(value===null&&legacyRoot){value=localStorage.getItem(legacyKey);if(value!==null){localStorage.setItem(key,value);localStorage.removeItem(legacyKey);}}return JSON.parse(value||'null');}
function changed(){dirty=true;localStorage.setItem(draftKey(),JSON.stringify({text:content(),base}));state('编辑中…');clearTimeout(timer);timer=setTimeout(save,650);}
function updateReading(){$('#reading').innerHTML=renderMarkdown(content());}
$('#title').oninput=$('#body').oninput=changed;
$('#search').oninput=()=>{if(view==='initiatives'){initiatives.search=$('#search').value;initiatives.offset=0;initiatives.list().catch(e=>notice(e.message));}else if(view==='actions'){actions.search=$('#search').value;actions.offset=0;actions.list().catch(e=>notice(e.message));}else {libraryScreen.search=$('#search').value;libraryScreen.offset=0;render();}};
for(const b of document.querySelectorAll('nav button[data-view]'))b.onclick=()=>navigate(b.dataset.view).catch(e=>notice(e.message));
for(const b of document.querySelectorAll('#filters button'))b.onclick=()=>{filter=b.dataset.filter;document.querySelector('#filters .active')?.classList.remove('active');b.classList.add('active');render();};
async function createNote(initiativeId = null) {
  try {
    if (!await flush()) return;
    const origin = !initiativeId ? {view, opener: document.activeElement, initiative: view === 'initiatives' ? initiatives.previous : null, action: !$('#action-editor').hidden ? actions.previous : null, note: !$('#editor').hidden ? current : null, reading: readMode} : null;
    const path = `Notes/note-${Date.now()}.md`, text = '# 无标题\n\n';
    await note('create', {path, text});
    if (initiativeId) {
      const initiative = (await allRecords(initiatives.repository)).find(i => i.entityId === initiativeId);
      const linked = await initiatives.repository.save({...initiative, sources: [...initiative.sources, {path, quote: '# 无标题', fingerprint: fingerprint(text), role: 'working-note'}]}, initiative);
      if (initiatives.previous?.entityId === initiativeId) { initiatives.form(linked.record, linked.record); await initiatives.details(); }
    }
    if (initiativeId && $('.app').classList.contains('workspace')) { await openContextNote(path, false); $('#title').focus(); $('#title').select(); return; }
    focus.active = false; $('#search').hidden = false; view = 'notes'; $('#search').setAttribute('aria-label', '搜索笔记'); actions.active = false; initiatives.active = false; hideInitiatives();
    $('#action-tools').hidden = true; $('#action-editor').hidden = true;
    document.querySelector('nav .active')?.classList.remove('active'); document.querySelector('nav [data-view=notes]').classList.add('active');
    for (const node of document.querySelectorAll('nav [data-view]')) node.setAttribute('aria-current', node.dataset.view === 'notes' ? 'page' : 'false');
    await validateReferences();await refresh(); await load(path); captureOrigin ||= origin; $('#capture-return').hidden = !captureOrigin; if (readMode) $('#mode').click(); $('#title').focus(); $('#title').select();
  } catch (error) { notice(error.message); }
}
$('#new').onclick = () => createNote();
$('#choose').onclick=async()=>{try{if(!syncScreen.canLeave())return;if(!await flush())return;await organize.organization.cancel();$('#organize-tools').hidden=true;organize.organization.batches=null;organize.repository.ready=false;const r=await native('choose');if(r.cancelled)return;captureOrigin=null;$('#capture-return').hidden=true;workspaceGeneration++;libraryScreen.library.generation++;libraryScreen.library.workspaceId=null;$('#library-tools').hidden=true;focus.active=false;clearTimeout(focus.backgroundTimer);initiatives.active=false;initiatives.repository.ready=false;initiatives.previous=null;hideInitiatives();current=null;currentWorkspace='';base='';rootKey='';legacyRoot='';notes=[];$('#items').replaceChildren();$('#root-label').textContent='正在打开目录…';$('#editor').hidden=true;$('#action-editor').hidden=true;$('#action-tools').hidden=true;$('#empty').hidden=false;$('.app').classList.remove('editing');await actions.openWorkspace();rootKey=actions.repository.workspaceId;await prepareInitiatives();await refresh();}catch(e){notice(e.message);}};
$('#star').onclick=()=>{stars.has(current)?stars.delete(current):stars.add(current);localStorage.setItem('stars',JSON.stringify([...stars]));updateStar();render();};
$('#back').onclick=async()=>{if ($('.app').classList.contains('workspace')) { if (await flush()) await initiatives.edit(initiatives.previous); return; } if(await flush()){$('.app').classList.remove('editing');$('#editor').hidden=true;$('#empty').hidden=false;await libraryScreen.render();$('#items .selected')?.focus();}};
$('#mode').onclick=()=>{readMode=!readMode;$('#body').hidden=readMode;$('#reading').hidden=!readMode;$('#title').disabled=readMode;$('#mode').textContent=readMode?'编辑':'阅读';$('#note-mode').textContent=readMode?'阅读笔记':'编辑笔记';updateReading();};
$('#reading').onchange=async e=>{if(!e.target.matches('input[data-line]'))return;try{const text=toggleTask(content(),Number(e.target.dataset.line),e.target.checked);$('#body').value=text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');changed();await save();updateReading();}catch(err){notice(err.message);}};
$('#rename').onclick=async()=>{try{if(!await flush())return;await repairMovedLinks();const path=prompt('输入相对于笔记目录的路径（以 .md 结尾）',current);if(!path||path===current)return;if(!safePath(path))throw Error('请使用有效的相对 Markdown 路径');await note('move',{path:current,target:path,expected:base,workspaceId:currentWorkspace});localStorage.setItem('pending-note-move:'+rootKey,JSON.stringify({from:current,to:path}));let linkError=null;try{await repairMovedLinks();}catch(error){linkError=error;} if(stars.delete(current)){stars.add(path);localStorage.setItem('stars',JSON.stringify([...stars]));}await validateReferences();await refresh();await load(path);if(!linkError)notice('笔记已移动，关联已更新。',true);if(linkError)notice('笔记已移动，关联尚未更新，请点击「重试更新关联」。'+linkError.message);}catch(e){notice(e.message);}};
$('#copy').onclick=async()=>{try{const path=current.replace(/\.md$/i,`-conflict-${Date.now()}.md`);await note('create',{path,text:content(),workspaceId:currentWorkspace});localStorage.removeItem(draftKey());dirty=false;blocked=false;$('#conflict').hidden=true;await validateReferences();await refresh();await load(path);}catch(e){notice(e.message);}};
$('#reload').onclick=async()=>{try{localStorage.removeItem(draftKey());await load(current);await refresh();}catch(e){notice(e.message);}};
window.hasUnsavedChanges=()=>syncScreen.dirty||Boolean(syncScreen.saving)||dirty||actions.dirty||initiatives.dirty||Boolean(initiatives.saving)||Boolean(saving)||Boolean(actions.saving);
window.addEventListener('beforeunload',e=>{if(window.hasUnsavedChanges()){e.preventDefault();e.returnValue='';}});
window.addEventListener('blur',()=>{if(dirty)save();});
async function validateReferences(){if(!['notes','favorites'].includes(view))return;try{await libraryScreen.library.open();await libraryScreen.library.sync();}catch(e){feedback($('#save-state'), '参考资料暂不可用，请检查目录后重试。', e.message);}}
window.addEventListener('reference-change',validateReferences);
window.addEventListener('focus',validateReferences);
// Mac metadata fallback also catches nested changes missed by the root notification.
if(window.webkit?.messageHandlers?.notes)setInterval(validateReferences,30000);
refresh().catch(e=>notice(e.message));

async function noteInitiatives(path) {
  $('#repair-links').hidden = !localStorage.getItem('pending-note-move:'+rootKey);
  await prepareInitiatives();
  const records = await allRecords(initiatives.repository);
  if (current !== path) return;
  $('#note-initiatives').replaceChildren();
  for (const record of records.filter(i => i.sources.some(source => source.path === path))) {
    const button = document.createElement('button'); button.textContent = `事项：${record.title}`;
    button.onclick = async () => { if (await flush()) { focus.active = false; $('#search').hidden = false; view = 'initiatives'; actions.active = false; document.querySelector('nav .active')?.classList.remove('active'); document.querySelector('nav [data-view=initiatives]').classList.add('active'); await initiatives.show(); await initiatives.edit(record); } };
    $('#note-initiatives').append(button);
  }
}

async function repairMovedLinks() {
  const intent = JSON.parse(localStorage.getItem('pending-note-move:'+rootKey) || 'null');
  if (!intent) return;
  await prepareInitiatives();
  await libraryScreen.library.open();
  if (!organize.repository.ready || organize.repository.workspaceId !== rootKey) await organize.repository.open();
  await moveReferences([actions.repository, initiatives.repository, libraryScreen.library.topics, organize.repository], intent.from, intent.to);
  localStorage.removeItem('pending-note-move:'+rootKey); $('#repair-links').hidden = true;
}
$('#repair-links').onclick = async () => { try { if (await flush()) { await repairMovedLinks(); await noteInitiatives(current); notice('已更新移动后的关联。', true); } } catch (error) { notice('关联尚未更新：'+error.message); } };

// Chinese validation messages are presentation only; domain validation remains authoritative.
document.addEventListener('invalid', event => {
  if (event.target.matches('input, textarea, select')) event.target.setCustomValidity('请填写有效内容后重试。');
}, true);
document.addEventListener('input', event => event.target.setCustomValidity?.(''));
bindDialog($('#conflict'));
