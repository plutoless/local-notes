# Issue 86 synchronization focus evidence

## Scope and inventory

Starting/shared-contract base: `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3` (merged #88). Both live GitHub native dependency and written Blocked by identify closed #81. This slice reuses native `:focus-visible`, selected tokens and the existing dialog trap; no new focus framework, catalogue role, schema or repository behavior is introduced.

The actual journey is sidebar synchronization inspection → record jump → version disclosure/read-only comparison → explicit version selection → resolution fields/advanced JSON → save or discard → inspection dismissal. Baseline: version choice has no persistent selected state; discard rerenders to the close button; JSON invalid feedback has no accessible association. Comparison containers already have no decorative focus outline. Warnings for missing/cyclic history and unreadable files remain visible with disabled resolution actions.

Chosen-version buttons now expose `aria-pressed` and selected fill independently of their keyboard outline. Discard restores the exact chosen version by record type/ID and revision, reopening its disclosure when necessary. Refresh returns a lost modal position to retry after re-enabling it, without stealing another active control's focus. Invalid JSON retains its border/caret, content and associated explanation. Draft guards, multi-parent resolution, immutable histories, committed-recovery retries and source bytes remain repository-owned.

## Reproduction and screenshots

`CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PHASE=before node tests/sync-focus-ui.mjs` serves web assets from the starting SHA through the maintained `sync-ui.mjs` production Swift-storage fixture. Omit `PHASE` for after. The new entrypoint opts into matched screenshots without duplicating the existing real-storage journey.

Matched `before/after-{pointer-selected,keyboard-selected,invalid-focused,warnings}-{desktop,393px,short}.png` use 1180×800, 393×852, 1180×480 viewports. Long Chinese labels, warnings, selection and focused invalid JSON are real application states. Browser focus positioning is setup; Playwright key events establish browser modality only and are not native Mac acceptance. Screenshot inspection and final-head receipts are recorded separately below.

## Validation status

Initial `npm run check`, `npm test` (67/67), `npm run build:mac` and the updated isolated sync journey passed. First attempts could not import Playwright; installed locally with `npm install --no-save --package-lock=false playwright`, without manifest changes. An earlier concurrent journey run failed an opener assertion while source was being edited; the settled-source repeat passed. Final-head execution and independent review are still pending.

Native probe `tests/native-sync-focus.py` reuses the issue81 bootstrap/receiver diagnosis and external Swift OS sender, logs its bootstrap hash, and adds a synthetic sync conflict journey. DOM commands seed/inspect/scroll only; native clicks/keys require exact owned PID/window/focus, trusted target events, and marked Quartz plus Cocoa receipt. It has not yet been launched: exclusive GUI lease is queued. Clipboard and input source are planned to remain untouched.

Physical input, Android runtime/device and standalone Syncthing are unrun; Android and standalone Syncthing are explicitly deferred by issue/policy. No private sources, external AI requests or model downloads are involved.
