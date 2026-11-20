#!/usr/bin/env python3
"""Issue 65: exclusively granted, owned-window OS keyboard acceptance.

Reuse the delivered browse probe's read-only window constructor/route recorder;
DOM is used only for fixture setup, instrumentation, and explicit focus setup.
"""
import ast, hashlib, importlib.util, inspect, json, os, shutil, subprocess, time
from pathlib import Path
REPO = Path(__file__).resolve().parents[1]
OUT = REPO / 'build/issue65-keyboard'
EVIDENCE = REPO / os.environ.get('ISSUE65_EVIDENCE', 'docs/validation/issue65/integration/native')
build_only = '--build-only' in __import__('sys').argv
if not build_only and not os.environ.get('ISSUE65_GUI_GRANT'):
    raise SystemExit('Explicit exclusive coordinator GUI grant required; no app activated or input posted')
OUT.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('probe', REPO/'tests/native-candidate-review.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = OUT; m.APP = OUT/'Library65Keyboard.app'
# Read literal shared instrumentation without executing the sibling journey.
shared = ast.parse((REPO/'tests/native-browse-focus.py').read_text())
for node in shared.body:
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ['EXTRA', 'ROUTE_RECORDER'] for t in node.targets):
        m.__dict__[node.targets[0].id] = ast.literal_eval(node.value)
m.__dict__['EXTRA'] = m.__dict__['EXTRA'].replace('"active":NSApp.isActive,', '"active":NSApp.isActive,"frontmostPID":NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1,')
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue65keyboard')
source = source.replace('generated=OUT/\'main.swift\';generated.write_text(source)', "generated=OUT/'main.swift';generated.write_text(source.replace('let wrapped =', EXTRA+'let wrapped =').replace('let reviewProbe = ReviewProbe()', ROUTE_RECORDER+'\\nlet reviewProbe = ReviewProbe()'))")
exec(source, m.__dict__); m.build()
sender = OUT/'native-browse-input'
subprocess.run(['swiftc', str(REPO/'tests/native-browse-input.swift'), '-o', str(sender)], check=True)
window_observer = OUT/'native-owned-windows'
subprocess.run(['swiftc', str(REPO/'tests/native-owned-windows.swift'), '-o', str(window_observer)], check=True)
environment = OUT/'native-library-environment'
subprocess.run(['swiftc', str(REPO/'tests/native-library-environment.swift'), '-o', str(environment)], check=True)
if build_only:
    print('PASS build-only; no app launched, activated, or input posted'); raise SystemExit(0)
EVIDENCE.mkdir(parents=True, exist_ok=True)
for name in ['Sync', 'Private']:
    if (OUT/name).exists(): shutil.rmtree(OUT/name)
    (OUT/name).mkdir()
for i in range(127):
    p = OUT/'Sync'/('Archive' if i < 61 else 'Current')/f'{i:03}.md'
    p.parent.mkdir(exist_ok=True); p.write_text(f'# Repeated title\n\nSynthetic source {i}\n\n'+('Readable source context.\n'*80)); os.utime(p, (1000,1000))
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
original = {str(p.relative_to(OUT/'Sync')):digest(p) for p in (OUT/'Sync').rglob('*.md')}
input_code = 'import Carbon\nlet s=TISCopyCurrentKeyboardInputSource().takeRetainedValue()\nprint(Unmanaged<CFString>.fromOpaque(TISGetInputSourceProperty(s,kTISPropertyInputSourceID)).takeUnretainedValue())'
def input_source(): return subprocess.check_output(['swift','-e',input_code],text=True).strip()
# No input-source switch or copy/paste operation occurs in this journey.
initial_input = input_source(); clipboard_hash = hashlib.sha256(subprocess.check_output(['pbpaste'])).hexdigest()
private_snapshot = OUT/'environment-private.json'
environment_saved = json.loads(subprocess.check_output([str(environment), 'save', str(private_snapshot)], text=True))
report = {'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(), 'base':subprocess.check_output(['git','merge-base','HEAD','origin/main'],text=True).strip(), 'grant':os.environ['ISSUE65_GUI_GRANT'], 'inputSourceBefore':initial_input, 'environmentSaved':environment_saved, 'events':[], 'states':[]}
report['bindings'] = {'application':str(m.APP), 'bundleIdentifier':'dev.localnotes.validation.issue65keyboard', 'executable':digest(m.APP/'Contents/MacOS/LocalNotes'), 'generatedHost':digest(OUT/'main.swift'), 'probe':digest(Path(__file__)), 'senderSource':digest(REPO/'tests/native-browse-input.swift'), 'senderExecutable':digest(sender), 'environmentSource':digest(REPO/'tests/native-library-environment.swift'), 'environmentExecutable':digest(environment), 'nativeSources':{str(p):digest(p) for p in (REPO/'mac').glob('*.swift')}, 'web':{p.name:{'source':digest(p),'package':digest(m.APP/'Contents/Resources/web'/p.name),'productionPackage':digest(REPO/'dist/LocalNotes.app/Contents/Resources/web'/p.name)} for p in (REPO/'web').iterdir() if p.is_file()}}
assert all(len(set(v.values()))==1 for v in report['bindings']['web'].values())
c,w = m.command,m.wait
process = None

def state(name):
    value=c("const n=document.activeElement;return {active:n.id||n.dataset.path,focusVisible:n.matches(':focus-visible'),collection:document.querySelector('.collection').scrollTop,list:document.querySelector('#items').scrollTop,page:document.querySelector('#library-page').textContent,order:document.querySelector('#library-order').value,archives:document.querySelector('#library-archives').value}")
    report['states'].append({'name':name, **value}); return value

def key(name):
    host=c('__host'); before=c('__route')
    assert host['frontmostPID']==process.pid and host['windowNumber']==window and host['active'] and host['key'] and host['visible'] and not host['occluded'] and c('return document.hasFocus()'), 'Lost exclusive owned recipient; nothing posted'
    c('window.expectedKeyTarget=document.activeElement'); previous=c('return nativeKeys.length')
    payload=c('__events:'+json.dumps({'key':name}))
    assert len(payload['roundtrip'])==2 and all(e['window']==window and e['resolvedWindow'] for e in payload['roundtrip'])
    result=subprocess.run([str(sender),str(process.pid),str(window),'post'],input=json.dumps(payload),capture_output=True,text=True)
    report['events'].append({'key':name,'host':host,'recipientPID':process.pid,'window':window,'constructor':payload['roundtrip'],'senderExit':result.returncode,'sender':result.stdout})
    assert result.returncode==0, 'Sender failed; no replay'
    expected={'Tab':'Tab','Shift+Tab':'Tab','Return':'Enter','Escape':'Escape'}[name]
    for _ in range(20):
        events=c(f'return nativeKeys.slice({previous})')
        if any(e['trusted'] and e['key']==expected and e['expectedTarget'] for e in events): break
        time.sleep(.05)
    route=c('__route'); cocoa=route['cocoa'][len(before['cocoa']):]
    report['events'][-1].update(trustedDOM=events,cocoa=cocoa,quartz=route['quartz'][len(before['quartz']):])
    assert any(e['trusted'] and e['key']==expected and e['expectedTarget'] and e['shift']==(name=='Shift+Tab') and not e['meta'] and not e['ctrl'] and not e['alt'] for e in events), 'Intended trusted keyboard recipient unverified; no replay'
    assert cocoa and all(e['window']==window for e in cocoa), 'Exact native window delivery unverified'

def enter(selector):
    c('document.querySelector('+json.dumps(selector)+').focus({preventScroll:true})')
    key('Shift+Tab'); key('Tab')
    assert c('return document.activeElement===document.querySelector('+json.dumps(selector)+') && document.activeElement.matches(":focus-visible")')
    key('Return')

try:
    process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(OUT/'Private'),'REVIEW_PROBE':str(OUT)},stdout=open(OUT/'app.log','w'),stderr=subprocess.STDOUT)
    report['pid']=process.pid
    w("!!document.querySelector('.home-tools')"); c('__focus'); time.sleep(.5)
    window=c('__host')['windowNumber']; report['window']=window
    c("window.nativeKeys=[];document.addEventListener('keydown',e=>nativeKeys.push({key:e.key,trusted:e.isTrusted,shift:e.shiftKey,meta:e.metaKey,ctrl:e.ctrlKey,alt:e.altKey,expectedTarget:e.target===window.expectedKeyTarget,target:e.target.id||e.target.dataset.path}),true)")
    enter('[data-view=notes]')
    w("document.querySelectorAll('#items .card').length===50 && !document.querySelector('#library-progress').textContent")
    assert c("return [...document.querySelectorAll('#items .card')].every(n=>n.dataset.path.startsWith('Current/'))")
    # Control values are fixture setup; native Tab/Shift+Tab establish keyboard focus.
    c("document.querySelector('#library-order').value='title';document.querySelector('#library-order').dispatchEvent(new Event('change'));document.querySelector('#library-archives').value='only';document.querySelector('#library-archives').dispatchEvent(new Event('change'))")
    w("document.querySelector('#library-page').textContent.includes('61') && document.querySelectorAll('#items .card').length===50")
    c("document.querySelector('#library-archives').focus()"); key('Tab'); key('Shift+Tab')
    assert state('archive-control')['active']=='library-archives'
    first=c("return [...document.querySelectorAll('#items .card')].map(n=>n.dataset.path)")
    enter('#library-next')
    w("document.querySelector('#library-next').disabled && document.activeElement.id==='library-previous'")
    assert state('last-page-focus-handoff')['focusVisible']
    second=c("return [...document.querySelectorAll('#items .card')].map(n=>n.dataset.path)")
    assert len(first+second)==61 and len(set(first+second))==61
    c("document.querySelector('.collection').scrollTop=85;document.querySelector('#items').scrollTop=180;document.querySelectorAll('#items .card')[5].focus()")
    key('Tab'); key('Shift+Tab')
    before=state('selected-source-before-open'); target=c('return document.activeElement.dataset.path')
    assert target and before['focusVisible']
    key('Return'); w("!document.querySelector('#editor').hidden && !document.querySelector('#reading').hidden")
    assert c("return document.querySelector('#file-path').textContent")==target
    enter('#back')
    w('document.activeElement.dataset.path==='+json.dumps(target))
    after=state('source-return')
    assert after['focusVisible'] and after['list']==before['list'] and after['collection']==before['collection'] and after['order']=='title' and after['archives']=='only' and '51–61' in after['page']
    for width,height in [(1180,800),(393,852),(800,400)]:
        c(f'__size:{width},{height}'); time.sleep(.3)
        assert c('return document.documentElement.scrollWidth<=innerWidth')
        c('__snapshot'); shutil.copy(OUT/'native.png',EVIDENCE/f'return-{width}-{height}.png')
    assert original=={str(p.relative_to(OUT/'Sync')):digest(p) for p in (OUT/'Sync').rglob('*.md')}
    assert not list((OUT/'Sync').glob('LocalNotesData/revisions/*/*.json'))
    report.update(passed=True,uniquePagedResults=61,sourcePreserved=True,input='external process-targeted OS keyboard; DOM fixture/focus setup; no physical input')
finally:
    try:
        if process:
            process.terminate(); process.wait(timeout=10)
            try: os.kill(process.pid,0); absent=False
            except ProcessLookupError: absent=True
            owned_windows = json.loads(subprocess.check_output([str(window_observer), str(process.pid)], text=True))
            report['cleanup']={'pid':process.pid,'exit':process.returncode,'waitCompleted':True,'pidAbsent':absent,'remainingOwnedWindows':owned_windows}
    finally:
        report['environmentRestoration']=json.loads(subprocess.check_output([str(environment), 'restore', str(private_snapshot)], text=True))
        report['inputSourceAfter']=input_source()
        final_clipboard_hash=hashlib.sha256(subprocess.check_output(['pbpaste'])).hexdigest()
        report['inputAndClipboardRetained']=report['inputSourceAfter']==initial_input and final_clipboard_hash==clipboard_hash
        (EVIDENCE/'report.json').write_text(json.dumps(report,indent=2))
        assert report['inputAndClipboardRetained'], 'Input source or clipboard unexpectedly changed; coordinator action required'
        assert report.get('cleanup', {}).get('pidAbsent') and not report['cleanup']['remainingOwnedWindows'], 'Owned PID/window cleanup not established'
print('PASS owned-window native Library keyboard, paging, source-return and focus')
