# Independent Spec review — issue #99

## Reviewer and scope

I am the independent reviewer `/root/spec`. I authored this report from my own
review turns and findings. A separate child-agent runtime session identifier is
unavailable to me. The dispatching worker's Orca session is
`orca_session_id:8c14d729-45a1-4173-a027-aa45a711484d`; it is not my child-agent
identity. My read-only inspections used `functions.exec` / `exec_command`; those
tool names do not supply a separate reviewer session identifier.

Fixed base: `4ac88ec28496c0c474042815df7e04a77884fb9e`.
Reviewed PR head: `679fd8a35b04c7734a67c8c3a8288c5971bf2e6a`.
The full cumulative review scope is:

```sh
git diff 4ac88ec28496c0c474042815df7e04a77884fb9e...679fd8a35b04c7734a67c8c3a8288c5971bf2e6a
```

I assessed the implementation against issue #99's dispatched requirements,
`docs/superpowers/specs/2026-11-15-content-structure-design.md`, and the supplied
layered/browser-first acceptance policy. This is the Spec axis only. My findings
and approvals below are my own, not conclusions attributed from the parent or
Standards reviewer.

## Original findings and verification of corrections

I reviewed initial implementation head
`f20a14dcee9225702c8b0371b1c7067c65ccdf3e` against the fixed base and reported two
material findings:

1. **P1 — Save could not finish leaving a candidate edit.** The captured task's
   dirty callback tested only whether its draft existed, while Save cleared only
   `activeCandidate`. The shared leave loop therefore continued prompting after
   private draft retention. This violated active-task Save/Discard/Continue.
   At `f538e37c0a6ab69f3ead86e1696cacb0db4c6a0e`, I verified that captured
   dirtiness also requires active ownership; Save clears that ownership, allowing
   the captured task to become clean without deleting its recoverable draft.
2. **P2 — A pending decision could strand the next workspace's review surface.**
   An unedited candidate supplied no pending task, allowing workspace navigation
   while `reviewing` still prevented candidate publication. The original
   settlement skipped refreshing when its session no longer matched. This
   violated async workspace/task ownership and truthful submitted-write
   settlement. At `f538e37`, I verified that a visible submitted decision supplies
   a pending task even without a draft, so ordinary navigation waits for its
   service queue; settlement additionally republishes cleared busy state.

My `f538e37` re-review also inspected revision-bound stale-draft confirmation
refusal, recovered-draft feedback, field-associated invalid feedback, and narrower
source-detour task bypass. The unchanged domain service retains individual
explicit decisions, evidence validation and immutable partial-commit recovery.
I found no sibling implementation, schema change, automatic sending, or checkbox
promotion in the reviewed scope.

Accepted minor findings: **none**. I did not waive a known Spec defect.

## Successor reviews and cumulative applicability

- **`f538e37c0a6ab69f3ead86e1696cacb0db4c6a0e`:** full base-to-head re-review;
  both original findings fixed, no remaining material Spec findings.
- **`47bcba8aa972d504d5e13a4b558dbff87dbfb9a1`:** inspected the exact test-only
  successor. The synthetic Focus fixture now supplies active/request ownership
  and advances the request before the injected failure. The rollback/error
  assertions remain. I inspected matching failure signatures on the starting
  baseline and implementation; no production file changed in this successor.
- **`0e127dfef9ddd88d1e393bc0c5ebbb5291349c72`:** inspected the exact production
  delta moving candidate activation from textarea focus to bubbled article focus.
  This makes evidence, placement, decision and disclosure controls select their
  own candidate owner. It adds no persistence, effect, decision or modal authority.
  I reaffirmed cumulative base-to-head Spec approval.
- **`679fd8a35b04c7734a67c8c3a8288c5971bf2e6a`:** inspected the evidence-only
  successor and confirmed an empty delta for `web`, `mac`, `scripts`,
  `package.json` and tests against `0e127df`. I inspected the final coverage
  attribution and source bindings. All recorded source SHA-256 values matched
  the current files. My exact-head evidence-delta approval reaffirmed the
  cumulative Spec pass with no material findings.

For this durable report, I reconfirmed that HEAD is exactly `679fd8a`, enumerated
its full fixed-base scope, and checked `bindings.json` again: production head is
`0e127df`, with zero source SHA-256 mismatches. These checks do not replace the
full original review; they establish that its cumulative applicability remains
intact at the recorded PR head.

## Evidence boundaries and final conclusion

I inspected the recorded passing entry-point, source-return and recovery receipts,
including persisted Action/Initiative/Topic/link readback and unchanged source
bytes. The evidence explicitly attributes the complete maintained UI run to
`47bcba8`, fresh candidate journeys and packaging to `0e127df`, and 101 reused
unit tests to `f538e37` with relevant module/test bytes unchanged. Preserved failure
receipts and controlled baseline comparison remain part of the record.

I did not independently run tests, builds, browser journeys or native execution.
My report authorship continuation reran none of them. Browser persistence evidence,
Mac packaging, deferred OS/IME/clipboard/shortcut replay, and unrun physical or
platform checks remain distinct; I claim no native runtime acceptance.

**Final Spec result at `679fd8a35b04c7734a67c8c3a8288c5971bf2e6a`: PASS,
zero remaining material findings.** This approval covers the cumulative issue #99
scope against the fixed base, with the evidence limitations stated above.
