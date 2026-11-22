# Action adoption

The Action collection uses the selected [page-first workspace](../issue122/SELECTED.md) with independently readable status, dates, waiting conditions, and selection. The existing drawer owns action edits and leave decisions. Native selects use the existing status and Initiative filters, with the same labels and keyboard behavior.

The Action editor consumes the shared shadcn/ui New York v4 Button, Input, and Textarea adapted in [Library adoption](../issue123/ADOPTION.md) and the shared [note task footer](../form-entry-points.md). There are no new upstream component adaptations. The established label wrapper also supports native date and select receivers. Source text remains a plain-text quote with line breaks preserved, and an empty quote with a path represents a whole-note reference. An externally moved source can be opened using its verified location without marking the Action edited. Updating the stored reference requires an explicit edit.

History presents the recorded status and timestamp. Change descriptions compare a revision with its recorded parent. A merge or unavailable parent is labelled explicitly. The complete stored version stays behind a disclosure.

The Action controller captures the saved record when following a source, keeps filters and selection in the Action collection, and restores the matching source control on return. A late source read is fenced by the active drawer, workspace, and navigation. Creating from reading continues to validate the captured source bytes and preserve the reader selection through the existing task contract.
