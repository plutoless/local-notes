# Issue #19 implementation plan

Base: 318a44f341895c27a32c97416bab4f92310f7381. Issue #16 is closed in both native dependencies and the textual blocker list; its presentation module and design-language document are present.

Reuse the approved Chinese design language and current storage adapters. Keep library browsing wide until a note opens, then show a bounded list beside a comfortable reading surface; narrow screens show one task at a time. Put topic and initiative relationships and file utilities in expandable note details, with mode and save state next to the body. Preserve all persistence and conflict protocols.

1. Update library presentation: distinguish empty/filter/search/favorite/directory states, stable selection, Chinese loading and retry feedback, directory breadcrumbs and secondary topic controls.
2. Update note presentation: secondary details, accessible favorite/mode/checkbox controls, Chinese independent-action guidance, readable Markdown paragraphs/lists/quotations and long paths. Keep source files and stored enums unchanged.
3. Add focused shared-web integration coverage using the actual Swift adapter for browsing, topics, favorites, search, navigation, save/recovery, rename links and conflicts; verify 393px and keyboard states. Run existing shared suites and Mac build.
4. Capture baseline and final isolated native Mac interactions and screenshots, document the copy audit and exact validation boundary, review Standards and Spec independently, commit and open one PR. Android runtime and standalone Syncthing remain deferred. The coordinator owns merge and closure.
