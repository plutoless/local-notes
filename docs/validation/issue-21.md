# Issue 21 validation and content audit

## Scope and prerequisites

Starting/base SHA: `0a57391c73fe8794ed82a71d53d9cf0aa2dc3a14`. Before edits, issue #21 was open; both its textual blocker and GitHub dependency API identified #16, which was closed. The shared Chinese design language, presentation controls and production repositories were present. Only this isolated feature worktree was edited. Issue #26 / draft PR #27 were excluded.

Production and tests reviewed at `a12766e7afcab82ea2155f37835db5e8cce96692`; later commits contain evidence only. Resolution algorithms, formats, source protections and repository persistence are unchanged. The small shared focus-control filter now excludes inert descendants.

## Content audit

| Existing content | Decision | Reason |
| --- | --- | --- |
| JSON-first comparison and editor | Move complete JSON into advanced details; add labeled field comparison and typed editors | Make names, changes, statuses and editing readable without removing diagnostics or validation. |
| Internal record/revision IDs in titles | Move to advanced diagnostics | Readable names and record types identify the task; complete revisions and parent sets remain available. |
| One combined select/merge/save control | Split into compare, select, edit and local-save stages | Selection is not a committed resolution; consequences and retained history are explicit. |
| Repeated transport disclaimer | Shorten to contextual local-state help and local-save result | No remote acknowledgment exists; neither an empty conflict list nor a save implies delivery. |
| Missing/cyclic history warning | Retain, distinguish and add recovery direction | Disabled saving has an adjacent explanation; neither arrival time nor selection overrides guards. |
| Raw English failures | Move to technical details under Chinese retry guidance | Preserve native diagnostics and failed edits without using internals as the primary interface. |
| Immediate close/refresh | Guard unsaved edits; explicit discard | Escape, close, directory switching and native quit cannot silently drop the resolution. Refresh cannot overwrite a newly edited draft. |
| Source evidence, deletion and saved candidate review | Retain and explain inheritance from selected version | Readable quotations and decisions remain visible; complete fields are retained in advanced JSON for specialized edits. |

## Executed checks

- Syntax checks: [shared check](issue21/check.txt) and [sync syntax](issue21/sync-syntax.txt).
- Shared suite: 45/45 passed initially and final rerun in [shared-final.txt](issue21/shared-final.txt); actual Mac storage/index/network harness contracts are included. These are not Android or standalone Syncthing tests.
- Complete existing UI suite passed at final production content: [all-ui-final.txt](issue21/all-ui-final.txt).
- [Expanded synchronization UI](issue21/sync-ui.txt) passed using Chromium with real production Swift storage/SQLite, not an in-memory repository. It executes divergent action/initiative/topic/candidate comparison, selection, typed edit and local save; asserts new parents equal both reviewed tips and all four original/new revisions remain; checks close/Escape guards, focus restoration, reopening resolved state, invalid JSON retention, invalid JSON followed by retry, injected revision-write failure/retry, advanced/typed field preservation, recovery editing lock and opening while background recovery runs.
- Synthetic missing-parent and cyclic histories cross the same production repository/native boundary; rendered save buttons are disabled with distinct Chinese explanations. Multiple concurrent conflicts exercise Tab containment with inactive records.
- 393×852 viewport checks no horizontal document overflow. Chinese accessible names, keyboard focus and a rendered 3px solid blue outline are checked. [Narrow capture](issue21/web-393px.png) shows a vertically scrolled secondary state; vertical clipping at the viewport edge is ordinary panel scrolling. The preexisting shell notice is visible in this capture and was dismissed for the final native captures.
- Rendered palette contrast: text/white 13.22, secondary/white 6.28, primary/white 8.00, border/white 3.28, focus/white 5.97 (the existing UI suite computes these). Targeted checks meet relevant AA thresholds; no accessibility certification is claimed.
- [Mac build](issue21/mac-build.txt) and [Android build](issue21/android-build.txt) passed. These prove compilation/packaging, not runtime behavior.
- [Source manifest](issue21/source-manifest.json) records final production hashes and byte-for-byte native/APK asset equality, original native revision retention and the actual multi-parent native resolution. Synthetic source-note bytes were checked unchanged.

## Actual native Mac interaction

Used the production Cocoa/WKWebView app with isolated bundle ID `dev.localnotes.validation.issue21` and explicit synthetic root/private directories beneath ignored `build/issue21`. No installed app directory or real note content was edited. The fixture seed used the production Swift adapter; subsequent divergent/incomplete/cyclic records are synthetic files consumed by the production repositories.

Actual actions: opened baseline review; compared final readable versions; selected a version; edited Chinese content through the native accessibility field; used Tab and Escape; observed unsaved close protection; saved and observed the resolved empty panel plus edited action in the home; restarted and reopened the empty review. Source history inspection confirms the saved edited multi-parent revision. A second divergent fixture exercised blank-content validation and the Chinese failed-resolution state with edits retained. The initial native retry attempt was unverified and was not counted as passed; the follow-up below now verifies a failed-resolution/successful-retry sequence on identical final production assets. Final production assets were relaunched with incomplete/cyclic fixtures; native accessibility exposes distinct Chinese reasons and disabled saving. Scrolling was exercised in the actual window.

[Before](issue21/before.png), [edited/unsaved](issue21/after-unsaved.png), [saved](issue21/after-saved.png), [reopened after restart](issue21/final-reopened.png), [failed validation](issue21/after-error.png), [final comparison](issue21/final-compare.png), [final scrolled editor](issue21/final-disabled.png), [final history guard](issue21/final-history-guard.png). Early captures precede review fixes; final comparison/history captures use byte-verified final production assets. [Native transcript](issue21/native-transcript.txt) identifies the respective sessions and states. Inspected baseline, comparison, narrow and final scrolled captures; controls and Chinese labels wrap, and the panel scrolls vertically.

## Review, limits and risk

Independent [Standards](issue21/standards-review.md) and [Spec](issue21/spec-review.md) reviews each report zero remaining findings against the starting SHA. Review-discovered data-loss and focus risks were fixed and covered by targeted regression tests.

Android-specific tests/runtime and standalone Syncthing tests remain maintainer-deferred, unexecuted, and not merge gates. No remote delivery, two-device receipt, physical-device, VoiceOver, real-service end-to-end or exhaustive native state-matrix result is claimed. Native loading/error timing is covered more fully in controlled Chromium against the actual native storage boundary; native failed-validation/successful-retry is now separately verified below. Human visual review is recommended for this scrolling comparison layout, but no unspecified product decision is pending. Risk is moderate: async modal/editor presentation changed, while persisted records, histories and resolution validation remain owned by unchanged repositories. Only the coordinator may merge or close #21.


## Native retry follow-up before merge

The initial attempted retry had an automation failure, not a demonstrated product retry failure: the preserved [error response](issue21/native-retry/prior-automation-error.json) reports `verification_failed` and says the requested value did not take effect (the field still read a space). The initial result remains recorded as unverified. No production code was changed for this follow-up.

A fresh synthetic root and private store were created through the same production Swift seed adapter under ignored `build/issue21-retry`; the real Cocoa/WKWebView app used a separate `dev.localnotes.validation.issue21retry` bundle ID. Every served web asset was byte-compared with the production sources at `a12766e7afcab82ea2155f37835db5e8cce96692`, which are also the production files in the current PR. Starting PR head was `aa71638f475d030b3cd40762e3712732e33b9109`.

Executed native sequence: select a divergent version; set description to a single space; save; observe Chinese failed-resolution feedback with the editor retained; refresh accessibility state; attempt semantic field click and observe `suspected_noop`; use one background pointer click at the field located from the fresh screenshot (scale 2); confirm the field now has focus; Cmd+A; type `原生失败后重试并保留双方历史的解决内容`; verify the focused field contains that exact value; retry saving; observe the local-save message and no remaining conflicts; close review; observe the exact intended text rendered as an action heading on the home. Synthetic keyboard delivery by itself was not treated as proof; read-back, rendered result and persisted content were required.

The [interaction log](issue21/native-retry/interaction-log.json) records commands' action verification metadata and before/after trees. [Failed resolution](issue21/native-retry/failed.png), [retry edit](issue21/native-retry/retry-edited.png), [successful local save](issue21/native-retry/saved.png), and [rendered resolved content](issue21/native-retry/rendered-content.png) are actual native captures. These images were inspected after capture.

[Disk verification](issue21/native-retry/verification.json) asserts exact intended persisted/rendered content, exactly the two original branch tips as parents of the new resolution, four total revisions (all three originals plus the resolution), the original base revision still present, unchanged source-note bytes, and byte-equal native web assets. The failed validation did not introduce an extra revision. The original failed automation attempt is superseded by this successful, independently verified native sequence; it is not retroactively called a pass.

Fresh `origin/main` was fetched and remained `0a57391c73fe8794ed82a71d53d9cf0aa2dc3a14`; no merge/rebase or force push was needed. The targeted synchronization UI and syntax checks were rerun for the unchanged production diff ([UI](issue21/native-retry/sync-ui-followup.txt), [shared syntax](issue21/native-retry/check-followup.txt), [sync syntax](issue21/native-retry/sync-syntax-followup.txt)). Earlier full shared/UI suites and builds remain applicable to byte-identical production content; no Android runtime or Syncthing tests were run. Separate independent Standards and Spec confirmations for the exact final evidence-inclusive PR SHA are delivered in the PR description and coordinator handoff after this evidence commit, avoiding a self-referential commit hash.
