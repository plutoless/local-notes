# Issue #98: Favorites-main integration continuation

Continuation starting head: `40552800be380f07ae85fed6c9ac3ec8f448f4fb`.
Original issue starting SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched main/base: `7042d0669734bdfc0e7d86e9437e12a790965a83` (PR114/#94).
Blockers #93/#85 remain closed in native dependencies and the written issue body;
their implementations and shared #106 remain on fetched main.

## Scope and actual overlap

Merged main into the existing issue98 branch without rewriting history. Conflicts
were additive Organization/Favorites imports in the production catalogue and design
guidance. Both imports/examples and design sections survive, including the previously
integrated Action guidance. Host exports merged automatically and include Organization,
Action, search, note forms and collection contexts. No competing components or form
controllers were introduced. The main-delivered app, LibraryScreen, note-form and
collection-context modules and all sibling tests are preserved verbatim. Organization
controller/view/service/bridge/tokens remain unchanged from the continuation start.

Main changes collection switching and short capture/metadata/classification owners,
which are shared with Organization's evidence-reader detour and Action creation.
The maintained Organization journey is extended at that actual seam: favorite an
explicitly opened source, preserve Organization selection/return, cancel capture
from Favorites, explicitly create/save an Action from the favorite reader, return to
the same selected favorite with ordering retained, revisit Organization without
another send, then reload and verify favorite and Action identity plus source bytes.
This is a small cross-feature regression, not a sibling implementation or a duplicate
domain matrix. Existing sibling tests are not modified.

## Fresh selected checks

Every command below completed with exit zero. Build/package finished before tests
read generated assets. Browser commands set
`CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`.

| Layer/behavior | Command | Receipt |
| --- | --- | --- |
| Types, compiled host registrations | `npm run typecheck` | `typecheck.txt` |
| Shared syntax | `npm run check` | `check.txt` |
| Changed compiled assets and ARM64 Mac package | `npm run build:mac` | `package.txt` |
| Collection snapshot ownership/reset, Action entry/pending decisions, real immutable Action/Library/index restart, Organization scope/retry/cancel/dedup and generated-resource/source agreement | `node --test tests/collection-context.test.js tests/action-entry.test.js tests/actions.test.js tests/organization.test.js tests/library.test.js tests/native-assets.test.js` | `public-storage-resource.txt`: 24 passed |
| Organization selection/settings ownership, exact preview, cap, page keyboard position, stale replies and no automatic sends | `node tests/organization-selection-ui.mjs` | `selection-ui.txt` |
| Real Organization send/candidate reload/source return plus Favorites/capture/Action/reader return and persisted Action identity/source preservation | `node tests/organization-ui.mjs` | `organization-favorites-return-ui.txt` |
| Combined production catalogue, long Chinese, selected/invalid/focus, contrast, 393px/reduced motion | `CATALOGUE_EVIDENCE=docs/validation/issue98/favorites-integration node tests/design-catalogue-ui.mjs` | `catalogue-ui.txt`, PNGs |

No blanket full UI/full suite was run. Original issue98 request-failure/retry/resume,
legacy candidate confirmation/recovery/dedup, source-hash, baseline/visual and native
adapter evidence remains attributed to its earlier source/environment bindings.
Organization service/controller/view are unchanged; the new source-return seam is
freshly exercised above. Previous Action-main 23-test and context-return receipts
remain prior-head evidence, not fresh execution here. All original failed receipts
and cumulative correction history are retained. No fresh failed or repeated-same-
signature correction cycle occurred in this continuation.

## Outstanding #94 failure: merge/acceptance hold retained

The coordinator supplied a separate postmerge `note-context-ui` failure: expected
51–65 but observed incomplete index of 66 and page 51–100. Its cause/impact diagnosis
and correction belong exclusively to #94. This continuation does not repair, delete,
weaken or rerun that sibling harness, nor infer a fix from historical passing #94
logs merged with main. No delivered correction was present on fetched main at the
start. The fresh one-favorite return check above does not establish 65-item paging
or remove this failure. Shared collection/index impact remains unclassified pending
owner/coordinator receipts; automatic merge/acceptance remains held. Integration is
authorized, not an acceptance waiver. A delivered main correction must be consumed
and assessed before the coordinator lifts that gate.

## Bindings, reviews and limits

The final exact head/base and independent full-PR Standards/Spec reports accompany
PR113 and `build/issue98-favorites-integration-{bindings,standards-review,spec-review,report}`.
Source/test/generated/package hashes establish the actual 24 packaged resource pairs,
unchanged Organization code and main-identical sibling files. Final JS is about
357.57kB/91.04kB gzip; no native speedup, cold-start, memory or physical-input timing
claim is made. Mac packaging/signature is not native launch or OS compatibility.

Browser acceptance uses synthetic isolated Markdown/JSON and real Swift file/SQLite
adapters through a browser bridge shim, plus controlled service responses. WKWebView
UI transport, native OS IME/clipboard/shortcuts/close/quit/restart were not exercised.
No GUI grant, native launch, clipboard custody or executor construction occurred.
Ordinary native replay remains release-deferred; physical/Intel/minimum OS unrun;
Android-specific and standalone Syncthing tests user-deferred. No private-note/model
processing or download occurred. No scheduler changes or main push/merge/closure.
