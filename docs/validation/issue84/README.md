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

Independent Spec review found clipped child-action outlines and checked screenshots that retained focus on Copy at later sizes. Child actions now use the shared inward offset; every size resets the checkbox and navigates back by keyboard before asserting exactly one label cue. The checkbox has scroll margin so its composite label can remain visible at the dialog edge. Both axes require final-head re-review after native evidence.

Initial `npm test` passed 67/67; syntax checks and Mac/Android builds passed. The first full UI run stopped in the unrelated remaining-forms journey at the recovered-capture Create control; a concurrent standalone attempt failed a Tab-return assertion. An isolated rerun passed, as did the same test in an archive of the starting SHA, and all later maintained journeys passed when executed separately. These attempts are retained as failures, not silently counted as full-suite success; a final-head full-suite rerun is still required.
