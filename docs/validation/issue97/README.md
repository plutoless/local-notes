# Issue #97 validation

Starting and fetched main: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
GitHub native dependencies and written blockers #93/#84 were closed before edits;
#110/#104 and shared #106 are ancestors of fetched main. Rechecked before final
review: main unchanged, blockers closed, no open overlapping PRs. Only this isolated
branch was edited. Ownership is recorded in `docs/architecture/search-react.md`.

## Validation layers

| Behavior | Layer / command | Result and limits |
| --- | --- | --- |
| Delivered keyword grounding, bounded pages, archive/multi-entity scopes, stale workspace/query, index recovery and revisions | `npm test` | Final suite: 86/86 pass, including real isolated Swift storage/index and shared-domain tests; no semantic implementation |
| Expanded-context reuse by exact identity/version/query and delivered order | `node --test tests/search-model.test.js` | Two passing behavior tests; no UI duplication |
| Input, repeat Command+K, protected task/drafts, IME Escape ordering, selection/caret, expansion, copy, paging, failure/retry, delayed-query dismissal | `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/search-ui.mjs` | Passed with real isolated Markdown/JSON/SQLite fixture and browser bridge shim; copy receipts are controlled bridge values, not OS clipboard |
| All origin/destination types; selected/expanded/scroll return, changed/missing sources, dirty Continue/Discard/Save/failure, stale navigation, source hashes and persisted readback/reload | Same prefix, `node tests/search-navigation-ui.mjs` | Passed at desktop and 393px; unchanged maintained journey; raw evidence in `browser/search-navigation.json` |
| Actual production catalogue, tokens/contrast, pointer/keyboard, selected/invalid, Chinese wrapping, narrow and reduced motion | Same prefix, `node tests/design-catalogue-ui.mjs` plus maintained search-focus journey | Passed; focus screenshots/metrics retained in `browser/before` and `browser/after` at desktop, 393px and reduced heights |
| Typed contracts / syntax | `npm run typecheck`, `npm run check`, `git diff --check` | Passed |
| Compiled shipped assets and Mac package | `npm run build:web`, `npm run build:mac`, `codesign --verify --deep --strict dist/LocalNotes.app` | Passed; current arm64 Mac build, no app launch or GUI custody |

The selected UI tests cover the search-owned surface and its actual cross-page
return seam. Full unrelated UI replay is not justified by this scoped diff; no
shared controller, host, lifecycle or persistence implementation changed. Existing
shared tests are retained. Input/checkbox DOM values, inertness, focus and scroll
remain explicit controller adapters; React alone writes the content below its root.

## I/O and performance

The initial concurrent-build migrated timing had samples 88.51/24.77/46.56/19.73ms
versus baseline 17.32/16.37/15.68/16.30ms. This prompted a sequential paired rerun
after build/test contention ended, using twelve alternating warm keyword queries
on the same real isolated fixture. Baseline samples span 15.29–16.89ms; migrated
15.88–16.95ms. Both perform twelve bounded index requests and zero Markdown body
reads during typing. No reproducible regression or speedup is established. These
are automation/bridge/browser wall times, not native startup or engine benchmarks.
Raw samples, including the slower first observation, remain in logs.

Baseline production bundle: JS 323504 bytes, CSS 6132 bytes. Migrated exact sizes
and hashes are in `source-artifacts.json`. The instrumented baseline changes only
the served search controller back to the starting SHA while sharing the current
host bundle (unused new search export); original pre-edit build/UI and focus
captures are retained separately. This controls search behavior/I/O, not cold
bundle parse/startup overhead. No native process startup/memory claim is made.

## Failures, recovery and remaining coverage

The independent initial Standards review found missing pending-action disabling on
scope/expansion/paging (P2); Spec found no findings. One product correction restores
the existing Button `busyOnAction` contract. Focused search/navigation/catalogue
journeys and Mac packaging/signature were rerun successfully; the new delayed-query
UI assertions verify paging and scope cannot be submitted twice. The new paging
harness initially matched both background and dialog Next controls (one completed
selector-failure cycle); scoping the accessible lookup to the search dialog fixed
it and the next run passed. Initial reviews and failed command receipts are
retained. No two consecutive same-signature failures occurred. Controlled failed
copy, source change/missing, failed Save, delayed reads and query failures are
intentional passing recovery assertions in maintained journeys. The first slow
performance observation is preserved and was investigated as described above.
`npm ci` succeeded without dependency changes. No model/private-note processing,
prerequisite edits, schema migration or new implementation workers occurred.

Native WKScriptMessageHandler/custom-scheme runtime, OS shortcut/IME/clipboard,
window close/quit/restart and physical input were not exercised. Host/transport/
resource-handler/lifecycle implementation is unchanged; ordinary native replay is
release-deferred under the approved policy, never passed. No GUI grant was given
and no native app was launched. Minimum OS/WebKit, Intel and physical-input runtime
remain unrun. Android-specific tests/build and standalone Syncthing tests remain
deferred by user decision. Browser reload/readback does not establish native quit.

Independent final-head Standards and Spec review reports are returned to the
coordinator separately, alongside final SHA/base/PR and command receipts. The
coordinator alone decides integration/merge/closure; no prerequisite was rewritten.

Final correction receipts use the `issue97-correction-*` names; earlier passing
receipts remain historical source-bound evidence. The 86-test full suite preceded
the pending-button correction; its domain/model/storage code is unchanged, so the
affected UI/packaging layers were rerun rather than repeating unrelated tests.
