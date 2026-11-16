# Issue 7 validation

## Scope and prerequisites

Starting/reviewed base: `2fb83ee677c7ba35ddd743ed7ee5e819fe3e5afc`. Before writing code, the current issue body and native GitHub `blocked_by` endpoint both identified #5 and #6, both closed. Their implementation commits `6d115c0a2068d52bf1c34d6f3befba15c158a44a` and `2fb83ee677c7ba35ddd743ed7ee5e819fe3e5afc` were verified as ancestors of freshly fetched origin/main. No blocker or other issue was implemented. Origin/main remained at the starting SHA during final validation.

The final source commit is `8b9d83cc52884fd93d3dbb99a0667c8db2f1e5ff`. Subsequent changes add this evidence document only. The PR and worker report identify the final reviewed and tested documentation-inclusive head; the local `build/issue7-validated-head` records that exact SHA.

## Behavior and persistence

Every candidate is reviewed separately. Edited confirmation, ignoring, keeping for later, reference classification and attaching to an existing initiative require explicit input. New initiative approval creates no summary, links or actions. Progress and relationship suggestions require separate approval against an explicitly selected existing initiative. Reference classification adds references to a selected initiative without creating an action. Non-initiative suggestions kept for later retain edited text and remain reviewable. New actions remain distinct even with similar wording and support multiple sources.

A candidate revision stores the decision, original source-fragment fingerprints, candidate type, original target-content fingerprint, approved-content fingerprint and complete pending target revision before the target is committed. New target identity is derived from candidate identity in a separate UUID namespace. Repeated clicks and recovery replay the same target revision; committed target history prevents replay from overwriting later user edits. Pending decisions remain visible and retryable. The final decision is committed only after target recovery succeeds. All data uses the existing synchronized revision path, not localStorage-only state.

Incoming intents validate decision/type/target consistency, complete target records, workspace identity, source-fingerprint structure, and creation versus existing-target association before replay. New actions/topics/initiatives cannot redirect approval onto arbitrary existing entities through forged parent arrays. Conflicting reviews and target branches remain in immutable history and use the existing Sync review surface; no arrival-time winner is selected. Repeated analysis checks conflict versions as well as ordinary candidates, preserving candidate identity during disagreement. Source renames do not defeat processed-candidate suppression. Changed fragments produce a new suggestion without reactivating ignored or completed content.

## Executed validation

- `npm run check`: syntax checks passed.
- `npm test`: 43 shared/Mac tests passed. Six review tests cover all decision types, edited content, multiple sources, initiative separation, later state and held progress/link behavior, source changes/unavailability, ignore and repeated analysis, changed-input eligibility, committed-intent interruption before and after target creation, repeated clicks, index deletion/recovery, completed-action preservation, imported malformed approval rejection, source rename suppression, and simulated divergent candidate/target histories. These use production Swift file/SQLite storage; simulated revision delivery is not a Syncthing service test.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all four existing browser regression suites passed, including organization wheel reachability, source opening, selection preservation and small layouts. Chromium results are separate from native results below.
- `npm run build:mac`: Swift compilation and ad hoc signing passed.
- `npm run build:android`: compilation, APK packaging/signature verification passed, with the existing deprecated-API compiler note. This is not an Android runtime test.
- `git diff --check`: passed.

Logs are retained locally as `build/issue7-final-{check,tests,ui,mac,android,native}.log`. Playwright was installed locally without changing package manifests after the initial browser run reported a missing dependency. Earlier targeted failures led to fixture fixes and regression corrections; they are not counted as successful checks.

## Actual native Mac flow

`python3 tests/native-candidate-review.py` builds an isolated Cocoa/WKWebView app from production Swift sources and current web assets. Generated test-only instrumentation provides a command/result channel; it does not replace the native storage or URLSession bridge. Test roots, private data and bundle identity are isolated from user notes. A controlled loopback HTTP service receives only the explicitly selected synthetic source and verifies synthetic native Bearer authentication. No external provider is contacted.

The native run selected a source, configured the controlled service, previewed without a request, explicitly analyzed it and displayed eight evidence-backed suggestions. It edited and confirmed an initiative and action, ignored an action, created a Later initiative, classified a source as reference without an action, attached an action, approved progress separately and confirmed a topic. The resulting edited action and initiative appeared in their native collection screens. The harness then terminated the process, deleted the private SQLite workspace index, rebuilt/re-signed the app and relaunched it: the same eight decisions recovered as done, with no new analysis or duplicate entities. All eight decisions used actual WKWebView UI handlers; that portion is programmatic UI interaction, not a claim of pointer input.

Additional Orca native computer-use checks used actual wheel events, coordinate clicks and keyboard entry at default `1180×832` and smaller `640×580` outer window sizes. They reached review controls, edited suggestions and confirmed them, then verified the persisted edited action. The original evidence opened via a coordinate source-button click and its bytes remained unchanged. Screenshots were visually inspected, and geometry checks found no document horizontal overflow. A scoped CSS rule keeps the destination selector and textarea within the organization column. The first small-window harness attempt overshot a target because it used full-page wheel increments; smaller increments completed the check. No product scrolling workaround was applied.

Native artifacts: `build/native-issue7/report.json`, `decisions.json`, `request.json`, `pointer-report.json`, `pointer-*.json`, `pointer-small-*.json`, `pointer-open-source.json`, app logs and screenshot paths recorded in those JSON files. The pointer helper is retained locally as `build/native-review-pointer*.py`. Earlier native runs remain in `build/native-issue7-initial/` and `build/native-issue7-intermediate/`. Synthetic sources and credentials only were used.

## Separate reviews

Standards review of `2fb83ee...8b9d83c`: zero documented-standard violations and zero remaining blocking correctness findings. Initial later-routing and imported-association findings were corrected and regression-tested. One optional heuristic remains: extracting pure target planning from the decision method could simplify inspection. It is accepted as nonblocking to avoid another structural change after validating this scoped decision matrix.

Spec review of the same exact source diff: zero remaining material findings and no unrelated scope. Initial findings about deferred mutations, lost held edits and rename suppression were corrected. Both reviewers explicitly distinguished their read-only review from execution evidence. The documentation-inclusive final head is rechecked separately before delivery; no earlier review is silently represented as covering later code.

## Deferred checks and risk

Android-specific runtime, physical-device SAF/offline/restart/keyboard tests and standalone Syncthing tests are **deferred by explicit user decision**, not passed and not merge prerequisites under [repository policy](../agents/validation.md). Live two-device transfer and conflict resolution were not executed. Shared conflict simulations and Mac restart/rebuild checks do not establish Android or real synchronization behavior. External provider compatibility is unrun.

Risk is medium: candidate and target are separate recoverable commits, and divergent offline reviews may require explicit Sync review resolution. Evidence fingerprints establish input provenance, not factual truth or current relevance. Existing FNV fingerprints and revision validation conventions remain in use. No concrete unresolved blocker requires human review; optional human inspection is useful for the recovery and conflict decision matrix. The coordinator alone owns conditional merging.
