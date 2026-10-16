---
work_package_id: WP10
title: Documentation, measured budgets, SC-004 probe and proof-leg timeouts
dependencies:
- WP09
requirement_refs:
- NFR-001
- NFR-003
- NFR-008
- C-001
- C-009
- SC-004
- SC-006
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T053
- T054
- T055
- T056
history: []
agent_profile: node-norris
authoritative_surface: .github/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- README.md
- CHANGELOG.md
- .github/workflows/ci.yml
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP10 - Documentation, measured budgets, SC-004 probe and proof-leg timeouts (IC-10)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Finish the mission with five things:

1. Document kitty-core and the stub's new options in the README and the CHANGELOG.
2. Prove the frozen surface (SC-004, as amended by A-01).
3. Consolidate the measured budgets: kitty-core's test total (≤ 60 s), the NFR-003 latency, and the local gate-proof legs.
4. Set the proof-leg timeouts by the #17 formula.
5. Only the `timeout` values change in `ci.yml`.

## Context

Read:
- `plan.md`: IC-10, Gates ("Proof-leg timeouts"), "Branches and merge order";
- `quickstart.md`;
- spec A-01 and A-04;
- decision `01M50HVPJ9CDBB7405T9K0645R` (timeouts are formula-tuned);
- `reviews/plan.squad.md`: R1-07, R5-07, R5-08, R5-11, R6-01, R6-05, R6-07, FS-16.

Facts:
- **The local `main` ref is stale.** Use `origin/main` after `git fetch origin main` (R6-01, FS-16).
- **Timeouts today** (`ci.yml` proof matrix): `contract` 19 and `rust` 5. The `Gate: rust` job budget is 8 minutes (hard), and `Gate: contract`'s job cap is 5 minutes.
- **The formula** is (1 + plants) × the measured gate time + 2 minutes: contract `max(21, 10 × T + 2)` and rust `4 × T + 2`. The final values come from the PR's first CI run. This WP sets the local-proxy values, and the orchestrator re-measures on CI.
- **Merge order with #18 (R6-07).** Whichever is green first merges first. If #18 lands first, merge `main`, re-run this WP's probe and the timeout derivation, and resolve `CHANGELOG.md` and `README.md`.

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP09. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP10 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T053: README and CHANGELOG

**Steps**:
1. **README:**
   - a kitty-core section: what it does, the lookup order and `KITTY_MISSION_STATUS_SERVICE`, the supervised stand-in (`kitty-stub --mission-status.project-root=… --mission-status.port=…`);
   - the stub's new options (`--openapi`, `--select`, `--select-fixture`, the fixtures default `.kitty-stub/fixtures`);
   - the macOS PDEATHSIG limit.

   Write no absolute paths: use `<repo>`.
2. **CHANGELOG:**
   - an `Unreleased` entry for #19: kitty-core (discovery, supervision, the digest check, relay), the stub extensions, the generated bundle, the one new contract plant and the timeout changes;
   - its `Notes for #20 / #21 / #22` subsection:
     - #20: Job Objects, launchd PATH, quarantine as `crashing`, PATHEXT;
     - #21: `forward()` and a refusal with a huge body becoming `Unavailable`;
     - #22: liveness, exit on parent death, the service identifying its project and pid, `setsid`, `JAVA_HOME` passthrough, a bundled or unbundled document.
3. Run `pnpm hygiene && pnpm test:terminology`.

### Subtask T054: The SC-004 probe

**Steps**: run, and record the output:
```bash
git fetch origin main
base="$(git merge-base HEAD origin/main)"
git diff --exit-code "$base" -- packages/
git diff --exit-code "$base" -- contracts/fixtures/mission-status.routes.json contracts/fixtures/mission-status.examples.json \
  contracts/fixtures/mission-status.fixtures.json contracts/fixtures/mission-status.changes.json
git diff "$base" -- Cargo.toml | grep -n '^[-+]members' && echo "members changed: FAIL" || echo "members unchanged"
diff <(git show "$base":.github/workflows/ci.yml | grep -E '^  [a-z-]+:$') <(grep -E '^  [a-z-]+:$' .github/workflows/ci.yml) && echo "jobs unchanged"
diff <(git show "$base":.github/workflows/ci.yml | grep -E '^ +gate: \[') <(grep -E '^ +gate: \[' .github/workflows/ci.yml) && echo "matrix.gate unchanged"
```
Also check that `crates/kitty-core/tests/workspace.rs` and `gates/plants/rust/plant.json` are byte-identical to `$base`.

### Subtask T055: Measured budgets

**Steps**:
1. Run `heavy cargo test -p kitty-core --frozen -- --report-time` (or plain `cargo test`), and sum each test binary's `finished in` line. The total must be 60 s or less (NFR-001, R5-07). Record per-binary times.
2. Collect the NFR-003 numbers from WP05 (p50, p95 and the maximum, in debug and release).
3. Collect the 10-run determinism evidence from WP08.
4. Run `heavy node scripts/gate-proof.mjs local --only rust` and `heavy node scripts/gate-proof.mjs local --only contract` on the integrated branch. Record each clean gate time T and the leg duration (the local proxy).

### Subtask T056: Proof-leg timeouts

**Steps**:
1. From T055's local proxy:
   - contract `max(21, ceil(10 × T_contract + 2))`;
   - rust `ceil(4 × T_rust + 2)`, kept at 5 if that gives 5 or less.

   Edit only the `timeout:` values of the `contract` and `rust` matrix entries in `ci.yml` (a timeout-only change; decision `01M50HVPJ9CDBB7405T9K0645R`).
2. Re-run `node scripts/gate-proof.mjs coverage` and `pnpm hygiene`; both are green.
3. Record in the hand-off that the orchestrator re-derives both values from the PR's first CI run (R5-11), and never sets contract below 21.

## Plants

None.

## Exit checks

1. Every gate is green.
2. The SC-004 probe passes (T054 output).
3. kitty-core's test total is 60 s or less.
4. `ci.yml` differs from `$base` only in `timeout:` values.

## Definition of Done

- README and CHANGELOG are updated, including the notes for #20, #21 and #22.
- The SC-004 probe is recorded.
- The budgets are measured and recorded.
- The timeouts are set by the formula from the local proxy, with the CI re-derivation handed to the orchestrator.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **Merging #18 first** changes `ci.yml`. Re-run T054 and T056 after merging `main`.
- **A local proxy far from CI.** CI values win; the orchestrator updates them.

## Reviewer Guidance

- Run the SC-004 probe yourself.
- Check that the `ci.yml` diff is timeout-only.
- Check the arithmetic of the formula.

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
- `node scripts/gate-proof.mjs coverage` must pass after the `ci.yml` edit.
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
