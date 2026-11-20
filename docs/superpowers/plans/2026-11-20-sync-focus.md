# Synchronization focus implementation plan

Goal: apply issue #81's approved focus contract to issue #86's existing conflict journey, without changing storage or revision behavior.

Starting SHA and available shared-contract base: a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3. Live native and written dependencies both identify closed #81; PR #88 is merged at this SHA. No overlapping focus PR was open at inspection.

1. Extend the existing real-storage sync harness with matched before/after pointer, keyboard, selected, invalid and warning captures at 1180×800, 393×852 and 1180×480. Assert restoration and containment using actual controls.
2. In `web/sync-screen.js`, expose chosen version independently with `aria-pressed`, preserve refresh/discard focus using stable record/revision identifiers, and associate invalid JSON feedback. Reuse shared focus rules and selection tokens with narrowly scoped sync CSS.
3. Run shared checks, maintained UI journeys, Mac build, and isolated native OS input after acquiring the coordinator's exclusive GUI lease. Preserve source bytes and report physical input, Android and standalone Syncthing as unrun/deferred.
4. Commit and run independent Standards/Spec reviews against the starting SHA; resolve findings, validate final head and publish one coordinator-owned PR.
