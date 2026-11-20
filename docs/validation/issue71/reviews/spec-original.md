# Spec review — issue #71

Reviewer provenance: independent Codex Spec subagent `/root/spec`; read-only review, no product edits.
Base: `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`.
Reviewed head: `a616b10bd2a5f3e50456eea89495f45e5d0ef40f`.
Command: `git diff 1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db...a616b10bd2a5f3e50456eea89495f45e5d0ef40f`.
Sources: live issue #71 and parent #63, including their empty comments; `docs/superpowers/specs/2026-11-15-content-structure-design.md`.

1. **P2 — setup editing bypasses task-scoped leave decisions.** Parent #63 story 45 asks for “task-scoped save, discard and keep-editing decisions on relevant exits”; #71 says preserve “the delivered task-scoped leave lifecycle.” In `web/organize-screen.js:10–12,85–90`, the new drawer routes close, Escape and backdrop dismissal directly to `closeSettings()`, which clears the entered token and resets address/model without a save/discard/keep-editing decision. It is also absent from `web/app.js`'s `activeTask()`/native termination lifecycle. Explicit Cancel may intentionally discard; incidental dismissal or native quit should preserve/guard the active device-private setup task without synchronizing credentials.

2. **P2 — stale-response acceptance is nondeterministic.** #71 requires “newer queries supersede older responses” and testing “stale-response cases.” In `tests/organization-selection-ui.mjs:22,38–42`, the held query only assigns `delay` after awaiting the real storage result, while the test waits for the generic loading text then issues another query and invokes `delay?.()`. That optional invocation can occur before the old query reaches the hold, so the test can pass without releasing or observing the stale reply. Require a barrier proving the old query is held, then release it and await its delivery before asserting the latest result remains. Workspace-selection fencing and source-change cases also need explicit execution evidence before acceptance.

No scope creep found. Native execution and final-head validation are pending at review time, not failed or passed evidence.

Summary: 2 Spec findings; worst severity P2.
