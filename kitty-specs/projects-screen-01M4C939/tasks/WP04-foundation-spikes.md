---
work_package_id: WP04
title: Foundation spikes S1 to S8 and CP-1 evidence
dependencies:
- WP02
- WP03
requirement_refs:
- FR-032
- FR-015
- FR-020
- NFR-008
- C-002
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T08:42:07.993606+00:00'
subtasks:
- T020
- T021
- T022
- T023
- T024
- T025
- T026
history: []
agent_profile: frontend-freddy
authoritative_surface: spikes/ic-04a/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- spikes/ic-04a/**
- apps/storybook/.storybook/main.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP04 - Foundation spikes S1 to S8 and CP-1 evidence (IC-04)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Answer eight questions with evidence BEFORE the surface freeze (spikes S1 to S8 of `research.md`) as throwaway stories under `spikes/ic-04a/`, produce the evidence packet the orchestrator puts in front of the operator at checkpoint CP-1, and delete all spike code with a named final commit so the approved tip tree equals the base tree. This WP ships no product code.

## Context

Plan IC-04a and CP-1; `research.md` Spikes S1 to S8 with their decision rules; `contracts/gates.md` (E-31..E-34 and what decides each); `spec.md` (drift register DP-1..DP-27, rows PR-01, PR-11, PR-20, PR-21, PR-27..PR-31). Needs WP02 (defaults, fixtures) and WP03 (the `picker` layout for S3); the tool records both parents. The prototype is `<prototype>/01-projects.html`, outside the repository. CP-1 is orchestrator-owned and not part of this WP: you deliver evidence and a recommendation per spike, you decide no exception and ask the operator nothing.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP02, WP03. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

Both parents must be present: confirm `git merge-base --is-ancestor` of the WP02 and WP03 tips against HEAD (`lanes.json`: lane-d depends on lane-b and lane-c, so the allocator merges both; if it is refused the orchestrator merges the second parent, plan Lane mechanics). If either is absent, STOP and report.

## Subtasks

### Subtask T020: Scaffolding: the two permitted additions

**Purpose**: Make throwaway stories renderable with a footprint removable in one commit.

**Steps**:
1. Create `spikes/ic-04a/`. Add exactly TWO config additions: one `stories` entry for `spikes/ic-04a/**/*.stories.ts` in `apps/storybook/.storybook/main.ts`, and one ESLint `ignores` entry for `spikes/ic-04a/**` in `eslint.config.mjs` (out-of-map: the plan names this one entry as IC-04a's, the file as WP05's).
2. Keep the path outside the Stylelint, manifest and unit-test globs (read them; do not widen any). Every spike file starts with `// Throwaway spike for CP-1 evidence; deleted by the final commit of WP04.`
3. Evidence is captured with the pinned-container screenshot run only; never `pnpm visual:update`; no PNG is committed.

**Files**: spikes/ic-04a/**, .storybook/main.ts; eslint.config.mjs (one entry, out-of-map)
**Validation**: `pnpm build-storybook`, `pnpm lint`, `pnpm lint:styles`, `pnpm manifest:check`, `pnpm test` green with the spike present.

### Subtask T021: Spikes S1 and S4: row chrome, header action slot, pill tones

**Purpose**: Decide E-31 and DP-8/DP-26; S4 decides whether a tone is missing.

**Steps**:
1. S1: can `sk-card` (or another library element) plus `sk-button` carry the row chrome and the whole-row control; does `sk-page-header` have an action slot for "Open project" (no existing screen puts an action there)? State the pass rule first. Side-by-side with the prototype row and header at 1280 px dark.
2. S4: do `sk-pill-tag status=` tones `success`, `attention`, `neutral` exist and render words; does the shared ellipsis rule hold on a 64-character version? If `attention` is absent, report it as a FORK for the operator; do not invent a tone.

**Files**: spikes/ic-04a/s1-row-chrome.stories.ts, s4-pill-tones.stories.ts
**Validation**: Per spike: question, pass rule, result, evidence, recommendation.

### Subtask T022: Spikes S2 and S6: dialog, field, top layer, focus

**Purpose**: Decide E-32, DP-11, DP-12, and the dialog focus model D-16.

**Steps**:
1. S2: does the library ship a modal dialog or listbox option element; does `sk-form-input` support `readonly`; does a native `dialog` with `showModal()` and its `::backdrop` screenshot reproducibly in Storybook and the visual harness? If the top layer does not screenshot, record the harness change WP09 needs (risk R-4).
2. S6: native `dialog` in a shadow root: capture of the deep active element, Escape, backdrop click, Tab wrap, focus return. Record a measured Tab sequence.

**Files**: spikes/ic-04a/s2-dialog.stories.ts, s6-focus.stories.ts
**Validation**: Evidence includes a Tab walk and a result for each of the four behaviours.

### Subtask T023: Spike S3: picker content cell and container thresholds

**Purpose**: FR-020, DP-22, DP-25: thresholds derived, not copied.

**Steps**:
1. Render the `picker` shell (WP03) and measure the content cell with `getBoundingClientRect` at 1280, 1100, 800, 620 and around the tier boundary (719/720). Do not copy arithmetic from this prompt.
2. State the container thresholds for the row single-column switch and the header stack; they must equal the prototype's visual breakpoints at viewport widths 800 and 620 within the padding. One side-by-side per viewport.

**Files**: spikes/ic-04a/s3-picker-cell.stories.ts
**Validation**: Report: measured width, effect, prototype effect, recommended threshold, per viewport.

### Subtask T024: Spike S5: Stylelint probe

**Purpose**: Decide which properties E-31/E-32 must name.

**Steps**:
1. Probe `min(680px, calc(100vw - 32px))`, `min-height: 82px` and `width: min(900px, 100%)` against the token-only Stylelint rules by running Stylelint on a temporary probe copy (deleted before every commit; a leftover probe breaks `lint:styles` and the manifest).
2. Record the verbatim result per probe: raised errors become exception properties; passes need none.

**Files**: spikes/ic-04a/s5-stylelint-probe.ts
**Validation**: Verbatim Stylelint output in the report.

### Subtask T025: Spikes S7 and S8: listbox keyboard model, forced colours, 200 percent text

**Purpose**: Confirm D-17; feed PR-31 and NFR-004.

**Steps**:
1. S7: listbox with raw `role="option"` buttons in a shadow root: roving tabindex, ArrowUp/ArrowDown/Home/End, screen reader tree saved as text.
2. S8: render the row and a badge under forced-colours emulation and at a 200 percent root font size at 1100 and 720 px; record overflow and badge words.

**Files**: spikes/ic-04a/s7-listbox.stories.ts, s8-forced-colours.stories.ts
**Validation**: Accessibility tree text and measurements in the report.

### Subtask T026: CP-1 packet, the named final commit and the tip-tree check

**Purpose**: Deliver evidence and leave nothing behind.

**Steps**:
1. Write the spike report in the hand-off (nothing under `kitty-specs/`): per spike the question, pass rule, result, evidence (image names, trees, measurements) and a RECOMMENDATION for the dependent decision: which of E-31..E-34 are needed and for exactly which properties, the two thresholds, whether S2 needs a harness change, whether the folder field is a `readonly` `sk-form-input`. Add the CP-1 packet the plan lists: prototype beside spike renders (row chrome, header action slot, dialog chrome and top layer, listbox option paint, the `picker` shell at 1280, 1100, 800, 620). Screenshots go in the report, never in the tree.
2. Final commit named exactly `chore(ic-04a): remove spike code`: delete `spikes/ic-04a/**`, the `stories` entry and the `ignores` entry.
3. Tip-tree check in the hand-off: `git ls-tree -r HEAD -- spikes/` is empty; `git rev-parse HEAD^{tree}` equals the tree of the lane base the orchestrator names.

**Files**: none
**Validation**: `git status --short` empty; the reviewer repeats the tree comparison.

## Definition of Done

- Spikes S1 to S8 each have a pass rule, result, evidence and recommendation.
- S3 thresholds are measured widths.
- Final commit exactly named; no spike file, config entry or PNG remains; tip tree equals base tree.
- No exception decided here; any fork (for example a missing `attention` tone) reported, not resolved.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- A spike can change a part's shape or add an exception: that is why spikes precede the surface freeze.
- Prototype captures need `<prototype>` outside the repo: use the path the orchestrator gives; never write it into a file.
- A leftover probe file breaks lint:styles and the manifest.

## Reviewer Guidance

Check the tip tree equals the base tree, the final commit name, that every spike has the four parts, that numbers are measured, that no recommendation reopens a ruled item (Q1 to Q10), and that the probe output is verbatim. Spike code is throwaway and not reviewed for style.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

`eslint.config.mjs` (one `ignores` entry, removed by the final commit; single owner is WP05).

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


Implementation command: `spec-kitty agent action implement WP04 --agent claude`
