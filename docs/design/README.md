# Local Notes production design

The production app follows the maintainer-selected Page-first workspace with an
optional right-hand Reference desk. The [selected direction](issue122/SELECTED.md)
records the review and alternatives. This document records the production
contract, including the Nov 22 reading comparison adopted in [#145](https://github.com/plutoless/local-notes/issues/145).
See the [screen and state inventory](journeys.md) for delivered owners
and regression coverage, and the [content structure specification](../superpowers/specs/2026-11-15-content-structure-design.md)
for data and decision boundaries.

Build with `npm ci && npm run build:web`. Serve the repository root locally
and open [the catalogue](catalogue.html). It imports the production stylesheet,
compiled React components and shared drawer. Its fixtures are synthetic, its
callbacks perform no writes or requests, and the application has no catalogue
route.

## Shared tokens and geometry

| Concern | Production rule |
| --- | --- |
| Canvas and context | White reader, warm-grey sidebar `#F7F7F4` and pale workspace dividers `#EFEEE9`. The warm details surface has quiet elevation on desktop and sits in flow on narrow windows. |
| Text | System UI with PingFang SC and Microsoft YaHei fallbacks. Reader ink `#292B28`, muted workspace text `#62645D`, metadata 12–13px, body 15px/1.7 and 18px section headings. The wrapping document title scales from 25px to 39px. Edit fields retain their separate typography. Source text, paths, codes and record IDs wrap or scroll within their own surface. |
| Spacing and shape | 4/8px base, 24px section rhythm, 6px control radius and 10px panel radius. The reader's centered outer column is up to 675px, with responsive 22–62px horizontal padding and compact read-only checklist rows. |
| Targets | Ordinary buttons and labeled controls reserve at least 44px. Compact buttons paint a 32px surface inside the target. A compact 40px field is enclosed by its 44px label target. Narrow full-width sheets preserve separate header, scrolling body and footer. |
| Color and selection | The current shell route uses sage `#E8EDE7`, stronger text and `aria-current`. The expanded details control shares the sage treatment and uses `aria-expanded`. Hover and press tint the current surface without replacing the keyboard outline. Search passage selection and task status keep their existing blue tint and state colors. |
| Contrast and focus | Normal text target ≥4.5:1. Interactive lines and focus ≥3:1 on adjacent surfaces. One solid 3px keyboard outline with 2px offset, inset on scrolling rows. The drawer field boundary, checkbox-row label and compact form label keep one focus cue. Invalid borders and associated receipt text remain available. |
| Motion | 100ms background feedback. Opening and closing are immediate. Reduced motion removes transitions, animation and smooth scrolling. |
| Icons | Fixed local SVG vocabulary, 19px with 1.6 stroke and 16px in narrow navigation. An icon-only control has a Chinese accessible name. |

`web/style.css` defines these runtime tokens. `web/react/styles.css` maps
them into Tailwind 4 without preflight. The catalogue displays computed
values and exercises focus, geometry and reduced motion.

## Components and ownership

| Component | Production adaptation and consumer |
| --- | --- |
| Button | Official shadcn/ui new-york-v4 native button through the shared `Button` facade. The finite native variant map covers consumed styles. The facade retains controller callbacks, stable receivers and optional pending-action protection. |
| Input, Textarea, Field | Pinned new-york-v4 source retains native props and slots. The vertically composed Field associates help and errors with the control. The reader owns stable editing receivers, and short tasks and record editors reuse the field styles. |
| Alert Dialog content | Pinned new-york-v4 header, title, description and footer inside the native protected leave dialog. Save requires the controller result. Continue restores selection and a deferred fallback yields to newer keyboard, pointer or input intent. |
| Sheet and centered dialogs | Right-side drawer composition follows the official Sheet header/body/footer. Search, file conflict, record conflict and protected leave share native top-layer modality and `bindModal` keyboard handling. Controllers still decide when each task can close and where focus returns. |
| Native select, checkbox and disclosure | Finite scope/status choices and checked source rows keep native semantics. Details expose optional fields, versions, paths or diagnostics. A checked row has one keyboard cue through its label. |
| Record rows, Markdown and search passages | Domain-driven content uses shared controls, selection, feedback and geometry. The safe reader and original-passage search preserve source identity and text. Search remains a scoped lookup with result/passage controls and explicit return. |
| Feedback and comparison | Shared receipts state what happened and keep raw diagnostics in details. The conflict comparison uses definition lists, and the active resolution uses real fields. Record versions and the local-only save boundary stay explicit. |

The pinned source, MIT license and native adaptations are documented in
[Library adoption](issue123/ADOPTION.md) and [form entry points](form-entry-points.md).
The [selected preview provenance](issue122/PROVENANCE.md) records supplementary
design references. Production ships the existing component family and local
assets. Store or index calls remain behind controller interfaces.

Native dialogs own background inertness. The shared Tab handling keeps
controls reachable under the WebView text-field-only setting and skips closed
disclosures. Search preserves composition-aware Escape. An external-file
conflict stays protected until an explicit copy, disk reload or applicable
active-task discard. Synchronization can be closed while an inspection runs
and returns focus to its opener. A dirty resolution uses Save/Discard/Continue.
A temporary leave decision acts on the captured task and awaits submitted work
before offering destructive choices.

## Production layout families

- **Shell and Current Focus.** Keep navigation stable, one page heading and
  one obvious next action. Group capture and global search first, then Current
  Focus, Library and Favorites, then Action, Initiative, Organization and Sync
  Check. Start with seven focused actions and offer more. Use bounded summaries
  and explicit resume. Keep directory paths in a disclosure and make workspace
  changes intentional.
- **Library and Favorites.** Filter and page bounded rows with a title,
  excerpt and contextual path. Page-first reading gives the document the
  main column beside the navigation rail. The slim toolbar offers a return
  breadcrumb, Edit and Details. Details opens a nonmodal panel at the right on
  desktop and below the toolbar at narrow widths. Collapse and Escape return
  focus to Details. Tabbing into the document or editing controls dismisses the panel
  and keeps focus on the destination control. The panel groups the source path, organization
  and source Action entry points. Long editing stays in the reader. Keep safe Markdown,
  read-only task markers and keyboard-scrollable wide tables.
- **Action and Initiative.** Action rows display status, timing and origin.
  Retain originating record and note selection during detours. An Initiative
  presents goal, progress, actions and linked notes in document order. Ending
  an Initiative requires explicit decisions for unfinished Actions.
- **Organization.** Keep source selection, service configuration, exact
  outbound preview, Send and stored Candidate review distinct. Each Candidate
  decision is explicit. Show uncertainty and verbatim evidence, with
  evidence before editing decisions at narrow widths.
- **Conflict review.** Record revisions compare side by side when space
  permits and stack at narrow widths. Keep full versions and exact revision
  IDs in diagnostics. Readers with external source changes choose to copy
  their edit or reload the disk version.

Use concise Simplified Chinese for application-owned labels, accessibility
names and statuses. Keep source text and protocol identifiers verbatim.
Distinct loading, partial, empty, unavailable and failed states must retain
the next action, diagnostics and applicable privacy or data-loss consequences.
A local save receipt makes no claim about receipt by other devices. For
changes to these surfaces, use the [validation policy](../agents/validation.md)
and record evidence boundaries in the PR.
