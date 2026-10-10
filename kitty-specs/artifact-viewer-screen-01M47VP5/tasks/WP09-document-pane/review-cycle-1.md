---
affected_files: []
cycle_number: 1
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-07T23:29:31Z'
reviewer_agent: user
wp_id: WP09
---

# WP09 review: changes requested (operator ruling, 2026-10-08)

Your hand-off listed five places where the pane drifts from the prototype because the grants were too narrow. The operator ruled: grant all five, narrowly and pinned. See the tracer section "Operator ruling at WP09: widen the grants so the document pane matches the prototype".

1. **Grant and test each one.** Add each grant to `stylelint.config.mjs` and its declaration pin to `scripts/stylelint-exceptions.test.mjs` (named out-of-map edits; WP07 owned these files). Each grant needs a red-first leak plant in a sibling file. Add the matching rows to `contracts/gates.md` (E-21, E-23, E-25, E-26) through your kitty-specs patch.
2. **Write the CSS** so that the tabs (pill tray), eyebrow, toolbar file name (mono, ellipsis, `title`), raw block line-height and heading line-height match `05-artifact.html`. Compare at a true 1280 px and 800 px viewport, look at every image, and list what you checked.
3. **Keep the fallback notice tone `attention`**, as DA-21 rules.
4. **Run the gates:** the full set, `pnpm test`, and gate-proof once in the foreground. Its visual leg is red only for the new stories, which have no baseline until WP13. Classify any other red.
