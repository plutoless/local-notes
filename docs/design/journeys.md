# Cross-page journey review

This extends the [authoritative reference](README.md) and [live catalogue](catalogue.html), using their actual primitives and states. Starting SHA: `588eba92d87c098a230d7e1efc4f01db9ef469e0`; all native/textual blockers #32–#36 were closed and PR39–43 ancestors of fetched main before editing.

## Screen, state and content inventory

| Surface | Shared primitives and states | Content decision and reason | Regression owner |
| --- | --- | --- | --- |
| Shell/directory/navigation | Actions, field, nav, feedback; loading/unavailable/cancelled | Retain directory selection; paths in details; unify selected page and accessible announcement | workspace-ui, design-system-ui, library-ui |
| Home/capture | Rows, disclosure, headings, save feedback; empty/seven/expanded/waiting/dirty/failed/recovered | Retain titles, waiting evidence and local save receipt; one heading, no filler | focus-ui, design-system-ui |
| Actions/history/sources | Fields, rows, pagination, disclosure; invalid/dirty/saving/retry/recovered/changed/missing | Retain quotations and history; diagnostics in details; unavailable source keeps origin reachable | ui, workspace-ui |
| Initiative/context/ending | Context/detail layout, fields, rows; selected/empty/dirty/recovered/ending | Retain goal/progress and explicit unfinished-action decisions; add return to original action | initiatives-ui, workspace-ui |
| Library/search/read/write | List/detail, fields, rows, pagination, save states | Retain user body and source checkboxes; preserve scope/search/scroll; no task import | library-ui, workspace-ui |
| AI settings/preview/candidates | Staged layout, ui-selection, field/disclosure/feedback; invalidated/sending/disabled/cancelled/partial/retry/durable | Retain exact scope/privacy/uncertainty and editable decisions; missing source retains candidate | organization-ui, organization-review-ui |
| Local synchronization/conflict | bindDialog, comparison/selection rows, field; loading/incomplete/cyclic/invalid/dirty/retry/recovered | Retain local-only receipt, branch evidence and unsaved warnings; JSON/IDs in details | sync-ui |
| Dialogs/notices/responsive layout | Shared focus trap/restoration, feedback and semantic tokens | Retain concise Chinese next steps and diagnostic details; prohibit private palette, duplicate headings and unsupported claims | design-catalogue-ui, design-system-ui, sync-ui |

No typography, spacing, icon, palette, breakpoint or control variant is added. The new return uses the existing quiet action and context layout. Existing wrapping, focus, contrast and minimum target rules apply. New application copy is `返回原行动` and `关联事项暂不可用，请刷新后重试。`; user content, quotations, paths, IDs and persisted enums are unchanged.

## Contributor checklist

- [ ] Identify the nearest real catalogue state; document any demonstrated new variant there.
- [ ] Replay Focus → action → initiative → linked note → edit/save → context → original action. Verify record identity, navigation selection, focus and scroll, including narrow context/detail/list back paths.
- [ ] Remove/change a synthetic source after rendering its opener. Failure must retain origin/input and permit retry after restoring it.
- [ ] Replay library selection → exact preview (no request) → controlled Send → edited candidate decision → confirmed record/source navigation and reload. Check cancellation, stale preview, partial failure and durable recovery.
- [ ] Keep action/initiative modal tasks exclusive: background conflict review cannot stack over them. Finish or explicitly discard the task before review. For document notes, check invalid conflict resolution, failed save/retry, background refresh, guarded close, restored draft/focus and workspace isolation.
- [ ] Exercise applicable empty/loading/invalid/disabled/dirty/saving/failed/recovered states, Tab/Shift+Tab/Escape, long Chinese text, 393px overflow, 44px primary targets, 4.5:1 text and 3:1 boundaries/focus.
- [ ] Audit visible/accessibility/dynamic/error copy: retain evidence/privacy/unsaved warnings; shorten repetition; move diagnostics to details; remove slogans and unsupported promises.
- [ ] Preserve immutable revisions, private drafts, SQLite indexes, source guards, bounded loading and storage format; failed saves must block destructive transitions.
- [ ] Run shared syntax/unit/UI checks, Mac build and isolated actual WKWebView probes on final product head; bind resource hashes to evidence. Distinguish native DOM events from physical input.

See [execution evidence](../validation/issue37/README.md). Android-specific checks/builds and standalone Syncthing are deferred. Physical native input and two-device E2E are unrun; synthetic local revision coverage is not transport proof. Catalogue token contrast is not certification of every rendered pixel. Human visual judgment remains necessary.


## Remaining forms checklist (#48)

Use the [finite entry-point inventory](../validation/issue48/inventory.md), rather than treating every form as a drawer candidate. Maintained coverage is in `remaining-forms-ui`, `ui`, `focus-ui`, `library-ui`, `initiatives-ui`, `workspace-ui`, `initiative-drawer-ui`, `design-system-ui` and `sync-ui`.

- [ ] Replay Home → new action → save → close → open, retaining Home behind the task and restoring focus/scroll.
- [ ] Replay Library → selected note → information → topic association → Done, preserving search/filter/page/selection/document scroll; failures must be reachable inside the modal.
- [ ] Replay initiative → action or note → edit/save → return, including source unavailability and lifecycle changes before further action edits.
- [ ] Exercise blank/invalid fields, prerequisites, pending saves, duplicate submit events, failed writes/retry, all dirty exits and recovered drafts against isolated real storage. Opening or canceling a clean capture must create nothing.
- [ ] Capture settled desktop, 393px and reduced-height task views, including body scrolling and a reachable footer; visually reject duplicate/tiled captures. Keep before/after browser and native evidence separate.
- [ ] Observe actual production Mac close and OS-menu Quit with dirty/pending tasks; direct delegate invocation and browser `hasUnsavedChanges()` assertions are insufficient.

These checklist items are review requirements, not blanket assertions that every check has passed. See [issue48 execution evidence](../validation/issue48/README.md) for browser/native input boundaries, production close/quit results and unrun checks. Async openers that temporarily disable themselves must explicitly preserve their identity for focus return; check this in WKWebView as well as Chromium.
