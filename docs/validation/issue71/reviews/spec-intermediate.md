# Spec re-review — issue #71

Reviewer provenance: independent Codex Spec subagent `/root/spec`; read-only review, no product edits.
Base: `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`.
Reviewed head: `82c417803db5cd3f21a9ee3470164a11f79adb40`.
Command: `git diff 1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db...82c417803db5cd3f21a9ee3470164a11f79adb40`.
Sources: live issue #71 and parent #63, `docs/superpowers/specs/2026-11-15-content-structure-design.md`; original independent report remains `/tmp/issue71-spec.md`.

## Resolutions

- Original P2 task-lifecycle finding resolved: `settingsTask()` captures dirty device-private form state, awaits pending submission, and delegates incidental/explicit dismissal through `requestTaskLeave()`. `activeTask()` now includes the settings drawer for navigation and native termination. Save/discard/keep-editing are reachable; token values stay in memory and the native private settings store rather than synchronized records. Browser coverage now exercises keep-editing and deliberate discard; native probe asserts the leave decision before discard.
- Original P2 stale-response test finding resolved: the test now awaits `heldQuery`, assigned only after the older real index query has completed and entered its response hold, requires a callable release, then releases it after the newer query renders and checks retained latest-result identity. This addresses the optional early release that allowed the previous test to avoid delivery entirely.

No new missing implementation, scope creep, or incorrect behavior identified in the reviewed diff. Recognizable title/path context, bounded index queries, retained capped selections, selection invalidation, workspace reset/generation fencing, and explicit preview/send/per-candidate confirmation boundaries are implemented within issue #71's scope. No issue #65 ordering/archive policy is added.

Native GUI execution, final shared-check completion and final package/source/probe hash bindings remain pending at review time. This code review is not an assertion that those acceptance checks passed; record their actual final execution separately, including source-change/workspace isolation coverage and all deferred checks.

Summary: 0 unresolved Spec findings; 2 original P2 findings resolved.
