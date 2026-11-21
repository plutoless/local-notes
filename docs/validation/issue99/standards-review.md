# Independent Standards review — issue #99

## Reviewer and scope

Author and reviewer: `/root/standards`, the independent Standards review child
agent. This report is authored by that reviewer from its own review history.
The reviewer's runtime session UUID is unavailable in the accessible context.
The parent worker's Orca session is
`orca_session_id:8c14d729-45a1-4173-a027-aa45a711484d`; that is not this child
agent's identity. The final read-only binding verification used `functions.exec`
with `exec_command` output chunk identifier `d03fa5`.

Fixed base: `4ac88ec28496c0c474042815df7e04a77884fb9e`.
Exact reviewed PR head: `679fd8a35b04c7734a67c8c3a8288c5971bf2e6a`.
Full PR comparison:

```sh
git diff 4ac88ec28496c0c474042815df7e04a77884fb9e...679fd8a35b04c7734a67c8c3a8288c5971bf2e6a
```

I applied the Standards axis of the code-review skill, repository `AGENTS.md`
and its linked guidance, and the presentation/task contracts in
`docs/design/README.md`. I considered the skill's Fowler smell baseline as
judgment, subordinate to repository conventions, rather than automatic failures.
This is a cumulative full-scope review: initial inspection, full corrective-head
inspection, and independently inspected successor deltas together cover the
base-to-final PR. It is not an assertion that the evidence-only delta alone
establishes approval of the implementation.

## Findings and corrections I reviewed

At `f20a14dcee9225702c8b0371b1c7067c65ccdf3e`, I reported:

1. **P1: Incorrect active candidate for leave decisions.** The controller set
   `activeCandidate` only on text edits. Editing A, editing B, then refocusing A
   left B as the Save/Discard target. This violated the frontmost editing-task
   contract in `docs/design/README.md:164–171`.
2. **P2: Missing associated invalid-field explanation.** The review textarea had
   `aria-invalid` without a nearby explanation linked by `aria-describedby`,
   contrary to the field contract at `docs/design/README.md:34,128`.
3. **P2: Recovered edit provenance was not visible.** Restored private drafts
   displayed the same receipt as fresh edits, contrary to the recovered-state
   requirement at `docs/design/README.md:43,131`.

At `f538e37c0a6ab69f3ead86e1696cacb0db4c6a0e`, I inspected the complete corrective
implementation and verified textarea activation, captured-task identity checks,
an associated Chinese validation hint, and explicit recovered-draft feedback.
I also inspected the narrower source-detour exception, submitted-decision task
waiting on the existing service queue, and revision fencing of private drafts.
The two-draft/refocus browser case was present in the test changes. My conclusion
was zero remaining material Standards violations or material smell findings.

At `47bcba8aa972d504d5e13a4b558dbff87dbfb9a1`, I independently inspected the sole
successor change in `tests/design-system-ui.mjs`. Initializing the synthetic
Focus receiver's `active` and `request` fields and advancing its request inside
the failing `show()` stub conforms to the existing production ownership guards.
The original rollback/error assertions remain intact. I inspected both retained
failure logs: baseline and migrated source had the identical offset 198/error
undefined signature. This supports a harness correction; no production Focus
change or guard removal was introduced.

At `0e127dfef9ddd88d1e393bc0c5ebbb5291349c72`, I independently inspected the final
production delta: moving activation from textarea focus to bubbled article
focus. This correctly covers evidence, placement, decision, disclosure and edit
controls. The callback selects the candidate only; it does not persist, send,
confirm, or acquire modal ownership. Visibility and draft checks still govern
leave-task participation. I reaffirmed base-to-production Standards approval.

Accepted minor code findings: **none**. No material issue was waived.

## Exact final-head evidence review

At `679fd8a35b04c7734a67c8c3a8288c5971bf2e6a`, I inspected the evidence delta and
verified that the following comparison is empty:

```sh
git diff 0e127dfef9ddd88d1e393bc0c5ebbb5291349c72..679fd8a35b04c7734a67c8c3a8288c5971bf2e6a -- web mac scripts package.json tests
```

Only `docs/validation/issue99` evidence was added. I read the validation report,
review summary, final journey receipts, unit/full-suite logs and performance
repeat record. Their attribution distinguishes final-production candidate
reruns from earlier-head full-suite/unit reuse and preserves failed receipts.
The timing discussion discloses the initial slower observation and subsequent
4491 ms versus 4291 ms comparison without claiming statistical equivalence.
The report distinguishes browser/storage evidence from native transport and OS
input, and records deferred/unrun checks instead of presenting them as passed.

For this durable-report continuation, I reconfirmed checkout HEAD is still
`679fd8a35b04c7734a67c8c3a8288c5971bf2e6a` and repeated read-only SHA-256 checks
against `bindings.json`: all 55 source files, 26 built web artifacts, 26 packaged
web files and the packaged executable match. Current read-only environment
inspection also matches the binding: macOS 26.5.2 arm64, Node v25.1.0 and Chrome
158.0.8127.36. Chrome version was read from its plist; no app was launched.

I did not rerun tests, builds, browser journeys or native checks. Runtime results
are the implementing worker's receipts, not independent execution by me.
This report is the only file I authored in this continuation and is uncommitted
for the parent worker's evidence-only publication.

**Conclusion at exact PR head `679fd8a35b04c7734a67c8c3a8288c5971bf2e6a`: cumulative
base-to-final Standards approval reaffirmed; zero remaining material violations
and zero material smell findings.**
