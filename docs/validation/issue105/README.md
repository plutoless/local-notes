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
| PR75 `08695d49b01029989dc003c624ea2ca9a30e6377` | Library capture/edit and dirty leave call the shared owner; its presentation code still has the old fallback | Integrate current main plus delivered #105 while preserving Library work; rerun Library/capture/leave return and browser/storage gates under the user-approved policy. Unknown final acceptance remains **hold**. |
| PR90 `a3fb6283701a0102a93f4a9eaa854c33e38fa8be` | Reader/editing departure uses shared leave; its older presentation code has the same fallback | Integrate shared correction and current main; retain reader CSS and verify selected caret, Continue and subsequent keyboard movement. No inherited pass; **hold**. |
| PR100 `6130a43d5a50e3f20bf1e27f3b4e1f0e4553d94b` | AI settings calls `requestTaskLeave`; aggregate capture verification hit the diagnosed failures | Integrate correction, retain both Organization and form suites plus new leave regression; rerun failed capture/full UI and Organization browser/storage acceptance. **Hold** until owner/coordinator verifies exact head. |
| PR103 `10c8f47fae35f9d422281fd0956be4bfa50f4e88` | Sync conflict task calls `requestTaskLeave`; its panel also uses `bindDialog` | Integrate shared fallback correction and verify conflict Continue/return/next Tab, preserving own conflict logic. Its prior native failure is not declared fixed; classify it under the browser-first policy, preserving any actual browser/host product failure as **hold**. |
| PR104 `1134458021b75a109ef15193bdea89cf0c8321ff` | Search uses its own dialog; leaving a dirty source task to search passes through app `flush()` and shared leave | Preserve search ownership/return code, integrate correction and verify dirty-source Continue plus search opening/return at its delivered head. Unknown final integration/browser acceptance remains **hold**. |

These heads were read from GitHub and fetched as read-only Git objects; no consumer worktree was changed. All five retain the unfenced callback. The correction does not validate their independent CSS, native routing or integration. Their owners integrate the single delivered corrective branch; no competing implementation is authorized. The coordinator retains the automatic merge hold and decides exit. Ordinary OS-input/IME gaps move to release-level deferred checks under the policy; unknown integration, source preservation or browser/storage failures remain on hold.

The issue82 owner also reproduced the reader impact at `6061df6`: after note Continue, the old callback steals newer trusted browser Tab from `note-save` to `back`. Its unchanged failure log, test and receipt are preserved with hashes in `build/issue105/issue82-consumer-failure/` and `issue82-failure-bindings.json`. The maintained real-storage form journey now exercises this reader Tab/pointer path and source-preserving discard/reopen against the delivered shared correction. This is a consumer control, not acceptance of the owner’s entire PR90 branch.

## Browser-first validation and integration boundary

The maintainer-approved policy is now recorded in `docs/agents/validation.md` (policy PR107). It supersedes the original blanket OS-input requirement for this unchanged host integration. Native requests were removed from the queue; no issue105 native app was launched and no clipboard/input-source baseline was accessed. Earlier build-only executor preparation and the caught stale-package race remain archived evidence; the proposed executor changes were removed from the final diff.

`tests/remaining-forms-ui.mjs` exercises the actual application and shared leave controls, with browser keyboard/pointer and controlled deferred callback scheduling. It verifies normal Continue/selection, disabled dismissal return, newer Tab/pointer destinations, containment, discard/opener, failed-save/retry, held writes, duplicate submission rejection, Escape, independently held metadata/reveal, false readiness while reveal is held, settled continuation, Markdown readback, recovery/reload and one-file/no-duplicate behavior. Its Topic/Action paths use the existing Swift storage adapter, real records and SQLite indexes. Note reads/writes use the existing browser bridge contract and isolated real Markdown filesystem; the browser adapter substitutes for the production WebKit message transport. Setup uses DOM selection/focus and scheduler interception; no OS input or actual IME is claimed.

| Production diff | Classification and required boundary |
| --- | --- |
| `web/presentation.js` only | Shared DOM leave-return focus/selection and temporary event fence. No native host implementation, bridge transport/wiring, custom-scheme resources/allowlists, termination lifecycle, OS shortcut, clipboard, native IME or platform code changes. Task save/discard/pending semantics are unchanged. |
| Shipped web asset bytes | Mac package build and source/package equality remain required. Browser tests do not establish custom-scheme/native transport runtime behavior. |

Exact-head command receipts, source/package hashes, preserved failed attempts, full independent final Standards/Spec reports and impact details are supplied in `build/issue105/`. Repair cycles remain cumulative in `repair-cycles.json`; idle scans are not cycles. Final evidence-only or policy documentation integration is bound explicitly to unchanged runtime bytes rather than implying new execution.

OS-injected/physical input, actual native IME, native clipboard, production native transport and close/quit paths were not exercised for issue105. Ordinary shared-UI native compatibility replay is **release-level deferred by user policy**, never passed. Android-specific and standalone Syncthing checks remain deferred. Browser acceptance does not clear the coordinator’s shared merge hold or validate other consumer heads.
