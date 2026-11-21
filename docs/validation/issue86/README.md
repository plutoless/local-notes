> Historical failure record: preserved unchanged below. For the revision 2 repair, current browser evidence and explicit native-only limitations, see [repair report](repair/README.md).

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

## Review corrections and browser inspection

Initial independent Standards review of `275177653984c328de74f6b1a53b3f0ab54515b7` reported one hard first-open focus finding and one maintenance judgement about textual native-bootstrap reuse. Initial independent Spec review reported first-open restoration and missing keyboard activation. The first-open path now retains explicit-open intent, focuses a loading control and restores an eligible control after asynchronous rerender; the regression exercises a newly constructed, empty production `SyncScreen` backed by real native storage. Browser selection now discards the pointer-selected draft, verifies return, activates the version with Enter and checks selection; native selection uses Return before the storage save/readback. Historical-version discard reopens the exact disclosure before restoring focus.

The native bootstrap coupling is deliberate, guarded by an exact boundary assertion, recorded by SHA256, and limited to test code. It reuses the previously diagnosed external OS route without changing that route in a concurrent focus slice. A future explicit native-harness library could remove the textual dependency; this is a maintenance risk, not a new product framework.

Inspected the 393px selected-plus-keyboard and reduced-height invalid screenshots: the selected fill and one keyboard outline remain distinguishable; invalid JSON retains a red border inside the blue focus cue. Read-only version containers retain only their existing border. The maintained design-system suite reports normal text contrast 12.64:1, muted 4.72:1 and focus 4.98:1; the sync journey verifies visible button target heights ≥44px and no horizontal overflow. The full maintained UI suite completed successfully before these final review corrections; a final repeat is required.

`NATIVE_BUILD_ONLY=1 python3 tests/native-sync-focus.py` passed and explicitly exited before host launch/OS posting. Native runtime remains unexecuted pending the exclusive GUI lease.

## Integrated native run: failed acceptance, lease released

Integrated current main (`13cc92c65cf6877586cf5364211a2df570b80032`, issue #83 / PR #91) without conflicts; resulting head was `f5d67c05cfedc3b1299f336f3b3c2b97192e884f`. The shared focus contract and sibling changes are retained. All seven head-bound commands at the earlier `09b2fa0` passed; see `pre-integration-validation.json`. Those receipts do not certify the integration head.

The coordinator explicitly granted the original Task/Dispatch/Run. Read and verified the granted identity under its existing lease lock before activation, without modifying lease ownership or scheduler state. One run of `python3 tests/native-sync-focus.py` used owned PID **51772**, window **811**, unique bundle `dev.localnotes.validation.issue86after5f0fa6a0`. The exact owned app was also inspected through the Orca AX route (`owned-ax.json`). The probe's per-input preflights, external sender, marked process event tap, Cocoa window receipt and trusted DOM target/key poststate are recorded in `after/transcript.json`. Native source/host/sender/executable/package hashes are in that transcript and `gui-release.json`.

Executed native pointer selection, selected-plus-keyboard state, invalid JSON editing focus, discard return to the exact version, Return-based selection, explicit merge save and immutable-storage readback (four retained revisions, both tips as parents, merged description). DOM commands seed fixtures, set editor values, scroll, inspect and position focus; those calls are setup, not OS-input evidence. Pointer/key actions are externally injected OS events, not physical input. The label `resolution-field` captured a version summary after Tab and does not prove that Tab entered the editor.

**Failed gate:** after actual OS-injected Escape the dialog hid, but `document.activeElement` was `BODY`, not the synchronization opener. The process stopped on that assertion. The transcript also records contained modal wrap positions (`modal-last` / `modal-first`) with `focusVisible=false`; their positions alone do not establish the required visible keyboard cue. These are unresolved native acceptance gaps, not passed checks. Browser tests did not reproduce the native return failure. No root cause is asserted from this single run.

Cleanup ran despite the failed assertion: the owned process terminated, `wait()` returned **-15**, and `kill -0 51772` confirmed absence. All **55** isolated synthetic Markdown files match their exact bootstrap bytes; source hashes are in `gui-release.json`. Immutable conflict/history files and private recovery fixtures remain under ignored `build/issue86-native-after/` for diagnosis. Clipboard and input source were untouched. No other app was terminated and no permission settings were reset.

Explicitly released the lease through coordinator message `msg_8d09b1c6dc2d`, independently of PR outcome. The bounded grant disallows further implementation/retry; no second native run was attempted. A focused correction/diagnosis decision and a new explicit native grant are needed before completing #86. The PR must remain draft and must not close the issue. Physical input, Android runtime/device and standalone Syncthing remain unrun/deferred.
