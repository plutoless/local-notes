# Design system validation (#31)

## Baseline and scope

Starting SHA and freshly fetched `origin/main`: `46063f6b3e9facc5a41b19b339f3f2efcbf21007`. Live #31 has no comments and native/textual blocked_by #30 only; #30 is CLOSED and that merged PR27 commit is the checkout baseline. Only this isolated Orca checkout is edited. The coordinator owns merging and closure. No Android or standalone Syncthing checks are run or requested.

## Changes

The authoritative reference and live rendered catalogue are at `docs/design/`. Shared CSS tokens and DOM primitives are used by the real shell, Focus, capture and existing feedback/dialog consumers. Capture retains existing expected-base writes/autosave/draft protection and adds explicit save/retry and save-and-return to the interrupted task. Focus remains bounded, with seven initial actions, expand/pages and management disclosures. No repository/storage implementation or persisted format changes.

## Execution evidence

Evidence lives in `issue31/`. Exact final tested/reviewed commit IDs belong in the PR delivery record, avoiding a self-referential hash in this commit.

- `npm run check`: passed.
- `npm test`: 45 passed, including production Swift/SQLite, immutable revisions, interrupted writes, workspace isolation, source protection and recoverable commits.
- `npm run build:mac`: passed.
- The full shared UI command and new capture/catalogue suites are run again after final code changes; final results and independent review reports are recorded below before delivery.

The first full UI attempt timed out while waiting for a newly saved linked note's heading. An instrumented rerun showed the correct indexed title/body and passed; the final full command is used to distinguish a transient timing issue from a persistent failure. The new capture test initially encountered the deliberately displayed failure notice blocking a narrow click; it now dismisses that notice. Its recovered-draft assertion also initially read the empty editor before asynchronous load completed; it now waits for actual recovered text. No product assertion was removed. The catalogue contrast check detected that the prior boundary token was below 3:1 on selected blue; the shared boundary was darkened, keeping decorative dividers unchanged.

### Actual native observation

A distinct app `build/issue31/Design31.app`, bundle ID `dev.localnotes.validation.issue31`, runs with `LOCAL_NOTES_TEST_ROOT` and `LOCAL_NOTES_TEST_PRIVATE` pointed only at `build/issue31/native/notes` and `private`. No existing app was stopped. Empty sample storage was used (an attempted top-level sample-file copy found no files and did not touch user data).

Orca AX could observe the window and activate capture; its body set-value attempt changed the title instead of the intended body, so it is not counted as a body entry success. CUA then focused the actual body and pasted Simplified Chinese sample text. Fresh accessibility and screenshots confirmed the body, local-save receipt, back navigation, reopened text and keyboard focus on the selected library row. The isolated preview alone was quit with its own Quit shortcut, relaunched with the same private roots, and the saved title/body were read back in WKWebView. `native-readback.json` and screenshots retain that observation. Browser failure injection and 393px coverage are distinct from this desktop native observation; native storage failures were not injected.

### State coverage and limits

The production-adapter browser suite covers normal/empty/loading/disabled Focus, seven/expand/reorder/removal, draft/save/retry/recovery, quick capture typing/save/reopen/return to an action, long Chinese content, 393px no page overflow, 44px capture controls, keyboard focus and reachable directory selection. Existing suites cover invalid actions, source edits, organization sending/review decisions, and local conflict/revision comparison/retry/history/workspace guards. The catalogue checks implemented state rendering, contrast ratios on light surfaces including selection, panel focus restoration and reduced motion.

`home-before.png` is newly rendered from starting-SHA assets with the same fixture, not reused historical evidence. After captures use current assets. Historical screenshots emitted by existing suites are restored to avoid rewriting earlier evidence. Screenshot layout is visually inspected, not merely generated.

Android-specific tests/builds and standalone Syncthing transport remain deferred by explicit maintainer decision and do not block merge. No real uploads, paid AI calls, physical-device checks or remote receipt claims are made.
