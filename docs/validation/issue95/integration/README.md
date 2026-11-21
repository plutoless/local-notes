# Issue #95: search-main integration continuation

Original approved/pushed Action head: `968ebb2bffb49b558cb9d4cc106edaa7d0ef6fd8`.
Original starting SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched integration base: `f39466dce449467620a7e08eacf3a1f9087c29b5` (#111,
reviewed search head `9fc66572713a49438596251fbae50c42bd2c8773`).
Merge implementation head: `1f9c4953819a4bdff91d1f2612d0f55dd33cff59`.

Before editing, fetched main and verified the supplied search merge is its
ancestor. GitHub #97 is closed; #93 remains closed in both native dependency API
and written #95 blockers, with its implementation on main. PR #112 was the sole
open PR. No prerequisite, issue state, scheduler state or coordinator code changed.

## Integration / ownership

`git merge --no-ff origin/main` had additive conflicts in `web/react/host.tsx`
and `docs/design/README.md`. Both Action and search exports and design sections
were retained. The automatic catalogue merge was inspected and retains actual
production Action and search examples. The merged search controller, typed view /
model and maintained search tests match fetched main without edits. Action/app
behavior files match the previously approved Action head without edits. No two
renderers acquire the same container, and the singleton search/lifecycle/overlay
adapters remain intact. The Action legacy control ports remain as previously
reviewed and documented; this continuation does not migrate sibling surfaces.

## Risk-selected verification (fresh)

All commands completed with exit zero. Browser commands use
`CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`.

| Layer / behavior | Executed command | Receipt |
| --- | --- | --- |
| Types and typed host/search/action coexistence | `npm run typecheck` | `typecheck.txt` |
| Shared syntax | `npm run check` | `syntax.txt` |
| Combined local assets | `npm run build:web` | `build.txt` |
| Public Action pending/return/recovery behavior; persisted Actions/revisions/index restart; typed search identities, source grounding and bounded real indexes | `node --test tests/action-entry.test.js tests/actions.test.js tests/search-model.test.js tests/search.test.js` | `fast-storage.txt`: 19 passed |
| Actual Action UI/persisted history/readback/reload and same-revision repair | `node tests/actions-react-ui.mjs` | `actions-ui.txt` |
| Actual note/passage-to-Action evidence, selection/context return, stale sources, failures and lost-reply recovery | `node tests/reading-actions-ui.mjs` | `reading-actions-ui.txt` |
| Source-search-return actual DOM, Action/reader/Initiative/home origin compatibility, selection/caret/scroll, save/discard/reload and stale reads | `node tests/search-navigation-ui.mjs` | `search-navigation-ui.txt`, `search-navigation.json` |
| Merged production catalogue, focus/selected/invalid, contrast, 393px, reduced motion | `CATALOGUE_EVIDENCE=docs/validation/issue95/integration node tests/design-catalogue-ui.mjs` | `catalogue-ui.txt` and PNGs |
| Changed shipped bundle in Mac package | `npm run build:mac` | `mac-package.txt` |

The search-navigation suite was selected because the new singleton React search
view and existing app capture/open/restore adapter cross the migrated Action
editor. Its existing origin/destination variants establish coexistence rather
than repeating the Action domain matrix. No full UI matrix or unrelated feature
suite was run. The combined Action run made the same 27 queries and zero body
reads as the earlier expanded repair journey; its screenshot-heavy 916ms total
is an observation, not a controlled performance comparison. JS is 341.99kB /
87.28kB gzip after including search; no speedup is claimed.

`source-artifacts.json` binds exact source/test/generated/package hashes to the
merge implementation head. `cmp` confirmed generated and packaged React JS and
search controller bytes match. The later evidence-only commit does not change
these production source bytes. Existing original #95 baseline/visual/domain and
full-suite receipts under the parent directory remain attributed to their prior
source bindings; they are reused for unchanged behavior, not reported as freshly
executed. No fresh integration product/test failures or correction cycles occurred.
Previously recorded failed evidence remains intact.

These browser tests use synthetic isolated real Swift file/SQLite storage via a
browser bridge shim. They do not exercise WKWebView transport, OS IME/clipboard,
AppKit exit dispatch or physical input. Package build is not a native launch.
Native host/resource handlers/OS integration are unchanged; ordinary OS replay
remains release-deferred. Physical/minimum-OS/Intel and native startup/memory remain
unrun. Android-specific and standalone Syncthing checks remain user-deferred.
No GUI grant, model download or private-note processing was used. The coordinator's
separate postmerge search checks were not assumed passed; only receipts executed
here are reported.

## Independent reviews

Separate Standards and Spec agents reviewed the complete PR diff against fetched
main and the combined merge resolutions at `1f9c495`; both reported no material
findings. Reports are `standards-review.md` and `spec-review.md`. A final evidence-
commit acknowledgment is requested before updating the existing PR #112.
Historical exact command-log trailing blank lines remain the previously accepted
minor issue; no product behavior is waived. Coordinator alone integrates/merges
and closes the issue.
