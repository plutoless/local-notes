> Current final ownership: [renderer convergence](renderer-convergence.md). This document also records the original slice boundary; historical coexistence descriptions below are superseded by #102.

# Shell and Current Focus ownership

Issue #93 consumes the #92 pinned React/TypeScript/Tailwind 4 pipeline and semantic
CSS variables. Support targets remain macOS 13.3 / WebKit 16.4 and Android 8 / API
26 with WebView 111+. No schema, storage, native transport or lifecycle registration
changes are introduced.

| Surface | DOM owner | Existing behavior authority |
| --- | --- | --- |
| Sidebar navigation, capture and directory controls | `ShellContent` in `#shell` | `app.js` navigation/flush/workspace guards |
| Directory name/path and hidden count | Shell model via `shellUpdate` | `directoryLabel` stable adapter and Library count |
| Synchronization opener | Stable `SyncScreen` entry point with React panel descendants in explicit `#shell-legacy-utilities` island | Existing synchronization/leave controller |
| Header search and search return | Existing header adapter; React `SearchContent` dialog | Single `SearchScreen` and document shortcut listener; see `search-react.md` |
| Current Focus sections, rows, menus and continuation | `FocusContent` in shared `#items` while home owns it | `FocusScreen`, Action/Initiative repositories and existing task drawers |
| Reading continuation and home return | React home rows and delivered shared reader | Existing workspace-scoped `ReadingHistory`, source fingerprints, app generation fences and `sourceOrigin` |
| Library/reader | Delivered #92 React owners | See `library-react.md` |
| Favorites, capture, Topics, classification and note locations | Typed React note views with retained C sheet/task controllers | See `note-forms-react.md` |
| Actions | React controls/rows via stable `ActionScreen` ports | See `actions-react.md` |
| Synchronization dialog contents | React comparison/editor via stable `SyncScreen` | See `sync-react.md` |
| Initiatives, Organization | Existing legacy controllers/explicit islands | Their unchanged repositories, task guards and drafts |

The shell renders once synchronously before legacy controllers register controls.
Navigation selection and `aria-current` are derived from the same model, including
initial startup. Search/capture invoke the existing single entry points; React does
not register document/native shortcuts, exit handlers, observers or storage events.
The directory adapter binds once for the document lifetime; its returned disposer
removes only its own binding. The shell's `dispose()` unmounts its root. These
application-lifetime owners end with document destruction; they are not mounted
and remounted for routes or workspaces. No effect performs writes or requests.

`FocusScreen.release()` invalidates in-flight results, cancels its queued background
refresh and synchronously unmounts its root before any legacy/shared-list renderer
or workspace reset writes `#items`. Repository identity plus request generation
remain the async authority. Submitted saves settle in their originating repository;
post-save refresh/focus runs only while that request still owns home. Pagination,
recovery, removal and reorder retain existing serialized writes and expected-base
records. Reordering computes a position between neighbors without rewriting them.

Within home, keyed action/path nodes survive ordinary refreshes. Native disclosure
open state, focus and both scrollports are retained; restoration addresses surviving
DOM controls rather than writing React content. Active legacy drawers retain their
existing Save/Discard/Continue decision, drafts and source identities. Reading hints
remain private localStorage navigation metadata, bounded to three entries per
workspace; no source/record schema changes. Home performs bounded record queries
and never reads Markdown bodies. Explicit continuation reads only its chosen note,
checks source identity, reports changed/missing content and returns to home context.

The catalogue imports the same consumed shell and Focus components. It has no
storage or AI callbacks. `docs/validation/issue93/` records actual browser/storage,
packaging, source binding, failures and unrun native/minimum-version boundaries.

See [synchronization ownership](sync-react.md) for #101 panel, draft and bridge boundaries.
