---
work_package_id: WP02
title: Defaults, logic and data-driven gate extension
dependencies:
- WP01
requirement_refs:
- FR-004
- FR-011
- FR-012
- FR-019
- FR-023
- FR-034
- C-004
- C-007
- NFR-009
- NFR-011
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T08:36:45.978174+00:00'
subtasks:
- T009
- T010
- T011
- T012
- T013
- T014
- T015
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/defaults/
create_intent:
- packages/mission-ui/src/defaults/review.ts
- packages/mission-ui/src/defaults/files.ts
- packages/mission-ui/src/defaults/refusals.ts
- packages/mission-ui/src/defaults/staleness.ts
- packages/mission-ui/src/defaults/wp-copy.ts
- packages/mission-ui/src/logic/wp-lists.ts
- packages/mission-ui/src/logic/wp-actor.ts
- packages/mission-ui/src/logic/wp-files.ts
- packages/mission-ui/src/logic/wp-history.ts
- packages/mission-ui/src/logic/wp-review.ts
- packages/mission-ui/src/logic/wp-staleness.ts
- packages/mission-ui/src/logic/wp-retry.ts
- packages/mission-ui/test/wp-defaults.test.ts
- packages/mission-ui/test/wp-lists.test.ts
- packages/mission-ui/test/wp-actor.test.ts
- packages/mission-ui/test/wp-files.test.ts
- packages/mission-ui/test/wp-history.test.ts
- packages/mission-ui/test/wp-review.test.ts
- packages/mission-ui/test/wp-staleness.test.ts
- packages/mission-ui/test/wp-retry.test.ts
- eslint.data-driven.config.mjs
- gates/data-driven.selftest.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/defaults/**
- packages/mission-ui/src/logic/**
- packages/mission-ui/test/wp-defaults.test.ts
- packages/mission-ui/test/wp-lists.test.ts
- packages/mission-ui/test/wp-actor.test.ts
- packages/mission-ui/test/wp-files.test.ts
- packages/mission-ui/test/wp-history.test.ts
- packages/mission-ui/test/wp-review.test.ts
- packages/mission-ui/test/wp-staleness.test.ts
- packages/mission-ui/test/wp-retry.test.ts
- eslint.data-driven.config.mjs
- gates/data-driven.selftest.ts
- gates/fixtures/data-driven/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - Defaults, logic and data-driven gate extension (IC-02)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Write the five new vocabulary modules (`review`, `files`, `refusals`, `staleness`, `wp-copy`) and the seven logic files holding nine functions that every region of the screen reads, each with a unit test that feeds foreign values; and extend the `data-driven` gate so it reads the `ReviewVerdict`, `ChangeState` and `Staleness` (status and reason) enums from the vendored 1.1 schemas the way it reads the lanes, with new positive self-test cases that are red before the config change. After this work package the vocabulary lives in `src/defaults/` only, and the gate enforces it for the new words.

## Context

Read `plan.md` (IC-02, "Shared files", "Gates"), `contracts/defaults.md` (authoritative: every export, every function signature, every behaviour), `contracts/gates.md` (the `data-driven` row and the self-check list), `data-model.md` ("ResolvedLists", "ResolvedFile and FilesView", "ActorText", "Vocabulary tables"), `research.md` D-02, D-06, D-07, D-08, D-17, R-04, and #4's `contracts/defaults.md` (the reused symbols, imported never redeclared). Requirements: FR-004 (one source per list: `resolveLists`), FR-011 and FR-012 (`historyView`), FR-019 (staleness display rules), FR-023 (data-driven vocabulary), FR-034 (the extended gate), C-004 (no arithmetic), C-007, NFR-009, NFR-011 (text for every status).

Reused from #4 by import (no second home): `lookup`, `LANE_LABELS`, `STATE_BADGES`, `NOT_STARTED_BADGE`, `STALE_BADGE` (`defaults/lifecycle.ts`), `LANE_COUNT_TEXT`, `SUBTASK_PROGRESS_TEXT` (`defaults/lanes.ts`), the `StateBadge` and `BadgeTone` types (`logic/types.ts`), `resolveStateBadge`, `resolveLaneLabel`, `relativeTime`, `resolveActivity`, `formatWholePercent`. Nothing of those is redeclared: the word "stale" and its tone, the "N Work Packages" text and the subtask label each keep one home.

The widened view types (`WorkPackageRecordView`, `WorkPackageDetailView`, `HistoryEntryView`, ...) were added by WP01 in `src/contract/types.ts`; import them, do not edit that file.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP01. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.

## Subtasks

**First step (before T009; FR-022 label-hook arm).** Read #4's `logic/labels.ts` (`LabelHooks`, `resolveActivity`) in the build base and record in the hand-off, in one line, whether `LabelHooks` declares a TIME hook. Consequence either way, so the FR-022 "label hook" arm never vanishes: (a) it exists: `historyView` and the Facts "Last transition" row call it first (hook, then relative text when `now`, else the ISO string) and WP09 T054 step 5(c) asserts the hook text wins; (b) it does not exist: the screen's hook surface adds none (the `labels` property keeps the lane and state hooks only, the contract's reserved row stays reserved), the FR-022 label-hook arm is realised through the `labels.state` and `labels.lane` hooks only, and WP09 T054 step 5(c) asserts that arm (a `labels` carrying an extra time function cast in is never called, while the lane hook is). The hand-off line is the evidence WP09 reads.

### T009 Default modules and the one `index.ts` edit

**Purpose**: one home per word. Plain TypeScript, no I/O, no DOM, English copy only; nothing here is a lane or phase.

**Steps**: create exactly the five files of `contracts/defaults.md`, each export exactly as named there, and re-export them from `src/defaults/index.ts` (the one edit of that file):
- `review.ts`: `VERDICT_BADGES` (`Readonly<Record<string, StateBadge>>`, `approved` `Approved` tone success, `changes_requested` `Changes requested` tone danger), `NO_VERDICT_TEXT`, `NO_REVIEW_TEXT`, `NO_CYCLES_TEXT`, the override copy (`OVERRIDE_HEADING`, `OVERRIDE_PARTIAL_NOTE`, `OVERRIDE_BY`, `OVERRIDE_AT`, `OVERRIDE_REASON`), `OPEN_REVIEW_LABEL(cycleNumber)` ("Open review, cycle N" with N printed as given), `CYCLE_LABEL`, `REVIEW_CYCLE_ARTIFACT_KIND` (typed from the generated `ArtifactKind` union, value `review_cycle`; the one export where that literal lives).
- `files.ts`: `CHANGE_STATE_BADGES` (changed info, unchanged neutral, unknown neutral), `UNKNOWN_CHANGE_STATE` (the table key the all-unknown check reads; the one name of that constant everywhere), `GLOB_MARKER` ("set of files"), `CHANGE_STATE_UNAVAILABLE_NOTE`, `NO_FILES_TEXT`.
- `refusals.ts`: `DETAIL_REFUSAL_WORDS`, `DETAIL_REFUSAL_GENERIC`, `DETAIL_REFUSAL_HEADING`, `DETAIL_RETRY_LABEL`, `DETAIL_LOADING_LABEL`.
- `staleness.ts`: `STALENESS_STATUS_ROLE` (status to `'badge' | 'row' | 'none'`), `STALENESS_REASON_WORDS`, `STALENESS_MINUTES_TEXT(minutes)`, `FRESH_TEXT`, `STALENESS_NOT_APPLICABLE_TEXT(reason)` ("Staleness: not applicable, <reason>"; a null reason drops the clause; reason through `STALENESS_REASON_WORDS` with raw fallback). `STALE_BADGE` is imported from #4, not redeclared.
- `wp-copy.ts`: every panel title, row label (including the Frontmatter, Staleness, review-summary, override, cycle and evidence-chain stage labels enumerated in `contracts/defaults.md`), marker, absent form, state copy, accessible-name builder (`BREADCRUMB_LABEL`, `dependencyNodeLabel(wpId, title, laneWord)`) and announcement builder (`announceLoading`, `announceLoaded`, `announceNotFound`, `ANNOUNCE_DETAIL_LOADING`, `ANNOUNCE_DETAIL_LOADED`, `ANNOUNCE_DETAIL_UNAVAILABLE`) listed in `contracts/defaults.md`. The count text and subtask label are imported from #4. The copy is the CP-1 copy list: PROVISIONAL until the operator confirms it; keep every string in this one file so a CP-1 amendment is a one-file change.

**Files**: `src/defaults/{review,files,refusals,staleness,wp-copy,index}.ts`. **Edge cases**: HAZARD (research D-07): the verdict key `approved` equals a lane word; it may appear as a string ONLY as the key of `VERDICT_BADGES` in `review.ts`. Every table is read through `lookup` with a raw-value fallback; none is read by comparison. No export is a lane or phase.

### T010 Logic modules (nine functions)

**Purpose**: the algorithms regions call, one place each.

**Steps**: create the seven files under `src/logic/` with the signatures of the table in `contracts/defaults.md` ("`logic/` additions"):
- `wp-lists.ts` `resolveLists(wp, detail)`: one source per list; with a usable detail it returns the detail's titled lists and `source: 'detail'`; without it, it degrades the 1.0 forms (`{ id, title: null, lane }` from the subtasks map, `{ wpId, title: null, lane: null }`, `{ pattern, isGlob: false, changeState: null }`) with `source: 'bare'`. A detail whose `wpId` differs from `wp.wpId` counts as omitted and is returned as `detail: null`. No list is sorted, filtered or counted.
- `wp-actor.ts` `joinHandles(actor)`: the non-null handles of `[tool, role, profile]` joined by `:`, null when none.
- `wp-review.ts` `resolveVerdict(verdict)`: `lookup(VERDICT_BADGES)` then raw (label the raw value, tone neutral); null gives `NO_VERDICT_TEXT` neutral.
- `wp-files.ts` `resolveChangeState(state)` (null gives null; a foreign key shows raw neutral) and `filesView(files)` returning `{ allUnknown, rows }`; `allUnknown` is true when the list is non-empty and every state equals `UNKNOWN_CHANGE_STATE` (the logic never writes the literal); a single unknown among others is shown; a foreign state among known ones is shown raw and does not collapse the list; a null state shows no badge and no note.
- `wp-staleness.ts` `stalenessView(s)`: role via `STALENESS_STATUS_ROLE`; a status that is not a key gives role `'row'` with the raw status text; `not_applicable` and absent give `'none'` (the visually hidden text is produced by the facts part from `STALENESS_NOT_APPLICABLE_TEXT`; expose the reason and status the part needs).
- `wp-history.ts` `historyView(history, hooks, now)`: array order, no sorting, no filtering; the LAST entry `current: true` (position, not value); `forced` read from `force`; lane label by hook or table with raw fallback; relative time via `resolveActivity` with ISO fallback.
- `wp-retry.ts` `retryDetail(target, props)` (payload builder, ONE place: `wpId` property first, then `workPackage.wpId`, then `detail.wpId`) and `resolveRefusal(code)` (`lookup(DETAIL_REFUSAL_WORDS, code)`, raw code as fallback, null gives `DETAIL_REFUSAL_GENERIC`).

All new logic sits under `src/logic/`, which the `data-driven` gate scans: no lane, phase, verdict, change-state or staleness-status literal may appear there, no `Date`, no `Math.` on contract values.

**Files**: `src/logic/wp-{lists,actor,files,history,review,staleness,retry}.ts`.

### T011 Unit tests with foreign values and positive controls

**Purpose**: prove behaviour, not shape.

**Steps** (red-first, one test file per module: `wp-defaults.test.ts` for the tables and builders, then `wp-lists`, `wp-actor`, `wp-files`, `wp-history`, `wp-review`, `wp-staleness`, `wp-retry`): each function gets a positive control and the foreign inputs the contract lists ("IC-02 logic tests": unknown verdict, change state, staleness status and reason, refusal code), `resolveRefusal` for a known, unknown and null code, `resolveLists` with both payloads present and different (the detail wins; a mismatched `wpId` is treated as omitted), `historyView` on a non-chronological history built by cast (order kept, `current` on the last array element, single-entry and empty histories, an empty one has no current), `historyView` time cases (FR-022: `now` set gives the relative text of `relativeTime`, `now` null gives the ISO text, the label hook wins, an unparsable timestamp built by cast gives its raw input and never `undefined` or `NaN`; the screen-level time tests are WP09 T054 step 5), `resolveLists` with the detail passed as `null` (the screen's input under a pending or refused detail, the detail input rule: bare forms from the Work Package only, `source` `bare`), `filesView` for mixed, all-unknown, empty, foreign-among-known and null-state inputs, `retryDetail` one test per branch of the fallback chain (property, `workPackage.wpId`, `detail.wpId`) and `stalenessView` for every status including a foreign one. Assert counts with equality; a loop asserts it ran N times.

**Validation**: `pnpm test` lists all eight files with reporter pass above 0; revert check per file (for example add a sort to `historyView`, drop the mismatch rule of `resolveLists`, write the `unknown` literal into `filesView`).

### T012 Extend the data-driven gate configuration

**Purpose**: operator ruling 2026-10-05, ARCH-006 (A): the gate learns the new words so a stray `'changes_requested'` or `=== 'unknown'` outside `defaults/` is caught mechanically.

**Steps**: in `eslint.data-driven.config.mjs` read the `ReviewVerdict`, `ChangeState` and `Staleness` (status and reason) enums from the vendored schemas (`contracts/spec-kitty/mission-status/schemas/`) exactly as the config reads the lanes today. Underscored and whole-word members (`changes_requested`, `not_applicable`, `unchanged`, and the reason codes) are gate words like the existing ones; the bare words that are common identifiers (`unknown`, `changed`, `fresh`, `stale`) are matched only in comparisons and `case` labels, so a property, key or variable of that name stays clean. Update `EXPECTED_WORDS`, the word-count test, the selector-count guards and the "covers every selector" test in the same commit. The gate does not read `ArtifactKind` or the refusal codes (the reviewer self-check list and the foreign-value tests cover them); say so in a comment.

**Files**: `eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts`. **Edge cases**: `approved` is both a verdict and a lane word, so the gate already reports it outside `defaults/`; the verdict table lives in `defaults/review.ts` (which the gate exempts), do not special-case it.

### T013 New self-test cases that are red before the change

**Purpose**: a gate case that never failed proves nothing (and these are self-test cases, not plants: no proof entry, no `gates/plants` file).

**Steps** (red-first, in this order): (1) add one positive self-test case per new word family under `gates/fixtures/data-driven/` (a verdict word other than `approved` compared in a `case` label or `===`, a change-state word, a staleness status word, a staleness reason code), each as a source file the gate must flag; (2) run the self-test against the UNCHANGED config and record each case red (the failing line goes in the hand-off); (3) only then apply T012 and show each case green. A case that targets a word the gate already catches (a verdict compared with `'approved'`, a marker keyed on a lane value) does not count and must not be used as one of the new cases.

**Validation**: `pnpm lint:data-driven && pnpm test:data-driven` green after; red per case before. The count of self-test cases the test asserts is a literal.

### T014 False-positive cases and count guards

**Purpose**: the gate must not turn into noise.

**Steps**: add negative fixtures that must stay clean: a property named `changed`, an object key `unknown`, a variable named `stale`, a type member `fresh`; the same words inside `defaults/` and `contract/` paths are exempt as the lanes are. Confirm the gate over the real `packages/*/src` (including WP02's own new files) reports 0 findings. If a selector falsely matches new logic, rename the field in the logic; never silence the gate.

**Validation**: the false-positive fixtures green, the real tree green; revert check: remove the comparison-only restriction and see a false-positive case go red.

### T015 CHANGELOG line and hand-off

**Purpose**: leave the lane reviewable.

**Steps**: add the one IC-02 CHANGELOG line (out-of-map: both `CHANGELOG.md` files; WP10 reconciles); `package.json` only if the unit-test or data-driven scripts need a file name added (out-of-map, minimal, said in the hand-off). Run the full exit list. Write the hand-off with the red-before/green-after record of every new self-test case, the revert check per test file, the list of every default export with its one home, and any change request (a missing contract symbol is a change request to the owner, not an edit).

## Test strategy

Positive controls: every logic function has a case with known inputs producing the expected value, so a vacuous implementation fails; the gate's false-positive fixtures prove it still accepts clean code. No-event and exactly-one-event rules do not apply (no element). Foreign values: unknown verdict, change state, staleness status and reason, refusal code, lane value; each must come out as raw text, never `undefined`. Order tests build their inputs by cast. Revert checks listed per test file. No visual test is run by this work package; `pnpm gate-proof` does not need to run (no plant is added; the self-test cases carry no proof entries).

Exit evidence (all runnable): `pnpm lint:data-driven && pnpm test:data-driven` green; each new self-test case red against the unchanged config (recorded) and green after; the false-positive cases green; `pnpm test` green and lists the eight new test files; `pnpm typecheck`, `pnpm lint`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm hygiene` green; `git status --short` empty after the last commit.

## Definition of Done

- Every export of `contracts/defaults.md` exists in its named file, re-exported from `defaults/index.ts`; no export duplicates a #4 symbol.
- Nine functions with tests, each with positive control, foreign input and a listed revert check.
- Gate extended; `EXPECTED_WORDS`, counts and guards updated in the same commit; the new self-test cases were red before.
- Hand-off lists commit hashes verified with `git cat-file -t`, out-of-map edits with rationale, change requests and the CP-1 copy list location (`wp-copy.ts`).

## Risks

- Selector false positives on new logic: rename fields, never silence the gate.
- The `approved` collision: it exists only as the key of `VERDICT_BADGES`; any other `approved` outside `defaults/` is reported by the gate (that is correct).
- The gate does not read refusal codes or `ArtifactKind`: `review_cycle` and the refusal codes stay on the reviewer self-check list; the foreign-value tests are the mechanical cover.
- #4's `packages/*/src` could hold a literal of a new word (the plan-phase squad grepped and found none); the self-test run confirms. If it finds one, report it; do not edit #4's accepted files.

## Reviewer guidance

Check that no string literal of the self-check list appears under `src/logic/` or in any part-facing file; that `UNKNOWN_CHANGE_STATE` is the only place the all-unknown key is named; that `resolveLists` is the only function reading `workPackage.subtasks`, `dependencies` or `ownedFiles`; that `retryDetail` has three tested branches; that the self-test cases were demonstrably red against the unchanged config (ask for the failing line); that no new plant or proof entry was added; that copy strings all live in `wp-copy.ts`. The reviewer is a separate agent; it re-runs two revert checks and the gate commands itself. Visual drift does not apply (no pixels).


## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative; stage only these): see the list in the frontmatter. `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. Shared files outside that list are changed ONLY as the plan's table "Shared files: who may write them" (`plan.md`) allows for this work package, and each such out-of-map edit is committed by you with plain `git add <path>` and `git commit`, listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file, change, reason), not an edit. A generated file (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) is never edited by hand: a conflict in one is resolved by regeneration only.

**Gates this work package must pass before it is handed off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists; run them from the lane worktree root): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate: its output must list your test files), `pnpm build-storybook`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm contract:check && pnpm test:contract`. `pnpm visual` and `pnpm gate-proof` are NOT exit checks of every work package: each work package's own "Exit evidence" says whether they run (see its "Test strategy"). Run the gates named by the root `package.json` scripts; if a script name differs on the merged build base, use the name the base provides and say so in the hand-off.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, see it fail for the right reason, record the failing line in the hand-off, and only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) that produces a named failing test, then the restore, is listed in the hand-off (revert check); the reviewer re-runs two of them.

**Test-quality rules (mission-ui#4 D-34 and `research.md` D-17, binding, copied here).**
1. Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed.
2. Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` true, `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`).
3. Counts are asserted with equality, never "at least"; every loop over fixtures, stories, rows or items asserts it ran the expected N times (an empty loop must fail).
4. Not-drawn regions have a DOM-absence assertion (the region element, its heading and its label text are absent) PAIRED with a sibling fixture where the region is present (positive control). Omitted versus empty versus null are separate paired tests.
5. Order tests use test-only inputs built by cast so that a later sort or filter fails them.
6. Foreign values (a verdict, change state, staleness status or reason, detail refusal code, lane value outside the tables) render their raw text in the DOM and never `undefined`.
7. Revert checks as above; vitest browser-mode tests call `page.viewport` first.
8. The C-009 terminology rule: the word "feature" never appears in source, stories, fixtures or docs; "Mission" is the term. "Status lane" and "code lane" stay distinct.

**Data-driven rules (C-007, FR-023, NFR-009; the self-check list of `contracts/gates.md`, copied here).** No lane or phase literal anywhere outside `src/defaults/` and `src/contract/`; no view-type field named like a lane or phase. No `approved`, `changes_requested`, `fresh`, `stale`, `not_applicable`, `changed`, `unchanged`, `unknown` or `review_cycle` string literal outside `defaults/` and `contract/`, and no `=== '<word>'` comparison: read tables through `lookup` with the raw value as fallback. The review-cycle artifact kind is the export `REVIEW_CYCLE_ARTIFACT_KIND`; the gate does not read `ArtifactKind` or the refusal codes, so the reviewer checks those by hand. No `Date`, `setTimeout`, `fetch`, `localStorage`, `location` or `history` object use; no `Math.` on contract values (no arithmetic on contract values, C-004). Every `dispatchEvent` has a literal `sk-*` name, sits in `sk-work-package-screen.ts` and is declared by `@fires` (part files receive handlers as arguments and never dispatch). Every new `class=` has an approved prefix in that file's E-17 row, or the file has no `class=`.

**Drift register status and visual authority (C-006, NFR-008).** The prototype `<prototype>/04-work-package.html` (and `<prototype>/05-artifact.html` for the artifact links) is the visual source of truth. The drift register DW-1 to DW-30 (`spec.md`) is PROPOSED until checkpoint CP-1 and CONFIRMED afterwards: before the `CP-1 confirmed` entry exists in `tracer-design-decisions.md`, no DW item is allowed; afterwards only the DW items that entry names as confirmed (with the operator's amendments) are allowed. An unconfirmed difference is a REJECT item for the work package that introduces it, not a "design review" item. DW-7, DW-24 and DW-30 carry the amended text of the 2026-10-05 rulings.

**Baselines (operator ruling 2026-10-05, CORRECT-012 (a)).** Baseline PNGs are generated only inside the pinned container (`scripts/visual.sh`) and are committed ONLY in WP10, after both chains are merged. Work packages WP05 to WP09 commit no PNG and do not run `pnpm visual:update`; `pnpm visual` is NOT an exit check of WP05 to WP09 (their stories have no committed baseline, so missing snapshots are the known red). Their exit evidence is one uncommitted side-by-side screenshot per story against the prototype, handed over in the report. Nothing is ever hand-edited or copied as a PNG.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, dev-assist test cleanup, the aggregate review squad, history compaction into named slices and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with a conventional message (`feat(work-package-screen): ... (#5)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.


## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- No push, no pull request, no issue comment. Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `git stash`, never `rm` with variable globs. Nothing is left running when you finish.
- No absolute paths and no usernames in any committed file (use `<repo>`, `<prototype>`, `<lane-1.1>`, `<elements>`); run `pnpm hygiene` before committing. This holds for fixtures, stories, tests, comments, `PIN.json` and the hand-off text.
- Visual baselines only inside the pinned container; committed only in WP10 (see "Baselines" above). Read every screenshot you produce and describe it in the hand-off (what is drawn, at which width, anything wrong).
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens (Stylelint rejects raw colour, font and size literals); every UI primitive the design library provides is rendered with its `sk-*` element (elements over CSS); a missing primitive is recorded as a component gap (`research.md` G-09 to G-13), never hand-rolled outside the recorded exceptions E-17 to E-20 (and #4's E-04 to E-16).
- `tracer-*.md`, `spec.md`, `plan.md` and every other file under `kitty-specs/` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off; write nothing there.
- Do not run `spec-kitty` commands that mutate mission state; the orchestrator moves tasks.


## Hand-off checklist (the report you write when you move to review)

1. Commit hashes of your work, each verified with `git cat-file -t <hash>` (report the output), listed in the order made, with the one-line subject of each.
2. For every gate of "Gates this work package must pass": command, exit code, reporter pass count. A gate you did not run, and why, is stated.
3. The failing line recorded for every red-first test or plant, and the revert check per test file (what you reverted, which named test failed, that you restored it).
4. Out-of-map edits (shared files the plan's table grants this work package), each with a one-line rationale; change requests (file, change, reason) for anything you needed but do not own.
5. The drift items relied on, named by DW id as confirmed in the CP-1 entry (not applicable before CP-1), and every difference from the prototype you saw that is NOT in that list (a REJECT item you must fix before handing over).
6. Every screenshot or image you produced, read and described (what is drawn, the width, anything wrong); uncommitted; where the orchestrator can find it.
7. Exceptions touched (E-17 to E-20 and #4's E-04 to E-16), gaps met (G-09 to G-13), and any decision you took that the plan did not fix.
8. `git status --short` empty after the last commit, and the statement that nothing is running.
9. No absolute path or username appears in the hand-off text itself (use the placeholders).

The reviewer is a separate agent: it reads your hand-off first, re-runs two revert checks, and rejects on any item above that is missing or false.
