# Issue 92 validation

Starting source: `6f2dec964856c14f98b5a805019dc03b0cc83b41`.
Implementation and acceptance are in progress; no final native, review, PR or completion
claim is made in this interim record. See `preparation.md` for prerequisite audit,
explicit compatibility decision history and pre-change baseline, and `repairs.md`
for preserved failures and corrections.

## Approved compatibility targets

The maintainer explicitly selected Tailwind 4 and the higher candidate: macOS 13.3
with system WebKit 16.4-era capabilities; Android 8/API 26 with Chromium WebView
provider 111+. Earlier candidates in the preparation audit were proposals only.
Minimum-version runtime execution remains unrun. Current Mac is macOS 26.5.2,
arm64. Android-specific and standalone Syncthing validation remain deferred by user.

## Selected layers and acceptance mapping

| Acceptance | Layer and executed evidence | Current boundary |
| --- | --- | --- |
| Source-faithful parsing, filtering/order/archives/paging, models, drafts, lifecycle/fencing | Existing public-interface unit tests and focused real Swift file/SQLite integration; full first run 73/74 passed | One obsolete filename-array test was replaced by generated-manifest inventory/byte checks, which passed; full final run pending |
| Runtime malformed reply rejection | `library-boundary.test.js` validates Library pages and exact/empty note text | TypeScript is supplemented by runtime checks; no native transport claim |
| Offline/nested asset packaging and resource denial | `packaged-assets.test.js`, `native-assets.test.js`, `mac-assets.test.js`; targeted final boundary run 5/5 passed | Actual Mac scheme/bootstrap still pending separate grant |
| Complete Library browse/open/return, ordering/archives/pages, real index/reload/source preservation | `library-browse-journey.mjs` passed with 122 real Markdown fixtures and private SQLite; `browser/library/browser-receipt.json` | Actual app UI through browser bridge shim, not WK transport |
| Read-first Markdown/wiki aliases/nested exact returns and changed/missing recovery | Maintained reader/wiki/reading-history journeys passed | Browser actual DOM; unchanged core and repository semantics retained |
| Explicit Edit/save/reopen/discard/private recovery, failed and submitted saves, active-only leave | Reader editing and task lifecycle suites passed | Real disk readback and reload; browser composition is not native IME |
| Search/source selection/caret/scroll/return and contextual Action commitment | Search/navigation, form/drawer, workspace, reading-actions suites passed | Actual controls and DOM focus with real Swift records/indexes; copy shim is not system clipboard |
| Layout/focus/contrast/long Chinese/narrow/short/reduced motion | Reader focus and catalogue journeys passed; same-state source-bound `browser/before` / `browser/after` screenshots | Before is starting-source raw assets, after is generated assets; final Button style correction requires focused screenshot refresh |
| Native pre-change performance/I-O/assets/memory | `baseline/cycle1/report.json` passed; coordinator independently accepted cleanup and released lease | One process startup + three warm routes; harness overhead, host-only RSS; no minimum-OS test |
| Mac production compilation/package | First build passed; final source rebuild pending | Build is not native runtime acceptance |
| Final Standards / Spec review and delivery | Pending | No merge, close, triage or main push authorized |

The shared reader/toolbar/DOM ownership affects search, wiki, contextual forms and
cross-page restoration. That concrete risk justified one full maintained UI run.
After its early Initiative timing assertion, only the failing journey and remaining
suites were run; passed search/general journeys were reused rather than repeated.
The remaining run passed Focus, Organization, Library (diagnostic rerun), workspace,
sync, catalogue, contextual forms/drawers, lifecycle, reader/editing, classification,
wiki, history and reading-to-Action workflows. Logs preserve command-level outcomes.
A final Button fidelity/concurrency correction is not yet included in those UI claims.

## Failed outcomes retained

The first browser run lacked Playwright. The next exposed an incorrect disabled-page
focus fallback, corrected and retested. An HTML extraction accidentally removed the
adjacent Organization template; startup diagnosis identified it and the unchanged
block was restored. Legacy nonbubbling synthetic input was adapted to React's normal
browser event propagation, with explicit Edit entry. An Initiative selection assertion
ran before asynchronous selection completed; it now waits for the visible selected
state and retains the assertion. The full unit run's only failure inspected superseded
hardcoded allowlist strings; the replacement manifest contract passed.

One broad Library run timed out waiting for the injected metadata-failure message;
the diagnostic rerun passed without a product change. This unreproduced status-wait
failure remains recorded, not reclassified as passed. It must be considered when
assessing final focused failure/retry evidence. A stale-source headless diagnostic
process was interrupted with exact owned-tree cleanup; no native application or
unknown process was touched.

## Source and evidence limits

The baseline receipt contains original source/package SHA-256 equality and exact
PID/window/sender/recipient/cleanup/restoration receipts. The baseline lease is
released. The resource-only mode extends the existing guarded native harness and
has not yet run. No launch/input/clipboard action may occur without a new grant.

Browser journeys use synthetic private-safe fixtures and the actual shared app,
real Swift repositories/storage/indexes and a JS bridge shim. They do not prove
WKScriptMessageHandler transport, Android SAF/Java transport, physical input, native
IME or native clipboard. Ordinary unchanged-host OS-input compatibility remains
release-deferred. Minimum OS/WebKit/WebView runtime and Android-specific/Syncthing
checks are unrun/deferred, never passed. No private notes, model downloads or AI
requests were used to establish migration acceptance.

Historical screenshot/receipt files overwritten by maintained suites were preserved
privately under `build/issue92-suite-artifacts` and restored to their original tracked
bytes. Selected issue #92 screenshots and logs are retained here; previous issues'
validation reports are not rewritten as evidence for this implementation.

## Post-review source update

Implementation source at `0718a53` incorporates the independent-review empty-source
focus correction and opt-in busy semantics. A real-storage focused search test
reproduced the empty-source defect against the exact `b4e8495` packaged assets,
then passed against the corrected build after waiting for completed continuation.
The fresh unit/integration run passed **75/75** (`logs/issue92-unit-integration-0718a53.txt`).
The final focused UI run passed remaining-form newer Tab/pointer restoration,
active-task lifecycle, reader/focus/editing, classification, wiki, history,
reading-to-Action and empty-source search. That run then found a keyed row staying
busy on a quick Back return; removing row-owned busy state corrected it and the
exact Library paging/keyboard/open/return/scroll/reload/source-preservation journey
passed (`logs/issue92-library-return-busy-fixed.txt`). This last row-only correction
reuses unchanged reader/controller/storage evidence, rather than replaying their
unit matrix through UI. The earlier Library metadata-status timeout also did not
recur in either the diagnostic rerun or the final full pass.

The full maintained UI command was executed and its failed stops remain explicit;
it is not represented as one wholly successful invocation. Across that command,
targeted repairs and continuation runs every maintained journey was executed and
passed on the relevant source, with the new empty-source journey added. Reviewers
must assess the exact source binding/reuse map, not infer a green whole-command exit.

Required current Mac custom-scheme/offline/resource-security checks and final-head
reviews remain pending. No final native pass or completion is claimed here.
