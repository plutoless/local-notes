# Comparable directions — choice pending

Open `index.html` through the preview dev server:
`npm ci && npx vite --config vite.preview.config.ts --host 127.0.0.1 --port 8122`.
URLs: `http://127.0.0.1:8122/docs/design/issue122/?direction=a` (or b/c).
Build only the preview: `npx vite build --config vite.preview.config.ts`.
Serve `build/issue122` for an offline compiled preview; entry remains `docs/design/issue122/index.html`.
No production build is required. No real workspace is requested or read.

| Dimension | A — Compact index | B — Reading page | C — Grouped workspace |
| --- | --- | --- | --- |
| Hierarchy | Balanced list and selected document | Document first, quiet catalogue rail | Context cards and document workspace |
| Density | Compact ruled rows, excerpts visible | More breathing room, excerpts omitted in rail | Taller grouped cards, explicit source metadata |
| Typography | Sans 16px / 1.9 reading | Local serif 18px / 2.05 reading, 34px title | Sans 16px / 1.85, stronger row title |
| Surface | Flat split and dividers | Warm paper, almost no card chrome | Neutral canvas, bounded rounded cards |
| Interaction | Immediate row selection and compact tools | Quiet underline selection, generous reading tools | Explicit selected card edge and context strip |
| Tradeoff | Best scanning efficiency; long titles make rows tall | Best sustained reading; less list information at once | Clearest task/source grouping; consumes more space |

Recommendation only: **A**, because it preserves scanning density and a neutral Chinese reading surface while making the smallest conceptual change to delivered list/detail browsing. The maintainer may prefer B for reading or C for contextual reuse. **No direction is selected.**

Every direction uses `fixtures.ts` without per-direction content forks. Desktop and short-window captures begin on the same selected note; 393px begins on the list with explicit row/open/back. The form and search retain the same query/fields/results. These are DOM/visual previews, not product acceptance or persistence evidence.

## Reconciliation proposals awaiting choice

All candidates retain light baseline, Chinese application copy, source evidence, stable text, separate focus/selection/error and reduced motion. A proposes 6px controls and flat surfaces; B 2px controls and serif reading; C 10px controls/14px cards. These values are **candidate local rules**, not changes to `docs/design/README.md` or production `web/style.css`. After explicit choice, publish one semantic contract and reconcile geometry, typography and 100ms feedback against the older 8/14px and blanket 120ms rules. Existing compact search and contextual-form task ownership remain authoritative; no preview rewrites those controllers.
