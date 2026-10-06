---
affected_files: []
cycle_number: 1
mission_slug: work-package-screen-01M44DSJ
reproduction_command:
reviewed_at: '2026-10-05T14:41:10Z'
reviewer_agent: claude
wp_id: WP09
---

# WP09 sent back by the orchestrator (2026-10-05)

WP09's integration work is good. Three overflow defects it found must be fixed before approval, and the tests that hide them must stop hiding them.

**Operator ruling (tracer "Operator ruling during WP09: overflowing pills and values"):** pills WRAP.
1. Amend E-21 in `stylelint.config.mjs`: on `sk-pill-tag::part(tag)` allow `white-space: normal`, `overflow-wrap: anywhere` and `max-width: 100%`, scoped to `facts-parts.ts`, `header-parts.ts` and `review-parts.ts` only. Use keyword and token values, with proof cases in `scripts/stylelint-exceptions.test.mjs`: allowed in the scoped files, refused in a sibling, other values refused. Also allow `overflow-wrap: break-word` for the review latest-result values in `review-parts.ts`.
2. **CR-1** (Frontmatter dependency pills), **CR-2** (actor and staleness badges) and **CR-3** (review latest-result values): apply the rules so that nothing leaves the screen at any tier or at 200 percent text. WP09 is the integration point, so editing these WP05- and WP06-owned part files is authorized here.
3. **Remove `KNOWN_DEFECTS`** and every hiding of these elements from the overflow and 200 percent tests. The tests must hold EVERY element to the rule. Red-first: the un-hidden tests fail before the fix and pass after.
4. The mid-word break test: keep its allow-list exactly as ruled (only the header title ellipsizes; Facts, Workspace, node, pill and review-result text may break mid-word).
5. Write the gates.md amendment for the E-21 pill rule as `scratchpad/ui5-wp09b-kitty-specs.patch`.
6. Optional, if cheap: revert checks for the per-tier tab test and EV-2/EV-8, which were not done.

Gates: all of them, plus `pnpm test` and gate-proof (the visual leg is expected red only for un-baselined `screens-work-package-*` stories; re-run any baselined red alone). Do not touch port 6210 (the operator's Storybook on this lane).
