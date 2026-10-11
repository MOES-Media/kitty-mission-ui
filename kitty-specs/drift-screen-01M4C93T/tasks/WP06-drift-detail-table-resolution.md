---
work_package_id: WP06
title: Detail, lane table and resolution (chain Y)
dependencies:
- WP04
requirement_refs:
- FR-010
- FR-011
- FR-012
- FR-013
- FR-014
- FR-015
- FR-016
- FR-017
- FR-021
- FR-027
- FR-031
- C-003
- C-005
- C-006
- C-008
- NFR-003
- NFR-005
- NFR-008
- NFR-010
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-drift-screen-01M4C93T
base_commit: d0e0043e5c75d14e0ceb68b7582ddb98375ce276
created_at: '2026-10-10T07:55:04.999204+00:00'
subtasks:
- T031
- T032
- T033
- T034
- T035
- T036
phase: Phase 3 - Regions
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-drift-screen/
create_intent:
- packages/mission-ui/src/elements/sk-drift-screen/detail-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/table-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/resolution-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.detail.stories.ts
- packages/mission-ui/test/sk-drift-screen.events-detail.test.ts
- packages/mission-ui/test/sk-drift-screen.detail.test.ts
- packages/mission-ui/test/sk-drift-screen.table.test.ts
- packages/mission-ui/test/sk-drift-screen.resolution.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-drift-screen/detail-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/table-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/resolution-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.detail.stories.ts
- packages/mission-ui/test/sk-drift-screen.events-detail.test.ts
- packages/mission-ui/test/sk-drift-screen.detail.test.ts
- packages/mission-ui/test/sk-drift-screen.table.test.ts
- packages/mission-ui/test/sk-drift-screen.resolution.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - Detail, lane table and resolution (chain Y) (IC-05)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Draw the finding detail: kicker, title, explanation, authority panel, facts with the Mission link, the lane table with real headers and the not-present word, the corrupt-JSON sentence, and the suggested resolution (command, Copy, result region, manual selection, unknown-slug and unknown-remedy cases).

## Context

Chain Y. Disjoint from chain X (WP05). The list is a stub in this lane. EV-3 (`sk-copy-command`) and EV-4 (`sk-open-mission` with `{ missionId, slug }`) are dispatched by the screen file; you draw the controls and prove the payloads. The component never writes the clipboard (C-001/C-003); the host does and answers with `copyResult`.

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

### Subtask T031: Detail header and authority panel

**Purpose**: Kicker, title, explanation, authority panel.

**Steps and details**:

`detail-parts.ts`: kicker, title (`summary` fallback), explanation, authority panel using `panel-parts` (read-only). Unknown kind, severity, authority, derivedSide: raw word, neutral tone, no explanation, no command (DR-10); the finding is never hidden. No branch name anywhere (C-008, DR-08).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T032: Facts and Mission link

**Purpose**: Facts rows and EV-4.

**Steps and details**:

Facts with `artifactPath`, authority word, derived side, and the Mission link emitting `sk-open-mission` `{ missionId, slug }`; a Mission missing from the host's name map shows the `missionId` in mono with no link (DR-13/DD-8).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T033: Lane table

**Purpose**: Real table, differing rows, not-present word.

**Steps and details**:

`table-parts.ts`: real `table` with `th` headers (E-37 scroll region if kept at CP-1), rows = `laneComparison` differing rows only, a one-sided Work Package shows the not-present word on the null side (DR-03), unknown lane word raw. Corrupt-JSON case: the table region is one sentence (DR-06). DR-04/DR-05 render no table where the data has none. Table label says 'status lane' (C-009).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T034: Resolution region

**Purpose**: Command, Copy, result, manual selection.

**Steps and details**:

`resolution-parts.ts`: command built by `drift-finding` from `remedy` and slug; Copy control (E-38 if kept) emits EV-3; the result region announces `copied` or `manual` only when `copyResult` changes (a stale `copyResult` at press announces nothing, and a result for another finding is ignored); manual selection of the command text through the S5 route passing `lint:no-io` and typecheck as written; unknown slug or remedy: no command, one sentence (DR-11/DR-13); no resolution region when no remedy (DR-04, DR-05, DR-07b).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T035: Stories

**Purpose**: Detail stories.

**Steps and details**:

`sk-drift-screen.detail.stories.ts` for DR-02..DR-08 (DR-07a and DR-07b separately), DR-10..DR-13, DR-32 with fixtures from `fixtures.ts`. Side-by-side captures of the detail region only (cropped, uncommitted, described in the hand-off).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T036: Tests

**Purpose**: Events and detail behaviour.

**Steps and details**:

Tests with positive controls and revert checks: EV-3 and EV-4 exact payloads; stale-`copyResult`-at-press (nothing announced until the property changes); the wrong-finding test; manual selection passes `lint:no-io` and typecheck; table rows equal the differing set (equality, not at-least); the DR-07a no-claim-about-which-file rule (Gap 16). Each file lists one revert check.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

Events EV-3, EV-4 tests, each shown red against the reverted part; the stale-`copyResult` and wrong-finding tests; manual selection passes `lint:no-io` and typecheck as written; captures for DR-02..DR-08, DR-10..DR-13, DR-32; gates except `visual` green.

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

Announcing the copy result twice or for a stale value. A branch name leaking into any text. Writing the clipboard from the component. Hand-rolled table or copy field outside the recorded exceptions.

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
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`); `pnpm hygiene` before committing. Keep TMPDIR under a private temporary directory.
- Baselines are generated ONLY in WP08, inside the pinned container; never hand-edit or copy a PNG.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or elements; project CSS is layout only with `--sk-*` tokens; every UI primitive the library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is a recorded gap, never hand-rolled outside E-35..E-39 and the E-18 extension as kept at CP-1.
- Screens do no arithmetic on contract values beyond display counts (C-004); no kind, severity, authority, remedy, source-code or lane literal outside `src/defaults/` (C-007). No branch name is ever shown (C-008).
- `tracer-*.md`, `spec.md`, `plan.md`, `tasks.md` are orchestrator-owned: report decisions and friction in the hand-off.

## Out-of-map edits permitted (committed by the WP itself, recorded in the hand-off)

Nothing intended; any edit outside `owned_files` is a recorded exception. Do NOT edit the screen file, panel parts, fixtures, `src/index.ts` or `custom-elements.json`.

## Branch Strategy

Planning branch and final merge target: `feat/drift-screen-10`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per plan 'Lane mechanics'); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP06 --agent claude`
