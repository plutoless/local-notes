# Issue 68: recent-reading continuation

Starting SHA: `7f317f0b9e404d7cd0e2b1a2cdc165edfd6ea02a`.
Integrated latest-main base: `7d304ee235b4490697fa4c7e32dae144f7f6f96a` (delivered issue 70 / PR 78).
Final production/test code head: `33cce5f2a4774debada9be5a33d8503bc585aa41`.
Subsequent evidence-only commits do not change production/test bytes. The exact final reviewed PR head is reported separately in the coordinator handoff.

## Delivered behavior

Current Focus retains priorities, waiting Actions and active Initiatives, with at most three recent-reading entries below them. No entries means no extra section, count or setup. Entries show a title and short folder context; full source paths and removal live in the management disclosure. Removal and Home background refresh preserve useful keyboard focus.

Reading history contains only exact path, title, content fingerprint and scroll offsets in workspace-keyed device-private WebView storage. It is independent of synchronized records and disposable indexes. Reading order is recorded on reader use, not inferred from modification times. Dirty/recovered drafts keep the existing editing/leave lifecycle. Resumption revalidates the exact path through existing native metadata exclusions and guarded reads, never searches for a same-named substitute, and opens changed content at the beginning with a notice. Known application moves migrate the private path; external moves/missing sources retain an explicit retry/remove route. Late responses are fenced by workspace, page and request intent.

A continuation opens one source body and rebuilds only that already-read source's derived descriptor/tags. This preserves delivered classification after index removal without starting a full Library scan. The existing metadata enumeration remains proportional to workspace file count; there is no claim of constant-time enumeration. Nested wiki return and caller-owned global-search return remain delivered by their existing contracts. Issue 65 ordering was not implemented.

## Executed validation

All final commands ran against the code head above; exit zero is recorded in the linked logs.

| Command / evidence | Result and boundary |
| --- | --- |
| `npm run check` — [log](integration/check.txt) | Passed syntax checks |
| `npm test` — [log](integration/shared-tests.txt) | 67/67 shared/storage tests passed |
| `CHROME_PATH=... npm run test:ui` — [log](integration/ui.txt) | Complete storage-backed Chromium UI suite passed, including search returns, classification, wiki, continuation and draft lifecycle |
| `npm run build:mac` — [log](integration/mac-build.txt) | Signed development Mac package built |
| `npm run build:android` — [log](integration/android-build.txt) | Signed development APK built; build only, not Android runtime coverage |
| `LIBRARY_EVIDENCE_DIR=... python3 tests/native-reading-history.py` — [log](integration/native-execution.txt), [report](integration/native-report.json), [preflight](integration/preflight.json) | Actual Cocoa/WKWebView native process quit/restart/resume and keyboard/focus/scroll journeys passed |
| [Classification regression](integration/attempts/classification-after-index-removal-red.txt) → [green](integration/classification-after-index-removal-green.txt) | Real UI/storage failure and correction after deleting reference indexes |

The continuation browser journey additionally holds an actual Library body read pending, opens Home, changes isolated workspace and releases the late indexing response; the original workspace's continuation remains usable. Native acceptance covers desktop, 393×852 and 800×400, OS-injected Enter and Cmd+Q, nonzero restored scroll, reading mode, Home return focus, source modification/move/missing/duplicate-basename recovery, populated independent positions in two roots across restarts, application move through its contextual form, disposable SQLite removal and preserved topic controls after that removal.

The native app is an instrumented copy of the built Cocoa app with unchanged production web assets, native storage/index code and termination handshake. Test-only additions provide a command channel, read counter, window sizing and a synthetic directory-chooser seam. DOM setup/focus and state inspection are distinguished from OS-injected Enter/Cmd+Q. Physical-keyboard input and an uninstrumented installed-app GUI run were not performed.

The preflight freezes committed head, production and instrumented package/probe hashes before launching owned native processes. [Artifact hashes](integration/artifact-hashes.json) additionally verify every web asset matches source, the Mac package and the APK. The native report records 2,003 before/after synthetic Markdown hashes and formal-record hashes, all unchanged after controlled fixture changes are restored. Device-private LocalStorage files remain outside both isolated sync roots. No real notes or AI requests were used.

## Measured behavior

Hardware: Apple M4, Mac16,1; macOS 26.5.2 arm64. Corpus: 2,003 synthetic notes, including a 400-paragraph reader; exact byte size is in the artifact manifest. This is not a claim of equivalence to a real nas2 corpus.

Cold-process Home: 482–1,293 ms and zero source-body reads. Ordinary warm Home: 155–169 ms and zero source-body reads. Direct resumes: 456–619 ms and exactly one source-body read, including after index removal. Timings include command-channel and OS-input overhead; “cold” means a new app process, not flushed OS caches. Counters count native note-read commands, excluding asset/SQLite internal filesystem I/O. A prior application-move attempt observed one already-running Library indexing read overlapping Home; that failed assertion is preserved and the final probe records this overlap category separately rather than asserting a false zero. No latency target or broad performance improvement is claimed.

## Independent reviews and resolutions

- Pre-main original [Standards](standards-original.md): two P2 findings, full paths on Home and focus loss on removal; both resolved. Pre-main original [Spec](spec-original.md): read-counter assertions and populated two-workspace coverage missing; both resolved.
- Latest-main original [Standards](integration/standards-original.md): zero findings at `1471a2cd5e4f171047460b9377e2623296947b4f`. Latest-main original [Spec](integration/spec-original.md): P2 missing classification descriptor after index removal, plus incomplete final evidence. The descriptor regression was reproduced red/green and corrected using only the already-read source; successful final native evidence replaces the incomplete attempt.
- Final code-head [Standards](integration/standards-final-code.md) and [Spec](integration/spec-final-code.md): zero unresolved production findings at the final code head. Reports identify independent reviewer provenance and exact reviewed bases/heads. The full UI suite subsequently completed successfully as recorded above. Exact final evidence-only-head confirmations are returned separately to the coordinator.

[Implementation notes](implementation.md) preserve decisions and earlier limitations. [Failed attempts](integration/attempts/) remain separate from successful final evidence; the original pre-main native success is retained under `pre-main/`.

## Cleanup, limits and handoff

All owned native processes were terminated/waited, including failed attempts. The original installed `com.tencent.inputmethod.wetype.pinyin` input source is verified unchanged/restored in each final report. Exclusive GUI leases were explicitly released after all GUI/input operations.

Android runtime/device/SAF/offline/restart/keyboard checks and standalone Syncthing tests are deferred by parent 63 and repository policy, never reported passed. Physical input, real/private corpus behavior and cross-device end-to-end synchronization were not executed. Private navigation hints are not a backup or synchronized reading history; clearing app-private WebView storage removes them. Source changes reopen from the beginning, and external moves require explicit recovery rather than inferred identity.

Human review: coordinator PR review and conditional merge decision remain required; no unresolved code-review finding or additional inferred acceptance waiver is claimed. This worker did not merge, close issues, change labels, touch other worktrees or modify coordinator/scheduler state.
