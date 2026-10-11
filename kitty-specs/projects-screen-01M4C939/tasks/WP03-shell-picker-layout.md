---
work_package_id: WP03
title: Shell picker layout value
dependencies:
- WP01
requirement_refs:
- FR-015
- FR-023
- C-007
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T08:29:09.120414+00:00'
subtasks:
- T015
- T016
- T017
- T018
- T019
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-mission-shell/
create_intent:
- packages/mission-ui/test/sk-mission-shell.picker.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts
- packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts
- packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts
- packages/mission-ui/src/shell-types.ts
- packages/mission-ui/src/story-support/shell-frame.ts
- packages/mission-ui/test/sk-mission-shell.picker.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - Shell picker layout value (IC-03)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Add the additive `picker` value to the shell's existing `layout` property (top bar only: no sidebar, rail, icon column, flyout, drawer or hamburger at any tier), the `shellFrame` option for it, and a unit test file proving it, with the shell description in `custom-elements.json` regenerated in the same commit.

## Context

Ruled Q1; plan Architecture (Shell value, Responsive layout); `contracts/shell-picker-layout.md` (the rendering rules, authoritative); `research.md` D-02, D-03. This WP is the only writer of the shell files, `shell-types.ts`, `story-support/shell-frame.ts`. The shell's own stories file is NOT edited (its baselines stay identical); the picker layout is shown by this mission's screen stories. Independent of WP02 (disjoint files), so the two may run in parallel after WP01.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP01. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Subtasks

### Subtask T015: `ShellLayout` gains `'picker'` and `render()` resolves it

**Purpose**: FR-015: a third value, no new property.

**Steps**:
1. `shell-types.ts`: `ShellLayout = 'project' | 'mission' | 'picker'`. In `render()` the layout resolves to `picker` only for that exact value; any other unknown value still falls back to `project`.
2. Red first: write the picker test (T018) cases for the fallback before the value exists.

**Files**: shell-types.ts, sk-mission-shell.ts
**Validation**: Typecheck; existing shell tests green.

### Subtask T016: Picker chrome in the shell parts

**Purpose**: `contracts/shell-picker-layout.md` rendering rules.

**Steps**:
1. Render the skip link and the top bar WITHOUT the hamburger at any tier; one content column (`grid-template-columns: minmax(0, 1fr)`); no sidebar, icon column, flyout, drawer or rail; status region and content slot as before.
2. Force `drawer-open` and `flyout-open` false in picker; ignore `current`, `navItems`, `railItems`, `footerItem`, `project`, `mission`. The tier attribute is still reflected so `ShellTierController` works unchanged.
3. Layout CSS only, `--sk-*` tokens only; no new exception.

**Files**: shell-parts.ts, shell-overlays.ts, sk-mission-shell.ts
**Validation**: Visual check by screenshot at 1280, 1100, 800, 620 (uncommitted, described in hand-off).

### Subtask T017: `layout` JSDoc, manifest description and `shellFrame` option

**Purpose**: The manifest records the description, so `manifest:check` is red the moment the description changes.

**Steps**:
1. Update the `layout` property JSDoc to name `picker`; run `pnpm manifest:generate` in the same commit and `pnpm manifest:check` (out-of-map edit of `custom-elements.json`: its single owner is WP05; regenerate only, never by hand).
2. `story-support/shell-frame.ts`: add `layout: 'picker'` to the option type, one line.

**Files**: story-support/shell-frame.ts; custom-elements.json (regenerated, out-of-map)
**Validation**: `pnpm manifest:check` green.

### Subtask T018: `sk-mission-shell.picker.test.ts`

**Purpose**: Prove the contract of the layout.

**Steps**:
1. At 1280, 1100, 800 and 620 (call `page.viewport` first): no sidebar, rail, icon column, flyout, drawer or hamburger in the DOM, with a paired positive control (the `project` layout at the same width does draw them).
2. Unknown layout values still fall back to `project`; `tier` is still reflected; `current`, `navItems` and friends are ignored in picker; `drawer-open` cannot open anything.
3. Revert check: remove the picker branch; named tests fail.

**Files**: test/sk-mission-shell.picker.test.ts (new)
**Validation**: Test file listed by `pnpm test`; counts asserted with equality.

### Subtask T019: Exit: existing shell tests and baselines unchanged

**Purpose**: Additive means nothing existing moves.

**Steps**:
1. `pnpm test` shows the existing shell tests unchanged and green; the shell stories file has an empty diff; `pnpm visual` in the pinned container shows every existing baseline identical (do not update).
2. Hand-off: commit hashes verified with `git cat-file -t`, the out-of-map edit with rationale, screenshots described.

**Files**: none
**Validation**: All common gates green.

## Definition of Done

- `picker` renders exactly as `contracts/shell-picker-layout.md` states at all four widths.
- No new shell property; unknown values still fall back to `project`.
- Manifest regenerated in the same commit; `manifest:check` green; stories file diff empty; existing baselines identical.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- The `project` fallback must not widen to accept near-miss values.
- Shell tier logic is shared: do not fork it for picker.
- Another mission (Drift, Ops) edits the same file family later: keep the change one block.

## Reviewer Guidance

Read the DOM at four widths for absent chrome with the paired positive control; check the fallback test; check `custom-elements.json` changed only in the `layout` description and was regenerated; check the stories file diff is empty.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

`packages/mission-ui/custom-elements.json` (regenerated for the `layout` description only; single owner is WP05).

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


Implementation command: `spec-kitty agent action implement WP03 --agent claude`
