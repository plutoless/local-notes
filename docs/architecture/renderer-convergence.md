# Final renderer convergence (#102)

Starting SHA and fetched main: `2f7f55513f077a88201ee3fadb6b6b540d7514a6`.
Rechecked #94/#96/#97/#99/#101 CLOSED and no open PRs before editing.
No glossary or ADR directory exists. The existing content-structure spec and
browser-first/layered validation policy remain authoritative.

## Consumed production ports and ownership

| Surface | React content owner | Controller / stable port |
| --- | --- | --- |
| Shell and Current Focus | ShellContent / FocusContent | shellView, shellUpdate, focusView; bounded repositories |
| Library / Favorites | LibraryRows, Library controls | libraryView, CollectionContexts, LibraryScreen release/request fence |
| Shared reader / wiki / search source return | Reader | readerView / noteReply, app navigation generation and exact source identity |
| Capture / move / Topic / classification | NoteFields, Classification, NoteInformation | noteFieldsView, classificationView, noteInformationView; private task/revision keys |
| Actions | ActionRows, ActionEditor, ActionTools, source/history/options | mountActionControls and ActionEntry; one ActionScreen, immutable repository |
| Initiatives | InitiativeRows/Editor/Tools/Context/Links/Actions/Decisions/Source | mountInitiativeControls, openInitiativeAction; retained sequence fences and ending repository |
| Global search | SearchContent / SearchPassage | searchView / searchRows; one native shortcut and navigation port |
| Organization | OrganizationContent / Settings / CandidateReviewContent | organizationView / candidateReviewView; explicit requests only; active/private/pending guards |
| Sync / record conflict / file conflict | SyncContent / ConflictComparison / fileConflictView | SyncScreen, existing serialized repositories, verified committed retry |
| Shared drawers / leave / feedback | Remaining legacy presentation constructors at starting head | presentation.js owns one modal lifetime and task decision; migration must retain this authority |
| Static document / short form / Topic form / source row shells | HTML or controller-created containers at starting head | Empty slots may remain lifecycle containers; content must have one owner |

The `*-screen.js` modules are lifecycle controllers, not obsolete alternate page
renderers. Their domain repositories, private drafts, expected-base checks,
submitted-write settling and navigation/focus policies must remain. Native
bridge.js is the sole transport map. Retiring it or duplicating registrations is
out of scope. No model requests, schema changes or semantic retrieval are authorized.

## Validation selection

Shared modal/content retirement affects every page, so the maintained UI suite
is justified in addition to fast behavior tests. Preserve existing focused real
Swift storage/index integrations and a small coherent cross-page actual-app
journey using isolated storage; browser shims do not test WKWebView transport.
Shipped assets require Mac packaging/resource verification. Unchanged host OS
input, quit/restart, clipboard and IME replay is release-level deferred; no GUI
grant exists. Android, standalone Syncthing, physical input, minimum OS and Intel
execution remain unrun/deferred, never passed. Record timings as observations,
not native performance or improvements.

## Resulting ownership

The table above records the starting inventory. Final changes are:

- `mountDocument` renders the document scaffold once, with empty slots for the
  existing feature roots. `index.html` is now a resource entry, not a parallel UI.
- `taskFormView` renders short-task and Topic form structures, footer actions and
  explicit field/receipt ports. `NoteFields` owns fields; controllers retain their
  values, validation, pending operations and private recovery.
- `drawerContent` owns drawer heading/close/body/footer structure. Its title model
  updates preserve the body/footer slots and nested field roots. `LeaveContent`
  owns decision content; it is unmounted before the temporary dialog is removed.
  `presentation.js` retains the existing modal lifetime, Tab, Escape and one-task
  leave fence. No new trap, native registration or task owner is installed.
- `actionControl` owns buttons in explicit hosts. Consumers append the host and
  use its stable `control` receiver; they never move a React-owned button out of
  its host. `Feedback`/`feedbackContent` own receipt content, with separate
  controller slots for retry actions. `receiptView` supplies a typed failure port
  for Action committed recovery; its unit test observes that port rather than
  pretending a fake DOM proves React rendering.
- The reader information entry is now a `ReaderAction` callback and React button.
  The old `InfoIsland` effect and unused pre-React metadata markup are removed.
- The never-visible recent/folder filter strip, its click registration, unused
  `filter` variable and its two CSS rules are removed. Every actual collection
  already uses its delivered typed filters; the former consumers only hid this
  strip. Other semantic styles have real React consumers and are retained.
- The unused standalone button/field/disclosure/heading/selection-row/pagination/
  comparison constructors and the directory-label DOM fallback are removed.
  Pure labels and directory publication live outside the renderer, preventing a
  compiled-host import cycle. The directory publisher remains a stable data port.
- The catalogue consumes `ActionField`, `Button`, `Feedback`, `LeaveContent`,
  `NoteFields`, the production drawer and the delivered feature components.
  Constructor-only illustrations and handwritten duplicate search UI are gone.

The remaining DOM construction in JavaScript creates lifecycle containers
(dialogs, source-row hosts and receipt slots), not page content.
Search's `highlight` port is **still consumed** by `reader.highlight` in app.js:
it decorates a detached, safe Markdown fragment, never a second live reader.
Range/TreeWalker operations capture source/selection identity. They are retained.
`legacyRoot`/legacy draft keys remain storage compatibility, never renderer owners.
`ActionScreen.edit`, field/task methods, moved-source Initiative return, request
sequence fences and candidate active/private/pending guards remain real stable
controller consumers and are not falsely retired as unused adapters.

No native source, resource handler, schema, domain repository, index format or
AI request boundary changes. Shipped HTML/JS/CSS changes require packaging and
manifest checks; they do not establish WKWebView/OS-input runtime acceptance.

#131 moved synchronization and external-file conflict into the existing native
dialog top layer. `bindModal` shares keyboard containment with the drawer,
search and leave decision. Controllers retain dismissal and return policy.
