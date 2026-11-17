# Issue 20 validation and content audit

## Scope

Starting base: `bca201d20052b10be8cec886ae57b75bc1d21cca`. Before edits, issue #20 was open; the native dependency API and textual blocker both identified #16, which was closed. Shared presentation controls and `docs/chinese-design-language.md` were present. Only this isolated worktree was edited. Issue #26 / draft PR #27 were excluded.

## Content audit

| Existing content | Decision | Reason |
| --- | --- | --- |
| Always-expanded service form, transport explanation | Move into device-settings disclosure | Configuration is occasional; configured users start with selecting notes. Endpoint/model/credentials remain available; credentials never enter preview. |
| Raw JSON as the only content preview | Retain full diagnostics in details; add exact fragment text | Users can read the actual selected text without JSON escapes. Paths, offsets and total length establish complete coverage; full prompt, fragments, endpoint/model and stream flag remain available before sending. |
| Start/retry as one permanent label; always-enabled cancel | Shorten and make state-specific | Send is explicit; in-progress operations lock selection and preview; cancel only applies during an operation. Partial continuation names remaining content. |
| Retry-policy narration and English failure states | Replace with Chinese recovery feedback | Explain failure, next action and retained results; technical evidence remains expandable. |
| Suggestion, placement, reasoning, relevance and quotations | Retain | Essential evidence and uncertainty; historical plans never imply current commitments. Suggestion is a heading. |
| Always-open editor and five equally weighted decisions | Move editor into disclosure; prioritize confirmation | Editing remains available before every decision. Association/reference placement is labeled; later/ignore remain secondary. |
| Saved IDs and raw review metadata | Move into optional record details | Useful for diagnosis, not the primary judgment. Show saved edited suggestion beside the saved decision. |
| Empty results and unconfigured/offline states | Rewrite with next steps | Explicit selection/setup guidance; saved suggestions remain usable without a connection. |
| Source-change checks, approval persistence, recovery, duplicate protection | Retain unchanged | The screen still delegates to existing domain/repository contracts; no source rewrite or automatic approval. |

## Executed validation

- `npm run check` passed ([output](issue20/check.txt)).
- `npm test` passed 45/45 ([output](issue20/shared.txt)): shared rules plus production Mac storage/SQLite/network harness contracts; no standalone Syncthing or Android tests.
- Controlled Chromium + real Swift storage/SQLite UI suites passed; see [complete suite](issue20/all-ui.txt), [organization scrolling](issue20/browser.txt), and [expanded review suite](issue20/review-ui.txt).
- Expanded organization checks execute exact text preview, delayed-preview selection locking, invalidation, no request before send, partial/rate-limit retention and retry, editing/confirmation, attachment to an existing initiative, reference, later, ignore, interrupted approval recovery, failed recovery on reopen, saved decision reopening, source-change rejection, cancellation, malformed response and offline retention.
- Narrow viewport is 393×852, with long Chinese synthetic source content, no horizontal document scrolling, accessible Chinese names and visible 3px keyboard outline. [Screenshot](issue20/web-393px.png). The scrolling regression additionally checks default desktop, smaller desktop and 380px widths.
- Contrast ratios calculated from rendered CSS: text/white 13.22, secondary/white 6.28, primary/white 8.00, border/white 3.28, focus/white 5.97. These meet relevant AA thresholds; this is targeted verification, not an accessibility certification.
- Mac and Android builds passed separately from runtime interaction ([Mac](issue20/mac-build.txt), [Android](issue20/android-build.txt)).

## Native Mac interaction

Used a production Cocoa/WKWebView build with a separate bundle ID `dev.localnotes.validation.issue20` and explicit synthetic root/private paths under ignored `build/issue20`. A local HTTP service on 127.0.0.1 returned controlled suggestions and 429 errors or held requests; no real note upload or paid call occurred. The installed app and real note directories were not operated on.

Actual interactions: opened organization; observed unconfigured/empty/disabled states; configured synthetic local service via native fields and keyboard; selected `reference.md`; inspected readable preview; sent and observed a 429 error; retried a held request, observed loading and canceled it; retried successfully; opened edit disclosure, used Tab and keyboard input, observed the unsaved warning, then confirmed the edited suggestion and observed saved decision and edited text. Native persistence was subsequently checked by restarting the app and reopening organization. Native accessibility output exposes Chinese stage headings, fields, states and controls. Mac default Tab behavior follows the host keyboard-navigation setting and can skip buttons; the browser suite explicitly exercises button focus and Tab outline.

[Before](issue20/before.png), [before preview](issue20/before-preview.png), [unconfigured](issue20/after-unconfigured.png), [final preview](issue20/final-preview.png), [final service error](issue20/final-error.png), [unsaved edit](issue20/after-unsaved.png), [final reopened saved decision](issue20/final-saved-decision.png). Screenshots intentionally capture different vertical scroll positions of the same task surface. Native transcripts and source/build hashes are recorded alongside the final screenshots.

## Reviews and limitations

Independent Standards review initially found a record-title typography mismatch; changed to shared 15px. Independent Spec review found a preview/selection race and recovery feedback overwritten on reopening; both were fixed and covered with delayed-read and failed-recovery regressions. Final reports are stored separately with the final review boundary.

Android-specific device/runtime tests and standalone Syncthing checks remain maintainer-deferred, unexecuted, and not merge gates. No real-service end-to-end, VoiceOver, two-device delivery or physical-device check is claimed. Native interactions cover representative states; the complete decision/error matrix runs in Chromium against the actual Mac storage adapter. Human visual review is recommended for the layout; no human decision is required for implementation. Risk is moderate because presentation and async control state changed; entity formats, approval/persistence logic and source-note protections are unchanged.

## Final evidence boundary

Final production head: `557a47a30a18138fa1126dccdb03947fe3a0a3d3`. Subsequent commits contain evidence only. The complete UI suite ran at `efa2415`; after the one-line cancellation guard change, the expanded organization review suite passed again at final production content. Shared tests ran on the initial implementation; storage/domain code did not change afterward. Mac/Android builds, syntax checks, and final targeted regression output cover final production content.

The [source manifest](issue20/source-manifest.json) records SHA-256 hashes, verifies final native web assets byte-for-byte against source, and verifies every APK web asset and presence of classes.dex. The final isolated app reopened the saved edited decision after restart, selected and previewed again, and displayed a controlled 429 failure while retaining that decision. Final preview/error/reopened-decision captures use final production assets; earlier unconfigured and unsaved-edit captures precede review fixes (title size and async guards). [Native transcript](issue20/native-transcript.txt) distinguishes these sessions. The synthetic source bytes were checked unchanged.

Inspected the baseline, final preview/error/saved-decision, unsaved native edit, and 393px screenshots. Content and controls wrap/read as intended; vertical scrolling exposes the complete task, and no visual defect was identified in these captures. Separate [Standards](issue20/standards-review.md) and [Spec](issue20/spec-review.md) reports record zero remaining code findings.
