> Current final ownership: [renderer convergence](renderer-convergence.md). This document also records the original slice boundary; historical coexistence descriptions below are superseded by #102.

# Action presentation ownership

Issue #95 starts from fetched main `8ae4622f4a23033ec149038d9a370c9985a138e8`.
GitHub #93 was closed and the sole native/written blocker; its implementation is
that starting main commit. No open pull requests existed at the initial overlap check.

| Surface/contract | Owner | Compatibility boundary |
| --- | --- | --- |
| Action browse rows in shared `#items` | React `ActionRows` | ActionScreen supplies bounded repository results and callbacks; `release()` unmounts before another screen writes the shared container |
| Action control structure | React `ActionEditor` and `ActionTools`, mounted once | Stable uncontrolled control ports retain IDs, values and handlers needed by existing app/Initiative consumers; no subsequent React render overwrites those ports |
| Source references | React source view | Typed `ActionSource`; controller supplies availability and open callback; source replies compare request, repository and exact original source before adoption |
| Immutable history | React history view | Existing repository history, sorted by modification time for display only; record/revision identity and request guard protect late replies |
| Drawer/leave overlay and focus | Existing `drawer` / `requestTaskLeave` | Exactly one overlay and active-task authority; no React effects register traps or native exit handlers |
| Save/drafts/recovery/return | Existing ActionScreen, app origin and repositories | Existing serialized writes, private task keys, expected revisions and submitted-write settling retained |
| Native bridge/storage/index | Existing `bridge.js`, ActionRepository and platform adapters | No transport, schema, storage or resource-handler change |
| Catalogue | Actual production `ActionRows` | Synthetic callbacks and production tokens; no storage |

`ActionEntry` in `web/react/actions.tsx` specifies record, opener and return callback.
`ActionScreen.open(entry)` is the new entry port; legacy `edit(record, recovered,
proposal, opener)`, `task()`, `fields()` and `returnToFocus` remain stable for
Initiative, search, reader and Current Focus callers. There is one Action editor.
The static control shell is an explicit coexistence adapter, not a second state
or persistence authority. Feedback slots are reserved for the controller; select-option children, dynamic
sources, history and rows have only React renderers. The form and footer mount
directly in existing drawer slots without structural reparenting or removal.

React uses existing semantic CSS tokens and compiled Tailwind utility classes;
no alternate palette, package or runtime dependency was introduced. Chinese copy,
read-only Markdown markers and existing source quote/path/fingerprint contracts
remain unchanged. Native OS input compatibility is release-deferred by current
validation policy; browser storage tests do not exercise WKWebView transport.
