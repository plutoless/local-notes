# Issue105 leave-focus correction plan

**Goal:** Prevent a completed leave decision from overriding newer input/focus and synchronize capture recovery with completed save/reveal/leave.

**Architecture:** Keep the existing task leave owner and drawer contract. A temporary per-return event fence protects only the deferred focus fallback; the capture journey obtains the existing leave-state function before synchronous polling. No persistence or layout changes.

**Constraints:** English project prose; Chinese application copy; synthetic isolated storage; no GUI without coordinator grant; no model downloads; preserve issue83 artifacts and sibling worktrees; coordinator owns merging. Inline implementation is explicitly assigned; only independent code-review agents are permitted.

Starting SHA: `13cc92c65cf6877586cf5364211a2df570b80032`. Live issue105 has no native or written blockers. The approved corrective design is the issue acceptance and dispatch; no broader lifecycle redesign is authorized.

- [x] Add `tests/leave-focus-ui.mjs` against real presentation primitives: hold the old callback, exercise normal/caret return, disabled async dismissal, newer trusted Tab and pointer destinations, and containment. Run against baseline and retain the failing receipt.
- [x] In `web/presentation.js:taskLeaveChoice.finish`, listen temporarily for focusin/keydown/pointerdown after immediate restoration and before resolving the caller. Remove these listeners at deferred callback execution, and restore only if no new intent occurred and existing connected/dialog guards pass.
- [x] In `tests/remaining-forms-ui.mjs`, import the existing leave-state accessor before polling and wait synchronously for the prior leave plus saved-note reveal completion after held-save Escape. Preserve every original assertion.
- [x] Run retained held-callback reproducer and ordering control against delivered assets, then affected lifecycle/contextual/capture tests, syntax/unit/full UI/Mac build. Record meaningful repair cycles and preserve failures.
- [x] Assess PR75/90/100/103/104 by exact heads and consumers; unknown validation stays on hold. Under maintainer-approved browser-first policy, extend actual-app isolated-storage capture/reader controls and record release-level native deferral; remove optional executor preparation from the final diff.
- [ ] Commit/push only the corrective branch, create/update one issue105 PR using body files, and obtain separate final-head Standards/Spec reviews against the starting/current-main base. Complete after browser/storage acceptance and final-head reviews under the merged policy; coordinator owns merge/hold exit.
