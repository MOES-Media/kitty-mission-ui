# Research: Phase 0 bootstrap

Sources:
- epic #16 and issue #17;
- the repository at `main` 9c9d83c: `.github/workflows/ci.yml`, `gates/plants/*`, `scripts/contract/*`, `packages/mission-ui/{custom-elements.json, vitest.config.ts}`, `pnpm-workspace.yaml`;
- the vendored contract `contracts/spec-kitty/mission-status` at pin `805e122`;
- Svelte 5 compiler source and Tauri v2 documentation, as summarised in the pre-mission research for #16.

Each entry gives the Decision, the Rationale, and the Alternatives considered.

## R-01 — Version pins

- **Decision**: pin everything exactly.
  - The Rust toolchain is pinned in `rust-toolchain.toml` to the newest stable release at least 14 days old when the WP starts, with the `rustfmt` and `clippy` components.
  - npm additions are pinned exactly in `package.json`. Svelte 5 uses the newest 5.x patch at least 14 days old.
  - Vitest stays at 4.1.11. The repository's `checkVitestFamily` rule requires one Vitest version.
- **Rationale**: NFR-003. The hygiene rule `checkPackageJson` already rejects ranges, and the 14-day age is the supply-chain freshness control (S-2).
- **Alternatives**: `channel = "stable"`, rejected because it floats; versions fixed in this plan, rejected because they would be stale by implementation time and the WP records the resolved versions.

## R-02 — `Gate: rust` without a cache

- **Decision**: one gate job, `rust`, on ubuntu-24.04:
  - It uses the preinstalled rustup, and `rust-toolchain.toml` triggers the pinned install.
  - It runs `cargo fmt --check`, then `cargo clippy --workspace --all-targets --locked -- -D warnings`, then `cargo test --workspace --locked`.
  - The timeout is 8 minutes (the `storybook-build` tier).
  - There is no cargo cache. The workflow comment "only the pnpm store is cached" stays true.
- **Rationale**:
  - The M1 dependency set (axum, tokio, serde) builds cold in about 1 to 2 minutes on a standard runner. Clippy and test share most artefacts.
  - The desktop placeholder has **no Tauri dependency** in M1. That avoids the webkit2gtk system packages and the long cold build, which arrive with #20 together with a cache-policy decision.
  - The proof leg runs three plants, each a full gate run. Its matrix timeout is set separately (the proof legs already use 4 to 60 minutes).
- **Alternatives**:
  - A cargo cache, rejected as a policy change outside this mission.
  - Three separate gates (fmt, clippy, test), rejected: one toolchain is one concern, and three plants in one gate follow the existing `no-io` pattern (several plants per gate).

## R-03 — The source of the route list

- **Decision**: `generate.mjs` derives `mission-status.routes.json` from the `paths:` of `openapi.yaml`, resolving each path file's operations to `{ operationId, method, path, responseSchema }`. It does not use `scripts/contract/registry.mjs`.
- **Rationale**: the registry is a **fixture** registry (fixture name → schema, kind), not an operation list. Only the contract's own paths can tell the coverage test (FR-009) which reads exist.
- **Alternatives**: a hand-maintained route list, rejected because it can drift from the contract, and drift is exactly what FR-009 guards against.

## R-04 — No-io and lint over Svelte

- **Decision**:
  - Add `eslint-plugin-svelte` and its parser to `eslint.config.mjs` and `eslint.no-io.config.mjs`.
  - Extend the no-io file globs to `packages/*/src/**/*.svelte`, and apply the existing banned-identifier rules (fetch, EventSource, WebSocket, `__TAURI__`, storage, `location`, bare `window`) inside `<script>` blocks.
  - The shell's `.ts` files are already in scope through `packages/*/src`.
- **Rationale**: FR-007 and C-001. Without the Svelte parser, ESLint skips `.svelte` files, so the gate would pass vacuously. The planted `fetch` in a `.svelte` file is the non-vacuity proof.
- **Alternatives**: forbidding `<script>` logic in `.svelte` files, rejected as too restrictive for #18.

## R-05 — Element typings

- **Decision**:
  - Generate `packages/mission-shell/src/generated/elements.d.ts` from `packages/mission-ui/custom-elements.json` with `@wc-toolkit/svelte-types`.
  - Event detail types are imported from `@moes-media/mission-ui` (its `src/index.ts` exports them), not emitted as text.
  - `scripts/typings.mjs --check` regenerates the file in memory and fails on any difference. It runs inside `pnpm manifest:check`, because the typings are derived from the manifest.
- **Rationale**: FR-004. `HTMLElementTagNameMap` declares only some elements (ops, sample, board, drift). Generating from the manifest covers all 15.
- **Alternatives**: hand-written typings, rejected because they drift; Svelte's runtime prop checking, rejected because it is not static.

## R-06 — The binding mechanism (Svelte 5 + Lit)

- **Decision**:
  - The harness imports `@moes-media/mission-ui` for its side effect (element registration) **before** mounting.
  - Data is passed as Svelte props on the custom element. Svelte 5 sets a property when the element defines that property at mount time, which is why registration must come first.
  - Intents are bound with `on<event-name>` attributes (for example `onsk-open-mission`). The Svelte 5 compiler treats any attribute starting with `on` as an event listener, with the name taken as everything after `on`, case-sensitively.
  - The test runs in Vitest browser mode (Chromium), as mission-ui's tests do.
- **Rationale**: FR-001 to FR-003. Pre-mission research confirmed the hyphenated-event path from the compiler source. The permanent test turns that finding into a guard (operator ruling `01M4V5KZP24BZS81CX5RD21NMG`).
- **Alternatives**: a `use:` action calling `addEventListener`, kept as the fallback if a Svelte upgrade changes event handling (the permanent test would expose that); a Svelte Storybook, rejected as a second Storybook framework for a single harness.

## R-07 — The stub's security posture

- **Decision**:
  - `kitty-stub` binds `127.0.0.1` only (asserted by a test). It serves `GET` only, and fixtures only.
  - It does **not** implement Host or Origin checks.
  - It is never shipped in a release artefact.
- **Rationale**: the charter's Host/Origin rule covers host servers that ship (the dashboard, #21). The stub is a development and test fixture with no real data. Recording this keeps the exemption visible instead of implicit.
- **Alternatives**: copying the dashboard's checks into the stub, rejected because it would duplicate security code that has its own tests in #21.

## R-08 — Upstream drift alert

- **Decision**:
  - `scripts/contract/drift.mjs` fetches upstream `main` (`contracts/mission-status` and `contracts/_shared`) with the same mechanism `verify-remote.mjs` uses, hashes every file with `common.mjs` helpers, and compares the hashes with `PIN.json`.
  - Exit codes: 0 = no drift, 1 = drift (files listed), 2 = upstream unreachable.
  - `.github/workflows/contract-drift.yml` runs it on a daily `schedule` and on `workflow_dispatch`, with a job name that does not start with "Gate:", and writes the result to the job summary.
- **Rationale**: FR-012 and NFR-001. Reusing the existing modules satisfies C-003, and "unreachable" is distinct from "no drift" (an edge case in the spec).
- **Alternatives**: running the check in PR CI, rejected because merge gates must not depend on the network.

## Supply-chain controls (DIRECTIVE_051)

New npm packages: `svelte`, `@sveltejs/vite-plugin-svelte`, `svelte-check`, `eslint-plugin-svelte`, `@wc-toolkit/svelte-types`. New crates: `axum`, `tokio`, `serde`, `serde_json`, plus the test-only `tower` and `http-body-util`.

| Control | npm (pnpm 11) | Cargo |
|---|---|---|
| S-1 Registry authenticity | public npmjs for these packages; `.npmrc` routes only the `@spec-kitty` scope to GitHub Packages | crates.io only; no `[patch]`, git or path dependencies outside the workspace |
| S-2 Freshness | the WP records first-publish and latest-publish dates per package; a version at least 14 days old is required (R-01) | the same, from the crates.io API, recorded in the WP |
| S-3 Lifecycle scripts | pnpm 11 denies build scripts by default; `pnpm-workspace.yaml` `allowBuilds` keeps its existing two entries, and any new entry needs a written justification | Cargo has no allowlist. The WP lists every crate with a `build.rs` or proc-macro from `cargo tree` and justifies each (expected: `proc-macro2`, `serde_derive` and the tokio macros) |
| S-4 Lockfile installs | `pnpm-lock.yaml` committed; CI already installs frozen | `Cargo.lock` committed; every CI cargo command uses `--locked` |
| S-5 Incident and IoC posture | the WP checks each new package against the current advisory feed (`pnpm audit` at implementation time, recorded) | `cargo audit` run once at implementation time and its result recorded; continuous advisories wait for #20's cache and policy decision |

Adversarial challenge of these decisions: the plan-phase squad (`reviews/plan.squad.md`), lens R3, records the disposition of every contested finding.
