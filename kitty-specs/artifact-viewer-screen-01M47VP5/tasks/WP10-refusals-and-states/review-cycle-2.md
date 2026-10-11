---
affected_files: []
cycle_number: 2
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-08T06:26:11Z'
reviewer_agent: user
wp_id: WP10
---

# WP10 cycle 2: changes requested (close the residual drift)

Your item 7 listed residual drift outside E-45. Under the operator's standing prototype-fidelity preference, E-45 is extended (tracer, "Rulings at WP10", last bullet):
1. **Eyebrow:** the 12 px size token, the subtle colour token, the weight, and `letter-spacing: 0.08em`.
2. **Heading:** the display font-face token.

For each declaration:
- pin it, add a near-neighbour case and a sibling leak plant, and keep it in the same two files only;
- update the E-45 row in your kitty-specs patch.

Then re-shoot AV-09 at a true 1280 px and 800 px against `?state=unavailable`, and confirm the eyebrow and heading match.

Gates: the full set plus `pnpm test`, then run gate-proof once in the foreground.
