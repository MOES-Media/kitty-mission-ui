---
work_package_id: WP08
title: sk-missions-screen (chain B)
dependencies:
- WP05
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-010
- FR-011
- FR-023
- FR-024
- FR-025
- FR-028
- FR-029
- FR-034
- NFR-003
- NFR-004
- NFR-006
- SC-002
- SC-005
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
subtasks:
- T044
- T045
- T046
- T047
- T048
- T049
- T050
- T051
phase: Phase 3 - Screens
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-missions-screen/
create_intent:
- packages/mission-ui/src/elements/sk-missions-screen/mission-row-parts.ts
- packages/mission-ui/src/elements/sk-missions-screen/fixtures.ts
- packages/mission-ui/src/elements/sk-missions-screen/sk-missions-screen.stories.ts
- packages/mission-ui/test/sk-missions-screen.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-missions-screen/**
- packages/mission-ui/test/sk-missions-screen.test.ts
- apps/storybook/tests/visual/__snapshots__/mission-missions--*.png
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP08 - sk-missions-screen (chain B) (IC-07)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Build the Missions screen: header, search, six filters (via WP05's element), rows, view states, paging, element-side filter and search, the result-count live region (FR-034, ruling P-5), 24 stories and baselines, and tests including NFR-006 with structural assertions.

## Context

Read `contracts/sk-missions-screen.md` (authoritative, including the live-region bullet), `data-model.md` (match rule, result-count announcement, relative time), `research.md` D-20 to D-24, D-29, D-30, DR-3 to DR-6, `spec.md` MS-01 to MS-08, EV-1 to EV-4, FR-001 to FR-011, FR-034, `src/defaults/` and `src/logic/` (WP02).

Implementation concern: `plan.md` IC-07. Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-023, FR-024, FR-025, FR-028, FR-029, FR-034, NFR-003, NFR-004, NFR-006, SC-002, SC-005.

## Subtasks

### T044 Header, view states, frame

Header always renders (eyebrow, `h1` "Missions", supporting text from what is present); `loading` busy region labelled "Reading local Mission index"; `error` `sk-notice` danger with assertive announce, heading "Mission index unavailable", body from `errorMessage` or the host-neutral default; `empty` "No Missions in this project" with search and filters hidden; unknown status collapses to `empty`.

### T045 Rows (private fragment)

`mission-row-parts.ts`: one `sk-action-row selectable` per Mission in an `li`: name, slug, type, topology, blocked and stale badges, lane summary, lifecycle badge (draft only under All), relative last activity via `now` and hooks; activation emits `sk-open-mission` `{ missionId, slug }` once (pointer, Enter, Space); the screen never navigates.

### T046 Search and filters

`sk-form-input type="search"` with layout-hidden label "Search Missions"; `sk-filter-toggle-group` from WP05; semi-controlled `filter` and `query`; filtering by toggling `hidden` on the wrapping `li` (D-23), "No Missions match" with the hint; `sk-search` `{ query }` on user input only (trimmed; whitespace-only change emits nothing); `sk-filter-change` crosses the screen.

### T047 Paging

"Load more Missions" row as the last `li` while `hasNextPage`; `sk-load-more` `{ cursor }` once per activation, inert while `loadingMore`; no infinite scroll.

### T048 Result-count live region (FR-034)

Visually hidden element with `role="status"` and `aria-live="polite"` announcing the number of Missions shown (phrase from `src/defaults/`) after a filter change, a search change and after load more; empty on first render; not a control, no tab stop, no event. Red first: the a11y test asserts politeness, text after each of the three changes, that it is visually hidden, and that nothing is announced on load.

### T049 Fixtures and the 24 stories

Per the story table of `plan.md`: `Populated1280`, five `Filter*1280`, `FilterAllWithDrafts1280` (data must differ from MS-01), `SearchNoMatchMorePages1280`, `FilterNoMatchLastPage1280`, `Empty1280`, `Loading1280`, `Error1280`, four `Paged*1280`, five tier stories, `LongNames1280`, `SearchFocused1280`, `RowFocused1280`; title `Mission/Missions`, each inside the shell, tags `vw-<n>`.

### T050 Tests

EV-1 to EV-4 (once, deep-equal, incl. a duplicate-name pair told apart by slug), no-event assertions with positive controls, view-state tests, NFR-006 (500 Missions: 200 ms budget plus structural proof: 500 `li`, same node identities, strict-subset hidden, real keystroke path), Tab-walk per tier (counts per the story tags), 200% root font at 1100 px and 720 px, the live-region test.

### T051 Baselines

Exactly 24 PNGs `mission-missions--*.png`, each Read and compared with `<prototype>/02-missions.html` (only AD-1, AD-3 and confirmed DR-3 to DR-6).

## Acceptance (all runnable)

1. `ls ... | grep -c '^mission-missions--'` prints 24; the NFR-006 test and the live-region test are listed in the `pnpm test` output.
2. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check the hidden-`li` design is what the NFR-006 structural assertions prove, the live region is not a control and fires on all three triggers only, `sk-open-mission` payload is exact, and every baseline against the prototype. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`, and `pnpm visual` (inside the pinned container through `scripts/visual.sh`; 0 diffs on every existing baseline and your new ones). After `data-driven` exists (WP02 onward) also `pnpm lint:data-driven && pnpm test:data-driven`; after `contract` exists (WP01 onward) also `pnpm contract:check && pnpm test:contract`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP05. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
