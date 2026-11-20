# Issue 85 Organization focus evidence

## Scope and baseline

Starting base: `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3` (#81 / merged #88). The live native `blocked_by` response lists #81, closed; the written dependency also names only #81. Base availability and current main were checked before implementation. Other focus slices were not integrated speculatively.

The delivered journey is source checkbox selection, bounded title/body query, directory filtering, 50-source pages, exact preview, explicit send, cancellation, partial/error retry, candidate editing/destination selection, individual confirmation, pending-decision recovery and candidate source detours. Preview is inline; there is no separate preview dialog or cancel-preview control. Cancelling analysis uses the existing explicit control. No unavailable feature was added.

The shared contract already gives checkbox labels one focus-visible cue and independent checked fill; no additional CSS, palette or focus framework is necessary. This slice repairs consumer focus ownership when shared buttons disable before callbacks, destination/disclosure/textarea-range retention across rerenders, and source/candidate pagination via the existing shared helper. Context stays transient and is cleared on workspace reset. The exact selected source set, request preview and per-candidate confirmation boundaries are unchanged.

## Browser evidence

`tests/organization-focus-ui.mjs` uses the real application, bridge and isolated Swift file/SQLite adapter with synthetic sources and controlled service responses. `PHASE=before` serves production modules from the starting SHA saved under `build/issue85-before-{organize-screen,app}.js`; ordinary after mode serves current modules. `ASSERT_FOCUS=1 PHASE=before` reproduces the missing invalid-review action focus. Baseline capture mode intentionally skips new restoration assertions and is not an acceptance pass.

Matching `before/` and `after/` screenshots cover 1180×800, 393×650 and 1180×480: checked keyboard rows, candidate keyboard actions, invalid active fields and long Chinese source titles. Pointer source-return and checked-pointer screenshots are separately named. Target-height assertions retain at least 44px; keyboard checkbox frames belong only to the label; checked fill remains present. Actual pointer/keyboard controls establish browser modality. Programmatic setup/range inspection is explicitly not native OS-input evidence.

`organization-selection-ui.mjs` covers cross-query/directory/page selection, stale responses, selection limits, exact reads at preview, setup cancellation/failure and no sends. `organization-review-ui.mjs` covers partial send/retry, invalid/offline/cancel, source-change rejection, edited decisions, separate confirmations and pending recovery with keyboard error/success focus. Existing design-system/review suites measure normal-text contrast above 4.5:1 and focus/border contrast above 3:1 against their measured surfaces.

## Native and final-head gate

`tests/native-organization-focus.py` requires an explicit coordinator GUI lease. It reuses #81's exact owned-PID/window/coordinate/receiver diagnosis and external `native-browse-input.swift` sender, without running the unrelated browse journey. A test-only host command channel establishes fixtures/DOM setup and inspects state. Only marked external OS events corroborated by the recipient tap, Cocoa window events and trusted DOM receiver count as injected-input evidence. A loopback controlled service and isolated private settings provide synthetic responses without external transmission or credential changes.

Native execution passed through source checkbox pointer/Space/Tab, source pagination, exact preview before any request, controlled HTTP 429 failure, cancel of a held request, explicit retry, candidate source return and individual confirmation. All posted input used the external owned-process sender with receipt/tap/Cocoa/trusted-DOM corroboration. The successful evidence run terminated and waited for PID 20438 (exit -15), confirmed absence and unchanged input source; clipboard was untouched. All production web source/package hashes matched, and all 55 synthetic Markdown source hashes remained unchanged.

`native/transcript.json` is the pre-evidence-commit run with exact source bindings; final-head command receipts, a repeated native transcript and independent reviews are recorded under `build/issue85-final-*` and returned in the PR/coordinator report after the evidence commit. This distinguishes committed source-bound evidence from final exact-head execution.

Two setup attempts were not acceptance passes: PID 19273 ran a stale packaged Organization module, detected during receipt inspection; PID 19926 stopped because a previous fixture request receipt was not reset. Both were terminated/waited and confirmed absent. The harness now refuses source/package mismatch before launching and resets its synthetic request receipt. No permission changes or product-failure classification were made.

Physical-input coverage, Android runtime/device and standalone Syncthing are unrun; the latter two are explicitly deferred by issue/project policy. No private notes or models are used.
