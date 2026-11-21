# Issue 122 preview evidence

Selection remains pending. No issue completion or product acceptance is claimed.

## Scope and commands

Starting main/merge-base: `e8a2caf6f15ecb7460d65f59e7d2433301fbdadd`.
PR120 is MERGED at that SHA, verified via live GitHub; #102 CLOSED.
Source fixture: `docs/design/issue122/fixtures.ts`; all A/B/C use it unchanged.
Screenshot convention: `<direction>-<state>.png`, same desktop 1280×900,
393×852 list/reader/form, 1280×480 reading/form, keyboard and reduced-motion.
`markdown-table-code` captures the lower reading content. `form-error` begins
with the same blank name and preserved description. All fixtures are synthetic.

Passed:
- `npm ci`: exact lock, 44 packages installed, no vulnerabilities reported.
- `npm run typecheck`: existing React boundary.
- `npx tsc --project tsconfig.preview.json --noEmit`: preview source/config and shared controls.
- `npx vite build --config vite.preview.config.ts`: isolated docs entry, existing Safari16.4/Chrome111 targets, no production output changed.
- `node tests/issue122-preview.mjs`: DOM form error/correction, no-persistence receipt, scope/query/no-match, opener return, narrow list/back, document fit, reachable footer, keyboard and reduced motion. Zero page errors / external requests. Results in `dom-results.json`.
- `node tests/issue122-a11y.mjs`: computed normal text ≥4.5, focus colors ≥3 across preview surfaces, minimum 44px target heights, no intersecting targets in the sampled desktop/narrow reading/form/search states. `a11y-results.json` records measured values. This is a focused check, not accessibility certification.
- `agent-browser --session issue122 open ...` and `snapshot -i`: independently inspected actual semantic controls, labeled regions/table/code and headings.
- `git diff --check`.

Manual screenshot inspection: desktop A/B/C have distinct density/typography/surfaces; A narrow wraps its long title; C short form footer is reachable by document scrolling. This nonmodal preview stage deliberately lets the whole document scroll; it does not claim production modal containment or fixed-footer behavior. Both desktop and narrow table/code are independently scrollable. No source edits or storage calls occur.

## Failures and repair history

Initial environment probe ran `npx tsc` before `npm ci`: npx resolved the unrelated `tsc@2.0.4` shim and printed “This is not the tsc command you are looking for”; it was not a successful typecheck. Installed the exact repository lock via npm ci; then both repository and preview TypeScript checks passed. No manifest/lock changes. Initial ancestry probe accidentally supplied invalid object `652d2e`; Git rejected it, with no state change. Corrected to the recorded full main SHA and live PR120 merge SHA; ancestry passed. Neither probe is product acceptance. No repeated completed repair failure or runtime custody issue.

## Honest boundaries

No production behavior, parser, repository/index, native bridge/host, packaged assets or lifecycle changes. Existing Button is imported by the independent preview only; upstream Input/Textarea have preview-only consumers. Unit/integration suites, full maintained app UI, real-storage journeys, Mac build/package and native GUI were **unrun as irrelevant to this isolated diff**. No previous pass is relabeled as current-head acceptance. Ordinary OS/IME/clipboard compatibility is release-deferred; Android-specific and standalone Syncthing checks remain user-deferred. Physical input/minimum OS/Intel execution unrun. No GUI grant/input used, no workspace/private-note read, no model/AI request.

## Durable review paths

Open `../../design/issue122/index.html` through the documented Vite command in the comparison guide. Representative files: `a-desktop.png`, `b-desktop.png`, `c-desktop.png`; full comparable set is checked in here. Source/artifact hashes are recorded separately in `bindings.sha256`; generated build output is reproducible and ignored. Browser Chromium was local Google Chrome, headless; screenshots prove preview layout/DOM states only.
