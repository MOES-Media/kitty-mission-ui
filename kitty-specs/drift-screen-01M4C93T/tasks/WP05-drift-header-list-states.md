---
work_package_id: WP05
title: Header, list, head and states (chain X)
dependencies:
- WP04
requirement_refs:
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-018
- FR-019
- FR-020
- FR-022
- FR-025
- FR-026
- FR-031
- C-003
- C-005
- C-006
- NFR-003
- NFR-005
- NFR-008
- NFR-010
planning_base_branch: feat/drift-screen-10
merge_target_branch: feat/drift-screen-10
branch_strategy: Planning artifacts for this mission were generated on feat/drift-screen-10. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/drift-screen-10 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-drift-screen-01M4C93T
base_commit: d0e0043e5c75d14e0ceb68b7582ddb98375ce276
created_at: '2026-10-10T07:54:47.566571+00:00'
subtasks:
- T025
- T026
- T027
- T028
- T029
- T030
phase: Phase 3 - Regions
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-drift-screen/
create_intent:
- packages/mission-ui/src/elements/sk-drift-screen/header-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/list-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/state-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.list.stories.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.states.stories.ts
- packages/mission-ui/test/sk-drift-screen.events-list.test.ts
- packages/mission-ui/test/sk-drift-screen.list-keys.test.ts
- packages/mission-ui/test/sk-drift-screen.states.test.ts
- packages/mission-ui/test/sk-drift-screen.header.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-drift-screen/header-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/list-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/state-parts.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.list.stories.ts
- packages/mission-ui/src/elements/sk-drift-screen/sk-drift-screen.states.stories.ts
- packages/mission-ui/test/sk-drift-screen.events-list.test.ts
- packages/mission-ui/test/sk-drift-screen.list-keys.test.ts
- packages/mission-ui/test/sk-drift-screen.states.test.ts
- packages/mission-ui/test/sk-drift-screen.header.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP05 - Header, list, head and states (chain X) (IC-04)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match.

---

## Objective

Draw the page header (title, subtitle, last scan, Rescan with its busy rule), the finding head (count, roll-up, badge), the listbox with rows and keyboard, the Mission slug ellipsis, and every state: loading, clean, error, not-found, choose-a-finding, truncation note, rescanning, plus the live-region content and the foreign-finding fail-closed look.

## Context

Chain X. Disjoint from chain Y (WP06): you own only header, list and state parts, your stories and your tests. The screen file, panel parts and fixtures are read-only (change request). The detail is a stub in this lane. Events EV-1 (`sk-select-finding`), EV-2 (`sk-rescan-drift`), EV-5 (`sk-open-missions`) and EV-6 (`sk-retry-load`) are dispatched by the screen file; you draw the controls and prove the payloads.

Read first: `kitty-specs/drift-screen-01M4C93T/plan.md` (this WP's concern section and 'Shared files: who may write them'), `kitty-specs/drift-screen-01M4C93T/spec.md` (Clarifications and the cited requirements), `kitty-specs/drift-screen-01M4C93T/research.md`, `kitty-specs/drift-screen-01M4C93T/data-model.md`, `kitty-specs/drift-screen-01M4C93T/contracts/sk-drift-screen.md`, `kitty-specs/drift-screen-01M4C93T/contracts/defaults.md`, `kitty-specs/drift-screen-01M4C93T/tracer-design-decisions.md`, and `kitty-specs/drift-screen-01M4C93T/tasks-notes.md` (the IC-03a/IC-03b mapping and the out-of-map list).

### Subtask T025: Header part

**Purpose**: Title, subtitle, last scan, Rescan.

**Steps and details**:

`header-parts.ts`: title, subtitle naming the Mission when scoped (DR-24), last scan as relative text from `now` with ISO fallback and the full instant in `title` (DD-13), Rescan as `sk-button`-family element with the busy rule: busy means `aria-busy`, report kept, the button keeps focus, exactly one rescanned announcement.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T026: Head and listbox rows

**Purpose**: Count, roll-up, badge, rows.

**Steps and details**:

Finding head: count and per-severity roll-up from `findings.length` and tallies (C-004), danger-tone badge when any finding has a danger-tone severity (DR-14). Listbox rows: native button per option with `role="option"`, summary, Mission slug in mono with the ellipsis rule (E-39), severity badge always with its word (DR-15), the quiet mono `sourceCode` tag (DR-32). Foreign (unknown-vocabulary) findings are shown, neutral tone.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T027: Keyboard and selection

**Purpose**: Roving tabindex, arrows, Home, End.

**Steps and details**:

Use `drift-keys` for Up/Left, Down/Right with wrap, Home, End. Selection follows focus; one event per key; `aria-selected` follows the `selectedFinding` property only; the roving focus re-syncs to the selected option after an update when focus is not inside the list (FR-022). A host that ignores `sk-select-finding` leaves selection unchanged. A keyboard table test pins wrap and the one-item case.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T028: States

**Purpose**: Loading, clean, error, not-found, choose-a-finding, truncation, rescanning.

**Steps and details**:

`state-parts.ts`: loading (`aria-busy`, labelled progress), clean ('No drift found', last scan shown, never 'consistent'), error with `sk-retry-load` payload `{ target: 'drift-report', missionId }` (generic words for an unknown refusal code or 400, DR-31), not-found with 'Return to Missions' emitting `sk-open-missions`, choose-a-finding (no event), truncation `sk-notice` 'Showing the first N findings' with no '1000' literal, rescanning keeps the report and the option nodes (no remount).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T029: Live region content and stories

**Purpose**: Announcements and the stories this chain owns.

**Steps and details**:

Live-region text through `drift-announce`. Stories in `sk-drift-screen.list.stories.ts` and `.states.stories.ts` for DR-14..DR-23, DR-30, DR-31 (DR-24 belongs to WP07). Disjoint story names. Side-by-side captures of header, list and state regions against the prototype (cropped, uncommitted, described in the hand-off).

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

### Subtask T030: Tests

**Purpose**: Events, keys, states, header.

**Steps and details**:

Tests with positive controls and revert checks: EV-1, EV-2, EV-5, EV-6 exact payloads (`toEqual`, exactly one event, bubbles and composed); keyboard table; host-ignores-event; rescanning no-remount (same nodes before and after); Rescan keeps focus; exactly one rescanned announcement; scoped scan drops the Mission column. Each test file lists one revert check.

**Validation**: the exit checks below that cover this subtask, with the red-first evidence in the hand-off.

## Exit evidence (all runnable)

Events EV-1, EV-2, EV-5, EV-6 tests with positive controls, each shown red against the reverted part; keyboard table test; host-ignores-event test; side-by-side captures for DR-14..DR-23, DR-30, DR-31 (uncommitted); all gates except `visual` green (no baselines committed here; missing snapshots are the known red until WP08).

## Definition of Done

Every subtask recorded with `spec-kitty agent tasks mark-status <Txxx> --status done`; all exit evidence reproduced; the hand-off lists commit hashes (verified with `git cat-file -t`), out-of-map edits with a one-line rationale, change requests, exceptions touched, revert checks per test file, and every new PNG or capture described. `git status --short` is empty after the final commit.

## Risks

Announcing twice (notice plus live region). Remounting options on rescan. Visual drift beyond the confirmed register is a REJECT. Writing to the screen file instead of filing a change request.

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

Implementation command: `spec-kitty agent action implement WP05 --agent claude`
