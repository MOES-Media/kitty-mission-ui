---
affected_files: []
cycle_number: 2
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T09:55:36Z'
reviewer_agent: user
wp_id: WP06
---

# WP06 review feedback, cycle 2: REJECT (two items)

Items 2 to 7 from cycle 1 are fixed and verified. The project property mirrors the Missions screen, and the freeze is exactly 12.

1. **The G-3 grant is file-wide, not limited to its two selectors.**
   - **Where:** the E-40 entry for the page file (`stylelint.config.mjs:393-408`) allows border, font-family, font-weight, font-variant-numeric and line-height anywhere in `ops-page-parts.ts`.
   - **The plant that slips through:** `border: var(--sk-border-width-1) solid var(--sk-border-default); font-family: var(--sk-font-mono); line-height: 1.2` on `[data-ops-cell]` (`ops-page-parts.ts:78`). With it, `lint:styles` exits 0 and `ops-part-selectors` passes 7 of 7.
   - **Fix:** add check (c) to `ops-part-selectors.test.ts`. In `ops-page-parts.ts`, those five granted properties may appear ONLY in the rule whose selector is exactly `sk-pill-tag[data-ops-badge]::part(tag)`. Its layout-only `::part(action)` rule may hold only `grid-row`.
   - **Tests:** a planted violation on `[data-ops-cell]` is detected (positive control); the real file yields the empty set; the scan count is asserted by equality.
   - **Revert check:** add the plant to the real file and the test turns red.
   - Do not touch `ops-row-parts.ts`. The same check for the row file is WP05's.
2. **The supporting line is unregistered drift.** Storybook shows "example-project", where the prototype shows "spec-kitty · local invocation records". The Missions screen renders its prototype line from data plus copy ("name · branch · N Missions", `sk-missions-screen.ts:304`). FR-003 and DO-17 make only the name data; the tail is copy.
   - **Fix:** add a tail key to `defaults/ops-copy.ts`, overridable through `labels`, with the default text "local invocation records" (the prototype's words; orchestrator ruling).
   - **Render:** `${project.name} · ${tail}` in `sk-ops-screen.ts` (~:219). Draw no line when `project` is null.
   - **Tests:** paired tests, and a labels-override test that emits nothing and only changes the text.
   - **Copy rule:** the separator " · " follows Missions. If Missions keeps its separator in copy, do the same.
   - Re-take the OP-01 side-by-side at 1280 dark and describe it.
