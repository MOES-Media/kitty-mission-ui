# Decision Moment `01M50HVNACZ8T6XM1XKJ68TR8J`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.contract.yaml-parser`
- **Input key:** `yaml_parser`
- **Status:** `open`
- **Created:** `2026-10-15T19:50:36.620575+00:00`
- **Opened by:** `architect-alphonso`
- **Other answer:** `false`

## Question

Does kitty-core parse the served /api/v1/openapi.yaml as YAML now, or JSON only until #22?

## Options

- A: YAML now with yaml_serde =0.10.7 (adds yaml_serde, libyaml-rs, ryu; no build scripts, no proc macros) (recommended)
- B: JSON only now (0 crates); a YAML document from the real service is contract-mismatch until #22
- Other

## Final answer

_(none)_

## Rationale

_(none)_

## Change log

- `2026-10-15T19:50:36.620575+00:00` — opened
