# Local Notes 0.1

A local Markdown notes and confirmed actions app for Mac and Android. The app does not provide a synchronization service; Syncthing synchronizes files between devices. It starts with an isolated Sample directory by default.

## Run

- Mac: open `dist/LocalNotes.app`. This is an ad hoc signed Apple Silicon build and has not been notarized by Apple.
- Android: install `dist/LocalNotes-debug.apk`. Android 8 or later is required. This is a development-signed package and has not yet been verified on a physical device.
- No directory selection is required on first launch; try the samples first. Later, select the same dedicated notes subdirectory within each device's synchronized folder. Do not select a parent directory containing unrelated private data.

## Implemented features

Confirmed actions start empty and are independent of Markdown checkboxes. Create and edit actions offline with To do, In progress, Waiting, Completed, and Canceled states; filter by state, reopen retired actions, and inspect immutable history. Actions have stable IDs, descriptions, optional initiative IDs, due dates and waiting conditions, and source references. A date is required before an unfinished action can appear overdue.

The note editor retains local autosave, unsaved draft recovery, full-text search, recently edited and path-sorted lists, favorites, basic Markdown reading and checkbox editing, move/rename, external change detection, and saving conflicts as copies. Favorites and indexes do not synchronize across devices. Source files remain Markdown.

Confirmed action JSON and full immutable revisions live in `LocalNotesData/` under the selected root. A workspace ID separates data, local indexes, and drafts across roots. SQLite lives in app-private storage outside the synchronized directory and is rebuilt from JSON. No old checkbox aggregation is migrated, and action state changes never check source Markdown boxes.

Scanning skips hidden directories and Credentials and lists only Markdown files up to 2 MB. Attachments are not displayed. Reminders, tags, and rich text are not supported yet. Due dates belong to confirmed actions. Reading mode supports basic headings, bold text, code, and tasks; it is not a complete Markdown renderer. The directory option currently sorts paths rather than displaying a directory tree.

Initiatives organize an undertaking's title, goal, current progress and Active, Later or Ended state. Link existing Markdown as working notes or references without moving or copying it, create a linked note inside an initiative, and assign the same confirmed actions from either entry point. Ending requires an explicit choice for each unfinished action. Changed and missing sources remain visible; ambiguous external moves require manual relinking. Failed link updates after an in-app move expose a retry in the note editor.

## File protection and limitations

Before saving, the app compares the current file contents with the loaded version. If an external change is detected, it stops overwriting and allows the edit to be saved as a separate copy. Before each modification, the previous contents are saved in the app-private History directory, retaining the latest 200 snapshots. Android uses the Storage Access Framework (SAF) with persisted directory authorization and does not request full-disk access or network permission.

External editors and Syncthing do not follow the app's locking protocol. Comparing contents before saving cannot eliminate a very short concurrent-write race, and Android file providers do not guarantee atomic replacement. Test with sample files first and enable Syncthing version history before connecting real notes. If the system directory picker cannot access Syncthing's directory, a suitable shared directory must be verified on a physical device.

## Development

There are no third-party runtime dependencies. The interface uses HTML/CSS/JS, with a Swift/WKWebView shell on Mac and a Java/WebView shell on Android. Each platform uses its own local file bridge.

```sh
npm run check
npm test
npm run build:mac
npm run build:android
```

Mac requires the Xcode toolchain. The Android script supports ANDROID_HOME/JAVA_HOME and defaults to Homebrew Android SDK 35, Build Tools 35.0.0, and OpenJDK 21. It does not require Gradle or a network connection. The development signing key is stored in build/; retain it to allow future installation updates.

## Recorded validation

See [Issue #2 implementation and validation](docs/validation/issue-2.md) for initiative tests, recovery behavior and the current validation decision.


See [Issue #1 implementation and validation](docs/validation/issue-1.md) for persistence details, automated checks, and recorded validation limits. `npm test` requires the macOS Swift toolchain for integration with the production file/SQLite adapter.

The browser interaction suite requires Playwright and a Chromium installation:

```sh
npm install --no-save --package-lock=false playwright
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui
```

The Mac and Android builds pass. Automated shared-UI and Mac storage integration checks pass, and the issue #2 follow-up verified native Mac creation, editing, linked-note autosave, restart/index recovery and explicit handling of unfinished actions before ending. Sequential Syncthing transfer passed between two isolated instances on one Mac in both directions. Under the [project validation policy](docs/agents/validation.md), standalone Syncthing tests and Android-specific tests are deferred until the user requests them and do not block merging. Unexecuted physical-device and divergent-edit/conflict checks remain unverified. See the validation notes for the exact scope and evidence.
