---
work_package_id: WP07
title: sk-work-package-board pattern element (chain A)
dependencies:
- WP06
requirement_refs:
- FR-015
- FR-016
- FR-017
- FR-018
- FR-025
- FR-028
- FR-029
- C-007
- NFR-003
- SC-004
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
subtasks:
- T038
- T039
- T040
- T041
- T042
- T043
phase: Phase 2 - Chain A pattern
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-work-package-board/
create_intent:
- packages/mission-ui/src/elements/sk-work-package-board/card-parts.ts
- packages/mission-ui/src/elements/sk-work-package-board/fixtures.ts
- packages/mission-ui/src/elements/sk-work-package-board/sk-work-package-board.stories.ts
- packages/mission-ui/test/sk-work-package-board.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-work-package-board/**
- packages/mission-ui/test/sk-work-package-board.test.ts
- apps/storybook/tests/visual/__snapshots__/mission-work-package-board--*.png
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP07 - sk-work-package-board pattern element (chain A) (IC-06)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the board: columns from the `laneGroups` property, work-package cards with state badges (blocked, reviewing, canceled), a subtask progress bar, `sk-select-work-package`, and the scroll-region semantics (the region is a control for NFR-003, ruling P-4).

## Context

Read `contracts/sk-work-package-board.md`, `research.md` D-07, D-15, D-20, S3 and S4 outcomes, DR-1, DR-2, DR-12, `data-model.md` (board placement), `spec.md` FR-015 to FR-018, SC-004, PL-09, PL-11.

Implementation concern: `plan.md` IC-06. Requirements: FR-015, FR-016, FR-017, FR-018, FR-025, FR-028, FR-029, C-007, NFR-003, SC-004.

## Subtasks

### T038 Columns and placement

Columns from `laneGroups` (an empty array makes one synthetic column titled by `label`; nothing is dropped); placement via `logic/placement`; Planned = planned plus blocked, In progress = claimed plus in_progress, Review = for_review plus in_review, Approved, Done = done plus canceled; unknown and null lanes handled per D-07. Each column shows its card count.

### T039 Cards

Card fragment `card-parts.ts` as `sk-action-row selectable layout="card"`: id and state pill in the marker slot, title, supporting text, actor when present; blocked badge, reviewing marker, canceled badge; native `<progress>` bar (S4) exposing done and total as given when `total` is above 0, nothing at 0.

### T040 Event

Activating a card emits `sk-select-work-package` `{ missionId, wpId }` exactly once; library `sk-action-row-activate` is stopped at the board.

### T041 Scroll region (P-4)

When the board overflows the scroller is keyboard-focusable and operable (library contract, WCAG 2.1.1) and counts as one control in the Tab-walk; tests use fixed container widths (no `ResizeObserver` flake).

### T042 Fixtures and the 6 stories

`FiveColumns`, `Badges`, `UnknownAndNullLane`, `CustomGroups`, `SubtaskProgress`, `LongNames` under `Mission/Work package board` (800 px).

### T043 Tests and baselines

Placement, badges, custom groups, progress bar (partial, complete, total 0), event once, no-event cases with positive controls, Tab-walk; then exactly 6 PNGs `mission-work-package-board--*.png`, each Read and compared with the prototype (only AD-2 and confirmed DR-1, DR-2, DR-12).

## Acceptance (all runnable)

1. `ls ... | grep -c '^mission-work-package-board--'` prints 6; the Tab-walk test counts the scroll region.
2. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check that no column, lane word or count is hard-coded, that the card slot order matches the prototype (S3, G-08), that canceled and blocked cards land where the spec says, and the baselines. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`, and `pnpm visual` (inside the pinned container through `scripts/visual.sh`; 0 diffs on every existing baseline and your new ones). After `data-driven` exists (WP02 onward) also `pnpm lint:data-driven && pnpm test:data-driven`; after `contract` exists (WP01 onward) also `pnpm contract:check && pnpm test:contract`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP06. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
