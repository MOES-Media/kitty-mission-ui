---
work_package_id: WP07
title: Discovery behind a replaceable interface
dependencies:
- WP04
requirement_refs:
- FR-022
- FR-023
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T036
- T037
- T038
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/
create_intent:
- crates/kitty-core/src/discovery.rs
- crates/kitty-core/tests/discovery.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-core/src/discovery.rs
- crates/kitty-core/tests/discovery.rs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP07 - Discovery behind a replaceable interface (IC-07)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Implement the `Discovery` trait and `DefaultDiscovery`, with the operator's lookup rules (decision `01M50D403EEYQYEPSSMAV732DF`):

1. a configured absolute path, with no fallback;
2. otherwise `KITTY_MISSION_STATUS_SERVICE`, absolute, with no fallback;
3. otherwise a PATH search over absolute entries only, following symlinks to an executable regular file;
4. nothing found is `NotFound`.

## Context

Read:
- `data-model.md`: Discovery;
- `plan.md`: IC-07;
- `research.md`: R-11;
- spec FR-023 and US6;
- `reviews/plan.squad.md`: R2-14, R3-09.

Facts:
- **No global environment.** Tests never mutate the process environment: `EnvSnapshot` is passed explicitly.
- **Spawn-time errors are elsewhere.** `CannotExecute` arises at spawn (WP08), not here.
- **The default binary name** is `mission-status-api`, and it is configurable.

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP04. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP07 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T036: Types and the trait

**Steps**:
1. `pub trait Discovery: Send + Sync { fn locate(&self) -> Result<PathBuf, ServiceMissing>; }`.
2. `pub struct ServiceMissing { pub reason: MissingReason, pub detail: String }` and `pub enum MissingReason { NotFound, CannotExecute, Crashing }`.
3. `pub struct EnvSnapshot { pub service_var: Option<OsString>, pub path_var: Option<OsString> }`, with `EnvSnapshot::from_process()`, which is the only place that reads `std::env`.
4. `pub struct DefaultDiscovery { configured: Option<PathBuf>, env: EnvSnapshot, binary_name: OsString }`, with `DefaultDiscovery::from_process(configured, binary_name)` and `DefaultDiscovery::new(configured, env, binary_name)`.

### Subtask T037: The rules

**Steps**:
1. **`usable(path)`.** The path must be absolute. `std::fs::metadata` follows symlinks and must report a regular file. On Unix, `mode & 0o111 != 0`; on other platforms, being a file is enough (document PATHEXT for #20).
2. **Rule 1.** When `configured` is `Some(p)`: if `p` is usable, use it; otherwise `NotFound` with the detail "configured path …: not absolute, missing, not a regular file or not executable". There is never a fallback.
3. **Rule 2.** When `service_var` is set and non-empty, the same rule applies, with no fallback.
4. **Rule 3.** `std::env::split_paths(path_var)`: skip non-absolute (and empty) entries; the first `entry/binary_name` that is usable wins.
5. **Rule 4.** Otherwise `NotFound` with the detail "not found on PATH".
6. **Details never echo** the full value of a variable other than the candidate path.
7. **Module docs.** On macOS, a GUI app launched by launchd gets a minimal PATH, so #20 should prefer the configured path. Windows `PATHEXT` is not handled in #19.

### Subtask T038: `tests/discovery.rs`

**Steps**: build temp directories with real files (`std::fs::set_permissions` for the execute bit, `std::os::unix::fs::symlink` for links, gated with `cfg(unix)`):
1. A configured, valid path wins over a valid environment variable and PATH. A positive control: the same environment variable alone is used.
2. A configured relative path is `NotFound`, with no fallback even though PATH has a valid binary.
3. A configured missing file, a configured directory and a configured non-executable file are each `NotFound`, with no fallback.
4. A valid environment variable is used when nothing is configured. A relative, missing or non-executable environment value is `NotFound`, with no fallback.
5. PATH: a relative entry and an empty entry are skipped, and a later absolute entry wins. A non-executable candidate is skipped, and the next one wins.
6. A symlink to an executable file is accepted and returned as the configured path (the link itself; document that the target is followed only for the checks). A dangling symlink is `NotFound`.
7. Nothing anywhere gives `NotFound` with the "not found on PATH" detail.
8. An injected `Discovery` implementation is used unchanged. That is a compile-level and behaviour test here; WP09 also passes one to `Core`.
9. A count assertion checks that every rule's case ran.

## Plants

None (tests inside `Gate: rust`).

## Exit checks

1. The Rust gate passes.
2. `cargo test -p kitty-core --test discovery` wall time is recorded (expected well under 1 s).

## Definition of Done

- The four rules are implemented exactly, with no fallback after an explicit choice.
- Only absolute paths are accepted, and non-absolute PATH entries are skipped.
- Symlinks are followed.
- Each rule and each skip has a test.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **CI runs as an unprivileged user,** so permission tests are reliable. If root ignores the execute bit for `metadata`, the mode check still works, because it reads bits rather than calling `access()`.

## Reviewer Guidance

- Grep for `std::env::var`: it may appear only in `EnvSnapshot::from_process`.
- Check the no-fallback cases each have a valid fallback candidate present, so a missing "no fallback" rule would make them pass for the wrong reason.

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
| `crates/kitty-core/src/supervisor/**`, `crates/kitty-core/src/bin/**`, `crates/kitty-core/tests/supervision.rs` | WP08 |
| `crates/kitty-core/src/{core,status}.rs`, `crates/kitty-core/tests/{status_mapping,panic_probe}.rs`, `crates/kitty-stub/tests/supervised.rs` | WP09 |
| `README.md`, `CHANGELOG.md`, `.github/workflows/ci.yml` | WP10 |
| `gates/plants/rust/**`, `crates/kitty-core/tests/workspace.rs`, `scripts/hygiene/gitattributes.test.mjs`, `packages/**`, the four #17 files in `contracts/fixtures/` | nobody: never touched by this mission |

**Gates this work package must pass before hand-off.** Each must exit 0. Run them from the lane worktree root, after confirming that `git rev-parse --show-toplevel` is that worktree.

- **The Rust gate.** Run the two install steps first, then exactly the canonical string:
  ```
  rustup toolchain install && cargo fetch --locked
  cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
  ```
- **The contract gate** (canonical string): `pnpm contract:check && pnpm test:contract`.
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
