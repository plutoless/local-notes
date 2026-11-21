> Current final ownership: [renderer convergence](renderer-convergence.md). This document also records the original slice boundary; historical coexistence descriptions below are superseded by #102.

# Synchronization and file-conflict React ownership

Issue #101 consumes the delivered #92/#93 pipeline and #86 focus contract.
Support remains macOS 13.3/WebKit 16.4 and Android API26/WebView111+.

| Surface | DOM owner | State, bridge and persistence authority |
| --- | --- | --- |
| Synchronization opener | Stable `SyncScreen` utility island | Existing shell utility registration |
| Modal section boundary | `SyncScreen` and existing `bindDialog` | Shared `requestTaskLeave`; no second trap or native exit registration |
| All comparison/editor/status/navigation descendants | `SyncContent` / `ConflictComparison` | Controller supplies snapshot and callbacks; existing typed host bundle |
| Record recovery, resolution and retry | No presentation ownership | Existing repositories, revision graph and serialized bridge writes |
| Private unsubmitted resolution candidates | `sync-drafts.js` + controller | Workspace/type/entity-scoped localStorage; explicit recovery only |
| Reader file-conflict descendants | `fileConflictView` | Existing note expected-source guard, save-as-copy and reload callbacks in `app.js` |
| File-conflict visibility and focus containment | Existing boundary in `app.js` / `bindDialog` | Existing note task and central leave lifecycle |
| Unmigrated Initiative/Organization/etc. | Existing stable consumers | Their own controllers; no ownership acquired by #101 |

React presentation does not call repositories or initiate AI. The controller no
longer constructs, mutates or binds events on panel descendants. Queries for focus,
scroll and opener restoration retain the existing focus authority. `SyncScreen`
remains the explicit shell/task compatibility interface, not a second renderer.
The native bridge, schema, resource handler, close handler and transport are unchanged.

Refreshes capture repository/workspace/request identity; writes retain their original
repository and reviewed tips. Submitted writes settle rather than being canceled.
Invalid raw JSON retains the last valid full value, original source references and
unmodified identity. Draft recovery is explicit and preserves reviewed tips for the
repository's current-head guard. Hidden candidates never become leave participants.
Discard clears the private candidate, not immutable revisions. Recovery-pending
commits retry the retained revision and disable editing until recovery completes.

Production Button, comparison and field styles use the existing semantic tokens and
compiled Tailwind utilities with no preflight. Selected source, keyboard focus and
invalid JSON remain distinct. The catalogue imports `ConflictComparison` itself;
its static example has no persistence callback and does not own a production overlay.

Search now has its delivered React owner; see [search ownership](search-react.md).
Private retry candidates are task-bound and compared with validated immutable history before submission. Cache failures show separate recovery warnings without interrupting live editing or committed-state feedback. Reader copy/reload exposes its captured operation through the existing note-task pending boundary; disk reload retains the candidate until reading succeeds.

Action browsing and editing now use the delivered #95 React owner and stable entry ports; see [Action ownership](actions-react.md). Synchronization keeps its own comparison root and existing shared leave authority.
