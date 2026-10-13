# Contract: `contracts/fixtures/` files

| File | Producer | Gate check (`Gate: contract`) |
|---|---|---|
| `mission-status.examples.json` | `pnpm contract:generate` (every vendored example except `_index.yaml`, 77 at the current pin, YAML parsed, no overlays) | byte-equal to a fresh generation, **and** every value deep-equal to an independent YAML parse of its source file (the stub test's oracle) |
| `mission-status.routes.json` | `pnpm contract:generate` (from `openapi.yaml` paths plus the reviewed `DEFAULT_EXAMPLES` map) | byte-equal to a fresh generation; every `defaultExample` exists in `examples.json` and has the route's `responseSchema`; each route's `refusals` equals the operation's declared non-200 responses |
| `mission-status.fixtures.json` | `pnpm contract:generate` (the `valid` registry fixtures) | byte-equal to a fresh generation; every value validates against its schema |
| `mission-status.changes.json` | authored by hand | every `data` validates against its event schema; the data-model invariants hold (each kind present, one mission id, increasing cursors, no `id` on `log-truncated`) |

Format rules:
- All four files are formatted JSON (2-space indent, trailing newline) and carry no local paths (hygiene gate).
- The generator never touches `changes.json`.
- **Escaping (F-21)**: the JSON emitter writes invisible and bidi characters (for example U+FEFF and U+202E) as `\uXXXX` escapes, matching what the `.ts` emitter already does. A generated file must never hide characters from review. Parsed values are unchanged.

Consumers:
- `packages/mission-shell` (fixture adapter, coverage test), by JSON import;
- `crates/kitty-stub`, at runtime, from the `--fixtures` directory.
