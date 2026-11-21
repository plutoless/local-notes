import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionScreen} from '../build/web/action-screen.js';

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
