# Issue 6 implementation plan

Base: c86f083382887905f6e7d725b0e9f9ba21a146ad. The approved content-structure design and issue 6 define this slice; confirmation is out of scope.

1. Add organization rules: explicit selected paths, complete traceable text batches, a fixed evidence-only prompt, strict response validation, cancellation, explicit retry, and revision-backed candidate persistence using the existing repository and local index.
2. Add native OpenAI-compatible Chat Completions adapters on Mac and Android. Keep configuration in private device storage, never return credentials, disallow redirects, bound network requests, and expose explicit failure states. Add Android Internet permission and exclude private settings from backup.
3. Add an Organize screen with device settings, bounded note/directory selection, exact batch previews, progress, cancel/retry, and saved candidate evidence links. Do not expose confirmation mutations.
4. Validate shared rules and real Mac adapters with controlled HTTP responses, test UI interaction, run the existing shared/Mac suite and both builds, and record limitations. Android runtime and standalone Syncthing tests are deferred by user decision.
5. Review Standards and Spec independently against the base, resolve findings, commit and push the feature branch, and open a PR for coordinator review.
