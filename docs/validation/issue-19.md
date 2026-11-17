# Issue #19 validation

## Revision and prerequisites

Base: `318a44f341895c27a32c97416bab4f92310f7381`. Production head: `ae4aed00752e5e790d87923bee33846d30e129b3`; subsequent evidence commits do not alter application code. The final evidence head is reported in the PR and coordinator handoff. The [source manifest](issue19/source-manifest.json) hashes the web assets and verifies the isolated native bundle used identical assets. Issue #16 was closed in both the textual blocker list and native dependency response before edits; its design language and presentation foundation were present. This issue's isolated worktree was initially clean.

## Content audit and design

| Content | Decision | Reason |
| --- | --- | --- |
| Library/favorites search, topics, refresh, directory and paging controls | Retain and unify | Shared Chinese vocabulary, active selection, bounded queries, disabled-state explanation and explicit empty states. |
| Sidebar running count | Remove from visible navigation | Browsing and opening notes matter more than a partial index count. |
| Always-empty editor beside browsing | Remove from library overview | The library owns the available width until a note opens; selected notes use list/detail and 393px uses one surface. |
| Source path, favorites, topic membership, initiative relationships, move/rename | Move into expandable details | Preserve access and evidence while keeping the note body primary. |
| Read/edit and local-save feedback | Retain and move to sticky toolbar | Primary operation and saving remain visible during reading. |
| Generic empty-editor slogan and file-ownership footer | Already removed by #16; keep absent from library overview | No actionable task content. |
| Checkbox-to-managed-action instruction | Replace | Checkboxes remain source Markdown; confirmed actions are created independently. |
| Recovery/conflict choices and failed link repair | Retain | Preserve local drafts, external versions, and explicit retry rather than overwriting. |
| Index body-read chatter | Suppress | Brief Chinese loading feedback only while updating; diagnostic evidence stays expandable. |
| User Markdown, titles, quotations, source links and paths | Retain without translation | Presentation changes do not migrate or bulk-rewrite user files. |

Reading uses the shared system Chinese font stack, bounded 780px document width, 16px/1.9 body text, semantic headings/lists/quotations, named checkboxes and wrapping code/paths. Ordered list starting numbers are preserved. An intermediate WKWebView screenshot revealed a stretched checkbox; explicit 20px width/min/max and a browser geometry regression fixed it. Final corrected screenshots supersede the intermediate captures.

## Executed validation

- `npm run check` and `git diff --check`: passed.
- `npm test`: 45 passed, 0 failed. Includes source-checkbox writeback/CRLF/HTML escaping, ordered-list numbering, persistence, isolation, recovery, reference indexing and native Mac storage/controlled-network contracts; not live Syncthing. See [output](issue19/shared-tests.txt).
- Existing action, initiative, focus and organization Chromium suites: passed. Test interactions now expand the note details before using moved controls. See [output](issue19/existing-ui.txt).
- New `tests/library-ui.mjs`: passed with local Chrome and the actual Swift filesystem/SQLite adapter. Covers browse/search/favorites, topic create/rename/link/filter, reading, checkbox width/writeback, autosave, successful move and topic link repair, external-edit conflict/copy, draft recovery after reload, directory navigation, 50-item pagination, delayed loading/disabled refresh, injected directory failure/retry, empty library, keyboard focus and 393px list/editor without page overflow. See [final output](issue19/library-ui-final.txt). The intermediate aggregate UI run preceded only the final checkbox sizing rule; the affected library suite was rerun afterward.
- Mac compilation/signing passed. Android compilation/packaging passed separately, with the existing deprecated-API notice. These are build results, not device/runtime tests. See [Mac](issue19/mac-build.txt) and [Android](issue19/android-build.txt).
- Shared token contrast remains body 12.28:1, secondary 6.28:1, primary 8.00:1, border 3.28:1 and focus 5.97:1. Browser checks assert visible keyboard focus and 393px overflow bounds. Native accessibility trees expose Chinese navigation, edit/read, source details, checkbox and conflict names. This is targeted accessibility verification, not VoiceOver certification.

## Native Mac evidence

Used Cocoa/WKWebView with synthetic files under ignored `build/issue19/Sync` and private storage under `build/issue19/Private`, and validation bundle ID `dev.localnotes.validation.issue19`. The final corrected run was addressed by PID to avoid ambiguity between multiple validation bundles; no real note directory was edited. A bundle-selected foreground action briefly opened the standard sample directory; only navigation was performed there, then all final verification targeted the isolated PID.

Baseline screenshots: [library](issue19/before-library.png), [editor](issue19/before-editor.png). Final corrected screenshot/tree pairs use the `corrected-` prefix in `issue19/`; earlier editing/search/move transcripts document their actual intermediate revision boundary.

Executed native browsing/opening, Chinese text editing, observed unsaved then locally saved feedback, fresh-process reopening of saved Chinese content and favorite state, reading semantic lists/quotation and named checkbox, checkbox writeback verified in the source file, details/favorite toggle, and a successful move to `工作资料/原生中文笔记.md` with Chinese completion feedback. The native prompt was inspected and answered through targeted System Events accessibility because WebKit's synchronous prompt blocks recursive snapshots; see [prompt transcript](issue19/native-rename-transcript.txt) and [move result](issue19/final-moved.txt). Also executed native no-results search and, on the final corrected assets, an external-edit conflict followed by saving a separate copy; filesystem readback confirmed both the external original and local copy retained their respective text. The original and final screenshots show the main layout before/after; native secondary states include details, unsaved/save, search and move feedback. Browser screenshots additionally cover empty, loading, failure, conflict and 393px states.

## Reviews, limits and risk

Separate Standards and Spec reviewers reviewed the complete production diff against the fixed base through `ae4aed00752e5e790d87923bee33846d30e129b3`: no remaining findings in either axis. Initial findings (unused test scaffolding, ordered-list start and filtered favorites messaging) were fixed and re-reviewed. Final evidence-only changes receive a separate review confirmation in the PR record.

Android-specific runtime/device tests and standalone Syncthing tests remain deferred by maintainer policy, not passed and not merge gates. No live multi-device receipt or VoiceOver session is claimed. Browser reload tests establish draft recovery; native fresh-process reopening establishes saved-file persistence. Human visual review is recommended but no unresolved requirement decision is known. Risk is moderate because shared Markdown rendering and CSS affect note presentation; persistence and domain formats are unchanged. The renderer remains the existing lightweight Markdown subset, not a full CommonMark engine.

Android-specific runtime/device checks and standalone Syncthing tests are deferred by user policy, not passed and not merge gates. No VoiceOver session was run. Human visual review is recommended for typography and density, but no unresolved finding requires a human decision.

All committed screenshots were inspected visually using full-size main/393px captures and a contact sheet for the state set. Final native reading places checkbox and Chinese label together; the long Chinese library card and editor remain within 393px with vertical scrolling. Native focus outlines are visible in the corrected reading and conflict captures. No remaining visual defect was identified. The Android APK web entries were compared byte-for-byte against the final web source; hashes are in the source manifest.


## Current-main integration

Main advanced with issue #17 action presentation during this task. Integrated main `7e85261efde0d75957351048a376b403c5d2233d` in production merge head `434d193c8fc2a2ea760c533fd82d347c2e0edb0c`; the single CSS append conflict retained both scoped rule sets, while action markup and UI assertions merged automatically. The original revision/evidence above remains historical; the final source manifest records the integrated production head and new review base.

On the integrated production head, syntax checking, all 45 shared tests, all five Chromium UI suites, Mac compilation/signing and Android compilation/packaging passed again. See the `integrated-*.txt` outputs. Browser screenshots were regenerated by the integrated library suite, including long Chinese text, 393px, loading/error/empty and conflict states. Reopened the synthetic conflict copy in a fresh isolated native process (`dev.localnotes.validation.issue19integrated`), entered reading mode and toggled its checkbox, then observed local-save completion and source writeback; see `integrated-native-*.png` and matching accessibility transcripts. Native web assets and APK entries were compared with the integrated source, as recorded in the manifest. Earlier native move/conflict/draft-related evidence was not exhaustively repeated after this action-only integration; the full shared/browser preservation checks were repeated.

Separate reviewers reported zero Standards findings and zero Spec findings against the new base through the integrated production head. The final evidence-only revision and independent confirmations are reported in the PR/coordinator handoff. No unresolved human decision is introduced by integration.
