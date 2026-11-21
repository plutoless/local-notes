# Issue #98: delivered Initiative main integration

Same active continuation/task, following synchronization integration. Original issue start
`8ae4622f4a23033ec149038d9a370c9985a138e8`; task start
`906e61f77a6cc415b4060669b989f813ecb4a1e9`; intermediate synchronization head
`8e4a25c888fd31111ca4efd8e6a140ff449055ac` on main514a513. Latest fetched/integrated
main `a8a6ff60d3a3232c427a26623c46ca05bc22fcb4` is accepted Initiative PR118,
reviewed head `261f59a4d80e619c1412ca9e729c2b4d9227f14e`. Verified ancestry before
writing; only the existing issue98 branch/PR113. Production merge commit
`3dddda16e13a90d033e6c5ab9e80fd5c3df441f9`; the final following commit adds this
report/receipts/screenshots only. Exact final production hashes accompany local bindings.

## Actual overlap

Automatic merge, no conflicts or new behavior. Retains typed Initiative controls,
models and source/Action context plus Organization's host registration/catalogue/root.
Shared app now calls Initiative release at navigation/refresh/workspace boundaries;
these delivered changes are verbatim main. Initiative, synchronization, Library,
Action/reader-copy contracts and all sibling tests match main, including sequence
invalidation and complete65/exact15 readiness/assertions. Organization controller,
view/service and tests remain byte-identical to the intermediate reviewed head.
No sibling fix, competing implementation, weakened assertion or second DOM owner.

The relevant cross-layer seam is leaving/returning through the shared reader and
Action while Organization owns a source context. The small existing Organization
journey covers that actual event wiring. Public Initiative model/domain/storage tests
cover quotes, source states, immutable partial commit/retry and restart; repeating the
coordinator's unchanged Initiative ending UI matrix is not warranted.

## Fresh checks on merged production

Build completed before tests; every command exit0. Browser commands use
CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome.

| Behavior/layer | Executed command | Receipt |
| --- | --- | --- |
| Typed combined registrations and syntax | `npm run typecheck`; `npm run check` | `typecheck.txt`, `check.txt` |
| Shipped assets and signed Mac package | `npm run build:mac` | `package.txt` |
| Public models/source/ending decisions, real record/index/immutable retry/restart, Organization cancel/dedup, bounded ownership and resources | `node --test tests/initiative-model.test.js tests/initiatives.test.js tests/organization.test.js tests/library-ownership.test.js tests/collection-context.test.js tests/native-assets.test.js` | `public-storage-resource.txt`: 14 passed |
| Actual explicit Organization setup/send, candidates readback/reload, source reader return, Favorites/capture discard/Action persisted return, source bytes | `node tests/organization-ui.mjs` | `organization-return-ui.txt` |
| Combined production catalogue consumers, keyboard/dialog restoration, selected/invalid, contrast, 393px, reduced motion | `CATALOGUE_EVIDENCE=docs/validation/issue98/initiative-integration node tests/design-catalogue-ui.mjs` | `catalogue-ui.txt`, PNGs |

No blanket full UI or full suite. Package/built resource SHA256 equality, signature,
source/test/environment binding and separate complete-PR final-head Standards/Spec
reviews are recorded locally under `build/issue98-initiative-integration-*`.

## Reuse and failures

The preceding synchronization integration's 21-test, Organization recovery and
shared guarded reader-copy/delayed-leave receipts remain at intermediate8e4. Their
own service/tests and app copy/reload callback behavior are unchanged; Initiative
release is the only new app overlap and current Organization event journey covers it.
No fresh recovery/copy/reload assertion is invented here. Coordinator's supplied
resulting-main Initiative moved-source selected/focus return, shared Action ending
partial-commit/retry/readback/reload and protected drawer UI passes are attributed
only to coordinator evidence and verbatim production/test sources. The earlier
complete65/exact15 Favorites UI remains906-bound with identical Library/context/test
sources. Prior focus/settings/selection/I/O evidence remains attributed to its
original unchanged sources. No original intermittent browser cause is inferred.

No new product/harness/test failure or completed repair cycle. The intermediate
push failed once with curl28 low-speed timeout; remote remained906, then the bounded
retry succeeded at8e4 without TLS/global-config changes or force. Its local receipts
are `build/issue98-sync-push.txt`, `build/issue98-sync-remote-after-push1.txt` and
`build/issue98-sync-push-retry.txt`. Historical failed evidence/counters remain
preserved, including previously resolved #94 hold and generated-resource race/recheck.
No acceptance waiver, custody/fencing bypass or new user decision.

Browser checks use synthetic isolated Markdown/JSON, real Swift file/SQLite adapters
and controlled local AI responses through a shim. They do not exercise WKWebView
transport or native OS input. No native app launch/GUI grant/clipboard custody,
private processing/model download, scheduler changes or main mutation. Native ordinary
compatibility release-deferred; OS IME/clipboard/shortcuts/close/restart/physical input,
Intel/minimumOS/startup/memory unrun; Android/Syncthing user-deferred, never passed.
Coordinator alone decides exact-head merge/closure. Bundle growth from371375 JS bytes
to the package's current value reflects delivered Initiative components, not an
Organization performance regression claim; no native speedup/startup claim.
