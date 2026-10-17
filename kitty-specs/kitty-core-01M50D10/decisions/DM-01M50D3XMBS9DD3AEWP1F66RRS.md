# Decision Moment `01M50D3XMBS9DD3AEWP1F66RRS`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `specify`
- **Slot key:** `specify.supervision.ownership`
- **Input key:** `service_lifetime_ownership`
- **Status:** `resolved`
- **Created:** `2026-10-15T18:27:44.395779+00:00`
- **Resolved:** `2026-10-15T19:25:17.409812+00:00`
- **Resolved by:** `operator`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Does kitty-core start the service itself, and who owns its lifetime when Kitty Desktop and Kitty Dashboard both run for the same project?

## Options

- kitty-core always spawns its own child process per host and project, on a port it picks, and stops it when the host stops; two hosts run two services
- kitty-core spawns, but first attaches to a service another host already started for the same project, through a lock or port file kitty-core writes
- kitty-core never spawns: it attaches to a service the user started, at a configured port, and only watches its health
- Other

## Final answer

kitty-core always spawns its own child process per host and project, on a port it picks, and stops it when the host stops; two hosts run two services

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T18:27:44.395779+00:00` — opened
- `2026-10-15T19:25:17.409812+00:00` — resolved (final_answer="kitty-core always spawns its own child process per host and project, on a port it picks, and stops it when the host stops; two hosts run two services")
