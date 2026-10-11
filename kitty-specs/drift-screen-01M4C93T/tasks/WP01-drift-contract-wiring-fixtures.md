---
work_package_id: WP01
title: Drift contract wiring and fixtures
dependencies: []
requirement_refs:
- FR-029
- FR-031
- C-002
- C-008
- C-012
- NFR-005
- NFR-007
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-drift-screen-01M4C93T
base_commit: d0e0043e5c75d14e0ceb68b7582ddb98375ce276
created_at: '2026-10-09T21:30:25.818809+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
phase: Phase 1 - Foundation
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/contract/
create_intent: []
execution_mode: code_change
owned_files:
- packages/mission-ui/src/contract/**
- scripts/contract/**
- gates/plants/contract/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Drift contract wiring and fixtures (IC-01)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Wire the re-vendored Drift contract into the typed layer: generated types, the Drift view types, fixture registry entries, the `drift-vocabulary-open` relaxation with its reverted-must-fail proof, the 1000-finding bulk generator, and fixture hygiene. Record the green baseline of every gate first.

## Context

IC-01 is the only WP that touches the contract tooling. It is BLOCKED until mission-ui#9 (Projects) has re-vendored the Mission Status contract on `main` (plan Build base 2). Nobody re-vendors from this branch. Every later WP reads types and fixtures from here.

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

## STOP-CHECK: DRIFT CONTRACT ON MAIN (first step, before T001)

Before anything else, in your lane worktree: confirm `contracts/spec-kitty/mission-status/schemas/DriftReport.yaml` exists AND `contracts/spec-kitty/PIN.json` has `provenance: main`. Also confirm the lane contains the re-vendor commit from `main` (the orchestrator merges `main` into the planning branch and fast-forwards `kitty/mission-<slug>` before the first claim; the dispatch names the re-vendor commit; verify with `git merge-base --is-ancestor <commit> HEAD`). If either file condition fails: STOP and report BLOCKED. Do NOT run `pnpm contract:update`, do NOT re-vendor, do NOT copy schemas from a worktree of spec-kitty PR #5881 or write any workaround on this branch. The reviewer REJECTS if the condition was not checked and recorded in the hand-off.

### Subtask T001: Baseline of every gate

**Purpose**: Record the green baseline before any change.

**Steps and details**:

Run, on the tree the lane starts from, every gate command of the plan's Gates table: typecheck, lint, lint:styles, lint:no-io + test:no-io, lint:data-driven + test:data-driven, test, manifest:check, contract:check + test:contract, hygiene, test:terminology, test:scripts, build-storybook, the pinned-container visual run, gate-proof. Write each command, exit code and reporter pass count into the hand-off. A red at baseline is escalated (HALT report), not absorbed.

Hand-off table of gate, exit code, counts.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T002: Generate types and Drift view types

**Purpose**: `pnpm contract:generate`, then add the view types.

**Steps and details**:

Run `pnpm contract:generate` (the only way generated files change). In `packages/mission-ui/src/contract/types.ts` add `DriftReportView`, `DriftFindingView`, `DriftFindingKey`, `DriftMissionName` exactly as `data-model.md` defines them: `DriftFindingView` widens only the vocabulary fields (kind, severity, authority, derivedSide, sourceCode, remedy, lane words) to open strings; nothing else is widened.

`packages/mission-ui/src/contract/types.ts` (edit), `types.generated.ts` (generated).

`pnpm typecheck` green; a type-level test or `tsc` assertion that a closed enum value is assignable to the widened field.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T003: Fixture registry entries and overlays

**Purpose**: Register the six contract examples and the overlays.

**Steps and details**:

In `scripts/contract/registry.mjs` and `overlays.mjs` add append-only entries for the six Drift contract examples and the overlays of `data-model.md`. Re-read both files at start (they are shared with #9 and #11); never reorder or rewrite another mission's entries. Counts the tooling checks (fixture count, vendored-file count) are read from the tree after the re-vendor, never copied from the plan. Regenerate `fixtures.generated.ts` via the generator.

`scripts/contract/registry.mjs`, `overlays.mjs` (append), `src/contract/fixtures.generated.ts` (generated), tests beside them.

`pnpm contract:check && pnpm test:contract` green with reporter pass above 0.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T004: Relaxation drift-vocabulary-open with reverted-must-fail proof

**Purpose**: Add the relaxation and prove it is load-bearing.

**Steps and details**:

Add the relaxation `drift-vocabulary-open` so fixtures carrying a foreign vocabulary value still validate against the closed response schema where the contract's own description says the set is open. Write the test first: a foreign-value fixture is rejected without the relaxation (red), accepted with it (green). Add a plant under `gates/plants/contract/` and a reverted-must-fail check that removing the relaxation turns the test red. Add any literal floors the contract tooling counts, derived from the tree.

`scripts/contract/*.mjs`, `gates/plants/contract/**`.

Relaxation proof red then green, recorded with the failing line.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T005: Bulk generator for the 1000-finding report

**Purpose**: `bulk.ts` produces exactly 1000 findings.

**Steps and details**:

In `src/contract/bulk.ts` add a generator producing a valid `DriftReport` of exactly 1000 findings (the contract's `maxItems`), synthetic Mission slugs and ids only, deterministic output (seeded, no clock). A unit test asserts the length equals 1000 (equality, not 'at least') and that the output validates against the vendored schema.

`src/contract/bulk.ts`, test `scripts/contract/drift-bulk.test.mjs`.

Test red first, then green; revert check recorded.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T006: Fixture hygiene and CHANGELOG line

**Purpose**: No path, username or e-mail anywhere.

**Steps and details**:

Run `pnpm hygiene` over the generated and hand-written fixtures; fix at the source (the overlay), never by hand-editing a generated file. Add one CHANGELOG line (out-of-map, recorded). Run the whole gate set again and compare with the baseline of T001.

`CHANGELOG.md` (out-of-map line).

`pnpm hygiene` green; gates equal baseline or better.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

`pnpm contract:check && pnpm test:contract` green with reporter pass above 0; relaxation proof red then green; `tsc` green; hygiene green; a revert check per test file.

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

Registry and overlay merge conflicts with #9 and #11 (append-only, re-read at dispatch, whoever lands second rebases). The contract's open `maxItems 1000` versus the bulk fixture (it holds exactly 1000). A contract file count literal copied from the plan instead of the tree.

## Reviewer Guidance

A separate reviewer agent re-runs two revert checks, audits the exit evidence line by line, checks that nothing outside `owned_files` was edited except the recorded out-of-map edits, and rejects visual drift outside the confirmed register. The precondition above is checked first; REJECT if it was not verified and recorded. 

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; each such out-of-map edit is committed by you with plain `git add <path>` and `git commit` before `move-task ... for_review` (the tool refuses to auto-commit paths outside `owned_files`) and is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) change only through their generator; a conflict in one is resolved by regeneration.

**Gates to pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists, from the lane worktree root): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm contract:check && pnpm test:contract`, `pnpm hygiene`, `pnpm test` (its output must list your test files), `pnpm build-storybook`. `pnpm visual` runs only in WP08; before it, missing snapshots are the known red. Use the script names the base provides if they differ and say so.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or plant, or negative case) FIRST, see it fail for the right reason, record the failing line in the hand-off, then implement. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two.

**Test quality rules.** (1) Every no-event test carries a positive control on the same target. (2) Every emit test asserts exactly one event, `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual`. (3) Counts are asserted with equality, never "at least"; loops over fixtures or stories assert they ran N times. (4) Revert checks as above. (5) The word "feature" never appears in source, stories or docs (C-009).

**Visual drift = REJECT.** The prototype `06-drift.html` is the visual authority (C-006, NFR-008). Only the confirmed register (DD-1..DD-21 as confirmed at CP-1 and, for the rest, at the operator's Storybook review) is allowed; any other difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase (orchestrator-owned). Commit on your lane branch with a conventional message (`feat(drift-screen): ... (#10)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry another way, never pattern-kill processes (`pkill -f`; kill only PIDs you recorded), never `git stash`, never `git rebase`, never `rm` with variable globs. `core.bare` must stay false.
- Repo-wide commands (`ruff`, `prettier`, formatters, `find`, `rm -r`) are guarded by `test "$(git rev-parse --show-toplevel)" = "$PWD"` first.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`); `pnpm hygiene` before committing. Keep TMPDIR under a private temporary directory.
- Baselines are generated ONLY in WP08, inside the pinned container; never hand-edit or copy a PNG.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or elements; project CSS is layout only with `--sk-*` tokens; every UI primitive the library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is a recorded gap, never hand-rolled outside E-35..E-39 and the E-18 extension as kept at CP-1.
- Screens do no arithmetic on contract values beyond display counts (C-004); no kind, severity, authority, remedy, source-code or lane literal outside `src/defaults/` (C-007). No branch name is ever shown (C-008).
- `tracer-*.md`, `spec.md`, `plan.md`, `tasks.md` are orchestrator-owned: report decisions and friction in the hand-off.

## Out-of-map edits permitted (committed by the WP itself, recorded in the hand-off)

`package.json` (named test-script edits only, if a new test file needs registering), `CHANGELOG.md` and `packages/mission-ui/CHANGELOG.md` (one line each), `pnpm-lock.yaml` only if the tooling changes it.

## Branch Strategy

Planning branch and final merge target: `feat/drift-screen-10`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: main after the #9 re-vendor. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per plan 'Lane mechanics'); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP01 --agent claude`
