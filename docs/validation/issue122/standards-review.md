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

## Exact successor review and resolution

Reviewer: `/root/standards`. Fixed start/merge-base unchanged:
`e8a2caf6f15ecb7460d65f59e7d2433301fbdadd`.
Successor head reviewed: `bf432a278356071f8f5bc2ed577055c0bd71b3d3`.
Reviewed full PR scope again, with focused inspection of
`e51aa4ebdfcbca5d4ebacee8466688c3e728636d..bf432a278356071f8f5bc2ed577055c0bd71b3d3`.

The P1 is **resolved**. `web/react/styles.css` now explicitly excludes the
preview controls, preview documentation and preview evidence from production
Tailwind discovery. Independently ran
`diff -rq /tmp/local-notes-122-baseline/build/web build/web`: exit 0, no differing
shipped files. Independently checked compiled CSS SHA256 on both trees:
`af1f90b02a2aaeb607cbfe37bfbb1195a38501f244c0896654c5246497731e6d`.
This confirms the prepared baseline/candidate artifacts; this reviewer did not
rerun the builds. `shasum -a 256 -c docs/validation/issue122/bindings.sha256` also
passed against current bound source/artifacts.

The successor additionally restores entity search scopes, explicit pressed
passage state, matching search captures and clears preview receipts after field
edits. Changes remain inside the synthetic preview; no new repository, native,
modal or storage owner is introduced. The documented failed probes and repairs
remain explicit. No new material Standards findings. The prior readability
minor remains accepted for this preparatory deliverable.

Maintainer choice, selected semantic rules and final completion remain pending.
A subsequent commit containing only reviewer-authored report updates may receive
independent exact-delta confirmation recorded in the PR body; recursively
committing that confirmation is unnecessary. This is conditional on inspecting
that exact successor diff and confirming no source/artifact change, not advance
approval of an unknown head.
