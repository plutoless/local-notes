# Issue #2: initiatives and note relationships

## Scope and base

Starting SHA: `791555dff9e0e95b96020277c2fa6ed300a67024`.

Before implementation, `origin/main` resolved to that SHA and contained the merged PR #8 implementation. Both the native GitHub `blocked_by` API and issue #2's **Blocked by** section listed only #1; #1 was closed. No blocker was implemented as part of this change.

Initiatives reuse revision-first persistence and a separate device-private `initiatives.sqlite` index. Current records live in `LocalNotesData/initiatives/`; full immutable revisions share `revisions/<entity-id>/`. Rebuilding either collection filters revisions by entity type. Initiative records own working-note/reference relationships; the same Markdown can be linked independently from multiple initiatives. Actions retain their IDs across assignment changes. Progress is user-maintained; this slice introduces no analysis service.

Ending an initiative requires a choice for each unfinished action: complete, cancel, move to another non-ended initiative, or retain independently. Action changes commit individually before the initiative ends. On a failure, already committed choices remain committed; recovery and a retry handle remaining actions without silently retiring them. Source state is derived from the current body fingerprint; missing paths can recover only through a unique body fingerprint and quoted evidence. Ambiguous matches require editing the link explicitly.

Moving a note updates confirmed links. An interrupted relationship update retains a workspace-specific repair intent locally and presents **Retry link updates** in the note editor; retry first recovers committed revisions. Synchronized confirmed records and revisions remain authoritative, while the intent only coordinates completion of the local operation. Other devices can inspect unavailable/moved references independently. New-note capture writes the Markdown before its link; a link failure leaves the note intact and reports the failure, allowing manual linking.

## Executed validation

- `npm run check`: passed syntax checks for all shared UI/domain modules.
- `npm test`: 17 tests passed, including production Swift filesystem/SQLite integration. Coverage includes assignment changes without duplication, links to multiple initiatives, title-search updates, all four ending choices, reopening, changed/missing/ambiguous sources, unique external-move matching, interrupted link writes and same-session repair, immutable history and index removal/restart recovery. Existing action and note protection tests also pass.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: both suites passed. Chromium interacts with the shared UI and the production Mac file/SQLite adapter. The initiative suite exercises create/edit/restart, note linking, action creation inside an initiative, explicit ending/reopening, failed action write while ending with restart recovery, linked note capture/autosave, returning through initiative navigation, assignment draft recovery, and a 393-pixel viewport. The existing suite verifies source independence, failed-save drafts, source conflicts, workspace switching and history.
- `npm run build:mac`: passed, ad hoc signed application produced.
- `npm run build:android`: passed, development APK produced and signature verified. The existing deprecated-API compiler note remains.
- Standards and Spec code reviews ran independently against the starting SHA. Findings about stale title search, duplicated fingerprints, unused test fixture code, failed-ending drafts, stale selection, recovered assignment drafts and interrupted move recovery were fixed and covered by targeted regression checks.

## Native interaction and remaining gates

A test Mac process was launched using isolated `LOCAL_NOTES_TEST_ROOT` and `LOCAL_NOTES_TEST_PRIVATE` directories under this worktree's ignored build directory. Orca computer-use returned `window_not_found` for both the bundle and the exact test PID; no native interactions could be verified. Its permissions report showed Accessibility granted and Screen Recording not granted. The isolated test process was stopped; the pre-existing app from another checkout was untouched.

`adb devices` reported no attached devices. Android SAF provider writes, physical keyboard behavior, foreground recovery, offline creation/edit/restart and index rebuild on Android remain unrun. Native WKWebView interaction on Mac also remains unrun. Browser viewport checks are not Android or native Mac end-to-end evidence. Actual two-device Syncthing checks were not performed; conflict resolution and broader indexing behavior belong to later slices. These are remaining acceptance gates, not passing checks.
