# Contract: `contracts/fixtures/` files

| File | Producer | Gate check |
|---|---|---|
| `mission-status.routes.json` | `pnpm contract:generate` (from `openapi.yaml` paths) | `Gate: contract`: byte-equal to a fresh generation |
| `mission-status.fixtures.json` | `pnpm contract:generate` (the `valid` registry fixtures) | `Gate: contract`: byte-equal to a fresh generation; every value validates |
| `mission-status.changes.json` | authored by hand | `Gate: contract`: every `data` validates against its event schema; the data-model invariants hold (each kind present, one mission id, increasing cursors, no `id` on `log-truncated`) |

All three are formatted JSON (2-space indent, trailing newline) and carry no local paths (hygiene gate). The generator never touches `changes.json`.

Consumers:
- `packages/mission-shell` (fixture adapter, coverage test), by JSON import;
- `crates/kitty-stub`, at runtime, from the `--fixtures` directory.
