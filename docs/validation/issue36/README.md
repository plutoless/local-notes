# Issue 36 local conflict review

## Scope and provenance

Original starting SHA and main at initial dispatch: `e8a869b42f396c2b9f3cf7e768aaa752ae4c448f`. Native blocked_by and textual dependencies were re-read before editing: #31 is closed and foundation `45c6b5acb284c8fb3a3e1b16849387e645d46052` is an ancestor of main. Issue #36 had no comments. No storage format, transport algorithm, source-note mutation, or adjacent page feature is introduced.

The focused panel reuses `ui-panel`, `ui-dialog`, `bindDialog`, `field`, `disclosure`, `selectionRow`, `feedback`, `sectionHeading`, and existing action variants. `comparisonRow` is the single demonstrated shared extension, documented and rendered in the catalogue. Storage remains owned by the existing repositories. A recovery-pending save retries its retained immutable record using the existing repository retry interface, with editing disabled until recovery completes.

## Content audit

| Existing content | Decision | Reason |
| --- | --- | --- |
| Local-only scope and remote receipt uncertainty | Retain | Local save does not prove delivery |
| Record titles, type, differing fields, source quotes, deletion/review decisions | Retain | Necessary decision evidence; user text remains unchanged |
| Full JSON, IDs, complete revision graph, raw failures | Keep in advanced/technical details | Available for diagnosis without replacing structured editing |
| Repeated record controls without context | Add record-specific selection names and record jump rows | Distinguishable navigation and keyboard access |
| Unsaved, missing-parent, cyclic, invalid-file and failure warnings | Retain | Prevent silent loss and explain next steps |
| Selection/editing instructions | Shorten to one staged hint | Select, review/edit and local save remain separate |
| Save success after recovery | Clarify | Distinguish restored local persistence from unresolved failure |
| Decorative slogans, unsupported safety/remote guarantees | Do not add | No useful evidence or action |

## Executed checks

Final source checks and artifacts are tied to the exact head by the delivery record in the PR; `after-native.json` also records hashes of every shipped web resource. Evidence-only commits do not change these resources.

- `npm run check`, explicit `node --check web/sync-screen.js`, shared `npm test` (45 tests), `npm run test:ui` (10 suites), and `npm run build:mac`.
- Chromium uses production Mac storage/SQLite adapters, synthetic local records and isolated private storage. Sync tests exercise all four record types, full histories, explicit multi-parent resolution, version selection and edit/save, invalid JSON retention, failed revision write/retry, partial index failure and recovery retry, malformed records, incomplete and cyclic histories, disabled controls, background refresh preserving resolution input, and failed refresh restoring controls.
- Browser keyboard checks cover Escape protection, Tab containment with inert sibling records, Shift+Tab containment, initial focus, focus restoration, close/reopen, record navigation and underlying task draft/scroll retention. At 393px, visible button heights are at least 44px and panel/page widths do not overflow. Long Chinese record names wrap. Shared catalogue checks verify semantic contrast: body 14.62:1, secondary 5.65:1, primary 6.25:1, boundary 4.28:1, focus 5.97:1.
- Actual Cocoa/WKWebView runs use `dev.localnotes.validation.issue36`, synthetic notes and separate synchronized/private directories under `build/native-issue36-*`. Unchanged shipped web resources run in a test-only native command/snapshot host. DOM input/click events go through `evaluateJavaScript`, rather than physical keyboard/pointer input. Before/after native snapshots and reports are retained here.
- Native journey: open review over a dirty action draft, select and edit a branch, block only the isolated fixture directory to force a real filesystem save failure, verify retained resolution, restore directory and retry, close to the unchanged task draft, verify four retained history entries and two resolution parents, restart the process and read back the saved resolution. Source note is unchanged. Only the probe's own process is terminated.
- Baseline Chromium replay against the starting SHA fails the new initial-focus assertion when opening review over a dirty task (`before.txt`); its screenshots were captured before that failure. The final-source replay passes.
- Baseline native report records `focusRestored: false`; after report records `true`. Shared dialog synchronous opener capture and the focusable sync opener fix the observed failure.

## Limits and risk

Android-specific tests/builds and standalone Syncthing transport remain deferred by user decision. No real notes, uploads, model services or paid calls were used. Physical native keyboard/pointer, two-device transport and physical device end-to-end behavior were not executed. Native events and snapshots demonstrate real WKWebView/filesystem behavior, not physical-input coverage. Remaining risk is integration with an actual cross-device arrival sequence; retained histories and current shared graph tests cover only local synthetic arrival/recovery. Human visual judgment remains appropriate; no product decision or external service setup is required for this slice.

## Review follow-up

Independent Standards review found no hard violations. Its minor suggestion to rename the native probe's short aliases is accepted without a rewrite: this test intentionally follows adjacent probe conventions, and descriptive production interfaces remain unchanged. Independent Spec review requested excluding all disabled field types from dialog focus traversal; the shared filter and an expanded-Advanced blocked-history Tab/Shift+Tab regression now cover that case. Each conflict article is also labeled with its record name. Save and Discard are disabled before version selection, with the selection prerequisite stated beside the editor. Visual QA found a background notice could cover the modal; the focused review now sits above notices, with a hit-test assertion for the close control and an additional narrow top snapshot.


## Combined-tree revalidation after PR #42

Latest main `c47ef1eb03b262afede3baeb850a6df2d57caeea` was fetched and merged with ordinary merge commit `c992743cd37d797c4d39bdf0ab51e98fdaf9a72b`. The only conflicts were additive sections in `docs/design/README.md` and `web/style.css`; both the organization and conflict-review sections were retained. The catalogue auto-merge retains both examples. Organization code and tests are unchanged from latest main; no extra feature work was performed.

The combined tree was revalidated with the complete shared test suite, all ten UI suites, syntax checks, Mac build, and the actual isolated issue36 WKWebView filesystem failure/retry/context/history/restart journey. Current `unit.txt`, `ui.txt`, `check.txt`, `mac.txt`, `native.txt`, `sync.txt`, `design.txt`, after screenshots and `after-native.json` supersede their initial-delivery counterparts. The native report hashes every current web resource, including the merged organization implementation. Before artifacts remain historical baseline evidence. `validation-source.json` records the merged production source head, latest-main base and original starting SHA.

Independent Standards and Spec reviews confirmed the merged source head against latest main, with no hard or blocking findings. The final evidence-only head also requires both exact-head confirmations, recorded in PR #43 and the coordinator handoff. Android/Syncthing deferrals, physical-input and two-device limitations above remain unchanged.
