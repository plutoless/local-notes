# Issue 71 validation

Starting SHA and fetched main: `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`. Live issue 71 had no native blockers, textual “None”, and no comments. Parent 63 and its comments were read. Issues 60, 67, 68 and 70 were closed and delivered on this base; 65 remained open. No ordering/archive policy from 65 is implemented. Existing source paths distinguish archived material without introducing a new archive classification.

## Scope and decisions

Organization opens on source selection. Titles and full source paths use the existing multi-selection presentation; directory and bounded title/body search query the existing private index with 50-row pages. Explicit selections persist across browsing and retain the 20-note cap. Query intent and workspace fences reject old responses; workspace changes clear selection/search/page/preview. AI setup uses the shared contextual drawer and task-scoped leave lifecycle. Device credentials remain private; cancel does not change saved credentials. A successful settings change invalidates the old request disclosure, requiring another explicit preview. Preview, send, cancellation, revalidation and individual candidate confirmation retain their existing boundaries.

Existing field/action/drawer and staged Organization contracts are reused. Privacy/request/source evidence is retained; configuration technical fields move to an explicit task. No new visual primitive, storage schema, source rewriting, automatic analysis or legacy-checkbox import is added.

## Executed evidence

Product head: `d49987acbe8ee22c9752993c11e5a5d831f1e455`. Later test/report-only commits preserve this exact web/native/probe tree; the delivery receipt records the final head and equality checks.

- `npm run check`: exit 0.
- `npm test`: exit 0, 67/67. Includes source revalidation, cancellation, immutable revisions, workspace isolation and derived-index rebuilds.
- `tests/organization-ui.mjs`: exit 0, explicit settings/preview/send, persisted candidate review and source return.
- `tests/organization-selection-ui.mjs`: exit 0, real Swift/SQLite adapter with 111 synthetic notes, bounded title/body search, directory/page, retained cap, deterministic delayed-response delivery, empty/error/retry, setup failure/keep/discard, desktop/393px and no AI sends.
- `npm run build:mac`: exit 0. Production resources match source and the isolated host resources byte-for-byte.
- `npm run build:android`: exit 0; development APK only, not Android runtime acceptance.
- `python3 tests/native-organization-selection.py`: exit 0. Actual Cocoa/WKWebView UI → bridge → private SQLite → isolated Markdown. With 110 synthetic notes, initial indexing read 110 bodies; search/filter/page added zero reads; explicit preview added exactly two selected reads. Source bytes remained unchanged and no candidates or network requests were created.

Native setup/navigation/selection actions are DOM-driven inside the real host. Escape is OS-injected through System Events and verified `isTrusted`; it opens the shared dirty leave decision. Deliberate discard is DOM-driven; focus restores to the setup opener. This is not physical keyboard or pointer coverage. Screenshots show the settled native desktop and 393px viewport; the latter is scrolled to the setup/preview context.

The coordinator granted an exclusive GUI lease after issue 69 released it. Initial and final input source was `com.tencent.inputmethod.wetype.pinyin`; no input-source selection occurred. Owned host PID 98020 was terminated and waited (exit -15) in `finally`; cleanup is recorded. The lease was explicitly released in coordinator message `msg_57e45e00426a`; no further GUI work is planned.

`integration/organization-selection/{preflight,result,cleanup}.json` bind the product head, all web assets, native sources, probe hash, trusted event and cleanup. `integration/package-bindings.json` additionally binds the production executable/APK, generated instrumented host source and host executable. Test instrumentation is confined to the isolated host; production assets and storage implementations are unchanged.

## Failed attempts retained

Initial browser invocation failed because Playwright was absent, then because its managed browser was absent. Installed Playwright locally without package/lockfile changes and used `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Initial selection test exposed an empty-directory default; corrected to all directories. The first full UI run stopped at a transient duplicate-title Library selector after moving a note; the isolated Library retry passed. The second full run stopped at Organization review's old Tab-order expectation (request details immediately after Preview); the new explicit setup button now precedes request details, so the scoped assertion was updated to check both controls. Full rerun results are recorded in the final delivery receipt. These failed runs are not represented as passes.

## Independent review

Original separate Standards and Spec reports, intermediate reports and product-head re-reviews are preserved in `reviews/`. Reviewer provenance is the independent `/root/standards` and `/root/spec` Codex subagents. Standards identified dirty exits, pending save ownership, shared field/footer placement, invalid field validation and pending inertness; all were resolved and re-reviewed. Spec identified task exits and a nondeterministic stale-query test barrier; both were resolved. Both product-head reports have zero unresolved findings. Accepted minor: direct generation increment at the existing screen/service seam avoids an unrelated lifecycle refactor; no behavior waiver is accepted.

## Limitations

Android runtime/SAF/device/keyboard and standalone Syncthing tests are deferred by parent 63 and repository policy, never passed. Physical input, clipboard, real online provider quality and permissioned private-note review were not run. No real notes or credentials were transmitted. This slice makes no new AI quality or latency guarantee. Human visual review is recommended for polish, not required to resolve a known functional finding; merge and issue closure remain coordinator-owned.
