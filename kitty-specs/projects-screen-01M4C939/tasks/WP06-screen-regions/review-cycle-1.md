---
affected_files: []
cycle_number: 1
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T11:05:07Z'
reviewer_agent: user
wp_id: WP06
---

# WP06 review feedback, cycle 1: changes requested (rulings on U1 to U5)

The rulings are in `tracer-design-decisions.md`, section "Rulings at WP06: screen type and progress (2026-10-08)". That section outranks this summary. It authorizes named out-of-map edits to `stylelint.config.mjs`, `eslint.config.mjs`, `scripts/stylelint-exceptions.test.mjs` and the screen file.

1. **E-34(c), screen type (operator: grant).**
   - Add pinned entries, tied per file, for the base size and line-height on the host, the `h1` face, colour, letter-spacing and line-height, the muted copy colour, the weights (eyebrows semibold, name bold, pill regular), and the row text and toolbar count at `--sk-text-sm`. Then draw them.
   - Token-only, measured against the prototype at 1280. Every entry needs a pass case, leak tests and value plants.
   - Close the pill box (68.4x24.4, padding 4/8) with token padding. E-31(d) `line-height: 1.2` is already in WP07's lane-g config. You do NOT add it here; WP08 draws it in the rows after the merge. Report the pill height you measure without it.
2. **#4's progress sheet (operator).**
   - Add a `class=` prefix grant for `sk-progress` only, in `state-parts.ts` and `row-parts.ts`, with ESLint leak tests.
   - Adopt the sheet in the screen file the way #4 does, and remove the native `<progress>`.
   - The bar must look like #4's. Compare it with a #4 Missions loading story.
3. **U5:** widen E-31(b) to the row title in `row-parts.ts`. Long names go on one line with an ellipsis, and the full name stays available as title text. Write the test red first.
4. **Panel heading:** the empty, loading and error panels mirror #4's panel, so use #4's heading size token (18 px, not 16).
5. **Accessible name (FR-003: "name, health, count").** The library row computes its name from all the slotted content. Check whether `sk-action-row` accepts `aria-labelledby` or an equivalent, or whether the content can be ordered and marked so the computed name is exactly name, health, count, without hiding visible text from assistive technology.
   - If no clean way exists, STOP and report the exact computed name for one row, so the orchestrator can rule.
   - Do not hide visible content with `aria-hidden`.
6. **U3:** the "Open project" button icon is confirmed drift (a library gap). No change.

Then re-shoot side by side at 1280, 1100, 800 and 620, same viewport and scale, with the measured table, and confirm that each item is closed. Re-run the full gate set (no `pnpm visual`).
