# Issue 66 validation

Starting SHA and initial origin/main: `01dd405d472f12bcd7724a1ddfbc5d315d5641e7`.
The live issue #66, parent #63 and comments, and #65 were read before implementation. The native blocked_by endpoint returned an empty array and #66 declared no textual blockers. PR #74 (#60) remained open; no search source-opening implementation was imported. This change references #65's acceptance boundary and implements only #66.

Ordinary existing notes open for reading. Explicit Edit focuses the editor; capture and recovered private drafts remain editing paths. Clean readers hide saving controls. Reader checkboxes are inert authored content. Tables require matching header/delimiter cells outside fences; escaped/code pipes remain cell content. Links allow HTTP(S) and mailto with escaped labels/attributes. Native resource policy is unchanged.

## Checks

- `npm run check`
- `npm test`
- `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`
- `npm run build:mac`
- `npm run build:android` (packaging only)
- `python3 tests/native-reader.py`
- `python3 tests/native-task-lifecycle.py --output build/issue66-native-termination-final`

The browser reader journey uses real application UI, bridge and an isolated production Swift record/index adapter with filesystem Markdown. It checks CRLF source bytes, long bilingual/table-rich reading, local overflow at 1180×800, 393×852 and 800×400, explicit save, recovered draft retention and discard. Existing suites cover failed save/retry, external source conflict/copy, unassigned capture, workspace separation and leave guards.

The native reader probe copies packaged assets into an isolated Cocoa/WKWebView host with a test-only command channel. It verifies unchanged source SHA-256 while reading, tables/selection, opener/editor focus, OS-injected Command+C via the native clipboard, and real saved/discarded Markdown. `native-report.json` records the executed head and asset hashes; screenshots are synthetic. This is DOM-driven native execution plus OS copy, not physical-input testing.

The production lifecycle probe uses an isolated copy of the app without a JavaScript command channel. It exercises actual window close, menu Quit, OS-injected Command+Q, Continue, Save/Discard, reentrant close and restart. Runtime evidence stays under `build/` and is summarized in the PR. It tests the shared lifecycle using capture; native existing-note save/discard is covered separately.

## Attempts and limits

Initial UI attempts lacked Playwright and its bundled browser. Playwright was installed without package metadata changes, then tests used installed Chrome. The first production termination attempt overlapped another native probe and failed a saved-title assertion; the isolated rerun is authoritative. A native copy attempt without reader focus failed; focusing the WKWebView reader before OS copying passed.

Android runtime/device/SAF tests and standalone Syncthing tests are deferred by user policy, not passed. No physical-input or two-device synchronization coverage is claimed. No private note data was read or transmitted. Wiki links, recent-reading state and search source navigation remain outside this slice.
