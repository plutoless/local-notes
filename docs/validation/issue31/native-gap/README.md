# Final-resource native failure/retry and restart verification

This follow-up closes the two native execution gaps recorded in `docs/validation/issue-31.md`. Application resources are unchanged from PR38 head `75a832a373b920a4d54b468b81c67e3557eaa35c`; this follow-up changes evidence only. Earlier statements that native failure injection and final-identity restart were unrun describe the earlier run and are superseded by the observations below.

## Identity and safe failure fixture

The existing final preview `build/issue31/Design31Final.app` uses bundle ID `dev.localnotes.validation.issue31final`. It was already running as PID 55723 with sample notes at `build/issue31/final/notes` and app-private storage at `build/issue31/final/private`. No application source, native bridge, user workspace, global setting or unrelated running app was changed.

`identity.json` records SHA-256 for all 17 shipped web files and the native executable. Every web file was byte-compared to `git show 75a832a:web/<file>` before interaction; all matched. The executable and web hashes were checked again after restart and are unchanged. The note used as the prior task was `Notes/note-1794900898174.md`; its original full text and SHA-256 are recorded separately from the capture.

1. Opened the prior note `最终原生随手记` in reading mode in actual WKWebView. `prior-task.json/png` records the unchanged title/body and reading context.
2. Used the shell's `随手记` control to create only the new isolated capture `Notes/note-1794901384099.md`. Its initial disk content was `# 无标题` with no body.
3. Set macOS `uchg` (user immutable) on that single sample capture using `chflags uchg`. This reversible fixture allows reading but prevents the production atomic save from replacing the file. `failure-fixture.txt` records the actual file flag. No prior note or directory was made immutable.
4. In actual WKWebView, entered title `原生失败重试与重启验证` and body `原生失败草稿：保存失败时保留这一段；恢复后重试，返回原阅读任务。`, then used Save. The native UI displayed `未保存 · 编辑仍保留` and the Chinese failure notice.
5. Dismissed the notice and used Save-and-return while the flag remained set. The capture stayed open with the exact entered title/body and failure receipt; it did not switch to the prior note. `failed-return.json/png` records that observation. Storage assertions in `failed-storage.json` confirm the capture's disk bytes still equal the initial empty-note bytes and the prior note's SHA-256 is unchanged. The visible retained draft is a UI observation; no claim is made that an unsaved draft was independently recovered across a crash in this run.
6. Removed only this capture's flag with `chflags nouchg`, recorded in `restored-fixture.txt`, dismissed the failure notice and retried Save. WKWebView showed `已保存到本地` and the library row included the entered title/body. Storage readback in `saved-storage.json` confirms the exact saved Markdown and unchanged prior-note hash.
7. Used Save-and-return. The prior note's original title/body returned in **reading mode** (`returned-task.json/png`); the prior note was not replaced with the capture draft. Reopened the capture from its library row and observed the saved title/body (`reopened-before-restart.json/png`).

## Actual final-identity restart

Used the final preview's own Quit shortcut; verified PID 55723 no longer existed before relaunch (`restart-process.json`). Relaunched only `Design31Final.app` with the same explicit isolated sample/private roots. The new PID is recorded in `final-storage-and-resource-check.json` and differs from 55723.

The app starts on home; this is not a claim that the transient capture-return pointer or selected reading mode is persisted across process exit. Opened the library and capture again, and observed its saved title/body and local-save receipt in the restarted WKWebView (`restarted-capture.json/png`). Then reopened the original prior note and observed its original title/body (`restarted-prior-task.json/png`). Storage readback after restart asserts the prior note hash still equals its original hash and the capture hash equals its successful-save hash. The sample capture has no immutable flag left behind.

## Checks and limitations

This is a native desktop WKWebView check using the unmodified production bridge/file writer. UI observations and direct disk/hash assertions are identified separately above. It tests write protection via a reversible sample file flag, not power loss, provider failure, index failure or every possible OS error. A stale accessibility index occurred once while reopening after a separate observer snapshot; refreshing the tree and selecting the freshly indexed capture succeeded, and no unverified click is counted as success.

`npm run check` passed again after evidence collection. `git diff 75a832a -- web mac android tests package.json scripts` is empty, so the existing exact-head 45 shared tests, ten UI suites and Mac build at 75a832a are reused with explicit application/resource identity, rather than rerunning unchanged code for an evidence-only commit. JSON artifacts were parsed, screenshots inspected, resource/storage assertions executed, and `git diff --check` run. Independent Standards and Spec confirmations cover the exact final evidence diff before publication.

Android-specific tests/builds and standalone Syncthing transport remain deferred by maintainer decision. No real notes, uploads, paid AI calls or remote receipt claim. Coordinator alone decides merge and issue closure.
