# Independent Spec review — issue 122 preparation

Reviewer: `/root/spec` (independent review agent).
Fixed start, fetched main and merge-base: `e8a2caf6f15ecb7460d65f59e7d2433301fbdadd`.
Exact reviewed head: `e51aa4ebdfcbca5d4ebacee8466688c3e728636d`.
Scope: full `git diff e8a2caf...e51aa4e`, inventory commit `f425039` and preview commit `e51aa4e`, all preview sources/configuration, upstream controls/license, evidence scripts/receipts and representative A/B/C desktop, form, search, narrow reader, short and Markdown screenshots. Live #122/#121, presentation guidance and content-structure spec informed this review.

## Findings

1. **P2 — Global-search example substitutes Library filtering.** `docs/design/issue122/preview.tsx:17,28` filters only notes and offers 全部笔记/知识管理. Issue #122 requires “scoped global search”; its retained presentation baseline specifies “全部内容 / 笔记 / 事项 / 行动” (`docs/design/README.md`, Scoped compact search). No selected passage state is demonstrated despite the new inventory claiming it. Add synthetic mixed-entity examples, baseline scopes and explicit selected-passage treatment; this needs no real index or production behavior.

2. **P2 — Reduced-height screenshot evidence has a capture artifact.** `docs/validation/issue122/a-short.png` visibly repeats the comparison strip partway down the image, although the React tree contains one strip. The criterion requires “reduced-height ... views” comparable across directions. Stabilize viewport changes/compositor frames and inspect regenerated captures; current screenshot cannot reliably establish the intended short layout.

3. **P3 — Corrected receipt survives a new invalid edit.** `preview.tsx:28` does not clear `receipt` when the title changes; `a-393-form.png` shows an empty invalid title alongside “预览已更新，未保存到工作区。” Issue #122 asks for form/error states, and parent #121 requires “selected, checked, invalid” distinctions and concise truthful feedback. Clear the previous preview-confirmation receipt on edits so it refers only to the confirmed sample state.

## Boundaries and open gate

Distinct desktop hierarchy/density/typography/surfaces, synthetic shared fixtures, Chinese application text, pinned official Input/Textarea source/license, isolated entry/storage and proportionate checks are present. No production rollout or parent edit observed. Explicit maintainer selection and subsequent semantic-rule reconciliation remain intentionally pending; this report does not declare issue completion or demand irrelevant native/storage acceptance.

## Exact successor review — findings resolved

Reviewer: `/root/spec`. Exact successor head:
`bf432a278356071f8f5bc2ed577055c0bd71b3d3`; unchanged fixed start/base:
`e8a2caf6f15ecb7460d65f59e7d2433301fbdadd`.
Reviewed full PR scope and every `e51aa4e...bf432a2` delta: sources,
Tailwind exclusions, fixtures, checks, reports/receipts, binding manifest and
regenerated/added screenshot artifacts.

- Finding 1 resolved: all-content/note/initiative/action scopes use shared synthetic entries; a pressed selected-passage control and text receipt now show selection separately from focus. Source opening remains an explicitly labeled example source note, without pretending to implement entity navigation or real retrieval.
- Finding 2 resolved: extracted original and successor committed A short PNGs were inspected separately; the old duplicated strip is absent in the successor. Two animation-frame settling and disabled screenshot animations are explicit. Matching narrow/short/reduced-motion search captures supplement the original states.
- Finding 3 resolved: both fields clear the preview receipt on edit; new DOM assertion checks clearing after invalidating the title. Regenerated narrow form has error evidence and reachable actions without the stale receipt.

Independent read-only headless Chrome probe against this source at 393px verified
corrected receipt → blank invalid title clears the receipt, scope result counts
4/2/1/1, and pressed passage selection. `git diff --check` passed; checked-in
source/screenshot/build binding entries matched present files. Sampled A short,
A narrow form, B narrow search and C short/search images were visually inspected.
No new material Spec findings. The production-discovery correction is confined
to explicit preview exclusions; the separate recorded byte-identical production
build comparison supports the preview-only boundary.

Minor accepted limitation: the global query's static label remains “搜索笔记”
even with mixed-entity scopes; scope labels and result kinds expose the actual
scope. Rename it to “关键词” in later copy consolidation rather than treating this
preview as an accepted production search contract.

This approves the concrete preview comparison for maintainer choice, not issue
completion: explicit choice, selected semantic contract/reconciliation and final
completion review remain open. No native/storage/full-app acceptance inferred.
