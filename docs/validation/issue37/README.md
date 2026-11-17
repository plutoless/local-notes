# Issue 37 validation

Starting SHA/base: `588eba92d87c098a230d7e1efc4f01db9ef469e0`. Native/textual blockers #32–#36 were closed; PR39–43 merge commits were ancestors of fetched main. Issue #37 had no comments. The approved design and #31 reference/catalogue define scope.

Changes add guarded action → initiative → original action navigation, unify shell selection/accessibility, and read source notes before changing pages so unavailable evidence keeps its origin reachable. Shared quiet action/layout/state feedback rules are reused. No storage format or production native code changes. The inventory/content audit and contributor checklist are in `docs/design/journeys.md`.

`journey-red.txt` reproduces the starting-source selected-page failure. Before desktop/393 screenshots replay archived starting-SHA resources; after screenshots show the explicit return path. Browser suites use Chromium plus isolated real Swift filesystem/SQLite adapters, not WKWebView. Workspace coverage includes unavailable source after rendering its opener, selected nav/original action focus, failed action/note saves, background refresh and narrow missing-source recovery. Other complete UI suites exercise library conflict/recovery, organization privacy/cancellation/durable decisions, and all four local conflict record types.

Native scripts use synthetic notes/private storage and test-only Cocoa command/snapshot hosts with unchanged built product web resources. The cross-page probe covers Focus/action/initiative/linked note/edit/local save/context/original action and filesystem readback. Organization replay covers exact preview/no-send, loopback send, failed decision recovery, source edit failure/retry and restart/readback. Conflict replay covers dirty task/local branch review/filesystem failure/retry/close/restored draft/history/restart. Input/click use WKWebView evaluateJavaScript, not physical keyboard/pointer.

Logs record actual outcomes. Final resource identity and independent review results are recorded at delivery. Android builds/tests/runtime and standalone Syncthing remain deferred. Physical native input, two-device E2E and real provider services are unrun. Human visual judgment remains; only synthetic loopback service traffic is used.

## Final source and results

Validated implementation/test head: `344ddbcdeb483fd011dd7148190e2c4e2ae3b699`. Shared syntax, 45 shared tests, all ten UI suites, Mac build and all three native probes exited zero. See [separate Standards/Spec reports and execution boundaries](reviews.md) and [resource identity](resource-identity.json). Additional browser coverage includes delayed source/workspace switch, failed return/retry, nested action return and dirty note/initiative modal close. The action editor heading is shortened to `行动详情` to distinguish it from the collection title. Final evidence-only commits retain identical product and test resources.
