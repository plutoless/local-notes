# Issue 34 library design adoption

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
