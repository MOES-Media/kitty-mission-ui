---
work_package_id: WP01
title: Dependencies, exact pins and the proven lock
dependencies: []
requirement_refs:
- NFR-002
- NFR-007
- C-002
- SC-004
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- Cargo.toml
- Cargo.lock
- crates/kitty-core/Cargo.toml
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Dependencies, exact pins and the proven lock (IC-01)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Give `crates/kitty-core` its real dependencies with exact, aged `=x.y.z` pins and dated comments, and prove that `Cargo.lock` gains exactly the 14 entries recorded in `research.md` R-07. This WP adds no Rust code beyond what the manifest needs to build.

## Context

Read:
- `plan.md`: Technical Context, IC-01, "Supply chain";
- `research.md`: R-01, R-04, R-05 and R-07 (the 14-entry table and the resolution notes);
- `reviews/plan.squad.md`: R3-10, R3-12, R4-10, FS-01, R6-03.

Facts:
- **Current workspace pins** (root `Cargo.toml`, `[workspace.dependencies]`):
  - `axum =0.8.9`, `tokio =1.53.1`, `serde =1.0.229`, `serde_json =1.0.151` (`preserve_order`);
  - `http-body-util =0.1.5`, `tower =0.5.3`, `hyper =1.11.1`, `hyper-util =0.1.21`.
- **Already locked.** `percent-encoding 2.3.2` and `libc 0.2.189` are in `Cargo.lock` today.
- **No `[[bin]]` stanza here.** It is added by WP08 together with its file (R6-03). A stanza pointing at a missing file breaks the build.
- **No workspace pin is bumped.** Every new crate's minimum of a shared crate is already met.
- **Members are frozen.** The workspace `members` list does not change (C-002); `crates/kitty-core/tests/workspace.rs` asserts it and is never edited.

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** none. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP01 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T001: Workspace pins with dated comments

**Purpose**: declare the four newly direct crates once, exactly, at the workspace level (NFR-002, R3-12).

**Steps**:
1. In root `Cargo.toml` `[workspace.dependencies]`, add:
   ```toml
   yaml_serde = "=0.10.7"          # published 2026-08-18
   sha2 = "=0.10.9"                # published 2025-04-30
   percent-encoding = "=2.3.2"     # published <date from the crates.io API>
   libc = "=0.2.189"               # published <date from the crates.io API>
   ```
2. Look up the two missing dates through the crates.io API (`/api/v1/crates/<name>/<version>`, `created_at`, a read-only metadata request). Each must be at least 14 days before the WP start date.
3. Do not touch `[workspace] members`, and do not change the version of any existing pin.

**Files**: root `Cargo.toml` (+4 lines).
**Validation**: `pnpm hygiene` passes; `cargo-pins` rejects any requirement that is not `=x.y.z`.

### Subtask T002: kitty-core manifest

**Purpose**: wire kitty-core to the pinned crates with member-level options only.

**Steps**:
1. Write `crates/kitty-core/Cargo.toml`:
   ```toml
   [dependencies]
   hyper = { workspace = true, features = ["client", "http1"] }
   hyper-util = { workspace = true, features = ["tokio"] }
   http-body-util = { workspace = true }
   tokio = { workspace = true, features = ["process", "io-util", "sync"] }
   serde = { workspace = true }
   serde_json = { workspace = true }
   percent-encoding = { workspace = true }
   yaml_serde = { workspace = true }
   sha2 = { workspace = true }

   [target.'cfg(unix)'.dependencies]
   libc = { workspace = true }

   [dev-dependencies]
   kitty-stub = { path = "../kitty-stub" }
   ```
2. **No `tokio/test-util`.** Nothing uses `pause` (R1-08).
3. **No `[[bin]]`.** WP08 adds it (R6-03).
4. **The dev-dependency on kitty-stub** is listed here so the lock edge exists from the start. It is the edge `kitty-core` → `kitty-stub` that WP04 requests (FS-01). Cargo accepts the later mutual edge from WP09 (verified at plan time).

**Files**: `crates/kitty-core/Cargo.toml`.
**Validation**: `cargo check -p kitty-core --all-targets --offline` succeeds.

### Subtask T003: Resolve and prove the lock

**Purpose**: `Cargo.lock` gains exactly the 14 entries of R-07, at the recorded versions (R3-10, R4-10, FS-01).

**Steps**:
1. Run `cargo update -w` (or let `cargo check` resolve). Then pin each entry that online resolution would pick differently:
   ```
   cargo update -p want --precise 0.3.1
   cargo update -p cfg-if --precise 1.0.4
   cargo update -p generic-array --precise 0.14.7
   ```
   (`want 0.3.2`, published 2026-10-05, is younger than 14 days.)
2. Diff the `[[package]]` set against the base. The **added packages** must be exactly these 14:
   - `yaml_serde 0.10.7`, `libyaml-rs 0.3.0`, `ryu 1.0.23`;
   - `sha2 0.10.9`, `digest 0.10.7`, `block-buffer 0.10.4`, `crypto-common 0.1.7`, `generic-array 0.14.7`, `typenum 1.20.1`, `version_check 0.9.5`, `cpufeatures 0.2.17`, `cfg-if 1.0.4`;
   - `want 0.3.1`, `try-lock 0.2.5`.

   Every one must come from `registry+https://github.com/rust-lang/crates.io-index`.
3. **Expected non-package changes.** The `dependencies` lists of existing entries change: `kitty-core` gains its new dependencies and the `kitty-stub` dev-edge, and `hyper` gains `want`. These edges are **excluded** from the 14-entry comparison (FS-01). Record them separately.
4. **No other entry changes version.** Record the `git diff --stat Cargo.lock`.

**Files**: `Cargo.lock`.
**Validation**: a small script (scratch, not committed) prints the added-package set, which equals the table.

### Subtask T004: Supply-chain evidence (DIRECTIVE_051)

**Purpose**: the S-1 to S-5 evidence for the new entries.

**Steps**:
1. **Build scripts and procedural macros.** List them from `cargo metadata --format-version 1 --offline` (target kinds `custom-build`, `proc-macro`) for the new entries. Expected: `generic-array` has `custom-build`; there is no new procedural macro. Read `generic-array`'s `build.rs` and record that it only probes `rustc` through `version_check`.
2. **Shared minimums.** Run `cargo tree -i serde`, `-i indexmap` and `-i itoa` to show that no shared minimum rose, so no workspace pin is bumped.
3. **Owners.** Record the owners and repository of each new crate from crates.io (`yaml_serde` and `libyaml-rs`: one owner, `ingydotnet`; `libyaml-rs` is a c2rust translation; see R-07).
4. **Audit.** Run `cargo install --locked cargo-audit@=<exact>` once on the developer machine, then `cargo audit`. Record the tool version and the output. This is not added to CI.

**Files**: none (the evidence goes in the hand-off).
**Validation**: the evidence table in the hand-off covers all 14 entries.

## Plants

None. Exact-pin enforcement is the existing `cargo-pins` hygiene check.

## Exit checks

1. `cargo check -p kitty-core --all-targets --offline` succeeds with the pinned toolchain 1.98.1.
2. The added-package set of `Cargo.lock` equals the 14 entries of R-07, as names and versions, and each comes from crates.io.
3. `pnpm hygiene` passes (`cargo-pins`).
4. The Rust gate passes. kitty-core still has only its skeleton, so the three existing rust plants' anchors in `crates/kitty-core/src/lib.rs` are untouched.
5. Record the `cargo check` wall time.

## Definition of Done

- The four pins are `=x.y.z` in `[workspace.dependencies]`, each with a `# published YYYY-MM-DD` comment.
- The kitty-core manifest has the member-level options, the `cfg(unix)` libc dependency and the kitty-stub dev-dependency. It has no `[[bin]]` and no `test-util`.
- `Cargo.lock` gains exactly the 14 packages, with the expected `dependencies`-list edges recorded.
- The S-1 to S-5 evidence is in the hand-off.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **Online resolution drifts.** Use `--precise`, and re-check the full added set rather than only the three named entries.
- **A clean cargo home has no cache.** Fetching is allowed in this WP (it adds dependencies), but every fetched crate must be one of the 14.

## Reviewer Guidance

- Re-derive the added-package set from the lock yourself.
- Check each date comment against crates.io.
- Confirm `members` is byte-identical to the base.

## Owned files, out-of-map edits, gates, red-first, commit rule

**Owned files.** The frontmatter `owned_files` is authoritative, and `lanes.json` `write_scope` is computed from it by the tool. Neither is hand-edited. Stage only owned files and the recorded out-of-map edits below.

**Recorded out-of-map edits** (each one is committed with a plain `git add <path>`, and listed in the hand-off with a one-line rationale):
- None. Every edit stays inside `owned_files`.

A change you need in a file you do not own, and that this list does not name, is a **change request** in the hand-off (file, change, reason). It is not an edit.

Shared-file owners (`plan.md`, "Shared-file ownership"):

| File | Owning WP |
|---|---|
| root `Cargo.toml` (`[workspace.dependencies]`), `Cargo.lock`, `crates/kitty-core/Cargo.toml` | WP01 |
| `scripts/contract/{generate,check}.mjs`, `scripts/contract/{check,bundle}.test.mjs`, `contracts/fixtures/mission-status.openapi.json`, `.gitattributes`, `gates/plants/contract/**` | WP02 |
| `crates/kitty-stub/Cargo.toml`, `crates/kitty-stub/src/**`, `crates/kitty-stub/tests/{openapi,select,upstream_flags}.rs` | WP03 |
| `crates/kitty-core/src/{lib,routes,endpoint,client,forward}.rs`, `crates/kitty-core/tests/common/**`, `crates/kitty-core/tests/reads.rs` | WP04 |
| `crates/kitty-core/src/sse.rs`, `crates/kitty-core/tests/{stream,latency}.rs` | WP05 |
| `crates/kitty-core/src/contract.rs`, `crates/kitty-core/tests/contract_check.rs` | WP06 |
| `crates/kitty-core/src/discovery.rs`, `crates/kitty-core/tests/discovery.rs` | WP07 |
| `crates/kitty-core/src/supervisor/**`, `crates/kitty-core/src/bin/**` (WP09 adds the `host` arm as a recorded out-of-map edit), `crates/kitty-core/tests/supervision.rs` | WP08 |
| `crates/kitty-core/src/{facade,status}.rs`, `crates/kitty-core/tests/{status_mapping,panic_probe,host_exit}.rs`, `crates/kitty-stub/tests/supervised.rs` | WP09 |
| `README.md`, `CHANGELOG.md`, `.github/workflows/ci.yml` | WP10 |
| `gates/plants/rust/**`, `crates/kitty-core/tests/workspace.rs`, `scripts/hygiene/gitattributes.test.mjs`, `packages/**`, the four #17 files in `contracts/fixtures/` | nobody: never touched by this mission |

**Gates this work package must pass before hand-off.** Each must exit 0. Run them from the lane worktree root, after confirming that `git rev-parse --show-toplevel` is that worktree.

- **The Rust gate.** Run the two install steps first, then the canonical string, unchanged, under `heavy` (memory safety; A11):
  ```
  rustup toolchain install && cargo fetch --locked
  heavy bash -c 'cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen'
  ```
- **The contract gate** (canonical string, under `heavy`): `heavy bash -c 'pnpm contract:check && pnpm test:contract'`.
- **Hygiene and terminology:** `pnpm hygiene && pnpm test:scripts && pnpm test:terminology`. The terminology rule scans every `.rs` file under `crates/*/src` and `crates/*/tests`. The banned synonym for "mission" must not appear in any of them, not even in a `cfg(...)` attribute or a comment.

- **Memory safety.** Wrap every gate-proof leg and every full test run in `heavy` (for example `heavy node scripts/gate-proof.mjs local --only contract`), and run it in the foreground. Never run browser or visual suites from this WP.
- **Gate-proof clean-output rule.** A plant's `expectFailPattern` must never appear in the clean run's output. No test, log line or test title may print a plant token.

**Red-first rule.** For every behaviour and every plant:
1. Write the failing test (or the plant) FIRST.
2. Run it, and see it fail for the right reason. Record the failing line.
3. Only then implement.

For each test file, make one deliberate revert of the behaviour: a temporary local edit, never committed, that produces a named failing test. Then restore it. List it in the hand-off; the reviewer re-runs two of them.

**Test-quality rules (binding).**
1. Counts are asserted with equality, never "at least". Every loop over routes, events, examples or launches asserts that it ran the expected N times.
2. Every "absent", "refused", "nothing sent" or "no process left" assertion is paired with a positive control on the same target.
3. An oracle is read from an independent source (`routes.json` from disk, `changes.json`, the vendored YAML, the raw-TCP fake's request log), never from the code under test.
4. **Real time.** No test waits in real time for more than 1 s (NFR-001). Test durations come from the `Timings` table in `plan.md` IC-08.
5. **Panics.** Every scenario asserts the panic counter is 0 (NFR-005), once WP04 provides the counter in `tests/common`.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.**
- Commit on your lane branch with a conventional message, for example `feat(kitty-core): … (#19)`, ending with the attribution trailer the harness gives you.
- Never `git add -A`.
- The hand-off lists each commit hash, verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- **No delegation.** No sub-agents or forks; do this work package yourself.
- **No outward actions.** No push, no pull request, no issue comment.
- **No branch mechanics.** Never switch, create, reset or rebase branches; the orchestrator owns the lanes. Never `git stash`.
- **Denied means stop.** A DENIED command means stop and report it. Never retry it another way.
- **Never pattern-kill processes.** Nothing may be left running when you finish: no stub, no fake service, no child process group.
- **Hygiene.** No absolute paths and no usernames in any committed file (write `<repo>` instead). Captured service output is never written to a tracked file (C-006).
- **Charter boundaries.**
  - No change under `packages/*` (C-001).
  - `127.0.0.1` only (C-004).
  - No change to the port, the workspace `members`, the CI job list, the proof matrix gate list or the four #17 fixture files (C-002, SC-004 as amended by A-01).
- **Exact pins.** Every Cargo dependency is `=x.y.z` in `[workspace.dependencies]`, with a `# published YYYY-MM-DD` comment. Members use `workspace = true`. There are no new crates beyond the 14 in `research.md` R-07.
- **Orchestrator-owned files.** Everything under `kitty-specs/` belongs to the orchestrator. Report decisions and friction in the hand-off, and write nothing there.
- **No mission-state mutation.** Do not run `spec-kitty` commands that change mission state; the orchestrator moves tasks.

## Hand-off checklist (the report you write when you move to review)

1. **Commits:** each hash, verified with `git cat-file -t <hash>`, in order, with its subject line.
2. **Gates:** for every gate above, the command, its exit code and the pass count. A gate not run is listed, with the reason.
3. **Red-first evidence:** the failing line for every red-first test or plant, and the revert check for each test file.
4. **Out-of-map edits and change requests:** each with a one-line rationale.
5. **Measurements** this prompt asks for: timings, counts, and the `cargo test -p kitty-core` wall time.
6. **Supply chain** (only where a dependency changed): the S-1 to S-5 evidence.
