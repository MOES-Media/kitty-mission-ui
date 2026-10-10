---
affected_files: []
cycle_number: 2
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-08T00:03:34Z'
reviewer_agent: user
wp_id: WP09
---

# WP09 review cycle 2: changes requested

Full review: scratchpad `ui7-wp09-review.md`.

1. **BLOCKER (visual drift):** the toolbar band is 101 px tall; the prototype's is 79 px (78 px plus the 1 px rule). The cause is that `min-height: 68px` (E-28) stacks on the 32 px padding, because the shadow root has no `box-sizing: border-box` (prototype.css:674 sets it globally).
   - Add `box-sizing: border-box` to the band in `toolbar-parts.ts`. If Stylelint refuses it, add it to the toolbar's existing E-28 entry as a pinned value with a leak plant.
   - Assert the band height is exactly 79 px at 1280 px, with the tray present. Assert the raw-only case too.
   - Re-shoot at a true 1280 px and 800 px, and look at the images.
   - Check the other parts for the same box-sizing effect, wherever a min-height or width meets padding.
2. **Minor:** make grant 3's leak plant cover `overflow:` too, and assert an exact count instead of `ran >=`.
3. **Gates:** the full set, plus `pnpm test`. Run gate-proof once in the foreground. The visual reds expected are only the new stories.
