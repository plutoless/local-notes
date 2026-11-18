#!/usr/bin/env python3
"""Real isolated Cocoa/WKWebView search with OS keyboard and clipboard readback."""
import hashlib, importlib.util, json, os, shutil, subprocess, time, sys
sys.dont_write_bytecode = True
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = Path(os.environ.get('SEARCH_NATIVE_OUT', 'build/issue60-native')).resolve(); m.APP = m.OUT/'Search60.app'
m.OUT.mkdir(parents=True, exist_ok=True)
for name in ['Sync','Private']:
 if (m.OUT/name).exists(): shutil.rmtree(m.OUT/name)
 (m.OUT/name).mkdir()
(m.OUT/'result.json').unlink(missing_ok=True)
original = '# Native search 中文\n\n- latency 延迟 alpha\n| metric | value |\n| p99 | 20 |\n[link](https://example.com)'
(m.OUT/'Sync/source.md').write_text(original)
for i in range(372): (m.OUT/f'Sync/corpus-{i:04}.md').write_text('# Controlled corpus\n' + 'background indexing material\n'*150)
m.build()
p = m.OUT/'main.swift'; p.write_text(p.read_text().replace('let wrapped =', '''if script == "__focus" { self?.window.makeKeyAndOrderFront(nil); self?.window.makeFirstResponder(self?.web); NSApp.activate(ignoringOtherApps:true); try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return }
if script == "__narrow" { self?.window.setContentSize(NSSize(width:393,height:760)); try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return }
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
 names={40:'K',36:'Return',53:'Escape',48:'Tab',8:'C'}
 chord=('CmdOrCtrl+' if 'command' in modifiers else 'Shift+' if 'shift' in modifiers else '')+names[code]
 command='hotkey' if modifiers else 'press-key'
 result=subprocess.run(['orca','computer',command,'--app',f'pid:{process.pid}','--key',chord,'--no-screenshot','--json'],capture_output=True,text=True)
 assert result.returncode == 0, result.stdout + result.stderr
 receipt=json.loads(result.stdout)
 assert receipt.get('ok',True),receipt
 log.append({'nativeKey':chord,'delivery':receipt})
try:
 w("!!document.querySelector('.home-tools')")
 c("__focus")
 c("window.nativeKeys=[];document.addEventListener('keydown', e=>window.nativeKeys.push({key:e.key,meta:e.metaKey,target:e.target.id}),true)")
 c("document.querySelector('#global-search-open').focus()")
 key(40,' using command down');w("document.querySelector('#global-search').open && document.activeElement.id==='global-search-input'")
 key(53);w("!document.querySelector('#global-search').open");key(40,' using command down');w("document.activeElement.id==='global-search-input'")
 c("const n=document.querySelector('#global-search-input');n.value='latency';n.dispatchEvent(new Event('input'))")
 w("document.querySelectorAll('.search-result').length===1 && !document.querySelector('#global-search [role=status]').textContent.includes('更新')")
 key(40,' using command down');w("document.activeElement.id==='global-search-input' && document.activeElement.value==='latency'")
 key(36);time.sleep(.2);key(36,' using command down');w("document.querySelector('#global-search [role=status]').textContent==='已复制片段'")
 clipboard=subprocess.check_output(['pbpaste']).decode();assert clipboard==c("return document.querySelector('.search-passage').textContent");assert clipboard in original
 log.append({'OSClipboard':clipboard})
 c("const n=document.querySelector('.search-passage');const range=document.createRange();range.selectNodeContents(n);const selection=getSelection();selection.removeAllRanges();selection.addRange(range)")
 key(8,' using command down');time.sleep(.2);assert subprocess.check_output(['pbpaste']).decode()==clipboard
 log.append({'manualNativeSelectionCopy':True})
 c("document.querySelector('.search-attribution input').click();document.querySelector('#global-search-input').focus()")
 key(36,' using command down');time.sleep(.3);assert subprocess.check_output(['pbpaste']).decode().endswith('Native search 中文\nsource.md')
 c("document.querySelector('.search-attribution input').checked=false")
 c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');const {InitiativeRepository}=await import('./initiatives.js');const a=new ActionRepository(native),i=new InitiativeRepository(native);await a.open();await i.open();await a.save({description:'latency native action',waitingOn:'latency waiting'});await i.save({status:'active', description:'Stored initiative', title:'latency native initiative',goal:'latency native goal',progress:'latency native progress'})")
 c("[...document.querySelectorAll('#global-search button')].find(n=>n.textContent==='刷新索引').click()")
 w("document.querySelectorAll('.search-result').length===6 && document.querySelector('#global-search [role=status]').textContent.startsWith('本页')")
 for scope,count in [('note',1),('initiative',3),('action',2),('all',6)]:
  c(f"document.querySelector('[data-scope={scope}]').focus()")
  key(36)
  w(f"document.querySelectorAll('.search-result').length==={count} && document.querySelector('#global-search [role=status]').textContent.startsWith('本页')")
  c("document.querySelector('#global-search-input').focus()")
  key(36);time.sleep(.2);key(36,' using command down')
  w("document.querySelector('#global-search [role=status]').textContent==='已复制片段'")
  assert subprocess.check_output(['pbpaste']).decode()==c("return document.querySelector('.search-select[aria-current=true]').parentElement.querySelector('pre').textContent")
 for scope,label in [('note','打开原文'),('initiative','打开事项'),('action','打开行动')]:
  c(f"document.querySelector('[data-scope={scope}]').click()")
  w("document.querySelector('#global-search [role=status]').textContent.startsWith('本页')")
  c(f"[...document.querySelectorAll('#global-search button')].find(n=>n.textContent==='{label}').focus()")
  key(36)
  w("!document.querySelector('#global-search').open && [...document.querySelectorAll('.search-return')].some(n=>!n.hidden && n.getClientRects().length)")
  if scope=='note': w("!!document.querySelector('#reading [aria-label=\"搜索匹配原文\"] mark') && !document.querySelector('#reading').hidden")
  c("[...document.querySelectorAll('.search-return')].find(n=>!n.hidden && n.getClientRects().length).focus()")
  key(36)
  w("document.querySelector('#global-search').open && document.querySelector('#global-search-input').value==='latency'")
  w(f"document.activeElement.textContent==='{label}'")
 c("[...document.querySelectorAll('#global-search button')].at(-1).focus()")
 key(48);w("document.activeElement.id==='global-search-input'")
 key(48,' using shift down');w("document.activeElement===[...document.querySelectorAll('#global-search button')].at(-1)")
 key(53);w("!document.querySelector('#global-search').open && document.activeElement.id==='global-search-open'")
 c("__narrow");key(40,' using command down');w("innerWidth===393 && document.querySelector('#global-search').open")
 assert c("return document.querySelector('#global-search').getBoundingClientRect().width<=innerWidth")
 w("document.querySelector('#global-search [role=status]').textContent.startsWith('本页')")
 c("document.querySelector('[data-scope=note]').click()")
 w("document.querySelector('#global-search [role=status]').textContent.startsWith('本页')")
 c("[...document.querySelectorAll('#global-search button')].find(n=>n.textContent==='打开原文').focus()")
 key(36);w("!document.querySelector('#reading').hidden && !document.querySelector('#global-search').open")
 c("[...document.querySelectorAll('.search-return')].find(n=>!n.hidden && n.getClientRects().length).focus()")
 key(36);w("document.querySelector('#global-search').open && document.activeElement.textContent==='打开原文'")
 c("document.querySelector('#global-search').scrollTop=0")
 c('__snapshot');key(53)
 (m.OUT/'result.json').write_text(json.dumps({'passed':True,'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'checks':log},ensure_ascii=False,indent=2))
 print('PASS native note/initiative/action open-return, retained search focus;  Command+K/repeat, Enter/context, Command+Enter, OS clipboard, Tab cycles, Escape/opener, 393px')
finally:
 (m.OUT/'transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
 process.terminate();process.wait(timeout=10)
