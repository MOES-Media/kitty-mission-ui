---
affected_files: []
cycle_number: 2
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T10:47:08Z'
reviewer_agent: user
wp_id: WP07
---

# WP07 review feedback, cycle 2: REJECT (one item)

All seven cycle-1 items are fixed and verified. Reverts bite, the confinement plants bite, and the counts are honest.

## G-6: move the line height to the card (rulings ce4fd10 and the one that follows it on feat/ops-screen-11)
Merge `feat/ops-screen-11` into the lane first.

**Measured residuals at 1280:**
- The empty card is 140 px against the prototype's 142. All of the gap is the heading's line box: 21 px against 23.
- The loading card is 144 px against 152. The label-to-body distance is 29 px against 33, and the label's line box is 17 px against 21.

**Cause.** The prototype's `.empty-state` and `.state-loading` set no line height, so everything inside inherits 1.5.

**Remedy.**
1. In `ops-state-parts.ts`, put `line-height: 1.5` on the card selectors: the empty card, and the `[aria-busy='true']` loading card. Remove the per-body G-6 `line-height` rule.
2. In `test/ops-part-selectors.test.ts` (block f), the G-6 `line-height` is allowed on exactly those two card selectors.
   - Plants that must fail: the bare `.sk-empty-state__body`, `.sk-progress__label`, and `> sk-notice`.
   - The real-file scan expects the exact count.
3. Update the G-6 comment in `stylelint.config.mjs`.
4. Geometry tests in `test/sk-ops-screen.state-card.test.ts`. Compare as relations (each element's line-height = 1.5 × its own font size), not as pixel literals:
   - the empty heading's and body's computed line-height equal 1.5 × their font size;
   - the loading label's and body's computed line-height equal 1.5 × their font size.
5. Take side-by-sides again at 1280: OP-19 against `?state=empty`, and OP-22 against `?state=loading`. Report the card heights and their differences. Any remaining difference must be named.

**Optional.** Tighten the `wrapViolations` helper in block (b) from "the attribute appears anywhere in the selector" to an exact-selector match. Today block (e) catches the widening, so the real file is safe.
