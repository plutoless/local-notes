# Issue 45 validation

Starting/base commit: `eeabc7ea6ef7e386caa944ffcd156ee8a49c55b3` (also freshly fetched `origin/main`). Issue #45 was re-fetched before edits: open, no comments, native blocked-by endpoint empty, textual blocker section says none. No prerequisite implementation was needed. This worktree alone was changed.

## Before inspection

`before-1180.png`, `before-393.png` and corresponding native desktop/393 captures show the starting home. Primary action: New action; secondary: All actions and empty-state selection/initiative creation; utilities: New initiative, Organize, Refresh under More; row operations: native Management disclosure with move/remove; sidebar: capture, navigation, sync and directory disclosure/chooser. The primary surface consumed the full target height; row summaries used top padding inconsistent with row titles, and section/card spacing exaggerated the control height.

## Executed evidence

- `shared-tests.txt`: all 45 shared tests passed, including immutable revisions, interrupted writes, workspace isolation, delayed/forked histories and conflicts. Native asset allowlist checks inspect both shells statically; no Android runtime/build was invoked.
- `ui-tests.txt`: complete `npm run test:ui` passed, including bounded Focus queries, create/open/reorder/remove, note/source guards, recovery, conflicts and catalogue contrast.
- `check.txt`: `npm run check` passed.
- `mac-build.txt`: production Mac build and ad-hoc signing passed.
- `home-ui.txt`: targeted home desktop/393px, actual multiline Chinese action labels, growing target/surface geometry, no clipped labels, toolbar target nonoverlap, keyboard Tab/Shift+Tab and focus outline, Enter disclosure, reorder/remove passed. `after-*` captures show final geometry; `before-*` browser captures load assets from the pinned starting commit.
- `catalogue.txt`: shared native field surface is 40px inside a 44px label target, clicking outer padding focuses input; token contrast minima, dialog focus restoration, 393px and reduced motion passed. Text minimum 4.716:1, boundary minimum 3.571:1, focus minimum 4.983:1 across tested light surfaces.
- `native.txt`, `after-native.json`: isolated production Cocoa/WKWebView with real Mac storage and SQLite; create persisted focused actions, open, reorder, remove and 393px overflow assertions. The test-only file command/snapshot channel does not replace persistence or production web assets; SHA-256 hashes and byte-equality checks tie native resources to this worktree. Each app process is terminated in `finally`.
- `after-native-pointer.json` and keyboard evidence record actual Orca input plus WKWebView readback. Background synthetic keys did not reliably activate the summary; initial failures remain in `native-*-result.txt` / `native-input-initial-failure.txt`. Foreground Space retry passed: WKWebView readback confirms the expanded disclosure closes, while pointer activation confirms it opens. The foreground retry uses only the isolated validation app. Passing DOM/browser checks are reported separately from native input.

The browser dependency was installed locally without modifying package manifests; Chrome was explicitly selected with `CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` after the fresh Playwright installation had no bundled browser. This is a test setup workaround, not a product change.

## Scope and limitations

C reconciles the earlier blanket comfortable-density standard in `docs/design/README.md`. Its drawer widths and modal/recovery behavior are documented proposed defaults for #46–#48; no drawer implementation or dependent journey is accepted here. Home consumes shared compact geometry; the catalogue uses production constructors, including field and state examples, without simulating persistence acceptance.

Android-specific tests/builds, physical-device keyboard/SAF/offline checks, standalone Syncthing and two-device end-to-end synchronization were not run, deferred by user decision under `docs/agents/validation.md`; they do not block merging. The native fixture uses isolated synthetic records, not the user's live workspace. Maintainer aesthetic review remains useful because only C's structural direction was selected; this report does not substitute for approval of proposed drawer dimensions. Coordinator owns conditional merge.


## Two-axis review

Reviewed base `eeabc7ea6ef7e386caa944ffcd156ee8a49c55b3` through code head `ff65a4da69b4983c61f2129c804953391954789e` with separate read-only Standards and Spec agents.

### Standards

Pass: 0 unresolved findings. The initial maintainability finding (unused copied test scaffolding and a duplicate assertion) was removed. The final accessibility-targeted native probe introduces no new standards issue.

### Spec

Pass: 0 unresolved findings. The initial wrapped-label evidence gap was fixed with a three-line 393px fixture and assertions for target/surface growth, clipping and overlap. Native execution now passes with production resource hashes. Scope remains home density, C documentation and shared catalogue examples; no dependent drawer/topic/initiative implementation.

The evidence commit adds reports/screenshots only after this reviewed code head. Final validation checks the same production resource bytes. No unresolved issue requires a human implementation decision; visual preference review is recommended, and the coordinator retains merge authority.
