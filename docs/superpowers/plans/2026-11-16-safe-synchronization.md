# Issue #5: Safe synchronization implementation plan

Starting SHA: c86f083382887905f6e7d725b0e9f9ba21a146ad.
Both native dependencies and body references are #3 and #4, closed and merged in origin/main; their focus, topic, initiative and reference implementations are present.

1. Replace current-file fallback with validated immutable graph recovery in `web/actions.js` and a focused graph module. Import conflict copies into canonical immutable history, deduplicate by revision identity, retain forks and incomplete histories, and project conflicts conservatively. Add tombstones and explicit multi-parent resolution through the shared repository.
2. Add a shared synchronization review panel for actions, initiatives and topics. Show complete versions, select or edit a merged JSON version, and commit resolution referencing every head. Refresh incoming records on foreground/manual refresh independently of Markdown browsing.
3. Isolate individual file read failures in native storage adapters without treating unavailable collections as empty. Preserve serialized platform writes and verified revision-first commits.
4. Add shared and Mac-adapter regression coverage for forks, delayed parents, duplicates, tombstones, recovery, write failures and conflicts across entity types. Run syntax checks, full shared suite, UI checks and both native builds.
5. Commit, run independent Standards and Spec reviews against the starting SHA, resolve findings, and publish one PR with evidence and limitations. Syncthing standalone and Android runtime checks are deferred by user decision, never passed.
