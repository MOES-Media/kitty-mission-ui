---
affected_files: []
cycle_number: 1
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T10:30:38Z'
reviewer_agent: user
wp_id: WP07
---

# WP07 review feedback, cycle 1: REJECT

Merge `feat/ops-screen-11` into the lane first. It carries 9079b5f (G-4, G-5, DO-25) and the rulings at this review (G-4 narrowed, G-6, the dead guard). Paths below are under `packages/mission-ui/`.

1. **G-4: the state card is not built.**
   - **Empty look**, `ops-state-parts.ts:41-43` on `[data-ops-state] > .sk-empty-state`:
     - `border: var(--sk-border-width-1) dashed var(--sk-border-control)`;
     - `border-radius: var(--sk-radius-lg)`;
     - `background: var(--sk-surface-card)`.
   - **Loading look**, `[data-ops-state][aria-busy="true"] > .sk-empty-state`: the border is `solid var(--sk-border-default)`. The prototype measures dashed rgb(129,129,139), solid rgb(43,49,59), a 16 px radius and an rgb(24,26,31) background at 1280.
   - **No card on the error look** (ruling: G-4 narrowed).
   - **Pin the grant** in `stylelint.config.mjs`: this file only, those properties, tokens plus the `dashed`/`solid` keywords. That is an out-of-map edit to WP04's file.
   - **Add a confinement check and a leak plant** in `test/ops-part-selectors.test.ts`, as a new append-only block.
2. **G-5: the long profile is clipped, not wrapped.**
   - `ops-state-parts.ts:51-56` still has `overflow: hidden`. Replace it with `overflow-wrap: anywhere` on `code[data-empty-profile]` and fix the comment.
   - Extend E-42 at `stylelint.config.mjs:413` to `ops-state-parts.ts`, for that keyword only.
   - Add a paired test: a long profile wraps (more than one line, and `scrollWidth <= clientWidth`), and a short one stays on one line.
3. **G-6: the empty-look typography** is unregistered drift, measured at 1280.
   - **Today:** heading weight 600 (the prototype has 700); a 12 px gap between heading and body (the prototype has 0); a 17 px body line (21); a 146 px card (142).
   - **Grant:** match the prototype under G-6 (see the tracer):
     - a weight token;
     - gap 0;
     - body `line-height: 1.5`, pinned.
   - **Confine** it to the empty-state heading and body selectors, with a leak plant.
   - **Test** the geometry with relations and pinned inputs.
4. **Remove the dead `emptySkipped` key:**
   - `src/defaults/ops-copy.ts:53` and `:176-177`;
   - `test/ops-copy.test.ts:70` and `:215-218`, adjusting the counts by equality.
   This is an out-of-map edit to WP02's files.
5. **FR-033 defect.** Going from empty (status `empty`) to `ready` with `items: []` announces "No invocation records" a second time, although the markup is identical.
   - **Cause:** `sk-ops-screen.ts:189` compares `reason`, which is `status` before and `empty-ready` after.
   - **Fix:** ignore `reason` when the look is empty (the smallest wiring change, an out-of-map edit).
   - **Tests** in `test/sk-ops-screen.announce.test.ts`:
     - a count-0 test with a positive control;
     - a direct change from `{code:null}` to the cursor code announces exactly once.
6. **D-09 guards.**
   - **Delete the dead guard** at `sk-ops-screen.ts:205` (ruling). Removing it left all 47 tests passing, because when focus is inside the shadow root `document.activeElement` is the host, so `:207` already returns.
   - **Pin the `isConnected` half of `:198`** with a test: focus Load more, set `loadingMore`, then blur to the body before the frame. With the guard, focus stays on the body. Without it, focus jumps to the heading.
7. **Test quality.**
   - `states.test.ts:147`: the tautology `toBe(status==='ready'?0:0)` becomes `toBe(0)`, and the loop needs a loading positive control.
   - `states.test.ts:125` and `:445`: replace "at least" with equality.
   - `ops-state-parts.test.ts:138` is titled "no path, no file format" but checks only href and src. Make the test match its title, or retitle it.
   - `ops-state-parts.test.ts:126` leaves a `once` listener behind. Remove it in a `finally`.

Accepted, with no change needed:
- OP-36 and OP-22 are an accepted duplicate baseline.
- DO-3/4/17/20/21/25 cover the other differences.
