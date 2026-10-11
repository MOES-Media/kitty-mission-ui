---
work_package_id: WP03
title: Foundation spikes S1 to S6 and CP-1 evidence
dependencies:
- WP02
requirement_refs:
- FR-024
- FR-030
- FR-032
- C-005
- C-006
- NFR-008
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-drift-screen-01M4C93T
base_commit: d0e0043e5c75d14e0ceb68b7582ddb98375ce276
created_at: '2026-10-10T06:31:12.044804+00:00'
subtasks:
- T013
- T014
- T015
- T016
- T017
- T018
phase: Phase 1 - Foundation
history: []
agent_profile: frontend-freddy
authoritative_surface: spikes/ic-03a/
create_intent: []
execution_mode: code_change
owned_files:
- spikes/ic-03a/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - Foundation spikes S1 to S6 and CP-1 evidence (IC-03 = IC-03a)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Run spikes S1 to S6 of `research.md` as throwaway stories, collect the side-by-side evidence for CP-1, and remove all spike code in the named final commit.

## Context

This is IC-03a. The spikes decide the conditional exceptions (E-36, E-37, E-38 are dropped if S1 finds a library family), the layout thresholds (S2), 1000-option cost (S3) and the manual-selection route (S5). A spike can change a part shape or an exception, which is why spikes precede the surface freeze. After this WP is approved the orchestrator runs CP-1 (not a WP).

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

### Subtask T013: S1 library fit

**Purpose**: Find or rule out a library family for table, listbox, copy field.

**Steps and details**:

Inspect the library manifest and styles families; render a candidate in a throwaway story under `spikes/ic-03a/`. Record the outcome per exception E-36, E-37, E-38 (keep or drop) with evidence.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T014: S2 layout thresholds

**Purpose**: Derive container-query thresholds from real content widths.

**Steps and details**:

Render the two-pane layout in `shellFrame` with `layout` project and `flush` at 1280, 1100, 800 and 620; derive the container thresholds from the project layout's real content widths, not #5's numbers. Check `grid-template-columns: minmax(0, 1fr)` on every stack (the #5 S9 lesson).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T015: S3 and S4 cost and prototype render

**Purpose**: 1000 options, and the prototype rendered beside the spike.

**Steps and details**:

S3: render 1000 options and time selection re-render in the browser mode (NFR-006); state whether virtualization is needed (no virtualization unless S3 forces a ruling). S4: capture `06-drift.html` and the spike side by side for the drift register DD-1..DD-21.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T016: S5 manual selection route

**Purpose**: Selection API inside a shadow root.

**Steps and details**:

Prove that manual selection of the command text works in a shadow root through a route that passes `pnpm lint:no-io` and typecheck AS WRITTEN: `ShadowRoot.getSelection` is not in `lib.dom`, and the gate bans casting or aliasing `document`. If unreliable, record the fallback explicitly (never silent).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T017: S6 and CP-1 evidence

**Purpose**: Remaining spike and the evidence bundle.

**Steps and details**:

Run S6 as `research.md` defines. Assemble the report for the orchestrator: prototype beside spike renders, DD-1..DD-21 status (spike-rendered ones confirmable at CP-1), the copy of `contracts/defaults.md`, E-35..E-39 and the E-18 extension, S1..S6 evidence. Captures live in the WP report, not in the tree.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T018: Remove spike code

**Purpose**: Named final commit `chore(ic-03a): remove spike code`.

**Steps and details**:

Add exactly two config additions to run the spikes (one `stories` glob entry and one ESLint `ignores` entry; out-of-map, recorded). The final commit removes `spikes/ic-03a/**` and BOTH config additions. `git status --short` is empty afterwards and no spike file remains in `git ls-files`.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

S1..S6 each have a recorded outcome with evidence; the final commit named `chore(ic-03a): remove spike code` leaves no spike file and no config addition (`git diff <base>..HEAD --stat` shows only the removal netting to zero); gates equal baseline.

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

A spike silently becoming product code. S5 depends on the Desktop webview and may only be provable in Chromium (record this). Spike renders rot if config additions are not removed.

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
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`); `pnpm hygiene` before committing. Keep TMPDIR under the scratchpad.
- Baselines are generated ONLY in WP08, inside the pinned container; never hand-edit or copy a PNG.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or elements; project CSS is layout only with `--sk-*` tokens; every UI primitive the library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is a recorded gap, never hand-rolled outside E-35..E-39 and the E-18 extension as kept at CP-1.
- Screens do no arithmetic on contract values beyond display counts (C-004); no kind, severity, authority, remedy, source-code or lane literal outside `src/defaults/` (C-007). No branch name is ever shown (C-008).
- `tracer-*.md`, `spec.md`, `plan.md`, `tasks.md` are orchestrator-owned: report decisions and friction in the hand-off.

## Out-of-map edits permitted (committed by the WP itself, recorded in the hand-off)

The stories glob in the Storybook main config and one ESLint `ignores` entry in `eslint.config.mjs` (owned by WP04; this WP adds and removes them within its own commits), recorded with rationale.

## Branch Strategy

Planning branch and final merge target: `feat/drift-screen-10`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP02. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per plan 'Lane mechanics'); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP03 --agent claude`
