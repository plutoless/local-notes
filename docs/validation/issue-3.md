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

Warm populated startup met the one-second target in this measured shared-UI/production-storage configuration. Cold population exceeded one second because of the deliberate one-second background scheduling delay plus reading/validating 4,000 action current/revision JSON files twice (action and initiative collection recovery), yielding between batches and rebuilding SQLite. Home controls remain available during that work. The benchmark waits for delayed recovery and counts background bridge work; it does not omit background Markdown reads. Zero body reads follows both the observed absence of `list`/`read` commands and the native `actionFiles` implementation reading only managed JSON. Actual WKWebView startup latency and Android interaction timings have not been measured; no native startup target or Android performance acceptance is claimed.

## Review and limitations

Independent Standards and Spec reviews compared the feature with the starting SHA. Initial Standards findings about interrupted Android schema migration and failed background recovery permitting stale saves were fixed with transactional/repairable migrations and retry-required recovery. Initial Spec findings about draft-blocked home population, retained waiting-list filters, and suppressed manual recovery warnings were fixed and covered by UI regressions. Final review results and reviewed head SHA are recorded in the PR.

Residual risk is moderate: additive record/query schema changes and asynchronous recovery affect startup and editing. Shared automated regression coverage, production Mac adapter tests and native Mac smoke reduce this risk. A human review of the UX and persistence changes is recommended before the coordinator decides whether to merge; no new product decision is required.

Android physical-device/SAF/offline/restart/keyboard interactions and actual Android timings were not run and are **deferred by user decision** under [the validation policy](../agents/validation.md). Standalone Syncthing transport, divergent edits and physical-device synchronization were not run and are deferred under the same policy. These deferrals do not block merging and are not reported as passed. General network connectivity was not disabled during the native Mac smoke; offline behavior here means local storage paths and no AI/network dependency, not a separately executed network-disconnection test. No complete physical-device end-to-end acceptance is claimed.
