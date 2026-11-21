# Issue #101 continuation: delivered Action integration

Continuation starting head: `ac7651f20c4008d3b0dc9d2e58f9ff75d9504483` (original PR #115 delivery).
Original implementation starting SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched main/base: `1ab961d31287489324f6063549a6ce2aa9dabf7c` (PR #112, Action #95; reviewed upstream head `527af3b08c30df86125cbca2ae6daa7949d4cf2b`).
Integrated code head: `4eac0bd77ba38ad28ebd926ce76035e7aedc79ec`.

The native dependency API still reports #93 and #86 closed; the written issue
blockers agree, and their implementations plus #106 remain on fetched main. PR #115
is the sole delivery PR for this branch. No prerequisite, main branch, scheduler
state or coordinator workspace was edited. The coordinator's separate postmerge
Action checks were pending at dispatch and are not presumed passed by this report.

## Actual overlap and resolution

- Host exports: additive conflict; retain Action control/row/source/history/option
  exports alongside sync view, file-conflict and draft helpers, plus delivered search.
- Design documentation: additive conflict; retain the complete Action and sync
  sections. Ownership inventory now identifies Action React consumers, not legacy DOM.
- `app.js`: automatic merge retains all three delivered `actions.release()` hooks at
  route, Initiative and workspace ownership handoff; #101's captured reader copy/
  reload promises and pending/identity fences remain intact.
- `index.html`: automatic merge retains empty Action root mounts and the empty
  file-conflict root. Catalogue retains Action, sync and search production examples.
- Sync renderer/controller/draft modules and their tests are byte-identical to the
  previously cleared ac7651f head. Action renderer/controller and entry tests are
  byte-identical to fetched main. There is no new feature implementation or competing
  shared contract; the merge only combines their existing authorities.

`source-artifacts.json` records those preservation checks, complete relevant source/
test and compiled/package SHA256 bindings, environment and packaged-byte equality.

## Selected layers and executed receipts

All commands below completed with exit zero on the integrated code; logs are in
`logs/`. No broad full-UI suite or fresh full-unit matrix is claimed.

| Risk / public behavior | Command | Result |
| --- | --- | --- |
| Action public entry/return/pending/recovery; sync draft/immutable-retry/cache guards; real Action repository/revisions/index restart; conflict graph/recovery; compiled manifest | `node --test tests/action-entry.test.js tests/sync-drafts.test.js tests/actions.test.js tests/synchronization.test.js tests/native-assets.test.js tests/packaged-assets.test.js` | 27 passed |
| Types and merged controller syntax | `npm run typecheck`; `npm run check` | Passed |
| Changed shipped host bundle, Action+sync imports and packaged assets | `npm run build:mac` | Typecheck, production web build and signed package passed; no app launch |
| Named sync feature through real isolated Swift storage/index, including underlying Action context and modal return | `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ISSUE101=1 ISSUE86_EVIDENCE_DIR=docs/validation/issue101/action-integration/sync node tests/sync-focus-ui.mjs` | Passed; four record types, immutable multi-parent resolution, warnings, failure/retry/committed recovery, invalid raw draft reload, quota warning, focus return and viewports |
| Action production entry controls after host/root merge | `CHROME_PATH=… node tests/actions-react-ui.mjs` | Passed create/status/filter/history/persisted reload/caret/source preservation |
| Reader/passages to Action and return through stable ports | `CHROME_PATH=… node tests/reading-actions-ui.mjs` | Passed exact evidence, changed/moved guards, failed writes/lost reply restart identity, nested return/management |
| Source navigation and Action/reader origins after ownership handoff | `CHROME_PATH=… node tests/search-navigation-ui.mjs` | Passed expansion/scroll/caret/selection return, dirty Continue/Discard/Save/failure, stale/dismissed replies and saved readback/reload |
| #101 reader file-conflict guards and submitted copy/leave settlement with migrated Action controls | `CHROME_PATH=… node tests/ui.mjs` | Passed maintained actual-app real-storage journey, including external-source preservation and delayed copy followed by existing native-leave callback through browser shim |
| Combined real consumers/tokens and geometry | `CHROME_PATH=… node tests/design-catalogue-ui.mjs` | Passed contrast, dialog restoration, 393px and reduced motion |

The maintained UI harnesses are reused to cover concrete DOM/controller integration
risks rather than duplicating their state matrices in new tests. The general UI
journey includes extra historical Action assertions because it already owns the
reader save-as-copy regression; no additional full-suite execution was required.
Fixtures are private synthetic local Markdown/JSON plus real Swift SQLite adapters.
The native transport and OS integration are not exercised by their browser bridge.

## Source outcomes, visual/performance and reuse

`sync/storage-receipt.json` records original and final source SHA256 both
`f5c8ae84b032ed6a2f2b5c8de16f3c927f3231553f0c4583f7de29bea6accaef`, four retained
revisions, explicit multi-parent resolution, persisted reload, invalid draft recovery
and live editing after cache quota failure. `search-navigation.json` records source
hashes and actual origin/return focus-selection evidence bound to integrated head.
`sync/`, `actions/`, `catalogue/` and reader-conflict screenshots contain fresh
representative results. Tests' generated prior-issue screenshot outputs were copied
here and restored; sibling tests/evidence are preserved unchanged.

Initial sync inspection: 389ms, zero Markdown body reads, 24 bridge commands. Action
journey: 1001ms including screenshots, zero body reads, 27 queries. These are
observations under test load, not controlled performance or speedup claims; query
and read bounds agree with prior receipts. Bundle JS is 355.79kB / 91.04kB gzip after
combining the delivered Action and sync surfaces; exact bytes are in the bindings.

The original before/after visual evidence, original full 90/90 unit run, protected
leave and Chinese reader composition/caret/selection receipts remain historical
coverage from ac7651f and its unchanged components, with original bindings in
`../README.md`. Reader, sync and draft source preservation is recorded explicitly;
no fresh native/physical-input or full-unit pass is inferred from that reuse.
Current Action caret, sync focus and shared origin/return behavior were rechecked
against the new combined build. Contrast remains text 12.64:1, muted 4.72:1 and focus
4.98:1; current catalogue reduced-motion/geometry checks passed.

## Review, failures and limits

Separate independent Standards and Spec reviews cleared integrated code head
4eac0bd against latest main 1ab961d and original starting 8ae4622; final evidence-only
head confirmation is reported with the delivery. See `standards-review.md` and
`spec-review.md`. Minor compressed controller naming remains accepted from the
original review; no new material findings occurred. Both additive conflict hunks
were resolved by preserving both intents. No setup/product/test failure cycle
occurred in this continuation; cumulative historical failures/corrections remain
preserved in `../logs/` and the original report, not reclassified as passed.

No native GUI grant or app launch occurred. Unchanged-host native OS IME/keyboard/
clipboard/close-restart replay remains release-deferred, not passed. Native transport,
custom-scheme runtime, physical input, minimum OS/engine, Intel and native startup/
memory remain unrun. Android-specific and standalone Syncthing tests remain user-
deferred/nonblocking; no Android build was run. No private processing, external
models/downloads, schema/storage/native transport change or sibling implementation.
No new user decision is required; the coordinator retains merge/close authority.

Minor evidence formatting: raw npm output retains a final blank line in the new
`logs/typecheck.txt` and `logs/syntax.txt` receipts, as do some inherited Action
receipts. Source/document whitespace checks pass; these exact-output blank lines
are accepted and do not represent a product/test failure or rewritten evidence.
