# Decision Moment `01M4V6BWK8JXK4B8TV09MP50AB`

- **Mission:** `phase0-bootstrap-01M4V5KK`
- **Origin flow:** `plan`
- **Slot key:** `plan.data.stub-source`
- **Input key:** `stub_data_source`
- **Status:** `resolved`
- **Created:** `2026-10-13T17:53:33.288862+00:00`
- **Resolved:** `2026-10-13T17:53:55.039976+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

What single data source should the Rust stub and the TypeScript fixture adapter share: (a) the existing contract-validated fixture set (vendored examples plus overlays), emitted by the existing generator as a language-neutral JSON file that both read, with the scripted change sequence authored as JSON beside it; or (b) the raw vendored per-schema examples read directly by the Rust stub, with a separate TypeScript fixture adapter?

## Options

- Shared generated JSON (examples + overlays) for both
- Raw vendored examples in Rust, separate TS fixtures
- Other

## Final answer

Shared generated JSON (examples + overlays) for both

## Rationale

_(none)_

## Change log

- `2026-10-13T17:53:33.288862+00:00` — opened
- `2026-10-13T17:53:55.039976+00:00` — resolved (final_answer="Shared generated JSON (examples + overlays) for both")
