---
work_package_id: WP09
title: sk-pipeline-screen (chain A)
dependencies:
- WP07
requirement_refs:
- FR-012
- FR-013
- FR-014
- FR-018
- FR-019
- FR-020
- FR-021
- FR-022
- FR-023
- FR-024
- FR-025
- FR-028
- FR-029
- NFR-003
- NFR-004
- SC-002
- SC-003
- SC-004
- SC-005
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
subtasks:
- T052
- T053
- T054
- T055
- T056
- T057
- T058
phase: Phase 3 - Screens
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-pipeline-screen/
create_intent:
- packages/mission-ui/src/elements/sk-pipeline-screen/pipeline-parts.ts
- packages/mission-ui/src/elements/sk-pipeline-screen/fixtures.ts
- packages/mission-ui/src/elements/sk-pipeline-screen/sk-pipeline-screen.stories.ts
- packages/mission-ui/test/sk-pipeline-screen.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-pipeline-screen/**
- packages/mission-ui/test/sk-pipeline-screen.test.ts
- apps/storybook/tests/visual/__snapshots__/mission-pipeline--*.png
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP09 - sk-pipeline-screen (chain A) (IC-08)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Build the Pipeline screen: breadcrumb and header, composition of `sk-phase-bar` and `sk-work-package-board`, the inspector side panel (current step, progress, blockers, target branch, View artifacts), the four view states, 22 stories and baselines, and tests including footer and inspector agreement and the foreign-vocabulary behavioural test.

## Context

Read `contracts/sk-pipeline-screen.md` (authoritative), `research.md` D-18 to D-19, D-28, D-30, D-32, DR-7 to DR-11, `data-model.md` (phase state and current step), `spec.md` PL-01 to PL-11, EV-5 to EV-7, FR-012 to FR-022, and the WP06 and WP07 elements.

Implementation concern: `plan.md` IC-08. Requirements: FR-012, FR-013, FR-014, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-028, FR-029, NFR-003, NFR-004, SC-002, SC-003, SC-004, SC-005.

## Subtasks

### T052 Header and breadcrumb

Breadcrumb nav ("Missions" link then the Mission's `friendlyName`), `h1` "Pipeline", `sk-pill-tag` with `targetBranch`; an unmodified primary click or Enter on the crumb emits `sk-open-missions` `{}` once, a modified click emits nothing and keeps the browser default (`missionsHref`, P-7).

### T053 View states

`loading` (busy region, labelled indeterminate progress), `error` (alert notice, `errorMessage` override), `empty` (neutral info notice, new copy DR-9), `ready`; `ready` with `mission === null` behaves as `empty`; the header always renders; unknown status collapses to `empty`.

### T054 Composition

Phase bar, then board and inspector in a wrapping flex row (no media queries; the shell narrows the cell); events from the board cross the screen; library events stop at the screen.

### T055 Inspector

Private fragment `pipeline-parts.ts` with `sk-card` and `sk-metric`: current step (contract `nextAction` when non-null, else the neutral "No step in progress" line), Mission progress exactly as the contract gives it (full precision, DR-11), blockers as `blockedCount` only, target branch, "View artifacts" emitting `sk-view-artifacts` `{ missionId }` once; the footer percentage and the inspector agree for `wpTotal` above 0 (footer absent for 0).

### T056 Fixtures and the 22 stories

Per the story table of `plan.md`: `ImplementInProgress1280` (PL-01 built from planned, claimed, in_progress and canceled work packages, review pending, DR-12), `AllPending1280`, `AllComplete1280`, `Blockers1280`, `Loading1280`, `Error1280`, `ThreePhases1280`, `SevenPhases1280`, five tier stories, `BadgesBoard1280`, `Empty1280` (PL-10, built provisionally: if the orchestrator's dispatch states that CP-1 rejected PL-10, omit it and its baseline, and the screen's counts read 21 stories and 21 PNGs), `SubtaskProgress1280` (one work package in each of the nine lanes, all five columns populated), and the extras; title `Mission/Pipeline`, inside the shell mission layout, tags `vw-<n>`.

### T057 Tests

EV-5 to EV-7 once with exact payloads, no-event assertions with positive controls, four view states with the header kept, 3 and 7 phases, custom lane groups, a fully foreign vocabulary, footer/inspector agreement, Tab-walk per tier (the board scroll region counts), 200% root font at 1100 and 720 px.

### T058 Baselines

Exactly 22 PNGs `mission-pipeline--*.png` (21 if the dispatch states that CP-1 rejected PL-10), each Read and compared with `<prototype>/03-pipeline.html` (only AD-1 to AD-3 and confirmed DR-1, DR-2, DR-7 to DR-12).

## Acceptance (all runnable)

1. `ls ... | grep -c '^mission-pipeline--'` prints 22.
2. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check PL-01 is contract-consistent (C5 passes), the inspector shows no arithmetic, footer and inspector agree, DR-12 is the only reason Review and Approved are empty in PL-01, and every baseline against the prototype. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`, and `pnpm visual` (inside the pinned container through `scripts/visual.sh`; 0 diffs on every existing baseline and your new ones). After `data-driven` exists (WP02 onward) also `pnpm lint:data-driven && pnpm test:data-driven`; after `contract` exists (WP01 onward) also `pnpm contract:check && pnpm test:contract`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP07. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
