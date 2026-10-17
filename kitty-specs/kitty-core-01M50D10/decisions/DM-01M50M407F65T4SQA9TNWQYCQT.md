# Decision Moment `01M50M407F65T4SQA9TNWQYCQT`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.supervision.restart-sequence`
- **Input key:** `restart_sequence`
- **Status:** `resolved`
- **Created:** `2026-10-15T20:30:07.087861+00:00`
- **Resolved:** `2026-10-15T20:30:08.364687+00:00`
- **Resolved by:** `operator`
- **Opened by:** `claude`
- **Other answer:** `false`

## Question

R2-02: the planned 30 s backoff cap is unreachable under the 5-in-5-minutes give-up. Which restart policy?

## Options

- Accept the reachable policy: 0.5, 1, 2, 4 s then give up at the 5th crash within 5 minutes; start timeout per start; monotonic Instant clock
- Raise the give-up threshold so the cap is reachable
- Other

## Final answer

Accept the reachable policy: backoff 0.5, 1, 2, 4 s, then give up at the 5th crash within 5 minutes; the start timeout is one budget per start; Clock is monotonic (Instant) in production; text and tests follow that sequence

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T20:30:07.087861+00:00` — opened
- `2026-10-15T20:30:08.364687+00:00` — resolved (final_answer="Accept the reachable policy: backoff 0.5, 1, 2, 4 s, then give up at the 5th crash within 5 minutes; the start timeout is one budget per start; Clock is monotonic (Instant) in production; text and tests follow that sequence")
