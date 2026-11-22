# Shell navigation and continuation implementation plan

**Goal:** Apply the approved page-first composition to shell and Home without changing Library ownership.

**Architecture:** Reuse `ShellContent`, `FocusContent`, the official Button compatibility facade, semantic tokens, and existing navigation/task/reading controllers. Keep workspace and source identity in the existing repositories and guards.

**Constraints:** Issue #124 only. English project material, Simplified Chinese application copy. No new modal, persistence, engine floor, host or shortcut owner. Reference desk remains optional and collapsed by default under #123.

Starting revision: `b1d378373344c9d252d6b67d2707b5be9d332a9f`. Fetched main contains PR #135 at this revision; #123 is closed in both textual and native dependency records.

1. Update `web/react/shell.tsx` to expose workspace identity and direct Actions navigation; retain directory disclosure and existing callbacks. Apply shared compact targets and neutral selected/hover states in `web/style.css` with narrow/short scroll containment.
2. Update `web/react/focus.tsx`: primary actions precede secondary management in DOM and visual order; retain one Home heading and bounded sections; shorten empty/recovery text and distinguish reading paths. Update the actual catalogue consumer.
3. Exercise the public Focus controller and existing reading-history rules first. Capture identical synthetic Home states before/after; extend focused DOM checks for tab order, selected/hover/focus, long labels, short/narrow reachability, and discoverable global search. Use actual application + isolated real storage for reading continuation, workspace switch, guarded discard, persisted readback and return. Correct only reproduced in-scope failures with minimal regression coverage.
4. Run affected tests, type/syntax/web/Mac package checks and full unit suite. Retain failed attempts locally under ignored build output; native UI/Android/Syncthing remain deferred. Independently review final committed head for Standards and Spec, retain original reviewer reports locally, fix/re-review if needed, push and open one PR.
