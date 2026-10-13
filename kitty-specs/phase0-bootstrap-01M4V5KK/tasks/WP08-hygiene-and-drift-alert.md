---
work_package_id: WP08
title: Workflow and Cargo hygiene, and the scheduled contract drift alert
dependencies:
- WP01
- WP02
requirement_refs:
- C-003
- C-004
- FR-012
- NFR-001
- NFR-003
- SC-002
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
subtasks:
- T043
- T044
- T045
- T046
- T047
- T048
history: []
agent_profile: node-norris
authoritative_surface: scripts/hygiene/
create_intent:
- scripts/contract/drift.mjs
- scripts/contract/drift.test.mjs
- .github/workflows/contract-drift.yml
- scripts/hygiene/cargo-pins.mjs
- scripts/hygiene/cargo-pins.test.mjs
execution_mode: code_change
model: ''
owned_files:
- scripts/check-hygiene.mjs
- scripts/hygiene/**
- gates/plants/hygiene/**
- scripts/contract/common.mjs
- scripts/contract/drift.mjs
- scripts/contract/drift.test.mjs
- .github/workflows/contract-drift.yml
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP08 - Workflow and Cargo hygiene, and the scheduled contract drift alert (IC-07)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Do three things:
1. Close the hygiene gaps the squad found: the action-pin, `permissions` and checkout-credential checks apply to **every** workflow file, not only `ci.yml` (F-27); and Cargo requirements must be exact `=x.y.z` (F-09).
2. Add the scheduled, non-gate contract drift alert (FR-012). It reports the upstream contract files that differ from `PIN.json`, reuses the existing fetch path, and needs no install and no secrets.
3. Prove both hygiene rules with planted defects (SC-002).

## Context

Read:
- `research.md`: R-08;
- `plan.md`: IC-07;
- `reviews/plan.squad.md`: F-13, F-23, F-27, F-33, F-39, F-41, R2-07, R2-15, R3-03, R4-05.

Repository facts:
- **`scripts/check-hygiene.mjs:95-110`:** for every workflow file it runs `checkWorkflowTriggers`; for `ci.yml` only, it runs `checkWorkflow` (the gate structure plus action pins, `permissions`, `persist-credentials`, `continue-on-error`, `upload-artifact` retention); for other files only `checkGateJobNames`. The rules live in `scripts/hygiene/rules.mjs`, with tests in `scripts/hygiene/hygiene.test.mjs`. `test:scripts` already runs the whole `scripts/hygiene` directory, so new tests there need no `package.json` edit (F-46).
- **`scripts/contract/remote.mjs`:** `fetchRef(ref)` uses `git fetch --depth 1` with Node built-ins only. It honours `CONTRACT_REMOTE_URL` for tests, and `.contractFiles()` returns exactly the files under `UPSTREAM_PATHS`, keyed relative to `contracts/` like `PIN.json` `files`.
- **`scripts/contract/common.mjs`** has `sha256`, `readPin` and `UPSTREAM_PATHS`. `verify-remote.mjs` keeps its own per-prefix check unchanged.
- **The repository is public.** GitHub disables scheduled workflows after 60 days without repository activity (F-39). WP09 documents that in the README.
- **The root `contract:drift` script** was pre-added by WP02. `Cargo.toml` exists from WP01.

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: WP01, WP02. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP08 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T043 Split the hygiene workflow checks

**Steps** (red first in `scripts/hygiene/hygiene.test.mjs`):
1. In `rules.mjs`, split `checkWorkflow` into two functions:
   - `checkWorkflowSecurity`: action SHA pins, image digests, `permissions` present and least-privilege, checkout `persist-credentials: false`, no `continue-on-error`, `upload-artifact` `retention-days: 1`;
   - `checkGateStructure`: job ids, proof matrix, plants, `all.needs`, timeouts.
   `checkWorkflow` stays as the composition of the two, so `ci.yml` behaviour is unchanged.
2. In `check-hygiene.mjs`, run `checkWorkflowSecurity` on **every** workflow file. `checkGateStructure` stays `ci.yml`-only. `checkWorkflowTriggers` and `checkGateJobNames` are unchanged.
3. Tests:
   - a non-ci workflow with an unpinned `uses: actions/checkout@v4` is reported;
   - one without `permissions` is reported;
   - one with `persist-credentials` missing is reported;
   - each has a positive control (the corrected file is clean);
   - `ci.yml` findings are unchanged: snapshot the finding list before and after, with equality.
4. If WP01 sent a change request about the install action on the `rust` job, handle it here and record the outcome.

### T044 The Cargo exact-pin check (F-09, NFR-003)

1. Write `scripts/hygiene/cargo-pins.mjs`. It parses the root `Cargo.toml` `[workspace.dependencies]` and every member `Cargo.toml` `[dependencies]`, `[dev-dependencies]` and `[build-dependencies]` with a small TOML-subset parser (no new dependency).
2. It reports any version requirement that is not `=x.y.z`. Accepted forms are `name = "=1.2.3"` and `{ version = "=1.2.3", … }`; `{ workspace = true }` is allowed in members.
3. Call it from `check-hygiene.mjs`, guarded by "Cargo.toml exists".
4. Tests in `scripts/hygiene/cargo-pins.test.mjs` cover these cases: a caret `"0.8"`, a `"^1"`, a `"~1.2"`, a `">=1"`, a `"*"` and a git dependency are reported; `"=1.2.3"`, an inline table with `=`, and `workspace = true` are clean. Every case is asserted with equality.

### T045 The drift script, reusing what exists (FR-012, F-23, R2-07, R3-03, R4-05)

1. In `common.mjs`, add `comparePinnedFiles(pinFiles, fetchedFiles)`. It returns `{ added, removed, changed }`, each a sorted array of `contracts/`-relative paths, comparing `sha256` with `PIN.json` `files[*].sha256`. Node built-ins only.
2. Write `drift.mjs`:
   - `fetchRef('HEAD')` from `remote.mjs` (upstream `main`), then `.contractFiles()` (scoped to `UPSTREAM_PATHS`), then `comparePinnedFiles`;
   - exit codes: `0` in sync; `1` drift (files listed per category); `2` upstream unreachable (a git fetch or network failure, detected specifically); `3` any other error;
   - output: a Markdown summary to stdout, and also to `$GITHUB_STEP_SUMMARY` when set, written to the file and never interpolated into a shell command.
   - The import graph must be built-ins plus `common.mjs` and `remote.mjs` only. Verify with `node --input-type=module -e` and a scan of its imports, and record the graph. No `yaml`, no `openapi-typescript` (F-41).
3. Tests in `drift.test.mjs` (picked up by the `test:contract` glob, so they must be offline). Build local git repositories in a temp directory and point `CONTRACT_REMOTE_URL` at them for four cases:
   - identical (exit 0);
   - one file changed plus one added (exit 1, exact lists);
   - a URL that does not exist (exit 2);
   - a malformed PIN (exit 3).
   Assert each exit code and output with equality.

### T046 The scheduled workflow (F-33, F-39, F-41, R2-15)

Create `.github/workflows/contract-drift.yml`:
- `on: schedule` (daily, for example `cron: '17 5 * * *'`) plus `workflow_dispatch`;
- `permissions: contents: read`;
- one job, `drift`, with `name: 'Contract drift'` (never "Gate:"), `runs-on: ubuntu-24.04` and `timeout-minutes: 5`;
- steps:
  1. checkout, SHA-pinned, with `persist-credentials: false`;
  2. `actions/setup-node`, SHA-pinned (the same SHA as `ci.yml`), with `node-version: 22.22.2`;
  3. `node scripts/contract/drift.mjs`.
- No install, no secrets, and no `${{ }}` expression containing upstream data in any `run:`.
- A drift or unreachable result fails the job (red), so GitHub notifies.

`pnpm hygiene` must be clean on it with the new all-workflow security checks.

### T047 Two hygiene plants (SC-002)

Append to `gates/plants/hygiene/plant.json` (`ciCommand` equal to the hygiene gate step):
1. **Caret Cargo requirement**: an `edits` overlay on `crates/kitty-core/Cargo.toml` adding `[dependencies] plant-caret-pin = "0.1"`. The parse-only hygiene check does not build. `expectFailPattern`: `plant-caret-pin`.
2. **Unpinned action in a non-ci workflow**: an `edits` overlay on `.github/workflows/contract-drift.yml` replacing the checkout SHA with `@v4` plus a `# plant-unpinned-action` comment. `expectFailPattern`: the rule's message, or `contract-drift.yml` combined with the pin rule id. It must be specific to that rule.

Run `node scripts/gate-proof.mjs local --only hygiene`, and record each plant red and the clean leg green, with timing.

### T048 Exit checks

1. Run every gate, including the Rust gate, because the cargo-pins check reads the same `Cargo.toml`.
2. Run `node scripts/contract/drift.mjs` once for real against upstream (network is allowed on a developer machine, outside the gates), and record the exit code and summary.
3. Record the hygiene proof-leg duration for WP09.

## Test strategy

Node tests under `scripts/hygiene` and `scripts/contract` (all offline), plus two hygiene plants. `gate-proof local --only hygiene` runs here.

## Definition of Done

- **Workflow security:** the checks (pins, permissions, credentials, continue-on-error, retention) run on every workflow file; `ci.yml` findings are unchanged (snapshot equality); tests have positive controls.
- **Cargo pins:** non-exact Cargo requirements are reported (six negative and three positive cases).
- **Drift:** `drift.mjs` reuses `remote.mjs` `contractFiles()` and the new `common.mjs` per-file compare; exit codes are 0, 1, 2 and 3; its import graph is built-in-only; four offline tests cover the outcomes.
- **Workflow:** `contract-drift.yml` is scheduled plus dispatch, has read-only permissions, uses no install and no secrets, runs on pinned Node 22.22.2, and fails red on drift or unreachable.
- **Plants and the real run:** two hygiene plants, each red on its own pattern. One real drift run is recorded.

## Risks

- **Changing `ci.yml` behaviour:** splitting `checkWorkflow` must not change it; the snapshot test guards that.
- **"Unreachable" versus "error":** detect the git fetch failure class explicitly. Do not map every error to 2.

## Reviewer guidance

- **Tests offline:** the drift test must use local repos only (look for network calls).
- **Import graph:** check that `drift.mjs` imports only built-ins, `common.mjs` and `remote.mjs`.
- **Plants:** run both hygiene plants.
- **Workflow:** check `contract-drift.yml` against the hygiene rules by hand too.

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file you do not own is changed ONLY where this prompt says so, as a **recorded out-of-map edit**: you commit it with a plain `git add <path>` and `git commit`, and list it in the hand-off with a one-line rationale. A change you need in a file you do not own, and that this prompt does not name, is a **change request** in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`, `contracts/fixtures/*.json` except `mission-status.changes.json`, `packages/mission-shell/src/generated/elements.d.ts`) are never edited by hand: regenerate them.

Shared-file owners (from `plan.md`, "Shared-file ownership"):

| File | Owning WP |
|---|---|
| `.github/workflows/ci.yml`, root `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.gitignore`, `gates/plants/rust/**` | WP01 |
| root `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `eslint.no-io.config.mjs`, `eslint.data-driven.config.mjs`, `gates/plants/typecheck/**`, `gates/plants/eslint/**`, `gates/plants/no-io/**` | WP02 |
| `scripts/contract/{generate,check,registry}.mjs` and their tests, `contracts/fixtures/**`, `gates/plants/contract/**` | WP03 |
| `gates/plants/manifest/**`, `scripts/typings.mjs` | WP04 |
| `gates/plants/unit-tests/**` | WP06 |
| `scripts/check-hygiene.mjs`, `scripts/hygiene/**`, `gates/plants/hygiene/**`, `scripts/contract/{common,drift}.mjs` | WP08 |
| `README.md`, `CHANGELOG.md` | WP09 |

**Gates this work package must pass before hand-off.** Each must exit 0, with the reporter's pass count above 0 and fail 0 where a reporter exists. Run them from the lane worktree root, after confirming `git rev-parse --show-toplevel` is that worktree.
- TypeScript and repository gates: `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene && pnpm test:scripts && pnpm test:terminology`, `pnpm contract:check && pnpm test:contract`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm test`, `pnpm build-storybook`.
- From WP01 on, the Rust gate, preceded by its two install steps: `rustup toolchain install` then `cargo fetch --locked`, then exactly:
  ```
  cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
  ```
- If WP01 is not in this lane's history yet, the Rust gate is not applicable; say so.
- `pnpm visual` and `node scripts/gate-proof.mjs local` are run only where this prompt's "Test strategy" says so.
- If a script name differs on the build base, use the name the base provides and say so.

**Red-first rule.** For every behaviour, plant and gate case:
1. Write the failing test, the plant or the negative case FIRST.
2. Run it and see it fail for the right reason. Record the failing line in the hand-off.
3. Only then implement.

Per test file, make one deliberate revert of the behaviour (a temporary local edit, never committed) that produces a named failing test, then restore it. List it in the hand-off as the revert check; the reviewer re-runs two of them.

**Test-quality rules (binding).**
1. Counts are asserted with equality, never "at least". Every loop over fixtures, routes, events or examples asserts it ran the expected N times, so an empty loop fails.
2. Every "absent", "refused" or "no event" assertion is paired with a positive control on the same fixture or target, where the thing IS present, accepted or emitted.
3. A test that compares against an oracle must read the oracle from an independent source (the vendored YAML, `changes.json`, `custom-elements.json`), never from the output under test.
4. Vitest browser-mode tests call `page.viewport` first.
5. Terminology rule: the banned synonym for "mission" (`scripts/terminology.mjs`) never appears in source, tests, fixtures or docs.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept and the pre-merge squad; the orchestrator owns that.
- Commit on your lane branch with a conventional message, for example `feat(mission-shell): ... (#17)`, ending with the attribution trailer the harness gives you.
- Stage owned files and the recorded out-of-map edits only. Never `git add -A`.
- The hand-off lists each commit hash, verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- **No delegation.** No sub-agents or forks; do this work package yourself.
- **No outward actions.** No push, no pull request, no issue comment.
- **No branch mechanics.** Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics. Never `git stash`.
- **Denied means stop.**
  - A DENIED command means stop and report. Never retry it another way.
  - Never pattern-kill processes. Nothing may be left running when you finish: stop every `kitty-stub` or dev server you start.
- **No absolute paths and no usernames** in any committed file (use `<repo>`); run `pnpm hygiene` before committing.
- **Charter boundaries.**
  - No I/O under `packages/*` (fetch, XHR, EventSource, WebSocket, Tauri APIs, storage, `location`, bare `window`). I/O lives only in `apps/*` and `crates/*`.
  - No mission-ui screen, element, story or generated file changes (C-002, SC-005). `git diff --exit-code <base> -- packages/mission-ui` must stay empty.
- **Exact pins.** Every new npm or Cargo dependency is pinned exactly: `x.y.z` in `package.json`, `=x.y.z` in `Cargo.toml` (NFR-003).
- **Supply-chain evidence.** Every new dependency gets the DIRECTIVE_051 evidence in the hand-off (see `research.md`, "Supply-chain controls").
- **Orchestrator-owned files.** Files under `kitty-specs/` belong to the orchestrator. Report decisions and friction in the hand-off and write nothing there.
- **No mission-state mutation.** Do not run `spec-kitty` commands that change mission state; the orchestrator moves tasks.

## Hand-off checklist (the report you write when you move to review)

1. **Commits:** each hash, verified with `git cat-file -t <hash>` (report the output), in the order made, with its one-line subject.
2. **Gates:** for every gate above, the command, its exit code and the reporter's pass count. A gate you did not run is listed, with the reason.
3. **Red-first evidence:** the failing line for every red-first test or plant, and the revert check per test file.
4. **Edits outside the owned files:** each out-of-map edit with a one-line rationale, and each change request.
5. **Supply chain:** evidence for any dependency added (S-1 to S-5).
6. **Measurements** this prompt asks for (timings, counts).
