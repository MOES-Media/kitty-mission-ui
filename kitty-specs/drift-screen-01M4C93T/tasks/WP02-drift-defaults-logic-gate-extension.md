---
work_package_id: WP02
title: Defaults, logic, data-driven gate extension, hooks and retry member
dependencies:
- WP01
requirement_refs:
- FR-007
- FR-011
- FR-013
- FR-014
- FR-019
- FR-020
- FR-021
- FR-022
- FR-026
- FR-027
- FR-028
- FR-031
- FR-033
- C-004
- C-007
- C-009
- NFR-005
- NFR-009
- NFR-010
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-drift-screen-01M4C93T
base_commit: d0e0043e5c75d14e0ceb68b7582ddb98375ce276
created_at: '2026-10-10T06:10:15.096922+00:00'
subtasks:
- T007
- T008
- T009
- T010
- T011
- T012
phase: Phase 1 - Foundation
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/logic/
create_intent: []
execution_mode: code_change
owned_files:
- packages/mission-ui/src/defaults/**
- packages/mission-ui/src/logic/**
- packages/mission-ui/test/drift-*.test.ts
- eslint.data-driven.config.mjs
- gates/data-driven.selftest.ts
- gates/fixtures/data-driven/**
- gates/plants/data-driven/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - Defaults, logic, data-driven gate extension, hooks and retry member (IC-02)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Build the pure layer under the screen: `defaults/drift-copy.ts`, four `logic/drift-*.ts` modules with unit tests, the additive `LabelHooks` members, the `DriftRetryDetail` union member with its own builder, and the extension of the `data-driven` gate to the new word families.

## Context

Everything the screen decides without touching the DOM lives here, so IC-04 and IC-05 only draw. IC-02 depends on IC-01 for the generated types and fixtures. The vocabulary rule (C-007) means no kind, severity, authority, remedy, source-code or lane literal may appear outside `defaults/`; this WP extends the gate that enforces it.

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

### Subtask T007: defaults/drift-copy.ts

**Purpose**: All words and sentences of the screen.

**Steps and details**:

Implement `src/defaults/drift-copy.ts` exactly as `contracts/defaults.md` specifies (kind, severity, authority, derivedSide, sourceCode, remedy and lane words, sentences, the not-present word, the command templates, announcements), host-neutral copy, 'Mission' never 'feature', 'status lane' for the table. Add the single export line in `src/defaults/index.ts` (shared file, append-only, recorded out-of-map). Defaults carry no hard-coded count of findings.

`defaults/drift-copy.ts` (new), `defaults/index.ts` (one line).

Unit test per family; foreign values fall back to the raw word.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T008: drift-finding.ts and drift-report.ts

**Purpose**: Pure view-model builders.

**Steps and details**:

`logic/drift-finding.ts`: key of a finding, title (explanation fallback to `summary`), tone per severity, authority panel data, lane rows (differing rows only, null side -> not-present word), command builder from `remedy` and Mission slug (unknown slug or unknown remedy -> no command, DR-11/DR-13), corrupt-JSON sentence. `logic/drift-report.ts`: count and per-severity tallies from `findings.length` only (C-004), head badge rule, truncation note N = `findings.length` with no '1000' literal, unsorted-order behaviour (order is the contract's; no sorting here), scoped-scan filter (a foreign finding is not loaded, DR-24). Tests include foreign-value inputs and the unsorted-order test.

`logic/drift-finding.ts`, `logic/drift-report.ts` (new), tests `test/drift-finding.test.ts`, `test/drift-report.test.ts`.

Tests red first; the `error`/`warning`/`git` collision case is covered by a foreign-value test.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T009: drift-keys.ts and drift-announce.ts

**Purpose**: Keyboard table and live-region text.

**Steps and details**:

`logic/drift-keys.ts`: the listbox key table (Up/Left previous, Down/Right next with wrap, Home, End, one-item case, empty case) as a pure function from (key, index, count) to the next index or null. `logic/drift-announce.ts`: live-region text for rescanned, copied, manual, error and counts; exactly-once semantics are expressed as a pure `nextAnnouncement(prev, next)` that returns text only when the input property changed. Tests pin wrap, the one-item case and the stale-input case.

`logic/drift-keys.ts`, `logic/drift-announce.ts`, tests `test/drift-keys.test.ts`, `test/drift-announce.test.ts`.

Table test enumerates every key against 0, 1 and n items.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T010: LabelHooks additions and DriftRetryDetail

**Purpose**: Additive hook members and the retry union member with its builder.

**Steps and details**:

Add optional, additive `LabelHooks` members for the Drift word families in `logic/types.ts`. Extend the `sk-retry-load` union with the member `{ target: 'drift-report', missionId: string | null }` in `logic/wp-retry.ts` (or `src/retry-types.ts` if #7 has merged when this WP starts; record which file in the hand-off). Add the pure builder `driftRetryDetail(missionId)`: the shipped `retryDetail()` returns null without a Mission and needs a `wpId`, so it cannot serve a whole-project scan. Test that the null-scope case builds a payload and the two existing members still type-check.

`logic/types.ts`, `logic/wp-retry.ts` (or `src/retry-types.ts`), `logic/drift-retry.ts` (new), `test/drift-retry.test.ts`.

`pnpm typecheck` green; the union is exhaustive in existing switches.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T011: Extend the data-driven gate

**Purpose**: Five enums from the schemas, four sourceCode values from a constant.

**Steps and details**:

In `eslint.data-driven.config.mjs` read the five Drift enums from the vendored schemas and hold the four `sourceCode` values (no enum schema exists) in an explicit constant with a description-agreement self-test, scope as in `contracts/defaults.md`. Write the new positive self-test cases in `gates/data-driven.selftest.ts` and fixtures under `gates/fixtures/data-driven/` FIRST and show them red against the unchanged config; add false-positive cases that stay green. Add plants under `gates/plants/data-driven/`. Rename fields when the selector hits new logic code; never silence. Document the `error`/`warning`/`git` collision in the gate header comment.

`eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts`, `gates/fixtures/data-driven/**`, `gates/plants/data-driven/**`.

`pnpm lint:data-driven && pnpm test:data-driven` green; each new case red against the old config.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T012: Hand-off and CHANGELOG line

**Purpose**: Gate set, revert checks, changelog.

**Steps and details**:

Add one CHANGELOG line (out-of-map). Run the full gate set. List the revert check per test file and the retry-union file chosen.

`CHANGELOG.md`.

Gates equal the WP01 baseline or better.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

`pnpm lint:data-driven && pnpm test:data-driven` green; each new self-test case red against the unchanged config; unit tests with positive controls and revert checks; typecheck green.

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

Selector false positives on the new logic (rename fields, never silence). The `error`/`warning`/`git` collision between vocabularies (documented, covered by foreign-value tests). The retry union file differs if #7 has merged.

## Reviewer Guidance

A separate reviewer agent re-runs two revert checks, audits the exit evidence line by line, checks that nothing outside `owned_files` was edited except the recorded out-of-map edits, and rejects visual drift outside the confirmed register. 

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package; each such out-of-map edit is committed by you with plain `git add <path>` and `git commit` before `move-task ... for_review` (the tool refuses to auto-commit paths outside `owned_files`) and is listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) change only through their generator; a conflict in one is resolved by regeneration.

**Gates to pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists, from the lane worktree root): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm contract:check && pnpm test:contract`, `pnpm hygiene`, `pnpm test` (its output must list your test files), `pnpm build-storybook`. `pnpm visual` runs only in WP08; before it, missing snapshots are the known red. Use the script names the base provides if they differ and say so.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or plant, or negative case) FIRST, see it fail for the right reason, record the failing line in the hand-off, then implement. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two.

**Test quality rules.** (1) Every no-event test carries a positive control on the same target. (2) Every emit test asserts exactly one event, `bubbles` and `composed` true, `cancelable` false, and the detail with `toEqual`. (3) Counts are asserted with equality, never "at least"; loops over fixtures or stories assert they ran N times. (4) Revert checks as above. (5) The word "feature" never appears in source, stories or docs (C-009).

**Visual drift = REJECT.** The prototype `06-drift.html` is the visual authority (C-006, NFR-008). Only the confirmed register (DD-1..DD-21 as confirmed at CP-1 and, for the rest, at the operator's Storybook review) is allowed; any other difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction and a rebase (orchestrator-owned). Commit on your lane branch with a conventional message (`feat(drift-screen): ... (#10)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry another way, never pattern-kill processes (`pkill -f`; kill only PIDs you recorded), never `git stash`, never `git rebase`, never `rm` with variable globs. `core.bare` must stay false.
- Repo-wide commands (`ruff`, `prettier`, formatters, `find`, `rm -r`) are guarded by `test "$(git rev-parse --show-toplevel)" = "$PWD"` first.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`); `pnpm hygiene` before committing. Keep TMPDIR under the scratchpad.
- Baselines are generated ONLY in WP08, inside the pinned container; never hand-edit or copy a PNG.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or elements; project CSS is layout only with `--sk-*` tokens; every UI primitive the library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is a recorded gap, never hand-rolled outside E-35..E-39 and the E-18 extension as kept at CP-1.
- Screens do no arithmetic on contract values beyond display counts (C-004); no kind, severity, authority, remedy, source-code or lane literal outside `src/defaults/` (C-007). No branch name is ever shown (C-008).
- `tracer-*.md`, `spec.md`, `plan.md`, `tasks.md` are orchestrator-owned: report decisions and friction in the hand-off.

## Out-of-map edits permitted (committed by the WP itself, recorded in the hand-off)

`packages/mission-ui/CHANGELOG.md` or `CHANGELOG.md` (one line), `package.json` (named test-script edits only), and the retry union file if it lives outside `src/logic/` (`src/retry-types.ts`).

## Branch Strategy

Planning branch and final merge target: `feat/drift-screen-10`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP01. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per plan 'Lane mechanics'); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP02 --agent claude`
