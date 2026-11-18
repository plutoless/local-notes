# Task-scoped unsaved changes implementation plan

**Goal:** Implement issue #55 on the delivered #48 forms without saving unrelated tasks.

**Architecture:** A shared asynchronous leave decision operates on one captured active-task adapter. Screens retain ownership of their fields, private drafts and persistence. Submitted writes settle before a leave decision can discard remaining uncommitted input; queued note autosaves are cancelled when leaving begins.

**Constraints:** English project material; Simplified Chinese UI; preserve immutable history, source/conflict evidence, drawer contexts and private drafts. No issue48 worktree edits. Coordinator owns merge. Android/Syncthing remain deferred.

- [x] Preserve isolated baseline reproductions and integrate merged PR54.
- [x] Add the shared three-way decision in `web/presentation.js`, with a single in-flight decision and focus restoration. Validate with the actual consuming screens.
- [x] In `web/app.js`, replace global flush with selection of the frontmost short/topic/action/initiative task or visible note; cancel queued note autosave and capture task identity before awaiting persistence. Scope beforeunload and native termination to that task.
- [x] Route drawer close, Escape, backdrop, contextual navigation and native exit through that decision. Keep explicit business transaction saves intact.
- [x] Compare editable fields against initial/saved baselines; abandon only the current private draft on discard. Preserve recovered background drafts when navigating unrelated clean pages.
- [x] Replace native acknowledgement-only close/quit with one asynchronous leave request and exactly one termination reply, including an explicit bridge failure path.
- [x] Cover invalid/failed/conflicted and delayed writes, three decisions, reverted/blank clean forms, background recovered drafts, task identities, restart and desktop/393px focus.
- [x] Run `npm run check`, `npm test`, full `npm run test:ui`, `npm run build:mac`, actual native close/menu quit/Cmd+Q/restart checks. Record retries and limitations separately.
- [x] Commit evidence, obtain separate Standards/Spec review of the final head, fix findings, and publish one PR for coordinator-owned merge. Final SHA/review outcomes are recorded in the PR handoff.
