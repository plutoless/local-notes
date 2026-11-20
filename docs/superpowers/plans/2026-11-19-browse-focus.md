# Browse Focus Implementation Plan

**Goal:** Deliver issue #81 through existing browse, open and return consumers.

**Architecture:** Keep focus presentation in shared CSS/presentation vocabulary and keep list identity restoration in each existing screen. Retain the approved light-native layout, existing persistence and task leave guards.

**Starting SHA:** `36be0ae2da853a2a1cb004f9a27cf6769b788dd6` (also fetched origin/main).

## Constraints

English project material; Simplified Chinese app copy. No schema/storage changes, redesign, or issue #82–#86 implementation. Android-specific and standalone Syncthing checks are deferred by user decision.

## Steps

- [ ] Capture baseline pointer, Tab/Shift+Tab, programmatic return and selected states using synthetic native storage and unique host/PID.
- [ ] Add regressions in `tests/browse-focus-ui.mjs` for real Focus, sidebar, Library/Favorites, Action and Initiative controls, rerendered rows, pagination, disclosures and return context.
- [ ] Refine shared CSS role/modality treatment without blurring controls or changing containment. Keep input/caret, invalid and selected states independent. Reconcile `docs/design/README.md` and catalogue with actual consumers.
- [ ] Preserve row identity and both list/collection scroll when lists rerender or return; do not steal focus after asynchronous navigation.
- [ ] Run syntax/shared tests, maintained UI journeys and Mac build. Capture matched native after states with source/package/probe hashes and trusted OS input receipts. Inspect screenshots at desktop, 393px and reduced height.
- [ ] Commit, run separate Standards and Spec reviews against starting SHA, resolve findings, push and create one PR. Coordinator owns merge.
