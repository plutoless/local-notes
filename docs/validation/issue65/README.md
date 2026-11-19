# Library ordering and archive scope (#65)

Starting SHA: `01dd405d472f12bcd7724a1ddfbc5d315d5641e7`.
Live #65 native and textual blockers were checked: #64 is closed and its merge is present on origin/main. Parent #63 and comments were read using GitHub REST after a transient GraphQL TLS failure.

## Query contract and implementation plan

1. Extend only `referenceQuery` in both native reference indexes with archive scope, deterministic ordering and matching indexed counts. Keep bounded body-free responses and existing global-search ranking/inclusion.
2. Add labelled Chinese controls using existing Library form/pagination styling. Retain independent directory, Topic, keyword, favorite and return context. Reset pagination with an explicit receipt when background index mutations invalidate a page; disable paging during reconciliation.
3. Validate real SQLite queries with repeated titles, identical timestamps, current/archive paths and multiple pages; exercise native UI browse/open/return, narrow geometry, cold/warm timing and body-read counts. Run shared checks, browser journeys and Mac packaging, then independent Standards and Spec reviews.

Archive recognition is deliberately limited to exact directory components `archive`, `archives`, `archived` (ASCII case insensitive) and `归档`. File basenames, substring matches, arbitrary prose and frontmatter do not imply archive status or relevance. Unrecognized historical naming remains ordinary material. The label describes path classification, not a claim of current relevance.

The initial scope includes all notes, ordered nonarchived first and then by binary workspace-relative path within each group. Explicit path ordering uses binary path; title ordering uses SQLite `lower()` of the indexed title then binary path. SQLite's built-in lower folds ASCII only. Unique path is always the final tie-break; file timestamps do not imply reading recency and do not affect order. No source or synchronized schema migration is needed; classifications/order are computed in the private index query, including for existing caches.

The count is the number of matching indexed rows, not a total of source files. During reconciliation or directory warnings/failures it is labelled incomplete. Pages hold at most 50 rows, with a one-row lookahead. A stable corpus has deterministic offset pages; a changing corpus resets an invalidated later page with a visible receipt instead of implying continued stable pagination. Source bodies are read only during necessary indexing or explicit open.

Android-specific tests and standalone Syncthing tests are deferred by user decision. No physical keyboard/device coverage is implied by DOM-driven native or browser evidence.

## Executed validation

Code head: `649667cf9c0cd94104c8a0bbd7bdae01ec68dde8`; base/start/latest main merge-base: `01dd405d472f12bcd7724a1ddfbc5d315d5641e7`.
The later evidence-only commit retains these exact production and test files; native `assets` hashes in `native-report.json` bind the tested web assets to the isolated bundle. All fixtures are synthetic, and the native run verifies unchanged Markdown and no new formal revisions.

- `npm run check`: passed.
- `npm test`: 58 passed, zero failures, including real Swift/SQLite archive ordering, equal dates/repeated titles, 129 unique multi-page results, Topic/directory/keyword combinations and effective membership invalidation.
- `npm run test:ui`: all 15 suites passed with Chromium and the real Swift storage/SQLite adapter. Library coverage includes keyboard Enter open, return focus, scope/order restoration, 393px layout, failure/retry, delayed indexing and existing page/scroll journeys.
- `npm run build:mac`: passed, ad hoc signed application.
- `npm run build:android`: passed, debug APK, API 26 minimum; compilation emitted an existing deprecated-API note. This is packaging evidence, not Android runtime validation.
- `python3 tests/native-library-browse.py`: passed in an isolated Cocoa/WKWebView host using the real bridge/file/index implementations and hash-matched production web assets. 500 notes, equal timestamps; 171 archive paths paged exactly once; later-page open/back retained order, scope, page, selected path, scroll and focus. Desktop, 760px split, 393px and reduced-height row geometry/overflow assertions passed. Screenshots were inspected; narrow WK snapshots can contain partial repaint/clipping artifacts, so geometry assertions and browser captures supplement those captures.
- Cold full-index browse: 1055 ms, 500 bodies. Warm manual refresh: 300 ms, 0 bodies. Selected open: 100 ms, 1 body. Timing includes automation polling on Apple M4/macOS 26.5.2, and is not a general performance claim.

Initial UI execution could not import Playwright; installed it locally without changing package metadata and reran. An initial new test used an implicit select label that was not resolved by Playwright; explicit Chinese accessible names fixed it and the full final-code suite passed. Those earlier failures are not counted as acceptance passes.

## Standards review

Independent final-code review: zero documented-standard violations. One nonblocking heuristic notes duplicated host instrumentation in the new native probe and the existing summaries probe; shared fixture extraction is deferred as unrelated maintenance.

## Spec review

Independent final-code review: zero remaining findings or scope creep. The initial review found Topic membership paging invalidation and misleading archive-empty feedback; both were corrected and re-reviewed on the code head above.

## Limitations and risk

Android device/SAF/offline/restart/keyboard tests and standalone Syncthing checks remain deferred by user decision. Native input was DOM-driven through Cocoa/WKWebView; browser keyboard automation ran, but physical and OS-injected Mac keyboard input were not exercised. No original notes were written or transmitted. No production app installation or external private collection acceptance is claimed.

Residual risk is low and concentrated in conservative archive-name coverage and offset navigation during active changes; indexing disables paging, and effective mutations reset later pages with a visible receipt. No special human product decision is outstanding. Coordinator review and conditional merge remain required; this worker did not merge, close issues or change labels.
