# Contextual form focus implementation plan

Goal: apply issue #81's shared focus roles to issue #83's existing short tasks without changing persistence or leave decisions.

Base: a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3. Live native and written dependencies both name closed #81; merged #88 is the base. Open PR #75 concerns Library browsing and is outside this task.

Design: retain native modal ownership, first meaningful fields, keyboard action outlines, checked selection, invalid borders and the existing three-way task decision. Use the shared focus token for one active editable-field boundary within contextual drawers. Avoid broad container frames. No layout, storage, schema or lifecycle rewrite.

- [x] Inventory/capture existing normal, invalid and recovered form states through isolated real-storage bridge fixtures at 1180×800, 393×800 and 393×340.
- [x] Refine the shared drawer editable-field role, document it and demonstrate its real catalogue consumer.
- [x] Extend maintained journeys for pointer/keyboard opening, forward/backward cycles, invalid input, selected checkboxes and opener return; retain existing failure/pending/recovery tests.
- [x] Execute shared checks, full unit/UI suites and Mac build; obtain coordinator GUI lease before fresh native input/close/quit validation, then release with cleanup and source evidence.
- [x] Commit, run independent Standards/Spec review on final head, push and open one PR; coordinator owns merging. Report limitations and exact evidence bindings.

Android runtime/device and standalone Syncthing checks are deferred by issue policy. Physical input is distinct from OS-injected input and is not implied by native automation.

Final-head execution receipts and independent review reports are delivered under `build/issue83-delivery/`. Publication/PR is completed by the worker after review; merging remains coordinator-owned.
