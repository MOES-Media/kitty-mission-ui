# Decision Moment `01M50D403EEYQYEPSSMAV732DF`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `specify`
- **Slot key:** `specify.discovery.lookup-rules`
- **Input key:** `discovery_lookup_rules`
- **Status:** `open`
- **Created:** `2026-10-15T18:27:46.926758+00:00`
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

_(none)_

## Rationale

_(none)_

## Change log

- `2026-10-15T18:27:46.926758+00:00` — opened
