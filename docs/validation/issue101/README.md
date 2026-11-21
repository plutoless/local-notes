# Issue #101 validation

Starting and fetched base: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Implementation source: `8043c070dad5154e1eec3dfa6aa3bf8dde691cfb`.
Both native dependency API and written blockers identified #93/#86 as closed;
fetched main includes #103/#106/#109/#110. No overlapping open PR existed at start.
The first fetch failed with LibreSSL SSL_ERROR_SYSCALL; the ordinary retry succeeded.
No prerequisite, main branch, coordinator checkout or scheduler state was edited.

## Selected layers and results

| Behavior/risk | Layer and executed command | Result and limits |
| --- | --- | --- |
| Existing graph, shared domain, real repository/storage/index/bridge contracts | `npm test` | Initial 84/84 passed; final integrated run 90/90 passed (88 issue-branch tests plus two delivered search tests) |
| Raw invalid JSON, full source-value preservation, explicit private recovery candidates and workspace/type/entity keys | `node --test tests/sync-drafts.test.js` | 4/4 passed, including task-bound immutable retry verification and cache failures |
| Generated assets and Mac manifest contracts | `node --test tests/sync-drafts.test.js tests/native-assets.test.js tests/packaged-assets.test.js tests/mac-assets.test.js` | 5/5 passed |
| Sync real-storage cross-layer journey, all four record types, multi-parent resolution, JSON validation, retry, committed recovery, missing/cyclic warnings, modal/return and widths | `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ISSUE101=1 ISSUE86_EVIDENCE_DIR=docs/validation/issue101/after node tests/sync-focus-ui.mjs` | Passed; includes app reload/repository reconstruction with four retained revisions and explicit recovery of invalid raw resolution input after reload |
| Reader file conflict, external source preservation and save-as-copy | `CHROME_PATH=… node tests/ui.mjs` | Passed maintained actual-app/real-storage journey; includes unrelated existing regression coverage, retained rather than duplicated |
| Chinese engine composition, caret/selection and note persistence/return | `CHROME_PATH=… node tests/reader-editing-ui.mjs` | Passed; DevTools/browser-engine events, not native OS IME |
| Shared leave/dirty/failed/submitted decisions | `CHROME_PATH=… node tests/task-lifecycle-ui.mjs` | Passed maintained real-storage journey |
| Actual consumed components/tokens, contrast, 393px, reduced motion and dialog return | `CHROME_PATH=… node tests/design-catalogue-ui.mjs` | Passed; screenshots copied into this issue, prior issue outputs restored |
| TypeScript and offline production bundle | `npm run typecheck`, `npm run build:web` | Passed repeatedly after relevant changes |
| Shipped assets/resources | `npm run build:mac` | Passed final source packaging; no app launched |

The maintained sync journey retains useful existing coverage rather than copying its
variant matrix into new tests. Only the additional invalid-input/candidate logic has
new unit tests. No full maintained UI suite was required: the changed DOM ownership
is limited to one sync overlay and reader conflict controls, with shared lifecycle,
reader, catalogue and save-as-copy consumers selected by risk.

`source-artifacts.json` binds source, compiled bundle, manifest and packaged binary.
The browser uses compiled production assets and real isolated Swift Markdown/JSON/
SQLite adapters through the existing command/reply shape. It does not exercise
WKScriptMessageHandler, WKWebView custom-scheme loading or Android Java transport.
No native host, lifecycle registration, resource policy or bridge transport changed.

## Visual and performance observations

`before/` is the exact starting source archived into an isolated directory under
`build/issue101-baseline`, using the pinned installed dependencies and same browser
and maintained journey. `after/` uses migrated production assets. The harness uses
`after-*` filenames within both phase directories; the enclosing directory records
the source phase. Pointer-selected, selected-plus-keyboard, invalid-plus-focused,
warning, long Chinese, desktop 1180x800, 393x852 and reduced-height 1180x480 are paired.
Read-only comparisons have no decorative focus frames. Selected fill, keyboard
outline and invalid border remain separate; visible controls retain 44px targets.
Catalogue contrast: text 12.64:1, muted 4.72:1, focus 4.98:1; reduced motion passed.

Initial sync inspection observed zero Markdown body reads and 24 bridge commands in
both baseline and migrated runs. One baseline observation was 1616ms, migrated 309ms after integration
(other migrated observations 247–393ms); these noisy startup-plus-fixture samples
are not a speedup claim. Bundle JS grew from 323,508 bytes to approximately 337KB
before integrating the delivered search migration; final integrated sizes are in source-artifacts.json. The archived baseline's
Tailwind auto-discovery emitted extra CSS, so that CSS/time difference is not a
controlled performance comparison. Native cold startup, process memory and physical
input responsiveness were not measured; no reproducible slowdown was established.

## Preserved failures and corrections

All attempted command logs are retained in `logs/`.

- Setup signature: missing Vite/Playwright. `npm ci` installed the pinned lockfile;
  subsequent builds and browser starts passed.
- Refresh signature: first conflict never appeared. A null pre-open workspace ID
  was incorrectly treated as final identity; allow initialization, then capture the
  opened ID. Later runs reached all comparison states.
- Field-label signature: exact label lookup timed out on React-controlled textareas.
  Diagnostics localized the receiver; explicit source-independent accessible labels
  corrected it. Early overlapping diagnostic attempts were redundant; no successful
  acceptance is claimed from those runs.
- First-open probe signature: the test provider constructed a new repository on every
  access, so the new ownership fence rejected it. Capture one repository, matching
  production provider identity; first-open containment and Escape return now pass.
- Added reload assertion used a nonexistent `get` method; replace it with the existing
  bounded entity query. Persisted four-revision readback now passes.
- Inspection found pending writes could settle before post-save refresh. Keep the
  refresh within the task's pending promise and avoid reopening a hidden task; the
  final sync journey passed after this correction.

## Deferred, unrun and risk

Ordinary unchanged-host native OS keyboard/IME/clipboard, native close/quit/restart
compatibility replay is release-deferred under the maintainer policy, not passed.
No GUI lease was requested or granted and no native GUI input occurred. Physical
input, minimum OS/WebKit, Intel and Android runtime/build checks are unrun.
Android-specific and standalone Syncthing tests remain user-deferred/nonblocking.
No model processing, model download or private-note corpus scan occurred.

Independent final-head Standards/Spec reports are recorded separately. Coordinator
alone decides merge/closure; this branch does not change prerequisite state.

## Review fixes and latest-main integration

Independent Standards initially found unchecked retry-record task identity and cache
failure interruption; both were corrected with task-bound immutable-history readback,
failure-tolerant cache operations, actionable warnings, unit regressions and actual
browser quota-failure selection coverage. Spec found the inherited reader copy did
not expose pending work or fence completion; capture workspace/path/generation/key,
include copy/reload in the existing note-task pending boundary and retain the reload
candidate until a successful disk read. The delayed real create/leave callback test
passed and is preserved in `issue101-general-reviewed.log`. The native leave callback
was invoked in Chromium through its bridge shim; no native close event was injected.

A unit run during an overlapping rebuild observed mismatched generated/source bytes;
that failed receipt remains in `issue101-unit-final.log`. Sequential final packaging,
then the full suite passed 88/88 before integration and 90/90 after integration.
No product failure was waived. Repeated early diagnostic launches were redundant;
subsequent runs made concrete receiver, identity and behavior progress.

Fetched main advanced to `f39466dce449467620a7e08eacf3a1f9087c29b5` (PR #111).
Merge `8043c070dad5154e1eec3dfa6aa3bf8dde691cfb` preserves search and sync exports,
actual catalogue consumers and ownership documentation. No feature contract was
incompatible. Integrated Mac packaging, full units, synchronization, search source
navigation and catalogue checks passed. Both independent axes cleared implementation
head 8043c07 relative to latest main and original starting SHA. Their minor stale
search-ownership documentation finding was corrected; compressed naming/control flow
was accepted as a nonblocking maintainability observation consistent with surrounding
controllers, without broad unrelated reformatting.

See separate `standards-review.md` and `spec-review.md` reports. Exact final delivery
head confirmation is supplied to the coordinator alongside the PR; this report's
implementation SHA denotes the unchanged code packaged for the final evidence commit.

Raw failed-run output retains two whitespace-only lines in `logs/issue101-unit-final.log`
(lines 108 and 352); these are preserved evidence formatting, not source changes.
Source/document diff whitespace checks otherwise pass. Command logs are explicitly
tracked despite the repository's generic `*.log` ignore rule.

## Action integration continuation

The original delivery evidence above remains attributed to ac7651f and its prior
implementation heads. PR #112 was subsequently merged into main as 1ab961d; the
bounded existing-branch continuation integrates it without force-push and records
fresh targeted validation and source/package bindings in
[action-integration/README.md](action-integration/README.md). That report supersedes
the earlier latest-main/head binding for the current PR while retaining failures
and unchanged-source historical coverage. Coordinator postmerge checks are not
presumed passed by this worker's receipts.

## Favorites/capture integration continuation — merge hold retained

Main subsequently advanced through PR #114 to 7042d06. The bounded issue #101 merge,
fresh affected-layer receipts and final source/package bindings are recorded in
[favorites-integration/README.md](favorites-integration/README.md). That continuation
supersedes prior latest-main bindings for the current PR but preserves all historical
failure/evidence attribution. The coordinator-reported #94 Favorites pagination
failure remains owned by the original #94 worker; no #101 integration result lifts
the merge hold or claims that sibling defect resolved.

## Current status after delivered correction

Issue #116 / PR #117 merged as 2c7b9a0; the coordinator explicitly resolved the
previous global postmerge hold after resulting-main checks. The current bounded
integration and fresh own/focused Favorites evidence are in
[correction-integration/README.md](correction-integration/README.md). This supersedes
prior latest-base/hold dispositions without rewriting their historical failures.
The exact original intermittent browser cause remains unproven; readiness and the
separate deterministically reproduced stale-query defect are not conflated. PR #115
retains its own review/check gates and coordinator-only merge/close authority.
