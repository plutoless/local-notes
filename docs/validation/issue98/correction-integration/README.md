# Issue #98: delivered collection correction integration

Continuation starting head: `d5494970622a2100769a8d537e64d30b1d96fb98`.
Original issue starting SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Fetched/integrated main: `2c7b9a05e96c703bca03417a864f0923d2b66a4f`.
This contains merged corrective #116/PR117 (reviewed head
`79ed8ad952e7f17834d0fa8f4424cc31ef55f5bc`). GitHub #116 is closed; native/written
#98 blockers #93/#85 remain closed with implementations on main.

Initial fetch returned LibreSSL SSL_ERROR_SYSCALL. A per-command HTTP/1.1 fetch
succeeded, then verified correction ancestry and main before integration. No global
Git configuration or permission/custody boundary changed. Merged into the same
issue98 branch without conflicts, rewriting history or sibling implementation.

## Actual diff and ownership

The sole production change from delivered main is the existing query sequence
increment at LibraryScreen.switchCollection entry. It invalidates late success and
failure responses before the next collection renders. The new public controller
regression and strengthened note-context readiness/exact-row assertions are consumed
verbatim. No competing correction or weakened expectation is introduced. App, forms,
bridge, service, tokens and Organization production/controller/tests are unchanged
from the previously reviewed issue98 head. All sibling corrections/tests match main.

## Fresh selected checks

Build/package completed before any test read generated assets. All selected commands
completed with exit zero; no fresh product/test failure or correction cycle occurred.
Browser commands set CHROME_PATH to
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

| Behavior/layer | Executed command | Receipt |
| --- | --- | --- |
| Typed/public host contracts, syntax | `npm run typecheck`; `npm run check` | `typecheck.txt`, `check.txt` |
| Changed shipped Library controller and Mac package | `npm run build:mac` | `package.txt` |
| Pending query success/failure ownership, independent collection snapshots/reset, real bounded Library/index restart, Organization explicit scope/retry/cancel/dedup, source/generated manifest | `node --test tests/library-ownership.test.js tests/collection-context.test.js tests/library.test.js tests/organization.test.js tests/native-assets.test.js` | `public-storage-resource.txt`: 13 passed |
| Actual Organization send, persisted candidates/reload/source return, Favorites capture discard/Action save/return with persisted identity and source bytes | `node tests/organization-ui.mjs` | `organization-return-ui.txt` |
| Complete65 Favorites, exact15 final paths/page51–65, independent contexts, reader/Action/Initiative returns, capture persisted readback/reload, original source hashes | `NOTE_CONTEXT_BASELINE_DIR=build/issue98-correction-baseline NOTE_CONTEXT_OUTPUT_DIR=build/issue98-correction-favorites node tests/note-context-ui.mjs` | `favorites-exact-ui.txt`, `favorites-results.json` |

`baseline-binding.json` records the d549497 built resources verified against the
previous delivery binding before snapshotting. The unmodified corrected browser
harness ran both that pre-correction asset snapshot and integrated current assets.
Both passed the strengthened readiness conditions. This does not establish the
exact cause of the original intermittent browser failure. The separate deterministic
late-query success/rejection regression establishes the production ownership defect
and is now passing with the delivered sequence correction. Neither is substituted
for the other, and previous failed evidence remains preserved.

The paired refresh samples are baseline99/116/101ms and current127/100/101ms; these
browser automation/concurrent fixture timings are observations, not a speedup or
native performance claim. Body-read totals include differently warm index histories
and are not comparable per-refresh costs. React JS357571bytes and CSS6132bytes remain
unchanged; the affected flat Library controller is freshly packaged and byte checked.

## Reuse, review and disposition

Original issue98 selection/settings/failure/retry/resume/dedup/candidate decisions,
focus/caret/selected/invalid/long-Chinese/responsive/reduced-motion and source/hash
receipts remain attributed to their original heads and unchanged source modules.
The prior one-favorite return check is not used to establish65-item pagination; the
fresh exact65/15 check above now covers that case. No blanket full UI/full-suite or
optional native replay was run. Coordinator's supplied resulting-main checks are
reported as coordinator evidence, not fresh worker execution here.

The coordinator explicitly resolved the global postmerge hold after accepting the
delivered #116 correction and resulting-main evidence. This continuation consumes
that correction and independently passes its affected gates; prior report HOLD text
is historical and superseded, not erased. Independent complete-PR Standards/Spec
reports are tied to the final head/latestmain and delivered with PR113 plus local
`build/issue98-correction-integration-{bindings,standards-review,spec-review,report}`.
Coordinator alone decides final merge/closure/labels; no scheduler/main mutation.

Browser checks use synthetic isolated Markdown/JSON and real Swift file/SQLite
adapters through a shim; they do not exercise WKWebView UI transport or OS input.
Mac packaging/signature is not app launch. No GUI grant/launch/clipboard custody,
model download or private processing occurred. Ordinary native IME/shortcuts/
clipboard/quit/close/restart compatibility stays release-deferred; physical/Intel/
minimumOS/native startup/memory unrun; Android/Syncthing user-deferred, never passed.
