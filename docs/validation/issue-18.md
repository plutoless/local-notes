# Issue #18 validation and content audit

## Scope and revision boundary

Starting SHA: `318a44f341895c27a32c97416bab4f92310f7381` (merged issue #16 foundation).
Initial production code: `a2436034e5f2d5ba7bb1124914d8cf3ffce9d7a4`. Current integrated production code: `8a5f6bffe0629adcb5ffef00937748f5623e5804`; see the integration follow-up below. Subsequent changes add evidence only. The [source manifest](issue18/source-manifest.json) records every web asset hash, checks byte equality with both the isolated native app and the Mac build, and checks every packaged Android web asset and `classes.dex`. The PR records the final reviewed evidence head.

Before edits, the isolated branch was clean. GitHub's native dependency endpoint and the issue body both identified #16, which was CLOSED; the shared presentation module, design-language document, content specification and existing initiative persistence/editors were present. No other issue was implemented and no other worktree's project code was changed.

## Content audit

| Existing content | Decision | Reason |
| --- | --- | --- |
| Goal and current progress | Retain first | These are the initiative's reading context, ahead of actions and supporting material. |
| Raw enum names | Retain stored values; display shared Chinese labels | Preserve persistence while consistently showing 进行中 / 以后再做 / 已结束. |
| Empty card progress | Use goal as fallback, then a short actionable prompt | Avoid an empty separator without inventing progress. |
| Identical empty/search results | Separate | An empty collection offers creation; a failed search suggests shorter or cleared keywords. |
| Generic “事项” form heading | Shorten and distinguish | 新建事项 and 事项详情 identify the current task. |
| Completed/canceled actions | Retain collapsed | Preserve history with lower emphasis than unfinished work. |
| Hidden ending choices with generic save | Move to an automatically opened disclosure | Summarize affected work, require individual choices, describe each consequence and partial commits, and name the save action 保存并结束事项. |
| Cancel ending and reopening | Make explicit | 暂不结束 restores the saved state; ended empty states explain changing status and saving to reopen. |
| Unfinished-action validation | Replace primary generic error | Explain what must be selected and how to cancel; retain diagnostic text in technical details. |
| Working notes and references mixed together | Group by role | Distinguish ongoing working material from supporting evidence without copying source bodies. |
| Paths and exact quotes | Retain as relationship fields | Needed to identify and validate a source; fingerprints/internal IDs remain outside the reading surface. |
| Link removal | Explain consequence once | Removing a relationship does not delete the source file. |
| Draft/save/recovery and source warnings | Retain | Necessary evidence and failure protection; no remote-receipt promises. Ending choices are now retained with the draft. |

No decorative slogans or AI-generated filler were added. Existing action/note forms and storage contracts remain the editing patterns.

## Executed checks

- `npm run check`: passed; [output](issue18/check.txt).
- `npm test`: 43 passed, 0 failed; [output](issue18/shared-tests.txt). Includes shared domain rules and production Mac file/SQLite contracts for recovery, source protection, workspace isolation and ending decisions. These are not live Syncthing checks.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all four suites passed on final production code; [output](issue18/browser-final.txt). Chromium runs against the actual Swift storage/index harness, not WKWebView or Android SAF.
- The expanded initiative suite passed again after adding held-adapter-call checks for visible loading and saving/inert states; [output](issue18/initiative-final.txt). This final test addition changes no application code.
- `npm run build:mac`: passed; [output](issue18/mac-final.txt).
- `npm run build:android`: compilation, packaging, signing and signature verification passed; [output](issue18/android-final.txt). Only the existing deprecated-API notice was emitted. This is a build, not Android runtime acceptance.
- `git diff --check`: passed.

Targeted initiative regressions execute creation/editing; Active/Later/Ended and reopening; cancellation before ending; missing-choice rejection; a failed action commit during ending; restart recovery of choices; retry; creating and opening linked actions/notes; unsaved progress preserved on return; reference/working-note role changes; external move/change warnings; source bytes unchanged; 50-record pagination; no-results feedback; and long Chinese input at 393px without horizontal page scrolling. Held native-adapter calls explicitly verify loading copy and disabled editing during save.

Keyboard tests verify title → goal Tab movement, visible focus, and that moving a link between roles preserves focus and the next Tab target. Shared-suite measured contrast ratios are body 12.28:1, secondary 6.28:1, primary 8.00:1, control border 3.28:1, focus 5.97:1. Labels and status words accompany controls; no state relies on color alone. This is targeted accessibility validation, not a full assistive-technology certification.

## Actual Mac interaction

Used Cocoa/WKWebView with isolated bundle ID `dev.localnotes.validation.issue18`, synthetic root `build/issue18/root`, and private state `build/issue18/private`. The installed user app and real notes were not operated on. The native binary uses unchanged production Mac sources; its web assets match the final production assets in the manifest.

Using Orca Computer Use, executed and observed:

1. Baseline creation, Chinese title/goal entry and local save; baseline detail and expanded ending controls.
2. Open the saved initiative, edit Chinese progress with keyboard input, Tab between fields, select Ended, attempt save without a disposition and observe Chinese corrective feedback; cancel ending and observe Active restored.
3. Restart the app and recover unsaved progress, then save locally and observe the updated list summary. Open the existing linked action; an incidental synthetic date edit was discarded, not committed.
4. On final production assets, restart with an unsaved Ended draft and observe recovered progress plus the explicit affected-action selector. Tab through title, goal, progress, status, history disclosure, ending disclosure and disposition selector; use arrow keys/Return to select 保留为独立行动.
5. Save and observe the initiative become 已结束, the unfinished action disappear from its detail, local-save feedback, disabled action creation and explicit reopening instructions. Read back native storage confirmed the action remains `todo` with `initiativeId: null`, rather than being silently completed.
6. Open a new initiative and observe the unsaved status and disabled relationship-creation controls with visible instructions; discard this empty synthetic draft afterward.

[Native recovered ending tree](issue18/native-final-recovery.txt), [ended tree](issue18/native-ended.txt), [local-save tree](issue18/native-saved.txt), [creation tree](issue18/native-final-create.txt), [missing-decision feedback](issue18/native-decision-error.txt), and [cancel result](issue18/native-cancel.txt) record read-back results. The validation provider sometimes omitted visible editor nodes after cross-editor transitions; restarting the isolated app restored complete trees. Screenshots and read-back values were checked rather than treating provider delivery success as application success. No VoiceOver session was run.

## Screenshots and inspection

All images contain synthetic content. Before images use the starting SHA. Final assets are used for ending/recovery/ended/creation captures and the 393px screenshot. The detail and missing-choice feedback images were captured before the final disclosure/token/focus corrections; those images document the intermediate interaction, not a claim of final pixel identity.

- Before: [create](issue18/before-create.png), [detail](issue18/before-detail.png), [expanded ending](issue18/before-ending.png).
- After: [detail, intermediate](issue18/after-detail.png), [ending and focus](issue18/after-ending.png), [missing-choice feedback, intermediate](issue18/after-ending-error.png), [recovery](issue18/after-recovery.png), [ended/disabled](issue18/after-ended.png), [new unsaved/disabled](issue18/after-create.png).
- [393px shared-web form and visible keyboard focus](issue18/web-393px.png).

Inspected the main baseline, final ending, ended, creation and 393px captures. Chinese fields and decisions remain readable; the native detail uses available editor width; vertical scrolling is intentional. The mobile capture shows long user text contained by the title input and a visible goal focus outline. No unintended horizontal page scroll was measured.

## Review and risk

Separate Standards and Spec reviews against the starting SHA initially found token reuse, role-switch focus and ended-state next-step problems; all were fixed and covered where behavioral. Re-review through production head `a2436034e5f2d5ba7bb1124914d8cf3ffce9d7a4` reports **zero remaining Standards findings** and **zero remaining behavioral Spec findings**. Evidence/documentation review is recorded with the final PR head.

Risk is moderate: initiative UI and draft-choice recovery change, and the linked-action return temporarily makes the initiative form inert while it loads. Storage schemas, revision ordering and source-note safeguards remain unchanged. Ending retains the existing per-action commit behavior: a retry cannot roll back actions already committed; the UI now explains that consequence.

Android-specific tests and standalone Syncthing checks were not run, per maintainer policy, and remain deferred rather than passed or merge gates. Browser regressions cover more paths than the manual native session; not every source failure, role combination or retry was repeated manually in WKWebView. Native reopening, complete/cancel/move dispositions and linked-note editing are covered by browser/domain tests rather than claimed as individually repeated native checks. No two-device receipt or end-to-end synchronization claim is made. Human visual review is recommended for the UI change but no unresolved product decision or mandatory human implementation remains. The coordinator owns merge approval.


## Current-main integration follow-up

Main advanced with issue #17 while this worker was validating #18. Merged main `7e85261efde0d75957351048a376b403c5d2233d` into this feature branch at `8a5f6bffe0629adcb5ffef00937748f5623e5804`. The sole textual conflict was adjacent independent CSS additions; both the action and initiative blocks were retained. Issue #17 is inherited from main, not additional implementation by this worker. The PR's incremental diff uses `7e85261…` as its current main base; the original starting-SHA review boundary remains recorded above.

Executed again on integrated production:

- [Syntax checks](issue18/integration-check.txt): passed.
- [Shared tests](issue18/integration-shared.txt): 43 passed, 0 failed.
- [All four browser suites](issue18/integration-ui.txt): passed, including the held-loading/saving tests and issue #17's updated shared editor tests.
- [Mac build](issue18/integration-mac.txt) and [Android build/signature verification](issue18/integration-android.txt): passed separately from device checks.
- Native smoke: launched the isolated app with integrated web assets, opened the saved ended initiative, used Tab/arrow keys/Return to change its state to Active, saved and read back 进行中, 已保存到本地 and enabled action creation. See [native transcript](issue18/integrated-native-reopen.txt) and [screenshot](issue18/integrated-native-reopen.png). Earlier native screenshots retain their previously stated revision boundaries; this is the additional integrated-head native execution, not a claim to have repeated every earlier step.

The refreshed source manifest verifies integrated assets against the checkout, both Mac bundles and the APK. The 393px screenshot was regenerated by the passing integrated suite. Separate Standards and Spec integration reviews report zero remaining code/behavioral findings; final evidence review is recorded with the PR head. Android-specific runtime and standalone Syncthing checks remain deferred. Native reopening is now executed as well as browser-tested; other native repetition limits above remain unchanged.
