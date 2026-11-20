#!/usr/bin/env python3
"""Issue 81 synthetic Cocoa/WKWebView, OS input and trusted-event evidence."""
import hashlib, importlib.util, inspect, json, os, shutil, subprocess, time, uuid
from pathlib import Path
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('native-candidate-review.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
phase=os.environ.get('PHASE','after')
m.OUT=Path('build/issue81-native-'+phase).resolve();m.APP=m.OUT/'Browse81.app'
m.OUT.mkdir(parents=True,exist_ok=True)
for name in ['Sync','Private']:
 if (m.OUT/name).exists(): shutil.rmtree(m.OUT/name)
 (m.OUT/name).mkdir()
for i in range(55): (m.OUT/f'Sync/note-{i:02}.md').write_text('# 核对资料与下一步的长中文标题 '+str(i)+'\n\n保留原文与阅读位置。\n'*20)
source=inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue81'+phase+uuid.uuid4().hex[:8])
source=source.replace("source=(REPO/'mac/main.swift').read_text()", "source=(REPO/'mac/main.swift').read_text().replace('config.preferences.tabFocusesLinks = true;', '')" ) if os.environ.get('NATIVE_DIAGNOSE') else source
source=source.replace("generated=OUT/'main.swift';generated.write_text(source)","generated=OUT/'main.swift';generated.write_text(source.replace('let wrapped =', EXTRA+'let wrapped ='))")
EXTRA='''if script == "__host" { let result:[String:Any] = ["ok":true,"value":["active":NSApp.isActive,"hidden":NSApp.isHidden,"key":self?.window.isKeyWindow ?? false,"visible":self?.window.isVisible ?? false,"occluded":!(self?.window.occlusionState.contains(.visible) ?? false),"webHidden":self?.web.isHidden ?? true,"windowNumber":self?.window.windowNumber ?? -1,"main":self?.window.isMainWindow ?? false,"firstResponderIsWeb":self?.window.firstResponder === self?.web]]; try? JSONSerialization.data(withJSONObject:result).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
if script.hasPrefix("__pointer:") { let p=script.dropFirst(10).split(separator:",").compactMap { Double($0) }; if let window=self?.window { let point=CGPoint(x:window.frame.minX+p[0],y:(NSScreen.screens.first?.frame.height ?? 0)-window.frame.maxY+p[1]); for type in [CGEventType.leftMouseDown,CGEventType.leftMouseUp] { CGEvent(mouseEventSource:nil,mouseType:type,mouseCursorPosition:point,mouseButton:.left)?.postToPid(getpid()) } };try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
if script.hasPrefix("__key:") { let key=script.dropFirst(6);let code:CGKeyCode=key.contains("Tab") ? 48 : key == "Escape" ? 53 : 36;for down in [true,false] { let event=CGEvent(keyboardEventSource:nil,virtualKey:code,keyDown:down);if key.hasPrefix("Shift+") {event?.flags = .maskShift};event?.postToPid(getpid()) };try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
if script == "__focus" { NSApp.unhide(nil); self?.window.deminiaturize(nil); self?.window.orderFrontRegardless(); self?.window.makeKeyAndOrderFront(nil); self?.window.makeFirstResponder(self?.web); NSApp.activate(ignoringOtherApps:true); try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return }
if script.hasPrefix("__size:") { let size=script.dropFirst(7).split(separator:",").compactMap { Double($0) }; self?.window.setContentSize(NSSize(width:size[0],height:size[1])); try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return }
if script == "__snapshot" { self?.web.takeSnapshot(with:nil) { image,_ in
 if let tiff=image?.tiffRepresentation, let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) {try? png.write(to:reviewProbe.directory.appendingPathComponent("native.png"))}
 try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")) }; return }
'''
# Execute the transformed build in the module globals used by command().
m.__dict__['EXTRA']=EXTRA;exec(source,m.__dict__);m.build()
c,w=m.command,m.wait
log=[];process=None
out=Path('docs/validation/issue81')/phase;out.mkdir(parents=True,exist_ok=True)
def state(name):
 value=c("const n=document.activeElement;return {active:n.id||n.dataset.path||n.dataset.entityId||n.textContent.slice(0,60),tag:n.tagName,focusVisible:n.matches(':focus-visible'),outline:getComputedStyle(n).outline,selected:n.getAttribute('aria-current'),scroll:document.querySelector('#items').scrollTop,collection:document.querySelector('.collection').scrollTop,events:window.inputEvents}")
 log.append({'state':name,**value});c('__snapshot');shutil.copy(m.OUT/'native.png',out/(name+'.png'));return value

def native(action,*args):
 if os.environ.get('QUARTZ_INPUT'):
  host=c('__host');log.append({'nativeHost':host,'inputMethod':'Quartz CGEvent.postToPid owned host'})
  assert host['active'] and host['key'] and host['visible'] and not host['occluded'], 'Native acceptance requires a visibly focused owned host'
  if action=='click':c('__pointer:'+args[1]+','+args[3])
  else:c('__key:'+args[1])
  return
 r=subprocess.run(['orca','computer',action,'--app',f'pid:{process.pid}','--window-index','0','--restore-window',*args,'--no-screenshot','--json'],capture_output=True,text=True)
 receipt=json.loads(r.stdout);log.append({'input':action,'args':args,'receipt':receipt});
 if r.returncode!=0 or not receipt.get('ok'):
  for command in ['list-windows','get-app-state']:
   diagnostic=subprocess.run(['orca','computer',command,'--app',f'pid:{process.pid}','--json'],capture_output=True,text=True);log.append({'diagnostic':command,'result':diagnostic.stdout})
  log.append({'nativeFocus':c("return {hasFocus:document.hasFocus(),active:document.activeElement.tagName,visibility:document.visibilityState}")})
  raise AssertionError(r.stdout)

def click(selector):
 c('document.querySelector('+json.dumps(selector)+').scrollIntoView({block:"nearest"})')
 rect=c('const r=document.querySelector('+json.dumps(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2+28}')
 native('click','--x',str(round(rect['x'])),'--y',str(round(rect['y'])))
 time.sleep(.25)

def key(value):
 native('hotkey' if '+' in value else 'press-key','--key',value);time.sleep(.15)
try:
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','w'),stderr=subprocess.STDOUT)
 w("!!document.querySelector('.home-tools')");c('__focus');time.sleep(1)
 host=c('__host');document=c('return {focused:document.hasFocus(),visibility:document.visibilityState}')
 log.append({'preflight':host,'document':document,'pid':process.pid,'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()})
 c('__snapshot');shutil.copy(m.OUT/'native.png',out/'host-start.png')
 assert host['active'] and host['key'] and host['visible'] and not host['occluded'] and document['focused'] and document['visibility']=='visible', 'Preflight unavailable: unlock the Mac desktop and activate the isolated Browse81 window; no OS input attempted'

 c("window.inputEvents=[];for(const type of ['pointerdown','keydown','click'])document.addEventListener(type,e=>inputEvents.push({type,key:e.key,trusted:e.isTrusted,target:e.target.closest('button,summary,input')?.id||e.target.tagName}),true)")
 c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');const {InitiativeRepository}=await import('./initiatives.js');const a=new ActionRepository(native),i=new InitiativeRepository(native);await a.open();await i.open();for(let j=0;j<9;j++)await a.save({description:'核对本周资料并保留上下文 '+j,status:'todo',focusPosition:j+1});await i.save({description:'保留目标与进展的事项',title:'保留目标与进展的事项',goal:'核对资料',progress:'待核对',status:'active'});document.querySelector('[data-view=focus]').click()")
 w("document.querySelectorAll('.focus-row').length===7")
 for width,height in [(1180,800),(393,852),(800,400)]:
  c(f'__size:{width},{height}');c('__focus');time.sleep(.5);log.append({'hostBeforeInput':c('__host'),'documentFocus':c('return {focused:document.hasFocus(),visibility:document.visibilityState}')});click('[data-view=focus]');w("!!document.querySelector('.focus-row-open')")
  click('.row-menu summary');state(f'home-pointer-{width}');key('Tab');state(f'home-keyboard-{width}');key('Shift+Tab');state(f'home-reverse-{width}')
 c('__size:1180,800');click('.focus-row-open');w("document.querySelector('#action-drawer').open")
 state('action-open');click('#action-back');w("!document.querySelector('#action-drawer').open");state('action-pointer-return')
 c("document.querySelector('.focus-row-open').focus()");key('Tab');key('Shift+Tab');state('action-keyboard-opener');
 if phase!='before': assert c("return document.activeElement.matches('.focus-row-open')"), 'Tab and Shift+Tab must restore the row'
 c("document.querySelector('.focus-row-open').focus()");key('Return');w("document.querySelector('#action-drawer').open");key('Escape');w("!document.querySelector('#action-drawer').open");state('action-keyboard-return')
 click('[data-view=notes]');w("document.querySelectorAll('#items [data-path]').length===50")
 click('#items [data-path]');w("!document.querySelector('#editor').hidden");state('note-open')
 c('__size:393,852');click('#back');w("document.querySelector('#editor').hidden");state('library-pointer-return')
 key('Tab');key('Shift+Tab');c("document.querySelector('#items [data-path]').focus()");key('Return');w("!document.querySelector('#editor').hidden");click('#back');state('library-return')
 c('__size:1180,800');click('[data-view=initiatives]');w("!!document.querySelector('#items [data-initiative-id]')");click('#items [data-initiative-id]');state('initiative-selected');key('Tab');state('initiative-keyboard')
 assert c('return inputEvents.some(e=>e.type==="keydown"&&e.trusted)&&inputEvents.some(e=>e.type==="pointerdown"&&e.trusted)')
 hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').glob('*') if p.is_file()}
 for p in Path('web').glob('*'):
  if p.is_file():assert p.read_bytes()==(m.APP/'Contents/Resources/web'/p.name).read_bytes()
 log.append({'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'sourcePackageHashes':hashes,'probeHash':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'hostHash':hashlib.sha256((m.OUT/'main.swift').read_bytes()).hexdigest(),'input':'Orca process-targeted OS injection; DOM fixture/setup; no physical input; clipboard/input source untouched'})
 print('PASS native browse pointer/keyboard/open/return evidence')
finally:
 log.append({'provenance':{'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'executableSHA256':hashlib.sha256((m.APP/'Contents/MacOS/LocalNotes').read_bytes()).hexdigest(),'probeSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'hostSHA256':hashlib.sha256((m.OUT/'main.swift').read_bytes()).hexdigest(),'sourcePackage':{p.name:{'source':hashlib.sha256(p.read_bytes()).hexdigest(),'package':hashlib.sha256((m.APP/'Contents/Resources/web'/p.name).read_bytes()).hexdigest()} for p in Path('web').glob('*') if p.is_file()},'clipboard':'untouched','inputSource':'untouched'}})
 if process:process.terminate();process.wait(timeout=10)
 log.append({'ownedHostExited':process.returncode if process else None})
 (out/'transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
