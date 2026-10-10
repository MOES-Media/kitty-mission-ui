# ui#9 pre-merge squad: confirmed findings and the acceptance bar for the fix round (2026-10-10)

The source is R2 (`review-refute/v1`). Its probes are in `probe-R2/full/packages/mission-ui/test/r2-probe.test.ts`. This file outranks any paraphrase of it. Implement exactly what it says, no more.

## Fix
1. **A11Y-001 (sev 2).** `folder-list-parts.ts` `onKeydown` returns early when altKey, ctrlKey, metaKey or shiftKey is set. In `keyboard.test`, every modified chord must leave `defaultPrevented` false and focus unmoved, with plain ArrowDown as the control.
2. **A11Y-002 (sev 3).** Dialog focus capture, using the screen's pattern:
   - In `willUpdate`, capture `this.shadowRoot?.activeElement`.
   - In `updated()`, if that element is detached while the dialog is open, call `focusFirstControl(dialog)`.
   - Add a `focus.test` case: Retry, then status loading, then ready, and focus stays inside the dialog (never on body). The control is the case where the button stays connected.
   - The open-on-loading half was refuted, so do not change it.
3. **A11Y-003, operator ruling: polite region only.**
   - Set `announce="off"` on the dialog's error `sk-notice`, as the screen's `state-parts.ts` does.
   - The polite region keeps the error sentence.
   - Add a test that exactly one live or alert carrier holds the sentence.
   - Patch: `contracts/sk-open-project-dialog.md` line ~31 changes "alert notice" to "danger notice (announce off)", with the region as the only announcer.
4. **A11Y-005, operator ruling: drop it and ask upstream** (the orchestrator has commented on spec-kitty-design#496).
   - Remove the dead `aria-describedby="open-reason"` from the Open `sk-button`. The visible reason stays adjacent in reading order.
   - Replace the host-attribute assertion with one on the visible reason text and its position after the button.
   - Fix the comment and the contract line if it promises "describes the button".
5. **A11Y-006 (sev 1).** Keep the active option index as private state:
   - `onKeydown` updates it;
   - it resets only when `folders` or `selected` changes;
   - render `tabindex` from it.
   - Add a test: arrow, then an unrelated property change (`location`), and the tab stop stays on the arrowed option.
6. **BOUNDARY-001 (sev 2), comment-only.**
   - Cite the sunset issues: E-31(a) #525, E-31(c)/(d) #526, E-33 and E-33(c) #527, E-32 #503, and E-34, E-34(b)-(d) and DP-22 #529.
   - Make the same change in `contracts/gates.md` and the spec E-33 row, via the patch.
7. **BOUNDARY-002 (sev 2).** Export the type `ProjectView` from `index.ts`, and add it to `surface-freeze.test.ts`.
8. **CONTRACT-001, operator ruling: waive, test-proven.**
   - The PR-31 waiver is recorded in the tracer by the orchestrator.
   - Patch: amend FR-031 and SC-001 to say "PR-31 is proven by the interaction test (forced-colours emulation plus light theme), not by a story".
   - Correct the FR-031 acceptance evidence. If it is in `acceptance-matrix.json` or the verdict records, report the exact location to the orchestrator. Do NOT hand-edit spec-kitty state.
9. **CONTRACT-002, operator ruling: blocked on the library.** The orchestrator has commented on #528.
   - Keep `ProjectRowView.description`.
   - Fix its misleading comment so it says the description is prepared for a library passthrough (spec-kitty-design#528) and is not yet wired.
   - Patch: the spec Q4/data-model note says it is blocked by the library.
10. **CONTRACT-003 (sev 3).**
    - Change `project-retry.test.ts` to `expect(projectRetryDetail({ key: 'dup' })).toStrictEqual({ target: 'project', key: 'dup' })`.
    - Add a screen-level edge test: two error entries with key `twin`; Retry on the second emits exactly `{ target: 'project', key: 'twin' }`.
11. **CONTRACT-004 (sev 2).**
    - In `renderStub`, draw Retry only when `projectRetryDetail(view) !== null`.
    - Add a test with a keyless error row (no Retry, sentence shown) beside a keyed sibling as the control.
12. **CONTRACT-005 (sev 2).** Rename `ProjectRowView.accessibleName` to `announcementText` across the logic, the screen and the tests. Add a comment that the row's real name is computed by `sk-action-row` from its visible content (FR-003).
13. **CONTRACT-006 (sev 1).**
    - Patch: add `schemaVersionText` to `defaults.md`, and change `sk-projects-screen.md` "action slot" to "beside the page header".
    - Code: swap the P-2/P-3 labels in `project-types.ts`, and remove the unused `onRequestOpen` from `ListStateContext` and its call.
14. **TESTS-001 (refuted; optional hardening, ADOPTED).** In the three measuring files (`states`, `tier`, `skeleton`), add a `beforeAll` guard that the bundled fonts loaded: `document.fonts.load` for Inter, and for Falling Sky where it is measured, then `document.fonts.ready`. Keep the literals.
15. **TESTS-002 (sev 3).** Track the last announced state text. When the state is unchanged but the text changed (for example the error message), announce it. Add a `liveregion` test: error 'first', then 'second'. The control is a same-message re-render, which stays silent.
16. **TESTS-004 (sev 2).** Add a dialog case under `forced-colors: active` (cdp emulation, reset in `afterEach`): the selected option's `borderTopStyle` is solid, and unselected options have none. Control: with emulation off, the selected option has no border.
17. **TESTS-005 (pre-existing, FOLDED per the no-follow-up rule).**
    - Tighten `classOnly` in `eslint.config.mjs` to `(${alternatives})(?:(?:--|__)[a-z0-9-]+)?`.
    - Re-run lint over every #4, #5 and #9 grant; a newly red file means STOP and report.
    - Drop the `|| plant.includes(...)`.
    - Plant `class="sk-progressive"` and `class="sk-progressx"` on their own; each must be refused.
18. **TESTS-007 (sev 2).** In the perf test, take the median of 5 warmed samples for each of the three measurements (the #5 precedent). Keep the 200 ms budget and the slow-path control.

## Not fixed (refuted)
A11Y-004 (ruled by E-33), BOUNDARY-003, TESTS-003 (D-14), TESTS-006.
