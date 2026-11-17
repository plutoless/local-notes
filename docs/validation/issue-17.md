# Issue #17 validation and content audit

## Scope and provenance

Starting/review base: `318a44f341895c27a32c97416bab4f92310f7381` (merged #16 foundation). Product head: `333baeec40c77f88004a6ca54c7bafd023e025bf`. Subsequent evidence commits change documentation/screenshots only. The live issue body and native GitHub dependency API both identified only #16, verified closed before editing. The supplied content-structure design and shared Chinese design language were read; no persistence or native adapter contracts changed.

## Content audit

| Previous content | Decision and reason |
| --- | --- |
| Description, state and Save | Retain as primary controls; these define the next action. |
| Always expanded initiative, due date and waiting condition | Group in optional details, automatically expanded when populated. Preserve values and direct initiative navigation, with visible disabled-state guidance. |
| Editable raw source path first | Lead with filename, full relative path and quoted evidence; place editing controls in details. Preserve available/changed/moved/unavailable status and source opening. |
| Raw modification timestamp and revision UUID in history paragraph | Localize date/time and state, name changed fields; retain complete immutable version JSON in optional details. IDs/parents remain intact and inspectable. |
| Generic empty collection text after filtering | Separate initial empty, filtered no-results, and exhausted page messages, each with a relevant next step. |
| Missing date metadata | Explicitly show no date; never equate it with overdue. |
| Save, discard, focus and history at similar prominence | Keep Save primary, discard secondary, and focus/history in a separate utility group with eligibility explanations. Discard retains its explicit pre-existing semantics: discard draft, never delete saved action. |
| English validation and source-repair feedback | Use Chinese application messages; retain raw adapter diagnostics only in shared expandable technical details. No translated stored enums or user content. |
| Repeated implementation explanations | Do not add them. Preserve concise local-save status, recovery feedback and source/conflict evidence. |

## Executed checks

- `npm run check`: passed on final product code.
- `npm test`: 43/43 passed. Production Mac Swift file/SQLite adapter and shared domain tests cover persistence, revision parents, recovery, focus, isolation, source protections and revision-graph contracts. These are synthetic local contract tests, not standalone Syncthing execution.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all four suites passed on final product code (action, initiative, focus, organization). See [shared-ui.txt](issue-17/shared-ui.txt).
- Action UI execution covered create/edit/restart, completed and canceled reopening, state filters, empty/no-results, selected state, focus add/remove, source-control retention across focus/navigation, direct initiative opening, history/full versions, source-checkbox independence, failed-save retention, blocked navigation after save failure, recovered draft, and successful save before leaving an unsaved form.
- Externally renamed source execution detected the moved reference through fingerprints, updated the path, opened the relocated note, and repaired it again after moving back. A stale selected-row revision found during this execution was fixed before the successful final run.
- Loading is asserted while a query is deliberately held; stale results cannot populate a switched workspace. Disabled focus/history controls are exercised for new actions. Source validation errors preserve edits and show Chinese feedback.
- 393px shared-web viewport: no document horizontal overflow, editor visible, description-to-state Tab order asserted, state focus outline asserted solid. Long Chinese content and control contrast are also checked by the focus suite. Measured ratios: body 12.28, secondary 6.28, primary 8.00, border 3.28, focus 5.97. [393px screenshot](issue-17/shared-web-393.png); [failed-save screenshot](issue-17/shared-web-failed-save.png).
- `npm run build:mac`: passed after final product change; signed development app. [Build log](issue-17/mac-build.txt).
- `npm run build:android`: passed after final product change; development APK signature verified. Existing deprecated API warning remains. This is a build, not Android runtime validation. [Build log](issue-17/android-build.txt).

## Actual Mac native interaction

Used the real WKWebView app built in this worktree, with isolated bundle identity `dev.localnotes.validation.issue17` and synthetic roots under `build/issue17-root` and `build/issue17-private`. No existing user notes or other worktree code was modified. Native actions used Orca computer accessibility and background input; outcomes below were read back from the native accessibility tree and screenshots, not inferred from command exit codes.

- Baseline at starting SHA: opened action list and new editor; captured [before list](issue-17/before-list.png) and [before editor](issue-17/before-editor.png).
- Created a Chinese action, saved it, restarted the app, reopened the persisted record, edited and saved it. [After editor](issue-17/after-editor.png), [after save](issue-17/after-saved.png), and corresponding `native-final-*.txt` tree captures are in the evidence folder.
- Pressed Tab from description; native tree reported focus on the state popup. [Keyboard focus](issue-17/after-keyboard.png), [tree](issue-17/native-final-tab.txt).
- Opened history and scrolled the actual native editor; localized state/date, description, change label and full-version disclosure were visible. [History](issue-17/after-history.png).
- Opened a new unsaved action and discarded the draft; editor disappeared and saved action remained. [Unsaved state](issue-17/after-unsaved.png), [discard result](issue-17/native-discarded.txt). Restart recovery was also observed: [recovered draft](issue-17/after-recovered.png).
- Rebuilt final product code `333baee`, reopened the persisted action, edited Chinese text, temporarily made only the synthetic revisions directory read-only, and clicked Save. Native Chinese failure feedback appeared and the edited description remained. Restored write permission and clicked Save: both native list and editor showed the new text and local-save success. [Native failure](issue-17/after-native-failed.png), [successful retry](issue-17/after-native-retry.png), and `native-verified-*.txt` contain execution evidence.

## Separate code review reports

Both axes reviewed the diff from the starting SHA through final product head, with a final incremental check of `289305c..333baee`.

### Standards

Zero open documented-standard violations. Resolved disabled-control guidance and unsupported native confirmation dependency. One nonblocking heuristic remains: the small selected-row class/`aria-current` update occurs in list rendering and form selection; retaining this duplication avoids a broader presentation refactor. Reviews were static; execution evidence is recorded separately above.

### Spec

Zero remaining findings. Fixed missing fingerprint-backed moved-source discovery, source controls disappearing after focus/navigation form reconstruction, and a stale same-entity revision after saving a repaired source during navigation. No unrelated scope or persistence changes identified. Review did not independently rerun tests.

## Limitations and risk

Android-specific tests/device interaction and standalone Syncthing/two-device checks were not run, as deferred by maintainer policy; neither is a merge gate. Native Mac execution covers creation/edit/save/restart/history/keyboard/discard and a real adapter failure/retry; exhaustive combinations of every filter/source state in WKWebView were not repeated beyond shared-web coverage. A VoiceOver session was not run; accessibility names, native tree exposure, keyboard focus, contrast and narrow layout were checked as described. Transient saving/disabled states are implemented and exercised during saves, but no claim is made of a captured transient native saving frame.

Risk is localized to asynchronous presentation refresh and source repair; regression coverage includes stale queries, source relocation and retained source controls. No new storage format, dependency, permissions or migration. Human product review of Chinese wording/layout is useful, but there is no identified requirement needing a human decision before merge; the coordinator owns conditional merging.
