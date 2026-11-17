#!/usr/bin/env python3
"""Validate combined action/initiative resources in isolated actual WKWebView.

The existing test-only command channel drives DOM interactions; this does not
claim physical keyboard/pointer or VoiceOver coverage.
"""
import hashlib
import importlib.util
import inspect
import json
import os
from pathlib import Path
import shutil
import subprocess

spec = importlib.util.spec_from_file_location('probe', 'tests/native-candidate-review.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
phase = os.environ.get('ACTION_INTEGRATION_PHASE', 'integration')
assert phase in {'integration', 'library-integration'}
identity = 'dev.localnotes.validation.issue32' + phase.replace('-', '')
m.OUT = Path.cwd() / ('build/native-issue32-' + phase)
m.APP = m.OUT / 'Actions32Integration.app'
evidence = Path('docs/validation/issue32') / phase
evidence.mkdir(parents=True, exist_ok=True)
# Reuse the existing probe, changing only its isolated bundle identity.
exec(inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', identity), m.__dict__)
if m.OUT.exists():
    raise RuntimeError('Use a fresh isolated integration fixture; existing evidence is retained')
m.OUT.mkdir(parents=True)
(m.OUT / 'Sync').mkdir()
(m.OUT / 'Private').mkdir()
(m.OUT / 'Sync/reference.md').write_text('# 隔离来源\n\n- [ ] 仅作为来源内容\n')
m.build()
# Take deterministic WK snapshots through the same test-only command channel.
generated = m.OUT / 'main.swift'
generated.write_text(generated.read_text().replace('let wrapped =', '''if script == "__snapshot" {
                    self?.web.takeSnapshot(with: nil) { image, error in
                        if let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: reviewProbe.directory.appendingPathComponent("snapshot.png")) }
                        try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
                    }
                    return
                }
                let wrapped ='''))
subprocess.run(['swiftc', '-module-cache-path', 'build/swift-cache', str(generated), 'mac/AIService.swift', 'mac/ActionStorage.swift', 'mac/ActionIndex.swift', 'mac/ReferenceIndex.swift', 'mac/ReferenceScan.swift', '-lsqlite3', '-framework', 'Cocoa', '-framework', 'WebKit', '-o', str(m.APP / 'Contents/MacOS/LocalNotes')], check=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(m.APP)], check=True)
resources = m.APP / 'Contents/Resources/web'
hashes = {}
for source in Path('web').iterdir():
    if source.is_file():
        assert source.read_bytes() == (resources / source.name).read_bytes()
        hashes[source.name] = hashlib.sha256(source.read_bytes()).hexdigest()
(evidence / 'native-resource-hashes.json').write_text(json.dumps(hashes, indent=2))
c, w = m.command, m.wait
env = {**os.environ, 'LOCAL_NOTES_TEST_ROOT': str(m.OUT / 'Sync'), 'LOCAL_NOTES_TEST_PRIVATE': str(m.OUT / 'Private'), 'REVIEW_PROBE': str(m.OUT)}

def launch():
    return subprocess.Popen([str(m.APP / 'Contents/MacOS/LocalNotes')], env=env, stdout=open(m.OUT / 'app.log', 'a'), stderr=subprocess.STDOUT)

def record(name, expression):
    value = c('return ' + expression)
    (evidence / (name + '.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    return value

def snapshot(name):
    image = m.OUT / 'snapshot.png'
    image.unlink(missing_ok=True)
    c('__snapshot')
    assert image.is_file(), 'WK snapshot did not produce a fresh PNG'
    shutil.copy(image, evidence / (name + '.png'))

process = launch()
protected = None
try:
    w("!!document.querySelector('#items .home-tools')")
    c("document.querySelector('nav [data-view=initiatives]').click()")
    w("!document.querySelector('#initiative-tools').hidden")
    c("document.querySelector('#initiative-new').click()")
    w("!document.querySelector('#initiative-editor').hidden")
    c("const n=document.querySelector('#initiative-title');n.value='合并验证事项';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#initiative-form').requestSubmit()")
    w("document.querySelector('#initiative-save-state').textContent==='已保存到本地'")
    c("document.querySelector('#initiative-new-action').focus();document.querySelector('#initiative-new-action').click()")
    w("!document.querySelector('#action-editor').hidden")
    c("const n=document.querySelector('#action-description');n.value='合并后的原生行动';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#action-form').requestSubmit()")
    w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
    initial = record('native-saved', "({description:document.querySelector('#action-description').value,initiative:document.querySelector('#action-initiative').value,state:document.querySelector('#action-save-state').textContent})")
    assert initial['initiative']
    protected = next((m.OUT / 'Sync/LocalNotesData/actions').glob('*.json'))
    subprocess.run(['chflags', 'uchg', str(protected)], check=True)
    c("const n=document.querySelector('#action-description');n.value='合并后失败保留并重试';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#action-back').click()")
    w("document.querySelector('#action-save-state').textContent.includes('操作未完成')")
    failed = record('native-failed', "({description:document.querySelector('#action-description').value,initiative:document.querySelector('#action-initiative').value,visible:!document.querySelector('#action-editor').hidden,state:document.querySelector('#action-save-state').textContent,drafts:Object.keys(localStorage).filter(key=>key.startsWith('action-draft:'))})")
    assert failed['description'] == '合并后失败保留并重试' and failed['visible'] and failed['drafts']
    assert failed['initiative'] == initial['initiative']
    snapshot('native-failed')
    subprocess.run(['chflags', 'nouchg', str(protected)], check=True)
    c("document.querySelector('#action-form').requestSubmit()")
    w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
    assert json.loads(protected.read_text())['description'] == failed['description']
    c("document.querySelector('#action-back').click()")
    w("document.querySelector('#action-editor').hidden && document.activeElement.id==='initiative-new-action'")
    returned = record('native-return', "({title:document.querySelector('#initiative-title').value,actions:document.querySelector('#initiative-actions').textContent,focus:document.activeElement.id})")
    assert failed['description'] in returned['actions']
    process.terminate()
    process.wait(timeout=10)
    process = launch()
    w("!!document.querySelector('#items .home-tools')")
    c("document.querySelector('nav [data-view=initiatives]').click()")
    w("!!document.querySelector('[data-initiative-id]')")
    c("document.querySelector('[data-initiative-id]').click()")
    w("!!document.querySelector('#initiative-actions button')")
    c("document.querySelector('#initiative-actions button').focus();document.querySelector('#initiative-actions button').click()")
    w("!document.querySelector('#action-editor').hidden")
    restarted = record('native-restart', "({description:document.querySelector('#action-description').value,initiative:document.querySelector('#action-initiative').value,state:document.querySelector('#action-save-state').textContent})")
    assert restarted['description'] == failed['description'] and restarted['initiative'] == initial['initiative']
    c("document.querySelector('#action-back').click()")
    w("document.querySelector('#action-editor').hidden && !!document.activeElement.dataset.actionId")
    record('native-existing-action-return', "({focus:document.activeElement.dataset.actionId,context:document.querySelector('#workspace-title').textContent})")
    snapshot('native-restarted-context')
    if phase == 'library-integration':
        # Exercise changed source/capture resource paths on the combined library base.
        c("document.querySelector('nav [data-view=actions]').click()")
        w("!document.querySelector('#action-tools').hidden && document.querySelector('nav [data-view=actions]').classList.contains('active') && !!document.querySelector('#items .ui-row')")
        c("document.querySelector('#search').value='合并';document.querySelector('#search').dispatchEvent(new Event('input'))")
        w("!!document.querySelector('#items .ui-row')")
        c("document.querySelector('#items .ui-row').click()")
        w("!document.querySelector('#action-editor').hidden")
        c("document.querySelector('#action-add-source').click()")
        c("const path=document.querySelector('.source-path');path.value='reference.md';path.dispatchEvent(new Event('input',{bubbles:true}));const quote=document.querySelector('.source-quote');quote.value='仅作为来源内容';quote.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#action-form').requestSubmit()")
        w("document.querySelector('#action-save-state').textContent==='已保存到本地' && !!document.querySelector('.action-source > button')")
        c("document.querySelector('.action-source > button').focus();document.querySelector('.action-source > button').click()")
        w("!document.querySelector('#editor').hidden && document.querySelector('#file-path').textContent==='reference.md'")
        source = m.OUT / 'Sync/reference.md'
        subprocess.run(['chflags', 'uchg', str(source)], check=True)
        try:
            c("document.querySelector('#body').value+='\\n合并后来源保存';document.querySelector('#body').dispatchEvent(new Event('input'));document.querySelector('#back').click()")
            w("document.querySelector('#save-state').textContent.includes('未保存')")
            assert c("return !document.querySelector('#editor').hidden && window.hasUnsavedChanges()")
            record('native-source-failed-return', "({state:document.querySelector('#save-state').textContent,body:document.querySelector('#body').value,visible:!document.querySelector('#editor').hidden})")
        finally:
            subprocess.run(['chflags', 'nouchg', str(source)], check=True)
        c("document.querySelector('#note-save').click()")
        w("document.querySelector('#save-state').textContent==='已保存到本地'")
        assert '合并后来源保存' in source.read_text()
        c("if (!document.querySelector('#notice').hidden) document.querySelector('#notice button').click()")
        c("document.querySelector('#back').click()")
        w("!document.querySelector('#action-editor').hidden && document.activeElement.id==='action-description'")
        source_return = record('native-source-return', "({description:document.querySelector('#action-description').value,search:document.querySelector('#search').value,focus:document.activeElement.id})")
        assert source_return['description'] == failed['description'] and source_return['search'] == '合并'
        c("document.querySelector('#new').click()")
        w("!document.querySelector('#capture-return').hidden && !document.querySelector('#editor').hidden")
        c("document.querySelector('#title').value='合并随手记';document.querySelector('#title').dispatchEvent(new Event('input'));document.querySelector('#body').value='保留行动返回上下文';document.querySelector('#body').dispatchEvent(new Event('input'));document.querySelector('#capture-return').click()")
        w("!document.querySelector('#action-editor').hidden && document.querySelector('#capture-return').hidden")
        capture_return = record('native-capture-return', "({description:document.querySelector('#action-description').value,search:document.querySelector('#search').value,activeView:document.querySelector('nav .active')?.dataset.view})")
        assert capture_return['description'] == failed['description']
        assert capture_return['activeView'] == 'actions'
        snapshot('native-source-capture-return')
    (evidence / 'native-storage.json').write_text(json.dumps({'action': json.loads(protected.read_text()), 'source': (m.OUT / 'Sync/reference.md').read_text()}, ensure_ascii=False, indent=2) + '\n')
    print('PASS: source/capture paths included when phase is library-integration; combined-resource actual WKWebView assigned-action save, protected-file failed Back and retained draft, retry, context focus, process restart/readback and existing-action return; isolated sample/private storage and exact web-resource hashes')
finally:
    if protected and protected.exists():
        subprocess.run(['chflags', 'nouchg', str(protected)], check=True)
    process.terminate()
    process.wait(timeout=10)
