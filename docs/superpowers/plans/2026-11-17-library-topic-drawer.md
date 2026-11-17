# Library topic drawer implementation plan

Goal: implement only #46 on starting/main SHA 7629dc84a454ac3ec6fb8a102e7509ed72ccd981, consuming the approved C contract.

1. Add a shared modal drawer constructor to presentation.js with a semantic dialog, independent scrolling body and fixed footer. Consume it only for topic create/rename; catalogue that same constructor.
2. Group library topic filtering/management and directory controls; retain search, pagination and list context. Remove inline topic forms and redundant hints.
3. Keep topic drafts private and workspace/entity scoped; guard dismissal/navigation/termination, disable duplicate writes, retain invalid/failed input and retry against existing revision storage.
4. Exercise real storage browser journeys, desktop/393px/short windows and native Cocoa/WKWebView before/after interactions. Run syntax, shared regressions, complete UI suite and Mac build; Android and standalone Syncthing remain deferred.
5. Commit evidence, review the final evidence-inclusive head independently against starting SHA on Standards and Spec axes, resolve findings, push one feature PR and report to coordinator. Coordinator retains merge authority.

The maintainer already selected C and explicitly authorized this isolated implementation; no design reopening or sibling forms are included. Execute inline as requested, with subagents only for the required two review axes.
