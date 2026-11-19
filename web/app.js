import {ReadingHistory} from './reading-history.js';
import {SearchScreen} from './search-screen.js';
import {requestTaskLeave, taskLeavePending, feedback, errorFeedback, bindDialog, icon, field, drawer, button} from './presentation.js';
import {OrganizeScreen} from './organize-screen.js';
import {SyncScreen} from './sync-screen.js';
import {LibraryScreen} from './library-screen.js';
import {titleOf,withTitle,safePath,resolveWikiTarget,escapeHTML as esc,renderMarkdown} from './core.js';
import {native} from './bridge.js';
import {InitiativeScreen} from './initiative-screen.js';
import {allRecords, moveReferences, fingerprint} from './initiatives.js';
import {FocusScreen} from './focus-screen.js';
import {ActionScreen} from './action-screen.js';
const $=s=>document.querySelector(s);let rootKey='',legacyRoot='',currentWorkspace='',workspaceGeneration=0,pageGeneration=0,notes=[],current=null,base='',dirty=false,view='focus',filter='recent',timer,saving=null,blocked=false,readMode=false,noteGeneration=0,noteLoadRequest=0,noteBaseline='',savedText='';const stars=new Set(JSON.parse(localStorage.getItem('stars')||'[]'));
function notice(msg, success = false){success ? feedback($('#notice'),msg) : errorFeedback($('#notice'), msg);$('#notice').hidden=false;const close=document.createElement('button');close.textContent='关闭提示';close.onclick=()=>$('#notice').hidden=true;$('#notice').append(close);}
for (const button of document.querySelectorAll('nav [data-view]')) button.insertAdjacentHTML('afterbegin', icon(button.dataset.view));
const globalSearch = new SearchScreen({
  capture: captureSearchInvocation,
  sameWorkspace: origin => origin.workspace === workspaceGeneration,
  owns: origin => origin.workspace === workspaceGeneration && origin.page === pageGeneration && origin.request === noteLoadRequest,
  open: openSearchSource, restore: restoreSearchInvocation,
  returnAvailable: available => { for (const control of document.querySelectorAll('.search-return')) control.hidden = !available; },
  error: notice
});
$('#global-search-open').onclick = () => globalSearch.open();
const search = $('#search'); const searchParent = search.parentNode; searchParent.append(field('搜索', search));
$('#new').insertAdjacentHTML('afterbegin', icon('plus'));
const libraryScreen = new LibraryScreen(openNote, notice, () => ['notes', 'favorites'].includes(view), () => view === 'favorites' ? [...stars] : undefined);
const actions = new ActionScreen(notice);
actions.owner = () => `${workspaceGeneration}:${pageGeneration}:${view}`;
const initiatives = new InitiativeScreen(actions, notice, async path => {
  if ($('.app').classList.contains('workspace') && initiatives.previous) return openContextNote(path);
  const sourceAction = !$('#action-editor').hidden ? actions.previous : null;
  if (!await flush(false, true)) return;
  const origin = {view, actionReturn: actions.returnToFocus, action: sourceAction, search: $('#search').value, scroll: $('.collection').scrollTop, detailScroll: $('#workspace-detail').scrollTop, opener: document.activeElement};
  const generation = workspaceGeneration, request = ++noteLoadRequest;
  let loaded;
  try { loaded = await note('read', {path}); } catch (error) { if (generation === workspaceGeneration) { if (actions.drawer.panel.open) errorFeedback($('#action-save-state'), error.message); else notice(error.message); } return; }
  if (generation !== workspaceGeneration || request !== noteLoadRequest || view !== origin.view) return;
  actions.closeDrawer();
  sourceOrigin = origin;
  focus.active = false; $('#search').hidden = false; view = 'notes'; selectNavigation('notes'); $('#search').setAttribute('aria-label', '搜索笔记'); actions.active = false; initiatives.active = false; hideInitiatives();
  $('#action-tools').hidden = true; $('#action-editor').hidden = true;
  await refresh(); if (generation !== workspaceGeneration || request !== noteLoadRequest) return; await load(path, loaded, request); $('#mode').focus();
}, id => createNote(id), async () => {
  // Explicit missing-source recovery may build the reference index without visiting Notes.
  await libraryScreen.library.open(); await libraryScreen.library.sync();
  return libraryScreen.library.inventory();
}, () => flush());
actions.initiatives = initiatives;
const organize = new OrganizeScreen(async path => {
  if (!await flush()) return;
  const origin = {view: 'organize', organization: {scroll: $('#organize-tools').scrollTop, candidate: document.activeElement.closest('[data-candidate]')?.dataset.candidate, label: document.activeElement.getAttribute('aria-label')}};
  const generation = workspaceGeneration, request = ++noteLoadRequest;
  let loaded;
  try { loaded = await note('read', {path}); } catch (error) { if (generation === workspaceGeneration) notice(error.message); return; }
  if (generation !== workspaceGeneration || request !== noteLoadRequest || view !== origin.view) return;
  if (await navigate('notes')) { if (generation !== workspaceGeneration) return; sourceOrigin = origin; await load(path, loaded); $('#mode').focus(); }
});
const readingHistory = new ReadingHistory(localStorage);
let readingOwner = null;
const readingScrollSelectors = ['#reading', '#workspace-detail', 'main'];
const focus = new FocusScreen(actions, initiatives, navigate, notice);
focus.recentReading = () => readingHistory.list(rootKey);
focus.resumeReading = resumeReading;
focus.removeReading = async path => {
  const workspace = rootKey;
  readingHistory.remove(workspace, path); await focus.show();
  if (view === 'focus' && workspace === rootKey) ($('#items [data-reading-path]') || $('.home-tools .primary')).focus({preventScroll:true});
};
const syncScreen = new SyncScreen(() => [actions.repository, initiatives.repository, libraryScreen.library.topics, organize.repository], notice, async () => {
  if (view === 'organize') { if (organize.repository.ready) await organize.candidates(); }
  else await refresh();
});
function selectNavigation(next) {
  pageGeneration++;
  document.querySelector('nav .active')?.classList.remove('active');
  document.querySelector(`nav [data-view="${next}"]`)?.classList.add('active');
  for (const node of document.querySelectorAll('nav [data-view]')) node.setAttribute('aria-current', node.dataset.view === next ? 'page' : 'false');
}
let actionOrigin = null;
let wikiHistory = [], wikiIntent = 0, readerSelection = null;
async function navigate(next) {
  if (!await flush(true)) return false;
  $('.app').classList.remove('reading-continuation');
  const request = ++noteLoadRequest;
  wikiHistory = []; wikiIntent++;
  actions.returnToFocus = null;
  actionOrigin = null; $('#workspace-return-action').hidden = true;
  captureOrigin = null; sourceOrigin = null; $('#capture-return').hidden = true;
  if (view === 'organize' && next !== 'organize') await organize.organization.cancel();
  $('#organize-tools').hidden = next !== 'organize';
  if (next === 'initiatives') initiatives.detailKind = 'overview';
  $('.app').classList.toggle('workspace', next === 'initiatives'); $('#workspace-context').hidden = next !== 'initiatives';
  view = next; $('.app').classList.toggle('home', next === 'focus'); $('#index-state').textContent = '正在载入…'; libraryScreen.offset = 0; $('#library-tools').hidden = !['notes', 'favorites'].includes(next); focus.active = next === 'focus'; actions.active = next === 'actions'; initiatives.active = next === 'initiatives';
  hideInitiatives(); $('#action-editor').hidden = true; $('#action-tools').hidden = !actions.active; $('#search').hidden = focus.active; $('#search').setAttribute('aria-label', {notes:'搜索笔记', favorites:'搜索收藏', actions:'搜索行动', initiatives:'搜索事项', organize:'搜索笔记'}[next] || '搜索内容');
  selectNavigation(next);
  $('.app').classList.remove('editing'); await refresh();
  if (request !== noteLoadRequest) return false;
  if (next === 'actions') { $('#view-title').tabIndex = -1; $('#view-title').focus(); }
  return true;
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
  try {
    if (!await flush()) return;
    const record = (await allRecords(initiatives.repository)).find(i => i.entityId === $('#action-initiative').value);
    if (!record) { notice('关联事项暂不可用，请刷新后重试。'); return; }
    const origin = {view, actionReturn: actions.returnToFocus, action: actions.previous, search: $('#search').value, scroll: $('.collection').scrollTop, detailScroll: $('#workspace-detail').scrollTop};
    if (view !== 'initiatives' && !await navigate('initiatives')) return;
    await initiatives.edit(record);
    if (origin.view !== 'initiatives') { actionOrigin = origin; $('#workspace-return-action').hidden = false; }
  } catch (error) { notice(error.message); }
};
$('#workspace-return-action').onclick = async () => {
  const origin = actionOrigin;
  try {
    if (!origin || !await flush()) return;
    if (!await navigate(origin.view)) return;
    $('#search').value = origin.search;
    await actions.edit(origin.action); actions.returnToFocus = origin.actionReturn;
    $('#action-open-initiative').focus({preventScroll: true});
    $('.collection').scrollTop = origin.scroll; $('#workspace-detail').scrollTop = origin.detailScroll;
  } catch (error) {
    // A failed return must retain its retry control and the saved initiative context.
    actionOrigin = origin; view = 'initiatives'; selectNavigation(view);
    actions.active = false; initiatives.active = true; focus.active = false;
    $('.app').classList.add('workspace', 'editing'); $('.app').classList.remove('detail-open');
    $('#workspace-context').hidden = false; $('#initiative-editor').hidden = false;
    $('#action-editor').hidden = true; $('#action-tools').hidden = true;
    $('#workspace-return-action').hidden = false; notice(error.message);
  }
};
// The search continuation owns a bounded navigation snapshot, never a second draft store.
function captureSearchInvocation() {
  return {classes: $('.app').className, contextReturn: initiatives.contextReturn, workspace: workspaceGeneration, page: pageGeneration, request: noteLoadRequest, view,
    browse: libraryScreen.captureContext(), search: $('#search').value,
    note: visibleNote() ? current : null, reading: readMode,
    initiative: view === 'initiatives' ? initiatives.previous : null,
    detailKind: initiatives.detailKind, selectedContext: initiatives.selectedContext,
    action: actions.previous, actionList: {search: actions.search, offset: actions.offset, status: actions.status}, initiativeList: {search: initiatives.search, offset: initiatives.offset}, actionReturn: actions.returnToFocus,
    sourceOrigin, captureOrigin, actionOrigin, wikiHistory: [...wikiHistory],
    selection: Object.fromEntries(['#title', '#body'].map(selector => { const node = $(selector); return [selector, [node.selectionStart, node.selectionEnd, node.selectionDirection]]; })),
    scroll: Object.fromEntries(['.collection', '#items', '#workspace-context', '#workspace-detail', '#reading', '#body', 'main'].map(selector => [selector, $(selector).scrollTop]))};
}
async function openSearchSource(result, origin, valid) {
  if (!valid() || !await flush() || !valid()) return false;
  // A save can change the matched source. Validate again after the leave decision.
  let source = await globalSearch.service.source(result);
  if (!valid()) return false;
  const next = source.type === 'note' ? 'notes' : source.type === 'initiative' ? 'initiatives' : 'actions';
  if (!await navigate(next)) return false;
  const workspace = workspaceGeneration, page = pageGeneration;
  let request = noteLoadRequest;
  const owns = () => workspace === workspaceGeneration && page === pageGeneration && request === noteLoadRequest;
  if (!owns()) return false;
  source = await globalSearch.service.source(result);
  if (!owns()) return false;
  if (source.type === 'note') {
    if (!await load(source.path, {text: source.text}, request = ++noteLoadRequest, false) || !owns()) return false;
    if (!readMode) $('#mode').click();
    $('#reading').innerHTML = renderMarkdown(source.text, {sourceLines: true, readOnly: true});
    const query = globalSearch.input.value.trim();
    const matchOffset = source.position + Math.max(0, source.passage.toLowerCase().indexOf(query.toLowerCase()));
    const line = source.text.slice(0, matchOffset).split('\n').length - 1;
    const blocks = [...$('#reading').querySelectorAll('[data-source-line]')];
    const match = blocks.filter(node => Number(node.dataset.sourceLine) <= line).at(-1) || $('#reading');
    // Traverse text nodes only, preserving safe markup and the full document.
    const walker = document.createTreeWalker(match, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const fragment = document.createElement('span'); globalSearch.highlight(fragment, node.textContent, query);
      node.replaceWith(fragment);
    }
    match.tabIndex = -1; match.setAttribute('aria-label', '搜索匹配原文');
    match.scrollIntoView({block: 'center'}); match.focus({preventScroll: true});
  } else if (source.type === 'initiative') {
    await initiatives.edit(source.record);
    if (!owns()) return false;
    $('#workspace-title').tabIndex = -1; $('#workspace-title').focus();
  } else {
    await actions.edit(source.record);
    if (!owns() || !actions.drawer.panel.open) return false;
  }
  return owns();
}
async function restoreSearchInvocation(origin, valid) {
  const workspace = workspaceGeneration;
  if (origin.workspace !== workspace || !valid() || !await flush() || !valid() || workspace !== workspaceGeneration) return false;
  if (!await navigate(origin.view) || !valid() || workspace !== workspaceGeneration) return false;
  const page = pageGeneration;
  let request = noteLoadRequest;
  const owns = () => valid() && workspace === workspaceGeneration && page === pageGeneration && request === noteLoadRequest;
  if (origin.initiative) {
    await initiatives.edit(origin.initiative); if (!owns()) return false;
    if (origin.note) { request = noteLoadRequest + 1; if (!await openContextNote(origin.note, origin.reading) || !owns()) return false; }
    initiatives.selectContext(origin.selectedContext);
  } else if (origin.note) {
    if (!await load(origin.note, null, request = ++noteLoadRequest) || !owns()) return false;
    if (readMode !== origin.reading) $('#mode').click();
  }
  if (['notes', 'favorites'].includes(origin.view)) { await libraryScreen.restoreContext(origin.browse); if (!owns()) return false; }
  if (origin.view === 'actions') { Object.assign(actions, origin.actionList); await actions.list(); if (!owns()) return false; }
  if (origin.view === 'initiatives') { Object.assign(initiatives, origin.initiativeList); await initiatives.list(); if (!owns()) return false; }
  $('.app').className = origin.classes; initiatives.contextReturn = origin.contextReturn; initiatives.detailKind = origin.detailKind;
  $('#search').value = origin.search;
  wikiHistory = origin.wikiHistory || [];
  sourceOrigin = origin.sourceOrigin; captureOrigin = origin.captureOrigin; actionOrigin = origin.actionOrigin;
  $('#capture-return').hidden = !captureOrigin; $('#workspace-return-action').hidden = !actionOrigin;
  for (const [selector, selection] of Object.entries(origin.selection)) $(selector).setSelectionRange(...selection);
  for (const [selector, scroll] of Object.entries(origin.scroll)) $(selector).scrollTop = scroll;
  // A later explicit lookup captures its own owner after the restored navigation.
  globalSearch.invocation = {...origin, page: pageGeneration, request: noteLoadRequest};
  return true;
}
for (const container of [$('#global-search-open').parentElement, actions.drawer.footer]) {
  const control = button('返回搜索结果', () => globalSearch.returnToSearch());
  control.classList.add('search-return'); if (container !== actions.drawer.footer) control.classList.add('search-return-shell'); control.hidden = true; container.prepend(control);
}
function hideInitiatives() { $('#initiative-editor').hidden = true; $('#initiative-tools').hidden = true; }
async function prepareInitiatives(cached = false) { if (!initiatives.repository.ready || initiatives.repository.workspaceId !== actions.repository.workspaceId) await initiatives.openWorkspace(cached); }
function note(cmd,args={}){return native(cmd,{workspaceId:rootKey,...args});}
function content(){return withTitle($('#body').value,$('#title').value||'无标题');}
function updateStar(){const selected=stars.has(current);$('#star').textContent=selected?'★':'☆';$('#star').title=selected?'取消收藏笔记':'收藏笔记';$('#star').setAttribute('aria-label',selected?'取消收藏笔记':'收藏笔记');$('#star').setAttribute('aria-pressed',String(selected));}
function state(msg){
  updateNoteToolbar();
  $('#save-state').textContent=msg;
  $('#save-state').dataset.state = /恢复/.test(msg) ? 'recovered' : /正在保存/.test(msg) ? 'saving' : /编辑中|尚有/.test(msg) ? 'dirty' : /未保存|外部修改/.test(msg) ? 'failed' : 'saved';
}
let captureOrigin = null, sourceOrigin = null;
$('#note-save').onclick = () => save();
$('#capture-return').onclick = async () => {
  if (!captureOrigin || !await flush()) return;
  const origin = captureOrigin;
  if (!await navigate(origin.view)) return;
  if (origin.browse) { await libraryScreen.restoreContext(origin.browse); }
  if (origin.initiative) {
    await initiatives.edit(origin.initiative);
    if (origin.note) await openContextNote(origin.note, origin.reading);
    else if (origin.action) { initiatives.detailKind = 'action'; $('.app').classList.add('detail-open'); await actions.edit(origin.action); }
  } else if (origin.action) { await actions.edit(origin.action); actions.returnToFocus = origin.actionReturn; }
  else if (origin.note) { await load(origin.note); if (readMode !== origin.reading) $('#mode').click(); }
  captureOrigin = null; $('#capture-return').hidden = true;
  if (origin.opener?.isConnected && origin.opener.getClientRects().length) origin.opener.focus();
  else document.querySelector('nav .active')?.focus();
};
async function refresh(){const requestedView=view;const generation=workspaceGeneration;$('.app').classList.toggle('library-view',['notes','favorites'].includes(view));$('.app').classList.toggle('home', view === 'focus'); $('.app').classList.toggle('organization-view', view === 'organize'); $('.app').classList.toggle('workspace', view === 'initiatives'); $('#workspace-context').hidden = view !== 'initiatives' || (!initiatives.previous && !initiatives.dirty);
if(view==='initiatives' && ((initiatives.detailKind === 'note' && !$('#editor').hidden) || (initiatives.detailKind === 'action' && !$('#action-editor').hidden))){await initiatives.list(); await initiatives.details(); return;}
if(view==='organize'){await organize.show(libraryScreen.library);return;}
if(view==='focus'){
  $('.app').classList.remove('reading-continuation');
  if(!actions.repository.ready) await actions.openWorkspace(true);
  if(generation!==workspaceGeneration)return;
  rootKey=actions.repository.workspaceId;
  await prepareInitiatives(true);
  if(generation!==workspaceGeneration||requestedView!==view)return;
  actions.active=false;initiatives.active=false;focus.active=true;
  await focus.show();
  clearTimeout(focus.backgroundTimer); focus.backgroundTimer=setTimeout(()=>refreshBackground().catch(e=>notice(e.message)),1000);
  return;
}if(view==='initiatives'){await actions.show({recover:false});actions.active=false;await prepareInitiatives();await initiatives.show();return;}if(view==='actions'){await actions.show();await prepareInitiatives();await actions.assignments();if(generation===workspaceGeneration)rootKey=actions.repository.workspaceId;return;}const workspace=await native('workspace');if(generation!==workspaceGeneration)return;rootKey=workspace.workspaceId;legacyRoot=workspace.root==='Sample'?'Sample · 样本笔记':workspace.root||'';await libraryScreen.show();}
function render(){if(['notes','favorites'].includes(view))libraryScreen.render().catch(e=>notice(e.message));}
async function load(path, loaded = null, request = ++noteLoadRequest, recover = true, committed = resetWikiNavigation){$('#capture-return').hidden = true;const workspaceId=rootKey;const r=loaded || await note('read',{path});if(workspaceId!==rootKey||request!==noteLoadRequest)return false;rememberReading();readingOwner=null;clearTimeout(timer);noteGeneration++;currentWorkspace=workspaceId;current=path;base=r.text;savedText=r.text;dirty=false;blocked=false;$('#conflict').hidden=true;$('#title').value=titleOf(r.text,path);$('#body').value=r.text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');$('#file-path').textContent=path;updateStar();libraryScreen.selectedPath=path;$('#empty').hidden=true;$('#editor').hidden=false;$('.app').classList.add('editing');state('已保存到本地');noteBaseline=content();const draft=recover ? readDraft() : null;if(draft){$('#title').value=titleOf(draft.text,path);$('#body').value=draft.text.replace(/^# .+\r?\n?/m,'').replace(/^\r?\n/,'');dirty=content()!==noteBaseline;base=draft.base;if(base!==r.text){blocked=true;$('#conflict').hidden=false;state('发现未保存草稿和外部修改');}else{state('已恢复未保存草稿');}}readerSelection = null;setNoteMode(!draft);for(const selector of readingScrollSelectors) $(selector).scrollTop=0;committed();
readingOwner={workspace:workspaceId,path,fingerprint:fingerprint(r.text),title:titleOf(r.text,path)};
rememberReading();render();await noteInitiatives(path);if(request!==noteLoadRequest)return false;await libraryScreen.noteTopics(path);return request===noteLoadRequest;}
async function openContextNote(path, reading = true) {
  try {
    if (!await flush(false, true)) return;
    const workspaceId = rootKey, initiativeId = initiatives.previous?.entityId, request = ++noteLoadRequest;
    const loaded = await note('read', {path});
    if (request !== noteLoadRequest || workspaceId !== rootKey || initiativeId !== initiatives.previous?.entityId || view !== 'initiatives') return;
    actions.closeDrawer();
    initiatives.rememberContext(); initiatives.detailKind = 'note'; $('.app').classList.add('workspace', 'detail-open', 'editing');
    $('#action-editor').hidden = true; $('#initiative-editor').hidden = true;
    if (!await load(path, loaded, request)) return; initiatives.selectContext(path); $('#workspace-detail').scrollTop = 0;
    if (!dirty && readMode !== reading) setNoteMode(reading);
    return true;
  } catch (error) { notice(error.message); return false; }
}
async function openNote(path){try{if(await flush()){if(await load(path)) { $('#mode').focus(); }}}catch(e){notice(e.message);}}
async function save() {
  if (saving) { if (!await saving) return false; return save(); }
  if (!dirty) return true;
  if (blocked) return false;
  clearTimeout(timer);
  const path = current, workspaceId = currentWorkspace, text = content(), expected = base;
  const generation = noteGeneration, key = draftKey();
  state('正在保存…');
  saving = (async () => {
    try {
      await note('save', {path, text, expected, workspaceId});
      if (generation !== noteGeneration || workspaceId !== currentWorkspace || path !== current) return true;
      base = text; savedText = text; noteBaseline = text; dirty = content() !== text;
      if (!dirty) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify({text: content(), base}));
      state(dirty ? '尚有编辑未保存' : '已保存到本地');
      validateReferences(); await refresh(); return true;
    } catch (error) {
      if (generation !== noteGeneration) return false;
      state('未保存 · 编辑仍保留');
      if (error.message.includes('CONFLICT')) { blocked = true; $('#conflict').hidden = false; }
      else notice(error.message);
      return false;
    } finally { saving = null; }
  })();
  return saving;
}
function visibleNote() { return Boolean(current && !$('#editor').hidden && ['notes', 'favorites', 'initiatives'].includes(view)); }
function noteTask() {
  return {label: '笔记', dirty: () => dirty, pending: () => saving,
    suspend: () => clearTimeout(timer), save,
    discard: () => {
      clearTimeout(timer); noteGeneration++; localStorage.removeItem(draftKey());
      base = savedText; blocked = false; dirty = false;
      $('#title').value = titleOf(savedText, current);
      $('#body').value = savedText.replace(/^# .+\r?\n?/m, '').replace(/^\r?\n/, '');
      noteBaseline = content(); $('#conflict').hidden = true; state('已放弃未保存更改'); updateReading();
    }};
}
function activeTask() {
  // The frontmost editing surface owns the leave intent. Hidden/recovered
  // editors remain private and never participate in this decision.
  if (organize.settingsDrawer.panel.open) return organize.settingsTask();
  if (shortDrawer.panel.open) return shortTaskAdapter();
  if (libraryScreen.topicDrawer.panel.open) return libraryScreen.topicTask();
  if (actions.drawer.panel.open) return actions.task();
  if (initiatives.drawer.panel.open) return initiatives.task();
  if (!syncScreen.panel.hidden) return syncScreen.task();
  if (noteInfo.panel.open) return {label: '笔记信息', dirty: () => false,
    pending: () => libraryScreen.noteTopicPending || noteInitiativePending, close: () => noteInfo.hide()};
  return visibleNote() ? noteTask() : null;
}
async function flush(navigation = false, retainAction = false) {
  rememberReading();
  const task = activeTask();
  return requestTaskLeave(retainAction && actions.drawer.panel.open ? {...task, close: undefined} : task);
}
function draftKey(){return 'draft:'+(currentWorkspace||rootKey)+':'+current;}
function readDraft(){const key=draftKey(),legacyKey='draft:'+legacyRoot+':'+current;let value=localStorage.getItem(key);if(value===null&&legacyRoot){value=localStorage.getItem(legacyKey);if(value!==null){localStorage.setItem(key,value);localStorage.removeItem(legacyKey);}}return JSON.parse(value||'null');}
function changed(){noteLoadRequest++;dirty=content()!==noteBaseline;if(dirty)localStorage.setItem(draftKey(),JSON.stringify({text:content(),base}));else localStorage.removeItem(draftKey());state(dirty?'编辑中…':'已保存到本地');clearTimeout(timer);if(dirty&&!taskLeavePending()){const generation=noteGeneration;timer=setTimeout(()=>{if(generation===noteGeneration&&visibleNote()&&!document.querySelector('dialog[open]'))save();},650);}}

function resetWikiNavigation() { wikiHistory = []; wikiIntent++; }

// Reading continuations are private to this task and retain caller-owned outer routes.
function selectedReaderRange() {
  const reader = $('#reading'), selection = getSelection();
  let range = null;
  if (selection.rangeCount && reader.contains(selection.anchorNode) && reader.contains(selection.focusNode)) {
    const selected = selection.getRangeAt(0);
    const path = node => { const parts = []; while (node !== reader) { parts.unshift([...node.parentNode.childNodes].indexOf(node)); node = node.parentNode; } return parts; };
    range = {start: path(selected.startContainer), end: path(selected.endContainer), startOffset: selected.startOffset, endOffset: selected.endOffset, text: selected.toString()};
  }
  return range;
}
document.addEventListener('selectionchange', () => {
  const range = selectedReaderRange();
  if (visibleNote() && range?.text) readerSelection = range;
});
function captureWikiPosition(opener) {
  const range = selectedReaderRange();
  return {path: current, fingerprint: fingerprint(savedText), reading: readMode, range: range?.text ? range : readerSelection,
    focus: opener?.dataset.wikiTarget, browse: libraryScreen.captureContext(),
    scroll: Object.fromEntries(['#reading', '#body', '#workspace-detail', 'main'].map(selector => [selector, $(selector).scrollTop]))};
}
function locateReaderNode(parts) { return parts.reduce((node, index) => node?.childNodes[index], $('#reading')); }
function restoreWikiPosition(position, unchanged, focusOverride = null) {
  const opener = [...$('#reading').querySelectorAll('[data-wiki-target]')].find(node => node.dataset.wikiTarget === position.focus);
  (focusOverride || opener || $('#mode')).focus({preventScroll: true});
  if (unchanged && position.range) {
    const start = locateReaderNode(position.range.start), end = locateReaderNode(position.range.end);
    if (start && end && position.range.startOffset <= (start.nodeType === Node.TEXT_NODE ? start.length : start.childNodes.length) && position.range.endOffset <= (end.nodeType === Node.TEXT_NODE ? end.length : end.childNodes.length)) {
      const range = document.createRange();
      range.setStart(start, position.range.startOffset); range.setEnd(end, position.range.endOffset);
      if (range.toString() === position.range.text) { getSelection().removeAllRanges(); getSelection().addRange(range); }
    }
  }
  for (const [selector, scroll] of Object.entries(position.scroll)) $(selector).scrollTop = scroll;
}
// Keep contextual commitment on the existing drawer/revision boundary.
async function createReadingAction(passage, opener) {
  if (!visibleNote() || document.querySelector('dialog[open]')) return;
  const position = captureWikiPosition(), path = current, workspace = currentWorkspace;
  const generation = workspaceGeneration, page = pageGeneration;
  const owns = () => generation === workspaceGeneration && page === pageGeneration && path === current && workspace === currentWorkspace && visibleNote();
  const original = savedText;
  let quote = '', description = titleOf(original, path);
  if (passage) {
    const selected = position.range;
    if (!readMode || !selected?.text) { notice('请先在原文中选择要引用的段落。'); return; }
    const range = document.createRange();
    try {
      range.setStart(locateReaderNode(selected.start), selected.startOffset);
      range.setEnd(locateReaderNode(selected.end), selected.endOffset);
      if (range.toString() !== selected.text) throw Error('Selection changed');
    } catch { notice('选段已更改，请重新选择原文。'); return; }
    const walker = document.createTreeWalker($('#reading'), NodeFilter.SHOW_TEXT);
    const lines = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || !range.intersectsNode(node)) continue;
      const block = node.parentElement.closest('[data-source-line]');
      if (block) lines.push(Number(block.dataset.sourceLine));
    }
    if (!lines.length) { notice('无法定位选段原文，请重新选择段落。'); return; }
    const start = Math.min(...lines), end = Math.max(...lines);
    const next = [...document.querySelectorAll('#reading [data-source-line]')].map(node => Number(node.dataset.sourceLine)).filter(line => line > end).sort((a,b) => a-b)[0];
    // Quote complete original blocks, never rendered text with Markdown stripped.
    quote = (original.match(/[^\n]*(?:\n|$)/g) || []).slice(start, next).join('').replace(/\r?\n$/, '');
    if (!quote || !original.includes(quote)) { notice('无法定位选段原文，请重新选择段落。'); return; }
    description = selected.text;
  }
  try {
    if (!await flush() || !owns()) return;
    const expected = fingerprint(savedText);
    if (passage && savedText !== original) throw Error('原文已更改，请重新选择段落。');
    const source = {path, quote, fingerprint: expected};
    const validate = async fields => {
      if (!owns()) throw Error('笔记目录或页面已切换，请重新打开行动。');
      const loaded = await note('read', {path, workspaceId: workspace});
      if (!owns()) throw Error('笔记目录或页面已切换，请重新打开行动。');
      if (fingerprint(loaded.text) !== expected) throw Error('来源已更改，请取消后重新阅读并创建行动。');
      if (!fields.sources.some(item => item.path === path && item.quote === quote && item.fingerprint === expected)) throw Error('请保留此笔记的原始来源引用。');
    };
    await validate({sources: [source]}); if (!owns()) return;
    await actions.edit(null, null, {fields: {description, sources: [source]},
      key: `reading-action-draft:${workspace}:${path}:${fingerprint(quote)}`,
      validate, restore: () => { if (owns()) { restoreWikiPosition(position, savedText === original, opener); } }});
  } catch (error) { if (owns()) notice(error.message); }
}
const noteAction = button('从笔记创建行动', () => createReadingAction(false, noteAction));
noteAction.id = 'note-create-action';
const passageAction = button('从选段创建行动', () => createReadingAction(true, passageAction));
passageAction.id = 'passage-create-action';
$('#mode').after(noteAction, passageAction);

async function followWiki(target, opener) {
  if (!visibleNote()) return;
  const position = captureWikiPosition(opener), intent = ++wikiIntent;
  const workspace = workspaceGeneration, page = pageGeneration, path = current, initialRequest = noteLoadRequest;
  const owns = () => intent === wikiIntent && workspace === workspaceGeneration && page === pageGeneration && path === current && initialRequest === noteLoadRequest && visibleNote();
  try {
    if (!await flush() || !owns()) return;
    // Enumeration uses existing native exclusions, with no body scan or index rewrite.
    const metadata = await note('metadata'); if (!owns()) return;
    const destination = resolveWikiTarget(target, path, metadata.notes.map(note => note.path));
    const loaded = await note('read', {path: destination}); if (!owns()) return;
    if (destination === current) return;
    const request = ++noteLoadRequest;
    await load(destination, loaded, request, true, () => {
      wikiHistory.push(position);
      $('#mode').focus(); $('#reading').scrollTop = 0; $('#workspace-detail').scrollTop = 0;
    });
  } catch (error) { if (intent === wikiIntent && workspace === workspaceGeneration && page === pageGeneration) notice(error.message); }

}
async function returnWiki() {
  const position = wikiHistory.at(-1), intent = ++wikiIntent;
  const workspace = workspaceGeneration, page = pageGeneration, path = current, initialRequest = noteLoadRequest;
  const owns = () => intent === wikiIntent && workspace === workspaceGeneration && page === pageGeneration && path === current && initialRequest === noteLoadRequest;
  try {
    if (!await flush() || !owns()) return;
    const loaded = await note('read', {path: position.path}); if (!owns()) return;
    const request = ++noteLoadRequest;
    await load(position.path, loaded, request, true, () => {
      wikiHistory.pop();
      Object.assign(libraryScreen, position.browse);
      const unchanged = fingerprint(loaded.text) === position.fingerprint;
      restoreWikiPosition(position, unchanged);
      if (!unchanged) notice('原文已更改，已打开当前版本。');
    });
  } catch (error) {
    if (!owns()) return;
    notice('上一份笔记暂不可用。可重试返回，或跳过此笔记。');
    const skip = button('跳过不可用笔记', async () => { if (!owns()) return; wikiHistory.pop(); $('#notice').hidden = true; $('#back').click(); });
    $('#notice').append(skip);
  }
}
$('#reading').addEventListener('click', event => {
  const control = event.target.closest('[data-wiki-target]');
  if (control) { event.preventDefault(); followWiki(control.dataset.wikiTarget, control); }
});

function rememberReading() {
  const owner = readingOwner;
  if (!owner || owner.workspace !== rootKey || owner.path !== current || !visibleNote() || !readMode || dirty) return;
  try {
    readingHistory.remember(owner.workspace, {path:owner.path, title:owner.title, fingerprint:owner.fingerprint,
      scroll:Object.fromEntries(readingScrollSelectors.map(selector => [selector, $(selector).scrollTop]))});
  } catch { notice('阅读位置未能保存在本机，笔记原文未受影响。'); }
}
for (const selector of readingScrollSelectors) $(selector).addEventListener('scroll', rememberReading, {passive:true});
async function resumeReading(entry) {
  const workspace = workspaceGeneration, page = pageGeneration, key = rootKey, request = ++noteLoadRequest;
  const owns = () => workspace === workspaceGeneration && page === pageGeneration && key === rootKey && request === noteLoadRequest && view === 'focus';
  try {
    if (!await flush() || !owns()) return;
    const metadata = await note('metadata'); if (!owns()) return;
    // Exact paths only, matching wiki return identity. Never search by basename.
    if (metadata.notes.filter(item => item.path === entry.path).length !== 1) throw Error('Unavailable source');
    const loaded = await note('read', {path:entry.path}); if (!owns()) return;
    // Initialize only source context repositories; do not start Library body indexing.
    await libraryScreen.library.open(); if (!owns()) return;
    await libraryScreen.library.indexSource(metadata.notes.find(item => item.path === entry.path), loaded.text); if (!owns()) return;
    const homeScroll = $('.collection').scrollTop;
    focus.active=false; actions.active=false; initiatives.active=false;
    view='notes'; selectNavigation('notes'); $('.app').classList.remove('home'); $('.app').classList.add('library-view','reading-continuation');
    $('#search').hidden=false; $('#search').setAttribute('aria-label','搜索笔记');
    sourceOrigin={view:'focus',search:'',scroll:homeScroll,detailScroll:0};
    await load(entry.path, loaded, request, true, () => {
      resetWikiNavigation();
      const unchanged = fingerprint(loaded.text) === entry.fingerprint;
      restoreWikiPosition({scroll: Object.fromEntries(readingScrollSelectors.map(selector => [selector, unchanged ? entry.scroll[selector] || 0 : 0]))}, unchanged);
      if (!unchanged) notice('原文已更改，已从开头打开当前版本。');
    });
  } catch {
    if (!owns()) return;
    notice('这份笔记暂不可用，可能已移动或目录无法访问。可重试继续阅读，或移除此入口。');
  }
}

function updateReading(){readerSelection=null;$('#reading').innerHTML=renderMarkdown(readMode && !dirty ? savedText : content(), {readOnly: true, sourceLines: true});}
function updateNoteToolbar() {
  $('#note-save').hidden = readMode && !dirty; $('#save-state').hidden = readMode && !dirty && !blocked;
}
function setNoteMode(reading) {
  if (!reading) rememberReading();
  readMode = reading;
  $('#body').hidden = reading; $('#reading').hidden = !reading; $('#title').readOnly = reading;
  updateNoteToolbar();
  $('#mode').textContent = reading ? '编辑' : '阅读'; $('#note-mode').textContent = reading ? '阅读笔记' : '编辑笔记';
  updateReading();
  if (reading && readingOwner?.path === current && readingOwner.workspace === rootKey && !dirty) {
    readingOwner = {...readingOwner, fingerprint:fingerprint(savedText), title:titleOf(savedText,current)}; rememberReading();
  }
}
$('#title').oninput=$('#body').oninput=changed;
$('#search').oninput=()=>{if(view==='initiatives'){initiatives.search=$('#search').value;initiatives.offset=0;initiatives.list().catch(e=>notice(e.message));}else if(view==='actions'){actions.search=$('#search').value;actions.offset=0;actions.list().catch(e=>notice(e.message));}else {libraryScreen.search=$('#search').value;libraryScreen.offset=0;render();}};
for(const b of document.querySelectorAll('nav button[data-view]'))b.onclick=()=>navigate(b.dataset.view).catch(e=>notice(e.message));
for(const b of document.querySelectorAll('#filters button'))b.onclick=()=>{filter=b.dataset.filter;document.querySelector('#filters .active')?.classList.remove('active');b.classList.add('active');render();};
async function createNote(initiativeId = null, captured = null) {
  try {
    if (!await flush()) return;
    const origin = !initiativeId ? {browse: ['notes','favorites'].includes(view) ? libraryScreen.captureContext() : null, view, actionReturn: actions.returnToFocus, opener: document.activeElement, initiative: view === 'initiatives' ? initiatives.previous : null, action: view === 'actions' ? actions.previous : null, note: !$('#editor').hidden ? current : null, reading: readMode} : null;
    const path = captured?.path || `Notes/note-${Date.now()}.md`, text = captured?.text || '# 无标题\n\n';
    if (!captured?.persisted) await note('create', {path, text});
    if (initiativeId) {
      const initiative = (await allRecords(initiatives.repository)).find(i => i.entityId === initiativeId);
      const linked = await initiatives.repository.save({...initiative, sources: [...initiative.sources, {path, quote: '# 无标题', fingerprint: fingerprint(text), role: 'working-note'}]}, initiative);
      if (initiatives.previous?.entityId === initiativeId) { initiatives.form(linked.record, linked.record); await initiatives.details(); }
    }
    if (initiativeId && $('.app').classList.contains('workspace')) { await openContextNote(path, false); $('#title').focus(); $('#title').select(); return; }
    focus.active = false; $('#search').hidden = false; view = 'notes'; selectNavigation('notes'); $('#search').setAttribute('aria-label', '搜索笔记'); actions.active = false; initiatives.active = false; hideInitiatives();
    $('#action-tools').hidden = true; $('#action-editor').hidden = true;
    await validateReferences();await refresh(); await load(path); captureOrigin ||= origin; $('#capture-return').hidden = !captureOrigin; if (readMode) $('#mode').click(); $('#title').focus(); $('#title').select();
  } catch (error) { notice(error.message); }
}
// Short tasks retain their own private draft and delegate writes to existing adapters.
let shortTask = null, shortSaving = false;
const shortDrawer = drawer({id: 'note-task-drawer', title: '随手记', onDismiss: () => leaveShortTask()});
shortDrawer.panel.classList.add('ui-drawer-wide');
const shortForm = document.createElement('form'); shortForm.id = 'note-task-form'; shortForm.className = 'document'; shortForm.noValidate = true;
const shortStatus = document.createElement('div'); shortStatus.id = 'note-task-status'; shortStatus.setAttribute('role', 'status');
shortDrawer.body.append(shortForm, shortStatus);
const shortSubmit = document.createElement('button'); shortSubmit.type = 'submit'; shortSubmit.setAttribute('form', shortForm.id); shortSubmit.className = 'ui-action primary ui-compact';
shortDrawer.footer.append(button('取消', () => leaveShortTask(), {density: 'compact'}), shortSubmit);
function shortInput() { return JSON.stringify(Object.fromEntries(Object.entries(shortTask.values()).filter(([id]) => !shortForm.querySelector('#' + id)?.matches('input[type=hidden]')))); }
function shortDirty() { return Boolean(shortTask && shortInput() !== shortTask.initial); }
function closeShortTask() {
  if (shortSaving) return false;
  if (shortTask?.key) localStorage.removeItem(shortTask.key);
  shortTask = null; shortDrawer.hide();
  if (!document.activeElement?.getClientRects().length || document.activeElement === document.body) ($('#note-info-open').getClientRects().length ? $('#note-info-open') : $('#new')).focus({preventScroll: true});
  return true;
}
function shortTaskAdapter() {
  return {label: shortDrawer.panel.querySelector('h2')?.textContent || '当前编辑',
    dirty: shortDirty, pending: () => shortSaving,
    save: () => saveShortTask(false), discard: () => closeShortTask(), close: () => closeShortTask()};
}
function leaveShortTask() { return shortTask ? requestTaskLeave(shortTaskAdapter()) : Promise.resolve(true); }
function openShortTask({title, controls, key, values, save, submit = '保存'}) {
  if (shortTask || document.querySelector('dialog[open]')) return;
  shortForm.replaceChildren(...controls);
  for (const control of shortForm.querySelectorAll('input:not([type=hidden]),textarea')) control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), 'note-task-status'].filter(Boolean).join(' '));
  shortStatus.replaceChildren();
  shortTask = {key, values, save}; shortTask.initial = shortInput();
  let draft; try { draft = JSON.parse(localStorage.getItem(key)); } catch { /* Ignore invalid private drafts. */ }
  if (draft) {
    for (const [id, value] of Object.entries(draft)) { const input = shortForm.querySelector('#' + id); if (input) input.value = value; }
    shortStatus.textContent = '已恢复未保存草稿，请核对后保存。';
  }
  shortDrawer.setTitle(title); shortSubmit.textContent = submit;
  shortDrawer.open(shortForm.querySelector('input:not([type=hidden]),textarea,button'));
}
shortForm.oninput = () => {
  if (!shortTask?.key) return;
  try { if (shortDirty()) localStorage.setItem(shortTask.key, JSON.stringify(shortTask.values())); else localStorage.removeItem(shortTask.key); shortStatus.textContent = shortDirty() ? '尚未保存' : ''; }
  catch { shortStatus.textContent = '草稿无法在关闭后恢复，请保持窗口打开并保存。'; }
};
shortForm.onsubmit = event => { event.preventDefault(); saveShortTask(true); };
function saveShortTask(openSaved) {
  if (shortSaving) return shortSaving;
  if (!shortTask) return Promise.resolve(true);
  const task = shortTask;
  shortSaving = (async () => {
    await Promise.resolve();
    shortForm.inert = true; shortSubmit.disabled = true; shortStatus.textContent = '正在保存…';
    try {
      const afterSave = await task.save();
      if (task !== shortTask) return true;
      task.initial = shortInput(); localStorage.removeItem(task.key);
      // Explicit submit may reveal its saved note. A leave intent must finish
      // the originally requested navigation/termination instead.
      if (openSaved) { shortSaving = false; closeShortTask(); await afterSave?.(); }
      return true;
    } catch (error) { errorFeedback(shortStatus, error.message); return false; }
    finally { shortSaving = false; shortForm.inert = false; shortSubmit.disabled = false; shortForm.querySelector('[aria-invalid=true]')?.focus(); }
  })();
  return shortSaving;
}
function taskInput(id, value = '', multiline = false) {
  const input = document.createElement(multiline ? 'textarea' : 'input'); input.id = id; input.value = value;
  input.setAttribute('aria-describedby', 'note-task-status'); input.addEventListener('input', () => input.setAttribute('aria-invalid', 'false'));
  if (multiline) input.rows = 7;
  return input;
}
async function openCapture() {
  if (!await flush()) return;
  const title = taskInput('capture-title'), body = taskInput('capture-body', '', true);
  const workspaceId = rootKey, path = taskInput('capture-path', `Notes/note-${Date.now()}.md`); path.type = 'hidden';
  openShortTask({title: '随手记', key: `capture-draft:${workspaceId}`, controls: [path, field('标题', title, {density: 'compact'}), field('正文', body)],
    values: () => ({'capture-title': title.value, 'capture-body': body.value, 'capture-path': path.value}), submit: '创建笔记', save: async () => {
      if (!title.value.trim() && !body.value.trim()) { title.setAttribute('aria-invalid', 'true'); throw Error('请填写标题或正文。'); }
      if (workspaceId !== rootKey) throw Error('Workspace changed');
      // Create only after explicit submission; failed writes retain all input.
      if (!safePath(path.value)) throw Error('请使用有效的相对 Markdown 路径');
      const text = `# ${title.value.trim() || '无标题'}\n\n${body.value}`;
      try { await note('create', {path: path.value, text, workspaceId}); }
      catch (error) {
        let existing; try { existing = await note('read', {path: path.value, workspaceId}); } catch { throw error; }
        if (existing.text !== text) throw error;
      }
      return () => createNote(null, {path: path.value, text, persisted: true});
    }});
}
const noteInfo = drawer({id: 'note-info-drawer', title: '笔记信息与整理', onDismiss: () => flush()});
noteInfo.panel.classList.add('ui-drawer-wide');
const details = $('#note-details');
const infoOpen = button('笔记信息与整理', async () => { if (!await flush()) return; await libraryScreen.noteTopics(current); await noteInitiatives(current); noteInfo.open($('#star'), infoOpen); }); infoOpen.id = 'note-info-open';
for (const child of [...details.children].filter(node => node.tagName !== 'SUMMARY')) noteInfo.body.append(child);
details.replaceWith(infoOpen);
noteInfo.footer.append(button('完成', () => flush(), {primary: true, density: 'compact'}));
libraryScreen.createNoteTopic = async note => { if (await flush()) libraryScreen.editTopic(null, note); };
libraryScreen.returnToNoteInfo = async (note, committed) => {
  if (current !== note.path || currentWorkspace !== libraryScreen.library.workspaceId || $('#editor').hidden) return;
  try { await libraryScreen.noteTopics(note.path); }
  catch (error) { notice(committed ? '主题已保存到本地，关联列表暂未更新。请重新打开笔记信息重试。' : '关联列表暂未更新，请重新打开笔记信息重试。', true); infoOpen.focus({preventScroll: true}); return false; }
  noteInfo.open($('#note-create-topic'), infoOpen);
};


$('#new').onclick = () => openCapture();
$('#choose').onclick=async()=>{try{if(!await flush())return;await organize.organization.cancel();$('#organize-tools').hidden=true;organize.organization.batches=null;organize.repository.ready=false;const r=await native('choose');if(r.cancelled)return;actionOrigin=null;$('#workspace-return-action').hidden=true;sourceOrigin=null;captureOrigin=null;$('#capture-return').hidden=true;workspaceGeneration++;organize.resetSelection();wikiHistory=[];wikiIntent++;globalSearch.reset();for(const control of document.querySelectorAll('.search-return'))control.hidden=true;noteLoadRequest++;libraryScreen.library.generation++;libraryScreen.library.workspaceId=null;$('#library-tools').hidden=true;focus.active=false;clearTimeout(focus.backgroundTimer);initiatives.active=false;initiatives.repository.ready=false;initiatives.previous=null;hideInitiatives();current=null;currentWorkspace='';base='';rootKey='';legacyRoot='';notes=[];$('#items').replaceChildren();$('#root-label').textContent='正在打开目录…';$('#editor').hidden=true;$('#action-editor').hidden=true;$('#action-tools').hidden=true;$('#empty').hidden=false;$('.app').classList.remove('editing');await actions.openWorkspace();rootKey=actions.repository.workspaceId;await prepareInitiatives();await refresh();}catch(e){notice(e.message);}};
$('#star').onclick=()=>{stars.has(current)?stars.delete(current):stars.add(current);localStorage.setItem('stars',JSON.stringify([...stars]));updateStar();render();};
$('#back').onclick=async()=>{if(wikiHistory.length){await returnWiki();return;}wikiIntent++;if ($('.app').classList.contains('workspace')) { if (await flush()) { await initiatives.edit(initiatives.previous); initiatives.restoreContext(); } return; } if(await flush()){if(sourceOrigin){const origin=sourceOrigin; if(await navigate(origin.view)){$('#search').value=origin.search; if(origin.organization){const context=origin.organization;const card=[...document.querySelectorAll('[data-candidate]')].find(node=>node.dataset.candidate===context.candidate);const control=[...(card?.querySelectorAll('[aria-label]')||[])].find(node=>node.getAttribute('aria-label')===context.label);(control||card||$('#ai-preview')).focus({preventScroll:true});$('#organize-tools').scrollTop=context.scroll;return;} if(origin.action){await actions.edit(origin.action);actions.returnToFocus=origin.actionReturn;} (origin.view === 'focus' ? [...document.querySelectorAll('[data-reading-path]')].find(node=>node.dataset.readingPath===current) || $('.home-tools .primary') : origin.opener?.isConnected ? origin.opener : $('#action-description')).focus({preventScroll:true}); $('.collection').scrollTop=origin.scroll; $('#workspace-detail').scrollTop=origin.detailScroll;}return;}$('.app').classList.remove('editing');$('#editor').hidden=true;$('#empty').hidden=false;await libraryScreen.restore();}};
$('#mode').onclick=()=>{setNoteMode(!readMode); if (!readMode) $('#body').focus();};
$('#rename').onclick = async () => {
  if (!await flush()) return;
  const original = current, expected = base, workspaceId = currentWorkspace;
  const pathInput = taskInput('note-location', current);
  openShortTask({title: '移动 / 改名', controls: [field('笔记相对路径', pathInput, {help: '以 .md 结尾，路径相对于笔记目录。', density: 'compact'})],
    key: `location-draft:${workspaceId}:${original}`, values: () => ({'note-location': pathInput.value}), save: async () => {
      const path = pathInput.value.trim();
      if (!safePath(path)) { pathInput.setAttribute('aria-invalid', 'true'); throw Error('请使用有效的相对 Markdown 路径'); }
      if (path === original) return;
      await repairMovedLinks();
      await note('move', {path: original, target: path, expected, workspaceId});
      rememberReading(); readingHistory.moved(workspaceId, original, path); readingOwner=null;
      localStorage.setItem('pending-note-move:' + rootKey, JSON.stringify({from: original, to: path}));
      // The move is committed; link repair is separately retryable from note information.
      try { await repairMovedLinks(); } catch (error) { notice('笔记已移动，关联尚未更新，请点击「重试更新关联」。' + error.message); }
      if (stars.delete(original)) { stars.add(path); localStorage.setItem('stars', JSON.stringify([...stars])); }
      await load(path).then(refresh).catch(error => notice('笔记已移动，请重新打开：' + error.message));
    }});
};
$('#copy').onclick=async()=>{try{const path=current.replace(/\.md$/i,`-conflict-${Date.now()}.md`);await note('create',{path,text:content(),workspaceId:currentWorkspace});localStorage.removeItem(draftKey());dirty=false;blocked=false;$('#conflict').hidden=true;await validateReferences();await refresh();await load(path);}catch(e){notice(e.message);}};
$('#reload').onclick=async()=>{try{localStorage.removeItem(draftKey());await load(current);await refresh();}catch(e){notice(e.message);}};
window.hasUnsavedChanges = () => { const task = activeTask(); return Boolean(task && (task.dirty() || task.pending?.())); };
window.requestNativeLeave = token => {
  flush().then(allowed => native('leaveResult', {token, allowed}), error => {
    notice('离开请求未完成：' + error.message);
    return native('leaveResult', {token, allowed: false});
  });
};
window.addEventListener('pagehide', rememberReading);
window.addEventListener('beforeunload', event => { rememberReading(); if (window.hasUnsavedChanges()) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('blur', () => { if (visibleNote() && dirty && !taskLeavePending() && !document.querySelector('dialog[open]')) save(); });
async function validateReferences(){if(!['notes','favorites'].includes(view))return;try{await libraryScreen.library.open();await libraryScreen.library.sync();}catch(e){feedback($('#save-state'), '参考资料暂不可用，请检查目录后重试。', e.message);}}
window.addEventListener('reference-change',validateReferences);
window.addEventListener('focus',validateReferences);
// Mac metadata fallback also catches nested changes missed by the root notification.
if(window.webkit?.messageHandlers?.notes)setInterval(validateReferences,30000);
refresh().catch(e=>notice(e.message));

let noteInitiativePending = null;
async function noteInitiatives(path, focusId = null) {
  $('#repair-links').hidden = !localStorage.getItem('pending-note-move:'+rootKey);
  const workspaceId = rootKey;
  await prepareInitiatives();
  await initiatives.repository.serialize(() => initiatives.repository.recover());
  const records = await allRecords(initiatives.repository);
  const owns = () => current === path && rootKey === workspaceId;
  if (!owns()) return;
  if (initiatives.previous) initiatives.previous = records.find(record => record.entityId === initiatives.previous.entityId) || initiatives.previous;
  const container = $('#note-initiatives'); container.replaceChildren();
  if (!records.length) { const empty = document.createElement('p'); empty.textContent = '尚无事项。可先保存笔记，稍后关联已有事项。'; container.append(empty); }
  for (const record of records) {
    const label = document.createElement('label'), checkbox = document.createElement('input');
    label.className = 'ui-selection'; checkbox.type = 'checkbox';
    checkbox.checked = record.sources.some(source => source.path === path); checkbox.dataset.initiativeId = record.entityId;
    label.append(checkbox, document.createTextNode(record.title)); container.append(label);
    checkbox.onchange = () => {
      if (noteInitiativePending) return;
      const linked = checkbox.checked;
      noteInitiativePending = (async () => {
        container.inert = true;
        try {
          const sources = record.sources.filter(source => source.path !== path);
          if (linked) sources.push({path, quote: '', fingerprint: fingerprint(savedText), role: 'reference'});
          await initiatives.repository.save({...record, sources}, record);
          if (owns()) await noteInitiatives(path, record.entityId);
        } catch (error) {
          if (!owns()) return;
          const failure = document.createElement('div'); failure.setAttribute('role', 'alert'); container.append(failure);
          checkbox.checked = !linked;
          // Reload the owner after either a stale base or a recoverable commit. Never repeat the old write.
          for (const input of container.querySelectorAll('input')) input.disabled = true;
          feedback(failure, error.revisionSaved ? '关联版本已保存，恢复尚未完成。请重试更新。' : '关联尚未保存，请重新载入后重试。', error.message);
          failure.append(button('重试更新事项关联', async () => {
            if (noteInitiativePending) return noteInitiativePending;
            noteInitiativePending = (async () => {
              try { await noteInitiatives(path, record.entityId); } catch (retryError) { feedback(failure, '更新尚未完成，请重试。', retryError.message); }
            })().finally(() => { noteInitiativePending = null; });
            return noteInitiativePending;
          }));
        } finally { container.inert = false; }
      })().finally(() => { noteInitiativePending = null; });
      return noteInitiativePending;
    };
    if (checkbox.checked) container.append(button(`打开事项：${record.title}`, async () => {
      if (await flush()) { focus.active = false; $('#search').hidden = false; view = 'initiatives'; actions.active = false; selectNavigation('initiatives'); await initiatives.show(); await initiatives.edit(record); }
    }, {variant: 'quiet'}));
  }
  container.inert = false;
  if (focusId) [...container.querySelectorAll('input')].find(input => input.dataset.initiativeId === focusId)?.focus({preventScroll: true});
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
