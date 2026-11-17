# Issue 36 synchronization review implementation plan

Goal: adopt the approved focused-panel family for local conflict decisions without changing storage or synchronization semantics.

Starting SHA and verified main: e8a869b42f396c2b9f3cf7e768aaa752ae4c448f. Live native dependency #31 is closed; merged foundation 45c6b5acb284c8fb3a3e1b16849387e645d46052 is an ancestor. Issue #36 has no additional comment requirements.

The approved design contract is docs/design/README.md and its live catalogue, with the content-structure specification as domain reference. Preserve direction09 workspace and direction01 native light baseline. Execute inline, only in this isolated worktree.

- [ ] Capture baseline shared-browser and isolated WKWebView screenshots.
- [ ] Adapt web/sync-screen.js to shared panel, fields, disclosures, selection navigation, feedback and action variants. Add a demonstrated shared comparison-row primitive and catalogue example. Keep raw JSON/history in details. Preserve edited resolution on refresh and failed-save retry; restore original task context and focus on close.
- [ ] Extend tests/sync-ui.mjs for selection, background refresh, failed refresh, invalid data, narrow/long Chinese, focus containment and restoration, partial-write recovery and source history. Keep real Mac storage adapter coverage.
- [ ] Add an isolated issue36 WKWebView probe for actual local save/failure/retry/restart/readback, with screenshots and explicit input-method limitations.
- [ ] Run shared checks, UI regressions and Mac build. Android and standalone Syncthing are deferred by user decision.
- [ ] Commit, run independent Standards and Spec reviews against the starting SHA; resolve findings and refresh affected checks. Publish one PR; coordinator owns merging.
