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
