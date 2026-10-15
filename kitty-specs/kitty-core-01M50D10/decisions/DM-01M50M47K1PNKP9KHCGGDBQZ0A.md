# Decision Moment `01M50M47K1PNKP9KHCGGDBQZ0A`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.stub.supervised-stand-in`
- **Input key:** `supervised_stand_in`
- **Status:** `resolved`
- **Created:** `2026-10-15T20:30:14.625200+00:00`
- **Resolved:** `2026-10-15T20:30:15.878230+00:00`
- **Resolved by:** `operator`
- **Opened by:** `claude`
- **Other answer:** `false`

## Question

R4-01: hosts and kitty-core have no supervised stand-in for the real service. What is added?

## Options

- kitty-stub accepts --mission-status.port=<n> and --mission-status.project-root=<dir>; fixtures default to <project-root>/fixtures else contracts/fixtures; a test supervises the real stub through Core and reads and streams through it; kitty-core-api.md documents the route for #20 and #21
- No supervised stand-in in #19
- Other

## Final answer

kitty-stub accepts --mission-status.port=<n> and --mission-status.project-root=<dir> (--name=value form); fixtures default to <project-root>/fixtures when present, else contracts/fixtures; a test supervises the real stub through Core and reads and streams through it; kitty-core-api.md documents how #20 and #21 get a supervised stand-in

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T20:30:14.625200+00:00` — opened
- `2026-10-15T20:30:15.878230+00:00` — resolved (final_answer="kitty-stub accepts --mission-status.port=<n> and --mission-status.project-root=<dir> (--name=value form); fixtures default to <project-root>/fixtures when present, else contracts/fixtures; a test supervises the real stub through Core and reads and streams through it; kitty-core-api.md documents how #20 and #21 get a supervised stand-in")
