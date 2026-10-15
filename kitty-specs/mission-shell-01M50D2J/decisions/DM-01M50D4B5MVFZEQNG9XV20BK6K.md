# Decision Moment `01M50D4B5MVFZEQNG9XV20BK6K`

- **Mission:** `mission-shell-01M50D2J`
- **Origin flow:** `specify`
- **Slot key:** `specify.verification.visual-baselines`
- **Input key:** `shell_visual_verification`
- **Status:** `resolved`
- **Created:** `2026-10-15T18:27:58.260689+00:00`
- **Resolved:** `2026-10-15T18:35:30.293417+00:00`
- **Resolved by:** `operator`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

How is the shell's own new UI verified: the connection banners, the refresh control and the composed layouts?

## Options

- A (recommended): Storybook stories for every connection-banner state and each layout composition, with approved baselines in the existing visual gate, flagged for design review because the banners are not in the prototype
- B: interaction tests only (browser-mode tests against the fixture adapter); visual baselines deferred to the host missions
- Other

## Final answer

A (recommended): Storybook stories for every connection-banner state and each layout composition, with approved baselines in the existing visual gate, flagged for design review because the banners are not in the prototype

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator: recommended option A.

## Change log

- `2026-10-15T18:27:58.260689+00:00` — opened
- `2026-10-15T18:35:30.293417+00:00` — resolved (final_answer="A (recommended): Storybook stories for every connection-banner state and each layout composition, with approved baselines in the existing visual gate, flagged for design review because the banners are not in the prototype")
