# Library summaries implementation plan

Goal: deliver only issue #64 using the approved Library list/detail design.

Starting SHA: `6c61d024320341760e46ca18143c1830b458d802` (also origin/main at intake).
Live #64 has no native dependencies and states “None - can start immediately”. Parent #63 retains #55's task lifecycle; #55 is closed and its implementation is present through #56 on the starting main. Global search is already available through #62; this slice preserves its searchVersion contract.

- [x] Derive titles and prose excerpts after complete leading frontmatter removal in `web/library.js`; retain malformed/plain source text, fingerprints, bounded queries and incremental body reads. Add a separate summaryVersion for safe private-index refresh.
- [x] Reserve intrinsic Library row heights in `web/style.css`; separate source paths and provenance-labelled modification dates in `web/library-screen.js`. Retain shared selectionRow and browse state.
- [x] Extend Library SQLite integration and browser journeys using synthetic frontmatter, repeated titles, identical dates, plain/malformed text and long paths. Verify cache upgrade/rebuild, escaping, narrow geometry and return state without source writes.
- [x] Add an isolated native Library probe reusing the existing Cocoa/WKWebView host, production packaged assets and bridge/storage. Capture representative sizes and cold/warm/open timings/read counts.
- [ ] Run final static/shared/browser/Mac validation; obtain separate Standards and Spec reviews of the exact delivered head, address findings, and hand off one PR for coordinator-owned merging.

Android-specific and standalone Syncthing tests are deferred under repository policy. This plan does not authorize ordering/archive controls, read-first behavior, new source formats or unrelated changes.
