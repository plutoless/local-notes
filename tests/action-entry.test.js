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
