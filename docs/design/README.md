# Local Notes presentation reference

This is the authoritative presentation contract for issue #31 and downstream page work. The approved structure is direction 09's contextual workspace with direction 01's restrained native light finish, delivered by #26/#30. This contract consolidates that baseline; it does not authorize redesigning #32–#37.

Open the [rendered catalogue](catalogue.html) through a repository-root HTTP server (`python3 -m http.server 8091`, then `/docs/design/catalogue.html`). Run `npm ci && npm run build:web` first. It imports the real `web/style.css`, `web/presentation.js` and compiled production React components; it is not a product route and must never enter primary navigation. English headings are maintainer guidance; Chinese controls demonstrate application copy. No native bridge or user workspace is required.

## Tokens and hierarchy

The `:root` declarations in `web/style.css` are the implemented source of truth. The catalogue reads their computed values rather than maintaining a second palette.

| Purpose | Token | Rule |
| --- | --- | --- |
| Reading / canvas / sidebar | `--surface`, `--canvas`, `--sidebar` | Neutral light surfaces; no decorative colored cards |
| Text / secondary text | `--text`, `--muted` | Secondary does not mean illegible; normal text ≥4.5:1 |
| Action / selection | `--accent`, `--selected`, `--selected-text`, `--hover` | Restrained blue; selection also uses weight and `aria-current` |
| Status | `--success`, `--warning`, `--danger` | Always pair color with a Chinese receipt, warning or failure message |
| Interactive / decorative boundaries | `--line`, `--divider` | `--line` ≥3:1 on light surfaces; `--divider` only separates noninteractive regions |
| Keyboard indicator | `--focus` | Keyboard actions: 3px outline, ≥3:1; 2px offset on controls, inset 3px on scrollable rows. Contextual editable fields use the 2px active boundary described below; pointer buttons remain restrained |
| Rhythm | `--space-small`, `--space`, `--space-section` | 4/8/24px; 16px field margin, 24–32px document padding |
| Shape / elevation | `--radius`, `--radius-panel`, `--shadow-panel` | 8px controls, 14px panels; elevation only for overlays |

Typography uses system UI with PingFang SC / Microsoft YaHei fallback. Body 14px/1.6, note body 16px/1.9, page title 23–28px/1.4, section heading 18px/1.5, row title 14–15px/1.65, secondary metadata 12–13px. Use weight 500–650, not letterspaced Chinese slogans. User text wraps anywhere when needed; do not truncate the only actionable title. Textarea resizing and reading scroll remain available. SVG icons are 19px, stroke 1.6, aligned at the text center; narrow navigation uses 16px icons, retaining 44px targets. Icons supplement labels; icon-only actions require an explicit Chinese accessible name.

Controls have 44px minimum hit height. Issue #45 supersedes the earlier blanket comfortable-density direction: density follows the control role. Home actions use compact 32px visible surfaces inside reserved 44px targets; navigation, row openers, disclosures, icons and fields retain their own geometry. Other existing consumers retain their current density until their task adopts this contract. Hover uses `--hover`, press uses a restrained blue fill. Disabled controls remain visible and explain prerequisites near the control. Motion is limited to 120ms feedback; reduced-motion disables transitions, animation and smooth scrolling. No idle animation or automatic rearrangement.

## Implemented primitives and state contract

`presentation.js` owns legacy DOM construction and presentation vocabulary only. For issue #92 consumers, `web/react/` owns React DOM and receives typed data/callbacks. This supersedes the DOM-constructor-only implementation rule for the migrated Library and shared reader/editor; legacy consumers keep their current ownership. Both implementations consume the same CSS semantic tokens. It must not read records, open workspaces, save revisions, or know storage paths. Existing enum values and user content pass through unchanged.

| Primitive | Consumer / usage | State behavior |
| --- | --- | --- |
| `button(text, run, {variant, label})` / `.ui-action` | Focus actions, shell capture/directory controls, save, sync | Primary: one next action per task; secondary: outlined save; quiet: navigation; danger: remove focus. Disabled during awaited action; keyboard outline; failures handled by caller with draft retained |
| `.icon-action` | Note-detail favorite control; catalogue uses `icon()` vocabulary | 44px square, explicit accessible name; use only when text is redundant in a demonstrated tight toolbar |
| `field(label, control, {help, invalid})` / `.ui-field` | Shell search; labeled capture title/body use the existing accessible names | Label always associated; invalid sets `aria-invalid`, visible hint linked by `aria-describedby`; callers provide actual validation and retain invalid values |
| `selectionRow()` / `.ui-row` | Focus row openers | Whole title actionable; `aria-current` and selected fill; loading does not imply empty; disabled and keyboard states follow button |
| `disclosure()` / `.ui-disclosure` | Focus utilities and per-row management | Native summary: Enter/Space, explicit expanded state, no custom menu keyboard model; management names identify the row |
| `sectionHeading()` / `.ui-heading`, `.section-heading` | Focus title/sections, workspace section headers | One visible Current Focus title; action aligned beside section heading when needed |
| `feedback()`, `errorFeedback()` / `.ui-feedback` | Notice, save/error/retry surfaces | Failed diagnostic behind details; concise Chinese explanation first; loading, dirty, saving, saved, recovered text remains live; no success claim before persistence |
| `bindDialog()` / `.ui-panel`, `.ui-dialog` | File conflict dialog and sync panel | Trap Tab inside modal; restore opener; Escape cannot discard protected edits. Native details/panel scrolling remains available |
| `nav` / `.active`, `aria-current` | Shell | Selection distinct from hover; descriptive Chinese names, icons hidden from AT |
| `.ui-pagination`, `.action-pagination` | Bounded Focus paging; action list uses the same layout class | Explicit previous/next, unavailable direction disabled; seven Focus rows initially, explicit expand then bounded pages |

`primary: true` remains a compatibility alias for existing consumers. The catalogue's disabled/invalid examples are deliberate fixtures, not promises of new product behavior. Status is never conveyed by color alone. Form-level invalid errors retain input and supply a retry path. Failed note saves keep private local drafts and block task return; explicit Save retries the existing write. Autosave and Save share the same serialization and expected-base protection. Reopen reads the saved body; a recovered draft is visibly identified. A local-save receipt never implies remote receipt.

A new variant requires a real consumer, an interaction/state need that existing primitives cannot express, a reference entry and catalogue example, keyboard/narrow/contrast evidence, and a review explaining the distinction. Do not add an unused theme system, variant taxonomy or page-specific replacement for shared controls.

## Approved layout families

- **Lightweight home:** one title and primary next action, seven initial focused actions, subordinate waiting/initiative summaries, management in per-row disclosures. Home queries metadata/records, never every note body.
- **List/detail browsing:** bounded list with search/filter/pagination; readable selected note in a separate detail surface. At narrow widths use list/back instead of compressing columns.
- **Initiative context plus selected detail:** persistent initiative goal/progress/actions/reference context beside selected content; collapse to context/detail navigation at narrow widths. Preserve selection across saves.
- **Staged organization:** select → inspect exact sending scope → send → individually review. Privacy decisions, uncertainty and source evidence stay visible. Do not turn it into a generic editor column.
- **Focused dialog/panel review:** local conflict/candidate decision with explicit close/back and draft guards. Details contain IDs, full paths, raw diagnostics and full versions. Keep source comparisons readable and scrollable.

These are families, not a requirement to put every page into one narrow three-column template.

## Content audit and adoption contract

| Existing content | Decision | Reason |
| --- | --- | --- |
| Brand `拾记`, task titles, action descriptions | Retain | Product identity and actionable/user-authored content |
| Duplicate home heading in hidden collection header | Retain hidden only | One visible heading; shared collection header needed elsewhere |
| `尚未打开内容` / creation hint | Retain outside home | Explains the empty detail pane without a slogan |
| Home empty focus/waiting/initiative hints | Shorten to one actionable sentence | Avoid repeated onboarding while retaining next step |
| Full root path, source path, IDs, raw error | Move/keep in details | Reachable for diagnosis without dominating task surface |
| Save state, recovered drafts, external-change warnings | Retain | Prevent data-loss ambiguity |
| Source quotes, fingerprints/history, missing-source warnings | Retain details/evidence | Preserve source protection and uncertainty |
| AI service privacy, exact request scope, confirmation decisions | Retain | Necessary sending and review decisions, not filler |
| Local save vs remote receipt, conflict branch information | Retain | No unsupported synchronization promise |
| Generic progress fallback / repeated descriptions | Shorten only where no evidence is lost | No fabricated progress; “尚未记录进展” is sufficient |
| Decorative slogans, AI filler, blanket safety promises | Prohibited | No such additions are needed; do not replace real failure/privacy evidence |

Downstream #32–#37 must:

- Import these tokens and primitives; cite the closest real shell/Focus/capture example and catalogue state.
- Preserve Chinese application copy/accessibility names, user text/paths/protocol names and persisted enums; keep project prose English.
- Audit copy with retain/remove/shorten/details decisions. No slogans, repeated onboarding, raw internal errors as the primary message, or unsupported promises.
- Choose the appropriate family; show selected context and reachable back paths at 393px. No fixed narrow three-column mandate or private control palette.
- Exercise applicable normal, empty, loading, invalid, failure/retry, disabled, dirty/saving and recovered states. Verify focus/restoration, ≥44px targets, contrast and long Chinese content.
- Preserve bounded queries, durable revisions, rebuildable indexes, source guards, workspace isolation, private drafts and recovery. Presentation code cannot own storage changes.
- Preserve delivered organization/candidate/sync behavior; run shared local conflict/revision checks. Record browser/native evidence separately and all deferred checks honestly.

## Conflict comparison rows

Issue #36 uses `comparisonRow(label, value, {changed})` inside a definition list. It wraps long user evidence, marks differing fields with Chinese text, and uses semantic text/divider tokens. Rows are read-only; version selection uses secondary actions, and resolution editing uses `field()`. Blocked incomplete/cyclic histories retain readable evidence while their controls are disabled. The catalogue demonstrates both unchanged and differing rows. The synchronization panel reuses the shell/Focus `selectionRow()` for record jump navigation, the capture field pattern, and the existing feedback and dialog catalogue states; no private palette or control variant is introduced.

`bindDialog()` additionally returns `open()` for callers that need to capture an opener synchronously before focusing a newly visible panel. Existing hidden-attribute consumers remain supported. Closing restores that opener without replacing the underlying editor or its scroll surface.

## Organization adoption (#35)

Organization uses the staged family above, shared field/disclosure/feedback/action classes and constructors, and shared pagination. Preview is primary until exact scope is ready; Send then becomes primary. Candidate confirmation is primary and other decisions are quiet; editable text, placement, uncertainty and evidence remain visible. No storage contract changes.

The demonstrated `.ui-selection` extension supports multi-selection, where `selectionRow()` would incorrectly model a single navigation action. It retains native checkbox Space/Tab behavior, a 44px label target, selected tokens, one 3px keyboard-only label outline (the child checkbox does not draw a second outline), and disabled interaction through the existing inert selection container during preview/send. Long paths wrap. The catalogue demonstrates checked/unchecked states; organization exercises loading/disabled states.

## Integrated journeys (#37)

Use the [screen/state/content inventory and contributor checklist](journeys.md) for cross-page changes. It maps real shared primitives and catalogue states to maintained journey suites, including unavailable-source recovery and the quiet return-to-original-action control. Visible navigation selection and accessible current-page announcements must change together.


## Selected C contextual forms (issue #45)

This is the authoritative reconciliation of the maintainer-selected C structure with the older comfortable-density baseline. C governs contextual creation and short editing forms; its dimensions remain proposed defaults until demonstrated by the dependent real flows (#46–#48). Issue #45 implements home controls and catalogue examples only, not drawer primitives or topic/initiative journeys. The content and persistence boundaries in [the content structure design](../superpowers/specs/2026-11-15-content-structure-design.md) remain authoritative.

Open a single modal task from the right edge of its current content surface, keeping the list/workspace visible and inert behind a restrained backdrop and subtle left divider/shadow. Never insert form fields into browsing toolbars, shift the list vertically, or stack drawers. Preserve search, filters, selection, pagination and scroll across save/cancel; expose a newly created record without resetting unrelated browsing state. Long-form notes retain their document surface; conflicts and AI review retain specialized protected layouts.

| Element | Proposed default / rule |
| --- | --- |
| Short topic form | About 390px, clamped to available surface width |
| Multi-field form | About 460px; full width if readable background context cannot remain |
| Header | 20–24px vertical / 24px horizontal; one task title, optional parent context, accessible close |
| Body | 24px horizontal, 20px field-group gaps; consistent label/field/disclosure/feedback left edge |
| Footer | 12–16px vertical / 24px horizontal, 8px action gaps; reachable while body scrolls, never covering final fields/errors |
| Button | `--button-surface: 32px`; `--target-height: 44px`, `--control-inset: 6px` |
| Single-line field | `--field-surface: 40px`; label target reserves at least 44px |
| Labels / shape | 8px label gap, subordinate optional marker; existing 8px radius and semantic tokens |

The production `button(..., {density: 'compact'})` opts into the compact treatment; home is its first screen consumer. Its pseudo-element paints only the surface and receives no pointer events; the actual button reserves all target space in normal flow and keeps its focus outline. Wrapped labels increase both target and surface height. No negative margins or overlapping invisible hit extensions. Row openers remain full text targets, aligned with management summaries; navigation and icon actions remain at least 44px. `field(..., {density: 'compact'})` demonstrates a native 40px field in a padded, associated label click area in the catalogue. This is presentation only; constructors never own storage/index operations.

Use vertically arranged labeled fields, not placeholder-only names. Optional metadata/source links use disclosures unless hiding them would conceal an actionable warning. Long Chinese text, paths and validation wrap without horizontal scrolling. Footer Cancel is quiet and precedes the sole primary Create/Save action; save/error feedback has a separate readable region. Destructive discard is not an equal primary beside Save.

Opening captures the opener and focuses the first meaningful field or heading. Tab/Shift+Tab stay within the drawer; closing restores the opener or a meaningful surviving replacement. Close, Cancel, Escape, backdrop, navigation and native termination share existing unsaved guards. Backdrop never silently discards. Dirty tasks always offer Save and leave, Discard changes and leave, or Continue editing through the [task lifecycle](task-lifecycle.md). Clean cancellation creates no record; repeated submission creates no duplicates; reopening reads saved data. Recovery stays scoped to workspace/entity. Preserve source guards, serialized writes, immutable revisions and conflicts.

| State | Required behavior and text evidence |
| --- | --- |
| Normal | One task title, concise labels and appropriate Create/Save verb |
| Dirty | Retain inputs and show editing status; all exits honor guards |
| Saving | Disable duplicate submission, retain values, show saving status |
| Invalid | Explain beside field; focus first invalid input and keep values |
| Failed | Keep form/input intact, readable retryable error; no success receipt |
| Saved | Announce local success only after persistence; preserve browsing context |
| Recovered | Distinguish recovered draft from saved data, sources and conflicts |

Around 700px and below, or whenever context becomes unreadable, use a full-width task surface with visible close/back. Verify 393px and reduced-height windows directly. Scroll the body independently and keep the footer reachable; on-screen keyboards must not cover active fields, errors or final actions. These drawer interaction and responsive requirements are contracts for dependent implementations, not claims that a drawer ships here.

Application copy/accessibility labels remain Simplified Chinese; user text, enums, paths and quotations remain intact. Retain privacy, source, unsaved, recovery and conflict evidence. Remove slogans, duplicate instructions, blanket promises and implementation explanations from normal flow. Catalogue state fixtures demonstrate shared primitives, not simulated persistence acceptance.

### Consumed drawer: topic creation and rename (#46)

`presentation.drawer()` supplies a native modal `<dialog>` in the top layer with a titled header/close control, independently scrolling body and reachable fixed footer. `LibraryScreen` is its first real consumer; the initiative and action consumers are described below. Native dialog semantics make the workspace inert and contain keyboard focus. Dismissal is delegated to the consumer, which waits for submitted writes and offers the shared three-way decision for dirty input. Navigation and native termination await the same task-scoped decision. Private workspace/entity-scoped drafts recover on reopening after process loss, retaining the original revision for conflict safety. Invalid and failed saves retain input, with in-drawer accessible feedback and retry. Creation never resets the active topic filter; the new topic appears in the filter selector.

The rendered catalogue imports the same constructor. Topic surfaces use 390px on desktop and full width below 700px, 24px body padding, shared compact fields/actions, and independent body scrolling at reduced heights. Validation evidence is in `docs/validation/issue46/`.

### Consumed drawer: initiative metadata (#47)

`InitiativeScreen` reuses `presentation.drawer()` with the wide 460px surface and the shared header/body/footer rhythm. Selecting an initiative retains the contextual action/reference workspace; its metadata action opens the drawer. Title, goal, progress and status share vertically labeled field groups. Sources and lifecycle decisions remain disclosures that open automatically for actionable warnings. Cancellation restores the prior selected document/action and browsing context; successful creation makes the record reachable in the existing list. The existing initiative repository, source evidence and end/reopen transaction behavior remain unchanged. Dirty close, Cancel, Escape, backdrop, navigation and native termination share the asynchronous Save/Discard/Continue task decision. See [executed validation and limitations](../validation/issue47/README.md).

### Remaining short-form consumers (#48)

The [finite entry-point inventory](../validation/issue48/inventory.md) records the scope and concrete retained-layout exceptions. Action creation and metadata editing use the existing wide drawer; Home retains its contextual page behind the task. Source navigation waits for a successful read before hiding that task, so unavailable sources retain the editable origin. Quick capture now collects title/body before creating a file; its private draft retains the create path to recover an interrupted submission without creating a second note. After successful persistence, the existing document editor and return route remain available. The note-information drawer keeps existing individually persisted favorite/topic actions; its Done action returns to the document. Naming/location is a separate short task using the existing expected-text move and link-repair receipt, never a nested drawer.

Long Markdown editing, initiative working-note creation, candidate review, privacy/request scope and multi-version conflict comparison remain in their documented layout families. The shared compact fields/actions and drawer-body rhythm cover short forms; source/history disclosures retain evidence. Finishing one task precedes opening another; modal tasks cannot stack background conflict review. Recovered action drafts are never implicitly confirmed just by navigating to another page.

The catalogue demonstrates the same wide constructor and field geometry without persistence. [Issue 48 execution status](../validation/issue48/README.md) separates browser/storage results, controlled native journeys and observed production close/quit evidence; the catalogue does not establish acceptance. Async openers can pass `drawer.open(first, origin)` explicitly when disabling the trigger would otherwise blur it in WKWebView.

## Notes-only compact search (issue #58)

The shared top-right entry opens a native modal in the compact single-column A family. `SearchScreen` consumes the existing `field`, `button`, `.ui-panel` and `bindDialog` behavior; the native dialog makes the underlying task inert. Repeated Command+K refocuses its input, Escape closes and restores its opener, and an existing protected modal retains ownership. Lookup never calls the current page's save or leave handler. Library filters remain independent.

`NoteSearch` owns workspace-aware query/context access and incremental reference-index reconciliation. Descriptors are bounded to 20 results and 900 excerpt characters, title matches precede body-only matches, context loads on demand and verifies the source fingerprint. Keyword results include eligible archive paths; the path distinguishes duplicate titles. Render original text through text nodes and safe marks, keeping list/table/link notation selectable. The bordered passage is precisely the copy range, including after expansion. Attribution starts off and adds title plus workspace-relative path; no shareable URL is implied. Clipboard receipts follow the native write result.

Loading, updating/partial cache, empty, query failure, unavailable/changed context and clipboard failure have distinct Chinese status text and a refresh path. This delivery exposes only Notes. Source navigation, multi-entity scopes and meaning retrieval belong to #60, #59 and #61 respectively. The catalogue below demonstrates presentation states only; real retrieval evidence comes from isolated storage journeys.


### Task-scoped leave decisions (#55)

[The editing-task lifecycle](task-lifecycle.md) is authoritative for baseline,
private recovery, autosave, submitted writes and explicit discard. A centered
confirmation dialog asks about the captured active task; it does not stack another
contextual editing drawer. Continue restores input and focus; Save and leave
persists that task only; Discard and leave bypasses its invalid/failed/conflicted
save while retaining completed writes and other tasks' private drafts. A clean
visible page ignores hidden recovered editors.

## Scoped compact search (issue #59)

The same compact A dialog now starts with All content and exposes 全部内容 / 笔记 / 事项 / 行动 inside the modal. Scope buttons use shared actions with `aria-pressed`, wrap at narrow widths and retain the query. Same-workspace reopen retains the session; workspace reset clears scope/query and fences delayed replies. `WorkspaceSearch` extends the existing query/context boundary with typed workspace/entity/passage identities and bounded merging of private reference and confirmed-record index results. The library remains note-only and independent.

Formal results expose original title/goal/progress or action description/waiting text as separately identifiable passages. Expansion and verified copying use the same selection, keyboard, attribution and receipt flow. Read-only reconciliation may update private indexes but never repairs or writes synchronized records. Conflicted/incomplete records are omitted with an incomplete-index receipt. Source opening remains #60 and meaning retrieval remains #61. No new frontend assets or presentation primitives are introduced.

## Inline reader navigation (#67)

`.wiki-link` is the reader's inline local-navigation button. The normal quiet action's toolbar padding and UI font would interrupt sentence rhythm, so this real reader consumer uses inherited reading typography, underlining and 4px horizontal padding while retaining the shared accent, focus outline and minimum 44px target. The catalogue renders its example through the production Markdown renderer. Native button Tab/Enter semantics and Chinese accessible names distinguish aliases from plain text without interpreting source markup as HTML. Desktop/393px browser and native keyboard/selection/scroll return checks are recorded under issue67 validation; the shared accent/surface contrast is covered by the design-system suite.

## Browse focus roles and modality (issue #81)

This supersedes the blanket outline/focus-within interpretation for shared browse controls. Use native `:focus-visible` for buttons, sidebar navigation, disclosures and pagination. Pointer activation and pointer-driven programmatic return retain actual focus without forcing a keyboard frame; Tab/Shift+Tab and keyboard returns expose position. Mac WKWebView explicitly enables Tab navigation through buttons and links independently of Safari preferences. Text fields keep their native caret and existing visible focus treatment, including invalid fields; invalid borders/messages never become selection or focus state.

Scrollable `.ui-row` controls draw the shared 3px outline inward so the scrollport cannot clip the cue. Selected fill, weight and `aria-current` remain present with or without transient keyboard focus. Composite checkbox labels use `:has(input:focus-visible)` rather than `:focus-within`, with a single label outline and independent checked fill. Never outline a broad field/form/container merely because a child is active. Programmatically focused return headings retain a visible keyboard cue.

Real consumers are Current Focus row openers and management disclosures, shell sidebar, Library/Favorites rows, Initiative/Action rows and their existing pagination. Rerender restoration uses stable record identity and never takes focus from another active surface. Preserve both collection and row-list scrolling on return. Drawer lifecycle, drafts, source selection and storage remain owned by existing consumers. Catalogue examples demonstrate role states; native OS input evidence is separate from browser/DOM setup. Other feature journeys (#82–#86) are outside this slice.

## Search focus adoption (issue #84)

The compact A search dialog reuses issue #81's native `:focus-visible` treatment for scopes, result openers and child actions. Result selection (`aria-current` and selected fill), pressed scope (`aria-pressed`) and keyboard focus remain independent. Focusing Copy or Open source does not outline the containing result; these scrollport child actions use the shared inward offset so the cue cannot be clipped. Attribution reuses `.ui-selection` for one keyboard outline on its checkbox label and independent checked fill, retaining its existing 44px target and spacing. Arrow selection keeps the search input/caret available; repeated Command+K refocuses that input. A delayed refresh restores a result control only when its previous focus was displaced by the inert results, never over a newly chosen input/control. Source return retains the actual Open source control before the shared action disables it, then restores that control or the search input if it no longer exists. Search has no invalid-field state; unavailable sources and copy failures use the existing status/retry receipts.

## Reader focus adoption (issue #82)

The reader reuses issue #81's modality contract for inline wiki buttons and its toolbar. Source-location blocks and the read-only reading container retain programmatic focus and source hooks without a decorative outline; search matches retain their existing text highlight. These are reading destinations rather than operable controls. Keyboard Tab proceeds to the existing operable controls, whose focus cues remain visible. Horizontally scrollable Markdown tables use the shared 3px focus token with an inset cue. Editable title/body fields retain their caret, selection and field focus treatment, including pointer entry. No focus operation writes Markdown or confirmed records. The note source editor has no invalid-field validation state; conflict and failed-save feedback retain their existing separate meanings.

## Contextual form focus (issue #83)

Contextual drawers reuse the shared focus token for a single 2px active editable-field boundary (border plus 1px inset). This replaces the text field's outer outline for pointer and keyboard editing while retaining the caret. Invalid fields retain their danger border and message alongside the blue inset; invalid is never a focus or selection state. Buttons, disclosure summaries and the three-way leave decision keep the #81 keyboard-only 3px outline. No form, label or drawer receives a competing parent frame. Checkbox rows retain the existing single keyboard label outline and independent checked fill.

Tab containment excludes controls inside closed disclosures, even when the browser reports layout rectangles for those descendants. Opening a disclosure makes its controls reachable in document order. First meaningful focus, task ownership, recovery, submitted-write waiting and native close/quit decisions remain with existing consumers. The catalogue topic drawer demonstrates normal and invalid fields using the same production styles.

The drawer declares its requested first receiver with native `autofocus` while open, in addition to synchronous focus. This prevents WKWebView keyboard reopening from choosing the header Close button after a previous Tab cycle. Closing removes only an autofocus attribute introduced by the drawer; pre-existing attributes remain intact.
