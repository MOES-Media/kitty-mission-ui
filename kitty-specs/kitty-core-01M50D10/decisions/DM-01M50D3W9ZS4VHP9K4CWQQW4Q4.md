# Decision Moment `01M50D3W9ZS4VHP9K4CWQQW4Q4`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `specify`
- **Slot key:** `specify.supervision.restart-policy`
- **Input key:** `supervision_restart_policy`
- **Status:** `open`
- **Created:** `2026-10-15T18:27:43.039166+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

What should the supervisor do when the service crashes repeatedly?

## Options

- Restart with capped exponential backoff, and give up after 5 crashes inside 5 minutes: stop and report degraded service-missing (reason: crashing) until the host asks to retry
- Restart forever with capped exponential backoff; the host shows reconnecting throughout
- Never restart automatically: a crash stops the service and reports degraded until the host asks to retry
- Other

## Final answer

_(none)_

## Rationale

_(none)_

## Change log

- `2026-10-15T18:27:43.039166+00:00` — opened
