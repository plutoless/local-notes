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
m.OUT = Path.cwd() / 'build/native-issue32-integration'
m.APP = m.OUT / 'Actions32Integration.app'
evidence = Path('docs/validation/issue32/integration')
evidence.mkdir(parents=True, exist_ok=True)
# Reuse the existing probe, changing only its isolated bundle identity.
exec(inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue32integration'), m.__dict__)
if m.OUT.exists():
    raise RuntimeError('Use a fresh isolated integration fixture; existing evidence is retained')
m.OUT.mkdir(parents=True)
(m.OUT / 'Sync').mkdir()
(m.OUT / 'Private').mkdir()
(m.OUT / 'Sync/reference.md').write_text('# 隔离来源\n\n- [ ] 仅作为来源内容\n')
m.build()
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
    result = json.loads(subprocess.check_output(['orca', 'computer', 'get-app-state', '--app', 'dev.localnotes.validation.issue32integration', '--json']))
    assert result['ok'], result
    shutil.copy(result['result']['screenshot']['path'], evidence / (name + '.png'))

process = launch()
protected = None
try:
    w("!!document.querySelector('nav .active')")
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
    w("!!document.querySelector('nav .active')")
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
    (evidence / 'native-storage.json').write_text(json.dumps({'action': json.loads(protected.read_text()), 'source': (m.OUT / 'Sync/reference.md').read_text()}, ensure_ascii=False, indent=2) + '\n')
    print('PASS: combined-resource actual WKWebView assigned-action save, protected-file failed Back and retained draft, retry, context focus, process restart/readback and existing-action return; isolated sample/private storage and exact web-resource hashes')
finally:
    if protected and protected.exists():
        subprocess.run(['chflags', 'nouchg', str(protected)], check=True)
    process.terminate()
    process.wait(timeout=10)
