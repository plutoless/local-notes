# Approved Workspace Implementation Plan

> **For agentic workers:** Execute this approved plan inline, task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Use a fresh code review after implementation.

**Goal:** Deliver the approved tree workspace with restrained native light styling in the real application.

**Architecture:** Retain the existing domain repositories and forms. Introduce a context pane inside main, keep selected initiative context while existing action/note editors occupy its detail pane, and use the shared stylesheet for the approved visual baseline.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Playwright, Swift/WebKit, existing SQLite storage harness.

## Global Constraints

- UI copy is Simplified Chinese. Project documentation, comments, issues, and plans are English.
- No new dependencies, storage format changes, automatic task imports, or AI calls.
- Android-specific and standalone Syncthing tests remain deferred by user policy.
- Preserve stored IDs, enums, JSON revisions, SQLite indexes, note contents, draft recovery, source evidence, and conflict handling.

### Task 1: Native light shell and lightweight home

**Files:** `web/style.css`, `web/index.html`, `web/focus-screen.js`, `web/presentation.js`, `docs/chinese-design-language.md`.

**Interfaces:** Keep `FocusScreen.show()` and existing DOM IDs. Add shared `icon(name)` returning trusted inline SVG. Per-action disclosures own existing reorder/remove buttons.

- [ ] Replace green tokens with neutral surfaces and blue selection; separate subtle dividers from high-contrast input boundaries. Apply shared row/control/typography rules without changing persisted data.
- [ ] Render one home heading and one primary control. Keep existing action-open accessible names and seven-item/pagination behavior. Use `<details class="row-menu"><summary>管理</summary>…</details>` for secondary action controls.
- [ ] Put the root basename in the directory summary and retain the complete path inside its details.
- [ ] Run `node tests/focus-ui.mjs` and inspect desktop/mobile screenshots. Expected: focus creation, reorder, removal, recovery, keyboard focus, contrast, and pagination pass.
- [ ] Commit the shell/home change with its design record.

### Task 2: Context-preserving initiative workspace

**Files:** `web/index.html`, `web/app.js`, `web/initiative-screen.js`, `web/action-screen.js`, `web/style.css`, `tests/workspace-ui.mjs`, `package.json`.

**Interfaces:** `InitiativeScreen` owns selected context and `renderContext()`; `openNote(path)` retains context when initiated within the workspace. Existing `flush()` gates switching, `load(path)` opens note details, and action editor persistence remains unchanged.

- [ ] Add `#workspace-context` and `#workspace-detail`. Move existing initiative action controls into context; render source-link buttons there while retaining editable source evidence in the overview.
- [ ] Keep `.workspace` active while overview/action/note details change. Explicit detail back controls restore overview, and the context back control returns to the initiative list on narrow screens.
- [ ] Add integration assertions using the production storage adapter: selected initiative survives action opening, note opening/edit/save, overview return, failed save, and 393px navigation.
- [ ] Run `node tests/workspace-ui.mjs` and `node tests/initiatives-ui.mjs`. Expected: workspace behavior and existing ending/recovery/source-link flows pass.
- [ ] Commit the workspace change.

### Task 3: Verify and provide an isolated preview

**Files:** `docs/validation/workspace-design.md` and screenshots under `docs/validation/workspace-design/`.

**Interfaces:** Existing `npm run check`, `npm test`, `npm run test:ui`, `npm run build:mac`; preview uses unique bundle identity and isolated note/private roots.

- [ ] Run applicable shared checks, full suites once, and Mac build. Expected: exit status 0; deferred platforms explicitly recorded.
- [ ] Capture and inspect home, initiative overview, action detail, note detail, and narrow layouts. Exercise the Mac preview without touching daily data.
- [ ] Review the full branch against standards and this approved spec, fix material findings, and record evidence.
- [ ] Commit validation evidence and expose the running preview to the user.
