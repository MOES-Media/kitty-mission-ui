---
affected_files: []
cycle_number: 1
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T11:24:38Z'
reviewer_agent: user
wp_id: WP08
---

# WP08 review feedback, cycle 1: REJECT (three items, plus one orchestrator-approved fold)

Verified with no action needed: tiers (exact boundaries, container not viewport), the out-of-map diff to page parts, the loading heading accessibility tree, revert checks on the a11y, hostile and edge tests, honest perf ceilings, and the self-check greps. The page header is DO-17 "keep".

1. **The pin extension is not narrow.**
   - **Selectors.** `test/ops-part-selectors.test.ts:48` accepts any selector that carries the attribute and ends with `::part(header)`. So `.x sk-section-header[data-ops-section-head]::part(header)` and `div[data-ops-section-head]::part(header)` both pass. Compare the selector exactly against `sk-section-header[data-ops-section-head]::part(header)`.
   - **Properties.** `grantViolations` (`:86-93`) has no property whitelist for `header`. A planted `color: red; font-size: 2rem; background: blue` passed the pin 20 of 20. Allow ONLY `grid-template-columns` and `grid-template-areas` in that rule, as `::part(action)` is limited to `grid-row` and `justify-self`.
   - **Plants.** Add plants for `color` in the header rule and for a non-exact selector. Both must fail.
2. **Stale comments.**
   - The pin's header comment (`:1-6`, "two selectors", "holds only grid-row") and the docstrings at `:45` and `:50` still describe two forms. Correct them to four selectors and the stack.
   - `stylelint.config.mjs:398-399` ("the one other ::part rule ... is ::part(action)") needs the same correction. It is a comment-only, out-of-map edit to WP04's file, and is recorded as such.
3. **Test rule 3: counts by equality.** At `test/sk-ops-screen.a11y.test.ts:96` and `:111`, the 'last page' look uses `rows: -1`, which turns into `toBeGreaterThan(0)`. Assert the exact count taken from `opsProps.lastPage()`.
4. **Approved fold (orchestrator).** Remove the dead `[data-ops-root] { container-type }` and its wrong comment at `sk-ops-screen.ts:54-55`. Nothing queries it, and the parts measure `[data-ops-cell]`.
   - This is an out-of-map edit to WP04's file.
   - The tier tests must stay green, which proves it was dead.
