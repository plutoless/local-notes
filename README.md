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

Before saving, the app compares the current file contents with the loaded version. If an external change is detected, it stops overwriting and allows the edit to be saved as a separate copy. Before each modification, the previous contents are saved in the app-private History directory, retaining the latest 200 snapshots. Android uses the Storage Access Framework (SAF) with persisted directory authorization and does not request full-disk access. Android requests Internet permission for explicit AI analysis.

External editors and Syncthing do not follow the app's locking protocol. Comparing contents before saving cannot eliminate a very short concurrent-write race, and Android file providers do not guarantee atomic replacement. Test with sample files first and enable Syncthing version history before connecting real notes. If the system directory picker cannot access Syncthing's directory, a suitable shared directory must be verified on a physical device.

## Development

The shared interface uses React and TypeScript with compiled Tailwind 4. JavaScript controllers retain the existing domain, navigation and task lifecycle authorities; typed view ports own presentation. The native Swift/WKWebView and Java/WebView shells and local file bridges remain. Dependencies are pinned in the lockfile and bundled locally: installed apps require no Node.js, development server, CDN or network assets. See [frontend ownership and packaging](docs/architecture/renderer-convergence.md).

The maintainer-approved compatibility targets are macOS 13.3 with system WebKit 16.4-era capabilities and Android 8/API 26 with Chromium WebView provider 111 or later. The OS and engine requirements both apply; minimum-version runtime tests remain unrun unless explicitly reported in the validation evidence.

```sh
npm ci
npm run typecheck
npm run build:web
npm run check
npm test
npm run build:mac
npm run build:android
```

Mac requires the Xcode toolchain. The Android script supports ANDROID_HOME/JAVA_HOME and defaults to Homebrew Android SDK 35, Build Tools 35.0.0, and OpenJDK 21. It does not require Gradle or a network connection. The development signing key is stored in build/; retain it to allow future installation updates.

## Validation

Follow the [project validation policy](docs/agents/validation.md): behavior-focused unit tests first, focused real-adapter integration tests, and only justified browser or affected native checks. `npm test` requires the macOS Swift toolchain for integration with the production file/SQLite adapter.

The browser interaction suite requires Playwright and a Chromium installation:

```sh
npm ci
npm run build:web
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui
```

Keep run-specific evidence in ignored local output or CI artifacts, and publish concise results in PR descriptions or issue comments. Historical validation artifacts are not part of the current source tree. Existing harnesses may write to the ignored `docs/validation/` directory; those files must not be added to Git. Android-specific and standalone Syncthing checks remain deferred until requested, never reported as passed.

## AI suggestions (issue 6)

Organize supports one OpenAI-compatible Chat Completions endpoint (`POST`, Bearer authorization, non-streaming `choices[0].message.content` containing JSON). Configure the full HTTPS endpoint, model and API key on each device. Mac also accepts HTTP at `127.0.0.1` for a controlled local service. Redirects are refused. Network failures and invalid responses require explicit retry; requests have finite timeouts. No real provider is bundled or called automatically.

Select 1–20 notes from a directory page, preview the exact system and user messages, then start. Long notes are sent in complete, sequential 6,000-character fragments with offsets, progress and completed coverage. Cancel stops the active native request; completed suggestions remain saved, and explicit retry resumes incomplete fragments. Previewing again starts new coverage. Repeated equivalent suggestions from the same evidence are deduplicated. Source text is treated as untrusted input; no tools, file writes or confirmed-state changes are exposed to the service.

Evidence-backed initiative, topic, relationship, progress and action suggestions are saved in `LocalNotesData/candidates/` with immutable revisions and a rebuildable private SQLite index. Quotes must occur in the fragment sent. Suggested placement and relevance are model claims, not confirmed facts. Open evidence to read the original note; confirmation and review decisions belong to a later issue. Existing notes and confirmed records are unchanged by generation.

Credentials and service settings stay in app-private device storage (Mac Application Support with owner-only settings-file permissions; Android private preferences with backup disabled), outside synchronized JSON, notes and model messages. Saved credentials are never returned to the WebView; password entry is cleared after saving. These files are not an encrypted secret vault. Service response bodies and credentials are not logged. Manual features remain available without configuration or connectivity. See [issue #6](https://github.com/plutoless/local-notes/issues/6) for the delivery discussion and [the validation policy](docs/agents/validation.md) for current check and evidence requirements.
