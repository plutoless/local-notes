# Issue 82 — reader focus validation

Starting/base commit: `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3` (merged #88).
Live native `blocked_by` and written blocker both identify closed #81; its shared
contract was available on `origin/main` before implementation. No sibling merge
was present on the second fetch. The approved content-structure design and
`docs/design/README.md` govern this narrowly scoped reader adoption.

## Inventory and change

- Note open/read: existing restrained toolbar and selectable title/body retained.
- Wiki links: native buttons already consume the shared focus treatment; pointer
  and keyboard returns retain focus, with modality-appropriate presentation.
- Search source: the existing source-line destination inherited the blanket
  `[tabindex="-1"]` outline. Reader source destinations now retain focus, source
  hooks and text highlights without a decorative control rectangle.
- Wide tables: existing keyboard-scrollable regions now use the shared inset 3px
  cue. No table parsing, layout, source navigation or persistence changes.
- Source editing: existing field/caret/selection feedback retained. No note-field
  invalid-validation state exists; invalid-plus-focused is not applicable here.
  Conflict and failed-save receipts remain distinct from invalid-field state.

## Executed evidence

`browser/before` and `browser/after` contain matching 1180×800, 393×852 and 800×400
states: pointer wiki return, keyboard wiki link, selected source heading,
keyboard table, selected editor and actual grounded search source. Before CSS
is read from the starting commit; all controls and storage use the actual app
and isolated Swift storage harness. The initial before run preceded CSS edits;
the expanded before rerun added actual search-source screenshots using those
same baseline bytes. `receipt.json` records the geometry/focus observations.

`tests/reader-focus-ui.mjs` also executes actual save, continue-editing and
discard controls, byte-compares read-only Markdown, and excludes formal record
writes. The maintained reader/wiki/search-navigation/task-lifecycle journeys
cover safe rendering, source fidelity, failed saves, draft recovery and nested
Library/search/Initiative return. Shared `check`, all 67 shared tests, the full
maintained UI command and Mac build passed during implementation.

`native/report.json` and `cleanup.json` capture the isolated pre-commit native
run (the report's HEAD is the base; web asset hashes identify tested working-tree
bytes). An exclusive coordinator GUI lease covered all native runs. The unique
Reader82.app uses production web assets and Swift storage with test-only host
instrumentation. Actual external process-targeted CGEvents are correlated to
marked Quartz events, Cocoa owned-window events and trusted DOM receivers.
DOM focus/Range setup is identified separately. Pointer/keyboard wiki navigation,
return, source selection, editor Command+A, OS Command+C exact text fidelity and
Library return were executed. Original clipboard items/types/bytes were restored
and compared in host memory; no original clipboard content was exported. The
input source was untouched. The owned process was terminated and waited for;
synthetic Markdown remained unchanged. The first failed run was a harness
coordinate conversion error, corrected using #81's native window conversion;
it is not product failure evidence.

Final-head commands and independent Standards/Spec reports are delivered with
the worker's final report. Final native reruns use `NATIVE_EVIDENCE_DIR` to keep
an exact-head receipt outside the committed pre-commit snapshot. Final reader
reruns support `READER_FOCUS_EVIDENCE_DIR` for the same reason.

## Limitations and risk

Physical keyboard/mouse and native IME composition are unrun; OS injection and
Range setup do not establish those checks. Android-specific runtime/device and
standalone Syncthing checks are deferred by explicit project policy, not passed.
No private source transmission, model download, schema change or source-writing
behavior was added. The implementation is reader-scoped CSS using existing focus
tokens; visual judgment remains reviewable through the paired screenshots.
