# Issue #1: independent confirmed actions

Status: implemented; Mac native create/edit/relaunch verified. The maintainer deferred Android device verification on 2026-11-16, so it does not block merging this implementation. Issue #1 remains open to track the incomplete acceptance checks.

## Scope and responsibilities

- `web/actions.js` owns action validation, stable IDs, full revision construction, serialized commits, recovery, and paginated query access.
- `web/action-screen.js` owns the action list, state filters, editing, source references, history, and workspace-scoped unsaved drafts.
- `web/bridge.js` owns native request/reply transport.
- `mac/ActionStorage.swift` and `android/src/dev/localnotes/ActionStorage.java` own platform file access; the corresponding `ActionIndex` components own device-local SQLite lifecycle and paginated queries. The Mac bridge uses a serial worker queue; Android uses its existing single-thread executor. Directory pickers stay on the UI thread.
- The existing note editor retains autosave, local draft recovery, external-change checks, history snapshots, and conflict copies. Markdown checkboxes remain editable within source notes and do not become confirmed actions.

No reference material is migrated, checked, rewritten, or deleted when actions are initialized. Synthetic test material includes OKRs, evaluation conditions, process checklists, and checked and unchecked boxes. No real user notes were used for validation.

## File format and recovery

The selected root contains:

```text
LocalNotesData/
  workspace.json
  actions/<entity-id>.json
  revisions/<entity-id>/<revision-id>.json
```

Each full action revision contains `formatVersion`, `entityType`, `workspaceId`, `entityId`, `revision`, `parents`, `modifiedAt`, description, state, initiative ID, due date, waiting condition, and source references. Source references contain a workspace-relative Markdown path, a quoted fragment, and a content fingerprint. The current source fingerprint uses an explicitly tagged FNV-1a checksum for change detection; it is not a security hash.

Revisions are immutable and are never pruned. A save persists and verifies the full revision first, then updates the current record, then the local index. If the second or third stage fails, recovery must finish before the UI reports a recovered save. Persistent failures retain the draft and its committed revision identity for retry. Further edits extend that committed revision, keeping the entity ID and a linear history. A failed revision write is not reported as a completed save. Startup rebuilds the index from valid revisions and repairs missing or stale current records. A missing index during a session also triggers recovery before querying.

Mac uses a synchronized temporary revision file followed by a move into place, atomic replacement for current records, and read-back verification. Android app-private sample files use filesystem writes/AtomicFile; SAF files use write/read-back verification because providers do not guarantee atomic replacement. The full revision remains available if updating a current record fails.

SQLite is stored outside the selected root at:

- Mac: Application Support/LocalNotes/Workspaces/<workspace-id>/actions.sqlite
- Android: app-private files/Workspaces/<workspace-id>/actions.sqlite

Note and action drafts use workspace IDs in their local keys. Existing path-keyed note drafts are recovered into the selected workspace key when that note opens. Action and note requests carry the workspace ID and are rejected if a root switch makes them stale. Both editors are cleared immediately after a root selection, including when initializing the new workspace fails. Each action workspace has a separate repository instance; delayed queries from an earlier workspace cannot repopulate its list, and saves reject foreign-workspace records. Lists query SQLite in pages of 30; action creation and state changes do not read or parse note bodies. Adding a source reference reads only the explicitly selected source.

## Automated verification performed

- `npm run check`: syntax checks for all five web modules passed. This JavaScript repository has no TypeScript typecheck configuration; native compilers provide platform compile checks.
- `npm test`: core Markdown/path/protection tests plus the native Mac storage integration suite. The integration suite uses synthetic temporary roots and the production Swift file/SQLite adapter through `tests/StorageHarness.swift`.
- Action integration coverage: empty initial collection, five states and reopening, optional fields, stable IDs and parent chains, complete immutable history, rejection of a stale local edit, interrupted revision/current/index writes, retained retry identity and edits after committed failures, transient recovery before success, index deletion/rebuild, paginated queries, and workspace isolation.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: passed using Chromium with the production Swift file/SQLite adapter behind a test bridge. Verified create/edit/reload, filters, completed-action reopening, history, independent source checkboxes, failed-save draft recovery, retained note conflict/copy behavior, failed-root-initialization and delayed-query isolation, legacy note-draft recovery, and 393px mobile layout. Screenshots: `build/actions-desktop.png` and `build/actions-mobile.png` (generated, untracked).
- `npm run build:mac`: compiled and ad hoc signed the app.
- `npm run build:android`: compiled the Java adapters, built the APK, and verified the development signature.

These checks validate a shared UI plus the native Mac storage boundary. Browser reload and repository reopen are not evidence of a native process-restart interaction test.

## Interaction checks and outstanding gates

| Check | Actual result |
| --- | --- |
| Mac isolated native launch | On 2026-11-16, compiled and signed an isolated temporary app bundle from the current source. Launched with `LOCAL_NOTES_TEST_ROOT` and `LOCAL_NOTES_TEST_PRIVATE` pointing to synthetic directories. Left the user's original running instance and selected root untouched. |
| Mac native create/edit/close/relaunch | Passed on macOS 26.5.2 (25F84), using the alternate native computer-use provider after the user authorized main Orca. Created a confirmed action, edited its description and optional initiative/waiting fields, and saved transitions through To do, In progress, Waiting, Completed, Canceled, and back to To do. Every save was read back as Saved locally. Quit through Cmd+Q, confirmed the process exited, then relaunched the same isolated bundle and directories. The UI retained the stable ID, edited fields, final To do state, and all six revisions. Disk inspection independently confirmed one current action, six revisions covering all five states, and an unchanged synthetic Markdown source. Closed only the test instance afterward. |
| Android device availability | `adb devices` reported no attached devices. |
| Android SAF offline write, permission persistence, force-stop/relaunch, keyboard | Deferred at the maintainer's request on 2026-11-16; requires a device/provider. APK compilation and signature verification do not validate SAF behavior. |
| Two-device Syncthing delivery | Not run. Stable IDs and complete revision graphs are present, but cross-device conflict interaction belongs to the later synchronization slice. |

Before closing #1, complete the remaining device checks using only synthetic folders: install the Android APK, select a dedicated synthetic SAF directory, disable networking, create/edit, force-stop/relaunch, and verify both JSON revisions and visible state. Switch roots and verify index/draft separation. Record the actual device, OS/provider, and results. The Mac interaction run verified local persistence without relying on a remote service; it did not disable the machine's network or exercise the native directory picker.

### Accessibility diagnosis follow-up

The native interaction failure was reproduced on 2026-11-16 with `orca computer get-app-state --app dev.localnotes.mac --no-screenshot --json`, which returned `permission_denied`. The permission helper reported Accessibility as granted, but it checks the standalone `com.stablyai.orca.computer-use` identity. macOS TCC logs showed that the actual operation was attributed to the responsible application `com.stablyai.orca`, whose Accessibility request was denied. Restarting only the operation provider reproduced the denial with a new process, ruling out a stale provider as the fix.

The user unlocked the Mac and enabled Accessibility for the main Orca application. The exact no-screenshot probe then stopped returning `permission_denied`, but Orca's window enumeration returned `window_not_found`, including for an isolated test process and after restarting only the operation provider. That remaining Orca window-discovery limitation is not claimed as fixed. The alternate native computer-use provider could now read and operate the isolated app window; the visible root was checked against the synthetic directory before editing. It completed the create/edit/Cmd+Q/relaunch checks recorded above. No TCC database edits, permission bypasses, main Orca restart, or product-code changes were needed. Screen Recording remains a separate permission; no additional grant was requested for this run.

Divergent or incomplete revision histories are retained and warned about; this slice does not provide branch comparison/merge interaction. Initiatives are only optional assignments here; initiative management, Current Focus, broader Library redesign, and the remaining approved slices are outside #1.

## Code review

Independent Standards and Spec reviewers compared the implementation with baseline `c5aac3ce3195809483f68b40d849a899c4ca88c0` and then rechecked the fixes through `6847f56`.

- Standards: no documented-standard violations. Two non-blocking responsibility/duplication findings were resolved by sharing the path validator and extracting platform-local `ActionIndex` components. Final re-review: no outstanding material findings.
- Spec: three reproduced P1 failure paths were fixed: further edits after a recoverable commit, stale note writes after failed root initialization, and delayed action-query results crossing workspace boundaries. Regression coverage exercises all three. The reviewer reran the expanded UI suite and focused repository tests and reported no remaining material findings.

The implementation was developed on `feat/issue-1-confirmed-actions` and is limited to #1. Issue #1 remains open for the deferred Android interaction checks above. No implementation of #2–#7 is included.
