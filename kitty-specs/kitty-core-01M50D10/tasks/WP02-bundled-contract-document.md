---
work_package_id: WP02
title: 'The bundled contract document and its Gate: contract plant'
dependencies: []
requirement_refs:
- FR-012
- FR-014
- C-005
- C-007
planning_base_branch: feat/kitty-core-19
merge_target_branch: feat/kitty-core-19
branch_strategy: Planning artifacts for this mission were generated on feat/kitty-core-19. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/kitty-core-19 unless the human explicitly redirects the landing branch.
subtasks:
- T005
- T006
- T007
- T008
- T009
- T010
history: []
agent_profile: node-norris
authoritative_surface: scripts/contract/
create_intent:
- scripts/contract/bundle.test.mjs
- contracts/fixtures/mission-status.openapi.json
execution_mode: code_change
model: ''
owned_files:
- scripts/contract/generate.mjs
- scripts/contract/check.mjs
- scripts/contract/check.test.mjs
- scripts/contract/bundle.test.mjs
- contracts/fixtures/mission-status.openapi.json
- .gitattributes
- gates/plants/contract/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - The bundled contract document and its Gate: contract plant (IC-02)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Generate `contracts/fixtures/mission-status.openapi.json`: the pinned contract with every `$ref` inlined. `pnpm contract:generate` writes it, and `Gate: contract` checks it for staleness without masking the other generated files. A plant proves the staleness check is red.

## Context

Read:
- `plan.md`: IC-02, Gates;
- `contracts/bundled-document.md`;
- `research.md`: R-02;
- spec Amendment A-01;
- `reviews/plan.squad.md`: R5-14, R6-06, R6-09, FS-02.

Facts:
- **Generation today.** `generate.mjs` `generateJsonSources(root)` returns the three generated JSON files, and `check.mjs` `checkJsonFresh` compares each one byte for byte (token `stale generated file`).
- **The bundler.** `@apidevtools/json-schema-ref-parser 16.0.3` and `jsonText` are already used.
- **Plan-time trial.** Dereferencing `openapi.yaml` with `circular: false` succeeds and leaves no `$ref`. The result is 634,219 bytes as two-space JSON, and `"version": "1.0.0-SNAPSHOT"` occurs once.
- **The schemas `$ref` their example files** (for example `schemas/StreamRefusal.yaml` → `examples/StreamRefusal.negative.yaml`). Editing or deleting a vendored example, schema or path therefore also makes the bundle stale. That changes two exact-list tests in `check.test.mjs` (T009).
- **The four #17 files stay byte-identical** (SC-004, A-01).
- **The hygiene test is left alone.** `scripts/hygiene/gitattributes.test.mjs` is deliberately **not** changed, because extending it would extend `Gate: hygiene` (R5-14).

## Branch Strategy

- **Planning branch and final merge target:** `feat/kitty-core-19`.
- **Where you work:** in the lane worktree that the tool allocates from `lanes.json`. Lanes are based on `feat/kitty-core-19`.
- **Never** base anything on the coordination branch `kitty/mission-kitty-core-01M50D10`. It carries status and events only.
- **Depends on:** none. Start from the tip the orchestrator prepares, and do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP02 --agent claude --mission kitty-core-01M50D10`.

## Subtasks

### Subtask T005: The bundle emitter

**Purpose**: one deterministic bundled document derived from the pin (FR-012, C-005).

**Steps**:
1. In `generate.mjs`, add `FIXTURE_FILES.openapi = 'contracts/fixtures/mission-status.openapi.json'`.
2. Add `export async function generateBundleSource(root = ROOT)`:
   - `new $RefParser().dereference(join(root, LAYOUT.openapi), { dereference: { circular: false } })`;
   - return `jsonText(doc)`.
3. Do **not** add the bundle to `generateJsonSources`. It stays a separate function, so a dereference failure cannot throw away the three #17 files' results (FS-02).
4. `generateAll` writes the bundle too, and the CLI's `contract:generate: wrote …` line names it.

**Files**: `scripts/contract/generate.mjs` (+~20 lines).
**Validation**: `pnpm contract:generate` twice gives identical bytes.

### Subtask T006: Staleness check with its own try/catch

**Purpose**: a stale or ungeneratable bundle is reported as one bundle-specific problem (FS-02).

**Steps**:
1. In `check.mjs`, next to `checkJsonFresh`, add `checkBundleFresh(root)`:
   - it calls `generateBundleSource(root)` inside its own `try`/`catch`. A thrown error returns exactly one problem with token `TOKENS.jsonStale` and the message `the bundled contract document could not be regenerated: <err.message>`;
   - a missing file gives `${rel} is missing; run pnpm contract:generate`;
   - a byte difference gives `${rel} differs from a fresh generation; run pnpm contract:generate`, exactly as `checkJsonFresh` words it.
2. Call it from the gate's main sequence right after `checkJsonFresh`, and push its problems.
3. The `contract gate: ok (…)` summary line gains `1 bundled document`. Keep the existing counts.

**Files**: `scripts/contract/check.mjs` (+~25 lines).
**Validation**: with a corrupted bundle, `pnpm contract:check` prints `stale generated file: contracts/fixtures/mission-status.openapi.json differs …` and exits 1.

### Subtask T007: Commit the generated bundle and its attribute

**Purpose**: the file the stub and kitty-core embed.

**Steps**:
1. Run `pnpm contract:generate`, and commit `contracts/fixtures/mission-status.openapi.json`.
2. Run `git diff --exit-code` on the four #17 files (`routes`, `examples`, `fixtures`, `changes`): no change.
3. Add to `.gitattributes`, after the routes line: `contracts/fixtures/mission-status.openapi.json text eol=lf linguist-generated=true`.
4. Run `git check-attr text eol linguist-generated -- contracts/fixtures/mission-status.openapi.json` and record the output. This check is manual, not a test (R5-14).

**Files**: the bundle (generated, ~630 KB), `.gitattributes` (+1 line).
**Validation**: `git check-attr` shows `text: set`, `eol: lf`, `linguist-generated: true`.

### Subtask T008: `bundle.test.mjs`

**Purpose**: prove the generator's properties (FR-012).

**Steps**: create `scripts/contract/bundle.test.mjs` (picked up by `test:contract`'s glob) with:
1. **Determinism:** two generations give equal strings.
2. **Inlined:** no key named `$ref` anywhere (a recursive walk counting nodes; assert that the node count is above 0).
3. **Follows the pin:** in a temp copy of the vendored tree (reuse the `tempRepo` pattern of `check.test.mjs`), change one scalar in `schemas/StatusLane.yaml`, and the bundle text differs. A positive control: an untouched copy gives the committed text.
4. **Fails loudly on a cycle:** add a temp schema that references itself, and generation rejects.
5. **R6-09:** no test title and no `console.log` contains the plant token `stale generated file: contracts/fixtures/mission-status.openapi.json differs`. Assert failures through structured values, not by printing that string.

**Files**: `scripts/contract/bundle.test.mjs` (new, ~110 lines).
**Validation**: `pnpm test:contract` passes; each case was red first.

### Subtask T009: Update the contract tests the bundle changes

**Purpose**: keep `check.test.mjs` truthful (FS-02).

**Steps**:
1. Run `pnpm test:contract` after T006. Expected failures:
   - "C1: a deleted vendored file gives file set" (~lines 143–146). Its exact token list gains the bundle problem. With `StreamRefusal.negative.yaml` deleted, the dereference fails, so expect one more `TOKENS.jsonStale`.
   - "JSON staleness: a changed vendored example leaves examples.json stale" (~lines 907–918). It gains the bundle-stale problem. Re-point its `messagesOf(r)[1]` check to the problem that names `StreamRefusal.negative`.
2. Every other test must pass unchanged. In particular, the floor guard, the anchor guard and the three-case JSON loop use filters.
3. List each changed expectation (test name, old list, new list) in the hand-off. NFR-008's "unchanged" covers the stub tests only.

**Files**: `scripts/contract/check.test.mjs`.
**Validation**: `pnpm test:contract` is green, and the count of changed tests is reported.

### Subtask T010: The contract plant

**Purpose**: prove the new check is red (C-007).

**Steps**:
1. Append to `gates/plants/contract/plant.json`:
   ```json
   { "gate": "contract", "ciCommand": "pnpm contract:check && pnpm test:contract",
     "expectFailPattern": "stale generated file: contracts/fixtures/mission-status.openapi.json differs",
     "overlays": [ { "target": "contracts/fixtures/mission-status.openapi.json",
       "edits": [ { "find": "\"version\": \"1.0.0-SNAPSHOT\"", "replace": "\"version\": \"1.0.0-PLANTED\"" } ] } ] }
   ```
2. Verify the find string occurs exactly once in the bundle.
3. Run `heavy node scripts/gate-proof.mjs local --only contract`. The clean run must be green and all 9 plants red with their patterns. Record the leg duration; it is the local proxy for the timeout formula.

**Files**: `gates/plants/contract/plant.json`.
**Validation**: the gate-proof output above.

## Plants

| Gate | Plant | Overlay | `expectFailPattern` |
|---|---|---|---|
| `contract` | stale bundled document | `contracts/fixtures/mission-status.openapi.json`: `"version": "1.0.0-SNAPSHOT"` → `"version": "1.0.0-PLANTED"` | `stale generated file: contracts/fixtures/mission-status.openapi.json differs` |

The contract leg goes from 8 plants to 9. Its timeout is re-derived by WP10 from the PR's first CI run as `max(21, 10 × T + 2)`.

## Exit checks

1. `pnpm contract:generate` is idempotent.
2. `pnpm contract:check && pnpm test:contract` is green.
3. `heavy node scripts/gate-proof.mjs local --only contract`: the clean run is green, and all 9 plants are red with their own patterns. Record the duration.
4. `git diff --exit-code <base> -- contracts/fixtures/mission-status.{routes,examples,fixtures,changes}.json` is empty.
5. `pnpm hygiene && pnpm test:scripts` is green, with `gitattributes.test.mjs` unchanged.

## Definition of Done

- The bundle is generated, committed, LF and marked generated.
- The bundle has its own try/catch check with bundle-specific messages.
- `bundle.test.mjs` passes, and every changed `check.test.mjs` expectation is listed.
- The plant is proven red, and the leg time is recorded.

Per-subtask completion is recorded with `spec-kitty agent tasks mark-status <Txxx> --status done` by the orchestrator. It is event-sourced, not a ticked checkbox.

## Risks

- **A large diff.** The bundle is about 630 KB. It is `linguist-generated`, so reviews fold it.
- **A test printing the token.** That would make the plant vacuous (R6-09). Search the test output for the token on a clean run.
- **Lost results.** Folding the bundle into `generateJsonSources` would reintroduce masking. Keep it separate.

## Reviewer Guidance

- Run the gate-proof contract leg yourself.
- Confirm the four #17 files are byte-identical.
- Read `checkBundleFresh`, and confirm that a thrown dereference error yields exactly one problem while the other files are still checked.

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
- The contract gate is this WP's primary gate. The Rust gate must still pass, because the stub tests read `contracts/fixtures/`.
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
