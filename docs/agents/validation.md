# Validation policy

The user confirmed the following project policy on 2026-11-16:

- Do not run standalone Syncthing synchronization tests unless the user explicitly requests them.
- Do not run Android-specific tests unless the user explicitly requests them. This includes physical-device SAF, offline operation, restart recovery, and keyboard checks.
- These deferred checks do not block merging a pull request. Do not request them again as a merge prerequisite.
- Record unexecuted checks as deferred by user decision, never as passed. Preserve existing validation results and describe their actual scope.

This policy supersedes Syncthing and Android testing requirements in existing specifications and issue acceptance criteria for current merge decisions. It does not change product behavior or remove the requirements to implement the requested feature, review the changes, and perform applicable shared-code and Mac validation. Existing build results remain recorded separately from runtime test results.

The user will request additional Syncthing or Android testing when needed.

## Browser-first acceptance policy (maintainer-approved, 2026-11-21)

This is an explicit change to the acceptance method for existing and future work. It supersedes earlier blanket requirements for per-issue packaged-Mac, OS-injected keyboard, actual native IME or native clipboard evidence for shared UI behavior. Preserve the requested product behavior, source/data protections, failure records and final-head review requirements.

- Validate layout, reading/Markdown, forms, search, browser keyboard navigation, focus/selection/return, save/discard and cross-page journeys primarily in the actual shared application running in a browser preview. Exercise real controls and observable outcomes. Parser/unit tests, static mockups and mocked storage alone do not establish application acceptance.
- Persistence/index/search journeys must use isolated real Markdown/record storage and indexes through the existing repository/storage adapter and bridge contract, with persisted readback and reload/continuation checks as applicable. State exactly which native transport or OS integration the browser adapter does not exercise. Use synthetic/private-safe fixtures; this policy grants no model download or private-note processing consent.
- Native checks remain required when a change affects native host implementation, bridge transport/wiring, packaged/custom-scheme resource loading or allowlists, app lifecycle/termination, OS shortcut registration, system clipboard integration, native text-input/IME integration or platform compatibility. Run only the affected checks. Native packaging/build verification remains applicable when shipped assets or resource integration change. UI code receiving keyboard/composition events alone does not mandate an OS-input replay for every issue.
- For ordinary shared UI issues, move the previous native compatibility/actual-IME/OS-input replay requirements to release-level checks, nonblocking for the individual PR. Record them as deferred by this user-approved policy, never passed. Browser coverage does not prove native integration. For example, #92 still needs actual Mac packaged custom-scheme/bootstrap/resource-security checks because it changes that integration; it does not require replaying every UI journey natively.
- Existing issues #65, #82, #84, #85, #86 and #105 may be accepted on sufficient current-head browser/application-storage evidence plus applicable checks and separate Standards/Spec review when production host integration is unchanged. Reassess old missing-native dispositions under this policy. Actual product regressions, failed browser/storage checks, source loss, required host-integration failures and unknown resource custody still block the affected delivery.
- Do not queue or grant optional native replays for routine UI acceptance. If an owned native test is already running, complete safe cleanup and input/clipboard restoration before releasing custody; do not kill unknown processes or clear a lease by age. The coordinator must reconcile existing #65/#82/#105 GUI requests and ask the original workers for browser-first completion reports instead of continuing the optional native queue. Native test-executor construction is deferred; do not create implementation work for it under this policy.
- Android-specific tests and standalone Syncthing tests remain deferred and nonblocking under the existing policy. Final-head review, six-worker accounting, normal merge gates and dependency availability remain required. Release-level native checks must be reported separately; they do not silently become passed or block unrelated UI PRs.
