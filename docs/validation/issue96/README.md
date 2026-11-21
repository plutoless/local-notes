# Issue #96 validation and review

## Scope and source

Starting SHA, fetched main and merge-base: `514a5138a6c76443a5bc04424bddd9a2960a7d69`.
Reviewed production head: `6c00bd7282e1f19fed3d169770cbacb52fa1667a`.
Implementation commits: `f1662ab` and `6c00bd7`. The evidence successor changes
only this validation directory and the completed plan. Production/source/artifact
SHA-256 values are in [bindings.json](bindings.json), including every shipped
web source, bundled JS/CSS, manifest, Mac executable and the synthetic Markdown
fixture. Every packaged web resource was compared byte-for-byte to build/web.

#95 was CLOSED at start, PR112 merge `1ab961d31287489324f6063549a6ce2aa9dabf7c`
is an ancestor of fetched main; delivered typed Action ports were inspected.
The native dependency API result and final overlapping-PR inventory are retained
as JSON. Organization #113 is independently owned and not consumed. No labels,
scheduler state, main branch, sibling worktree, schemas or native host were edited.
No model/network analysis, automatic Action import or private workspace was used.

See [ownership inventory](../../architecture/initiatives-react.md): typed React
presentation, stable uncontrolled legacy ports, one shared Action editor and one
existing overlay/task authority. Persisted-source resolution is independent of
private recovered draft fields; unique move identity survives note detours.

## Layer selection and executed results

| Public behavior / risk | Layer and command | Observable result |
| --- | --- | --- |
| Source-role projection, preserved quote/identity/order; ending eligibility and retained decisions | Unit: `node --test tests/initiative-model.test.js` | 2 passed; frozen inputs, all unfinished states, excluded retired/other members and destinations |
| Existing domain/repository/revision/index contracts | `npm test` | 99 passed, 0 failed; [full log](unit-all.log) |
| Immutable Action partial commit, Initiative failure, index deletion, restart/retry without duplicate revision; existing source/assignment/move repair | Real integration: `node --test tests/initiative-model.test.js tests/initiatives.test.js tests/packaged-assets.test.js tests/mac-assets.test.js tests/native-assets.test.js` | Final production source: 9 passed, 0 failed; [log](affected-final.log) |
| Actual UI -> bridge request/reply -> real Mac ActionStorage/ActionIndex/ReferenceIndex -> isolated Markdown/JSON/private SQLite | `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/initiative-react-ui.mjs` | Saved title/progress read back after reload; uniquely moved reference opened BEFORE relink save, actual row selected and focused on return; shared Action creation; explicit unfinished decision required; failure after Action commit then retry/reload produces ended Initiative with exactly 3 Initiative revisions; original source bytes equal after move; no page errors |
| Existing lifecycle, role editing, linked note/Action return, paging and source move/error states | Same Chrome environment: `node tests/initiatives-ui.mjs` and `node tests/initiative-drawer-ui.mjs` | Both passed after final production fix; real adapter persistence, clean cancel/no record, dirty leave/continue/discard, saved drafts, failure/retry, duplicate submission, narrow focus and layout |
| Cross-page ownership, shared Action/Focus behavior | `node tests/focus-ui.mjs` in same Chrome environment | Passed; source-identical Focus/Action implementation and registration code at final head; [log](focus.log) |
| Actual catalogue components/tokens, contrast and keyboard/pointer states | `node tests/design-catalogue-ui.mjs` in same Chrome environment | Passed after selector repair; body minimum 12.64, muted 4.72, line 3.57, focus 4.98 contrast ratios; 393px/reduced motion and dialog return checks |
| Syntax/types, compiled shipped assets and Mac resource packaging | `npm run check`; `npm run build:mac`; `codesign --verify --deep --strict dist/LocalNotes.app` | Passed; build:mac runs typecheck/build:web, compiles arm64 target macOS13.3, signs package; exact manifest/MIME/fail-closed native Assets tests passed |

The full 99-test run was executed once with the committed unit/integration
sources. Subsequent production changes were in TSX/InitiativeScreen and test
harnesses; their affected actual-app, domain/integration and asset checks were
rerun. Unchanged Focus/catalogue evidence is reused with inspected source/behavior
attribution; no broad renderer, palette, generic focus system or layout change
was made. Full maintained UI suite was not run: the targeted Initiative, drawer,
Focus and catalogue checks cover the changed ownership boundary without repeating
all independent Library/Search/Organization/Synchronization matrices.

## Visual, I/O and environment evidence

`before-*` and `after-*` show the identical synthetic selected context/metadata
state at 1180x800, 393x852 and 1180x480. Baseline assets were built from clean
starting main and copied into build/issue96-baseline before edits. The new harness
can select them with `INITIATIVE_BASELINE=1`. Text, source and viewport are fixed;
focus/selection assertions accompany screenshots. Catalogue checks add invalid,
selected, pointer/keyboard and reduced-motion evidence. Inspected narrow form and
desktop context images show readable wrapped long Chinese content, restrained
focus, 44px control targets and no horizontal overflow. Existing compact metadata
field geometry remains. Earlier issue33/47/31 evidence overwritten by maintained
tests was restored, not substituted as issue96 evidence.

Single baseline fresh-navigation sample: 168ms until selected Initiative;
final migrated sample: 197ms. Both made 23 observed bridge requests (16 bounded
Action queries, 4 Markdown reads) through the same capture states. Earlier
migrated samples ranged 173–202ms. These are local observations, not a statistically
controlled benchmark or a warm-start guarantee; no extra bridge I/O was observed.
Bundle JS grew from 362.16kB/92.66kB gzip to approximately 376kB/95kB gzip.
The parent #89 scale benchmark was not repeated for this scoped presentation work.

Environment: macOS 26.5.2 (25F84), arm64 Darwin25.5.0; Node25.1.0;
Chrome158.0.8127.36 headless; Playwright1.58.2; Swift6.3.2.
The browser loads the actual built application using a routed test origin and
NotesNative request/reply adapter forwarding to a separate Swift storage process;
it does not exercise WKWebView message transport, native app lifecycle or OS input.
Fixtures are isolated temporary synthetic storage; child processes/browser and
fixture directories are cleaned by finally handlers. No native GUI lease was used.

## Failures and repair history

All original receipts are retained; none are relabeled passed.

1. [failure-01.log](failure-01.log): harness expected a responsive-hidden progress
   span to be visible. The persisted text existed. Corrected to check attached
   persisted content separately from visible workspace; full journey passed.
2. [failure-02.log](failure-02.log): catalogue Library `[data-path]` selector became
   ambiguous when Initiative links were added. Narrowed to existing `.card` rows,
   preserving its assertions; catalogue passed. No product weakening.
3. Independent Spec review of `f1662ab` found resolved-note navigation used the
   moved path but selection used the original. Production repair uses effective
   path for navigation/data/selection and explicitly restores selection on return.
4. [failure-03.log](failure-03.log): new move regression tried to remove a reference
   index not yet created in this smaller fixture. `rm(force:true)` handles absent
   optional rebuildable index; source assertions retained.
5. [failure-04.log](failure-04.log): test read selection immediately after click,
   before asynchronous note load settled. Await actual reader/selected row.
6. [failure-05.log](failure-05.log): settled note RETURN actually lost the moved row;
   the private draft already held the repaired path, so old form-row lookup skipped
   persisted-source resolution. Resolve each persisted source independently and
   only mutate an exact/unique matching draft row. Final regression passed both
   before-save selection and return focus, plus all maintained Initiative checks.

Each repair introduced concrete diagnostic/behavior progress; no two completed
cycles repeated an unchanged signature without progress. No privacy, permissions,
irreversible scope or coordinator decision was required.

## Independent reviews

Standards and Spec reviewed `514a5138...f1662ab` independently. Standards found no
material issue and one minor unused-harness setup observation (removed). Spec
found the moved-reference selection P2 above (fixed).

Both independently re-reviewed `514a5138...6c00bd7` after repairs:

- **Standards:** passed; zero material or minor findings. Persistence/draft fields
  remain separate, React owns context links, no storage/native/consent scope change.
- **Spec:** passed; zero material findings. Resolved-path identity/selection and
  context-return regression covered; existing shared Action/lifecycle retained.

The PR records exact evidence-successor review results as well. Coordinator alone
conditionally merges/closes; worker did neither.

## Deferred, unrun and limits

Ordinary packaged UI OS compatibility, actual Chinese IME, OS-injected/physical
keyboard, native clipboard/shortcuts, native close/restart: release-level DEFERRED,
nonblocking by maintainer revision4/5. Browser fill/keyboard/caret/selection is
browser evidence only. No GUI run or native transport pass is claimed.
Android-specific builds/device/SAF and standalone Syncthing remain user-deferred.
Intel hardware and runtime execution on macOS13.3 were unrun; compilation target
and resource tests do not prove minimum-OS/Intel behavior. There are no known
remaining product failures in the scoped validated journey.
