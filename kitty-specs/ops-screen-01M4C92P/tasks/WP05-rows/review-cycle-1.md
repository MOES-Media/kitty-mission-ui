---
affected_files: []
cycle_number: 1
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T09:45:44Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 review feedback, cycle 1: REJECT

The inertness, the data rules and every gate are sound. Before the fix round, merge `feat/ops-screen-11` into this lane: e665824 (grants G-1 to G-3) and 45846c9 (the project property ruling) are not ancestors yet.

All line numbers are in `ops-row-parts.ts` unless the item names another file.

1. **G-1, the dividers, are not built.** The prototype's `.facts > div` has `border-bottom: 1px solid rgb(43,49,59)`, reset on `:last-child`. The fact pitch measures 46 px in the prototype and 45 px here.
   - At `:89`, add `border-block-end: var(--sk-border-width-1) solid var(--sk-border-default)`, plus `[data-ops-facts] > div:last-child { border-block-end: 0 }`.
   - Add `border-block-end` to the E-40 properties at `stylelint.config.mjs:386`, with a leak plant.
   - This is a recorded out-of-map edit to WP04's file.
2. **G-2, the badge, is not built, and the borrowed token goes with it.** Here the tag computes to padding 2px 8px, line-height 18px, height 24. The prototype's is padding 4px 8px, line-height 14.4px, height 24.39. The `--sk-border-width-2` padding at `:61` is a compensation hack and is not acceptable.
   - Set `padding-block: var(--sk-space-1)` and `line-height: 1.2` under `[data-ops-badge]::part(tag)`.
   - Pin `1.2` in the E-40 values. Pin the selector in `ops-part-selectors.test.ts`.
3. **Unregistered drift at 390.** In the stacked head (`align-items: stretch`, `:141`) the badge stretches to a full-width 316x24 bar. The prototype's badge stays fit-content at 46.8 px, and CP-1's S-O3 records the pill width as unchanged.
   - Add `align-self: flex-start` to `sk-pill-tag[data-ops-badge]` (`:52`).
   - Add a test asserting that the badge width at 390 equals its width at 1280, as a relation.
4. **Test-quality rule 3: counts use equality, never "at least".** Replace each of these with a counted equality, as `EXPECTED_ELEMENTS_MARKUP` already does:
   - `sk-ops-screen.rows.test.ts:249` `toBeGreaterThanOrEqual(7)`: use `toBe(buildOpsRow(item).facts.length)`.
   - `:307` `toBeGreaterThan(6*20)`.
   - `ops-row-parts.test.ts:85` `toBeGreaterThan(29*20)`.
   - `sk-ops-screen.evidence.test.ts`, the per-fixture `>30` and the `>18*30`. The WP prompt requires the walk floor N to be asserted with equality.
5. **`ops-row-parts.test.ts:86-89`.** The positive control uses a different predicate from the check it guards. Factor the attribute check into one function and plant against that function.

Accepted as is:
- `data-ops-mono` instead of `class=mono`.
- The styles-array wiring.
- `changedWord` and `changedDescription` in `ops-row.ts`.
- The early 696/588 container blocks, which WP08 owns. At 800 the facts stay two columns because the WP06 page wrapper is not in this lane; it will be rechecked at WP08.

Note: WP06's fix round edits `stylelint.config.mjs` and `ops-part-selectors.test.ts` in parallel, for G-3 in `ops-page-parts.ts`. Keep your edits to those files minimal and additive: append new entries and do not reorder. The orchestrator resolves the merge.
