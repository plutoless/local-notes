# Issue 81 validation and incomplete delivery

## Scope and starting state

Starting/fetched main SHA: `36be0ae2da853a2a1cb004f9a27cf6769b788dd6`.
GitHub issue #81 was open with no comments, no native blocking dependencies and textual “None - can start immediately”. Current Focus, sidebar, Library/Favorites, Initiative/Action rows, disclosures and pagination were available on that main. No storage/schema changes or implementation of #82–#86 is included.

The implementation retains native focus-visible modality, makes scrollable row cues inset, removes doubled checkbox label/child cues, enables Mac button/link Tab navigation, preserves stable row/disclosure identity during rerenders, and preserves both collection/list scroll on return. Paging boundaries move keyboard position to the enabled opposite direction. It does not blur controls or remove task guards.

## Executed checks

- `npm run check`: passed.
- `npm test`: 67 passed, zero failed.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: all 22 maintained journeys passed after updating the Focus suite to expect retained disclosure expansion.
- `tests/browse-focus-ui.mjs`: passed with isolated production Swift storage/index adapter. Covers pointer/keyboard/return in Focus, Library and Favorites; selected/current row state; Initiative/Action opening; Library/Action paging boundary focus; a held query with retained row identity and newly chosen list scroll; duplicate action descriptions with independent disclosure state/focus; desktop, 393px and reduced height screenshots. Original source bytes remain unchanged.
- `tests/design-catalogue-ui.mjs`: passed; selected-plus-focused row inset, checkbox pointer/keyboard transition with one parent cue, invalid focused field, target sizes, narrow geometry, reduced motion and contrast. Minimum focus contrast across tested surfaces: 4.98:1; interactive boundary: 3.57:1.
- Mac build: passed. Android build: passed; this establishes packaging only.

These checks were executed during development; exact final head and repeat receipts belong to the PR report. They do not establish physical input or native acceptance.

## Native execution: acceptance NOT passed

The coordinator granted an exclusive GUI/input window before OS input. All hosts used isolated synthetic roots/private storage and unique application identities. Baseline `before/` includes actual process-targeted Orca input receipts and observed trusted pointerdown/keydown/click events, screenshots at 1180×800, 393×852 and 800×400, and partial open/return states. The initial baseline had incomplete synthetic Initiative setup attempts, which were corrected; later baseline Tab/open steps remained incomplete. The baseline's packaged web hashes match the starting SHA (see artifact manifest). Baseline screenshots are partial evidence, not a passing full journey.

Rebuilt `after/` hosts repeatedly produced an Orca `permission_denied` response: a visible OS window existed for the exact PID, but the provider could not read an AX window. Accessibility/screenshots grants were independently reported as granted; a grant does not establish that this host exposes an AX window. Exact PID/window inventory, get-app-state errors and document focus observations are preserved in `after/transcript.json`.

The bounded `diagnose/` comparison omitted the new Tab preference in its generated test host and encountered the same provider route failure. This does not establish the preference as the cause. `quartz/` tried process-targeted Quartz CGEvent input after coordinator authorization. Native Cocoa diagnostics reported `visible=true`, `active=false`, `key=false`, `occluded=true`; the WebView reported `document.hasFocus()=false` and visibility `hidden`. Key injection changed some DOM state, but the host was not visibly focused and row opening failed. Those screenshots and events are diagnostic evidence only. No native after PASS, complete before/after comparison, or delivered-head native acceptance is claimed.

Each native directory contains hashes of its actual packaged web assets, generated Swift host and executable. These diagnostic packages precede the final delivery head; their manifests explicitly mark acceptance false. The current probe now refuses Quartz acceptance input unless its owned host is active, key, visible and unoccluded. Do not run it without a new coordinator GUI lease.

All owned hosts were terminated and waited for; no other hosts were killed. Clipboard and input source were untouched. The GUI window was explicitly released to the coordinator via `msg_5e25ed545e88`.

## Remaining gate and risks

A new exclusive GUI lease on an unlocked, active desktop where the isolated host becomes visible, key and unoccluded is required. Rebuild from the final PR head; verify exact PID/window and source/package/probe hashes, then execute native pointer, Tab/Shift+Tab, selected/focused, browse/open/return and scroll/context checks and capture matching before/after states. DOM focus and headless checks cannot replace that work. Nonzero native scroll/selection/draft retention and complete same-state native screenshot comparisons remain unrun. Initiative paging transitions and inactive-page asynchronous fencing have code review coverage but incomplete dedicated regression execution.

Android-specific, physical Android and standalone Syncthing tests are deferred by user decision and are not passed. Physical Mac input is unrun; baseline input was OS injected. Human/coordinator review and focused-desktop intervention are needed. This delivery remains incomplete and must not close #81 or merge on the strength of this report.

## Independent review

Initial independent Standards review identified nonunique disclosure identity and stale pagination focus stealing; Spec review independently identified duplicate identity, disabled pagination focus loss, pending-query scroll overwrite and missing acceptance evidence. Implementation findings were addressed with entity/path keys, successful-render/active ownership checks, shared page availability focus fallback and scroll capture at render commit. The new held-query/duplicate/paging browser tests exercise the corresponding public app controls. Final independent reports are recorded with the exact reviewed head in the PR; the native acceptance gap remains unresolved.
