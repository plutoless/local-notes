# Held-render harness diagnosis

The follow-up started at `f9657ca67fe16e831b89f30e2aef3beb937df0ec`, against the unchanged review base `a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3`. The original failure remains in `build/issue83-delivery/browse-accepted.log` (exit 1), and its passing replay remains separate. A replay alone is not the diagnosis.

## Cause and relevance

The browse harness waited for a hidden Action drawer and an active `.focus-row-open`. `ActionScreen.closeDrawer()` restores the existing opener synchronously. `dismissDrawer()` subsequently awaits `returnToFocus()`, whose `FocusScreen.show()` queries storage and replaces the Focus list before restoring the replacement opener. The original wait can therefore finish while that return render is still pending.

The next test phase tagged the current All Actions node, armed a one-shot gate for **any** `actionQuery`, clicked sidebar Focus, and assumed that the gate held the sidebar render. A delayed query from the preceding Action return can consume that gate instead. The newer sidebar render is then free to replace the tagged node, producing the observed count 0 instead of 1. This is an invalid synchronization assumption in the harness, not evidence of an obsolete product render committing.

The original failed receipt did not log query/render identities; its precise historical winning query cannot be recovered. The controlled experiment establishes a concrete permitted interleaving that produces the identical assertion failure, rather than claiming to reconstruct missing telemetry.

## Controlled headless experiment

`build/issue83-delivery/held-render/diagnosis.mjs` uses synthetic notes and real application controls → bridge → isolated production Swift storage/SQLite. It serves either the reviewed head's assets or a frozen `git archive` of the base. Diagnostic-only instrumentation in the served Focus module records request starts, commits and fence rejection; tracked application assets are not edited. A bridge-delivery gate controls asynchronous ordering without OS input or arbitrary sleep.

1. Open an Action and close it. Hold delivery of its return-render Focus query (render 2), after the old opener has already received focus.
2. Tag All Actions and arm the original unscoped query gate. Deliver the held return query so it consumes that gate, then click sidebar Focus.
3. Observe render 3 commit and remove the probe while render 2 is still held: the original assertion would fail with 0 versus 1.
4. Release render 2. The existing product fence rejects it (`request: 2`, `current: 3`); committed render IDs remain `[1, 3]`. The real replacement accepts trusted Playwright pointer input and navigates to Actions. Synthetic source bytes remain unchanged.
5. In the synchronized control, first complete the return render and replacement-opener restoration. Arm the gate only afterward. It now holds render 3, the probe count remains 1 until release, and commit IDs are `[1, 2, 3]`.

Both schedules produce the same results with the base and reviewed-head assets. The base lacks issue83's drawer opener/autofocus changes, so those changes are not required to cause this race. No stale product commit or detached focus receiver was observed. Pointer input here is trusted headless browser injection, not native Mac or physical input. The raced schedule also exposes why measuring geometry before the return settles is unreliable; replacement activation in that diagnosis uses the current real control. The maintained browse test separately retains its original-coordinate pointer check after synchronization.

The fix waits for the exact old Focus row to detach **and** its replacement with the same entity ID to receive focus after both pointer and keyboard dismissal. It then arms the existing render gate. This checks completion of the real return journey without adding sleeps, changing production lifecycle behavior or weakening the held-node assertion.

## Receipt generation correction

The original `commands.json` named `*-current.log` for its first four commands while labeling them with the later reviewed head. Those files belonged to the earlier pre-autofocus validation generation (`9d310dee772bb88faa0ca083a43eccf9bd990b8f`), not the final acceptance generation. The original artifact manifest correctly hashed `check-accepted.log`, `unit-accepted.log`, `ui-accepted.log` and `build-accepted.log` for `f9657ca67fe16e831b89f30e2aef3beb937df0ec`.

In particular, `unit-current.log` and `unit-accepted.log` are distinct executions; both contain 67 passing tests, but have different duration output and SHA256 values. The corrected command ledger references the accepted generation explicitly and preserves the earlier receipts as historical entries. Original ledger/manifest snapshots, both log generations, and the failed browse receipt remain available. Fresh follow-up command receipts identify the new test/documentation head separately; no historical log is relabeled as newly executed evidence.

## Validation boundary

This follow-up changes only the browse harness and this diagnosis. Final headless browse/shared checks, unit tests, the maintained UI suite, Mac build and separate independent Standards/Spec reviews are recorded in the follow-up delivery report and command ledger. The previous native/production receipts remain bound to their actually executed head, with byte-equivalence checks for all application web assets and native sources; they are not described as a fresh native execution on this follow-up commit. No GUI lease was requested or used. Physical input and two-device end-to-end synchronization remain unrun; Android runtime/device and standalone Syncthing remain explicitly deferred. The three previously documented Quartz marker gaps retain their original limitations.
