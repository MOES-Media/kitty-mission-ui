---
work_package_id: WP09
title: Integration, baselines, timings and wrap-up inputs
dependencies:
- WP08
requirement_refs:
- FR-041
- FR-043
- FR-044
- NFR-001
- NFR-002
- NFR-008
- NFR-010
- C-011
- C-014
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: 3f4b0166f8c3d78f310f834935ba12f668ad7d0e
created_at: '2026-10-11T11:28:05.258961+00:00'
subtasks:
- T047
- T048
- T049
- T050
- T051
history: []
agent_profile: implementer-ivan
authoritative_surface: apps/storybook/tests/visual/__snapshots__/
create_intent:
- scripts/ops-story-catalogue.test.mjs
- apps/storybook/tests/visual/__snapshots__/screens-ops-*.png
execution_mode: code_change
model: ''
owned_files:
- apps/storybook/tests/visual/__snapshots__/screens-ops-*.png
- scripts/ops-story-catalogue.test.mjs
- .github/workflows/ci.yml
- package.json
- README.md
- CHANGELOG.md
- packages/mission-ui/CHANGELOG.md
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP09 - Integration, baselines, timings and wrap-up inputs (IC-08)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Integrate: commit the 36-story visual baselines (the only work package that commits PNGs), prove them stable over five consecutive container runs, re-derive CI timeouts, add the story-to-matrix parity test, finalise the exceptions table, and assemble the inputs for the PR description and the Storybook review. The aggregate review squad and compact history are NOT this work package: they are the operator's standing wrap-up rule, run before the PR.

## Context

Read `plan.md` (IC-08, Gates, PR shape and wrap-up), `contracts/gates.md` (exceptions, plants, timeouts), the CP-1 entry, the hand-offs of WP01 to WP08 (as transcribed by the orchestrator), `spec.md` (FR-041, FR-043, FR-044, NFR-001, NFR-002, NFR-008, NFR-010, C-011, C-014) and the precedent `kitty-specs/work-package-screen-01M44DSJ` WP10 (baselines, timeouts, catalogue test). All chains are merged into your lane by the orchestrator before dispatch (`tasks-notes.md`, "Lane mechanics"); if any story file is absent, STOP and report.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP08. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## First step: CP-1 file precondition

Before any edit confirm that `tracer-design-decisions.md` contains a dated entry marked `CP-1 confirmed` (it names the confirmed or amended drift items DO-13, DO-22, DO-24, the exceptions E-40 to E-43 as approved, narrowed or dropped, the tier thresholds and the controller decision) and that `git merge-base --is-ancestor <CP-1 commit> HEAD` succeeds (the dispatch names the commit). If either fails: STOP and report; never write the entry yourself. The drift register DO-1 to DO-24 stands as that entry leaves it: the items the entry confirms are CONFIRMED; the rest are built exactly as the register states them and are confirmed by the operator at the Storybook review after the last work package. A difference from the prototype in neither the register nor the entry is a REJECT item for the work package that introduces it.

## Subtasks

### T047 CP-1 FILE PRECONDITION, merged-tree gate run

See "First step". Then, on the merged tree, run every gate of the full list plus `node scripts/gate-proof.mjs local` and `pnpm contract:check --require-main`, and compare with WP01's recorded baseline: a difference is explained or escalated. First step of the work, before any baseline.

### T048 Baselines

**Steps**: generate the baselines inside the pinned container only (`pnpm visual:update` through `scripts/visual.sh`; never by hand), for exactly the stories of the four Ops story files at the tiers each matrix row names (36 stories: 16 + 9 + 7 + 4, one per built matrix row, as the parity test asserts). Commit only `apps/storybook/tests/visual/__snapshots__/screens-ops-*.png` and nothing else under that directory; existing baselines (shells, other screens) stay byte-identical (`git diff --stat` shows no other snapshot touched). Read every new image (each one) and describe it; any visible defect or any difference from the prototype outside the register is a REJECT item to send back to the owning work package, not to patch here.

### T049 Five consecutive runs, timeouts and the parity test

**Steps**: run `pnpm visual` five times consecutively on the unchanged commit in the container: 0 visual failures each run (NFR-002); record the five wall-clocks. Re-derive the CI timeouts by the earlier missions' rule (`ci.yml`, timeouts only) and record them. Add `scripts/ops-story-catalogue.test.mjs` (modelled on `scripts/wp-story-catalogue.test.mjs`): parse the state-matrix rows of `spec.md`, the story export names and row tags of the four story files, and assert with equality that every built matrix row (OP-34 is not built) has exactly its story or letter-suffixed stories, no story lacks a row, and the totals match; a negative case against a temporary copy with one row deleted; an empty parse fails. Wire it into `package.json` (`test:terminology` or `test:scripts`, whichever the earlier test uses).

**Files**: `scripts/ops-story-catalogue.test.mjs`, `package.json`, `.github/workflows/ci.yml` (timeouts only).

### T050 Exceptions table, timing record, documents

**Steps**: finalise the exceptions table (E-40 to E-43 as approved at CP-1, scope, rationale, proof case, sunset tied to a spec-kitty-design issue) and add the "Timing record" (baseline from WP01, the five runs, the timeouts) to the mission's `contracts/gates.md` as a recorded out-of-map edit (a `kitty-specs` file; the guard prints a warning on an implementation branch and the commit succeeds). `README.md`, `CHANGELOG.md` and `packages/mission-ui/CHANGELOG.md`: the Ops screen, its two events and its exceptions, no absolute path or username.

### T051 PR inputs and wrap-up hand-over

**Steps**: write into the hand-off, ready for the orchestrator: the exceptions list, the contract pin (sha, `infoVersion`) and the `contract:verify-remote` output, the gaps CG-1 to CG-17 status, the drift register DO-1 to DO-24 as confirmed at CP-1 and what remains for the Storybook review, the local baseline timings and CI runs, the slice list for compact history, the story-to-row mapping, and the contract-text notes for spec-kitty#5528. Do not open a PR, do not run the squad, do not compact history.

## Test strategy

The gates are the strategy: full list green on the merged tree, five consecutive clean visual runs, the parity test with its negative case, `gate-proof` all legs, `contract:check --require-main`. Revert check for the parity test (delete a story). Baselines exist only for the stories; no other snapshot changes.

## Definition of Done

- Merged-tree gate run recorded and compared with the baseline; baselines committed only here, only for Ops stories, generated in the container, each image read.
- Five consecutive clean visual runs recorded; timeouts re-derived; parity test passes with its negative case.
- Exceptions table final; documents updated; PR inputs listed; nothing pushed; nothing running.

## Risks

- Baselines generated outside the container make every later CI run red: container only.
- A defect found in a baseline is sent back, not fixed here: this work package owns no part file.
- Timeouts guessed instead of derived.

## Reviewer guidance

Check baselines exist for exactly the Ops stories and no other snapshot changed, five run results are real, the parity test fails when a row or story is removed, exceptions match the CP-1 entry, every image was described, and the hand-off contains every PR input listed. Re-run the visual suite once.

Implementation command: `spec-kitty agent action implement WP09 --agent claude` (orchestrator-run).

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
