# Issue #5 validation and review

## Scope and prerequisites

Starting base: `c86f083382887905f6e7d725b0e9f9ba21a146ad`.
Before implementation, the issue's native `blocked_by` API and body both named #3 and #4, both closed. Their merge commits `2dac6cafc2f739264153fcec7d84ab487652d1ac` and `c86f083382887905f6e7d725b0e9f9ba21a146ad` were verified as ancestors of origin/main, and the corresponding focus, topic, initiative and reference implementations were inspected. No blocker was implemented here.

All confirmed record types share revision graph recovery, including embedded links and focus positions. Immutable revisions preserve branches, including renamed and Syncthing conflict copies. Missing parents and cyclic histories remain incomplete/unresolvable until valid history is available. Conflict placeholders keep actions unfinished and preserve focus visibility; review displays full versions and permits selecting or editing a JSON merge. Resolutions validate the reviewed head set again inside the local write queue, then commit a new revision parenting all reviewed branches. Tombstones hide resolved deletions without pruning history. Native queues continue to serialize verified revision-first writes.

Native metadata stamps avoid rereading unchanged JSON; parsed records are cached and changed index rows update incrementally. Providers without useful modification times reread records. Directory traversal and ancestry analysis still walk the known collection; this is not a filesystem-watcher-only importer. Failed reads invalidate their stamps for retry. Individual collection failures retain cached content with incomplete status while unrelated collections remain writable. Unsupported/malformed files are reported and retained. SQLite remains private and rebuildable.

## Executed evidence

Production code head tested: `4d6069f6ca800ab7f57ddbd10b1f987fa66d0955`; the final validation commit only adds this report and makes the existing UI test wait for conflict-copy loading before navigating.

- `npm run check`, plus `node --check web/revision-graph.js` and `node --check web/sync-screen.js`: passed.
- `npm test`: 31 passed, 0 failed, including production Mac filesystem/SQLite adapter contracts and the 500-note/2,000-action corpus. Nine synchronization tests cover all three entity types, divergent revisions, delayed parents, duplicates/renamed copies, tombstones, rebuild, corrupt SQLite, stale reviewed heads, focus visibility, import-write failure, transient read retry, unavailable topic directory isolation and unsupported-type byte preservation. Existing tests exercise revision/current/index write failures and source independence.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all three existing suites passed with Chromium and production Mac storage. An initial run exposed the existing test navigating before conflict-copy load completed; the final test explicitly waits for that load. This checks shared UI and Mac adapters, not Cocoa/WKWebView interaction or Android.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/sync-ui.mjs`: passed. Full versions were displayed and an edited explicit resolution was persisted with both branch parents through production Mac storage.
- `npm run build:mac`: compiled and ad hoc signing passed.
- `npm run build:android`: APK build and signature verification passed; existing deprecated-API compiler note remains. This is a build, not Android runtime testing.

The shared test harness now compiles into per-process paths to avoid parallel Swift compilations replacing the executable another test process is about to spawn. Playwright was installed locally without changing dependency declarations.

## Native Mac limitation and deferrals

`python3 tests/native-focus-benchmark.py` was attempted. Its stale Swift compilation list initially omitted the reference modules; that list was corrected. The instrumented Cocoa/WKWebView process then failed to satisfy the benchmark's completion condition within 60 seconds and was terminated by the harness. No native startup timing, native interaction pass, one-second target, or native conflict-resolution acceptance is claimed. Local ignored artifacts retain the attempted benchmark inputs/logs under `build/native-startup*`.

Standalone Syncthing and Android-specific runtime tests are deferred by user decision under [validation policy](../agents/validation.md), never passed and not merge prerequisites. Actual two-device offline/reconnect convergence, physical-device SAF, restart recovery, keyboard behavior and Android interruption recovery were not executed. Local save and local resolution success do not verify remote receipt.

## Independent reviews

Separate Standards and Spec agents reviewed the diff against the starting SHA. Standards: zero remaining documented violations or material smell findings. Spec: zero remaining blocking findings or scope creep after fixes for reviewed-head races, import-write isolation, focused-conflict visibility, corrupt-index rebuilding, incremental reads/index updates, retry stamps, collection isolation and unsupported-file preservation. The Spec agent independently executed all nine synchronization regressions at the production code head.

Risk: medium to high because these changes affect authoritative recovery across two storage platforms. Human review of native failure paths and the technical JSON merge interface is recommended. Native startup remains an explicit validation limitation; deferred device/Syncthing checks remain deferred. The coordinator alone owns merging.
