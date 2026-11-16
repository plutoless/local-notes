# Current Focus Implementation Plan

**Goal:** Implement issue #3 only, using the approved content-structure design.

**Architecture:** Store optional numeric focus positions in the existing synchronized action records and immutable revisions. Query bounded focused, waiting, and active initiative pages from the native SQLite adapters; share the home UI across Mac and Android. Reuse confirmed-data editors without copying actions.

**Starting SHA:** 65e3b5b42ce1eda0e908c832c0167147e728fd73.

## Constraints

All new project material is English. No checkbox import, AI inference, other issue implementation, or changes outside this worktree. Android-specific runtime and standalone Syncthing checks are deferred under docs/agents/validation.md; shared tests and Mac validation remain applicable.

## Steps

1. Add focus-position validation and status-transition clearing to web/actions.js. Extend native action queries with focus ordering, initiative filtering and ID lookup. Test selection, ordering, retirement/reopening and index recovery using the production Mac adapter.
2. Add web/focus-screen.js for seven focused actions, expandable bounded pages, waiting conditions, and active initiative progress. Wire default navigation, creation/organization availability and action editor focus controls; preserve existing editors and drafts. Add initiative filtering to the action list.
3. Make screen startup reuse an existing index before background recovery, report recovery progress, and avoid note scans on home. Test cold recovery and warm query paths.
4. Run shared checks/tests, UI regressions, Mac and Android builds; measure a fixed 500-note/2,000-action dataset including body-read counts. Exercise native Mac interaction where available and report limitations.
5. Commit, run independent Standards and Spec reviews against the starting SHA, resolve findings, push the isolated branch and open a PR with validation evidence and Closes #3. Do not merge.
