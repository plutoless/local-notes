import test from 'node:test';
import assert from 'node:assert/strict';
const previousWindow=globalThis.window;
globalThis.window={};
const {ActionScreen}=await import('../build/web/action-screen.js');
globalThis.window=previousWindow;

test('Action entry adopts a return route only after an accepted, current drawer open',async()=>{
  for(const mode of ['accepted','continued','superseded','closed']) {
    const original=()=>{}, replacement=()=>{};
    const screen=Object.create(ActionScreen.prototype);
    screen.returnToFocus=original; screen.drawer={panel:{open:true}};
    let settle;
    screen.edit=()=>{screen.openRequest=(screen.openRequest||0)+1;return new Promise(resolve=>settle=resolve);};
    const pending=screen.open({record:null,returnToOrigin:replacement});
    if(mode==='superseded')screen.openRequest++;
    if(mode==='closed')screen.drawer.panel.open=false;
    settle(mode!=='continued');await pending;
    assert.equal(screen.returnToFocus,mode==='accepted'?replacement:original,mode);
  }
});

test('focus membership remains pending for leave and a superseded result cannot replace another Action',async()=>{
  const previousDocument=globalThis.document;
  const form={},focus={};globalThis.document={querySelector:selector=>selector==='#action-form'?form:focus};
  try {
    for(const stale of [false,true]) {
      let resolveQuery, resolveSave;
      const screen=Object.create(ActionScreen.prototype);
      const current={entityId:'original',focusPosition:null};
      screen.previous=current;screen.editRequest=1;screen.save=async()=>true;
      screen.repository={query:()=>new Promise(resolve=>resolveQuery=resolve),save:()=>new Promise(resolve=>resolveSave=resolve)};
      const shown=[];screen.showForm=record=>shown.push(record);screen.state=()=>{};
      const pending=screen.changeFocus();
      await Promise.resolve();await Promise.resolve();
      assert.ok(screen.task().pending(),'leave observes the operation');
      resolveQuery({actions:[]});await Promise.resolve();await Promise.resolve();
      if(stale){screen.previous={entityId:'replacement'};screen.editRequest++;}
      resolveSave({record:{...current,focusPosition:1}});await pending;
      assert.equal(shown.length,stale?0:1);assert.equal(screen.saving,null);
    }
  } finally {globalThis.document=previousDocument;}
});

test('a durable focus revision with failed repair stays a committed private recovery candidate',async()=>{
  const previousDocument=globalThis.document,previousStorage=globalThis.localStorage;
  const nodes=new Map(),drafts=new Map();
  const node=()=>({classList:{add(){}},dataset:{},replaceChildren(){},append(){}});
  globalThis.document={querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},createElement:node};
  globalThis.localStorage={setItem:(key,value)=>drafts.set(key,value)};
  try {
    const screen=Object.create(ActionScreen.prototype);
    const record={entityId:'action',status:'todo',revision:'committed',focusPosition:1};
    screen.previous={...record,revision:'before',focusPosition:null};screen.editRequest=1;screen.save=async()=>true;
    screen.repository={query:async()=>({actions:[]}),save:async()=>{throw Object.assign(Error('repair unavailable'),{revisionSaved:true,record});}};
    const failures=[];screen.receipt={failure:(diagnostic,message)=>failures.push({diagnostic,message})};
    screen.showForm=value=>{screen.previous=value;};screen.key=()=> 'private-action';screen.fields=()=>({description:'unchanged',sources:[]});
    assert.equal(await screen.changeFocus(),false);
    assert.equal(screen.task().committed(),true);
    assert.equal(screen.retry,record);assert.equal(screen.previous.revision,'committed');
    assert.equal(JSON.parse(drafts.get('private-action')).retry.revision,'committed');
    assert.equal(failures[0].diagnostic,'repair unavailable');
    assert.match(failures[0].message,/版本已保存/);
  }finally{globalThis.document=previousDocument;globalThis.localStorage=previousStorage;}
});

test('a source detour is tied to the open Action and its accepted input', async () => {
  const source = {path: 'reference.md', quote: 'Synthetic evidence', fingerprint: 'fingerprint'};
  const screen = Object.create(ActionScreen.prototype);
  const record = {entityId: 'action', revision: 'saved'};
  screen.previous = record;
  screen.repository = {};
  screen.drawer = {panel: {open: true}};
  screen.sourceControl = () => ({});
  screen.sourcesView = {get: () => [source]};

  let accepted;
  screen.openLinkedNote = async (path, context) => {
    assert.equal(path, 'moved.md');
    accepted = context;
  };
  await screen.openSource('moved.md', 0);
  assert.equal(accepted.action, record);
  assert.throws(() => accepted.verify('Different note'), /移动后的来源已更改/);
  assert.equal(accepted.owns(), true);
  screen.dirty = true;
  assert.equal(accepted.owns(), false);
  screen.dirty = false;
  screen.drawer.panel.open = false;
  assert.equal(accepted.owns(), false);
});
