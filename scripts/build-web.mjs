import {build} from 'vite';
import {readdir, copyFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {assetPath, mimeFor} from './asset-policy.mjs';
await build();
for (const name of await readdir('web')) if (/\.(html|js|css)$/.test(name)) await copyFile(join('web', name), join('build/web', name));
const manifest = {};
async function visit(directory, prefix = '') {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const path = assetPath(prefix + entry.name);
    if (entry.isSymbolicLink()) throw Error('Packaged symlinks are forbidden');
    if (entry.isDirectory()) await visit(join(directory, entry.name), path + '/');
    else manifest[path] = mimeFor(path);
  }
}
await visit('build/web');
await writeFile('build/web/asset-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
