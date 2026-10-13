# Research: Phase 0 bootstrap

Sources:
- epic #16 and issue #17;
- the repository at `main` 9c9d83c: `.github/workflows/ci.yml`, `gates/plants/*`, `scripts/check-hygiene.mjs`, `scripts/contract/*`, `packages/mission-ui/{package.json, custom-elements.json, vitest.config.ts}`, `pnpm-workspace.yaml`;
- the vendored contract `contracts/spec-kitty/mission-status` at pin `805e122`;
- the Svelte 5.57.2 source (`internal/client/dom/elements/attributes.js`, `set_custom_element_data`);
- the plan-phase squad record (`reviews/plan.squad.md`).

Each entry gives the Decision, the Rationale, and the Alternatives considered.

## R-01 — Version pins

- **Decision**: pin everything exactly.
  - **Rust toolchain**: pinned in `rust-toolchain.toml` to the newest stable release at least 14 days old when the WP starts, with the `rustfmt` and `clippy` components.
  - **npm**: additions pinned exactly in `package.json`. For each package, use the newest version that is at least 14 days old **and whose peer ranges the existing pins satisfy**. For example, `@sveltejs/vite-plugin-svelte` must come from the line whose `vite` peer range includes the pinned vite 7.3.6, not the newest line, which needs vite 8 (F-37).
  - **Cargo**: dependencies declared once in `[workspace.dependencies]` with exact requirements (`=x.y.z`); members use `workspace = true`. The new `scripts/cargo-pins.mjs` check, run by the hygiene gate, rejects any Cargo requirement that is not `=x.y.z` (F-09).
  - **Vitest**: stays at 4.1.11 (`checkVitestFamily`).
- **Rationale**: NFR-003. `checkPackageJson` already rejects npm ranges. A Cargo requirement like `"0.8"` is a caret range, and `Cargo.lock` only fixes the resolution, not the declaration.
- **Alternatives**:
  - `channel = "stable"`, rejected because it floats.
  - Relying on `Cargo.lock` alone, rejected because the declared ranges would still violate NFR-003.

## R-02 — `Gate: rust` without a cache

- **Decision**: one gate job, `rust`, on ubuntu-24.04 (rustup is preinstalled).
  - **Step 1**: `rustup show`. It installs the toolchain pinned in `rust-toolchain.toml`.
  - **Step 2**: `cargo fetch --locked`. It downloads the locked crates.
  - **Step 3**, the gate step: exactly `cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen`. Because of `--frozen`, the gate step itself contacts no network (NFR-001).
  - The proof leg runs the same two preparation steps when `matrix.gate == 'rust'`.
  - The timeout is 8 minutes, the `unit-tests` tier (`storybook-build` is 5).
  - No cargo cache: "only the pnpm store is cached" stays true.
- **Rationale**:
  - The M1 dependency set (axum, tokio, serde) builds cold in about 1 to 2 minutes on a standard runner, and clippy and test share most artefacts.
  - The desktop placeholder has **no Tauri dependency** in M1. That avoids the webkit2gtk system packages and the long cold build, which arrive with #20 together with a cache-policy decision.
  - The proof-leg timeout follows the plan's rule: (1 + plants) × the measured gate time + 2 minutes.
- **Alternatives**:
  - A cargo cache, rejected as a policy change outside this mission.
  - Three separate gates, rejected: one toolchain is one concern, and several plants per gate follow the `no-io` precedent.
  - Downloading inside the gate step, rejected by NFR-001 (squad F-40).

## R-03 — The source of the route list

- **Decision**: `generate.mjs` derives `routes.json` from the `paths:` of `openapi.yaml`, resolving each path file's operations to `{ operationId, method, path, responseSchema, kind, defaultExample }`.
  - `defaultExample` comes from a reviewed `DEFAULT_EXAMPLES` map in the generator, which pairs each response schema with an example name.
  - A response schema with no map entry fails generation, unless the map marks it `null` explicitly.
- **Rationale**:
  - `scripts/contract/registry.mjs` is a **fixture** registry, not an operation list.
  - Several schemas have more than one example (WorkPackage ×10, OpsInvocation ×9, Project ×3), so "the vendored example" must be an explicit, reviewable choice (F-04).
- **Alternatives**:
  - A hand-maintained route list, rejected because it can drift from the contract.
  - Choosing the alphabetically first example, rejected because it is arbitrary and changes silently when examples are renamed.

## R-04 — No-io and lint over Svelte

- **Decision**:
  - Add `eslint-plugin-svelte` and `svelte-eslint-parser` to `eslint.config.mjs` and `eslint.no-io.config.mjs`.
  - Extend the no-io file globs to `packages/*/src/**/*.svelte`, and apply the existing banned-identifier rules inside `<script>` blocks.
  - The no-io plant's `expectFailPattern` matches the no-io rule's message, not the file name, so a parser failure cannot satisfy it (F-19).
  - The terminology scan adds `.svelte` sources and `crates/**/*.rs` (F-48).
- **Rationale**: FR-007 and C-001. Without the parser, ESLint skips `.svelte` files and the gate passes vacuously.
- **Alternatives**: forbidding `<script>` logic in `.svelte` files, rejected as too restrictive for #18.

## R-05 — Element typings

- **Decision**: a repository-owned generator, `scripts/typings.mjs`, reads `packages/mission-ui/custom-elements.json` and writes `packages/mission-shell/src/generated/elements.d.ts`.
  - The output is a `svelteHTML` intrinsic-elements declaration for all 15 elements: their declared properties, and `on<event>` handlers typed with the detail types imported from `@moes-media/mission-ui`.
  - `--check` regenerates in memory and fails on any difference. It runs inside `pnpm manifest:check`.
  - The output contains no `any`. Its exact path gets a lint exception recorded in the PR, as E-05 does for `types.generated.ts`.
  - **Event typing proof (F-02)**: the WP first proves whether svelte-check rejects an unknown hyphenated `on…` attribute on a typed custom element. If it does not, the generator also emits a typed `intents` Svelte action, keyed per element by its manifest events (`use:intents={{ 'sk-open-mission': handler }}`), and the harness binds intents through it. Either way, the typecheck plant that renames an intent handler must fail.
- **Rationale**:
  - FR-004. Svelte types element attributes through `svelteHTML` / `svelte/elements`, not `HTMLElementTagNameMap`, which all 15 elements already declare. Without generation, svelte-check knows nothing about these elements' properties and events.
  - Owning the generator removes a high-risk dependency (F-30: `@wc-toolkit/svelte-types` has one maintainer, is a few weeks old, and has a dependency published the day before review), and lets the output meet the lint rules.
- **Alternatives**:
  - `@wc-toolkit/svelte-types`, rejected (F-30).
  - Hand-written typings, rejected because they drift.
  - Svelte runtime prop checking, rejected because it is not static.

## R-06 — The binding mechanism (Svelte 5 + Lit)

- **Decision**:
  - The harness imports `@moes-media/mission-ui` for its side effect (element registration) **before** mounting.
  - Data is passed as Svelte props on the custom element.
  - Intents are bound with `on<event-name>` attributes, or with the typed `intents` action (R-05).
  - The test runs in Vitest browser mode (Chromium).
  - **What the test must assert (F-01)**: Svelte 5.57.2's `set_custom_element_data` sets *objects and arrays* as properties even on an unregistered element; only primitives fall back to `setAttribute`. A list-only assertion therefore cannot detect a mount-before-registration defect. The test asserts that a **boolean `false`** (for example `loadingMore`) and the `status` string arrive as properties with the passed values. Unregistered, the boolean becomes the attribute `"false"`, which Lit's boolean converter reads as `true`.
  - **The registration-order plant** moves the side-effect import after mount, and the test must fail.
  - **SC-001 (F-11)**: the test enumerates every event the hosted screen declares in `custom-elements.json`. It triggers one through real UI (a row click), dispatches the others from the element, and requires each to reach its handler with its detail. An intent-path plant breaks one binding.
- **Rationale**: FR-001 to FR-003 and the operator ruling `01M4V5KZP24BZS81CX5RD21NMG` (a permanent check).
- **Alternatives**: a Svelte Storybook, rejected as a second Storybook framework for a single harness.

## R-07 — The stub's security posture

- **Decision**: the stub applies the same request rules as the upstream service (spec-kitty #5529's service README), so there is no charter exemption (F-32).
  - It binds `127.0.0.1` only. The test runs the real binary and asserts the announced address (F-31).
  - Host must be exactly `127.0.0.1:<port>` or `localhost:<port>`; anything else gets 403.
  - Origin, when present, must equal the stub's own origin; anything else gets 403.
  - Any `Forwarded` or `X-Forwarded-*` header gets 403.
  - It serves `GET` only.
  - No request value (path parameter, query, header) is ever used to build a filesystem path. Fixtures are loaded once at start from `--fixtures` (F-38).
  - `publish = false` in its `Cargo.toml`. Release workflows (#20, #21) build only their own crates.
- **Rationale**:
  - The charter requires every host server to bind loopback and enforce Host and Origin, with no exemption clause.
  - Mirroring the upstream rules also makes the stub a faithful target for #21's proxy tests: the proxy must strip `Forwarded` and `X-Forwarded-*` or get 403, as from the real service.
- **Alternatives**: an exemption recorded in the PR, rejected because the checks are cheap, and an exemption would make the stub a less faithful stand-in.

## R-08 — Upstream drift alert

- **Decision**:
  - The compare-with-pin logic (hash every file under `contracts/mission-status` and `contracts/_shared`, then compare with `PIN.json`) is extracted into `scripts/contract/common.mjs` as one function, importing only Node built-ins. `verify-remote.mjs` and the new `drift.mjs` both use it (F-23).
  - `drift.mjs` fetches upstream `main` with Node's built-in `fetch`. The fetcher is injectable, and `drift.test.mjs` uses local trees for the four outcomes.
  - Exit codes: 0 in sync, 1 drift (files listed), 2 upstream unreachable, 3 any other error.
  - `.github/workflows/contract-drift.yml` runs it on a daily `schedule` and on `workflow_dispatch`:
    - the job name does not start with "Gate:";
    - `permissions: contents: read`;
    - `actions/checkout` is SHA-pinned with `persist-credentials: false`;
    - there is **no dependency install and no secrets**: it runs `node scripts/contract/drift.mjs` directly (F-41);
    - no upstream data is interpolated into `run:`;
    - the summary is written through `$GITHUB_STEP_SUMMARY` from a file;
    - the job fails on exit 1 to 3, so GitHub notifies (F-33, F-39).
  - Hygiene now applies its action-pin, permissions and checkout-credential checks to every workflow file, not only `ci.yml`. The gate-structure checks stay `ci.yml`-only (F-27).
  - The README documents that GitHub disables scheduled workflows in public repositories after 60 days without activity.
- **Rationale**: FR-012 and NFR-001. Reuse keeps one comparison (C-003). Least privilege: no token and no private-registry access.
- **Alternatives**:
  - Running the check in PR CI, rejected (merge gates stay offline).
  - Opening an issue automatically on drift, deferred: it needs `issues: write`; revisit if a red scheduled run is ever missed.

## Supply-chain controls (DIRECTIVE_051)

New npm packages: `svelte`, `@sveltejs/vite-plugin-svelte`, `svelte-check`, `eslint-plugin-svelte`, `svelte-eslint-parser`. There is no typings-generator dependency (F-30).

New crates: `axum`, `tokio`, `serde`, `serde_json`, plus the test-only `tower` and `http-body-util`. Tool, not dependency: `cargo-audit`, used once on a developer machine.

| Control | npm (pnpm 11) | Cargo |
|---|---|---|
| S-1 Registry authenticity | public npmjs for these packages; `.npmrc` routes only the `@spec-kitty` scope to GitHub Packages. The WP records each package's maintainers and provenance. | crates.io only; no `[patch]`, git or path dependencies outside the workspace |
| S-2 Freshness | direct packages: at least 14 days old, first-publish and latest-publish dates recorded in the WP (R-01). Transitive packages: the WP records every new `pnpm-lock.yaml` entry with its publish date. **Deferred with rationale (F-29)**: a repository-wide `minimumReleaseAge` would also hold back the private `@spec-kitty/*` release candidates and is a policy change; a follow-up issue proposes it with an `@spec-kitty` exclusion. | direct crates: at least 14 days old, dates recorded. Transitive: the WP records every new `Cargo.lock` entry with its crates.io publish date. Cargo has no age gate (covered by the same follow-up). |
| S-3 Lifecycle scripts | pnpm 11 denies build scripts by default; `pnpm-workspace.yaml` `allowBuilds` keeps its two existing entries, and any new entry needs a written justification | no allowlist exists. The WP lists every crate with a `build.rs` or that is a proc-macro, **from `cargo metadata`** (not a predicted list), and justifies each (F-34) |
| S-4 Lockfile installs | `pnpm-lock.yaml` committed; CI installs frozen | `Cargo.lock` committed; CI runs `cargo fetch --locked` and then `--frozen` (R-02) |
| S-5 Incident and IoC posture | `pnpm audit` at implementation time (online, developer machine), with the result recorded | `cargo install --locked cargo-audit@=<exact>` once on a developer machine; `cargo audit` result and the tool version recorded. Not in CI (F-35) |

Adversarial challenge: the plan-phase squad (`reviews/plan.squad.md`, lens R3) recorded a disposition for every contested finding (F-27 to F-39).
