# Issue 65 layered completion

The current maintainer-approved policy in `docs/agents/validation.md` supersedes the historical blanket native replay gate recorded in the earlier issue65 reports. Historical failures, source bindings and receipts remain unchanged. The production native host/bridge transport is unchanged by this follow-up; ordinary native OS keyboard/IME/clipboard compatibility is release-deferred, not passed. Android-specific and standalone Syncthing tests remain deferred. No optional native executor work or replay was performed.

## Recovery and custody

Run `run_4c9f8d25f80d`, Task `task_b7e2e361381e`, recovered Dispatch `ctx_6f099a8bc2f0`; local starting SHA `c8054aabec0841bca04789a6a9513b8f6bcac8a6` includes previously prepared diagnostics commits `0323d84` and `c8054aa` above published PR75 head `08695d49b01029989dc003c624ea2ca9a30e6377`. Fetched main `e2026da2dfec24027e6f99fe6577a1e02d078e80` integrated cleanly in `4da4b66f02fce2b8dcfe5e805a73d3bdc1928351`, including the owner-delivered issue105 fix; no sibling implementation was copied or authored here. Issue64 is closed and its implementation is an ancestor of main.

`../integration/gui-release.json` records historical PID64909 wait/exit, absence of owned windows, input/clipboard restoration and deleted private baseline. Recovered-dispatch `ps -p 64909,65008` and executable-name `pgrep` produced no matches. The stopped repair's build-only receipt records no native launch; its build root contains no private baseline snapshot. This is historical restoration plus fresh process/no-launch evidence, not fresh GUI/window/clipboard inspection. Coordinator received cleanup `msg_c311419bc976` and confirmed release in `msg_8b709025806b`. This dispatch performed no native app launch/activation, GUI discovery, OS input, input-source or clipboard operation.

## Layers selected by risk

- Unit: `tests/library-policy.test.js` exercises the public conservative archive classifier and source summary contract, including misleading prose/frontmatter and exact directory components.
- Integration: `tests/library.test.js` exercises real Swift SQLite pagination/order/filter composition, Topic revision invalidation, bounded body-free queries, warm/cold reads, rebuild and immutable record recovery. Existing useful tests are retained rather than mirrored in UI.
- Essential UI: `tests/library-browse-journey.mjs` loads actual production assets in headless Chromium with an isolated real Swift storage/SQLite adapter behind the existing bridge request/reply shape. One 122-source corpus demonstrates current-first results, archive/title controls, two duplicate-free archive pages, keyboard disabled-next handoff, actual reading/open/return, page/control/selection/both-scroll/focus preservation at desktop and narrow widths, reload and direct persisted index readback. Source bytes and all formal record directories are checked unchanged. Native transport, custom-scheme and OS input integration are not exercised.
- Packaging: `npm run build:mac` verifies integrated shipped assets; hash bindings compare production web assets with the package. Historical Android build is reused for unchanged Android code; no Android-specific tests were run.

Only affected checks were selected: no broad shared renderer/state implementation was added by this follow-up, so a full UI replay is unnecessary. Historical full shared/browser suites, timing probes and Android packaging remain historical evidence at their recorded heads, not freshly revalidated passes. The new focused browser receipt is not evidence of saved edits; this is a read-only Library journey.

## Continuing repair-cycle record

The previous native prepared cycle in `../repair/README.md` remains prepared/unexecuted; its unknown combined-guard term remains unknown. No native reproduction cycles or counters were reset.

| Completed cycle | Signature / hypothesis | Correction and targeted command | Result |
| --- | --- | --- | --- |
| Layered 1 | First row reference.md before initial full index; test settled on initial idle rendering | Wait for complete 122-source indexed count; `CHROME_PATH=... node tests/library-browse-journey.mjs` | Advanced through keyboard, paging and both viewport returns; exposed reload assertion against stale 122 count; retained `browser-attempt1-startup.txt` |
| Layered 2 | Reload archive selection asserted while old 50-row render still present | Wait for count 61 and 50 rows after reload; same command | Exposed earlier first-page capture against stale current rows on a faster run; retained `browser-attempt2-reload.txt` |
| Layered 3 | First archive page captured current rows before asynchronous filter query returned | Wait for exact archive total and page range before capture; same command | Targeted wait corrected; retained `browser-attempt3-filter.txt` |

Each failure made diagnostic progress and corrected observable test synchronization; none established a product defect. There are no two consecutive completed no-progress cycles with the same signature. The successful command output and browser receipt are adjacent.

Final outcomes: `npm run check` passed; `node --test tests/library-policy.test.js tests/library.test.js` passed 7 tests; focused browser journey passed after the preserved synchronization failures; `npm run build:mac` passed. `provenance.json` binds source/test hashes and packaged resources; no production code changed after validation. The validated merge code head is recorded there; subsequent commits contain tests/evidence only. Final-head independent review reports are recorded alongside this file.
