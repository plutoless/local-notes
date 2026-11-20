# Latest-main integration verification

## Merge and scope

PR #78 remains the single issue #70 PR. Integration started from `8e7b835e9ecef1859bfd79c2b4d422f9b0796eb9` and merged `origin/main` at `7f317f0b9e404d7cd0e2b1a2cdc165edfd6ea02a` (delivered #67 / PR #77). The reviewed latest-main merge-base is that same SHA. Merge commit: `8221e07dc8d0d39bb9642552a9cb0df494e073f2`.

The only textual conflict was the `test:ui` script. Resolution retains both classification and wiki-navigation suites. The automatic `web/app.js` merge was inspected semantically: wiki-history commit/reset callbacks, selection/position restoration and nested Back remain beside classification pending ownership, receipts, identity-based focus, recovery and latest Initiative owner refresh. No new product implementation or issue #65 ordering work was added. Source bodies and synchronized record ownership remain unchanged.

Code/test head: `506de27ce84c7f489f87a1aefa297324bd0b8c85`. Subsequent evidence commits are limited to validation documents/artifacts and preserve executable/test bytes. Original pre-integration reports remain at the parent directory; original integration reviews and final code reviews are separate adjacent files with independent reviewer provenance and exact head/base SHAs.

## Executed checks

- `npm run check`: passed.
- `npm test`: 65 passed, 0 failed.
- `npm run test:ui`: passed all 19 storage-backed UI scripts with installed Chrome, retaining both classification and wiki suites.
- `npm run build:mac`: passed; current production-package assets equal executed native assets.
- `npm run build:android`: passed packaging only, with the existing deprecated-API compiler note.
- Expanded `tests/classification-ui.mjs`: real Swift bridge/repositories/Markdown/index flow, unassigned capture → classification → nested wiki hops → Back → original associations. Existing held-write replacement, duplicate/failure/recovery, unlink/Initiative Back, source-content preservation and independent-workspace checks still pass.
- `tests/native-classification.py`: passed on committed code/test head above. Actual Cocoa/WKWebView UI capture, reading and classification use the real bridge/storage/index; Topic plus two Initiative owners and immutable revisions are read back and source hash remains unchanged. Trusted OS Tab/Shift+Tab/Escape, association/opener focus, reading scroll, wide/393px/reduced-height layouts and clean native exit code 0 pass.
- Delivered `tests/native-wiki-links.py`: passed nested keyboard/focus/selection/nonzero-scroll/Back/Library-return journeys at desktop and 393px with unchanged synthetic source hashes. Executed head `9d1441806d80db8d0980459fd9039f45f28a674e`; its production assets and wiki probe are identical at the final code/test head. The later code/test-head delta only improves the classification probe’s preflight and clean-exit assertion. `wiki/native-report.json` retains the actual execution head and records its binding to final code bytes.

Command output is retained in adjacent text files. `classification/preflight.json` records head, installed input source, probe hash and native-source/package-asset hashes before the final probe. Both `classification/native-report.json` and `wiki/native-report.json` bind executed assets to committed final-code blobs and the rebuilt production bundle. `classification/record-readback.json` retains synthetic owners, revision hashes and source hashes. Native decision accessibility trees, trusted composition events, screenshots and before/after dirty-name receipts establish poststates rather than relying on command exit codes.

## Native termination and IME applicability

A contextual Topic form is an active task opened from the reader; replacing metadata and native termination must preserve its dirty state. Consequently, dirty termination is applicable to this integration even though the merge does not edit the native handshake. The refreshed probe exercises actual window close, application-menu Quit and OS Cmd+Q. Each produces the existing three-way decision; choosing Continue editing leaves the same Topic form open, the Chinese name intact, the task dirty and the app running. Subsequent deliberate save persists exactly one Topic and its note association. Finally, clean window close exits the owned native process with code 0. No claim is made that a successful automation command alone proves an exit or a retained draft.

The contextual name field accepts Chinese input, so installed-WeType composition/commit is applicable. OS key input produces a trusted `compositionend` and a Chinese value; no particular candidate is assumed. This verifies actual Topic text entry rather than DOM-presence-only or DOM-injected Chinese. The initial installed input source is recorded and restored/read back in `finally` after every attempt.

Limits remain explicit: native Save/Discard *through termination*, IME composition cancellation/candidate-navigation behavior, physical keyboard/pointer and VoiceOver were not executed in this integration. The merge changes neither the native leave-token handshake/save/discard algorithm nor any IME handler; shared task-lifecycle suites separately execute save/discard/keep-editing/failure/recovery. These unrun variants are not treated as passed or as waived; coverage here is the applicable contextual Topic entry and dirty Continue behavior described above. Existing #60 search-return and #67 wiki contracts remain covered by the full UI command and the fresh native wiki regression.

## Initial failures and cleanup

Initial native attempts failed in the test harness: Quit needed the actual application menu opened first, and AppKit `terminateLater` suspends the probe’s default-mode timer. The successful test reads the actual decision through accessibility and chooses Continue there, then verifies DOM/native poststate once the timer resumes. Dirty name was preserved; no product workaround was added. These attempts are retained in `initial-native-attempts.json` and are not counted as passes. A process-inventory assertion initially matched its own shell command; the corrected executable-name inventory confirms no owned host remains.

Every owned host was exited or terminated and waited, including failures. The original `com.tencent.inputmethod.wetype.pinyin` source was restored and verified. Both native probes and all GUI/key/mouse/clipboard activity finished before explicit lease release `msg_c24ccf7957a3`; `cleanup.json` records the result. No input sources were installed/removed, preferences changed, permissions reset, or Orca restarted. Fixtures and screenshots contain only synthetic content.

Android-specific runtime/device/SAF and standalone Syncthing tests remain deferred under repository policy, never passed. Physical-device and two-device synchronization were not run. No new human decision or unresolved implementation/review finding remains; ordinary PR review and conditional merge belong to the coordinator. No merge to main, issue closure, label or scheduler changes were performed by this worker.
