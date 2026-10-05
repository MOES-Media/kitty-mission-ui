---
work_package_id: WP04
title: 'Foundation: skeletons and the surface freeze'
dependencies:
- WP03
requirement_refs:
- FR-026
- FR-027
- FR-029
- FR-031
- FR-034
- NFR-002
- C-001
- C-012
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
subtasks:
- T023
- T024
- T025
- T026
- T027
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/index.ts
create_intent: []
execution_mode: code_change
owned_files:
- packages/mission-ui/src/index.ts
- packages/mission-ui/custom-elements.json
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP04 - Foundation: skeletons and the surface freeze (IC-03b)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Create skeleton classes for all five elements carrying the FULL public surface, register them, add the per-file ESLint overrides, and regenerate the manifest ONCE: that regeneration is the surface freeze. Precondition: checkpoint CP-1 has completed.

## Context

Read `plan.md` (IC-03b, CP-1, "Shared files"), `contracts/sk-missions-screen.md`, `sk-pipeline-screen.md`, `sk-filter-toggle-group.md`, `sk-phase-bar.md`, `sk-work-package-board.md` (the surface to freeze, including the P-7 properties and defaults), `research.md` D-01, D-03, D-04, D-15, and the WP03 spike report as recorded in `tracer-design-decisions.md`.

Implementation concern: `plan.md` IC-03b. Requirements: FR-026, FR-027, FR-029, FR-031, FR-034, NFR-002, C-001, C-012.

## Subtasks

### T023 FILE PRECONDITION (first step, first exit check)

Before anything else confirm that `tracer-design-decisions.md` contains a dated CP-1 entry marked `confirmed`, naming the confirmed or amended DR-1 to DR-12 list, the copy defaults and the S2 outcome, committed BEFORE your first commit. The entry reaches your lane only through the orchestrator (`plan.md` "Lane mechanics" item 5: the target branch is merged into the lane-d worktree after CP-1 is committed and before `implement WP04`; the dispatch names the CP-1 commit hash). Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree before touching anything. If it is absent or not an ancestor: STOP and report; do not start; never write the entry yourself. The reviewer REJECTS if it is absent or was not present before the first WP04 commit (`git merge-base --is-ancestor <CP-1 commit> <first WP04 commit>` on the lane branch; the first WP04 commit follows the orchestrator's merge commit).

### T024 Skeleton elements

Five element classes (`sk-missions-screen`, `sk-pipeline-screen`, `sk-filter-toggle-group`, `sk-phase-bar`, `sk-work-package-board`) each with the FULL public surface from the contracts: properties with attributes, defaults (including `missionsHref`, `errorMessage`, `label`, `filter`, `query`, `loadingMore`, `pageInfo`, `project`, `laneGroups`, `labels`), `@fires`, `@slot`, `@csspart`, `@screen`, and literal `dispatchEvent` calls for the seven events (EV-1 to EV-7); the screens declare child events with `@fires`; the surface reflects the spike outcomes. Bodies may be minimal. Files: one element file per directory under `src/elements/<tag>/` (these are the files the later work packages own and fill).

### T025 Registration and type exports

Guarded registration of the five tags and the type exports only in `src/index.ts`; typed `HTMLElementEventMap` entries for the events.

### T026 ESLint overrides

`eslint.config.mjs`: per-file overrides E-01 to E-03 for every new file, each justified by its spike (E-01 raw `<button>`/`class=` for the filter group, E-02 board classes, E-03 breadcrumb/empty-state/progress classes), and the `story-support` import ban (no element may import `story-support`).

### T027 The freeze

Run `pnpm manifest:generate` once, commit `custom-elements.json`, and run every gate. From here on no work package changes the public surface; an unavoidable change is a reported exception regenerated once in WP10.

## Acceptance (all runnable)

1. `pnpm manifest:check` exits 0 and the manifest lists the five tags, every property of the contracts with its default, and all seven events.
2. A planted undeclared event in a skeleton makes the `manifest` gate fail (revert check).
3. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check the precondition entry predates the first commit, the surface equals the five contracts (including P-7 properties and defaults), the S1 to S3 outcomes are reflected, and the manifest was generated, not edited. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`, and `pnpm visual` (inside the pinned container through `scripts/visual.sh`; 0 diffs on every existing baseline and your new ones). After `data-driven` exists (WP02 onward) also `pnpm lint:data-driven && pnpm test:data-driven`; after `contract` exists (WP01 onward) also `pnpm contract:check && pnpm test:contract`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Out-of-map edits permitted (recorded in the hand-off with a one-line rationale)

`eslint.config.mjs` (owned by WP01; the plan grants WP04 the E-01 to E-03 overrides and the `story-support` import ban) and the five element files `src/elements/<tag>/<tag>.ts` that WP04 creates as skeletons and WP05 to WP09 then own and fill.

## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP03. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
