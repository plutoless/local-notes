# Issue 21 implementation plan

Starting SHA: `0a57391c73fe8794ed82a71d53d9cf0aa2dc3a14`.
Issue #21 and the dependency API both identify #16; #16 is closed and the shared Chinese presentation foundation is present.

1. Replace only the synchronization panel presentation with shared dialog controls, Chinese field comparison, type-specific fields, retained advanced JSON, and explicit select/edit/local-save stages. Keep repository resolution and revision ancestry unchanged.
2. Guard unsaved edits against close, refresh, native quit, and directory switching. Preserve failures for retry; explain incomplete/cyclic histories and damaged imports in context.
3. Expand the Swift-backed browser fixture to compare/select/edit/save/reopen, missing/cyclic history, malformed resolution, storage failure/retry, focus and 393px layout. Run shared tests, UI regressions, syntax checks, Mac and Android builds (builds are not runtime checks).
4. Capture actual isolated Cocoa/WKWebView before/after interaction with synthetic files and private storage. Check source/revision retention; document content audit, executed evidence and limitations.
5. Commit implementation, independently review Standards and Spec against the starting SHA, resolve findings, push this feature branch and create a single PR against main. Coordinator alone owns merging and issue closure.

Android-specific runtime/tests and standalone Syncthing tests remain deferred. No other issue, remote receipt claim, or real user data change is authorized.
