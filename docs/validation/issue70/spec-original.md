# Original Spec review

Reviewer: `/root/spec_review`, independent Spec axis; static review only, no edits or GUI execution.

Reviewed head: `4a1b35a7ee8354de0113d115011ba44fafa52bce`  
Base/start: `1a38a5167b8583729a6831a33ade8107d25476a1`

1. **P2 — Initiative context retains stale associations.** Issue #70 requires “Read back consistent associations from the note … and Initiative reference view.” In `web/app.js:529–530`, successful classification updates storage and reloads note checkboxes, but leaves `initiatives.previous` unchanged. Reading a note inside Initiative A, removing A’s link, and returning through Back calls `initiatives.edit(initiatives.previous)` with the old sources. `prepareEdit()` forms the view from that supplied record rather than querying the latest owner, so the reference view still displays the removed association and subsequent metadata edits encounter a stale base.
2. **P2 — A post-commit return failure hides recovery feedback.** The criterion requires handling “failed persistence and committed-recovery-pending states through existing contracts.” `web/library-screen.js:47–59,85–89` includes `closeTopic()` in the persistence catch. That method deletes the private draft, closes the Topic drawer and clears `topicNote` before awaiting `returnToNoteInfo()`. If its `referenceQuery` fails after the Topic/link commit succeeds, the error appears inside the now-closed Topic drawer, no retry revision is recorded, and the metadata drawer never opens. Keep committed success separate from return/read failures and offer a visible retry that does not create another Topic.
3. **P2 — Successful keyboard classification loses its focused control.** The parent’s story 43 requires “predictable focus, modal containment and restoration.” The new Initiative checkbox saves by rebuilding the entire `#note-initiatives` container (`web/app.js:513,529–530`), removing the focused checkbox without focusing its replacement. Keyboard users consequently lose their current classification position; the next drawer Tab starts from the first control. Restore the matching checkbox with `preventScroll` after success/recovery.

No unrelated #65 implementation or Initiative lifecycle redesign identified. Three Spec findings; worst severity P2.

## Subsequent review at dc9a5bc predecessor 6a90df4

Reviewer: same independent Spec reviewer, static review only.

1. **P2 — Replacing metadata can bypass an in-flight Initiative write.** Issue #70 requires preserving “the delivered task-scoped leave lifecycle.” `web/app.js:455` directly hides `noteInfo` and opens the Topic task. An Initiative save in progress disables only `#note-initiatives`, so `#note-create-topic` remains usable. Clicking it changes `activeTask()` to the Topic task, whose pending operation excludes `noteInitiativePending`. Closing/quitting with an untouched Topic form can consequently proceed without settling the submitted Initiative write. Settle the metadata task before replacing it; test with a delayed Initiative write followed by Topic creation and leave.
2. **Acceptance evidence remains incomplete in the reviewed tests.** The issue requires “capture-to-classification-to-reopen journeys … across … workspaces.” `tests/classification-ui.mjs` classifies an existing `reference.md`, then separately captures an unassigned note; it neither classifies/reopens that captured note nor switches workspace. Complete those journeys, including classification isolation across workspaces, or explicitly report the remaining acceptance gap.
