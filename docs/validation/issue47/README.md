# Initiative metadata drawer validation

Starting base: `92580a685891729f26fffd5e2a3e8e6c1513620d` (also fetched origin/main before editing). Issue #47 and comments were fetched; its native dependency and textual blocker #46 were closed, and the shared drawer was present on this base. The coordinator subsequently requested integration of merged #51; latest main `e527b607b0ce4f993fd9a401ad5bbc9d5f73fff6` was merged without force push and is the final review merge-base. No other worktree was edited; the inherited #51 navigation implementation is preserved.

## Delivered behavior

The existing initiative form consumes the shared modal C drawer at 460px, full width below 700px. Labels, optional disclosures, a scrollable body, fixed Cancel/Create-or-Save footer and a single task heading replace the permanent metadata form. Initiative selection still opens its contextual workspace; Edit opens the form. Context snapshots retain selection, document/action visibility, pagination/search and scrolling. Explicit dirty dismissal leaves input in place until Continue or Discard is chosen. Blank cancellation does not create an initiative. Existing serialized persistence, immutable revisions, sources, end/reopen decisions and partial-failure recovery are reused.

## Executed checks

- `npm run check` and `node --check web/sync-screen.js`: passed.
- `npm run test:ui`: all 12 suites passed after latest-main integration; see `ui-final.log`. This includes source/lifecycle regressions, note/action save guards, synchronization conflict review and #51 home/action/note/initiative return journeys.
- `npm test` after latest-main integration: 46 shared tests passed, including revision/conflict, repair, isolation and serialized writes.
- `npm run build:mac`: production Cocoa/WKWebView build and ad-hoc signing passed.
- `tests/initiative-drawer-ui.mjs`: real production Mac storage adapter, file persistence and SQLite; create/edit/reopen, clean cancellation, invalid input, dirty header/Cancel/Escape, focus trap/background inertness, write failure/retry, recovered draft, ending/reopening, duplicate submission, long Chinese input, desktop, 393px and 340px height.
- `tests/native-action-navigation.py` with `PHASE=issue47integration`: existing #51 native create/edit/reopen/list-return and close/quit dispatch checks passed against the combined application; generated evidence is copied into this issue evidence directory.
- `tests/native-initiative-drawer.py`: actual Cocoa/WKWebView with test-only command/snapshot transport; native pointer opening, trusted Escape, create/edit/save/reopen/clean cancel and filesystem assertions, plus an assigned-action save, metadata drawer cancellation preserving the selected action, and contextual Back with the duplicate action navigation destination absent. Before and after desktop/393px screenshots are retained. It does not substitute for the production termination path.
- `tests/native-initiative-termination.py`: uninstrumented production binary and assets, isolated data and unique bundle ID. Actual native window-close button and OS-menu Quit each displayed the unsaved-content alert; dismissing both preserved the entered title, real submission wrote one initiative, and clean OS-menu Quit exited 0. See `final-production-*` evidence.

`asset-sha256.json` identifies the exact application assets exercised by final validation. Before captures use the integrated main base `e527b607b0ce4f993fd9a401ad5bbc9d5f73fff6`; after captures use delivered assets. Re-running older UI suites may regenerate their historical screenshot paths; those unrelated artifacts are excluded from the change.

## Limitations and failed attempts

Android tests/builds and standalone Syncthing/two-device synchronization are explicitly deferred and unrun. No physical-device or cross-device acceptance is claimed. Native probe field entry uses a test-only command channel; production termination validation uses native accessibility and menu interactions without that channel.

Initial UI attempts failed because older suites targeted an in-form submit button and expected the saved form to stay visible; those tests were migrated to explicit drawer entry/return. A native asset freshness assertion caught an outdated build before interaction and required rebuilding. Initial Orca window-close AXPress timed out and its snapshot omitted native alert windows; targeted macOS accessibility subsequently read the actual alert text and dismissed it. Earlier attempts remain qualified by `production-close.json` and the evidence logs; only `final-production-result.json` records the complete final production path. No direct delegate invocation is used as production-path evidence.

Shared files overlapping the concurrently isolated action-navigation work may include `web/app.js`, `web/style.css` and UI journey tests; coordinator must serialize integration and revalidate after any rebase. The main integration was merged into this feature branch only; no PR merge, issue closure, triage-label or scheduler mutation was performed by this worker.
