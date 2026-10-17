---
work_package_id: WP09
title: Core facade, degraded signal and the supervised stand-in
dependencies:
- WP05
- WP08
requirement_refs:
- FR-013
- FR-016
- FR-021
- FR-024
- NFR-005
- NFR-006
- C-003
- SC-005
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-kitty-core-01M50D10
base_commit: 09c9608aaceec262163989116114bde6943500ec
created_at: '2026-10-16T15:24:28.097638+00:00'
subtasks:
- T047
- T048
- T049
- T050
- T051
- T052
- T053
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/
create_intent:
- crates/kitty-core/src/facade.rs
- crates/kitty-core/src/status.rs
- crates/kitty-core/tests/status_mapping.rs
- crates/kitty-core/tests/panic_probe.rs
- crates/kitty-core/tests/host_exit.rs
- crates/kitty-stub/tests/supervised.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-core/src/facade.rs
- crates/kitty-core/src/status.rs
- crates/kitty-core/tests/status_mapping.rs
- crates/kitty-core/tests/panic_probe.rs
- crates/kitty-core/tests/host_exit.rs
- crates/kitty-stub/tests/supervised.rs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP09 - Core facade, degraded signal and the supervised stand-in (IC-09)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Assemble the public `Core` facade that #20 and #21 build on:

- start, subscribe, stop and retry;
- the gated read, stream and `ready_endpoint`;
- the `HandleGuard` drop semantics;
- `CoreStatus` with its `ConnectionState` hint, tested against `port.ts`.

Prove it end to end by supervising the real `kitty-stub` binary through `Core`.

## Context

Read:
- `contracts/kitty-core-api.md` (normative public surface);
- `data-model.md`: Supervision (initial status, `left_initial_start`, the hint table);
- `plan.md`: IC-09 and Architecture (`HandleGuard`);
- spec A-05 and A-07;
- decision `01M50M47K1PNKP9KHCGGDBQZ0A`;
- `reviews/plan.squad.md`: R1-08, R3-07, R4-02, R4-04, R5-02, R5-03, FS-04, FS-09, FS-12, FS-17.

Facts:
- **Port strings.** `packages/mission-shell/src/client/port.ts` has `export const CONNECTION_STATES = ['connecting', 'connected', 'reconnecting', 'degraded: service-missing', 'degraded: contract-mismatch'] as const;`.
- **Pieces from other WPs.**
  - WP08 defines the public `StatusSink` trait and `spawn_supervisor` entry point (`#[doc(hidden)]`), and the status types in `status.rs`. This WP implements the sink with `watch` plus `broadcast(64)`, and adds the hint.
  - `Timings` is in `client.rs` (WP04).
  - `ContractPin` is from WP06, and the discovery types from WP07.
- **Cargo exposes `CARGO_BIN_EXE_kitty-stub` only to kitty-stub's own tests,** so the supervised stand-in test lives in `crates/kitty-stub/tests/supervised.rs`, with kitty-core as a dev-dependency of kitty-stub (verified to resolve and compile at plan time).

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP05, WP08. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP09 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T047: `CoreStatus` and the hint (`status.rs`)

**Steps**:
1. WP08 has already defined these types in `status.rs` (its recorded out-of-map edit), because `StatusSink` needs them. Check them against the data model, and take ownership of the file:
   - `SupervisionState { Starting, Ready { endpoint }, Crashed, Backoff { delay }, Stopped }`;
   - `DegradedReason { None, ServiceMissing(ServiceMissing), ContractMismatch(Mismatch) }`;
   - `CoreStatus { state, degraded, generation, attempt, left_initial_start }`.
2. **The initial status** is `Starting`, generation 1, `None`, attempt 0, `left_initial_start = false`.
3. **`left_initial_start`** is set by WP08's supervisor, at the first `Ready` or the first `Stopped` (FS-04, B3). This WP only verifies it, through the hint tests in T050.
4. `pub fn connection_state_hint(&CoreStatus) -> Option<&'static str>` implements exactly the data-model table: `Starting`, `Crashed` and `Backoff` before the flag map to `connecting`; after it, to `reconnecting`; `Ready` is `connected`; and the two degraded strings follow. `Stopped` with no reason is `None`.

### Subtask T048: The `Core` facade (`facade.rs`, module `facade`; A13)

**Steps**:
1. `Core::start(config) -> Result<(Core, Subscription), StartError>`:
   - `config.runtime`, or `Handle::try_current()`; otherwise `Err(NoRuntime)`, never a panic (R4-02);
   - call WP08's public `spawn_supervisor(config, sink, runtime)` with this WP's `StatusSink` implementation (`watch` plus `broadcast(64)`), and return a pre-subscribed `Subscription { initial, receiver }`.
2. `Core::subscribe()` is atomic: it takes the publishing lock, reads the current status and subscribes before releasing (R4-04, R5-02).
3. **`HandleGuard`.** Each `Core` clone holds an `Arc<HandleGuard>`. The last drop aborts the supervisor task, so `ChildGuard::drop` sends SIGKILL to the group and `kill_on_drop` is the backstop (A-05).
4. **`stop()`** runs the graceful sequence and returns `Err(SupervisorPanicked)` when the task's `JoinError` is a panic.
5. **The `Core`-only variants (B1).** Add `NotReady(CoreStatus)` and `ContractMismatch(Mismatch)` to `ReadOutcome` (`client.rs`) and to `StreamOpenError` (`sse.rs`), both recorded out-of-map edits. Both enums are already `#[non_exhaustive]`, so WP04's and WP05's tests keep compiling.
6. **The other methods.**
   - `retry()` works only from `Stopped`.
   - `ready_endpoint()` is `Some` only while `Ready`, carrying the generation.
   - `read()` and `open_stream()` answer `NotReady` or `ContractMismatch` **without I/O** unless `Ready`.
   - `captured_output()` returns the newest 64 KiB of the current or most recent child.
7. Assert `Core: Send + Sync + Clone` at compile time.

### Subtask T049: Re-exports (`lib.rs`, an out-of-map edit)

**Steps**: refer to the facade as `crate::facade::…` (the module is `facade`, never `core`; A13). Add `pub use` lines for the public surface of `contracts/kitty-core-api.md` (`Core`, `CoreConfig`, `Subscription`, `CoreStatus`, `connection_state_hint`, `ContractClient`, `ServiceEndpoint`, `ReadRequest`, `ReadOutcome`, `StreamScope`, `ChangeStream`, `StreamEvent`, `digest_of`, `ContractPin`, `Discovery`, `DefaultDiscovery`, `Timings`, `RestartPolicy`, …). Keep `version()` and the single `#[cfg(test)]` anchor untouched. The rust plants depend on them.

### Subtask T050: `tests/status_mapping.rs`

**Steps**:
1. Enumerate every `(state, left_initial_start, degraded)` combination, including the impossible ones, which must be `None`. Assert the total table. Count the combinations with equality.
2. **Cross-language check.** Read `packages/mission-shell/src/client/port.ts` from disk, extract the `CONNECTION_STATES` array with a small string parse, and assert that the set of non-`None` hints equals those five strings exactly.
3. **FS-04 cases:** `Crashed` before the first `Ready` is `connecting`; `Starting` after a `retry()` with the flag set is `reconnecting`.

### Subtask T051: `Core`-level tests (`tests/panic_probe.rs`, and `Core` cases in `tests/status_mapping.rs` or a new section of it)

**Steps**:
1. **FR-013 at `Core` level** (R5-01).
   - A `serve-modified` fake leads to `Stopped + ContractMismatch`, and the group is gone.
   - `core.read(..)` returns `ContractMismatch`, not a transport error.
   - `core.open_stream(..)` returns `Err(ContractMismatch)`.
   - The fake's `requests.log` holds only the `openapi.yaml` fetch.
2. **Gating before `Ready`.** `read` returns `NotReady` with nothing sent. A positive control: once `Ready`, one read is sent.
3. **Subscription.** The initial status and every transition of the `ready` scenario are received in order. A slow receiver gets `Lagged` and can call `status()`.
4. **Drop.** Dropping the last `Core` clone removes the group within 1 s, with no grace period. A positive control: dropping a non-last clone does not.
5. **Runtime.** `Core::start` outside a runtime is `Err(NoRuntime)`.
6. **`retry()` (A8).** A toggleable injected `Discovery` (an `AtomicBool` that selects `NotFound` or the fake's path):
   - first `NotFound` gives `Stopped + ServiceMissing(not-found)`;
   - toggle it and `retry()`: discovery runs again, then `Starting` with generation + 1, then `Ready`;
   - **`retry()` after `Crashing`:** five quick crashes give up; `retry()` then starts with an empty crash window, so the next crash gives `Backoff(0.5 s)`, not a give-up;
   - **`retry()` outside `Stopped`** (while `Ready`, and while `Backoff`) is a no-op: no transition is published and the generation is unchanged.
7. **`panic_probe.rs`** (its own test binary): install the same panic counter, cause a deliberate panic inside a spawned task, and assert the counter reads 1. This proves the check catches panics. Every other test asserts 0.

### Subtask T052: The `host` mode and the host-exit test (A1)

**Purpose**: prove that no service process outlives a host that exits without `stop()` (FR-021; plan IC-08 "Host exit").

**Steps**:
1. **The `host` arm** goes in `crates/kitty-core/src/bin/kitty-fake-service.rs` (owned by WP08), as a recorded out-of-map edit, `cfg(unix)`.
   - It runs `kitty_core::Core` on its own runtime, with its own project root `<root>/inner`, supervising another `kitty-fake-service` (found through `std::env::current_exe()`) in `ready` mode.
   - That supervised service (the host's direct child) writes its own pid to `<root>/inner/service.pid` (FS-15).
   - Once the status is `Ready`, the host calls `std::process::exit(0)` without `stop()`.
2. **`crates/kitty-core/tests/host_exit.rs`** (`cfg(target_os = "linux")`):
   - write both scenario files first: `write_scenario(<root>, &["host"], None)` for the host, and `write_scenario(<root>/inner, &["ready"], None)` for the service it supervises (B5);
   - start the host directly, with `CARGO_BIN_EXE_kitty-fake-service`;
   - wait for `service.pid`, then wait for the host to exit;
   - assert that the inner service's pid is gone within 1 s (`kill(pid, 0)` gives ESRCH).
   - A positive control: the pid existed before the host exited.
3. **Red first.** Show the test failing with WP08's `prctl(PR_SET_PDEATHSIG, …)` call temporarily removed (a local edit, never committed), then restore it.

### Subtask T053: The supervised stand-in (`crates/kitty-stub/tests/supervised.rs`)

**Purpose**: decision `01M50M47K1PNKP9KHCGGDBQZ0A`, A-07.

**Steps**:
1. Add `kitty-core = { path = "../kitty-core" }` to `crates/kitty-stub/Cargo.toml` `[dev-dependencies]` (a recorded out-of-map edit; owned by WP03). The `Cargo.lock` edge `kitty-stub` → `kitty-core` is a recorded out-of-map edit too (FS-01).
2. Build a `Core` with a `Discovery` returning `env!("CARGO_BIN_EXE_kitty-stub")`, a temp project root (no `.kitty-stub/fixtures`, so the workspace fixtures are used), and `idle_limit` of at least 2 s (FS-09).
3. **Assert:**
   - the state reaches `Ready` (the digest matches the default bundle);
   - one read through `Core` (`getProject`) returns 200 with the default example's bytes;
   - a scoped stream through `Core` delivers the 5 scripted changes in order (each gap is 250 ms, about 1 s in total);
   - `stop()` succeeds, and the stub process is gone.
4. **The panic hook.** Carry a small copy of the panic-counter hook in this file, because it cannot use kitty-core's `tests/common` (FS-17). It is a deliberate duplicate of about 15 lines.

## Plants

None (tests inside `Gate: rust`).

## Exit checks

1. The Rust gate passes.
2. `cargo test -p kitty-stub --test supervised --frozen` passes, and its wall time is recorded.
3. The `version()` and `#[cfg(test)]` anchors in `lib.rs` are intact (`grep -c` gives 1 for each).
4. No `kitty-stub` or `kitty-fake-service` process is left.

## Definition of Done

- The public surface matches `contracts/kitty-core-api.md`.
- The hint table is total and cross-checked against `port.ts`.
- FR-013 is proven at `Core` level.
- Drop semantics, subscription atomicity and runtime handling are proven.
- The panic counter is proven by `panic_probe.rs`.
- The real stub is supervised end to end.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **API drift from the contract.** SC-005 requires #20 and #21 to start with 0 changes. Report any needed deviation as a change request, rather than silently changing the surface.
- **The mutual dev-dependency.** It is verified to build. If Cargo reports a cycle on a newer toolchain, report it instead of restructuring.

## Reviewer Guidance

- Diff the exported surface against `kitty-core-api.md`.
- Run `supervised.rs` yourself.
- Confirm the port strings are read from `port.ts` on disk.

## Owned files, out-of-map edits, gates, red-first, commit rule

**Owned files.** The frontmatter `owned_files` is authoritative, and `lanes.json` `write_scope` is computed from it by the tool. Neither is hand-edited. Stage only owned files and the recorded out-of-map edits below.

**Recorded out-of-map edits** (each one is committed with a plain `git add <path>`, and listed in the hand-off with a one-line rationale):
- `crates/kitty-core/src/lib.rs` (owned by WP04): add the `pub use` re-exports only; `version()` and the `#[cfg(test)]` anchor stay unchanged.
- `crates/kitty-core/src/client.rs` (owned by WP04): add the `Core`-only variants `NotReady(CoreStatus)` and `ContractMismatch(Mismatch)` to the `#[non_exhaustive]` `ReadOutcome` (B1). This comes after WP04.
- `crates/kitty-core/src/sse.rs` (owned by WP05): add the same two variants to the `#[non_exhaustive]` `StreamOpenError` (B1). This comes after WP05.
- `crates/kitty-core/src/bin/kitty-fake-service.rs` (owned by WP08): add the `host` mode arm only (A1).
- `crates/kitty-stub/Cargo.toml` (owned by WP03): add `kitty-core = { path = "../kitty-core" }` to `[dev-dependencies]`.
- `Cargo.lock` (owned by WP01): the dev-dependency edge `kitty-stub` → `kitty-core` (FS-01). No package is added.
- `crates/kitty-core/tests/common/mod.rs` (owned by WP04): only if a `Core` helper is needed (for example `start_core_with(discovery)`); otherwise none.

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
