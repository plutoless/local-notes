# Cumulative issue 92 repair record

Starting source: `6f2dec964856c14f98b5a805019dc03b0cc83b41`.

| Cycle / signature | Diagnosis and correction | Targeted command and outcome |
| --- | --- | --- |
| Baseline 1 | Existing guarded harness extended with bounded baseline-only mode; no guard changes | Native baseline passed; coordinator independently accepted cleanup and released lease |
| Resource policy red | Public packaged asset policy module not yet implemented | `node --test tests/packaged-assets.test.js` initially module-not-found; passed after implementation |
| Library browser 1 | Playwright absent in isolated worktree | Pinned Playwright dev dependency; preserved `build/issue92-library-browser.log` |
| Library browser 2 | Disabled Next focus incorrectly selected Refresh because a combined CSS selector uses document order | Explicit Previous/Next/Refresh priority; cycle 3 passed. Logs `build/issue92-library-browser-cycle{2,3}.log` |
| Lifecycle 1 | Legacy synthetic nonbubbling input did not reach React delegated handlers; journey also modified hidden read-mode textarea | Synthetic events now bubble like browser input, and journey deliberately enters Edit; browser composition/caret/save suite already passed with actual fill/keyboard events |
| Lifecycle 2 / search startup | HTML extraction of Library skeleton accidentally removed the adjacent legacy Organization block, causing null `ai-settings` during bootstrap | One-shot startup diagnostic exposed exact OrganizeScreen error; restored the entire unchanged Organization HTML from starting source. No sibling redesign or replacement. Logs lifecycle cycle2 and search cycle1 retained |

Commands that run tests use generated local assets and isolated synthetic storage.
No two completed unchanged failure cycles have been blindly repeated. Every repair
above changes the diagnosed cause or establishes new diagnostic evidence. Native
baseline evidence is separate from current production implementation validation;
there is no current native grant and no final-head native pass claimed.

| Follow-up cycle / signature | Diagnosis and correction | Targeted result |
| --- | --- | --- |
| Unit/integration 1 | 73/74 passed; old native-assets test inspected hardcoded filename arrays, superseded by generated manifests | Replaced that implementation-specific assertion with exact generated file/MIME inventory and copied-byte checks; `node --test tests/native-assets.test.js` passed |
| Full UI 1 | Search, cross-page navigation and general offline create/edit/restart passed; Initiative assertion read selection before async `actions.edit` returned to `selectContext` | Preserve assertion, wait for observable selected context; `tests/initiatives-ui.mjs` passed in targeted cycle2 |
| Source review correction | Archive badge duplicated only one spelling and directory navigation could include the current directory itself | Use existing `archivedPath` domain decision in controller; preserve original directory descendant exclusion; production layout keeps original pager structure |
| Stalled old-source search diagnostic | One headless navigation test from the removed-Organization-template interval did not settle | Interrupted only its verified owned Node/headless test process tree; recorded `build/issue92-search-navigation-interrupted.json`; subsequent full UI run's search/navigation passed |

Current resource-only native harness mode reuses the existing executor and guards;
it adds generated-tree bindings and actual custom-scheme module/style/denial checks
while an active draft remains protected. It has not been launched and requires a
separate final-source coordinator grant.
