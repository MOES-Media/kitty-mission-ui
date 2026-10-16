---
work_package_id: WP04
title: Contract client, read relay and forward()
dependencies:
- WP01
- WP03
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- NFR-004
- NFR-007
- C-004
- SC-001
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T017
- T018
- T019
- T020
- T021
- T022
- T023
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/
create_intent:
- crates/kitty-core/src/routes.rs
- crates/kitty-core/src/endpoint.rs
- crates/kitty-core/src/client.rs
- crates/kitty-core/src/forward.rs
- crates/kitty-core/tests/common/mod.rs
- crates/kitty-core/tests/reads.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-core/src/lib.rs
- crates/kitty-core/src/routes.rs
- crates/kitty-core/src/endpoint.rs
- crates/kitty-core/src/client.rs
- crates/kitty-core/src/forward.rs
- crates/kitty-core/tests/common/**
- crates/kitty-core/tests/reads.rs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP04 - Contract client, read relay and forward() (IC-04)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Build kitty-core's lower layer and its test harness:

- the embedded route table;
- the loopback-only `ServiceEndpoint`;
- the hyper `conn::http1` read relay, which returns status, content type and raw bytes;
- `forward()` and `upstream_request_headers()` for #21;
- the shared test harness: the in-process stub, the raw-TCP fake with its request log, and the panic counter.

It also pre-declares every kitty-core module, so later WPs fill files instead of editing `lib.rs`.

## Context

Read:
- `contracts/kitty-core-api.md`;
- `data-model.md`: Value objects, Read relay;
- `plan.md`: IC-04, Architecture;
- `research.md`: R-01, R-08, R-14;
- `reviews/plan.squad.md`: R2-04, R2-05, R3-07, R3-08, R4-03, R5-01, R5-03, R5-10, R6-04, FS-08.

Facts:
- **Plant anchors.** The rust plants anchor on `crates/kitty-core/src/lib.rs`: the line `    env!("CARGO_PKG_VERSION")\n` inside `pub fn version()`, and exactly one top-level `\n#[cfg(test)]\n`. Both must survive, unique, and `gates/plants/rust/plant.json` is never edited.
- **The route table.** `routes.json` is embedded with `include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/fixtures/mission-status.routes.json"))`.
- **The stub runs in-process** through the dev-dependency: `kitty_stub::{Fixtures, Options, app, run_server}`.
- **`/__stub/last-request` drops the query string**, so query encoding is asserted on the raw-TCP fake's log (R5-01).

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP01, WP03. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP04 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T017: `lib.rs` with every module pre-declared

**Purpose**: one owner for `lib.rs`; later WPs fill their own files (R6-04).

**Steps**:
1. Keep `pub fn version()`, its `env!("CARGO_PKG_VERSION")` line and its single `#[cfg(test)] mod tests` block exactly as they are.
2. Declare `pub mod routes; pub mod endpoint; pub mod client; pub mod forward; pub mod sse; pub mod contract; pub mod discovery; pub mod supervisor; pub mod status; pub mod facade;`. The facade module is **`facade`**, never `core`: a crate-level `core` module would collide with the `core` crate in paths (A13).
3. Create **empty stub files**, each with a one-line `//!` doc naming its owner, for the modules owned by other WPs: `src/sse.rs`, `src/contract.rs`, `src/discovery.rs`, `src/supervisor/mod.rs`, `src/status.rs` and `src/facade.rs`. These are recorded out-of-map creations: the files belong to WP05 to WP09, and WP04 only creates them empty.
4. Re-exports (`pub use …`) are added by WP09 only.

**Validation**: `grep -c 'env!("CARGO_PKG_VERSION")' src/lib.rs` returns 1, and `grep -c '^#\[cfg(test)\]' src/lib.rs` returns 1.

### Subtask T018: The route table and request building (`routes.rs`)

**Purpose**: FR-001 and FR-006.

**Steps**:
1. Parse the embedded `routes.json` once (`OnceLock`) into `RouteEntry { operation_id, path_template, kind, refusals }`. A parse failure is a startup panic in tests only. Production builds embed a gate-checked file, so state the invariant in a doc comment and avoid `unwrap` on request paths.
2. `pub fn read_operations() -> impl Iterator<Item = &'static RouteEntry>` yields the `kind: read` entries.
3. `ReadRequest { operation_id, path: &[(&str, &str)], query: &[(&str, &str)] }`. Building the target:
   - an unknown or non-read operation is `Transport(UnknownOperation)`;
   - an unfilled `{name}` is `Transport(MissingParameter)`;
   - a path value that is empty, `.` or `..`, or that contains `/`, `\` or any control character is `Transport(InvalidParameter)` (R2-04);
   - otherwise percent-encode with an `AsciiSet` of everything except `ALPHA`, `DIGIT`, `-`, `.`, `_` and `~`;
   - query pairs use the same set and keep the caller's order;
   - the target is `/api/v1` + the filled template + `?query`.

**Validation**: unit tests in `routes.rs` for each refusal and for encoding (`a b/c` → `a%20b%2Fc` in a query value).

### Subtask T019: `ServiceEndpoint` (`endpoint.rs`)

**Purpose**: FR-005, loopback only.

**Steps**:
1. `pub struct ServiceEndpoint { port: u16, generation: u64 }`.
2. `ServiceEndpoint::loopback(port)` has generation 0, which is reserved (FS-12).
3. Add a crate-private constructor for the supervisor (`generation ≥ 1`).
4. `TryFrom<SocketAddr>` refuses any IP other than `127.0.0.1`, and port 0, with `EndpointError::NotLoopback` or `EndpointError::ZeroPort`.
5. Accessors: `socket_addr()`, `host_header()` (`"127.0.0.1:<port>"`) and `generation()`.

**Validation**: unit tests for `0.0.0.0`, `127.0.0.2`, `::1`, `192.0.2.1` and port 0, each refused before any socket is opened.

### Subtask T020: The read relay (`client.rs`)

**Purpose**: FR-002, FR-003, FR-004 and NFR-004.

**Steps**:
1. Define `pub struct Timings { poll_interval, start_timeout, stop_grace, read_timeout, idle_limit }` here in `client.rs`, with `Default` set to the production column of plan IC-08 (50 ms, 10 s, 5 s, 30 s, 90 s). It is the one `Timings` type: WP05 and WP08 use it, and WP09 re-exports it. Then `ContractClient::new(endpoint, &Timings)`.
2. `read(&ReadRequest) -> ReadOutcome`, in four steps:
   - `TcpStream::connect(endpoint.socket_addr())`;
   - `hyper::client::conn::http1::handshake(TokioIo::new(stream))`, with the connection task spawned and aborted on drop;
   - a request carrying exactly `Host: 127.0.0.1:<port>` and `Accept: application/json, application/problem+json`;
   - collect the body under a 16 MiB cap.
3. **The whole sequence** runs under one **total** deadline, `read_timeout` (R3-08). Past it, the result is `Transport(Timeout)`.
4. **Every status** becomes `Answer { status, content_type, body }`. A refused connection is `ConnectRefused`, and an over-cap body is `BodyTooLarge { limit }` with no partial body.

**Validation**: T023.

### Subtask T021: `forward()` and `upstream_request_headers()` (`forward.rs`)

**Purpose**: #21's enforced pass-through (R3-07, R4-03, FS-08).

**Steps**:
1. `pub fn upstream_request_headers(&ServiceEndpoint, accept: HeaderValue) -> HeaderMap` returns exactly `Host` and `Accept`.
2. `ContractClient::forward(&self, path_and_query: &str, accept: HeaderValue) -> Result<http::Response<Incoming>, TransportFailure>`:
   - refuses a path that does not start with `/api/v1/` (`InvalidParameter`);
   - `read_timeout` covers connect and the response headers **only**;
   - the body is returned untouched, with no cap and no deadline from kitty-core.

**Validation**: T023, including a stream that outlives `read_timeout`.

### Subtask T022: The shared test harness (`tests/common/mod.rs`)

**Purpose**: every kitty-core integration test uses one harness. Its API is fixed here, so WP05, WP06, WP08 and WP09 can rely on it (A9).

**Steps**:
1. **The stub harness:**
   ```rust
   pub struct FixtureValues { pub routes: Value, pub examples: Value, pub fixtures: Value, pub changes: Value }
   pub enum Doc { Pinned, Bytes(Vec<u8>), Absent }
   pub struct StubSpec {
       pub patch: Option<Box<dyn FnOnce(&mut FixtureValues)>>,   // e.g. add an in-memory `Problem` example (A-08)
       pub document: Doc,                                         // default Pinned (the committed bundle)
       pub selections: Vec<(String, kitty_stub::Selection)>,      // start-up selection
       pub options: kitty_stub::Options,                          // default: heartbeat 50 ms, time scale 0
   }
   impl Default for StubSpec { … }
   pub struct RunningStub { pub port: u16, pub endpoint: ServiceEndpoint, /* abort guard */ }
   pub async fn stub(spec: StubSpec) -> RunningStub;              // in-process, 127.0.0.1:0
   pub async fn last_request(stub: &RunningStub) -> serde_json::Value;  // GET /__stub/last-request
   ```
   - It loads the four JSON files and the bundle from `contracts/fixtures`, applies `patch`, then builds `Fixtures::from_values(..)`, `.with_openapi_document(..)` (unless `Absent`) and `.with_selections(..)`. It runs `run_server` in a task.
   - **What later WPs use.** WP05 needs `patch` (the in-memory `Problem` example), `selections` (the five `StreamRefusal` examples and the 404) and `options` (heartbeat, time scale). WP06 needs `Doc::{Pinned, Bytes, Absent}` and `last_request`.
2. **The raw fake:**
   ```rust
   pub enum Step { Write(Vec<u8>), Sleep(Duration), Stall, Drop, Endless(Vec<u8>) }
   pub struct RawFake { pub port: u16, pub endpoint: ServiceEndpoint, pub log: Arc<Mutex<Vec<RequestHead>>> }
   pub struct RequestHead { pub method: String, pub target: String /* with query */, pub headers: Vec<(String, String)> /* lower-case names */ }
   pub async fn raw_fake(script: Vec<Step>) -> RawFake;           // one scripted reply per connection
   ```
   It is a `tokio` TCP listener on `127.0.0.1:0`. It records every request head in `log`. WP05 uses it for the stream faults, the stream headers and the raw 404. WP06 uses it for the 4 MiB cases. WP08 uses `squatter()` (below).
3. **`panic_counter()`.** A process-wide `AtomicUsize`, incremented by a panic hook chained to the previous hook and installed once (`Once`). `assert_no_panics()` checks it.
4. **Helpers.**
   - `TempDir` (`std::env::temp_dir()` + a unique name; cleaned on drop).
   - `write_scenario(root, launches: &[&str], crash_after_ms: Option<u64>)` for `kitty-fake-service.json` (WP08, WP09).
   - `squatter(port, answer: Option<Vec<u8>>, hold: Option<Duration>) -> SquatterGuard`: listens on a given port and answers at once or after `hold` (WP08).

**Validation**: the harness's own smoke test in `reads.rs`.

### Subtask T023: `tests/reads.rs`

**Purpose**: SC-001 and FR-001 to FR-006.

**Steps**:
1. **Coverage oracle.** Read `routes.json` from disk with `std::fs`, independently of the embedded copy. For each `kind: read` entry, relay through `ContractClient` and through a raw TCP request the test writes itself. Compare status, `content-type` and body bytes. Assert that the loop ran 9 times; a failing operation names itself in the message.
2. **Byte identity.** A raw fake returns a body with `null`, an unknown field and unsorted keys, and the relayed bytes are equal.
3. **Refusals.** A stub selected with `ArtifactRefusal.not-found` relays 404 and its body. A raw fake 503 is relayed as is. Neither retries: the fake's log shows exactly one request.
4. **Headers.** For a read, the fake log shows exactly `host: 127.0.0.1:<port>` and `accept`, and no `origin`, `forwarded`, `x-forwarded-*` or credential header. The stub with a wrong host would answer 403, as a positive control through a raw request.
5. **Loopback.** `TryFrom` refusals (T019) together with the absence of any connection on the raw fake.
6. **Encoding.** A traversal `ArtifactPath` query value and a `wpId` containing `/`: the first is encoded in the fake's log, and the second is `InvalidParameter`, with nothing sent.
7. **Limits.** A body of 16 MiB + 1 is `BodyTooLarge`, with no partial bytes. A stalled body is `Timeout` at `read_timeout` = 1 s (total deadline).
8. **`forward()`.** A raw fake streaming one frame every 300 ms for 1.5 s, with `read_timeout` = 1 s: every frame arrives through `forward()`.
9. Every test calls `assert_no_panics()`.

**Validation**: the Rust gate, and the wall time of `cargo test -p kitty-core --test reads`.

## Plants

None. These are tests inside `Gate: rust` (C-007). The three existing rust plants must still fire: their anchors in `lib.rs` are preserved (T017).

## Exit checks

1. The Rust gate passes.
2. `heavy node scripts/gate-proof.mjs local --only rust`: the clean run is green, and all 3 rust plants are red with their patterns. Record the leg duration and the gate time T (the formula `4 × T + 2`).
3. `cargo test -p kitty-core --frozen` wall time is recorded.

## Definition of Done

- The route table, endpoint, read relay and `forward()` behave as in the API contract and the data model.
- Every module is pre-declared.
- The harness serves WP05 to WP09.
- The plant anchors are intact.
- `reads.rs` covers all nine reads against an independent oracle.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **A pool or connector.** Do not use `hyper-util`'s legacy client: decision `01M50HVQZBYA7M58WD1ABFMF8K` chose `conn::http1`.
- **`Timings` ownership.** This WP defines the full `Timings` type with its production defaults. WP08 writes the default-values test, and must not redefine the type.

## Reviewer Guidance

- Check the plant anchors with `grep -c`.
- Confirm the coverage test reads `routes.json` from disk.
- Run `forward()`'s long-stream test.

## Owned files, out-of-map edits, gates, red-first, commit rule

**Owned files.** The frontmatter `owned_files` is authoritative, and `lanes.json` `write_scope` is computed from it by the tool. Neither is hand-edited. Stage only owned files and the recorded out-of-map edits below.

**Recorded out-of-map edits** (each one is committed with a plain `git add <path>`, and listed in the hand-off with a one-line rationale):
- `crates/kitty-core/src/{sse,contract,discovery,status,facade}.rs` and `crates/kitty-core/src/supervisor/mod.rs`: create each as an empty stub file with a one-line `//!` owner doc, so later WPs fill rather than edit `lib.rs` (R6-04). The owning WPs replace the content.
- `Cargo.lock`: the dev-dependency edge `kitty-core` → `kitty-stub` (FS-01). It normally already exists from WP01's manifest; record it if it changes.

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
