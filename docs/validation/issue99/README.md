# Issue #99 — candidate evidence review

## Scope and attribution

Starting checkout and fetched main: `4ac88ec28496c0c474042815df7e04a77884fb9e`.
Both written dependency and native GitHub dependency queries identified closed
#98; its merged PR113 commit is that exact base. The preflight open-PR query was
empty. Main was fetched again after implementation and remained at that SHA.
No prerequisite, sibling, schema, native host, AI consent or transport was edited.
The existing `candidates(returnFocus)` port remains for synchronization consumers;
React exclusively owns candidate cards. See the Organization ownership inventory.

Final production and reviewed head: `0e127dfef9ddd88d1e393bc0c5ebbb5291349c72`.
The broader suite uses `47bcba8aa972d504d5e13a4b558dbff87dbfb9a1` assets.
The sole subsequent production change moves candidate activation from textarea
focus to bubbled article focus, covering evidence/placement/decision controls.
Relevant candidate journeys and packaging run freshly against final production;
unchanged sibling coverage is reused with earlier-head attribution. Later evidence
commits contain no product changes. `bindings.json` records source, compiled assets, packaged resources and
executable SHA-256 values. Packaged web resources exactly match `build/web`.

## Behavior and selected validation layers

- Unit defaults: `candidate-review-model.test.js` covers editable decision states,
  conflicts and revision-bound recovery parsing, including empty/Chinese edits.
  Existing public Organization/domain tests retain evidence validation, sending
  coverage, deduplication and asynchronous cancellation. No quota was imposed.
- Real integration: existing `candidate-review.test.js` uses isolated Swift
  StorageHarness/SQLite with immutable revisions, competing decisions, pending
  intents, interrupted target/current/index writes, retries and index removal.
  These tests establish repository persistence rather than mocked-storage claims.
- Essential browser journeys: `candidate-entrypoints-ui.mjs` exercises typed
  review controls, two independent drafts and refocusing, Continue/Save/Discard,
  reload recovery, individual confirm/ignore, then persisted readback and actual
  Action, Initiative/reference and Library Topic entry points. Source bytes are
  compared exactly. No analysis or network send is allowed in that journey.
- Existing `organization-focus-ui.mjs` verifies exact source detour return:
  candidate, destination selection, edit range, opener focus, panel scroll and
  source selection; failed confirmation focus and successful card focus; pointer,
  keyboard, invalid fields, long Chinese text, 393px and reduced-height geometry.
- Existing `organization-review-ui.mjs` exercises pending target recovery,
  partial analysis/retry, individually edited decisions, reference/attach/later,
  source-change refusal, persisted reload and failure retention. Controlled
  analysis responses use synthetic notes only.
- Full maintained UI suite was selected because introducing the candidate task
  into shared navigation leaves uncertain cross-page interaction risk. The suite
  includes catalogue reduced motion, semantic tokens, contrast, modal restoration
  and the broader reader/form/navigation regressions; it is not a repeated unit
  matrix. Same-state before/after screenshots come from the actual app at the
  starting commit and migrated source, using the same focus journey.
- Mac build/resource verification applies because compiled shipped assets change.
  No affected host/transport/OS code exists in this diff, so no native GUI grant
  was requested and no app instance was launched.

## Executed commands and results

`CHROME_PATH` for all browser commands was
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

- `npm ci`: passed, zero audit vulnerabilities.
- `npm run check`, `npm run typecheck`, `npm run build:web`: passed.
- `npm test`: 101 passed, 0 failed at `f538e37`; public model/domain/test
  source bytes unchanged at final head, reused; `unit.log`.
- `node tests/candidate-entrypoints-ui.mjs`: passed after final product changes;
  `entrypoints-readback.json` contains actual persisted records and source hash.
- `node tests/organization-focus-ui.mjs`: passed after final product changes;
  `after-storage-readback.json` and same-state screenshots retain the evidence.
- `node tests/organization-review-ui.mjs`: passed after final product changes,
  including changed-source refusal and retry of an already committed intent.
- `npm run build:mac`: passed on Apple Silicon macOS 26.5.2, including typecheck,
  web build, Swift compile and ad-hoc signing; `mac-build.log`.
- `codesign --verify --deep --strict dist/LocalNotes.app`: passed.
- `npm run test:ui`: complete earlier-head result recorded in `full-ui-47bcba8.log`;
  fresh final-head candidate reruns are recorded separately.

The browser uses actual shared application assets and NotesNative.request/nativeReply
contracts, exposed to isolated real Markdown/JSON storage and Swift SQLite indexes.
It does not exercise WKWebView, custom-scheme loading, native transport, native IME,
system clipboard, OS shortcut registration or native app close/restart. Browser
reload is browser continuation, not a native-process restart claim.

## Failures and repair history

1. First migrated focus journey failed destination retention (empty instead of
   selected initiative). The controlled select callback changed controller state
   without republishing. Publishing that model fixed it; the identical focused
   journey subsequently passed. Original `failure-placement.log` retained.
2. Independent initial review found wrong frontmost draft ownership, repeated
   leave prompt after saving a retained draft, missing field-associated invalid
   feedback, indistinguishable recovery feedback and unowned decision settlement.
   Corrections activate the focused candidate, make the captured task clean after
   retaining its private draft, link the hint, label recovery, and await submitted
   decisions before navigation. Draft revision fencing additionally refuses stale
   edits. Focus and entry-point journeys pass; final independent reviews pass.
3. The first broad suite stopped at a pre-existing Focus synthetic-receiver
   failure: offset 198/error undefined instead of rollback 99/controlled error.
   The exact starting-commit archive reproduced the same signature. Smallest
   harness correction supplies active/request ownership and increments the request
   in its failing `show` stub; original rollback/error assertions remain intact.
   No Focus product code or ownership guards were changed. See
   `failure-full-ui.log` and `failure-baseline-focus-owner.log`.
4. New entry-point harness corrections used the actual Home “全部行动” entry,
   awaited asynchronous editor readback, and expected the Topic's already-linked
   source rather than an empty collection. Behavior assertions were retained and
   strengthened; the completed journey passes.

No two completed repair cycles repeated the same signature without progress.
No security/privacy/product-scope decision was needed; fixes were ordinary
in-scope engineering and test setup corrections.

## Independent final review

Separate Standards and Spec agents reviewed the full base-to-production diff and
then the exact `47bcba8` test-only successor and final `0e127df` focus-only delta. Standards: 0 remaining material
violations or material smell findings; field association, recovery provenance and
active draft ownership fixes verified, including evidence-control activation. Spec: 0 remaining material findings;
Save/Discard/Continue and submitted-write settlement fixes verified, explicit
individual decisions and sibling boundaries retained. They inspected code and
reported evidence; they did not claim independent native runtime execution.

## I/O, performance and limitations

The same focus journey against a clean archive of the exact starting SHA took
3782 ms; migrated source took 5501 ms. These are single end-to-end observations
including screenshots, not startup latency targets or statistically meaningful
speed measurements. Recorded forwarded adapter counts were unchanged for
workspace (41), actionFiles (47), actionIndex (40), actionWrite (32), actionQuery
(55), referenceInventory (9), metadata (9), referencePut (1) and referenceTags (9).
ReferenceQuery counts were 33 before and 33 after; no increased repository work
was observed. These counters cover forwarded fixture calls, not direct synthetic
source reads performed by the exposed bridge. No broad performance claim follows.

Source Markdown is preserved byte-for-byte; readback includes original evidence,
decisions, immutable target identity and persisted resulting records. Hidden drafts
remain private edits and never imply confirmation. “Save and leave” retains a
private edit only; each delivered decision still requires its own explicit button.

Ordinary unchanged-host native compatibility, actual OS/IME/clipboard/shortcut
and native close/restart replay are release-level **DEFERRED**, nonblocking under
the approved policy. Physical input, minimum macOS and Intel execution are
**UNRUN**, not passed. Android-specific and standalone Syncthing checks are
**DEFERRED** by user decision. No old native acceptance result is reused here.
The archived baseline is new comparison evidence, not a transferred acceptance.
