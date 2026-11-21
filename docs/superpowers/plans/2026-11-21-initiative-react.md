# Initiative React implementation plan

Goal: deliver only #96 using the approved contextual workspace design.

Starting head and fetched main: `514a5138a6c76443a5bc04424bddd9a2960a7d69`.
#95 is closed; Action PR112 merge `1ab961d31287489324f6063549a6ce2aa9dabf7c` is an ancestor.
Only overlapping open PR at start: Organization #113; do not consume its branch.
No GLOSSARY.md or docs/adr exists at this head.

Architecture: production React components mount static uncontrolled control ports
once in the existing drawer/context slots, like delivered Action controls. Typed
views own browse rows, source shells, context links/actions and ending options.
InitiativeScreen alone owns repositories, task drafts, serialized writes, ending
and leave decisions. No second overlay, Action editor or bridge implementation.

Constraints: English project material, Simplified Chinese app copy, existing tokens,
no schemas, storage consent, AI or sibling migration. Execute inline as dispatched.

- [ ] Add typed Initiative presentation ports; replace legacy DOM construction and
  register export/ownership release without disturbing sibling registrations.
- [ ] Preserve context snapshots as view data, not React-owned detached nodes;
  use shared Action entry port for Initiative action create/open.
- [ ] Extend actual production catalogue with Initiative selected/long-content state.
- [ ] Verify existing public source/lifecycle rules and real adapter persistence;
  add focused immutable ending partial-failure/restart checks where missing.
- [ ] Run essential actual-app browser save/reload, Action/note return and ending
  recovery journeys; inspect desktop/393px/short/reduced-motion and focus states.
  Compare identical synthetic states against saved baseline build. Record I/O/time.
- [ ] Run typecheck, JS check, affected tests, full unit suite once and Mac packaging
  for changed shipped assets. Ordinary native OS compatibility, Android and
  standalone Syncthing remain deferred; no GUI custody requested.
- [ ] Independent Standards/Spec final-head reviews, repair material findings,
  commit/push and open one PR; coordinator alone merges/closes.
