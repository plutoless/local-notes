# Local Notes presentation reference

This is the authoritative presentation contract for issue #31 and downstream page work. The approved structure is direction 09's contextual workspace with direction 01's restrained native light finish, delivered by #26/#30. This contract consolidates that baseline; it does not authorize redesigning #32–#37.

Open the [rendered catalogue](catalogue.html) through a repository-root HTTP server (`python3 -m http.server 8091`, then `/docs/design/catalogue.html`). It imports the real `web/style.css` and `web/presentation.js`; it is not a product route and must never enter primary navigation. English headings are maintainer guidance; Chinese controls demonstrate application copy. No native bridge or user workspace is required.

## Tokens and hierarchy

The `:root` declarations in `web/style.css` are the implemented source of truth. The catalogue reads their computed values rather than maintaining a second palette.

| Purpose | Token | Rule |
| --- | --- | --- |
| Reading / canvas / sidebar | `--surface`, `--canvas`, `--sidebar` | Neutral light surfaces; no decorative colored cards |
| Text / secondary text | `--text`, `--muted` | Secondary does not mean illegible; normal text ≥4.5:1 |
| Action / selection | `--accent`, `--selected`, `--selected-text`, `--hover` | Restrained blue; selection also uses weight and `aria-current` |
| Status | `--success`, `--warning`, `--danger` | Always pair color with a Chinese receipt, warning or failure message |
| Interactive / decorative boundaries | `--line`, `--divider` | `--line` ≥3:1 on light surfaces; `--divider` only separates noninteractive regions |
| Keyboard indicator | `--focus` | 3px outline, 2px offset, ≥3:1; never remove it |
| Rhythm | `--space-small`, `--space`, `--space-section` | 4/8/24px; 16px field margin, 24–32px document padding |
| Shape / elevation | `--radius`, `--radius-panel`, `--shadow-panel` | 8px controls, 14px panels; elevation only for overlays |

Typography uses system UI with PingFang SC / Microsoft YaHei fallback. Body 14px/1.6, note body 16px/1.9, page title 23–28px/1.4, section heading 18px/1.5, row title 14–15px/1.65, secondary metadata 12–13px. Use weight 500–650, not letterspaced Chinese slogans. User text wraps anywhere when needed; do not truncate the only actionable title. Textarea resizing and reading scroll remain available. SVG icons are 19px, stroke 1.6, aligned at the text center; narrow navigation uses 16px icons, retaining 44px targets. Icons supplement labels; icon-only actions require an explicit Chinese accessible name.

Controls have 44px minimum hit height. Default density is comfortable, not compact. Hover uses `--hover`, press uses a restrained blue fill. Disabled controls remain visible and explain prerequisites near the control. Motion is limited to 120ms feedback; reduced-motion disables transitions, animation and smooth scrolling. No idle animation or automatic rearrangement.

## Implemented primitives and state contract

`presentation.js` owns DOM construction and presentation vocabulary only. It must not read records, open workspaces, save revisions, or know storage paths. Existing enum values and user content pass through unchanged.

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
