# Issue94 integration with merged Actions95

Continuation starting head: `f7fc2d711d431d6d5d175c1e321e92cd24c5407e`.
Fetched/merged main: `1ab961d31287489324f6063549a6ce2aa9dabf7c` (PR112).
PR112 reviewed head was `527af3b08c30df86125cbca2ae6daa7949d4cf2b`.
Integrated production head: `da436f74670d9961b48e11df40b29632701ef54b`.
Original #94 starting SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8`.

Before writing, fetched main, verified PR112 merged/ancestor, re-read current #94
acceptance and validation guidance, and re-queried native blockers. Both written
and native blockers name #93, closed and available. Open PRs were #113, #114 and
#115; no unmerged sibling was consumed. Coordinator's separate postmerge Action
checks were described as pending; no result is inferred from them. All pass claims
below are this worker's executed receipts in this isolated worktree.

## Actual overlap and resolution

- `app.js`: preserve incoming `actions.release()` when leaving Actions, before
  Initiative/shared-list reuse, and before workspace list replacement. Preserve
  #94 `resetCollections()` and typed metadata/star callback instead of restoring
  the legacy star writer. No domain/task/draft service was replaced.
- `react/catalogue.tsx` and design README: additive merge retains both note field/
  classification examples and Action rows. Host exports auto-merged both features.
- Incoming Action source/editor/history/controller, HTML ports and sibling tests
  are unchanged relative to fetched main. No schema, dependency, host/transport,
  engine floor, model/privacy, or sibling implementation changes were made.
- Updated the shell ownership inventory to refer to both delivered note and Action
  inventories. No extra listener, renderer or modal owner was introduced.

## Selected validation and executed receipts

| Risk / behavior | Layer and command (`logs/`) |
| --- | --- |
| Entry/late reply/committed recovery, collection custody, immutable writes/restart, Topic commit, bounded private history | `node --test tests/action-entry.test.js tests/collection-context.test.js tests/actions.test.js tests/topic-save.test.js tests/reading-history.test.js`: 19/19, `public-storage.txt` |
| Note/passage source guards, confirmation/cancel/double submit, failed/lost reply recovery and nested Action return | Actual app `node tests/reading-actions-ui.mjs`: `reading-actions-ui.txt` |
| Independent Favorites filter/page/selection/scroll through Actions and linked Initiative, capture return and persisted reload, exact original source hashes | Actual app `node tests/note-context-ui.mjs`: `note-context-ui.txt`, `performance-recheck.txt` |
| Incoming editor/rows/history, create/status/filter, reload/caret/source preservation | Actual app `node tests/actions-react-ui.mjs`: `actions-react-ui.txt` |
| Capture/location active leave, invalid/retry/recovery, return and narrow layouts with combined Action editor | Actual app `node tests/remaining-forms-ui.mjs`: `remaining-forms-ui.txt` |
| Additive production catalogue, contrast/focus/393px/reduced motion | `node tests/design-catalogue-ui.mjs`: `design-catalogue-ui.txt` |
| Typed/shared syntax and shipped assets | `npm run typecheck`, `npm run check`, `npm run build:web`: named receipts |
| Compiled assets in current-arm64 Mac package | `npm run build:mac`, `codesign --verify --deep --strict dist/LocalNotes.app`: `mac-package.txt`, `signature.txt` |

All selected commands completed with exit 0. Browser commands use
`CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, real
compiled app controls, synthetic temporary Markdown/JSON and production Swift
storage/private SQLite adapter through the existing request/reply contract.
HTTP/NotesNative harness transport is not WKWebView or OS-input evidence.
Package JS and compiled JS hashes match in `source-artifacts.json`.

## Reuse and measurement limits

Prior #94 report, failed-attempt history, images, source bindings and the original
86-test full-suite result remain in their original files and attributed to their
recorded heads. They support unchanged domain/Topic/move/IME-browser behavior, not
an invented full-suite rerun on this merge. This continuation selects the affected
controller/storage and actual-app seams above; no blanket full UI matrix was run.
No coordinator or sibling worker receipts are claimed as this worker's execution.

Paired data in `observations.json` uses the original compiled baseline retained by
this worktree and current integrated assets. With other checks running, baseline
refresh ms were 116/101/100 and integrated 265/215/202. This triggered a sequential
recheck after all other owned checks completed: 99/117/99 vs 150/100/100 (medians
99 vs 100ms). The slowdown did not reproduce; three automation samples do not
establish a speedup or a performance budget. Whole-run body read totals start with
cold baseline and warm migrated indexes and are not comparable refresh I/O.
The combined JS is 348368 bytes, CSS 6132; its additional Action component is merged
main behavior. Original source SHA-256 values remain equal after both runs.

No failed product check or completed same-signature correction cycle occurred in
this continuation. Earlier failed harness/review cycles remain preserved in the
original issue94 evidence and are not reset or deleted.

## Review and deferred boundaries

Separate independent Standards and Spec reviews of the complete resulting PR diff
against latest main and the prior delivered head passed; see separate reports.
Final evidence-only head confirmation accompanies the delivery receipt.

No native app launch, OS input, clipboard or GUI custody was requested or used.
Ordinary native Chinese IME/shortcuts/clipboard/close/quit/restart compatibility
remains release-deferred, not passed. Physical input, minimum OS/WebKit, Intel and
native cold startup/memory remain unrun. Android-specific builds/tests and standalone
Syncthing remain user-deferred/nonblocking. No private-note processing or model
download occurred. No user product decision is pending; coordinator owns merge,
closure and any later-main integration.
