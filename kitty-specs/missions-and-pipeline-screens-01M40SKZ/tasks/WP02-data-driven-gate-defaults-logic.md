---
work_package_id: WP02
title: Gate data-driven, defaults and logic
dependencies:
- WP01
requirement_refs:
- FR-006
- FR-010
- FR-013
- FR-014
- FR-015
- FR-016
- FR-019
- FR-034
- C-004
- C-007
- NFR-005
- NFR-009
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-missions-and-pipeline-screens-01M40SKZ
base_commit: 7090982adc3799d9d688794696687dc801738d0a
created_at: '2026-10-03T15:17:12.136815+00:00'
subtasks:
- T010
- T011
- T012
- T013
- T014
- T015
- T016
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: eslint.data-driven.config.mjs
create_intent:
- packages/mission-ui/test/defaults.test.ts
- packages/mission-ui/test/lookup.test.ts
- packages/mission-ui/test/placement.test.ts
- packages/mission-ui/test/summary.test.ts
- packages/mission-ui/test/search.test.ts
- packages/mission-ui/test/time.test.ts
- packages/mission-ui/test/step.test.ts
- packages/mission-ui/test/row.test.ts
- packages/mission-ui/test/labels.test.ts
- eslint.data-driven.config.mjs
- gates/data-driven.selftest.ts
- packages/mission-ui/src/defaults/index.ts
- packages/mission-ui/src/defaults/lanes.ts
- packages/mission-ui/src/defaults/phases.ts
- packages/mission-ui/src/defaults/lifecycle.ts
- packages/mission-ui/src/defaults/pipeline-copy.ts
- packages/mission-ui/src/logic/lookup.ts
- packages/mission-ui/src/logic/placement.ts
- packages/mission-ui/src/logic/summary.ts
- packages/mission-ui/src/logic/search.ts
- packages/mission-ui/src/logic/time.ts
- packages/mission-ui/src/logic/step.ts
- packages/mission-ui/src/logic/row.ts
- packages/mission-ui/src/logic/labels.ts
execution_mode: code_change
owned_files:
- eslint.data-driven.config.mjs
- eslint.no-io.config.mjs
- gates/data-driven.selftest.ts
- gates/fixtures/data-driven/**
- gates/plants/data-driven/**
- gates/plants/no-io/**
- packages/mission-ui/src/defaults/**
- packages/mission-ui/src/logic/**
- packages/mission-ui/test/defaults.test.ts
- packages/mission-ui/test/lookup.test.ts
- packages/mission-ui/test/placement.test.ts
- packages/mission-ui/test/summary.test.ts
- packages/mission-ui/test/search.test.ts
- packages/mission-ui/test/time.test.ts
- packages/mission-ui/test/step.test.ts
- packages/mission-ui/test/row.test.ts
- packages/mission-ui/test/labels.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - Gate data-driven, defaults and logic (IC-02)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Land gate `data-driven` (NFR-009) BEFORE any element exists, so no element can hard-code a phase name, lane word or count; then the single vocabulary module `src/defaults/` and the pure logic in `src/logic/` with their unit tests. Also harden the accepted `no-io` gate against inline disable comments (ruling P-10, exception E-07).

## Context

Read `plan.md` (IC-02, shared-files table), `research.md` D-05 to D-08, D-24 to D-28, `contracts/gates.md` (the exact 31-entry selector table S1 to S12, self-test, plant), `data-model.md` (view types, match rule, board placement, lane summary rule, phase state and current step, relative time), `contracts/defaults.md`, `spec.md` FR-006, FR-010, FR-013 to FR-016, FR-019, FR-034, C-004, C-007.

Implementation concern: `plan.md` IC-02. Requirements: FR-006, FR-010, FR-013, FR-014, FR-015, FR-016, FR-019, FR-034, C-004, C-007, NFR-005, NFR-009.

## Precondition (first step, before T001)

Before anything else confirm that `tracer-design-decisions.md` contains the dated entry "Operator approved exceptions E-06, E-07, X-1 (2026-10-03)" (here it covers E-07 in T016 and X-1 in T012). The charter requires operator approval for exceptions; this entry is that approval, and it reaches your lane through the orchestrator's lane mechanics (`plan.md` "Lane mechanics"). If the entry is absent from your worktree: STOP and report; do not edit any accepted gate, config or schema. The reviewer REJECTS if the entry is absent or an exception was exercised beyond its approved scope.

## Subtasks

### T010 Gate config

`eslint.data-driven.config.mjs`: `linterOptions: { noInlineConfig: true }`, 31 `no-restricted-syntax` entries (one per selector alternative, S1 to S12), scope `packages/*/src/**/*.ts` minus the fixed allow-list (`src/defaults/**`, `src/contract/**`, `*.stories.ts`, `fixtures.ts`, `*.fixtures.ts`, `src/story-support/**`). Scripts `lint:data-driven` and `test:data-driven`.

### T011 Self-test that cannot pass vacuously

`gates/data-driven.selftest.ts` with 36 positive fixtures (`gates/fixtures/data-driven/*.ts.txt`, one per selector alternative with the expected selector id), the count guard, negative fixtures, allow-list cases each with a positive control, and the disable-comment fixture. Red first: write each fixture and watch the gate miss it before the selector exists.

### T012 Plant, CI job and proof wiring

`gates/plants/data-driven/` (a lane literal in element source), CI job `data-driven` (boilerplate of the `no-io` job), matrix entry `{ gate: data-driven, timeout: 6, image: '' }` and `all`, the proof-record enum value and `GATES` count 12 (out-of-map schema edit under `kitty-specs/`, exception X-1 again, operator-approved 2026-10-03; the proof-entry-required test from WP01 must still pass for the new id), README row and the gate's Known limitations, CHANGELOG lines, timeouts derived from your measurement by the rule of `gates.md` (and the gate's row there).

### T013 Defaults module

`src/defaults/` (`lanes.ts`, `phases.ts` with `PhaseState`, `DEFAULT_PHASE_STATE`, `PHASE_GLYPH`, `PHASE_IS_CURRENT`, `lifecycle.ts`, `pipeline-copy.ts`, `index.ts`): ALL vocabulary of the gate (14 words plus pending, complete, draft, discarded), card words, filter labels, copy defaults (provisional until CP-1), and the FR-034 result-count phrase (singular and plural). No view-type field is named like a lane or a phase (`RowView.blockedBadge`).

### T014 Logic modules

`src/logic/` `lookup`, `placement` (one algorithm; unknown or null lane handled per D-07), `summary` (lane summary without arithmetic), `search` (plain text, trimmed, case-insensitive substring over name, slug, type, topology; no regular expression), `time` (relative time with `now` property, ISO fallback), `step` (current step), `row` (row view), `labels` (hooks with raw-name fallback).

### T015 Unit tests

One `test/<module>.test.ts` per logic module and `test/defaults.test.ts`: pure functions tested directly with equality counts and the D-34 rules; the complete selector set reports 0 problems on the existing `packages/mission-ui/src` (12 files after the allow-list, verified at plan time) and on the new logic.

### T016 Harden the no-io gate (P-10, E-07)

Add `linterOptions: { noInlineConfig: true }` to `eslint.no-io.config.mjs` and a plant under `gates/plants/no-io/` proving an inline `eslint-disable` no longer silences it; red first (reproduce the silencing, then fix); record exception E-07 (operator-approved 2026-10-03; scope, rationale, sunset) in the hand-off.

## Acceptance (all runnable)

1. `pnpm lint:data-driven && pnpm test:data-driven` exits 0 with fail 0 and a positive pass count; `node scripts/gate-proof.mjs local --only data-driven` and `--only no-io`; `node --test scripts/gate-proof/`; `node scripts/gate-proof.mjs coverage` clean.
2. The plant token is absent from the clean output; the wall-clock of the gate and its proof leg are in the hand-off.
3. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check that every one of the 31 entries has a positive fixture that fails if the entry is removed, that the allow-list cannot widen silently, that no vocabulary word occurs outside `src/defaults/`, that the E-07 plant fails before the fix, and that logic does no arithmetic on contract values. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Out-of-map edits permitted (recorded in the hand-off with a one-line rationale)

`.github/workflows/ci.yml` (the `data-driven` job, matrix entry, `all.needs`), `package.json` and `pnpm-lock.yaml` (the `lint:data-driven` and `test:data-driven` scripts), `scripts/gate-proof/gate-proof.test.mjs` (`GATES` count 12), `README.md` (gates row and Known limitations), both `CHANGELOG.md`, the proof-record schema under `kitty-specs/storybook-scaffold-01M3SYDA/contracts/` (exception X-1) and the `data-driven` row of `contracts/gates.md`. These files are owned by WP01; the plan's "Shared files" table grants WP02 exactly these edits.

## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP01. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
