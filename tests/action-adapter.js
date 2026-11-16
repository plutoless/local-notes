import {mkdtemp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
let compiled = false;
export async function storageFixture() {
  if (!compiled) {
    await mkdir('build', {recursive: true});
    execFileSync('swiftc', ['-module-cache-path', 'build/swift-cache', 'tests/StorageHarness.swift', 'mac/ActionStorage.swift', 'mac/ActionIndex.swift', 'mac/ReferenceIndex.swift', '-lsqlite3', '-o', 'build/storage-harness']); compiled = true;
  }
  const directory = await mkdtemp(join(tmpdir(), 'localnotes-actions-'));
  const root = join(directory, 'Sync'), privateRoot = join(directory, 'Private');
  await mkdir(root); await mkdir(privateRoot);
  await writeFile(join(root, 'reference.md'), await readFile('tests/fixtures/reference.md'));
  const child = spawn('build/storage-harness', [root, privateRoot]);
  const pending = []; const calls = []; const failures = [];
  createInterface({input: child.stdout}).on('line', line => {
    const {resolve, reject} = pending.shift();
    const result = JSON.parse(line); result.error ? reject(Error(result.error)) : resolve(result);
  });
  child.stderr.on('data', data => process.stderr.write(data));
  const adapter = async (cmd, args = {}) => {
    calls.push({cmd, ...args});
    const failure = failures.find(item => item.matches(cmd, args));
    if (failure) { failure.remaining--; if (!failure.remaining) failures.splice(failures.indexOf(failure), 1); throw Error('Injected storage failure'); }
    return new Promise((resolve, reject) => { pending.push({resolve, reject}); child.stdin.write(JSON.stringify({cmd, ...args}) + '\n'); });
  };
  return {root, privateRoot, adapter, calls,
    fail(matches, remaining = 1) { failures.push({matches, remaining}); },
    async removeIndex() { for (const name of await readdir(join(privateRoot, 'Workspaces'))) await rm(join(privateRoot, 'Workspaces', name), {recursive: true}); },
    async close() { child.stdin.end(); await new Promise(resolve => child.once('exit', resolve)); await rm(directory, {recursive: true}); }
  };
}
