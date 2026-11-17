# Initiative metadata drawer implementation plan

**Goal:** Deliver only #47 using the existing contextual drawer and persisted initiative lifecycle.
**Base:** 92580a685891729f26fffd5e2a3e8e6c1513620d.
**Architecture:** Move the initiative form into the shared modal drawer. Preserve the contextual action/reference workspace and selected detail; route dismissal through an explicit draft guard and reuse existing save/recovery behavior.
**Constraints:** English repository material; Simplified Chinese application labels; no lifecycle/storage changes; Android and standalone Syncthing deferred; coordinator owns merging.

- [ ] Move the existing form into a wide drawer, with fixed Cancel/Create-or-Save footer, shared compact fields and automatic warning disclosures.
- [ ] Preserve browse/detail context on open/close, make clean cancellation write nothing, and guard dirty dismissal/navigation without bypassing note/action saves.
- [ ] Exercise real persistence, failures/retries, recovered drafts, lifecycle/source regressions, desktop/393px/focus/short-height behavior and actual native Mac interactions; record before/after evidence.
- [ ] Run syntax/shared/UI checks and Mac build; commit evidence, obtain separate final Standards/Spec reviews against the base, resolve findings, push and open one PR.
