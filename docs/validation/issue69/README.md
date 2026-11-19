# Issue 69 validation

Starting SHA/base: `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`. Live issue #69, parent #63/comments, native dependency API and textual blocker #67 were checked before writing; #67 is closed. Delivered #60, #67, #68 and #70 remain in the base. #65/PR #75 remains open and is not implemented here.

## Behavior and evidence boundary

The existing Action drawer proposes an editable description from the note title or selection. No inferred due date, Initiative or priority is added. Form confirmation uses the existing repository, immutable revisions and local index. Passage evidence is a complete original Markdown block envelope, including syntax/table delimiters, rather than a fabricated rendering-to-source substring. Its path and full-source fingerprint are revalidated before an uncommitted save. Contextual references cannot be silently removed or retargeted. An already committed revision remains recoverable if its source subsequently changes.

The reader stays mounted, preserving outer Library/search/Initiative origin and nested wiki history. Save or cancel restores reading selection/position and the contextual opener. Private `reading-action-draft` keys isolate proposals from generic Action drafts. A proposed revision identity is persisted privately before writing; ambiguous replies/restarts check actual immutable history and reuse that identity. Unknown write outcomes retain the private identity without claiming success.

The browser suite uses real UI and the production Swift storage/SQLite adapter with synthetic temporary files. It covers note/list/full-table proposals, explicit confirmation, clean cancel, double submission, validation, revision failure/retry, committed repair, lost durable-write reply plus reload/retry, changed/moved/unavailable source guards, nested return, management reachability, stale-selection invalidation, narrow sizing and workspace opening races. Browser input is automation, not physical input or native WKWebView.

## Checks

- `npm run check`: exit 0.
- `npm test`: 67 passed, 0 failed, exit 0.
- Both `npm run build:mac` and `npm run build:android`: exit 0; Android packaging is not runtime acceptance.
- Full UI suite initially passed, then a repeated run had a transient Initiative selection assertion (`false` versus `true`, initiatives-ui.mjs:90). The isolated Initiative rerun passed; the failed receipt is retained under `attempts/`. The final full suite passed (exit 0), and the affected issue69 browser journey was rerun successfully after replacing a lookbehind expression with an older-WebView-compatible source-line split.
- New issue69 browser journey passed through isolated production storage. Initial setup failures (missing worktree Playwright dependency and missing default browser) were resolved using an existing dependency installation and installed Google Chrome via `CHROME_PATH`.

## Native execution

The coordinator grants this worker an exclusive GUI lease. The probe copies packaged production web assets unchanged into an isolated instrumented Cocoa/WKWebView host, checks every asset hash, records committed head/probe/executable hashes before launch, and uses production native storage/index code with synthetic roots. DOM setup, real OS input and physical input are reported separately. No input source is selected temporarily; the initial installed source is recorded and verified in `finally`. Every owned host is terminated and waited after success or failure.

Failed attempts are retained, never counted as acceptance:

1. Stale packaged app.js hash stopped execution before launch.
2. Note creation executed, but OS Shift+Right selection failed.
3–5. OS Enter did not activate the first drawer. Diagnostics on attempt 5 identified Google Chrome as frontmost despite DOM focus in the native host. Concurrency was initially suspected, but an isolated rerun reproduced the focus limitation. Process-targeted native events were used subsequently.
6. Isolated AppleScript Enter still did not activate the first drawer.
7–8. Orca native accessibility inspection rejected the test host with permission_denied, suggesting a permission reset. No permission reset or global setting change was performed.
9–10. Process-targeted Quartz Return created the note-level Action through actual storage, but drag selection assertions failed.
11. AppKit mouse-event selection also produced no selection. Input-source verification differed in this attempt; the probe never selected an input source, and no global preferences were changed.
12. The Shift+Right probe had a Swift modifier-expression syntax error, corrected in the next attempt.
13. Process-targeted Shift+Right still produced no native selection. All hosts were terminated and waited. The cleanup receipt records initial/final input source and confirms no temporary input-source selection. These failed attempts are not counted as acceptance. Native keyboard success is distinct from successful selection input.

Android-specific runtime/device checks and standalone Syncthing tests are deferred by user decision, not passed. Physical keyboard/mouse input is not claimed. Synthetic native reports contain no original notes or private transmission.

## Review

See [separate independent reports and resolutions](reviews.md). There are no accepted-minor functional deviations. Coordinator retains merge and issue-closure authority.

## Successful native boundary

At committed head `c0b2a93c570fdfb4582631680c1d7357daae5817` (historical full SHA in history/original-native-report.json), the revised native journey passed with coordinator-approved DOM Range **only as selection setup** and actual process-targeted Quartz Return, Tab and Escape. Exact original selected list text, editable description, full raw Markdown evidence, source fingerprint, persisted Action/revision files and index-backed management rows were verified. A whole-table Range included original header delimiters and body rows; cancel created no Action and preserved table selection. Dirty close/discard, keyboard containment, contextual focus, list selection restoration, nested wiki return and unchanged source SHA-256 all passed. No OS-generated/physical selection or successful AX inspection is claimed.

Attempt 14 exposed a real native return defect: focusing the contextual opener after Range restoration cleared selection in WKWebView. The implementation now focuses the final opener before restoring Range; the affected browser, wiki and search-return journeys passed. Attempt 15 reached the new list/table poststate checks but its synthetic edit event did not bubble to the form, so Escape correctly treated it as clean. The probe was corrected to establish dirty state through a bubbling event; attempt 16 passed the full journey. These failures are preserved separately.

`native-report.json`, `preflight.json`, `cleanup.json` and `bindings.json` bind source assets, production Mac executable, instrumented native host, probe and Android package. Android packaged assets were independently matched to those source hashes. The final handoff adds the exact final-head rerun receipt; documentation-only commits do not change the tested product/probe source. All native hosts are terminated/waited and the GUI lease is explicitly released after the last run.

No known functional blocker or accepted-minor exception remains. Coordinator review and merge/closure authority remain required; no additional physical/OS drag or Android/Syncthing acceptance is claimed.

## Integration after main advanced

After the successful original final-head run at `9c5e797d2527187fed65d92177a8a40d5fa4d5bc`, main advanced to `5c780a9ac30818d2ccd0c888820b8cf0ede38a2c` with delivered #71/PR #87. An unpublished local rebase established the resolved integration tree, but it was not force-pushed. The published branch history is preserved by the two-parent merge `22e15860649dda5262c0bb51b7e8d5f5e3996483`, with published feature head `9c5e797` and main `5c780a9` as parents. Its tree exactly equals independently reviewed candidate `433d71f` (`87bce3507616694a113993faf2da086730efe879`). The sole content conflict was the `test:ui` script; both #71's Organization selection suite and #69's reading Action suite are retained. Application changes combined cleanly, and #71 behavior was not reimplemented or redesigned. Both published head and latest main are verified ancestors; publication uses a normal push.

The starting SHA remains `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`; the current integration/review merge-base is `5c780a9ac30818d2ccd0c888820b8cf0ede38a2c`. Earlier native manifests and reports above are historical executed receipts and must not be treated as hash matches for the integrated application. Shared checks, builds, independent reviews and native acceptance are being refreshed against the new base; final PR/handoff receipts supersede the historical-head summary without deleting its failures or evidence.

## Refreshed integrated acceptance

The normal-pushed merge-based candidate `d5b9c3b87a8a1a6a3565d5be77171de88b8d8c90` passed the full refreshed syntax check, 67 unit tests, complete UI suite (including delivered #71 and #69), Mac build and Android build, all exit 0. The UI suite ran against the identical resolved product/test tree subsequently preserved by the merge commit; only integration prose/evidence differed. Fresh native acceptance at that normal-pushable candidate also passed the complete approved journey, exit 0, with matching packaged assets, original source quotes/fingerprints, immutable records and local index readback.

Root native reports, bindings and cleanup now describe this integrated execution; earlier source/package reports are retained under history/. The final evidence-only commit must have an empty product/test/probe diff against this executed candidate. Final independent reviews identify the exact final PR head against latest main `5c780a9`, with source/probe equality and lease-release receipt in the PR/handoff. No force-push was performed. All native hosts are gone; final WeType input source is unchanged, no temporary source selection occurred, and the GUI lease was explicitly released (`msg_4b9712cc20d2`).
