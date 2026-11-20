"""Issue 83 form journey using the maintained owned-window OS input route.

DOM commands inspect, seed draft text and name existing controls only. All
pointer/keyboard activation uses the external process-targeted OS sender.
"""
import json


def run(command, wait, click, key, state, log):
    def cycle(panel):
        controls = command("return [...document.querySelector("+json.dumps(panel)+").querySelectorAll('button,input,textarea,select,summary')].filter(n=>!n.disabled && n.tabIndex>=0 && n.checkVisibility() && !n.closest('[inert]')).map(n=>n.id||n.textContent)")
        start = command('return document.activeElement.id||document.activeElement.textContent')
        for direction in ['Tab', 'Shift+Tab']:
            visited = []
            for _ in controls:
                visited.append(command('return document.activeElement.id||document.activeElement.textContent'))
                key(direction)
                assert command('return document.querySelector('+json.dumps(panel)+').contains(document.activeElement)')
            assert command('return document.activeElement.id||document.activeElement.textContent') == start
            assert sorted(visited) == sorted(controls)
        log.append({'fullNativeCycle': panel, 'controls': controls})

    click('#new'); wait("document.activeElement.id==='capture-title'")
    state('capture-pointer'); cycle('#note-task-drawer')
    click('#note-task-drawer .primary'); wait("document.activeElement.id==='capture-title' && document.activeElement.getAttribute('aria-invalid')==='true'")
    state('capture-invalid')
    log.append({'setup': 'DOM seeds synthetic capture text and selection, not native typing evidence'})
    command("const n=document.querySelector('#capture-title');n.value='原文与草稿保留';n.dispatchEvent(new Event('input',{bubbles:true}));n.setSelectionRange(1,4)")
    key('Escape'); wait("!!document.querySelector('#task-leave-decision')")
    cycle('#task-leave-decision'); state('leave-keyboard'); key('Escape')
    wait("document.activeElement.id==='capture-title'")
    assert command("const n=document.querySelector('#capture-title');return n.value==='原文与草稿保留'&&n.selectionStart===1&&n.selectionEnd===4")
    key('Escape'); command("[...document.querySelectorAll('#task-leave-decision button')].find(n=>n.textContent==='放弃更改并离开').id='native-form-discard'")
    click('#native-form-discard'); wait("!document.querySelector('#note-task-drawer').open")
    # The surviving opener is focused; OS Tab/Shift+Tab establishes keyboard modality.
    key('Tab'); key('Shift+Tab'); key('Return'); wait("document.activeElement.id==='capture-title'")
    state('capture-keyboard'); key('Escape'); wait("!document.querySelector('#note-task-drawer').open")
    assert command("return document.activeElement.id==='new'")
    for nav, opener, panel, field in [('notes','library-create-topic','topic-drawer','topic-name'),('initiatives','initiative-new','initiative-drawer','initiative-title')]:
        click('[data-view='+nav+']'); wait("!document.querySelector('#"+opener+"').hidden")
        click('#'+opener); wait("document.activeElement.id==='"+field+"'")
        state(panel+'-pointer'); cycle('#'+panel)
        if nav == 'initiatives':
            click('#initiative-drawer details summary'); cycle('#'+panel)
        key('Escape'); wait("!document.querySelector('#"+panel+"').open")
        assert command("return document.activeElement.id==='"+opener+"'")
    click('[data-view=focus]'); command("[...document.querySelectorAll('.home-tools button')].find(n=>n.textContent==='全部行动').id='native-all-actions'")
    click('#native-all-actions'); click('#action-new'); wait("document.activeElement.id==='action-description'")
    state('action-pointer'); cycle('#action-drawer'); key('Escape')
    click('[data-view=notes]'); wait("!!document.querySelector('#items [data-path]')")
    click('#items [data-path]'); wait("!document.querySelector('#editor').hidden")
    click('#note-info-open'); wait("document.activeElement.id==='star'")
    state('metadata-pointer'); cycle('#note-info-drawer')
    click('#rename'); wait("document.activeElement.id==='note-location'")
    state('location-pointer'); cycle('#note-task-drawer'); key('Escape')
    log.append({'setup':'DOM positions surviving metadata opener; OS Tab/reverse Tab and Return establish keyboard opening'})
    command("document.querySelector('#note-info-open').focus()")
    key('Tab'); key('Shift+Tab'); key('Return'); wait("document.activeElement.id==='star'")
    state('metadata-keyboard'); key('Tab'); wait("document.activeElement.id==='rename'")
    key('Return'); wait("document.activeElement.id==='note-location'")
    state('location-keyboard'); key('Escape')
    wait("document.activeElement.id==='note-info-open'")
    assert command("return inputEvents.some(e=>e.type==='keydown'&&e.trusted)&&inputEvents.some(e=>e.type==='pointerdown'&&e.trusted)")
    log.append({'scope':'OS-injected pointer, Tab/Shift+Tab/Return/Escape; synthetic DOM text setup; no physical input or clipboard/input-source changes'})
