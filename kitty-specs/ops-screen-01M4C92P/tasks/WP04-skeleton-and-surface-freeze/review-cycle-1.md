---
affected_files: []
cycle_number: 1
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T09:14:43Z'
reviewer_agent: user
wp_id: WP04
---

# WP04 review feedback, cycle 1: REJECT (three items)

Everything else was verified: the E-40/E-42/E-43 scopes, the leak plants, the ops-copy re-export, the HTMLElementEventMap union, the exact surface-freeze counts and the gates.

## 1. The `font-variant-numeric` grant is dead
- **Problem:** no `--sk-*` numeric token exists. The grant therefore passes meaningless values (`var(--sk-numeric-tabular)` and `var(--sk-space-4)` both exit 0 in ops-row-parts.ts) and refuses the one value the prototype needs.
- **Prototype:** prototype.css:702 sets `font-variant-numeric: tabular-nums` on `.mono, time, .badge, .fact-value`.
- **Orchestrator ruling:** CP-1's E-40 includes `font-variant-numeric` for exactly this purpose. Allowing the single pinned keyword `tabular-nums` is the narrow form of that grant.
- **Fix in stylelint.config.mjs (~388-389):** set `values: { 'font-variant-numeric': ['tabular-nums'] }`, pinned (add it to `pinned`), and refuse tokens for this property.
- **Fix in scripts/stylelint-exceptions.test.mjs:**
  - move `tabular-nums` from stillFails (~:232) to allowed (~:218);
  - replace the fictitious `var(--sk-numeric-tabular)` at ~:218 and ~:637 with `tabular-nums`;
  - add stillFails cases `font-variant-numeric: var(--sk-space-4);` and `font-variant-numeric: lining-nums;`;
  - keep `tabular-nums` refused in the sibling-file loop (~:637).

## 2. The badge clause and E-43 have no selector scoping and no leak test
- **Requirement:** CP-1 says the badge grant is "scoped by a data attribute ... leak-tested against the sibling parts", and T023 limits E-43 to "the id and evidence selectors only".
- **Problem:** Stylelint cannot scope by selector, and the comment at stylelint.config.mjs:380-381 hands the check to "the row part's tests". No WP prompt asks for that.
- **Fix:** add `packages/mission-ui/test/ops-part-selectors.test.ts`, modelled on `wp-part-selectors.test.ts`. It must:
  - (a) fail on any `::part` rule in `sk-ops-screen/*.ts` that is not under the badge data attribute in ops-row-parts.ts;
  - (b) fail on `overflow-wrap: anywhere` under any selector other than the id and evidence data attributes.
- **Each check needs:**
  - a positive control: a planted in-test string that violates it is detected;
  - the expected empty set for the current stub files;
  - a count assertion on the files it scanned.
- **Pin the attribute names** so that WP05 must use them, and record them in the hand-off. Suggested: `data-ops-badge`, `data-ops-id`, `data-ops-evidence`. If the tree already has a naming precedent, follow it and say which.
- Update the stylelint.config.mjs comment to name this test.

## 3. A count assertion breaks test-quality rule 3
- **Problem:** `sk-ops-screen.skeleton.test.ts:338` uses `toBeGreaterThanOrEqual(1)`.
- **Fix:** use the exact count, for example `expect(root(screen).querySelectorAll('[role="alert"]').length).toBe(1)` or the exact `sk-notice` count.
- **Also:** the absence checks at ~:295-298 and ~:416-421 need an in-test positive control. Use the same screen, then a look change that does announce or focus.

## Optional (do these if cheap)
- `ops-copy.test.ts` hard-codes the list of 10 defaults modules. Derive the list with a static import list check against `defaults/index.ts`, so that a new module cannot go unseen.
- The loadMore ready-look guard is untested. Add a mismatch-look case to the loop at ~skeleton.test.ts:187.
