---
work_package_id: WP04
title: 'Foundation: skeleton, exceptions wiring and the surface freeze'
dependencies:
- WP03
requirement_refs:
- FR-001
- FR-014
- FR-028
- FR-032
- FR-033
- FR-034
- FR-040
- FR-042
- FR-043
- NFR-002
- C-001
- C-003
- C-005
- C-010
- C-013
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: 6ceb22834853018294053508845c9bd188cac6e5
created_at: '2026-10-11T08:57:19.832508+00:00'
subtasks:
- T019
- T020
- T021
- T022
- T023
- T024
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-ops-screen/
create_intent:
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.ts
- packages/mission-ui/test/sk-ops-screen.skeleton.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/index.ts
- packages/mission-ui/src/defaults/index.ts
- packages/mission-ui/custom-elements.json
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.ts
- packages/mission-ui/test/sk-ops-screen.skeleton.test.ts
- packages/mission-ui/test/surface-freeze.test.ts
- stylelint.config.mjs
- scripts/stylelint-exceptions.test.mjs
- gates/plants/stylelint/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP04 - Foundation: skeleton, exceptions wiring and the surface freeze (IC-03)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Create the `sk-ops-screen` element with the FULL public surface (eleven properties, two events with `@fires`), state resolution, the live region and the focus rule, stubs for every part and every dispatch, the exports and shell wiring, the exceptions approved at CP-1 as file-scoped Stylelint overrides with leak plants, the manifest regenerated ONCE, and `surface-freeze.test.ts` extended. After this the public surface is frozen.

## Context

Read `plan.md` (D-01, D-02, D-05 to D-11, D-14, IC-03b, Implementation Concern Map), `contracts/sk-ops-screen.md` (surface, look resolution, events, announcements, focus, structural rules), `data-model.md`, `contracts/gates.md` (E-40 to E-43), the CP-1 entry in `tracer-design-decisions.md`, the WP03 hand-off as transcribed there, and the precedents `elements/sk-missions-screen/` (Load more mechanics, live region keyed on a sequence number, `ShellTierController`) and `kitty-specs/work-package-screen-01M44DSJ` WP04. Requirements: FR-001, FR-014 (quiet-word wiring), FR-028, FR-032 (use of `resolveOpsLook`), FR-033, FR-034, FR-040, FR-042, FR-043, NFR-002, C-001, C-003, C-005, C-010, C-013.

You own the screen file alone. Every part file is created by you as a STUB with its final export signature and an empty or placeholder body (`ops-row-parts.ts` for WP05, `ops-page-parts.ts` for WP06, `ops-state-parts.ts` for WP07): the owning work package replaces the bodies and keeps every signature; you do not own those files after this work package (recorded out-of-map creation). Stub bodies must render without error.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP03. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## First step: CP-1 file precondition

Before any edit confirm that `tracer-design-decisions.md` contains a dated entry marked `CP-1 confirmed` (it names the confirmed or amended drift items DO-13, DO-22, DO-24, the exceptions E-40 to E-43 as approved, narrowed or dropped, the tier thresholds and the controller decision) and that `git merge-base --is-ancestor <CP-1 commit> HEAD` succeeds (the dispatch names the commit). If either fails: STOP and report; never write the entry yourself. The drift register DO-1 to DO-24 stands as that entry leaves it: the items the entry confirms are CONFIRMED; the rest are built exactly as the register states them and are confirmed by the operator at the Storybook review after the last work package. A difference from the prototype in neither the register nor the entry is a REJECT item for the work package that introduces it.

## Subtasks

### T019 CP-1 FILE PRECONDITION (first step, first exit check)

See "First step" above. Also confirm WP03 is approved and its evidence is transcribed in `tracer-design-decisions.md`. Absent: STOP and report.

### T020 The element and its surface

**Steps** (red-first with `sk-ops-screen.skeleton.test.ts`): `sk-ops-screen.ts` with the eleven properties of `data-model.md` and `contracts/sk-ops-screen.md` (`items`, `pageInfo`, `totalCount`, `skippedCount`, `profile`, `status`, `loadingMore`, `loadMoreError`, `refusalCode`, `labels`, `errorMessage`), their defaults, and the attributes: `status` (reflected), `loading-more`, `error-message`, `profile`, `total-count`, `skipped-count`, `refusal-code`; `items`, `pageInfo`, `loadMoreError` and `labels` have no attribute. Two events, `sk-load-more` (`SkLoadMoreDetail` IMPORTED from the Missions screen, not redeclared) and `sk-retry-load` (the extended shared union), each dispatched through a literal `dispatchEvent(new CustomEvent('sk-...', { bubbles: true, composed: true, detail }))` in this file, declared once with `@fires`; payload builders with the guards of the events table (`hasNextPage` true, cursor non-null, not `loadingMore`, cursor differs from `requestedCursor`; a retry with no cursor to send is inert and builds no event). `HTMLElementEventMap` is NOT redeclared for `sk-retry-load`; `sk-load-more` follows the Missions screen's declaration practice. Not self-registering; guarded registration is in `src/index.ts`.

**Files**: `sk-ops-screen.ts`, `sk-ops-screen.skeleton.test.ts`. **Edge cases**: unknown `status` collapses to `empty`; `exactOptionalPropertyTypes`; the screen sorts and counts nothing.

### T021 State resolution, live region and focus

**Steps** (red-first): render by `resolveOpsLook(props)` (WP02): `loading`, `error`, `empty`, `ready`; `loadMoreError` read only in `ready`, `refusalCode` only in `error`. The ONE polite live region (`role="status"`, `aria-live="polite"`, keyed on an announcement sequence number as the Missions screen) derives its text in `willUpdate` from the SHOWN look and shown row count, compared with the previous shown pair; it changes only when the shown pair changes; a `loading` look with reason `mismatch` announces nothing; the error look is `role="alert"` and is not duplicated; a load-more error is announced through the region (announcement table of `contracts/sk-ops-screen.md`). Focus (D-09): `willUpdate` records whether focus is inside the screen; after `updateComplete` plus one animation frame, if the focused control was removed and focus fell to the body, focus moves to the section heading (`tabindex="-1"`), or to the state's heading in loading, empty and error; rows are never focus targets. WP07 proves these with tests; the behaviour is yours.

**Files**: `sk-ops-screen.ts`. **Validation**: skeleton tests call each look once and assert the live-region text and the exactly-one-event rule for both events with positive controls.

### T022 Stubs, exports and shell wiring

**Steps**: create the three part stubs with final signatures (pure `html` functions of view-models; no registration, no dispatch). `src/index.ts`: the guarded registration of `sk-ops-screen` and the type exports. `defaults/index.ts`: the ONE export line for `ops-copy`. Shell wiring (FR-040): the project layout's `nav-ops` item already exists in the shell fixtures; the screen is shown as shell content with `flush` through `shellFrame` in this mission's stories. If a shell touch is nonetheless needed, it is the smallest possible, committed as a recorded out-of-map edit, and `git diff` of every existing shell story argument is empty: existing shell baselines stay untouched. These shared one-line touches serialise with the Projects and Drift missions (the second to land rebases); say in the hand-off which lines you touched.

**Files**: `src/index.ts`, `defaults/index.ts`, the three stubs (out-of-map creations), at most one shell file (out-of-map).

### T023 Exceptions as file-scoped overrides

**Steps**: in `stylelint.config.mjs` add, exactly as the CP-1 entry approved them: E-40 (row frame: `border`, `border-radius`, `padding` token values in `ops-row-parts.ts`, only if CP-1 kept it), E-41 (one `px` length in `grid-template-columns` in `ops-row-parts.ts`, only if kept), E-42 (extension of E-21 words-only wrapping to `ops-row-parts.ts` and `ops-page-parts.ts`), E-43 (`overflow-wrap: anywhere` on the id and evidence selectors only). Each override is scoped to its named file, allows only what the register row allows, and has a LEAK plant: the same declaration in any other file, or any other property in that file, is refused (`gates/plants/stylelint/`, `scripts/stylelint-exceptions.test.mjs` counts and asserts them). An exception CP-1 dropped is not added; an unused number stays unused. If CP-1 requires an ESLint `class=` override for a library styles-only family, make it a recorded out-of-map edit to `eslint.config.mjs` (WP02's file) with its own leak plant.

**Files**: `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs`, `gates/plants/stylelint/**`.

### T024 The freeze

**Steps**: extend `surface-freeze.test.ts` with `sk-ops-screen` (eleven properties with attributes and run-time defaults, two event names, tag name); run `pnpm manifest:generate` ONCE and commit `custom-elements.json` (it must declare every public property and both events); run every gate; `node scripts/gate-proof.mjs local --only stylelint`. From here no work package changes the public surface; an unavoidable change is a reported exception regenerated once in WP09.

## Test strategy

Skeleton tests: one per event (exactly one, exact payload, `bubbles`, `composed`, not cancelable), each no-event case with a positive control, every look rendered once, the live-region text per announcement row, `surface-freeze.test.ts` asserting equality on the surface. Revert check per file. `pnpm visual` does not run (no story yet). `gate-proof` runs for the stylelint leg.

## Definition of Done

- CP-1 precondition verified and quoted; the full surface exists with `@fires` and literal dispatches; both events guarded and tested.
- Look resolution, live region and focus rule implemented; three stubs with final signatures; exports in place.
- Exceptions added exactly as CP-1 approved, each with a leak plant that fails without it.
- `custom-elements.json` regenerated once; `surface-freeze.test.ts` extended; existing shell baselines untouched.

## Risks

- A surface change after the freeze costs a regeneration and a reported exception: read the surface list twice before T024.
- Redeclaring `HTMLElementEventMap['sk-retry-load']` is a compile error and a doctrine breach: extend only.
- Adding an exception CP-1 dropped, or widening one past its register row, is a REJECT.

## Reviewer guidance

Check the CP-1 ancestry evidence, the surface against `contracts/sk-ops-screen.md` line by line, literal dispatches only in the screen file, the guards (inert retry with no cursor), the announcement rules including the no-announcement cases, that stubs keep final signatures, that each exception matches its approved row and has a failing leak plant, and that existing shell story arguments are unchanged.

Implementation command: `spec-kitty agent action implement WP04 --agent claude` (orchestrator-run).

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
