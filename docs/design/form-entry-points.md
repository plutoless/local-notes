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
| Topic creation/rename | Existing #46 drawer | No redesign |
| Initiative metadata, lifecycle, source links | Existing #47 drawer | Retain ending decisions and contextual workspace |
| Organization service settings and source selection | Staged layout exception | Credentials/privacy and exact request scope need contiguous context |
| Candidate edits/confirmation | Specialized review exception | Quotes, target, uncertainty and decisions remain together |
| JSON synchronization conflict editing | Specialized comparison exception | Multiple versions and resolution require readable comparison width |
| Markdown external-change conflict | Existing protected dialog exception | Explicit copy/reload decision retains unsaved body |
| Workspace chooser, sync refresh, favorite toggle, focus ordering | Native chooser/direct command exception | No multi-field task; existing controls and guards apply |

No page-wide redesign or unrelated geometry normalization is authorized. Shared drawer rhythm and compact field/action geometry apply to the adopted forms; retained document and specialized review surfaces retain the presentation tokens already adopted in #31–#37.
