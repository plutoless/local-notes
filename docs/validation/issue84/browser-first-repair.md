# Issue #84 browser-first continuation

This is the bounded continuation of PR #104, not a second implementation. The original failed Task remains failed and its native receipts remain unchanged. The continuation starts at `1134458021b75a109ef15193bdea89cf0c8321ff`, with original implementation/review base `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3`. It integrates main `20302d140dac350e543731543d72246275ee7353`, including the single shared #105 correction from PR #106. Both native GitHub `blocked_by` and written Blocked by still identify closed #81; its shared focus contract is available in the integrated base.

## Coverage selection

| Boundary | Evidence and reason |
| --- | --- |
| Public search behavior | Existing `tests/search.test.js` covers query/scopes, grounding, typed identity, paging, async fencing and stale sources through public search APIs and isolated real storage/index adapters. Run the shared unit/integration suite once on the delivered head. |
| Real application / bridge / storage | Maintained `tests/search-ui.mjs` and `tests/search-navigation-ui.mjs` exercise production UI modules and bridge requests with isolated synthetic Markdown, actual Swift records/SQLite index and persisted readback. These targeted journeys are necessary for DOM focus, selection, modal ownership and cross-page continuation. Preserve the existing matrix rather than rewriting useful coverage. |
| Shared leave correction | Reuse unchanged #105 production implementation and its reviewed evidence; execute its small deterministic `tests/leave-focus-ui.mjs` regression on this integrated head. Search adds its consumer check for dirty-source Continue, retained source selection, newer search input selection/Tab and unchanged source bytes. No competing leave correction is introduced. |
| Browser Copy versus bridge receipt | A DOM Range sets up passage selection; a browser keyboard shortcut must produce a trusted Copy event carrying that selected text; the test prevents the default export. The actual application Copy action separately delivers an exact grounded passage to the controlled `clipboardWrite` adapter and displays its receipt. This verifies browser events and request/receipt behavior, not system pasteboard content. |
| Save/readback/reload | Dirty Continue and failed Save retain the draft without changing source; Discard and explicit Save use existing controls. Saved Markdown is read back from isolated storage and reopened after browser reload; untouched duplicate-source bytes stay equal. |
| Layout evidence | Reuse the committed equal-size before/after screenshots and geometry assertions for unchanged search CSS. The maintained search test generates fresh after captures on the integrated app; no redesign or global CSS change is needed. |
| Packaging | Build Mac because shipped `presentation.js` changed through integration; compare every packaged web asset with source. Production Mac host/transport/custom scheme/OS integration are unchanged relative to integrated main. |

No full UI suite is required for this bounded consumer continuation: it adds no broad shared renderer/state/layout/focus implementation. #105's shared correction and six-command/package evidence were independently reviewed by its owner/coordinator; this branch runs its regression plus the affected search journeys. The original full UI result at `1134458` retains that exact attribution and is not relabeled as integrated-head execution.

## Native reclassification

The historical attempt-9 combined `document.hasFocus()` / active-search-input guard failed before text injection. Its precise subcondition and native cause remain unknown. Browser-first/layered policy in `docs/agents/validation.md` supersedes that ordinary native compatibility replay as a per-issue gate when production host integration is unchanged. It does not turn the failure into a pass or prove a product defect was fixed. OS-injected/physical input, actual native IME, production WebKit transport and system clipboard remain release-level deferred, never passed. Android-specific and standalone Syncthing checks remain deferred. No native executor changes, launch, GUI custody, system clipboard access or input-source changes occur in this continuation.

The earlier README's native-gate disposition documents the original failed delivery under the previous policy. This continuation supersedes that disposition only to the extent established by current-head browser/storage acceptance and the approved policy; all source-preservation and actual product behavior gates remain.

## Final evidence

Exact-head commands, separate complete independent Standards/Spec reports, runtime source/package bindings and artifact hashes are supplied in `build/issue84-repair/`. The committed cumulative repair ledger preserves historical phases and new completed cycles; repeated idle scans are not cycles. Final evidence must identify the executed/reviewed head and distinguish any reused byte-identical artifacts. The coordinator alone owns merge, issue closure and triage; publishing evidence does not remove the global merge hold.
