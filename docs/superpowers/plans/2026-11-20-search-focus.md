# Search focus implementation plan

**Goal:** Complete issue #84 using the shared issue #81 focus contract.
**Starting SHA:** a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3 (merged PR #88).
**Dependency check:** Live native blocked_by and written Blocked by both identify closed #81; its merged implementation is available on origin/main. No overlapping focus PR was open at initial inspection.
**Architecture:** Keep SearchScreen state, compact A layout, bridge and storage contracts. Reuse native focus-visible and the existing composite checkbox role. Do not add a palette or a modality framework.
**Constraints:** English project material; Simplified Chinese application copy; synthetic fixtures; no other issue implementation. Android runtime and standalone Syncthing are deferred.

1. Inventory pointer/keyboard selection, scopes, attribution and source-return using maintained real UI/bridge/Swift storage journeys. Capture equal-size baseline and after screenshots, including long Chinese content at 1180/393px and reduced heights.
2. Reproduce refresh stealing focus from a newly chosen search input. Limit restoration to the original focus owner or the inertness fallback. Adopt the shared checkbox label treatment for attribution while retaining its existing geometry.
3. Run shared syntax/tests, all maintained UI journeys and platform builds. Request an exclusive GUI lease; run isolated Cocoa/WKWebView OS input, clipboard and actual IME/return coverage with original clipboard/input source restoration and source/resource hashes.
4. Commit and obtain independent Standards and Spec reviews against the starting SHA. Resolve findings, validate/review the final head, push the feature branch and open one PR. Coordinator owns merging.
