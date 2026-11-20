# Issue #84 validation

Starting/base SHA: `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3`.
The live native dependency and written blocker both identify #81, closed with merged PR #88 already in this base. Initial open PR inspection found no overlapping focus slice. Only issue #84 is implemented.

## Inventory and changes

| Journey/state | Baseline | Delivered treatment/evidence |
| --- | --- | --- |
| Pointer / Command+K / repeat | Native modal, repeated input refocus | Retained; search UI and native journey |
| Input / IME | Existing composition Escape ownership | Retained; maintained deterministic tests plus native IME required |
| Scopes | Pressed fill separate from focus | Existing shared focus-visible retained |
| Arrow result selection / expansion | Selected title fill, input retains caret | Retained; no competing result-container frame |
| Selected result + focused child | Shared child focus-visible | Retained, representative screenshots |
| Attribution | Small checkbox indicator | Shared composite label owns a single keyboard outline; checked fill separate |
| Refresh while choosing a field | Late refresh steals focus | Regression fails at baseline and passes after fix |
| Copy | Grounded passage, optional provenance, truthful failure | Real UI/Swift storage harness and native clipboard readback |
| Source / return / close | Stable continuation, protected leave guard, opener restoration | Maintained all-origin/destination and draft journey coverage |
| Invalid + focused | Search has no invalid field | Not applicable; errors retain existing status/retry policy |

`tests/search-focus-journey.js` captures matching 1180×800, 393×760, 1180×480 and 393×480 before/after screenshots with synthetic long Chinese labels. Captures exercise real rendered controls using browser input; they are not native or physical-input evidence. The helper checks no horizontal page overflow, 44px targets and no outlined ancestor around focused child actions. The baseline capture runs with `SEARCH_FOCUS_PHASE=before`, serving the starting SHA search module and stylesheet through the same bridge/storage fixture; the regression is enabled for the ordinary after run. Browser bridge tests use an isolated real Swift storage/index fixture; clipboard success/failure is controlled in browser tests and read from the actual pasteboard in native testing.

## Validation boundaries

Android runtime/device and standalone Syncthing are deferred by issue/user policy, never passed. Physical human input, external paste destinations, other IMEs and complete cross-device E2E are unrun. No private source or model download is involved. Platform builds are separate from runtime acceptance. See command receipts, native transcript/source bindings and review reports supplied with the final delivery for exact head attribution.

## Initial review resolution

Independent Standards review of `6d73157` found cleanup could skip pasteboard restoration if process termination failed, and raw JSON byte equality could falsely reject a restored pasteboard. Cleanup now uses nested finalizers and parsed data equality, with input-source restoration and process wait/absence checks.

Independent Spec review found clipped child-action outlines and checked screenshots that retained focus on Copy at later sizes. Child actions now use the shared inward offset; every size resets the checkbox and navigates back by keyboard before asserting exactly one label cue. The checkbox has scroll margin so its composite label can remain visible at the dialog edge. Both axes passed re-review at `39732fe`; subsequent source-opener and probe changes require another final-head review.

Initial `npm test` passed 67/67; syntax checks and Mac/Android builds passed. The first full UI run stopped in the unrelated remaining-forms journey at the recovered-capture Create control; a concurrent standalone attempt failed a Tab-return assertion. An isolated rerun passed, as did the same test in an archive of the starting SHA, and all later maintained journeys passed when executed separately. These attempts are retained as failures, not silently counted as full-suite success; the final-head full-suite rerun at `39732fe` passed all maintained journeys, with all five validation commands exiting zero. The later source-opener fix requires fresh head-bound receipts.

## Native investigation and remaining gate

The original Task/Dispatch received an explicit exclusive lease, verified against the coordinator-owned lease JSON before any activation. Eight isolated owned processes exited with `-15`, were waited for and independently verified absent; every attempt restored the binary pasteboard item/type/data representations and original `com.tencent.inputmethod.wetype.pinyin` source. Synthetic `source.md` stayed unchanged with SHA256 `2458230be1ea7566a5f33d53bf6e55683dc73167572c8a9e856fe6586ee37a4c`. See `native-cleanup.json` for exact PIDs, receipt hashes and explicit release.

Native attempt 7 delivered OS pointer input, Command+K/repeat, Latin text, arrows, expansion, Command+Enter, exact pasteboard readback, source opening and return. It failed the expected source-control focus restoration: the shared action disabled itself before `openSource()` captured `document.activeElement`. The implementation now retains the actual source button and the maintained real-storage journey asserts its restoration for all origin/destination pairs at desktop and 393px. This is a native-discovered product defect with a browser-verified fix; fresh native acceptance of the fix is still required.

Other attempts are setup failures, not product acceptance. A process sample identified AppKit's correction panel intercepting events while the default inspection timer paused; the test-only timer now uses common modes without changing production behavior or OS preferences. Independent sender diagnostics also observed an unowned frontmost Lark PID while the owned CGWindow existed, and the newest attempt stopped at an inactive/keyless owned-host guard before its first pointer injection. The GUI lease was explicitly released with cleanup receipts. No permission resets or interaction with the unowned app occurred.

Actual WeType composition/source-return validation has not yet executed for this delivery. A fresh exclusive lease and idle desktop interval are needed. Physical input, Android runtime/device, standalone Syncthing and complete cross-device E2E remain unrun/deferred as described above. The PR must not claim full acceptance or close #84 until the native gate is satisfied.

### Native receipt provenance clarification

All eight native attempt receipts record Git HEAD `39732fecfcd511e3297a51b10848eddc22bec3de`. Attempt 8 ran with the source-opener correction still uncommitted; that correction was subsequently committed as `9d0eff1`. Its runtime source and packaged-resource hashes are equal and also match the later committed production assets, but this byte binding is not current-head native execution or acceptance. Attempt 8 stopped before the first pointer input. No native run establishes acceptance of `9d0eff1`, `8b87a36`, or a later evidence/integration head. The coordinator independently verified all eight receipt hashes and owned PID absence, accepted explicit GUI release, and requeued this original claim without a new GUI grant.
