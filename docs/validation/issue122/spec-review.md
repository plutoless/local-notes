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
