# Original independent reviews

Reviewed head: `97a65729c3e69a54b840554241d5a33414a7efda`.
Reviewed base: `1a38a5167b8583729a6831a33ade8107d25476a1`.

## Standards — independent reviewer /root/standards_review

1. P2: Raw adapter errors become primary application copy at app.js:378; the presentation contract requires concise Chinese explanation and diagnostic details.
2. P2: Inline wiki-link control has no presentation reference/catalogue example and rationale.
3. Judgment-only possible duplication: follow/return repeat ownership capture and guarded commits.

Resolution: finding 1 was not reproducible from code inspection: `notice` already delegates failures to `errorFeedback`, which renders Chinese primary copy and puts the diagnostic inside details. This unchanged shared behavior was explained to the reviewer for reassessment. Finding 2 is resolved by a production-rendered catalogue example and reference explaining sentence typography and inherited shared targets/tokens. The duplication suggestion is retained as a judgment call; both paths remain small and differ in history/recovery behavior.

## Spec — independent reviewer /root/spec_review

1. P1: load commits destination before awaiting secondary metadata, but history was committed only after those awaits; failures or edits could lose the original return.
2. P2: selecting a different Initiative source retained the previous wiki chain.
3. Validation gap: meaningful selection/nonzero scroll, Library query/filter/page/scroll, workspace fencing, edit save/discard/cancel/failure and search-origin evidence were missing; native execution was pending its exclusive lease.

Resolution: history now commits synchronously with visible note identity through load's committed callback, before ancillary queries. Explicit Initiative source selection clears the previous wiki chain. Browser evidence was expanded for selection/scroll, secondary-query failure, dirty keep/discard/failed-save, caller search return, second-page query/filter/selected-source restoration and a delayed successful read across two isolated workspace roots. Native execution now covers OS-injected Enter nested returns, focus, nonzero scroll, meaningful selection, Library selected source and source/asset hashes at desktop/393px.
