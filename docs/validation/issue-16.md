# Issue #16 validation

## Scope and revision boundary

Starting base: `780450f3ab81ebf9a9aa0bbd7763be8c2f52c158`.
Final production code: `58ba514232a516341186a6599445c67726ada5c3`; subsequent evidence commits do not alter production files. The [source manifest](issue16/source-manifest.json) records exact web/Mac hashes and verifies that the isolated native bundle served byte-identical web assets. The final PR head and separate review results are recorded in the PR.

Before writing, issue #16 was OPEN, native `blocked_by` returned `[]`, textual blockers said none, the design reference and existing foundations were present, and this isolated feature branch was clean. No other worktree project code was changed.

## Executed checks

- `npm run check`: passed, including the new presentation module.
- `npm test`: 43 passed, 0 failed. These are shared rules and production Mac storage/index/controlled-network checks, including recovery, isolation, reference protection and revision graph contracts. They are not live Syncthing tests. See [test output](issue16/shared-tests.txt).
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all four suites passed. See [output](issue16/browser-tests.txt). The suites exercise Chromium with the actual Swift storage/SQLite harness, not WKWebView or Android SAF.
- After the final home-only layout adjustment, the expanded [focus suite](issue16/focus-final.txt) and [shared sync-dialog suite](issue16/sync-ui-final.txt) passed again. Home tests include seven/expand, reorder/remove, open/create action and initiative, waiting/no invented overdue, draft recovery, zero home note-body reads, an explicit source read, wrong-quote guidance/details/draft retention/retry, delayed loading and saving, and 393px Chinese forms/navigation without page overflow.
- `npm run build:mac`: passed separately from runtime checks. See [build output](issue16/mac-build.txt). Android compilation/packaging subsequently passed; see the follow-up below.
- `git diff --check`: passed.

Measured contrast ratios from rendered CSS tokens: body/canvas 12.28:1; secondary/surface 6.28:1; primary/white 8.00:1; control border/surface 3.28:1; focus/surface 5.97:1. Browser interaction verified visible focus, Chinese accessible labels, 44px navigation targets, long Chinese text, readable disabled controls and external explanatory text. These are targeted checks, not a full independent accessibility certification.

## Actual native Mac checks

Ran a freshly built Cocoa/WKWebView app with bundle ID `dev.localnotes.validation.issue16`, an explicitly isolated synthetic synchronization directory and private storage under this worktree's ignored `build/issue16`. The normal installed app and real note directory were not operated on. The bundle ID change and ad-hoc signing isolate validation identity; the app binary and web code are production builds.

Used Orca Computer Use to perform and observe:

1. Baseline empty home and action form before changes.
2. Create a Chinese action, observe unsaved status, save locally, add to focus, return home, and reopen it after a new native process.
3. Seed additional synthetic records, observe seven focus entries, expand to the remaining entries, move an entry up and remove it; read back changed native UI order.
4. Open an active initiative and read its saved goal/progress. Waiting work displays the explicit waiting condition, without inventing a date.
5. Edit the action using native keyboard input, observe Chinese draft status, Tab to another control, save and read back Chinese local-save status. Open a blank action and observe disabled focus/history controls with their explanations; discard that synthetic draft afterward.
6. Inject a malformed synthetic record, observe Chinese failure feedback, expand raw technical details, dismiss the notice, and remove the test fault. No original/user file was changed.
7. Open synchronization review, verify its native accessibility tree exposes Chinese dialog text and controls, and press Escape; focus returns to the synchronization launcher. This found and fixed WKWebView accessibility exclusion when the modal lived inside the app grid.
8. Open the native directory picker, verify the Chinese title, scope/privacy prompt and primary button, then cancel without selecting another directory. OS-owned picker chrome, including Cancel and system location names, follows the English host locale; application-owned prompts are Chinese.

Native interaction covers these representative paths; it does not claim that every browser regression was repeated manually in WKWebView. The browser suite independently verifies source external-edit conflict/copy protection and workspace switching. The native path-renaming prompt was subsequently exercised as documented below.

## Screenshots

All native screenshots show synthetic fixture content. Baseline images are from the starting SHA; home/error captures use the final production layout; action/initiative/dialog captures use the same final screen implementation (the last production adjustment only repositions home sections).

- [Before: empty home](issue16/before-empty.png), [before: action form](issue16/before-action.png).
- [After: home](issue16/after-home.png), [after: action](issue16/after-action.png), [after: initiative](issue16/after-initiative.png).
- [After: disabled/unsaved](issue16/after-disabled-unsaved.png), [after: native error/details](issue16/after-error.png), [after: sync dialog](issue16/after-sync.png).
- [393px shared-web home](issue16/web-393px.png).

## Reviews, limitations and risk

Separate Standards and Spec reviews found issues in the first implementation; all were resolved with regressions. Final code re-review against the starting base reports zero remaining findings per axis. Final evidence-commit review is recorded in the PR.

Android compilation and packaging passed separately from runtime checks. Android-specific device/runtime tests and standalone Syncthing synchronization checks were not run, per maintainer policy; they are deferred, not passed, and are not merge gates. No two-device receipt or production AI-service end-to-end claim is made. No VoiceOver session was run. A human visual review is recommended for the design-language change; it is not a prerequisite imposed by this worker.

Risk is moderate: shared CSS and copy affect several existing screen entry points, while persistence/domain formats remain unchanged. Browser regressions and native interaction cover the main paths, but cannot establish every host/OS/font/accessibility combination.


## Coordinator-requested follow-up: native path prompt and Android packaging

The prior reviewed PR head was `312ad5dcbd940920fcc40b7c16e7e0345a2ee251`, against base `780450f3ab81ebf9a9aa0bbd7763be8c2f52c158`. Follow-up production code is `58ba514232a516341186a6599445c67726ada5c3`; this adds path-specific Chinese recovery guidance and a browser regression. Final evidence-head Standards/Spec confirmations and exact SHAs are returned to the coordinator and recorded in the PR. No native prompt implementation change was retained.

### Native rename prompt acceptance

On the same isolated Cocoa/WKWebView app and synthetic `reference.md`:

- Opened 移动 / 改名 and observed the Chinese relative-Markdown-path instruction, prefilled `reference.md`, and native 取消 / 确定 buttons. See [prompt screenshot](issue16/native-rename-prompt.png) and [targeted native accessibility output](issue16/native-rename-accessibility.txt).
- Clicked 取消, then confirmed `reference.md` remained the open path and its bytes were unchanged.
- Reopened the prompt and clicked 确定 with the unchanged path. The prompt closed without a rename or file-content change.
- Submitted `../outside.md`. The app rejected it without creating the outside target or changing the note. Primary feedback now states 路径无效。请填写笔记目录内、以 .md 结尾的相对路径，再重试。; expanding 查看技术详情 exposes 请使用有效的相对 Markdown 路径. See [Chinese primary feedback](issue16/native-rename-invalid-feedback.png), [expanded details](issue16/native-rename-invalid-details.png), and [native state transcript](issue16/native-rename-feedback.txt).
- The reference SHA-256 before and after all three cases was `f5c8ae84b032ed6a2f2b5c8de16f3c927f3231553f0c4583f7de29bea6accaef`; the synthetic target outside the root did not exist afterward. This checks cancel/no-change and rejection, not a successful filesystem rename.

Orca's recursive native accessibility snapshot timed out while WebKit was paused for the synchronous JavaScript prompt. Targeted System Events accessibility reads/actions on the native alert succeeded; the app resumed normally after each button response. OS window capture supplied the prompt screenshot. An experimental sheet presentation did not fix that inspection limitation and was fully reverted; no app freeze or production modal-loop defect is claimed.

`node tests/ui.mjs` with local Chrome passed after adding the invalid-path feedback/no-mutation regression; see [output](issue16/rename-browser.txt). `npm run check` and `git diff --check` passed. The [repeat Mac build](issue16/mac-build-followup.txt) passed independently of native runtime acceptance.

### Android build and asset packaging

`npm run build:android` passed on the follow-up production assets. It executed aapt2 linking/asset packaging, Java compilation, D8 dex compilation, zip alignment, development signing and signature verification; see [build output](issue16/android-build.txt). Only the existing Java deprecated-API notice was emitted. Explicit `apksigner verify --verbose` passed using v2/v3 signatures; see [signature evidence](issue16/android-signature.txt).

Every `assets/web/*` entry in the APK was compared byte-for-byte with `web/*`, including `presentation.js`, and `classes.dex` was present. APK SHA-256 is recorded in the source manifest. This is compilation/packaging evidence only: no Android installation, emulator, physical device, SAF, offline, restart or keyboard test was executed. Standalone Syncthing remains unexecuted. The validation policy defers those tests; it is not treated as an Android compilation waiver.

### Visual inspection

Inspected both baseline native screenshots and every committed native after-state screenshot, plus the 393px shared-web image. The after home uses both workspace columns with waiting/initiative summaries adjacent; Chinese labels and controls remain readable. Form screenshots show intentional vertical scrolling to the save/disabled state, not horizontal clipping. The 393px image wraps navigation/utilities, keeps controls within the viewport, and continues the card list vertically. English “Focus item” strings are synthetic user records, not untranslated application labels. No visual defect requiring a change was identified in these captures. Human visual review remains optional and is not an acceptance gate.
