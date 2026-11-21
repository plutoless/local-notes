import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
test('real Mac Assets resource contract serves nested MIME and fails closed on private or ambiguous URLs', {skip:process.platform!=='darwin'}, async()=>{
  const source=await readFile('mac/main.swift','utf8');
  const policy=source.slice(source.indexOf('final class Assets:'),source.indexOf('func failure('));
  await mkdir('build/asset-policy',{recursive:true});
  await writeFile('build/asset-policy/main.swift',`import Cocoa\nimport WebKit\n${policy}\n`+String.raw`
let fm=FileManager.default
let temporary=fm.temporaryDirectory.appendingPathComponent(UUID().uuidString)
try fm.createDirectory(at:temporary.appendingPathComponent("assets"),withIntermediateDirectories:true)
defer { try? fm.removeItem(at:temporary) }
try Data("nested module".utf8).write(to:temporary.appendingPathComponent("assets/chunk.js"))
try Data("body{}".utf8).write(to:temporary.appendingPathComponent("assets/main.css"))
try Data("private source".utf8).write(to:temporary.appendingPathComponent("workspace.md"))
try fm.createSymbolicLink(at:temporary.appendingPathComponent("assets/link.js"),withDestinationURL:temporary.appendingPathComponent("workspace.md"))
try JSONSerialization.data(withJSONObject:["assets/chunk.js":"text/javascript","assets/main.css":"text/css","assets/link.js":"text/javascript","workspace.md":"text/markdown"]).write(to:temporary.appendingPathComponent("asset-manifest.json"))
let assets=Assets(temporary)
precondition(assets.resource(URL(string:"notes://local/assets/chunk.js")!)?.1 == "text/javascript")
precondition(assets.resource(URL(string:"notes://local/assets/main.css")!)?.1 == "text/css")
for denied in ["notes://other/assets/chunk.js","https://local/assets/chunk.js","notes://user@local/assets/chunk.js","notes://local:80/assets/chunk.js","notes://local/assets/chunk.js?q=1","notes://local/assets/chunk.js#f","notes://local/assets/%2e%2e/workspace.md","notes://local/assets/%63hunk.js","notes://local/assets//chunk.js","notes://local/assets/link.js","notes://local/workspace.md","notes://local/LocalNotesData/workspace.json","notes://local/asset-manifest.json","notes://local/unknown.js"] {
 precondition(assets.resource(URL(string:denied)!) == nil,denied)
}
precondition(Assets(temporary.appendingPathComponent("missing")).resource(URL(string:"notes://local/assets/chunk.js")!) == nil)
print("PASS nested resources, MIME, host/scheme/authority/query/fragment/encoding/traversal/symlink/workspace/manifest denial and missing manifest")
`);
  execFileSync('swiftc',['-module-cache-path','build/swift-cache','build/asset-policy/main.swift','-framework','Cocoa','-framework','WebKit','-o','build/asset-policy/check']);
  assert.match(execFileSync('build/asset-policy/check',{encoding:'utf8'}),/^PASS/);
});
