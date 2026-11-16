# Local Notes: Organizing Content Around Initiatives

Date: 2026-11-15

Status: The design has been approved in conversation; this written specification is awaiting user review. This document describes intended behavior, not completed implementation or validation.

## 1. Problem and goals

The user's priorities are to decide what to do next, recover the context of ongoing work, and then read or research reference material.

The current product lists Markdown files as notes and aggregates checkboxes as tasks. At inspection time, the selected directory contained 373 Markdown files and 1,481 parsed checkboxes, including 1,315 unchecked items. These include strategic directions, OKR metrics, evaluation conditions, process checklists, and instructional steps. They cannot be interpreted as actions the user has committed to perform. These counts are a snapshot from that inspection.

The current `web/app.js` requests the entire collection every four seconds. On Mac, `list` reads the full contents of every eligible Markdown file, and the frontend parses and renders the entire list again. This overhead must be removed, but measurements have not established it as the only cause of the reported lag.

First-version goals:

- Make a small, trustworthy set of current priorities the default entry point.
- Connect goals, progress, actions, working notes, and reference material through initiatives.
- Manage confirmed actions independently, starting empty without migrating the old checkbox aggregation.
- Support offline reading and writing on Mac and Android, synchronizing files through the existing Syncthing setup.
- Offer online AI assistance on demand without making everyday use wait for a model or a full collection scan.

Keep existing notes in their current locations with their contents intact. Removing the old aggregation does not mean deleting notes, checking their checkboxes, or bulk-cleaning the source directory.

## 2. Content organization

Organize primarily around ongoing initiatives, with time and topics as supporting dimensions.

Alternatives considered: organizing by date makes capture convenient but scatters long-running context; organizing by topic supports reading but does not answer what to do next; improving the two flat lists of notes and tasks would not resolve the confusion between content roles.

### 2.1 Initiatives

An initiative is an ongoing undertaking with a goal and progress to track. It may concern work or personal arrangements. It has a title, goal, current progress, status, and links to actions, working notes, and references.

Statuses are Active, Later, and Ended. An ended initiative can be reopened. Ending it does not automatically complete its unfinished actions. The user must explicitly choose how to handle each one: complete, cancel, move, or retain it as an independent action.

The system may suggest initiatives, but only user confirmation adds them to the confirmed collection. Confirmation can attach a suggestion to an existing initiative to avoid duplicate entries for the same undertaking.

### 2.2 Actions

An action is a concrete next step the user has confirmed. It can belong to one initiative or stand alone. The first version does not introduce a subtask tree.

Fields include a stable ID, description, optional initiative ID, status, optional due date, optional person or condition being waited on, and zero or more source references. Statuses are To do, In progress, Waiting, Completed, and Canceled. Completed and canceled actions retain their history and can be reopened.

Current Focus selects and orders confirmed actions without copying them. Decisions can also be actions, such as choosing between school options. An action without a due date must not appear overdue. The system must not infer dates or priorities from wording.

Checking a source note's checkbox and changing a confirmed action's status are independent operations. Changing or deleting a source does not delete the action; its reference is marked as changed or unavailable.

### 2.3 Working notes, references, and topics

Bodies remain Markdown. A note can belong to multiple initiatives and topics, serving as a working note or reference in each initiative. Linking does not require moving or copying the body.

Topics have stable IDs and names. Users create them, and AI can suggest them. Topics support reading across initiatives. Notes are not required to have a topic, and directories do not automatically become topics. Editing a link from any entry point updates the same underlying relationship.

When creating a note, users can choose an initiative or topic. A note created inside an initiative is linked to it by default. Unassigned notes can be saved and organized later without interrupting quick capture.

## 3. Screens and reading paths

### 3.1 Current Focus: the default home screen

- Current Focus: unfinished actions explicitly selected and ordered by the user, including decisions to make.
- Waiting and Follow-up: waiting actions with the relevant person or condition; a missing date must not imply lateness.
- Continue Working: active initiatives with progress summaries and an entry point for recovering context.

Show the first seven focused actions by default, with the remainder expandable. This does not limit how many actions can be stored. Do not turn source file, checkbox, or candidate counts into an everyday backlog counter. When no confirmed actions exist, offer creation and organization entry points without automatically populating old tasks.

### 3.2 Active initiatives: initiative details

Present the goal, current progress, and unfinished actions first, followed by working notes and reference material. Completed actions are collapsed but remain accessible. Users maintain the summary; an AI rewrite requires confirmation and cannot overwrite it during background analysis.

Actions and references can navigate back to their initiative. Independent actions can be managed in the full action list and assigned later. The home screen links to that list, which supports filtering by status and initiative.

### 3.3 Library

Browse by topic and search titles and bodies, with additional entry points for uncategorized notes and directory navigation. Directories assist navigation rather than merely sorting the entire collection by path. Lists load only titles, short excerpts, and necessary metadata; opening a note reads its body.

Retain the existing basic Markdown reading and editing capabilities. A complete rich-text editor or Markdown engine is outside this change. Preserve autosave, draft recovery, and protection against overwriting external edits.

### 3.4 Organize

Keep organization separate from the everyday home screen. Users select directories or notes before starting AI analysis. They can work in small batches and cancel; the app does not automatically upload the entire collection.

Candidates display suggested content, suggested placement, explanations, and source evidence that can be opened. Users can confirm, edit before confirming, attach to an existing initiative, keep for later, treat as reference material, or ignore. Links, progress summaries, and action suggestions become confirmed data only after approval. Confirming an initiative does not confirm all of its suggested actions.

Do not bulk-import old checkboxes as candidates. AI suggests only from selected content, does not interpret historical plans as current commitments, and explicitly states when current relevance cannot be established.

## 4. Persistence and data boundaries

Use synchronized files as the source of truth and a separate SQLite query index on each device.

| Data | Source of truth | Synchronized by Syncthing |
| --- | --- | --- |
| Notes and reference bodies | Existing Markdown | Yes |
| Initiatives, actions, topics, and links | One JSON file per record | Yes |
| Focus order, saved candidates, and review decisions | JSON records | Yes |
| Queries, full-text search, and list excerpts | Device-local SQLite | No; rebuildable |
| AI service settings and credentials | App-private storage on each device | No |

Use `LocalNotesData/` beneath the selected synchronization root for app-managed records, organized by type and named by stable ID. Exclude this directory from normal library scanning. Records include a format version, entity ID, revision ID, parent revision references, and modification time. Time is for display, not the sole basis for resolving conflicts.

Also save each committed revision in full at `revisions/<entity-id>/<revision-id>.json`. Revisions are immutable and synchronize through Syncthing. The entity file in its type directory holds the current version; historical revisions identify branches and enable recovery rather than forming another independently editable data set. The first version does not automatically prune revisions. Do not delete history an offline device may still reference without a cross-device acknowledgment protocol.

SQLite resides in app-private device storage outside the synchronization directory. Confirmed data must not exist only in SQLite or WebView localStorage. Removing the index must not prevent recovery of focus order, initiatives, actions, or candidate decisions from synchronized files. Generate a synchronization workspace ID on first use to isolate data, indexes, and drafts across selected directories.

Source references contain workspace-relative paths, quoted fragments, and content fingerprints; line numbers only assist navigation. Moving a note within the app updates references. After an external move, a fingerprint may locate the source, but ambiguous matches require the user to relink it rather than silently attaching to a same-named file.

JSON is preferred over task Markdown with metadata because confirmed actions do not require external text editing and fixed fields are easier to validate and evolve. SQLite supports queries without reparsing the collection on every operation. The running database file is not the cross-device merge unit.

## 5. Local writes, synchronization, and failures

### 5.1 Normal writes

Validate a local change and persist its full revision before updating the current entity JSON and SQLite, then report success. A persisted revision is a recoverable commit. If updating the current entity or index fails, recover from that revision and show recovery status rather than losing committed data. If revision persistence fails, preserve the edit and offer a retry. Incoming revisions must also be validated; current entity file arrival order does not determine the winning state.

Platform file adapters handle the Mac file system and Android SAF separately. Move expensive I/O and indexing off the UI thread, and serialize local writes to the same record. Use temporary files and safe replacement where supported. When an Android provider cannot guarantee atomic replacement, retain a recoverable version and verify the result by reading it back.

### 5.2 Incoming changes and conflicts

Import changed records by ID and revision without converting every change into a full collection refresh. Detect Syncthing conflict copies and incompatible revision branches, retaining every version. Do not select a winner by timestamp when a revision cannot be established as a successor of the known version.

Identify conflicted records in the UI. Receiving one version must not silently complete or hide an action. Users compare and select or merge versions; the resolution becomes a new revision referencing both branches. Persist unresolved versions in synchronized conflict records rather than SQLite alone so index rebuilding preserves the conflict.

This design uses complete revision history, conflict-copy detection, and retained versions. It does not claim that Syncthing provides record-level merging. When parent revisions have not arrived, mark synchronization as incomplete and determine branching after ancestors arrive. Even if file synchronization overwrites the current entity file, immutable revisions preserve both branches. Implementation must verify offline divergent edits, delayed delivery, and out-of-order arrivals on two devices.

### 5.3 Deletion and corruption

The primary ways to retire an action are completion and cancellation; initiatives can be ended. Entity deletion uses synchronized tombstones so stale offline copies do not directly resurrect deleted records. Removing a reference link does not delete source content.

Report malformed JSON, unsupported format versions, unavailable references, and individual inaccessible files separately. Do not block the whole app or overwrite the originals. If a directory is temporarily unavailable, retain loaded content and indicate that reading or writing is unavailable instead of interpreting it as deletion of the whole collection.

Syncthing handles file transfer. Local save success does not prove another device has received the change. Preserve existing source-file version protection. Rebuildable SQLite indexes do not make synchronized source records disposable.

## 6. AI organization boundaries

The first version supports one user-configured online AI service connection, with its address, model, and credentials configured on the device. Send requests through a native network adapter. Do not expose keys in note bodies, model input, or synchronized files. Android requires network capability, replacing the current product description that states no network permission is requested.

Before a request, show the selected scope and the actual text fragments to be sent. Treat Markdown as input data, not executable instructions. AI cannot independently read other paths, modify files, call tools, or change confirmed states. There are no required background calls. Users can manually create and maintain all confirmed content when offline or without a configured service.

The model returns structured candidates. Validate the format, source existence, and whether quoted evidence comes from the actual input. Factual summaries and action suggestions without evidence cannot be directly confirmed. Split long files into traceable batches rather than silently truncating them and claiming full coverage.

Save the source-fragment fingerprint, candidate type, and target-content fingerprint for ignored and confirmed candidates. Do not repeatedly suggest the same candidate. Relevant source changes may make it eligible for renewed analysis, but must not automatically reactivate an old action. Similar wording alone does not justify automatically merging confirmed actions.

Timeouts, offline operation, rate limits, invalid responses, and cancellation have explicit states. Do not retry indefinitely. Check for changed sources before confirmation and require renewed review if the evidence changed. Retries or repeated confirmation must not create duplicate entities.

## 7. Module responsibilities

| Module | Responsibility and dependencies |
| --- | --- |
| Domain rules | Define initiatives, actions, states, relationships, and candidate confirmation without directly accessing files or the DOM |
| File storage and revisions | Use platform adapters to validate and persist source records and retain and resolve conflicts |
| Local index | Incrementally index Markdown and JSON in SQLite and provide paginated queries and search |
| Organization service | Read selected fragments and generate and validate candidates through the native AI connection without directly changing confirmed data |
| Screens and native bridge | Present focus, initiatives, the library, and organization results through bounded query and mutation interfaces |

The current `web/app.js` combines state, reading, parsing, and full rendering. Separate responsibilities as required by this design. Avoid unrelated refactoring, unnecessary frameworks, or rewriting the entire native shell.

## 8. Performance behavior and acceptance

Validation policy update (2026-11-16): the user deferred standalone Syncthing synchronization tests and Android-specific tests until explicitly requested. These checks do not block merging. The [project validation policy](../../agents/validation.md) supersedes the corresponding testing gates below; product behavior requirements remain unchanged.

Remove the fixed four-second full-body scan. On Mac, combine file-change notifications with metadata validation. On Android, incrementally validate metadata on foreground resume and manual refresh; read bodies only for new or changed files. Providers without reliable notifications may use metadata polling, but must not fall back to continuously reading all bodies. Build the initial index in the background with progress and partial results.

All collections use bounded pagination, with 50 records per batch by default. The home screen queries only required summaries. Opening it does not call AI or wait for a complete index rebuild. With an existing index, it does not first reread all Markdown. Opening a note reads only that note's body.

Verify both outcomes and actual work performed. Using SQLite alone does not prove the lag has been resolved:

1. Use synthetic references containing OKRs, evaluation criteria, process checklists, and historical tasks. Confirm that the initial action collection is empty and source content is unchanged.
2. Verify action states, focus order, handling unfinished actions when ending an initiative, source changes, and completed-action history.
3. Delete SQLite and rebuild. Recover initiatives, actions, links, focus order, candidate decisions, and conflicts.
4. Verify offline creation and editing, duplicate events, out-of-order revisions, divergent edits on two devices, tombstones, malformed files, and interrupted writes.
5. Verify AI scope boundaries, evidence checking, invalid responses, cancellation, idempotent confirmation, and candidate deduplication.
6. Use a fixed test set of at least 500 notes and 2,000 confirmed actions. Record cold and warm startup, search, list, and note-opening times and read counts. Target an interactive warm home screen within one second on the reference Mac. Investigate and report failures; do not omit background collection reads from measurement.
7. Automate shared rules and platform adapter contracts. Verify interaction in the actual Mac app, SAF, foreground recovery, and offline writes on a physical Android device, and two-device synchronization through actual Syncthing. List device checks that have not run as remaining gates.

## 9. First-version scope and delivery order

This is a complete content-organization change delivered through verifiable vertical stages. Establish confirmed data, manual initiatives and actions, indexing, and synchronization recovery first; then add reference relationships, AI candidates, and the organization flow. Final acceptance covers the entire approved scope. Detailed tasks and dependencies follow review of this specification.

The first version excludes automatic import of old tasks, bulk relocation or rewriting of references, automatic action execution, calendars and reminders, team collaboration, a custom synchronization server, a general-purpose CRDT, a rich-text editor, and continuous AI analysis of the full collection.

## 10. Technical references

- [SQLite WAL documentation](https://www.sqlite.org/wal.html): WAL involves additional log files and shared-memory mechanisms, with consistency requirements for database operation and copying.
- [SQLite Backup API](https://www.sqlite.org/backup.html): consistent snapshots of running databases require appropriate backup mechanisms; backup is not bidirectional record merging.
- [Syncthing synchronization and conflicts](https://docs.syncthing.net/users/syncing.html?highlight=conflict): transfer and conflict handling operate on files.

Based on these mechanisms, the application synchronizes entity files and maintains a separate query database on each device rather than directly synchronizing a running SQLite database in both directions. This is an application architecture choice.
