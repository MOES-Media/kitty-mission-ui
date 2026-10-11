---
affected_files: []
cycle_number: 2
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T09:57:44Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 review feedback, cycle 2: REJECT (one item)

All five cycle-1 items are fixed and verified: G-1, G-2, the 390 badge, counts by equality, and the shared predicate.

## The E-40 grant still leaks across the whole file
**Probe.** These properties were planted on a non-badge, non-fact selector in `ops-row-parts.ts`, `[data-ops-head]`:
- `border-block-end`
- `border` (… solid …)
- `font-family` mono
- `font-variant-numeric: tabular-nums`
- `line-height: 1.5`

`lint:styles` exited 0 and `ops-part-selectors.test.ts` passed 7 of 7, so every granted property leaks.

**Remedy.** Add a block (d) to `packages/mission-ui/test/ops-part-selectors.test.ts` that confines each granted property, in `ops-row-parts.ts`, to its pinned selectors:
- **Badge clause** (border, font-family, font-weight, font-variant-numeric, line-height 1.2): only `[data-ops-badge]::part(tag)` and its `[status=…]` variants.
- **Divider** (`border-block-end`): only `[data-ops-facts] > div` and its `:last-child` reset.
- **Row frame and typography** (border, border-radius, background, font-size, line-height 1.5, color, font-family, font-variant-numeric): only `[data-ops-row]`, `[data-ops-mono]`, `[data-ops-id]`, `[data-ops-facts] dt/dd`, `[data-ops-quiet]`, and the evidence class and changed labels.
- Pin the exact list of selectors you actually use.

**Block (d) needs:**
- a positive control: the `[data-ops-head]` plant above is reported;
- the empty violation set on the real file;
- an exact count of the rules it scanned.

Also assert that none of these properties appears in the other Ops part files. The exception is `ops-page-parts.ts`, whose G-3 badge selectors are confined by WP06's own check (c); do not edit WP06's block.

**Housekeeping (orchestrator).** The 16 local baselines from cd8d2fa are untracked in 4bce47b and moved out of the worktree. Do not run `pnpm visual` in this round: it is not an exit check of WP05.
