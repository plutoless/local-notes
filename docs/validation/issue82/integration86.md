# Delivered sync-focus integration

Integration starting head: `d49518099d89c1ffd8287227214915f457752ae2`.
Integrated main: `de34d273392de604bb059b70635bb40b217bc50a` (delivered PR103).
Execution head: `bf5fe0ffbdc2aa674d8bf27c880a41192527481a`.
Native GitHub and written blockers were reread: #81 is closed and its foundation
is an ancestor of current main. Shared105 remains consumed unchanged.

## Overlap and selected layers

Incoming production changes are limited to `web/sync-screen.js` and two CSS lines:
a comment and `.sync-version button[aria-pressed="true"]`. Removing those exact
lines makes the stylesheet byte-identical to the previous reviewed reader head.
All other web modules, native host/storage sources, reader tests and selected
fast/integration test inputs are unchanged. The sync selector requires a sync
version ancestor; reader content uses no such class. No reader/search/editor or
shared restoration implementation is modified by the integration.

The sync module is loaded by the application, so one complete focused actual-app
reader journey was rerun to check possible startup/focus interference. It passed
composition cancel/commit, caret/selection, Read/Edit/search selection return,
Save/readback/reload, Continue with a held old callback and newer trusted Tab,
Discard and final reload against isolated real Markdown/Swift/SQLite storage.
The exact note-save destination equality remains unchanged and passes. Cancelled
composition preserves original source; deliberate saved bytes equal final disk
bytes after discard/reload; no formal records are written.

Earlier 23 fast/public-module and real-adapter tests, controlled-order shared
leave-focus component checks and paired reader screenshots retain their exact
execution provenance. Their inputs/environment are unchanged, except the scoped
sync-only CSS addition. The new reader journey checks the current CSS/module
combination. This bounded unrelated integration does not justify repeating the
whole UI/unit matrix or sync's independently delivered acceptance journey.

## Executed checks and package binding

At the execution head, all commands exited 0:

- `npm run check && node --check web/sync-screen.js && git diff --check`
- `npm run build:mac`
- `READER_EDITING_EVIDENCE_DIR=build/issue82-integration86/reader CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/reader-editing-ui.mjs`

The Mac package was rebuilt because included shipped assets changed. Every
packaged web file matches current source bytes. Complete log hashes, per-file
source/package/executable hashes, actual browser receipt/screenshot hashes and
environment are retained locally in `build/issue82-integration86/validation.json`;
`overlap.json` records exact equality to the previous reviewed head. Final review
covers the final commit, including this documentation and the cumulative ledger;
only these documentation files differ from the executed merge head. Historical
manifests are retained separately and are not relabeled as new execution. Final
delivery report records exact final head, current base, independent Standards/Spec
and receipt applicability.

## Boundaries and preserved evidence

CDP browser composition remains engine event coverage: compositionend is
untrusted, not actual OS IME. The browser adapter does not exercise native
WKScriptMessageHandler/Android transport, notes:// loading/security or OS input.
Host/bridge transport/resource wiring/lifecycle/OS shortcut/system clipboard/
nativeIME/platform code is unchanged. Actual OSIME/native keyboard/clipboard
compatibility remains release-level deferred by user policy, never passed;
physical input is unrun, Android-specific and standalone Syncthing are deferred.
No native executor, app activation, GUI custody, input source or clipboard
operation occurred in this integration.

Prior failures and ledger entries are preserved. One evidence-manifest filename
mistake was corrected to the test's actual `browser-composition-393.png` output;
cycle 6 records its signature, diagnosis, correction and successful binding check.
It was a metadata error after passing application/build checks, not a product or
acceptance failure. No repeated nonprogress signature or counter reset occurred.
Source protection checks remain separate from deliberate save outcomes.
Coordinator alone owns merge, issue closure, triage and shared hold exit.
