#!/usr/bin/env python3
"""Issue 37 isolated WKWebView interaction using the existing test-only probe."""
import importlib.util
from pathlib import Path
import subprocess, os, shutil
spec=importlib.util.spec_from_file_location('probe','tests/native-candidate-review.py'); m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.OUT=Path.cwd()/'build/native-issue37';m.APP=m.OUT/'Journeys37.app'
# Reuse the existing test-only native command probe, with a distinct identity.
import inspect
build=inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue37')
exec(build,m.__dict__)
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True,exist_ok=True);(m.OUT/'Sync').mkdir(exist_ok=True);(m.OUT/'Private').mkdir(exist_ok=True)
(m.OUT/'Sync/reference.md').write_text('# 示例来源\n\n隔离测试引用原文。\n')
m.build()
# Native WK snapshot via a test-only command handled by the native probe.
p=m.OUT/'main.swift'; s=p.read_text();s=s.replace('let wrapped =', '''if script == "__snapshot" {
                    self?.web.takeSnapshot(with: nil) { image, error in
                        if let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: reviewProbe.directory.appendingPathComponent("snapshot.png")) }
                        try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
                    }
                    return
                }
                let wrapped =''')
p.write_text(s)
subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(p),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(m.APP/'Contents/MacOS/LocalNotes')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
c=m.command;w=m.wait
process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','a'),stderr=subprocess.STDOUT)
evidence=Path('docs/validation/issue37');evidence.mkdir(parents=True,exist_ok=True)
try:
 w("document.querySelector('#index-state')?.textContent === ''")
 c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');const {InitiativeRepository,fingerprint}=await import('./initiatives.js');const i=new InitiativeRepository(native);await i.open();const item=(await i.save({status:'active',progress:'',title:'跨页事项',goal:'核对返回路径',sources:[{path:'reference.md',quote:'隔离测试引用原文。',fingerprint:fingerprint('# 示例来源\\n\\n隔离测试引用原文。\\n'),role:'reference'}]})).record;const a=new ActionRepository(native);await a.open();await a.save({description:'跨页行动',initiativeId:item.entityId,focusPosition:1})")
 c("document.querySelector('nav [data-view=focus]').click()")
 w("!!document.querySelector('.focus-row-open')")
 c("document.querySelector('.focus-row-open').click()")
 w("!document.querySelector('#action-editor').hidden")
 c("document.querySelector('#action-open-initiative').click()")
 w("!document.querySelector('#initiative-editor').hidden")
 assert c("return document.querySelector('nav [data-view=initiatives]').getAttribute('aria-current')")=='page'
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/'native-initiative.png')
 c("document.querySelector('#workspace-references button').click()")
 w("!document.querySelector('#reading').hidden && !document.querySelector('#editor').hidden")
 c("document.querySelector('#mode').click();const n=document.querySelector('#body');n.value+='\\n跨页保存';n.dispatchEvent(new Event('input'));document.querySelector('#note-save').click()")
 w("document.querySelector('#save-state').textContent==='已保存到本地'")
 assert '跨页保存' in (m.OUT/'Sync/reference.md').read_text()
 c("document.querySelector('#back').click()")
 w("!document.querySelector('#initiative-editor').hidden")
 c("document.querySelector('#workspace-return-action').click()")
 w("!document.querySelector('#action-editor').hidden && document.querySelector('#action-description').value==='跨页行动'")
 assert c("return document.activeElement.id")=='action-open-initiative'
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/'native-return.png')
 import hashlib,json
 (evidence/'native-resources.json').write_text(json.dumps({str(p.relative_to(Path.cwd())):hashlib.sha256(p.read_bytes()).hexdigest() for p in (Path.cwd()/'web').iterdir() if p.is_file()},indent=2))
 print('PASS actual Cocoa/WKWebView: Current Focus/action/initiative/linked note/edit/local save/context/original action; selected navigation and focus verified; isolated native filesystem readback.')
finally:
 process.terminate();process.wait()
