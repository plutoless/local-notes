# Issue #3: Current Focus home

## Scope and prerequisite verification

Starting/base SHA: `65e3b5b42ce1eda0e908c832c0167147e728fd73`.

Before writing code, issue #3's current acceptance criteria and native `blocked_by` API were read. Both native dependencies and its **Blocked by** section listed #1 and #2, both closed. `git merge-base --is-ancestor` verified prerequisite merge commits `791555dff9e0e95b96020277c2fa6ed300a67024` and `65e3b5b42ce1eda0e908c832c0167147e728fd73` on fetched `origin/main`. Their independent action and initiative repositories, revision-first persistence, native SQLite adapters and shared editors were inspected. No prerequisite or other issue was implemented implicitly. The current `origin/main:docs/agents/validation.md` was read before implementation.

## Implementation

The shared Mac/Android frontend defaults to Current Focus. It directly queries bounded SQLite pages for explicitly selected actions, waiting actions and active initiative progress, without opening note bodies or calling AI. The initial seven focused actions expand to additional bounded pages. Waiting overflow opens the action list with unrelated filters and offsets cleared. Initiative progress opens the existing initiative details; completed/canceled actions remain accessible through the status filter and initiative history sections.

`focusPosition` is an optional numeric field on the existing action record, not a copy of that action or a localStorage selection. Add/remove and reordering write full immutable action revisions using the existing synchronized storage contract. Reordering changes one action's position between its neighbors. Entering Waiting, Completed or Canceled clears selection, so reopening does not restore it. Equal positions have deterministic ID ordering; exhausted floating-point spacing reports an error and asks the user to remove/add the action, rather than silently changing another record. This feature does not implement cross-device conflict resolution from later slices.

Warm startup queries an existing index before scheduling recovery. With no index, an empty rebuildable index permits initial navigation and creation while background recovery displays progress and populates confirmed summaries. Cached writes require successful recovery before extending a revision. Background and manual refresh surface recovery warnings. Recovery still reads synchronized JSON/current revision files (once per collection), not Markdown bodies; this is not an incremental JSON-import implementation. Existing full-body library scanning remains confined to the Notes/Favorites path and is suppressed on home.

Recovered action/initiative drafts remain intact while users navigate home. They are not automatically saved merely by entering their corresponding list after restart; explicit edits, saving or opening another editor use the existing flush behavior. No old checkboxes are imported. Creation entry points work without an AI connection; organization explicitly states that AI is not connected.

## Executed validation

- `npm run check`: all shared domain/UI modules pass syntax checks.
- `npm test`: 20 tests pass using the production Swift filesystem/SQLite adapter. New coverage includes explicit selection/order, same action ID across entry points, initiative and ID filtering, status transitions and reopening, index removal/rebuild, cached warm queries without record scans, failed cached recovery preventing stale writes, and legacy/partially migrated Mac SQLite schema recovery.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all three suites pass. The new suite covers default home, empty creation/AI availability, selection/restart, waiting conditions without false overdue, reopening, first seven/expand, reorder/remove, recovered drafts alongside cold index rebuilding, saved initiative progress/navigation, waiting overflow after unrelated search/initiative filtering, malformed-file warnings and a 393-pixel layout. It asserts zero note-body reads throughout. Existing action, initiative, note-draft/conflict and workspace-switching suites pass. These are Chromium interactions backed by production Mac storage, not Android runtime results.
- `npm run build:mac`: passed; ad hoc signed Cocoa/WKWebView app produced.
- `npm run build:android`: passed; development APK produced and signature verified. The existing deprecated API compiler note remains. This is a build result, not an Android-specific runtime test.
- Native Mac smoke: launched an isolated copied app with unique bundle ID `dev.localnotes.validation.issue3`, unchanged production executable/web assets and worktree-local test sync/private roots. Created and saved `Native chosen next step`, added it to Current Focus, and visually verified it on home. Stopped the test app, removed only its test SQLite indexes, relaunched the final application code, and verified its same saved action appeared in Current Focus after recovery. Removed it through the native home button and verified `focusPosition: null` in the authoritative action record. Test processes were stopped. Accessibility snapshots sometimes omitted freshly inserted content; screenshots and authoritative files supplied verification. Other native Mac permutations were not manually repeated.

## Fixed synthetic startup benchmark

Command: `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/focus-benchmark.mjs`.

Reference computer: MacBook Pro `Mac16,1`, Apple M4, 16 GB RAM. Fixed corpus: exactly 500 synthetic Markdown notes with historical checklists and 2,000 confirmed actions, deterministic entity IDs/content and ten explicitly focused actions. Timing starts immediately before page navigation, after fixture generation and Swift harness compilation. It includes frontend navigation, bridge messages and production Mac file/SQLite queries. Browser process launch, Cocoa shell/WKWebView launch and app installation are excluded.

| Run | Home controls interactive | Confirmed home populated | Markdown body reads including background | JSON recovery scans |
| --- | ---: | ---: | ---: | ---: |
| Cold (action index absent) | 90 ms | 2,930 ms | 0 | 2 |
| Warm 1 | 82 ms | 83 ms | 0 | 2 |
| Warm 2 | 53 ms | 55 ms | 0 | 2 |
| Warm 3 | 64 ms | 66 ms | 0 | 2 |

Warm populated startup met the one-second target in this measured shared-UI/production-storage configuration. Cold population exceeded one second because of the deliberate one-second background scheduling delay plus reading/validating 4,000 action current/revision JSON files twice (action and initiative collection recovery), yielding between batches and rebuilding SQLite. Home controls remain available during that work. The benchmark waits for delayed recovery and counts background bridge work; it does not omit background Markdown reads. Zero body reads follows both the observed absence of `list`/`read` commands and the native `actionFiles` implementation reading only managed JSON. At this initial measurement, actual WKWebView startup latency had not been measured. The native follow-up below supplies that missing evidence; Android interaction timings remain deferred and no Android performance acceptance is claimed.

## Native Mac startup follow-up

Command: `python3 tests/native-focus-benchmark.py`. The script preserves evidence in `build/native-startup/` and refuses to overwrite an existing run; move that directory aside before repeating. The sanitized raw results and production-source hashes are committed in [issue-3-native-startup.json](issue-3-native-startup.json).

Reference Mac: MacBook Pro `Mac16,1`, Apple M4, 16 GB RAM, macOS 26.5.2. The fixed corpus uses the same 500 Markdown note bodies and 2,000 action descriptions/statuses/positions as the earlier benchmark, with deterministic IDs, ten selected focus actions, waiting conditions and no initiatives. Both current records and immutable revisions exist. The corpus manifest SHA-256 is `fc56aa4707fb72133f665850e8fc9f14a6cf143533db0fd6c079c11e867375c1`.

The measured application uses the production Cocoa shell, WKWebView, native message bridge, file storage, SQLite adapters and byte-identical production web assets from feature head `ce9d905a44d65aaef416f9c2117877aab072c6cf`. The test builds a separate copied app with bundle ID `dev.localnotes.validation.native-startup`. It generates a Swift source copy that adds a telemetry-only WK script handler, a document-start readiness observer, and counters at the actual native Markdown body-read sites. The production sources and behavior are not edited. The resulting binary is instrumented, not byte-identical to the shipping binary; telemetry, 10-ms polling and two animation frames add measurement overhead. Test roots/private indexes are isolated beneath this worktree's ignored build directory. Each run exits its own native app after collecting evidence.

Timing boundaries:

- Start: the native launcher captures `DispatchTime.now().uptimeNanoseconds` immediately before `Process.run()` starts a new app executable. Launcher compilation, fixture generation, Mac build and signing occur before the timestamp. This includes process creation/loading, Cocoa application startup, window creation, WKWebView initialization/content-process startup, asset loading and native bridge work. It excludes Finder/LaunchServices dispatch, installation and pre-launch user interaction.
- Interactive: the real home has all three sections and a visible, enabled Organize button; the observer invokes that button's existing handler and verifies its actual availability notice. The native telemetry handler receives the marker after two `requestAnimationFrame` callbacks. This checks handler responsiveness in the real WKWebView, using a synthetic DOM click; it does not measure physical mouse/keyboard latency or pixel-to-photon display latency.
- Home populated: the first seven focused headings equal `Synthetic action 0` through `Synthetic action 6`, and the waiting section contains its bounded first 50 rows. The native marker again follows two animation frames. There are no active initiatives in this fixture, so Continue Working correctly displays its empty state.
- Cold: both action and initiative SQLite indexes are absent before a fresh native app process. Warm: a fresh native app process uses the same corpus and existing recovered indexes from the preceding run. OS filesystem caches and WebKit disk caches are not flushed; this is index-cold startup, not a reboot or uncached-disk experiment.
- Read-count observation continues through both background recoveries, at least two seconds after the initiative index reports ready and at least six seconds after document-start observation. Native successful `list`/`read` Markdown body loads from the selected corpus are counted at their I/O sites, not inferred solely from request counts. Counts exclude JavaScript/CSS/HTML assets, workspace metadata, JSON records, SQLite pages and any unrelated/bundled sample-file copying. No note save/move operations occur in this benchmark.

| Final run | Native home interactive | Native home populated | Corpus Markdown bodies read through background completion | Managed-JSON recovery scans | Observation ended |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold | 1,195.48 ms | 3,978.35 ms | 0 | 2 | 7,078.36 ms |
| Warm 1 | 350.43 ms | 350.47 ms | 0 | 2 | 6,241.76 ms |
| Warm 2 | 381.66 ms | 381.70 ms | 0 | 2 | 6,281.48 ms |
| Warm 3 | 391.19 ms | 391.24 ms | 0 | 2 | 6,282.57 ms |

An earlier complete native sequence measured cold interactive/populated at 1,879.60/4,687.33 ms and warm populated at 513.34/357.51/401.07 ms. It is retained locally in `build/native-startup-initial/`; the final sequence above uses the committed harness with sanitized machine metadata, explicit zero-body counters, source hashes and timeout process-group cleanup. The variation demonstrates why the results are observations on this Mac rather than a general startup guarantee.

The native warm interactive and populated home both met the one-second target in all six observed warm launches. Cold startup did not meet one second: Cocoa/WebKit process startup precedes home controls, and populated data additionally waits for the intentional one-second background delay plus two full managed-JSON scans, validation/yielding and SQLite rebuilding. These contributors are identified from the execution path; no profiler attribution or per-stage timing breakdown was performed. The earlier Chrome benchmark alone did not establish the native launch criterion; this follow-up closes that validation gap under the timing boundaries above. No application optimization was made in this validation-only follow-up.

## Review and limitations

Independent Standards and Spec reviews compared the feature with the starting SHA. Initial Standards findings about interrupted Android schema migration and failed background recovery permitting stale saves were fixed with transactional/repairable migrations and retry-required recovery. Initial Spec findings about draft-blocked home population, retained waiting-list filters, and suppressed manual recovery warnings were fixed and covered by UI regressions. Final review results and reviewed head SHA are recorded in the PR.

Residual risk is moderate: additive record/query schema changes and asynchronous recovery affect startup and editing. Shared automated regression coverage, production Mac adapter tests and native Mac smoke reduce this risk. A human review of the UX and persistence changes is recommended before the coordinator decides whether to merge; no new product decision is required.

Android physical-device/SAF/offline/restart/keyboard interactions and actual Android timings were not run and are **deferred by user decision** under [the validation policy](../agents/validation.md). Standalone Syncthing transport, divergent edits and physical-device synchronization were not run and are deferred under the same policy. These deferrals do not block merging and are not reported as passed. General network connectivity was not disabled during the native Mac smoke; offline behavior here means local storage paths and no AI/network dependency, not a separately executed network-disconnection test. No complete physical-device end-to-end acceptance is claimed.
