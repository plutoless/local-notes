# Issue 92 preparation and ownership audit

## Source and prerequisites

Starting source and fetched `origin/main`: `6f2dec964856c14f98b5a805019dc03b0cc83b41`.
The GitHub native dependency endpoint returned #65, #82 and #83, all closed.
The written #65 blocker is also closed; `c87ac6f` and `13cc92c` are ancestors of fetched main.
No open PRs were returned during the initial audit. Re-query before implementation integration.
No prerequisite code is to be implemented implicitly.

## Existing ownership and intended seams

| Surface / contract | Current authority | Migration constraint |
| --- | --- | --- |
| Library query, filtering, ordering, pagination | `web/library.js`, native ReferenceIndex | Retain bounded queries and real storage; typed adapter validates replies |
| Library controls and rows | `web/library-screen.js`, static `web/index.html` | Transfer consumed Library DOM exclusively to React; preserve topic drawer's legacy owner until its slice |
| Shared read/edit, source paths, wiki stack, reading history | `web/app.js`, `web/core.js`, `web/reading-history.js` | All existing entry points use one migrated reader; no second reader authority |
| Note draft, save serialization, expected-base, leave decision | `web/app.js`, `web/presentation.js` | Temporary host adapter delegates existing lifecycle; presentation cannot write independently |
| Search invocation, snapshot, selection and source return | `web/app.js`, `web/search-screen.js` | Stable typed host boundary; avoid legacy mutation inside React-owned reader |
| Contextual Action / Initiative / Topic and info drawers | Existing screen modules and `presentation.js` | Preserve ownership and public adapters; do not migrate sibling forms |
| Global shortcut / native exit / reply registrations | `web/app.js`, `web/bridge.js` | One registration each; React mounts cannot register competing document handlers |
| Tokens / focus / density | `web/style.css`, `presentation.js` | One semantic token source; compiled Tailwind without global coexistence reset |
| Mac packaged asset scheme | `Assets` in `mac/main.swift`, `scripts/build-mac.sh` | Replace basename lookup with constrained generated relative-path manifest; offline nested chunks, MIME and denial checks required |
| Android packaged asset intercept | `MainActivity.java`, `scripts/build-android.sh` | Equivalent generated-assets packaging; Android-specific execution deferred |

Current source inspection shows reader DOM also mutated by search-source restoration,
load, mode changes, discard, title/body input and source-context controls. Migrating only
`updateReading` would leave competing ownership and would not complete this issue.
`#items` is shared with unmigrated screens; its mount/unmount boundary must be explicit.
No framework dependency or production ownership change has been made in this audit.

## Compatibility decision pending

`README.md` states Android 8 or later; `AndroidManifest.xml` declares API 26 minimum,
35 target. Those are OS levels, not a WebView engine minimum. `scripts/build-mac.sh`
uses the current Swift toolchain default and does not set a deployment target or
`LSMinimumSystemVersion`. Observed host: macOS 26.5.2; SDK 26.5; arm64 Darwin 25.5.0.
The unchanged production binary built by this toolchain records `LC_BUILD_VERSION minos 26.0, sdk 26.5` (`otool -l`). This is an implicit artifact restriction, not evidence of an intentional product support decision. These observations do not establish a supported minimum.

Existing shared UI uses `Array.at`, `structuredClone`, `inert`, `dialog.showModal`,
`:focus-visible` and module imports. An ES transpilation target alone cannot make all
existing platform APIs compatible. Audit the final emitted bundle and CSS against
the maintainer-selected floor; retain Android API 26.

Options for the maintainer (recommendations, not adopted requirements):

- A Safari/WebKit 15.5 and Chromium WebView 102 floor aligns with existing modern
  native-modal/inert usage; evaluate Tailwind 3's deliberately selected utilities,
  explicit Vite target and React compatibility. Verify the exact engine versions
  before declaring support. This is the conservative proposed starting point.
- Safari/WebKit 16.4 and Chromium WebView 111 permit Tailwind 4's documented core
  browser baseline, but constitute a higher explicit product compatibility choice.
- Supporting older engines requires a concrete compatibility plan for existing
  dialogs, inertness and JS APIs, beyond merely lowering Vite's target. Do not
  silently assume Android 8's original bundled WebView can run current behavior.

Primary dependency documentation checked during this audit:
[Tailwind 3 browser support](https://v3.tailwindcss.com/docs/browser-support),
[Tailwind 4 compatibility](https://tailwindcss.com/docs/compatibility),
[Vite production compatibility](https://vite.dev/guide/build.html#browser-compatibility),
[React incremental root ownership](https://react.dev/reference/react-dom/client/createRoot).
Tailwind 3 documents utility-specific compatibility rather than promising an exact
old-engine floor. Tailwind 4 specifies Safari 16.4 / Chrome 111 for core behavior.
Vite permits explicit targets but does not provide runtime API polyfills by default.
No dependency majors have been chosen or installed pending the maintainer decision.

## Pre-change baseline execution and repair log

The existing `tests/native-library-keyboard.py` gains a bounded `--baseline-only`
mode. It reuses the existing native constructor, sender, recipient guards, private
environment snapshot/restore and owned PID/window cleanup. Production Mac sources
and packaged web assets remain at starting source. This is baseline instrumentation,
not a replacement native executor or an optional full UI compatibility replay.
The pre-existing full keyboard journey remains available unchanged outside this mode.

- Production build: `npm run build:mac` passed on starting production source.
- Attempt 1: `ISSUE65_GUI_GRANT='<coordinator grant>' ISSUE65_EVIDENCE=docs/validation/issue92/baseline/cycle1 python3 tests/native-library-keyboard.py --baseline-only`.
- Result: passed. Exact receipt: `baseline/cycle1/report.json`; production source
  HEAD `6f2dec964856c14f98b5a805019dc03b0cc83b41`, owned PID 36906, window 3041.
  The report binds production native/web source, packaged assets, generated instrumented
  host, sender and environment binaries by SHA-256. Input events contain native
  constructor/sender/recipient and trusted DOM delivery receipts.
- Cleanup: wait completed, PID absent, independent exact executable process list empty,
  owned window list empty; input source and clipboard restored, private snapshot deleted.
  All 500 source hashes unchanged and no formal revisions created.
- Observations: startup 3112 ms, zero source bodies; initial Library navigation 3213 ms
  / 500 body reads; warm navigations 2735 and 2750 ms / zero body reads. Searches 111,
  108 and 109 ms. Open observations 2583, 2569 and 2531 ms include multiple guarded
  input roundtrips and sender startup, and each added exactly one source-body read.
  Host RSS 87264, 87408 and 87440 KiB; packaged source assets 351709 bytes.
- No failed execution cycle occurred. No input guard was relaxed. Final harness
  changes after execution only remove an unused Python variable and clarify its final
  stdout message; the executed probe hash remains in the receipt. No product sources
  were changed.
- Measurement limits: Python monotonic wall-clock includes harness polling, sender
  startup and host guard roundtrips. Host RSS excludes WebContent and GPU processes.
  Native `read` instrumentation counts Markdown body-read requests including indexing;
  it does not count every filesystem metadata operation or bytes of physical disk I/O.
  One process startup and three warm navigation/search/open iterations do not establish
  a repeatable cold-start distribution or a speedup.

## Validation selection for implementation

Preserve existing public-interface model/parser/draft/fencing tests. Add focused tests
for typed boundary rejection and generated asset-path security. Reuse real Swift
repository/SQLite fixture integration for persisted save/reopen/conflict/restart.
Small actual-application browser journeys establish complete Library browse, wiki
open/return, save/readback, discard/recovery and actual focus/caret/selection wiring.
The shared reader's cross-page impact justifies running maintained reader/search/wiki/
lifecycle journeys, rather than repeating lower-layer filter matrices in UI.
Mac packaging plus actual offline custom-scheme bootstrap/nested assets/MIME/security
checks require a separate final-source exclusive grant. Ordinary unchanged-host OS
IME/clipboard compatibility is release-deferred; Android-specific and standalone
Syncthing validation remain deferred, never passed. Final independent Standards and
Spec review must reference the delivered head and the starting SHA above.

## Follow-up compatibility audit (decision still pending)

The deeper CSS audit revises the initial Chromium 102 proposal: existing
`web/style.css` uses both `:has()` (including hidden fields, selection and overlay
visibility) and `dvh` (including overall application and drawer geometry). Chrome's
[108 release announcement](https://developer.chrome.com/blog/new-in-chrome-108/)
confirms dynamic viewport units. Therefore Chromium 102 alone is insufficient for
unchanged CSS; **Chromium WebView 108 is the revised candidate**, subject to actual
WebView checks (Android tests remain deferred). This is a proposed compatibility
constraint, not an adopted product requirement or a passed old-engine test.

| Proposed policy | Exact proposed OS mapping | Engine mapping and evidence | Remaining qualification |
| --- | --- | --- | --- |
| Conservative candidate | macOS Monterey 12.4 or later; Android 8/API 26 unchanged | Mac system WebKit with Safari 15.5-era capabilities; Android provider Chromium WebView 108 or later | Select compatible utilities, explicit build target and verify shipped custom-scheme capabilities; do not infer support from compilation |
| Higher candidate | macOS Ventura 13.3 or later; Android 8/API 26 unchanged | Mac system WebKit with Safari 16.4-era capabilities; Android provider Chromium WebView 111 or later | Meets documented Tailwind 4 core engine floor; still requires maintainer approval and actual app validation |
| Older OS alternative | Big Sur/Catalina with separately installed Safari/WebKit updates | Safari 15.5 and 16.4 were distributed on older macOS versions | Browser availability alone does not prove this native host's WKWebView compatibility; not recommended as an untested OS promise |

These deliberately pair OS and engine requirements. A bare macOS version or an
installed Safari application version is not used as runtime proof of WKWebView
features. WebKit's [15.5 announcement](https://webkit.org/blog/12669/new-webkit-features-in-safari-15-5/)
explicitly associates that release with Monterey 12.4 and identifies `inert` support.
Apple's [15.4 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-15_4-release-notes)
identify dialog, `structuredClone` and focus-visible additions. Apple's
[16.4 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes)
also list older supported Mac OS families; the proposed Ventura mapping is a
conservative default-release pairing, not a claim older OSes cannot run that engine.

The existing Mac sources passed a **headless compile-time availability audit only**:

```sh
swiftc -typecheck -target arm64-apple-macos12.4 -module-cache-path build/swift-cache \
  mac/main.swift mac/AIService.swift mac/ActionStorage.swift mac/ActionIndex.swift \
  mac/ReferenceIndex.swift mac/ReferenceScan.swift
```

Exit 0; no diagnostics; no application launch, activation, clipboard operation or
native input. This establishes that the current SDK accepts these source APIs at
that target. It does not establish linking, deployment, runtime behavior on 12.4,
Intel support, or adoption of a 12.4 product minimum. The original default-target
production binary is untouched by this typecheck.

### Fallback cost if a lower engine is required

- **Chromium 102–107:** inertness and modal APIs may be available, but current
  relational selectors and viewport sizing require CSS alternatives. Use explicit
  state classes/attributes for hidden/selected/overlay states and ordinary viewport
  fallbacks where needed. Verify short/narrow keyboard layouts and contextual
  drawer/search coexistence. This is a real shared CSS change, with cross-page risk.
- **Before native inert/dialog support:** a JS syntax target is insufficient.
  A compatibility implementation must preserve top-layer containment, background
  interaction exclusion, opener restoration, nested leave decisions, composition
  Escape handling and scroll. This is significantly broader than a CSS fallback;
  it cannot be treated as a free build configuration choice.
- **Before structuredClone/Array.at support:** targeted helper substitutions can
  address array access and the actual plain-record clone contract, but must preserve
  validation and alias independence. JSON cloning is not a generic structured-clone
  substitute. No such changes have been made.
- **field-sizing:** currently progressive enhancement because textarea resize and
  explicit minimum dimensions already exist; avoid making it a new hard dependency.
- **Tailwind 4 below its core engine floor:** avoiding an individual utility does
  not remove the core requirement. A compatible earlier major is an option to
  evaluate after the engine decision; neither major is selected by this audit.

Android 8 does not guarantee a particular installed provider. Android's
[`WebView.getCurrentWebViewPackage()` API](https://developer.android.com/reference/android/webkit/WebView#getCurrentWebViewPackage())
is available at API 26 and can identify the actual provider without changing the
OS minimum. A provider-version/capability diagnostic is a possible implementation
choice once policy is approved, not a completed feature. Chrome browser and WebView
are distinct products: Google's [Chrome Android 8/9 support announcement](https://support.google.com/chrome/blog/352616098/sunsetting-chrome-support-for-android-8-0-oreo-and-android-9-0-pie)
identifies Chrome 138 as its last version for those OSes, but that fact alone is
not used to assert a specific device's WebView provider or support status.

No dependency has been selected/installed; no deployment target, platform requirement,
production code, sibling issue, or native resource handler was changed. The baseline
lease was released by the coordinator after independent receipt/process audit; there
is no current GUI grant. Implementation awaits the explicit compatibility decision.

## Decision received and implementation resumed

The coordinator relayed the maintainer's explicit Tailwind 4 selection and approved
macOS 13.3/system WebKit 16.4-era capabilities plus unchanged Android 8/API 26 with
Chromium WebView provider 111+. This supersedes the pending-decision statements
above, which record the historical audit and unadopted lower candidate. The exact
selected targets are now recorded in the architecture guidance and package build;
minimum-version runtime testing remains unrun. No native GUI grant is currently held.
