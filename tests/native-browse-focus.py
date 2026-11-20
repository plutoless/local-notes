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
source=source.replace("source.replace('let wrapped =', EXTRA+'let wrapped =')", "source.replace('let wrapped =', EXTRA+'let wrapped =').replace('let reviewProbe = ReviewProbe()', ROUTE_RECORDER+'\\nlet reviewProbe = ReviewProbe()')")
ROUTE_RECORDER='''
final class BrowseRouteRecorder {
 var cocoa:[[String:Any]] = []; var quartz:[[String:Any]] = []
 var monitor:Any?; var tap:CFMachPort?; var tapSource:CFRunLoopSource?
 func start() {
  guard monitor == nil else { return }
  monitor=NSEvent.addLocalMonitorForEvents(matching:[.leftMouseDown,.leftMouseUp,.keyDown,.keyUp]) { [weak self] event in
   self?.cocoa.append(["type":event.type.rawValue,"window":event.windowNumber,"x":event.locationInWindow.x,"y":event.locationInWindow.y,"keyCode":event.type == .keyDown || event.type == .keyUp ? Int(event.keyCode) : -1,"flags":event.modifierFlags.rawValue,"utc":ISO8601DateFormatter().string(from:Date())]);return event
  }
  let mask:CGEventMask = (1 << CGEventType.leftMouseDown.rawValue) | (1 << CGEventType.leftMouseUp.rawValue) | (1 << CGEventType.keyDown.rawValue) | (1 << CGEventType.keyUp.rawValue)
  tap=CGEvent.tapCreateForPid(pid:getpid(),place:.headInsertEventTap,options:.listenOnly,eventsOfInterest:mask,callback:{ _,type,event,info in
   let recorder=Unmanaged<BrowseRouteRecorder>.fromOpaque(info!).takeUnretainedValue()
   recorder.quartz.append(["type":type.rawValue,"x":event.location.x,"y":event.location.y,"marker":event.getIntegerValueField(.eventSourceUserData),"sourcePID":event.getIntegerValueField(.eventSourceUnixProcessID),"utc":ISO8601DateFormatter().string(from:Date())]);return Unmanaged.passUnretained(event)
  },userInfo:Unmanaged.passUnretained(self).toOpaque())
  if let tap=tap { tapSource=CFMachPortCreateRunLoopSource(kCFAllocatorDefault,tap,0);CFRunLoopAddSource(CFRunLoopGetMain(),tapSource,.commonModes) }
 }
}
let browseRouteRecorder=BrowseRouteRecorder()
'''
EXTRA='''if script == "__host" { let result:[String:Any] = ["ok":true,"value":["active":NSApp.isActive,"hidden":NSApp.isHidden,"key":self?.window.isKeyWindow ?? false,"visible":self?.window.isVisible ?? false,"occluded":!(self?.window.occlusionState.contains(.visible) ?? false),"webHidden":self?.web.isHidden ?? true,"windowNumber":self?.window.windowNumber ?? -1,"main":self?.window.isMainWindow ?? false,"firstResponderIsWeb":self?.window.firstResponder === self?.web]]; try? JSONSerialization.data(withJSONObject:result).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
if script == "__route" { browseRouteRecorder.start();let result:[String:Any] = ["postAccess":CGPreflightPostEventAccess(),"listenAccess":CGPreflightListenEventAccess(),"axTrusted":AXIsProcessTrusted(),"tapAvailable":browseRouteRecorder.tap != nil,"tapEnabled":browseRouteRecorder.tap.map { CGEvent.tapIsEnabled(tap:$0) } ?? false,"cocoa":browseRouteRecorder.cocoa,"quartz":browseRouteRecorder.quartz];try? JSONSerialization.data(withJSONObject:["ok":true,"value":result]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
if script.hasPrefix("__point:") { let p=script.dropFirst(8).split(separator:",").compactMap { Double($0) };if p.count==2,let web=self?.web,let window=self?.window {let local=NSPoint(x:p[0],y:web.isFlipped ? p[1] : web.bounds.height-p[1]);let inWindow=web.convert(local,to:nil);let screen=window.convertPoint(toScreen:inWindow);let height=CGDisplayBounds(CGMainDisplayID()).height;let hit=web.hitTest(local);let result:[String:Any] = ["quartzX":screen.x,"quartzY":height-screen.y,"windowX":inWindow.x,"windowY":inWindow.y,"webFlipped":web.isFlipped,"webWidth":web.bounds.width,"webHeight":web.bounds.height,"frame":NSStringFromRect(window.frame),"hitClass":hit.map {String(describing:type(of:$0))} ?? "none","legacyQuartzX":window.frame.minX+p[0],"legacyQuartzY":height-window.frame.maxY+p[1]+28];try? JSONSerialization.data(withJSONObject:["ok":true,"value":result]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return } }
if script.hasPrefix("__pointer:") { let p=script.dropFirst(10).split(separator:",").compactMap { Double($0) }; if let window=self?.window { let point=CGPoint(x:window.frame.minX+p[0],y:(NSScreen.screens.first?.frame.height ?? 0)-window.frame.maxY+p[1]); for type in [CGEventType.leftMouseDown,CGEventType.leftMouseUp] { CGEvent(mouseEventSource:nil,mouseType:type,mouseCursorPosition:point,mouseButton:.left)?.postToPid(getpid()) } };try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
if script.hasPrefix("__key:") { let key=String(script.dropFirst(6));let codes:[String:CGKeyCode] = ["Tab":48,"Shift+Tab":48,"Escape":53,"Return":36,"CmdOrCtrl+A":0];guard let code=codes[key] else {try? JSONSerialization.data(withJSONObject:["ok":false,"error":"Unsupported native key: " + key]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return};for down in [true,false] { let event=CGEvent(keyboardEventSource:nil,virtualKey:code,keyDown:down);if key.hasPrefix("Shift+") {event?.flags = .maskShift};if key.hasPrefix("CmdOrCtrl+") {event?.flags = .maskCommand};event?.postToPid(getpid()) };try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
if script == "__focus" { NSApp.unhide(nil); self?.window.deminiaturize(nil); self?.window.orderFrontRegardless(); self?.window.makeKeyAndOrderFront(nil); self?.window.makeFirstResponder(self?.web); NSApp.activate(ignoringOtherApps:true); try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return }
if script.hasPrefix("__size:") { let size=script.dropFirst(7).split(separator:",").compactMap { Double($0) }; self?.window.setContentSize(NSSize(width:size[0],height:size[1])); try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return }
if script == "__snapshot" { self?.web.takeSnapshot(with:nil) { image,_ in
 if let tiff=image?.tiffRepresentation, let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) {try? png.write(to:reviewProbe.directory.appendingPathComponent("native.png"))}
 try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json")) }; return }
'''
# Execute the transformed build in the module globals used by command().
m.__dict__['EXTRA']=EXTRA;m.__dict__['ROUTE_RECORDER']=ROUTE_RECORDER;exec(source,m.__dict__);m.build()
sender=m.OUT/'native-browse-input'
if os.environ.get('EXTERNAL_INPUT'):
 subprocess.run(['swiftc',str(Path(__file__).with_name('native-browse-input.swift')),'-o',str(sender)],check=True)
if os.environ.get('NATIVE_BUILD_ONLY'):
 print('PASS build-only native probe; no host launched or input posted');raise SystemExit(0)
c,w=m.command,m.wait
log=[];process=None
out=Path(os.environ.get('NATIVE_EVIDENCE_DIR',str(Path('docs/validation/issue81')/phase)));out.mkdir(parents=True,exist_ok=True)
def state(name):
 value=c("const n=document.activeElement;return {active:n.id||n.dataset.path||n.dataset.entityId||n.textContent.slice(0,60),tag:n.tagName,focusVisible:n.matches(':focus-visible'),outline:getComputedStyle(n).outline,selected:n.getAttribute('aria-current'),scroll:document.querySelector('#items').scrollTop,collection:document.querySelector('.collection').scrollTop,events:window.inputEvents}")
 log.append({'state':name,**value});c('__snapshot');shutil.copy(m.OUT/'native.png',out/(name+'.png'));return value

def native(action,*args,target=None):
 host=c('__host');document=c('return {focused:document.hasFocus(),visibility:document.visibilityState}')
 log.append({'beforeInput':action,'args':args,'utc':time.strftime('%Y-%m-%dT%H:%M:%S',time.gmtime()),'epochNS':time.time_ns(),'pid':process.pid,'host':host,'document':document})
 assert host['windowNumber']==owned_window and host['active'] and host['key'] and host['visible'] and not host['occluded'] and document['focused'] and document['visibility']=='visible', 'Owned host lost visible keyboard/input ownership; no operation attempted'
 if os.environ.get('EXTERNAL_INPUT'):
  route_before=c('__route');previous=c('return window.inputEvents.length')
  c('window.nativeInputTargetSelector='+json.dumps(target)+';window.nativeKeyTarget=document.activeElement')
  if action=='click':
   point=c('__point:'+args[1]+','+args[3]);log.append({'coordinateMapping':point})
   assert point['hitClass']!='none', 'Native target outside the web view; nothing posted'
   command=[str(sender),str(process.pid),str(owned_window),'click',str(point['quartzX']),str(point['quartzY'])]
  else:command=[str(sender),str(process.pid),str(owned_window),'key',args[1]]
  result=subprocess.run(command,capture_output=True,text=True);log.append({'sender':result.stdout,'senderExit':result.returncode,'routeBefore':route_before})
  def delivered(events):
   if action=='click':return all(any(e['trusted'] and e['type']==kind and e['matchesExpectedTarget'] for e in events) for kind in ['pointerdown','click'])
   expected={'Tab':('Tab',False,False),'Shift+Tab':('Tab',True,False),'Escape':('Escape',False,False),'Return':('Enter',False,False),'CmdOrCtrl+A':('a',False,True)}[args[1]]
   return any(e['trusted'] and e['type']=='keydown' and e['matchesExpectedKeyTarget'] and (e.get('key','').lower() if expected[2] else e.get('key'))==expected[0] and e['shift']==expected[1] and e['meta']==expected[2] and not e['ctrl'] and not e['alt'] for e in events)
  events=[]
  for _ in range(20):
   time.sleep(.05);events=c('return window.inputEvents.slice('+str(previous)+')')
   if delivered(events):break
  host_after=c('__host');document_after=c('return {focused:document.hasFocus(),visibility:document.visibilityState}')
  log.append({'externalInput':action,'utcCompleted':time.strftime('%Y-%m-%dT%H:%M:%S',time.gmtime()),'epochNS':time.time_ns(),'trustedEvents':events,'routeAfter':c('__route'),'hostAfter':host_after,'documentAfter':document_after})
  assert result.returncode==0 and host_after['windowNumber']==owned_window and host_after['active'] and host_after['key'] and host_after['visible'] and not host_after['occluded'] and document_after['focused'], 'Recipient or sender uncertain; no replay'
  assert delivered(events), 'Intended external native target/key delivery unverified; no replay'
  return
 if os.environ.get('QUARTZ_INPUT'):
  host=c('__host');log.append({'nativeHost':host,'inputMethod':'Quartz CGEvent.postToPid owned host'})
  assert host['active'] and host['key'] and host['visible'] and not host['occluded'], 'Native acceptance requires a visibly focused owned host'
  previous=c('return window.inputEvents.length')
  if action=='click':c('__pointer:'+args[1]+','+args[3])
  else:c('__key:'+args[1])
  events=[]
  for _ in range(10):
   time.sleep(.05);events=c('return window.inputEvents.slice('+str(previous)+')')
   if any(e['trusted'] and e['type']==('pointerdown' if action=='click' else 'keydown') for e in events):break
  log.append({'quartzInput':action,'args':args,'utcCompleted':time.strftime('%Y-%m-%dT%H:%M:%S',time.gmtime()),'epochNS':time.time_ns(),'trustedEvents':events,'hostAfter':c('__host'),'documentAfter':c('return {focused:document.hasFocus(),visibility:document.visibilityState}')})
  assert any(e['trusted'] and e['type']==('pointerdown' if action=='click' else 'keydown') for e in events), 'Native delivery unverified; no replay'
  return
 r=subprocess.run(['orca','computer',action,'--app',f'pid:{process.pid}','--window-id',str(owned_window),'--restore-window',*args,'--no-screenshot','--json'],capture_output=True,text=True)
 receipt=json.loads(r.stdout);log.append({'input':action,'args':args,'receipt':receipt});
 if r.returncode!=0 or not receipt.get('ok'):
  for command in ['list-windows','get-app-state']:
   diagnostic=subprocess.run(['orca','computer',command,'--app',f'pid:{process.pid}','--json'],capture_output=True,text=True);log.append({'diagnostic':command,'result':diagnostic.stdout})
  log.append({'nativeFocus':c("return {hasFocus:document.hasFocus(),active:document.activeElement.tagName,visibility:document.visibilityState,editorHidden:document.querySelector('#editor').hidden,file:document.querySelector('#file-path').textContent}"),'hostAfterError':c('__host')})
  raise AssertionError(r.stdout)

def click(selector):
 c('const node=document.querySelector('+json.dumps(selector)+');if(!node || !node.getClientRects().length || node.disabled)throw Error("Native target unavailable");node.scrollIntoView({block:"nearest"})')
 rect=c('const node=document.querySelector('+json.dumps(selector)+');const r=node.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(!node.contains(document.elementFromPoint(x,y)))throw Error("Native target occluded or outside viewport");return {x,y}')
 if not os.environ.get('EXTERNAL_INPUT'):rect['y']+=28
 log.append({'clickTarget':selector,'rect':rect})
 native('click','--x',str(round(rect['x'])),'--y',str(round(rect['y'])),target=selector)
 time.sleep(.25)

def key(value):
 native('hotkey' if '+' in value else 'press-key','--key',value);time.sleep(.15)
try:
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','w'),stderr=subprocess.STDOUT)
 w("!!document.querySelector('.home-tools')");c('__focus');time.sleep(1)
 host=c('__host');owned_window=host['windowNumber'];document=c('return {focused:document.hasFocus(),visibility:document.visibilityState}')
 log.append({'preflight':host,'document':document,'pid':process.pid,'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()})
 c('__snapshot');shutil.copy(m.OUT/'native.png',out/'host-start.png')
 assert host['active'] and host['key'] and host['visible'] and not host['occluded'] and document['focused'] and document['visibility']=='visible', 'Owned fixture unavailable in observed preflight; no OS input attempted'
 if os.environ.get('EXTERNAL_INPUT'):log.append({'routePreflight':c('__route'),'senderPreflight':json.loads(subprocess.check_output([str(sender)],text=True))})

 c("window.inputEvents=[];for(const type of ['pointerdown','keydown','click'])document.addEventListener(type,e=>inputEvents.push({type,key:e.key,shift:e.shiftKey,meta:e.metaKey,ctrl:e.ctrlKey,alt:e.altKey,trusted:e.isTrusted,target:e.target.closest('button,summary,input')?.id||e.target.tagName,view:e.target.closest('[data-view]')?.dataset.view,matchesExpectedTarget:!!window.nativeInputTargetSelector&&!!document.querySelector(window.nativeInputTargetSelector)?.contains(e.target),matchesExpectedKeyTarget:e.target===window.nativeKeyTarget,utc:new Date().toISOString()}),true)")
 c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');const {InitiativeRepository}=await import('./initiatives.js');const a=new ActionRepository(native),i=new InitiativeRepository(native);await a.open();await i.open();for(let j=0;j<9;j++)await a.save({description:'核对本周资料并保留上下文 '+j,status:'todo',focusPosition:j+1});for(let j=0;j<32;j++)await a.save({description:'分页行动 '+j,status:'todo'});for(let j=0;j<51;j++)await i.save({title:'分页事项 '+j,goal:'核对资料',progress:'待核对',status:'later'});await i.save({description:'保留目标与进展的事项',title:'保留目标与进展的事项',goal:'核对资料',progress:'待核对',status:'active'});document.querySelector('[data-view=focus]').click()")
 w("document.querySelectorAll('.focus-row').length===7")
 for width,height in [(1180,800),(393,852),(800,400)]:
  c(f'__size:{width},{height}');c('__focus');time.sleep(.5);log.append({'hostBeforeInput':c('__host'),'documentFocus':c('return {focused:document.hasFocus(),visibility:document.visibilityState}')})
  c("window.nativeFocusRowBefore=document.querySelector('.focus-row')")
  click('[data-view=focus]')
  w("!!document.querySelector('.focus-row-open') && document.querySelector('.focus-row')!==window.nativeFocusRowBefore && document.querySelector('[data-view=focus]').getAttribute('aria-current')==='page' && document.querySelector('#index-state').textContent===''")
  log.append({'focusNavigationOutcome':'Current Focus selected and rows replaced after native click'})
  click('.row-menu summary');state(f'home-pointer-{width}');key('Tab');state(f'home-keyboard-{width}');key('Shift+Tab');state(f'home-reverse-{width}')
 c('__size:1180,800');click('.focus-row-open');w("document.querySelector('#action-drawer').open")
 state('action-open')
 c("const field=document.querySelector('#action-description');window.savedActionText=field.value;field.value='保留原草稿与选择';field.dispatchEvent(new Event('input',{bubbles:true}))")
 click('#action-description');key('CmdOrCtrl+A')
 selected=c("return [document.querySelector('#action-description').selectionStart,document.querySelector('#action-description').selectionEnd]")
 click('#action-back');w("document.querySelector('#task-leave-decision').open")
 c("[...document.querySelectorAll('#task-leave-decision button')].find(n=>n.textContent==='继续编辑').id='probe-continue'");click('#probe-continue')
 assert c("return document.querySelector('#action-description').value")=='保留原草稿与选择'
 assert c("return [document.querySelector('#action-description').selectionStart,document.querySelector('#action-description').selectionEnd]")==selected
 state('action-retained-draft-selection')
 c("const field=document.querySelector('#action-description');field.value=window.savedActionText;field.dispatchEvent(new Event('input',{bubbles:true}))")
 click('#action-back');w("!document.querySelector('#action-drawer').open");state('action-pointer-return')
 c("document.querySelector('.focus-row-open').focus()");key('Tab');key('Shift+Tab');state('action-keyboard-opener');
 if phase!='before': assert c("return document.activeElement.matches('.focus-row-open')"), 'Tab and Shift+Tab must restore the row'
 c("document.querySelector('.focus-row-open').focus()");key('Return');w("document.querySelector('#action-drawer').open");key('Escape');w("!document.querySelector('#action-drawer').open");state('action-keyboard-return')
 click('[data-view=notes]');w("document.querySelectorAll('#items [data-path]').length===50")
 c('__size:393,852')
 c("const row=document.querySelectorAll('#items [data-path]')[12];row.id='probe-note-row';row.scrollIntoView({block:'center'});window.browseBefore={path:row.dataset.path,scroll:document.querySelector('.collection').scrollTop,list:document.querySelector('#items').scrollTop}")
 click('#probe-note-row');w("!document.querySelector('#editor').hidden");state('note-open');click('#note-info-open');w("document.querySelector('#note-info-drawer').open");click('#star');click('#note-info-drawer .ui-drawer-footer button');w("!document.querySelector('#note-info-drawer').open")
 click('#back');w("document.querySelector('#editor').hidden");state('library-pointer-return');assert c("return document.activeElement.dataset.path===window.browseBefore.path && document.querySelector('.collection').scrollTop===window.browseBefore.scroll && document.querySelector('#items').scrollTop===window.browseBefore.list")
 key('Tab');key('Shift+Tab');c("document.querySelector('#items [data-path]').focus()");key('Return');w("!document.querySelector('#editor').hidden");click('#back');state('library-return')
 click('[data-view=favorites]');w("document.querySelectorAll('#items [data-path]').length===1");click('#items [data-path]');w("!document.querySelector('#editor').hidden");click('#back');state('favorites-return')
 c('__size:1180,800');click('[data-view=initiatives]');w("!!document.querySelector('#items [data-initiative-id]')");click('#items [data-initiative-id]');state('initiative-selected');key('Tab');state('initiative-keyboard');c('__size:393,852');click('#workspace-back');click('#initiative-next');w("document.querySelector('#initiative-next').disabled");state('initiative-page-boundary')
 click('[data-view=focus]');c("[...document.querySelectorAll('.home-tools button')].find(n=>n.textContent==='全部行动').id='probe-all-actions'");click('#probe-all-actions');w("document.querySelector('#action-tools').getClientRects().length>0 && document.querySelector('#index-state').textContent===''")
 c("document.querySelector('#action-next').focus()");key('Return');w("document.querySelector('#action-next').disabled && document.activeElement.id==='action-previous'");state('action-page-boundary')
 assert c('return inputEvents.some(e=>e.type==="keydown"&&e.trusted)&&inputEvents.some(e=>e.type==="pointerdown"&&e.trusted)')
 hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').glob('*') if p.is_file()}
 for p in Path('web').glob('*'):
  if p.is_file():assert p.read_bytes()==(m.APP/'Contents/Resources/web'/p.name).read_bytes()
 method='external Swift CGEvent.postToPid' if os.environ.get('EXTERNAL_INPUT') else 'fixture self-posted CGEvent.postToPid' if os.environ.get('QUARTZ_INPUT') else 'Orca process-targeted OS injection'
 log.append({'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'sourcePackageHashes':hashes,'probeHash':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'hostHash':hashlib.sha256((m.OUT/'main.swift').read_bytes()).hexdigest(),'input':method+'; DOM fixture/setup; no physical input; clipboard/input source untouched'})
 print('PASS native browse pointer/keyboard/open/return evidence')
finally:
 if os.environ.get('EXTERNAL_INPUT'):
  log.append({'externalSenderProvenance':{'sourceSHA256':hashlib.sha256(Path(__file__).with_name('native-browse-input.swift').read_bytes()).hexdigest(),'executableSHA256':hashlib.sha256(sender.read_bytes()).hexdigest()}})
 log.append({'provenance':{'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'applicationPath':str(m.APP),'bundleIdentifier':subprocess.check_output(['/usr/libexec/PlistBuddy','-c','Print :CFBundleIdentifier',str(m.APP/'Contents/Info.plist')],text=True).strip(),'executableSHA256':hashlib.sha256((m.APP/'Contents/MacOS/LocalNotes').read_bytes()).hexdigest(),'probeSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'hostSHA256':hashlib.sha256((m.OUT/'main.swift').read_bytes()).hexdigest(),'sourcePackage':{p.name:{'source':hashlib.sha256(p.read_bytes()).hexdigest(),'package':hashlib.sha256((m.APP/'Contents/Resources/web'/p.name).read_bytes()).hexdigest()} for p in Path('web').glob('*') if p.is_file()},'clipboard':'untouched','inputSource':'untouched'}})
 if process:process.terminate();process.wait(timeout=10)
 log.append({'ownedHostExited':process.returncode if process else None})
 (out/'transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
