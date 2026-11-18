# Read-only AX diagnosis

The initial failed attempts below did not establish native acceptance. The final successful production replay is recorded at the end. The failed production attempt used isolated data and a unique bundle ID; only its owned process and app were stopped. Subsequent diagnostics did not relaunch it, restart Orca, reset TCC, change permissions or terminate external processes.

## Exact observations

- Owned app command: `orca computer get-app-state --app pid:44504 --no-screenshot --json`.
- Result: `ok: false`, code `permission_denied`, message: `app 'LocalNotes' has visible windows but no accessibility window (AX reads stayed blocked for 1500ms after retries). macOS Accessibility may need Orca Computer Use toggled off and on again in System Settings.`
- Earlier permission observation: `orca computer permissions --id accessibility --json` returned both `accessibility: granted` and `screenshots: granted`. That earlier command opened System Settings and launched the helper; it is recorded as an observation, not repeated as a read-only diagnostic.
- Earlier foreground activation did not restore AX reads. System Events returned no window names for that owned PID.
- Later read-only `orca computer capabilities --json` succeeded (`ax-capabilities.json`). `orca computer list-apps --json` succeeded; its unrelated application inventory is kept only in ignored local build storage.
- `orca computer list-windows --app com.apple.finder --json` succeeded, but `orca computer get-app-state --app com.apple.finder --no-screenshot --query __issue48_provider_probe__ --json` returned the same `permission_denied` error for Finder (`ax-finder-state.json`). The sentinel query avoids reading user document content.
- An existing, unrelated LocalNotes process was inspected read-only: `orca computer list-windows --app dev.localnotes.mac --json` reported one 1180×832 window, while `orca computer get-app-state --app dev.localnotes.mac --no-screenshot --query __issue48_provider_probe__ --json` returned the same error (`ax-existing-localnotes-state.json`). It was not activated, modified or terminated.

The matching Finder and unrelated LocalNotes failures make an isolated validation-app identity/window defect less likely. This supports a provider-wide AX-read failure as an inference, not a confirmed root cause. Window enumeration remains available. The tool's suggested permission toggle requires coordinator/user action; this worker has not performed it following the coordinator's read-only restriction.

External window titles are redacted in committed enumeration evidence; raw read-only responses remain in ignored local build storage. Window counts, dimensions and provider errors are retained.

## Maintainer-authorized resume

The previous failure did not persist. A fresh uniquely identified production copy with final web assets returned a complete AX tree with `orca computer get-app-state --app pid:15097 --no-screenshot --json` (`ok: true`, bundle `dev.localnotes.validation.issue48productionresume`). The prior owned copy had stale resources and was not used: its mismatch was detected before launch, then a new copy was made from the matching production build. Original fixtures were retained. No permission changes, TCC reset, Orca restart or external-process termination occurred.

The completed [native checks and screenshots](native/) supersede the old permission gate. A later background AX tree omitted reopened web controls; that attempt was not counted as a pass. Fresh isolated Cocoa/WKWebView journeys and a separate uninstrumented production executable completed the verified assertions documented in the [validation report](README.md). Actual close/quit alerts were targeted by their enumerated native window IDs after foreground activation, rather than assuming the main-window snapshot contained the alert. Only owned validation apps were stopped; their fixtures and failed attempts remain in local build storage.

## Fresh recurrence after the assignment-query fix

A subsequent final production replay (`python3 tests/native-remaining-termination.py --output build/native48-production-layer-aware`) failed before interaction: `get-app-state` for that owned production copy returned `permission_denied` with `AX reads stayed blocked for 1500ms after retries`. Its exact traceback is retained in `native-final-replay-failure.txt`. The process was stopped by the test's owned-process cleanup; this attempt did not record its numeric PID, so no PID is invented here.

The fresh read-only command `orca computer get-app-state --app com.apple.finder --no-screenshot --query __issue48_provider_probe__ --json` returns the matching error (`ax-recurrence-finder.json`), while capabilities still succeed. The sentinel query avoids user document content. This again suggests provider-wide AX failure, not a confirmed root cause. Screen Recording preflight reported already granted without requesting permissions. No TCC reset, permission toggle or Orca restart occurred.

Coordinator escalation `msg_92ff7cfad300` requests the smallest tool-suggested user action: toggle Orca Computer Use Accessibility off/on in System Settings, then notify this worker for a fresh check. The latest complete form journey passed with the assignment fix, but its renewed uninstrumented production close/quit/save/clean-exit test remains mandatory and incomplete.

A distinct capture diagnosis found that macOS sometimes places the real observed alert at CG layer 8 while Orca enumerates only its layer-zero main window. Read-only discovery matched the owned PID, visible 260×202 frame and native alert's AX position/size. A system-window screenshot fallback prototype and raw diagnostics remain in ignored build storage; they do not waive AX or production acceptance and were not represented as completed validation.

## Final successful recheck and production replay

On the next user-requested status check, the same read-only Finder sentinel command returned `ok: true`. Its unrelated window title/content was not copied into project evidence. No root cause or external permission change is inferred; this worker did not change permissions, reset TCC or restart Orca.

`python3 tests/native-remaining-termination.py --output build/native48-fc9629b-restored-production` then passed against the assignment-fixed resources. The unchanged maintained test drove the real titlebar close and OS-menu Quit, asserted both native alerts, retained the same input, saved exactly one Markdown record and observed clean menu exit code 0. Both alert screenshots were visually inspected; they contain no duplicated/tiled artifacts. The experimental layer-aware screenshot fallback was not needed or included in maintained code.

Current production resource hashes match the delivered application, including `action-screen.js`; they are recorded in `native/production-source-hashes.json`. This successful observed production replay resolves the earlier execution gap and supersedes the blocked status recorded by the earlier escalations. Failed attempts remain preserved rather than relabeled as passes.
