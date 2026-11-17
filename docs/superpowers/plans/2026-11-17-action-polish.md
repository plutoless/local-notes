# Confirmed action presentation implementation plan

Issue #17; starting SHA: 318a44f341895c27a32c97416bab4f92310f7381.

Reuse the approved content structure and issue #16 presentation foundation. Native and textual dependency #16 are closed, and the foundation is present in this checkout. Work stays on the isolated issue branch; persistence and native adapters retain their contracts.

1. Refine `web/action-screen.js` and its markup/styles: primary description/state/save, optional assignment/date/waiting/source groups, selected rows, distinct no-results, readable source evidence and complete expandable history. Keep Chinese labels in presentation and stored values unchanged.
2. Extend `tests/ui.mjs` with reopened canceled actions, focus membership, no-results, unsaved navigation, retained failed drafts, accessible names and narrow layout assertions. Run syntax/shared suites and Mac/Android builds; Android device tests and standalone Syncthing tests remain deferred.
3. Capture isolated native Mac before/after task and secondary screenshots, check keyboard/focus and native save/history interaction. Record actual evidence and limitations in `docs/validation/issue-17.md`.
4. Commit implementation, run separate Standards and Spec code reviews against the starting SHA, resolve findings, push and open one PR. The coordinator owns merging and issue closure.
