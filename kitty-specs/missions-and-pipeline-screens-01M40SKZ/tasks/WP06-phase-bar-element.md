---
work_package_id: WP06
title: sk-phase-bar pattern element (chain A)
dependencies:
- WP04
requirement_refs:
- FR-013
- FR-014
- FR-025
- FR-028
- FR-029
- C-007
- SC-003
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
subtasks:
- T033
- T034
- T035
- T036
- T037
phase: Phase 2 - Chain A pattern
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-phase-bar/
create_intent:
- packages/mission-ui/src/elements/sk-phase-bar/fixtures.ts
- packages/mission-ui/src/elements/sk-phase-bar/sk-phase-bar.stories.ts
- packages/mission-ui/test/sk-phase-bar.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-phase-bar/**
- packages/mission-ui/test/sk-phase-bar.test.ts
- apps/storybook/tests/visual/__snapshots__/mission-phase-bar--*.png
- stylelint.config.mjs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - sk-phase-bar pattern element (chain A) (IC-05)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the data-driven phase bar over `sk-status-indicator`: it renders however many phases it receives, in array order, with names it has never seen; glyph, tone and current-ness come from the `PHASE_*` tables; the S2 outcome (A, B or C) is implemented; `stylelint.config.mjs` changes only if S2 selected B (E-04).

## Context

Read `contracts/sk-phase-bar.md`, `research.md` D-17, D-27 (unknown status renders as pending), S2 outcome in `tracer-design-decisions.md`, `spec.md` FR-013, FR-014, C-007, SC-003, PL-07, and `src/defaults/phases.ts`.

Implementation concern: `plan.md` IC-05. Requirements: FR-013, FR-014, FR-025, FR-028, FR-029, C-007, SC-003.

## Subtasks

### T033 Data-driven render

Phases rendered in array order via `label` hook with raw-name fallback; count never assumed; no comparison with a phase state in element code (the `data-driven` gate must stay green). Unknown phase status renders as pending.

### T034 S2 outcome

Implement the connector and dots per the recorded S2 candidate; if B, add the token-only paint exception E-04 in this file and the minimal `stylelint.config.mjs` change; otherwise do not touch Stylelint config.

### T035 Fixtures and the 4 stories

`Default`, `AllPending`, `ThreeUnknown`, `SevenUnknown` under `Mission/Phase bar` (800 px).

### T036 Behaviour tests

3 phases and 7 phases with unknown names render exactly 3 and 7 items in order (equality counts); a layout assertion that 7 phases do not overflow at 800 px; accessible names; a foreign-vocabulary test.

### T037 Baselines

`pnpm visual:update` in the pinned container: exactly 4 PNGs `mission-phase-bar--*.png`; Read and describe each against `<prototype>/03-pipeline.html` (drift only DR-8 as confirmed).

## Acceptance (all runnable)

1. `pnpm lint:data-driven && pnpm test:data-driven` still 0 problems; `ls ... | grep -c '^mission-phase-bar--'` prints 4.
2. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check no phase name, count or order is hard-coded, that E-04 exists only if S2 chose B, and the connector against the prototype. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`, and `pnpm visual` (inside the pinned container through `scripts/visual.sh`; 0 diffs on every existing baseline and your new ones). After `data-driven` exists (WP02 onward) also `pnpm lint:data-driven && pnpm test:data-driven`; after `contract` exists (WP01 onward) also `pnpm contract:check && pnpm test:contract`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
