---
work_package_id: WP07
title: Tiers, accessibility, edge cases and whole-screen stories
dependencies:
- WP05
- WP06
requirement_refs:
- FR-024
- FR-025
- FR-026
- FR-031
- C-006
- NFR-003
- NFR-004
- NFR-006
- NFR-010
- NFR-011
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
subtasks:
- T037
- T038
- T039
- T040
- T041
- T042
phase: Phase 4 - Integration
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-drift-screen/
create_intent:
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.screen.stories.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.tiers.stories.ts
- packages/mission-ui/test/sk-drift-screen.a11y.test.ts
- packages/mission-ui/test/sk-drift-screen.perf.test.ts
- packages/mission-ui/test/sk-drift-screen.time.test.ts
- packages/mission-ui/test/sk-drift-screen.tiers.test.ts
- packages/mission-ui/test/sk-drift-screen.edge.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.screen.stories.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.tiers.stories.ts
- packages/mission-ui/test/sk-drift-screen.a11y.test.ts
- packages/mission-ui/test/sk-drift-screen.perf.test.ts
- packages/mission-ui/test/sk-drift-screen.time.test.ts
- packages/mission-ui/test/sk-drift-screen.tiers.test.ts
- packages/mission-ui/test/sk-drift-screen.edge.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP07 - Tiers, accessibility, edge cases and whole-screen stories (IC-06)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Prove tiers (DR-27..DR-29, shell-mobile), focus order and tagged stops (DR-26), focus-loss rule, 200% text, forced colours, reduced motion, the 1000-row timing, long-text stories (DR-25), the spec's edge cases, and own the two whole-screen stories DR-01 and DR-24.

## Context

IC-06 depends on both chains. The tool cannot express two parents: the orchestrator parents this lane on WP05 and merges the approved WP06 tip into it before dispatch, applying the `status.json` rule. Verify with `git merge-base --is-ancestor <WP06 tip> HEAD`. If the WP06 tip is missing STOP and report. Region files are read-only here; a defect in a region is a change request to the orchestrator.

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

### Subtask T037: Tier behaviour

**Purpose**: Collapsed 1100, narrow 800, mobile 620.

**Steps and details**:

Tests and stories for DR-27, DR-28, DR-29: side by side, list above detail with the list border dropped, one column with the table scrolling sideways and Copy reachable via `:state(shell-mobile)`.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T038: Focus order and focus loss

**Purpose**: Documented order, tagged stops.

**Steps and details**:

DR-26: skip target, header Rescan, list, detail Mission link, Copy; stops tagged per #4 rules. Focus-loss rule tests: selected finding removed by a new report, rescan, error and return. Each with a negative control.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T039: Text scaling, forced colours, reduced motion

**Purpose**: NFR-004, NFR-011.

**Steps and details**:

At 200% root font size no horizontal overflow of the content area at 1100 and 720 px (lane table and command scroll in their own regions); in forced colours the selected row, focus ring and table scroll box stay distinguishable; under reduced motion no animation of the screen's own.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T040: 1000-row performance

**Purpose**: NFR-006.

**Steps and details**:

With the bulk fixture render and a selection change re-render in 200 ms or less in the interaction environment; structural assertions are the proof (a selection change re-renders the detail only), the timing is the budget (`research.md` D-23 rule). `now`-driven time tests in the time file: relative text, ISO fallback.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T041: Long text and edge cases

**Purpose**: DR-25 and spec edge cases.

**Steps and details**:

Long Mission name, 1000 rows, long lane table, very long command: no page overflow, pills ellipsize by the shared rule. Cover each edge case listed in the spec once.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T042: Whole-screen stories

**Purpose**: DR-01 and DR-24.

**Steps and details**:

`sk-drift-screen.screen.stories.ts` holds DR-01 (ready, first finding selected, header with last scan and Rescan) and DR-24 (scoped scan: header names the Mission, own findings only, Mission column dropped); `.tiers.stories.ts` holds DR-25..DR-29. Uncommitted side-by-side captures against `06-drift.html`.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

Every new test shown red against the reverted part; focus order walk; 200% text; forced colours; the 1000-row timing; gates except `visual` green.

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

Two-parent merge mistakes (verify the ancestor). Timing flakiness in CI (assert structure first). Fixing a region defect here instead of filing a change request.

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

Nothing intended.

## Branch Strategy

Planning branch and final merge target: `feat/drift-screen-10`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP05, WP06. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per plan 'Lane mechanics'); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP07 --agent claude`
