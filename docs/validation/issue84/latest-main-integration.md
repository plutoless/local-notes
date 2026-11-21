# Issue #84 latest-main integration

Starting reviewed/pushed head: `aba47e9acf8e3d3fbc2d591854ab8eb35998692d`.
Latest main: `2e0dfeac0eb2edf603481d163a56e5d5c250baf7`, containing merged Organization #85 / PR100 and sync #86 / PR103. Original implementation base remains `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3`; prior shared-fix integration base remains `20302d140dac350e543731543d72246275ee7353`. Both the live native dependency and written blocker still identify closed #81; #105 remains integrated once through PR106.

## Integration impact and selected layers

The merge preserves all sibling production changes, tests and historical evidence. It adds no issue #84 production implementation and changes no shared focus contract. The incoming runtime diff is limited to:

- Organization candidate/source-opener restoration and its `app.js` callback. The callback now receives the actual Organization opener explicitly; global-search source/open/return implementations are unchanged.
- Sync-panel opener, refresh, chosen-version and discard focus behavior. These remain sync-owned; storage, bridge, global search and shared leave primitives are unchanged.
- One `.sync-version button[aria-pressed="true"]` selected-state rule. It has no consumer in the search dialog or leave primitive fixture.
- A maintained Organization journey added to `package.json`; all pre-existing test commands remain present.

Validation follows the maintainer's layered policy:

| Layer | Selected check / reuse boundary |
| --- | --- |
| Fast public behavior and real adapter integration first | Run `node --test tests/search.test.js tests/task-drafts.test.js tests/native-assets.test.js` on the final head. Search exercises real isolated Markdown/records/SQLite, scopes, grounding and stale-source behavior; draft tests cover public recovery decisions; asset test verifies current native allowlists without launching a host. |
| Previous 67-test result | Retain the original `aba47e9` execution attribution. Bind unchanged unit test sources, transitive JS dependencies, Swift harness/storage sources, fixtures and native asset inventories before reusing it; do not call this a new full-suite run. |
| Essential actual application journey | Rerun `tests/search-navigation-ui.mjs` at final head through browser UI → bridge contract → real isolated Swift storage/index. It checks source/open/return, query/expansion/scroll identity, selection/Copy event and controlled clipboard receipt, dirty Continue/Save/Discard/failure, source-byte preservation and persisted reload/readback. New application callback/sync initialization bytes justify this cross-page integration check. |
| Search event wiring / geometry | Rerun `tests/search-ui.mjs` because the actual application bootstrap imports changed Organization/sync modules and the shipped stylesheet changed. Verify protected-modal ownership, input/refocus, query/scopes, copy receipts and rendered cues with the integrated bootstrap. This is a focused maintained journey, not a full UI replay. |
| Shared leave primitive | Reuse the completed `aba47e9` leave-focus receipt: its test, production `presentation.js`/`core.js`, held scheduling and all relevant style bytes are unchanged. The only stylesheet addition is sync-scoped and cannot match that fixture. Search's own dirty-source consumer is freshly exercised above. |
| Packaging | Rebuild Mac and bind all 21 source/package web assets because Organization/sync/app/style shipped bytes changed. Prior Mac executable/package success remains historical and is not reused as new package equality. |

No broad shared renderer/state/focus/layout implementation changes require the full UI suite. The merged siblings' accepted owner evidence is not relabeled as this branch's execution. No native host, transport, custom-scheme/resource allowlist, termination, OS shortcut/clipboard/IME integration change is introduced, so no native GUI replay is appropriate.

## Evidence and limits

Fresh exact-head receipts, input/source/behavior reuse bindings, separate complete final-head Standards/Spec reviews, runtime package hashes and the delivery report are retained under `build/issue84-integration/`. The previous `build/issue84-repair/` report/receipts remain untouched, including its navigation evidence: the maintained test's fixed evidence destination is preserved/restored by the validation wrapper while the fresh receipt is saved separately.

The original failed task and nine native failures remain failed; completed repair at `aba47e9` remains succeeded. Historical native focus-guard subcondition stays unknown. Browser Copy uses a trusted event with default export prevented; the application clipboard bridge is controlled. Actual OS clipboard content, native transport/runtime, actual IME and OS/physical input are not established. Ordinary native compatibility is release-level deferred, never passed; Android-specific and standalone Syncthing checks remain deferred. No GUI custody, app activation, OS input, native executor construction, model download or private processing is involved.

The cumulative ledger distinguishes an integration stage from correction cycles; no idle scan or successful merge invents an additional failed-signature cycle. The coordinator retains merge/closure/triage authority. Marking the existing PR ready requires passing final acceptance and both reviews; it does not authorize this worker to merge.
