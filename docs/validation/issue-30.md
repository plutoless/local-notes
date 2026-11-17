# Workspace integration validation (issue #30)

## Integration identity and scope

- Starting checkout and fetched `origin/main`: `d877a6cc82719b6ce50b4c1c021d826b93f2e572`.
- Existing draft PR #27 feature head: `6db8b2944c1e3b8a8857fea1bfb02c68cdae19b8`, branch `plutoless/approved-workspace-design`.
- Integration merge: `9ae0d47b7e0a87392f3abc645f6697de92a38047`, with both commits retained as ancestors.
- Live #30 native `blocked_by` returned `[]`; its full text says no blockers and explicitly does not depend on #26 closing. Both full issues and #26 comments were read before editing. PR #27 was draft/conflicting with no reviews or check records.
- #20 and #21 are CLOSED and their implementations are already merged via PRs #28 and #29.

Only this Orca worktree was edited. No existing application or agent was stopped. No storage migration, new product feature, real note upload, paid call, or downstream #31–#37 implementation was introduced.

## Conflict decisions

The integration combines both test registrations and adds local synchronization UI to the shared UI command. `app.js` retains organization mode and the workspace/context refresh branch. The sync opener receives the workspace icon while all current-main dirty/save/history guards, capture-phase Escape handling, dialog focus handling, and recovery remain intact. CSS retains organization and synchronization flow rules alongside the approved neutral/light workspace styles, without selecting either stylesheet wholesale. Native and domain/storage implementations remain unchanged.

A full UI run exposed a fixture assumption in the pagination test: after inserting 51 initiatives, clearing search does not guarantee the older target is in the first 50 records. The test now searches its exact fixture title before selecting it. The targeted rerun and subsequent full run pass.

## Executed validation

Code under test is the integration merge plus the one-line pagination-test correction. The final-head SHA is recorded in PR #27 and the issue #26 premerge evidence, avoiding a self-referential commit identifier here. Logs and screenshots are in `docs/validation/issue30/`.

- `npm run check` and `node --check web/sync-screen.js`: passed.
- `npm test`: 45 passed, zero failures, including production Swift/SQLite storage, revisions, recovery, source protection, and workspace isolation.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all eight suites passed after the fixture correction: core/action, initiatives, focus, organization, library, organization-review, workspace, and local synchronization/conflict.
- Separate organization-review and synchronization UI runs passed as well.
- `npm run build:mac`: passed; ad hoc signed Mac application built.
- `git diff --check`: passed.

Playwright was installed only into ignored `node_modules` using `npm install --no-save --package-lock=false playwright`; no manifest or lockfile dependency was added. The initial UI attempt failed because Playwright was absent, then the first complete attempt found the pagination assumption described above. These failures were investigated, not counted as passing.

### Browser and production-storage coverage

The suites exercise seven-item home focus/expand/reorder/removal; initiative/action/note/overview context; failed saves blocking initiative/New-action navigation without draft mutation; background refresh retention; missing-note narrow navigation; reload draft recovery; source-edit conflicts/copy and checkbox independence; exact organization scope/preview/invalidation/cancel/review/confirmation and persisted decisions; local fork comparison/select/edit/save/close/reopen, failed resolution retry, multi-parent revisions, missing/cyclic histories, and workspace guards.

Fixtures use isolated sample roots and private storage with the production Mac storage adapter. Browser evidence is Chromium, not WKWebView. Desktop and 393px captures cover context/detail navigation, long Chinese titles, source excerpts, visible keyboard outlines, accessible action names, scrolling and reachable back controls. Images were visually inspected; previous issues' regenerated historical images were restored rather than overwritten.

## Independent review

Two independent reviewers covered `git diff d877a6c...9ae0d47` against repository standards and current #26/#30, with the approved workspace design taking precedence over the older design direction.

- Standards: zero material findings; one minor documentation correction about #20/#21 still described as outstanding. Updated the design guidance and added a historical-evidence banner to the old workspace validation record.
- Spec: zero material findings; one minor suggestion that the existing note back control says `返回列表` while workspace navigation returns to the initiative overview. Accepted for this integration: the explicit back control remains usable, context and destination are tested, and changing shared label state is unnecessary to reconcile the approved implementation. No material requirement is deferred by this wording decision.

Follow-up review and exact final-head validation are recorded in the PR delivery evidence.

## Native acceptance remains blocked

A separately identified application was built from the integrated resources at `build/issue30/Workspace30.app` with bundle ID `dev.localnotes.validation.issue30`. Only isolated notes and private storage under `build/issue30/native/` were seeded, using the production repository/storage API. Environment overrides are `LOCAL_NOTES_TEST_ROOT` and `LOCAL_NOTES_TEST_PRIVATE`.

The app launched as PID 17810, window 5792 (1180×832, not minimized). Orca Computer Use repeatedly returned `permission_denied`: visible window but no AX window after retries, despite reporting Accessibility and screenshots granted. The CUA fallback returned `cgWindowNotFound`; the screenshot skill also failed to capture that window. The coordinator independently confirmed the failure and is arranging a permission refresh. Error records are retained in `issue30/native-*-error.json`.

**Native edit/save/context/restart readback and native visual inspection have not passed.** Browser/storage tests and a successful build do not replace them. PR #27 must remain draft pending the required native acceptance. No merge recommendation is made while this gate remains open.

## Deferred and ownership boundaries

Android-specific tests/builds and standalone Syncthing transport tests were not run, by explicit user policy; they are not merge blockers. Shared local conflict/revision checks did run and passed. Remote receipt is not inferred from local save. The coordinator alone owns merge, postmerge validation, completion comments, and closure of #26 and #30.
