import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

test('native reader IME helper resolves outside the repository working directory without starting a journey', () => {
  const result = spawnSync('python3', [resolve('tests/native-reader-ime.py')], {
    cwd: '/tmp', encoding: 'utf8',
    env: {...process.env, NATIVE_BUILD_ONLY: '1', PROBE_IMPORT_ONLY: '1', EXPECTED_HEAD: ''},
  });
  // Import-only mode still requires an explicitly matching expected head when supplied.
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EXPECTED_HEAD/);
  const cleanEnv = {...process.env, NATIVE_BUILD_ONLY: '1', PROBE_IMPORT_ONLY: '1'};
  delete cleanEnv.EXPECTED_HEAD;
  const imported = spawnSync('python3', [resolve('tests/native-reader-ime.py')], {cwd:'/tmp', encoding:'utf8', env:cleanEnv});
  assert.equal(imported.status, 0, imported.stderr);
  assert.match(imported.stdout, /PASS helper import only; no build, host or input/);
});
