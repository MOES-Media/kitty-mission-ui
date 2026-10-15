# Decision Moment `01M50D491TSVP2DCY0HF9F940W`

- **Mission:** `mission-shell-01M50D2J`
- **Origin flow:** `specify`
- **Slot key:** `specify.refresh.manual-control`
- **Input key:** `explicit_refresh_triggers`
- **Status:** `resolved`
- **Created:** `2026-10-15T18:27:56.090233+00:00`
- **Resolved:** `2026-10-15T18:35:28.595981+00:00`
- **Resolved by:** `operator`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Artifact and Ops views are not covered by the change stream and refresh explicitly (Drift already has its own Rescan). What triggers that refresh?

## Options

- A (recommended): navigation (entering or re-entering the view) plus the window becoming visible or focused again as signalled by the host, plus a shell-owned Refresh button in the top bar host-actions area on Artifact and Ops destinations
- B: navigation plus host-signalled visibility or focus only; no new button
- C: navigation plus the Refresh button only; no focus trigger
- Other

## Final answer

A (recommended): navigation (entering or re-entering the view) plus the window becoming visible or focused again as signalled by the host, plus a shell-owned Refresh button in the top bar host-actions area on Artifact and Ops destinations

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator: recommended option A; the Refresh button is flagged for design review.

## Change log

- `2026-10-15T18:27:56.090233+00:00` — opened
- `2026-10-15T18:35:28.595981+00:00` — resolved (final_answer="A (recommended): navigation (entering or re-entering the view) plus the window becoming visible or focused again as signalled by the host, plus a shell-owned Refresh button in the top bar host-actions area on Artifact and Ops destinations")
