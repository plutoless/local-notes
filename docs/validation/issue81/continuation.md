# Issue 81 continuation

This continues PR #88 from preserved head `e37f1b30a2d5372671654e36947f4b678604cf85`; it is not a second implementation. Live issue #81 still had no comments or native/textual blockers, and fetched main remained `36be0ae2da853a2a1cb004f9a27cf6769b788dd6`, so no reconciliation merge or force push was needed.

The expanded browser journey uses the same isolated production storage/index adapter. It now executes Initiative page boundary focus, an obsolete Initiative query after navigation to Favorites, clean Action cancellation while assignment loading is deliberately held, and a dirty Action's text, selection, continued-editing decision and active control during delayed option loading. The expanded journey passed during development.

Action opening now resolves a temporarily disabled row's return identity, makes the row available once the modal owns input, and leaves focus where the user placed it when late options arrive. Current Focus refuses to install a stale Action return callback after cancellation, navigation or repository replacement. No storage/schema or issue #82–#86 changes are included.

The new native probe checks actual Cocoa active/key/visible/occlusion state and document focus/visibility before any OS input. It records PID/window, source/package, executable, generated host and probe hashes even on failure. The new dispatch has one authorized bounded preflight; no repeat launch or acceptance waiver is authorized if that host remains unavailable. Historical native failures and original review reports remain preserved in this directory. Final continuation receipts and independent exact-head reviews are reported in PR #88 and the coordinator handoff.
