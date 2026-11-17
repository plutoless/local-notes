# Issue 34 library design adoption

**Current delivery:** latest-main integration results below supersede the original source binding for this PR. Original captures and receipts are retained as historical evidence.

## Scope and baseline

Starting SHA and reviewed base: `45c6b5acb284c8fb3a3e1b16849387e645d46052`.
Live issue 34 has no comments; both textual and native dependencies identify issue 31, which is closed. PR 38 is merged at that SHA and the commit is an ancestor of fetched origin/main.

Retain direction 09 contextual workspace and direction 01 native light styling. Reuse `selectionRow`, `button`, `ui-action`, `ui-pagination`, `ui-field`, `ui-disclosure`, feedback and semantic tokens from issue 31. Closest examples are Focus row selection, shell search fields, capture Save, and catalogue control/selected/disabled states. No new shared primitive or variant is introduced. The library keeps bounded 50-row queries, existing SQLite/indexing, record revisions, source protections and Markdown line mapping.

## Content audit

| Content | Decision | Reason |
| --- | --- | --- |
| Note titles, excerpts, paths, dates and authored Markdown | Retain | Identify exact source and preserve user content |
| Directory/topic/favorite navigation and paging | Retain; adopt shared controls | Preserve bounded browsing with recognizable navigation |
| Repeated title in rendered Markdown | Retain existing visual suppression only | One visible title without changing source line numbers |
| Save, recovered draft, unavailable directory and conflict receipts | Retain | Persistence and uncertainty must stay visible |
| File path, move/rename, topic links, repair and initiative links | Keep in details | Secondary operations stay reachable outside reading flow |
| Checkbox versus confirmed-action explanation | Retain in details | Explains an important domain distinction |
| Decorative slogans / AI filler | No additions | No task need for decorative copy |
| Reading/editor title | Keep readable in both modes | Read-only instead of disabled avoids dimming authored title |

## Verification

Before captures use assets extracted from the starting SHA, with the same isolated synthetic fixture and browser test. After captures use current source. Browser captures live under `before/` and `after/`; these are Chromium with real Swift storage/SQLite adapter, not native screenshots.

`tests/library-ui.mjs` exercises search/no matches, empty collection, favorite and directory navigation, topic creation/rename/association, paging/loading/disabled, failure/retry, moves/link repair, conflict copy, recovered drafts, long Chinese and 393px overflow, keyboard focus, and selected-row/scroll restoration. `LIBRARY_EVIDENCE_DIR` isolates its output; `LIBRARY_ASSETS_DIR` is a baseline-only test override.

`tests/native-library-design.py` uses a distinct `dev.localnotes.validation.issue34` Cocoa/WKWebView host, private storage and synthetic notes under this worktree's build directory. Production assets are unchanged; test-only file-command instrumentation drives DOM events. Checks include local save/readback, unavailable-root failed save retaining dirty edits and blocking Back, explicit retry, Back focus, process restart/readback, read mode and exact checkbox writeback. It uses no network or paid service. Physical pointer/keyboard, IME and two-device end-to-end checks are unexecuted.

Android-specific tests/builds and standalone Syncthing tests are deferred by user decision. No device/transport result is inferred from browser or native host observations.

## Executed results and source binding

Final source commit: `5e0ea36e2e81281ff7242d2a99aa0fe8cdca8da6`. Subsequent delivery commits contain evidence only; no source or test changes. Logs in this directory were produced from the identical sources/tests. The final PR head therefore inherits these executed checks without substituting historical results.

- `npm run check`: passed all shared JavaScript syntax checks.
- `npm test`: 45 passed, 0 failed (includes local revision/conflict/index recovery and retry after partial association repair).
- `CHROME_PATH=... LIBRARY_EVIDENCE_DIR=docs/validation/issue34/after npm run test:ui`: all ten current UI scripts passed. Includes original source/initiative journeys and the added capture selection/scroll, action-source keyword/focus return, invalid topic input, 44px controls, and workspace-switch isolation checks. Browser input events and keyboard automation are distinct from native observations.
- `npm run build:mac`: passed, including ad hoc signing.
- `python3 tests/native-library-design.py`: passed actual Cocoa/WKWebView save, unavailable-root failure guard, retry, Back focus, process restart/readback, reading and checkbox writeback with isolated synthetic/private data.
- `git diff --check`: passed.
- Catalogue contrast measurements: normal text 12.64:1, muted 4.72:1, accent 5.22:1, interactive line 3.57:1, focus 4.98:1. No new palette; status tokens also passed. Library primary controls measured at least 44px. Long Chinese editor/library at 393px have no page overflow.

An earlier full UI attempt timed out finding a newly created initiative note's title; isolated baseline and changed-source reruns passed, and the final complete suite passed. No deterministic cause was established, and the earlier failure is not presented as a passing result. Expanded tests also exposed an unhandled late query rejection during workspace replacement; the library now discards stale errors and preserves loaded content with Chinese retry feedback for current query failures. Those tests pass after the fix.

## Reviews and remaining judgment

Separate Standards and Spec reviewers examined the starting-SHA diff. Initial findings were fixed: awaited topic submit disabling; shared selection duplication; screen-owned context seam; clearing source origins on workspace selection; action source keyword/scroll/focus fallback; capture selected-note restoration. No minor suggestion was left accepted without action. Final source reviews reported no remaining hard, functional or scope findings. Both reviewers also confirm the final evidence-inclusive head in the delivery report/PR.

Remaining risk: automated DOM/native-host checks cannot establish physical keyboard/IME, trackpad or assistive-technology comfort. Those checks and two-device transport end-to-end validation are unexecuted, while Android-specific and standalone Syncthing validation remain deferred. A maintainer may judge the restrained list density and physical native usability; no product or storage decision is required for this scoped implementation. Coordinator owns merge/issue closure.

## Latest-main integration after PR 39

Fetched main / comparison merge-base: `e89deb437a0fb69b63e5a5e399117729897e8c8c` (issue 33 / PR 39). Pre-integration issue 34 head: `3bee1d271e9aaa181bc3d64f71f06d2b6e0092c1`; original issue 34 start remains `45c6b5acb284c8fb3a3e1b16849387e645d46052`.

Merge commit: `9b35624b8b8db8e7db5c778b4793507854ae323f`. Conflicts were limited to `web/app.js` note Back/mode handlers and adjacent `web/style.css` additions. The merged handler retains initiative `restoreContext()` as well as library/source return context and read-only title behavior. Both stylesheet additions remain. Automatic merges retained initiative selection/rememberContext calls, shared initiative controls and distinct working/reference sections. No storage or other issue implementation was added.

Final source/test head: `e02b635a51e101df2dd7677ebaf9f917b87dd92d`; production resources match merge commit `9b35624`, with only an additional integration regression in the two following test commits. Subsequent commits contain evidence only. The test explicitly checks reference selection while reading, then note Back focus and scroll restoration into initiative context. Its first assertion incorrectly expected the reference to remain current after returning to the overview; the assertion was moved to the active note detail, matching existing issue 33 semantics without changing product behavior.

Fresh receipts are under `integrated/`:

- `npm run check`: passed shared syntax checks.
- `npm test`: 45 passed, 0 failed, including shared local conflict/revision and partial association retry coverage.
- Complete ten-script UI suite passed against combined production resources; the final test-head suite and the targeted workspace regression also passed. Library checks cover browse/capture selection, keyword/filter/scroll/focus, action-source return and workspace isolation. Initiative/workspace checks cover source-note return, working-note edits, action context, failed-save guards and context restoration. Capture, candidate and synchronization UI checks remain included.
- `npm run build:mac`: passed for combined resources.
- `python3 tests/native-library-design.py`: passed isolated issue34 WKWebView local save, unavailable-root save failure, blocked return, explicit retry, focus, restart/readback and checkbox writeback.
- `python3 tests/native-initiative-workspace.py`: passed isolated issue33 WKWebView assigned-action save/overview return, real filesystem failure/draft retention/retry, ending/independent retention/reopening and restart/readback. `initiative-native.png` is a fresh native WK snapshot of combined resources. Both runs use test-owned private/synthetic data and terminate only their own processes.
- Fresh library/393px and workspace screenshots accompany these receipts. Original baseline captures stay in `before/`; earlier evidence is not used as a substitute for this integrated run.

Independent Standards and Spec source reviews of the merge against `e89deb4` both found zero findings. Final evidence-inclusive head confirmations are recorded in PR40 and the coordinator handoff. No native physical keyboard/IME/pointer, VoiceOver, Android, standalone Syncthing, or two-device transport checks were newly executed; the existing validation boundaries remain unchanged. Coordinator owns release and issue closure.
