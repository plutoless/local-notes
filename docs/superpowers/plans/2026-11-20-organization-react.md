# Organization selection and explicit request migration

Starting/base SHA: 8ae4622f4a23033ec149038d9a370c9985a138e8.
Native GitHub dependencies and written blockers #93/#85 are closed; fetched main
includes #110 and #100 plus the shared #106 correction. No overlapping open PRs.

The approved content-structure design and issue #98 define this slice. Execute
inline without implementation workers. Preserve the pinned toolchain and Chinese
application copy. No source/schema/native service changes or automatic requests.

- [x] Capture baseline selection/query I/O and matching responsive screenshots.
- [x] Add typed callback-only production selection, preview and settings components.
  Keep the existing controller, Organization service, repositories, drawer/leave
  authority and candidate renderer. Separate roots prevent competing DOM owners.
- [x] Replace selection/settings/preview mutations with model publication; preserve
  keyed fields, caret, selection, bounded queries and explicit send/cancel callbacks.
  Fence workspace/request completion and keep submitted settings writes truthful.
- [x] Extend the real catalogue and document roots, bridge and overlay ownership.
- [x] Run meaningful existing domain/storage tests, focused Organization actual-app
  browser journeys with real isolated adapters/readback, typecheck, production build
  and Mac packaging. Native OS/IME/clipboard replay is release deferred; Android and
  standalone Syncthing deferred. Preserve failures and scope every receipt.
- [x] Obtain independent final-head Standards/Spec reviews, correct material findings,
  commit/push the isolated branch and submit one PR with exact evidence.
