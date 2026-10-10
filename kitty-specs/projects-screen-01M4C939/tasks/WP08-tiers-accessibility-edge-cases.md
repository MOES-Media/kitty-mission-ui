---
work_package_id: WP08
title: Tiers, accessibility and edge cases
dependencies:
- WP06
- WP07
requirement_refs:
- FR-020
- FR-021
- FR-022
- FR-023
- NFR-003
- NFR-004
- NFR-006
- NFR-010
- NFR-012
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T11:28:22.380678+00:00'
subtasks:
- T048
- T049
- T050
- T051
- T052
- T053
- T054
- T055
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/test/
create_intent:
- packages/mission-ui/src/elements/sk-projects-screen/sk-projects-screen.tiers.stories.ts
- packages/mission-ui/test/sk-projects-screen.tier.test.ts
- packages/mission-ui/test/sk-projects-screen.a11y.test.ts
- packages/mission-ui/test/sk-projects-screen.perf.test.ts
- packages/mission-ui/test/sk-projects-screen.edge.test.ts
- packages/mission-ui/test/sk-projects-screen.liveregion.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-projects-screen/sk-projects-screen.tiers.stories.ts
- packages/mission-ui/test/sk-projects-screen.tier.test.ts
- packages/mission-ui/test/sk-projects-screen.a11y.test.ts
- packages/mission-ui/test/sk-projects-screen.perf.test.ts
- packages/mission-ui/test/sk-projects-screen.edge.test.ts
- packages/mission-ui/test/sk-projects-screen.liveregion.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP08 - Tiers, accessibility and edge cases (IC-07)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Prove the cross-cutting behaviour of the merged chains: keyboard order and focus ring (PR-26), the tier and container-query cases (PR-27..PR-29), forced colours (PR-31), 200 percent text, focus order tags, live-region accuracy, the 50-entry performance budget, the spec's edge-case list, accessibility tree assertions, and a merged-lane regression.

## Context

Plan IC-07; spec PR-26..PR-29, PR-31, NFR-003, NFR-004, NFR-006, NFR-010, NFR-012, the Edge Cases list; spike S3 thresholds and S8 findings. This WP needs BOTH chains; the tool records both parents (`lanes.json`: lane-h depends on lane-f and lane-g) and the lane allocator merges both dependency lanes. If that merge is refused or conflicts, the orchestrator performs it (`git merge --no-ff`, `custom-elements.json` resolved by regeneration only, the `status.json` rule applied) before dispatch. A defect found in a part is a change request to the orchestrator (fix routed to the owning WP), unless trivial and recorded as an out-of-map edit.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP06, WP07. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

PRECONDITION: confirm BOTH the WP06 and WP07 tips are ancestors of HEAD (`git merge-base --is-ancestor`), and that both elements' stories exist. If WP07 is absent, STOP and report; do not proceed on one chain. Also confirm the CP-1 entry is an ancestor (file precondition of the chain WPs carries over).

## Subtasks

### Subtask T048: Preconditions and merged-lane regression

**Purpose**: Verify what the orchestrator merged.

**Steps**:
1. Ancestry checks above; `pnpm test`, `pnpm manifest:check`, `pnpm build-storybook` on the merged tip before adding anything; record any red as pre-existing or merge-caused.
2. Check the merged `custom-elements.json` equals a fresh `pnpm manifest:generate` output.

**Files**: none
**Validation**: Recorded in the hand-off.

### Subtask T049: PR-26: keyboard order, focus ring, focus order tags

**Purpose**: FR-021, NFR-003.

**Steps**:
1. Test the documented tab order tagged like `tab-12` (header button, rows, retry controls) with no more tab stops than controls shown; Enter and Space activate; visible focus ring; focus capture on updates (loading to ready, ready to error, entries replaced, a focused retry whose entry becomes ready). The dialog's own focus cases are WP07's. FR-023: the skip link is the first tab stop, reads "Skip to Projects" (from `defaults/`, through the shell's `skip-link` slot) and moves focus to the screen content; the screen is the shell's main landmark content.

**Files**: sk-projects-screen.a11y.test.ts
**Validation**: Positive controls; counts by equality.

### Subtask T050: PR-27..PR-29: tier and container-query stories and tests

**Purpose**: FR-020, DP-22, DP-25.

**Steps**:
1. Stories at the tiers PR-27 (about 1100: rows keep two columns), PR-28 (about 800: header stacks), PR-29 (about 620: single-column row, side block aligned to start; no full-width button, DP-27) with `vw-<n>` tags; tests measure the effect at each width using the CP-1 thresholds.

**Files**: sk-projects-screen.tiers.stories.ts, sk-projects-screen.tier.test.ts
**Validation**: Measured, not asserted by class name.

### Subtask T051: PR-31, 200 percent text, accessibility tree

**Purpose**: NFR-004, NFR-010, FR-022.

**Steps**:
1. Forced-colours: badges keep their words, focus rings visible. At a 200 percent root font size there is no horizontal overflow at 1100 and 720 px. Accessibility tree assertions: real list, buttons named by name, health and count, no status colour-only (a text form for 100 percent of health, entry-state and valid-project statuses).

**Files**: tiers stories, a11y test
**Validation**: Tree text saved in the hand-off.

### Subtask T052: Live-region accuracy

**Purpose**: NFR-012, D-14.

**Steps**:
1. After every update the region text equals what is on screen: loading, ready ("N projects"), empty, error, and per-entry transitions only for entries whose kind changed. A late or mismatched project counts as not loaded and never announces ready.

**Files**: sk-projects-screen.liveregion.test.ts
**Validation**: Revert check named.

### Subtask T053: NFR-006: 50-entry performance

**Purpose**: Render and re-render within 200 ms.

**Steps**:
1. Interaction-environment test: 50 entries render and a property change re-renders in 200 ms or less; avoid `Date`/timers in the shipped source (the test may use `performance.now`). Plain DOM, no virtualization; tab order intact.

**Files**: sk-projects-screen.perf.test.ts
**Validation**: Budget asserted; story PR-25 untouched.

### Subtask T054: Edge cases of the spec

**Purpose**: Every listed edge case has a test.

**Steps**:
1. 0, 1 and very large `missionCount`; `lastActivityAt` with an offset, in the future, unparseable; `now` omitted (ISO string as given); 64-character version, 255-character branch, very long name and location with no overflow; a handle-like branch shown as served; a repeated key; an entry with both `project` and `state`; whole-list loading with entry states; a `Project.name` equal to a vocabulary word. Each with a paired control.

**Files**: sk-projects-screen.edge.test.ts
**Validation**: Edge case count by equality against the spec list.

### Subtask T055: Hand-off

**Purpose**: Close the WP.

**Steps**:
1. Gates (below), screenshots of the tier stories described, defects routed as change requests, commit hashes verified with `git cat-file -t`.

**Files**: none
**Validation**: Hand-off complete.

## Definition of Done

- Both chains verified present and merged cleanly.
- PR-26..PR-29 and PR-31 covered; NFR-003, NFR-004, NFR-006, NFR-010, NFR-012 each proven by a test that fails when reverted.
- Every spec edge case has a test.
- No baseline PNG committed.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- Merge of the second chain may conflict in `custom-elements.json` or status files: regeneration only; never hand-merge.
- Timing tests are flaky if they use wall-clock timers: budgets measured with `performance.now` in the interaction environment only.
- Defects in a part owned by WP06/WP07 must be routed, not silently patched.

## Reviewer Guidance

Check both parents are present; run the tests with each behaviour reverted; verify measured thresholds equal the CP-1 values; verify each edge case has a paired control.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

A trivial fix in a part file owned by WP06 or WP07 is allowed only as a recorded out-of-map edit with a one-line rationale.

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


Implementation command: `spec-kitty agent action implement WP08 --agent claude`
