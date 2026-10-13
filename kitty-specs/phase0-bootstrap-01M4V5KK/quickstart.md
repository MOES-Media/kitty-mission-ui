# Quickstart: Phase 0 bootstrap

Prerequisites:
- Node 22.22.2 and pnpm 11.18.0;
- rustup, which installs the version pinned in `rust-toolchain.toml` on first use;
- the `read:packages` token in your user-level `~/.npmrc` (see the README).

```bash
pnpm install
rustup toolchain install                   # installs the toolchain pinned in rust-toolchain.toml
cargo fetch --locked
cargo build --workspace --locked           # all crates, including the placeholders (as WP01's DoD)

# the shell: types, lint, binding check
pnpm --filter @moes-media/mission-shell typecheck   # svelte-check
pnpm --filter @moes-media/mission-shell test        # binding, port coverage, fixture client (Chromium)

# shared data
pnpm contract:generate      # regenerates contracts/fixtures/*.json (and mission-ui's .ts as before)
pnpm contract:check         # Gate: contract, offline

# the stub
cargo run -p kitty-stub -- --fixtures contracts/fixtures --port 0
#   prints: listening 127.0.0.1:<port>
curl -s http://127.0.0.1:<port>/api/v1/project
curl -s -H 'X-Kitty-Stub-Example: Project.<name>' http://127.0.0.1:<port>/api/v1/project
curl -sN http://127.0.0.1:<port>/api/v1/events    # scripted sequence, then heartbeats
curl -s http://127.0.0.1:<port>/__stub/last-request

# typings after a mission-ui manifest change
node scripts/typings.mjs && pnpm manifest:check

# upstream drift (network; not a gate; no install needed)
node scripts/contract/drift.mjs   # 0 in sync, 1 drift (files listed), 2 unreachable, 3 other error

# a quick local subset (CI runs every gate in plan.md's Gates section; the Rust line is the canonical gate string)
pnpm typecheck && pnpm lint && pnpm lint:no-io && pnpm test && pnpm manifest:check && pnpm contract:check && pnpm hygiene
cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
```
