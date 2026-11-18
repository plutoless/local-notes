# Issue #64 validation

The synthetic fixture in `tests/fixtures/library-summaries.json` covers complete frontmatter, repeated titles from distinct directories, identical file modification times, metadata-only documents, malformed/plain text, hostile markup and long Chinese/English titles/paths. No private notes or external services are used.

## Implementation boundary

The approved list/detail structure and shared selectionRow remain. Library rows reserve intrinsic height and present title, excerpt, source path and explicitly labelled file modification date in normal flow. No authored or reading date is inferred. Complete leading frontmatter is removed from derived title/search/excerpt content; malformed unclosed text remains visible rather than silently discarded. Empty excerpts use the Chinese “no body summary” fallback. Summaries are plain text escaped at display.

`summaryVersion: 1` invalidates only derived records. Existing cached records are refreshed once, one body at a time, using the existing incremental reconciliation path. Global search shares the same body normalization for index text and expanded source context, preserving the typed passage offsets delivered by #59. Both Library and search refresh pre-upgrade derived records using summaryVersion; warm queries do not reread bodies. Search version remains 1 for compatibility with the existing native global-search queries. No synchronized schema, Markdown or formal revision writes are introduced. A stale summary may remain visible while its background refresh is pending, following the existing partial-index behavior.

## Evidence and reproduction

- `node --test tests/library.test.js`: real Swift SQLite storage/index, 500 notes / 2,000 Actions, cached-summary upgrade, warm zero rereads, rebuild, protected traversal and bounded pages. Synthetic source adapter explicitly rejects source/formal mutation commands.
- `LIBRARY_EVIDENCE_DIR=docs/validation/issue64 node tests/library-ui.mjs`: real application UI/bridge and Swift storage. Asserts nonoverlapping content boxes at 1180×800, 760×600, 393×852 and 800×400, safe text, honest fallback, distinct source identity, source byte preservation, and search/open/return focus. Existing journey additionally covers page/scroll/filter restoration, topics, revisions, failures and recovery.
- `npm run check`, `npm test`, `npm run test:ui`, `npm run build:mac`: shared and packaging validation. Exact delivered-head results are recorded in the PR handoff.
- After building Mac: `python3 tests/native-library-summaries.py`. Uses an isolated identity and synthetic 500-note workspace, real Cocoa/WKWebView, packaged assets, existing native bridge/repositories and SQLite. Adds only probe commands for window dimensions, snapshots and native body-read counting. Source bytes and absence of formal revisions are checked after browsing/open/return.

`native-report.json` records hardware, asset SHA-256 digests, timing scope and native read counts. Its source head is the commit checked out during capture; the asset digests bind captured dirty-tree assets to the delivered commit. Final exact-head recapture and reviews are reported in the PR. The native benchmark measures automation wall time including polling: cold waits for the complete 500-note index, warm runs a metadata refresh, and open loads one matching source. These observations do not establish a general lag fix or a numerical latency guarantee.

Browser screenshots are prefixed `summaries-`; native screenshots are prefixed `native-`. The native narrow/short screenshots show the long-title/path search result, with scrolling available to reach content. Native evidence is DOM-driven, not physical or OS-injected input. Physical keyboard/pointer/clipboard checks, two-device end-to-end synchronization, Android runtime/build and standalone Syncthing tests were not executed; Android-specific and Syncthing checks remain deferred by user decision.

## Risks

An initial Spec review reproduced operator/identifier corruption from emphasis cleanup. The fix protects inline and fenced code and applies conservative prose delimiter boundaries; regression coverage preserves multiplication and underscores. No Standards violations or accepted unresolved minor suggestions were reported. Final review results are included in the PR handoff.

Excerpt cleanup intentionally supports common Markdown presentation syntax, not complete YAML or Markdown parsing. A complete delimited leading block is treated as frontmatter; unmatched delimiters are retained. A first run after upgrade reads each stale body once in the background. Original bodies and fingerprints remain authoritative.
