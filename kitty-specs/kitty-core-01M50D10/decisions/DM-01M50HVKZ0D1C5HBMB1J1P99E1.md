# Decision Moment `01M50HVKZ0D1C5HBMB1J1P99E1`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.contract.bundle-source`
- **Input key:** `bundle_source`
- **Status:** `open`
- **Created:** `2026-10-15T19:50:35.232128+00:00`
- **Opened by:** `architect-alphonso`
- **Other answer:** `false`

## Question

Where is the bundled contract document (every reference inlined) produced and checked for staleness?

## Options

- A: contract:generate writes contracts/fixtures/mission-status.openapi.json with the existing ref parser; Gate: contract checks staleness (+1 contract plant, contract proof leg 19 to 21 min by formula) (recommended)
- B: Rust only: kitty-core inlines the vendored YAML from build-script-embedded files; no Node or contract-gate change; the stub binary serves the document only from an --openapi file
- Other

## Final answer

_(none)_

## Rationale

_(none)_

## Change log

- `2026-10-15T19:50:35.232128+00:00` — opened
