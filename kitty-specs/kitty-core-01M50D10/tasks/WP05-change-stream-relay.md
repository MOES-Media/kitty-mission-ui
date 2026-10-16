---
work_package_id: WP05
title: 'Change-stream relay: SSE frame reader and ChangeStream'
dependencies:
- WP04
requirement_refs:
- FR-007
- FR-008
- FR-009
- FR-010
- NFR-003
- NFR-004
- C-003
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T024
- T025
- T026
- T027
- T028
- T029
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/
create_intent:
- crates/kitty-core/src/sse.rs
- crates/kitty-core/tests/stream.rs
- crates/kitty-core/tests/latency.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-core/src/sse.rs
- crates/kitty-core/tests/stream.rs
- crates/kitty-core/tests/latency.rs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP05 - Change-stream relay: SSE frame reader and ChangeStream (IC-05)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Relay `GET /api/v1/events` as raw changes, in order. Each change carries the event name, the cursor from the `id:` line, and the data bytes unchanged. A stream yields exactly one terminal outcome (`Refused` or `Unavailable`), never reconnects, never stores a cursor, and never emits `resync`.

## Context

Read:
- `data-model.md`: Change stream;
- `contracts/kitty-core-api.md`;
- `plan.md`: IC-05;
- #17's `stub-http.md` ("Events", "Resume");
- `contracts/spec-kitty/mission-status/paths/events.yaml`;
- `reviews/plan.squad.md`: R1-01, R1-04, R2-06, R2-12, R2-13, R3-08, R5-09, R5-15, FS-13, FS-14, FS2-04.

Facts:
- **Frame format.** The stub writes `event:`, `id:` (only on scoped, non-`log-truncated` items), one `data:` line and a blank line. Heartbeats are `: heartbeat\n\n`.
- **Event names.** There are exactly three: `status-transition`, `mission-lifecycle` and `log-truncated`.
- **Declared refusals.** The `refusals` for `streamEvents` in `routes.json` are `{ Problem: [404], StreamRefusal: [400, 409] }`.
- **Not ours.** Reconnect, cursor bookkeeping and `resync` belong to the adapters (C-003).

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP04. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP05 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T024: The pure `FrameReader`

**Purpose**: a byte-fed SSE parser with no I/O (R2-06, FS-13).

**Steps**:
1. `FrameReader::feed(&mut self, bytes: &[u8]) -> Result<Vec<Frame>, FrameError>`, where `Frame { event: Option<String>, id: IdField, data: Vec<u8> }`.
2. **Rules.**
   - Line ends are LF, CR or CRLF, including a CRLF split across feeds.
   - A BOM is honoured only at the very start, including when split across feeds.
   - `field:value` strips one optional space after the colon; a bare `data` (no colon) is empty data.
   - Several `data:` lines join with `\n`.
   - `id:` handling: an empty value clears the cursor, a value containing NUL is ignored, and with several `id:` lines in one frame the last one wins.
   - `retry:` and unknown fields are ignored; comment lines are ignored.
   - A blank line is an **event boundary**: it dispatches the frame if there is data, and otherwise dispatches nothing.
3. **The cap.** 1 MiB counted from the **last event boundary** (FS-13). This counts all bytes since it, including a pending line with no newline and comment lines. Over the cap is `FrameError::TooLarge`.
4. **UTF-8.** Invalid UTF-8 in a line is `FrameError::Malformed`. The checks run in order: cap, then UTF-8, then field parsing.

**Validation**: unit tests, every case fed **byte by byte and whole**:
- split CRLF;
- split BOM;
- a 1 MiB + 1 line with no newline (`TooLarge`);
- 100,000 heartbeat frames (more than 1 MiB in total), which must **not** trip the cap;
- bare `data`;
- several `data:` lines;
- several `id:` lines (the last wins);
- an empty `id:`;
- an `id` containing NUL;
- invalid UTF-8.

### Subtask T025: Opening a stream (`open_stream`)

**Purpose**: FR-008 and FR-009 (R1-04, R2-12).

**Steps**:
1. `ContractClient::open_stream(scope) -> Result<ChangeStream, StreamOpenError>`.
2. Refuse before any I/O:
   - `CursorWithoutMission` when a cursor comes with an empty mission;
   - `EmptyMission` when a `Mission` scope has an empty id and no cursor.
3. Send `GET /api/v1/events?missionId=<enc>[&streamCursor=<enc>]` with exactly `Host` and `Accept: text/event-stream`. Never send `Last-Event-ID`.
4. **The first answer.**
   - **200 + `text/event-stream`:** stream.
   - **A status declared in `refusals` (400, 404, 409):** one `Refused { status, content_type, body }`, then `None`.
   - **Any other status, or a 200 with no or non-SSE content type:** `Unavailable { reason: Status, status, body }`.
5. **Terminal bodies** are read under the 16 MiB cap and `read_timeout` (FS-14, FS2-04). Over the cap is `Unavailable { reason: BodyTooLarge { limit } }`, with no body. Past the deadline is `Unavailable { reason: Timeout }`.

**Validation**: T027 and T028.

### Subtask T026: `ChangeStream::next()`

**Purpose**: FR-007 and FR-010 (R2-13).

**Steps**:
1. `next()` yields:
   - `Change(RawChange { event, cursor, data })` for the three known names;
   - `Diagnostic(UnknownEvent)` for any other name;
   - a terminal `Unavailable` for `Dropped` (clean EOF or reset), `Idle { limit }` (no byte within `idle_limit`, with every byte resetting it), `MalformedFrame`, `MalformedData` (joined data not one JSON value, checked with `serde_json::from_slice::<IgnoredAny>`) and `FrameTooLarge`.
2. After a terminal item the stream is fused: `None` forever.
3. **Cancel-safe.** The buffered bytes and the parser live in the struct, so dropping a `next()` future loses nothing. `ChangeStream: Send + 'static`, which a compile-time assertion checks.
4. **Nothing interpreted.** No interpretation, no kind filter (only unknown names become diagnostics), no reconnect and no stored cursor.

### Subtask T027: Stream tests against the stub (`tests/stream.rs`, part 1)

**Steps**:
1. **Scoped.** The changes equal `changes.json` item by item: event, `scopedId` as cursor, and data bytes (and JSON-value-equal to `data`). Assert N = 5.
2. **Unscoped.** Every cursor is `None`.
3. **`log-truncated`.** It arrives as its own kind, with no cursor.
4. **Resume.** A scoped stream with `cursor` = item 2's `scopedId` relays only items 3 to 5. Assert that `streamCursor` appears in the target: use the raw fake's log, because the stub drops the query.
5. **Refusals.** The five `StreamRefusal` examples are selected with `with_selections`: each gives exactly one `Refused` with its own status, then `None` (assert 5 iterations).
6. **The 404 `Problem` (A-08).** Patch the in-memory examples with one `Problem` example (status 404) through the harness, and select it. It gives one `Refused { status: 404 }`.
7. **Heartbeats** are never relayed: the stub at heartbeat 50 ms, time scale 0.
8. **Nothing sent.** `CursorWithoutMission` and `EmptyMission`: the raw fake's log is empty. A positive control: a valid scope sends one request.

### Subtask T028: Stream fault tests on the raw fake (`tests/stream.rs`, part 2)

**Steps**: each case gives exactly one terminal item and then `None`:
- 503 at open is `Unavailable(Status)`, with the body;
- a drop mid-stream is `Dropped`;
- a clean EOF is `Dropped`;
- **idle:** heartbeats every 100 ms keep a 300 ms-idle stream alive for 600 ms, then a stall gives `Idle` (R5-09);
- malformed UTF-8 is `MalformedFrame`;
- non-JSON data is `MalformedData`;
- a 1 MiB + 1 frame is `FrameTooLarge`, with nothing partial relayed;
- an unknown event name is a `Diagnostic`, and the stream continues to the next change;
- a 200 with `content-type: text/plain` is `Unavailable(Status)`;
- a 409 with a never-ending body is `Unavailable(Timeout)`, and a 409 with a 16 MiB + 1 body is `Unavailable(BodyTooLarge)` (FS2-04).

### Subtask T029: NFR-003 latency measurement (`tests/latency.rs`, `#[ignore]`)

**Purpose**: the evidence for NFR-003 (R5-15). This is not a gate.

**Steps**:
1. The raw fake writes 200 `status-transition` frames, one every 5 ms, and records an `Instant` right after each frame's last byte is flushed.
2. The consumer records an `Instant` when `next()` returns that change.
3. Latency is the receipt instant minus the flush instant. Report p50, p95 and the maximum.
4. Run `cargo test -p kitty-core --test latency -- --ignored --nocapture` in debug and in release (`heavy` for release), and record the numbers for WP10.

## Plants

None (tests inside `Gate: rust`).

## Exit checks

1. The Rust gate passes.
2. `cargo test -p kitty-core --test stream` wall time is recorded. Each real wait is 1 s or less.
3. The NFR-003 numbers are recorded, for debug and release.

## Definition of Done

- `FrameReader` covers every listed edge case, fed byte by byte and whole.
- `open_stream` refuses before I/O with `Err`.
- Terminal outcomes and terminal bodies follow the data model, including `BodyTooLarge` and `Timeout`.
- The 404 `Problem` refusal and the five `StreamRefusal` examples are proven.
- The latency evidence is recorded.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **Timing flakiness** in the idle tests. Use generous ratios (100 ms against 300 ms), and never sleep where a channel can signal.
- **Duplicated SSE parsing** with #21. #21 parses in the browser. This reader is Rust-only, and that is accepted.

## Reviewer Guidance

- Read the byte-by-byte feeding loop.
- Confirm the many-heartbeats test exceeds 1 MiB in total.
- Confirm the `streamCursor` assertion uses the raw fake's log.

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
