---
work_package_id: WP08
title: 'Supervision: policy, process group, state machine and the fake service'
dependencies:
- WP06
- WP07
requirement_refs:
- FR-016
- FR-017
- FR-018
- FR-019
- FR-020
- FR-021
- FR-022
- NFR-001
- NFR-005
- NFR-006
- C-006
- SC-003
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T039
- T040
- T041
- T042
- T043
- T044
- T045
- T046
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/src/supervisor/
create_intent:
- crates/kitty-core/src/supervisor/mod.rs
- crates/kitty-core/src/supervisor/policy.rs
- crates/kitty-core/src/supervisor/ports.rs
- crates/kitty-core/src/supervisor/output.rs
- crates/kitty-core/src/supervisor/process.rs
- crates/kitty-core/src/supervisor/spawner.rs
- crates/kitty-core/src/bin/kitty-fake-service.rs
- crates/kitty-core/tests/supervision.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-core/src/supervisor/**
- crates/kitty-core/src/bin/**
- crates/kitty-core/tests/supervision.rs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP08 - Supervision: policy, process group, state machine and the fake service (IC-08)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Supervise one service process group per project:

- a pure restart policy with two counters;
- a port picker that never repeats a port;
- an output ring;
- a dedicated spawner thread that forks with `setpgid`, `PDEATHSIG` and a `getppid` check;
- the state machine with its start budget, polling rules, readiness race, Linux socket-ownership check and generations;
- the stop sequence and signal discipline;
- `kitty-fake-service` with every scenario mode.

Every supervision scenario is deterministic and free of panics.

## Context

Read:
- `plan.md`: Architecture, IC-08 (all its risks and the `Timings` test table);
- `data-model.md`: Supervision (the state-transition table and invariants);
- `contracts/kitty-core-api.md`: Test-only surface (the fake modes);
- spec Amendments A-02, A-03, A-05, A-06 and A-10;
- `research.md`: R-06 and R-09;
- decisions `01M50M407F65T4SQA9TNWQYCQT` (restart policy), `01M50M42PBSJ806A432AP7M13S` (process group), `01M525WMWERXEBRY05X78Q6P3F` (503) and `01M525WQ8AFYF4PZAF4ACKSBXJ` (socket ownership);
- `reviews/plan.squad.md`: rounds 1 to 3 (R2-01, R2-03, R2-08, R2-09, R2-17, R3-01 to R3-04, R4-05, R4-06, R5-04, R5-05, R5-08 to R5-10, R5-13, FS-03, FS-06, FS-07, FS-11, FS-12, FS-15, FS2-01 to FS2-03, FS2-05).

Facts:
- **`Timings`** is defined by WP04 in `client.rs`. Use it, and do not redefine it.
- **The digest check** (`ContractClient::check_contract`, `ContractPin`) comes from WP06, and **discovery** from WP07.
- **The `[[bin]]` stanza** goes in `crates/kitty-core/Cargo.toml`, owned by WP01, as a recorded out-of-map edit made together with the binary file (R6-03).
- **`CoreStatus` and `connection_state_hint`** live in `status.rs` (WP09). This WP publishes transitions through a small internal `StatusSink` trait that WP09 implements. Define the trait here, in `supervisor/mod.rs`.

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP06, WP07. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP08 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T039: The restart policy (`policy.rs`)

**Purpose**: FR-020 as amended by A-02 (FS-03, FS2-01, R5-08, R5-09, R5-13).

**Steps**:
1. `pub trait Clock: Send + Sync { fn now(&self) -> Instant; }`, with `MonotonicClock` in production and a `ManualClock` test type (`advance(Duration)`).
2. `pub trait Sleeper: Send + Sync { fn sleep(&self, d: Duration) -> BoxFuture<'static, ()>; }`, with `TokioSleeper` in production and `RecordingSleeper` in tests (records each `d`, advances its `ManualClock`, returns at once).
3. `RestartPolicy { delays: [500 ms, 1 s, 2 s, 4 s], window: 300 s, give_up_at: 5, reset_after_ready: 60 s }` (the `Default` values).
4. `PolicyState { window: VecDeque<Instant>, index: usize }`, with these methods:
   - `on_ready_for(d)`: if `d ≥ 60 s`, set `index = 0`, but do **not** clear `window`.
   - `on_crash(now) -> Decision::{Backoff(delay), GiveUp}`:
     1. push `now` and drop entries older than 300 s;
     2. if `window.len() ≥ 5`, return `GiveUp`;
     3. otherwise the delay is `delays[min(index, 3)]`, then `index += 1`.
5. **Unit tests**, each looped 10 times for determinism:
   - four quick crashes give 0.5, 1, 2, 4, and the fifth gives up;
   - crash, 70 s of `Ready`, crash gives 0.5 and 0.5, with the window still holding 2;
   - **five crashes each after 61 s of `Ready`, all within 300 s, still give up** (every delay 0.5; FS2-01);
   - crashes 301 s apart never give up;
   - `RestartPolicy::default()` and `Timings::default()` equal the plan's production values (R5-09).

### Subtask T040: Ports and the output ring (`ports.rs`, `output.rs`)

**Steps**:
1. `pub trait PortPicker: Send + Sync { fn pick(&self, exclude: &[u16]) -> io::Result<u16>; }`. `LoopbackPortPicker` binds `127.0.0.1:0`, reads the port, drops the listener, and retries while the port is in `exclude` (R2-17). Tests can script ports.
2. `OutputRing`: 64 KiB, keeps the newest bytes, with `push(&[u8])` and `snapshot() -> Vec<u8>`. The supervisor keeps the most recent child's ring after that child exits (R1-06).
3. **Unit tests** (R5-10):
   - after 100 KiB written in uneven chunks (1, 7, 4096, 65537 bytes and so on), the ring holds exactly the newest 65,536 bytes;
   - the picker excludes the given ports (a scripted bind of an excluded port is retried).

### Subtask T041: The spawner thread and the launch (`spawner.rs`, `process.rs`)

**Purpose**: FR-017 as amended by A-06, R3-01 to R3-04, R4-05, FS-11.

**Steps**:
1. **One long-lived `std::thread`** (`kitty-core-spawner`), started lazily, owned by a process-wide handle, and alive while any `Core` exists. It receives spawn requests over a channel, calls `runtime_handle.enter()`, and runs `tokio::process::Command::spawn`. It returns the `Child` over a oneshot channel.
2. **The command.**
   - Argv: exactly `--mission-status.project-root=<canonical root>` and `--mission-status.port=<n>`. The root comes from `std::fs::canonicalize`; a failure is `ServiceMissing(CannotExecute)` with the OS error.
   - `env_clear()`, then `PATH`, `HOME`, `LANG`, `LC_*` and `TMPDIR` from the parent when present, plus `cfg(windows)` `SystemRoot`, plus each name in `CoreConfig.env_passthrough`.
   - `stdin(Stdio::null())`, piped stdout and stderr, `current_dir(<canonical root>)`, `kill_on_drop(true)`.
3. **`pre_exec`** (`cfg(unix)`, inside `unsafe`, with a `// SAFETY:` comment) makes only these calls:
   - `setpgid(0, 0)`;
   - on Linux, `prctl(PR_SET_PDEATHSIG, SIGKILL)`;
   - `getppid()`, compared with the parent pid captured before the fork; on a difference, return `Err(io::Error::from_raw_os_error(libc::ESRCH))`. There is no `_exit`.
4. **Spawn errors.** EACCES, ENOEXEC and ENOENT become `ServiceMissing(CannotExecute)` with the OS error text.
5. **Drain the pipes** into the ring with two tasks, so the child never blocks on a full pipe.

### Subtask T042: Stop and signal discipline (`process.rs`)

**Purpose**: FR-021 as amended by A-05 (R2-09, FS-07, FS2-05).

**Steps**:
1. `ChildGuard { child: Child, pgid: i32, reaped: bool }` is owned only by the supervisor task.
2. **`stop()`.**
   1. If `child.id()` is `Some`, send `kill(-pgid, SIGTERM)`.
   2. Wait for the exit, bounded by `stop_grace`.
   3. If it is still running, `kill(-pgid, SIGKILL)` and `wait()`.
   4. After the leader is reaped, send **exactly one** `kill(-pgid, SIGKILL)` to reach surviving members (ESRCH is fine).
   5. Then probe with `kill(-pgid, 0)` until ESRCH (bounded by `stop_grace`).

   Signal 0 delivers nothing, and that is the second invariant exception (FS2-05). Write the safety argument and the residual-risk note from plan IC-08 as a doc comment.
3. **`Drop for ChildGuard`.** If not reaped, send `kill(-pgid, SIGKILL)`, synchronously, from the owning task's stack.
4. **Never signal** when `child.id()` is `None`, or after `wait()` returned, except for the single post-reap SIGKILL and the probe.

### Subtask T043: The state machine (`supervisor/mod.rs`)

**Purpose**: FR-016, FR-018, FR-019 and FR-022, A-03 and A-10, R2-01, R2-03, FS-06, FS-12, FS2-02, FS2-03.

**Steps**: implement the data-model transition table exactly. In particular:
1. **Generations.** They start at 1, and every launch (a busy-port retry or a restart after backoff) publishes `Starting { generation }`.
2. **One start budget** (`start_timeout`) per start, covering every attempt. Each poll (`check_contract` against the new port) is bounded by the budget left.
3. **Polling rules.**
   - A refused or reset connection, or a 503, means keep polling every `poll_interval`.
   - The first other answer is final: 200 goes to the digest, and anything else is a mismatch.
   - A budget spent on 503s is a start failure, with the cause "start budget spent on 503s".
4. **Readiness race.** The `tokio::select! { biased; exit = child.wait() => …, poll = … }` lets the child's exit win. After a digest match, `try_wait()` must return `None`.
5. **Linux socket ownership** (`cfg(target_os = "linux")`).
   - Before `Ready`, find the inode of the `127.0.0.1:<port>` LISTEN socket in `/proc/net/tcp`. It must be among the `socket:[inode]` links of `/proc/<pid>/fd/*` for some pid whose `/proc/<pid>/stat` process group equals `pgid`. This uses `std` only.
   - A mismatch is treated as a **busy-port attempt** (FS2-02): stop the group, then attempt + 1 on an untried port, with no crash-window slot and no backoff.
   - Three attempts used up are a start failure, with the cause "listening socket not owned by the service".
6. **An exit before ready** (attempt < 3, budget left) also means retry on an untried port.
7. **A start failure** runs the full stop sequence, then `Crashed`, then the policy. **Give-up** is `Stopped + ServiceMissing(Crashing, detail = the last failure cause or exit status or signal)` (FS2-03).
8. **A mismatch** stops the group and gives `Stopped + ContractMismatch`, with no restart.
9. **`retry()`** from `Stopped` clears the policy state and runs discovery again.
10. **Publishing** goes through `StatusSink`. A send with no receiver is ignored.

### Subtask T044: `kitty-fake-service` and its `[[bin]]`

**Purpose**: the supervised stand-in for every scenario (R5-04, R5-05, FS-15, FS2-01).

**Steps**:
1. **Manifest.** Add to `crates/kitty-core/Cargo.toml` (a recorded out-of-map edit): `[[bin]] name = "kitty-fake-service" path = "src/bin/kitty-fake-service.rs" test = false doc = false`.
2. **Behaviour.**
   - It parses exactly the two `=` arguments.
   - It reads `<root>/kitty-fake-service.json`: `{ launches: [mode...], crashAfterMs }`.
   - Its launch index `n` comes from `<root>/kitty-fake-service.count` (read, increment, write).
   - It writes `<root>/launch-<n>.json`, holding its argv and its environment as name-to-value pairs.
   - It appends each request line to `<root>/requests.log`.
3. **The server.** Raw `std::net::TcpListener` on `127.0.0.1:<port>`; exit 1 if the bind fails. It serves `GET /api/v1/openapi.yaml` with the embedded bundle (`include_bytes!`).
4. **Modes.**
   - `ready`: also writes its own pid to `<root>/service.pid`.
   - `crash-after`: `crashAfterMs` counted from the first `openapi.yaml` GET served.
   - `exit-at-start`.
   - `never-ready`: never binds, sleeps.
   - `ignore-term`: `SIG_IGN` for SIGTERM.
   - `serve-modified`: `info.version` changed.
   - `serve-503`: every request gets 503.
   - `alive-no-bind`: alive, never binds.
   - `fork-child`: spawns a grandchild copy in an idle mode that writes `<root>/grandchild.pid`, then serves `ready`.
   - `host`: runs `kitty_core::Core` on its own runtime, with its own project root `<root>/inner`, supervising another `kitty-fake-service` in `ready` mode (located with `std::env::current_exe()`). When the inner service is `Ready`, it calls `std::process::exit(0)` without `stop()`.
5. **Platform gating.** `ignore-term`, `fork-child` and `host` are `cfg(unix)`. Never print absolute paths to stdout.

### Subtask T045: Supervision scenarios (`tests/supervision.rs`)

**Purpose**: SC-003 and FR-016 to FR-022. Every scenario asserts the exact state sequence, the `RecordingSleeper` log, the generations, and no panics.

**Steps**: one test per scenario, using the `Timings` test table (poll 10 ms, start 2 s, never-ready 300 ms, grace 300 ms):
1. **`ready`:** `Starting(1)` then `Ready(1)`. The launch file shows exactly the two argv strings, with the canonical root, and an environment equal to the allowlist present in the test process. stdin is null: the fake asserts that a read returns EOF.
2. **`crash-after` then `ready`:** `Ready`, `Crashed`, `Backoff(0.5 s)`, `Starting(2)`, `Ready(2)`. The sleeper log is `[0.5 s]`.
3. **Five crashes:** the log is `[0.5, 1, 2, 4]`, then `Stopped + Crashing`, with the detail naming the last exit status.
4. **Busy port.** The first scripted port is held by a squatter that accepts but holds its answer until the fake exits or for 200 ms. The fake exits (bind error), the exit wins, and the next attempt uses a different port and reaches `Ready`.
5. **`alive-no-bind` with an immediate squatter** serving the pinned document, `cfg(target_os = "linux")`: the socket-ownership check fails on all 3 attempts. The result is a start failure and then the policy. `Ready` never occurs.
6. **`serve-503`:** `Starting` until the budget is spent, then `Crashed`, then the policy, with the detail "start budget spent on 503s".
7. **`never-ready`** (300 ms start budget): a start failure, the full stop sequence (the pid is gone), then `Crashed`.
8. **`exit-at-start` ×3:** a start failure after 3 attempts on 3 distinct ports.
9. **`serve-modified`:** `Stopped + ContractMismatch`, with both digests, and the process group gone.
10. **`stop()`:** `ready` stops within the grace period; `ignore-term` is killed after the 300 ms grace. In both cases `kill(pid, 0)` gives ESRCH afterwards.
11. **`fork-child`:** after `stop()`, both the service and the grandchild pid are gone.
12. **The leader exits, the grandchild lives (FS-07):** after the reap, the post-reap SIGKILL removes the grandchild within 1 s.
13. **`host` mode** (`cfg(target_os = "linux")`): the test starts the host process directly, waits for `<root>/inner/service.pid`, waits for the host to exit, and asserts the inner service's pid is gone within 1 s. The WP proves this test red with the `prctl` call temporarily removed.
14. **Missing binary** (`Discovery` returns `NotFound`): `Stopped + ServiceMissing(not-found)`. A non-executable file gives `Stopped + ServiceMissing(cannot-execute)`, with the OS error. Both have no retry loop: the sleeper log is empty.

### Subtask T046: Determinism evidence (R5-08, NFR-006)

**Steps**: run `heavy cargo test -p kitty-core --test supervision --frozen` 10 times locally. Record that the state sequences and sleeper logs are identical (print a digest of each scenario's sequence under `--nocapture`), and record the wall time of each run. The reviewer repeats one run.

## Plants

None (tests inside `Gate: rust`).

## Exit checks

1. The Rust gate passes.
2. `heavy node scripts/gate-proof.mjs local --only rust`: the clean run is green, and the 3 rust plants are red. Record the gate time T: the rust leg timeout is `4 × T + 2` (A-04).
3. 10 local runs of `tests/supervision.rs` give identical sequences, and the wall time of each is recorded.
4. No process is left: after the runs, `pgrep -f kitty-fake-service` finds nothing (this only checks; do not kill by pattern).

## Definition of Done

- Every row of the data-model transition table is implemented and covered by a scenario.
- Every policy case is tested.
- The process group, PDEATHSIG and the signal discipline are implemented as specified.
- The `[[bin]]` and all fake modes exist.
- Determinism is proven over 10 runs.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **PDEATHSIG and threads.** It fires when the forking *thread* exits. Never fork outside the spawner thread.
- **`/proc` parsing.** IPv4 `127.0.0.1` appears as `0100007F:<PORT hex>` in `/proc/net/tcp`, and LISTEN is state `0A`. Unit-test the parser on a captured sample.
- **Time budget.** Keep each scenario's real waits at 1 s or less. The whole file should stay well under 20 s.

## Reviewer Guidance

- Read the `pre_exec` body: only the three allowed calls.
- Run scenarios 11 to 13 yourself.
- Confirm the `RecordingSleeper` logs are asserted, not only the states.

## Owned files, out-of-map edits, gates, red-first, commit rule

**Owned files.** The frontmatter `owned_files` is authoritative, and `lanes.json` `write_scope` is computed from it by the tool. Neither is hand-edited. Stage only owned files and the recorded out-of-map edits below.

**Recorded out-of-map edits** (each one is committed with a plain `git add <path>`, and listed in the hand-off with a one-line rationale):
- `crates/kitty-core/Cargo.toml` (owned by WP01): add the `[[bin]] kitty-fake-service` stanza (`test = false`, `doc = false`) together with `src/bin/kitty-fake-service.rs` (R6-03).

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
