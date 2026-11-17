# PR41 integration after delivered library/capture work

Original issue32 starting SHA: `45c6b5acb284c8fb3a3e1b16849387e645d46052`. This integration started from previously reviewed PR41 head `2ba567459f5c1639c41187af2f1761dc0004f743`. Current main / new comparison merge-base: `a563621fdfaeb2594e1c405f3a28607e074de05d` (PR40 / issue34, including the previously delivered issue33 workspace). Ordinary merge commit: `7a83872`. Previous integration evidence is valid only for its previous base; this directory records fresh combined-resource checks.

## Integration decisions

Only the adjacent additive blocks in `web/style.css` conflicted. Both issue32 action row selection/metadata and issue34 library/detail styling remain, alongside initiative workspace styles. Auto-merges retain sourceOrigin restoration, capture browse context, read-only note titles, library focus/scroll restoration, initiative context restoration and all issue32 action guards. No storage format, native writer or additional product feature changed.

The new library action-source regression initially used the former generic accessible name. Its two selectors now match the source-specific Chinese accessible name already delivered by issue32. This preserves distinguishable source controls without changing product behavior.

## Executed final combined checks

- `check.txt`: syntax checks passed.
- `shared.txt`: 45 freshly rerun shared tests passed, including durable revisions, local conflict/index repair, partial-write retry, workspace isolation, bounded queries and source independence.
- `ui.txt`: all ten UI scripts passed on combined resources after the selector correction. Includes action source changed/moved/unavailable and invalid quotation; action-source keyword/focus return; library browse/capture selection and scroll; initiative/source-note return and dirty save guards; failed navigation-query recovery; recovered drafts; local conflict/revision UI; keyboard, long Chinese, 393px, 44px and shared catalogue contrast coverage.
- `library-followup.txt`: targeted library suite passed after the selector correction. `ui-first-attempt.txt` retains the earlier timeout and is not counted as a pass.
- `mac-build.txt`: production Mac build passed with combined resources.
- `native-action.txt`: actual combined-resource WKWebView action integration passed using `ACTION_INTEGRATION_PHASE=library-integration python3 tests/native-action-integration.py`.
- `native-library.txt`: actual combined-resource library integration passed using `python3 tests/native-library-design.py`.

Both native bundles were byte-compared with every final shipped web file. `native-resource-hashes.json` and `native-library-resource-hashes.json` record all 17 hashes. Tests are scripted DOM events/evaluateJavaScript in actual Cocoa/WKWebView through the existing generated test-only command probe, not physical input/VoiceOver observations. No production bridge or storage source was modified for testing.

## Native journeys and evidence

Action app: distinct `dev.localnotes.validation.issue32libraryintegration` with only this worktree's `build/native-issue32-library-integration/Sync` and `Private`. It created an assigned action and saved it, then used a reversible immutable flag on only its current JSON to make Back fail. Exact text/assignment/private draft remained (`native-failed.json/png`). Removing the flag and retrying wrote the expected current JSON; return focused New action (`native-return.json`). An actual own-process restart read back exact description and assignment (`native-restart.json`), then Back from the reopened action focused its remembered context row (`native-existing-action-return.json`, `native-restarted-context.png`).

The expanded final-resource journey then added a validated source reference, opened the source from the standalone action filtered by keyword, and applied reversible write protection only to the sample source Markdown. A dirty source-note Back failed while the source editor and unsaved text remained (`native-source-failed-return.json`). After removing the flag, explicit Save wrote the exact text and Back restored action description, keyword and focus (`native-source-return.json`). Shell capture from that action saved and returned to it (`native-capture-return.json`, `native-source-capture-return.png`). Source checkboxes remained source content; no task import occurred. `native-storage.json` records sample source and action readback.

Library app: test-owned `dev.localnotes.validation.issue34` under only this worktree's `build/native-issue34/Sync` and `Private`. It saved a sample note, made only the sample root unavailable, verified failed Back retained dirty content, restored the root, retried, returned to the selected library row, restarted its own process, read back the note, and verified reading-mode checkbox writeback (`native-library-report.json`). Both native harnesses terminate only their own processes; all reversible file protections/root changes are restored in the successful runs.

Library/393px screenshots are isolated under `library/`. Other suites regenerate older evidence; those unrelated historical diffs are restored. Independent Standards/Spec confirmations cover the final evidence-inclusive head against the new latest-main base and are recorded in PR41/coordinator handoff.

Android-specific tests/builds and standalone Syncthing transport remain deferred by maintainer decision. No real notes, uploads or paid calls. Physical keyboard/IME/VoiceOver, power-loss and two-device transport are not claimed. Remaining presentation/navigation and unexecuted device coverage risk is disclosed; no product decision or known implementation blocker remains. Coordinator alone owns merge/closure.

A second full-suite attempt timed out at the initiative test's existing Working log library lookup (`ui-second-attempt.txt`). A targeted run with failure-only UI/query diagnostics passed unchanged (`initiative-diagnostic.txt`), so no diagnostic dump was triggered and no deterministic cause was established. This matches the historically recorded intermittent lookup timeout in the delivered issue33/issue34 evidence; it is preserved here as an uncertain test risk, not counted as a pass or silently retried as a product fix. The subsequent final complete suite result is recorded separately in `ui.txt`.
