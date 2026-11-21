# Selected composition: Page-first workspace with optional Reference desk

## Explicit maintainer choice

The maintainer rejected the first A/B/C previews and requested a second round of ten composition studies. The live #122 section **Maintainer-selected direction — round 2** records the approved combination: **01 Page-first workspace** as foundation, with **08 Reference desk** as an optional **right-hand context panel, collapsed by default**. The maintainer's confirmation was “可以，就这样吧”; coordinator relay `msg_2da6e93294ad` answers original question `msg_39571f21e40d` and references selection relay `msg_732f92d0fc6d`. This is an explicit choice, not an inference from silence. It supersedes the historical A recommendation and pending-choice gate.

The supplied `/tmp/local-notes-design10-prototype` HTML/source/English README were inspected as the composition reference, especially 01 and 08. This durable React preview adapts their layout; it does not promote that throwaway prototype's widgets, fake synchronization receipt, editing, counts or persistence claims. The source reference's hashes are kept with local evidence, rather than making a temporary path the only usable deliverable. The selected preview is the default `index.html` entry. Explicit `?direction=a`, b and c preserve rejected first-round exploration, never approved alternatives.

## Semantic rules for subsequent scoped adoption

| Concern | Selected rule | Preview consumer |
| --- | --- | --- |
| Page hierarchy | Stable left navigation, one dominant document; no permanent middle Library column while reading | `SelectedPreview` navigation, page-toolbar, reading-layout |
| Reading | Centered document, maximum 800px outer width with 48px desktop padding; Chinese system sans 16px/1.95; title 30px/1.5, section 20px/1.6 | Markdown article, quote, table and code |
| Metadata | 12–13px/1.6 at explicit readable secondary color; full source path wraps; no guessed word counts or reading time | Source path and record/date labels |
| Navigation | Common entries remain easy to reach; Notes, Actions and Initiatives remain independent. Common note shortcuts are contextual entry examples, not a new persistence or route scheme | 资料库 / 行动 / 事项 and common notes; full Library list reachable |
| Context depth | Context panel is absent/collapsed on initial load and reload; user explicitly reveals properties, source/location and linked Actions on the right | 笔记信息 disclosure; desktop 280px context rail |
| Narrow context | At 393px, context follows the document within normal page flow, right-aligned to the content edge, without squeezing reading into columns or creating another modal | `reference-context`; explicit 收起 restores disclosure focus |
| Surfaces | Reading white `#fff`, canvas/context `#f7f7f5`, decorative separator `#deded9`; no card grid or decorative metrics in everyday reading | Navigation, document and context |
| Text | Foreground `#292927`, secondary `#555550`; danger `#a12625`, each with explicit Chinese message | Reader, metadata, invalid field |
| Selection | Neutral navigation fill `#e8e8e3` plus weight/current semantics; search passage `#e7edf5` with border and pressed state; selection is independent of focus | Navigation/current note, passage button |
| Interactive geometry | Controls keep at least 44px nonoverlapping targets; 6px control radius; no invisible overlapping hit extension | Shared Button, official Input/Textarea and native scope select |
| Boundaries/focus | Interactive border `#787875`; one solid 3px `#245cac` keyboard outline with 2px offset; editable-field error remains distinct. Do not ring the whole panel when a child is focused | Native controls, reader destination, existing drawer controls |
| Icons | If added in adoption, retain existing fixed local 19px / 1.6 stroke icon vocabulary, centered with text; no icon-only unlabeled action | Current preview uses labels, not an added icon library |
| Search | Top-right search and Command+K (Control+K fallback); compact dialog; all/notes/initiatives/actions scope; original excerpts; explicit passage and source return | One shared drawer lifetime, search portal and return-search control |
| Short forms | Contextual right-side task, explicit labels/error, preserved input, scrollable body with independently reachable footer | Shared drawer; official Input/Textarea; preview-only local receipt |
| Motion | 100ms background feedback only; opening/closing immediate in this preparation; no spatial/reading animation or motion dependency. Reduced motion removes feedback transitions | `.ui-action`; prefers-reduced-motion override |
| Source and privacy | Synthetic source bytes reused as text; no Markdown HTML injection, workspaces, persistence, model calls or automatic action conversion | Shared fixture module and explicit preview-only receipts |

These are semantic adoption rules, not an instruction to mechanically copy this isolated stylesheet across production. Existing presentation ports, controllers, safe Markdown renderer, stable record identity, source-return contexts, repositories, active-task-only Save/Discard/Continue, explicit Organization decisions, routes and data formats remain authoritative. Production adoption must route the selected visual rules through real consumed components and catalogue in the separately assigned slices. This issue performs no such rollout.

## Reconciliation with the older visual contract

| Earlier rule in `docs/design/README.md` | Decision for selected future adoption |
| --- | --- |
| Contextual workspace 09 + native-light 01 baseline | Superseded visually by round-2 Page-first 01 + optional 08 context, while retaining light appearance and behavioral ownership |
| Persistent list/detail browsing family | Keep it for full Library browsing; ordinary selected-note reading is page-first, with common entries in navigation and explicit Library return |
| Blanket 120ms feedback | Replace with finite 100ms background feedback; no mandatory spatial entrance. Reduced motion remains immediate |
| 8px controls / 14px panels | 6px controls, 10px selected task surface; production integration must preserve task geometry and target separation |
| Body 14px/1.6; reading 16px/1.9 | Retain UI rhythm; use 16px/1.95 reading for Chinese text and 30px/1.5 title, 26px title at narrow width |
| 4/8/24 rhythm, 24–32px document padding | Retain 4/8 spacing base, 24px groups; allow 48px reading padding at desktop / 20px narrow |
| Single focus/selection, C contextual form and compact A global search | Retain interaction owners; reuse actual `presentation.js` drawer and React overlay content in this preview, never a new dialog trap |
| Source/privacy/recovery, bounded loading, independent entities | Retain without weakening; this preview is not evidence of storage/native/product acceptance |

The main design README points here as the chosen future visual reference. Its existing production values remain implemented until a separately scoped adoption changes them; this issue changes no production tokens, selectors or runtime entry.

## Finite selected preview catalogue

Reader collapsed/expanded context; full Library populated/selected including duplicate paths; Markdown long Chinese prose, table/code; short form normal/invalid/input retained/corrected/preview receipt; global search query/scope/selected passage/no-match/source-return; independent entity entry examples; desktop 1280×900, narrow 393×852, short 1280×480; keyboard open/containment/Escape/return and reduced motion. No lifecycle persistence behavior is simulated as a real success. The short-form receipt says 未保存到工作区.

## Reference mapping

[Notion workspace anatomy](https://www.notion.com/help/intro-to-workspaces) and [writing basics](https://www.notion.com/help/writing-and-editing-basics) inform stable navigation plus a page-centered document. This is an independent composition, not copied Notion UI/source or a claim of block editing. [Fluid sidebar](https://www.fluidfunctionalism.com/docs/sidebar) informs explicit context versus primary navigation; no vendor navigation runtime is installed. Existing official shadcn provenance and the concrete Fluid/beUI/Watermelon retained/rejected examples remain in [PROVENANCE.md](PROVENANCE.md). B's serif and C's card grid remain rejected exploration; neither governs the selected composition.
