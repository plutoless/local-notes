# Scoped native IME Escape recovery

Recovery starts at `2c2cd22ee29634f710281352c568bcab7c2ec1a5`, preserving existing PR62. Fetched origin/main remains `ed3ae2617b3b705fa3b01f6ce4cc5b3608049320`; no base merge was needed. This recovery changes only search's composition-aware Escape ownership and its regression/evidence material.

## Reproduced defect and correction

Actual WeType Chinese input (`com.tencent.inputmethod.wetype.pinyin`) reproduced the failure: Escape cancelled marked `ni'hao`, WebKit delivered trusted compositionend followed by trusted keydown Escape with isComposing=false, and the search handler dismissed the dialog. This violated the IME ownership requirement even though ordinary shortcut tests had passed.

The search input now tracks active composition and the event turn in which composition ended. Escape remains owned by the IME during that turn, including the native dialog cancel path. A zero-delay task releases this ownership; a later ordinary Escape closes normally. No arbitrary elapsed-time grace period or persistence change is introduced. Explicit Close and other editing shortcuts retain their behavior.

## Executed real native regression

Run in sequence:

```
npm run build:mac
python3 tests/native-search.py
python3 tests/native-search-ime.py
```

The first native script packages the built production code with the existing isolated test-only inspection channel. The IME script verifies all packaged frontend asset hashes, selects the real installed WeType input source through the Carbon TIS API, and sends OS keycodes through System Events. It records trusted composition/input/keyboard events and restores the original input source in finally. It never dispatches fake keyboard or composition events for native acceptance.

The real regression verifies:

- zhongwen composes and Space commits a Chinese candidate with trusted compositionend (the exact candidate depends on the installed IME dictionary/history);
- Escape cancels active nihao composition while search stays open, then a separate Escape closes it;
- candidate ArrowDown/Enter commits real IME text while search remains open;
- Command+A/C copies input text verified with pbpaste, Command+X/V cuts/pastes, Command+Z undoes paste, Command+Left and Command+Shift+Right move/select the line, and Option+Backspace deletes the word;
- the dialog retains input focus during editing and closes normally afterward.

`tests/search-ui.mjs` separately provides a deterministic event-order regression for both keydown and dialog cancel in the same composition-end turn, followed by later ordinary Escape. These synthetic browser events verify handler ordering only; native acceptance relies on the actual IME test above.

Final executing head, trusted event transcript and packaged asset hashes are recorded in `build/issue58-ime/native-ime-result.json`; build/logs and final independent Standards/Spec reports are named in the PR and coordinator handoff. Earlier committed native artifacts in this directory document the pre-recovery head and are not substituted for this new evidence.

The real WeType acceptance gap is resolved when this regression passes against the final pushed head. Other IMEs, physical mouse-drag selection and private-corpus qualitative relevance evaluation remain unrun. Android runtime/device and standalone Syncthing checks remain explicitly deferred, not passed. Human interaction/relevance review is optional qualitative follow-up rather than an outstanding material gate once the tested IME regression and reviews pass.
