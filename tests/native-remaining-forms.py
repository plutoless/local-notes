#!/usr/bin/env python3
"""Isolated Cocoa/WKWebView journeys; production termination is tested separately.

The test-only file channel inspects DOM state and enters long fixture text. Orca
AX opens capture; OS keyboard input exercises Escape and both Tab boundaries.
Snapshots use settled native WebKit rendering, never a browser approximation.
"""
import argparse, hashlib, importlib.util, inspect, json, os, re, shutil, sqlite3, subprocess, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
parser = argparse.ArgumentParser()
parser.add_argument('--phase', choices=['before', 'after'], default='after')
parser.add_argument('--output', required=True)
args = parser.parse_args()
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=False)
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = output; m.APP = output/'Forms48.app'
for folder in ['Sync', 'Private']: (output/folder).mkdir()
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue48'+args.phase)
exec(source, m.__dict__); m.build()
generated = output/'main.swift'
generated.write_text(generated.read_text().replace('let wrapped =', '''if script == "__snapshot" {
 self?.web.takeSnapshot(with: nil) { image, error in
  if let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: reviewProbe.directory.appendingPathComponent("snapshot.png")) }
  try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
 }; return
}
if script.hasPrefix("__size ") {
 let parts = script.split(separator: " ")
 // Only this validation window permits a 340px content-height stress case.
 self?.window.minSize = NSSize(width: 380, height: 300)
 self?.window.setContentSize(NSSize(width: Int(parts[1])!, height: Int(parts[2])!))
 try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json")); return
}
let wrapped ='''))
subprocess.run(['swiftc', '-module-cache-path', 'build/swift-cache', str(generated), 'mac/AIService.swift', 'mac/ActionStorage.swift', 'mac/ActionIndex.swift', 'mac/ReferenceIndex.swift', 'mac/ReferenceScan.swift', '-lsqlite3', '-framework', 'Cocoa', '-framework', 'WebKit', '-o', str(m.APP/'Contents/MacOS/LocalNotes')], check=True)
assets = Path('build/issue48-base/web' if args.phase == 'before' else 'web')
shutil.copytree(assets, m.APP/'Contents/Resources/web', dirs_exist_ok=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(m.APP)], check=True)
hashes = {str(p.relative_to(assets)): hashlib.sha256(p.read_bytes()).hexdigest() for p in assets.rglob('*') if p.is_file()}
assert all(hashlib.sha256((m.APP/'Contents/Resources/web'/name).read_bytes()).hexdigest() == digest for name,digest in hashes.items())
(output/'source-hashes.json').write_text(json.dumps(hashes, indent=2)+'\n')
transcript = []; process = None

def c(script):
    value = m.command(script)
    transcript.append({'script': script, 'value': value})
    (output/'commands.json').write_text(json.dumps(transcript, ensure_ascii=False, indent=2)+'\n')
    return value

def w(expression):
    m.wait(expression)
    transcript.append({'assertion': expression, 'passed': True})
    (output/'commands.json').write_text(json.dumps(transcript, ensure_ascii=False, indent=2)+'\n')

def launch():
    global process
    process = subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT': str(output/'Sync'), 'LOCAL_NOTES_TEST_PRIVATE': str(output/'Private'), 'REVIEW_PROBE': str(output)}, stdout=open(output/'app.log', 'a'), stderr=subprocess.STDOUT)
    (output/'pid').write_text(str(process.pid))
    w("document.querySelector('#index-state')?.textContent === ''")

def ax(action, *arguments, screenshot=False, allow_timeout=False):
    command = ['orca', 'computer', action, '--app', f'pid:{process.pid}', *map(str,arguments), '--json']
    if not screenshot and action != 'list-windows': command.append('--no-screenshot')
    response = subprocess.run(command, capture_output=True, text=True)
    value = json.loads(response.stdout)
    transcript.append({'command': command, 'response': value})
    (output/'commands.json').write_text(json.dumps(transcript, ensure_ascii=False, indent=2)+'\n')
    assert value.get('ok') or (allow_timeout and value.get('error',{}).get('code') == 'action_timeout'), value
    return value

def click(label):
    tree = ax('get-app-state')['result']['snapshot']['treeText']
    indices = re.findall(r'^\s*(\d+) button '+re.escape(label)+r'$', tree, re.M)
    assert len(indices) == 1, (label, tree)
    ax('click', '--element-index', indices[0])

def fill(selector, value):
    c('const n=document.querySelector('+json.dumps(selector)+');n.value='+json.dumps(value)+';n.dispatchEvent(new Event("input",{bubbles:true}))')

def open_control(selector):
    c('const n=document.querySelector('+json.dumps(selector)+');n.focus();n.click()')

def key(code, modifiers=''):
    lines = [f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true', f'tell application "System Events" to key code {code}'+modifiers]
    subprocess.run(['osascript', *sum((['-e',line] for line in lines), [])], check=True)
    transcript.append({'nativeKeyCode': code, 'modifiers': modifiers})

def shot(task, width, height=800, scroll=False):
    c(f'__size {width} {height}'); w(f'innerWidth === {width} && innerHeight === {height}')
    c("await document.fonts.ready;await new Promise(resolve=>setTimeout(resolve,250))")
    if scroll: c("const body=document.querySelector('dialog[open] .ui-drawer-body');body.scrollTop=body.scrollHeight")
    before = c("return [...document.querySelectorAll('dialog[open]')].map(n=>n.getBoundingClientRect().toJSON())")
    time.sleep(.4)
    assert before == c("return [...document.querySelectorAll('dialog[open]')].map(n=>n.getBoundingClientRect().toJSON())"), 'Unsettled task viewport'
    c('__snapshot'); shutil.copy(output/'snapshot.png', output/f'{args.phase}-native-{task}-{width}-{height}.png')
    assert c("return [...document.querySelectorAll('dialog[open] .ui-drawer-footer')].every(n=>n.getBoundingClientRect().bottom<=innerHeight)")

def views(task, scroll=True):
    for width,height in [(1180,800),(393,800),(393,340)]: shot(task,width,height,scroll)
    c('__size 1180 800')

try:
    launch()
    if args.phase == 'before':
        c("document.querySelector('#new').click()")
        w("!document.querySelector('#editor').hidden")
        for width in [1180,393]: shot('capture',width)
        c('__size 1180 800'); c("document.querySelector('[data-view=focus]').click()")
        w("!!document.querySelector('.home-tools')")
        c("[...document.querySelectorAll('.home-tools button')].find(n=>n.textContent==='全部行动').click()")
        w("!document.querySelector('#action-tools').hidden")
        c("document.querySelector('#action-new').click()")
        w("!document.querySelector('#action-editor').hidden")
        for width in [1180,393]: shot('action',width)
        c("document.querySelector('#action-discard').click();document.querySelector('[data-view=notes]').click()")
        w("!!document.querySelector('#items [data-path]')")
        c("document.querySelector('#items [data-path]').click()")
        w("!document.querySelector('#editor').hidden")
        c("document.querySelector('#note-details').open=true")
        for width in [1180,393]: shot('note-info',width)
        c('__size 1180 800'); c("document.querySelector('#rename').scrollIntoView({block:'center'})")
        tree = ax('get-app-state')['result']['snapshot']['treeText']
        index = re.search(r'^\s*(\d+) button 移动 / 改名$',tree,re.M)
        assert index, tree
        ax('click','--element-index',index[1],allow_timeout=True)
        time.sleep(.2)
        if len(ax('list-windows')['result']['windows']) == 1:
            rect = c("return document.querySelector('#rename').getBoundingClientRect().toJSON()")
            ax('click','--x',rect['x']+rect['width']/2,'--y',rect['y']+rect['height']/2+32,'--restore-window',allow_timeout=True)
        prompt = None
        for _ in range(30):
            windows = ax('list-windows')['result']['windows']
            prompt = next((window for window in windows if window['title'] == ''),None)
            if prompt: break
            time.sleep(.1)
        assert prompt, windows
        response = ax('get-app-state','--window-id',prompt['id'],screenshot=True)
        assert '取消' in response['result']['snapshot']['treeText']
        shutil.copy(response['result']['screenshot']['path'],output/'before-native-location-prompt.png')
        subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to click button "取消" of window 1'],check=True)
    else:
        # Home -> new action -> real save -> return -> reopen from the action list.
        open_control('.home-tools .primary'); w("document.querySelector('#action-drawer').open")
        fill('#action-description','原生首页行动48'); c("document.querySelector('#action-form').requestSubmit()")
        w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
        c("document.querySelector('#action-back').click()"); w("!document.querySelector('#action-drawer').open")
        assert c("return document.activeElement===document.querySelector('.home-tools .primary')")
        c("[...document.querySelectorAll('.home-tools button')].find(n=>n.textContent==='全部行动').click()")
        w("!!document.querySelector('#items [data-entity-id]')")
        open_control('#items [data-entity-id]'); w("document.querySelector('#action-drawer').open")
        assert c("return document.querySelector('#action-description').value==='原生首页行动48'")
        views('action')
        c("document.querySelector('#action-back').click()"); w("!document.querySelector('#action-drawer').open")
        assert c("return !!document.activeElement.dataset.entityId")
        # Clean cancel writes nothing; dirty input survives a real process restart.
        click('随手记'); w("document.querySelector('#note-task-drawer').open")
        c("document.querySelector('#note-task-drawer .ui-drawer-footer button').click()")
        w("!document.querySelector('#note-task-drawer').open")
        assert not list((output/'Sync').rglob('*.md'))
        click('随手记'); w("document.querySelector('#note-task-drawer').open")
        click('创建笔记'); w("document.querySelector('#note-task-status').textContent.includes('内容需要核对')")
        fill('#capture-title','原生笔记48'); fill('#capture-body','保留原生正文与恢复保护。'*80)
        # WebKit flushes localStorage asynchronously. Observe the private backing
        # row before testing recovery; an immediate forced kill is not durable.
        draft_key = c("return Object.keys(localStorage).find(key=>key.startsWith('capture-draft:') && JSON.parse(localStorage.getItem(key))['capture-path']===document.querySelector('#capture-path').value)")
        persisted = False
        for _ in range(50):
            for database in (Path.home()/('Library/WebKit/dev.localnotes.validation.issue48'+args.phase)).rglob('localstorage.sqlite3'):
                with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as connection:
                    row = connection.execute('SELECT length(value) FROM ItemTable WHERE key=?',(draft_key,)).fetchone()
                    persisted = bool(row and row[0] > 0)
            if persisted: break
            time.sleep(.1)
        assert persisted, 'Private WebKit draft did not reach disk'
        transcript.append({'nativePrivateDraftObservedOnDisk': True})
        process.terminate(); process.wait(timeout=10); launch()
        click('随手记'); w("document.querySelector('#note-task-drawer').open")
        assert c("return document.querySelector('#capture-title').value==='原生笔记48' && document.querySelector('#note-task-status').textContent.includes('已恢复')")
        key(53); w("!document.querySelector('#note-task-drawer .draft-guard').hidden")
        click('继续编辑'); w("document.activeElement.id==='capture-title'")
        c("document.querySelector('#note-task-drawer .primary').focus()")
        key(48); w("document.activeElement===document.querySelector('#note-task-drawer .ui-drawer-header button')")
        key(48,' using shift down'); w("document.activeElement===document.querySelector('#note-task-drawer .primary')")
        views('capture')
        # A real conflicting file exercises a failed create and non-destructive retry.
        path = output/'Sync'/c("return document.querySelector('#capture-path').value")
        path.parent.mkdir(parents=True,exist_ok=True); path.write_text('Owned conflicting fixture')
        click('创建笔记'); w("document.querySelector('#note-task-status').textContent.includes('未保存的编辑仍保留')")
        assert path.read_text() == 'Owned conflicting fixture'
        assert c("return document.querySelector('#capture-title').value==='原生笔记48'")
        path.rename(output/'Private/conflicting-fixture.md')
        click('创建笔记'); w("!document.querySelector('#note-task-drawer').open && !document.querySelector('#editor').hidden")
        assert '原生笔记48' in path.read_text()
        c("document.querySelector('#back').click();document.querySelector('[data-view=notes]').click()")
        w("!document.querySelector('#library-tools').hidden")
        c("document.querySelector('#library-create-topic').click()"); w("document.querySelector('#topic-drawer').open")
        fill('#topic-name','原生关联主题48'); c("document.querySelector('#topic-drawer form').requestSubmit()")
        w("!document.querySelector('#topic-drawer').open")
        c("document.querySelector('[data-view=notes]').click()"); w("!!document.querySelector('#items [data-path]')")
        open_control('#items [data-path]'); w("!document.querySelector('#editor').hidden")
        c("window.nativeContext={search:document.querySelector('#search').value,scroll:document.querySelector('.collection').scrollTop}")
        open_control('#note-info-open'); w("document.querySelector('#note-info-drawer').open")
        c("document.querySelector('#note-topics input').click()")
        w("!document.querySelector('#note-topics').inert && document.querySelector('#note-topics input').checked")
        views('note-info')
        c('__size 393 340'); c("document.querySelector('#note-info-drawer .ui-drawer-footer button').click()")
        w("!document.querySelector('#note-info-drawer').open")
        assert c("return document.activeElement.id==='note-info-open' && document.querySelector('#search').value===nativeContext.search && document.querySelector('.collection').scrollTop===nativeContext.scroll")
        c('__size 1180 800'); open_control('#note-info-open'); w("document.querySelector('#note-info-drawer').open")
        c("document.querySelector('#rename').click()"); w("document.querySelector('#note-task-drawer').open && !document.querySelector('#note-info-drawer').open")
        views('location')
        fill('#note-location','../invalid.md'); c("document.querySelector('#note-task-form').requestSubmit()")
        w("document.querySelector('#note-task-status').textContent.includes('路径无效')")
        fill('#note-location','Notes/原生移动48.md'); c("document.querySelector('#note-task-form').requestSubmit()")
        w("!document.querySelector('#note-task-drawer').open")
        assert (output/'Sync/Notes/原生移动48.md').exists()
        revisions = [json.loads(p.read_text()) for p in (output/'Sync/LocalNotesData/revisions').rglob('*.json')]
        assert any('Notes/原生移动48.md' in json.dumps(v,ensure_ascii=False) for v in revisions)
        # Initiative -> action create/edit -> return, then retained long document task.
        c("document.querySelector('[data-view=initiatives]').click()"); w("!document.querySelector('#initiative-tools').hidden")
        open_control('#initiative-new'); w("document.querySelector('#initiative-drawer').open")
        fill('#initiative-title','原生事项48'); fill('#initiative-progress','保持返回上下文')
        c("document.querySelector('#initiative-form').requestSubmit()"); w("!document.querySelector('#initiative-drawer').open")
        open_control('#items [data-initiative-id]'); w("document.querySelector('#workspace-title').textContent==='原生事项48'")
        open_control('#initiative-new-action'); w("document.querySelector('#action-drawer').open")
        fill('#action-description','原生事项行动48'); c("document.querySelector('#action-form').requestSubmit()")
        w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
        c("document.querySelector('#action-back').click()"); w("!document.querySelector('#action-drawer').open")
        assert c("return document.activeElement.id==='initiative-new-action'")
        open_control('[data-action-id]'); w("document.querySelector('#action-drawer').open")
        fill('#action-description','原生事项行动编辑48'); c("document.querySelector('#action-form').requestSubmit()")
        w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
        c("document.querySelector('#action-back').click()"); w("!document.querySelector('#action-drawer').open")
        assert c("return document.querySelector('[data-action-id]').textContent.includes('原生事项行动编辑48')")
        open_control('#initiative-new-note'); w("!document.querySelector('#editor').hidden")
        fill('#title','原生事项笔记48'); fill('#body','长篇文档仍在事项工作区编辑。')
        c("document.querySelector('#note-save').click()"); w("document.querySelector('#save-state').textContent==='已保存到本地'")
        for width in [1180,393]: shot('initiative-document',width)
        c('__size 1180 800'); c("document.querySelector('#back').click()")
        w("document.querySelector('#editor').hidden && document.querySelector('#workspace-title').textContent==='原生事项48'")
        open_control('#workspace-notes [data-path]'); w("!document.querySelector('#editor').hidden")
        assert c("return document.querySelector('#body').value==='长篇文档仍在事项工作区编辑。'")
        fill('#body','长篇文档仍在事项工作区编辑。再次编辑已保存。')
        c("document.querySelector('#note-save').click()"); w("document.querySelector('#save-state').textContent==='已保存到本地'")
        c("document.querySelector('#back').click()"); w("document.querySelector('#editor').hidden")
        assert any('再次编辑已保存。' in p.read_text() for p in (output/'Sync').rglob('*.md'))
    result = {'passed': True, 'phase': args.phase, 'engine': 'Cocoa/WKWebView', 'productionTermination': 'separate uninstrumented test', 'input': 'Orca AX capture open; native OS Escape/Tab/Shift+Tab; controlled DOM for remaining fixture entry and assertions' if args.phase == 'after' else 'Native AX/pointer naming prompt; controlled DOM baseline entry and snapshots', 'reducedHeight': 'test-only minimum window size override; production minimum remains unchanged', 'screenshotCount': len(list(output.glob('*.png')))-1}
    (output/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print('PASS native '+args.phase+' remaining-form journeys and settled captures')
finally:
    if process and process.poll() is None: process.terminate(); process.wait(timeout=10)
