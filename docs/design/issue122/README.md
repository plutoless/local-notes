# Issue 122 — design preparation

Status: the maintainer selected round-2 **01 Page-first workspace + optional 08 Reference desk right context panel, collapsed by default**. See [selected rules](SELECTED.md). This is design preparation only; no production rollout.

## Starting boundary (recorded before preview implementation)

Starting HEAD and fetched main: `e8a2caf6f15ecb7460d65f59e7d2433301fbdadd`.
Live #102 is CLOSED; main is the #120 renderer-convergence merge. The resulting ownership inventory and production catalogue are available. Live #122 and parent #121 were read; only #122 is assigned.

| Finite preview surface | Identical states in A/B/C | Existing authoritative owner / risk |
| --- | --- | --- |
| Library | Populated, selected, duplicate and long titles, archive metadata; list/back at 393px | LibraryRows / LibraryScreen; never duplicate repository, paging or navigation owners |
| Markdown reader | Long Chinese prose, heading, quote, list, table, code, source path | Reader / noteReply; preserve source identity and safe rendering; no editable source |
| Contextual short form | Open, invalid preserving input, corrected, local preview receipt, cancel/return | NoteFields + taskFormView; presentation.js alone owns production modal/task/focus lifetime |
| Scoped global search | Query, scope, populated results, no matches, selected passage | SearchContent / searchView; no index or bridge calls; retain compact search starting point |
| Responsive / input | 1280×900, 393×852, 1280×480, keyboard focus/return, reduced motion | Shared component boundary; avoid double rings, moving targets and clipped final actions |

Out of preview implementation: Current Focus, Favorites-specific behavior, editor/save recovery, Actions/Initiatives lifecycle, Organization requests/candidates, sync/conflicts, workspace and native shell. These retain their owners listed in [renderer convergence](../../architecture/renderer-convergence.md); later production slices must inventory their states. No production selectors, tokens, entry, routes, bridge or storage imports change; Tailwind source exclusions keep preview utilities outside shipped assets.

## Original exploration plan (historical; A/B/C rejected)

1. Inspect official references, source/dependencies/license; retain provenance and concrete used/rejected examples.
2. Build a separate Vite documentation entry. Reuse the existing shared Button and adapt official Input/Textarea in the shared React boundary, imported only by preview. No second modal runtime: show contextual form/search in a nonmodal comparison stage; browser-native document focus and ordinary controls only.
3. A: compact index, ruled split view, sans reading. B: editorial reading, generous serif document and quiet rail. C: grouped workspace, bounded cards and explicit context strip. The same fixtures and controls render all three; candidate layout rules are scoped to this entry.
4. Validate preview type/build and focused DOM/visual accessibility at matching viewports; record evidence limitations and fixture/source hashes. No unrelated storage/native/full application replay.
5. Commit reviewable previews, obtain independent Standards/Spec reviews, then ask coordinator for explicit A/B/C maintainer choice with durable artifacts. Do not select by silence. Only after selection publish semantic rules and reconciliation, then final reviews/PR completion; no sibling rollout.

No dependencies or engine-floor changes are planned. No remote assets, fonts, analytics, model/private processing or real storage. Form receipts explicitly describe preview-only behavior.

## Selected continuation

The selected default entry uses the same private-safe content and official controls. It reuses the actual presentation.js drawer and shared React overlays via a docs-only source alias, with one modal lifetime for form/search. An optional nonmodal right context panel is collapsed initially; it has no task/focus trap. Full Library remains reachable, Notes/Actions/Initiatives stay independent, and top-right search/Command+K and local source return are demonstrated. Selected rules and the old-rule reconciliation are durable in SELECTED.md. Per-run artifacts and reviewer reports are local ignored output; PR132 contains concise exact-head conclusions. No production acceptance, storage or native result is implied.
