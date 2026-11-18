#!/usr/bin/env python3
"""Real WeType IME and OS editing shortcuts against the isolated packaged app.

Run build:mac then tests/native-search.py first to package the unchanged native
code with its existing test-only inspection channel. No DOM composition or
keyboard events are synthesized. The original input source is always restored.
"""
import sys
sys.dont_write_bytecode=True
import importlib.util,json,os,subprocess,time,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('probe',Path('tests/native-candidate-review.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.OUT=Path('build/issue58-native').resolve();app=m.OUT/'Search58.app';out=Path('build/issue58-ime').resolve();out.mkdir(parents=True,exist_ok=True)
helper=out/'input-source'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/InputSourceHarness.swift','-o',str(helper)],check=True)
initial=subprocess.check_output([str(helper)]).decode().splitlines()[0]
head=subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()
assets=app/'Contents/Resources/web'
hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').glob('*') if p.is_file()}
assert all(hashlib.sha256((assets/Path(name).name).read_bytes()).hexdigest()==digest for name,digest in hashes.items())
process=subprocess.Popen([str(app/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(out/'app.log','w'),stderr=subprocess.STDOUT)
log=[]
def c(script):
 value=m.command(script);log.append({'script':script,'value':value});(out/'ime-transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2));return value
def w(expression):
 m.wait(expression);log.append({'assertion':expression,'passed':True})
def key(code,mods=''):
 subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true','-e',f'tell application "System Events" to key code {code}'+mods],check=True)
 log.append({'OSKeyCode':code,'modifiers':mods});time.sleep(.1)
try:
 w("!!document.querySelector('.home-tools')")
 key(40,' using command down');w("document.activeElement.id==='global-search-input'")
 c("window.imeEvents=[];for(const type of ['compositionstart','compositionupdate','compositionend','beforeinput','input','keydown'])document.querySelector('#global-search-input').addEventListener(type,e=>imeEvents.push({type:e.type,key:e.key,data:e.data,inputType:e.inputType,isComposing:e.isComposing,isTrusted:e.isTrusted,value:e.target.value}))")
 log.append({'selectIME':subprocess.check_output([str(helper),'com.tencent.inputmethod.wetype.pinyin']).decode()})
 for code in [6,4,31,45,5,13,14,45]: key(code)
 c("return {value:document.querySelector('#global-search-input').value,events:imeEvents,dialog:document.querySelector('#global-search').open}")
 key(49)
 w("document.querySelector('#global-search-input').value==='中文' && imeEvents.some(e=>e.type==='compositionend'&&e.data==='中文'&&e.isTrusted)")
 c("return {value:document.querySelector('#global-search-input').value,events:imeEvents,dialog:document.querySelector('#global-search').open}")
 # Candidate handling and Escape must remain owned by the actual input method.
 key(0,' using command down');key(51)
 for code in [45,34,4,0,31]:key(code)
 w("imeEvents.filter(e=>e.type==='compositionstart'&&e.isTrusted).length>=2")
 key(53)
 escapeKeptOpen=c("return document.querySelector('#global-search').open");log.append({'imeEscapeKeptDialogOpen':escapeKeptOpen})
 assert escapeKeptOpen, 'IME cancellation Escape dismissed search'
 key(53);w("!document.querySelector('#global-search').open");key(40,' using command down');w("document.activeElement.id==='global-search-input'")
 c("return {afterCompositionEscape:document.querySelector('#global-search-input').value,events:imeEvents}")
 
 key(0,' using command down');key(51)
 for code in [6,4,31,45,5,13,14,45]:key(code)
 key(125);key(36)
 w("document.querySelector('#global-search').open && imeEvents.filter(e=>e.type==='compositionend'&&e.isTrusted).length>=3")
 c("return {afterCandidateDownEnter:document.querySelector('#global-search-input').value,events:imeEvents}")
 log.append({'restoreABCForEditing':subprocess.check_output([str(helper),'com.apple.keylayout.ABC']).decode()})
 key(0,' using command down');key(51)
 for code in [37,0,17,14,45,8,16]:key(code)
 w("document.querySelector('#global-search-input').value==='latency'")
 key(0,' using command down');key(8,' using command down')
 assert subprocess.check_output(['pbpaste']).decode()=='latency'
 log.append({'nativeSelectAllCopyReadback':'latency'})
 key(7,' using command down');w("document.querySelector('#global-search-input').value===''")
 key(9,' using command down');w("document.querySelector('#global-search-input').value==='latency'")
 key(6,' using command down');w("document.querySelector('#global-search-input').value===''")
 key(9,' using command down');w("document.querySelector('#global-search-input').value==='latency'")
 key(123,' using command down');w("document.querySelector('#global-search-input').selectionStart===0")
 key(124,' using {command down, shift down}');key(8,' using command down')
 assert subprocess.check_output(['pbpaste']).decode()=='latency'
 log.append({'nativeLineSelectionCopyReadback':'latency'})
 key(124);key(51,' using option down');w("document.querySelector('#global-search-input').value===''")
 w("document.querySelector('#global-search').open && document.activeElement.id==='global-search-input'")
 c("return {finalEvents:imeEvents,focused:document.activeElement.id,open:document.querySelector('#global-search').open}")
 key(53);w("!document.querySelector('#global-search').open")
 (out/'native-ime-result.json').write_text(json.dumps({'passed':escapeKeptOpen,'imeEscapeKeptDialogOpen':escapeKeptOpen,'head':head,'inputMethod':'com.tencent.inputmethod.wetype.pinyin','initialInputSource':initial,'sourceHashes':hashes,'log':log},ensure_ascii=False,indent=2))
 print(('PASS' if escapeKeptOpen else 'FAIL IME Escape dismisses search; other checks completed:')+' actual Chinese IME composition/Space commit/Escape/candidate Down+Enter; OS editing select/copy/cut/paste/undo/line-selection/word-delete')
finally:
 subprocess.run([str(helper),initial],check=True)
 process.terminate();process.wait(timeout=10)
