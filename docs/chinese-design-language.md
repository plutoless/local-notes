# Chinese shell and Current Focus design language

Issue: #16. This is the implemented baseline for downstream pages, not a new storage or application framework.

## Vocabulary and reading hierarchy

Use 当前重点 (Current Focus), 已确认行动 (confirmed action), 事项 (initiative), 笔记库 (library), 整理 (organization), 收藏 (favorites), and 同步检查 (synchronization review). Action states are 待办 / 进行中 / 等待中 / 已完成 / 已取消; initiative states are 进行中 / 以后再做 / 已结束. `web/presentation.js` owns enum-to-label mappings. Stored enums, IDs, paths, quotations and user-authored text retain their original values; no language switcher or migration is introduced.

Use the system font stack with PingFang SC and Microsoft YaHei fallbacks. Body text is 14px with 1.6 line height; note bodies use 16px/1.9; home heading 28px, page headings 23px, section labels 13px, record titles 15px. Chinese text wraps without forced letter spacing. Long descriptions and paths wrap rather than becoming a horizontal page scroll.

## Tokens and controls

`web/style.css` defines text (#202633), secondary text (#5d6878), canvas (#fafbfc), surface (#fff), sidebar (#f2f4f7), primary blue (#245bc3), input border (#89919f), decorative divider (#e4e8ee), focus blue (#075fcc), and danger (#a12622). Blue indicates an actionable primary control or selected navigation, never remote receipt. State words accompany all status roles; no state depends only on color or emoji. Use the same variables on downstream screens.

Use an 8px spacing base, 14–18px list-row padding, 24–48px page padding, 8px control corners, plain surfaces, and subtle decorative dividers. Lists use rows rather than individual bordered cards. Input boundaries retain sufficient contrast independently of decorative dividers. Buttons and fields have 44px minimum height, Chinese labels wrap, and every interactive element has a 3px visible keyboard outline. Hover and pressed states darken surfaces; disabled controls keep readable labels. Explanations remain outside disabled controls: action focus/history eligibility, initiative save prerequisites, analysis preview prerequisites, and incomplete synchronization history.

Use text labels as the primary navigation. Conventional plus, arrow and star glyphs only supplement named controls; the star has a Chinese accessible name. No emoji is used to encode home states. Fields have visible labels or explicit accessible names. Reuse `button`, `feedback`, `errorFeedback`, and the vocabulary exports from `presentation.js`; never apply automatic translation to arbitrary DOM content.

## Layout and interaction

The 200px desktop sidebar serves stable navigation and directory selection. Current Focus owns the remaining width with one primary 新建行动 control, secondary utilities, focused actions on the left and waiting/active initiative sections on the right. Below 1000px those sections stack. At 700px and below, navigation wraps above a single scrollable task surface; it never hides destinations in a clipped bottom bar. Editors retain their existing list/detail behavior and become a single editable panel on narrow viewports.

Home retains bounded queries, first seven/expand/page, open, create, remove and reorder operations. Empty sections explain the missing user-confirmed content and provide creation or selection actions. No checkbox backlog count is introduced. Loading messages describe an operation rather than internal index machinery. Save status says local only. Errors give a Chinese explanation and next step, with raw diagnostics in expandable 查看技术详情. They remain visible until dismissed or replaced; they do not expire while being read. IDs belong in record/history details. Synchronization review preserves full raw versions for comparison and explains incomplete history before disabling resolution. Dialogs support keyboard containment; native directory and path prompts use Chinese controls.

## Content audit

| Existing content | Decision | Reason and implemented example |
| --- | --- | --- |
| English eyebrow and duplicate LOCAL NOTES sidebar branding | Remove | No task information; retain one 拾记 identity. |
| Generic empty-editor slogan and permanent Markdown/file-ownership footer | Remove | Home has no unrelated editor; other views use a short selection instruction. |
| Permanent offline/Syncthing sidebar footer | Move | Receipt limitation belongs in 同步检查, where users inspect versions. |
| English shell navigation, status enums and creation forms | Translate | Chinese vocabulary at presentation sites; stored values unchanged. |
| Five equal home utilities | Reprioritize | One primary creation action, subordinate utilities and grouped task sections. |
| Raw record ID in action toolbar | Move to details | Accessible via 记录详情 without dominating the task. |
| English/raw failures and index readiness footer | Shorten/move | Chinese recovery message plus expandable diagnostic evidence; readiness disappears after load. |
| Empty focus/waiting/initiative sections | Retain and rewrite | State exactly what is absent; offer relevant creation/selection and waiting instructions. |
| AI transmission scope, exact input and relevance uncertainty | Retain/shorten | Preserve privacy decisions and evidence; previews remain explicit. |
| Unsaved drafts, external-edit conflict and both version choices | Retain | Protect recovery and source content; no automatic overwrite. |
| Synchronization conflicts, histories, protocol names and paths | Retain | Required evidence; raw JSON stays in details, never translated. |

## Validation boundary

See `docs/validation/issue-16.md` for executed checks, screenshots, and deferred checks. Reuse this baseline on later page issues without treating this change as acceptance of those separate page redesigns.

## Approved workspace direction (issue #26)

The user selected direction 09 (tree workspace) with direction 01 (native light list) styling after comparing ten interactive concepts. This supersedes the initial green visual baseline.

Home keeps one heading, one primary creation control, seven focused rows, waiting conditions, and active initiatives. The action title opens the detail; a per-row management disclosure contains reorder and removal. Creation of initiatives, AI organization, and refresh remain available in the More disclosure. Full root paths are in directory details; only the basename stays in navigation.

Initiatives use a persistent initiative list, an action/reference context pane, and an existing editor in the detail pane. Opening an action or linked note retains initiative context. On viewports at or below 900px, the context and detail occupy one pane at a time; below 700px the initiative list also becomes a separate step. Back controls retain the current initiative, and switching initiatives flushes note/action/initiative edits before changing selection. Source warnings expand the evidence editor and remain visible on context links.

See `docs/superpowers/specs/2026-11-16-workspace-design.md` and `docs/validation/workspace-design.md`. AI organization and synchronization-specific flow polish remains in #20 and #21.
