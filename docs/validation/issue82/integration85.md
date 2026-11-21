# Delivered Organization-focus integration

Starting head: `15d8dac7ab11c3fe36dedacf3ccd00def5e8a1d3`.
Integrated main: `2e0dfeac0eb2edf603481d163a56e5d5c250baf7` (delivered PR100).
Execution head: `ca48067ef0e41ba737b3887b7a22a0724a9eabac`.
Native GitHub and written blockers were reread: #81 is closed and its foundation
is an ancestor of current main. Delivered105 and sync changes remain preserved.

## Overlap and conflict resolution

Incoming production changes affect only `app.js` and `organize-screen.js`.
The application hunk captures an explicit Organization source opener rather than
reading the active element after the asynchronous leave decision. Replacing that
exact callback signature/origin expression with the previous expression yields
byte equality to the starting app module. Reader rendering, source editor,
capture, lifecycle and shared leave implementation are therefore unchanged.
The OrganizeScreen module changes are consumed unchanged from main.

The sole conflict was the maintained UI test command. Resolution retains every
command from both parents, including Organization focus plus reader focus/editing,
without duplicates. No sibling correction or new product behavior is introduced.
Against latest main, the branch production delta remains six reader CSS lines.

## Selected layers and executed checks

The changed note-source opener makes Organization source open/return relevant to
this reader slice. The maintained `organization-focus-ui.mjs` was run against the
actual shared app with controlled synthetic analysis responses and isolated real
Markdown/Swift records/SQLite. It checks source open/return, original source
preservation, candidate selection/range/disclosure/scroll context and explicit
individual confirmation/readback. Exactly one deliberate confirmed action is
written; source reading itself does not write a formal record. No real AI request
or private data processing occurs.

The actual-app reader editing journey was also rerun because app.js changed.
It covers browser composition cancel/commit, caret/selection, Read/Edit/search
return, real Markdown save/readback/reload, Continue with a held callback and
newer trusted Tab, discard and final reload. The exact newer note-save destination
equality remains unchanged and passes. Cancelled/read-only source is unchanged;
deliberately saved Markdown equals final disk bytes; this reader fixture writes
no formal records.

At the execution head, all commands exited 0:

- `npm run check && git diff --check`
- `READER_EDITING_EVIDENCE_DIR=build/issue82-integration85/reader CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/reader-editing-ui.mjs`
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/organization-focus-ui.mjs`
- `npm run build:mac`

Earlier 23 fast public-module/real-adapter tests retain their execution provenance
with unchanged module, storage and test inputs. Delivered105's public-interface
component checks control callback order and cover normal selection return,
disabled dismissal, newer input/caret and newer Tab/pointer/focus containment;
they are reused with identical presentation/test/style bytes. They are real DOM
component scope, not a claimed pure Node decision unit. The fresh application
reader journey establishes the actual DOM wiring beyond that lower component
scope. No shared105 decision code changes here and no duplicate decision API or
test matrix is introduced.

Prior capture/lifecycle checks and paired reader geometry evidence retain their
original provenance: their test/model/style/HTML inputs and relevant application
code are unchanged, as the exact app-hunk normalization proves. Changed
Organization source return is freshly exercised. This bounded integration does
not require the full UI/unit matrix or replaying unrelated Organization cases.

## Package, provenance and boundaries

Shipped assets changed, so the Mac package is rebuilt. All packaged web files
match current source. Local `build/issue82-integration85/validation.json` binds
commands/logs, source/package/executable hashes, reader and Organization artifacts,
real source/readback hashes and unchanged environment. `overlap.json` records
exact per-file equality, app normalization and test-list union. Final delivery
binds the documentation-only successor to this execution head; final independent
Standards/Spec review covers the actual final diff and evidence applicability.

CDP compositionend remains explicitly untrusted, not actual OS IME. The browser
adapter does not exercise WKScriptMessageHandler/Android transport, native
notes:// loading/security or OS input. Native host/transport/resource wiring/
security/lifecycle/OS shortcut/system clipboard/nativeIME/platform code is
unchanged. Actual OSIME/native keyboard/clipboard compatibility remains
release-level deferred by user policy, never passed; physical input is unrun;
Android-specific and standalone Syncthing checks are deferred. No GUI custody,
native executor, app activation, clipboard/input-source or OS input occurred.

Cumulative cycles 1–6 and all historical failed evidence remain unchanged.
The routine merge/test-list conflict is resolved, with no new failed repair cycle
or counter reset. Coordinator alone owns merge, closure, labels and hold exit.
