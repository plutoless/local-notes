# Issue #93 validation

Starting SHA and fetched base: `2f5a8af78ada6da3c0f6d323cdb3b654e50cb9ed`.
Issue #92 is closed/available; PR #106 is merged in that history. No overlap was
returned by `gh pr list`. Ownership: `docs/architecture/shell-react.md`.
The source/artifact binding and independent review receipts accompany this report.

## Layer selection and risk

| Behavior / diff | Selected layer and evidence |
| --- | --- |
| Focus order, stale query after release/workspace replacement, directory adapter disposal | Public unit boundaries: focus-position, focus-ownership, shell-directory; existing history/lifecycle unit tests |
| Confirmed identity/order, revisions, expected bases, rebuilding and restart | Existing real Swift ActionStorage/SQLite Focus and domain integration tests (`npm test`) |
| Startup/resume/return/workspace switch, changed/missing source, late reply, dirty tasks | Maintained Focus, reading-history, workspace, leave/lifecycle actual-app browser journeys over real isolated Markdown/JSON/SQLite |
| Actual focus, text caret/selection and legacy consumers | Maintained form/reader/search browser journeys; all maintained UI scripts selected once because the shared shell is present on every page |
| Long Chinese content, selected vs keyboard focus, desktop/393px/short/reduced motion, contrast | Paired shell observations plus production catalogue and maintained Focus/design-system tests |
| Local generated assets and package | typecheck, syntax check, build:web, native-assets boundary tests, build:mac, codesign verification and asset hashes; app not launched |
| Host/transport/custom scheme/OS lifecycle implementation | No implementation changes; no new registration. Native transport and OS input not exercised |

Android build/tests and standalone Syncthing are deferred and nonblocking. Ordinary
native OS/IME/clipboard/full-UI compatibility is deferred to release checks. Minimum
macOS/WebKit, Android WebView111, Intel, native process cold start/memory and physical
input were not tested. Current arm64 Mac compilation is not minimum-version runtime
coverage. No native GUI grant, model download or private-note processing occurred.

## Commands and receipts

Raw receipts are retained under `logs/`; they include failures, not just passes.
`npm ci` and its exploratory legacy-peer attempt initially failed; the coordinator
explicitly authorized the small inherited optional-transitive lock correction.
Package.json, existing locked versions, pinned direct dependencies and targets are
unchanged. The final clean install uses no workaround flags. See preparation.md.

Typecheck, syntax check, build, real-storage unit/integration suite, selected browser
journeys and Mac package/signature results are recorded in their named receipts.
The first broad UI run passed through design-system and stopped on an obsolete
catalogue selector; the focused catalogue retest and remaining UI scripts continue
that coverage rather than re-running the passing matrix. New catalogue content
adds multiple real cards, so the selector now identifies the Library row by path.

## Paired browser observations

`tests/shell-observations.mjs` uses 321 synthetic notes, the same real storage fixture,
compiled baseline and migrated assets, and five browser loads plus three warm home
navigations per version. Raw samples, exact byte sizes and six same-state screenshots
are in `browser/`. All 321 source hashes remained unchanged; both variants issued
zero body/list reads on home. Explicit Library indexing is awaited before measuring
warm-home reads, so its in-flight work is not misattributed to home.

Browser load samples baseline: 109.1, 67.2, 51.7, 52.8, 52.3 ms; migrated: 98.6,
59.8, 53.4, 49.5, 57.3 ms. Warm-home baseline: 38.2, 33.1, 37.7 ms; migrated:
38.8, 39.3, 29.9 ms. These include automation, bridge-shim and concurrent workload
noise, warm indexes and browser caches; they are not native startup measurements.
No speedup or process-memory improvement is claimed. Scoped search and input/caret
behavior are regression-tested, not independently performance-benchmarked here.
JS grows from 311457 to 323504 bytes. CSS is 43882 versus 6132 bytes, but the archived
baseline build has different Tailwind automatic source-discovery context; this is
an artifact observation, not evidence of a migration CSS reduction. Source/build
bindings and screenshots preserve that limitation rather than normalizing numbers.

## Failures and correction cycles

- Install EUSAGE: two failed diagnostic commands; one authorized correction cycle
  resolved missing optional-transitive lock entries, then clean `npm ci` passed.
- Initial full test run: 76/77; generated/source bytes differed because source was
  edited while build/test work overlapped. Freeze source/build and rerun: 77/77.
  Additional new ownership tests run separately and in the final suite.
- Observation harness first assumed baseline startup exposed `aria-current`; it did
  not. Baseline selection is checked via existing active navigation; migrated
  startup must additionally expose `aria-current=page`. One corrected cycle.
- Observation harness next counted Library's unfinished indexing as home reads.
  Awaiting the visible index completion isolates the measurement; one corrected
  cycle, now both variants read zero home bodies. Distinct signature from above.
- Catalogue strict-selector failure: added consumed Focus/reading cards invalidate
  the one-card assumption. Select the Library row by its public path; focused
  retest passes. One correction cycle. No consecutive same-signature failed
  correction limit was reached; failed receipts are preserved.

No product acceptance is waived by changing layers. Source behavior remains with
existing readers/drafts/repositories and submitted writes settle in their original
workspace. No source schema or host/OS integration behavior was changed.

## Completed receipts

| Command / group | Result | Receipt |
| --- | --- | --- |
| `npm ci` after standard lock repair | Exit 0, no workaround; `npm ls --all` exit 0 | `logs/install-clean.log`, `logs/dependency-tree.log` |
| `npm run typecheck`, `npm run check`, `npm run build:web` | Exit 0 each | `logs/typecheck-final.log`, `logs/check.log`, `logs/build.log` |
| `npm test` after final unit additions | 79 tests, 79 passed, exit 0 | `logs/all-tests.log` |
| baseline Focus / reading history | Exit 0 each | `logs/baseline-focus.log`, `logs/baseline-history.log` |
| migrated Focus / history | Exit 0 each | `logs/focus-first.log`, `logs/history.log`; Focus also passed in broad run |
| maintained UI scripts through design-system | Passed; aggregate command stopped later at obsolete catalogue selector | `logs/ui-suite.log` |
| catalogue focused retest | Exit 0 | `logs/catalogue-retest.log` |
| all remaining maintained UI scripts, leave-focus through reader-empty-source | Exit 0 | `logs/ui-remaining.receipt` |
| paired browser observations | Exit 0, zero home bodies, all 321 source hashes preserved | `logs/observations.log`, `browser/results.json` |
| `npm run build:mac`, `codesign --verify --deep --strict dist/LocalNotes.app` | Exit 0; all generated/package asset bytes identical | `logs/mac-package.log`, `logs/package-verify.log`, `source-artifacts.json` |

All 28 maintained UI scripts passed across the initial group, corrected catalogue
and remaining group. The initial aggregate command itself is recorded as failed,
not rewritten as a pass. Source head for executed implementation:
`611b30190b1c35eb64d85d0cddca9b11bda9b546`; final receipts-only commit binds it
without changing production code. Baseline and migrated desktop/393px/reduced-height
screenshots were visually inspected; the approved layout is retained. Updated
catalogue additionally passes contrast minima, actual focus and reduced-motion checks.

Standards review identified a type-only mismatch: ActionRepository returns null
focusPosition/dueDate/waitingOn on waiting and unassigned records. The presentation
interface now includes those nulls. One correction cycle: typecheck, production
build and targeted ownership/order/manifest tests all exit 0. All rebuilt assets
are byte-identical to the previously exercised and packaged assets; no runtime
behavior changed, so the passing browser/storage/package evidence is reused.
See `logs/review-*.log` and the updated source-artifact binding.
