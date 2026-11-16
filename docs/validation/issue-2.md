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

## Native Mac follow-up validation

Tested application code: `2f3d9847aea6df0a07cd91dc0d4e0694bf80dfdd`. After Orca restarted, Accessibility and Screen Recording were both granted. The earlier `window_not_found` limitation was resolved. A copied, ad hoc signed app used the unique bundle ID `dev.localnotes.validation.issue2` to avoid focus collisions with another running checkout; its executable and web assets were unchanged. All test roots and private storage were under this worktree's ignored `build/native-followup/` directory.

The real Cocoa/WKWebView app was operated using native accessibility actions and verified keyboard input, with UI state and saved files checked after actions. The following checks passed:

- Create and save an initiative, edit its goal and progress, and create an assigned action from inside it.
- Stop the test process, remove both test SQLite files, and relaunch. The action ID/assignment and initiative goal/progress were recovered from synchronized records and displayed in the native app.
- Pause synchronization on both test peers, edit and save initiative progress, create a linked note, and verify note title/body autosave. The local revision advanced while the peer retained its previous revision. This proves operation without synchronization; the Mac's general network connection was not disabled.
- Restart while synchronization remained paused. The native app displayed the saved progress, assigned action and working-note link. Opening that source displayed the saved title/body and initiative backlink. The edited source was marked changed without removing the link.
- Try ending an initiative with an unfinished action: saving was rejected with `Choose how to handle every unfinished action`. Explicitly select `Retain independently` and save: the initiative became Ended, while the same action remained To do with a null initiative assignment.

This follow-up covers the listed native flows. The broader state/assignment/link permutations remain covered by the existing automated suites rather than every permutation being repeated manually on Mac.

## Actual Syncthing transport checks

Two isolated Syncthing v2.1.6 instances used separate device identities, configurations, synchronization roots, and local query indexes. They connected over loopback TCP/TLS with discovery, NAT traversal and relays disabled. Existing Syncthing processes and settings were untouched.

Sequential transfer passed in both directions. After resuming the paused folders, the peers became idle with zero required items and identical SHA-256 hashes for all 10 current-record/revision/metadata/Markdown files. The native app then opened the receiving root with fresh private indexes, recovered the transferred initiative/action/link, and edited progress there. That new revision synchronized back; reopening the original root displayed the peer's progress. After the final explicit-ending operation, all 13 files converged identically. No SQLite file entered either synchronized root, and the original reference fixture was byte-identical to its original contents.

Evidence retained locally under `build/native-followup/` includes native accessibility snapshots, isolated Syncthing logs, and `syncthing-evidence.json` with final per-file SHA-256 hashes. Both isolated Syncthing instances and the test app were stopped after validation.

## Deferred validation and merge decision

On 2026-11-16 the user confirmed that standalone Syncthing synchronization tests and Android-specific tests are not required for the current merge and must only be run when explicitly requested later. They are not merge blockers. See the [project validation policy](../agents/validation.md).

Android physical-device SAF/offline/restart/keyboard checks remain unexecuted and are deferred by that decision; they are not recorded as passed.

The Syncthing checks used two real instances on one Mac, not two physical devices or a Mac/Android pair. Physical-device transfer, offline divergent edits, delayed/out-of-order delivery and conflict-resolution interactions remain unverified. The broader synchronization-conflict feature belongs to a later slice. These unexecuted Syncthing checks are deferred under the same policy and do not block merging. No overall physical-device end-to-end acceptance is claimed.
