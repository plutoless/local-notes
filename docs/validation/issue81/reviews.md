# Independent reviews

Starting/base: `36be0ae2da853a2a1cb004f9a27cf6769b788dd6`.
Initial reviewed head: `cb0ee30fc4a7ce3caf970ffbe6186e4e5e04087d`.

## Standards

- P2: Focus disclosure restoration keyed by mutable/nonunique labels, violating the documented stable record identity contract. Fixed with action entity IDs, reading paths and fixed utility identity; duplicate-label browser regression passed.
- P2: Focus pagination applied global focus after an awaited render that could be stale/inactive. Fixed with successful-render, active screen, repository and request ownership checks.
- Judgment: copied browser fixture retained unrelated failure/workspace scaffolding. Removed unused gates/imports and used the retained query gate for a real delayed-query regression.

## Spec

- P2: duplicate disclosure identity (independently found). Fixed as above.
- P2: paging boundaries disabled the active control without enabled fallback. Fixed through shared page availability behavior; Library/Action boundary regressions passed.
- P2: pending Action/Initiative queries captured scroll too early; Library rerender omitted list scroll. Fixed capture at render commit and both scroll surfaces; held-query Action regression passed.
- Acceptance gap: Favorites, pagination, delayed rerender, invalid focus and nonzero/native context checks were incomplete. Browser coverage was extended, but native delivered-head acceptance remains blocked and is explicitly not passed. The draft PR must remain incomplete.

Final-head Standards and Spec re-reviews are separate and reported in the PR. Neither reviewer executed native checks or granted an acceptance waiver.

A subsequent review of `20e7d9d95da603ff2985e39b68c020af54716fbc` independently found one additional Library ordering edge: its both-disabled pagination fallback selected an old row before replacement. The availability update was moved after row construction/restoration, and a held Reference query regression exercises the surviving-row fallback when both directions become disabled. Final re-review is requested after that correction; native acceptance remains unresolved.
