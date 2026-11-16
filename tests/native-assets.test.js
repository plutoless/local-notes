import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';

test('both native asset allowlists include every shipped JavaScript module', async () => {
  const modules = (await readdir('web')).filter(name => name.endsWith('.js'));
  for (const path of ['mac/main.swift', 'android/src/dev/localnotes/MainActivity.java']) {
    const source = await readFile(path, 'utf8');
    for (const name of modules) assert.ok(source.includes(`"${name}"`), `${path} does not serve ${name}`);
  }
});
