# Editing-task lifecycle

Issue #55 applies to the delivered note, action, initiative, topic, capture,
location and conflict-review surfaces. The active task is the visible note or
frontmost editable form, identified by workspace and record/new-draft identity.
Hidden/recovered tasks are private candidates, not implicit save participants.

## State and ownership

| State | Meaning and leave behavior |
| --- | --- |
| Baseline/clean | Editable values equal the saved or blank baseline. Leave without prompting or creating a record. Failed required-field validation alone does not make a blank form dirty. |
| Dirty | Values differ from baseline. Retain a private task draft. Offer Save and leave, Discard changes and leave, or Continue editing. |
| Queued autosave | Only a visible note may queue a write. Starting a leave decision cancels the timer. A generation and visible-task check protect its callback. |
| Submitted/saving | The adapter already owns the write. Wait for its actual result; do not claim to cancel or roll back a submitted revision. Duplicate leave/navigation intents cannot reuse the first intent's approval. |
| Failed/conflicted | Keep editable input and source/conflict evidence. Save may retry; Discard bypasses validation and saving. Continue preserves input and location. |
| Committed/recovery pending | An immutable revision or business-operation step is already saved. Explain that fact. Retry uses the retained revision; discard only clears local pending input/recovery state and never deletes the saved version. |
| Recovered | Restore private fields only on explicit task entry/recovery. Preserve the original parent revision for conflict checks. Mere candidate existence does not make baseline-equal values dirty. |
| Saved | Advance the baseline after confirmed persistence. Rekey a new record to its saved identity. Later input is a separate uncommitted draft. |
| Discarded | Remove only this task's private candidate, restore its baseline/context or abandon the new form, and finish the requested leave. Cancel timers and invalidate late source callbacks. |

`presentation.requestTaskLeave()` owns the decision interaction and a single
in-flight leave intent. Screen adapters own dirty state, persistence, private
drafts and close/context restoration. `task-drafts.js` migrates legacy workspace
keys to record keys conservatively: colliding or malformed candidates are never
erased to make navigation succeed. Explicit recovery opens the exact returned key.

Action and initiative forms compare normalized editable fields with their baseline.
Hidden capture file identity does not count as user input. Notes retain their raw
saved text for expected-write/source checks and a separate editable baseline for
reverted-input detection. An explicitly recovered note is reviewed before saving;
opening it does not queue a write merely because a private draft exists.

## Navigation and native exit

Navigation saves only the captured active task. Explicit Save, blur/autosave,
source navigation and contextual return do not flush hidden action or initiative
forms. Intentional business operations retain their independent per-action
commits; a later failure does not roll them back. Saved record opens query the
current record so a restored stale row cannot replace a known newer saved result.

Note opens reserve a request generation before reading. A newer note/page/workspace
intent invalidates older reads, including contextual pre-reads. Note writes capture
workspace, path, private key and generation; late responses cannot modify another
note's baseline or draft. Note-topic association and recovery retries expose their
pending promise and fence workspace/path ownership before rendering controls.

The Mac shell creates one leave token and asks the page to run the same decision.
A matching bridge result completes one pending termination reply, or initiates
termination once after a window-close intent. Reentrant requests share the token;
old or duplicate replies are ignored. A failed page evaluation or content-process
loss offers a truthful reload/retain-draft fallback and completes the pending
native reply. It never claims that unavailable page input was discarded. Ordinary
browser `beforeunload` can only request the browser's built-in protection; browsers
do not permit an asynchronous custom three-way dialog in that event.

## Validation boundaries

See [maintained journeys](journeys.md) and [the issue #55 delivery discussion](https://github.com/plutoless/local-notes/issues/55).
Native production close/quit/restart evidence and instrumented native failure
coverage are reported separately from Chromium and storage tests. OS-injected
Cmd+Q is not a claim of physical keyboard testing. Android-specific and standalone
Syncthing testing remain deferred by user decision.

Deferred focus return is scoped to the completed leave decision. A newer focus,
keyboard or pointer intention supersedes its post-handler fallback; Continue
retains the captured editable selection. Async dismissal buttons still receive
that fallback when no newer intention intervenes. Test journeys must establish
completed save/reveal/leave before opening the next recovered task; drawer
visibility alone does not establish that boundary.
