# Issue 59: scoped global lookup

Starting SHA and latest-main merge-base: `6c61d024320341760e46ca18143c1830b458d802`.
The native dependency endpoint and textual blocker both identified #58, closed with its implementation available on origin/main before editing. Parent #57 and the approved compact A design were read. This delivery implements #59 only; source navigation is #60 and meaning retrieval is #61.

## Behavior and boundaries

The existing dialog exposes 全部内容 / 笔记 / 事项 / 行动, initially All content. Scope/query survive same-workspace reopen and reset on workspace change. Presentation uses one workspace query/context boundary, with request fencing, typed passage identities, bounded pages, independent library state and truthful loading/partial/error/retry receipts. Search remains offline and does not call remote services.

The existing private reference index retrieves separate nonoverlapping 900-character match windows from long notes. Archived notes remain eligible and source enumeration/exclusions are unchanged. Formal search uses rebuildable confirmed-record indexes; original initiative title/goal/progress and action description/waiting text are searchable. Conflicted/incomplete records are excluded with partial-index status. Expansion exposes clean original type-specific text; copy uses exactly the displayed bordered range. Attribution is off initially and adds a supported local locator. Formal results include modification time and a short record identifier outside the default copy range to distinguish duplicate titles.

Read-only repository reconciliation updates private indexes without repairing synchronized records, changing lifecycle/focus/history, or saving hidden editors. Missing indexes can rebuild from real confirmed files. Native and merged ranking share ASCII literal folding, title priority and binary/codepoint ordering, preventing page duplicates when bounded prefixes grow. This is literal substring retrieval, not semantic search or a relevance guarantee.

## Execution and evidence

The maintained `tests/search.test.js` uses real Swift storage/SQLite and isolated synthetic notes and formal records. It covers all scopes, actual stored fields, typed identities, archived notes/checklists, more than 50 mixed-case paths, accented rank consistency, distant passages, title-only initiative expansion, source change rejection, foreign workspace rejection, missing-index rebuild and no synchronized record writes during lookup.

`tests/search-ui.mjs` exercises the real application → bridge → isolated storage/index seam. Clipboard receipts and delayed/error replies are controlled only for failure/race coverage. It checks four scopes, clean copied text, optional source/failure, dirty underlying note preservation, independent pages, repeated invocation, retained scope/query, superseded scope replies, desktop/393px layout and focus containment.

`tests/native-search.py` builds an isolated Cocoa/WKWebView probe from packaged application resources and production native/storage/index code. The added inspection channel does not replace retrieval. It uses 373 synthetic notes, seeds formal records through repositories, and verifies OS-delivered Command+K/repeat, Enter, Command+Enter for each scope, actual `pbpaste` readback, native Command+C of DOM-selected text, Tab/Shift+Tab containment, Escape/opener restoration and 393px layout. Each run clears its generated synthetic directories. `result.json` records the executing head; `source-hashes.json` binds web assets to the packaged probe.

Validation commands are `npm run check`, `npm test`, `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`, `npm run build:mac`, `npm run build:android`, and `SEARCH_NATIVE_OUT=build/issue59-native python3 tests/native-search.py`. Build evidence is separate from runtime evidence. Raw logs and generated applications remain under `build/issue59*`; the committed evidence contains synthetic data only. Final command outcomes and reviewed head/base are recorded in the PR.

## Reviews and limitations

Separate Standards and Spec reviews initially found inconsistent pagination ordering, inaccessible distant note passages, insufficient formal expansion and indistinguishable duplicate records. All were corrected with regressions. A later Standards pass found ASCII-versus-Unicode rank folding inconsistency; the merge now follows native SQLite folding. The finite type-to-descriptor branches remain an accepted minor maintenance suggestion: all three types are localized to the application seam, and a new abstraction has no additional consumer.

Android-specific runtime/device checks and standalone Syncthing tests are deferred by user policy and are not passed checks. Physical mouse-drag selection, other input methods, private-corpus relevance evaluation, external receiving-app paste, and full device end-to-end checks are unrun. Native OS clipboard readback is executed; DOM selection plus OS Command+C does not prove mouse-drag selection. Search performance on private data and a semantic retrieval quality benchmark are not claimed. Human interaction/relevance review is recommended; merge authority belongs solely to the coordinator.
