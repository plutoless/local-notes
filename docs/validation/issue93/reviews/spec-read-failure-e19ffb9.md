# Spec review — pending read-failure correction

Reviewed head `e19ffb93d0c4011c0de30b77d19f4722c193af0e` against starting/fetched-main
`2f5a8af78ada6da3c0f6d323cdb3b654e50cb9ed` (`git diff 2f5a8af...e19ffb9`).
Current issue #93/parent #89, approved design, ownership inventory and committed
validation/source-artifact evidence were read with maintainer layered-policy
revisions applied.

The earlier submitted-write, post-refresh-focus and pagination-failure guards are
resolved. Independent targeted ownership/order/directory tests pass 8/8.

**P2 — Gate rejected queries by their own request before propagation.**
`web/focus-screen.js:73` awaits `Promise.all` before the success-only ownership
check. If the query rejects after route release, workspace replacement or a newer
same-home query, rejection bypasses that check. `run` only fences repository/release
generation, so it cannot distinguish newer same-home requests; initial/background
refresh callers also forward rejection to global feedback.

Parent #89 requires: “Fence reads, queries, writes, subscriptions, retries, and
restoration by workspace, task/record identity and request generation.” The query
must therefore suppress stale rejection at the `show` request seam, while current
failure still propagates for truthful feedback.

Controlled shipped-controller probe at this head: start `show` with held queries,
call `release`, reject the old query. It prints `propagated: old query failed`.
Catch the query error within `show`, return without feedback when its active,
repository or request identity no longer owns the surface, and rethrow only a
current-owner failure. Add controlled released/workspace/newer-request failure cases.
This remains the same asynchronous-ownership finding, not sibling scope.

No other concrete Spec finding was identified. Evidence continues to distinguish
83/83 unit/integration passes, actual-app browser/storage coverage and Mac
packaging from unrun native transport/OS/minimum-engine/Intel/physical checks;
Android/Syncthing remain deferred. Initial failures are retained.

Summary: one partially unresolved P2 read-failure ownership finding; final approval
awaits correction and exact-head re-review.
