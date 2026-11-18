#!/usr/bin/env python3
"""Real isolated Cocoa/WKWebView search with OS keyboard and clipboard readback."""
import hashlib, importlib.util, json, os, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = Path('build/issue58-native').resolve(); m.APP = m.OUT/'Search58.app'
m.OUT.mkdir(parents=True, exist_ok=True)
for name in ['Sync','Private']: (m.OUT/name).mkdir(exist_ok=True)
original = '# Native search 中文\n\n- latency 延迟 alpha\n| metric | value |\n| p99 | 20 |\n[link](https://example.com)'
(m.OUT/'Sync/source.md').write_text(original)
m.build()
p = m.OUT/'main.swift'; p.write_text(p.read_text().replace('let wrapped =', '''if script == "__narrow" { self?.window.setContentSize(NSSize(width:393,height:760)); try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return }
if script == "__snapshot" { self?.web.takeSnapshot(with:nil) { image,_ in
 if let tiff=image?.tiffRepresentation, let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) {try? png.write(to:reviewProbe.directory.appendingPathComponent("native.png"))}
 try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")) }; return }
let wrapped ='''))
subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(p),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(m.APP/'Contents/MacOS/LocalNotes')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
(m.OUT/'source-hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').glob('*') if p.is_file()},indent=2))
process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','w'),stderr=subprocess.STDOUT)
log=[]
def c(script):
 value=m.command(script);log.append({'script':script,'value':value});return value
def w(expression):
 m.wait(expression);log.append({'assertion':expression,'passed':True})
def key(code,modifiers=''):
 subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true','-e',f'tell application "System Events" to key code {code}'+modifiers],check=True)
 log.append({'OSKeyCode':code,'modifiers':modifiers})
try:
 w("!!document.querySelector('.home-tools')")
 c("document.querySelector('#global-search-open').focus()")
 key(40,' using command down');w("document.querySelector('#global-search').open && document.activeElement.id==='global-search-input'")
 c("const n=document.querySelector('#global-search-input');n.value='latency';n.dispatchEvent(new Event('input'))")
 w("document.querySelectorAll('.search-result').length===1 && !document.querySelector('#global-search [role=status]').textContent.includes('更新')")
 key(40,' using command down');w("document.activeElement.id==='global-search-input' && document.activeElement.value==='latency'")
 key(36);time.sleep(.2);key(36,' using command down');w("document.querySelector('#global-search [role=status]').textContent==='已复制片段'")
 clipboard=subprocess.check_output(['pbpaste']).decode();assert clipboard==c("return document.querySelector('.search-passage').textContent");assert clipboard in original
 log.append({'OSClipboard':clipboard})
 c("document.querySelector('.search-attribution input').click();document.querySelector('#global-search-input').focus()")
 key(36,' using command down');time.sleep(.3);assert subprocess.check_output(['pbpaste']).decode().endswith('Native search 中文\nsource.md')
 c("[...document.querySelectorAll('#global-search button')].at(-1).focus()")
 key(48);w("document.activeElement.id==='global-search-input'")
 key(48,' using shift down');w("document.activeElement===[...document.querySelectorAll('#global-search button')].at(-1)")
 key(53);w("!document.querySelector('#global-search').open && document.activeElement.id==='global-search-open'")
 c("__narrow");key(40,' using command down');w("innerWidth===393 && document.querySelector('#global-search').open")
 assert c("return document.querySelector('#global-search').getBoundingClientRect().width<=innerWidth")
 c('__snapshot');key(53)
 (m.OUT/'result.json').write_text(json.dumps({'passed':True,'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'checks':log},ensure_ascii=False,indent=2))
 print('PASS native Command+K/repeat, Enter/context, Command+Enter, OS clipboard, Tab cycles, Escape/opener, 393px')
finally:
 (m.OUT/'transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
 process.terminate();process.wait(timeout=10)
