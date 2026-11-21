> Current final ownership: [renderer convergence](renderer-convergence.md). This document also records the original slice boundary; historical coexistence descriptions below are superseded by #102.

# Favorites and contextual note forms ownership (#94)

Consumes #92 reader/Library, #93 shell, existing semantic tokens and pinned
React/TypeScript/Tailwind. No engine floor, host, transport or storage changes.

| Surface | DOM owner | Behavior authority |
| --- | --- | --- |
| Favorites list, filters and reader | Delivered LibraryRows/Controls and Reader | LibraryScreen bounded private favorite-path query; app.js private stars semantics |
| Per-collection filters/page/selection/scroll | CollectionContexts, consumed by LibraryScreen | Workspace reset drops snapshots; source editor guards remain in app.js |
| Capture and location field content | NoteFields in shortForm | Existing short-task controller, workspace draft keys, active task leave adapter, create/move bridge |
| Topic name field | NoteFields in topic-form | LibraryScreen Topic task, original revision, recoverable commit and serialized repository |
| Metadata content | noteInformationView, mounted once | Typed model updates own path/favorite/repair properties and callbacks; stable nodes retain focus |
| Classification content | Classification in dedicated content roots | Existing Topic/Initiative repositories, workspace/source fencing and expected-base writes |
| Classification failure/retry receipts | Explicit sibling legacy receipt island | Existing retry/recovery authority; React never renders receipt children |
| C sheet shell, footer, focus, containment, leave decision | Existing drawer/requestTaskLeave stable adapter | Single modal owner, initial meaningful focus, Save/Discard/Continue and restoration |
| Other routes and form controllers | Unchanged legacy owners | Their own separately assigned migration issues |

React views receive field definitions, records and callbacks; no component performs
persistence, requests models or registers a native/document listener. Model-driven
fields remain mounted through typing, composition, receipts and saving, retaining
caret and selection. Fresh short-task openings replace only the fields owned by
that view; Topic fields persist for the controller lifetime. No hidden form becomes
an implicit participant. Native compatibility replay is release-deferred; browser
storage evidence does not exercise the native transport or OS input.
