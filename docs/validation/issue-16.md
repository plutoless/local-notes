# Issue #16 validation

## Scope and revision boundary

Starting base: `780450f3ab81ebf9a9aa0bbd7763be8c2f52c158`.
Final production code: `47c7d34249e0b6a5ccc1f4b974e9f70252e4d751`; subsequent evidence commits do not alter production files. The [source manifest](issue16/source-manifest.json) records exact web/Mac hashes and verifies that the isolated native bundle served byte-identical web assets. The final PR head and separate review results are recorded in the PR.

Before writing, issue #16 was OPEN, native `blocked_by` returned `[]`, textual blockers said none, the design reference and existing foundations were present, and this isolated feature branch was clean. No other worktree project code was changed.

## Executed checks

- `npm run check`: passed, including the new presentation module.
- `npm test`: 43 passed, 0 failed. These are shared rules and production Mac storage/index/controlled-network checks, including recovery, isolation, reference protection and revision graph contracts. They are not live Syncthing tests. See [test output](issue16/shared-tests.txt).
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all four suites passed. See [output](issue16/browser-tests.txt). The suites exercise Chromium with the actual Swift storage/SQLite harness, not WKWebView or Android SAF.
- After the final home-only layout adjustment, the expanded [focus suite](issue16/focus-final.txt) and [shared sync-dialog suite](issue16/sync-ui-final.txt) passed again. Home tests include seven/expand, reorder/remove, open/create action and initiative, waiting/no invented overdue, draft recovery, zero home note-body reads, an explicit source read, wrong-quote guidance/details/draft retention/retry, delayed loading and saving, and 393px Chinese forms/navigation without page overflow.
- `npm run build:mac`: passed separately from runtime checks. See [build output](issue16/mac-build.txt). No Android build was run.
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

Native interaction covers these representative paths; it does not claim that every browser regression was repeated manually in WKWebView. The browser suite independently verifies source external-edit conflict/copy protection and workspace switching. The native path-renaming prompt was implemented but not exercised in this run.

## Screenshots

All native screenshots show synthetic fixture content. Baseline images are from the starting SHA; home/error captures use the final production layout; action/initiative/dialog captures use the same final screen implementation (the last production adjustment only repositions home sections).

- [Before: empty home](issue16/before-empty.png), [before: action form](issue16/before-action.png).
- [After: home](issue16/after-home.png), [after: action](issue16/after-action.png), [after: initiative](issue16/after-initiative.png).
- [After: disabled/unsaved](issue16/after-disabled-unsaved.png), [after: native error/details](issue16/after-error.png), [after: sync dialog](issue16/after-sync.png).
- [393px shared-web home](issue16/web-393px.png).

## Reviews, limitations and risk

Separate Standards and Spec reviews found issues in the first implementation; all were resolved with regressions. Final code re-review against the starting base reports zero remaining findings per axis. Final evidence-commit review is recorded in the PR.

Android-specific builds/device/runtime checks and standalone Syncthing synchronization checks were not run, per maintainer policy; they are deferred, not passed, and are not merge gates. No two-device receipt or production AI-service end-to-end claim is made. No VoiceOver session was run. A human visual review is recommended for the design-language change; it is not a prerequisite imposed by this worker.

Risk is moderate: shared CSS and copy affect several existing screen entry points, while persistence/domain formats remain unchanged. Browser regressions and native interaction cover the main paths, but cannot establish every host/OS/font/accessibility combination.
