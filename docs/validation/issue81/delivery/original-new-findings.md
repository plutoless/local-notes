# Original findings and resolutions in the route-diagnosis continuation

Original product findings/resolutions remain separately preserved in docs/validation/issue81/reviews.md and continuation.md; they were not erased by later no-findings reviews.

## Spec P2 at d41153fe21a1eda9562da6fd6c54ca0293d511c0

Delivery verification accepted any trusted pointerdown/keydown within an interval, without matching requested control or key, and initial already-current Focus click did not prove its handler outcome. This was an evidence-reliability finding, not a demonstrated product defect. Fixed at26557645ffe54a433e772a398da36bbca9cbe0f6: require both trusted pointerdown+click contained by intended selector; match requested key/modifiers and original active receiver; require actual Focus row replacement/current-page/settled indexing. Independent re-review found no remaining implementation finding; native acceptance remained pending.

## Spec P2 at 3a905f4a1d19b24607b15b5d5cb1bb1243d2630e

CONSTRUCTOR_ONLY was checked only in EXTERNAL_INPUT branch; without EXTERNAL_INPUT it could fall through to posting routes. Fixed at5379f61df24ebf0c87e21c7dd22288d4edec8253: reject incompatible mode before import/build, skip sender preflight launch, enforce constructor exit before external post, and refuse constructor fallback routes. Invalid-mode exit1 and build-only path were executed headlessly before any constructor-only launch. Separate Spec final review found no remaining implementation findings.

## Standards instrumentation uncertainty at 3a905f4

Serialized CGEvent source PID might identify the fixture constructor rather than the external sender; this was an unverified instrumentation limitation, not a confirmed standards violation. Constructor/sourcePID was added to receipts; inspect-only external decode returns provenance and exits before posting. Actual later constructor receipt records sourcePID55471 within owned fixture55471; external inspector56173 decodes sourcePID56173, matching its own PID; second decoder57477 likewise records sourcePID57477. Those read-only observations support attribution. They do not prove native delivery. Original final Standards report retains its pre-execution limitation, with actual receipts reported separately.

## Independent Spec P2 at e641f88: Continue Editing restored decorative drawer

The original native state action-retained-draft-selection retained text/range but focused action-drawer, with an automatic5px frame around the drawer. This was a real meaningful-focus defect and is not counted as acceptance. The scoped product correction9e471d1 remembers the eligible Action editing control and supplies an optional focusOrigin to the existing task-leave decision. Other consumers retain the default. Actual-consumer regression first failed (action-drawer vs action-description), then passed for description/status intended control, retained text/range and delayed options. Original and green loops are preserved. Corrected native2a8a4a4 explicitly demonstrates description/status focus with retained draft/range and clean row return, with no whole-drawer focus.

## Favorites scroll probe baseline finding

Old e641 equality failed after pointer return, but its baseline was taken before the helper scrollIntoView and lacked numeric offsets. Exact long55note headless storage recorded collection0/list0 before helper,108/0 after helper,108/0 immediate+settled return; native2a8 records0/0 then102/0 then102/0. The probe now records numeric dimensions/identity/timestamps and captures baseline after target positioning and before OS input. Strict equality was retained; no Library product scroll behavior changed.

## Standards P2 at1bcad379: tail-mode ownership

Original: TAIL_ONLY does not independently prevent replay. The earlier if-not-REMAINING_ONLY branch runs completed Focus/Action/Library inputs when TAIL_ONLY alone is set. Fixed1ec094e top guard before probe import/build/files/host/sender; executed invalid combination exits1 with explicit no-host/sender refusal. Exact1ec Standards rereview found no remaining concrete finding or material smell. The final actual run uses both required flags.

## Nonmodal final-control boundary observation

Corrected2a8's fourteenth Tab had marked tap and intended trusted DOM keydown but document focus became false while owned Cocoa remained active/key/unoccluded. No next input was sent, outside destination was not observed, and that operation remains unpassed. Read-only public upstream WebKit supports such nonmodal native key-view handoff but is not exact installed binary source proof. Independent Spec review found no justification for a production page-wide trap. A within-document reverse Tab then forward Tab is appropriate native entry, but the final1ec run refused initial host preflight before input; required tail outcomes remain unrun.
