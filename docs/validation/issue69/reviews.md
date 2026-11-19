# Issue 69 independent reviews

All reviews used base/merge-base `1b5ddac5621e4d6c2d3e575a0d5f81b094e6c7db`. Reviewers were separate independent code-review subagents `/root/standards` and `/root/spec`; they did not edit files or use the GUI. The worker implemented and verified resolutions. Reports below retain the separate axes.

## Original Standards report — ca0320ca8793b915848749dea905851d3755071a

No definite documented-standard violations found. The implementation reuses shared controls and the existing drawer/repository boundary, keeps application text Chinese and project prose English, and preserves the stated Android/Syncthing deferrals.

Judgement calls:

- Possible Duplicated Code — web/app.js:395. The new reader-node lookup duplicates the reader-node lookup already used at line 374. A small shared reader-position helper would prevent drift. Minor; no broader refactor required.
- Possible Speculative Generality — tests/reading-actions-ui.mjs:12–23. Copied delayed-read, save-failure, secondary-query-failure and second-workspace hooks were unused. Exercise them or remove unused scaffolding. Test clarity feedback, not a production blocker.

Summary: 0 hard findings; 2 minor heuristic findings.

Resolution: extracted `locateReaderNode`, exercised delayed-read/workspace switching, and removed unused hooks. No accepted-minor exceptions remain.

## Original Spec report — ca0320ca8793b915848749dea905851d3755071a

1. High — interrupted creation can duplicate a commitment. The specification requires repeated submission and interrupted/retried persistence to create no duplicate commitment. The repository allocated IDs before the write but retained identity only after the immutable write returned. A durable write followed by a lost/rejected reply or termination could leave the draft without its committed identity. The initial injected failure preceded writing and missed this ambiguity.
2. Medium — container-boundary selections omit selected evidence. Endpoint-only annotations could quote the table header while the selected description included body rows. Map intersected blocks and test complete tables rather than only one cell.
3. Medium — acceptance coverage was partial. The original tests did not exercise workspace races, moved/unavailable sources, narrow/short-window usability, or ambiguous post-write interruption.

Resolution: persist a prepared revision identity privately before crossing the bridge; check durable history on retry; test lost reply plus reload/retry and one Action. Map intersected text nodes to original Markdown blocks, including whole tables. Add moved/unavailable, workspace race, narrow/short and native journeys.

## Second-round reports — 2ea47b4c310b8c113462081ee8a976aafadb036f

Standards: one hard lifecycle/presentation breach. Treating a prepared `creationAttempt` as committed could falsely display “版本已保存，恢复尚未完成” after a pre-write failure. The documented lifecycle defines committed as already saved and prohibits success before persistence. The original minor smells were resolved.

Spec: two medium findings. First, the same false committed receipt violated recovery semantics. Second, the remembered selection survived reader rerender/edit/save, so stale offsets could throw or pair old selected text with unrelated new source evidence.

Resolution: only verified `retry` triggers the committed receipt; durable history checks distinguish absent, committed and uncertain outcomes. Unknown outcomes retain private identity and show neutral wording. Reader rerender clears cached selection; range reconstruction validates coordinates and selected text. A failed-write dismissal test rejects false saved receipts.

## Final production-code reviews — 8ac6178086908243daa297a3fdb657219e613e6f

### Standards — /root/standards

No remaining Standards findings. The prior hard finding is resolved: only verified retry state triggers the committed receipt; uncertain persistence uses neutral wording and retains its private identity. The prewrite-failure close test checks that no saved-version receipt appears. Earlier minor findings remain resolved through the shared reader-node helper and exercised fixtures. Selection reconstruction validates coordinates/text, and rerender invalidates cached selection. Native evidence distinguishes DOM setup from actual input, with runtime/synchronization deferrals explicit.

Summary: 0 hard findings; 0 actionable minor findings.

### Spec — /root/spec

No remaining blocking Spec findings. Contextual creation persists its proposed revision identity before writing and verifies durable history after ambiguous failures. Saved-version messaging requires verified commitment; uncertain results retain private recovery identity. Passage mapping includes intersected table/list text, rejects invalid ranges and invalidates cached selection on content change. Added coverage addresses pre-write dismissal, lost-reply reload/retry, changed/moved/unavailable sources, narrow sizing and delayed workspace opening. Implementation remains scoped to #69. Native acceptance depends on executed final-head evidence; code review does not certify execution.

Summary: 0 remaining blocking findings; no accepted functional deviations.
