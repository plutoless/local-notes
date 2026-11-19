# Issue 67 implementation and evidence plan

Starting SHA: `1a38a5167b8583729a6831a33ade8107d25476a1`.
Live preflight: #67 and parent #63 read with comments (none); native blocker #66 closed; PR76 merged at starting SHA, PR74 merged at fbb7b79bbffdfadb4aabb01b8efdaedea89d625a; PR75 remains open. Origin/main contains the reader and search navigation foundations. Scope excludes #65 ordering and #60 retrieval work.

## Resolution contract

Wiki syntax is `[[path]]` or `[[path|display alias]]`. An optional `.md` extension is supported. Exact path spelling is case sensitive. Resolve a path relative to the current document directory first, then as a workspace-local exact path. Explicit `./` and `../` paths use only the relative interpretation. Dot segments may normalize within the workspace; absolute paths, backslashes, hidden/excluded components, URL/fragment/query and encoded paths are unsupported. No basename, title, fuzzy or moved-file fallback exists. Extensionless targets with multiple extension spellings are ambiguous. Existing native metadata enumeration and source-read guards remain authoritative. Metadata enumeration reads no note bodies; only the selected target is read.

Nested Back reopens the same prior path. Changed documents are identified and shown as the current version without restoring stale selection offsets. Missing prior paths retain a retry and explicit skip control. The outer Library/Initiative/action/search return owner remains intact. History is task-local, not a persistence schema or recent-reading feature.

## Fixture matrix and checks

- Parser/resolver: alias escaping, literal code, relative/root precedence, extensions, duplicate names, ambiguity, excluded/unsafe/missing targets.
- Storage-backed application browser journey: alias → nested relative target → Back → original → Library; desktop/narrow focus and unchanged source bytes.
- Extend failure evidence for changed/moved targets, competing/delayed reads, workspace changes and task lifecycle.
- Native: isolated actual repositories/index and packaged assets; OS-injected keyboard, nested Back/focus/scroll at desktop and narrow sizes, source/asset hashes.
- Required shared check/test/UI suites and Mac/Android builds; Android runtime and standalone Syncthing deferred per parent #63 and validation policy.
- Independent Standards and Spec review against starting SHA/latest-main merge-base, with findings and final-head resolution evidence.
