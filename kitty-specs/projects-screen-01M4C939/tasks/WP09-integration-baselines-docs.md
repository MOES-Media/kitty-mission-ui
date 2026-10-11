---
work_package_id: WP09
title: Integration, baselines and wrap-up inputs
dependencies:
- WP08
requirement_refs:
- FR-029
- FR-031
- NFR-001
- NFR-002
- NFR-008
- C-004
- C-005
- C-008
- SC-001
- SC-002
- SC-003
- SC-004
- SC-005
- SC-006
- SC-007
- SC-008
- SC-009
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T11:56:47.499718+00:00'
subtasks:
- T056
- T057
- T058
- T059
- T060
- T061
history: []
agent_profile: implementer-ivan
authoritative_surface: apps/storybook/tests/visual/__snapshots__/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- apps/storybook/tests/visual/__snapshots__/**
- .github/workflows/ci.yml
- README.md
- CHANGELOG.md
- packages/mission-ui/CHANGELOG.md
- package.json
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP09 - Integration, baselines and wrap-up inputs (IC-08)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Integrate and close: regenerate the manifest once, commit all new visual baselines (the ONLY WP that commits PNGs) inside the pinned container, prove the existing baselines are byte-identical, re-derive the `ci.yml` timeouts by #4's rule, update README and CHANGELOG, run `gate-proof` and `contract:verify-remote`, and assemble the wrap-up inputs.

## Context

Plan IC-08, Gates, PR shape and wrap-up; spec SC-001..SC-009, NFR-001, NFR-002 (5 consecutive visual runs), NFR-008; the drift register as confirmed at CP-1. Baselines are generated only inside the pinned container and committed only here. The mission lands as ONE PR after accept, test cleanup, the aggregate squad, history compaction, rebase and the operator's Storybook review: that is orchestrator-owned and NOT part of this WP.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP08. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

PRECONDITION: WP08 tip (which carries both chains) is an ancestor of HEAD. If S2 recorded that the harness cannot capture the dialog top layer, the harness change it names is an out-of-map edit of `apps/storybook/tests/visual/**` made here and recorded (risk R-4).

## Subtasks

### Subtask T056: Preconditions, manifest regeneration and the story/baseline count

**Purpose**: Start from a verified merged tip.

**Steps**:
1. Ancestry check. `pnpm manifest:generate && pnpm manifest:check` (the single regeneration of this WP; `custom-elements.json` is WP05's file, regenerate only).
2. Recount stories and baselines (the plan says about 32 stories and about 70 baselines, to be recounted); record the real numbers.

**Files**: custom-elements.json (regenerate, out-of-map)
**Validation**: Counts in the hand-off.

### Subtask T057: Commit the new baselines in the pinned container

**Purpose**: FR-031, NFR-002, SC-001.

**Steps**:
1. `pnpm visual:update` ONLY here and only in the pinned container (`scripts/visual.sh`); read the new images and describe them; commit them. Then run `pnpm visual` five consecutive times on the unchanged commit: 0 failures each (NFR-002).
2. Verify the existing baselines are byte-identical (`git diff --stat` over them is empty) and the shell stories file diff is empty.

**Files**: apps/storybook/tests/visual/__snapshots__/**
**Validation**: Five green runs recorded.

### Subtask T058: Re-derive `ci.yml` timeouts by #4's rule

**Purpose**: More stories take longer.

**Steps**:
1. Apply the rule documented where #4 derived the visual job timeouts; edit timeouts only. State the measured run time and the rule's arithmetic in the hand-off.

**Files**: .github/workflows/ci.yml
**Validation**: Only timeout lines differ.

### Subtask T059: README and CHANGELOGs

**Purpose**: Document the two elements and the `picker` value.

**Steps**:
1. README: the two elements, their properties and events in one table each, the host usage snippet from the quickstart, the `picker` layout. Root and package CHANGELOG: one entry for the mission (IC-01's re-vendor line stays). `package.json` only if a script or version change is required. No absolute paths or usernames.

**Files**: README.md, CHANGELOG.md, packages/mission-ui/CHANGELOG.md, package.json
**Validation**: `pnpm hygiene` green.

### Subtask T060: Final gate run, `gate-proof` and contract checks

**Purpose**: FR-029, NFR-001, NFR-011.

**Steps**:
1. Run every gate of the common list plus `pnpm gate-proof`, `pnpm contract:verify-remote` and `pnpm contract:check --require-main`; all green. Report the count of tests, stories, baselines.

**Files**: none
**Validation**: All green or each red classified.

### Subtask T061: Wrap-up inputs for the orchestrator

**Purpose**: SC-006, SC-007, SC-008.

**Steps**:
1. Write in the hand-off: drift register status (which DP items were built, which confirmed at CP-1, any difference found), the exception table as built (E-31..E-34, proof cases), story and baseline counts, the gate record, the list of out-of-map edits across WP01..WP09 you can see in `git log`, and per-row side-by-side evidence paths. You write nothing under `kitty-specs/`.
2. Commit hashes verified with `git cat-file -t`.

**Files**: none
**Validation**: Hand-off complete.

## Definition of Done

- Baselines committed in the pinned container; five consecutive green visual runs; existing baselines byte-identical.
- Manifest regenerated and green; timeouts re-derived; README and CHANGELOG updated.
- `gate-proof`, `contract:verify-remote`, `contract:check --require-main` green.
- Wrap-up inputs delivered; no push, no PR.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- Baselines generated outside the pinned container are invalid: use `scripts/visual.sh` only.
- A dialog top layer that the harness cannot capture needs a harness tag (R-4).
- `contract:verify-remote` needs network: a failure is reported, not worked around.

## Reviewer Guidance

Re-run `pnpm visual` in the container; check the existing baselines unchanged; compare each new baseline with the prototype side by side; check `ci.yml` has only timeout changes; check README facts against the manifest.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

`custom-elements.json` (regeneration only); `apps/storybook/tests/visual/**` harness tag if S2 required it.

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


Implementation command: `spec-kitty agent action implement WP09 --agent claude`
