# Tasks: Missions and Pipeline screens

Mission `missions-and-pipeline-screens-01M40SKZ`, target branch `feat/missions-and-pipeline-screens-4`. Ten work packages follow the plan's implementation concerns IC-01 to IC-09 (IC-03 split into 03a and 03b); one operator checkpoint CP-1 sits between WP03 and WP04 and is NOT a work package. Prompts live in `tasks/`. Work packages never push and never open pull requests: the mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase (orchestrator-owned).

## Dependency graph

```
WP01 -> WP02 -> WP03 -> [CP-1: orchestrator, operator confirms DR-1..DR-12 and copy defaults] -> WP04
WP04 -> WP06 -> WP07 -> WP09      (chain A: phase bar, board, Pipeline)
WP04 -> WP05 -> WP08              (chain B: filter group, Missions)
WP09 -> WP10 <- WP08 (merged in by the orchestrator, plan.md "Lane mechanics" item 3)
```

**CP-1** (checkpoint, not a work package): after WP03 is approved and its spike report is in `tracer-design-decisions.md`, the orchestrator obtains the operator's confirmation or amendment of DR-1 to DR-12 and the copy defaults (ruling P-6; DR-8 depends on the S2 outcome) and records a dated entry `CP-1 confirmed` in `tracer-design-decisions.md` and in `spec.md` Clarifications. The tool cannot express CP-1 as a dependency, so WP04's first step and first exit check is a FILE PRECONDITION: that entry exists and was committed before WP04's first commit. WP04 stops and reports if it is absent; its reviewer REJECTS if it is absent. The entry reaches WP04's lane worktree through the orchestrator (`plan.md` "Lane mechanics" item 5): after CP-1 is committed on the target branch, the orchestrator pre-creates lane-d from the approved WP03 tip, runs `git merge --no-ff feat/missions-and-pipeline-screens-4` in the lane-d worktree, verifies `git merge-base --is-ancestor <CP-1 commit> HEAD`, and only then runs `implement WP04`, naming the CP-1 commit in the dispatch. WP05 to WP10 depend on WP04 and therefore on CP-1.

**Operator approval of E-06, E-07 and X-1** (given 2026-10-03, recorded in `tracer-design-decisions.md` as "Operator approved exceptions E-06, E-07, X-1 (2026-10-03)"): WP01 (E-06, X-1) and WP02 (E-07, X-1) carry a first-step file precondition that this entry exists in their worktree; it is an ancestor of every lane because it is committed before the first claim (`plan.md` Lane mechanics item 5a).

**PL-10 is conditional on CP-1.** WP09 builds `Empty1280` provisionally; if CP-1 rejects it, it is removed with its baseline. Totals with PL-10: Pipeline 22 stories, 60 new, 118 total. Without it: Pipeline 21, 59 new, 117 total (WP09 and WP10 parity assertions read accordingly; the orchestrator states the outcome in their dispatch).

**Parallelism**: chains A (WP06, WP07, WP09) and B (WP05, WP08) share no ancestor beyond WP04 and have disjoint owned files (element directories, test files, baseline name patterns); WP10 integrates. Shared files (`ci.yml`, `package.json`, `eslint.config.mjs`, README, CHANGELOGs, `gate-proof.test.mjs`, `custom-elements.json`) are owned by WP01 (`ci.yml`, `package.json`, `eslint.config.mjs`, README, CHANGELOGs, `gate-proof.test.mjs`) and WP04 (`custom-elements.json`) and edited by WP02, WP04 and WP10 only as recorded out-of-map edits that the plan's "Shared files" table grants; they are listed under "Out-of-map edits permitted" per work package below, not as owned files, and the parallel chains never touch them. The owned-file sets (the WP frontmatter and `lanes.json`, which are tool-owned and authoritative) are disjoint across all ten work packages. Each work package commits its out-of-map edits itself with plain `git` before `move-task ... for_review` (`plan.md` Lane mechanics item 6: the tool refuses to auto-commit uncommitted paths outside `owned_files`).

**Out-of-map edits** (the tool bans `kitty-specs/` paths in a code work package's `owned_files`, so these are recorded edits, not owned files): `kitty-specs/storybook-scaffold-01M3SYDA/contracts/gate-proof-record.schema.json` (WP01, WP02; exception X-1) the five skeleton element files created by WP04 (owned by WP05 to WP09 afterwards), and the timeout rows of `kitty-specs/missions-and-pipeline-screens-01M40SKZ/contracts/gates.md` (WP01, WP02, WP10).

**PR size**: one pull request for the mission is recommended; the diff is large (about 60 baselines, two gates, five elements) but is sliced for review as D-36 names (contract tooling and gates; defaults, logic and data-driven gate; shell change, spikes and skeletons; filter group and Missions; phase bar, board and Pipeline; integration). No per-work-package split is recommended; this is a decision for the orchestrator and operator.

## Subtask Index

| ID | Description | WP | Parallel |
|----|-------------|----|----------|
| T001 | Baseline and spike S0 (WP01) | WP01 | No |
| T002 | Vendor the contract and the pin (WP01) | WP01 | No |
| T003 | Dependencies (WP01) | WP01 | No |
| T004 | Generator (WP01) | WP01 | No |
| T005 | Checker and negative tests (WP01) | WP01 | No |
| T006 | Gate wiring and exception X-1 (WP01) | WP01 | No |
| T007 | Hygiene e-mail rule (WP01) | WP01 | No |
| T008 | Wire the node:test suites (P-9, E-06; hygiene, gate-proof, preflight, manifest-screen) (WP01) | WP01 | No |
| T009 | ESLint, README, CHANGELOG (WP01) | WP01 | No |
| T010 | Gate config (WP02) | WP02 | No |
| T011 | Self-test that cannot pass vacuously (WP02) | WP02 | No |
| T012 | Plant, CI job and proof wiring (WP02) | WP02 | No |
| T013 | Defaults module (WP02) | WP02 | No |
| T014 | Logic modules (WP02) | WP02 | No |
| T015 | Unit tests (WP02) | WP02 | No |
| T016 | Harden the no-io gate (P-10, E-07) (WP02) | WP02 | No |
| T017 | Shell percentage (FR-033) (WP03) | WP03 | No |
| T018 | Visual spec change (WP03) | WP03 | No |
| T019 | Library sheets and shell frame helper (WP03) | WP03 | No |
| T020 | Spikes S1 and S2 (WP03) | WP03 | No |
| T021 | Spikes S3 and S4 (WP03) | WP03 | No |
| T022 | Spike report (WP03) | WP03 | No |
| T023 | FILE PRECONDITION (first step, first exit check) (WP04) | WP04 | No |
| T024 | Skeleton elements (WP04) | WP04 | No |
| T025 | Registration and type exports (WP04) | WP04 | No |
| T026 | ESLint overrides (WP04) | WP04 | No |
| T027 | The freeze (WP04) | WP04 | No |
| T028 | Render the group (WP05) | WP05 | Yes |
| T029 | Event and semantics (WP05) | WP05 | Yes |
| T030 | Keyboard and tiers (WP05) | WP05 | Yes |
| T031 | Fixtures and the 4 stories (WP05) | WP05 | Yes |
| T032 | Tests and baselines (WP05) | WP05 | Yes |
| T033 | Data-driven render (WP06) | WP06 | Yes |
| T034 | S2 outcome (WP06) | WP06 | Yes |
| T035 | Fixtures and the 4 stories (WP06) | WP06 | Yes |
| T036 | Behaviour tests (WP06) | WP06 | Yes |
| T037 | Baselines (WP06) | WP06 | Yes |
| T038 | Columns and placement (WP07) | WP07 | Yes |
| T039 | Cards (WP07) | WP07 | Yes |
| T040 | Event (WP07) | WP07 | Yes |
| T041 | Scroll region (P-4) (WP07) | WP07 | Yes |
| T042 | Fixtures and the 6 stories (WP07) | WP07 | Yes |
| T043 | Tests and baselines (WP07) | WP07 | Yes |
| T044 | Header, view states, frame (WP08) | WP08 | Yes |
| T045 | Rows (private fragment) (WP08) | WP08 | Yes |
| T046 | Search and filters (WP08) | WP08 | Yes |
| T047 | Paging (WP08) | WP08 | Yes |
| T048 | Result-count live region (FR-034) (WP08) | WP08 | Yes |
| T049 | Fixtures and the 24 stories (WP08) | WP08 | Yes |
| T050 | Tests (WP08) | WP08 | Yes |
| T051 | Baselines (WP08) | WP08 | Yes |
| T052 | Header and breadcrumb (WP09) | WP09 | Yes |
| T053 | View states (WP09) | WP09 | Yes |
| T054 | Composition (WP09) | WP09 | Yes |
| T055 | Inspector (WP09) | WP09 | Yes |
| T056 | Fixtures and the 22 stories (WP09) | WP09 | Yes |
| T057 | Tests (WP09) | WP09 | Yes |
| T058 | Baselines (WP09) | WP09 | Yes |
| T059 | First step: full gate run on the merged tree (WP10) | WP10 | No |
| T060 | Five consecutive clean visual runs and gate-proof (WP10) | WP10 | No |
| T061 | CI timeouts and documents (WP10) | WP10 | No |
| T062 | Host-composition test (SC-008) (WP10) | WP10 | No |
| T063 | Terminology (C-009) and `test:scripts` (WP10) | WP10 | No |
| T064 | Parity, keyboard and large-text checks (WP10) | WP10 | No |
| T065 | Drift review and PR inputs (WP10) | WP10 | No |

## WP01: Baseline, contract tooling and gate contract (IC-01)

- Prompt: `tasks/WP01-contract-tooling-and-gate.md`
- Depends on: none
- Requirements: FR-026, FR-027, FR-030, FR-031, C-002, C-003, C-008, NFR-001, NFR-007, NFR-010
- Subtasks: T001-T009
- Owned files: `contracts/spec-kitty/**`, `scripts/contract/**`, `scripts/hygiene/**`, `scripts/gate-proof/gate-proof.test.mjs`, `packages/mission-ui/src/contract/**`, `gates/plants/contract/**`, `gates/plants/hygiene/**`, `.gitattributes`, `.github/workflows/ci.yml`, `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `README.md`, `CHANGELOG.md`, `packages/mission-ui/CHANGELOG.md`
- Estimated prompt size: about 120 lines of dense guidance

T001 Baseline and spike S0 (WP01)
T002 Vendor the contract and the pin (WP01)
T003 Dependencies (WP01)
T004 Generator (WP01)
T005 Checker and negative tests (WP01)
T006 Gate wiring and exception X-1 (WP01)
T007 Hygiene e-mail rule (WP01)
T008 Wire the node:test suites (P-9, E-06) (WP01)
T009 ESLint, README, CHANGELOG (WP01)

## WP02: Gate data-driven, defaults and logic (IC-02)

- Prompt: `tasks/WP02-data-driven-gate-defaults-logic.md`
- Depends on: WP01
- Requirements: FR-006, FR-010, FR-013, FR-014, FR-015, FR-016, FR-019, FR-034, C-004, C-007, NFR-005, NFR-009
- Subtasks: T010-T016
- Owned files: `eslint.data-driven.config.mjs`, `eslint.no-io.config.mjs`, `gates/data-driven.selftest.ts`, `gates/fixtures/data-driven/**`, `gates/plants/data-driven/**`, `gates/plants/no-io/**`, `packages/mission-ui/src/defaults/**`, `packages/mission-ui/src/logic/**`, `packages/mission-ui/test/defaults.test.ts`, `packages/mission-ui/test/lookup.test.ts`, `packages/mission-ui/test/placement.test.ts`, `packages/mission-ui/test/summary.test.ts`, `packages/mission-ui/test/search.test.ts`, `packages/mission-ui/test/time.test.ts`, `packages/mission-ui/test/step.test.ts`, `packages/mission-ui/test/row.test.ts`, `packages/mission-ui/test/labels.test.ts`
- Out-of-map edits permitted (not owned; committed by the WP itself): `.github/workflows/ci.yml`, `package.json`, `pnpm-lock.yaml`, `scripts/gate-proof/gate-proof.test.mjs`, `README.md`, `CHANGELOG.md`, `packages/mission-ui/CHANGELOG.md`, and under `kitty-specs/` the proof-record schema (X-1) and its `gates.md` row
- Estimated prompt size: about 120 lines of dense guidance

T010 Gate config (WP02)
T011 Self-test that cannot pass vacuously (WP02)
T012 Plant, CI job and proof wiring (WP02)
T013 Defaults module (WP02)
T014 Logic modules (WP02)
T015 Unit tests (WP02)
T016 Harden the no-io gate (P-10, E-07) (WP02)

## WP03: Foundation: shell percentage change and spikes S1 to S4 (IC-03a)

- Prompt: `tasks/WP03-shell-change-and-spikes.md`
- Depends on: WP02
- Requirements: FR-026, FR-027, FR-029, FR-031, FR-032, FR-033, NFR-002, C-005, C-010
- Subtasks: T017-T022
- Owned files: `packages/mission-ui/src/shell-types.ts`, `packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts`, `packages/mission-ui/test/sk-mission-shell.test.ts`, `packages/mission-ui/src/library-sheets.ts`, `packages/mission-ui/src/story-support/**`, `apps/storybook/tests/visual/stories.visual.spec.ts`
- Estimated prompt size: about 120 lines of dense guidance

T017 Shell percentage (FR-033) (WP03)
T018 Visual spec change (WP03)
T019 Library sheets and shell frame helper (WP03)
T020 Spikes S1 and S2 (WP03)
T021 Spikes S3 and S4 (WP03)
T022 Spike report (WP03)

## WP04: Foundation: skeletons and the surface freeze (IC-03b)

- Prompt: `tasks/WP04-skeletons-and-surface-freeze.md`
- Depends on: WP03
- Requirements: FR-026, FR-027, FR-029, FR-031, FR-034, NFR-002, C-001, C-012
- Subtasks: T023-T027
- Owned files: `packages/mission-ui/src/index.ts`, `packages/mission-ui/custom-elements.json`
- Out-of-map edits permitted (not owned; committed by the WP itself): `eslint.config.mjs` (E-01 to E-03 overrides and the `story-support` import ban) and the five skeleton element files it creates (owned by WP05 to WP09 afterwards)
- Estimated prompt size: about 120 lines of dense guidance

T023 FILE PRECONDITION (first step, first exit check) (WP04)
T024 Skeleton elements (WP04)
T025 Registration and type exports (WP04)
T026 ESLint overrides (WP04)
T027 The freeze (WP04)

## WP05: sk-filter-toggle-group pattern element (chain B) (IC-04)

- Prompt: `tasks/WP05-filter-toggle-group-element.md`
- Depends on: WP04
- Requirements: FR-003, FR-024, FR-025, FR-028, FR-029, FR-031
- Subtasks: T028-T032
- Owned files: `packages/mission-ui/src/elements/sk-filter-toggle-group/**`, `packages/mission-ui/test/sk-filter-toggle-group.test.ts`, `apps/storybook/tests/visual/__snapshots__/mission-filter-toggle-group--*.png`
- Estimated prompt size: about 120 lines of dense guidance

T028 Render the group (WP05)
T029 Event and semantics (WP05)
T030 Keyboard and tiers (WP05)
T031 Fixtures and the 4 stories (WP05)
T032 Tests and baselines (WP05)

## WP06: sk-phase-bar pattern element (chain A) (IC-05)

- Prompt: `tasks/WP06-phase-bar-element.md`
- Depends on: WP04
- Requirements: FR-013, FR-014, FR-025, FR-028, FR-029, C-007, SC-003
- Subtasks: T033-T037
- Owned files: `packages/mission-ui/src/elements/sk-phase-bar/**`, `packages/mission-ui/test/sk-phase-bar.test.ts`, `apps/storybook/tests/visual/__snapshots__/mission-phase-bar--*.png`, `stylelint.config.mjs`
- Estimated prompt size: about 120 lines of dense guidance

T033 Data-driven render (WP06)
T034 S2 outcome (WP06)
T035 Fixtures and the 4 stories (WP06)
T036 Behaviour tests (WP06)
T037 Baselines (WP06)

## WP07: sk-work-package-board pattern element (chain A) (IC-06)

- Prompt: `tasks/WP07-work-package-board-element.md`
- Depends on: WP06
- Requirements: FR-015, FR-016, FR-017, FR-018, FR-025, FR-028, FR-029, C-007, NFR-003, SC-004
- Subtasks: T038-T043
- Owned files: `packages/mission-ui/src/elements/sk-work-package-board/**`, `packages/mission-ui/test/sk-work-package-board.test.ts`, `apps/storybook/tests/visual/__snapshots__/mission-work-package-board--*.png`
- Estimated prompt size: about 120 lines of dense guidance

T038 Columns and placement (WP07)
T039 Cards (WP07)
T040 Event (WP07)
T041 Scroll region (P-4) (WP07)
T042 Fixtures and the 6 stories (WP07)
T043 Tests and baselines (WP07)

## WP08: sk-missions-screen (chain B) (IC-07)

- Prompt: `tasks/WP08-missions-screen.md`
- Depends on: WP05
- Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-023, FR-024, FR-025, FR-028, FR-029, FR-034, NFR-003, NFR-004, NFR-006, SC-002, SC-005
- Subtasks: T044-T051
- Owned files: `packages/mission-ui/src/elements/sk-missions-screen/**`, `packages/mission-ui/test/sk-missions-screen.test.ts`, `apps/storybook/tests/visual/__snapshots__/mission-missions--*.png`
- Estimated prompt size: about 120 lines of dense guidance

T044 Header, view states, frame (WP08)
T045 Rows (private fragment) (WP08)
T046 Search and filters (WP08)
T047 Paging (WP08)
T048 Result-count live region (FR-034) (WP08)
T049 Fixtures and the 24 stories (WP08)
T050 Tests (WP08)
T051 Baselines (WP08)

## WP09: sk-pipeline-screen (chain A) (IC-08)

- Prompt: `tasks/WP09-pipeline-screen.md`
- Depends on: WP07
- Requirements: FR-012, FR-013, FR-014, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-028, FR-029, NFR-003, NFR-004, SC-002, SC-003, SC-004, SC-005
- Subtasks: T052-T058
- Owned files: `packages/mission-ui/src/elements/sk-pipeline-screen/**`, `packages/mission-ui/test/sk-pipeline-screen.test.ts`, `apps/storybook/tests/visual/__snapshots__/mission-pipeline--*.png`
- Estimated prompt size: about 120 lines of dense guidance

T052 Header and breadcrumb (WP09)
T053 View states (WP09)
T054 Composition (WP09)
T055 Inspector (WP09)
T056 Fixtures and the 22 stories (WP09)
T057 Tests (WP09)
T058 Baselines (WP09)

## WP10: Integration, baselines, timing and documentation (IC-09)

- Prompt: `tasks/WP10-integration-baselines-timing-docs.md`
- Depends on: WP09
- Requirements: FR-027, FR-029, FR-032, NFR-001, NFR-002, NFR-008, C-006, C-009, C-011, SC-001, SC-005, SC-006, SC-007, SC-008
- Subtasks: T059-T065
- Owned files: `packages/mission-ui/test/host-composition.test.ts`, `scripts/terminology.mjs`, `scripts/terminology.test.mjs`
- Out-of-map edits permitted (not owned; committed by the WP itself): `.github/workflows/ci.yml` (timeouts only), `package.json`, `README.md`, `CHANGELOG.md`, `packages/mission-ui/CHANGELOG.md`, `packages/mission-ui/custom-elements.json` (regeneration only) and the timeout rows of `contracts/gates.md`
- Dependency note: the tool-recorded dependency is WP09 only; WP08 is merged into the lane-j worktree by the orchestrator (`plan.md` Lane mechanics item 3) and T059 stops if chain B is absent. Dependencies are tool-owned and not hand-edited.
- Estimated prompt size: about 120 lines of dense guidance

T059 First step: full gate run on the merged tree (WP10)
T060 Five consecutive clean visual runs and gate-proof (WP10)
T061 CI timeouts and documents (WP10)
T062 Host-composition test (SC-008) (WP10)
T063 Terminology (C-009) and `test:scripts` (WP10)
T064 Parity, keyboard and large-text checks (WP10)
T065 Drift review and PR inputs (WP10)

## Coverage table

### Requirements, constraints and success criteria

| ID | Work packages |
|---|---|
| C-001 | WP04 |
| C-002 | WP01 |
| C-003 | WP01 |
| C-004 | WP02 |
| C-005 | WP03 |
| C-006 | WP10 |
| C-007 | WP02, WP06, WP07 |
| C-008 | WP01 |
| C-009 | WP10 |
| C-010 | WP03 |
| C-011 | WP10 |
| C-012 | WP04 |
| FR-001 | WP08 |
| FR-002 | WP08 |
| FR-003 | WP05, WP08 |
| FR-004 | WP08 |
| FR-005 | WP08 |
| FR-006 | WP02, WP08 |
| FR-007 | WP08 |
| FR-008 | WP08 |
| FR-009 | WP08 |
| FR-010 | WP02, WP08 |
| FR-011 | WP08 |
| FR-012 | WP09 |
| FR-013 | WP02, WP06, WP09 |
| FR-014 | WP02, WP06, WP09 |
| FR-015 | WP02, WP07 |
| FR-016 | WP02, WP07 |
| FR-017 | WP07 |
| FR-018 | WP07, WP09 |
| FR-019 | WP02, WP09 |
| FR-020 | WP09 |
| FR-021 | WP09 |
| FR-022 | WP09 |
| FR-023 | WP08, WP09 |
| FR-024 | WP05, WP08, WP09 |
| FR-025 | WP05, WP06, WP07, WP08, WP09 |
| FR-026 | WP01, WP03, WP04 |
| FR-027 | WP01, WP03, WP04, WP10 |
| FR-028 | WP05, WP06, WP07, WP08, WP09 |
| FR-029 | WP03, WP04, WP05, WP06, WP07, WP08, WP09, WP10 |
| FR-030 | WP01 |
| FR-031 | WP01, WP03, WP04, WP05 |
| FR-032 | WP03, WP10 |
| FR-033 | WP03 |
| FR-034 | WP02, WP04, WP08 |
| NFR-001 | WP01, WP10 |
| NFR-002 | WP03, WP04, WP10 |
| NFR-003 | WP07, WP08, WP09 |
| NFR-004 | WP08, WP09 |
| NFR-005 | WP02 |
| NFR-006 | WP08 |
| NFR-007 | WP01 |
| NFR-008 | WP10 |
| NFR-009 | WP02 |
| NFR-010 | WP01 |
| SC-001 | WP10 |
| SC-002 | WP08, WP09 |
| SC-003 | WP06, WP09 |
| SC-004 | WP07, WP09 |
| SC-005 | WP08, WP09, WP10 |
| SC-006 | WP10 |
| SC-007 | WP10 |
| SC-008 | WP10 |

### State matrix and event checks

| Row | Story/check | Built by | Verified in |
|---|---|---|---|
| MS-01 | Populated1280 | WP08 | WP08, WP10 (parity) |
| MS-02 | five Filter*1280 | WP08 | WP08, WP10 (parity) |
| MS-02a | FilterAllWithDrafts1280 | WP08 | WP08, WP10 (parity) |
| MS-03 | two no-match stories | WP08 | WP08, WP10 (parity) |
| MS-04 | Empty1280 | WP08 | WP08, WP10 (parity) |
| MS-05 | Loading1280 | WP08 | WP08, WP10 (parity) |
| MS-06 | Error1280 | WP08 | WP08, WP10 (parity) |
| MS-07 | four Paged*1280 | WP08 | WP08, WP10 (parity) |
| MS-08 | five tier stories | WP08 | WP08, WP10 (parity) |
| PL-01 | ImplementInProgress1280 (P-8: review pending; Review and Approved at 0) | WP09 | WP09, WP10 (parity) |
| PL-02 | AllPending1280 | WP09 | WP09, WP10 (parity) |
| PL-03 | AllComplete1280 (Done populated) | WP09 | WP09, WP10 (parity) |
| PL-04 | Blockers1280 | WP09 | WP09, WP10 (parity) |
| PL-05 | Loading1280 | WP09 | WP09, WP10 (parity) |
| PL-06 | Error1280 | WP09 | WP09, WP10 (parity) |
| PL-07 | ThreePhases1280, SevenPhases1280 (pattern: WP06) | WP09, WP06 | WP09, WP10 (parity) |
| PL-08 | five tier stories | WP09 | WP09, WP10 (parity) |
| PL-09 | BadgesBoard1280 (Planned, Review, Done populated) | WP09, WP07 | WP09, WP10 (parity) |
| PL-10 | Empty1280 (built provisionally; removed if CP-1 rejects it: 21 / 59 / 117 instead of 22 / 60 / 118) | WP09 | WP09, WP10 (parity) |
| PL-11 | SubtaskProgress1280 (all five columns populated) | WP09, WP07 | WP09, WP10 (parity) |
| EV-1 | sk-open-mission | WP08 | WP08, WP04 (declared) |
| EV-2 | sk-filter-change | WP05, WP08 | WP05, WP08, WP04 (declared) |
| EV-3 | sk-search | WP08 | WP08, WP04 (declared) |
| EV-4 | sk-load-more | WP08 | WP08, WP04 (declared) |
| EV-5 | sk-select-work-package | WP07, WP09 | WP07, WP09, WP04 (declared) |
| EV-6 | sk-view-artifacts | WP09 | WP09, WP04 (declared) |
| EV-7 | sk-open-missions | WP09 | WP09, WP04 (declared) |

Five-column check (P-8): PL-11 populates all five columns; PL-03 Done; PL-09 Planned, Review, Done; PL-01 Planned, In progress, Done with Review and Approved at 0 (DR-12).

Amendment rulings: P-1..P-4, P-7 are spec text (no work); P-3 -> WP03; P-5 -> WP08 (FR-034) with the phrase in WP02; P-6 -> CP-1; P-8 -> WP09; P-9 -> WP01 and WP10; P-10 -> WP02.

Mission-level requirements reached by every work package through the gates and the drift rule: NFR-001, NFR-008, C-005, C-011.
