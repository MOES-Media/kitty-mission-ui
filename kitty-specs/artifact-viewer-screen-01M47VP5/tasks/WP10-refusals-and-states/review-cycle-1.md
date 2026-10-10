---
affected_files: []
cycle_number: 1
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-08T05:59:28Z'
reviewer_agent: user
wp_id: WP10
---

# WP10 review: changes requested (rulings on your CR-1 and CR-2, 2026-10-08)

See the tracer section "Rulings at WP10: refusal and state card look, and the focus carry-over".
1. **CR-2, grant E-45.** Add a narrow token-only grant to `stylelint.config.mjs` for `refusal-parts.ts` and `state-parts.ts`: dashed border style, width and colour tokens; card fill; radius token; eyebrow uppercase plus mono font token; mono font token on the path; display heading size token. Pin each declaration in `scripts/stylelint-exceptions.test.mjs` and add leak plants in sibling files. Both files are named out-of-map edits.
   - Write the CSS so AV-09..AV-13 match `05-artifact.html?state=unavailable` at a true 1280 px and 800 px. Look at the images.
   - AV-14 and AV-20..AV-23 have no prototype. Keep them consistent with the new card look where they share the block.
   - Add the E-45 row to `contracts/gates.md` through a kitty-specs patch.
2. **CR-1, the focus carry-over.** In `sk-artifact-screen.ts`, carry a pending restore across updates so the overflow-triggered second update cannot cancel it. This is a named out-of-map edit. Turn the `it.fails` link-swap test into `it`, and run a revert experiment.
3. **Box-sizing:** check the new card box, with padding and a border, for `border-box`.
4. **Gates:** the full set plus `pnpm test`, then gate-proof once in the foreground. The expected visual reds are only the new stories.
