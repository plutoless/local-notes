# Standards review

Reviewed head: `3058ee258efbbb497397fce026425ea09d2ca080`.
Fixed point and fetched main: `2f5a8af78ada6da3c0f6d323cdb3b654e50cb9ed`.
Diff: `git diff 2f5a8af...3058ee2` (implementation `611b301`, evidence `3058ee2`).

## Documented standards

No hard language, scope, semantic-token, layered-validation or DOM-ownership
violation found. The shell keeps search/capture/domain/lifecycle authorities in
existing controllers, the legacy sync opener has an explicit island, and Focus
releases its root before list ownership changes. Native/OS/minimum-version limits,
failed receipts and baseline CSS-context noise are disclosed without claimed passes.

## Contract correctness

- **P2 — Preserve nullable record fields in the typed presentation contract.**
  `web/react/focus.tsx:5` declares `focusPosition:number`, `dueDate?:string` and
  `waitingOn?:string`. Production `ActionRepository.save` writes null for absent
  date/waiting data and for every waiting record's focus position
  (`web/actions.js:173-174`); the home passes these records unchanged. Consequently
  `FocusModel.waiting` cannot actually satisfy its introduced public TypeScript
  type. Use the real nullable unions (and a distinct nonnull focused type if needed)
  instead of describing adapter data as numeric/string when it is null. No runtime
  failure was observed, but the contract should be truthful before consumers rely
  on it.

## Smell heuristics

No additional actionable baseline smell. Compact JSX follows the delivered React
consumer style, and the small host adapters are consumed coexistence boundaries.
Raw receipt whitespace is retained diagnostic output, not a code-style finding.

Summary: zero hard documented-standard violations; one actionable type-contract
finding (P2), awaiting correction and final-head refresh.
