# Approved Workspace Design

## Decision

The user reviewed ten interactive directions and approved direction 09's tree workspace structure with direction 01's restrained native light styling. This document records that approval. The home remains a lightweight list; contextual complexity appears after opening an initiative.

## Scope

- Apply a neutral light palette, restrained blue accent, Chinese system typography, subtle separators, consistent controls, and visible keyboard focus across shared surfaces.
- Home shows one title, one primary creation action, seven focused actions by default, waiting conditions, and active initiatives. Open actions by their title. Move reorder/removal controls into an explicit per-row disclosure. Keep all existing pagination and refresh capabilities.
- An initiative workspace retains the initiative navigation, an action/reference context pane, and a selected detail pane. Opening an action or linked note keeps initiative context visible on desktop. The overview edits the initiative's existing title, goal, progress, status, links, and ending decisions.
- At narrow widths, show one working pane at a time with explicit back controls. Keep long Chinese text, keyboard focus, and existing recovery feedback usable.
- Collapse the full local directory path into directory details. Display only its basename persistently.

## Constraints

- UI copy is Simplified Chinese. Project documentation, comments, issues, and plans are English.
- Preserve stored IDs, enums, JSON revisions, SQLite indexes, note contents, draft recovery, source evidence, and conflict handling.
- No new dependencies, storage format changes, automatic task imports, or AI calls.
- AI organization and synchronization page-specific workflows remain tracked by #20 and #21; their shared controls inherit this visual baseline.
- Android-specific and standalone Syncthing tests remain deferred by user policy.

## Acceptance

1. Home has a single visible title and lightweight rows without permanent rows of utility buttons.
2. Desktop initiative selection, action editing, linked note reading/editing, and return to overview retain the selected initiative and context pane.
3. Saves and draft failures retain the existing durable/recoverable behavior; changing initiative flushes current edits before switching.
4. Shared UI checks, production Mac storage tests, targeted workspace interaction tests, and Mac build pass. Capture actual desktop and 393px layouts; inspect a separately identified Mac preview with isolated sample data.
