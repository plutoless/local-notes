# Issue #96 independent Spec review

## Reviewer and comparison

Reviewer: `/root/spec_review`, an independent review subagent in parent Orca
session `orca_session_id:b00cb5b5-4eb1-4217-b597-16c6b0b1959c`.
No separate opaque reviewer UUID was exposed. This report is written by that
reviewer from its own review transcript, rather than reconstructed by the
implementer. No implementation edits, subagents or GitHub writes were performed
by this reviewer.

Recorded starting SHA, latest fetched main and merge-base:
`514a5138a6c76443a5bc04424bddd9a2960a7d69`.

| Review stage | Exact head |
| --- | --- |
| Initial implementation | `f1662ab595bb1cca691c8f5d086309322812317e` |
| Repaired production | `6c00bd7282e1f19fed3d169770cbacb52fa1667a` |
| First evidence successor | `76dfa1f5e5cd9c62d7a6c61c5396e2a3a897a2e4` |
| Final reviewed evidence candidate | `59e1871068553732d95a2d7717a23e4074f3d1b7` |

Complete PR comparison reviewed cumulatively through the initial implementation,
production repair and evidence-only delta reviews, and inspected again while
publishing this record:

```sh
git diff 514a5138a6c76443a5bc04424bddd9a2960a7d69...59e1871068553732d95a2d7717a23e4074f3d1b7
```

## Spec basis and scope

The originating source was the supplied full issue #96, with the approved
`docs/superpowers/specs/2026-11-15-content-structure-design.md` and
`docs/design/README.md`. The review applied the task's revision4 browser-first and
revision5 layered-testing refinements, which supersede blanket per-issue native
UI replay requirements. It reviewed Initiative browse/create/edit,
context/detail and linked-note return, shared Action entry/editor reuse,
explicit unfinished-Action decisions, immutable revisions, partial commits,
retries/recovery and source move/relink preservation. Sibling migrations,
schema/transport changes and automatic AI/private-data processing were outside
scope.

The implementation and evidence were checked against those behaviors, including
single presentation/task ownership, real repository/storage acceptance and the
limits separating browser evidence from native transport and OS integration.

## Initial finding and resolution

The initial Spec review reported one material finding and no other scope creep
or missing implementation:

> P2 — moved-reference selection loses its context identity —
> `web/react/initiatives.tsx:64` opens `source.resolvedPath || source.path`, while
> `aria-current`, selected styling and `data-path` use only `source.path`.

The finding explained that, after unique external-move recovery and before
saving the repaired association, `openContextNote()` selected the resolved path,
leaving no selected context row. It cited issue #96's requirements to preserve
selected detail and delivered move-reference repair. The requested correction
was consistent effective-path navigation/selection/restoration plus a focused
DOM regression for opening a recovered move before relink save.

The repair uses the effective resolved path for `data-path` and selection, and
restores the saved source identity on context return. The resulting regression
also exposed a recovered-draft lookup problem: persisted source resolution was
skipped when the private draft already contained the repaired path. The repaired
production version resolves persisted sources independently and updates only an
exact or uniquely matching draft row. The reviewed browser regression checks
opening a moved note before relink save, selected `aria-current`, same-row focus
and selection on return, shared Action ending/retry/reload, and unchanged source
bytes.

## Subsequent independent conclusions

The repaired-production review concluded:

> Final-head Spec review: **0 material findings** for
> `514a5138...6c00bd7282e1f19fed3d169770cbacb52fa1667a`.

> The moved-reference finding is resolved: navigation, `data-path` and selection
> use the effective resolved path, and context return restores that identity.
> Persisted-source resolution now works independently of recovered draft paths
> without guessing among ambiguous edited rows.

The evidence-successor review concluded:

> **Spec PASS — `76dfa1f5e5cd9c62d7a6c61c5396e2a3a897a2e4`; zero findings.**

That review verified no `web` or `tests` changes from the reviewed production
head. It inspected the validation README, plan, retained failure receipts,
commands/results and deferred limitations. It directly verified all recorded
source/artifact/fixture hashes and that packaged web resources matched the build
byte-for-byte. The report explicitly distinguished the final 9 affected tests
and browser journey from reused full-suite, Focus and catalogue evidence.

The final environment-only delta review concluded:

> **Spec PASS — `59e1871068553732d95a2d7717a23e4074f3d1b7`; zero findings.**

> Verified the only successor change adds environment fields to `bindings.json`.
> Package-lock and canonical environment hashes match. Prior production review
> and evidence conclusions remain valid.

Accepted minor findings: **none**. Remaining material findings: **none** at the
exact final reviewed candidate above. Native OS compatibility remains deferred
under the supplied policy; browser evidence does not establish native transport
or OS-input coverage. This reviewer did not rerun tests, UI or native journeys
to publish this evidence-only report.

## Publication boundary

Adding this report creates an evidence-only successor to the final reviewed
candidate. Its resulting commit SHA is deliberately not invented or embedded
self-referentially here. Exact resulting-head delta confirmation is to be recorded
in PR #118's body after the parent commits the review reports. That confirmation
must establish unchanged production/tests and limit its conclusion to the actual
successor diff.
