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

## Bounded browser-first continuation

Start from original PR #104 head `1134458021b75a109ef15193bdea89cf0c8321ff`; preserve its failed Task and artifacts. Integrate delivered main `20302d140dac350e543731543d72246275ee7353` without copying #105. Under the revised layered policy, retain public search tests, verify the affected real UI/bridge/isolated storage journeys and shared leave regression, and build/bind the Mac package. Extend only meaningful search consumer checks for browser Copy events, dirty-source Continue, selection/next focus and persisted reload/readback. Do not replay native input or modify the native executor. Review both axes against the original base and continuation start, resolve findings, push the existing branch and update only PR #104.
