# Standards review — original

Reviewer provenance: independent `standards_review` subagent; static review only, no code changes or GUI execution.

Reviewed head: `eae3a19199a766ece0aba997db71023c2d79bb8a`.
Fixed base: `7f317f0b9e404d7cd0e2b1a2cdc165edfd6ea02a`.
Command: `git diff 7f317f0b9e404d7cd0e2b1a2cdc165edfd6ea02a...HEAD`.
Commit: `eae3a19 feat: resume recent reading privately from Current Focus (#68)`.

1. **P2 — documented presentation rule: full source paths belong in details.** `web/focus-screen.js:87` renders the complete `entry.path` directly beneath each home continuation title. `docs/design/README.md`, “Content audit and adoption contract,” says “Full root path, source path, IDs, raw error” must “Move/keep in details” so they do not dominate the task surface. Keep a recognizable shortened folder/source context in the row and expose the complete path inside its existing disclosure.

2. **P2 — documented keyboard focus/restoration requirement.** `web/app.js:65` removes an entry and returns `focus.show()`, which replaces `#items`; `web/focus-screen.js:89` therefore destroys the focused removal control without focusing the next surviving entry or home action. `docs/design/README.md` requires applicable states to “Verify focus/restoration,” and existing Focus remove/reorder handlers explicitly restore focus after `show()`. Restore a nearby surviving continuation opener, or the home primary action when the section becomes empty.

No additional Fowler baseline smells warrant a finding in this scoped diff. The new store is small, private, workspace-keyed and independently bounded; native/test allowlist edits are necessary consumers rather than unrelated cleanup. English project prose and Simplified Chinese application-owned copy are preserved.

Standards: 2 findings, both P2 documented presentation/accessibility rules; worst severity P2.
