# Library React ownership and offline packaging

Issue #92 is the first vertical slice of #89. The maintainer selected Tailwind 4,
macOS 13.3/system WebKit 16.4-era capabilities and Android 8/API 26 with Chromium
WebView provider 111+. These are compatibility targets; compilation and testing on
the current Mac do not establish minimum-version runtime coverage.

## Build and package

Use Node 22.18 or later (also meeting Vite's engine requirement; tests use native
TypeScript stripping), then
`npm ci`, `npm run typecheck`, and `npm run build:web`. Dependencies are pinned and
locked. `scripts/build-web.mjs` cleans Vite output, emits the local React entry/CSS
under `build/web/assets/`, copies unchanged legacy modules, then generates an exact
relative-path MIME manifest. `build:mac` and `build:android` invoke the typecheck and
web build before replacing their entire packaged web directory. Removed assets
cannot survive through an overlay copy. Node and Vite are build-time tools only.

`web/index.html` and legacy modules remain the entry shell. The React host library
is imported locally from `assets/react-host.js`; it does not bundle a second copy
of the legacy bridge. There is one native reply map, shortcut registration and exit
registration. Vite's explicit Safari 16.4/Chrome 111 target avoids relying on a
future moving default. No route/server framework, state/form/query framework,
component registry, remote fonts or CDN are introduced.

Both hosts resolve full relative paths against their generated manifest, checking
scheme, exact host, authority, encoding and path shape. Unknown, encoded traversal,
workspace/private paths and unsupported resources fail closed. Mac additionally
rejects symlinks before reading packaged bytes. Android uses AssetManager rather
than workspace storage, and denied requests return a local response rather than
falling through to network. The manifest itself is not served. Nested modules and
CSS retain JavaScript/CSS MIME types. The Mac package records minimum OS 13.3 and
builds for the current machine's architecture; it is not a universal binary.

## Production ownership

| Surface | DOM owner | Lifecycle and persistence authority |
| --- | --- | --- |
| Library filters, directory controls, progress, paging | React `libraryView` controls root | Existing `LibraryScreen` controller and `Library`/ReferenceIndex |
| Library rows and empty states | React rows root in `#items` | Existing bounded query/filter/index logic |
| Shared reader toolbar, title/body, Markdown and search highlight | React `readerView` | Existing note generation/draft/save/leave/wiki/history logic in `app.js` |
| Note information entry | Explicit legacy opener island inside reader | Existing C drawer authority |
| Note metadata, classification, capture/location/Topic fields | React typed views; explicit sibling legacy receipt islands | See `note-forms-react.md` (#94) |
| Search | React `SearchContent`; existing controller/typed navigation adapter | See `search-react.md` |
| Action, Initiative, Organization, synchronization | Existing legacy screen modules | Existing repositories and shared modal lifecycle |
| Tokens | `web/style.css` semantic variables | Tailwind maps those variables; no second semantic palette |

`LibraryScreen.release()` synchronously unmounts rows before navigation hands the
shared list to a legacy renderer. Both route selection and refresh enforce this,
and workspace replacement releases ownership before clearing the list. Request
and workspace fences remain on asynchronous rendering. Library boundary replies
are runtime-validated before becoming typed presentation data.

The reader is mounted once and receives text/mode/status through its typed host
adapter. Ordinary updates keep input nodes and caret identity. Input callbacks
update the controlled text before invoking the existing draft/autosave logic.
Effects only attach the explicitly legacy-owned information island; they never
create records, save, initiate AI, or register native/global events. Drafts remain
workspace/entity-scoped and saves retain expected-base checks and serialization.
Selection/focus/scroll restoration may address surviving DOM nodes; legacy code
never writes React content or toolbar state. Search decoration is built in a
detached fragment by the reader owner before rendering safe markup.

## Components, styles and complex controls

The project-owned `Button`, `LibraryRows`, Library controls and reader are consumed
production components. Buttons retain the existing role-specific compact geometry;
rows retain source titles/excerpts, selected state and keyboard focus. Fields and
reader typography retain existing semantic styles. Tailwind contributes compiled
layout/semantic utilities without preflight or global reset, preserving coexistence.
`docs/design/catalogue.html` imports actual compiled components and production
semantic tokens, rather than recreating their appearance.

Complex controls continue to use the existing project-owned native-dialog/drawer
family in `presentation.js`, including the shared Save/Discard/Continue decision.
No additional overlay library or focus trap is installed. Actual contextual
Action/Topic/Initiative drawers and search opening, dismissal, containment and return
passed the maintained real-storage browser journeys; see issue #92 validation for
commands, source reuse and native/OS boundaries.

## Validation boundaries

Unit and focused real Swift-storage/index integration tests remain primary.
Actual-app browser tests load `build/web` and use isolated real Markdown/record/
SQLite fixtures through the existing bridge protocol. They exercise browser event
wiring, focus/caret/selection and save/readback/reload; their bridge shims do not
exercise WKScriptMessageHandler, Android Java transport or native OS input.
The broad shared reader ownership change justifies the maintained UI regression
suite once, in addition to the focused Library and editor acceptance journeys.

Mac packaged custom-scheme/resource checks require an exclusive coordinator grant.
The pre-change baseline lease was released. Minimum OS/engine runtime tests, Android
execution, standalone Syncthing and ordinary native IME/clipboard replay are not
inferred from browser results. Preserve failed cycles and source/artifact bindings
in `docs/validation/issue92/`.
