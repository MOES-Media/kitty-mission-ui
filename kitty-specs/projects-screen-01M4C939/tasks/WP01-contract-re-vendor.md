---
work_package_id: WP01
title: Contract re-vendor and green baseline
dependencies: []
requirement_refs:
- FR-027
- FR-028
- NFR-007
- NFR-011
- C-006
- C-007
- C-008
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T08:15:17.706983+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
history: []
agent_profile: implementer-ivan
authoritative_surface: contracts/spec-kitty/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- contracts/spec-kitty/**
- packages/mission-ui/src/contract/**
- scripts/contract/**
- gates/plants/contract/**
- packages/mission-ui/src/elements/sk-missions-screen/fixtures.ts
- packages/mission-ui/test/defaults.test.ts
- packages/mission-ui/test/sk-missions-screen.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Contract re-vendor and green baseline (IC-01)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Record the green baseline of every gate, then re-vendor the Mission Status contract once from spec-kitty `main` (after PR #5881 has merged), regenerate types and fixtures, repair what the stricter `Project` breaks, and add the two host overlays the contract examples do not give. This is the one small, reviewable contract change of the mission; no screen code is written here.

## Context

Plan IC-01, Build base and the re-vendor precondition G-0, Shared files (this WP is the only writer of `contracts/spec-kitty/**`, `src/contract/**`, `scripts/contract/**`, `gates/plants/contract/**`). Requirements: FR-027 (re-vendor once, first), FR-028 (contract-derived fixtures, part), NFR-007 (fixture hygiene), NFR-011 (contract gate), C-006 (no stacked or provisional pin), C-007, C-008. Risks R-1 (literal `Project` sites break) and R-2 (the data-driven gate reads schema files by name) apply. Every later WP depends on this one.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); no dependencies. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

STOP-CHECK (first action, before any other step). Run `gh pr view 5881 --repo spec-kitty/spec-kitty --json state,mergedAt,mergeCommit`. If the state is not MERGED, report BLOCKED with the output and stop: no provisional branch pin, no stacked branch, no local edits (plan G-0, operator and orchestrator ruling 2026-10-08). The issue names the same slice as spec-kitty#5776; whichever the merged `main` holds is the source. Record the merged sha and confirm it is an ancestor of upstream `main` (`provenance: main`).

## Subtasks

### Subtask T001: Stop-check: PR #5881 merged, merged sha recorded

**Purpose**: Refuse to start on an unmerged contract slice.

**Steps**:
1. Run the stop-check above; capture state, merge commit and the sha you will pass to `contract:update`.
2. Confirm the sha is an ancestor of upstream `main` (the `contract:verify-remote` rule), not a branch tip.
3. If anything differs from the plan's statement (for example the `Project` schema does not carry seven members) report it as a change request; do not adapt silently.

**Files**: none (read-only)
**Validation**: The report names the merged sha and the `gh` output.

### Subtask T002: Baseline: run every gate command on the build base and report the result

**Purpose**: Make a pre-existing red distinguishable from a regression (plan, Build base item 4).

**Steps**:
1. Guard first: `test "$(git rev-parse --show-toplevel)" = "<clone>"` before every repo-wide command.
2. Run `pnpm install --frozen-lockfile`, `pnpm preflight`, then `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io`, `pnpm test:no-io`, `pnpm lint:data-driven`, `pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm contract:check`, `pnpm test`, `pnpm test:scripts`, `pnpm test:contract`, `pnpm build-storybook`.
3. Run `pnpm visual` in the pinned container and record the count of existing baselines; this is the number T006 must reproduce unchanged.
4. Report the result per gate in the hand-off. A red at baseline is escalated, not absorbed. You write nothing under `kitty-specs/`: the orchestrator copies the baseline into `tracer-design-decisions.md`.

**Files**: none
**Validation**: Hand-off table: gate, command, exit code, pass count.

### Subtask T003: Re-vendor and regenerate

**Purpose**: Bring the vendored contract to spec-kitty `main` with its five new `Project` members.

**Steps**:
1. `pnpm contract:update --sha <merged sha>` (PIN.json gets `provenance: main`), then `pnpm contract:generate`.
2. Never edit `types.generated.ts`, `fixtures.generated.ts` or any vendored file by hand; a conflict is resolved by regeneration only.
3. Inspect the diff: `Project` carries `name`, `missionCount`, `specKittyVersion`, `schemaVersion`, `health`, `currentBranch`, `lastActivityAt`; `ProjectHealth.yaml` exists in the vendored schemas; the three examples `Project.example`, `Project.schema-drift`, `Project.all-null` are present.
4. Run `pnpm lint:data-driven` straight away (risk R-2) and report whether the gate still loads.

**Files**: contracts/spec-kitty/**, packages/mission-ui/src/contract/**
**Validation**: `pnpm contract:check --require-main` is green.

### Subtask T004: Repair literal `Project` sites broken by the stricter type

**Purpose**: Keep #4's and #5's code compiling on the new `Project`.

**Steps**:
1. `pnpm typecheck` names every site. Known sites (risk R-1): the `project` and `projectOf` builders in `sk-missions-screen/fixtures.ts`, and literals in `test/defaults.test.ts` and `test/sk-missions-screen.test.ts`.
2. Fix each by supplying the five new members from the contract example (fixture values only); change no behaviour of the Missions screen.
3. Any other site the compiler names outside your owned files is an out-of-map edit: one line of rationale each in the hand-off.

**Files**: sk-missions-screen/fixtures.ts, test/defaults.test.ts, test/sk-missions-screen.test.ts
**Validation**: `pnpm typecheck` and `pnpm test` are green with the same test counts as the baseline.

### Subtask T005: Host overlays for the named Project fixtures and fixture-count floors

**Purpose**: Give later WPs the contract-shaped `Project` variants the contract examples do not provide (`contracts/gates.md`, Fixtures).

**Steps**:
1. Add `project-unknown-health` (health outside the enum, a host-typed relaxation) and `project-long` (255-character branch matching the contract pattern, 64-character version matching the pattern, a long name), following how #5 added its relaxations, each with a proof that reverting the overlay makes a named check fail.
2. Update the fixture-count floors by `pnpm contract:update`/`contract:generate` with the independent literals the check script requires; confirm the three `Project` examples validate against the schema.
3. Names, branches and locations are synthetic; no path, e-mail or username (NFR-007): `pnpm hygiene`.

**Files**: scripts/contract/**, gates/plants/contract/**, src/contract/**
**Validation**: `pnpm test:contract` and `pnpm contract:check` green; a `Project` fixture carries all seven members.

### Subtask T006: Exit: all gates green, existing baselines identical, one CHANGELOG line

**Purpose**: Prove the re-vendor changed nothing visible.

**Steps**:
1. Re-run every gate of T002; all green.
2. Run `pnpm visual` in the pinned container: the existing baselines are byte-identical and their count equals the T002 number. Never run `pnpm visual:update`.
3. Add the one CHANGELOG line for the re-vendor (out-of-map edit of the root `CHANGELOG.md`; plan Shared files: IC-01 adds it, IC-02 and IC-03 add none).
4. Commit; hand-off lists each commit hash verified with `git cat-file -t`.

**Files**: root CHANGELOG.md (out-of-map)
**Validation**: Hand-off carries gate results, baseline count and the hash list.

## Definition of Done

- T001 stop-check output and merged sha in the hand-off; BLOCKED reported instead if unmerged.
- Every gate command green; baseline comparison recorded.
- `PIN.json` `provenance: main`; `contract:check --require-main` green.
- Existing baselines byte-identical; count recorded.
- Two host overlays present with revert proofs; no path, e-mail or username in any committed file.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- PR #5881 may merge with a different `Project` shape than the plan read: stop and report, do not adapt.
- The data-driven config reads schema files by name; a renamed `ProjectHealth.yaml` breaks it at load (R-2).
- The `Global asset input changed` error from the CLI is transient and embeds a home path: never paste it into a committed file.

## Reviewer Guidance

Check the stop-check evidence, that no generated file was hand-edited (regenerate and compare), that the baseline count is unchanged, that overlays have revert proofs, and that the diff is confined to the owned files plus the one CHANGELOG line.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

Root `CHANGELOG.md` (one line); any other file `pnpm typecheck` names that is not in the owned list (one-line rationale each).

## Owned files, red-first, commit rule

**Owned files**: the frontmatter `owned_files` is authoritative; stage only these. `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file outside the list is changed only as the plan's table "Shared files: who may write them" allows for this work package; each such out-of-map edit is committed by you with plain `git add <path>` and `git commit`, and listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request (file, change, reason). A generated file (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) is never edited by hand: a conflict is resolved by regeneration only.

**Gates this work package must pass before hand-off** (run from the lane worktree root, each exits 0 with a pass count above 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (its output must list your test files), `pnpm test:scripts`, `pnpm build-storybook`, `pnpm contract:check && pnpm test:contract`. `pnpm visual` and `pnpm gate-proof` are NOT exit checks except where this prompt says so. If a script name differs on the build base, use the base's name and say so.

**Red-first.** For every behaviour, plant or gate case: write the failing test first, see it fail for the right reason, record the failing line in the hand-off, then implement. Per test file, one deliberate revert (temporary local edit, never committed) that produces a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two.

**Test-quality rules** (binding, from missions #4 and #5): every no-event test carries a positive control in the same test; every emit test asserts exactly one event, `bubbles` true, `composed` true, `cancelable` false and the detail with `toEqual`; counts are asserted by equality and every loop asserts it ran N times; not-drawn regions have a DOM-absence assertion paired with a present case; foreign values render their raw text, never `undefined`; vitest browser-mode tests call `page.viewport` first; the word "feature" never appears (the term is "Mission").

**Data-driven rules** (FR-019, NFR-009): `healthy` and `schema_drift` appear only in `defaults/` and `src/contract/`; no `=== 'healthy'`; no per-project literal (`main`, `spec-kitty`) in a component; no `Date`, `setTimeout`, `fetch`, `localStorage`, `location` or `history`; no `Math.` on contract values; every `dispatchEvent` has a literal `sk-*` name, sits in the element file and is declared by `@fires` (part files never dispatch); the screen never parses a location, branch or name and never derives health from `schemaVersion`; every `class=` has an approved prefix in that file's E-34 row or the file has none; no absolute home path or username in any committed file.

**Drift register and visual authority** (NFR-008): the prototype page `<prototype>/01-projects.html` is the visual source of truth. DP-1..DP-27 (`spec.md`) are PROPOSED until the `CP-1 confirmed` entry exists in `tracer-design-decisions.md`, and afterwards only the items that entry confirms are allowed. A difference in neither the register nor the CP-1 entry is a REJECT item for the WP that introduces it, not a design review item.

**Baselines**: PNGs are generated only inside the pinned container and committed ONLY in WP09. Other WPs commit no PNG, never run `pnpm visual:update`, and hand over uncommitted side-by-side screenshots against the prototype.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, compaction of history, a rebase and the operator's Storybook review (orchestrator-owned). Commit on your lane branch with a conventional message (`feat(projects-screen): ... (#9)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way. Never pattern-kill processes, never `git stash`, never `git rebase`, never `rm` with a glob or variable; `core.bare` must stay false. Nothing is left running when you finish.
- Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics.
- Directory guard before any repo-wide command (`pnpm`, `eslint .`, `ruff`, `git add`): `test "$(git rev-parse --show-toplevel)" = "<lane>"`.
- No absolute paths and no usernames in any committed file or hand-off (use `<repo>`, `<prototype>`, `<lane>`); run `pnpm hygiene` before committing. Temporary files go under the scratchpad directory the orchestrator names (TMPDIR).
- Elements over CSS: every UI primitive the design library provides is rendered with its `sk-*` element; project CSS is layout-only with `--sk-*` tokens; a missing primitive is recorded as a design-library gap, never hand-rolled outside a numbered exception ruled at CP-1.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript; no I/O in screens.
- `tracer-*.md`, `spec.md`, `plan.md` and everything else under `kitty-specs/` are orchestrator-owned: report outcomes, decisions and friction in the hand-off; write nothing there.
- Do not run `spec-kitty` commands that mutate mission state; the orchestrator moves tasks.


Implementation command: `spec-kitty agent action implement WP01 --agent claude`
