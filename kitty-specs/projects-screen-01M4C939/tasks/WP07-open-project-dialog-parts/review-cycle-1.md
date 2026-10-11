---
affected_files: []
cycle_number: 1
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T10:30:49Z'
reviewer_agent: user
wp_id: WP07
---

# WP07 review feedback, cycle 1: changes requested

The independent review is in scratchpad `ui9-wp07-review.md`. The orchestrator's rulings are at the end of the tracer section "Rulings at WP07", under "At the WP07 review". Both outrank this summary.

1. **Must fix: two tab stops after an Arrow press followed by a host re-select.** In `folder-list-parts.ts`, `onKeydown` sets `tabIndex` imperatively, and the template binds `tabindex=${...}`. Lit only rewrites a binding whose value changed, so a stale DOM stop survives. Reproduce it with ArrowDown once, then the host sets `selected` to the last option: the stops end as `[-1,-1,0,0]`. Remedy: bind with Lit's `live(...)` directive. Add a red-first test for arrow-then-reselect that asserts exactly one stop.
2. **Must fix: focus outline width.** Use `--sk-border-width-2` for both outline and offset, in the code, the E-33(c) pin and its plant test. Move width-1 to the refused plants.
3. **E-31(d), ruled:** `line-height: 1.2` on `sk-pill-tag::part(tag)`, pinned to `row-parts.ts` and `folder-list-parts.ts`. Draw it in the folder list only; WP08 draws it in the rows. The pill must measure 111.6x24.4.
4. **E-32(f), ruled, dialog file only:**
   - On the footer `sk-button` parts: `font-size: var(--sk-text-sm)`, the semibold weight token, a minimum block size of 44 px as a token calc, and token inline padding.
   - The Cancel pill border.
   - `font-size: var(--sk-text-sm)` on `sk-form-input::part(control)`.
   - Target measurements: the buttons at 81x44 and 71x44 at 14 px semibold, the field at 79 px, and the dialog at 541.4 px at 1280.

Every new config entry gets a pass case, leak tests across every sibling, and value plants. Re-shoot side by side at 1280 and 620 with the measured table, then re-run the full gate set (no `pnpm visual`).
