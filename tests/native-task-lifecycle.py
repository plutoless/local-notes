#!/usr/bin/env python3
"""Exercise production window-close and OS-menu quit without native test hooks."""
import argparse, hashlib, json, os, re, shutil, subprocess, time
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
args = parser.parse_args()
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=False)
evidence = out
window_probe = out/'owned-windows'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/native-owned-windows.swift','-o',str(window_probe)],check=True)
app = out / 'Task55Production.app'
shutil.copytree('dist/LocalNotes.app', app, dirs_exist_ok=True)
subprocess.run(['/usr/libexec/PlistBuddy', '-c', 'Set :CFBundleIdentifier dev.localnotes.validation.issue55production', str(app/'Contents/Info.plist')], check=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(app)], check=True)
hashes = {str(path.relative_to('web')): hashlib.sha256(path.read_bytes()).hexdigest() for path in Path('web').rglob('*') if path.is_file()}
assert all(hashlib.sha256((app/'Contents/Resources/web'/name).read_bytes()).hexdigest() == digest for name,digest in hashes.items())
(out/'source-hashes.json').write_text(json.dumps(hashes, indent=2)+'\n')
for folder in ['Sync', 'Private']: (out/folder).mkdir(exist_ok=True)
p = subprocess.Popen([str(app/'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT': str(out/'Sync'), 'LOCAL_NOTES_TEST_PRIVATE': str(out/'Private')}, stdout=open(out/'app.log', 'w'), stderr=subprocess.STDOUT)
(out/'pid').write_text(str(p.pid))
def ax(script, wait=True):
    args=['osascript', '-e', f'tell application "System Events" to tell (first application process whose unix id is {p.pid})', '-e', script, '-e', 'end tell']
    return subprocess.run(args, capture_output=True, text=True, check=True).stdout if wait else subprocess.Popen(args, stdout=open(out/'action.log','a'), stderr=subprocess.STDOUT)
def state(name=None):
    command=['orca','computer','get-app-state','--app',f'pid:{p.pid}','--json']
    response=subprocess.run(command,capture_output=True,text=True)
    result=json.loads(response.stdout)
    (out/'last-state-command.json').write_text(json.dumps(command)+'\n')
    (out/'last-state.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    if not result.get('ok'):
        if result.get('error',{}).get('code') in ['app_not_found','window_not_found']: raise LookupError(json.dumps(result,ensure_ascii=False))
        raise RuntimeError(json.dumps(result,ensure_ascii=False))
    if name: (evidence/name).write_text(json.dumps(result,ensure_ascii=False,indent=2))
    return result['result']['snapshot']['treeText']
def click(label, exits=False):
    tree=state(); match=re.search(r'^\s*(\d+) button '+re.escape(label)+r'$',tree,re.M);assert match,tree
    result=subprocess.run(['orca','computer','click','--app',f'pid:{p.pid}','--element-index',match[1],'--json'],capture_output=True,text=True)
    (out/('click-'+str(time.time_ns())+'.json')).write_text(result.stdout)
    if result.returncode:
        assert exits and p.wait(timeout=10)==0, result.stdout

def wait_text(text, name=None):
    for _ in range(80):
        try: tree=state()
        except LookupError:
            assert p.poll() is None, 'Native app exited before its window appeared'
            time.sleep(.1); continue
        if text in tree:
            if name: state(name)
            return tree
        time.sleep(.1)
    raise AssertionError(text+' not found: '+tree)
def launch():
    global p
    p = subprocess.Popen([str(app/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(out/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(out/'Private')},stdout=open(out/'app.log','a'),stderr=subprocess.STDOUT)
    wait_text('button 随手记')
def type_title(text):
    subprocess.run(['orca','computer','type-text','--app',f'pid:{p.pid}','--text',text,'--json'],capture_output=True,check=True)
    wait_text(text)
def close_window():
    ax(chr(10).join(['set frontmost to true','click (first button of window 1 whose subrole is "AXCloseButton")']))
def menu_quit():
    ax(chr(10).join(['set frontmost to true','click menu bar item "LocalNotes" of menu bar 1','click menu item "退出拾记" of menu 1 of menu bar item "LocalNotes" of menu bar 1']))
def cmd_q():
    ax(chr(10).join(['set frontmost to true','keystroke "q" using command down']))
def decision(name):
    tree=wait_text('button 保存并离开',name)
    for label in ['button 放弃更改并离开','button 继续编辑']: assert label in tree,tree
    assert tree.count('button 保存并离开')==1,tree
try:
    wait_text('button 随手记');click('随手记');type_title('关闭后明确放弃')
    close_window();decision('close-three-decisions.json');click('继续编辑')
    wait_text('关闭后明确放弃','continued-close.json');assert p.poll() is None
    menu_quit();decision('menu-three-decisions.json');click('放弃更改并离开',exits=True)
    assert p.wait(timeout=15)==0;assert not list((out/'Sync').rglob('*.md'))
    launch();click('随手记');tree=state('restarted-after-discard.json');assert '关闭后明确放弃' not in tree
    type_title('保存并退出的笔记');menu_quit();decision('save-menu-decisions.json');click('保存并离开',exits=True);assert p.wait(timeout=15)==0
    notes=list((out/'Sync/Notes').glob('*.md'));assert len(notes)==1;assert '保存并退出的笔记' in notes[0].read_text()
    launch();click('随手记');type_title('快捷键退出的草稿');cmd_q();decision('cmd-q-three-decisions.json')
    close_window();decision('reentrant-close-one-decision.json');click('继续编辑');wait_text('快捷键退出的草稿');assert p.poll() is None
    cmd_q();decision('cmd-q-discard-decisions.json');click('放弃更改并离开',exits=True);assert p.wait(timeout=15)==0
    launch();click('随手记');tree=state('restarted-after-cmdq-discard.json');assert '快捷键退出的草稿' not in tree
    click('取消');menu_quit();assert p.wait(timeout=15)==0
    assert len(list((out/'Sync/Notes').glob('*.md')))==1
    (out/'result.json').write_text(json.dumps({'productionAssets':True,'actualWindowClose':True,'actualMenuQuit':True,'osCommandQ':True,'continuePreservesDraft':True,'discardDoesNotReappearAfterRestart':True,'saveAndQuitPersistedOneNote':True,'reentrantCloseOneDecision':True,'cleanExitCodes': [0,0,0,0]},indent=2)+'\n')
    print('PASS production native close, menu quit, Cmd+Q, reentrant close, save/discard/continue and restart')
finally:
    if p.poll() is None: p.terminate();p.wait(timeout=10)
