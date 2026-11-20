# Issue 65 current-main integration and native keyboard follow-up

## Provenance and authorization

- Existing PR: #75; existing branch/worktree retained.
- Original Task `task_fd55e3262233`, Dispatch `ctx_48525509b769`.
- Resume Task `task_c207bee5ae88`, Dispatch `ctx_05a8ba686103`, Run `run_4c9f8d25f80d`.
- Resume starting head: `4fd03736af9f3176e39299e461e749f853dd0cf5`.
- Integrated main: `13cc92c65cf6877586cf5364211a2df570b80032` (PR #91).

The maintainer authorized current-main integration and missing native keyboard/focus acceptance. This authorization permits reevaluation; it does not waive the native acceptance boundary. Earlier issue65 evidence remains historical and does not establish native keyboard acceptance.

## Conflict integration

Merged main without rebase or force push. The Library import, pagination availability, row opener/context capture, and trailing CSS conflicts retain both intents: archive/order controls and incomplete-index paging restrictions from #65; main's `pageAvailability` keyboard handoff, list scroll restoration, reader tables/wiki links/continuation and contextual focus styling. Main's complete package script list and sibling suites remain present.

Main's direct-reader descriptor refresh and contextual Topic creation now increment the existing Library revision when the effective descriptor/membership changes. A no-op descriptor refresh preserves paging. The real SQLite regression covers both behaviors.

The first full UI attempt failed because a deliberately generated earlier failure notice blocked a later archive-row pointer target under the new ordering. The search-navigation journey explicitly dismisses that notice before the unrelated click, retaining its assertions. The raw failure remains in `ui-attempt1-notice-overlay.txt`.

## Native execution gate

`tests/native-library-keyboard.py --build-only` compiles the synthetic isolated host and existing external process-targeted sender without launching any app or posting input. The actual run refuses to launch unless `ISSUE65_GUI_GRANT` contains an explicit exclusive coordinator grant receipt. It will record exact PID/window, sender/recipient receipts, trusted target key events, AppKit window receipts, source/package hashes, duplicate-free paging, and query/control/page/selection/scroll/focus return outcomes.

DOM setup establishes fixtures, values and initial focus only; OS-generated Tab/Shift+Tab/Enter provide keyboard evidence. No physical-input claim is made. The journey performs no input-source switch or copy/paste operation and saves the original input source and full clipboard representations in a mode-0600 private build snapshot, restores them if necessary, verifies their final state, and deletes that private snapshot. Cleanup terminates/waits for its exact owned PID and records absence before release. No native activation/input has yet occurred in this resume.

Android runtime and standalone Syncthing checks remain deferred. No models or private notes are used.

## Non-GUI review and validation status

Production and test head under review: `1709273c960db42d6c3da03503bf2ea9b5aea041`; merge-base/main `13cc92c65cf6877586cf5364211a2df570b80032`. Separate pre-GUI Standards and Spec reports are included. Both report zero remaining code findings and explicitly retain the unexecuted native acceptance requirement. Standards initially found public clipboard-derived hashes; the probe now keeps those private and publishes boolean restoration receipts only.

Static checks, all 68 shared tests, Mac packaging, Android debug packaging and the separately invoked browse-focus browser suite passed. Android packaging does not establish Android runtime behavior. The first full browser retry progressed through form-focus, then exposed a Topic-drawer assertion racing the asynchronous list refresh; `ui-attempt2-topic-refresh-race.txt` preserves that failure. The test now awaits the actual refreshed options without changing its count assertion, and the full browser suite is being rerun.

Native grant is still pending; no host has been launched or activated in this resume, and no native input has been posted. Final native execution/reviews and explicit GUI release remain required before task completion.

## Granted native attempt and explicit release

Code head: `2b81148d72e393705611d183c18e6a69c35d9bb2`. Grant message: `msg_91af329554dd`. The exact lease was read under `native-gui-lease.lock`, matching granted issue65 / Task `task_c207bee5ae88` / Dispatch `ctx_05a8ba686103` / Run `run_4c9f8d25f80d`, and the lock was released before execution. No lease state was modified by this worker.

The bounded attempt **failed** before posting its first Shift+Tab. Fixture preflight identified PID 64909 / window 1291 as active, key, visible, unoccluded and frontmost; constructor receipts identified that exact window. The external sender (PID 65008) reported post/listen/AX capabilities true but rejected its combined owned-active-recipient/window guard with exit 1. Which guard term changed or differed is not established; this is not evidence of a product keyboard defect or successful OS delivery. No key was replayed and no further native activation/input was attempted.

Cleanup terminated exact PID 64909 with exit -15 and waited successfully. PID absence and zero owned windows were verified, followed by an independent exact-executable process scan returning no processes. Input source and clipboard were unchanged during the attempt; restoration verified both and deleted the private mode-0600 snapshot. Explicit GUI release was sent immediately as `msg_9753745bfa7a`, independently of PR/merge status. The coordinator owns lease transfer. See `native/report.json`, `native-execution.txt`, `gui-grant-lease.json` and `gui-release.json`.

Separate final-code Standards and Spec reports both have zero code findings; Spec explicitly retains failed mandatory acceptance. The native keyboard/paging/source-return/focus journey remains unexecuted beyond initial setup and the rejected first sender guard. No physical input, Android runtime or standalone Syncthing pass is claimed. Further activation/input requires a new exclusive grant and coordinator direction. Merging is not authorized; the coordinator also reported a global automatic-merge hold for a main capture-UI failure, which is outside #65.

## Completed non-GUI checks and remaining gate

- `npm run check`: passed again on code head `2b81148d72e393705611d183c18e6a69c35d9bb2`.
- `npm test`: 68 passed, zero failures; all production and shared-test sources are unchanged from that successful run.
- `npm run test:ui`: clean aggregate run passed all 23 maintained suites after the three preserved earlier failures described above. All final test sources were present for the successful run; the later exact-frontmost-PID change affects only the native probe.
- `node tests/browse-focus-ui.mjs`: passed separately, retaining main's pagination handoff and selected-return coverage.
- `npm run build:mac` and `npm run build:android`: passed; the Android result is packaging only. Production assets match the source/package bindings recorded in the actual native attempt.
- `python3 tests/native-library-keyboard.py --build-only`: passed without app launch/input. The later explicitly granted real native attempt compiled its final sources successfully, then failed at the first sender guard as recorded above.
- `git diff --check` over issue65 production/test changes versus main: passed. Raw inherited and new execution logs retain their original whitespace.

The source/package/probe hashes, exact native failure, environment restoration, cleanup and release receipts are preserved. Android runtime and standalone Syncthing remain deferred. Native keyboard/paging/source-return/focus is an outstanding mandatory gate, so this resume is a failed Task pending coordinator direction rather than a completed implementation acceptance. No merge, issue closure, main push or triage-label change was performed.
