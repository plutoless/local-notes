# Issue 68 implementation and validation

Starting SHA and main merge-base: `7f317f0b9e404d7cd0e2b1a2cdc165edfd6ea02a`.
Live preflight: issue 68 has no comments; native and textual blocker 67 is closed and PR 77 is merged at the starting SHA. Parent 63 was read, including the application/native acceptance boundary. PR 74 (issue 60) is merged; PR 75 (issue 65) remains open.

## Design and plan

Use the approved lightweight home and existing row/button primitives. Append at most three private recent-reading entries after priorities, waiting Actions and active Initiatives; hide the section when empty. Store exact workspace/path, title, content fingerprint, and bounded scroll offsets in device-local WebView storage, independently of disposable indexes. Do not store body snippets, selections or formal records.

Reuse issue 67's exact source paths, native metadata exclusions, guarded reads, fingerprint comparison and wiki return chain. Known application moves migrate the recorded path only after the native move succeeds; external moves remain unavailable rather than guessing a same-named replacement. Changed sources open from the start with a notice. Resumption owns a new Home return route and leaves issue 60's existing search routes intact. Recovered drafts retain the existing editing and leave lifecycle.

Implementation sequence: add the private bounded store and unit tests; integrate reader capture, guarded Home resumption and known moves; add real-storage browser journeys; run shared tests and both packaging builds; obtain exclusive GUI lease and run isolated native quit/restart, focus/scroll, recovery, workspace and index-removal journeys; independently review Standards and Spec against the recorded base; resolve findings, repeat affected validation, and open one PR for coordinator review.

Native GUI access is reserved by issue 70 until the coordinator grants a lease. Android runtime/device and standalone Syncthing tests are deferred by parent 63 and repository validation policy. No acceptance claim is made before execution.
