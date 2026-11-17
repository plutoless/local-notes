# Chinese Shell and Current Focus Implementation Plan

**Goal:** Implement issue #16's approved restrained Chinese shell and spacious Current Focus, preserving all record behavior.

**Architecture:** Presentation-only vocabulary and feedback helpers, shared CSS tokens/control patterns, existing bounded home queries and mutations. No storage format or domain-rule changes.

**Tech stack:** ES modules, HTML/CSS, Cocoa/WKWebView, Node tests and Playwright.

**Starting SHA:** `780450f3ab81ebf9a9aa0bbd7763be8c2f52c158`.

## Constraints

English project material; Simplified Chinese application copy; preserve user content, paths, IDs, enums, drafts and source protection. No Android-specific or standalone Syncthing execution. Coordinator owns merging. No other issue implementation.

## Tasks

- [x] Capture isolated native before screenshots; introduce shared `web/presentation.js` for terminology, controls and diagnostic details, register it in both asset allowlists and UI fixtures.
- [x] Localize shell and home-owned flows at render sites, including action/initiative creation, native prompts, shared feedback, loading and recovery. Keep diagnostics in expandable details and disabled-control explanations outside disabled controls.
- [x] Replace shell/home styling with Chinese system typography, AA colors, visible focus, reusable fields/dialogs, full-width home and a wrapping 393px navigation. Retain seven/expand/reorder/remove and all existing data operations.
- [x] Document the concrete design baseline and content audit in English. Update UI expectations for localized copy and add shell accessibility, failure, loading and narrow-viewport assertions.
- [x] Run syntax/shared tests, relevant browser interactions, Mac build, actual native interaction and screenshots. Record build versus runtime evidence separately.
- [x] Commit, run separate Standards and Spec reviews against the starting SHA, resolve findings, validate final head, prepare one PR with limitations and Closes #16 (publication tracked by the coordinator-facing completion report).
