# Spec review before GUI grant

Reviewed head: `1709273c960db42d6c3da03503bf2ea9b5aea041`.
Base: `13cc92c65cf6877586cf5364211a2df570b80032`.

Zero code findings. Integration preserves read-first opening, contextual Topic creation, both scroll surfaces and pagination focus handoff. Direct-reader descriptor and contextual-membership changes invalidate paging; unchanged descriptors retain it. Archive scope remains confined to Library queries.

The prepared probe uses an external process-targeted sender, checks the owned active PID/window and requires trusted intended-target DOM key events plus AppKit window receipts. DOM setup is identified separately. Private environment backup/restore and source/package bindings are present.

Native keyboard, paging, source-return and focus acceptance remains pending explicitly granted execution. Build-only success is not native acceptance evidence. Final receipts must receive final-head review before a success claim.
