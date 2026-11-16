# Issue 6 validation

## Scope and prerequisites

Starting/base SHA: `c86f083382887905f6e7d725b0e9f9ba21a146ad`. Before implementation, the current issue body and native GitHub blocked_by API both identified only #4, which was closed. Commits `2dac6cafc2f739264153fcec7d84ab487652d1ac` (#3) and `c86f083382887905f6e7d725b0e9f9ba21a146ad` (#4) were verified as ancestors of origin/main. The existing revision repositories, native private SQLite indexes, library selection/reading and manual actions/initiatives were inspected before extending them. No blocker was implemented in this branch.

This slice implements device settings, explicit selected-input analysis and saved unconfirmed candidates only. Confirmation/review decisions remain outside issue 6. Generation does not create confirmed initiatives, actions or topics and does not rewrite Markdown.

## Executed evidence

All commands below passed on code head `401796b20402a16244b72f45e789f4608c98acc1`. The subsequent validation-document commit changes documentation only.

- `npm run check`: JavaScript syntax checks passed.
- `npm test`: 26 tests passed in 48.3 seconds. Shared organization tests verify contiguous complete long-file fragments including surrogate boundaries, prompt-injection text treated as input, protected-path rejection, fabricated/missing quote rejection, explicit selection and no request at preview, failure/retry, equivalent-candidate deduplication, candidate IDs and revision persistence, recovery after SQLite removal, evidence repair after moves, cancellation while a response or dedup query is pending, and no confirmed action creation.
- The suite runs the production Mac URLSession adapter against a controlled HTTP service at `127.0.0.1`. It verifies exact selected messages and model, native Bearer authorization with no token in messages/body, credential-free settings replies, owner-only private settings permissions, no tools, invalid response, oversized response rejection during receipt, 429, refused redirect, cancellation, recovery, missing configuration, credential-containing-input rejection, actual 45-second timeout and connection failure. No external AI provider was contacted. Android networking was reviewed statically and built, not runtime-tested.
- Existing Mac file/SQLite shared tests passed, including the 500-note/2,000-action indexing fixture and manual actions/initiatives regression suite. These remain adapter/shared-code measurements, not a native app performance claim.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all four suites passed. The new organization flow covers password clearing after save, explicit selection/preview/send, exact preview text, saved suggestions after reload and opening the original evidence note. Existing editor, action, initiative, library and Current Focus interactions pass. These tests use Chromium and production Mac storage with a controlled bridge response for AI, not WKWebView networking or an Android device.
- `npm run build:mac`: Swift compilation and ad hoc app signing passed.
- `npm run build:android`: Java compilation, APK packaging and signature verification passed; the existing deprecated-API compiler note remains. This is a build result only.
- `git diff --check`: passed.

Logs are local build artifacts: `build/issue6-final-check.log`, `build/issue6-final-tests.log`, `build/issue6-final-ui.log`, `build/issue6-final-mac.log`, and `build/issue6-final-android.log`.

An earlier concurrent test/build attempt collided on the shared harness output and failed with a missing executable; no success was inferred from it. Test harness executables now include the process ID, and the final complete run passed. Review also found and corrected an asynchronous cancellation race, queued Android cancellation, Android total timeout, Mac response allocation bounds and omitted candidate source move repair.

## Standards review

Independent review compared `c86f083382887905f6e7d725b0e9f9ba21a146ad...401796b20402a16244b72f45e789f4608c98acc1` against AGENTS.md, linked policies and the code-review smell baseline. Final report: zero documented-standard breaches and zero blocking correctness findings. All three initial correctness findings were resolved: cancellation after deduplication, Android total deadline and Mac bounded response buffering. One optional observation remains: candidate validation reuses the action envelope and repository defaults, following the existing initiative pattern; extracting a generic envelope is deferred rather than expanding this issue into a redesign.

## Spec review

Independent review against issue 6 and the approved content-structure design reported zero remaining material findings after recheck. Queued Android cancellation, total deadline and candidate evidence move repair were corrected. The reviewer confirmed that scope remains generation, viewing and saving of unconfirmed candidates and that Current Focus opens the organization flow. Review did not independently rerun all validation.

## Unrun checks and risks

Android-specific runtime/network, physical-device SAF, offline/restart/keyboard checks and standalone Syncthing tests are **deferred by user decision**, never passed and not merge prerequisites under [validation policy](../agents/validation.md). Existing historical validation results are unchanged.

Real-service HTTPS/authentication/model compatibility, actual Mac WKWebView end-to-end network interaction, native window UX, and live multi-device candidate synchronization were not executed. Controlled native Mac HTTP networking and shared Chromium interactions are separate evidence, not proof of those unrun checks. No real-provider integration is claimed.

Risk is medium: service implementations differ and model output can be factually wrong despite matching quotations. Evidence checks establish provenance, not truth or current relevance. Settings are private files/preferences, not an encrypted vault. Suggestions remain unconfirmed; there are no tools or source mutations. Human review of native networking, credential handling and UX is recommended. The coordinator alone owns conditional merge decisions.

## Supplemental native validation and layout repair

This section supersedes the earlier unrun native-window statement and the earlier base for final merge review. Earlier results remain recorded above with their original scope.

Latest merged base: `6d115c0a2068d52bf1c34d6f3befba15c158a44a` (PR #14). Validated/reviewed final code: `323b842eb399f6259d1865d4c18e5abe6f3c08b7`. The branch incorporated latest origin/main by normal merge, preserving upstream revision recovery and both sets of native assets. Candidates remain a recognized record type, conflict placeholders remain `suggested`, and the existing revision review surface can resolve candidate revision conflicts without creating confirmed content.

A supplemental test of the original native app found a real defect: at the default size, the organization column clipped its lower preview, send controls and results, and wheel scrolling did not expose them. Accessibility actions could reach them, so those earlier backend/restart checks did not establish normal visual usability. The repair gives only the organization panel a bounded flex viewport with vertical scrolling, limits the nested input preview to the viewport height, and wraps candidate descriptions and explanations. Other collection/editor layouts retain their existing behavior. Native integration also exposed focus-triggered revision refresh rebuilding Organize and clearing selection; the callback now updates only saved suggestions while Organize is active, preserving the selected input and preview.

### Final executed checks

All following checks ran on code `323b842eb399f6259d1865d4c18e5abe6f3c08b7`; the next commit changes validation documentation only.

- `npm run check`: passed.
- `npm test`: all 37 shared/Mac tests passed in 47.2 seconds. This includes merged revision recovery, the existing controlled Mac URLSession checks, and a new candidate integration regression for forks, suggested conflict state, index removal/rebuild, explicit multi-parent revision resolution and recognition by other repositories. These are shared rules and Mac adapter tests, not a standalone Syncthing service test.
- All four `npm run test:ui` suites passed. The organization regression now uses actual mouse-wheel input and geometry/hit-target checks rather than relying on Playwright click auto-scrolling. It verifies visually reachable preview, send, candidate text, source buttons and pagination at 1180×800, 800×600 and 380×548 content sizes, no horizontal overflow, and selection preservation after a focus-triggered revision refresh. The regression failed against the clipped layout before the CSS fix.
- The upstream shared synchronization review UI suite (`node tests/sync-ui.mjs`) passed with the production Mac storage adapter, comparing forked revisions and saving a parented explicit resolution. No Syncthing service or Android device was used.
- Both Mac build/ad hoc signing and Android build/APK signature verification passed after the merge and final focus fix. Android still emits the existing deprecated-API note; no runtime result is inferred from the APK build.
- `git diff --check`: passed.

### Real Cocoa/WKWebView pointer and wheel checks

A copied, ad hoc signed app with test bundle ID `dev.localnotes.validation.issue6layout` used isolated `build/native-issue6-layout/Sync` and `Private` roots. Its executable and web assets came from the final rebuilt app; only its test bundle identity changed. A controlled Python loopback service returned an evidence-backed structured suggestion. All notes and credentials were synthetic, with no external provider contacted.

Normal wheel scrolling and coordinate pointer clicks—not offscreen accessibility invocation—selected `Research/selected.md`, reached Preview, expanded Exact model input, scrolled the nested preview to read the complete 164-character selected fragment, reached Start / retry and Cancel, explicitly sent the request, scrolled to the saved candidate, and opened its source in the original native editor. This passed at the default 1180×832 outer window (1180×800 content) and at a smaller supported 640×580 outer window (640×548 content). Window size changes used macOS accessibility, not altered production code. The source note and editor remained usable after navigation. Selection remained intact across focus-triggered refresh after the integration fix.

Captured requests contain the exact selected text, correct model and valid native Bearer authentication; the service checks the header in memory and logs only an authentication boolean. No unselected-note marker appears in any model request. Preview and selection did not send requests. Repeated analysis retained one stable unconfirmed candidate and created zero confirmed actions. Byte audits found no synthetic credential in synchronized files, model-message/service logs or captured app stdout/stderr. Private settings remained separate with mode `0600`. This audit does not claim to inspect every possible operating-system diagnostic.

The earlier isolated native test at `8093be9` also terminated and relaunched the actual app, verified the same saved candidate ID after restart without another request, and opened the original source. The final rebuilt app recovered the candidate produced before the main merge and displayed the same stable ID, then repeated the normal pointer/wheel flow at both sizes. Source text remains unchanged.

Local evidence is retained under `build/native-issue6-layout/`: `final-default-*` and `final-small-*` state JSON and PNGs, `requests-final.jsonl`, `final-audit.json`, and app logs. The earlier native backend/restart report is `build/native-issue6/report.md`. Final command logs use `build/issue6-layout-final-*`; build logs are `build/issue6-layout-merged-mac.log` and `build/issue6-layout-merged-android.log`.

### Final separate reviews and remaining risk

Standards review against latest main reported zero documented-standard violations and zero blocking correctness findings on `323b842`; the optional candidate/action-envelope reuse observation remains nonblocking. Spec review against latest main reported zero remaining material findings, including the scrolling repair, selected-input preservation and composition with merged revision recovery. Final documentation is checked separately; no additional source behavior is introduced by the evidence update.

The concrete clipping and selection-reset findings are resolved and their native visual acceptance checks passed. Human review is now optional additional assurance, not a concrete unresolved acceptance failure or a new merge gate. Provider variability and model factual accuracy remain medium general risks; quotation checks establish provenance, not truth/current relevance. No real-provider integration is claimed or required to establish the controlled-service result.

Android-specific runtime/network/SAF/offline/restart/keyboard checks and standalone Syncthing tests remain **deferred by user decision**, never passed and not merge prerequisites. No such tests were run or requested. External real-provider HTTPS/authentication compatibility and live multi-device candidate synchronization remain unrun. The coordinator alone owns the merge decision.
