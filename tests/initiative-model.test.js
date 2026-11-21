import test from 'node:test';
import assert from 'node:assert/strict';
import {initiativeSources, initiativeEnding} from '../web/react/initiative-model.js';
test('source groups preserve quotes, duplicate paths, identity and supplied order', () => {
  const sources = Object.freeze([{path:'相同.md',quote:'原文一',role:'reference'}, {path:'工作.md',quote:'- [ ] 只读',role:'working-note'}, {path:'相同.md',quote:'原文二',role:'reference'}].map(Object.freeze));
  assert.deepEqual(initiativeSources(sources,'reference'), [sources[0],sources[2]]);
  assert.deepEqual(initiativeSources(sources,'working-note'), [sources[1]]);
  assert.deepEqual(initiativeSources([],'reference'), []);
});
test('ending projects each unfinished member and only eligible destinations without changing decisions', () => {
  const actions = ['todo','in-progress','waiting','later','completed','canceled'].map((status,index)=>({entityId:String(index),initiativeId:'here',status}));
  actions.push({entityId:'independent',initiativeId:null,status:'todo'}, {entityId:'elsewhere',initiativeId:'other',status:'todo'});
  const decisions = Object.freeze({'0':'completed','2':'move:later','stale':'canceled'});
  const model = initiativeEnding(actions,[{entityId:'here',status:'active'}, {entityId:'later',status:'later'}, {entityId:'active',status:'active'}, {entityId:'ended',status:'ended'}],'here',decisions);
  assert.deepEqual(model.choices.map(({action,value})=>[action.entityId,value]), [['0','completed'],['1',''],['2','move:later'],['3','']]);
  assert.deepEqual(model.targets.map(item=>item.entityId),['later','active']);
  assert.equal(model.choices[0].action,actions[0]);
});
