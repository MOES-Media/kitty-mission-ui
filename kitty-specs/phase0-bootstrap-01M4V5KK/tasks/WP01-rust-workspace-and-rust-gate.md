---
work_package_id: WP01
title: 'Rust workspace, toolchain pin and Gate: rust'
dependencies: []
requirement_refs:
- C-004
- C-006
- FR-005
- FR-006
- NFR-001
- NFR-002
- NFR-003
- SC-002
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/
create_intent:
- Cargo.toml
- Cargo.lock
- rust-toolchain.toml
- crates/kitty-core/Cargo.toml
- crates/kitty-core/src/lib.rs
- crates/kitty-core/tests/workspace.rs
- apps/desktop/src-tauri/Cargo.toml
- apps/desktop/src-tauri/src/main.rs
- apps/dashboard/Cargo.toml
- apps/dashboard/src/main.rs
- gates/plants/rust/plant.json
execution_mode: code_change
model: ''
owned_files:
- Cargo.toml
- Cargo.lock
- rust-toolchain.toml
- crates/kitty-core/**
- apps/desktop/src-tauri/**
- apps/dashboard/Cargo.toml
- apps/dashboard/src/**
- .gitignore
- .github/workflows/ci.yml
- gates/plants/rust/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Rust workspace, toolchain pin and Gate: rust (IC-02)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Add a Cargo workspace that builds from a clean checkout (FR-005): the minimal `kitty-core` library and compile-only placeholders for Kitty Desktop and Kitty Dashboard. Wire the new `Gate: rust` into `ci.yml` with its proof leg and three planted defects (FR-006, SC-002), without any network use inside the gate step (NFR-001), within the 8-minute gate budget (NFR-002), and with an exact toolchain pin (NFR-003).

## Context

Read:
- `plan.md`: IC-02, Gates, "Shared-file ownership", Project Structure.
- `research.md`: R-01, R-02, and "Supply-chain controls".
- `reviews/plan.squad.md`: F-08, F-15, F-16, F-20, F-40, F-42, R2-02, R2-03 and R2-04.

Repository facts you will rely on:
- `.github/workflows/ci.yml` has one job per gate, the `proof-leg` matrix (`matrix.gate`, `timeout`, `image`) and `all.needs`.
- `scripts/gate-proof.mjs coverage` requires job ids minus `{proof, proof-leg, all}` to equal the matrix gate list and the `gates/plants/<id>/` directory list.
- Each plant's `ciCommand` must equal the gate's `id: gate` `run:` byte for byte.
- `scripts/check-hygiene.mjs` runs the full `checkWorkflow` (action SHA pins, `permissions`, `persist-credentials: false`, no `continue-on-error`, `upload-artifact` `retention-days: 1`) on `ci.yml`.
- Gate jobs have 5-minute timeouts; `unit-tests` has 8.
- Only the pnpm store is cached ("nothing else is"). Do not add a cargo cache; that is a policy change outside this mission (R-02).

This WP owns `ci.yml`. Other WPs' proof legs gain plants, so this WP sets the starting matrix timeouts now (F-42): contract 6→10, unit-tests 11→16. WP09 re-measures and adjusts them.

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: none. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP01 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T001 Gate baseline on the build base and toolchain pin

**Purpose**: record the green baseline before anything changes, and pin the toolchain exactly (NFR-003, R-01).

**Steps**:
1. Run every TypeScript gate listed under "Gates this work package must pass" on the unchanged build base. For each, record the command, exit code, reporter counts and wall-clock in the hand-off. A red found on the build base is escalated at once (BLOCKED report), never absorbed.
2. Pick the Rust version: the newest stable release that has been out at least 14 days on the day you start (check https://releases.rs or `rustup check`). Record the version and its release date.
3. Create `rust-toolchain.toml`:
   ```toml
   [toolchain]
   channel = "1.NN.P"          # exact version, never "stable"
   components = ["rustfmt", "clippy"]
   profile = "minimal"
   ```
4. Run `rustup toolchain install` from the repository root. With no arguments it installs exactly the pinned toolchain (rustup ≥ 1.28; `rustup show` no longer installs, R2-02). Record the output.

**Files**: `rust-toolchain.toml`. **Validation**: `cargo --version` prints the pinned version inside the repository.

### T002 Cargo workspace, `kitty-core` skeleton and placeholders

**Purpose**: FR-005, C-006 (placeholders only need to build).

**Steps**:
1. Root `Cargo.toml`:
   ```toml
   [workspace]
   resolver = "2"
   members = ["crates/kitty-core", "apps/desktop/src-tauri", "apps/dashboard"]

   [workspace.package]
   edition = "2021"
   license = "AGPL-3.0-or-later"
   publish = false

   [workspace.dependencies]
   # exact pins only ("=x.y.z"); WP07 adds the stub's crates here as a recorded out-of-map edit
   ```
   `crates/kitty-stub` is added to `members` by WP07, not here, because it does not exist yet.
2. `crates/kitty-core`:
   - `Cargo.toml` with `name = "kitty-core"` and `[package]` fields inherited through `*.workspace = true`;
   - `src/lib.rs` holding a crate-level doc comment (purpose: the shared host core, real content in #19) and one documented, tested `pub fn` that returns the crate version from `env!("CARGO_PKG_VERSION")`, so `cargo test` has a real test to run.
   - No external dependencies.
3. `apps/desktop/src-tauri`: a bin crate named `kitty-desktop`, with a `main.rs` that prints nothing and returns. Add **no Tauri dependency** (R-02: Tauri and its webkit system packages arrive with #20).
4. `apps/dashboard`: a bin crate named `kitty-dashboard`, the same kind of placeholder.
5. `cargo generate-lockfile`, then commit `Cargo.lock`.

**Files**: `Cargo.toml`, `Cargo.lock`, `crates/kitty-core/**`, `apps/desktop/src-tauri/{Cargo.toml,src/main.rs}`, `apps/dashboard/{Cargo.toml,src/main.rs}`. **Edge cases**:
- `apps/*` is also a pnpm workspace glob, but these directories have no `package.json`, so pnpm ignores them. Check with `pnpm -r ls --depth -1`.

### T003 Workspace-membership test (F-08)

**Purpose**: make the FR-005 claim "fails if any member is removed" a real check.

**Steps**:
1. Red first: create `crates/kitty-core/tests/workspace.rs`, which runs `cargo metadata --format-version 1 --no-deps --frozen` through `std::process::Command` (`env!("CARGO")`) and parses the JSON with a tiny hand-rolled search, so no new dependency is needed. Assert that the member package names are exactly `{kitty-core, kitty-desktop, kitty-dashboard}` as a set with equality. WP07 extends the expected set with `kitty-stub`; say so in a comment.
2. Run it with `kitty-dashboard` temporarily removed from `members`, record the failing line, then restore.

**Files**: `crates/kitty-core/tests/workspace.rs`. **Validation**: it fails on removal and passes when restored.

### T004 `Gate: rust` in `ci.yml` (F-40, R2-02, NFR-001, NFR-002)

**Steps**:
1. Add job `rust` (`name: 'Gate: rust'`, `needs: preflight`, `runs-on: ubuntu-24.04`, `timeout-minutes: 8`, `permissions: contents: read`). Its steps, in order:
   1. checkout (the same SHA-pinned action, `persist-credentials: false`);
   2. a step named `Install the pinned Rust toolchain` running `rustup toolchain install` (rustup is preinstalled on ubuntu-24.04);
   3. a step named `Fetch locked crates` running `cargo fetch --locked`;
   4. the gate step `id: gate` whose `run:` is exactly:
      ```
      cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
      ```
   No pnpm install is needed in this job. Check whether `checkWorkflow` requires every gate job to run the install action. If it does, report it as a change request to WP08 (the hygiene owner) instead of adding a credentialed install to a job that does not need it.
2. Add `rust` to `all.needs`.
3. Append `rust` to the `proof-leg` `matrix.gate` list (the list `gate-proof coverage` compares with the job ids; A25), add the matrix `include` entry `{ gate: rust, timeout: <computed>, image: '' }`, and in the proof leg add the same two install steps guarded by `if: matrix.gate == 'rust'`, before `Run the gate proof leg`. Use a starting timeout of 20. Measure the leg locally with `node scripts/gate-proof.mjs local --only rust` (the proxy; this WP never pushes) and set (1 + 3 plants) × the measured gate minutes + 2, rounded up, if that exceeds 20 (F-42, A24). Record the local measurement; the orchestrator re-measures on the PR's first CI run (A3).
4. Set the starting matrix timeouts `contract: 10` and `unit-tests: 16` (F-42).
5. The gate step itself must perform no network access: `--frozen` makes cargo fail instead of downloading. Prove it locally: after `cargo fetch --locked`, run the canonical command with `CARGO_NET_OFFLINE=true` and record that it passes. Then run it in a fresh `CARGO_HOME` (`CARGO_HOME=$(mktemp -d) cargo test --workspace --frozen`) without the fetch step, and record that it fails offline. (With no external crates yet this cannot fail; record whatever cargo prints. The falsifiable negative proof, with its positive control, is WP07's exit check 1, B7.)

**Files**: `.github/workflows/ci.yml`. **Validation**: `pnpm hygiene` (the `checkWorkflow` rules) and `node scripts/gate-proof.mjs coverage` both pass.

### T005 The three Rust plants (F-20)

**Purpose**: FR-006 and SC-002 (Rust format, Rust lint and Rust tests each reject a planted defect).

Create `gates/plants/rust/plant.json` as an array of three plants. Each has `gate: "rust"`, `ciCommand` equal to the canonical string above, and an `expectFailPattern` that only that defect produces. Use **anchored `edits` on compiled files** or an auto-discovered `tests/plant_*.rs` file. Never use a new `src/*.rs` file that no `mod` reaches (rustfmt, clippy and the compiler would ignore it, so the leg would fail with "planted run exited 0").

1. **Format**: an `edits` overlay on `crates/kitty-core/src/lib.rs` that inserts a line with broken spacing inside a function, carrying a unique token, for example `let plant_fmt_rust=1 ;` plus a use of it. `expectFailPattern`: `plant_fmt_rust` (rustfmt's diff prints the line).
2. **Clippy**: an `edits` overlay adding `#[allow(dead_code)] fn plant_clippy_rust() -> bool { let x = true; x == true }`. `bool_comparison` is deny-by-warn under `-D warnings`. `expectFailPattern`: `plant_clippy_rust`. It must pass fmt, so format it correctly.
3. **Test**: a `source` overlay creating `crates/kitty-core/tests/plant_test_rust.rs` with `#[test] fn plant_test_rust() { assert_eq!(1, 2, "plant_test_rust"); }`. Integration tests in `tests/` are auto-discovered. `expectFailPattern`: `plant_test_rust`. It must pass fmt and clippy.

Run `node scripts/gate-proof.mjs local --only rust` and record that the clean run is green and each planted run is red with its pattern.

### T006 `.gitignore`, gate timing and exit checks

**Steps**:
1. `.gitignore`: add `/target/` and `apps/desktop/src-tauri/gen/` (the hygiene gate scans every unignored file).
2. Measure the cold Rust gate with `cargo clean`, then the canonical command. Record the local wall-clock as the NFR-002 proxy (label it local). This WP cannot push, so the CI-runner measurement is the orchestrator's check on the mission PR's first CI run (spec NFR-002 verification, A3); WP09 consolidates the local numbers.
3. Run every gate in "Gates this work package must pass", including the Rust gate.

## Test strategy

- The workspace test (T003), the three plants (T005) and `gate-proof coverage`.
- `node scripts/gate-proof.mjs local --only rust` runs here.
- `pnpm visual` does not run.

## Definition of Done

- **Toolchain:** `rust-toolchain.toml` pins an exact version at least 14 days old; its release date is recorded.
- **Build:** the workspace builds from a clean checkout with `cargo build --workspace --locked`. The members test fails when a member is removed, with the revert check recorded.
- **Gate job:** `Gate: rust` is in `ci.yml` with separate toolchain-install and fetch steps. The gate step uses the canonical command, byte-identical to `plant.json`'s `ciCommand`. It is listed in `all.needs` and the proof-leg matrix, and hygiene plus `gate-proof coverage` pass.
- **Plants:** each of the three plants is red on its own pattern, and the clean leg is green.
- **Timeouts and timing:** starting proof-leg timeouts are set (contract 10, unit-tests 16, rust computed). The cold gate time is measured and is ≤ 8 minutes.
- **Scope:** no Tauri dependency, no cargo cache, and nothing under `packages/mission-ui` changed.

## Risks

- **Install step:** `checkWorkflow` may assume every gate job uses the install action. Handle that with a change request to WP08, not with a needless credentialed install.
- **Cold time:** the cold build time on the runner. Keep `kitty-core` dependency-free in this WP.
- **Lockfile churn:** WP07 will add crates to `Cargo.toml` and `Cargo.lock` as recorded out-of-map edits. Keep the `[workspace.dependencies]` section present and commented, so its additions merge cleanly.

## Reviewer guidance

- **Byte-identity:** the gate string must be byte-identical in `ci.yml` and `plant.json` (diff them).
- **No network:** the gate step runs offline (`--frozen`).
- **Plants:** each targets compiled code and goes red for the right reason.
- **Membership test:** it uses equality.
- **Policy:** no cache and no Tauri were added.
- **Hygiene:** `.gitignore` covers `target/`.

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file you do not own is changed ONLY where this prompt says so, as a **recorded out-of-map edit**: you commit it with a plain `git add <path>` and `git commit`, and list it in the hand-off with a one-line rationale. A change you need in a file you do not own, and that this prompt does not name, is a **change request** in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`, `contracts/fixtures/*.json` except `mission-status.changes.json`, `packages/mission-shell/src/generated/elements.d.ts`, and `packages/mission-shell/src/generated/intents.ts` if WP04 generates it) are never edited by hand: regenerate them.

Shared-file owners (from `plan.md`, "Shared-file ownership"):

| File | Owning WP |
|---|---|
| `.github/workflows/ci.yml`, root `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.gitignore`, `gates/plants/rust/**` | WP01 |
| root `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `eslint.no-io.config.mjs`, `eslint.data-driven.config.mjs`, `gates/plants/typecheck/**`, `gates/plants/eslint/**`, `gates/plants/no-io/**`, `gates/plants/stylelint/**`, `stylelint.config.mjs`, `gates/data-driven.selftest.ts` | WP02 |
| `scripts/contract/{generate,check,registry}.mjs` and their tests, `contracts/fixtures/**`, `gates/plants/contract/**` | WP03 |
| `gates/plants/manifest/**`, `scripts/typings.mjs` | WP04 |
| `gates/plants/unit-tests/**` | WP06 |
| `scripts/check-hygiene.mjs`, `scripts/hygiene/**`, `gates/plants/hygiene/**`, `scripts/contract/{common,drift}.mjs` | WP08 |
| `README.md`, `CHANGELOG.md` | WP09 |

**Gates this work package must pass before hand-off.** Each must exit 0, with the reporter's pass count above 0 and fail 0 where a reporter exists. Run them from the lane worktree root, after confirming `git rev-parse --show-toplevel` is that worktree.
- TypeScript and repository gates: `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene && pnpm test:scripts && pnpm test:terminology`, `pnpm contract:check && pnpm test:contract`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm test`, `pnpm build-storybook`.
- From WP01 on, the Rust gate, preceded by its two install steps: `rustup toolchain install` then `cargo fetch --locked`, then exactly:
  ```
  cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
  ```

- `pnpm visual` and `node scripts/gate-proof.mjs local` are run only where this prompt's "Test strategy" says so.
- If a script name differs on the build base, use the name the base provides and say so.

**Red-first rule.** For every behaviour, plant and gate case:
1. Write the failing test, the plant or the negative case FIRST.
2. Run it and see it fail for the right reason. Record the failing line in the hand-off.
3. Only then implement.

Per test file, make one deliberate revert of the behaviour (a temporary local edit, never committed) that produces a named failing test, then restore it. List it in the hand-off as the revert check; the reviewer re-runs two of them.

**Test-quality rules (binding).**
1. Counts are asserted with equality, never "at least". Every loop over fixtures, routes, events or examples asserts it ran the expected N times, so an empty loop fails.
2. Every "absent", "refused" or "no event" assertion is paired with a positive control on the same fixture or target, where the thing IS present, accepted or emitted.
3. A test that compares against an oracle must read the oracle from an independent source (the vendored YAML, `changes.json`, `custom-elements.json`), never from the output under test.
4. Vitest browser-mode tests call `page.viewport` first.
5. Terminology rule: the banned synonym for "mission" (`scripts/terminology.mjs`) never appears in source, tests, fixtures or docs.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept and the pre-merge squad; the orchestrator owns that.
- Commit on your lane branch with a conventional message, for example `feat(mission-shell): ... (#17)`, ending with the attribution trailer the harness gives you.
- Stage owned files and the recorded out-of-map edits only. Never `git add -A`.
- The hand-off lists each commit hash, verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- **No delegation.** No sub-agents or forks; do this work package yourself.
- **No outward actions.** No push, no pull request, no issue comment.
- **No branch mechanics.** Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics. Never `git stash`.
- **Denied means stop.**
  - A DENIED command means stop and report. Never retry it another way.
  - Never pattern-kill processes. Nothing may be left running when you finish: stop every `kitty-stub` or dev server you start.
- **No absolute paths and no usernames** in any committed file (use `<repo>`); run `pnpm hygiene` before committing.
- **Charter boundaries.**
  - No I/O under `packages/*` (fetch, XHR, EventSource, WebSocket, Tauri APIs, storage, `location`, bare `window`). I/O lives only in `apps/*` and `crates/*`.
  - No mission-ui screen, element, story or generated file changes (C-002, SC-005). `git diff --exit-code <base> -- packages/mission-ui` must stay empty.
- **Exact pins.** Every new npm or Cargo dependency is pinned exactly: `x.y.z` in `package.json`, `=x.y.z` in `Cargo.toml` (NFR-003).
- **Supply-chain evidence.** Every new dependency gets the DIRECTIVE_051 evidence in the hand-off (see `research.md`, "Supply-chain controls").
- **Orchestrator-owned files.** Files under `kitty-specs/` belong to the orchestrator. Report decisions and friction in the hand-off and write nothing there.
- **No mission-state mutation.** Do not run `spec-kitty` commands that change mission state; the orchestrator moves tasks.

## Hand-off checklist (the report you write when you move to review)

1. **Commits:** each hash, verified with `git cat-file -t <hash>` (report the output), in the order made, with its one-line subject.
2. **Gates:** for every gate above, the command, its exit code and the reporter's pass count. A gate you did not run is listed, with the reason.
3. **Red-first evidence:** the failing line for every red-first test or plant, and the revert check per test file.
4. **Edits outside the owned files:** each out-of-map edit with a one-line rationale, and each change request.
5. **Supply chain:** evidence for any dependency added (S-1 to S-5).
6. **Measurements** this prompt asks for (timings, counts).
