# Cross-page journey review

This inventory maps the [production contract](README.md) and [live catalogue](catalogue.html)
to the delivered application. Story numbers refer to [#121](https://github.com/plutoless/local-notes/issues/121).
Issue links identify delivered owners. Test files identify maintained evidence
paths. See PR summaries for actual revisions, environments and results.

| Surface and delivered slice | Story coverage | Production ports and states | Evidence paths |
| --- | --- | --- | --- |
| Design selection [#122](https://github.com/plutoless/local-notes/issues/122) | 36 | Page-first and optional Reference desk selected after comparative previews | `issue122-selected-preview`, `issue122-selected-a11y`, [selection record](issue122/SELECTED.md) |
| Library, Favorites, reader and editor [#123](https://github.com/plutoless/local-notes/issues/123) | 2, 4, 7–14, 32, 33, 35, 37, 39 | `LibraryRows`, `libraryView`, `readerView`, `ReferenceDesk`. Loading/partial/empty, duplicate titles, archived/favorites filters, Markdown, wiki return, saved/failed/recovered drafts and external-file conflict | `issue123-ui`, `library-ui`, `wiki-links-ui`, `reader-editing-ui`, `library.test.js` |
| Shell, workspace and Current Focus [#124](https://github.com/plutoless/local-notes/issues/124) | 1, 5, 6, 18, 28, 29, 32, 34, 35, 37, 39 | `ShellContent`, `FocusContent`. Directory unavailable/cancelled, selected/current, seven/more/waiting, recent reading and return | `home-density-ui`, `reading-history-ui`, `shell-directory.test.js`, `convergence-benchmark` |
| Capture, information, location, Topic and classification [#125](https://github.com/plutoless/local-notes/issues/125) | 14–17, 21, 28, 30, 32, 37, 39 | `noteFieldsView`, `classificationView`, `noteInformationView`, `taskFormView`. Clean/invalid/pending/failed/recovered, individually saved associations, guarded move and link recovery | `remaining-forms-ui`, `classification-ui`, `note-context-ui`, `topic-save.test.js`, `task-drafts.test.js` |
| Action management and creation from a source [#126](https://github.com/plutoless/local-notes/issues/126) | 4–6, 14–17, 19, 28–30, 32–35, 37, 39 | `ActionRows`, `ActionEditor`, `ActionSourceEvidence`, `ActionHistory`. Waiting/overdue, history, invalid/retry and changed/missing source | `reading-actions-ui`, `actions-react-ui`, `action-entry.test.js`, `actions.test.js` |
| Initiative workspace and lifecycle [#127](https://github.com/plutoless/local-notes/issues/127) | 4–6, 14–17, 20, 28–30, 32–35, 37, 39 | `InitiativeSummary`, `InitiativeEditor`, `InitiativeLinks`, `InitiativeDecisions`. Active/Later/Ended, dirty/recovered/partial ending, missing/moved source and original Action return | `initiative-react-ui`, `initiative-drawer-ui`, `initiatives.test.js` |
| Global search [#128](https://github.com/plutoless/local-notes/issues/128) | 4–6, 17, 22–24, 28–35, 37, 39 | `searchView`, `searchRows`. Command+K/Control+K, four scopes, index progress/partial/no matches/failure, passage, copy, missing source and return | `search-navigation-ui`, `search-ui`, `search-model.test.js`, `search.test.js` |
| Organization and Candidate decisions [#129](https://github.com/plutoless/local-notes/issues/129) | 4–6, 14–17, 25, 26, 28–30, 32–35, 37, 39 | `OrganizationContent`, `OrganizationSettings`, `CandidateReviewContent`. Exact preview, partial retry, unavailable service, invalid/dirty/recovered Candidate, source return and explicit decision | `organization-review-ui`, `organization-focus-ui`, `candidate-review.test.js`, `organization.test.js` |
| Synchronization and record conflict [#130](https://github.com/plutoless/local-notes/issues/130) | 4–6, 14–17, 27–30, 32–35, 37, 39 | `SyncContent`, `ConflictComparison`. Loading/empty, blocked missing history/cycles, version selection, invalid JSON, failed write/retry, committed recovery and local-only receipt | `sync-ui`, `sync-drafts.test.js`, `synchronization.test.js` |
| Shared controls, dialogs, notices and cross-page returns [#131](https://github.com/plutoless/local-notes/issues/131) | 1, 3–6, 17, 28–35, 37–39 | `Button`, `Feedback`, `bindModal`, `drawerContent`, `LeaveContent`, `FileConflictContent`. Neutral/selected/focus/pressed/disabled, localized receipts, protected decisions, modal focus and reduced motion | `convergence-ui`, `leave-focus-ui`, `design-catalogue-ui`, targeted file and record conflict regressions in `issue123-ui` and `sync-ui` |

## Contributor checklist

- [ ] Identify the nearest real catalogue state; document any demonstrated new variant there.
- [ ] Replay Focus → action → initiative → linked note → edit/save → context → original action. Verify record identity, navigation selection, focus and scroll, including narrow context/detail/list back paths.
- [ ] Remove/change a synthetic source after rendering its opener. Failure must retain origin/input and permit retry after restoring it.
- [ ] Replay library selection → exact preview (no request) → controlled Send → edited candidate decision → confirmed record/source navigation and reload. Check cancellation, stale preview, partial failure and durable recovery.
- [ ] Keep action/initiative modal tasks exclusive: background conflict review cannot stack over them. Finish or explicitly discard the task before review. For document notes, check invalid conflict resolution, failed save/retry, background refresh, guarded close, restored draft/focus and workspace isolation.
- [ ] Exercise applicable empty/loading/invalid/disabled/dirty/saving/failed/recovered states, Tab/Shift+Tab/Escape, long Chinese text, 393px overflow, 44px primary targets, 4.5:1 text and 3:1 boundaries/focus.
- [ ] Audit visible/accessibility/dynamic/error copy: retain evidence/privacy/unsaved warnings; shorten repetition; move diagnostics to details; remove slogans and unsupported promises.
- [ ] Preserve immutable revisions, private drafts, SQLite indexes, source guards, bounded loading and storage format; failed saves must block destructive transitions.
- [ ] Run syntax/type/build checks and the affected browser and adapter coverage. Apply the native host, transport and packaging criteria in the validation policy. Distinguish browser bridge, native transport and physical-input evidence.

See [issue #37](https://github.com/plutoless/local-notes/issues/37) for the delivery discussion; retain execution evidence outside Git. Android-specific checks/builds and standalone Syncthing are deferred. Physical native input and two-device E2E are unrun; synthetic local revision coverage is not transport proof. Catalogue token contrast is not certification of every rendered pixel. Human visual judgment remains necessary.


## Remaining forms checklist (#48)

Use the [finite entry-point inventory](form-entry-points.md), rather than treating every form as a drawer candidate. Maintained coverage is in `remaining-forms-ui`, `ui`, `focus-ui`, `library-ui`, `initiatives-ui`, `workspace-ui`, `initiative-drawer-ui`, `design-system-ui` and `sync-ui`.

- [ ] Replay Home → new action → save → close → open, retaining Home behind the task and restoring focus/scroll.
- [ ] Replay Library → selected note → information → topic association → Done, preserving search/filter/page/selection/document scroll; failures must be reachable inside the modal.
- [ ] Replay initiative → action or note → edit/save → return, including source unavailability and lifecycle changes before further action edits.
- [ ] Exercise blank/invalid fields, prerequisites, pending saves, duplicate submit events, failed writes/retry, all dirty exits and recovered drafts against isolated real storage. Opening or canceling a clean capture must create nothing.
- [ ] Capture settled desktop, 393px and reduced-height task views, including body scrolling and a reachable footer; visually reject duplicate/tiled captures. Keep before/after browser and native evidence separate.
- [ ] For native lifecycle changes, observe actual production Mac close and OS-menu Quit with dirty/pending tasks. Browser `hasUnsavedChanges()` assertions only cover the shared presentation seam.

These checklist items are review requirements, not blanket assertions that every check has passed. Record browser/native input boundaries, production close/quit results and unrun checks in PR summaries. See [issue #48](https://github.com/plutoless/local-notes/issues/48) for the delivery discussion. Async openers that temporarily disable themselves must explicitly preserve their identity for focus return; check this in WKWebView as well as Chromium.


## Task lifecycle coverage (#55)

- `tests/task-lifecycle-ui.mjs`: shared three-way decisions for notes, actions,
  initiatives, topics and capture; clean/reverted and blank invalid input;
  failed/conflicted writes; submitted delayed note/autosave and action writes;
  competing navigation; hidden unrelated private drafts; saved-new-action followup
  recovery; discarded/reverted capture reload; delayed note-open ownership;
  desktop and 393px confirmation layout.
- `tests/task-drafts.test.js`: workspace/record legacy migration, colliding valid
  candidates, malformed target preservation, and workspace isolation.
- `tests/native-task-lifecycle.py`: unchanged production bundle assets in an
  isolated app, actual window close, app-menu quit and OS Cmd+Q, reentrant close,
  all three decisions, exact saved record count and app restart after discard.
- `tests/native-task-lifecycle-failures.py`: test-only native command channel and
  accepted-token log; real AppKit quit/window requests, injected content-process
  loss delegate, reload recovery, stale bridge replies, one accepted termination
  reply per request. This does not claim an actual WebKit crash was induced.

Existing journey suites explicitly resolve dirty leave decisions and request
private draft recovery. They no longer rely on hidden forms auto-saving or
recovered drafts committing on entry. Retain the transaction decisions and
committed action results when ending an initiative partially succeeds.

## Search source continuation (#60)

`tests/search-navigation-ui.mjs` maintains the compact search → real note/action/initiative → return journey through isolated Swift storage/indexes. Retain the search result DOM and invocation selection/caret, list/context/detail state and scroll; use the active-task leave lifecycle for source navigation only. Exact-source validation must not substitute duplicate titles. Both opening and return must yield to newer workspace/page/record requests after asynchronous reads and context refreshes. See [issue #60](https://github.com/plutoless/local-notes/issues/60) for the delivery discussion. Keep native continuation/input results and input-routing diagnosis separate from browser coverage; browser coverage does not establish native integration.
