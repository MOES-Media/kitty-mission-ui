# Decision Moment `01M50D403EEYQYEPSSMAV732DF`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `specify`
- **Slot key:** `specify.discovery.lookup-rules`
- **Input key:** `discovery_lookup_rules`
- **Status:** `resolved`
- **Created:** `2026-10-15T18:27:46.926758+00:00`
- **Resolved:** `2026-10-15T19:25:18.775918+00:00`
- **Resolved by:** `operator`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Which lookup rules should the discovery trait implement and test while upstream has no install convention?

## Options

- An explicit binary path from host configuration wins and fails loudly if invalid; otherwise one environment variable; otherwise a PATH search for the configured binary name; nothing found means service-missing
- Explicit path only: no environment variable and no PATH search until upstream defines an install location
- Explicit path, environment variable, PATH, then a list of per-OS default install directories
- Other

## Final answer

An explicit binary path from host configuration wins and fails loudly if invalid; otherwise one environment variable; otherwise a PATH search for the configured binary name; nothing found means service-missing

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T18:27:46.926758+00:00` — opened
- `2026-10-15T19:25:18.775918+00:00` — resolved (final_answer="An explicit binary path from host configuration wins and fails loudly if invalid; otherwise one environment variable; otherwise a PATH search for the configured binary name; nothing found means service-missing")
