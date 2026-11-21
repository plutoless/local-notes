# Independent Standards review — preparatory preview

Reviewer: `/root/standards` (independent review agent).
Fixed start and merge-base: `e8a2caf6f15ecb7460d65f59e7d2433301fbdadd`.
Exact reviewed head: `e51aa4ebdfcbca5d4ebacee8466688c3e728636d`.
Scope: full `git diff e8a2caf6f15ecb7460d65f59e7d2433301fbdadd...e51aa4ebdfcbca5d4ebacee8466688c3e728636d`, commits `f425039` and `e51aa4e`; all 51 changed paths including preview/config, shared preview controls, tests, provenance, evidence and screenshots.

Standards consulted: AGENTS.md, all docs/agents guidance, docs/design/README.md, docs/architecture/renderer-convergence.md and the content-structure design. Reviewed the Fowler smell baseline separately from hard requirements.

## Finding

**P1 — establish production stylesheet isolation before claiming no shipped asset change.** `web/react/preview-controls/input.tsx:11` and `textarea.tsx:10` add many Tailwind utility candidates under production `web/react/styles.css:4`'s recursive `@source './'`. Runtime import isolation alone does not exclude those candidates from production CSS generation. This conflicts with the assigned preview-only boundary and makes `docs/validation/issue122/README.md`'s shipped-output assumption unproven. Exclude preview sources from production discovery and compare compiled production bytes against the original source set; otherwise apply the repository's changed-shipped-assets verification policy. This is an actionable source-discovery risk, not a claimed observed production runtime regression. The implementer has acknowledged it; resolution remains to be verified at a successor head.

## Other assessment

No storage, bridge, controller, native input, dependency/lock or production navigation changes appear. Official Input/Textarea source, immutable upstream SHA, MIT notice, local deviations and real sample consumers are recorded. English project prose and Chinese visible/accessibility copy conform. Validation explicitly distinguishes preview checks from persistence/native acceptance and preserves failed setup probes. Maintainer selection remains pending without a completion claim.

Minor judgement call: `preview.tsx:25–29` and the compressed CSS make future review harder; formatting or extracting small reader/form sections would improve maintenance. Accepted for this bounded preparatory comparison, without inventing a new component abstraction or blocking selection.

No additional material smell findings. Independent narrow DOM probe verified Escape returns to Search and New action openers at 393px. No unrelated product suite or native checks were run by this reviewer.
