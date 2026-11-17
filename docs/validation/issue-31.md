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

## Final code-head results and review

Code/test head: `dffb1a9b806ac50a740a2b74aa556869ce5bfccd`; base/start: `46063f6b3e9facc5a41b19b339f3f2efcbf21007`. Syntax, 45 shared tests, all ten registered UI suites and Mac build passed after the last code changes. `issue31/ui.txt` contains the complete execution results. Contrast minima across white/canvas/sidebar/selection: body 12.64, secondary 4.72, accent 5.22, success 6.01, warning 5.54, danger 6.23, boundary 3.57, focus 4.98. No horizontal overflow at 393px; narrow capture and catalogue screenshots were visually inspected along with desktop native readback.

Independent `/code-review` Standards and Spec reviews both re-reviewed that exact full head against the starting SHA and reported no remaining material findings:

- **Standards:** initial findings were an unused pagination/icon variant, recovered/dirty text misclassification and redundant page-specific styles. Fixed by actual Focus pagination/favorite consumers, corrected state classification with recovery coverage, and removing duplicate styles. Re-review caught missing pagination failure handling; `pageFocus` now catches, reports and restores the prior offset, with a controlled failure check.
- **Spec:** initial findings were shared row classes overwritten (and wrong wrapper layout), prior library reading mode not restored, and catalogue-only variants. Fixed while preserving the primitive classes and restoring prior task mode; browser coverage exercises reading-context return. Re-review requested paging failure feedback and an actual navigation catalogue example; both are implemented. No downstream pages or storage changes found.

No minor finding was silently deferred or accepted as a substitute for required behavior. Reviewers explicitly separate code review from execution evidence. Human judgment remains the coordinator's assessment of visual quality, validation scope and merge readiness; there is no known material code blocker.

### Final native resource pass

A second distinct identity, `dev.localnotes.validation.issue31final` (`build/issue31/Design31Final.app`), was built from final code-head resources. It uses only copied sample notes and private state under `build/issue31/final/`. `native-resource-hashes.json` records SHA-256 hashes of every shipped web resource and an asserted byte-for-byte comparison to the source. The earlier preview was left untouched.

Fresh CUA interactions on this final identity created `最终原生随手记`, entered Chinese title/body, saved locally, returned to home using Save-and-return, and reopened the saved title/body from the library. Tab from the editable title reached the note-information disclosure; `native-final.json` and `native-final.png` capture the final app's state and focus. The earlier isolated native process also exercised actual quit/relaunch/readback; final resource hashes distinguish that earlier run from the final native pass. Native failure injection and a second restart of the final identity were not executed; browser failure/recovery and earlier native restart are not described as those unrun checks.

The final evidence-only commit changes no app resources or tests; exact reviewed/final checked head is pinned in the PR. Final checks are executed once more on that delivery head with logs in ignored `build/issue31/final-checks/`, and their actual outcomes belong to the PR record.

## Follow-up: native gaps closed on unchanged final resources

The native failed-save/retry and final-identity quit/relaunch gaps above have now been executed on the unchanged 75a832a application resources. See [native follow-up evidence](issue31/native-gap/README.md) for reversible sample-file failure, retained draft, failed Save-and-return guard, unchanged prior-task hash, restored fixture/retry/reading-context return, and actual final-identity restart/readback, with UI and storage facts distinguished. This follow-up changes evidence only; Android/Syncthing deferrals remain unchanged.
