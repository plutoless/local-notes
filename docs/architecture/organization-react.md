# Organization selection, preview and sending (#98)

The pinned React/TypeScript/Tailwind pipeline, semantic tokens and existing role
focus contract apply without an additional palette or overlay framework.

| Surface | DOM / interaction owner | Data / lifecycle authority |
| --- | --- | --- |
| `#organization-react` selection and exact request preview | `OrganizationContent`, keyed source paths | `OrganizeScreen`, existing bounded Library query and one `Organization` service |
| Settings drawer body | `OrganizationSettings` React root | Existing `drawer`, `settingsTask`, `requestTaskLeave` and native `aiSettings`/`aiConfigure` |
| Settings drawer shell/footer | Existing presentation drawer and buttons | One existing modal/leave decision owner |
| Saved candidates, evidence links and candidate pagination | Legacy `candidates(returnFocus)` adapter outside React roots | Shared `CandidateRepository` / `CandidateReview`; retained for #99 |
| Shared reader/source return | Delivered reader and app source-origin adapter | Existing workspace/task/navigation authority |
| Status/progress | React model publication | Same service's covered fragments and cancellable generation |

React components receive typed data/callbacks; they do not import the bridge,
repositories or services. There are no effects, automatic sends, new global
listeners or lifecycle authorities. Roots live for the application document;
route changes hide the panel without remounting fields. Keyed sources preserve DOM
identity across query updates. Legacy code reads validity/focus receivers but
never mutates descendants of either React root. No two renderers own a node.

`candidates(returnFocus)` is the stable temporary handoff for #99: it queries the
same repository used by the single Organization instance, renders only the legacy
candidate island and restores candidate/source context. Workspace/session and
candidate request fences prevent late queries from replacing a newer workspace's
candidate cards. Selection uses the existing inventory request and workspace fence.
Preview and send retain service workspace/generation guards, supplemented by
controller session fences for visible completion. Submitted writes retain existing
serialized repository semantics; cancellation does not pretend to undo commits.

Native settings return only address/model/configured metadata. Entered credentials
stay ephemeral, are cleared on close/save/reset and never appear in preview or
synchronized records. Saving settings invalidates preview, never sends it. Preview
renders the actual system message and serialized fragment user messages; send is
an explicit callback to the existing native service. Search/page uses bounded
index descriptors and preview reads only selected sources, with a 20-note cap.
No data formats, resource transport or OS-input registrations change.
