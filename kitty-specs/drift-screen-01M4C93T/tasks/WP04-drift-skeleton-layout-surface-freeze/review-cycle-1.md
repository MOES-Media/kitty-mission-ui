---
affected_files: []
cycle_number: 1
mission_slug: drift-screen-01M4C93T
reproduction_command:
reviewed_at: '2026-10-10T07:43:49Z'
reviewer_agent: user
wp_id: WP04
---

# WP04 review feedback, cycle 1: changes requested

The independent review is in scratchpad `ui10-wp04-review.md`. The rulings are in the tracer section "CP-1 addendum at the WP04 review (2026-10-10)". Both outrank this summary.

1. **Must fix: skeleton tests that WP05/WP06 cannot edit will break once the real parts land** (`test/sk-drift-screen.skeleton.test.ts`):
   - Lines ~327/~330: filter the exact `regionIds` lists to the screen's own wrapper ids.
   - Lines ~642-648 ("every stub part returns an empty template"): delete the test.
   - The focus tests (~418-470): call `replaceChildren()` on the listbox and the header before injecting the fake option and `h1`.
2. **Must fix: loop counts.**
   - skeleton ~210: 3.
   - skeleton ~318: 2.
   - `surface-freeze.test.ts` ~304: 9.
3. **Callback wiring.** Add one test that calls each part callback (`onSelect`, `onRescan`, `onRetry`, `onReturnToMissions`, `onOpenMission`, `onCopy`) and asserts exactly one event with flags and detail.
4. **Grants from the addendum.** Each needs a pass case, leak tests and plants:
   - E-39 extended to `detail-parts.ts` (Facts `dd` `overflow-wrap: anywhere`).
   - `resolution-parts.ts`: copy result `color: var(--sk-fg-muted)`; command `color: var(--sk-fg-body)`; pinned `min-block-size: 1.5em`. Probe the lint-clean form; if `em` is refused by the unit list, report it.
   - `header-parts.ts`: Rescan `color: var(--sk-fg-body)`.
5. **`::part` selector pin test.** Following #5's `wp-part-selectors.test.ts`, pin which `::part(...)` selectors each Drift part file may use, with a planted leak case.
6. **Gate-proof plant format.** `gates/plants/eslint/plant.json` is now an array. Confirm the gate-proof runner reads an array for the eslint gate (`scripts/gate-proof/lib.mjs`). Run `pnpm gate-proof --only eslint` once (a single gate) and report the result.

Then run the full gate set without visual.
