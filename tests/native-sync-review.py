#!/usr/bin/env python3
"""Issue 36 isolated WKWebView interaction using the existing test-only probe."""
import importlib.util
from pathlib import Path
import subprocess, os, shutil
spec=importlib.util.spec_from_file_location('probe','tests/native-candidate-review.py'); m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.OUT=Path.cwd()/('build/native-issue36-'+os.environ.get('PHASE','after'));m.APP=m.OUT/'Sync36.app'
# Reuse the existing test-only native command probe, with a distinct identity.
import inspect
build=inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue36')
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
root=m.OUT/'Sync'
evidence=Path('docs/validation/issue36');evidence.mkdir(parents=True,exist_ok=True)
def launch():
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(root),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','a'),stderr=subprocess.STDOUT)
 w("!!document.querySelector('nav .active')")
 return process
process=launch()
try:
 c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');const r=new ActionRepository(native);await r.open();const b=(await r.save({description:'核对冲突样本',focusPosition:1})).record;await r.save({...b,description:'左侧分支'},b);const right={...b,revision:crypto.randomUUID(),parents:[b.revision],description:'右侧分支'};await r.request('actionWrite',{path:`revisions/${b.entityId}/${right.revision}.json`,text:JSON.stringify(right)});window.sampleId=b.entityId")
 c("document.querySelector('nav [data-view=actions]').click()")
 w("!document.querySelector('#action-tools').hidden")
 c("document.querySelector('#action-new').click()")
 w("!document.querySelector('#action-editor').hidden")
 c("const n=document.querySelector('#action-description');n.value='原任务未保存草稿';n.dispatchEvent(new Event('input',{bubbles:true}));const opener=[...document.querySelectorAll('nav button')].find(n=>n.textContent==='同步检查');opener.focus();opener.click()")
 w("!!document.querySelector('.sync-panel article') && document.querySelector('.sync-panel').getAttribute('aria-busy')==='false'")
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/(os.environ.get('PHASE','after')+'-native.png'))
 c("[...document.querySelectorAll('.sync-panel article button')].find(n=>n.textContent.startsWith('选择版本')).click();const n=document.querySelector('.sync-editor textarea');n.value='人工合并本地版本';n.dispatchEvent(new Event('input'))")
 data=root/'LocalNotesData'; moved=m.OUT/'HeldData';data.rename(moved);data.write_text('blocked directory')
 c("[...document.querySelectorAll('.sync-panel article button')].find(n=>n.textContent.startsWith('3.')).click()")
 w("document.querySelector('.sync-panel').textContent.includes('解决结果未保存')")
 assert c("return document.querySelector('.sync-editor textarea').value==='人工合并本地版本' && window.hasUnsavedChanges()")
 data.unlink();moved.rename(data)
 c("[...document.querySelectorAll('.sync-panel article button')].find(n=>n.textContent.startsWith('3.')).click()")
 w("document.querySelector('.sync-panel').textContent.includes('现有版本中未发现待处理冲突')")
 c("[...document.querySelectorAll('.sync-panel button')].find(n=>n.textContent==='关闭检查').click()")
 assert c("return document.querySelector('#action-description').value==='原任务未保存草稿'")
 restored=c("return document.activeElement.textContent==='同步检查'")
 if os.environ.get('PHASE')!='before': assert restored
 result=c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');const r=new ActionRepository(native);await r.open();return {record:(await r.query({entityId:window.sampleId})).actions[0],history:await r.history(window.sampleId)}")
 assert result['record']['description']=='人工合并本地版本' and len(result['record']['parents'])==2 and len(result['history'])==4
 process.terminate();process.wait(timeout=10);process=launch()
 assert c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');const r=new ActionRepository(native);await r.open();return (await r.query()).actions.some(n=>n.description==='人工合并本地版本')")
 assert (root/'reference.md').read_text()=='# 示例来源\n\n隔离测试引用原文。\n'
 import json,hashlib
 report={'host':'Cocoa/WKWebView','identity':'dev.localnotes.validation.issue36','failureRetry':True,'focusRestored':restored,'restartReadback':True,'draftContextRetained':True,'historyCount':4,'parents':2,'inputMethod':'DOM events through test-only evaluateJavaScript probe; no physical input','resourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (m.APP/'Contents/Resources/web').iterdir() if p.is_file()}}
 (evidence/(os.environ.get('PHASE','after')+'-native.json')).write_text(json.dumps(report,indent=2)+'\n')
 print('PASS issue36 actual WKWebView: compare/edit, failed save, retained task and resolution, retry, multi-parent history, restart readback')
finally:
 process.terminate();process.wait(timeout=10)
