---
affected_files: []
cycle_number: 1
mission_slug: drift-screen-01M4C93T
reproduction_command:
reviewed_at: '2026-10-10T08:21:06Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 feedback, cycle 1: rulings to apply

These are recorded in the tracer section "Rulings at WP05 (2026-10-10)", which outranks this summary.

1. **620 px meta gap.** Add a grant on `sk-page-header::part(meta)` in `header-parts.ts` only that closes the gap left by the library's empty `sync` slot. It must be token-only (`column-gap: 0`, or hiding the empty slot); choose by measurement against the prototype at 620. This is a named out-of-map edit to the config, the exceptions test (pass case, leak tests, plant) and `drift-part-selectors.test.ts`.
2. **Rescan carries `data-rescan`.** WP06 is scoping the button rules to `sk-button[data-rescan]::part(button)`. Your header must add the attribute, and your Rescan measurements must still hold once the selector is scoped. If WP06's config change is not in your lane yet, add the attribute now; the WP07 merge reconciles the selector.
3. **The listbox gets its own accessible name.** Add a findings-list label to `defaults/drift-copy.ts`, as a named out-of-map edit, and use it as the listbox's name, red-first. Write the `contracts/defaults.md` change as a patch to `scratchpad/ui10-wp05-kitty-specs.patch`.
4. **`sourceCode` stays out of the rows.** This confirms your call; no change.

Then re-run the gates (no visual; `pnpm test --maxWorkers=2`) and re-measure the header at 620 and 1280.
