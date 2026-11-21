# Issue #98: Action-main integration continuation

Continuation starting head: `999c2958e7f01d1d862914b6ff6793df0dbbd759`.
Original issue starting SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched integration base: `1ab961d31287489324f6063549a6ce2aa9dabf7c`
(PR112, reviewed Action head `527af3b08c30df86125cbca2ae6daa7949d4cf2b`).
Ancestry was verified before editing. Native API blockers #93/#85 and the written
blockers are closed; their implementations and shared #106 remain in fetched main.

## Actual overlap and resolution

Merged fetched main in the existing issue98 branch, without rewriting history.
Only two files conflicted: `web/react/host.tsx` exports and additive design guidance.
Retained both Action and Organization exports and all design sections. Action's
paragraph receives its own heading rather than becoming part of Organization's
section. Catalogue and HTML merged automatically and were checked for both actual
production consumers/roots. The resulting `app.js`, `action-screen.js`, Action React
components and sibling tests match main exactly. No sibling code or behavior was
rewritten. No two renderers acquire the same container: Action releases shared
`#items` through the delivered app adapter before another owner uses it; Organization
continues to own only its selection/preview and settings roots, with legacy candidates
in their separate island. Reader/Action contextual origin and return remain existing
app/controller authorities.

## Fresh risk-selected validation

All commands below completed with exit zero after the production build finished;
no test raced a mutable build. Browser commands set
`CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`.

| Layer and public behavior | Executed command | Receipt |
| --- | --- | --- |
| Combined types and host contracts | `npm run typecheck` | `typecheck.txt` |
| Shared syntax | `npm run check` | `check.txt` |
| Changed shipped assets, ARM64 Mac packaging/signing | `npm run build:mac` | `package.txt` |
| Action entry ownership and submitted/focus recovery; real revisions/index/restart; Organization explicit scope/retry/dedup/cancel and candidate decisions; current source/resource manifest | `node --test tests/action-entry.test.js tests/actions.test.js tests/organization.test.js tests/candidate-review.test.js tests/native-assets.test.js` | `public-storage-resource.txt`: 23 passed |
| Actual indexed selection, exact preview, settings leave/caret, stale queries/setup replies, cap and page-end keyboard position | `node tests/organization-selection-ui.mjs` | `selection-ui.txt` |
| Explicit device setup/send, persisted candidates/reload, evidence-source detour and return through app's new release adapter | `node tests/organization-ui.mjs` | `organization-ui.txt` |
| Action create/status/filter/history, persisted reload/caret/source preservation, shared-list ownership | `node tests/actions-react-ui.mjs` | `actions-ui.txt` |
| Note/list/table passage-to-Action confirmation, cancel, source change, double submit, lost-reply restart and nested Action/reader/context return | `node tests/reading-actions-ui.mjs` | `reading-actions-ui.txt` |
| Combined production catalogue, selected/invalid/focus, contrast, 393px and reduced motion | `CATALOGUE_EVIDENCE=docs/validation/issue98/action-integration node tests/design-catalogue-ui.mjs` | `catalogue-ui.txt` and PNGs |

These are the cross-layer journeys affected by Action's new shared-list release
and contextual entry ports, not the full unrelated UI suite. Domain/storage behavior
remains below the UI. Action UI measured 27 queries and zero body reads; its elapsed
1865ms includes screenshot work/concurrent test load and is not a controlled speed
comparison. No performance improvement is claimed. Production JS is approximately
351.19kB/89.36kB gzip after including Action; exact sizes/hashes are in bindings.

## Reuse and coverage boundaries

The original issue98 behavior implementation is byte-identical to the continuation
start: Organization controller/view/service, bridge, token styles and repositories
are unchanged. Original selection/request failure/retry/cancellation/resume/dedup,
source hashes/candidate readback, pointer/keyboard, desktop/393px/reduced-height,
long-Chinese and before/after evidence under the parent directory remains attributed
to its original source binding. Fresh selection and full named send/source-return
journeys above establish coexistence, not a fresh replay of every historical variant.
The supplied coordinator postmerge Action checks were still running when assigned;
none is inferred passed or reused without its receipt. Only commands executed here
are called fresh results. No new product/setup/test failure or repair cycle occurred
in this continuation; historical failures and their cumulative diagnostic history
remain preserved under the parent directory.

All browser persistence checks use isolated synthetic Markdown/JSON and real Swift
SQLite/file adapters through a browser bridge shim. Native WKWebView UI transport,
OS IME/clipboard/shortcuts/close/quit and physical input are not exercised. No native
app launch/GUI grant/custody occurred; package/signature checks are not runtime input
proof. Ordinary native compatibility replay is release-deferred; physical/minimumOS/
Intel/native startup/memory remain unrun. Android and standalone Syncthing remain
user-deferred. No external/private-note processing or model download occurred.

The exact final head/base, independent complete-PR Standards/Spec review receipts and
source/test/generated/package hashes are delivered via the existing PR113 and local
`build/issue98-action-integration-{bindings,standards-review,spec-review,report}` files.
Coordinator alone merges/closes/labels or pushes main; no scheduler state changed.
