---
work_package_id: WP02
title: Defaults, logic, retry union and data-driven extension
dependencies:
- WP01
requirement_refs:
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
- FR-011
- FR-019
- FR-024
- FR-025
- FR-033
- NFR-009
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T08:29:03.279947+00:00'
subtasks:
- T007
- T008
- T009
- T010
- T011
- T012
- T013
- T014
history: []
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/logic/
create_intent:
- packages/mission-ui/src/project-types.ts
- packages/mission-ui/src/retry-types.ts
- packages/mission-ui/test/project-entry.test.ts
- packages/mission-ui/test/project-row.test.ts
- packages/mission-ui/test/project-retry.test.ts
- packages/mission-ui/test/projects-defaults.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/defaults/**
- packages/mission-ui/src/logic/**
- packages/mission-ui/src/project-types.ts
- packages/mission-ui/src/retry-types.ts
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.ts
- packages/mission-ui/test/wp-retry-union.test.ts
- packages/mission-ui/test/project-entry.test.ts
- packages/mission-ui/test/project-row.test.ts
- packages/mission-ui/test/project-retry.test.ts
- packages/mission-ui/test/projects-defaults.test.ts
- eslint.data-driven.config.mjs
- gates/data-driven.selftest.ts
- gates/fixtures/data-driven/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - Defaults, logic, retry union and data-driven extension (IC-02)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Write the screen-independent vocabulary and logic of the Projects screen: the `defaults/` health and copy modules, the three `logic/` modules (`resolveEntry`, the row view-model, the three retry payload builders), the host wrapper types, the three new `sk-retry-load` union members with their two knock-on edits, and the `data-driven` gate extension for `ProjectHealth`.

## Context

Plan IC-02 and Build base item 2; `data-model.md`; `research.md` D-04 to D-10, D-13, D-20; `contracts/defaults.md`; `contracts/gates.md` (data-driven row). Requirements FR-004..FR-008, FR-011, FR-019, FR-024, FR-025, FR-033 (the `defaults/index.ts` export lines), NFR-009. This WP is the only writer of `src/defaults/**`, `src/logic/**`, `src/project-types.ts`, the retry union file and `eslint.data-driven.config.mjs`; other WPs raise a change request instead of editing these.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP01. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

Retry union location (decided at dispatch by looking at `main` as merged into the lane): if `packages/mission-ui/src/retry-types.ts` exists, add the three members there; otherwise add them to `logic/wp-retry.ts` (the type `RetryLoadDetail`). Report the choice in the hand-off; the orchestrator records it in `tracer-design-decisions.md`. The `HTMLElementEventMap['sk-retry-load']` declaration in `sk-work-package-screen.ts` exists once and is not touched.

## Subtasks

### Subtask T007: Retry union: three members and the two knock-on edits

**Purpose**: FR-025: one union, three new targets.

**Steps**:
1. First re-verify every symbol of `contracts/sk-projects-screen.md` "Dependencies on `main`" exists in the file named there (`ViewState`, `normaliseViewState`, `lookup`, `resolveActivity`, `missionCountText`, `SUMMARY_SEPARATOR`, `NO_ACTIVITY_TEXT`, `ShellTierController`, `visuallyHidden`); a mismatch is reported, not absorbed.
2. Add `{ target: 'project'; key: string }`, `{ target: 'projects' }`, `{ target: 'folders' }` to the one union in the location decided above (D-20).
3. Narrow the private `retryLoad` and `retryPayload` parameter types in `sk-work-package-screen.ts` to `SkRetryLoadDetail['target']`-compatible Work Package members and pass them to `retryDetail`, whose parameter is the two Work Package members only.
4. Extend the exhaustive `switch` ending in `never` in `test/wp-retry-union.test.ts` with one `case` per new member.
5. Red first: the extended test must fail before the union is widened.

**Files**: retry union file, sk-work-package-screen.ts (types only), test/wp-retry-union.test.ts
**Validation**: `pnpm typecheck` green; the existing Work Package retry tests unchanged and green.

### Subtask T008: Host wrapper types

**Purpose**: Plain TypeScript types for the host's data (data-model.md); no contract type is redeclared.

**Steps**:
1. Create `src/project-types.ts`: `ProjectEntry` (`key`, `location`, `localOnly?`, `openable?`, optional `name`, and one of `project` (the generated `Project`) or `state` of `loading`, `error`, `unavailable`), `FolderEntry` (`name`, `location`, `kind` of `parent` or `folder`, `valid`), `ProjectLabelHooks` (the shared `LabelHooks` `time` hook plus a `health` hook returning a badge for a value). Spec amendments P-2 and P-3 are proposed and become binding only after CP-1: keep `name?` and the `health` hook as drafted; a CP-1 change is applied by WP05.
2. No `healthy` or `schema_drift` literal in this file.

**Files**: src/project-types.ts (new)
**Validation**: Typecheck; the data-driven gate stays green.

### Subtask T009: `defaults/health.ts`, `defaults/projects-copy.ts` and the index exports

**Purpose**: Every word of the spec lives in `defaults/` (FR-019, D-05, D-07, D-09).

**Steps**:
1. `HEALTH_BADGES`: the two contract values to `{ label, tone }` (`healthy` success "healthy"; `schema_drift` attention "schema drift"), `UNKNOWN_HEALTH_TONE` neutral; a raw value renders as its own word.
2. `projects-copy.ts`: every string of the spec and `contracts/defaults.md` (skip link text "Skip to Projects" (FR-023), version prefix "v", read-only notice copy, eyebrow, title, muted copy, toolbar label, `projectCountText`, loading/empty/error/unavailable sentences, retry labels, dialog copy, the "valid project" word, no-version/no-branch/no-activity texts) with `missionCountText` reused from `missions-copy.ts`.
3. Add the two export lines to `defaults/index.ts` (FR-033), nothing else.

**Files**: src/defaults/health.ts, projects-copy.ts, index.ts
**Validation**: `test/projects-defaults.test.ts` passes; a foreign health value renders its raw word.

### Subtask T010: `logic/project-entry.ts`: `resolveEntry`

**Purpose**: D-04: a pure function from entry and list status to a discriminated view kind.

**Steps**:
1. `resolveEntry(entry)` (the single-argument signature of `contracts/defaults.md`; the whole-list `status` is handled by the screen's status switch before it is called, research D-04 notwithstanding) returns the `EntryView` kind `row`, `loading`, `error` or `unavailable`; an entry with neither `project` nor `state` is `error`; an entry `state` wins over a present `project`; an entry whose `project.name` is empty counts as `error` (D-14, mismatched or late data counts as not loaded).
2. Tests: every combination in `test/project-entry.test.ts`, including a foreign `health` value, a repeated key and an entry with both `project` and `state`.

**Files**: src/logic/project-entry.ts, test/project-entry.test.ts
**Validation**: Revert check: swap the precedence; a named test fails.

### Subtask T011: `logic/project-row.ts`: the row view-model

**Purpose**: FR-003..FR-008, FR-024, D-06..D-10, D-24.

**Steps**:
1. Build a view-model: name, `versionText` (null hides the slot; "vv1" is not parsed), health word and tone (hook first, then `HEALTH_BADGES`, then raw neutral), branch word, Mission count word via `missionCountText`, activity text via the existing `resolveActivity` with `now` and hooks, the location line segments (location verbatim, then branch, then "local only", separator `SUMMARY_SEPARATOR`), the accessible name (name, health, Mission count) and description (version, location, activity, schemaVersion string for assistive technology only, Q4).
2. No `schemaVersion` field other than the description string; a test with `schemaVersion` present and an unexpected `health` proves the badge follows `health` only. No `Math.` on contract values, no `Date`.

**Files**: src/logic/project-row.ts, index.ts exports, test/project-row.test.ts
**Validation**: Revert check named; foreign-vocabulary test present.

### Subtask T012: `logic/project-retry.ts`: the three payload builders

**Purpose**: D-20: builders for `project` (takes the entry key), `projects`, `folders`.

**Steps**:
1. An entry without a `key` is inert: the builder returns null and the retry control is not drawn (the screen WP uses this).
2. Tests: exact payloads with `toEqual`, plus the keyless case.

**Files**: src/logic/project-retry.ts, test/project-retry.test.ts
**Validation**: Tests green with equality assertions.

### Subtask T013: Data-driven gate extension

**Purpose**: NFR-009, D-05: `healthy` and `schema_drift` appear only in `defaults/` and generated contract files.

**Steps**:
1. `eslint.data-driven.config.mjs`: read `ProjectHealth.yaml` into the word lists; add `healthy` to the config's literal bare-word list (comparison-only, like `fresh`, `stale`, `changed`); `schema_drift` joins the underscored literals.
2. Add self-test cases to `gates/data-driven.selftest.ts` (and fixtures under `gates/fixtures/data-driven/`): a component literal `'healthy'` and `=== 'schema_drift'` are refused; the same inside `defaults/` is allowed. Cases only, no plant.
3. Run `pnpm lint:data-driven && pnpm test:data-driven`.

**Files**: eslint.data-driven.config.mjs, gates/**
**Validation**: Self-test lists the new cases; revert check shows the gate fails when the config edit is undone.

### Subtask T014: Exit: gates and hand-off

**Purpose**: Close the WP.

**Steps**:
1. Run the common gates (below). No `CHANGELOG` edit here (IC-01 added the mission's line; IC-02 and IC-03 run in parallel and add none).
2. Hand-off: union location chosen, the two knock-on edits, revert-check list, commit hashes verified with `git cat-file -t`.

**Files**: none
**Validation**: All gates green.

## Definition of Done

- Three union members present; exhaustive test extended; knock-on edits made.
- Defaults, logic and wrapper types exist with the signatures of `contracts/defaults.md` and `data-model.md`.
- `healthy` and `schema_drift` literals appear nowhere outside `defaults/` and `src/contract/`; data-driven self-test covers them.
- Every behaviour has a test that fails when reverted; foreign-vocabulary tests present.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- #7 may move the union between planning and dispatch: look at `main` at dispatch (plan R-3).
- A mistaken bare-word edit makes the gate stricter than intended: check the self-test both ways.
- P-2 and P-3 are proposals until CP-1; keep them easy to change.

## Reviewer Guidance

Grep for the two health literals outside `defaults/` and `src/contract/`; check that precedence, null-hiding and foreign-value behaviours each have a reverting test; confirm the union edit is in the file that existed on `main`; confirm no new `Date`, `Math.` or I/O.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

`packages/mission-ui/test/wp-retry.test.ts` or other existing retry tests if the widened union requires it (one-line rationale each).

## Owned files, red-first, commit rule

**Owned files**: the frontmatter `owned_files` is authoritative; stage only these. `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file outside the list is changed only as the plan's table "Shared files: who may write them" allows for this work package; each such out-of-map edit is committed by you with plain `git add <path>` and `git commit`, and listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request (file, change, reason). A generated file (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) is never edited by hand: a conflict is resolved by regeneration only.

**Gates this work package must pass before hand-off** (run from the lane worktree root, each exits 0 with a pass count above 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (its output must list your test files), `pnpm test:scripts`, `pnpm build-storybook`, `pnpm contract:check && pnpm test:contract`. `pnpm visual` and `pnpm gate-proof` are NOT exit checks except where this prompt says so. If a script name differs on the build base, use the base's name and say so.

**Red-first.** For every behaviour, plant or gate case: write the failing test first, see it fail for the right reason, record the failing line in the hand-off, then implement. Per test file, one deliberate revert (temporary local edit, never committed) that produces a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two.

**Test-quality rules** (binding, from missions #4 and #5): every no-event test carries a positive control in the same test; every emit test asserts exactly one event, `bubbles` true, `composed` true, `cancelable` false and the detail with `toEqual`; counts are asserted by equality and every loop asserts it ran N times; not-drawn regions have a DOM-absence assertion paired with a present case; foreign values render their raw text, never `undefined`; vitest browser-mode tests call `page.viewport` first; the word "feature" never appears (the term is "Mission").

**Data-driven rules** (FR-019, NFR-009): `healthy` and `schema_drift` appear only in `defaults/` and `src/contract/`; no `=== 'healthy'`; no per-project literal (`main`, `spec-kitty`) in a component; no `Date`, `setTimeout`, `fetch`, `localStorage`, `location` or `history`; no `Math.` on contract values; every `dispatchEvent` has a literal `sk-*` name, sits in the element file and is declared by `@fires` (part files never dispatch); the screen never parses a location, branch or name and never derives health from `schemaVersion`; every `class=` has an approved prefix in that file's E-34 row or the file has none; no absolute home path or username in any committed file.

**Drift register and visual authority** (NFR-008): the prototype page `<prototype>/01-projects.html` is the visual source of truth. DP-1..DP-27 (`spec.md`) are PROPOSED until the `CP-1 confirmed` entry exists in `tracer-design-decisions.md`, and afterwards only the items that entry confirms are allowed. A difference in neither the register nor the CP-1 entry is a REJECT item for the WP that introduces it, not a design review item.

**Baselines**: PNGs are generated only inside the pinned container and committed ONLY in WP09. Other WPs commit no PNG, never run `pnpm visual:update`, and hand over uncommitted side-by-side screenshots against the prototype.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, compaction of history, a rebase and the operator's Storybook review (orchestrator-owned). Commit on your lane branch with a conventional message (`feat(projects-screen): ... (#9)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way. Never pattern-kill processes, never `git stash`, never `git rebase`, never `rm` with a glob or variable; `core.bare` must stay false. Nothing is left running when you finish.
- Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics.
- Directory guard before any repo-wide command (`pnpm`, `eslint .`, `ruff`, `git add`): `test "$(git rev-parse --show-toplevel)" = "<lane>"`.
- No absolute paths and no usernames in any committed file or hand-off (use `<repo>`, `<prototype>`, `<lane>`); run `pnpm hygiene` before committing. Temporary files go under the scratchpad directory the orchestrator names (TMPDIR).
- Elements over CSS: every UI primitive the design library provides is rendered with its `sk-*` element; project CSS is layout-only with `--sk-*` tokens; a missing primitive is recorded as a design-library gap, never hand-rolled outside a numbered exception ruled at CP-1.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript; no I/O in screens.
- `tracer-*.md`, `spec.md`, `plan.md` and everything else under `kitty-specs/` are orchestrator-owned: report outcomes, decisions and friction in the hand-off; write nothing there.
- Do not run `spec-kitty` commands that mutate mission state; the orchestrator moves tasks.


Implementation command: `spec-kitty agent action implement WP02 --agent claude`
