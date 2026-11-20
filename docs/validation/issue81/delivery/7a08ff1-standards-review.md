Reviewed head `7a08ff1992abdf755b1281b82982fe232911fb6f` against base `36be0ae2da853a2a1cb004f9a27cf6769b788dd6`.

**Hard violations:** none remaining. **Material smell findings:** none.

The delta from `c1a59811` changes only the browser regression and native driver. Production, Mac configuration and external sender remain unchanged. The equivalence receipt records unchanged input predicates, delivery gates and keyboard-entry helper.

The Action entry now uses the actual production button, waits for settled Current Focus and verifies its text before native input. It verifies the resulting Action title, tools, rows and pagination availability afterward. Added target text/composed-path diagnostics improve attribution without weakening intended-target checks. `ACTION_ONLY` rejects missing prerequisite modes before fixture import/build/launch and skips completed Initiative/Favorites journeys.

The delayed-render regression demonstrates the transient injected-ID failure in headless Chromium: the old node disconnects, while trusted input at its former coordinates reaches the replacement production button and navigates to Actions. This supports the harness correction; it does **not** establish the unidentified target’s text in the previous native run.

Original finding, preserved verbatim:

> **P2 — `TAIL_ONLY` does not independently prevent replay.** The earlier `if not REMAINING_ONLY` branch still runs completed Focus/Action/Library native operations when `TAIL_ONLY` alone is set. Only the later Favorites branch observes that flag. This conflicts with the bounded remaining-only execution contract. Reject `TAIL_ONLY` without `REMAINING_ONLY` before host/build entry, or explicitly make it select the remaining setup. A command supplying both flags avoids this path, but the mode itself lacks enforcement.

That finding remains resolved. Earlier production findings remain resolved; separate Spec history is unchanged.

**Evidence limitations:** the inspected `c1a59811` receipt establishes genuine keyboard entry and visible Initiative boundary fallback, followed by a correctly stopped intended-target failure. Action pagination and invalid-field native checks remain unrun. No tests, GUI input or edits were performed during this review; recorded headless/refusal results were inspected, not independently rerun. Exact-head native acceptance remains pending.
