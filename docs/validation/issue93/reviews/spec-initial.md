# Spec review

Reviewed source head `611b30190b1c35eb64d85d0cddca9b11bda9b546` and full evidence head
`3058ee258efbbb497397fce026425ea09d2ca080` against starting/latest-main
`2f5a8af78ada6da3c0f6d323cdb3b654e50cb9ed` using `git diff 2f5a8af...3058ee2`.
Current issue #93, parent #89, approved content-structure design and delivered
Library/shell ownership guidance were read. Maintainer layered/browser-first
revisions supersede blanket native replay requirements.

## Finding

**P2 — Fence failed writes and post-refresh focus through owner release.**
`web/focus-screen.js:10` catches every asynchronous rejection with
`this.notice(error.message)` even after `release()` or workspace replacement.
The new removal/reorder continuations at lines 37 and 44 also call global `.focus()`
after `await this.show()` without checking whether that refresh still owns the
surface. If navigation or workspace replacement occurs while the save/refresh is
pending, an old operation can display its failure in the new workspace or focus a
new workspace's home control. Successful-save checks before refresh do not protect
these later continuations.

Parent #89 requires: “Fence reads, queries, writes, subscriptions, retries, and
restoration by workspace, task/record identity and request generation.” Issue #93
also requires preserving focus restoration and task ownership while crossing
migrated/legacy pages. Although the legacy helper had related gaps, they remain
within the explicitly migrated Focus ownership scope.

A controlled probe of the shipped controller (`run` a held operation, `release`,
replace the repository, reject the old operation) produced
`{"noticesAfterOwnerRelease":["old workspace save failure"]}`. Gate error feedback
by the originating owner and require a still-owned successful refresh before
restoring focus; cover controlled rejection and refresh ordering at unit level.

## Other scope and evidence

No sibling/schema/host migration was found. React presentation consumes existing
repositories, history, search/capture and leave authorities. Evidence records 79
unit/integration passes, 28 maintained browser scripts across corrected groups,
source preservation, zero home body reads, packaging and honest native/minimum-OS
limitations. The authorized optional-transitive lock repair stays within scope.

Summary: one Spec finding, P2 asynchronous feedback/restoration ownership; final
approval awaits correction and exact-head re-review.
