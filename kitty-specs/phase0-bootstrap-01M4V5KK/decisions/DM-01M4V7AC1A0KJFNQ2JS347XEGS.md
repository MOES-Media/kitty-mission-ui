# Decision Moment `01M4V7AC1A0KJFNQ2JS347XEGS`

- **Mission:** `phase0-bootstrap-01M4V5KK`
- **Origin flow:** `plan`
- **Slot key:** `plan.structure.stub-crate`
- **Input key:** `stub_crate_placement`
- **Status:** `resolved`
- **Created:** `2026-10-13T18:10:12.138692+00:00`
- **Resolved:** `2026-10-13T18:10:13.553809+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Should the Rust stub live in its own crate (crates/kitty-stub) or inside kitty-core as issue #17 and epic #16 worded it?

## Options

- Own crate crates/kitty-stub
- Module/feature inside kitty-core
- Other

## Final answer

Own crate crates/kitty-stub (operator confirmed the engineering alignment 2026-10-13: keeps kitty-core free of server dependencies the hosts never use)

## Rationale

_(none)_

## Change log

- `2026-10-13T18:10:12.138692+00:00` — opened
- `2026-10-13T18:10:13.553809+00:00` — resolved (final_answer="Own crate crates/kitty-stub (operator confirmed the engineering alignment 2026-10-13: keeps kitty-core free of server dependencies the hosts never use)")
