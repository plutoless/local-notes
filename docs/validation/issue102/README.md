# Issue102 renderer convergence evidence

Starting/fetched main and comparison base:
`2f7f55513f077a88201ee3fadb6b6b540d7514a6`.
GitHub #102 was OPEN; #94/#96/#97/#99/#101 were CLOSED and present on fetched
main; no open PR overlap existed at the initial check. This is the original
issue102 isolated worktree/dispatch; no other worktree or scheduler state changed.

See [final ownership](../../architecture/renderer-convergence.md),
[all 48 stories](story-coverage.md), [failure history](repairs.md) and
[source/artifact/environment bindings](source-artifacts.json). Delivered production/build bytes are bound in source-artifacts.json. Per-check
executed and reused boundaries below distinguish the original broad run from
current related checks after independent-review corrections. Independent final-head review identities and deltas
are recorded separately in `reviews/` and the PR body.

## Validation layers and results

The public behaviors are task/return decisions, request/workspace fencing,
source-faithful read models, explicit Organization decisions and immutable writes.
Unit tests remain the default. Real Swift filesystem/SQLite repository integration
proves persistence, conflicts, partial commits and restart readback. The new coherent
UI journey proves cross-layer handoff in one isolated workspace; focused DOM tests
prove actual focus/caret/event behavior that pure decision tests cannot establish.
Because document/form/dialog/receipt ownership spans all pages, the full maintained
UI suite is justified here. The UI suite preserves existing assertions; test entry
updates add shipped vocabulary modules and await actual reader readiness.

| Check | Observable result | Command / receipt |
| --- | --- | --- |
| Reproducible install | Completed; lockfile unchanged | `npm ci` (initial tool output; build prerequisites available) |
| Unit + real-adapter integration | 101/101 pass at original source stage; unchanged domain coverage reused after bounded receipt correction | `npm test`, `logs/unit-integration-final.txt` |
| Final affected controller/resource tests | Pass; committed focus recovery, released/stale ownership and real Assets contract | `node --test tests/action-entry.test.js tests/focus-ownership.test.js tests/library-ownership.test.js tests/shell-directory.test.js tests/mac-assets.test.js tests/native-assets.test.js`, `logs/affected-final.txt` |
| Maintained actual-app UI | Complete suite exit 0 at original source stage; related current checks below cover receipt adoption corrections | `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' CATALOGUE_EVIDENCE=build/issue102 FORM_EVIDENCE=build/issue102/forms npm run test:ui`, `logs/ui-acceptance.txt` |
| Preserved Action regression | Create/status/filter/history/reload/caret and committed focus repair pass | `node tests/actions-react-ui.mjs`, `logs/action-regression.txt` |
| Preserved Initiative regression | Real storage reload/source return/shared Action/immutable ending partial retry pass | `node tests/initiative-react-ui.mjs`, `logs/initiative-regression.txt` |
| Preserved Library ordering/focus regression | Ordering/archive/paging, disabled-page handoff, focus/scroll/source preservation pass | `node tests/library-browse-journey.mjs`, `logs/library-browse-regression.txt` |
| Coherent named journey | Capture/classify/Library/nested wiki/back/create Action/Initiative/search-source-return; individual candidate decisions; conflict failure/retry/multi-parent readback/reload pass | `node tests/convergence-ui.mjs`, `logs/convergence-final.txt`, `convergence-readback.json` |
| Small essential DOM port check | Synchronous busy settlement, title update preserves real field/caret, opener restoration and escaped/replaced receipts pass | `node tests/presentation-ports-ui.mjs`, `logs/ports-bound.txt` |
| Syntax/type/build | Pass | `npm run check`, `npm run typecheck`, `npm run build:web`; `logs/check-final.txt`, `logs/typecheck.txt`, `logs/build-final.txt` |
| Mac package/resources | Build and strict ad-hoc signature verification pass; packaged manifest and every declared asset byte equal built output | `npm run build:mac`; `codesign --verify --deep --strict dist/LocalNotes.app`; `logs/mac-package-bound.txt`, `logs/codesign-bound.txt`, `source-artifacts.json` |
| Final bounded resource/ownership check | Pass | `node --test tests/library-ownership.test.js tests/mac-assets.test.js tests/native-assets.test.js`, `logs/resource-bound.txt` |
| Current review-fix unit/integration/resource | 11/11 pass, including immutable Initiative ending and current native Assets/manifest | `node --test tests/action-entry.test.js tests/initiative-model.test.js tests/initiatives.test.js tests/mac-assets.test.js tests/native-assets.test.js`, `logs/affected-review-final.txt` |
| Action receipt correction | Actual Action create/history/reload, failed/lost-reply write identity and source-return pass; Action code unchanged during subsequent Initiative correction | `logs/action-review-fix.txt`, `logs/reading-actions-review-fix.txt`, `logs/task-review-fix.txt` |
| Current Initiative receipt correction | Shared Action return, immutable partial ending retry and complete drawer/failure/recovery pass | `node tests/initiative-react-ui.mjs`; `node tests/initiative-drawer-ui.mjs`; `logs/initiative-review-final.txt`, `logs/initiative-drawer-review-final.txt` |
| Current coherent journey | Named cross-page storage/source/conflict/reload journey passes after both receipt corrections | `node tests/convergence-ui.mjs`, `logs/convergence-review-final.txt`, `convergence-readback.json` |
| Current Mac package/resource binding | Typecheck, web/Mac build, strict signature and all declared packaged asset bytes pass after both corrections | `logs/mac-review-final.txt`, `logs/codesign-review-final.txt`, `source-artifacts.json` |

Browser commands use the same `CHROME_PATH` above. Fixtures use actual production
Swift Markdown/JSON/SQLite adapters behind a browser NotesNative shim. They do not
exercise WKScriptMessageHandler, the Android Java bridge or real OS clipboard.
Candidate input is synthetic/controlled; the coherent bridge refuses AI requests.
Source readback SHA256 and explicit source-unchanged assertions are in the JSON
receipt. Existing submitted-write/stale workspace/private draft tests remain intact.

Before the original source commit, whitespace cleanup removed trailing spaces from two controller lines.
The broad UI and 101-test results are reused for identical behavior; final
packaging, manifest/Assets/Library ownership and presentation-port checks execute
the delivered bytes. No unrelated matrix replay is attributed to that formatting.
Shared Button/modal production corrections received the full UI run above.
Independent reviews then found three remaining controller receipt publication
branches. Their correction changes the ownership seam, preserving chosen message
text, ending precedence and all data/task rules. The related current checks above
cover those exact consumers; the complete suite is explicitly reused rather than
reported as rerun. `source-artifacts-24ee1c6.json` preserves the original broad-stage
bindings; `source-artifacts.json` binds the corrected delivered source/package.
Layout/catalogue captures are reused because neither their component/style bytes
nor their displayed states changed in the receipt-only corrections.

## Catalogue and matching states

The current catalogue uses consumed production components and computed semantic
tokens. Its assertions passed pointer/keyboard selection, invalid fields, modal
restoration, 393px overflow, reduced motion and contrast minima: normal text at
least 4.71:1 and interactive line/focus at least 3.57:1. Real form tests additionally
exercise desktop 1180x800, 393x800 and 393x340, long Chinese text, draft recovery,
forward/reverse Tab cycles, invalid input, field selection and return.

`before-forms/` comes from a read-only archive of the exact starting main, built
with the same pinned dependencies, Chrome and real storage harness. `forms/`
uses the resulting production source. Four matching states plus each full state
transcript are retained: desktop capture, narrow/short invalid capture, narrow
recovered Action and desktop selected metadata. Representative desktop and
393x340 before/current captures were visually inspected; no unmeasured visual or
native acceptance is inferred. All maintained generated historical screenshots
were moved to ignored `build/issue102/maintained-output/`; prior committed evidence
is restored byte-for-byte. New evidence is confined to this directory.

## I/O, assets and timing observations

`tests/convergence-benchmark.mjs` runs the actual shared home against 500 synthetic
notes and 2,000 immutable Actions using the production Swift adapter. The same
fixture recipe, Chrome/Mac and unchanged native services are used before/current.
`benchmark-before.json` and current `benchmark-reviewed.json` retain four observations
(one cold, three warm), delayed background work, bridge note-body reads,
record-recovery scans and Chrome JS heap. They are not WKWebView startup or total
native process memory measurements.

Baseline home interactive/populated: cold 102/2938 ms; warm 57–87/58–89 ms.
Corrected current source: cold 113/2991 ms; warm 62–134/64–135 ms. All runs read zero note bodies on
home; both have two cold / one warm record-recovery scans including delayed work.
Warm Chrome JS heap ranges 16041300–27873825 bytes before and
20486158–31971889 current, without controlled GC. CPU contention,
file caches, request scheduling and GC make this a small noisy sample. Overlapping
warm timing and equal I/O do not establish an improvement, a native startup result
or an allocation/regression finding. The existing real integration separately
covers initial 500-note indexing, zero warm rereads and 2,000-action persistence/
rebuild; search logs record bounded warm queries and zero source-body reads while
typing. `benchmark-delivery.json` retains the earlier current sample; the reviewed
sample is refreshed after the final controller receipt changes.

The initial archive baseline is REJECTED for comparison: without repository
metadata Tailwind's automatic discovery emitted 43,903 CSS bytes instead of the
normal 6,169. Initializing local Git metadata **inside the ignored baseline
archive**, without changing a source byte or creating another Orca worktree,
restored normal ignore discovery. The corrected build emits 6,169 CSS bytes;
current emits 6,154. Corrected baseline screenshots and benchmark were rerun.
`benchmark-before-rejected.json` and the original baseline build log retain the
contaminated observation; it is not used for a performance or asset conclusion.

Asset totals and exact hashes are in source-artifacts.json. The host JS grew from
392,237 to 410,625 bytes as document/forms/shared presentation and the production
catalogue moved into React. Total inventoried resources are 719,091 bytes baseline and 728,291 current; no startup/render-performance gain is inferred from
file sizes or screenshots.

## Deferred, reused and unrun boundaries

Native Swift host/bridge/resource-policy/lifecycle/OS integration sources are
byte-identical to starting main (per-file bindings included). Packaging/resource
verification runs because shipped assets changed. The actual production Assets
class is exercised natively by the non-GUI contract test, including nested MIME
and denied private/ambiguous paths; the package manifest/bytes/signature are checked.
No #92 native GUI bootstrap or timing is relabelled as a new pass for these assets.
Historical #92 native baseline remains historical; no native performance conclusion
is made. No native GUI grant exists and no optional executor/replay was launched.

Unchanged-host WKWebView interaction, Chinese native IME, OS shortcut/system
clipboard/close/menu quit/Command+Q and native restart compatibility remain
release-level DEFERRED/nonblocking under the approved policy. Actual native
startup/navigation/search/input timing, WebContent/host RSS and total memory are
UNRUN here and retained for release comparison with the recorded native baseline.
Browser events/caret/selection and native-command seams are reported separately;
they do not establish OS-injected or physical input. Minimum macOS/WebKit/WebView,
Intel and physical-device execution remain UNRUN. Android-specific builds/tests
and standalone Syncthing are maintainer-DEFERRED/nonblocking. Semantic retrieval
#61 remains unavailable/consent-blocked for that feature; no model download,
private-note processing, automatic AI request or unrelated implementation occurs.

Earlier failed runs are retained, including full-suite aborts; an abort never
counts unexecuted later tests as passing. See repairs.md. No two completed repair
cycles reproduced one signature without diagnostic/behavior progress. Final
integration, review and merge are separate: only the coordinator may merge,
close #102, push main or change labels.
