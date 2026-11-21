# Standards review — issue #97

Reviewed HEAD: `e24979fa3fbe67900be1962c35801f99a0639f28`
Base / fetched main: `8ae4622f4a23033ec149038d9a370c9985a138e8`
Diff: `git diff 8ae4622f4a23033ec149038d9a370c9985a138e8...HEAD`
Commits: `d341346`, `e24979f`.

## Findings

- **P2 — documented-standard breach: preserve pending-action disabling.** `web/react/search.tsx:29`, `:32`, `:38` render asynchronous scope, expansion and paging callbacks using `Button` without `busyOnAction`. `docs/design/README.md`, “Implemented primitives and state contract,” requires actions to be “Disabled during awaited action.” The replaced `presentation.button()` always disables itself until its returned promise settles; the consumed React `Button` does so only when opted in. In particular, repeated Next clicks during a delayed query now advance the controller offset multiple times before any page is displayed, skipping intervening results; repeated expansion can issue duplicate source reads. Copy, source-open and refresh already use the opt-in correctly. Add pending-action handling to these controls and a focused delayed-query paging assertion.

No other material documented-standard violations or baseline heuristic smells found. Existing compact naming/style is consistent with adjacent project modules; separate highlight implementations serve the explicitly retained detached-reader adapter and the React renderer, so no unrelated extraction is warranted.

## Evidence honesty

Checked AGENTS, linked agent guidance, design tokens/component responsibilities, and Library/shell/search ownership inventories. English repository prose and Chinese application labels are preserved. All thirteen recorded source/build/package hashes and byte sizes match current files. The 86/86 suite, selected browser journeys and Mac build receipts support their stated scopes. Native OS/IME/clipboard/transport and minimum-version/physical checks are explicitly unrun/deferred; no browser result is claimed as native acceptance. The paired timing comparison explicitly discloses its shared current host bundle and cannot establish cold startup improvement.

Result: **1 material Standards finding (P2); correction required.**
