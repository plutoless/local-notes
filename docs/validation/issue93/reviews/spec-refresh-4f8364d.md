# Spec review — exact-head refresh

Reviewed `4f8364d76f2e96d3c0f6ce7a68d3208b15d00b12` against starting/latest-main
`2f5a8af78ada6da3c0f6d323cdb3b654e50cb9ed`, including the full diff and committed
issue #93 evidence. No sibling/schema/host migration was found. The nullable
presentation correction and submitted-write/post-refresh-focus portions of the
initial ownership finding are resolved.

## Remaining finding

**P2 — Fence the pagination failure continuation.** `web/focus-screen.js:102`
(`pageFocus` catch) still rolls back `focusOffset`, clears `#index-state` and invokes
`notice` unconditionally. Pagination's callback bypasses `run`, so a rejected query
after home release or workspace replacement can clear the replacement owner's
loading status and display an old-workspace failure. This is the same incomplete
asynchronous-ownership finding, not a new feature request.

Parent #89 requires: “Fence reads, queries, writes, subscriptions, retries, and
restoration by workspace, task/record identity and request generation.” Issue #93
requires preserving task ownership while switching migrated/legacy pages. The
successful pagination path checks repository/request identity, but its failure
path must apply the equivalent ownership gate before rollback or UI feedback.

Controlled shipped-controller probe: begin `pageFocus(99)` with held queries,
`release()`, replace the Action repository, then reject. Result:
`{"noticesAfterRelease":["old page query failure"],"statusAfterRelease":""}`.
The new `run` and `refreshOwned` guards do not cover this catch.

## Evidence boundaries

Committed receipts record 82/82 unit/integration passes, Focus/history retests,
maintained browser coverage, source/asset binding and Mac packaging/signature
verification without native launch. Layered-policy deferrals and minimum-engine,
Intel and physical-input limitations remain explicit. No other concrete Spec
finding was identified.

Summary: one P2 ownership finding remains partially unresolved; final Spec approval
awaits a guarded pagination-failure continuation and exact-head re-review.
