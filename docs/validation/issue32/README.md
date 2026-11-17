# Confirmed-action presentation (#32)

Starting SHA / dependency merge-base: 45c6b5acb284c8fb3a3e1b16849387e645d46052. Live #32 had no comments; native and textual blocker #31 was closed and its merge independently verified on origin/main before editing.

## Adoption and content audit

The approved workspace and native light baseline remain intact. Action fields, source management, rows and feedback consume the real shared constructors; static controls use catalogue classes. No primitive variants, storage/adapters or persisted enums were added. Closest foundation examples: Focus selection rows, capture save/error feedback and catalogue fields/disclosures.

| Content | Decision | Reason |
| --- | --- | --- |
| Description/status/date/overdue/waiting | Retain | Actionable content and uncertainty |
| Generic linked initiative label | Replace with initiative title | Make hierarchy readable |
| Assignment help | Shorten | Explain disabled navigation once |
| Focus eligibility/history prerequisite | Retain in management disclosure | Explain disabled controls |
| Focus/history | Move to secondary disclosure | Keep save and description primary |
| Discard | Move to separate disclosure | Separate destructive action from save |
| Source quotes and availability warnings | Retain | Preserve evidence and source protection |
| Full version JSON and ID | Retain in details | Reachable diagnostics |
| Save/failure/recovered receipts | Retain using shared feedback | Protect unsaved work |

Return preserves selected row and restores keyboard focus; row refresh retains list scroll. Initiative return restores initiating workspace and new-action focus. Source controls have distinguishable names; removal focuses Add source. Invalid descriptions expose aria-invalid; dirty focus membership requires saving first.

## Validation

- check.txt: syntax checks; shared.txt: 45 shared tests, including revision/conflict/repair, SQLite rebuilding, isolation and bounded queries. Shared asset allowlist reads both shell sources; no Android execution.
- ui.txt: ten UI suites, Chromium with real Mac file/SQLite adapter, including filters, empty/loading, history/reopen, dirty/saving, invalid, failure/retry, recovered drafts, changed/moved/missing sources, local conflict/revision UI, workspace navigation, keyboard focus, 393px and shared catalogue contrast. New checks cover shared fields, selected-row return focus, 44px save and long Chinese overflow.
- mac-build.txt: production Mac build. Before browser screenshot is starting SHA; after/browser-393 screenshots are implementation resources. Suites regenerate older screenshots; unrelated generated diffs are restored.

## Actual Mac/WKWebView

Distinct identity dev.localnotes.validation.issue32; sample root build/native-issue32/Sync and private root build/native-issue32/Private. Generated test-only Swift adds the existing native-review file command channel for DOM observation/scripted interaction; production bridge/storage and web assets are unchanged.

Accessibility click created an action, accessibility set-value entered Chinese text, accessibility click saved (native-saved.json, AX and PNG). Reversible uchg on only its sample current JSON made atomic write fail after a durable revision. Scripted input and Back retained the exact draft/editor/private draft key (native-failed.json/png). Removing the flag and scripted Save succeeded (native-retry.json/png and native-storage.json); no flags remain. Scripted Back restored selected-row focus (native-return.json). Terminated only the dedicated process and relaunched with the same roots; reopened saved text and two history versions (native-restart.json/png). An earlier shell-background relaunch exited before observation; timed-out commands were not counted. Scripted native initiative creation, assigned-action creation and Back restored the same initiative and new-action focus (native-initiative-return.json).

Android-specific tests/builds and standalone Syncthing transport remain deferred by maintainer decision. No real notes, uploads or paid calls. Physical-device behavior, power-loss and remote receipts are not claimed. Presentation/navigation risk remains; human aesthetic judgment and coordinator release review remain appropriate. Coordinator alone owns merge and issue closure.

A final saving-state correction uses the message rather than the pending Promise assignment to identify saving. The dedicated app was restarted with byte-matched final web resources; native-final-saving.json observes the saving semantic state and native-final-saved.json observes the persisted receipt. Earlier native journeys use identical code except this state attribute correction.

Review follow-up: removed the redundant row onclick override so the shared awaited/disabled guard remains active. Return now restores the originating action if initiative detail queries fail after changing surfaces; workspace-ui injects this failure, checks visible feedback/assignment/text, then retries successfully. Action UI now explicitly observes changed and unavailable source warnings, invalid-quotation rejection with the entered quote retained, and the existing moved-source recovery. The legacy action save-state color override was removed so semantic feedback colors apply.

Final-resource native follow-up after review fixes: the dedicated app was relaunched with all shipped web files byte-matched to the final source. Native-final-failed.json/png repeats the protected-file Back failure, native-final-saving/saved/return records retry and selected-row focus, native-final-restart.json records another process restart with exact saved Chinese text and three versions, and native-final-initiative-return.json repeats assigned-action save-and-return. These supersede the earlier state correction-only follow-up for final-resource coverage. The final resource hash manifest identifies every shipped web file. Shared tests are reused for unchanged domain/storage/adapter code; all ten UI suites and Mac build were repeated after review fixes.
