# Decision Moment `01M50D4B5MVFZEQNG9XV20BK6K`

- **Mission:** `mission-shell-01M50D2J`
- **Origin flow:** `specify`
- **Slot key:** `specify.verification.visual-baselines`
- **Input key:** `shell_visual_verification`
- **Status:** `deferred`
- **Created:** `2026-10-15T18:27:58.260689+00:00`
- **Resolved:** `2026-10-15T18:28:09.172137+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

How is the shell's own new UI verified: the connection banners, the refresh control and the composed layouts?

## Options

- A (recommended): Storybook stories for every connection-banner state and each layout composition, with approved baselines in the existing visual gate, flagged for design review because the banners are not in the prototype
- B: interaction tests only (browser-mode tests against the fixture adapter); visual baselines deferred to the host missions
- Other

## Final answer

_(none)_

## Rationale

Awaiting the operator: a product fork the issue, code and defaults do not settle. Specify subagent recorded options with a recommendation; the operator rules before plan.

## Change log

- `2026-10-15T18:27:58.260689+00:00` — opened
- `2026-10-15T18:28:09.172137+00:00` — deferred
