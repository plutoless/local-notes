# Issue #94 validation

Starting and fetched-main base: `8ae4622f4a23033ec149038d9a370c9985a138e8`.
Written and native blockers name #93; it is closed and available at this SHA.
PR #106 is an ancestor; no open overlapping PR was returned before implementation.
No sibling implementation, coordinator code changes or native GUI execution.

Independent reviews found two P2 issues: inactive collection ownership could
overwrite saved scroll; metadata/classification still had competing property
writers. The correction clears ownership outside collection routes and moves
field, checkbox and metadata changes through typed React model updates/callbacks.
Public regression tests cover intervening pages with different scroll values;
the real-app journey checks Favorites → Focus → Actions → Favorites restoration.
The first added browser scroll assertion incorrectly assumed the inner list
scrolled at desktop size; its failed receipt is preserved, and the correction
uses the real collection scrollport in a short window. No product requirement
was waived. Focused forms/Topic/classification/focus/Library checks were repeated.

## Selected layers

| Behavior | Layer / executed receipt |
| --- | --- |
| Independent Favorites/Library filters, bounded page and selection restoration | CollectionContexts public unit tests and note-context-ui actual-app journey |
| Revisions, record identity, draft scoping, expected bases, serialized writes and recovery | `npm test`: 86 tests passed, real Swift Markdown/JSON/SQLite adapter coverage |
| Capture/location invalid, clean cancel, dirty leave, failed create/retry, recovery and repeated submit | Maintained remaining-forms-ui over isolated actual storage |
| Topic create/rename/duplicate/partial commit/retry, classification and unchanged source | Maintained topic-drawer-ui/classification-ui plus domain Topic integration |
| Favorites open/return, own filters/page, capture return and persisted readback after reload | New note-context-ui, production compiled assets and real isolated storage |
| Focus containment/restoration, body composition/caret/selection | Maintained form-focus-ui and reader-editing-ui; browser events only |
| Catalogue / legacy list / active leave lifecycle | Maintained design-catalogue-ui, library-ui, task-lifecycle-ui |
| Shipped assets | Typecheck, syntax, production build, Mac packaging and ad-hoc code signature; no host implementation change |

`logs/` retains command receipts including failures. Focused UI coverage is selected
because note forms, classification and context restoration changed; unrelated
Organization/search/Initiative end-to-end matrices are not repeated. Existing
repository and task authorities are reused, not replaced with fake persistence.
The Swift storage adapter is production storage/index code over temporary synthetic
Markdown/JSON and private SQLite. UI requests use HTTP/NotesNative harness transport,
not WKWebView/native transport. Readback/reload establishes durability within this
adapter, not OS termination or native input compatibility.

## Failure history and corrections

- New journey cycle 1: wrong discard accessible name (`不保存并离开`); inspected
  production leave copy, corrected to `放弃更改并离开`. Failed receipt `context.log`.
- Cycle 2: assertion read old filter before asynchronous Library render completed;
  waited for visible destination heading. `context-retry1.log` retained.
- Cycle 3: capture-return selected navigation before original browse context restored;
  waited for visible collection and restored page. `context-retry2.log` retained.
- `context-retry3.log` and final `context-final.log` passed original source hashes, Favorites context and
  capture readback/reload. Each correction advanced past its preceding failure;
  there were no two completed same-signature cycles without progress.

## Same-state layout and observations

`browser/` contains paired baseline/migrated capture screenshots at 1180×800,
393×800 and 393×340 with long Chinese input, reduced motion and actual caret/selection.
The same synthetic workspace has 66 initial sources; every original SHA-256 is
checked after both runs. `observations.json` retains raw samples and source hashes.
Final integrated baseline warm refresh milliseconds: 146,118,134; migrated:
116,118,116. The medians are 134ms and 116ms; three automation samples do not establish a speedup or regression.
Baseline indexes start cold and migrated indexes are warm: whole-run read totals
are deliberately not treated as comparable refresh I/O. No corpus read was added
to components; bounded query authority remains Library. JavaScript changed from
323504 to 335479 bytes (+11975, including the merged #97 search consumer); compiled CSS remains 6132 bytes in this observation.
Native cold startup, process memory and minimum-engine performance are unmeasured.

## Deferred / unrun

Ordinary native OS input, Chinese IME, clipboard, shortcuts and close/quit/restart
compatibility are release-deferred under the maintainer's layered policy. No GUI
grant was issued; no native app launch/input/clipboard operation occurred. Physical
input, minimum macOS/WebKit, Intel and Android WebView runtime were not exercised.
Android-specific builds/tests and standalone Syncthing are user-deferred, nonblocking.
No AI processing, private notes or model downloads were used. Package compilation
is not native runtime acceptance. See ownership inventory and independent reviews.

The second Spec review found contextual Initiative/source navigation bypassed
collection transitions. The correction moves collection adoption/release into the
single existing `selectNavigation` authority, including direct contextual routes.
Snapshots use retained browse scroll when the collection is hidden by the narrow
reader. The new actual-app classification → linked Initiative → Favorites journey
checks restored scroll in a short window. Its first harness receiver incorrectly
waited for the hidden metadata editor; the corrected check waits for the visible
Initiative workspace title. Failure receipts remain under route-browser*.log.


## Integrated delivery

Main advanced to `f39466dce449467620a7e08eacf3a1f9087c29b5` (#97). Merge
`c2383f1c6c2c35a2721c9288d61e7d5a0cffc304` preserves both additive catalogue,
host and design entries; no sibling search source was edited. Both independent
reviews passed this head against starting and latest main. See separate reports.
Final `tests-delivered.log` records 86/86 passed; `integration-models.log` checks
the newly merged search model and collection context. Combined TypeScript, syntax,
build and Mac/signature checks passed. The isolated-storage integrated context
journey passed in `integrated-context-retry.log`; source hashes are retained.

The first integrated context assertion observed navigation before final scroll
restoration (754 vs 725). Its failed receipt remains. The correction waits for
exact restored scroll and checks it remains unchanged after 180ms; no scroll
tolerance or acceptance removal was introduced. Earlier pointer setup corrections
measure actual click-time scroll, not the position before browser auto-scrolling.
Pre-integration byte size was 329887; the additional 5592 bytes are the already
merged search consumer, not an issue94 regression. Paired run medians varied
with concurrent validation load (100/101, 116/127, 134/116ms); these samples show
noise and do not establish a reproducible slowdown or a framework speedup.

Combined search-navigation and production catalogue/contrast checks passed, including
all origin/destination types, dirty leave choices and stale/dismissed reads. The
integrated model tests passed 4/4. No additional full UI matrix was required.
