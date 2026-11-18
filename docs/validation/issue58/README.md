# Issue #58 — notes-only global keyword search

Starting base: `ed3ae2617b3b705fa3b01f6ce4cc5b3608049320` (clean isolated Orca branch, also `origin/main` at start). GitHub native `blocked_by` was empty and the issue's textual blocker section was “None”. Parent #57 is the umbrella; #55/#59/#60/#61 were not implemented.

Reviewed implementation head: `9e696cba225e62ad8844a5e8195364627efde492`. The subsequent evidence commit changes documentation only. Native evidence includes the executing head and SHA-256 hashes of shipped frontend assets, copied into an isolated Cocoa/WKWebView bundle from the built application. The probe adds only a test command/snapshot channel; production bridge, storage and SQLite code execute unchanged against synthetic files and private indexes.

## Delivered behavior

A reserved shared application header opens compact single-column Notes search across home, library/reading, initiatives and action management. Command+K opens/refocuses, Escape restores the opener, and protected modals retain ownership. Original source content stays selectable; safe highlights never become executable HTML. Bordered excerpts define the exact copy range; expansion validates the current source fingerprint. Attribution is optional and uses the title plus workspace-relative path. Clipboard receipts follow the actual native operation.

Search uses the existing private reference index with 20-result pages and at most 900 characters per indexed excerpt. Versioned indexing removes frontmatter before passage extraction and upgrades older cache rows in the background. Title matches rank before body-only matches, then paths provide deterministic ordering. It is literal substring search, including Chinese/English mixed text; no meaning retrieval, extra entity scopes or source-open placeholder is advertised. Source navigation remains #60.

Lookup owns an incremental indexing loop separate from Library topic recovery so that search cannot repair or write confirmed topic records. Both loops use the same reference index/record format; maintaining two loops is an accepted low-priority maintenance risk. Index upserts preserve existing topic tags.

## Executed validation

- `npm run check` passed, including both new modules.
- `npm test` passed: 47 shared/domain/native-storage tests, including the new real Swift/SQLite search test. Covered long frontmatter, Chinese/English/mixed terms, duplicate titles, archive paths, hidden/credential/symlink exclusions, incremental zero-body-read warm reconciliation, changed-source rejection and foreign workspace rejection.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui` exercises all maintained application journeys. The new search journey uses real isolated files and the Swift SQLite harness through the real app controls/bridge; only races/errors and clipboard receipt injection are controlled. It covers early typing before workspace initialization, copy/attribution/failure, home/library/initiatives/actions, read-only failed-save note preservation, dismissed pending replies and 393px Tab boundaries.
- `npm run build:mac` passed. `npm run build:android` passed; this is build evidence only.
- `python3 tests/native-search.py` passed on the native app: OS-delivered Command+K and repeated invocation, Escape/opener restoration, Enter expansion, Command+Enter, forward/backward Tab wrapping, 393px layout, default/attributed clipboard readback through `pbpaste`, and native Command+C of manually selected source text. The probe seeds 373 synthetic notes, opens/closes/reopens during initial indexing and preserves the underlying page. These are actual OS shortcuts, not DOM-dispatched keyboard events.

The native test selects text through a DOM Range before sending native Command+C. It does not establish physical mouse-drag selection or real IME composition. Search controls remain normal native text inputs and selectable text surfaces; no claim of executed IME coverage is made.

## Controlled corpus timing

`SEARCH_CORPUS_NOTES=372 REVIEW_HEAD=<implementation-head> node tests/search-benchmark.mjs` creates 373 real isolated Markdown files (including the common fixture), matching the note count disclosed in parent #57. The 372 generated files total 1,761,420 bytes, plus the shared reference fixture. No private notes were read or published. This size-controlled corpus is less diverse than the private corpus and is not a claim of identical content distribution.

On Apple M4 / 16 GiB macOS, a fresh private SQLite index took 1006.24 ms with 373 body reads. Warm reconciliation took 453.45 ms with zero body reads. Six bounded cached queries took 7.11, 5.68, 5.27, 4.81, 11.59 and 15.52 ms. The event loop continued ticking during cold indexing (99 ticks, maximum 11.06 ms interval). These observations establish no latency guarantee. Native open/close during indexing and cached bounded results are verified separately from this process-level timing.

## Independent reviews

Standards: no blocking documented-standard violations; the result title now uses `selectionRow()`. One nonblocking heuristic remains: duplicated reconciliation structure, deliberately isolated from topic recovery.

Spec: no unresolved findings at the implementation head. Initialization, long-frontmatter leakage, queued index changes, focus after background refresh and disappearing sources were corrected and rereviewed. The coordinator owns any merge decision.

## Limitations and deferred checks

Android-specific runtime/device tests and standalone Syncthing tests are deferred by project policy; they are not passed checks. Physical mouse-drag selection, real IME input, device end-to-end checks and private-corpus relevance evaluation were not executed. Keyword ranking is intentionally limited to title priority and deterministic path order; matching is contiguous literal substring matching. Missing/changed context and copy failures preserve manual selectable text and provide refresh/retry feedback. Human review is recommended for interaction/relevance judgment, not required to resolve an unspecified implementation decision.

Reproduce with `tests/search.test.js`, `tests/search-ui.mjs`, `tests/native-search.py` and `tests/search-benchmark.mjs`. Raw local logs and generated native app/probe remain under `build/issue58*`; only synthetic evidence is committed here.
