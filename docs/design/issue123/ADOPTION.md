# Library and reader adoption

## Boundary and implementation plan

Starting revision: `d486fd492ad3e94a5f33700a412d84dde0591f56` (also fetched main at dispatch). Both the issue body and GitHub dependency API identify only #122; it is closed and PR #132 is available at that revision. The approved composition and semantic rules in [SELECTED.md](../issue122/SELECTED.md) govern this slice.

1. Promote the pinned official Input/Textarea source through the shared React component boundary; retain preview compatibility exports. Adapt the same new-york-v4 Button and AlertDialog content family before consumers. Preserve the Button pending-action contract and existing native-dialog/task-leave owner.
2. Apply semantic tokens through Tailwind 4 and existing CSS variables. Library/Favorites keep bounded browsing; opening a note removes the middle list visually without destroying its return context. Add a collapsed, nonmodal right reference disclosure for source identity; organization mutations remain in the existing protected task drawer.
3. Use the official fields in reader and contextual note forms. Keep the reader component identity stable during edits, retain controller-managed selection, source bytes, safe Markdown and repository authority. Import the consumed reader/reference and leave content in the live catalogue.
4. Validate public behavior first, then real Swift repository/index integration and purposeful actual-app browser journeys for page/filter/return, Markdown/wiki, save/readback and failure/discard. Compare identical synthetic states before/after and record I/O and timings locally. Run type/web/Mac package checks. Review final diff independently for Standards and Spec, correct findings and re-review any changed head.

## Component provenance and deviations

Source family: official shadcn/ui **new-york-v4**, MIT, pinned at `45bbf9ba23c9c0f63d38887947e5fb06f59c7da3`, `apps/v4/registry/new-york-v4/ui/{button,input,textarea,alert-dialog}.tsx`. The retained license lives in `web/react/ui/LICENSE`. Upstream: https://github.com/shadcn-ui/ui/tree/45bbf9ba23c9c0f63d38887947e5fb06f59c7da3/apps/v4/registry/new-york-v4/ui .

Input and Textarea retain upstream native props, slots and utilities. Button retains the upstream native button, slots and variant treatment; this app has no polymorphic `asChild` consumer, so Slot and CVA are replaced with a finite native variant map, without adding a package or engine floor. Existing `Button` remains the compatibility facade for controller callbacks and pending actions. Dense record rows use that facade with the existing row semantics rather than inventing a second list widget. Native selects remain intentional custom primitives: no new popup owner is needed for finite scope/order choices.

AlertDialog header/title/description/footer are adapted as native content elements inside the existing `task-leave-decision` dialog. Upstream portal, Root, focus scope, overlay and automatic Action close are deliberately omitted: `presentation.js` owns the one modal lifetime, captures the active task, awaits real save/recovery, and keeps failures open. This avoids a competing trap or auto-closing failed save. Content uses upstream slots, typography and footer layout; 44px targets, one solid focus outline and immediate reduced motion replace translucent rings and animation.

The optional right reference panel is a nonmodal disclosure with explicit collapse and source path; it is not an editor or independent persistence surface. Its organization button delegates to the existing drawer. Opening a different note and reload collapse it. Global search, routes, Note/Action/Initiative identity, immutable revisions, literal/meaning-search degradation and privacy consent are unchanged. Issue #61 remains separately held.
