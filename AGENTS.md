## Writing language

Communication with the user may use any language.

Use English by default for all written project material, including:

- Repository documentation, READMEs, requirements, specifications, and plans.
- Code comments and docstrings.
- GitHub issue titles, bodies, and comments.

Apply this rule to all new or edited project material, regardless of the language
used in the conversation. Do not require the user to request English each time.

## Agent skills

### Issue tracker

Track work in GitHub Issues for plutoless/local-notes.
See docs/agents/issue-tracker.md.

### Triage labels

Use the five default triage labels.
See docs/agents/triage-labels.md.

### Domain docs

Use a single-context layout: GLOSSARY.md at the repository root and docs/adr/.
See docs/agents/domain.md.

### Validation

Use layered testing: primarily behavior-focused unit tests, focused real-adapter
integration tests, and a small number of justified UI end-to-end journeys. Prefer
browser validation when UI verification is needed. Run affected native checks for
host, bridge, resource, lifecycle, or OS integration changes. Ordinary UI native compatibility replay is deferred to
release-level checks. Syncthing standalone tests and Android-specific tests remain
deferred and do not block merging.
See docs/agents/validation.md.
