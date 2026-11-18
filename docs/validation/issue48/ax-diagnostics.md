# Read-only AX diagnosis

No native acceptance is claimed. The failed production attempt used isolated data and a unique bundle ID; only its owned process and app were stopped. Subsequent diagnostics did not relaunch it, restart Orca, reset TCC, change permissions or terminate external processes.

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
