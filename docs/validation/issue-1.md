# Issue #1: independent confirmed actions

Status: implemented for review; issue remains open pending native interaction checks.

## Scope and responsibilities

- `web/actions.js` owns action validation, stable IDs, full revision construction, serialized commits, recovery, and paginated query access.
- `web/action-screen.js` owns the action list, state filters, editing, source references, history, and workspace-scoped unsaved drafts.
- `web/bridge.js` owns native request/reply transport.
- `mac/ActionStorage.swift` and `android/src/dev/localnotes/ActionStorage.java` own platform file access and the device-local SQLite query index. The Mac bridge uses a serial worker queue; Android uses its existing single-thread executor. Directory pickers stay on the UI thread.
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

Revisions are immutable and are never pruned. A save persists and verifies the full revision first, then updates the current record, then the local index. If the second or third stage fails, recovery must finish before the UI reports a recovered save. Persistent failures retain the draft and its committed revision identity for retry. A failed revision write is not reported as a completed save. Startup rebuilds the index from valid revisions and repairs missing or stale current records. A missing index during a session also triggers recovery before querying.

Mac uses a synchronized temporary revision file followed by a move into place, atomic replacement for current records, and read-back verification. Android app-private sample files use filesystem writes/AtomicFile; SAF files use write/read-back verification because providers do not guarantee atomic replacement. The full revision remains available if updating a current record fails.

SQLite is stored outside the selected root at:

- Mac: Application Support/LocalNotes/Workspaces/<workspace-id>/actions.sqlite
- Android: app-private files/Workspaces/<workspace-id>/actions.sqlite

Note and action drafts use workspace IDs in their local keys. Requests carry the workspace ID and are rejected if a root switch makes them stale. Lists query SQLite in pages of 30; action creation and state changes do not read or parse note bodies. Adding a source reference reads only the explicitly selected source.

## Automated verification performed

- `npm run check`: syntax checks for all five web modules passed. This JavaScript repository has no TypeScript typecheck configuration; native compilers provide platform compile checks.
- `npm test`: core Markdown/path/protection tests plus the native Mac storage integration suite. The integration suite uses synthetic temporary roots and the production Swift file/SQLite adapter through `tests/StorageHarness.swift`.
- Action integration coverage: empty initial collection, five states and reopening, optional fields, stable IDs and parent chains, complete immutable history, rejection of a stale local edit, interrupted revision/current/index writes, retained retry identity, transient recovery before success, index deletion/rebuild, paginated queries, and workspace isolation.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: passed using Chromium with the production Swift file/SQLite adapter behind a test bridge. Verified create/edit/reload, filters, completed-action reopening, history, independent source checkboxes, failed-save draft recovery, retained note conflict/copy behavior, and 393px mobile layout. Screenshots: `build/actions-desktop.png` and `build/actions-mobile.png` (generated, untracked).
- `npm run build:mac`: compiled and ad hoc signed the app.
- `npm run build:android`: compiled the Java adapters, built the APK, and verified the development signature.

These checks validate a shared UI plus the native Mac storage boundary. Browser reload and repository reopen are not evidence of a native process-restart interaction test.

## Interaction checks and outstanding gates

| Check | Actual result |
| --- | --- |
| Mac isolated native launch | Launched with `LOCAL_NOTES_TEST_ROOT` and `LOCAL_NOTES_TEST_PRIVATE` pointing to generated synthetic directories. Closed only that test process afterward. |
| Mac native create/edit/close/relaunch | Not run. Orca Computer Use returned `permission_denied` for Accessibility, including a retry without screenshot. Its permission status helper reported granted, but the operation remained denied. No native interaction success is claimed. |
| Android device availability | `adb devices` reported no attached devices. |
| Android SAF offline write, permission persistence, force-stop/relaunch, keyboard | Not run; requires a device/provider. APK compilation and signature verification do not validate SAF behavior. |
| Two-device Syncthing delivery | Not run. Stable IDs and complete revision graphs are present, but cross-device conflict interaction belongs to the later synchronization slice. |

Before closing #1, use only synthetic folders: create and edit each action state offline in the Mac app, close/relaunch and verify; install the Android APK, select a dedicated synthetic SAF directory, disable networking, create/edit, force-stop/relaunch, and verify both JSON revisions and visible state. Switch roots and verify index/draft separation. Record the actual device, OS/provider, and results.

Divergent or incomplete revision histories are retained and warned about; this slice does not provide branch comparison/merge interaction. Initiatives are only optional assignments here; initiative management, Current Focus, broader Library redesign, and the remaining approved slices are outside #1.
