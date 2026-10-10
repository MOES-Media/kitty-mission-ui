---
affected_files: []
cycle_number: 2
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T11:19:39Z'
reviewer_agent: user
wp_id: WP06
---

# WP06 review feedback, cycle 2: changes requested

The independent review is in scratchpad `ui9-wp06-review.md`. The rulings are at the end of the tracer section "Rulings at WP06", under the heading "At the WP06 review". Both outrank this summary.

1. **Fixtures (FR-028), must fix.** `fixtures.ts` lines 15-40: `driftProject` and `allNullProject` are retyped literals and do not match the vendored examples.
   - Add `projectSchemaDrift` and `projectAllNull` to `scripts/contract/registry.mjs` and `overlays.mjs`, each as a `structuredClone` of the matching example. This is a named out-of-map edit to WP01's generator.
   - Run `pnpm contract:generate` and raise the fixture-count floors with the independent literals the check script requires.
   - Import the two fixtures in `fixtures.ts`, and apply only host overrides by spread.
   - `pnpm contract:check --require-main` and `pnpm test:contract` must stay green.
   - Revert check: delete one overlay; the check must fail.
2. **Accessible name, must fix.** `sk-projects-screen.rows.test.ts` lines 238-247 use a loose regex.
   - FR-003 is now worded as the visual reading order (spec on the planning branch).
   - Pin the exact computed string for the ready fixture's first row, for example `harbor-ledger v3.2.6rc4 healthy 439 Missions active 2 hours ago ~/work/harbor-ledger · main`. Take it from the real accessibility computation, as the review did through CDP, or from an equivalent computed-name helper.
   - Add a second case for a row with null parts, showing they are absent from the name.
3. **E-34(d), the "Open project" button, `header-parts.ts` only (ruled).**
   - `font-size: var(--sk-text-sm)`.
   - The semibold weight token.
   - A 44 px minimum block size as a token calc, using the dialog's calc.
   - Token inline padding.
   - Target: 150x44 at 14 px and weight 600.
   - The config entry needs a pass case, leak tests and value plants. Measure the result against the prototype.

The arrow stays `aria-hidden`. Re-run the full gate set, without `pnpm visual`.
