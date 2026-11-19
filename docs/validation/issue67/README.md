# Issue 67 acceptance evidence

Scope: local wiki navigation and nested reading returns; #60 owns real search retrieval/full search-panel acceptance, #65 ordering is preserved through the Library snapshot contract where available rather than implemented here.

## Native boundary

`python3 tests/native-wiki-links.py` passed using an isolated Cocoa/WKWebView host, actual existing Swift bridge/storage/index implementations, and copied packaged assets. See `native-report.json` for every web-asset SHA256, synthetic source hashes and per-size results; screenshots show desktop/393px restored reading. DOM calls set focus/selection/size; OS-injected Enter performs navigation and Back. No physical-keyboard claim is made. The host was terminated and waited in `finally`; the installed input source was never changed. Exclusive GUI lease was explicitly released to the coordinator after cleanup.

Native run records the then-current git HEAD while production assets were being corrected; its asset hashes, not that earlier git label alone, bind execution to source. Final validation records independently verify equality of every executed asset to the final reviewed checkout. No later production asset edits are covered without a fresh native run.

Initial native attempts failed honestly: the first asset-integrity assertion caught a stale package before launch; later runs caught selection restoration differences and one foreground/input timeout. Rebuild, explicit owned-host activation, and DOM-node-path selection restoration corrected these failures; the final native run passed all assertions. The initial browser dependency was absent, so Playwright was installed without changing the manifest/lock; tests use installed Chrome via CHROME_PATH. One expanded browser test used a nonexistent page-count selector and then an unopened directory disclosure; the harness was corrected to real controls and rerun.

## Behavior and limitations

Supported resolution precedence and fixture plan are in ../issue67-plan.md. Reading never saves source or creates formal records. Dirty reading uses the existing task decision; failed saves keep the source route and draft. Changed prior content is explicitly identified; meaningful selection is restored only if source fingerprint and range text still match. Missing prior paths retain retry and explicit skip; no moved-file or same-basename guess is made. History is local to the current task, not synchronized/persisted recent history.

Android build is packaging evidence only. Android runtime/device/SAF checks and standalone Syncthing remain deferred by #63/project policy and are not passed. Physical input, VoiceOver and two-device end-to-end testing were not executed. Human review is useful for inline target reading rhythm; no new visual direction or merge authority is assumed.
