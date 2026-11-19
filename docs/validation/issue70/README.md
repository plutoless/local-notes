# Issue 70 validation

These top-level artifacts describe the original pre-integration delivery and remain historical evidence. See [latest-main integration validation](integration/README.md) for the refreshed PR head, base, reviews, native dirty-exit/IME coverage and current test results after PR #77 merged.

## Scope and references

Starting SHA and latest-main merge-base: `1a38a5167b8583729a6831a33ade8107d25476a1`.
Code/test head: `759de75e19f98e8c3d18e1ab4fd410e43bcafd43`. Later evidence-only commits do not change executable assets or tests.

Live issue #70, parent #63 and comments were read before implementation. GitHub native `blocked_by` returned only #66, closed; its PR #76 merge is the starting SHA and is on `origin/main`. Textual dependency #66 is satisfied. PR #74 (#60) is merged at `fbb7b79bbffdfadb4aabb01b8efdaedea89d625a`; its source/return navigation suite remains in the full regression command. #65/PR #75 was open and is not implemented here. No ordering controls or Initiative metadata/lifecycle redesign were added.

## Executed acceptance evidence

- `tests/classification-ui.mjs`: Chromium with the real Swift file/SQLite adapter, synthetic temporary workspaces and no AI configuration. Contextual Topic creation/assignment, duplicate validation, multiple Topic/Initiative links, one-link removal, Topic-filter reopen, unchanged original Markdown, and Initiative-context unlink followed by Back/readback. Injected exact-path read failure after commit preserves a visible receipt and reopens the same Topic. A held Initiative write prevents replacement by Topic creation until it settles. Captures an unassigned note, classifies that captured note, reopens it through its Topic, and then classifies independently in a second workspace with same-named Topic/Initiative records while verifying the first workspace remains independent.
- `tests/topic-save.test.js`: real adapter tests for creation with its association in the same immutable revision, duplicate names, failed post-commit query, failed derived-tag update and same-revision recovery without duplicate entities/links.
- Existing shared UI suites cover deliberate creation inside an Initiative with its default working-note association, private drafts, stale bases, persistence failures, task leave decisions, search source/return navigation and workspace isolation. These are executed separately from native evidence.
- `tests/native-classification.py`: real Cocoa/WKWebView host built from production Mac sources with a test-only command channel and size/snapshot hooks. UI capture without classification, switch to reading, contextual Topic creation, two Initiative links and real Markdown/current-owner/immutable-revision readback. Checks source bytes unchanged, original reading scroll, one modal task, trusted OS Tab/Shift+Tab containment, initiating checkbox focus, trusted Escape and opener restoration, 1180×800 / 393×852 / 800×400 layouts, and clean native window close. This is DOM-driven native UI plus OS-injected keys/window close; it is not a physical-keyboard or dirty-native-termination claim.
- `native-report.json` binds the exact executed assets to committed web blobs and the production bundle, lists source/binary/probe hashes, trusted key events and input-source/process cleanup evidence. `native-record-readback.json` contains synthetic owner records, revision hashes and note hashes. Native screenshots were inspected; body scrolling and the footer remain separate at narrow/short sizes.

## Checks

- `npm run check`: passed.
- `npm test`: 63 passed, 0 failed.
- `npm run test:ui` with installed Google Chrome: passed all 18 scripts, including the added classification journey.
- `npm run build:mac`: passed; production bundle assets match the native probe.
- `npm run build:android`: passed, with the existing deprecated-API compiler note; packaging only.
- `python3 tests/native-classification.py`: passed on the code/test head above.
- Separate independent Standards and Spec reviews: zero remaining findings on the code/test head. Original reports, later findings, fixes and reviewer provenance are retained in the adjacent review files.

Intermediate failures are not counted as acceptance: Playwright/browser availability was resolved by a local no-save dependency install and the installed Chrome executable; the native probe initially required a fresh bundle; native Tab uncovered and fixed explicit drawer traversal; fault-injection predicates were updated to target the post-commit query after duplicate validation; tests now await settled operations and use actual owner labels rather than assuming record ordering. The post-commit receipt regression exposed an overwritten notice and now verifies the surviving receipt. The cross-workspace journey exposed a retained unavailable Topic filter, which is cleared only when that ID is absent in the new workspace.

## Limits and review decision

Android-specific runtime/device tests and standalone Syncthing synchronization tests are deferred under #63 and `docs/agents/validation.md`; neither is reported passed. Physical Android SAF/offline/restart/keyboard and two-device end-to-end synchronization were not run. No physical human keyboard/mouse, IME composition, dirty native window-close, app-menu quit or Cmd+Q test is claimed for this slice. Native focus/close coverage is exactly the bounded trusted-key/clean-close probe above; the full shared task-lifecycle suites cover dirty task behavior separately.

All fixtures and published screenshots/readback are synthetic. No original notes, AI requests, input-source installation/removal, global preference changes or permission resets were used. Both GUI leases were explicitly released after all owned processes stopped and the initial installed `com.tencent.inputmethod.wetype.pinyin` source was restored and verified in `finally`, including failed attempts.

No unresolved implementation/review finding or new human decision remains. Coordinator retains merge authority and may request ordinary PR review; no merge, issue closure, label or scheduler changes were performed by this worker.
