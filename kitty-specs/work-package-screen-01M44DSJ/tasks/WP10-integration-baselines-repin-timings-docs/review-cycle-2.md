---
affected_files: []
cycle_number: 2
mission_slug: work-package-screen-01M44DSJ
reproduction_command:
reviewed_at: '2026-10-06T07:47:13Z'
reviewer_agent: claude
wp_id: WP10
---

# WP10 sent back again (2026-10-06): review cycle 2 findings

The review report `scratchpad/ui5-wp10-review.md` outranks this summary.

1. **Mobile band (operator ruling, see tracer "Operator ruling during WP10: one column in the shell's mobile tier").** At viewports 689 to 719 px (shell mobile tier) the screen shows two columns. Fix it at the source:
   - `sk-mission-shell` exposes its current tier through an additive, documented surface (for example a reflected `tier` attribute on the host, or a CSS custom property), with a shell test. Existing shell baselines must not change.
   - `sk-work-package-screen` forces one column when the shell is in the mobile tier.
   - Add a test measuring the column count at 689, 700, 719 (one column) and 720 and 760 (as before).
   - Write the gates.md or contract-note patch to `scratchpad/ui5-wp10c-kitty-specs.patch` if the shell surface needs recording.
2. **Stories still clipped.** Add `vh-2000` (or the height the content needs) to WP-02, 07, 08, 10 and 13. Re-baseline ONLY those after LOOKING at each PNG; list them.
3. **"WP01 WP01" (WP-29).** In `facts-parts.ts`, show the id alone when the dependency title equals its id, as `chain-parts.ts:138` already does. Add a test and re-baseline WP-29.
4. **`composed`.** Pin `composed` on `sk-select-work-package` in `host-composition.test.ts`.
5. Commit messages must state accurately what was viewed.

Gates: the full set, `pnpm test`, five visual runs and gate-proof. No untracked PNGs. Do not touch port 6210 (the operator's Storybook on this lane).
