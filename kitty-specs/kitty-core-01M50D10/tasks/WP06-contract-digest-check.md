---
work_package_id: WP06
title: 'Contract digest check: canonical form, ContractPin, check()'
dependencies:
- WP02
- WP04
requirement_refs:
- FR-011
- FR-012
- FR-013
- NFR-004
- SC-002
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T030
- T031
- T032
- T033
- T034
- T035
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-core/
create_intent:
- crates/kitty-core/src/contract.rs
- crates/kitty-core/tests/contract_check.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-core/src/contract.rs
- crates/kitty-core/tests/contract_check.rs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - Contract digest check: canonical form, ContractPin, check() (IC-06)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Implement the canonical digest and the contract check. `digest_of(bytes)` parses JSON first and falls back to YAML, writes the canonical form with JavaScript number semantics, and hashes it with SHA-256. `ContractPin::embedded()` is built from the generated bundle. `check()` fetches `/api/v1/openapi.yaml` under a 4 MiB cap and fails closed.

## Context

Read:
- `contracts/bundled-document.md` (normative canonical form);
- `data-model.md`: Contract check;
- `plan.md`: IC-06;
- `research.md`: R-03 and R-04 (including the YAML 1.1 correction);
- spec A-09;
- `reviews/plan.squad.md`: R2-10, R3-08, R3-11, R5-06, R5-12, FS round 2 (the R3-08 test).

Facts:
- **The bundle** is `contracts/fixtures/mission-status.openapi.json` (WP02), embedded with `include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/fixtures/mission-status.openapi.json"))`.
- **No digest constant.** The pinned digest is computed once (`OnceLock`), never typed in (FR-012).
- **Not authentication.** The digest is not a trust boundary (R2-01). Say so in the module doc.
- **FR-013 at `Core` level** (no requests after a mismatch) is proven by WP09. This WP proves the client level.

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** WP02, WP04. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP06 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T030: The canonical writer

**Purpose**: one deterministic byte form (R2-10).

**Steps**:
1. `pub fn canonical_json(v: &serde_json::Value) -> Vec<u8>`:
   - objects have keys sorted by UTF-8 bytes;
   - arrays keep their order;
   - strings use `serde_json::to_writer` escaping;
   - `true`, `false` and `null` as is;
   - no whitespace.
2. **Numbers.**
   - Convert to `f64` first (`as_f64()`), as JavaScript does.
   - `-0` becomes `0`.
   - If the value is finite, integral and `|x| ≤ 2^53`, write a decimal integer (`format!("{}", x as i64)`).
   - Otherwise use one formatter: `serde_json::to_string(&x)` of the `f64`.
   - Non-finite values cannot come from JSON or YAML parsing into `Value`. Document that.

**Validation**: unit tests:
- key order permutations give equal bytes;
- `1.0` and `1` agree;
- `-0` and `0` agree;
- `9007199254740993` and `9007199254740992` agree;
- `0.1` stays `0.1`;
- nested arrays keep their order.

### Subtask T031: `digest_of` and `ContractPin`

**Purpose**: FR-011, FR-012 and R3-11.

**Steps**:
1. `pub fn digest_of(bytes: &[u8]) -> Result<Digest, ParseError>`:
   - `serde_json::from_slice::<Value>` first;
   - only on failure, `yaml_serde::from_slice::<Value>`;
   - then `canonical_json`, `sha2::Sha256`, and 64 lowercase hex characters through `Display`.
2. `pub struct ContractPin { document: Cow<'static, [u8]>, digest: OnceLock<Digest> }`, with `ContractPin::embedded()` and `ContractPin::from_document(Vec<u8>)`.
3. `ContractPin::digest()` computes once. An embedded bundle that cannot be parsed is a programming error caught by the tests. Return `Result`, and have `Core::start` map an error to contract-mismatch rather than panic.

**Validation**: T033.

### Subtask T032: `check()` and its outcomes

**Purpose**: FR-011 and A-09.

**Steps**:
1. `ContractClient::check_contract(&self, pin: &ContractPin) -> CheckOutcome` fetches `GET /api/v1/openapi.yaml`, using the request machinery of WP04 with `Accept: application/yaml, application/json`, under a **4 MiB** body cap and the total `read_timeout`.
2. **Outcomes.**
   - 200 with an equal digest is `Match { digest }`.
   - 200 with an unequal digest is `Mismatch { expected, actual: Digest(d) }`.
   - Any other status is `Mismatch { actual: Status { status } }`.
   - A parse failure is `Unparseable { detail }`.
   - A body over 4 MiB is `Transport(BodyTooLarge)`.
   - A refused connection or timeout is `Transport(..)`.
3. **The 503 rule is not here.** The supervisor's polling (WP08) decides what a 503 or a refused connection means while starting. `check_contract` just reports what happened.

### Subtask T033: Digest unit tests

**Steps** (in `contract.rs` `#[cfg(test)]` or `tests/contract_check.rs`):
1. **JSON against YAML.** A small document in JSON flow and in YAML block style gives the same digest.
2. **The real bundle (R5-12).** `digest_of(bundle) == digest_of(yaml_serde::to_string(&parse(bundle)))`.
3. **Inequality.** One changed scalar, one removed key and one added path each change the digest.
4. **Errors.** Garbage bytes are `ParseError`.
5. **Pin follows the file.** `ContractPin::embedded().digest()` equals `digest_of(std::fs::read(<repo>/contracts/fixtures/mission-status.openapi.json))`, read from disk. Editing the bundle in a temp copy changes the digest.

### Subtask T034: Check tests against the stub and the fake (`tests/contract_check.rs`)

**Steps**:
Use the WP04 harness: `stub(StubSpec { document: Doc::Pinned | Doc::Bytes(..) | Doc::Absent, .. })`, `last_request(..)` and `raw_fake(..)`.

1. **SC-002, pass.** The stub with the pinned document gives `Match`.
2. **SC-002, fail.** The stub with a modified document (`info.version` changed) gives `Mismatch`, reporting both digests.
3. **Absent document.** Without a document (404 `no-openapi-document`) the result is `Mismatch { Status { 404 } }`.
4. **Unparseable.** A raw fake serving `{{not yaml` gives `Unparseable`.
5. **Size (R3-08).** A raw fake serving exactly 4 MiB + 1 bytes is refused with `Transport(BodyTooLarge)`. A positive control: exactly 4 MiB of valid padded JSON is parsed. Its digest does not match, which is expected; only the parse is asserted.
6. **No request after a mismatch, client level.** After the mismatch, `/__stub/last-request` still shows the `openapi.yaml` fetch.
7. Every test asserts no panics.

### Subtask T035: Measure the digest cost (R5-06)

**Steps**: before tuning anything, time `digest_of(bundle)` in the dev profile (10 runs: median and maximum) and in release. Record the numbers in the hand-off. The test start timeout of 2 s must leave at least 10× margin over the dev median. If it does not, report a change request against plan IC-08's `Timings` table instead of raising timeouts here.

## Plants

None (tests inside `Gate: rust`).

## Exit checks

1. The Rust gate passes.
2. The digest timings are recorded: dev median, dev maximum and release.
3. `cargo test -p kitty-core --test contract_check` wall time is recorded.

## Definition of Done

- The canonical form matches `bundled-document.md`, including number semantics.
- JSON is parsed first.
- The pin is derived from the file.
- `check()` fails closed with the defined `Actual` values.
- The 4 MiB ± 1 cases are proven.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **`yaml_serde` behaviour on JSON input** is irrelevant, because JSON parses first.
- **A served YAML document's 1.1 quirks** (for example `0o` and `.inf`) surface as mismatch, which is accepted and documented (R-04).

## Reviewer Guidance

- Re-derive the canonical bytes of a 3-key object by hand.
- Confirm `ContractPin::embedded()` reads the bundle with `include_bytes!`, and that no hex constant exists in the crate (`grep -E '[0-9a-f]{64}'`).

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
