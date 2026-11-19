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
