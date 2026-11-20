#!/usr/bin/env python3
"""Issue 84: isolated production UI/bridge/storage and owned-window OS input.

The issue81 host constructors/route recorder and external sender are reused.
DOM calls inspect/setup only; all claimed journey input is posted through the OS.
Requires a coordinator GUI lease. Restores every original clipboard type/item.
"""
import sys
sys.dont_write_bytecode=True
import ast, hashlib, importlib.util, inspect, json, os, shutil, subprocess, time, uuid
from pathlib import Path
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('native-candidate-review.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.OUT=Path('build/issue84-native').resolve();m.APP=m.OUT/'Search84.app';m.OUT.mkdir(parents=True,exist_ok=True)
for name in ['Sync','Private']:
 if (m.OUT/name).exists():shutil.rmtree(m.OUT/name)
 (m.OUT/name).mkdir()
original='# latency 核对完整中文来源与下一步行动\n\nlatency 延迟证据。\n'+'原始资料保持完整。\n'*40
(m.OUT/'Sync/source.md').write_text(original)
# Read literal test-host extensions only, without running the browse journey.
tree=ast.parse(Path('tests/native-browse-focus.py').read_text())
for node in tree.body:
 if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ['EXTRA','ROUTE_RECORDER'] for t in node.targets):
  m.__dict__[node.targets[0].id]=ast.literal_eval(node.value)
extra=m.EXTRA.replace('"firstResponderIsWeb":self?.window.firstResponder === self?.web', '"firstResponderIsWeb":self?.window.firstResponder === self?.web,"firstResponderInWeb":self.map { owner in (owner.window.firstResponder as? NSView)?.isDescendant(of:owner.web) ?? false } ?? false')
extra=extra.replace('"CmdOrCtrl+A":0][key]', '"CmdOrCtrl+A":0,"CmdOrCtrl+K":40,"CmdOrCtrl+Return":36,"ArrowDown":125][key]')
extra=extra.replace('"CmdOrCtrl+A":"a"][key]', '"CmdOrCtrl+A":"a","CmdOrCtrl+K":"k","CmdOrCtrl+Return":"\\r","ArrowDown":"\\u{f701}"][key]')
extra=extra.replace('key == "CmdOrCtrl+A" ? .command', 'key.hasPrefix("CmdOrCtrl+") ? .command')
m.EXTRA=extra
source=inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue84'+uuid.uuid4().hex[:8])
source=source.replace("generated=OUT/'main.swift';generated.write_text(source)","generated=OUT/'main.swift';generated.write_text(source.replace('let wrapped =', EXTRA+'let wrapped =').replace('let reviewProbe = ReviewProbe()', ROUTE_RECORDER+'\\nlet reviewProbe = ReviewProbe()'))")
# Inspection must remain available while AppKit's correction panel tracks input.
# This changes only the test channel, never production input behavior/preferences.
source=source.replace("generated=OUT/", "source=source.replace('Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true)', 'let inspectionTimer = Timer(timeInterval: 0.05, repeats: true)').replace('self?.web.evaluateJavaScript(wrapped, completionHandler: nil)\\n            }\\n        }', 'self?.web.evaluateJavaScript(wrapped, completionHandler: nil)\\n            }\\n        }\\n        RunLoop.main.add(inspectionTimer, forMode: .common)');generated=OUT/")
exec(source,m.__dict__);m.build()
sender=m.OUT/'native-browse-input'
sender_source=m.OUT/'native-browse-input.swift'
sender_source.write_text(Path('tests/native-browse-input.swift').read_text().replace('["ok": false, "error": "Owned active recipient or sender capability unavailable"]', '["ok": false, "error": "Owned active recipient or sender capability unavailable","recipientPID":pid,"recipientActive":NSRunningApplication(processIdentifier:pid)?.isActive ?? false,"frontmostPID":NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1,"window":window,"windows":CGWindowListCopyWindowInfo(.optionIncludingWindow,CGWindowID(window)) ?? [] as CFArray]'))
subprocess.run(['swiftc',str(sender_source),'-o',str(sender)],check=True)
if os.environ.get('NATIVE_BUILD_ONLY'):
 print('PASS build only; no app activation or input');raise SystemExit(0)
# Preserve binary pasteboard representations, including non-text items.
clipboard=m.OUT/'Clipboard.swift';clipboard.write_text('''import Cocoa
let p=NSPasteboard.general
let saved=p.pasteboardItems?.map { item in item.types.compactMap { type -> [String:String]? in guard let data=item.data(forType:type) else{return nil};return ["type":type.rawValue,"data":data.base64EncodedString()] } } ?? []
let file=URL(fileURLWithPath:CommandLine.arguments[2])
if CommandLine.arguments[1]=="save" { try! JSONSerialization.data(withJSONObject:saved).write(to:file) }
else { let items=try! JSONSerialization.jsonObject(with:Data(contentsOf:file)) as! [[[String:String]]];p.clearContents();p.writeObjects(items.map { fields in let item=NSPasteboardItem();for field in fields {item.setData(Data(base64Encoded:field["data"]!)!,forType:NSPasteboard.PasteboardType(field["type"]!))};return item }) }
''')
subprocess.run(['swiftc',str(clipboard),'-o',str(m.OUT/'clipboard')],check=True)
clip=[str(m.OUT/'clipboard')];backup=str(m.OUT/'clipboard.json');subprocess.run(clip+['save',backup],check=True)
input_source=m.OUT/'input-source'
subprocess.run(['swiftc','tests/InputSourceHarness.swift','-o',str(input_source)],check=True)
initial_source=subprocess.check_output([str(input_source)],text=True).splitlines()[0]
log=[];process=None;passed=False
w=m.wait
def c(script):
 try:return m.command(script)
 except BaseException:
  if process:subprocess.run(['sample',str(process.pid),'1','1','-file',str(m.OUT/'timeout-sample.txt')],capture_output=True)
  raise

def key(name): post({'key':name})
def click(selector):
 point=c('const n=document.querySelector('+json.dumps(selector)+');n.scrollIntoView({block:"nearest"});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}')
 native=c('__point:'+str(point['x'])+','+str(point['y']))
 post({'action':'click','x':native['windowX'],'y':native['windowY']},selector)
def post(request,selector=None):
 c('__focus')
 subprocess.run(['osascript','-e',f'tell application \"System Events\" to tell (first application process whose unix id is {process.pid}) to set frontmost to true'],check=True)
 time.sleep(.2)
 host=c('__host');assert host['active'] and host['key'] and (host['firstResponderIsWeb'] or host['firstResponderInWeb']) and host['visible'] and not host['occluded'],host
 before=c('__route');index=c('return inputEvents.length');c('window.expectedPointer='+json.dumps(selector))
 payload=c('__events:'+json.dumps(request));assert len(payload['events'])==2
 result=subprocess.run([str(sender),str(process.pid),str(host['windowNumber']),'post'],input=json.dumps(payload),text=True,capture_output=True)
 time.sleep(.15);events=c('return inputEvents.slice('+str(index)+')');after=c('__route')
 receipt={'request':request,'selector':selector,'host':host,'sender':result.stdout,'events':events,'cocoa':after['cocoa'][len(before['cocoa']):],'quartz':after['quartz'][len(before['quartz']):]};log.append(receipt)
 assert result.returncode==0 and any(e['trusted'] for e in events),receipt
 assert receipt['cocoa'] and all(e['window']==host['windowNumber'] for e in receipt['cocoa']),receipt
 sender_receipt=json.loads(result.stdout)
 assert all(any(e['type']==t and e['marker']==810053 and e['sourcePID']==sender_receipt['senderPID'] for e in receipt['quartz']) for t in ([1,2] if selector else [10,11])),receipt
 if selector:assert any(e['type']=='click' and e.get('matchesExpectedPointer') for e in events),receipt
 else:assert any(e['type']=='keydown' and e['key']=={'Return':'Enter','CmdOrCtrl+Return':'Enter','CmdOrCtrl+K':'k'}.get(request['key'],request['key']) for e in events),receipt

def state(name):
 log.append({'state':name,'value':c("const a=document.activeElement;return {active:a.id||a.className,focus:a.matches(':focus-visible'),outline:getComputedStyle(a).outline,query:document.querySelector('#global-search-input').value,selected:document.querySelector('.search-select[aria-current=true]')?.textContent}")})
 c('__snapshot');shutil.copy(m.OUT/'native.png',m.OUT/(name+'.png'))
try:
 subprocess.run([str(input_source),'com.apple.keylayout.ABC'],check=True)
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','w'),stderr=subprocess.STDOUT)
 w("!!document.querySelector('.home-tools')");c('__focus');time.sleep(.3)
 c("window.inputEvents=[];for(const type of ['pointerdown','click','keydown','input'])document.addEventListener(type,e=>inputEvents.push({type:e.type,key:e.key,trusted:e.isTrusted,matchesExpectedPointer:!!window.expectedPointer&&e.target.matches(window.expectedPointer),target:e.target.id?'#'+e.target.id:e.target.className}),true)")
 click('#global-search-open');w("document.activeElement.id==='global-search-input'");state('pointer-open')
 key('CmdOrCtrl+K');w("document.activeElement.id==='global-search-input'")
 typing_start=c('return inputEvents.length');assert c("return document.hasFocus() && document.activeElement.id==='global-search-input'")
 # OS typing uses the native input system (not a JS value assignment).
 subprocess.run(['osascript','-e',f'tell application \"System Events\" to tell (first application process whose unix id is {process.pid}) to set frontmost to true','-e','tell application \"System Events\" to keystroke \"latency\"','-e','tell application \"System Events\" to key code 48'],check=True)
 log.append({'OSTyping':'latency','targetPID':process.pid,'events':c('return inputEvents.slice('+str(typing_start)+')')})
 assert any(e['type']=='input' and e['trusted'] for e in log[-1]['events'])
 w("document.querySelectorAll('.search-result').length===1 && !document.querySelector('.search-results').inert")
 key('CmdOrCtrl+K');key('ArrowDown');key('Return');state('keyboard-expanded')
 key('CmdOrCtrl+Return');w("document.querySelector('#global-search [role=status]').textContent==='已复制片段'")
 copied=subprocess.check_output(['pbpaste']).decode();assert copied==c("return document.querySelector('.search-passage').textContent") and copied in original
 log.append({'clipboardExactPassage':copied})
 # Scope is invoked with the pointer; pressed fill remains distinct from focus.
 click('[data-scope=note]');w("document.querySelector('[data-scope=note]').getAttribute('aria-pressed')==='true' && !document.querySelector('.search-results').inert")
 c("document.querySelector('.search-select').id='probe-select';document.querySelectorAll('.search-result button')[1].id='probe-copy';document.querySelectorAll('.search-result button')[2].id='probe-source'")
 click('#probe-select');key('Tab');state('selected-focused-child')
 click('#probe-source');w("!document.querySelector('#global-search').open && !document.querySelector('#reading').hidden")
 c("[...document.querySelectorAll('.search-return')].find(n=>n.getClientRects().length).id='probe-return'")
 click('#probe-return');w("document.querySelector('#global-search').open && document.activeElement.id==='probe-source'");state('pointer-return')
 key('Escape');w("!document.querySelector('#global-search').open && document.activeElement.id==='global-search-open'")
 key('CmdOrCtrl+K');w("document.activeElement.id==='global-search-input' && document.activeElement.value==='latency'");state('shortcut-reopen');key('Escape')
 assert (m.OUT/'Sync/source.md').read_text()==original
 passed=True
finally:
 try:
  if process:
   process.terminate()
   try:process.wait(timeout=10)
   except subprocess.TimeoutExpired:process.kill();process.wait(timeout=10)
 finally:
  try:
   subprocess.run(clip+['restore',backup],check=True)
   subprocess.run(clip+['save',str(m.OUT/'clipboard-restored.json')],check=True)
   restored=json.loads(Path(backup).read_text())==json.loads((m.OUT/'clipboard-restored.json').read_text());assert restored
  finally:
   subprocess.run([str(input_source),initial_source],check=True)
   source_restored=subprocess.check_output([str(input_source)],text=True).splitlines()[0]==initial_source
   assert source_restored
 if process:
  try:os.kill(process.pid,0)
  except ProcessLookupError:pass
  else:raise AssertionError('Owned host still exists after wait')
 hashes={p.name:{'source':hashlib.sha256(p.read_bytes()).hexdigest(),'package':hashlib.sha256((m.APP/'Contents/Resources/web'/p.name).read_bytes()).hexdigest()} for p in Path('web').glob('*') if p.is_file()}
 assert all(v['source']==v['package'] for v in hashes.values())
 (m.OUT/'result.json').write_text(json.dumps({'passed':passed,'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'pid':process.pid if process else None,'exit':process.returncode if process else None,'clipboardRestored':restored,'inputSourceRestored':source_restored,'initialInputSource':initial_source,'sourcePreserved':(m.OUT/'Sync/source.md').read_text()==original,'sourceSHA256':hashlib.sha256(original.encode()).hexdigest(),'assets':hashes,'probeSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'executableSHA256':hashlib.sha256((m.APP/'Contents/MacOS/LocalNotes').read_bytes()).hexdigest(),'hostSHA256':hashlib.sha256((m.OUT/'main.swift').read_bytes()).hexdigest(),'senderSHA256':hashlib.sha256(sender.read_bytes()).hexdigest(),'senderSourceSHA256':hashlib.sha256(sender_source.read_bytes()).hexdigest(),'maintainedSenderSourceSHA256':hashlib.sha256(Path('tests/native-browse-input.swift').read_bytes()).hexdigest(),'events':log},ensure_ascii=False,indent=2))
print('PASS native search focus, source return and clipboard; owned host exited; original clipboard restored')
