# Library React migration implementation plan

**Goal:** Deliver issue #92's complete Library browse/read/edit/return journey using React, TypeScript and compiled Tailwind 4, preserving existing repositories and lifecycle behavior.

**Architecture:** React exclusively owns Library controls/rows and shared reader content; a typed host boundary delegates lifecycle/persistence to existing services. Unmigrated screens retain their DOM and modal owners. One bridge and native exit registration remain.

**Targets:** Maintainer explicitly chose Tailwind 4 and macOS 13.3/system WebKit 16.4-era capabilities; Android 8/API 26 with Chromium WebView provider 111+. These targets are approved requirements, not claims of executed minimum-version runtime tests. Starting SHA: `6f2dec964856c14f98b5a805019dc03b0cc83b41`.

## Constraints

English project material, Simplified Chinese app and accessibility copy. No schemas, automatic AI, sibling migration, legacy task promotion, or competing lifecycle authorities. Android-specific/Syncthing tests deferred. Baseline native lease released; final native validation requires a separate coordinator grant. Implement inline; only independent final review may use agents.

## Task 1: Offline asset pipeline and resource boundary

Files: `package.json`, lockfile, `vite.config.ts`, `tsconfig.json`, `web/react/`, `scripts/build-web.mjs`, native resource integrations and package scripts.

- [x] Pin dependencies; compile a client-only relative-path Vite build to `build/web`; map Tailwind tokens without preflight. `npm run typecheck` and `npm run build:web` must succeed.
- [x] Generate a constrained relative-path asset manifest from clean output. Mac and Android serve only listed canonical paths with exact host/scheme and MIME checks, rejecting encoded traversal, workspace paths, symlinks and unknown assets.
- [x] Add meaningful resource-path rejection tests before implementation; run targeted tests and Mac package build. Verify package tree exactly matches generated output; no development server/CDN needed.

## Task 2: Library ownership and typed boundary

Files: `web/react/library.tsx`, typed models/adapters, `web/library-screen.js`, `web/app.js`.

- [x] Runtime-validate query reply notes/metadata using a stable public adapter; test malformed replies, optional totals and bounded paging without mirroring repository implementation.
- [x] React consumes Library model/callbacks and owns controls/rows exclusively; preserve legacy topic drawer and explicit handoff of shared `#items` before any other renderer runs.
- [x] Keep bounded native query, filters/order/archives/page/scroll/selected path and async workspace/request fencing. Adapt the real-storage Library browser journey to built assets and assert existing observable behavior.

## Task 3: Shared React reader/editor

Files: `web/react/reader.tsx`, typed host adapter, `web/app.js`, `web/index.html`.

- [x] Transfer reader/editor DOM and callbacks to one React root; replace host DOM writes with explicit typed adapter updates, preserving existing lifecycle, expected-base save, drafts, wiki/search returns and every entry point.
- [x] Preserve input DOM identity through ordinary updates; focus/selection restoration and safe Markdown use existing semantics. Keep overlays outside the reader root with one trap and opener authority.
- [x] Run maintained parser/lifecycle/public-interface tests, focused real-storage persistence/restart integration, and essential built actual-app browser save/readback/wiki/discard/recovery/focus/caret tests.

## Task 4: Catalogue, acceptance and delivery

Files: production-consumer catalogue and architecture/build docs. Keep execution evidence in ignored local output or CI artifacts and summarize results in the PR, under `docs/agents/validation.md`.

- [x] Probe actual contextual drawer/search coexistence before documenting primitive choice. Record consumed components and ownership inventory, desktop/393px/short/reduced-motion/contrast/hit-target observations and same-state source-bound baseline comparisons.
- [x] Run affected checks, full unit suite once, TypeScript/build/package and selected maintained cross-page UI suites because shared reader ownership changes broadly. Preserve failures and cumulative repairs.
- [x] Request final-source native grant for offline custom-scheme bootstrap/nested/MIME/host/path/security and affected lifecycle checks. Report unrun compatibility and release-native/device limits honestly.
- [x] Commit implementation and obtain independent Standards and Spec product-source reviews against starting SHA, repairing material findings with targeted retests.
- Delivery gate: review the documentation/evidence delta at final head against latest main, push the isolated branch, open one PR via body file and report exact head/base/evidence to the coordinator. No merge/close/triage/main push.

## Execution ledger

- Preparation: prerequisites verified closed and merged; baseline passed and lease released. Compatibility decision received from coordinator; dependency choice now authorized.

- Product source 83da354: implementation, focused repairs, unit/integration, browser and affected native-resource acceptance completed; native lease released after audited cleanup. Final evidence/documentation review, push and PR delivery remain.
