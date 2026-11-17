#!/usr/bin/env python3
"""Exercise unchanged shipped UI in an isolated Cocoa/WKWebView test host.

Reuse the existing file-command probe; only test instrumentation is compiled in.
No real notes, online requests, or production application identity are used.
"""
import importlib.util
import json
import os
import shutil
from pathlib import Path
import subprocess

spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
probe.OUT = probe.REPO / 'build/native-issue34'
probe.APP = probe.OUT / 'Library.app'
if probe.OUT.exists(): shutil.rmtree(probe.OUT)
probe.OUT.mkdir(parents=True, exist_ok=True)
root = probe.OUT / 'Sync'
root.mkdir(exist_ok=True)
(root / '资料.md').write_text('# 中文阅读资料\n\n## 本周记录\n\n保留原文与引用。\n\n- [ ] 核对资料\n')
probe.build()
subprocess.run(['/usr/libexec/PlistBuddy', '-c', 'Set :CFBundleIdentifier dev.localnotes.validation.issue34', str(probe.APP / 'Contents/Info.plist')], check=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(probe.APP)], check=True)

def launch():
    process = subprocess.Popen([str(probe.APP / 'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT': str(root), 'LOCAL_NOTES_TEST_PRIVATE': str(probe.OUT / 'Private'), 'REVIEW_PROBE': str(probe.OUT)}, stdout=open(probe.OUT / 'app.log', 'a'), stderr=subprocess.STDOUT)
    probe.wait("!!document.querySelector('#items .home-tools')")
    probe.command("document.querySelector('nav [data-view=notes]').click()")
    probe.wait("!!document.querySelector('#items .card')")
    probe.command("document.querySelector('#items .card').click()")
    probe.wait("!document.querySelector('#editor').hidden")
    return process

process = launch()
try:
    probe.command("document.querySelector('#body').value+='\\n本地保存验证';document.querySelector('#body').dispatchEvent(new Event('input'));document.querySelector('#note-save').click()")
    probe.wait("document.querySelector('#save-state').textContent==='已保存到本地'")
    assert '本地保存验证' in (root / '资料.md').read_text()
    root.rename(probe.OUT / 'Offline')
    probe.command("document.querySelector('#body').value+='\\n失败后重试';document.querySelector('#body').dispatchEvent(new Event('input'));document.querySelector('#back').click()")
    probe.wait("document.querySelector('#save-state').textContent.includes('未保存')")
    assert probe.command("return !document.querySelector('#editor').hidden && window.hasUnsavedChanges()")
    (probe.OUT / 'Offline').rename(root)
    probe.command("document.querySelector('#note-save').click()")
    probe.wait("document.querySelector('#save-state').textContent==='已保存到本地'")
    assert '失败后重试' in (root / '资料.md').read_text()
    probe.command("document.querySelector('#back').click()")
    probe.wait("document.activeElement.matches('#items .selected')")
    process.terminate()
    process.wait(timeout=10)
    process = launch()
    assert probe.command("return document.querySelector('#body').value.includes('失败后重试')")
    probe.command("document.querySelector('#mode').click()")
    assert probe.command("return !document.querySelector('#reading').hidden && document.querySelector('#title').readOnly")
    probe.command("document.querySelector('#reading input').click()")
    probe.wait("document.querySelector('#save-state').textContent==='已保存到本地'")
    assert '- [x] 核对资料' in (root / '资料.md').read_text()
    (probe.OUT / 'report.json').write_text(json.dumps({'host':'Cocoa/WKWebView', 'identity':'dev.localnotes.validation.issue34', 'saveReadback':True, 'failedSaveBlocksReturn':True, 'retryReadback':True, 'restartReadback':True, 'backFocus':True, 'readingCheckboxWriteback':True, 'inputMethod':'DOM events via evaluateJavaScript; not physical keyboard/pointer'}, indent=2))
    print('PASS: isolated native save, failure protection, retry, return focus, restart/readback, reading and checkbox writeback')
finally:
    process.terminate()
    process.wait(timeout=10)
