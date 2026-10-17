# Decision Moment `01M50K4G2G0EA0JN3B6YGH607S`

- **Mission:** `mission-shell-01M50D2J`
- **Origin flow:** `plan`
- **Slot key:** `plan.refresh.after-refused`
- **Input key:** `refresh_after_refused`
- **Status:** `resolved`
- **Created:** `2026-10-15T20:12:54.736940+00:00`
- **Resolved:** `2026-10-15T20:12:56.205361+00:00`
- **Resolved by:** `operator`
- **Opened by:** `claude`
- **Other answer:** `false`

## Question

Squad R2-10: after a refused subscription, how are views refreshed on reconnect?

## Options

_(none)_

## Final answer

While live updates are off, each non-first connected is a shell-side resync: re-read the displayed set; open no new subscription.

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T20:12:54.736940+00:00` — opened
- `2026-10-15T20:12:56.205361+00:00` — resolved (final_answer="While live updates are off, each non-first connected is a shell-side resync: re-read the displayed set; open no new subscription.")
