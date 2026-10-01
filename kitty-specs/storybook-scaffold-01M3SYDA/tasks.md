# Tasks: Storybook scaffold

Mission `storybook-scaffold-01M3SYDA`; branch `feat/storybook-scaffold`. Plan: `plan.md` (IC-01..IC-09). Prompt files live in `tasks/`.

## Verifier decisions folded in

- N1: local `pnpm gate-proof` runs `pnpm install --offline --frozen-lockfile` inside each throwaway worktree (WP10; quickstart updated there).
- N2: preflight offline skip requires BOTH `--offline` and `--frozen-lockfile` in pnpm argv; `--prefer-offline` does not count; harness test per case (WP01 logic, WP02 tests).
- N3: gate ids derive from workflow job ids plus `matrix.gate`, never display names (WP07 hygiene, WP10 coverage, WP09 workflow).
- N4: ONE proof matrix with `container: ${{ matrix.image }}` (empty string for runner legs); fallback is a split into two matrices, recorded if needed (WP09).

## Dependency graph

WP01 -> WP02, WP03; WP03 -> WP04; WP04 -> WP05, WP06, WP07; WP03+WP04 -> WP08; WP02+WP05+WP06+WP07+WP08 -> WP09 -> WP10 -> WP11. WP05, WP06, WP07, WP08 have disjoint write scopes and run in parallel.

## Subtask Index

| ID | Description | WP | Parallel |
|----|-------------|----|----------|
| T001 | Root files and exact pins | WP01 |  |
| T002 | pnpm-workspace.yaml and the two package manifests | WP01 |  |
| T003 | Root scripts (complete set, declared once) | WP01 |  |
| T004 | .npmrc, .pnpmfile.cjs, preflight-core.cjs, lockfile | WP01 |  |
| T005 | Hygiene-rules pass over kitty-specs/ and .kittify/ (plan hard requirement 6) | WP01 |  |
| T006 | scripts/preflight.mjs | WP02 |  |
| T007 | Plants (two) | WP02 |  |
| T008 | Offline-skip and hook harness tests (verifier N2) | WP02 |  |
| T009 | Wire and document | WP02 |  |
| T010 | .storybook/main.ts | WP03 |  |
| T011 | .storybook/preview.ts and preview-head.html | WP03 |  |
| T012 | Verify with a throwaway story | WP03 |  |
| T013 | storybook-build plant | WP03 |  |
| T014 | view-state.ts, fixtures.ts, index.ts | WP04 |  |
| T015 | sk-mission-sample.ts | WP04 |  |
| T016 | Stories and changelog | WP04 |  |
| T017 | Vitest browser-mode tests | WP04 |  |
| T018 | unit-tests plant | WP04 |  |
| T019 | Typecheck gate | WP05 | [P] |
| T020 | ESLint flat config with local rules | WP05 | [P] |
| T021 | Stylelint config | WP05 | [P] |
| T022 | Full-package scope proof | WP05 | [P] |
| T023 | eslint.no-io.config.mjs | WP06 | [P] |
| T024 | gates/fixtures/no-io and selftest | WP06 | [P] |
| T025 | no-io plant | WP06 | [P] |
| T026 | Manifest generation and check | WP06 | [P] |
| T027 | manifest plant | WP06 | [P] |
| T028 | File scan core | WP07 | [P] |
| T029 | Pin, lockfile and config rules | WP07 | [P] |
| T030 | Workflow and coverage rules (verifier N3) | WP07 | [P] |
| T031 | PNG, storybook-static and record scans | WP07 | [P] |
| T032 | Hygiene plant and tests | WP07 | [P] |
| T033 | Pin verification (plan hard requirement 1) | WP08 | [P] |
| T034 | playwright.config.ts and the per-story spec | WP08 | [P] |
| T035 | scripts/visual.sh | WP08 | [P] |
| T036 | Baselines (container only) | WP08 | [P] |
| T037 | Visual plant | WP08 | [P] |
| T038 | Skeleton, triggers, permissions | WP09 |  |
| T039 | Gate jobs | WP09 |  |
| T040 | Proof matrix, `Gate: proof`, `Gate: all` | WP09 |  |
| T041 | Interface contract with WP10 and README pointer | WP09 |  |
| T042 | Validate without a CI run | WP09 |  |
| T043 | Plant loading and the `leg` subcommand | WP10 |  |
| T044 | Sanitiser and `assemble` | WP10 |  |
| T045 | `coverage` subcommand (verifier N3) | WP10 |  |
| T046 | Local `pnpm gate-proof` (verifier N1) | WP10 |  |
| T047 | Quickstart update and tests | WP10 |  |
| T048 | Setup and credential | WP11 |  |
| T049 | Gates reference | WP11 |  |
| T050 | Adding an element and verifying | WP11 |  |

## WP01 - Workspace skeleton and toolchain pins

**Goal**: Create the pnpm workspace with every tool pinned exactly, the scope-only `.npmrc`, the committed lockfile, the `.pnpmfile.cjs` credential hook backed by `scripts/preflight-core.cjs`, and run a first hygiene-style scan over `kitty-specs/` and `.kittify/`.
**Priority**: P1
**Dependencies**: none
**Requirements**: FR-001, FR-002, NFR-001, NFR-005, C-001, C-002
**Prompt**: `tasks/WP01-workspace-skeleton.md`

Included subtasks:
T001 Root files and exact pins (WP01)
T002 pnpm-workspace.yaml and the two package manifests (WP01)
T003 Root scripts (complete set, declared once) (WP01)
T004 .npmrc, .pnpmfile.cjs, preflight-core.cjs, lockfile (WP01)
T005 Hygiene-rules pass over kitty-specs/ and .kittify/ (plan hard requirement 6) (WP01)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP02 - Credential preflight command, plants and harness tests

**Goal**: Deliver the `preflight` gate: the online/CI credential check, its two plants, and harness tests proving the offline-skip rules and the named failure messages.
**Priority**: P1
**Dependencies**: WP01
**Requirements**: FR-013, NFR-001
**Prompt**: `tasks/WP02-credential-preflight.md`

Included subtasks:
T006 scripts/preflight.mjs (WP02)
T007 Plants (two) (WP02)
T008 Offline-skip and hook harness tests (verifier N2) (WP02)
T009 Wire and document (WP02)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP03 - Storybook app wired to the design system, with build gate and plant

**Goal**: Wire Storybook 10 (`@storybook/web-components-vite`) to load `@spec-kitty/tokens|styles|elements` with a pinned dark theme, and deliver the `storybook-build` gate with its plant.
**Priority**: P1
**Dependencies**: WP01
**Requirements**: FR-003, FR-008
**Prompt**: `tasks/WP03-storybook-wiring.md`

Included subtasks:
T010 .storybook/main.ts (WP03)
T011 .storybook/preview.ts and preview-head.html (WP03)
T012 Verify with a throwaway story (WP03)
T013 storybook-build plant (WP03)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP04 - sk-mission-sample element, four stories and interaction tests

**Goal**: Implement the template element per `contracts/sample-element.md` with its four stories, synthetic fixtures, Vitest browser-mode tests for every event and payload, and the `unit-tests` gate plant.
**Priority**: P1
**Dependencies**: WP03
**Requirements**: FR-004, FR-005, FR-009
**Prompt**: `tasks/WP04-sample-element.md`

Included subtasks:
T014 view-state.ts, fixtures.ts, index.ts (WP04)
T015 sk-mission-sample.ts (WP04)
T016 Stories and changelog (WP04)
T017 Vitest browser-mode tests (WP04)
T018 unit-tests plant (WP04)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP05 - Typecheck, ESLint and Stylelint gates with plants

**Goal**: Configure the `typecheck`, `eslint` and `stylelint` gates over full packages and ship one plant for each (two for stylelint).
**Priority**: P1
**Dependencies**: WP04
**Requirements**: FR-006, FR-007, C-005
**Prompt**: `tasks/WP05-lint-and-typecheck-gates.md`

Included subtasks:
T019 Typecheck gate (WP05)
T020 ESLint flat config with local rules (WP05)
T021 Stylelint config (WP05)
T022 Full-package scope proof (WP05)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP06 - No-I/O and element manifest gates with plants

**Goal**: Deliver the `no-io` gate (ESLint rule set plus a fixture-driven self-test) and the `manifest` gate (analyzer regeneration, byte comparison, `check-manifest.mjs`), each with its plant.
**Priority**: P1
**Dependencies**: WP04
**Requirements**: FR-011, FR-012
**Prompt**: `tasks/WP06-no-io-and-manifest-gates.md`

Included subtasks:
T023 eslint.no-io.config.mjs (WP06)
T024 gates/fixtures/no-io and selftest (WP06)
T025 no-io plant (WP06)
T026 Manifest generation and check (WP06)
T027 manifest plant (WP06)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP07 - Hygiene gate: credentials, paths, pins, workflow rules

**Goal**: Implement `scripts/check-hygiene.mjs`: the repository-wide scan for credentials, absolute user paths, unpinned versions, lockfile integrity, workflow rules, PNG chunk allow-list and plant coverage, with its plant.
**Priority**: P1
**Dependencies**: WP04
**Requirements**: NFR-004, NFR-005
**Prompt**: `tasks/WP07-hygiene-gate.md`

Included subtasks:
T028 File scan core (WP07)
T029 Pin, lockfile and config rules (WP07)
T030 Workflow and coverage rules (verifier N3) (WP07)
T031 PNG, storybook-static and record scans (WP07)
T032 Hygiene plant and tests (WP07)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP08 - Visual regression gate with pinned container and baselines

**Goal**: Deliver the `visual` gate: one Playwright screenshot test per story against the built Storybook, baselines produced only inside the digest-pinned Playwright container, a wrapper that fails rather than skips, and the visual plant.
**Priority**: P1
**Dependencies**: WP03, WP04
**Requirements**: FR-010, NFR-003
**Prompt**: `tasks/WP08-visual-regression-gate.md`

Included subtasks:
T033 Pin verification (plan hard requirement 1) (WP08)
T034 playwright.config.ts and the per-story spec (WP08)
T035 scripts/visual.sh (WP08)
T036 Baselines (container only) (WP08)
T037 Visual plant (WP08)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP09 - GitHub Actions workflow with one named job per gate

**Goal**: Write `.github/workflows/ci.yml` exactly per `contracts/ci-gates.md`: preflight first, one named job per gate, the proof matrix and final `Gate: proof`, and the aggregate `Gate: all`.
**Priority**: P1
**Dependencies**: WP02, WP05, WP06, WP07, WP08
**Requirements**: FR-014, NFR-002, C-002, C-003
**Prompt**: `tasks/WP09-ci-workflow.md`

Included subtasks:
T038 Skeleton, triggers, permissions (WP09)
T039 Gate jobs (WP09)
T040 Proof matrix, `Gate: proof`, `Gate: all` (WP09)
T041 Interface contract with WP10 and README pointer (WP09)
T042 Validate without a CI run (WP09)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP10 - Gate proof harness, record and local run

**Goal**: Implement `scripts/gate-proof.mjs` (leg, coverage, assemble, and the local all-gates run in throwaway worktrees), the sanitised fail-closed record, and update the quickstart.
**Priority**: P1
**Dependencies**: WP09
**Requirements**: FR-015, NFR-004
**Prompt**: `tasks/WP10-gate-proof-harness.md`

Included subtasks:
T043 Plant loading and the `leg` subcommand (WP10)
T044 Sanitiser and `assemble` (WP10)
T045 `coverage` subcommand (verifier N3) (WP10)
T046 Local `pnpm gate-proof` (verifier N1) (WP10)
T047 Quickstart update and tests (WP10)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.

## WP11 - Contributor documentation (README)

**Goal**: Write the README (FR-016): setup, the credential, the workbench, each gate, adding an element, refreshing baselines, verifying gates are not vacuous.
**Priority**: P2
**Dependencies**: WP10
**Requirements**: FR-016, NFR-001
**Prompt**: `tasks/WP11-contributor-docs.md`

Included subtasks:
T048 Setup and credential (WP11)
T049 Gates reference (WP11)
T050 Adding an element and verifying (WP11)

Independent test: see the Definition of Done in the prompt (all command-verifiable).
Estimated prompt size: ~150-250 lines.
