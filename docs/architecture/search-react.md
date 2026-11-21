> Current final ownership: [renderer convergence](renderer-convergence.md). This document also records the original slice boundary; historical coexistence descriptions below are superseded by #102.

# Global search ownership (#97)

Search uses the delivered pinned React/TypeScript/Tailwind pipeline and the existing compact A presentation. Application labels and accessibility names are Simplified Chinese. Targets remain macOS 13.3/WebKit 16.4 and Android 8/API26/WebView111+.

| Surface / contract | Owner | Boundary |
| --- | --- | --- |
| Dialog contents, input, scopes, result rows/highlighting, status, paging, attribution | `SearchContent` / `searchView` in `web/react/search.tsx` | One React root in the dialog; data and callbacks only, no storage, requests or global listeners |
| Native HTML dialog element, show/close, input/composition events, one document Command+K handler and reference-change subscription | Application-lifetime `SearchScreen` | Existing `bindDialog` contains Tab; no new overlay family or competing trap |
| Query, selected source, expansion, scroll, clipboard receipts and source-return continuation | `SearchScreen`, typed `SearchModel`, `SearchRow` and `SearchNavigation` contracts | The controller may address stable input/checkbox values, focus, scroll and result inertness; it never constructs or writes React content |
| Exact typed source identities and expanded-context reuse | `SearchResult` discriminated note/record union; `searchRows` | Expansion survives only the same workspace/type/entity/passage identity, source fingerprint/revision and query |
| Bounded keyword/multi-entity indexes, source validation, reads, copy bridge request | Unchanged `WorkspaceSearch`, repositories and existing native bridge | Existing generation fences, revisions, grounding and error handling remain authoritative |
| Top-right invocation and legacy/migrated page navigation | Existing `app.js` capture/open/restore adapter | Opaque invocation owns workspace/page/request/drafts/selection/scroll. No sibling navigation renderer changes |
| Source highlights in the shared reader | Existing detached-fragment `SearchScreen.highlight` adapter | Called outside the React search root by the delivered reader. It never mutates live React descendants |
| Catalogue | The same production `SearchContent` and `Button` | Synthetic read-only models/callbacks; no storage or AI |

The input and attribution checkbox remain uncontrolled stable nodes: rendering results/status does not replace typed input, caret or composition state. Keyed results retain DOM identity. Controller restoration keeps the old DOM reference across React ref detachment and yields to newer user focus. Empty/reset/failure releases inertness and stale next-page availability. Existing session/request/workspace fences and protected-modal rules remain unchanged. There are no new native shortcut registrations, host/transport/resource handlers, persistence formats, writes, semantic search or model downloads. The one application-lifetime dialog/root is not remounted for route or workspace transitions; its lifetime ends with the document.

The design catalogue uses actual production components and the existing semantic CSS tokens. Existing selected/keyboard/pointer/invalid treatment and role-appropriate hit geometry remain in `web/style.css`; compiled Tailwind adds layout utilities without preflight. No independent palette, dependency or engine floor is added.
