# Spec review of integrated code and native failure receipts

Head: `2b81148d72e393705611d183c18e6a69c35d9bb2`.
Base/main: `13cc92c65cf6877586cf5364211a2df570b80032`.

Zero new code findings. Mandatory native acceptance remains unmet: the first Shift+Tab stopped before posting with sender exit 1, “Owned active recipient or sender capability unavailable.” There are no successful trusted-keyboard, paging, source-return or focus receipts from this run. The report contains no native pass claim.

Source/package hashes match the reviewed files. Cleanup records PID 64909 terminated, wait completed, PID absent and zero owned windows; input source and clipboard remained unchanged and restoration succeeded. The execution log is `native-execution.txt`. This is an execution blocker, not a demonstrated product defect. No further GUI action was performed during review.
