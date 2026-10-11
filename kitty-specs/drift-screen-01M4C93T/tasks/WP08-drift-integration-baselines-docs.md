---
work_package_id: WP08
title: Integration, 32 baselines and wrap-up inputs
dependencies:
- WP07
requirement_refs:
- FR-023
- FR-030
- FR-034
- C-006
- C-011
- NFR-001
- NFR-002
- NFR-008
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-drift-screen-01M4C93T
base_commit: d0e0043e5c75d14e0ceb68b7582ddb98375ce276
created_at: '2026-10-10T09:59:28.659828+00:00'
subtasks:
- T043
- T044
- T045
- T046
- T047
phase: Phase 4 - Integration
history: []
agent_profile: frontend-freddy
authoritative_surface: apps/storybook/tests/visual/__snapshots__/
create_intent:
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.shell.stories.ts
- scripts/drift-story-catalogue.test.mjs
execution_mode: code_change
owned_files:
- apps/storybook/tests/visual/__snapshots__/mission-drift*.png
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.shell.stories.ts
- scripts/drift-story-catalogue.test.mjs
- README.md
- CHANGELOG.md
- packages/mission-ui/README.md
- packages/mission-ui/CHANGELOG.md
- package.json
- .github/workflows/ci.yml
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP08 - Integration, 32 baselines and wrap-up inputs (IC-07)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Add the shell-wiring story (`nav-drift`, `flush`), generate and commit all 32 baselines in the pinned container with five consecutive stable runs, regenerate the manifest, write README and CHANGELOG, re-derive CI timeouts by #4's rule, and produce the wrap-up inputs.

## Context

IC-07 is the only WP that commits baselines. The shell needs no change (`nav-drift` exists; FR-023 amended A-1). The 32 stories are the 33 state-matrix rows with DR-07a and DR-07b counted separately, minus DR-09 (dropped). Baselines are generated ONLY in the pinned container; Read every new PNG and describe it.

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

### Subtask T043: Shell-wiring story and catalogue test

**Purpose**: FR-023 and the 32-story count.

**Steps and details**:

`sk-drift-screen.shell.stories.ts`: the screen in `shellFrame` with `current` set to `nav-drift` and `flush`. Add `scripts/drift-story-catalogue.test.mjs` asserting the catalogue lists EXACTLY the 32 stories (equality) and register it in `test:terminology` in `package.json`.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T044: Generate the 32 baselines

**Purpose**: Pinned container only.

**Steps and details**:

`pnpm visual:update` through `scripts/visual.sh` (fails rather than skips). `git status --short` shows only the 32 `mission-drift*.png` added. Read every PNG and describe width, what is drawn, anything wrong; compare with the prototype side by side. Never hand-edit or copy a PNG.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T045: Five stable runs and a red proof

**Purpose**: NFR-002.

**Steps and details**:

`pnpm visual` green five consecutive runs with the 32 baselines; a deliberately changed pixel (temporary, uncommitted) shown red; restore.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T046: Manifest, docs, timeouts

**Purpose**: Regenerate and document.

**Steps and details**:

`pnpm manifest:generate` once more (regeneration only, `custom-elements.json` is owned by WP04), `manifest:check` green. README and both CHANGELOGs describe the screen, its six events and the exceptions. Re-derive CI timeouts by #4's rule from recorded runs, edit `.github/workflows/ci.yml` accordingly.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T047: Gate sweep and wrap-up inputs

**Purpose**: FR-034, NFR-001.

**Steps and details**:

Run the whole gate set: manifest:check, hygiene, test:terminology, `contract:check --require-main`, `gate-proof`, build-storybook, visual. Write the exception list (E-35..E-39 as kept, the E-18 extension, amendment A-1) for the PR description into the hand-off.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

`pnpm visual` green five consecutive runs with 32 committed baselines; a deliberately changed pixel shown red; `manifest:check`, hygiene, terminology, `contract:check --require-main`, `gate-proof` green; the story catalogue test lists exactly the 32 stories.

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

Baselines generated outside the pinned container. Any baseline that differs from the prototype beyond the confirmed register is a REJECT. CI timeouts guessed instead of re-derived.

## Reviewer Guidance

A separate reviewer agent re-runs two revert checks, audits the exit evidence line by line, checks that nothing outside `owned_files` was edited except the recorded out-of-map edits, and rejects visual drift outside the confirmed register. 

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

`packages/mission-ui/custom-elements.json` (regeneration only, owned by WP04), `pnpm-lock.yaml` if the tooling changes it.

## Branch Strategy

Planning branch and final merge target: `feat/drift-screen-10`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP07. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per plan 'Lane mechanics'); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP08 --agent claude`
