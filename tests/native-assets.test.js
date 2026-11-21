import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';

test('generated resource manifest exactly inventories shipped modules and nested compiled assets', async () => {
  const manifest=JSON.parse(await readFile('build/web/asset-manifest.json','utf8'));
  for(const name of (await readdir('web')).filter(name=>/\.(js|css|html)$/.test(name))) {
    assert.ok(manifest[name],`${name} is absent from packaged manifest`);
    assert.deepEqual(await readFile(join('build/web',name)),await readFile(join('web',name)));
  }
  const inventory=[];
  async function visit(directory,prefix='') {
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      if(entry.isDirectory())await visit(join(directory,entry.name),prefix+entry.name+'/');
      else if(entry.name!=='asset-manifest.json')inventory.push(prefix+entry.name);
    }
  }
  await visit('build/web');
  assert.deepEqual(Object.keys(manifest).sort(),inventory.sort());
  assert.equal(manifest['assets/react-host.js'],'text/javascript');
  assert.equal(manifest['assets/react-host.css'],'text/css');
  assert.equal(manifest['asset-manifest.json'],undefined);
});
