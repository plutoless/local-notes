# Issue102 failure and repair history

No failed check is counted as a pass. Early diagnostics below were transcribed
from tool output; later raw command output is retained in `logs/`.

| Failure signature | Diagnosis and correction | Targeted result / limit |
| --- | --- | --- |
| Vite `UNRESOLVED_IMPORT ./assets/react-host.js` from presentation.js through React sync.tsx | Pure vocabulary shared by React imported the legacy renderer, which now imports the compiled host. Split labels and directory publication into non-rendering modules; no bridge copy or registration added. | Typecheck/build passed. One completed repair; import graph changed, no recurring signature. |
| Isolated leave fixture `page.waitForFunction` timeout waiting for window.fixture | Fixture route served HTML for the newly imported compiled host. Serve actual built modules/CSS. | leave-focus passed; behavior assertions retained. One harness repair. |
| Form focus timeout waiting for `star` after reader information open | Native onclick attached to a React control could be lost on rerender. Use the reader's typed `info` callback. | Form journey advanced through reader metadata and all fields. One product repair. |
| `npm test`: 100/101 passed; fake DOM could not host React feedback in durable-focus recovery test | Replace the fake receipt renderer with a typed `FeedbackPort`; retain committed revision/private draft assertions and assert the exact failure/model message through that port. Existing actual-app Action test asserts the visible committed recovery receipt and persistence. | Targeted Action entry 3/3; later full unit/integration 101/101 and affected final suite passed. One seam repair. |
| Maintained UI moveNote timeout: metadata dialog intercepted a second click on the reader opener | Reader opener lost the old async busy guard. Restore busy behavior before async preparation, retaining the single modal owner. | Actual app ui.mjs passed after correction. One product repair. |
| Form focus returned `star`, expected `note-info-open` after Escape | A settled React pending update could leave the real opener disabled until its render committed. Commit busy state synchronously; latest disabled props still participate in React reconciliation. | Focused form journey passed. Deterministic presentation-port test proves disabled-during-submission/enabled-at-settlement, actual receiver, title/caret preservation and restoration. The intermediate direct-DOM reset passed but was replaced with synchronous React state to preserve current disabled props; final focused check passed. |
| New coherent fixture strict locator: three `#items [data-path]` rows after changing Topic | Await the actual filtered collection result rather than treating selectOption as completion. | Reached wiki navigation. One harness correction with diagnostic progress. |
| New coherent fixture wiki button unavailable by visible alias alone | Safe Markdown supplies `打开本地笔记：…` accessible names. Select the delivered accessible identity. | Complete coherent journey passed. One harness correction. |
| Search UI `#body` not visible immediately after asynchronous open | The helper examined a still-hidden reader before load completed. Wait for the actual editor to become visible before choosing Edit. No behavior assertion removed. | A later run exposed the separate stale filter reference below; final search journey passed. One readiness correction. |
| Search UI rows unavailable after retiring the unused filter strip | Consumer scan found two remaining hide-only references ending a statement. Remove those references along with the other hide-only consumers. | Final search UI passed; no remaining `#filters` consumer in web/. One cleanup correction. |
| Coherent fixture source link timeout after confirming candidates | Fixture chose the first Initiative by incidental query order after adding a second one. Select the exact confirmed Initiative identity/title and assert that record's links. | Final coherent journey passed with persisted readback and reload. One identity-based harness correction. |

| Inflated archived baseline CSS (43,903 vs normal 6,169 bytes) | The archive lacked repository metadata and Tailwind automatic discovery included extra utilities. Restore Git ignore discovery within the ignored baseline archive without source edits; rebuild emits the normal 6,169 bytes. | Initial baseline rejected and retained; matching states/benchmark rerun on corrected baseline. One environment correction, no product change. |

Each failure led to a distinct diagnostic or observable behavioral advance. No
signature recurred after two completed repairs without progress, and no counter
was reset. No privacy/security/scope decision was bypassed, no native GUI process
was launched or killed, and no coordinator/scheduler state was edited. Source
changes use focused checks plus the broad maintained UI run justified by shared
renderer/field/modal ownership; evidence-only publication reuses source-bound
results without unrelated replay.
