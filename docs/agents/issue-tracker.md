# Issue tracker: GitHub

Track requirements, problems, and implementation tasks in GitHub Issues.
The target repository is plutoless/local-notes. Use the gh CLI.
Write issue titles, bodies, and comments in English.

## Conventions

- Create: gh issue create --repo plutoless/local-notes --title "Title" --body-file <file>
- Read: gh issue view <number> --repo plutoless/local-notes --json number,title,body,labels,comments
- List: gh issue list --repo plutoless/local-notes --state open
- Label: gh issue edit <number> --repo plutoless/local-notes --add-label <label>
- Comment: gh issue comment <number> --repo plutoless/local-notes --body-file <file>
- Close: post the result first, then run gh issue close <number> --repo plutoless/local-notes.

Write multiline bodies to UTF-8 files and submit them with --body-file.

Before creating the first issue, use gh repo view to verify the target repository.
Never file this project's issues in mattpocock/skills, the source of these skills.

Prefer native GitHub sub-issues for parent-child relationships.
If unavailable, add Part of #<parent-number> to the child issue body.

Prefer native GitHub issue dependencies for blockers.
If unavailable, add Blocked by: #<number> to the issue body.
An issue is unblocked only after all blocking issues are closed.

## Skill terminology

"Publish to the issue tracker" means create a GitHub issue.
"Fetch the relevant ticket" means read the corresponding GitHub issue.
Local design documents may provide the detailed specification for an issue;
their full contents do not need to be duplicated.

## Pull requests as a triage surface

PRs as a request surface: no.
