# Issue94 postmerge correction

Original branch/worktree head: `eaa239d15977308adf4587ad813d88cfc151444f`.
Fetched main / correction base: `7042d0669734bdfc0e7d86e9437e12a790965a83`.
PR114 is merged and #94 closed; neither was reopened or edited. The correction
is local on `plutoless/local-notes-issue-94-postmerge` in the original worktree.
No main push, remote correction branch, corrective PR or scheduler change occurred.
Coordinator decides how to publish/integrate this scoped patch.

## Preserved failure and controlled comparison

The coordinator's `pr114-postmerge.txt` contains the initial missing-baseline
setup failure; `pr114-postmerge-recheck.txt` preserves the later assertion failure:
expected 51–65, observed `索引未完成：66；本页 51–100`. Their copied `.txt`
contents are byte-identical to the original `.log` receipts. Neither is replaced
by later passing evidence. Coordinator evidence remains at the supplied external
postmerge path as well.

Unchanged original-worktree and unchanged clean-main commands both passed once:
`CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/note-context-ui.mjs`.
The failure is intermittent, not evidence of a merge-only source regression.
`comparison.json` verifies selected original/merged/clean source hashes are equal;
all 24 retained baseline files exactly match the coordinator's hashes in both
locations. The clean archive is `/var/folders/hh/pylr345909b5lkwdskk672yw0000gp/T/pr114-main-lohse09o`.
Its source code was never modified by this worker. Different compiled bundle bytes
are recorded rather than assumed equal across build roots.

Each run creates fresh temporary real Markdown/JSON and private SQLite storage:
65 synthetic Favorites plus one nonfavorite reference = 66 sources. Bridge probes
recorded a full Library response (total66, 50 rows) and Favorites responses (total65,
15 rows at offset50); initial partial responses also occur while the index fills.
Thus 66 is the legitimate all-notes count, not the expected Favorites count.
The generated query-order probes in `build/` and preserved receipts targeted only
query parameters/results and UI readiness; they did not deterministically recreate
the original browser failure, because destination/background queries could finish
before observation. No stronger browser-root-cause claim is made.

## Hypotheses, deterministic finding and correction

1. **Collection ownership:** an older Library query completing after a switch but
   before the next render can publish under Favorites. A public controller test
   reproduced this deterministically (stale-query-before2.txt): both controls and
   rows were published after the switch. The same gap applies to rejected queries.
2. **Readiness:** title alone, or absence of “正在”, does not establish complete
   Favorites indexing or destination query completion. Traces show partial totals
   before65. The old test asserted immediately after the heading changed.
3. **Storage/fixture contamination:** falsified for these controlled runs by fresh
   roots, exact original source hashes and real filtered query total65/15 rows.

Production correction: increment the existing query sequence at `switchCollection`
entry, invalidating previous reads immediately, including their failure feedback.
No query, persistence, schema, form, sibling or native implementation was changed.
The new test holds both successful and rejected reads across this boundary.

Harness correction: require complete visible `已索引：65` Favorites state with no
progress and enabled refresh, then independently assert the real repository's
filtered last page has total65, 15 rows and no more pages. Existing exact filter,
selection, page and scroll assertions remain; page assertions are strengthened to
`已索引：65；本页 51–65` and exact final-page path identities. Capture return,
persisted reload and source hashes remain required. There is no relaxed timeout,
range tolerance, fixture-count change, disabled assertion or synthetic persistence.
Optional explicit baseline/assets/output directories make the controlled clean
archive comparison repeatable without editing its source or copying new code there.

## Selected validation and receipts

- Expected red: `node --test tests/library-ownership.test.js` before correction
  reproduces late publication. Its first bootstrap attempt failed because the
  bridge requires `window`; setup was corrected using the maintained controller
  test pattern, and that setup failure is retained in stale-query-before.txt.
- `npm run build:web`: build-after.txt.
- `node --test tests/library-ownership.test.js tests/collection-context.test.js tests/library.test.js tests/topic-save.test.js`:
  11/11 passed in affected-after.txt; includes real Swift/SQLite bounded Library
  ordering/scope and Topic committed-revision recovery. The final controller test
  variant plus context cases separately passed 3/3 in controller-final.txt.
- Corrected original command: corrected-original.txt and exact-original-final.txt
  pass with complete storage count, exact rows, selection/filter/page/scroll,
  capture readback/reload and unchanged original source hashes.
- Corrected harness against unpatched clean-main assets: corrected-clean-main.txt
  and exact-clean-main-final.txt pass. Command adds
  `NOTE_CONTEXT_ASSETS_DIR=<clean archive>/build/web NOTE_CONTEXT_OUTPUT_DIR=build/issue94-clean-main-corrected`
  and uses the original worktree's test/adapter with identical source bindings.
  This separates readiness correction from the production fence; passing normal
  timing does not invalidate the deterministic stale-query regression.
- `CHROME_PATH=... node tests/remaining-forms-ui.mjs`: remaining-forms.txt passes
  active leave/Continue/discard, selection, persistence, invalid/retry/recovery and
  desktop/393px/reduced height against real isolated storage.
- `npm run typecheck`, `npm run check`, `npm run build:mac`,
  `codesign --verify --deep --strict dist/LocalNotes.app`: named receipts passed.
  source-artifacts.json binds the source/controller and compiled/package files;
  the patched controller is byte-identical in source, build and package.

The expected red regression was followed by one production correction cycle and
passing targeted checks. There were no two consecutive completed same-signature
corrections without diagnostic/behavior progress. Earlier delivery failure cycles
remain recorded in their original reports; none were deleted or reclassified.

## Coverage/reuse and limits

The correction affects async collection ownership and test synchronization, not
visual design or source/form persistence. Existing immutable revision/source/task
behavior is reused with its original head attribution; only selected affected
controller/storage and actual-app seams were rerun, not a blanket suite.
Original before/after screenshots remain historical. Current observations retain
source hashes and raw timing samples; concurrent browser/storage/build latency is
not a product speedup/slowdown claim or native performance measurement.

Browser requests use HTTP/NotesNative harness transport with production Swift
storage/index adapters, not native WKWebView or OS input. Mac packaging is compiled
asset verification, not a native runtime pass. No GUI grant/launch/input/clipboard
or private processing occurred. Native OS/IME/clipboard/close/restart compatibility
remains release-deferred; physical/minimum OS-WebKit/Intel remain unrun. Android-
specific builds/tests and standalone Syncthing remain user-deferred/nonblocking.
Merge hold remains until coordinator accepts this correction and final reviews.
