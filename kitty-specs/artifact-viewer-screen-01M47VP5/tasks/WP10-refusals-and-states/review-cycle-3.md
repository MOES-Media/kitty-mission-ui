---
affected_files: []
cycle_number: 3
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-08T06:54:54Z'
reviewer_agent: user
wp_id: WP10
---

# WP10 cycle 3: changes requested

Full review: the orchestrator's private review notes. The measured drift is larger than your hand-off listed: the card is 197 px tall against the prototype's 186.8 px.

1. **E-45 extension** (tracer, "Rulings at WP10", last bullet). Pin each of these in `refusal-parts.ts` and `state-parts.ts` only, with a near-neighbour case and a sibling leak plant:
   - h1 `font-weight: var(--sk-weight-bold)`
   - h1 `letter-spacing: -0.01em`
   - path `font-size: var(--sk-text-sm)`
   - unitless `line-height`: 1.5 on the body text, 1.2 on the heading
   Remove the extra 4 px gap; that needs no grant.
2. **Measure, don't eyeball.** Assert the card's computed height in a test, within 1 px of the prototype's 186.8 px at 1280, using the same content. Assert the h1 width and weight too.
3. **Focus test gap.** Add a test proving that, after a completed restore, a later update with focus on the body does NOT pull focus. Today, never clearing `restorePending` passes all six focus tests.
4. **Visual check.** Re-shoot AV-09 at a true 1280 px and 800 px.
5. **Gates.** Run the full set plus `pnpm test`, then gate-proof once in the foreground.
