---
work_package_id: WP03
title: 'kitty-stub extensions: contract route, start-up selection, upstream launch options'
dependencies:
- WP02
requirement_refs:
- FR-014
- FR-015
- C-008
- NFR-008
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-kitty-core-01M50D10
base_commit: e229be830fdacb8f0026bd40f64117e94ea6434a
created_at: '2026-10-16T12:17:39.534681+00:00'
subtasks:
- T011
- T012
- T013
- T014
- T015
- T016
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-stub/
create_intent:
- crates/kitty-stub/tests/openapi.rs
- crates/kitty-stub/tests/select.rs
- crates/kitty-stub/tests/upstream_flags.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-stub/Cargo.toml
- crates/kitty-stub/src/**
- crates/kitty-stub/tests/openapi.rs
- crates/kitty-stub/tests/select.rs
- crates/kitty-stub/tests/upstream_flags.rs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - kitty-stub extensions: contract route, start-up selection, upstream launch options (IC-03)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Extend `kitty-stub` with five things, so that kitty-core's digest check can be tested to pass and to fail, scenarios can be chosen without test-only headers, and `Core` can supervise the stub like the real service:

- `GET /api/v1/openapi.yaml`;
- `--openapi <file>`;
- `--select` and `--select-fixture`;
- `--mission-status.port=<n>` and `--mission-status.project-root=<dir>`;
- a fixtures default.

Every #17 stub test passes unchanged (NFR-008).

## Context

Read:
- `contracts/stub-http-delta.md` (normative), together with #17's `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/stub-http.md`;
- `plan.md`: IC-03;
- spec Amendments A-07 and A-08;
- `reviews/plan.squad.md`: R4-01, R4-07, FS-09, FS-10.

Facts:
- **Existing structure.**
  - `crates/kitty-stub/src/lib.rs` has `Fixtures::{load, from_values}`, `Options { port, heartbeat, time_scale }` (built by struct literal in `tests/common/mod.rs`, so **no field may be added**), `app()` and `run_server()`.
  - `serve()` implements the header selection rule.
  - `main.rs` parses arguments by hand and exits 2 on usage errors. It installs signal handlers before `listening` and builds the router before `listening`.
- **The default document** is the bundle from WP02: `<fixtures>/mission-status.openapi.json`.
- **No `Problem` entry exists** in `examples.json` or `fixtures.json` (A-08). On `streamEvents`, only the five `StreamRefusal` examples are selectable from the committed files.
- **`crates/kitty-stub/Cargo.toml` is owned here.** WP09 will add `kitty-core = { path = "../kitty-core" }` to its `[dev-dependencies]` as a recorded out-of-map edit. Do not add it here.

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP02. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP03 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T011: The contract-document route (library)

**Purpose**: serve the document byte for byte under the existing guard (FR-014).

**Steps**:
1. Add a private `openapi: Option<Bytes>` to `Fixtures`, and `pub fn with_openapi_document(mut self, doc: Bytes) -> Self`.
2. In `app()`, register `GET /api/v1/openapi.yaml` through `get_only`, inside the same `record` and `guard` layers:
   - with a document: `200`, `content-type: application/yaml`, the bytes unchanged;
   - without one: `404 {"code":"no-openapi-document"}`.
3. At load (`from_values`), refuse a `routes.json` entry whose path is `/openapi.yaml`, with the conflict error used for duplicate templates.

**Files**: `src/lib.rs` (+~40 lines).
**Validation**: T015's `openapi.rs`.

### Subtask T012: Start-up selection (library)

**Purpose**: choose a scenario without headers (FR-015).

**Steps**:
1. Add `pub enum Selection { Example(String), Fixture(String) }` and `pub fn with_selections(self, sel: Vec<(String, Selection)>) -> Result<Self, String>`.
2. Validate each selection with the header rule:
   - the operation exists;
   - the entry exists;
   - the schema equals `responseSchema`, or is a refusal schema whose own `status` is allowed.
3. A duplicate operation is an error.
4. In `serve()`, the order is: the fixture header, then the example header, then the start-up selection, then the default (or the stream on `streamEvents`).

**Files**: `src/lib.rs` (+~60 lines).
**Validation**: T015's `select.rs`.

### Subtask T013: CLI for `--openapi`, `--select` and `--select-fixture`

**Purpose**: the binary surface (FR-014, FR-015, R4-07).

**Steps**:
1. Parse `--openapi <file>`, and the repeatable `--select <op>=<Schema.name>` and `--select-fixture <op>=<name>`. A malformed `op=name` is exit 2 with `USAGE`.
2. **Pinned load order:** arguments, then `Fixtures::load`, then `with_selections` (an error is exit 2), then the document, then signal handlers, bind, router and `listening`.
3. **The document.**
   - An explicit `--openapi` that cannot be read is exit 1, naming only the file's base name.
   - A missing default `<fixtures>/mission-status.openapi.json` is not an error: the route serves 404.
4. Update the module doc and `USAGE`.

**Files**: `src/main.rs` (+~60 lines).
**Validation**: T015's binary cases.

### Subtask T014: The upstream launch options and the fixtures default

**Purpose**: make the stub a service that `Core` can supervise (A-07, decision `01M50M47K1PNKP9KHCGGDBQZ0A`, FS-10).

**Steps**:
1. Accept `--mission-status.port=<n>` (the `=` form only), with the same meaning as `--port`. Giving both is exit 2.
2. Accept `--mission-status.project-root=<dir>`.
3. **The fixtures directory** is the first of these that applies:
   1. `--fixtures`;
   2. `<project-root>/.kitty-stub/fixtures`, when it is a directory;
   3. `concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/fixtures")`, compiled in.

   `--fixtures` is now optional.
4. **Never print the resolved fixtures path** (FS-09). `listening <addr>` is unchanged, and load errors name only the file's base name, not its directory. Check the existing error strings from `Fixtures::load`, which today print `path.display()`. Wrap them in `main.rs`, rather than changing what the library returns to existing tests.

**Files**: `src/main.rs` (+~40 lines).
**Validation**: T015's `upstream_flags.rs`.

### Subtask T015: New stub tests

**Purpose**: prove T011 to T014 without touching the #17 test files.

**Steps**:
1. **`tests/openapi.rs`** (in-process and binary):
   - the route serves the exact bytes of the committed bundle, with `application/yaml`;
   - a wrong `Host`, an `Origin` from elsewhere and a `Forwarded` header each get 403;
   - `POST` gets 405;
   - without a document, 404 `no-openapi-document`;
   - `--openapi <modified file>` serves the modified bytes;
   - an explicit unreadable file is exit 1, with stderr free of the directory path;
   - a missing default serves 404.
2. **`tests/select.rs`**:
   - each of the five `StreamRefusal` examples selected on `streamEvents` at start-up is served with its own status, with no headers (assert that equality runs 5 times);
   - `--select getArtifactContent=ArtifactRefusal.not-found` is served as 404 `application/problem+json`;
   - a header overrides a start-up selection;
   - an unknown op, an unknown entry, a schema mismatch and a duplicate each exit 2 before `listening` (no `listening` line on stdout);
   - library form: `with_selections` returns `Err` for the same four cases.
3. **`tests/upstream_flags.rs`**:
   - `--mission-status.port=0 --mission-status.project-root=<temp>` with no `--fixtures` serves the workspace fixtures and the bundle;
   - a `<temp>/.kitty-stub/fixtures` copy wins over the workspace fixtures (alter one example's title in the copy and observe it);
   - `--port` together with `--mission-status.port` exits 2;
   - stdout and stderr never contain the temp dir's path.

**Files**: three new test files (~250 lines in total).
**Validation**: the Rust gate passes, and each test was red first.

### Subtask T016: Documentation in the crate

**Purpose**: C-008, which requires the new route and options to be documented.

**Steps**: update the `lib.rs` and `main.rs` module docs to point at both `stub-http.md` (#17) and this mission's `contracts/stub-http-delta.md`. List the options and the fixtures-directory order.

**Files**: module docs only.

## Plants

None. These are new tests inside `Gate: rust`, which C-007 exempts.

## Exit checks

1. The Rust gate passes. Every #17 stub test file (`routes.rs`, `events.rs`, `guard.rs`, `binary.rs`, `common/mod.rs`) is byte-identical to the base, which `git diff --exit-code <base> -- <those files>` confirms.
2. `cargo test -p kitty-stub --frozen` wall time is recorded.
3. No `kitty-stub` process is left running (check with `pgrep -x kitty-stub` after the run; do not pattern-kill).

## Definition of Done

- The route, the builders and all five options behave as in `stub-http-delta.md`.
- The load order is pinned.
- The fixtures default is `.kitty-stub/fixtures`, then the compiled-in path.
- No path is printed.
- `Options`, `app`, `load` and `from_values` signatures are unchanged.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **`--port` defaulting to 0.** The existing default stays. `--mission-status.port` only adds a spelling.
- **Error strings that already contain paths.** Do not change library error text that #17 tests assert. Re-word only in `main.rs`.

## Reviewer Guidance

- Diff the #17 test files: they must be unchanged.
- Run `upstream_flags.rs`, and grep its captured output for the temp path.

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
