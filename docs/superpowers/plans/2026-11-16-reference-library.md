# Reference Library Implementation Plan

Goal: Implement issue #4 within the approved content structure design.

Starting SHA: 65e3b5b42ce1eda0e908c832c0167147e728fd73.
Both prerequisites are closed and their commits are ancestors of origin/main.

1. Add a device-local reference SQLite index on both native platforms with metadata inventory, bounded queries, searchable bodies and body-free list payloads.
2. Add shared incremental reconciliation: enumerate metadata, read only changed bodies, publish progress and partial results, preserve entries when enumeration is incomplete.
3. Persist topics and their note links through the existing immutable revision repository; add library topic and directory controls and note topic editing.
4. Replace periodic body scans with Mac notification-triggered metadata validation plus metadata polling fallback, Android foreground/manual validation, and preserve editor/draft protections.
5. Validate shared rules and Mac native contracts with 500 notes and 2,000 actions, run applicable builds, and perform separate Standards and Spec reviews against the starting SHA.

Android-specific tests and standalone Syncthing tests are deferred by project policy. Build results do not establish device behavior.
