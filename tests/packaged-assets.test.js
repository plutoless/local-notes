import test from 'node:test';
import assert from 'node:assert/strict';
import {assetPath, mimeFor} from '../scripts/asset-policy.mjs';
test('packaged resource policy preserves nested assets and rejects ambiguous or private paths', () => {
  for (const path of ['index.html','assets/library-123.js','assets/type.woff2']) assert.equal(assetPath(path),path);
  for (const path of ['', '/index.html','../app.js','assets/../app.js','assets//app.js','assets/%2e%2e/app.js','assets\\app.js','LocalNotesData/a.json','.hidden','assets/.hidden','a.js?x','a.js#x']) assert.throws(()=>assetPath(path));
  assert.equal(mimeFor('assets/a.js'),'text/javascript');
  assert.equal(mimeFor('assets/a.css'),'text/css');
  assert.throws(()=>mimeFor('private.md'));
});
