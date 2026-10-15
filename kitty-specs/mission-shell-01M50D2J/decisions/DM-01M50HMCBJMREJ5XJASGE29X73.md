# Decision Moment `01M50HMCBJMREJ5XJASGE29X73`

- **Mission:** `mission-shell-01M50D2J`
- **Origin flow:** `plan`
- **Slot key:** `plan.gates.visual-plant`
- **Input key:** `visual_plant`
- **Status:** `deferred`
- **Created:** `2026-10-15T19:46:38.066267+00:00`
- **Resolved:** `2026-10-15T19:46:50.088609+00:00`
- **Opened by:** `architect-alphonso`
- **Other answer:** `false`

## Question

FR-018 requires a planted change to a banner's appearance to fail the visual gate. The visual proof leg is already the longest CI job (37.4 min, 2 runs of ~17.7 min). How should the banner plant be added?

## Options

- A: move the single visual plant from sk-mission-sample to the reconnecting banner story (leg stays 2 runs, ~39 min) (recommended)
- B: add a second visual plant (leg 3 runs, ~57 min of a 60 min timeout; PR CI wall clock +~19 min)
- C: no visual plant; assert the banner in the story DOM instead (needs a spec amendment of FR-018)
- Other

## Final answer

_(none)_

## Rationale

Operator fork raised by the plan agent (research.md R-12); the plan proceeds on the recommended option A until the operator rules.

## Change log

- `2026-10-15T19:46:38.066267+00:00` — opened
- `2026-10-15T19:46:50.088609+00:00` — deferred
