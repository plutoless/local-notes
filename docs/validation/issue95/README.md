# Issue #95 delivery evidence

Starting/base SHA: `8ae4622f4a23033ec149038d9a370c9985a138e8` (fetched main,
including #93 and shared #105/#106 fixes). Before writing, GitHub issue #93 was
closed; both native dependency API and written blockers listed only #93. No open
PRs were present at initial overlap check. Scope is Action migration only.

## Selected layers and executed receipts

All browser commands used `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`.
Receipts in this directory name the executed command layer. The final-source
binding is recorded separately in `artifact-bindings.txt`; no native app launch occurred.

| Behavior | Command / layer | Result and limitation |
| --- | --- | --- |
| Domain, storage, revisions, indexes, ordering, drafts and ownership | `npm test` | Full maintained unit/integration suite; real isolated Swift file/SQLite fixtures where applicable; see final unit receipt |
| Accepted/canceled/stale Action return and pending/stale focus membership | `node --test tests/action-entry.test.js` | Two public-controller behavior tests, controlled ordering |
| Action create/status/filter/reopen/history/reload/focus membership/caret/source bytes | `node tests/actions-react-ui.mjs` | Actual bundled app and real storage/SQLite adapter, persisted readback after reload |
| Note/list/table passage evidence, changed/missing sources, duplicate submission, retry, lost receipt identity/reload, nested return | `node tests/reading-actions-ui.mjs` | Maintained real-app / real-storage journey passed |
| Active Save/Discard/Continue, invalid/failed/delayed save, private recovery, containment/restoration and browser selection | `node tests/task-lifecycle-ui.mjs`, `node tests/remaining-forms-ui.mjs` | Maintained focused journeys passed; existing synthetic failures retained in harness |
| Production tokens, contrast, keyboard and pointer focus, selected/invalid, dialog return, 393px and reduced motion | `node tests/design-catalogue-ui.mjs` | Text minimum 4.716:1, interactive line 3.571:1 and focus 4.983:1; production components, not separate mockup |
| Syntax, types, bundled assets | `npm run check`, `npm run typecheck`, `npm run build:web` | Passed |
| Shipped Mac assets | `npm run build:mac` | Signed package built; not launched; native resource/transport code unchanged |

The browser bridge shim invokes existing real Swift storage/index adapters in
private temporary directories. It does not exercise WKWebView request transport,
AppKit close/quit dispatch, OS IME, OS clipboard or physical input. Browser
caret/selection is browser-injected input, not native or physical evidence.
Ordinary unchanged-host OS/IME/clipboard compatibility is release-deferred under
the maintainer policy. Minimum-OS/Intel checks, native cold startup and process
memory measurements were not run. Android-specific and standalone Syncthing
checks are deferred by user decision, never passed. No model/private-note
processing or native GUI grant was used.

## Visual / performance observations

Same-fixture `before-*` and `after-*` show long Chinese waiting Action form at
1180×800, 393×800 and 393×340, reduced motion. The short viewport retains reachable
footer actions; no horizontal overflow. Additional `action-*` captures come from
the maintained real-storage forms journey, including lower utilities.

Baseline assets were exported with `git archive` from the starting SHA into an
ignored directory inside this worktree, then built with the same installed pinned
dependencies. The equivalent original focused Action journey made 23 record
queries and zero Markdown body reads on both baseline and migrated assets.
Observed screenshot-heavy run times were 1138ms baseline and 2078ms then 699ms
migrated; this variation is not a controlled benchmark or evidence of a regression
or speedup. The expanded final journey additionally tests focus membership and
makes 26 queries (three added operations), still zero note-body reads. Source bytes
remain equal before/after. No whole-corpus rereads were introduced.

Baseline bundle JS was 323.51kB / 83.39kB gzip; final build receipt records about
336kB / 86kB gzip. Added Action renderers account for the increase. The nested
baseline export produced different automatic Tailwind scan output (43.88kB CSS
versus 6.13kB current); this is not a valid CSS-size or runtime performance
comparison. Native startup/memory are unmeasured; no performance improvement is
claimed. The production build still contains only local bundled assets.

## Failures, correction cycles and review

- Focused Action harness initially read the hidden initial form before async open
  completed (`failed-actions-initial.log`). Added a visible open-drawer wait; the
  same persisted reload check passes. One completed correction cycle with behavior
  progress, no repeated same-signature failure.
- New Node entry test initially imported the browser bridge without `window`
  (`failed-entry-harness.log`). Initialized a temporary import-only window port;
  two controller ordering/ownership checks pass. Separate setup signature, one
  correction cycle. No product assertion was removed.
- Initial independent Standards review held return callback and React row
  ownership; Spec additionally held history rejection fencing and structural
  React ownership. Corrections adopt return only after accepted/current open,
  use React selection/options adapters, mount directly into drawer slots, and
  fence history success and failure.
- Review also identified inherited focus-membership writes outside active pending
  work. They now settle through `this.saving`, capture original repository/task,
  fence stale UI results and restore retry availability. Unit and real persisted
  browser checks cover the correction.

Separate review reports are under `reviews/`; final-head acknowledgments are also
reported to the coordinator. No acceptance requirement was waived to hide a known
product failure. Uncontrolled native control values/handlers and legacy feedback
slots remain explicit compatibility ports, documented in the Action ownership
inventory. Initiative/search/reader callers retain the same shared editor; no
sibling implementation or competing overlay authority was introduced.
