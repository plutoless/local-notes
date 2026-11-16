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
