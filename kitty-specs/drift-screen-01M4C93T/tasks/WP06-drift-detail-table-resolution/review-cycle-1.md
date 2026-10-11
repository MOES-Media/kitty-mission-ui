---
affected_files: []
cycle_number: 1
mission_slug: drift-screen-01M4C93T
reproduction_command:
reviewed_at: '2026-10-10T08:18:42Z'
reviewer_agent: user
wp_id: WP06
---

# WP06 feedback, cycle 1: the change request is ruled; apply it

The rulings are in the tracer section "Rulings at WP06: scoped button rules and part-file copy (2026-10-10)". It outranks this summary.

1. **Scope every `sk-button::part(button)` rule by a data attribute.** These are named out-of-map edits to `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs` and `drift-part-selectors.test.ts`.
   - Resolution: `sk-button[data-copy]::part(button)`.
   - Header: `sk-button[data-rescan]::part(button)`. WP05 owns the header markup; only the selector pin changes here.
   - New grant in detail-parts: `sk-button[data-mission-link]::part(button)` with the mono family, normal weight and zero padding, measured against the prototype's mono link.
   - Plant the unscoped `sk-button::part(button)` in each file; it must be refused.
   - Verify that the Mission link now matches the prototype's plain mono text, and measure it.
2. **Move the copy into `defaults/drift-copy.ts`.** This is a named out-of-map edit to WP02's file.
   - The static labels: Authoritative side, Facts, Mission, File, Derived side, Suggested resolution, and the table `aria-label`.
   - The S5 fallback sentence: "Select the command and copy it with your keyboard". Implement the read-back-mismatch path with it, red-first.
   - The parts import these. Write the `contracts/defaults.md` change as a patch to `scratchpad/ui10-wp06-kitty-specs.patch`.
3. Then re-run the gates (no visual, `pnpm test --maxWorkers=2`).
