# IME validation harness repair

Starting head: `9a89dc495c353994a47fe4d18835894cddd731ab`.
Integrated main: `13cc92c65cf6877586cf5364211a2df570b80032` (PR #91).

The original ignored build-directory runner copied a probe containing
`Path(__file__).with_name('native-candidate-review.py')`. An import-only AST
reproduction confirmed it resolves beneath `build/issue82-ime`, where no helper
exists. No host, input-source or clipboard operation was involved. The failed
runner/log/receipt/report were retained under `build/issue82-ime/attempt-1`;
the original failed attempt remains failed.

`tests/native-reader-ime.py` is now the maintained probe. It resolves the actual
helper through an absolute repository-root path and imports only its definitions,
not another journey. The local `build/issue82-ime/run.py` is a small `runpy` wrapper
that delegates to this source. Import-only regression checks execute from outside
the repository and verify expected-head rejection. Runtime requires an explicit
matching `EXPECTED_HEAD`; build-only mode defaults to the current head and exits
before any input-source/clipboard access or app launch. Existing-process discovery
refuses uncertain probe ownership before synthetic host setup. Original native
recipient/sender/marked-route and real-composition assertions remain required.

Build-only compiles `ReaderIMEBaseline.swift` without executing it. A future
granted runtime first verifies its task/dispatch/run lease under lock, then saves
a durable private baseline of original input source and every clipboard item/type
before launching the host. The helper refuses an existing baseline file, uses
0700 parent/0600 file permissions and never prints original clipboard bytes.
Cleanup can restore independently of host liveness; it compares input identity
and all clipboard bytes before deleting the private file. Failure retains the
file and reports failed restoration. No such baseline operation has run under
this no-custody assignment.

Repair-cycle history is maintained in `ime-repair-cycles.json`; the original
signature is resolved by import-only and successful build-only execution. Native
Chinese editor IME/caret/selection/return/save/discard acceptance remains unrun
until an explicit GUI grant and actual execution. No prior synthetic composition
or assigned Chinese text is counted as real IME evidence.

Issue #105 remains sole-owned elsewhere. The note leave journey uses shared
`taskLeaveChoice`, making the stale deferred Continue/newer-input race relevant.
No fix is duplicated here, and the native probe does not establish that race is
unaffected. Integrate the owner's correction when delivered and rerun affected
Continue/return checks; no dependency waiver is inferred.

Main integration retained both focus documentation sections, both reader and
contextual-form UI commands, and all shared CSS/presentation changes from #91.
Android-specific and standalone Syncthing checks remain deferred; physical input
and required new native IME acceptance remain unrun.
