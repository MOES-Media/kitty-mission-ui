---
work_package_id: WP07
title: Open-project dialog parts (chain Y)
dependencies:
- WP05
requirement_refs:
- FR-016
- FR-017
- FR-018
- FR-021
- FR-022
- FR-028
- FR-030
- NFR-010
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T10:07:59.341822+00:00'
subtasks:
- T041
- T042
- T043
- T044
- T045
- T046
- T047
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-open-project-dialog/
create_intent:
- packages/mission-ui/src/elements/sk-open-project-dialog/folder-list-parts.ts
- packages/mission-ui/src/elements/sk-open-project-dialog/fixtures.ts
- packages/mission-ui/src/elements/sk-open-project-dialog/sk-open-project-dialog.stories.ts
- packages/mission-ui/test/sk-open-project-dialog.events.test.ts
- packages/mission-ui/test/sk-open-project-dialog.focus.test.ts
- packages/mission-ui/test/sk-open-project-dialog.keyboard.test.ts
- packages/mission-ui/test/sk-open-project-dialog.states.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-open-project-dialog/folder-list-parts.ts
- packages/mission-ui/src/elements/sk-open-project-dialog/fixtures.ts
- packages/mission-ui/src/elements/sk-open-project-dialog/sk-open-project-dialog.stories.ts
- packages/mission-ui/test/sk-open-project-dialog.events.test.ts
- packages/mission-ui/test/sk-open-project-dialog.focus.test.ts
- packages/mission-ui/test/sk-open-project-dialog.keyboard.test.ts
- packages/mission-ui/test/sk-open-project-dialog.states.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP07 - Open-project dialog parts (chain Y) (IC-06)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the dialog's parts: header, folder field, the listbox of folders, the hint and the footer, and the listing states (loading, error, empty folder, no valid selection); focus capture and return; the listbox keyboard model; stories PR-20..PR-23; events EV-6..EV-9 tests; uncommitted screenshots.

## Context

Plan IC-06; `contracts/sk-open-project-dialog.md`; `research.md` D-16..D-19, D-25; spec PR-20..PR-23, EV-6..EV-9, FR-016..FR-018; spikes S2, S6, S7 outcomes as recorded at CP-1. Chain Y: parallel with WP06 (disjoint files). The dialog is a sibling the host places; in stories it is rendered beside the screen in `shellFrame`.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP05. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

FILE PRECONDITION (first step, first exit check). Confirm that `tracer-design-decisions.md` in this mission's directory (read-only for you) contains a dated entry headed `CP-1 confirmed` naming which of DP-1..DP-27 the operator confirmed, the exceptions E-31..E-34 as ruled (each with the spike that decided it), the amendments P-1..P-3 as ruled and the two container thresholds. Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree, where `<CP-1 commit>` is the hash the dispatch names. If the entry is absent or not an ancestor: STOP and report; never write the entry yourself. The reviewer REJECTS if it was not present before your first commit.

## Subtasks

### Subtask T041: FILE PRECONDITION and parent check

**Purpose**: Same gate as WP06.

**Steps**:
1. FILE PRECONDITION (first step, first exit check). Confirm that `tracer-design-decisions.md` in this mission's directory (read-only for you) contains a dated entry headed `CP-1 confirmed` naming which of DP-1..DP-27 the operator confirmed, the exceptions E-31..E-34 as ruled (each with the spike that decided it), the amendments P-1..P-3 as ruled and the two container thresholds. Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree, where `<CP-1 commit>` is the hash the dispatch names. If the entry is absent or not an ancestor: STOP and report; never write the entry yourself. The reviewer REJECTS if it was not present before your first commit.
2. Confirm the WP05 tip is an ancestor of HEAD and `folder-list-parts.ts` exists as a stub with its final signatures.

**Files**: none
**Validation**: Hand-off quotes the checks.

### Subtask T042: `fixtures.ts`: folder listings

**Purpose**: Synthetic folders (NFR-007).

**Steps**:
1. Listings: parent row, ordinary folders, a selected valid project, an invalid folder, an empty listing, a long name; locations `~/work/<synthetic>`. Counts asserted by equality.

**Files**: fixtures.ts
**Validation**: `pnpm hygiene` green.

### Subtask T043: `folder-list-parts.ts`: header, field, listbox, hint, footer

**Purpose**: FR-016..FR-018, D-17, D-18.

**Steps**:
1. Header: eyebrow, `h2`, ghost icon `sk-button` with an accessible name. Field: label plus read-only `sk-form-input` for the location, or the labelled static text if S2 proved no `readonly` (DP-12 as ruled). Listbox: `role="listbox"` with `aria-label`; options are raw `role="option"` buttons painted on `aria-selected` under E-33 if ruled; roving tabindex; ArrowUp/ArrowDown/Home/End move focus only; Enter or Space selects and emits `sk-browse-folder` with the option's `location` through the passed handler; `valid` folders carry the "valid project" `sk-pill-tag` (DP-14) for any valid folder.
2. Footer: Cancel (ghost) and Open (primary `sk-button`), Open disabled unless the selected folder has `valid: true`, with the reason in text and `aria-describedby` (DP-15). Open emits `sk-confirm-open-project` with the selected folder's `location`.

**Files**: folder-list-parts.ts
**Validation**: Stories PR-20..PR-22.

### Subtask T044: Listing states and the dialog live region

**Purpose**: D-19, FR-022, NFR-012.

**Steps**:
1. `loading` (busy list), `error` (alert notice and retry emitting `{ target: 'folders' }`), `empty` (the empty-folder word), `ready`; Open disabled in each non-ready state with its reason. The status region text equals what is shown ("Loading folders", the empty word, the error sentence, the folder count).

**Files**: folder-list-parts.ts
**Validation**: Story PR-23 variants.

### Subtask T045: Focus capture, trap and return; keyboard model tests

**Purpose**: FR-018, PR-26 (dialog share).

**Steps**:
1. Tests: focus moves in on open; Tab wraps inside; Escape, Cancel and a backdrop click close and set `open` false without emitting the confirm event; focus returns to the opener when still connected and does not throw when it is not; roving tabindex and arrow keys; Enter/Space select; each negative with a positive control.
2. Follow the S6/S7 evidence; if a native behaviour differs in the harness, record it rather than loosening the test.

**Files**: focus, keyboard test files
**Validation**: Revert checks named.

### Subtask T046: Stories PR-20..PR-23 and events EV-6..EV-9

**Purpose**: FR-030, FR-031.

**Steps**:
1. Dialog stories (about 8) beside the screen in `shellFrame`; dark theme 1280 px; top-layer capture per S2's recorded outcome. `events` test: EV-6 Open on a valid selection (`{ location }`), Open disabled otherwise, EV-7 close paths emit no confirm, EV-8 select emits `sk-browse-folder` `{ location }`, EV-9 retry `{ target: 'folders' }`; one event each, `bubbles`, `composed`, `toEqual`.

**Files**: stories and events test
**Validation**: Catalogue count by equality.

### Subtask T047: Hand-over: side-by-side screenshots

**Purpose**: Evidence for WP09.

**Steps**:
1. Uncommitted side-by-side per dialog story against the prototype dialog; describe each; list unregistered drift as items to fix. If the harness cannot capture the top layer, say so for WP09 (risk R-4). Commit hashes verified with `git cat-file -t`.

**Files**: none
**Validation**: Hand-off complete.

## Definition of Done

- All dialog parts written; signatures unchanged.
- PR-20..PR-23 stories exist; EV-6..EV-9 asserted with positive controls.
- Focus capture, trap and return proven; listbox keyboard model proven.
- No drift outside the CP-1 register.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- Native `dialog` in a shadow root is the riskiest behaviour (S6).
- Selection is controlled by `selected`; the host re-feeds the listing (D-17).
- Option paint relies on E-33 if ruled; without it the options use library elements only.

## Reviewer Guidance

Walk the keyboard model by hand; check Open is disabled with a text reason; check focus return; check negatives have positive controls; compare each story with the prototype dialog.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

Change requests only for the element class, `index.ts` and lint configs.

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


Implementation command: `spec-kitty agent action implement WP07 --agent claude`
