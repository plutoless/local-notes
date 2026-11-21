#!/usr/bin/env python3
"""Issue 82 isolated native reader journey, with external OS input receipts.

Reuse the issue81 host diagnostics as literal test instrumentation without
executing its unrelated browse journey. DOM setup is always separate from input.
"""
import sys
sys.dont_write_bytecode=True
import ast, hashlib, importlib.util, inspect, json, os, shutil, subprocess, time, uuid
from pathlib import Path
REPO = Path(__file__).resolve().parents[1]
os.chdir(REPO)
head = subprocess.check_output(['git','rev-parse','HEAD'], text=True).strip()
expected_head = os.environ.get('EXPECTED_HEAD', head if os.environ.get('NATIVE_BUILD_ONLY') else '')
assert expected_head == head, 'Set EXPECTED_HEAD to the exact reviewed commit before runtime validation'
spec = importlib.util.spec_from_file_location('probe', REPO / 'tests/native-candidate-review.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
if os.environ.get('PROBE_IMPORT_ONLY'): print('PASS helper import only; no build, host or input'); raise SystemExit(0)
m.OUT = Path('build/issue82-ime/host').resolve(); m.APP = m.OUT/'Reader82IME.app'
existing = subprocess.check_output(['ps','-axo','pid=,command='], text=True)
assert not any(line.strip().split(maxsplit=1)[-1].startswith(str(m.APP/'Contents/MacOS/LocalNotes')) for line in existing.splitlines()), 'Existing probe ownership is uncertain; refuse setup without recovery'
m.OUT.mkdir(parents=True, exist_ok=True)
for name in ['Sync','Private']:
    if (m.OUT/name).exists(): shutil.rmtree(m.OUT/name)
    (m.OUT/name).mkdir()
original = '# 原文 Chinese English\n\n## 可以复制的中文 English\n\n[[second|阅读另一份很长的中文资料与 English]]\n\n- [ ] 保留复选框\n\n' + '阅读长段落 Chinese English。\n\n'*100
(m.OUT/'Sync/reference.md').write_text(original)
(m.OUT/'Sync/second.md').write_text('# 第二份资料\n\n[[reference|返回原文]]')
# Literal-only loading avoids running the issue81 probe or launching another host.
constants = {}
for node in ast.parse(Path('tests/native-browse-focus.py').read_text()).body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ['EXTRA','ROUTE_RECORDER']:
        constants[node.targets[0].id] = ast.literal_eval(node.value)
# Preserve every original pasteboard item/type in host memory; never export it.
constants['ROUTE_RECORDER'] += "\nvar readerClipboard:[[String:Data]] = []\n"
constants['EXTRA'] = constants['EXTRA'].replace('"CmdOrCtrl+A":0', '"CmdOrCtrl+A":0,"CmdOrCtrl+C":8').replace('"CmdOrCtrl+A":"a"', '"CmdOrCtrl+A":"a","CmdOrCtrl+C":"c"').replace('key == "CmdOrCtrl+A" ? .command', 'key.hasPrefix("CmdOrCtrl+") ? .command')
constants['EXTRA'] = r'''if script == "__clipboardSave" {
 readerClipboard = (NSPasteboard.general.pasteboardItems ?? []).map { item in Dictionary(uniqueKeysWithValues:item.types.compactMap { type in item.data(forType:type).map { (type.rawValue,$0) } }) }
 try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return
}
if script == "__clipboardRestore" {
 let items = readerClipboard.map { saved -> NSPasteboardItem in let item=NSPasteboardItem();for (type,data) in saved { item.setData(data,forType:NSPasteboard.PasteboardType(type)) };return item }
 NSPasteboard.general.clearContents();NSPasteboard.general.writeObjects(items)
 let restored = (NSPasteboard.general.pasteboardItems ?? []).map { item in Dictionary(uniqueKeysWithValues:item.types.compactMap { type in item.data(forType:type).map { (type.rawValue,$0) } }) }
 try? JSONSerialization.data(withJSONObject:["ok":true,"value":restored == readerClipboard]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return
}
if script == "__clipboardText" { try? JSONSerialization.data(withJSONObject:["ok":true,"value":NSPasteboard.general.string(forType:.string) ?? ""]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
''' + constants['EXTRA']

key_codes={'z':6,'h':4,'o':31,'n':45,'g':5,'w':13,'e':14,'i':34,'a':0,'Space':49,'Backspace':51,'Left':123,'Right':124,'Shift+Right':124}
key_text={k:(k if len(k)==1 else {'Space':' ','Backspace':'\\u{7f}','Left':'\\u{f702}','Right':'\\u{f703}','Shift+Right':'\\u{f703}'}[k]) for k in key_codes}
constants['EXTRA']=constants['EXTRA'].replace('"CmdOrCtrl+A":0', '"CmdOrCtrl+A":0,'+','.join('"'+k+'":'+str(v) for k,v in key_codes.items())).replace('"CmdOrCtrl+A":"a"','"CmdOrCtrl+A":"a",'+','.join('"'+k+'":"'+v+'"' for k,v in key_text.items())).replace('key == "Shift+Tab" ? .shift','key.hasPrefix("Shift+") ? .shift')
constants['EXTRA']=constants['EXTRA'].replace('"firstResponderIsWeb":','"pid":getpid(),"frontmostPID":NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1,"firstResponderIsWeb":')
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue82'+uuid.uuid4().hex[:8])
source = source.replace("generated=OUT/'main.swift';generated.write_text(source)", "generated=OUT/'main.swift';generated.write_text(source.replace('let wrapped =', EXTRA+'let wrapped =').replace('let reviewProbe = ReviewProbe()', ROUTE_RECORDER+'\\nlet reviewProbe = ReviewProbe()'))")
m.__dict__.update(constants); exec(source,m.__dict__); m.build()
sender = m.OUT/'native-input'
subprocess.run(['swiftc','tests/native-browse-input.swift','-o',str(sender)],check=True)
assets = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').iterdir() if p.is_file()}
for name,digest in assets.items(): assert hashlib.sha256((m.APP/'Contents/Resources/web'/name).read_bytes()).hexdigest()==digest
baseline_helper=m.OUT/'baseline-helper'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/ReaderIMEBaseline.swift','-o',str(baseline_helper)],check=True)
if os.environ.get('NATIVE_BUILD_ONLY'):
    receipt = {'head': head, 'mode':'build-only', 'hostLaunched':False, 'OSInput':False, 'inputSourceAccess':False, 'clipboardAccess':False, 'helperPath':str(REPO / 'tests/native-candidate-review.py'), 'assets':assets, 'probeSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'generatedSwiftSHA256':hashlib.sha256((m.OUT/'main.swift').read_bytes()).hexdigest(), 'binarySHA256':hashlib.sha256((m.APP/'Contents/MacOS/LocalNotes').read_bytes()).hexdigest()}
    receiptPath=REPO/'build/issue82-ime/repair/build-only.json';receiptPath.parent.mkdir(parents=True,exist_ok=True);receiptPath.write_text(json.dumps(receipt,indent=2))
    print('PASS build only; no GUI host, input, clipboard or input-source access'); raise SystemExit(0)
out=Path(os.environ.get('IME_EVIDENCE_DIR', 'build/issue82-ime/evidence/'+time.strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:8]));out.mkdir(parents=True,exist_ok=True)
c,w=m.command,m.wait
import fcntl,traceback
lease_root=Path('/Users/zhangqianze/Library/Application Support/Orca/issue-automation/local-notes')
# expected_head was verified before any fixture setup or compilation.
log=[];process=None;passed=False;failure=None;clipboardSaved=False;inputRestored=False;clipboardRestored=False
helper=m.OUT/'input-source'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/InputSourceHarness.swift','-o',str(helper)],check=True)
initial=None
baseline_saved=False
baseline_path=REPO/'build/issue82-ime/private/prelaunch.plist'
ime='com.tencent.inputmethod.wetype.pinyin'
# Input-source inventory and clipboard operations wait for an exclusive runtime lease.
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert head==expected_head
for file in list(Path('web').glob('*'))+list(Path('mac').glob('*.swift')):
 if file.is_file():assert file.read_bytes()==subprocess.check_output(['git','show',head+':'+str(file)])
originals={
 'read-only.md':'# 只读原文\n\n- [ ] 保留任务\n\n未编辑的中文 English source。\n',
 'editor.md':'# IME 编辑验收\n\nBaseline English\n',
 'discard.md':'# IME 放弃验收\n\nKeep baseline\n',
 'reference.md':original,
 'second.md':(m.OUT/'Sync/second.md').read_text(),
}
for name,text in originals.items():(m.OUT/'Sync'/name).write_text(text)
source_before={name:hashlib.sha256((m.OUT/'Sync'/name).read_bytes()).hexdigest() for name in originals}
def persist():
 (out/'transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
def command(script):
 value=c(script);log.append({'setupOrInspection':script,'value':value});persist();return value
def wait(expression):
 deadline=time.monotonic()+8
 while time.monotonic()<deadline:
  if c('return '+expression):log.append({'assertion':expression,'passed':True});persist();return
  time.sleep(.05)
 raise AssertionError('Bounded assertion timed out: '+expression)
def lease():
 with (lease_root/'native-gui-lease.lock').open('r') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);r=json.loads((lease_root/'native-gui-lease.json').read_text());fcntl.flock(lock,fcntl.LOCK_UN)
 assert r['state']=='granted' and r['issue']==82 and r['task']==os.environ.get('GUI_TASK','task_16ca08a2e971') and r['dispatch']==os.environ.get('GUI_DISPATCH','ctx_38fc929678f5') and r['run']=='run_4c9f8d25f80d','Lease identity lost; no input'
 return r
owned_window=None
def gate(receiver=None):
 lease();host=c('__host');doc=c('return {focus:document.hasFocus(),active:document.activeElement.id,path:document.querySelector("#file-path").textContent}')
 assert host['pid']==process.pid and host['frontmostPID']==process.pid and host['active'] and host['key'] and host['visible'] and not host['occluded'] and host['firstResponderIsWeb'] and host['windowNumber']==owned_window and doc['focus'],('Ownership lost',host,doc)
 if receiver:assert doc['active']==receiver,('Receiver lost',doc)
 return host,doc
def post(payload,kind,host,doc,before):
 result=subprocess.run([str(sender),str(process.pid),str(owned_window),'post'],input=json.dumps(payload),capture_output=True,text=True)
 after=c('__route');entry={'OSInput':kind,'host':host,'document':doc,'senderExit':result.returncode,'sender':result.stdout,'routeBeforeCounts':{'cocoa':len(before['cocoa']),'quartz':len(before['quartz'])},'cocoa':after['cocoa'][len(before['cocoa']):],'quartz':after['quartz'][len(before['quartz']):]};log.append(entry);persist()
 assert result.returncode==0,entry
 receipt=json.loads(result.stdout);kinds=[1,2] if kind.startswith('click:') else [10,11]
 assert after['tapEnabled'] and all(any(e['type']==k and e['marker']==810053 and e['sourcePID']==receipt['senderPID'] for e in entry['quartz']) for k in kinds),'Marked OS delivery missing; no retry'
 assert entry['cocoa'] and all(e['window']==owned_window for e in entry['cocoa']),'Owned Cocoa receiver missing; no retry'
def key(value,receiver='body'):
 host,doc=gate(receiver);before=c('__route');payload=c('__events:'+json.dumps({'key':value}))
 assert all(e['window']==owned_window and e['resolvedWindow'] for e in payload['roundtrip'])
 post(payload,'key:'+value,host,doc,before)
def click(selector):
 command('window.pointerTarget=document.querySelector('+json.dumps(selector)+');if(!pointerTarget)throw Error("Missing target");pointerTarget.scrollIntoView({block:"nearest"})')
 rect=c('const r=pointerTarget.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(!pointerTarget.contains(document.elementFromPoint(x,y)))throw Error("Occluded target");return {x,y}')
 host,doc=gate();before=c('__route');mapping=c('__point:'+str(rect['x'])+','+str(rect['y']));payload=c('__events:'+json.dumps({'action':'click','x':mapping['windowX'],'y':mapping['windowY']}))
 assert all(e['window']==owned_window and e['resolvedWindow'] and abs(e['x']-mapping['windowX'])<=1 and abs(e['y']-mapping['windowY'])<=1 for e in payload['roundtrip'])
 post(payload,'click:'+selector,host,doc,before)
 time.sleep(.05)
def snap(name):
 command('__snapshot');shutil.copy(m.OUT/'native.png',out/(name+'.png'))
 command('return {active:document.activeElement.id,fieldOutline:getComputedStyle(document.querySelector("#body")).outline,selection:[document.querySelector("#body").selectionStart,document.querySelector("#body").selectionEnd],text:document.querySelector("#body").value,events:imeEvents}')
def open_note(name):
 click('[data-view=notes]');wait('!!document.querySelector('+json.dumps('[data-path="'+name+'"]')+')')
 click('[data-path="'+name+'"]');wait('document.querySelector("#file-path").textContent==='+json.dumps(name))
def select_input(name):
 gate('body');result=subprocess.check_output([str(helper),name],text=True);log.append({'inputSourceSelection':name,'result':result});persist()
 assert subprocess.check_output([str(helper)],text=True).splitlines()[0]==name
try:
 lease()
 snapshot=subprocess.check_output([str(baseline_helper),'snapshot',str(baseline_path)],text=True);baseline_saved=True
 log.append({'durablePrelaunchBaseline':json.loads(snapshot)})
 inventory=subprocess.check_output([str(helper)],text=True);initial=inventory.splitlines()[0]
 assert any(line.startswith(ime+' | ') for line in inventory.splitlines()[1:]),'WeType unavailable; no GUI launched'
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(out/'app.log','w'),stderr=subprocess.STDOUT)
 wait("!!document.querySelector('.home-tools')");command('__focus');time.sleep(.3);owned_window=c('__host')['windowNumber'];gate()
 command('__clipboardSave');clipboardSaved=True
 command("window.imeEvents=[];for(const type of ['compositionstart','compositionupdate','compositionend','beforeinput','input','keydown','pointerdown','click'])document.addEventListener(type,e=>imeEvents.push({type,key:e.key,data:e.data,inputType:e.inputType,isComposing:e.isComposing,isTrusted:e.isTrusted,target:e.target.id||e.target.tagName,value:e.target.id==='body'?e.target.value:undefined,selection:e.target.id==='body'?[e.target.selectionStart,e.target.selectionEnd]:undefined,time:performance.now()}),true)")
 open_note('read-only.md');click('#mode');wait("document.activeElement.id==='body'");click('#mode');click('#back')
 assert (m.OUT/'Sync/read-only.md').read_text()==originals['read-only.md'];log.append({'readOnlyFocusBytesUnchanged':True})
 open_note('editor.md');click('#mode');wait("document.activeElement.id==='body'")
 select_input(ime);key('CmdOrCtrl+A')
 for name in ['z','h','o','n','g','w','e','n']:key(name)
 wait("imeEvents.some(e=>e.type==='compositionstart'&&e.isTrusted&&e.target==='body')")
 snap('active-composition')
 key('Space')
 wait("imeEvents.some(e=>e.type==='compositionend'&&e.isTrusted&&e.target==='body'&&/[\\u3400-\\u9fff]/.test(e.data||'')) && /[\\u3400-\\u9fff]/.test(document.querySelector('#body').value)")
 committed=command("return document.querySelector('#body').value")
 assert command("return document.activeElement.id==='body' && document.querySelector('#body').selectionStart===document.querySelector('#body').selectionEnd && getComputedStyle(document.querySelector('#body')).outlineStyle==='solid'")
 click('#note-save');wait("document.querySelector('#save-state').textContent==='已保存到本地'")
 saved=(m.OUT/'Sync/editor.md').read_text();assert committed in saved
 click('#body');select_input(ime)
 baseline=command("return document.querySelector('#body').value");prior=command("return imeEvents.filter(e=>e.type==='compositionstart'&&e.isTrusted&&e.target==='body').length")
 for name in ['n','i','h','a','o']:key(name)
 wait("imeEvents.filter(e=>e.type==='compositionstart'&&e.isTrusted&&e.target==='body').length>"+str(prior))
 key('Escape');wait("document.activeElement.id==='body' && document.querySelector('#body').value==="+json.dumps(baseline))
 time.sleep(.75);assert (m.OUT/'Sync/editor.md').read_text()==saved
 snap('cancelled-composition')
 select_input('com.apple.keylayout.ABC');key('CmdOrCtrl+A');assert command("return document.querySelector('#body').selectionStart===0 && document.querySelector('#body').selectionEnd===document.querySelector('#body').value.length")
 selection=command("return [document.querySelector('#body').selectionStart,document.querySelector('#body').selectionEnd,document.querySelector('#body').selectionDirection]")
 click('#global-search-open');wait("document.querySelector('#global-search').open")
 command("const close=[...document.querySelectorAll('#global-search button')].find(n=>n.textContent==='关闭搜索');if(!close)throw Error('Search close unavailable');close.id='ime-search-close'");click('#ime-search-close');wait("!document.querySelector('#global-search').open")
 assert command("return [document.querySelector('#body').selectionStart,document.querySelector('#body').selectionEnd,document.querySelector('#body').selectionDirection]")==selection
 click('#mode');click('#back');open_note('editor.md');click('#mode');wait("document.activeElement.id==='body'")
 assert command("return document.querySelector('#body').value").strip()==committed.strip()
 snap('reopened-saved-editor')
 click('#back');open_note('discard.md');click('#mode');wait("document.activeElement.id==='body'");select_input(ime);key('CmdOrCtrl+A')
 # DOM setup activates the real Back control immediately after native commit,
 # before the existing 650ms autosave; input itself remains actual IME input.
 command("document.querySelector('#body').addEventListener('compositionend',e=>{if(e.isTrusted&&/[\\u3400-\\u9fff]/.test(e.data||''))queueMicrotask(()=>document.querySelector('#back').click())},{once:true})")
 for name in ['n','i']:key(name)
 key('Space');wait("!!document.querySelector('#task-leave-decision')")
 command("window.discardButton=[...document.querySelectorAll('#task-leave-decision button')].find(n=>n.textContent==='放弃更改并离开');discardButton.id='ime-discard' ")
 click('#ime-discard');wait("document.querySelector('#editor').hidden")
 assert (m.OUT/'Sync/discard.md').read_text()==originals['discard.md']
 assert (m.OUT/'Sync/read-only.md').read_text()==originals['read-only.md']
 log.append({'acceptance':{'realIMECommit':True,'realIMECancel':True,'caretFieldAndSelection':True,'searchReturnSelection':True,'deliberateSaveReopen':True,'deliberateDiscard':True,'readOnlySourceUnchanged':True,'saveFixtureExpectedChanged':True}})
 passed=True
except BaseException as error:
 failure={'type':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()};log.append({'failure':failure});persist()
finally:
 try:
  if baseline_saved:
   restore=json.loads(subprocess.check_output([str(baseline_helper),'restore',str(baseline_path)],text=True))
   inputRestored=restore['inputSourceRestored'];clipboardRestored=restore['clipboardRestoredExactBytes'];log.append({'durableBaselineRestoration':restore})
  else:
   inputRestored=True;clipboardRestored=True;log.append({'baselineNotCaptured':'No input-source or clipboard changes occurred'})
 except BaseException as e:
  log.append({'baselineRestoreFailure':str(e),'privateBaselineRetained':str(baseline_path)})
 if process:
  if process.poll() is None:process.terminate()
  process.wait(timeout=10)
 absence=subprocess.run(['ps','-p',str(process.pid),'-o','pid=,comm='],capture_output=True,text=True) if process else None
 source_after={name:hashlib.sha256((m.OUT/'Sync'/name).read_bytes()).hexdigest() for name in originals}
 provenance={}
 for p in list(Path('web').glob('*'))+list(Path('mac').glob('*.swift'))+[Path(__file__),Path('tests/native-browse-input.swift'),Path('tests/InputSourceHarness.swift'),Path('tests/ReaderIMEBaseline.swift'),baseline_helper,m.OUT/'main.swift',m.APP/'Contents/MacOS/LocalNotes',sender,helper]:
  if p.is_file():provenance[str(p)]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 for name,digest in assets.items():assert hashlib.sha256((m.APP/'Contents/Resources/web'/name).read_bytes()).hexdigest()==digest
 result={'passed':passed and inputRestored and clipboardRestored and (absence is None or absence.returncode==1),'head':head,'failure':failure,'pid':process.pid if process else None,'window':owned_window,'waitedExit':process.returncode if process else None,'psExit':absence.returncode if absence else None,'psOutput':absence.stdout if absence else None,'inputSourceRestored':inputRestored,'clipboardRestoredExactBytes':clipboardRestored,'sourceBefore':source_before,'sourceAfter':source_after,'readOnlyPreserved':source_before['read-only.md']==source_after['read-only.md'],'discardFixtureUnchanged':source_before['discard.md']==source_after['discard.md'],'saveFixtureExpectedChanged':source_before['editor.md']!=source_after['editor.md'],'provenance':provenance,'unrun':['physical keyboard/mouse','Android-specific','standalone Syncthing'],'log':log}
 persist();(out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('PASS' if result['passed'] else 'FAIL', 'bounded native note-editor IME acceptance; no automatic retry')
raise SystemExit(0 if result['passed'] else 1)
