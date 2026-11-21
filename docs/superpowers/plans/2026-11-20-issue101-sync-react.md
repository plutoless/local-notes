# Synchronization React implementation plan

Execute inline in the assigned isolated worktree, as authorized by the dispatch.

Goal: migrate only synchronization comparison/resolution and the reader file-conflict controls.
Architecture: existing repositories own recovery, immutable revisions and serialization; SyncScreen owns task decisions and async identity; React owns all panel descendants. Retain the shared bindDialog owner, native bridge, tokens and stable legacy entry points.
Tech stack: pinned React/TypeScript/Tailwind 4; existing JavaScript domain services.

Constraints: English project prose, Chinese application labels; macOS 13.3/WebKit 16.4 and Android API26/WebView111 targets unchanged. No schema, native transport, global lifecycle, sibling or private processing changes.

- Verify closed native/written blockers and fetched main before edits. Starting/base SHA: 8ae4622f4a23033ec149038d9a370c9985a138e8. Fetch retry succeeded after an SSL connection failure; #93 and #86 are closed; #103/#106/#109/#110 are on main; no open overlapping PRs at the check.
- Replace imperative synchronization descendants with a typed production view, maintaining selection, exact full evidence, warnings, invalid raw JSON, retry/committed state and focus return. Keep persistence in the existing controller.
- Migrate file-conflict controls through callbacks while preserving existing note save/copy/reload guards.
- Extend the actual production catalogue and ownership inventory.
- Capture same-state baseline and migrated browser evidence using the maintained real Swift-storage synchronization journey; add only missing reload/readback or caret/return assertions.
- Run typecheck/build, affected domain and storage checks, focused sync/focus/reader/lifecycle journeys and Mac packaging. Run the full unit suite once. Record failures, source bindings, I/O limits, browser vs native boundaries, release-deferred native input and Android/Syncthing deferrals.
- Obtain independent Standards and Spec final-head review, correct material findings, commit/push isolated branch and prepare one PR only if acceptance is complete.
