---
work_package_id: WP03
title: 'Foundation: shell percentage change and spikes S1 to S4'
dependencies:
- WP02
requirement_refs:
- FR-026
- FR-027
- FR-029
- FR-031
- FR-032
- FR-033
- NFR-002
- C-005
- C-010
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-missions-and-pipeline-screens-01M40SKZ
base_commit: 7090982adc3799d9d688794696687dc801738d0a
created_at: '2026-10-03T16:14:59.180805+00:00'
subtasks:
- T017
- T018
- T019
- T020
- T021
- T022
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-mission-shell/
create_intent:
- packages/mission-ui/src/library-sheets.ts
- packages/mission-ui/src/story-support/shell-frame.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/shell-types.ts
- packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts
- packages/mission-ui/test/sk-mission-shell.test.ts
- packages/mission-ui/src/library-sheets.ts
- packages/mission-ui/src/story-support/**
- apps/storybook/tests/visual/stories.visual.spec.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - Foundation: shell percentage change and spikes S1 to S4 (IC-03a)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Make the additive shell change (D-28, FR-033: optional `ShellMission.progress.percentage`), change the visual spec to await every nested custom element, create the shared `library-sheets.ts` and the story-only `story-support/shell-frame.ts`, and run spikes S1 to S4 as throwaway stories. This work package FREEZES NOTHING and ends with the spike report and its approval; its report is the input to checkpoint CP-1.

## Context

Read `plan.md` (IC-03a, CP-1), `research.md` D-15 to D-17, D-28, D-35, "Spikes" and the gaps table, `contracts/sk-*.md` (parts and slots each spike may change), the shell's existing contract in `kitty-specs/app-shell-01M3V82X/contracts/`, and the prototypes `<prototype>/02-missions.html` and `<prototype>/03-pipeline.html`.

Implementation concern: `plan.md` IC-03a. Requirements: FR-026, FR-027, FR-029, FR-031, FR-032, FR-033, NFR-002, C-005, C-010.

## Subtasks

### T017 Shell percentage (FR-033)

In `shell-types.ts` add optional `percentage` to `ShellMission.progress`; in `shell-parts.ts` `renderFooter` shows it verbatim when present and unchanged when absent. Four tests first (red): verbatim, absent, `total` 0, non-finite. Prove the 58 existing baselines compare identical: `pnpm visual` shows 0 diffs before and after.

### T018 Visual spec change

`apps/storybook/tests/visual/stories.visual.spec.ts` awaits `updateComplete` of every nested custom element before the screenshot (R-05); the 58 existing baselines stay identical.

### T019 Library sheets and shell frame helper

`src/library-sheets.ts` adopts the library's styles-only families (segmented-choice, workflow-board, workflow-lane, breadcrumbs, empty-state; D-15) and `src/story-support/shell-frame.ts` composes a story inside the shell (outside the manifest globs, not exported, ESLint import ban follows in WP04).

### T020 Spikes S1 and S2

S1: the adopted segmented-choice sheet inside a shadow root with `aria-pressed` states and focus, against `<prototype>/02-missions.html`. S2: phase-bar candidates A, B, C of D-17 against `<prototype>/03-pipeline.html`; pick the smallest drift (B needs exception E-04, token-only paint). Throwaway stories are NOT committed.

### T021 Spikes S3 and S4

S3: `sk-action-row selectable` row and card layout, `sk-notice announce="assertive"` (role alert), `sk-form-input` with a layout-hidden label, `hidden` on the wrapping `li`, `::part(trigger)` override (G-08). S4: native `<progress>` without `<label>` inside `.sk-progress` in the action-row button. Pass rule: only DR-listed drift.

### T022 Spike report

Write the report in the hand-off, per spike: question, evidence (what was rendered, widths, side-by-side description), outcome, and the effect on any element's parts, slots or properties and on DR-8. The orchestrator copies it into `tracer-design-decisions.md`; you write nothing under `tracer-*.md`.

## Acceptance (all runnable)

1. `pnpm visual` before and after: 58 baselines, 0 diffs; the four shell tests fail before the change and pass after.
2. `git status --short` shows no spike story and no PNG added.
3. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check the shell change is additive (no existing baseline moved), the four tests are real (revert check), the spike report answers each pass rule with evidence, and nothing from a spike was committed. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`, and `pnpm visual` (inside the pinned container through `scripts/visual.sh`; 0 diffs on every existing baseline and your new ones). After `data-driven` exists (WP02 onward) also `pnpm lint:data-driven && pnpm test:data-driven`; after `contract` exists (WP01 onward) also `pnpm contract:check && pnpm test:contract`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP02. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
