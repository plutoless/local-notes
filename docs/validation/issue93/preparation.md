# Issue #93 preparation and blocked baseline

Starting/fetched-main SHA: `2f5a8af78ada6da3c0f6d323cdb3b654e50cb9ed`.
Branch: `plutoless/local-notes-issue-93`; initially clean isolated worktree.
Issue #93 / parent #89 acceptance and current linked guidance were read.
Native dependency API and written blockers name #92 only; #92 is closed and
its changes are in the starting SHA. PR #106 is merged at `20302d140dac350e543731543d72246275ee7353`;
no open PRs were returned. No native grant, host execution, private processing,
coordinator-workspace edits or GitHub mutations occurred.

## Baseline failure

Environment: Node v25.1.0, npm 11.6.2, macOS local workspace.

1. `npm ci` exited 1 before typecheck/build/browser execution.
   Signature: EUSAGE, missing `@emnapi/core@2.0.0-beta.2` and
   `@emnapi/runtime@2.0.0-beta.2` from lockfile.
2. Hypothesis: peer-resolution compatibility with local npm. Command:
   `npm ci --legacy-peer-deps`; exited 1 with the identical missing-lock signature.
   This did not improve behavior. Both raw receipts are retained in ignored
   `docs/validation/issue93/logs/install*.log`.

The lockfile contains requirements for these packages under the optional WASM
binding/runtime but no corresponding package entries. No package or lockfile
was changed. No baseline performance, browser, test, typecheck, build or package
pass is claimed. Baseline source is untouched; source preservation has not yet
been tested at runtime. Two completed attempts; zero correction cycles completed.

## Pending work

A plan and draft, unwired Focus presentation/model files exist as untracked work.
They are not a functioning migration, have not been typechecked or reviewed and
must not be treated as delivered. No commit, push, PR or final-head reviews exist.
Resolve reproducible installation in the #92 prerequisite or explicitly authorize
its small lockfile correction here, then capture baseline before wiring migration.
Native OS/IME/clipboard release replay, minimum OS/engine, Intel and physical input
are unrun; Android/Syncthing remain deferred. No user product decision is needed;
this is an engineering prerequisite/ownership decision for the coordinator.

## Authorized setup repair and continuation

Coordinator reply `msg_94f8f43e4ab9` authorized the minimal lock repair in this
branch, without changing package.json, majors or compatibility. With the exact
Node v25.1.0 / npm 11.6.2 environment recorded, inspection identified the optional
WASM binding's exact beta requirements and runtime peer constraints. Standard
`npm install --package-lock-only --ignore-scripts` added 46 lines: four missing
optional package entries (core peer, its nested wasi-threads, and binding-local
core/runtime beta). No existing locked entry/version changed; npm supplied all
registry/integrity metadata. `npm ci` then exited 0 without workaround flags
(44 packages, zero audit vulnerabilities). One completed correction cycle resolved
this signature. `npm ls --all` records the platform-dependent optional tree.

Implementation resumed after repair. The draft warning above describes the earlier
pause, not the final delivered state; see README.md for current evidence and scope.
