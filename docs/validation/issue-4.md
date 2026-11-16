# Issue #4 validation

## Scope and prerequisites

Starting and reviewed base: `65e3b5b42ce1eda0e908c832c0167147e728fd73`.
Before writing, issue #4's native `blocked_by` API and its Blocked by section both named only #2, which was closed. Issues #1 and #2 were closed and commits `791555dff9e0e95b96020277c2fa6ed300a67024` and `65e3b5b42ce1eda0e908c832c0167147e728fd73` were verified as ancestors of origin/main. No prerequisite was implemented here.

References use a private `references.sqlite` per workspace. SQLite holds searchable text but bounded list payloads contain only titles, excerpts, paths, timestamps, sizes and fingerprints. Topic records and their links use synchronized immutable revisions and `LocalNotesData/topics/`; the index is recoverable. Mac root notifications trigger metadata reconciliation with a 30-second metadata fallback for nested changes. Android refreshes metadata on foreground resume and manually. There is no four-second body scan. New and changed bodies are indexed one at a time, yielding between bridge requests so partial results and editing remain available. Enumeration warnings retain absent rows instead of interpreting incomplete traversal as deletion.

## Executed checks

- `npm run check`: shared JavaScript syntax checks passed.
- `npm test`: 19 tests passed, including production Swift filesystem/SQLite contracts. The added fixture contains 500 Chinese/English notes and 2,000 confirmed actions; it verifies 50-record pagination without duplicate/omitted paths, title/body search, directory queries, topic creation/rename/multiple links/unlinking, index removal and confirmed-record recovery, edits/moves/deletions, and unavailable-directory retention. The native Mac metadata traversal test verifies hidden, Credentials, app-managed and symlink exclusions.
- Recorded harness measurement: cold indexing 624.5 ms with 500 body reads; warm reconciliation 404.2 ms with zero body reads; one edit plus one move caused two reads. The opening adapter returned one requested body (0.021 ms in-memory fixture). These are shared reconciliation plus production Mac SQLite measurements; synthetic note metadata/body delivery is in-memory in that benchmark. They do not establish native filesystem opening time, WKWebView startup time, or the one-second warm-home target.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: both suites passed using Chromium and production Mac file/SQLite storage and metadata traversal. Added interactions cover topic creation/rename/link, favorites, body search, directory enter/back. Existing editor autosave, draft recovery including legacy root keys, external-edit protection, initiative backlinks and shared-source behavior passed. A 393-pixel viewport passed the existing horizontal-overflow check; this is not an Android device test.
- `npm run build:mac`: application compiled and ad hoc signing passed.
- `npm run build:android`: APK built and signature verified; existing deprecated-API compiler note remains. This is a build, not an Android-specific runtime test.

## Native Mac interaction

A copied, signed app with bundle ID `dev.localnotes.validation.issue4` used isolated `build/native-issue4/Sync` and `Private` directories. Real Cocoa/WKWebView accessibility interaction opened the library, displayed the indexed Chinese/English fixture, created `Native research` through the inline form, opened the original `Research/test.md`, and checked its topic link. The saved current topic JSON and parented immutable revisions were inspected to confirm the same relative path and source fingerprint. Warm metadata status displayed zero body reads. No network or synchronization service was needed by these operations; the Mac's network connection was not disabled.

Early native prompt-based topic input timed out under accessibility automation. The final implementation uses an inline form and that flow passed. Native app renaming, exhaustive editor permutations and a full 500-note/2,000-action native startup benchmark were not executed; corresponding shared UI/domain coverage is recorded above without claiming native execution.

## Reviews and limitations

Independent Standards and Spec reviews compare the feature to the starting SHA. Findings fixed: Android foreground event, native topic input, full-inventory fetches during list rendering/note opening, legacy draft roots including the Android sample alias, Favorites filtering and pagination reset, and retrying transient topic initialization failures. The optional Standards observation that ReferenceIndex uses ActionIndex's SQLite helpers remains a scoped maintainability trade-off.

Android-specific runtime tests (including physical-device SAF, offline/restart/keyboard/performance) and standalone Syncthing synchronization tests are deferred by user decision under [validation policy](../agents/validation.md), never recorded as passed and not merge prerequisites. No Mac/Android end-to-end acceptance or two-device convergence is claimed.

Risk: medium due to cross-platform indexing and asynchronous refresh. Metadata reconciliation depends on provider modification time and size; same-size changes with unchanged provider timestamps may not be observable until metadata changes. SQLite substring search is adequate for the executed 500-note fixture but is not a full-text tokenizer benchmark. Human review of the native changes and UX is recommended; the coordinator owns merge decisions.
