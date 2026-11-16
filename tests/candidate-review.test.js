import test from 'node:test';
import assert from 'node:assert/strict';
import {CandidateRepository, CandidateReview, Organization, batchesFor, validateResponse, validateCandidate} from '../web/organization.js';
import {allRecords, moveReferences} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const text = 'Evidence for a real next step.';
const batch = batchesFor([{path: 'reference.md', text}])[0];
const response = type => JSON.stringify({candidates: [{type, content: `Suggested ${type}`, placement: 'User chooses', reasoning: 'Quoted evidence', relevance: 'Unknown', sources: [{fragmentId: batch.fragmentId, quote: text}]}]});
async function setup() {
 const f = await storageFixture(); let source = text;
 const adapter = (cmd, args) => cmd === 'read' ? (source === null ? Promise.reject(Error('Missing')) : Promise.resolve({text: source})) : cmd === 'aiAnalyze' ? Promise.resolve({text: response('action').replace(batch.fragmentId, JSON.parse(args.messages[1].content).fragmentId)}) : f.adapter(cmd, args);
 const candidates = new CandidateRepository(adapter); await candidates.open();
 const review = new CandidateReview(adapter, candidates); await review.open();
 const candidate = async type => (await candidates.save({...validateResponse(response(type), batch)[0], status: 'suggested'})).record;
 return {f, adapter, candidates, review, candidate, source(value) {source = value;}};
}
test('individual edited decisions, initiative separation, later state, reference, links, progress and topics', async () => {
 const s = await setup(); try {
 const initiative = await s.candidate('initiative'); await s.review.decide(initiative, 'later', {description: 'Edited undertaking'});
 const target = (await allRecords(s.review.targets.initiative))[0]; assert.equal(target.status, 'later'); assert.equal(target.title, 'Edited undertaking'); assert.equal(target.progress, ''); assert.deepEqual(target.sources, []);
 assert.equal((await allRecords(s.review.targets.action)).length, 0);
 const action = await s.candidate('action'); await s.review.decide(action, 'attach', {targetId: target.entityId, description: 'Edited next step'});
 const confirmed = (await allRecords(s.review.targets.action))[0]; assert.equal(confirmed.description, 'Edited next step'); assert.equal(confirmed.initiativeId, target.entityId);
 const reference = await s.candidate('action'); await s.review.decide(reference, 'reference', {targetId: target.entityId});
 assert.equal((await allRecords(s.review.targets.action)).length, 1); assert.equal((await allRecords(s.review.targets.initiative))[0].sources[0].role, 'reference');
 await s.review.decide(await s.candidate('progress'), 'confirm', {targetId: target.entityId, description: 'Approved progress'});
 assert.equal((await allRecords(s.review.targets.initiative))[0].progress, 'Approved progress');
 await s.review.decide(await s.candidate('topic'), 'confirm'); assert.equal((await allRecords(s.review.targets.topic)).length, 1);
 for (const type of ['progress', 'relationship']) {
  const hold = await s.review.decide(await s.candidate(type), 'later', {targetId: target.entityId}); assert.equal(hold.review.target, null);
 }
 assert.equal((await allRecords(s.review.targets.initiative))[0].progress, 'Approved progress');
 const held = await s.review.decide(await s.candidate('action'), 'later'); assert.equal(held.review.decision, 'later'); assert.equal(held.review.target, null);
 await s.review.decide(await s.candidate('relationship'), 'confirm', {targetId: target.entityId});
 } finally {await s.f.close();}
});
test('fingerprints block changed, missing and unavailable evidence; ignore and repeated analysis persist after rebuild', async () => {
 const s = await setup(); try {
 const candidate = await s.candidate('action'); s.source('changed'); await assert.rejects(s.review.decide(candidate, 'confirm'), /Source changed/);
 s.source(null); await assert.rejects(s.review.decide(candidate, 'confirm'), /unavailable/);
 await s.review.decide(candidate, 'ignore'); await s.f.removeIndex(); await s.candidates.open(); await s.review.open();
 const org = new Organization(s.adapter, s.candidates); s.source(text); await org.preview(['reference.md']); await org.run();
 assert.equal((await allRecords(s.candidates)).length, 1); const ignored = (await allRecords(s.candidates))[0]; assert.equal(ignored.review.decision, 'ignore'); assert.equal(ignored.review.sourceFingerprints[0].fingerprint, batch.fingerprint); assert.ok(ignored.review.targetFingerprint);
 s.source(text + ' relevant change'); await org.preview(['reference.md']); await org.run(); assert.equal((await allRecords(s.candidates)).length, 2);
 assert.equal((await allRecords(s.review.targets.action)).length, 0);
 } finally {await s.f.close();}
});
test('committed intent survives termination before target, repeated clicks and after-target interruption without duplicates', async () => {
 const s = await setup(); try {
 const candidate = await s.candidate('action');
 s.f.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('revisions/') && JSON.parse(args.text).entityType === 'action');
 await assert.rejects(s.review.decide(candidate, 'confirm'), /Not saved/);
 assert.equal((await allRecords(s.candidates))[0].review.state, 'pending');
 await s.f.removeIndex(); const reopened = new CandidateRepository(s.adapter); await reopened.open(); const review = new CandidateReview(s.adapter, reopened); await review.open(); await review.recover();
 await Promise.all([review.decide(candidate, 'confirm'), review.decide(candidate, 'confirm')]); assert.equal((await allRecords(review.targets.action)).length, 1);
 const second = await s.candidate('action');
 s.f.fail((cmd, args) => cmd === 'actionWrite' && JSON.parse(args.text).review?.state === 'done');
 await assert.rejects(s.review.decide(second, 'confirm'), /Not saved/);
 await s.candidates.open(); await s.review.open(); await s.review.recover(); assert.equal((await allRecords(s.review.targets.action)).length, 2);
 const action = (await allRecords(s.review.targets.action))[0]; await s.review.targets.action.save({...action, status: 'completed'}, action); await s.review.recover(); assert.equal((await allRecords(s.review.targets.action)).find(a => a.entityId === action.entityId).status, 'completed');
 } finally {await s.f.close();}
});
test('two-device review and target disagreements retain branches through rebuild and require conflict resolution', async () => {
 const s = await setup(); try {
 const candidate = await s.candidate('initiative');
 const device = new CandidateRepository(s.adapter); await device.open(); const other = new CandidateReview(s.adapter, device); await other.open();
 await s.review.decide(candidate, 'confirm');
 const committed = (await allRecords(s.candidates))[0];
 // An offline peer commits its own decision based on the same reviewed parent.
 const fork = {...committed, revision: crypto.randomUUID(), parents: [candidate.revision], review: {...committed.review, decision: 'ignore', target: null}};
 await s.adapter('actionWrite', {workspaceId: candidate.workspaceId, path: `revisions/${candidate.entityId}/${fork.revision}.json`, text: JSON.stringify(fork)});
 await s.f.removeIndex(); await device.open(); assert.equal(device.conflicts.get(candidate.entityId).tips.length, 2); await assert.rejects(other.decide(candidate, 'ignore'), /conflict/);
 const repo = s.review.targets.initiative; const target = (await allRecords(repo))[0]; const divergent = {...target, revision: crypto.randomUUID(), parents: [target.revision], progress: 'Peer progress'};
 await repo.save({...target, progress: 'Local progress'}, target); await s.adapter('actionWrite', {workspaceId: target.workspaceId, path: `revisions/${target.entityId}/${divergent.revision}.json`, text: JSON.stringify(divergent)});
 await repo.open(); assert.equal(repo.conflicts.get(target.entityId).tips.length, 2);
 assert.equal((await allRecords(repo)).length, 1);
 } finally {await s.f.close();}
});

test('invalid synchronized approval intents are rejected before replay', async () => {
 const s = await setup(); try {
  const candidate = await s.candidate('action');
  const confirmed = await s.review.decide(candidate, 'confirm');
  assert.throws(() => validateCandidate({...confirmed, review: {...confirmed.review, decision: 'ignore'}}), /Decision/);
  assert.throws(() => validateCandidate({...confirmed, review: {...confirmed.review, sourceFingerprints: [{}]}}), /evidence/);
  assert.throws(() => validateCandidate({...confirmed, review: {...confirmed.review, target: {...confirmed.review.target, entityId: crypto.randomUUID()}}}), /association/);
  const held = await s.review.decide(await s.candidate('progress'), 'later', {description: 'Edited held progress'});
  assert.equal(held.review.suggestion, 'Edited held progress');
  await s.candidates.open(); assert.equal((await allRecords(s.candidates)).find(c => c.entityId === held.entityId).review.suggestion, 'Edited held progress');
 } finally {await s.f.close();}
});

test('rename and repeated analysis recognize a processed candidate by content fingerprints', async () => {
 const s = await setup(); try {
  const candidate = await s.candidate('action'); await s.review.decide(candidate, 'ignore');
  await moveReferences([s.candidates], 'reference.md', 'renamed.md');
  const adapter = (cmd, args) => cmd === 'aiAnalyze' ? Promise.resolve({text: response('action').replace(batch.fragmentId, JSON.parse(args.messages[1].content).fragmentId)}) : s.adapter(cmd, args);
  const org = new Organization(adapter, s.candidates); await org.preview(['renamed.md']); await org.run();
  assert.equal((await allRecords(s.candidates)).length, 1);
 } finally {await s.f.close();}
});
