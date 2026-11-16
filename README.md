# Local Notes 0.1

A local Markdown notes and tasks app for Mac and Android. The app does not provide a synchronization service; Syncthing synchronizes files between devices. It starts with an isolated Sample directory by default.

## Run

- Mac: open `dist/LocalNotes.app`. This is an ad hoc signed Apple Silicon build and has not been notarized by Apple.
- Android: install `dist/LocalNotes-debug.apk`. Android 8 or later is required. This is a development-signed package and has not yet been verified on a physical device.
- No directory selection is required on first launch; try the samples first. Later, select the same dedicated notes subdirectory within each device's synchronized folder. Do not select a parent directory containing unrelated private data.

## Implemented features

Local autosave, unsaved draft recovery, full-text search, recently edited and path-sorted lists, favorites, basic Markdown reading, aggregated tasks with write-back, move/rename, external change detection, and saving conflicts as copies. Favorites and indexes do not synchronize across devices. Source files remain Markdown.

Scanning skips hidden directories and Credentials and lists only Markdown files up to 2 MB. Attachments are not displayed. Due dates, reminders, tags, and rich text are not supported yet. Reading mode supports basic headings, bold text, code, and tasks; it is not a complete Markdown renderer. The directory option currently sorts paths rather than displaying a directory tree.

## File protection and limitations

Before saving, the app compares the current file contents with the loaded version. If an external change is detected, it stops overwriting and allows the edit to be saved as a separate copy. Before each modification, the previous contents are saved in the app-private History directory, retaining the latest 200 snapshots. Android uses the Storage Access Framework (SAF) with persisted directory authorization and does not request full-disk access or network permission.

External editors and Syncthing do not follow the app's locking protocol. Comparing contents before saving cannot eliminate a very short concurrent-write race, and Android file providers do not guarantee atomic replacement. Test with sample files first and enable Syncthing version history before connecting real notes. If the system directory picker cannot access Syncthing's directory, a suitable shared directory must be verified on a physical device.

## Development

There are no third-party runtime dependencies. The interface uses HTML/CSS/JS, with a Swift/WKWebView shell on Mac and a Java/WebView shell on Android. Each platform uses its own local file bridge.

```sh
npm test
npm run build:mac
npm run build:android
```

Mac requires the Xcode toolchain. The Android script supports ANDROID_HOME/JAVA_HOME and defaults to Homebrew Android SDK 35, Build Tools 35.0.0, and OpenJDK 21. It does not require Gradle or a network connection. The development signing key is stored in build/; retain it to allow future installation updates.

## Recorded validation

- Mac and Android builds completed, and APK development-signature verification passed.
- Five core tests passed: CRLF/nested task write-back, excluding tasks in fenced code, path boundaries, HTML escaping, and special characters in headings.
- The Mac app was opened and the notes list worked. Sample editing with autosave, task aggregation, and checking a task with write-back to the original Markdown were verified.
- The browser interaction script is tests/ui.mjs. Browser subprocess launch restrictions prevented a successful run in the session that recorded these results. Install Playwright and Chromium, then run node tests/ui.mjs; CHROME_PATH can also select a browser executable.
- Android has not yet been installed on a physical device. Directory authorization, recovery after process termination, the mobile keyboard, and three-way synchronization still require physical-device verification.
