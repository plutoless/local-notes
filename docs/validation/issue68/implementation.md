# Issue 68 implementation and validation

Starting SHA and main merge-base: `7f317f0b9e404d7cd0e2b1a2cdc165edfd6ea02a`.
Live preflight: issue 68 has no comments; native and textual blocker 67 is closed and PR 77 is merged at the starting SHA. Parent 63 was read, including the application/native acceptance boundary. PR 74 (issue 60) is merged; PR 75 (issue 65) remains open.

## Design and plan

Use the approved lightweight home and existing row/button primitives. Append at most three private recent-reading entries after priorities, waiting Actions and active Initiatives; hide the section when empty. Store exact workspace/path, title, content fingerprint, and bounded scroll offsets in device-local WebView storage, independently of disposable indexes. Do not store body snippets, selections or formal records.

Reuse issue 67's exact source paths, native metadata exclusions, guarded reads, fingerprint comparison and wiki return chain. Known application moves migrate the recorded path only after the native move succeeds; external moves remain unavailable rather than guessing a same-named replacement. Changed sources open from the start with a notice. Resumption owns a new Home return route and leaves issue 60's existing search routes intact. Recovered drafts retain the existing editing and leave lifecycle.

Implementation sequence: add the private bounded store and unit tests; integrate reader capture, guarded Home resumption and known moves; add real-storage browser journeys; run shared tests and both packaging builds; obtain exclusive GUI lease and run isolated native quit/restart, focus/scroll, recovery, workspace and index-removal journeys; independently review Standards and Spec against the recorded base; resolve findings, repeat affected validation, and open one PR for coordinator review.

Native GUI access is reserved by issue 70 until the coordinator grants a lease. Android runtime/device and standalone Syncthing tests are deferred by parent 63 and repository validation policy. No acceptance claim is made before execution.

## Original review resolutions

Independent Standards reviewer `/root/standards_review` found two P2 issues at `eae3a19199a766ece0aba997db71023c2d79bb8a`: full paths on Home and focus loss after removal. Full paths now live in the existing management disclosure; the row retains a shortened folder context. Removal now restores focus to a surviving continuation or Home's primary action, fenced by workspace/view.

Independent Spec reviewer `/root/spec_review` found two validation gaps at that head: counters lacked assertions and the second workspace was empty only. The native probe now asserts Home zero-body and resume one-body counts, and reads/scrolls/restarts both populated isolated roots. Original reports are preserved separately without rewriting their findings.

Initial native attempts did not establish acceptance: one hit the short test wait and the next waited for a source outside the first alphabetical Library page. The fixture now uses the actual Library search UI rather than assuming issue 65 ordering exists. Owned processes exited and the original WeType input source remained selected after the failed attempts.

A longer browser check reproduced continuation focus loss after Home's scheduled background refresh; Focus now preserves its focused continuation across that refresh. Native restart did exercise persisted cold/warm position recovery, then exposed that a fresh Home session had not opened Library's source-context repository; resumption now opens only that repository (no body indexing) before loading source details. The native run is repeated against the corrected committed production assets.

## Latest-main integration

Merged delivered issue 70 from `7d304ee235b4490697fa4c7e32dae144f7f6f96a`; the only merge conflict was the UI command list, resolved by retaining both suites. A fresh independent integrated Spec review found that direct continuation after reference-index removal lacked the current source descriptor, which hid delivered topic controls. A real UI/storage regression failed waiting for `新建并关联主题`; resumption now indexes only its already-read source descriptor and topic tags, without a second body read or whole-Library reconciliation.

An integrated native repeat measured one already-running Library indexing read overlapping Home immediately after an application move. That overlap is now separately recorded rather than described as a zero-read Home result. Cold and ordinary warm Home still assert zero source reads; each direct resume asserts one. An existing topic-drawer test also observed a closed drawer before its topic options refreshed (3 versus 4); isolated retry passed, and the test now waits for the actual refreshed options before asserting the unchanged expected count. No classification behavior was redesigned.
