---
work_package_id: WP10
title: Integration, baselines, timing and documentation
dependencies:
- WP09
requirement_refs:
- FR-027
- FR-029
- FR-032
- NFR-001
- NFR-002
- NFR-008
- C-006
- C-009
- C-011
- SC-001
- SC-005
- SC-006
- SC-007
- SC-008
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
subtasks:
- T059
- T060
- T061
- T062
- T063
- T064
- T065
phase: Phase 4 - Integration
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/test/host-composition.test.ts
create_intent:
- packages/mission-ui/test/host-composition.test.ts
- scripts/terminology.mjs
- scripts/terminology.test.mjs
execution_mode: code_change
owned_files:
- packages/mission-ui/test/host-composition.test.ts
- scripts/terminology.mjs
- scripts/terminology.test.mjs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP10 - Integration, baselines, timing and documentation (IC-09)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Integrate both chains (the orchestrator has merged WP08 into this lane), prove stability and parity, set the CI timeouts from recorded runs, write the documentation, add the host-composition and terminology tests, and prepare the inputs of the pull request description. You do NOT push and do NOT open the pull request.

## Context

Read `plan.md` (IC-09, "Lane mechanics" item 3, PR shape), `research.md` D-34 to D-37, `contracts/gates.md` (Timeouts and timing record), `spec.md` SC-001 to SC-008, C-006, C-009, `tracer-design-decisions.md` (CP-1 entry, P-9).

Implementation concern: `plan.md` IC-09. Requirements: FR-027, FR-029, FR-032, NFR-001, NFR-002, NFR-008, C-006, C-009, C-011, SC-001, SC-005, SC-006, SC-007, SC-008.

## Subtasks

### T059 First step: full gate run on the merged tree

Before editing, run every gate on the merged tree; the built Storybook index lists 118 stories, 60 of them new (117 and 59 if CP-1 rejected PL-10; the dispatch states the outcome). If the tree lacks either chain's work, STOP and report. Conflicts in `custom-elements.json` are resolved by `pnpm manifest:generate` only; one regeneration if a work package reported a surface change.

### T060 Five consecutive clean visual runs and gate-proof

Five consecutive `pnpm visual` runs inside the pinned container with 0 failures on an unchanged commit (NFR-002); `pnpm gate-proof`; record the local timings.

### T061 CI timeouts and documents

Write the visual and unit-tests timeouts of `contracts/gates.md` into `ci.yml` (derived from the recorded runs, not from a pull-request run that cannot exist yet); for `contract` and `data-driven` re-record C and L on the integrated tree and confirm or raise the provisional timeouts in `ci.yml` and the `gates.md` rows (the latter an out-of-map edit under `kitty-specs/`); reconcile both CHANGELOGs with the mission summary line, the README gates rows and prose, and check the data-driven Known limitations.

### T062 Host-composition test (SC-008)

`test/host-composition.test.ts`: a host renders both screens passing only contract-shaped data, the host-passed branch, `now` and the optional `stale`.

### T063 Terminology (C-009) and `test:scripts`

`scripts/terminology.mjs` scanning `packages/*/src` and `quickstart.md` for the word "feature" (whole word, case-insensitive), `scripts/terminology.test.mjs` with a known-positive sample so it can fail; extend `test:scripts` with it (ruling P-9, E-06; `package.json`, `test:terminology`).

### T064 Parity, keyboard and large-text checks

118 stories equal 118 baselines (equality, no "at least"); the Tab-walks at every tier and the 200% root-font checks at 1100 and 720 px pass; SC-001 and SC-005 verified against the state matrix.

### T065 Drift review and PR inputs

Side-by-side review of every new baseline against the prototype, against AD-1 to AD-3 and the register as confirmed at CP-1 (SC-007, NFR-008); assemble in the hand-off the PR-description inputs: exceptions E-01 to E-07 and X-1, gaps G-01 to G-08, the confirmed drift register, spec amendment rulings P-1 to P-10, local baseline timings, the CI runs the timeouts derived from, the `contract:verify-remote` output from WP01, and the contract pin (sha, `infoVersion`).

## Acceptance (all runnable)

1. `pnpm test:scripts` passes with the terminology test, which fails when fed its known-positive sample.
2. Five consecutive `pnpm visual` runs on one unchanged commit: 0 failures each; the parity test asserts 118 stories and 118 baselines by equality (117 and 117 if CP-1 rejected PL-10; the test is authoritative).
3. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check that the first step really ran on a tree containing both chains, the five runs are consecutive on one commit, the timeouts are derived not guessed, the terminology test can fail, and the PR inputs are complete and contain no absolute paths or usernames. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`, and `pnpm visual` (inside the pinned container through `scripts/visual.sh`; 0 diffs on every existing baseline and your new ones). After `data-driven` exists (WP02 onward) also `pnpm lint:data-driven && pnpm test:data-driven`; after `contract` exists (WP01 onward) also `pnpm contract:check && pnpm test:contract`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Out-of-map edits permitted (recorded in the hand-off with a one-line rationale)

`.github/workflows/ci.yml` (timeouts only), `package.json` (`test:terminology`, `test:scripts` extended), `README.md`, both `CHANGELOG.md`, `packages/mission-ui/custom-elements.json` (one regeneration only if a work package reported a surface change; `pnpm manifest:generate` only), the timeout rows of `contracts/gates.md` under `kitty-specs/`. These are owned by earlier work packages; the plan grants WP10 exactly these edits.

## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP09. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
