# Issue 60 validation and blocked acceptance

## Scope and ancestry

Starting SHA and latest-main merge-base: `01dd405d472f12bcd7724a1ddfbc5d315d5641e7`.
Live native dependencies and textual blockers were both #59 and #55; both were closed before editing, with delivered code on this base through #72 (`1ff982d`) and #56 (`245c978`). The implementation follows parent PRD #57 and the content structure design.

Only issue #60 is implemented. Source opening uses exact paths/fingerprints or typed entity/revision identity, never title substitution. A moved or missing path remains unavailable until refreshed results supply current grounded evidence. Duplicate titles cannot select a replacement. Notes use the full-document reader with safe text highlighting at a grounded source line; formal records use their existing screens. No persistence schema or native assets were added.

Search retains its result DOM, expanded original text, query/scope, stable selection, scroll and focused control while the existing active-task leave lifecycle handles source navigation. Invocation state includes library context, initiative list/context/detail layout, note selection/caret and scroll. Protected editing modals retain exclusive ownership; a second competing search modal is not stacked over them.

## Automated execution

`tests/search-navigation-ui.mjs` extends the real application UI → native bridge adapter → isolated Swift file/SQLite harness seam. All corpus content and records are synthetic. It covers all four page origins and three destination types on desktop/393px; passage/full-document reading; typed records; retained expansion, selection and list scroll; dirty continue/discard/save/failed-save; moved/changed/missing exact paths; dismissed delayed source reads; and competing same-page opens/edits during both source opening and return. Existing search, lifecycle, workspace and revision suites remain required.

Final execution receipts and the exact reviewed head/base are recorded in the draft PR description; workspace command logs are `build/issue60-check.log`, `build/issue60-tests.log`, `build/issue60-ui.log` and `build/issue60-build.log`. Browser keyboard events and the real native storage/index adapter do not establish actual native keyboard/focus/clipboard acceptance.

## Native Mac blocker — acceptance is not passed

`python3 tests/native-search-navigation.py` builds an isolated Cocoa/WKWebView test app using production frontend assets and real native storage/index code. Its generated shell adds a test-only command channel and window-size/snapshot hooks. Planned source navigation uses native Return delivery; clipboard verification uses OS `pbpaste`.

Foreground System Events attempts used `osascript` to set the test process frontmost and send `key code 40 using command down`. WKWebView recorded no key events, `document.hasFocus()` stayed false, and Command+K did not open search. Making the test window key and its webview first responder did not establish delivery. See `native-foreground-attempt.json`.

The targeted fallback command was `orca computer hotkey --app pid:67045 --key CmdOrCtrl+K --no-screenshot --json`. It failed with `permission_denied`: the app had visible windows but no accessible AX window after 1500ms of retries. `orca computer permissions --json` reported both Accessibility and screenshot permission as granted. See `native-input-failure.txt` and `native-permissions.json`. No system permissions were toggled.

The coordinator requires maintainer desktop restoration before another native attempt. No waiver was granted. Actual final-head native lookup → open → return, native shortcut/focus restoration, OS clipboard, IME, and native narrow-layout acceptance are therefore blocked/unverified. Build success and DOM-driven checks are not substitutes.

## Reviews and remaining risks

Separate Standards and Spec review outcomes are recorded in the draft PR description. Review findings about opening/return request ownership, narrow initiative layout and editor selection were addressed with regressions. Two minor Standards suggestions are accepted for follow-up: the native probe duplicates existing setup to keep the new acceptance run independently invocable, and the reader reuses the search screen's safe highlighting routine to avoid a second rendering implementation. These do not alter storage or user behavior; extracting shared test setup/highlighting can be considered separately.

Human review remains required for actual Mac input/focus, reader source location and visual quality after desktop restoration. General Markdown reader compatibility and library redesign remain separate scopes. Native execution is a mandatory outstanding acceptance criterion, not a deferred platform check. Android-specific tests/builds, physical Android/SAF, standalone Syncthing and two-device transport checks were not run and remain deferred by user policy; none is reported passed. The branch must remain a draft and must not be merged or represented as accepted until the coordinator verifies the required native evidence.
