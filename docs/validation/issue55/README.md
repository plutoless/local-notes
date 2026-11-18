# Issue #55: task-scoped lifecycle evidence

## Delivery validation

The implementation applies one active-task Save and leave / Discard changes and
leave / Continue editing decision to the delivered forms and native termination.
See [lifecycle contract](../../design/task-lifecycle.md). The baseline and integration
sections below are historical checkpoints, not the current delivery status.

Final logs and native accessibility transcripts are in `final/`. `source-hashes.json`
binds the delivered web resources to the uninstrumented native app; `validation-manifest.json`
records hashes for the production sources and regression scripts. The PR records
the exact committed head and separate final Standards/Spec review results.

Executed validation:

- `npm run check` and all 50 shared tests.
- All 14 suites in `npm run test:ui`, using installed Chrome and isolated Swift-backed
  storage fixtures. Coverage includes each decision, failed/invalid/conflicted
  saves, queued/submitted writes, competing leave intents, retained unrelated
  drafts, per-record recovery, partial business commits, stale note reads and
  metadata opens (including navigation away and back), reload, context restoration,
  and desktop/393px layouts. The confirmation traps forward/backward Tab and
  Continue restores focus. Both decision screenshots were visually inspected.
- `npm run build:mac` and isolated Cocoa/WKWebView form journeys with the delivered
  resources, native Escape and both Tab boundaries, restart draft recovery, real
  persistence, failed create/retry, note information/topic association, and location.
- Uninstrumented production app: actual window-close control, application-menu
  quit, OS-injected Cmd+Q, Continue, Discard, Save and leave, reentrant close during
  a quit decision, and process restart. Discarded capture titles did not reappear;
  Save and quit created exactly one Markdown note; four exits returned 0.
- Separately instrumented native failure coverage: simulated content-loss delegate
  callback, reload with retained draft, two ignored stale bridge replies, three
  accepted tokens and exactly two replies for the two pending termination requests.
  The native window/menu requests use real AppKit paths.

Execution limits: OS-injected keys are not physical-keyboard testing. The
content-loss case invokes the native delegate; it does not establish an actual
WebKit crash. Native form fixtures use controlled DOM entry for long text and
non-keyboard assertions; reduced-height capture uses a test-only minimum window
size override, while the production minimum stays unchanged. Chromium storage fixtures do not establish native input behavior;
those claims are limited to the separate Cocoa runs. Browser beforeunload uses
its built-in protection because custom asynchronous decisions are unavailable
there. Android-specific and standalone Syncthing tests remain deferred by user
decision and are not reported as passed.

Earlier validation runs exposed stale note/metadata continuations, committed
revision restoration, and stale conflict recovery messaging; these were fixed
and covered by regressions. Some old journeys also read hidden inputs before an
asynchronous drawer reopen or edited the prior note before a new note finished
opening; those tests now await the actual task. Final successful logs supersede
those failed attempts. No unrelated drafts were used as test fixtures.

## Isolated baseline reproduction

These artifacts establish defects on production baseline
`ed75811831d42690606844352b3f8fced72dffe9`; they do not validate a fix. Production
files were unchanged at that checkpoint.

## Executed baseline checks

- `npm run build:mac`: passed, producing the unchanged baseline application.
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/issue55-baseline-ui.mjs`: reproduced hidden-editor interference using a temporary Swift-backed storage fixture and synthetic browser-local recovery data.
- `python3 tests/issue55-baseline-native.py`: reproduced acknowledgement-only window-close and app-menu quit warnings in an isolated copy of the production app with independent Sync/Private directories and a unique bundle identifier. Both acknowledgements retained the dirty initiative drawer. A subsequent explicit save created exactly one synthetic initiative; clean menu quit exited with status 0.

The browser fixture recovered an invalid blank action, navigated to the clean
library, and attempted to open `reference.md`. The action editor was hidden;
`hasUnsavedChanges()` nevertheless returned true. Opening the note triggered
hidden action validation (`请填写行动描述。`) and left the note editor hidden.
No `actionWrite` occurred, and the source note bytes were unchanged. The private
action draft remained, but its serialization gained default empty fields in the
failed global save attempt; it was not byte-identical to its original value.
See `baseline-hidden-action.json` and desktop/393px screenshots.

The native script used the actual window close control and application-menu quit,
not a JavaScript-only substitute. See `baseline-native-close-alert.txt`,
`baseline-native-quit-alert.txt`, the corresponding accessibility snapshots, and
`baseline-native-result.json`. The synthetic title was read back after each
acknowledgement and from the saved JSON record.

## Execution limitations

The first browser invocation failed before opening a page because Playwright's
downloaded Chromium was absent. The successful retry used installed Chrome.
An initial browser assertion expected byte-identical draft serialization and
failed; the successful reproduction explicitly records the normalization above.
These are baseline diagnostic scripts and intentionally assert the existing
failure. They should not be added to the fixed-behavior regression command.

There is no evidence here for every reported stall variant, physical keyboard
Cmd+Q, restart recovery after explicit discard, or corrected behavior. Shared
checks, complete UI suites, final native close/quit/restart verification, and
separate final-head Standards/Spec reviews remain outstanding. Android-specific
and standalone Syncthing checks are deferred by user decision.

## Scoped implementation direction

Use the visible editor or frontmost editable drawer as the active task, identified
by workspace and record/new-draft identity. Keep private background drafts separate
from that task. Route leave intents through one asynchronous Save and leave /
Discard changes and leave / Continue editing decision with Chinese application
labels. Keep explicit business transactions (especially ending initiatives and
per-action choices) intact.

A task lifecycle must compare input with its baseline, cancel queued autosaves,
serialize submitted writes, and establish their actual committed outcome before
closing or resetting anything. Discard clears only the active uncommitted draft;
completed revisions and other task drafts remain intact. Guard late callbacks by
workspace/task generation. Native close/quit must await this same decision once
and return termination replies without recursive confirmation. Preserve the
selected C drawer presentation and existing return context.

Implementation and regression coverage must include notes, actions, initiatives,
topics, contextual return paths, invalid/failed/conflicted saves, delayed writes,
clean-page navigation with retained unrelated drafts, and actual native restart.
The coordinator owns merge. Issue #48's worktree is outside this assignment.

## PR54 integration checkpoint

Baseline evidence above remains attached to its original `ed75811` production
source. PR54 was verified merged as `ed3ae2617b3b705fa3b01f6ce4cc5b3608049320`.
The baseline artifacts were preserved in `127eaa2`; `origin/main` was integrated
without conflicts in `0e2c8e7d5cb181d39c73347d2bacdf67fa2eddd1`. A fast-forward was
unavailable because of the preservation commit; a normal merge retained both
histories. No force push or changes to the issue48 worktree occurred.

Integration checks on that source passed: syntax, all 46 shared tests, all 13 UI
suites, the Mac build, and the delivered remaining-form Cocoa/WKWebView journeys
(14 settled captures, native Escape and forward/backward Tab boundaries, controlled
DOM entry/assertions for remaining cases). Uninstrumented production window-close
and application-menu quit also passed the existing acknowledgement-warning
baseline assertions, retained the draft, saved exactly one record, and exited
cleanly. This confirms that the trap remains; it does not validate issue55's
required three-way close behavior. Logs and resource hashes are in `integration/`.

Re-running the targeted browser fixture with `--integrated` establishes that the
hidden recovered invalid action no longer blocks note opening on PR54. The draft
is now byte-identical and the note unchanged. The global unsaved flag is still
true on the clean library. See `integrated-hidden-action.json`; preserve this
improvement while replacing the remaining global flag and flush behavior.

Test-generated changes to 60 historical validation images were restored after
the suites. New evidence is confined to issue55. Implementation, new lifecycle
regressions, corrected native close/Cmd+Q/restart evidence, and separate final-head
Standards/Spec reviews remain outstanding. There is no PR or merge-ready claim.
