# Spec review — final exact head

**Reviewed head:** `e19ffb93d0c4011c0de30b77d19f4722c193af0e`.
**Starting SHA / fetched main / review base:**
`2f5a8af78ada6da3c0f6d323cdb3b654e50cb9ed`.
**Diff:** `git diff 2f5a8af...e19ffb9`.

Read current issue #93 and parent #89, approved content-structure design, delivered
Library ownership guidance, shell ownership inventory, full final diff and committed
validation/source-artifact evidence. Apply maintainer layered/browser-first
revisions; unchanged-host native compatibility remains release-deferred.

## Findings

No unresolved Spec findings.

The prior P2 asynchronous-ownership finding is resolved across submitted failures,
post-refresh focus and pagination's separate failure continuation. `run` captures
repository/release generation, explicit navigation handoffs retain destination
failure feedback only in their originating workspace, `refreshOwned` requires a
successful current-owner query before focus, and `pageFocus` now checks active,
repository, request and release ownership before rollback or UI feedback. This
satisfies #89's requirement to “Fence reads, queries, writes, subscriptions,
retries, and restoration by workspace, task/record identity and request generation.”

Independent targeted rerun at this head:
`node --test tests/focus-ownership.test.js tests/focus-position.test.js tests/shell-directory.test.js`
passed 8/8, including delayed query/rejection, current failure feedback, intentional
handoff, pagination replacement-status preservation, ordering and adapter disposal.

The named #93 scope is delivered through consumed typed React shell/Focus owners,
existing repositories, durable bounded reading-history continuation, single
search/capture/leave authorities and explicit legacy islands/root release. No
sibling migration, schema change, native registration duplication or unrequested
feature was found. The optional-transitive lock repair has explicit authorization,
standard-tool metadata and a clean install receipt without workaround flags.

Committed evidence records 83/83 final unit/integration passes, Focus/history and
maintained browser coverage, actual focus/caret/selection, persisted readback,
321 unchanged synthetic source hashes, zero home body reads and rebuilt Mac
package/signature/asset binding. Native transport/OS input, minimum engines, Intel,
physical input and Android/Syncthing limits are explicit; no native runtime pass is
claimed. Initial failures and partial reviews remain preserved. Raw command logs
retain their original whitespace; diff-check whitespace notices in those receipts
do not indicate a product/spec defect.

**Summary:** Spec pass at the exact head above; zero unresolved findings.

Approval held after an additional read-rejection probe: at e19ffb9, held show()
Promise.all -> release() -> reject propagated `old query failed` to the caller.
The success-only request check did not fence rejected reads, including older
same-home requests. This is the same ownership finding, with new diagnostic
progress; final approval requires the request-local failure guard.
