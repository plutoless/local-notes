# Issue #101 continuation: delivered Library ownership correction

Continuation start: `9da2da81ed29daeb46b76e155eebe9a6efaddcf6`.
Original starting point: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched main/base: `2c7b9a05e96c703bca03417a864f0923d2b66a4f` (issue #116 / PR #117, reviewed upstream `79ed8ad952e7f17834d0fa8f4424cc31ef55f5bc`).
Integrated code head: `6f8e364bcca04670b109fe9d8026c965c0d5f481`.

The coordinator explicitly resolved the prior global postmerge hold after verifying
the delivered correction, resulting-main fast tests, complete Favorites/readback/
reload and protected forms. Earlier hold statements in this branch's historical
reports apply to those earlier heads, not the current disposition. PR #115 retains
its own checks/review gates and coordinator-only merge/close authority.

This is not a new diagnosis of the original intermittent browser assertion. The
upstream strengthened readiness test passed both old and new assets; a separate
held-query controller regression deterministically demonstrated stale collection
publication and was corrected. Those are distinct findings; the exact earlier
browser cause is not inferred here. Failed upstream/original receipts remain intact.

Native/written blockers #93 and #86 remain closed, with delivered behavior on fetched
main. No prerequisite, main/coordinator code or scheduler state was edited.

## Actual diff and preservation

Merge was clean. The sole incoming production change increments the existing query
sequence at `LibraryScreen.switchCollection` entry. The held-success/rejected-query
controller regression and complete65/exact15 Favorites readiness/path assertions
are consumed verbatim, including original selection/context/source/readback/reload
checks. No competing correction, relaxed assertion or sibling implementation.

Issue #101 app/copy/reload, sync/draft/reader components, host/catalogue and relevant
tests remain byte-identical to the previously cleared 9da2da8 head. Delivered
Library controller and strengthened tests match fetched main exactly. The source/
build/package controller matches byte-for-byte. `source-artifacts.json` records
these checks, relevant source/test/artifact hashes, environment and package equality.

## Selected fresh layers and command receipts

All commands completed with exit zero; raw receipts are in `logs/`.

| Risk / behavior | Executed command | Result |
| --- | --- | --- |
| Held success/rejection cannot publish across collection switch; independent snapshots | `node --test tests/library-ownership.test.js tests/collection-context.test.js` | 3 passed |
| #101 private candidate/immutable retry/cache guards, real revision/conflict/recovery and Library storage/index contracts, generated assets | `node --test tests/sync-drafts.test.js tests/synchronization.test.js tests/library.test.js tests/native-assets.test.js tests/packaged-assets.test.js` | 20 passed |
| Combined syntax/types | `npm run typecheck`; `npm run check` | Passed |
| Shipped controller plus existing compiled interface | `npm run build:mac` | Typecheck, web build, signed Mac package passed; no launch |
| Real app synchronization and origin return with corrected collection fence | `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ISSUE101=1 ISSUE86_EVIDENCE_DIR=docs/validation/issue101/correction-integration/sync node tests/sync-focus-ui.mjs` | Passed four record types, full comparisons, explicit multi-parent resolution, warning/retry/committed recovery, invalid-draft reload, quota and focus/viewport states |
| Guarded reader-copy completion/return and delayed leave using real isolated storage | `CHROME_PATH=… node tests/ui.mjs` | Passed external-source preservation, copy/readback and pending native-leave callback through browser shim |
| Corrected Favorites shared context, exact count/rows and source persistence | `CHROME_PATH=… NOTE_CONTEXT_BASELINE_DIR=build/web NOTE_CONTEXT_ASSETS_DIR=build/web NOTE_CONTEXT_OUTPUT_DIR=docs/validation/issue101/correction-integration/favorites node tests/note-context-ui.mjs` | Passed complete65, exact15 last-page rows, original selection/order/scroll/independent-context assertions, capture return/persisted reload and all original source hashes |

The Favorites harness retains its inherited lane names `baseline` and `migrated`,
but both point to this integrated current `build/web`; this is current acceptance,
not an old/new comparison. Its comprehensive migrated lane retains all strengthened
assertions. No code/test was edited to arrange that invocation. The general UI
harness already owns #101's delayed-copy regression, so its other historical checks
ran as well; no duplicate matrix or blanket full UI run was introduced.

## Outcomes and exact evidence reuse

`sync/storage-receipt.json` records equal original/final source hash
`f5c8ae84b032ed6a2f2b5c8de16f3c927f3231553f0c4583f7de29bea6accaef`, four immutable
revisions, explicit multi-parent resolution, reload, invalid draft and quota recovery.
`favorites/results.json` records all original source hashes and `sourcePreserved:true`;
the verbatim test asserts visible complete65 and all exact last15 path identities,
then persisted capture readback/reload. Fresh representative images are in `sync/`,
`reader/` and `favorites/`; generated prior-issue screenshots were restored after
copying them into this report.

Earlier full90, Action integration27 and Favorites integration22-test/composition/
source-return/catalogue results remain historical with their original bindings.
Current source-artifacts verifies unchanged React visual bundle/CSS and environment
against the prior evidence, in addition to unchanged feature sources. That supports
reuse of existing catalogue/contrast/reduced-motion and reader composition/caret
coverage; no new blanket UI, full-unit or native/physical pass is claimed.

Sync observed 271ms initial inspection, zero Markdown body reads and 24 bridge
commands. Favorites lane warm refresh samples were 112/100/99ms and 147/100/116ms;
read counts66 and6 reflect the shared fixture's cold/warm index and differing lane
journeys. Both lanes use the same current assets; those values do not establish a
speedup, root cause or controlled performance difference. Compiled JS/CSS remain
362166/6172 bytes, with exact hashes in the bindings. Native startup/memory unmeasured.

## Review, failures and limits

Separate independent Standards and Spec reviews cleared code head 6f8e364 against
latest main 2c7b9a0, prior9da2da8 and original8ae4622, with no new material #101
findings. Final documentation-only head confirmation is delivered separately; see
`standards-review.md` and `spec-review.md`. No new product/test failure cycle occurred
in this continuation. Prior failures and transport retries remain retained under
their original stages. Minor compressed naming and raw npm log final blank lines
remain accepted evidence/maintainability observations, not behavioral waivers.

Browser bridge/callback shims use real isolated Swift Markdown/JSON/SQLite adapters,
not WKWebView transport/custom-scheme or OS input. No GUI grant/app launch/native
input, private processing or model download occurred. Ordinary unchanged-host native
OS IME/keyboard/clipboard/close-restart replay remains release-deferred; physical/
minimum-platform/Intel/native startup-memory are unrun. Android-specific and standalone
Syncthing remain user-deferred/nonblocking. Coordinator alone merges/closes/labels;
no new user decision or #101 implementation blocker was found by this continuation.
