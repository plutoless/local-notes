# Deferred leave-focus correction (#105)

Starting main: `13cc92c65cf6877586cf5364211a2df570b80032`. Live native GitHub blockers are empty and the issue has no written blocker. This dedicated corrective branch preserves delivered #83 / PR91 and its ignored evidence.

## Correction and regression seam

The existing `taskLeaveChoice.finish()` immediately returns focus, then schedules a fallback so an asynchronously disabled dismissal button can regain focus after its handler completes. The fallback now belongs only to that return: intervening focus, keyboard, pointer or text-input intent supersedes it. Temporary capture listeners are removed when the callback runs. Existing connected-origin and frontmost-decision checks remain. Continue also retains a captured editable selection range, without changing drafts, persistence, selection in another field or task ownership.

`tests/leave-focus-ui.mjs` uses the real drawer and leave primitives with a deterministic held scheduler. It covers normal Continue/selection, disabled async dismissal, keyless text/caret changes, newer Tab/pointer/programmatic destinations and forward/backward containment. The retained real-application reproducer from the original diagnosis separately drives the UI/bridge/isolated Swift storage path; its held-callback and ordering controls now preserve the newer destination. Prior red receipts remain in `build/issue83-main-diagnosis/` and `build/issue105/`.

The capture journey retains all failure/retry, held submission, Escape, recovery and no-duplicate assertions. After pending-save Escape it now waits for both completed leave and saved-note reveal. The leave accessor is obtained before polling; the predicate is synchronous, avoiding the diagnosed asynchronous-predicate behavior of the installed Playwright environment.

The only application production change is the existing shared leave-return implementation. There is no CSS, data/schema, layout or broader lifecycle redesign. The design reference remains `docs/superpowers/specs/2026-11-15-content-structure-design.md` and the existing task lifecycle/presentation contracts.

## Consumer impact (source review, not acceptance)

| PR and observed head | Affected path | Required integration / validation status |
| --- | --- | --- |
| PR75 `08695d49b01029989dc003c624ea2ca9a30e6377` | Library capture/edit and dirty leave call the shared owner; its presentation code still has the old fallback | Integrate current main plus delivered #105 while preserving Library work; rerun Library/capture/leave return and required native gates. Unknown final acceptance remains **hold**. |
| PR90 `9a89dc495c353994a47fe4d18835894cddd731ab` | Reader/editing departure uses shared leave; its older presentation code has the same fallback | Integrate shared correction and current main; retain reader CSS and verify selected caret, Continue and subsequent keyboard movement. No inherited pass; **hold**. |
| PR100 `6130a43d5a50e3f20bf1e27f3b4e1f0e4553d94b` | AI settings calls `requestTaskLeave`; aggregate capture verification hit the diagnosed failures | Integrate correction, retain both Organization and form suites plus new leave regression; rerun failed capture/full UI and owned Organization native reacceptance. **Hold** until owner/coordinator verifies exact head. |
| PR103 `10c8f47fae35f9d422281fd0956be4bfa50f4e88` | Sync conflict task calls `requestTaskLeave`; its panel also uses `bindDialog` | Integrate shared fallback correction and verify conflict Continue/return/next Tab, preserving own conflict logic. Its prior native failure is not declared fixed; **hold**. |
| PR104 `1134458021b75a109ef15193bdea89cf0c8321ff` | Search uses its own dialog; leaving a dirty source task to search passes through app `flush()` and shared leave | Preserve search ownership/return code, integrate correction and verify dirty-source Continue plus search opening/return at its delivered head. Unknown final/native acceptance remains **hold**. |

These heads were read from GitHub and fetched as read-only Git objects; no consumer worktree was changed. All five retain the unfenced callback. The correction does not validate their independent CSS, native routing or integration. Their owners integrate the single delivered corrective branch; no competing implementation is authorized. The coordinator retains the automatic merge hold and decides exit.

## Validation and native boundary

Exact-head command receipts, source/package hashes, failed attempts and final independent Standards/Spec reports are supplied in `build/issue105/`. Repair cycles are retained in `repair-cycles.json`; the counter is cumulative across followups, with no idle scan counted as a cycle.

The bounded native mode is `LEAVE_FOCUS_ONLY=1 FORMS_ONLY=1 EXTERNAL_INPUT=1` through the maintained issue81 owned-PID/window route. It tests actual OS-injected Continue, selection, subsequent Tab, controlled stale-callback release after newer native Tab/pointer, async dismissal return and discard/opener. DOM text/selection and scheduler operations are setup, never native input claims. Build-only compilation does not launch an app. No native run is permitted before explicit coordinator custody.

Native acceptance is pending until the granted run completes. A compiled local helper will durably snapshot clipboard items and input-source ID immediately before launch under the lease, then compare/restore them after owned PID termination and wait/absence verification. Clipboard contents remain private and ignored; reports expose hashes only. Source preservation and exact source/package/host/sender bindings are required. No permission resets or input replays may hide uncertain ownership.

Physical input remains unrun. Android runtime/device and standalone Syncthing remain explicitly deferred. Pending native acceptance is not task success or merge readiness.
