# Global search React implementation plan

**Goal:** Deliver only #97 / #89 stories 32–33, retaining compact A and delivered indexed keyword search.

**Architecture:** Keep SearchScreen as the one query/session/navigation authority. A typed React view owns dialog contents and receives result models and callbacks; the existing controller owns the dialog element and its one containment/shortcut registration. Existing WorkspaceSearch remains the sole index/source boundary. No new persistence, semantic retrieval, models or external processing.

**Tech stack:** Delivered pinned React 19.3.1, TypeScript 5.9.3 and Tailwind 4.3.5. Targets remain macOS 13.3/WebKit 16.4 and Android 8/API26/WebView111+.

Starting and fetched main: `8ae4622f4a23033ec149038d9a370c9985a138e8`. Native blocked_by and written blockers #93 and #84 were queried and are closed; #110 and #104 are ancestors of main. Shared #106 is present. No open PRs at preflight. Work is confined to this isolated branch.

- [x] Capture baseline maintained search journey and production build; preserve same-state screenshots and asset sizes.
- [x] Add typed search result/scope/view callbacks and production React dialog content; use consumed Button and existing semantic tokens. Preserve keyed input/row DOM across updates and IME selection. Legacy app receives the existing explicit SearchScreen navigation adapter; React never owns source persistence or global events.
- [x] Retain session/request/workspace fences, bounded pages, scope and archives, source validation, exact identity, expansion/copy, scroll, invocation/return and protected-modal rules. Replace only DOM construction/update operations inside the React root.
- [x] Add meaningful boundary coverage and run existing search unit/index integration tests plus small actual-app search/open/return journeys and focus/IME event checks. Compare same-state screenshots, I/O and asset/performance observations.
- [x] Register actual SearchContent in the catalogue and record component/overlay/bridge ownership. Run typecheck, production web and Mac packaging; no native GUI grant, no optional native launch. Ordinary native OS/IME/clipboard remains release-deferred, Android/Syncthing deferred, minimum OS/Intel/physical input unrun.
- [ ] Commit final implementation, obtain independent Standards and Spec reviews on exact head vs starting SHA/latest main, resolve material findings, push isolated branch and open one PR using a body file. Coordinator alone merges/closes/labels.

Validation layers: existing search unit tests cover filtering, bounded ordering, stale responses and source guards; real Swift-storage/index fixture integration covers delivered Markdown/JSON/index contracts; maintained search UI and navigation journeys cover actual input/focus/caret/selection and cross-page returns with real isolated adapters. Packaging covers generated shipped assets without asserting OS transport. Preserve failed receipts and at most two consecutive completed same-signature cycles without progress.
