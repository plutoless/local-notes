# Remaining form entry points

This inventory defines the retained layout families for the short-form rollout in #48. It is design guidance, not an execution report. See [the validation policy](../agents/validation.md) for current evidence storage and acceptance rules.

| Entry | Decision | Concrete boundary |
| --- | --- | --- |
| Shell quick capture | 460px drawer | Title/body short capture; explicit create; private workspace draft; cancel writes nothing |
| Home / all actions / initiative action creation | 460px drawer | Reuse action repository and source fields; no storage schema changes |
| Existing action metadata | Same drawer | Description/state, optional assignment/date/waiting/source disclosure; immutable history remains read-only |
| Library / initiative note information | 460px drawer | Existing favorite, topic and initiative associations; associations commit individually, Done returns to document |
| Note naming/location | Separate 460px drawer | Expected-text guarded move, followed by existing retryable link repair; no nested drawer |
| Note title/body and initiative new working note | Document exception | Arbitrarily long Markdown, autosave/source conflict/recovery; existing context and return route remain |
| Topic creation/rename | Contextual task sheet | Existing Topic revision and recovery controller |
| Initiative metadata, lifecycle, source links | Existing #47 drawer | Retain ending decisions and contextual workspace |
| Organization service settings and source selection | Staged layout exception | Credentials/privacy and exact request scope need contiguous context |
| Candidate edits/confirmation | Specialized review exception | Quotes, target, uncertainty and decisions remain together |
| JSON synchronization conflict editing | Specialized comparison exception | Multiple versions and resolution require readable comparison width |
| Markdown external-change conflict | Existing protected dialog exception | Explicit copy/reload decision retains unsaved body |
| Workspace chooser, sync refresh, favorite toggle, focus ordering | Native chooser/direct command exception | No multi-field task; existing controls and guards apply |

No page-wide redesign or unrelated geometry normalization is authorized. Shared drawer rhythm and compact field/action geometry apply to the adopted forms; retained document and specialized review surfaces retain the presentation tokens already adopted in #31–#37.

## Selected design adoption

Capture, note location, Topic creation and rename, and note information use the
right-hand task surface from the [selected design](issue122/SELECTED.md). Its
header and footer stay in view while the body scrolls. The note-information
surface uses independent location, Topic, and Initiative sections. Each
association remains an individual persistence decision.

The live catalogue uses the production fields and classification rows for
optional capture fields, location help, required and invalid Topic fields,
checked and unavailable associations, and the action to open a linked
Initiative. The actual app exercises the drawer and its active-task decisions.

The [pinned shadcn/ui Field source](https://github.com/shadcn-ui/ui/blob/45bbf9ba23c9c0f63d38887947e5fb06f59c7da3/apps/v4/registry/new-york-v4/ui/field.tsx)
supplies the Field, Label, Description, and Error composition. The local copy
keeps the consumed vertical layout, uses native labels, and leaves the alert
slot mounted for asynchronous controller receipts. Input, Textarea, and
Button reuse the production adaptations documented in [Library adoption](issue123/ADOPTION.md).
The [upstream Sheet](https://github.com/shadcn-ui/ui/blob/45bbf9ba23c9c0f63d38887947e5fb06f59c7da3/apps/v4/registry/new-york-v4/ui/sheet.tsx)
informs the right-side header, body, and footer composition. The existing native
dialog owner remains responsible for focus, top-layer modality, and
Save/Discard/Continue. The selected design uses immediate presentation and
requires no Radix runtime or slide animation.
