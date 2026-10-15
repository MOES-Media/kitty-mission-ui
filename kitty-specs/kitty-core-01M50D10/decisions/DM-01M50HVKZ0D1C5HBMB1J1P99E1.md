# Decision Moment `01M50HVKZ0D1C5HBMB1J1P99E1`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.contract.bundle-source`
- **Input key:** `bundle_source`
- **Status:** `resolved`
- **Created:** `2026-10-15T19:50:35.232128+00:00`
- **Resolved:** `2026-10-15T20:00:31.680375+00:00`
- **Resolved by:** `operator`
- **Opened by:** `architect-alphonso`
- **Other answer:** `false`

## Question

Where is the bundled contract document (every reference inlined) produced and checked for staleness?

## Options

- A: contract:generate writes contracts/fixtures/mission-status.openapi.json with the existing ref parser; Gate: contract checks staleness (+1 contract plant, contract proof leg 19 to 21 min by formula) (recommended)
- B: Rust only: kitty-core inlines the vendored YAML from build-script-embedded files; no Node or contract-gate change; the stub binary serves the document only from an --openapi file
- Other

## Final answer

A: contract:generate writes contracts/fixtures/mission-status.openapi.json with the existing ref parser; Gate: contract checks staleness (+1 contract plant, contract proof leg 19 to 21 min by formula)

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T19:50:35.232128+00:00` — opened
- `2026-10-15T20:00:31.680375+00:00` — resolved (final_answer="A: contract:generate writes contracts/fixtures/mission-status.openapi.json with the existing ref parser; Gate: contract checks staleness (+1 contract plant, contract proof leg 19 to 21 min by formula)")
