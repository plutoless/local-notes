# Reader IME harness repair

Starting commit: `9a89dc495c353994a47fe4d18835894cddd731ab`.
Integration base: `13cc92c65cf6877586cf5364211a2df570b80032` (PR #91).

Scope: repair the observed prelaunch helper import failure and preserve the
existing real-IME acceptance assertions. No product or shared #105 correction.

1. Preserve failed runner/log/receipt and reproduce only helper import without GUI.
2. Integrate current main, retaining both reader and contextual focus docs/tests.
3. Maintain the probe under tests with an absolute repository-root helper path;
   keep the build-directory command as a wrapper, not a copied probe. Verify
   expected HEAD before setup, refuse uncertain existing host ownership, and keep
   build-only mode before all clipboard/input-source access or app launch.
4. Prepare durable private prelaunch clipboard/input-source baseline restoration
   for the future granted run. Do not execute baseline operations without custody.
5. Run import/head-binding regression, build-only, syntax/shared/reader tests and
   Mac build; record repair-cycle results and exact-head receipts/reviews.
6. Ask for a bounded exclusive GUI grant. Actual note-editor Chinese IME,
   commit/cancel/caret/selection/return/save/discard remain required, unrun until
   execution. Preserve read-only source checks separately from intentional saves.

Issue #105 is open and owns stale deferred Continue focus restoration. The note
leave journey consumes that shared function, so the known Continue/newer-input
race is relevant; this consumer must integrate the delivered correction rather
than implementing it competitively. Current IME probe does not exercise the held
Continue callback/newer-Tab ordering; no coverage or nonimpact claim is made.
