---
work_package_id: WP04
title: Skeleton, layout and surface freeze
dependencies:
- WP03
requirement_refs:
- FR-001
- FR-008
- FR-024
- FR-030
- FR-031
- FR-032
- C-001
- C-005
- C-010
- NFR-005
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-drift-screen-01M4C93T
base_commit: d0e0043e5c75d14e0ceb68b7582ddb98375ce276
created_at: '2026-10-10T07:06:12.209220+00:00'
subtasks:
- T019
- T020
- T021
- T022
- T023
- T024
phase: Phase 2 - Skeleton
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-drift-screen/
create_intent:
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.ts
- packages/mission-ui/src/elements/sk-drift-screen/panel-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/fixtures.ts
- packages/mission-ui/test/sk-drift-screen.skeleton.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.ts
- packages/mission-ui/src/elements/sk-drift-screen/panel-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/fixtures.ts
- packages/mission-ui/src/index.ts
- packages/mission-ui/custom-elements.json
- stylelint.config.mjs
- eslint.config.mjs
- scripts/stylelint-exceptions.test.mjs
- gates/plants/stylelint/**
- gates/plants/eslint/**
- packages/mission-ui/test/sk-drift-screen.skeleton.test.ts
- packages/mission-ui/test/surface-freeze.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP04 - Skeleton, layout and surface freeze (IC-03 = IC-03b)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Create `sk-drift-screen` with its FULL public surface (eleven properties, six events), the real layout, `panel-parts.ts` and `fixtures.ts` complete, every other part a stub with its final signature, registration, one manifest regeneration, the stylelint/eslint exceptions CP-1 keeps, and the surface-freeze and skeleton tests.

## Context

This is IC-03b. After this WP no later WP changes the public surface or the grid; an unavoidable change is a reported exception regenerated once in WP08. The screen file is written ONLY here: class, properties, grid, status switch, six dispatch methods with payload builders, focus rule, live region, composed styles, and the import and call of every part. The region WPs (WP05, WP06) replace stub bodies and keep signatures. Contract: `contracts/sk-drift-screen.md`.

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

## FILE PRECONDITION: CP-1 CONFIRMED (first step, first exit check)

Before anything else confirm that `tracer-design-decisions.md` contains a dated `CP-1 confirmed` entry, committed BEFORE your first commit, naming the confirmed DD items, the exception decisions (E-35..E-39 keep or drop, E-18 extension) and the S2 thresholds. The entry reaches your lane only through the orchestrator (plan 'Lane mechanics' item 2: the planning branch is merged into the lane before dispatch; the dispatch names the CP-1 commit). Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD`. If absent or not an ancestor: STOP and report; never write the entry yourself. The reviewer REJECTS if it is absent or was not present before the first WP04 commit.

### Subtask T019: Screen class and full public surface

**Purpose**: Eleven properties, six events, literal dispatch.

**Steps and details**:

`sk-drift-screen.ts`: properties `status`, `report`, `selectedFinding`, `missionId`, `missions`, `rescanning`, `copyResult`, `refusalCode`, `now`, `labels`, `errorMessage` with defaults and attributes per the contract; `@fires` for EV-1..EV-6 (three new: `sk-select-finding`, `sk-rescan-drift`, `sk-copy-command`; reused `sk-open-mission`, `sk-open-missions`, `sk-retry-load`); literal `dispatchEvent` calls with payload builders (`bubbles`, `composed`, not `cancelable`); `@csspart`, `@screen`. Reflect the CP-1 and spike outcomes.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T020: Layout, status switch, focus rule, live region

**Purpose**: The real grid and all regions.

**Steps and details**:

Two-pane grid (list track `420px`, E-35, and `minmax(0, 1fr)` detail) with thresholds from S2 as container queries; one-column below the threshold and in the shell's mobile tier via `ShellTierController` and `:state(shell-mobile)`; every grid stack `grid-template-columns: minmax(0, 1fr)`. The status switch draws every container and region id. Focus rule and the live region live here. Composed styles. Do not change `nav-drift` or the shell.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T021: panel-parts, fixtures and part stubs

**Purpose**: Complete the shared parts; stub the rest.

**Steps and details**:

`panel-parts.ts` complete (E-18 scope extension). `fixtures.ts` complete (named fixtures from the IC-01 registry plus the 1000-finding bulk, shell frame helper). Create `header-parts.ts`, `list-parts.ts`, `state-parts.ts`, `detail-parts.ts`, `table-parts.ts`, `resolution-parts.ts` as stubs with FINAL signatures from the contract (out-of-map creation; owned afterwards by WP05 and WP06).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T022: Exceptions with leak plants

**Purpose**: E-35..E-39 as CP-1 keeps them, E-18 extension.

**Steps and details**:

In `stylelint.config.mjs` and `eslint.config.mjs` add only the entries CP-1 kept, each file-scoped, each with a leak plant under `gates/plants/stylelint/` or `gates/plants/eslint/` that is red then green, and each pinned in `scripts/stylelint-exceptions.test.mjs` (exact `::part` and exception sets per file). Add the E-18 scope extension for `panel-parts.ts`. Also remove the WP03 `ignores` entry if still present.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T023: Registration and one manifest regeneration

**Purpose**: Public surface in `src/index.ts`.

**Steps and details**:

Guarded registration of the single tag and the type exports only in `src/index.ts`, typed `HTMLElementEventMap` entries for the three new events. Run `pnpm manifest:generate` once and commit `custom-elements.json` (never hand-edit).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T024: Surface-freeze and skeleton tests

**Purpose**: Prove the freeze and every event payload.

**Steps and details**:

Extend `surface-freeze.test.ts` (properties, events, parts). `sk-drift-screen.skeleton.test.ts`: one test per event with exact payload via `toEqual`, exactly one event, `bubbles` and `composed` true, `cancelable` false; layout cases at 1280, 1100, 800 and 620 in `shellFrame`. Each test shown red against the reverted surface (a removed property, a renamed event). Positive controls on every no-event test.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

surface-freeze and skeleton tests green and each shown red against the reverted surface; `manifest:check` green; every stylelint/eslint exception entry has a leak plant red then green and pinned by `scripts/stylelint-exceptions.test.mjs`; typecheck, lint, lint:styles, lint:no-io, lint:data-driven green.

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

The surface must reflect spike outcomes (read the CP-1 entry, not the plan). The layout lands here so no region WP changes the grid. A leak plant that never failed proves nothing. The no-io gate must pass as written for any selection code stub.

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
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`); `pnpm hygiene` before committing. Keep TMPDIR under the scratchpad.
- Baselines are generated ONLY in WP08, inside the pinned container; never hand-edit or copy a PNG.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or elements; project CSS is layout only with `--sk-*` tokens; every UI primitive the library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is a recorded gap, never hand-rolled outside E-35..E-39 and the E-18 extension as kept at CP-1.
- Screens do no arithmetic on contract values beyond display counts (C-004); no kind, severity, authority, remedy, source-code or lane literal outside `src/defaults/` (C-007). No branch name is ever shown (C-008).
- `tracer-*.md`, `spec.md`, `plan.md`, `tasks.md` are orchestrator-owned: report decisions and friction in the hand-off.

## Out-of-map edits permitted (committed by the WP itself, recorded in the hand-off)

The six stub part files under `src/elements/sk-drift-screen/` (created here, owned by WP05 and WP06 afterwards), `package.json` test-script edits if a new test file needs registering, one CHANGELOG line.

## Branch Strategy

Planning branch and final merge target: `feat/drift-screen-10`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP03. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per plan 'Lane mechanics'); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP04 --agent claude`
