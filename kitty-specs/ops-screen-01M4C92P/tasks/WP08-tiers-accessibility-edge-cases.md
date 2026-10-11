---
work_package_id: WP08
title: Tiers, accessibility and edge cases
dependencies:
- WP05
- WP07
requirement_refs:
- FR-020
- FR-035
- FR-036
- FR-037
- FR-044
- NFR-003
- NFR-004
- NFR-005
- NFR-006
- NFR-007
- NFR-011
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
subtasks:
- T041
- T042
- T043
- T044
- T045
- T046
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-ops-screen/
create_intent:
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.tiers.stories.ts
- packages/mission-ui/test/sk-ops-screen.tiers.test.ts
- packages/mission-ui/test/sk-ops-screen.a11y.test.ts
- packages/mission-ui/test/sk-ops-screen.perf.test.ts
- packages/mission-ui/test/sk-ops-screen.hostile.test.ts
- packages/mission-ui/test/sk-ops-screen.edge.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.tiers.stories.ts
- packages/mission-ui/test/sk-ops-screen.tiers.test.ts
- packages/mission-ui/test/sk-ops-screen.a11y.test.ts
- packages/mission-ui/test/sk-ops-screen.perf.test.ts
- packages/mission-ui/test/sk-ops-screen.hostile.test.ts
- packages/mission-ui/test/sk-ops-screen.edge.test.ts
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

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Make the screen correct at every tier and under stress: container-query collapses per the spike, the tier stories OP-29 to OP-32, the keyboard, focus-order and 200% text tests, the 200 and 1,000-row timing tests, the hostile-corpus test with CSP observation and a positive control, edge-case tests, and the self-check list run over every file of the mission.

## Context

Read `plan.md` (D-10, D-11, IC-07), the CP-1 entry (thresholds and the controller decision), `contracts/gates.md` (self-check list), `spec.md` (FR-020, FR-035 to FR-037, NFR-003 to NFR-007, NFR-011, OP-27 to OP-32, EV-6, EV-8) and the precedent `kitty-specs/work-package-screen-01M44DSJ` WP09 (tier, a11y, perf and CSP tests).

You own the tier stories and the six test files. The tier CSS lives in the part files other work packages own: you edit ONLY their container-query blocks, as recorded out-of-map edits to `ops-row-parts.ts` (WP05), `ops-page-parts.ts` (WP06) and `ops-state-parts.ts` (WP07), each listed with a one-line rationale; you change nothing else in them. Both chains are in your lane (WP08 depends on WP05 and WP07); if either is absent, STOP and report.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP05, WP07. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## First step: CP-1 file precondition

Before any edit confirm that `tracer-design-decisions.md` contains a dated entry marked `CP-1 confirmed` (it names the confirmed or amended drift items DO-13, DO-22, DO-24, the exceptions E-40 to E-43 as approved, narrowed or dropped, the tier thresholds and the controller decision) and that `git merge-base --is-ancestor <CP-1 commit> HEAD` succeeds (the dispatch names the commit). If either fails: STOP and report; never write the entry yourself. The drift register DO-1 to DO-24 stands as that entry leaves it: the items the entry confirms are CONFIRMED; the rest are built exactly as the register states them and are confirmed by the operator at the Storybook review after the last work package. A difference from the prototype in neither the register nor the entry is a REJECT item for the work package that introduces it.

## Subtasks

### T041 CP-1 FILE PRECONDITION and chain check

See "First step". Confirm both chains are present: the stories of `Screens/Ops/Rows`, `Paging and notices` and `States` all list in Storybook (equality count: 16, 9 and 7). Absent: STOP and report.

### T042 Container-query tiers

**Steps** (red-first with `sk-ops-screen.tiers.test.ts`): implement the collapses as container queries on the screen host with the thresholds the CP-1 entry fixed (derived from the shell's real content-cell widths at 1100, 800 and 620): facts in one column at the 800 px breakpoint, the row head and the section heading stacked at 620 px. `ShellTierController` with `:state(shell-mobile)` is used ONLY if CP-1 ruled that a container threshold cannot reproduce the prototype's 620 px head stack at zero drift; the screen calls `attachInternals` nowhere else. Tests: computed grid track counts and the head's flex direction at 1280, 1100, 800 and 620 px inside `shellFrame`, with `page.viewport` first; no horizontal overflow at any tier. Viewport media queries are not used (the shell's sidebar changes the content width per tier).

**Files**: `sk-ops-screen.tiers.test.ts`; out-of-map: the container-query blocks of the three part files.

### T043 Tier stories (OP-29 to OP-32)

**Steps**: `sk-ops-screen.tiers.stories.ts`, title `Screens/Ops/Tiers and edge cases`, dark: OP-29 (focus order and focus ring, captured with the ring visible), OP-30 (collapsed tier, 1100 px), OP-31 (narrow tier, 800 px, facts in one column), OP-32 (mobile tier, 620 px and below, head and page header stacked). Exactly 4 stories, ids as before, arguments from `fixtures.ts` only. One uncommitted side-by-side screenshot per story against `<prototype>/07-ops.html` at the matching width, read, described, mapped to DO items.

**Files**: `sk-ops-screen.tiers.stories.ts`.

### T044 Accessibility and keyboard tests

**Steps** (red-first, `sk-ops-screen.a11y.test.ts`): every control (Load more, retry, Refresh) reachable by Tab, activates with Enter and Space, visible focus ring, no trap, and the number of tab stops equals the number of controls shown (rows contribute none; EV-6 and EV-8: focus, hover and scroll emit nothing, with a positive control); focus order matches OP-29; at a root font size of 200% there is no horizontal overflow of the content area at 1100 px and 720 px (NFR-004); text is never colour-only: every state word (outcome, status, closer, mode, evidence class, redaction, skipped, error) is in the DOM with colour removed (NFR-011, SC-006).

**Files**: `sk-ops-screen.a11y.test.ts`.

### T045 Performance, hostile corpus and edge cases

**Steps** (red-first): `sk-ops-screen.perf.test.ts` (NFR-006, SC-007): 200 rows render and re-render on a property change in 200 ms or less; 1,000 loaded rows across pages in 500 ms or less, measured in the interaction test envelope with the clock read by the TEST (the screen reads none), the ceilings asserted and the measured value recorded. `sk-ops-screen.hostile.test.ts` (NFR-005): render the hostile corpus (markup, `javascript:` and `data:` addresses, protocol-relative addresses, an unbroken 512-character token, bidirectional overrides, a value that looks like a path) inside a page with a CSP meta and a `securitypolicyviolation` observer; assert 0 violations and 0 network requests AND a positive control (a deliberately loaded image in a scratch element is observed by the same harness). `sk-ops-screen.edge.test.ts`: `exactOptionalPropertyTypes` shapes, a foreign `profile` with 128 characters, `pageInfo` null with `ready`, `totalCount` smaller than loaded, 0 items with `skippedCount` above 0, duplicate ids (rendered as given, no dedupe), the screen never re-sorting.

**Files**: the three test files.

### T046 Self-check list over every file

**Steps**: run the self-check list of `contracts/gates.md` and the rules copied below over EVERY file of the mission (grep, not memory): no vocabulary literal or `=== '<word>'` outside the allowed places, no profile or action literal outside fixtures and stories, no clock, no arithmetic on contract values, every `dispatchEvent` literal in the screen file with `@fires`, no `href`/`src`/`unsafeHTML`/`innerHTML` in a parts file, rows without listener, role or tabindex, no absolute path or username. Report the command and the zero-match output for each check. A hit is fixed (in your files) or reported (in others').

**Files**: none (report).

## Test strategy

Tier tests measure computed layout in the real shell frame; the hostile test has a positive control; timing ceilings are asserted; the a11y test counts tab stops with equality; revert check per file (for example: replace a container query by a viewport query, load an image from evidence). `pnpm visual` is NOT an exit check; side-by-side screenshots for the four tier stories are. All other gates green.

## Definition of Done

- Container queries per CP-1; tier, a11y, perf, hostile and edge tests pass with listed revert checks; four tier stories.
- Self-check list output attached; every out-of-map edit confined to container-query blocks and listed.
- Hand-off lists commits verified, images described, DO mapping, change requests and out-of-map edits.

## Risks

- A tier threshold copied from a prompt instead of the CP-1 entry.
- The perf test asserting a ceiling it never measured: record the measured value.
- Editing a part file beyond its container-query blocks silently changes another work package's behaviour.

## Reviewer guidance

Check the thresholds equal the CP-1 values, that out-of-map diffs of the three part files touch only container-query blocks (read the diffs), the hostile test's positive control, tab-stop equality, the 200% text result, ceilings measured, and the self-check output is real. Re-run two revert checks.

Implementation command: `spec-kitty agent action implement WP08 --agent claude` (orchestrator-run).

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these): `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file outside that list is changed ONLY where this prompt says so, as a recorded out-of-map edit: committed by you with plain `git add <path>` and `git commit`, listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file, change, reason), not an edit. A generated file (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) is never edited by hand: a conflict in one is resolved by regeneration only. The plan's shared-file owners (`tasks-notes.md`, "Shared files") are: `fixtures.generated.ts`, `types.generated.ts` and contract tooling WP01; `defaults/ops-copy.ts`, `logic/ops-*.ts`, the data-driven gate and `eslint.config.mjs` WP02; `sk-ops-screen.ts`, `src/index.ts`, `defaults/index.ts`, `custom-elements.json`, `stylelint.config.mjs` WP04; each part file and its stories and tests its named WP; baselines and the timing record WP09 only.

**Gates this work package must pass before hand-off** (each exits 0, with the reporter's pass count above 0 and fail 0 where a reporter exists; run from the lane worktree root, after confirming `git rev-parse --show-toplevel` is that worktree): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate: its output must list your test files), `pnpm build-storybook`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm contract:check && pnpm test:contract`. `pnpm visual` and `pnpm gate-proof` are NOT exit checks of every work package: this prompt's "Test strategy" says whether they run. If a script name differs on the build base, use the name the base provides and say so.

**Red-first rule.** For every behaviour, plant and gate case write the failing test (or the plant, or the negative case) FIRST, run it, see it fail for the right reason, record the failing line in the hand-off, and only then implement. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) that produces a named failing test, then the restore, is listed in the hand-off (revert check); the reviewer re-runs two of them.

**Test-quality rules (binding).**
1. Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed.
2. Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` true, `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`).
3. Counts are asserted with equality, never "at least"; every loop over fixtures, stories, rows or items asserts it ran the expected N times (an empty loop must fail).
4. A not-drawn element has a DOM-absence assertion PAIRED with a sibling fixture where it is present (positive control). Omitted, empty and null are separate paired tests.
5. Order tests use test-only inputs built by cast so that a later sort or filter fails them; the screen never re-sorts `items`.
6. Foreign values (an outcome, closer, mode, evidence kind, status or refusal code outside the tables) render their raw text in the DOM and never `undefined`.
7. Vitest browser-mode tests call `page.viewport` first.
8. Terminology (C-009): the word "feature" never appears in source, stories, fixtures or docs; "Mission" is the term, "Op" is the invocation record, "sweep" is `doctor_sweep` in copy.

**Data-driven and self-check rules (C-007, FR-038, NFR-009; `contracts/gates.md`, copied here).** No `open`, `closed`, `agent`, `query`, `text`, `url`, `failed`, `abandoned`, `advisory`, `task_execution`, `mission_step`, `doctor_sweep`, `repo_path`, `ops_unreadable` or `invalid_page_cursor` literal outside `defaults/`, `contract/` and stories, and no `=== '<word>'` comparison: read tables through `lookup` with the raw value as fallback. No profile or action literal in any non-fixture file. No `Date`, `new Date`, `setTimeout`, `fetch`, storage, `location` or `history` use; no `Math.` on contract values; no arithmetic beyond `items.length`. Every `dispatchEvent` has a literal `sk-*` name, sits in `sk-ops-screen.ts` and is declared by `@fires` (part files receive handlers as arguments and never dispatch). No `href`, `src`, `srcset`, `unsafeHTML`, `unsafeSVG` or `innerHTML` in a parts file. Rows carry no listener, role or tabindex. Absolute-path and username check on every new file.

**Drift register status and visual authority (C-006, NFR-008).** The prototype `<prototype>/07-ops.html` and its `?state=` variants are the visual source of truth. The register DO-1 to DO-24 (`spec.md`) stands as the CP-1 entry leaves it (see "First step"; before CP-1 exists, no DO item is confirmed). Not applicable to WP01 to WP03.

**Baselines (operator standing rule).** Baseline PNGs are generated only inside the pinned container (`scripts/visual.sh`) and are committed ONLY in WP09. Work packages WP01 to WP08 commit no PNG and never run `pnpm visual:update`; `pnpm visual` is NOT an exit check of WP05 to WP08 (their stories have no committed baseline, so missing snapshots are the known red). Their exit evidence is one uncommitted side-by-side screenshot per story against the prototype, handed over in the report. Nothing is ever hand-edited or copied as a PNG.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, the aggregate review squad, compact history and a rebase (orchestrator-owned). Commit on your lane branch with a conventional message (`feat(ops-screen): ... (#11)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- No push, no pull request, no issue comment. Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics. Never `git rebase`, never `git stash`; `core.bare` must stay false.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `rm` with variable globs. Nothing is left running when you finish. Any repo-wide command (`ruff`, `prettier`, `eslint .`) first confirms `git rev-parse --show-toplevel` is your worktree.
- No absolute paths and no usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`, `<lane>`); run `pnpm hygiene` before committing. This holds for fixtures, stories, tests, comments and the hand-off text.
- Visual baselines only inside the pinned container; committed only in WP09. Read every screenshot you produce and describe it in the hand-off (what is drawn, at which width, anything wrong).
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens (Stylelint rejects raw colour, font and size literals); every UI primitive the design library provides is rendered with its `sk-*` element (elements over CSS); a missing primitive is a recorded component gap, never hand-rolled outside the numbered exceptions E-40 to E-43 (as approved at CP-1) and the earlier missions' E-04 to E-39.
- `tracer-*.md`, `spec.md`, `plan.md` and every other file under `kitty-specs/` are orchestrator-owned except where this prompt names an out-of-map edit: report spike outcomes, decisions and friction in the hand-off; write nothing there otherwise.
- Do not run `spec-kitty` commands that mutate mission state; the orchestrator moves tasks.

## Hand-off checklist (the report you write when you move to review)

1. Commit hashes of your work, each verified with `git cat-file -t <hash>` (report the output), in the order made, with the one-line subject of each.
2. For every gate of "Gates this work package must pass": command, exit code, reporter pass count. A gate you did not run, and why, is stated.
3. The failing line recorded for every red-first test or plant, and the revert check per test file (what you reverted, which named test failed, that you restored it).
4. Out-of-map edits, each with a one-line rationale; change requests (file, change, reason) for anything you needed but do not own.
5. The drift items relied on, named by DO id as the CP-1 entry and the register state them, and every difference from the prototype you saw that is NOT in that list (a REJECT item you must fix before handing over).
6. Every screenshot or image you produced, read and described; uncommitted; where the orchestrator can find it.
7. Exceptions touched (E-40 to E-43), gaps met, and any decision you took that the plan did not fix.
8. `git status --short` empty after the last commit, and the statement that nothing is running.
9. No absolute path or username appears in the hand-off text itself (use the placeholders).

The reviewer is a separate agent: it reads your hand-off first, re-runs two revert checks, and rejects on any item above that is missing or false.
