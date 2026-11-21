# Design exploration and selected direction

**Selected:** round-2 01 Page-first workspace plus 08 Reference desk as an optional right context panel, **collapsed by default**. Initial A/B/C were rejected. See [selected semantic contract](SELECTED.md) for the maintainer record, composition, reference decisions and reconciliation with older visual rules.

Open the durable selected preview:
`npm ci && npx vite --config vite.preview.config.ts --host 127.0.0.1 --port 8122`,
then `http://127.0.0.1:8122/docs/design/issue122/`.
Compile only the preview: `npx vite build --config vite.preview.config.ts`.
Serve `build/issue122` for the compiled version; entry remains `docs/design/issue122/index.html`.
No production build or real workspace is required. The Vite docs-only alias resolves the existing presentation controller's compiled-host import directly to the same shared React source owners.

## Rejected first-round history

The first three directions remain accessible through explicit `?direction=a`, b or c. They use identical synthetic fixtures and demonstrate distinct hierarchy, density, typography, surfaces and selection treatment. They are not the selected direction.

| Dimension | A — Compact index | B — Reading page | C — Grouped workspace |
| --- | --- | --- | --- |
| Hierarchy | Balanced list/document | Document first, catalogue rail | Context cards/workspace |
| Density | Compact ruled rows with excerpts | Breathing room, rail excerpts omitted | Tall grouped cards with metadata |
| Typography | Sans 16px/1.9 | Local serif 18px/2.05 | Sans 16px/1.85, stronger rows |
| Surface | Flat split/dividers | Warm paper | Neutral canvas/rounded cards |
| Interaction | Row selection/compact tools | Underline selection | Explicit card edge/context strip |
| Tradeoff | Scanning efficiency, tall long-title rows | Sustained reading, fewer list details | Clear grouping, more space |

The worker originally recommended A for scanning. The maintainer rejected all three, requested ten further alternatives, then explicitly selected the 01+08 composition. That choice supersedes the recommendation. The supplied ten-direction prototype was a throwaway composition reference; no production widget, editing, fake sync or storage behavior was adopted.

## Review boundaries and evidence

All previews are isolated from production navigation/storage. DOM/visual checks assess layout and local interaction, not product persistence, native transport or full application acceptance. Maintained tests and reusable synthetic fixtures stay versioned. Per-run screenshots, logs, results, source bindings and independent review reports stay local under ignored `build/validation/122/<head>/`; the PR body records exact-head results and separate reviewer conclusions. Local evidence is available only while this workspace is retained, not a public hosted screenshot service.
