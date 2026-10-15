# Quickstart: kitty-core

All commands run from the repository root. Nothing here contacts anything other than `127.0.0.1`.

## Regenerate the bundled contract document (after `contract:update`)

```bash
pnpm contract:generate          # also writes contracts/fixtures/mission-status.openapi.json
pnpm contract:check             # Gate: contract; a stale bundle fails with "stale generated file: …openapi.json differs"
```

## Build and test the Rust side (Gate: rust, unchanged command)

```bash
rustup toolchain install && cargo fetch --locked
cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
cargo test -p kitty-core --frozen                      # kitty-core alone; NFR-001: ≤ 60 s
cargo test -p kitty-core --frozen --test latency -- --ignored --nocapture   # NFR-003 measurement (evidence, not a gate)
```

## Run the stub with the new options

```bash
cargo run -p kitty-stub -- --fixtures contracts/fixtures --port 0
# then: curl -s -H 'Host: 127.0.0.1:<port>' http://127.0.0.1:<port>/api/v1/openapi.yaml | head -c 200

# a modified contract document (the digest check must then report contract-mismatch)
cargo run -p kitty-stub -- --fixtures contracts/fixtures --openapi <temp-dir>/modified.json

# a refusal selected at start-up, without any X-Kitty-Stub-* header
cargo run -p kitty-stub -- --fixtures contracts/fixtures --select getArtifactContent=ArtifactRefusal.not-found
cargo run -p kitty-stub -- --fixtures contracts/fixtures --select streamEvents=StreamRefusal.cursor-without-mission
```

(Both keys exist in `examples.json`. No `Problem` example or fixture exists, so a 404 `Problem` cannot be selected; see plan IC-05.)

## Point a host at an installed service

The lookup order (decision `01M50D403EEYQYEPSSMAV732DF`):

1. **The host's configured path.** If it is invalid, the result is `degraded: service-missing` with no fallback.
2. **The `KITTY_MISSION_STATUS_SERVICE` environment variable.** If it is set but invalid, the result is the same, with no fallback.
3. **A PATH search** for the configured binary name (default `mission-status-api`).

```bash
KITTY_MISSION_STATUS_SERVICE=<path to the service binary> <host command>
```

## Verify the frozen surface (SC-004)

```bash
base="$(git merge-base HEAD main)"
git diff --exit-code "$base" -- packages/mission-shell/src/client \
  contracts/fixtures/mission-status.routes.json contracts/fixtures/mission-status.examples.json \
  contracts/fixtures/mission-status.fixtures.json contracts/fixtures/mission-status.changes.json
git diff "$base" -- Cargo.toml | grep -n '^[-+]members' && echo "members changed: FAIL" || echo "members unchanged"
```
