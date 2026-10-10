---
affected_files: []
cycle_number: 2
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T10:01:45Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 review feedback, cycle 2: changes requested

Source: the independent review (scratchpad ui9-wp05-review.md) plus the orchestrator's E-32(d) ruling (tracer, end of the CP-1 addendum). Must-fix:

1. `sk-open-project-dialog.ts` lines 130-134: the body measures `padding: 16px 20px` and `gap: 16px`, where the prototype is 20px and 12px. Set `padding: var(--sk-space-5); gap: var(--sk-space-3);`. No grant is needed.
2. Same file, lines 138-142: the actions `gap` is 12px, where the prototype is 16px. Set `gap: var(--sk-space-4);`.
3. `sk-open-project-dialog.skeleton.test.ts:91`: the loop over 3 selections asserts no count. Add `ran` and `expect(ran).toBe(3)`.
4. `sk-projects-screen.skeleton.test.ts:91`: the loop over 4 keys asserts no count. Add `expect(ran).toBe(4)`.
5. `sk-projects-screen.skeleton.test.ts:184`: the loop over [1280, 1100] asserts no count. Add `expect(ran).toBe(2)`.
6. **E-32(d), ruled:** add these Stylelint entries, pinned to the dialog file, with a pass case, leak tests and value plants for each, and draw them:
   - a base `font-size: var(--sk-text-sm)` (the hint renders 14 px);
   - the title `h2` in `font-family: var(--sk-font-display)` with the size token that renders 18 px (measure it);
   - `sk-form-input::part(label)` `font-weight` with the token that renders 600.

   Then measure against `01-projects.html` at 1280: the header band is 78 px, the hint is 14 px, the title is 18 px.
7. Nit, fold it in: `surface-freeze.test.ts` should assert `reflects` for the reflected properties.

Afterwards, scan all three test files once for any other loop that lacks a count. Re-run the full gate set (no `pnpm visual`), and shoot the dialog side by side at 1280 and 620.
