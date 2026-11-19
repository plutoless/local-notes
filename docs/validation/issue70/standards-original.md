# Original Standards review

Reviewer provenance: `/root/standards_review`, independent Standards axis, read-only review of head `4a1b35a7ee8354de0113d115011ba44fafa52bce` against base `1a38a5167b8583729a6831a33ade8107d25476a1`. No GUI or tests executed.

Hard documented-standard violations:

1. **Committed Topic can lose its receipt and recovery surface.** `web/library-screen.js:47–48` places successful persistence and `closeTopic()` in the same catch. `closeTopic()` clears the draft, hides the drawer, and clears `topicNote` before contextual refresh (`web/app.js:458`). If that refresh fails, the catch reports an ordinary failure in the closed drawer because the read error lacks `revisionSaved`; the committed record and association are no longer represented by retained retry state. This violates `docs/design/task-lifecycle.md`, “Committed/recovery pending,” and `docs/design/README.md`, “Failed”/“Saved” state requirements. Separate persistence success from fallible presentation refresh and preserve a visible recovery path.
2. **Initiative recovery retry bypasses pending-task ownership.** `web/app.js:537–539` runs `noteInitiatives(path)` without assigning its promise to `noteInitiativePending`. Consequently, `activeTask().pending()` sees no operation during recovery, allowing close/native leave while repository recovery is still executing. `docs/design/task-lifecycle.md` requires submitted operations to settle and explicitly requires association recovery retries to expose their pending promise. Track this retry through the same task-owned promise as the initial operation.
3. **Saving an Initiative association loses meaningful keyboard focus.** `web/app.js:524–529` makes the selection container inert and then replaces its children through `noteInitiatives()`, removing the initiating checkbox without focusing its surviving replacement. The new drawer Tab handler contains subsequent Tab presses but cannot preserve the selection’s position. This violates `docs/design/README.md`’s predictable focus/restoration contract. Restore the replacement control by Initiative identity after reenabling the container, and cover keyboard selection followed by continued navigation.

Judgment-call smells: none material beyond these behavioral findings.

Standards total: **3 findings**, with committed Topic recovery/receipt loss the most serious.
