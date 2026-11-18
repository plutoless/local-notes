# Issue #55: isolated baseline reproduction

Implementation is not complete. These artifacts establish defects on production
baseline `ed75811831d42690606844352b3f8fced72dffe9`; they do not validate a fix.
No production files have changed in this checkpoint.

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
