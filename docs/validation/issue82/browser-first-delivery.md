# Reader focus browser-first delivery

Integration starting head: `a3fb6283701a0102a93f4a9eaa854c33e38fa8be`.
Original implementation base: `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3`.
Delivered main: `20302d140dac350e543731543d72246275ee7353`, including policy
#107/#108 and sole-owner #105 / PR #106. The reader consumes the shared correction;
there is no duplicated focus-restoration fix in this branch.

## Layer selection and executed behavior

| Behavior | Layer / public interface | Evidence and reason |
| --- | --- | --- |
| Safe Markdown/wiki models | Fast public-module core/wiki tests | Reused implementation plus focused fast rerun; no reader parsing change |
| Restoration decisions with controlled order | #105's `leave-focus-ui.mjs` invokes public `requestTaskLeave`/drawer interfaces in a minimal real DOM component fixture | Normal return, disabled dismissal, newer text/caret, keyboard/pointer/focus and containment; this is DOM component scope rather than a full app/storage journey or a claimed pure Node decision unit |
| Actual reader Continue and newer Tab | One essential actual-application `reader-editing-ui.mjs` journey | Holds only deferred callback scheduling; retains the exact assertion previously failing note-save -> back. Confirms newer note-save survives after delivered105 |
| Composition event wiring/caret/selection | Same focused reader DOM journey | Browser DevTools engine composition/cancel/commit plus real browser Shift+ArrowLeft, field feedback and Read/Edit/search selection return. Records event trust rather than claiming native IME |
| Persistence/records/index/restart | Focused `actions.test.js` uses real Swift repository/storage/SQLite adapter below UI; reader journey verifies source bytes and app reload | Real records/revisions/restart contracts are integration evidence, even when run with Node test runner; mocks do not establish persistence |
| Input -> bridge -> Markdown -> readback | Same essential reader journey through existing NotesNative contract and isolated real files/Swift index adapter | Deliberate Save, Continue, Discard and reload; saved and final-disk hashes match, cancelled composition preserves original source, no formal-record writes |
| Reader geometry/content | Existing paired desktop/393px/reduced-height reader-focus receipts | Reader CSS, core renderer, HTML and app source are unchanged by105; reusable within exact source bindings. New narrow composition screenshot supplements this without multiplying workflow variants |
| Shipped web assets | Applicable Mac package build and byte binding | Shared presentation bytes changed through delivered105, so build verifies those bytes with reader CSS. No native host/transport integration change |

No new pure restoration-decision API is introduced solely for testing. The
correction remains owned by105; its public-interface component cases control
callback ordering in real DOM. Lower-level decision coverage alone cannot prove
the reader's real keyboard/focus/selection wiring, hence the one consumer journey.
The full maintained UI matrix is not repeated: current final diff adds focused
evidence/tests and inherits the bounded, independently accepted105 correction.
Earlier fullUI receipts retain their original provenance and are not relabeled as
fresh execution on a newer head.

## Composition and native boundary

`Input.imeSetComposition` / `Input.insertText` drive Chromium's engine and actual
application input handlers. This is not an OS input method, physical keyboard,
candidate-window check or native IME success. Chromium in these receipts emits
trusted compositionstart/update and composing input, but compositionend has
`isTrusted=false`; the exact flag is retained. The initial over-strict trusted-end
assertion failed, its full event sequence was captured, and the test was corrected
to verify the browser's actual event/value behavior without claiming OS trust.

Relative to current main, the only production branch delta remains six reader
CSS lines. Native host implementation, bridge transport/wiring, custom-scheme
resources/allowlists/security, lifecycle/termination, OS shortcut registration,
system clipboard, native text-input/IME and platform code are unchanged. The
browser adapter substitutes for WKScriptMessageHandler/Android transport and
notes:// loading; it does not exercise those integrations. Ordinary OS replay,
actual native IME and native clipboard compatibility are **release-level deferred
by user policy**, never passed. Physical input is unrun. Android-specific and
standalone Syncthing checks remain deferred. No GUI/baseline/input-source/clipboard
operation occurred during this integration/acceptance work.

## Failure preservation and source protection

Cumulative cycles remain in `ime-repair-cycles.json`. The original prelaunch
FileNotFoundError remains failed and archived under `build/issue82-ime/attempt-1`.
The browser composition trust diagnostic and the genuine pre105 reader failure
remain under `build/issue82-browser-first/failures`. The latter's receipt records
newer note-save focus overwritten by back. No assertion was weakened to conceal
that regression: the same destination equality now passes after delivered105.

Historical native probe preparation/build-only evidence predates the policy and
is not native acceptance. Prior native receipts retain their original head/scope.
The final current-head report binds each reused/executed receipt, source/package
hash and independent Standards/Spec review; evidence-only commits require final
diff review/provenance, not an unrelated matrix rerun. Coordinator alone decides
merge, issue closure and shared hold exit.


## Completed focused reacceptance

The corrected actual-app reader journey passed at
`7234ec0beeca5a36b73f456e436e76d7a73d666f`. The complete committed receipt and
narrow composition screenshot are under `browser-first/`; provenance identifies
the executed head and hashes. Newer trusted Tab's note-save destination survives
the held prior callback; subsequent discard/readback and reload complete. Saved
and final Markdown hashes match and no formal records were written. The real
source/index adapter remains isolated and synthetic.

A final-head instrumentation bug was caught independently: the first-document
browserKeys log was destroyed by reload. Its failed command/source are preserved
under `build/issue82-delivery/failures/browser-keys-reload`. The corrected probe
initializes logging per document and retains earlier keys in the Node runner.
It preserves the exact product acceptance assertion and now passes. This failure
was a harness defect, not evidence of a product failure or acceptance success.

At the preceding source-identical product head, syntax checks, 23 selected fast
public-module/real-adapter tests, #105's public-interface controlled-order DOM
component suite and Mac packaging passed. Final delivery binds their unchanged
input bytes and package artifacts rather than repeating unrelated suites after
this test-instrumentation/evidence correction. FullUI/native replay is not rerun
without a new broad-impact reason. Final independent reviews assess the actual
final diff and receipt applicability, including this evidence-only completion.
