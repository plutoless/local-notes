# Issue 92 validation

Starting/fetched main: `6f2dec964856c14f98b5a805019dc03b0cc83b41`.
Executed final product source: `83da35427a4d8b21fabf9cab9bb70bd03fff2be2`.
Subsequent delivery changes contain documentation/evidence only; the final delivery
head and independent final-delta reviews are recorded in the PR. No merge, issue
closure, triage or main push is authorized for this worker.

The complete Library React/TypeScript/Tailwind journey is implemented. Preparation,
prerequisite closure/merged-source audit and compatibility decision history are in
[preparation.md](preparation.md); cumulative failed outcomes, diagnosis and corrections
remain in [repairs.md](repairs.md). Final acceptance uses the maintainer's layered and
browser-first policies, rather than the superseded blanket native UI replay gate.

## Compatibility and source binding

The maintainer explicitly chose **Tailwind 4**, **macOS 13.3/system WebKit 16.4-era
capabilities**, and **Android 8/API 26 with Chromium WebView provider 111+**. Earlier
candidates in preparation were proposals, not adopted requirements. The explicit
Vite Safari 16.4/Chrome 111 targets and production Mac `minos 13.3` implement that
choice. Minimum-version runtime, Intel and Android device coverage remain unrun.
The observed native machine was macOS 26.5.2 arm64; browser was Chrome 158.0.8127.36.

[source-artifacts-83da354.json](source-artifacts-83da354.json) binds product/test/build
sources, all 24 generated/production/executed web asset hashes, native executables
and deployment metadata. All 24 packaged files are byte-identical. Production
executable SHA-256 is `f809152c6df163e1518df471b6f674670a3a0fe91aaf09532ea95f5697180305`;
the executed instrumented host is `5090bdc80d98204cd03caa289cca52c4390ca08771a78c201e071095cebb07a2`.
The latter adds existing command polling/snapshots/routing and a body-read counter;
it uses production resource handling, WKScriptMessageHandler and real storage/index
adapters, but is **not** an uninstrumented production-executable run. Its default
compiler `minos 26.0` differs from production `13.3`; neither proves minimum-OS runtime.
Executed harness/generated host are retained beside the native receipt.

## Acceptance map and chosen layers

| Acceptance | Executed evidence and outcome | Boundary/reuse |
| --- | --- | --- |
| Reproducible build, runtime validation, offline packaging | Pinned lockfile, strict TypeScript, production Vite and Mac package builds passed (`logs/issue92-mac-build-83da354.txt`); `library-boundary`, `packaged-assets`, `native-assets`, `mac-assets` tests passed | Real Mac Assets resolver compiled headlessly; Android code/static packaging contract only, device/build unrun |
| Parsing/models/filter/order/archives/page, drafts/lifecycle/fencing | Public-interface unit tests and real Swift storage/index/restart/conflict integration: **75/75** in `logs/issue92-unit-integration-0718a53.txt` | Reused unchanged public services/tests after final row-only busy removal; no mocked-storage persistence claim |
| Complete Library browse/open/Back/context restoration | `node tests/library-browse-journey.mjs` passed after row-busy correction (`logs/issue92-library-return-busy-fixed.txt`); 122 real Markdown fixtures, private SQLite, reload and unchanged source hashes | Actual app, browser bridge shim; final product source `83da354` |
| Read-first safe Markdown/inert markers, exact nested wiki/history/search returns | Maintained reader/wiki/history/search/navigation journeys passed; filenames/aliases/changed or missing sources and empty-source filename-only focus covered | Actual DOM and real storage; empty-source controlled RED against `b4e8495` package then corrected GREEN retained |
| Deliberate Edit/save/reopen/discard/private recovery, failed/submitted save, active-only leave | Final reader-editing/task-lifecycle/remaining-forms journeys passed: persisted readback/reload, composition/caret/selection, Save/Discard/Continue and newer Tab/pointer focus | `logs/issue92-*-fixed-final.txt`; row-only delta does not change reader/controller/storage behavior |
| Legacy entry points and shared105 focus ownership | Full maintained UI invocation plus targeted continuation/repairs covered Focus, Organization, Action, Initiative, Topic, workspace, sync, contextual forms, reading-to-Action and search | Broad shared reader/toolbar ownership justified one broad run; command failures remain below; no sibling migration |
| Production catalogue/tokens/complex-control coexistence | Catalogue imports consumed production components/CSS; contextual Action/Topic/Initiative drawers and search coexistence passed | Retained one project-owned dialog/drawer family; no competing trap or additional overlay dependency |
| Pointer/keyboard/selected/invalid states, Chinese/narrow/short layout, reduced motion/contrast | Reader focus and catalogue passed; `browser/before` uses original starting-source assets and `browser/after` uses compiled assets at the same states; desktop 1180, width 393, short 800x400 | Final quiet Button fidelity refresh included; editor invalid state explicitly not applicable; form invalid states exercised by contextual suites |
| Mac offline/custom-scheme/nested assets/MIME/security and affected draft protection | `native/cycle1/report.json`: **passed**, production JS module imported, CSS sheets parsed, wrong host/user/port/query/encoded traversal/slash/workspace/manifest/unknown requests all denied; active draft retained then deliberately discarded | Actual WKWebView and production transport/storage; resource/draft actions DOM-driven, guarded external keyboard used for bounded comparison navigation |
| Native cleanup/source protection | Process terminate/wait, PID63606/window3483 independently absent, exact executable scan empty; all synthetic source hashes unchanged, no formal revisions, input source/clipboard restored, snapshot deleted, owned fixtures removed | `native/cycle1/cleanup-and-package-receipt.json`; coordinator independently audited and released lease; no current GUI grant |
| Baseline/migrated I/O/assets/memory | Both bounded native receipts passed with 500 synthetic notes; concrete cost investigation below | One fresh process per source and three route observations; no user-latency or total-memory claim |
| Separate Standards/Spec review | Both exact-product-head reviews found no remaining material findings after fixes; final documentation-delta review and delivery head recorded separately in PR | Original issue/design and base-to-final diff reviewed independently; no implementation workers delegated |

Unit/integration tests are the default. UI checks establish actual DOM wiring,
focus/caret and critical cross-layer read/write/recovery behavior, not a duplicate
unit matrix. The full UI command stopped on a form-focus regression; corrected
focused continuation then exercised all remaining journeys. Across the broad run,
continuation and repairs, every maintained journey passed on its relevant source.
**No wholly green full-suite invocation is claimed.** The final 83da354 delta only
removes row busy state and tightens the empty-source regression wait; the affected
Library journey passed and unchanged reader/storage evidence is reused explicitly.

Catalogue contrast minima on white: text 12.64, muted 4.72, accent 5.22, success 6.01,
warning 5.54, danger 6.23, line 3.57 and focus 4.98. The actual catalogue and reader
checks include role-appropriate compact targets, long Chinese text, narrow/short
viewports, keyboard/pointer focus and reduced motion. Source-bound screenshots and
receipts live under `browser/`; historical reports overwritten by maintained suites
were restored to original tracked bytes, with new issue92 artifacts retained here.

## Native comparison and regression investigation

| Observation | Starting source | Migrated source |
| --- | --- | --- |
| Packaged web bytes | 351,709 | 665,382 (**+313,673 / +89.2%**) |
| Startup wall time, one process | 3,112 ms | 1,255 ms |
| Initial / warm navigation wall time | 3,213 / 2,735 / 2,750 ms | 3,029 / 2,545 / 2,574 ms |
| Search wall time | 111 / 108 / 109 ms | 107 / 109 / 109 ms |
| Open wall time | 2,583 / 2,569 / 2,531 ms | 2,584 / 2,445 / 2,510 ms |
| Host RSS | 87,264–87,440 KiB (85.22–85.39 MiB) | 95,488–95,680 KiB (93.25–93.44 MiB), about **+9.4%** |
| Body reads | startup 0; initial index 500; warm index 0; each open 1 | identical |

Timings include Python polling, sender creation and custody guards; different run
conditions/cache state and a single startup prevent a user-latency improvement or
regression conclusion. Host RSS excludes WebContent and is not total app memory.
The higher migrated host RSS is consistent across the three observed routes, but
this small comparison is not an allocation profile or a long-duration leak test.
There is no extra source-body scan or growing read count on warm navigation.

[bundle-composition.json](bundle-composition.json) investigates the deterministic
asset increase using the same production Vite configuration in a separate output
directory. Its JS hash exactly matches the executed package. The new JS is 311,451
bytes, compiled Tailwind CSS 6,110 and manifest 885; legacy files net shrink 4,773.
The module inventory contains one production React/React DOM/Scheduler runtime,
the consumed Library/reader/Button/catalogue and the existing safe-path helper;
there is no development React, second framework copy, remote font, or state/form/
overlay framework. Module `renderedLength` is pre-final character attribution, not
an exact allocation of final minified bytes. React DOM is the dominant module.

The concrete tradeoff is an additional 306.3 KiB of offline package and about 8 MiB
observed host RSS for the approved React migration while retaining legacy screens
until their own issues. The RSS cause cannot be isolated from these measurements;
it is not attributed exclusively to React. No product latency budget is specified,
and the evidence does not show an extra-I/O or route-latency regression needing a
behavioral correction. Framework substitution, sibling deletion or a new profiler
harness would exceed this slice. Retain these measured costs for release comparison;
do not relabel them as an improvement or zero-cost migration.

## Failed, deferred and unrun boundaries

All command failures remain in `logs/` and repairs: initial missing Playwright,
incorrect disabled-page focus fallback, accidental adjacent template removal,
nonbubbling legacy test input, premature asynchronous Initiative selection,
obsolete hardcoded asset-array assertion, unconditional Button busy focus change,
empty-source filename-only focus and quick-Back row busy state. Each product
regression was corrected with targeted checks, including the controlled empty-source
RED/GREEN reproduction. The first alleged GREEN ran before completed continuation
and failed; its log is preserved, not counted as success.

One broad Library run timed out awaiting the injected metadata-failure status;
a diagnostic rerun and subsequent final journey passed without a product change.
This unreproduced failure remains a test reliability limitation. A stale-source
headless diagnostic process was interrupted with exact owned-tree cleanup; no
unknown/native process was touched. Native resource cycle1 completed successfully
without a repair cycle. No failure was waived by moving it to another layer.

Browser tests use real isolated Swift Markdown/record/SQLite adapters through a JS
bridge shim, not WKScriptMessageHandler or Android Java transport. Native resource
checks close the changed Mac transport/resource gap, not every browser interaction.
Browser composition/caret/copy are not native IME, physical input or OS clipboard.
Ordinary unchanged-host native keyboard/IME/clipboard and native close/menu quit/
Command+Q compatibility replay are release-deferred under the approved policy;
existing lifecycle/exit registration is retained. Minimum macOS/WebKit/WebView
runtime, Intel and physical input remain unrun. Android-specific build/device tests
and standalone Syncthing remain maintainer-deferred/nonblocking, never passed.
No private notes, model downloads or real AI requests were used for acceptance.
