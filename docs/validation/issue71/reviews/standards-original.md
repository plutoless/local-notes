## Standards review

Reviewer: independent Codex sub-agent `/root/standards`, Standards axis only.
Base: `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`.
Reviewed head: `a616b10bd2a5f3e50456eea89495f45e5d0ef40f`.
Diff: `git diff 1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db...a616b10bd2a5f3e50456eea89495f45e5d0ef40f`.
Commit: `a616b10 feat: prioritize searchable Organization source selection (#71)`.

1. **P1 — Documented violation: unguarded dirty drawer dismissal.** `web/organize-screen.js:10–12,87–91` routes Close, Cancel, Escape and backdrop directly to `closeSettings()`, which clears the token and restores saved address/model without a leave decision. `docs/design/README.md`, Selected C contextual forms, requires “Backdrop never silently discards” and dirty tasks to offer Save and leave / Discard changes and leave / Continue editing. Use the existing task-scoped leave seam for this new editing task, keeping credentials memory-only; add dismissal coverage that actually exercises dirty guards.

2. **P2 — Documented violation: submitted configuration writes have no ownership/duplicate guard.** `web/organize-screen.js:19` starts unrestricted asynchronous `aiConfigure` submissions; Save remains enabled, and cancellation can close the task while a submitted write later succeeds. The same presentation contract requires Saving to disable duplicate submission and all exits to wait for submitted writes. Track one pending save, disable repeat submission, and settle that write before a guarded close.

3. **P2 — Documented violation: drawer form bypasses the shared field/action treatment.** `web/organize-screen.js:11,16–18` moves `#ai-settings` out of `#organize-tools` before the class-adoption loops, so its labels and Save button lose the prior `.ui-field` / `.ui-action` treatment. `web/index.html:84` leaves Save in the scrollable body while only Cancel is placed in the footer. Selected C requires vertically arranged shared labeled fields and a quiet footer Cancel preceding the sole primary Save. Adopt shared fields/actions and place form-associated Save in the footer.

No additional Fowler smell finding merits a separate change; direct `organization.generation` mutation is a small judgement-call encapsulation concern, not a documented violation.

Summary: 3 Standards findings; worst is P1 unguarded dirty dismissal. This is static review, not execution evidence.
