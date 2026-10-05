---
work_package_id: WP01
title: Baseline, contract tooling and gate contract
dependencies: []
requirement_refs:
- FR-026
- FR-027
- FR-030
- FR-031
- C-002
- C-003
- C-008
- NFR-001
- NFR-007
- NFR-010
planning_base_branch: feat/missions-and-pipeline-screens-4
merge_target_branch: feat/missions-and-pipeline-screens-4
branch_strategy: Planning artifacts for this mission were generated on feat/missions-and-pipeline-screens-4. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/missions-and-pipeline-screens-4 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-missions-and-pipeline-screens-01M40SKZ
base_commit: 7090982adc3799d9d688794696687dc801738d0a
created_at: '2026-10-03T14:23:12.544034+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
- T008
- T009
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-03T14:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: scripts/contract/
create_intent:
- contracts/spec-kitty/PIN.json
- scripts/contract/generate.mjs
- scripts/contract/check.mjs
- scripts/contract/update.mjs
- scripts/contract/verify-remote.mjs
- scripts/contract/registry.mjs
- scripts/contract/overlays.mjs
- scripts/contract/validate.mjs
- packages/mission-ui/src/contract/types.ts
- packages/mission-ui/src/contract/types.generated.ts
- packages/mission-ui/src/contract/fixtures.generated.ts
- packages/mission-ui/src/contract/bulk.ts
execution_mode: code_change
owned_files:
- contracts/spec-kitty/**
- scripts/contract/**
- scripts/hygiene/**
- scripts/gate-proof/gate-proof.test.mjs
- packages/mission-ui/src/contract/**
- gates/plants/contract/**
- gates/plants/hygiene/**
- .gitattributes
- .github/workflows/ci.yml
- package.json
- pnpm-lock.yaml
- eslint.config.mjs
- README.md
- CHANGELOG.md
- packages/mission-ui/CHANGELOG.md
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Baseline, contract tooling and gate contract (IC-01)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Record the green baseline, vendor the pinned Mission Status contract byte for byte, generate types and fixtures from it, and ship gate `contract` (NFR-010) with its three plants, its proof-record wiring (exception X-1), the hygiene e-mail rule, and the `pnpm test:scripts` wiring of the existing node:test suites into the `hygiene` gate (ruling P-9, exception E-06). Every later work package consumes what this one generates; nothing else in the mission may hand-write a contract type or a fixture.

## Context

Read `plan.md` (IC-01, "Shared files: who may write them", "Deviations, exceptions"), `research.md` D-09 to D-14 and D-37, `contracts/contract-pin.md` (the 22-fixture list, frozen), `contracts/gates.md` (gate table, C1 to C7, plants, Timeouts and timing record, proof record coupling), `data-model.md` (view types), `spec.md` FR-026, FR-030, NFR-007, NFR-010, C-002, C-003, C-008, and `tracer-design-decisions.md` (ruling P-9).

Implementation concern: `plan.md` IC-01. Requirements: FR-026, FR-027, FR-030, FR-031, C-002, C-003, C-008, NFR-001, NFR-007, NFR-010.

## Precondition (first step, before T001)

Before anything else confirm that `tracer-design-decisions.md` contains the dated entry "Operator approved exceptions E-06, E-07, X-1 (2026-10-03)" (here it covers E-06 in T008 and X-1 in T006). The charter requires operator approval for exceptions; this entry is that approval, and it reaches your lane through the orchestrator's lane mechanics (`plan.md` "Lane mechanics"). If the entry is absent from your worktree: STOP and report; do not edit any accepted gate, config or schema. The reviewer REJECTS if the entry is absent or an exception was exercised beyond its approved scope.

## Subtasks

### T001 Baseline and spike S0

Before any change record the green baseline of every gate command on the branch head (D-37), including `pnpm visual` in the pinned container (58 PNGs, 0 diffs), `pnpm gate-proof`, and the local wall-clock of `pnpm test`, `pnpm build-storybook` and one `pnpm visual`. Spike S0: Node 22.22.2 loads the generated data-only `.ts` fixtures; `openapi-typescript` output is deterministic and passes strict `tsc` with `exactOptionalPropertyTypes`, `lint:no-io` and typecheck. Report the outcome for the orchestrator; if S0 fails apply the D-12 fallback and say so.

### T002 Vendor the contract and the pin

Copy the pinned split contract (98 files) byte for byte into `contracts/spec-kitty/{mission-status,_shared}/`, write `PIN.json` (sha `9f41e48fe0e8b00cd040690598e90c37d82ea4a2`, `infoVersion` `1.0.0`), add `.gitattributes` so the bytes are never rewritten, then run `contract:verify-remote` once online and keep its output for the PR description.

### T003 Dependencies

Add the three devDependencies (exact versions, one online install, lockfile committed); `pnpm install --frozen-lockfile` must work offline afterwards.

### T004 Generator

`scripts/contract/generate.mjs` and `pnpm contract:generate`: types (`types.generated.ts`, widened by hand-written `types.ts` exactly as `research.md` D-05 and `data-model.md` say), fixtures from the vendored examples plus named overlays with declared derived values (`overlays.mjs`; the 22 fixtures of `contract-pin.md`, no more, no fewer), `registry.mjs`, `bulk.ts` (500-Mission page, 40-row list; pure functions, no value imports) and `SYNTHETIC_ACTORS`. Red first: the freshness check (C3) fails before you generate.

### T005 Checker and negative tests

`contract:check` with checks C1 to C7 and the guards of `contracts/gates.md` (C5 recomputes the contract's derivations: a fixture the contract cannot produce is rejected), `contract:update`, `contract:verify-remote`, and the node:test negative cases (`pnpm test:contract`, about 40 cases); relaxations carry a reverted-must-fail proof; the executing account's username leg of C6 is read at run time.

### T006 Gate wiring and exception X-1

CI job `contract` (copy the `no-io` job boilerplate, `needs: preflight`), matrix entry `{ gate: contract, timeout: 8, image: '' }` and `all.needs`, three plants under `gates/plants/contract/`, the proof-record schema enum value and `GATES` in `scripts/gate-proof/gate-proof.test.mjs` (count 11). The schema lives in `kitty-specs/storybook-scaffold-01M3SYDA/contracts/` (an out-of-map edit, exception X-1, operator-approved 2026-10-03: one enum value added, recorded in the hand-off; `gate-proof.test.mjs` also gains a test proving that a gate id registered in `GATES` without a real proof entry still fails, so the widening cannot make a gate pass vacuously). Replace the estimated timeouts by the rule of `contracts/gates.md` from your measured wall-clock and update the gate's row in `gates.md` (out-of-map, `kitty-specs/`).

### T007 Hygiene e-mail rule

Add a path-scoped `email-address` rule to `scripts/hygiene/rules.mjs` with its test and a second plant in `gates/plants/hygiene/plant.json` (NFR-007; allow-listed domains; D-13).

### T008 Wire the node:test suites (P-9, E-06)

Package script `test:scripts` = `node --test scripts/hygiene scripts/gate-proof scripts/preflight.test.mjs scripts/manifest-screen.test.mjs` (the last two guard the preflight and manifest-screen gates and ran in no gate: same rationale, E-06 as approved; WP10 adds `scripts/terminology.test.mjs`); the `hygiene` gate command becomes `pnpm hygiene && pnpm test:scripts` in its job and proof leg; add a plant (a deliberately failing node test) proving the gate goes red. Record exception E-06 (scope, rationale, sunset per `tracer-design-decisions.md`) in the hand-off.

### T009 ESLint, README, CHANGELOG

`eslint.config.mjs`: ignore `types.generated.ts` by exact path and add `structuredClone: 'readonly'` to the `.mjs` globals block (E-05); `pnpm lint` over the new `scripts/contract/*.mjs` shows no `no-undef`. README gates-table rows for `contract` and the changed `hygiene` row, and a CHANGELOG line in both changelogs.

## Acceptance (all runnable)

1. `pnpm contract:check && pnpm test:contract` in the clean worktree: reporter pass count above 0, fail 0; run twice, output identical.
2. `node scripts/gate-proof.mjs local --only contract`; `node scripts/gate-proof.mjs local --only hygiene`; `node --test scripts/gate-proof/ scripts/hygiene/`; `node scripts/gate-proof.mjs coverage` prints no problem; an `assemble` dry run over fragments for every gate passes the schema.
3. The wall-clock of `pnpm contract:check`, `pnpm test:contract` and the gate-proof leg are in the hand-off with the timeouts derived from them.
4. Every gate of the next section exits 0; `git status --short` is empty after the final commit (no leftover plant, spike or temporary file).

## Definition of Done

All acceptance commands exit 0; each test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with rationale, any change request, every exception touched (E-01 to E-07, X-1) and the drift items relied on; every new PNG was Read and described.

## Reviewer guidance

Check that the approval entry predates the first WP01 commit, that the new `gate-proof.test.mjs` test fails when a gate id has no proof entry, that `test:scripts` runs exactly the four paths named above, that the 22 fixtures equal the list of `contract-pin.md`, that no relaxation is a blanket ignore (reverted-must-fail), that C5 really rejects an impossible document, that X-1 is exactly one enum value, that E-06's plant fails the gate when planted, and that the username leg reads the account at run time. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift against AD-1 to AD-3 plus the register as confirmed at CP-1.


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; every out-of-map edit is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate, its output must list your test files), `pnpm build-storybook`.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off (D-34 rule 4); the reviewer re-runs two of them.

**Test quality rules (`research.md` D-34, binding, copied here).** (1) Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed. (2) Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`). (3) Counts are asserted with equality, never "at least"; every loop over fixtures, stories or items asserts it ran the expected N times. (4) Revert checks as above. (5) The C-009 terminology rule: the word "feature" never appears in source, stories or `quickstart.md`. (6) The 500-Mission test follows `research.md` D-23 (structural assertions are the proof, the timing is the budget).

**Visual drift = REJECT.** The approved prototype (`<prototype>/02-missions.html`, `<prototype>/03-pipeline.html`) is the visual authority (C-006, NFR-008). The only allowed differences are the approved drift AD-1 (Abandoned becomes Discarded), AD-2 (the Approved and Done columns), AD-3 (the Planned, Stale and Discarded filters), plus DR-1 to DR-12 of `research.md` D-35 as CONFIRMED at checkpoint CP-1 (before CP-1 completes they are provisional, and any DR the operator did not confirm is a REJECT item for the work package that introduces it). Any other visible difference in a baseline is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(missions-and-pipeline-screens): ... (#4)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Out-of-map edits permitted (recorded in the hand-off with a one-line rationale)

the proof-record schema `kitty-specs/storybook-scaffold-01M3SYDA/contracts/gate-proof-record.schema.json` (exception X-1) and the `contract` row of `kitty-specs/missions-and-pipeline-screens-01M40SKZ/contracts/gates.md` (the tool bans `kitty-specs/` paths in a code work package's `owned_files`).

## Branch Strategy

Planning branch and final merge target: `feat/missions-and-pipeline-screens-4`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: none (first work package). Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off (what is drawn, which width, anything wrong); never hand-edit or copy a PNG; `git status --short` must show only your own baselines added.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr`; every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the recorded exceptions E-01 to E-07.
- Screens do no arithmetic on contract values (C-004); no hard-coded phase names, count or order, or lane words (C-007): vocabulary lives only in `src/defaults/`.
- `tracer-*.md` and `spec.md`, `plan.md` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
