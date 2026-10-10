---
work_package_id: WP06
title: Projects screen regions (chain X)
dependencies:
- WP05
requirement_refs:
- FR-002
- FR-003
- FR-009
- FR-010
- FR-012
- FR-013
- FR-014
- FR-021
- FR-022
- FR-028
- FR-030
- NFR-007
- NFR-010
- NFR-012
- C-003
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T10:07:53.322371+00:00'
subtasks:
- T033
- T034
- T035
- T036
- T037
- T038
- T039
- T040
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-projects-screen/
create_intent:
- packages/mission-ui/src/elements/sk-projects-screen/header-parts.ts
- packages/mission-ui/src/elements/sk-projects-screen/row-parts.ts
- packages/mission-ui/src/elements/sk-projects-screen/state-parts.ts
- packages/mission-ui/src/elements/sk-projects-screen/fixtures.ts
- packages/mission-ui/src/elements/sk-projects-screen/sk-projects-screen.stories.ts
- packages/mission-ui/test/sk-projects-screen.header.test.ts
- packages/mission-ui/test/sk-projects-screen.rows.test.ts
- packages/mission-ui/test/sk-projects-screen.states.test.ts
- packages/mission-ui/test/sk-projects-screen.events.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-projects-screen/header-parts.ts
- packages/mission-ui/src/elements/sk-projects-screen/row-parts.ts
- packages/mission-ui/src/elements/sk-projects-screen/state-parts.ts
- packages/mission-ui/src/elements/sk-projects-screen/fixtures.ts
- packages/mission-ui/src/elements/sk-projects-screen/sk-projects-screen.stories.ts
- packages/mission-ui/test/sk-projects-screen.header.test.ts
- packages/mission-ui/test/sk-projects-screen.rows.test.ts
- packages/mission-ui/test/sk-projects-screen.states.test.ts
- packages/mission-ui/test/sk-projects-screen.events.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - Projects screen regions (chain X) (IC-05)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the screen's part bodies and fixtures: header band and toolbar, rows in every entry kind with the shared pill ellipsis rule, whole-list states, per-entry states and the read-only notice; stories PR-01..PR-19, PR-24, PR-25, PR-30; the screen's event tests EV-1..EV-5 with positive controls; and uncommitted side-by-side screenshots against the prototype.

## Context

Plan IC-05; `contracts/sk-projects-screen.md` (regions, semantics, announcements, focus order); `research.md` D-08..D-15, D-21, D-24, D-26; spec state matrix PR-01..PR-19/24/25/30 and EV-1..EV-5; the drift register as confirmed at CP-1. Chain X: runs in parallel with WP07 (disjoint files). Requirements FR-002, FR-003 (with WP02's view-model), FR-009..FR-014, FR-021/FR-022 (part), FR-028, FR-030 (part), NFR-007, NFR-010, NFR-012, C-003. Fixtures come from WP01's contract overlays plus host builders defined here.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP05. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

FILE PRECONDITION (first step, first exit check). Confirm that `tracer-design-decisions.md` in this mission's directory (read-only for you) contains a dated entry headed `CP-1 confirmed` naming which of DP-1..DP-27 the operator confirmed, the exceptions E-31..E-34 as ruled (each with the spike that decided it), the amendments P-1..P-3 as ruled and the two container thresholds. Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree, where `<CP-1 commit>` is the hash the dispatch names. If the entry is absent or not an ancestor: STOP and report; never write the entry yourself. The reviewer REJECTS if it was not present before your first commit.

## Subtasks

### Subtask T033: FILE PRECONDITION and parent check

**Purpose**: CP-1 precedes every visual WP; an unconfirmed DP is a REJECT item.

**Steps**:
1. FILE PRECONDITION (first step, first exit check). Confirm that `tracer-design-decisions.md` in this mission's directory (read-only for you) contains a dated entry headed `CP-1 confirmed` naming which of DP-1..DP-27 the operator confirmed, the exceptions E-31..E-34 as ruled (each with the spike that decided it), the amendments P-1..P-3 as ruled and the two container thresholds. Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree, where `<CP-1 commit>` is the hash the dispatch names. If the entry is absent or not an ancestor: STOP and report; never write the entry yourself. The reviewer REJECTS if it was not present before your first commit.
2. Also confirm the WP05 tip is an ancestor of HEAD and that the four stub parts exist with their final signatures.

**Files**: none
**Validation**: Hand-off quotes the ancestry checks.

### Subtask T034: `fixtures.ts`: entries from contract examples and overlays

**Purpose**: FR-028, D-21, NFR-007.

**Steps**:
1. Entry builders from `Project.example`, `Project.schema-drift`, `Project.all-null` and WP01's overlays; host builders for `loading`, `error`, `unavailable`, `long` (255-char branch, 64-char version, long name and location), `null-version`, `unknown-health`, `fifty`. Locations `~/work/<synthetic-name>`; names synthetic (not the prototype's); no path, username or e-mail (`pnpm hygiene`).
2. Every builder returns fresh objects; a test asserts the expected number of builders (equality).

**Files**: fixtures.ts
**Validation**: `pnpm hygiene` green.

### Subtask T035: `header-parts.ts`: header band and toolbar

**Purpose**: FR-013, PR-18, DP-23.

**Steps**:
1. Spike S1's result decides the shape: `sk-page-header` with eyebrow, `h1`, muted copy and the "Open project" `sk-button` if it has an action slot, else a layout-only flex wrapper (`data-header-band`) with no exception. Button emits through the handler passed in (FR-010).
2. Toolbar: "Recent projects" eyebrow and the mono entry count (`projectCountText`), hidden while the whole list loads or errors.

**Files**: header-parts.ts
**Validation**: Header story PR-18 matches the prototype within the confirmed register.

### Subtask T036: `row-parts.ts`: rows in every entry kind

**Purpose**: FR-002, FR-003, FR-009, FR-011, D-11..D-13, D-24.

**Steps**:
1. Openable row: one control (library button if S1 proved it can carry the row, else a raw `button type="button"` under E-31 if ruled) containing the name, version, health `sk-pill-tag` (shared ellipsis rule: full text in `title` and accessible name), mono location line, Mission count, active-ago, `aria-hidden` arrow (DP-7); accessible name = name, health, Mission count; the rest is the description.
2. Not-openable, loading and unavailable entries are plain `div`s in the same box (the list does not jump). Loading: `aria-busy` and the adopted progress family. Error: generic sentence from `defaults/` and a secondary `sk-button` retry whose accessible name includes the project name; unavailable: the word, nothing else.
3. Use the contract's test hooks (`data-region`, `data-key` on rows, `[data-live]`) and the part names WP05 created (`renderRow`, `renderHeader`, `renderToolbar`, `renderListState`, `renderNotice`). The contract's Structure line states an `sk-page-header` action slot as fact while the plan leaves it to spike S1; the CP-1 outcome of S1 wins over that line.
4. Hide null parts without placeholders; the screen never parses a name, branch or location; no `healthy`/`schema_drift` literal.

**Files**: row-parts.ts
**Validation**: Row stories PR-01..PR-14, PR-24, PR-30.

### Subtask T037: `state-parts.ts`: whole-list states and notice

**Purpose**: FR-012, FR-014, D-19 look from #4's panels.

**Steps**:
1. `loading` (busy indicator under the header, no rows, no count), `error` (alert notice, host-neutral copy, retry emitting the `projects` payload), `empty` (neutral form and the call to action: the header button); the read-only `sk-notice` at the foot in every state that shows rows or the empty state.

**Files**: state-parts.ts
**Validation**: Stories PR-15..PR-17, PR-19.

### Subtask T038: Stories PR-01..PR-19, PR-24, PR-25, PR-30

**Purpose**: FR-031 (stories; baselines are WP09's).

**Steps**:
1. One story per matrix row inside `shellFrame({ layout: 'picker' })`, dark theme at 1280 px, with the visual harness tags (`vw-<n>`) of #4. Fifty-row story for PR-25. Every story passes the "Skip to Projects" text from `defaults/` through the shell's `skip-link` slot (FR-023). Do not edit the shell stories file. No baseline PNG is committed and `pnpm visual:update` is never run.

**Files**: sk-projects-screen.stories.ts
**Validation**: `pnpm build-storybook` lists every story; the catalogue test counts them.

### Subtask T039: Tests: header, rows, states, events EV-1..EV-5

**Purpose**: FR-030 with positive controls.

**Steps**:
1. `rows`: every fact shown, every null part hidden, unknown health raw+neutral, plurals, active-ago against `now`. `states`: loading/error/unavailable rows keep name and location; whole-list status wins; late/mismatched project counts as not loaded (live region text equals what is shown). `header`: four parts, count hidden while loading.
2. `events`: EV-1 (pointer, Enter, Space; `{ key }`), EV-2 (not-openable, loading, unavailable rows emit nothing; positive control: an openable sibling does), EV-3, EV-4, EV-5. Each emit test: exactly one event, `bubbles`, `composed`, `toEqual` detail. A repeated key behaves as the spec edge case states. EV-10: every state-only interaction (focus, scroll, hover) emits nothing, with the positive control of a row activation on the same listener. Revert check per file.

**Files**: four test files
**Validation**: Counts by equality; loops assert they ran N times.

### Subtask T040: Hand-over: side-by-side screenshots and out-of-map record

**Purpose**: SC-007 evidence for WP09.

**Steps**:
1. For each story produce an UNCOMMITTED side-by-side against the prototype in the pinned container; read each and describe it in the hand-off (what is drawn, width, anything wrong). List every drift you see that is not in the register: it is a REJECT item for you to fix, not to excuse.
2. List out-of-map edits (a part-signature gap is a change request, not an edit) and commit hashes verified with `git cat-file -t`.

**Files**: none
**Validation**: Hand-off complete.

## Definition of Done

- Every part body written; signatures unchanged.
- Stories for PR-01..PR-19, PR-24, PR-25, PR-30 exist; EV-1..EV-5 asserted with positive controls.
- No drift outside the CP-1 register; screenshots handed over uncommitted.
- Self-check list of `contracts/gates.md` passes.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- Row chrome depends on the S1 outcome and the ruled E-31.
- The live region must never announce a false ready (NFR-012).
- Fixture hygiene: prototype sample names must not be copied.

## Reviewer Guidance

Run the gates; open each story against the prototype; grep for the health literals, `Date`, timers and `class=` prefixes; check negative events have positive controls; confirm no baseline PNG is staged.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

Requests to change element classes, `index.ts`, lint configs or `defaults/`/`logic/` go to the orchestrator as change requests, not edits. `custom-elements.json`: regenerate only if a gate demands it.

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


Implementation command: `spec-kitty agent action implement WP06 --agent claude`
