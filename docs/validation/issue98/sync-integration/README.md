# Issue #98: synchronization-main integration

Continuation start: `906e61f77a6cc415b4060669b989f813ecb4a1e9`.
Original issue start: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched/integrated main: `514a5138a6c76443a5bc04424bddd9a2960a7d69` (PR115,
reviewed synchronization head `a69bf0c71826e76093854545346bc33b8f87f5da`).
Verified fetched ancestry before writing. Native/written #98 blockers #93/#85 are
closed and implemented; shared #106 and accepted #116 sequence/readiness correction
remain present. Only the existing issue98 branch/PR113 is used.

## Actual overlap and resolution

Three additive conflicts: host exports, production catalogue models/examples, design
guidance. Retained both Organization and synchronization imports, callbacks, examples
and exports; preserved Favorites/note forms, Action and search sections/registrations.
HTML merged automatically, retaining Organization's explicit root and main's new
file-conflict root. No two renderers own a node. Main's app, SyncScreen/draft helpers,
React synchronization/file-conflict component and all sibling tests are unchanged.
No competing correction or sibling implementation was introduced.

Actual behavioral overlap is the shared reader used by Organization evidence links:
main adds guarded pending copy/reload and the existing note-task leave boundary.
The new callbacks are consumed verbatim. Library sequence invalidation and strengthened
complete-65/exact-15 Favorites tests also match main verbatim. Organization production
controller/view/service, its maintained tests, native bridge and token stylesheet
remain unchanged from the continuation start.

## Fresh risk-selected checks

All commands completed exit zero after production build finished. Browser commands
set CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome.

| Layer/behavior | Executed command | Receipt |
| --- | --- | --- |
| Combined typed exports, callbacks and syntax | `npm run typecheck`; `npm run check` | `typecheck.txt`, `check.txt` |
| Changed shipped modules/components and signed Mac package | `npm run build:mac` | `package.txt` |
| Public synchronization private-draft/task/retry rules, real immutable conflict/recovery storage, Organization request/cancel/dedup, query/collection ownership and generated resources | `node --test tests/sync-drafts.test.js tests/synchronization.test.js tests/organization.test.js tests/library-ownership.test.js tests/collection-context.test.js tests/native-assets.test.js` | `public-storage-resource.txt`: 21 passed |
| Organization explicit setup/send, candidate readback/reload, source reader return, Favorites/capture discard/Action persisted return and original source bytes | `node tests/organization-ui.mjs` | `organization-return-ui.txt` |
| Request partial failure/continue/retry, cancellation, invalid/offline response, source-change rejection, pending decision recovery and persisted candidates | `node tests/organization-review-ui.mjs` | `organization-recovery-ui.txt` |
| Shared guarded reader-copy and delayed leave, original source preservation, persisted copy/result and shared task return | `node tests/ui.mjs` | `reader-copy-leave-ui.txt` |
| Combined actual production catalogue, selected/invalid/focus, contrast, 393px and reduced motion | `CATALOGUE_EVIDENCE=docs/validation/issue98/sync-integration node tests/design-catalogue-ui.mjs` | `catalogue-ui.txt`, PNGs |

The maintained `ui.mjs` owns the delayed copy regression, so its other existing Action
and note assertions also executed. No new duplicated UI matrix or blanket full UI/
full-suite run was added. Its leave token is a browser-dispatched bridge callback,
not AppKit/OS quit evidence. Reload callback code is byte-identical to accepted main;
this report does not invent a separate fresh reload-conflict UI assertion.

## Reuse, bindings and limits

The supplied coordinator resulting-main sync UI and guarded reader checks are
attributed to coordinator evidence, not silently claimed as execution here. Accepted
source-bound synchronization UI evidence on main is reused only for unchanged
SyncScreen/draft/component/repository contracts; no additional sync modal UI replay
is needed for additive host/catalogue registration plus the freshly covered shared
reader seam. Original Organization focus/selection/settings/visual/I/O evidence
remains historical with unchanged module attribution; fresh named feature/recovery
journeys above establish current coexistence. The previous exact-65/15 Favorites
check remains at head906e61f and its identical Library/context/test source binding;
it is not claimed freshly rerun. No acceptance assertion or sequence fence weakened.

All historical failed evidence and correction-cycle records remain preserved. This
continuation has no new setup/product/test failure or completed repair cycle. No
same-signature no-progress counter is reset. The global #94 hold was resolved by the
coordinator's accepted #116 correction; main retains that correction. No new blocker
or user decision is introduced, and coordinator alone decides final merge/closure.

Final complete-PR Standards/Spec reports and exact source/test/environment/compiled/
packaged bindings accompany PR113 and local
`build/issue98-sync-integration-{bindings,standards-review,spec-review,report}`.
Mac signature and matching resource pairs are verified without launching the app.
Combined bundle size is recorded as an observation; no native startup, memory,
physical-input latency or speedup claim is made.

Browser checks use synthetic isolated Markdown/JSON, real Swift file/SQLite adapters
and controlled AI responses through a shim, not WKWebView UI transport or native OS
IME/clipboard/shortcuts/close/quit/restart. No GUI grant/native launch/clipboard custody,
model download, private processing, scheduler changes or main push occurred. Ordinary
native compatibility remains release-deferred; physical/Intel/minimumOS/native
startup/memory unrun; Android/Syncthing user-deferred and never reported passed.
