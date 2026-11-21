# Actions React implementation plan

**Goal:** Deliver issue #95 only, preserving persisted Actions and contextual return.
**Architecture:** Retain ActionScreen as repository/lifecycle authority; project-owned typed React components render Action controls, rows, sources and immutable history. Static form ports preserve legacy Initiative/app consumers until their migrations.
**Tech stack:** Existing pinned React 19.3.1, TypeScript 5.9.3, Tailwind 4.3.5; unchanged macOS 13.3/WebKit 16.4 and Android API26/WebView111 floors.

- [x] Verify prerequisite #93 closed in both GitHub dependency API and written blockers, and implementation on fetched main at starting SHA `8ae4622f4a23033ec149038d9a370c9985a138e8`; no open PR overlap at start.
- [x] Read approved content structure, parent #89 and issue #95 including maintainer layered-policy revisions; preserve existing domain services and Simplified Chinese application copy.
- [x] Replace Action markup and row/source/history rendering with typed production components; release shared-list root before another screen claims it. Keep single drawer/leave authority and stable control IDs for legacy consumers.
- [x] Validate storage/immutable revisions using maintained repository integration tests; run focused real-app reading-actions, forms and lifecycle journeys with isolated storage.
- [x] Add consumed components to catalogue; validate keyboard/pointer, invalid/selected, long Chinese, narrow/reduced-height and reduced-motion states. Record compiled-size and relevant I/O observations.
- [x] Run TypeScript, syntax, unit suite, production build and Mac packaging; record deferred OS/IME/clipboard and Android/Syncthing checks without passing claims.
- [x] Obtain separate final-head Standards and Spec reviews, resolve material findings, commit/push isolated branch and open one PR without merging or closing the issue.

Execution is inline as explicitly dispatched; no implementation subagents. No GUI grant has been issued. Browser storage exercises real Swift file/index adapters with a browser bridge shim, not native WKWebView transport.
