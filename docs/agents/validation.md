# Validation policy

The user confirmed the following project policy on 2026-11-16:

- Do not run standalone Syncthing synchronization tests unless the user explicitly requests them.
- Do not run Android-specific tests unless the user explicitly requests them. This includes physical-device SAF, offline operation, restart recovery, and keyboard checks.
- These deferred checks do not block merging a pull request. Do not request them again as a merge prerequisite.
- Record unexecuted checks as deferred by user decision, never as passed. Preserve existing validation results and describe their actual scope.

This policy supersedes Syncthing and Android testing requirements in existing specifications and issue acceptance criteria for current merge decisions. It does not change product behavior or remove the requirements to implement the requested feature, review the changes, and perform applicable shared-code and Mac validation. Existing build results remain recorded separately from runtime test results.

The user will request additional Syncthing or Android testing when needed.
