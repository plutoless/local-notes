## Standards final implementation review

Reviewer: independent Codex sub-agent `/root/standards`, Standards axis only.
Base: `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`.
Reviewed head: `82c417803db5cd3f21a9ee3470164a11f79adb40`.
Diff: `git diff 1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db...82c417803db5cd3f21a9ee3470164a11f79adb40`.

Original findings at `a616b10bd2a5f3e50456eea89495f45e5d0ef40f`:

- Dirty dismissal is resolved statically: `leaveSettings()` calls the shared `requestTaskLeave()` adapter, and `app.js` identifies the settings drawer as the active task for navigation/native termination.
- Duplicate persistence and close-during-save are resolved structurally by one `settingsPending` promise and the task's pending hook. A remaining form-locking edge is identified below.
- Shared presentation is resolved: labels receive `.ui-field`; footer actions use the shared constructor with primary Save following Cancel.

Remaining findings:

1. **P2 — Invalid configuration bypasses browser validation/focus.** The new footer Save calls `saveSettings()` directly rather than submitting the form, and that method never invokes `reportValidity()`. The existing required address/model and URL type therefore no longer prevent malformed/blank submission or focus the first invalid field. `docs/design/README.md`, Selected C state table, requires “Invalid: Explain beside field; focus first invalid input and keep values.” Use the form's validity check before native submission, preserving failed-save semantics in the leave adapter.

2. **P2 — Pending configuration form can be unlocked by refresh.** `saveSettings()` makes the form inert while awaiting `settingsPending`, but `controls()` sets that same form's inert state solely from preview/analysis `running`. Every `attempt()` completion and Organization refresh calls `controls()`, potentially enabling field edits during a submitted configuration write; the successful settings reload then overwrites those edits. Selected C requires Saving to “retain values,” and the task-lifecycle contract says later input is a separate uncommitted draft. Keep the form inert while either analysis/preview or configuration persistence is pending.

No additional Fowler smell warrants a separate change. Native execution is still pending; this report establishes static review only.

Summary: 2 remaining Standards findings, both P2; original P1 dismissal finding resolved.
