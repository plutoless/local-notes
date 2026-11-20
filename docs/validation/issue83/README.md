# Contextual form focus validation

Base: `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3` (merged #88 / closed #81). Both live GitHub `blocked_by` and written dependencies were checked before editing. Open PR #75 is unrelated Library browsing work.

## Inventory and reproduced behavior

| Journey | Normal / invalid | Recovered / leave | Existing persistence regression owner |
| --- | --- | --- | --- |
| Quick capture | Title/body; blank submit focuses title | Explicit reopen retains private text; selection survives Continue | remaining-forms-ui, task-lifecycle-ui |
| Topic create/rename | First name field; required-name feedback | Private candidate, committed/recovery-pending retry | topic-drawer-ui |
| Initiative metadata | Title/goal/progress/status; required title | Explicit recovery; shared leave decision | initiative-drawer-ui, initiatives-ui, task-lifecycle-ui |
| Action task | Description/status/date/sources; required description | Explicit recovery, pending write, failure/retry | remaining-forms-ui, ui, task-lifecycle-ui |
| Note information | Favorite and topic/initiative associations | Individually persisted changes, retry without duplicate revision | remaining-forms-ui |
| Note location | Relative Markdown path; invalid path focuses input | Continue retains path, discard preserves source | remaining-forms-ui |
| Shared leave decision | Save / discard / continue; Tab and reverse Tab | Escape continues; selection and task identity retained | task-lifecycle-ui, native-task-lifecycle |

The baseline complete-cycle reproduction found closed disclosure descendants in the drawer's Tab list: Initiative Tab repeated the ending summary rather than reaching subsequent controls. `before/transcript.json` records expected controls and actual visits; baseline collection deliberately records this failure rather than claiming cycles passed. The delivered filter excludes closed details contents; opening details makes their controls eligible again.

## Matched browser evidence

`tests/form-focus-ui.mjs` drives actual application controls through the bridge to an isolated production Swift storage/SQLite fixture. It does not send private sources or call a model. `before/` uses a frozen copy of the base `web/`; `after/` uses the delivered assets. `source-bindings.json` binds the asset sets and screenshot/transcript hashes.

Both sets include the same 1180×800, 393×800 and 393×340 captures: pointer opening, invalid-plus-focused and recovered capture/topic/initiative/action forms, keyboard leave decisions, selected-plus-focused metadata and location. Long synthetic Chinese values retain wrapping and the existing geometry. The field uses the existing focus token as a border/inset boundary; invalid retains its danger border and message. Buttons and composite selection retain the shared keyboard-only outline. Reduced-height captures show the active field or decision; task bodies remain scrollable and the fixed footer stays reachable. Screenshots are representative states, not proof that every error is simultaneously above the fold.

Fresh browser coverage includes pointer and keyboard opening, complete forward/backward cycles, Enter/Space activation, validation focus, Escape/close/cancel, selection preservation, explicit recovered drafts, nonstacked metadata-to-location transition and meaningful opener return. Existing persistence journeys retain failed-save/retry, submitted writes and committed/recovery-pending behavior.

## Execution receipts and limitations

Initial syntax checks and all 67 unit tests passed. An initial full UI attempt stopped at an obsolete outer-outline assertion; it was updated to require the delivered token boundary. A subsequent run reached an Initiative scroll-restoration assertion; isolated replay passed that assertion and reached another obsolete field-outline assertion, which was likewise updated, and the next complete Initiative replay passed. These attempts are retained in `build/issue83-*.log`; final command receipts will be recorded separately against the final reviewed head.

The exclusive coordinator GUI lease was granted. Production native window close, app-menu Quit, OS Cmd+Q, reentrant close, Save/Discard/Continue and restart checks passed using the unchanged production bundle and isolated storage (`build/issue83-production-native/result.json`). A first owned-window OS-input form probe verified capture/Topic pointer and key delivery, then found that WKWebView pointer opening had retained the previous active control as the Topic opener; explicit clicked-opener capture now uses the existing drawer API for Topic, Initiative and Action creation. The first probe exited its owned PID 82895 with wait result -15. The first replay stopped on a process-tap omission despite exact-window AppKit and intended trusted DOM delivery; it remains a failed probe. The maintained form mode now records that recorder gap separately, requires the independent sender/window/receiver receipts, and never replays the pair. Final-head command receipts, native transcripts, hashes and process-exit evidence are retained under `build/issue83-delivery/`; their manifest identifies the exact reviewed commit. Mac build succeeded. Browser events and DOM setup are not native OS-input evidence. Physical input, Android-specific runtime/device checks and standalone Syncthing are unrun; the latter two are explicitly deferred by issue policy. Human visual judgment remains useful for the restrained cue and long-label readability.

The final browser harness also covers a submitted/inert capture Tab cycle and keyboard opening/return of note information and location. Complete final syntax/unit/UI/build receipts and the separate Standards/Spec reports are supplied to the coordinator with the PR. Historical test-generated screenshots outside issue83 are restored after checks. Final native receipts identify actual OS-injected input, DOM fixture setup and unrun physical input separately; no permission resets, clipboard changes, input-source changes, model download or private source transmission are performed.
