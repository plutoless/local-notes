# Standards review — issue102

Reviewer: `/root/standards_review` (independent review agent). A separate runtime
session identifier was not exposed; none is invented.

Fixed start, fetched-main comparison base and merge-base:
`2f7f55513f077a88201ee3fadb6b6b540d7514a6`.
Exact reviewed head: `24ee1c672418204cb6ef3d908aaa43928a827826`.
Scope: the complete PR diff, including production code, adapted/new tests,
architecture/design guidance, catalogue, source bindings, evidence and failure
history. Command: `git diff 2f7f55513f077a88201ee3fadb6b6b540d7514a6...24ee1c672418204cb6ef3d908aaa43928a827826`.
Commit list: `24ee1c6 Converge shared presentation ownership and retire legacy renderers (#102)`.

Standards consulted: AGENTS.md; docs/agents/validation.md (layered/browser-first
policies); docs/design/README.md; final ownership inventory; documented
presentation/storage/consent boundaries; the supplied Fowler smell baseline.
Tool-enforced formatting/type rules are excluded from findings.

## Original findings

1. **P2 — competing receipt-content ownership.** `web/action-screen.js:389`
   calls `errorFeedback(...)` and then writes
   `$('#action-save-state p').textContent` for uncertain and committed saves.
   With this PR, Feedback now owns those descendants through a React root.
   That conflicts with docs/design/README.md's typed presentation ownership
   and the final inventory's statement that Feedback owns receipt content.
   The analogous `changeFocus` branch already uses `receipt.failure`.
   Following the separate Spec reviewer's signal, I also verified this same
   competing-ownership pattern at `web/initiative-screen.js:88–89` (close
   recovery) and `423–427` (save/ending failure) in the exact reviewed commit.
   Publish the chosen uncertainty/committed message through that same typed
   port, preserving precedence and diagnostic text. The original imperative
   branch was compatible with the prior DOM renderer; the changed ownership
   makes retaining it a breach. **Status: open at reviewed head.**

2. **P3 — contradictory current design guidance.** Older sections of
   `docs/design/README.md` still describe `comparisonRow`, `field`,
   `selectionRow`, and line 123's “production `button(...density)`” as
   current APIs, whereas the changed contract explicitly retires them.
   Mark these passages historical/superseded or name the actual React
   components/ports. This is a documentation consistency issue, not a
   request to restore constructors. **Status: open at reviewed head.**

No additional material standard breaches were found. Source/bridge/domain
contracts remain unchanged; modal lifetime and task fences retain one owner.
The documented stable uncontrolled control ports are intentional repository
boundaries, not a smell requiring a state/persistence rewrite. The browser,
non-GUI native-resource, packaging, release-deferred OS and physical-input
boundaries are distinguished honestly. No speculative abstraction or unrelated
feature implementation was identified.

## Verdict

Request correction of finding 1 before acceptance; finding 2 is minor but should
be reconciled. Original findings remain in this report for successor resolution
and exact-head confirmation. This review does not independently claim any
unexecuted native GUI acceptance or performance measurement.

## Corrected full-scope review — d456f93

Exact successor reviewed: `d456f931902437df6b0f99067d8211b4a2a0404e`.
Fixed start/base/merge-base remains
`2f7f55513f077a88201ee3fadb6b6b540d7514a6`.
I re-reviewed the complete base-to-successor PR scope and the explicit
`24ee1c672418204cb6ef3d908aaa43928a827826..d456f931902437df6b0f99067d8211b4a2a0404e`
correction delta. Commit list now also includes
`d456f93 Complete Action and Initiative failure receipt ownership after review`.
The reviewer remains `/root/standards_review`; no session identifier is asserted.

- **Finding 1 resolved.** Action save publishes the complete chosen message
  through `receipt.failure`, with committed-recovery wording retaining precedence
  over uncertain-creation wording. Initiative close recovery and save/ending
  branches now use the same typed port; ending disclosure and ending-required
  message precedence are preserved. No controller paragraph-content mutation
  remains in these receipt consumers.
- **Finding 2 resolved.** Conflict comparison and compact form guidance name
  `ConflictComparison`, `Button`, `ActionField` and the delivered control ports;
  removed APIs are explicitly identified as retired historical constructors.
  No accepted-minor exception is needed.

I inspected the relevant current Action/source/lost-reply/task/Initiative/coherent
journey and resource receipts. The evidence distinguishes the reused original
101-test/full-UI/layout coverage from current related checks; it does not relabel
those original runs as successor executions. All source SHA256 entries in the
current binding matched the reviewed files; source-tree digest is
`c08a9e1da56ef369f6e34d1cfa6edcf65c36e200c0a2d160c481c8e17a80901d`.
Native sources remain byte-identical to base. Packaging and non-GUI resource
checks remain distinct from deferred/unrun native GUI/OS/performance coverage.

**Current verdict: Standards pass, no remaining findings at d456f93.** The two
original findings above remain historical records, resolved by this successor.
Evidence-only publication still requires an exact publication-delta confirmation;
this verdict does not cover an unseen later code change.
