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

Build-only validation has compiled this probe; **native execution remains pending the exclusive GUI lease**. The final native transcript must bind head, web source/package hashes, native sources, generated host, executable and probes, then record exact PID termination/wait/absence and input-source equality. Clipboard is never read or changed. Final command receipts and independent Standards/Spec reviews must be refreshed after the final evidence commit and linked in the PR before completion.

Physical-input coverage, Android runtime/device and standalone Syncthing are unrun; the latter two are explicitly deferred by issue/project policy. No private notes or models are used.
