# Reference decisions and owned-source provenance

References were inspected live during this issue. These are Local Notes adaptations, not vendor promises or vendor accessibility certification.

| Official reference / concrete example | Retained in these previews | Rejected / reason |
| --- | --- | --- |
| [shadcn/ui](https://ui.shadcn.com/docs), official new-york-v4 Input and Textarea | Actual upstream React source in `web/react/preview-controls`, real consumers: search query, action name and description | No wholesale ecosystem install. Button reuses the existing shared production Button. Native select is a scope control; there is no custom dropdown, command trap or dialog implementation |
| [beUI](https://beui.dev/), Bookshelf, Dropdown Menu, Animated Alert index examples | Bookshelf's content grouping motivates C's distinct record cards; clear hover/selected treatment is proposed locally | No animated bookshelf, 3D/hover preview, animated alerts or motion package. These compete with text; index inspiration only, no source imported or claim of component testing |
| [Fluid motion](https://www.fluidfunctionalism.com/docs/motion), three speeds / faster exit examples | Finite feedback family, no reading animation; immediate reduced motion | No spring runtime or vendor spring recipe. Preview uses 100ms color feedback; final timing awaits selection and reconciliation with old 120ms rule |
| [Fluid surfaces](https://www.fluidfunctionalism.com/docs/surfaces), nested surface ladder | Canvas/document/context depth: A uses dividers, B paper, C bounded cards | Eight levels and substrate context runtime unnecessary for these nonmodal samples; no dark theme |
| [Fluid typography](https://www.fluidfunctionalism.com/docs/typography), five styles / weights | Separate metadata, row, heading and reading hierarchy, no faded text or Chinese letterspacing | Inter/Google Fonts and one paragraph style not imported; B deliberately explores local serif reading, all fonts installed/system |
| [Watermelon blocks](https://registry.watermelon.sh/blocks), Blog Section / Contact Form / Bento Grid categories | Blog/article list composition informs A/B; field/action grouping informs form sample | Marketing bento/hero, pricing, footer and full templates rejected: note content should dominate, not promotion. No source or assets imported |

## Exact source and license

Upstream repository: https://github.com/shadcn-ui/ui at commit
`45bbf9ba23c9c0f63d38887947e5fb06f59c7da3`.
Paths: `apps/v4/registry/new-york-v4/ui/input.tsx` and `textarea.tsx`.
MIT copyright/permission notice is retained verbatim in
`web/react/preview-controls/LICENSE` (from upstream `LICENSE.md`).
The files depend on React and `cn`; the local adaptation replaces the `cn` import with a simple class join because these sample consumers do not override conflicting utility classes. No clsx, tailwind-merge, Radix, animation package or new engine requirement is introduced. Tailwind 4 and React remain the exact existing locked versions. Upstream slots, native props, invalid state, disabled styling and class list remain. Preview CSS increases minimum height to 44px and replaces translucent focus ring with one solid outline for measurable contrast; dark utilities are inert under this light-only entry.

The components live inside the existing shared React boundary, are imported only by the docs preview, and do not change production component contracts. Production family migration and integration with presentation.js modal lifetime require a later scoped slice after explicit selection. This sample intentionally presents a nonmodal contextual comparison stage, without focus trap/backdrop or production leave/save semantics; Escape/Close returns focus to the opener. It does not claim product dialog acceptance.
