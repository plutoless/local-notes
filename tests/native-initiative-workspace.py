#!/usr/bin/env python3
"""Issue 33 isolated WKWebView interaction using the existing test-only probe."""
import importlib.util
from pathlib import Path
Path('docs/validation/issue33').mkdir(parents=True, exist_ok=True)
import subprocess, os, shutil
spec=importlib.util.spec_from_file_location('probe','tests/native-candidate-review.py'); m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.OUT=Path.cwd()/'build/native-issue33';m.APP=m.OUT/'Initiatives33.app'
# Reuse the existing test-only native command probe, with a distinct identity.
import inspect
build=inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue33')
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
try:
 w("!!document.querySelector('nav .active')")
 c("document.querySelector('nav [data-view=initiatives]').click()")
 w("!document.querySelector('#initiative-tools').hidden")
 c("document.querySelector('#initiative-new').click()")
 w("!document.querySelector('#initiative-editor').hidden")
 c("const f=(id,v)=>{const n=document.querySelector(id);n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}))};f('#initiative-title','发布验证事项');f('#initiative-goal','确认行动与来源上下文');f('#initiative-progress','正在隔离验证');document.querySelector('#initiative-form').requestSubmit()")
 w("document.querySelector('#initiative-save-state').textContent==='已保存到本地'")
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue33')/(os.environ.get('PHASE','after')+'-native.png'))
 # Create assigned action, save and return, then exercise a real filesystem failure.
 c("document.querySelector('#initiative-new-action').click()")
 w("!document.querySelector('#action-editor').hidden")
 c("const n=document.querySelector('#action-description');n.value='核对隔离样本';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#action-form').requestSubmit()")
 w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
 c("document.querySelector('#action-open-initiative').click()")
 w("!document.querySelector('#initiative-editor').hidden && !document.querySelector('#initiative-form').inert")
 # Rename only the isolated synchronized tree; native writes must fail and retain draft.
 data=m.OUT/'Sync/LocalNotesData'; moved=m.OUT/'HeldData';data.rename(moved);data.write_text('blocked directory')
 c("const n=document.querySelector('#initiative-progress');n.value='失败后重试保留进展';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#initiative-form').requestSubmit()")
 w("document.querySelector('#initiative-save-state').textContent.includes('未保存的编辑仍保留')")
 assert c("return document.querySelector('#initiative-progress').value")=='失败后重试保留进展'
 data.unlink();moved.rename(data)
 c("document.querySelector('#initiative-form').requestSubmit()")
 w("document.querySelector('#initiative-save-state').textContent==='已保存到本地'")
 c("document.querySelector('#initiative-status').value='ended';document.querySelector('#initiative-status').dispatchEvent(new Event('change',{bubbles:true}))")
 w("!!document.querySelector('[data-action]')")
 c("const n=document.querySelector('[data-action]');n.value='independent';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#initiative-form').requestSubmit()")
 w("document.querySelector('#initiative-save-state').textContent==='已保存到本地' && document.querySelector('#initiative-status').value==='ended'")
 c("document.querySelector('#initiative-status').value='active';document.querySelector('#initiative-status').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#initiative-form').requestSubmit()")
 w("document.querySelector('#initiative-save-state').textContent==='已保存到本地'")
 process.terminate();process.wait()
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','a'),stderr=subprocess.STDOUT)
 w("!!document.querySelector('nav .active')")
 c("document.querySelector('nav [data-view=initiatives]').click()")
 w("!!document.querySelector('[data-initiative-id]')")
 c("document.querySelector('[data-initiative-id]').click()")
 w("!document.querySelector('#initiative-editor').hidden")
 assert c("return document.querySelector('#initiative-progress').value")=='失败后重试保留进展'
 print('PASS native WKWebView: create/save assigned action, overview return, real filesystem failure/draft retention/retry, end/independent/reopen, process restart/readback')
finally:
 process.terminate();process.wait()
