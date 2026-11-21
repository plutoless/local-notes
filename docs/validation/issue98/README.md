# Issue #98 validation

Starting/base: `8ae4622f4a23033ec149038d9a370c9985a138e8` (fetched main).
#93/#85 native dependencies and written blockers were closed before editing; main
contains #110/#100 and #106. A second fetch/dependency/open-PR query still matched
that base and found no open PRs. Implementation stays on the isolated issue branch.
Final delivery SHA and independent review receipts are reported with the PR.

## Selected layers and receipts

- `npm ci`: pinned dependencies installed, zero audit vulnerabilities. Initial
  pre-install build failed with missing Vite; no product failure or dependency edit.
- `npm test`: 84/84 passed (`logs/unit-integration.txt`). Includes real isolated Swift
  Markdown/record/SQLite adapters, immutable revisions, restart/index rebuilding,
  workspace rejection, Organization partial retry/dedup/cancellation. Domain service
  and storage production code are unchanged; useful existing tests are retained.
- `npm run typecheck`, `npm run check`, `npm run build:web`: passed, with build logs.
- Actual application browser journeys use Chrome headless and the shipped build,
  NotesNative contract bridged to real isolated Markdown/JSON/Swift indexes. Native
  WebKit transport, native credential store and network adapter are not exercised;
  service responses/settings metadata are controlled synthetic fixtures.
- `organization-selection-ui.mjs`: baseline and migrated passed. 110 synthetic notes,
  bounded indexed filter/directory/page, delayed stale response, cross-page selection,
  20-note cap, exact selected-only preview, no automatic sends, settings failure and
  Save/Discard/Continue focus/caret/modal containment. Repeated final receipt retained.
- `organization-ui.mjs`: explicit settings save clears entered token, no mount/settings
  send, preview/send, persisted candidates after reload, reader detour/return and
  ordinary wheel reachability at 1180×800, 800×600 and 380×548.
- `organization-review-ui.mjs`: partial request failure, explicit continue/retry,
  cancellation, invalid/offline response, persisted candidates/decisions after reload,
  pending recovery and changed source rejection. The legacy review assertions protect
  the retained handoff rather than migrate #99. Output is `logs/review-cycle2.txt`.
- `organization-focus-ui.mjs`: real checkbox pointer/Space/Tab, single keyboard cue,
  exact two-fragment request, controlled send, preserved source, source detour scroll/
  caret/selection and individual confirmation. Checks 1180×800, 393×650, 1180×480,
  long Chinese content and >=44px targets. `focus/storage-readback.json` contains
  actual synchronized/private-index file hashes and persisted confirmed-record readback.
- `design-catalogue-ui.mjs`: production tokens/components, contrast minima, 393px,
  reduced motion, dialog restoration. Catalogue screenshots retained here, without
  overwriting historical issue31 evidence. Text/muted >=4.5; boundary/focus >=3.
- `npm run build:mac`: passed ad-hoc signed ARM64 packaging. Final package is rebuilt
  after the show/session correction; source/artifact hashes accompany this report.
  No app was launched and no GUI lease, native keyboard or clipboard was acquired.

These focused maintained UI suites are selected because selection, exact send,
settings modal lifecycle and legacy candidate return cross the two renderer boundary;
we did not run the full unrelated UI matrix. Domain order/retry/storage cases remain
in existing lower layers rather than multiplying browser cases.

## Failure history and correction

Initial setup: missing Vite -> installed lockfile with npm ci -> build passed.
Review cycle 1: composite browser script did not complete after >2 minutes; no Chrome
child remained and its owned Swift harness was waiting for stdin (sample retained).
Stopped only the known owned Node/harness PIDs. Diagnostic correction logs failures
before cleanup, bounds the held-source-read wait and releases held read/AI replies on
cleanup. Product inspection also found show's initial workspace reset could make the
outer attempt swallow a recovery error: a dedicated show request fence now retains
ownership across that expected reset and rejects external workspace resets. Cycle 2
passed all composite assertions; there is no repeated completed failure cycle without
progress. No permission/privacy/custody boundary was bypassed.

## Before/after and performance observations

`before-1180.png`/`before-393.png` and `after-1180.png`/`after-393.png` use the maintained
selection test at the same state/viewport. Additional focus screenshots cover selected,
keyboard, invalid candidate and reduced height states. Baseline/migrated selection
both assert zero additional body reads for search/directory/page and exactly two reads
for a two-note explicit preview; both produce zero analysis requests. Existing 50-row
page bounds and 20-note cap remain. Keyed selection nodes avoid replacing unchanged
checkboxes during updates; no whole-corpus body loading was added.

Baseline build log was captured with the unchanged legacy UI controller/HTML and the
new unconsumed React module exported, so its 331.13 kB JS is not the pristine base asset
size. Migrated bundle is approximately 332.22 kB (85.45 kB gzip), CSS 6.13 kB; exact
final bytes/hashes are in bindings. No startup/input-speed improvement is claimed.
Cold native startup, process-memory comparison and physical input latency were not
measured. The meaningful I/O comparison is the unchanged actual descriptor/body-read
boundary; browser timings are not native performance evidence.

## Deferred and unrun

Native WebKit transport/OS input/Chinese IME/system clipboard/menu quit/close/restart
compatibility replay is release-level deferred under maintainer revision5 because no
host, transport, lifecycle or OS integration changed. Mac asset packaging is passed;
this does not claim runtime custom-scheme validation. Physical input, Intel and minimum
macOS/WebKit are unrun. Android-specific validation and standalone Syncthing tests
remain user-deferred and nonblocking. No private note transmission, model download or
external AI processing occurred; synthetic service fixtures never contact the network.

## Independent review corrections

Standards/Spec both identified a delayed settings opener escaping its route/session
and competing setup reads overwriting an active form. The opener now captures
session, show request and per-open request generation; metadata and drawer opening
both check ownership, and non-force reads recheck whether editing has begun.
Standards also identified the lost pagination focus fallback. The React boundary
now restores the surviving direction or heading, and availability publishes with
completed query results so starting a query cannot prematurely strand keyboard focus.
Actual-app selection coverage now checks both terminal page directions, delayed setup
reply after leaving to Library, and out-of-order setup replies around an edited field.

Preserved harness correction failures: `opener-selection.txt` first failed the old
assertion that *all* queries use Organization's limit after adding a Library detour;
the limit assertion now remains scoped to the original Organization phase. Next,
`review-fixes-selection.txt` exposed a cleanup variable scoped inside try; moved it
outside and added pre-cleanup error logging. `review-fixes-selection-cycle2.txt` then
identified the real previous-page early-disable focus behavior, corrected by publishing
availability only with query completion. These are distinct signatures/diagnostic
progress, not repeated blind reruns. All failed receipts remain intact.

The next controlled-opener run reached both pagination assertions successfully, then
its setup-order assertion saw three requests because the returned Organization show
was still finishing its own metadata read. The harness now waits for the observable
ready status before staging the two controlled opener reads; `opener-order-selection.txt`
passes all assertions. No product request is suppressed to satisfy the test.
`review-fixes-package.txt` passes after these corrections. Final source/package binding
is available at `build/issue98-delivery-bindings.json` (exact delivered SHA, SHA-256 of
sources, every built/packaged resource pair and executable). Final independent reports
are attached to the PR/coordinator receipt rather than self-certified here.

Final presentation preservation: errors retain `data-state=failed` in the React
feedback model (including device-settings errors), with selection and composite
failure/retry suites passing in `feedback-selection.txt` / `feedback-review.txt`.
The Spec review's minor candidate-pagination visual delta was corrected by restoring
its original `ui-action secondary` classes statically on the legacy-owned buttons.
No minor visual deviation was silently accepted. Final Mac package and focused
checkbox/source-return regression receipts are `delivery-package.txt` /
`delivery-focus.txt`; packaging includes the restored static entrypoint classes.

## Integration with concurrent main

Main advanced during branch publication to `f39466dce449467620a7e08eacf3a1f9087c29b5`
(#97, PR111). Merged that fetched main in this isolated branch without rewriting
history. The three conflicts were additive host exports, catalogue examples and
design sections: both search and Organization registrations/examples are retained;
search implementation is consumed verbatim from main. Integration typecheck,
production/Mac package, selection regression, search source-navigation/return and
production catalogue checks pass (integration logs). Catalogue screenshots here
include both real production consumers.

Integration `npm test` ran 86 cases: 85 passed and the generated-resource comparison
failed while the production build was concurrently replacing copied search-screen.js.
This was a harness/build scheduling mistake: the test compares live source with
mutable build output and read two build generations. Preserved integration-unit.txt;
no production edit was made to mask it. After build completion, the focused real
resource-manifest test passed (`integration-resource-recheck.txt`) and current
source/build search-screen.js bytes match. The other 85 passing results are reused;
this is not reported as an all-green 86-case single run.

Integration inspection also protects the newer modal boundary: a delayed settings
reply may not open over global search while Organization remains visible. The opener
checks for an already open dialog; the controlled delayed-reply browser regression
asserts settings remains closed and the search input retains focus. This does not
change search or create another overlay authority. The final packaging and selection
receipts for that guard are integration-modal-package/selection.txt. Native OS/IME
replay remains deferred; the new proof is actual browser DOM focus, not native input.
