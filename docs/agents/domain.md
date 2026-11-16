# Domain docs

This repository uses a single-context domain documentation layout:

- GLOSSARY.md at the repository root defines domain terminology.
- docs/adr/ records architecture decisions.

## Reading rules

Before exploring the code, read GLOSSARY.md if it exists
and read any ADRs relevant to the current work.

If these files do not exist, proceed silently without blocking
or creating empty files in advance.
The domain-modeling skill creates them as terms or decisions are resolved.

## Usage rules

Use the glossary's definitions in naming, requirements, tests, and design documents.
Refer terminology gaps to domain-modeling.

If a proposal conflicts with an existing ADR, identify the decision explicitly
and explain why it should be reopened. Do not silently override it.
