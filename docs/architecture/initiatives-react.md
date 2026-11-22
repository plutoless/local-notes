> Current final ownership: [renderer convergence](renderer-convergence.md). This document also records the original slice boundary; historical coexistence descriptions below are superseded by #102.

# Initiative presentation ownership (#96)

Starting/fetched main: `514a5138a6c76443a5bc04424bddd9a2960a7d69`.
Action #95 is closed and PR112 merge is an ancestor. Organization PR113 was the
only open overlap at launch and is not consumed. No glossary or ADR directory
exists at the starting head.

| Surface | Owner | Public boundary |
| --- | --- | --- |
| Initiative browse `#items` | React `InitiativeRows` | Bounded repository page, selected identity, callback; `release()` unmounts and fences pending list replies before another owner mounts |
| Metadata, tools and context structure | React mount-once `InitiativeEditor`, `InitiativeTools`, `InitiativeContext` | Explicit uncontrolled IDs; InitiativeScreen owns values, events and receipt slots; no rerender over edits |
| Working/reference context links | React `InitiativeLinks` | Typed source identity, selected state, warning/resolved path and open callback |
| Context Action entries | React `InitiativeActions` | Delivered `ActionEntryPort.open` opens the shared editor with a persisted record or the Initiative ID as the initial assignment for a new Action |
| Working-note entry | Shared note task and reader | Per-Initiative capture draft, existing note create and Initiative repository writes, then the shared reader with contextual return |
| Ending choices | React `InitiativeDecisions` | Public pure projection of unfinished members, eligible destinations and retained decisions; controller reads explicit choices |
| Editable source shell | React `mountInitiativeSource` per row | Mount-once uncontrolled fields; controller owns fingerprint/name/status/role placement; unmount before remove/reset |
| Metadata detour snapshot | InitiativeScreen | Snapshot view data and restore via React ports, never detach React-owned children |
| Drawer, modal leave, focus/selection | Existing presentation drawer/requestTaskLeave and controller | One trap/active task; no React effects registering shortcuts/exit handlers |
| Draft/save/ending/retry | Existing InitiativeScreen and repositories | Private workspace/entity drafts; immutable independent revisions and expected parents; submitted writes settle |
| Storage/index/transport | Existing bridge.js, repositories, Mac adapters | No schema, transport, native-host or consent change |
| Catalogue | Actual InitiativeRows/Summary/Links/Editor/Decisions | Synthetic selected record, long source paths, moved-source warning, invalid title and unfinished Action decisions |

The overview follows the selected [page-first composition](../design/issue122/SELECTED.md).
Metadata and source fields use the shared vendored shadcn/ui
[Input, Textarea and Button adaptations](../design/issue123/ADOPTION.md).
Status, source role and ending decisions use labeled native selects for keyboard
operation and the existing controller's synchronous readback. The form uses the
existing dialog and receipt ports for validation, recovery and focus.

Static control ports are a deliberate legacy coexistence adapter matching #95,
not a second task owner. Source status slots remain controller-owned; React alone
owns warning content on context links. Action/note origins, reference move repair
and storage error contracts remain delivered services. Navigation releases only
this screen's list owner, preserving sibling registrations and features.
