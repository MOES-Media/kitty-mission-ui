---
affected_files: []
cycle_number: 1
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T11:51:41Z'
reviewer_agent: user
wp_id: WP08
---

# WP08 review feedback, cycle 1: changes requested

The full independent review is in scratchpad `ui9-wp08-review.md` and outranks this summary. Items 1, 2 and 3 must be fixed. Items 4 and 5 are folded in now rather than left for the wrap-up.

1. **PR-31 is incomplete** (`sk-projects-screen.a11y.test.ts` lines 318-340): forced colours are never switched on. `cdp()` from `vitest/browser` with `Emulation.setEmulatedMedia` (`forced-colors: active`) works in this lane, which is #7's precedent.
   - Run the pill-border and focus-ring assertions under that emulation.
   - Reset it in `afterEach`.
   - Add a positive control showing the same element differs without the emulation.
2. **Emit flags are missing.** The Enter/Space activation test (`a11y.test.ts:157`) and the repeated-key test (`edge.test.ts`, ending at line 169) must assert `bubbles` true, `composed` true and `cancelable` false on every collected event.
3. **Loose regex** at `a11y.test.ts:290`: `/quartz-notes .*[a-z]/` matches almost anything. Assert the raw health word (or the exact computed string) instead.
4. **Perf test:** add a warm-up render before the clock starts, and strengthen the positive control (a deliberate slow path that must fail the budget). Keep the ceiling at 200 ms with no multiplier.
5. **PR-31 light theme:** add the spot check the plan names, if PR-31 asks for it. Otherwise say why it is not required.

Re-run the full gate set (no `pnpm visual`). Record the revert check for item 1: with the emulation removed, the forced-colour test must fail.
