# Issue85 bounded repair, revision 2

Task `task_9e02a3eb6ed7`, Dispatch `ctx_30ca72e065e8`, Run `run_4c9f8d25f80d`.
Starting head: `6130a43d5a50e3f20bf1e27f3b4e1f0e4553d94b`.
Integrated base: `20302d140dac350e543731543d72246275ee7353` (shared #105 correction / merged PR106, plus the approved validation policies).
Original implementation Task `task_d2730dd4b3ce` / Dispatch `ctx_512d8e84eeab` and failed integration Task `task_de588b8bd396` / Dispatch `ctx_2db6c4faa648` retain their original outcomes.

Live issue85 and both GitHub-native and written blockers were reread before editing: #81 is closed and its contract is an ancestor of main. The design reference remains `docs/superpowers/specs/2026-11-15-content-structure-design.md`, the shared focus contract and the existing task-lifecycle contract. No new production correction is introduced here. Shared `presentation.js`, capture readiness regression and all PR106 assets are integrated unchanged; the package command preserves both main and issue85 suites. No other worktree is edited.

## Behavior and selected layers

- Public behavior unit/storage integration: the maintained unit suite covers Organization selection scope, batching, response validation, cancellation, explicit candidate decisions, source-change rejection and real isolated repository/index recovery. These stable interfaces remain the primary behavior seam.
- Necessary browser consumer checks: the actual app source-selection journey exercises real Swift SQLite query/filter/directory/paging and private drafts. Settings Continue preserves its field/range; a controlled delayed return must yield to a newer browser Tab. Forward/reverse Tab stays inside the drawer; discard restores its opener and preserves selected sources and exact preview. Controlled configuration failure never sends notes or changes real credentials.
- The actual Organization focus journey retains source/preview disclosure, one coherent checkbox cue, invalid candidate action return, destination/range/scroll restoration on source detours and one explicit confirmation. It now records readback of the exact edited action and initiative relationship plus synchronized/private-index file hashes before isolated cleanup. The maintained review journey covers partial/error/retry/cancel, pending recovery and reload/readback.
- The integrated capture regression retains all previous assertions and now deterministically controls the diagnosed stale return and delayed saved-note reveal. It verifies failed writes/retry, submitted-save Escape, true pending leave while hidden, synchronous readiness, recovered capture without duplication, Markdown readback, reader discard/reopen and real Topic record/index recovery. This addresses historical lines87/88/114 through the single shared correction, not sleeps or weakened assertions. Historical114's exact old telemetry remains unavailable.
- A single final full maintained UI run is justified by the changed shared leave-focus primitive, its cross-page consumers and the unresolved historical aggregate failure. No second broad run is intended after success. The Mac package build verifies changed shipped web assets; source/package equality is checked separately.

The browser uses the production application controls and `NotesNative.request` bridge contract with an exposed test transport. Records/indexes use the production Swift StorageHarness adapter; Markdown reads/writes use isolated real filesystem operations. This does not exercise WKWebView transport, custom-scheme runtime, native lifecycle or OS input. DOM focus/range setup and controlled timer scheduling are identified as setup; Playwright pointer/keyboard events are browser interaction, not native or physical input.

## Historical failures and current policy

`build/issue85-integration/` remains the unchanged failed evidence set: aggregate reverse Tab failure87/88, recovered-capture114 timeout, owner83 diagnosis, native process-marker rejection, unknown immediate input-source baseline, unknown numeric wait result and missing complete native transcript. Prior verified authorized handoff-source restoration/release remains recorded; no historic failure is converted into a pass. No GUI custody, optional native executor, OS input, clipboard/input source, permissions or native replay is used by revision2.

Under current `docs/agents/validation.md`, ordinary native keyboard/IME/clipboard compatibility replay is release-level deferred, never passed. Native host/transport/resource/lifecycle code is unchanged, so no new native runtime acceptance is required for this shared UI diff. Android-specific and standalone Syncthing checks remain deferred. Physical input is unrun. This policy changes acceptance layers, not historical evidence or source/data protections.

Exact final-head receipts, complete independent Standards/Spec reviews, source/package/artifact hashes, environment and preserved attempt records are returned under `build/issue85-revision2/`. Read the final report for executed outcomes; this document is a coverage map, not a claim that pending commands passed. The coordinator alone decides merging and lifting the shared hold.
