# Issue #101 continuation: Favorites/capture integration

Continuation starting head: `10b7f27715519fad010b38542b8fed7e33378c4a`.
Original starting SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched main/base: `7042d0669734bdfc0e7d86e9437e12a790965a83` (delivered PR #114, Favorites/capture #94).
Integrated code head: `b3c3b257016c79436fbd33f95f28faa8b3d3f467`.

**Merge hold remains in force.** At dispatch the coordinator reported a #94 Favorites
pagination failure: expected 51–65, actual incomplete index count 66 and page 51–100.
Diagnosis/correction belongs exclusively to the original #94 worker. This worker did
not reproduce, implement a competing fix, waive the failure or infer that its cause
or impact is resolved. Passing #101 integration checks below do not mean overall
merge readiness. No new user decision is requested; coordinator owns the hold.

Native dependencies #93 and #86 remain closed, agreeing with the written blockers;
their implementations and #106 are on fetched main. Only the assigned existing
branch and PR #115 are used. No main/coordinator code, prerequisites, sibling tests
or scheduler state were edited.

## Actual overlap and merge resolutions

- Combine app imports for `fileConflictView` with `noteFieldsView`, classification
  and note-information views. Keep all typed host exports and catalogue consumers.
- The changed rename registration is now `infoUI.on('rename', …)`; resolve its closing
  delimiter to `});` and retain #101's complete guarded `copyConflict` and
  `reloadConflict` functions. Their contents are byte-identical to cleared 10b7f27.
- Preserve main's per-collection route snapshots and reader `infoUI.set({path})`
  updates, capture/location fields, note classification and repair callbacks.
  No legacy `.onclick` conflict handlers re-enter the React-owned file-conflict root.
- Retain both design sections and correct combined Library/shell ownership tables:
  metadata/forms and sync each have their own React descendants and existing
  controller/overlay authority, with Action/search ownership preserved.

Sync/draft/reader components and relevant tests match the previously cleared head;
Library/note-form/context sources and sibling tests match fetched main. The merge
adds no feature implementation and no alternate persistence, lifecycle or focus trap.
`source-artifacts.json` contains exact comparisons, hashes, environment, compiled/
packaged bindings and package-byte equality.

## Risk-selected layers and fresh receipts

All selected commands completed with exit zero on integrated code; see `logs/`.
No fresh full-unit/full-UI suite or Favorites pagination pass is claimed.

| Public behavior / integration risk | Executed command | Result |
| --- | --- | --- |
| Resolution raw input/private candidate/task identity/cache failure, real conflict graph/revision/recovery, independent collection contexts, real Library storage/index, generated assets | `node --test tests/sync-drafts.test.js tests/synchronization.test.js tests/collection-context.test.js tests/library.test.js tests/native-assets.test.js tests/packaged-assets.test.js` | 22 passed |
| Combined app handlers, imports and typed views | `npm run typecheck`; `npm run check` | Passed |
| Changed shipped assets and complete package | `npm run build:mac` | Typecheck, production web build and signed Mac packaging passed; no app launch |
| Named synchronization journey and originating-task return through actual app/real storage | `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ISSUE101=1 ISSUE86_EVIDENCE_DIR=docs/validation/issue101/favorites-integration/sync node tests/sync-focus-ui.mjs` | Passed four record types, complete comparison, explicit resolution, retry/committed recovery, warnings, reload, invalid draft/quota, focus and widths |
| Reader conflict copy completion now loads through main's note-information view | `CHROME_PATH=… node tests/ui.mjs` | Passed external-source preservation, save-as-copy, delayed create/native-leave callback settlement and persisted return, using real isolated storage |
| Reader editing and source context after note-information/collection handoff | `CHROME_PATH=… node tests/reader-editing-ui.mjs` | Passed browser-engine composition, caret/selection, Read/Edit/search return, actual Markdown save/readback/reload, Continue/Discard and newer Tab |
| Origin/source/reader return after collection-context changes | `CHROME_PATH=… node tests/search-navigation-ui.mjs` | Passed all maintained origins/destinations, dirty/failure/stale boundaries, scroll/caret/selection return, source hashes and reload readback |
| Combined production sync/short-form/classification/Action/search consumers | `CHROME_PATH=… node tests/design-catalogue-ui.mjs` | Passed contrast, targets, dialog return, 393px and reduced motion |

The unchanged maintained general UI harness owns the delayed reader-copy regression,
so its other historical assertions ran too; a new duplicate UI matrix was not added.
Collection behavior is tested at its public unit seam rather than repeating known
sibling pagination diagnosis here. `tests/note-context-ui.mjs` was deliberately not
run as #101 acceptance: the separate known #94 pagination failure remains with its
assigned worker. No fresh capture/Favorites feature acceptance is inferred; their
incoming implementation/test bytes are preserved exactly.

## Outcomes, bindings and evidence reuse

`sync/storage-receipt.json`: original/final source SHA256 both
`f5c8ae84b032ed6a2f2b5c8de16f3c927f3231553f0c4583f7de29bea6accaef`, four retained
immutable revisions, multi-parent resolution, persisted reload, invalid draft
recovery and quota-failure editing. `reader/` contains current copy screenshots,
editing receipt/composition events and source-navigation hashes/focus-selection
receipt. `sync/` and `catalogue/` contain fresh actual-consumer viewport states.
Prior-issue generated screenshot outputs were copied here then restored.

Sync observation: 374ms initial inspection, zero Markdown body reads, 24 bridge
commands. Combined JS: 362.16kB / 92.66kB gzip after consuming delivered note forms.
These are test-load observations, not controlled performance or speedup claims;
no new #101 I/O regression was established, and this does not diagnose the known
Favorites index/pagination defect. Exact artifact bytes are in the source bindings.

The earlier 90-test full suite and original visual/task-lifecycle evidence remain
historical with original source bindings. The Action integration's 27-test and
context-return receipts remain attributed to 10b7f27. Unchanged sync/draft/reader
sources are compared explicitly; fresh checks above cover their new app-host seam.
No older receipt is relabeled as a fresh full matrix. Contrast remains text 12.64:1,
muted 4.72:1 and focus 4.98:1; current reduced-motion/geometry checks passed.

## Review, failures and coverage limits

Independent Standards and Spec reviews found no new material #101 integration
findings at b3c3b25 against latest main 7042d06 and original base 8ae4622, with final
evidence-only head confirmation reported separately. See `standards-review.md` and
`spec-review.md`. Review clearance is issue-scoped and does not lift the merge hold.

No product/test failure cycle occurred in this continuation. Expected merge conflict
hunks were resolved by preserving both intents. Historical failures/corrections
remain retained in prior reports/logs, without resetting or reclassifying them.
Minor compressed naming remains accepted; raw npm type/syntax receipts retain their
final blank lines as exact-output formatting. Source/document whitespace is clean.

Browser/native-callback shims plus real isolated Swift Markdown/JSON/SQLite adapters
do not prove WKWebView native transport, custom-scheme runtime or OS input. No GUI
grant, app launch or native input occurred. Ordinary unchanged-host native OS IME/
keyboard/clipboard/close-restart replay remains release-deferred; physical/minimum-
platform/Intel/native startup-memory remain unrun. Android-specific and standalone
Syncthing checks remain user-deferred/nonblocking. No private/model processing,
downloads or native/storage/schema changes. Coordinator retains merge/close authority;
engineering next action outside #101 is the assigned #94 cause/impact investigation.
