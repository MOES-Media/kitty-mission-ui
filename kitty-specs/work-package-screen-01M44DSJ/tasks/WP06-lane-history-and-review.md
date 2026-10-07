---
work_package_id: WP06
title: Lane history and Review (chain X)
dependencies:
- WP05
requirement_refs:
- FR-011
- FR-012
- FR-013
- FR-014
- FR-018
- FR-020
- FR-023
- FR-035
- FR-036
- NFR-011
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T12:24:31.059325+00:00'
subtasks:
- T035
- T036
- T037
- T038
- T039
phase: Phase 2 - Regions
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-work-package-screen/
create_intent:
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.review-history.stories.ts
- packages/mission-ui/test/sk-work-package-screen.events-6.test.ts
- packages/mission-ui/test/wp-history-parts.test.ts
- packages/mission-ui/test/wp-review-parts.test.ts
- packages/mission-ui/src/elements/sk-work-package-screen/history-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/review-parts.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-work-package-screen/history-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/review-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.review-history.stories.ts
- packages/mission-ui/test/sk-work-package-screen.events-6.test.ts
- packages/mission-ui/test/wp-history-parts.test.ts
- packages/mission-ui/test/wp-review-parts.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - Lane history and Review (chain X) (IC-05)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the bodies of `history-parts.ts` (the Lane history as a semantic ordered list on the adopted `event-timeline` sheet) and `review-parts.ts` (the Review panel bodies: latest-result summary, override notice, review cycles with "Open review", and the cancellation notice above the panel); build the thirteen stories of `Screens/Work Package/Review and history`; and prove with tests the Open review event EV-6, array order with cast inputs, the reviewCycles omitted-versus-empty pair, and foreign values. You replace stub bodies only. Note on `create_intent`: `history-parts.ts` and `review-parts.ts` appear there only so that finalize-tasks finds the literal paths; each file is created as a stub by WP04 and replaced here (you edit it, you do not create a second one, and every signature stays).

PRECONDITION (file precondition, first step): checkpoint CP-1 has completed (see "First step").

## Context

Read `plan.md` (IC-05, "Shared files"), `contracts/sk-work-package-screen.md` (Regions `history`, `review-summary`, `review-cycles`, `cancellation`; Semantics (lists, text for status, control names); Behaviour rules; Story catalogue rows for "Review and history"; "Test obligations by owner" IC-05; "Part signatures"), `contracts/defaults.md` (`review.ts`, `wp-copy.ts` copy; `historyView`, `resolveVerdict`), `data-model.md`, `research.md` D-07, D-08 (history and review rules), D-12, D-14, D-17, `spec.md` (Q3c, Q11, Q12, DW-9 to DW-15, DW-22, state rows WP-02 to WP-08, WP-23, WP-24, WP-28, WP-29, WP-30, EV-6, FR-011 to FR-014, FR-020), and the WP05 and WP04 hand-offs (view types `HistoryView`, `ReviewView`, `CancellationView`).

Requirements: FR-011 (history as a semantic ordered list in array order), FR-012 (history markers: "Current" on the newest entry only), FR-013 (one review panel: summary above cycles; verdict never colour-only), FR-014 (cycles in the order the contract gives, ascending cycle number, never sorted; absent markers, "Open review" only with a non-null `artifactPath`), FR-018 (`reviewCycles` omitted draws no region and no claim; empty with no latest result and no override draws "none found on the primary planning surface"; empty beside a latest result or override draws the summary alone, Q11), FR-020 (canceled notice with reason source), FR-023 (every verdict and lane word through `defaults/`), FR-036 (the stories this WP authors, one per catalogue row, ids by the story id convention), FR-035 (EV-6 test), NFR-011.

Chain X continues: WP05 is merged in your lane. You share no file with chain Y.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP05. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics", and checks the CP-1 ancestry); do not create, switch or reset branches yourself.

## First step: CP-1 file precondition

Before any edit confirm the `CP-1 confirmed` entry in `tracer-design-decisions.md` and `git merge-base --is-ancestor <CP-1 commit> HEAD` (the dispatch names the commit). If absent: STOP and report. DW-9 to DW-15 and DW-22 are yours (DW-12 and DW-15 are shared with WP05, whose Facts row and header carry the same relative time and dropped notice); DW-23 (placement) and DW-30 (panel look) are inherited from the skeleton (WP04) and built as the register states (DW-30 is confirmed with the narrowed E-18; DW-23 awaits the Storybook review); DW-9 (the Mission phase timeline is NOT rendered: lane history takes its place), DW-11 ("Current" only, no lane-keyed "Complete" marker), DW-12 (relative time), DW-13 (cycle text dropped, "Open review" added) and DW-14 (new summary) are the ones to match to the entry as confirmed.

## Subtasks

### T035 Lane history

**Purpose**: read how the Work Package moved, with no lane literal anywhere.

**Steps** (red-first with `wp-history-parts.test.ts`):
1. `renderHistory(view)`: an `ol` (accessible name from the panel heading, no separate name) drawn through `repeat` keyed by history `eventId` (stable keys: NFR-006 later asserts unchanged nodes keep identity), items from `historyView` (WP02): array order as given (oldest first, no sorting, no filtering), each item with the lane word or the raw value (`resolveStateBadge`/label hook, never a comparison with a lane literal), the relative time (`resolveActivity`, ISO fallback), the actor, "forced" in words (`FORCED_WORD`) when `force` is set, the reason when present, and the review verdict as text through `resolveVerdict`; the visible "from -> to" summary on the library event-timeline sheet (CP-1 ruling for DW-10, DW-11, DW-12: previous lane word -> this lane word through the label hook, "Current" on the newest entry only; the final wording stays tunable at the Storybook review); the FIRST entry (`fromStatusLane` null) has no "from"; "Current" (`CURRENT_MARKER`, text) on the LAST array element only (position, never a lane value); "N files modified" of the prototype is dropped (no source, DW-10).
2. The markup uses the adopted `sk-event-timeline*` classes from the sheet WP04 added (E-17 in this file only); no CSS is written beyond layout in `historyStyles`.
3. Empty history (`statusLane` null, WP-09): the quiet empty form through WP04's `renderEmptyForm(NO_HISTORY_TEXT)`; no "Current" marker for an empty list.

**Files**: `history-parts.ts`, `wp-history-parts.test.ts`. **Edge cases**: a single-entry history has "Current" on that entry; unknown lane values render raw (WP-45 is WP09's story, the behaviour is yours); a 60-entry history scrolls with the page (never inside a nested scroller unless a long path needs the #4 overflow region).

### T036 Review: summary, override, cycles, cancellation notice

**Purpose**: the one Review panel (Q11) plus the cancellation notice.

**Steps** (red-first with `wp-review-parts.test.ts`):
1. Two body renderers (panel ownership; WP04's screen file draws the Review panel titled `REVIEW_TITLE` ("Review cycles", the prototype's `h2`) with `renderPanel(null, ...)` and the two wrappers `review-summary` and `review-cycles`; you write no `renderPanel` and no `data-region`): `renderReviewSummary(view)` draws the SUMMARY body: the latest result (reviewer, verdict through `resolveVerdict` as word plus tone, the reference as plain text) and the override notice (`sk-notice`; complete: who, when, reason; partial (`complete` false): blank members show `ABSENT_MARKER` and the notice states "This override is incomplete. The merge gate stays blocked."); and `renderReviewCycles(view, onOpenReview)` draws the CYCLES body (detail-only): an `ol` in the order the contract gives, each cycle with its number, the verdict as words with tone (a null verdict shows `NO_VERDICT_TEXT`), the reviewer and time (a null `reviewedAt` or `reviewer` shows the absent marker, not a made-up value), the reference text if any, and an "Open review" `sk-button` ONLY when `artifactPath` is non-null (not disabled, not a placeholder, when null). Show latest result and cycles WITHOUT reconciling them (N-4). Composition (review composition, the table in the contract "Containers and drawn-when", binding): a latest result or override with an empty cycles list (WP-29): the summary ALONE (Q11, binding): the screen draws no cycles wrapper, you receive no cycles view and `NO_CYCLES_TEXT` is not drawn; NO latest result and NO override with an empty cycles list (WP-01, WP-02): the summary body is the empty form `renderEmptyForm(NO_REVIEW_TEXT)` ("No review outcome recorded") AND the cycles wrapper holds `NO_CYCLES_TEXT`, so both texts and both ids are present; cycles omitted (view null for the cycles wrapper): the screen draws no cycles wrapper, you make no "none found" claim, and the summary is as above.
2. `reviewCycles` omitted (property absent, `detail` null or detail without the property): the screen draws no cycles wrapper (you receive no view) and no "none found" claim is made; `[]` with NO latest result and NO override: draws `NO_CYCLES_TEXT` ("No review cycle found on the primary planning surface": says none was FOUND, not that none happened); `[]` with a latest result or override: no wrapper, the summary alone. The panel also hosts the one detail notice/busy slot position the screen file decides (WP04); you draw nothing for it.
3. "Open review" is named by `OPEN_REVIEW_LABEL(cycleNumber)` ("Open review, cycle N", visible text may stay "Open review") so two cycles give two accessible names; activation calls the handler passed in (`onOpenReview`), which WP04's dispatch method turns into `sk-open-artifact` `{ missionId, path, kind: REVIEW_CYCLE_ARTIFACT_KIND }`; the control is inert when `mission` is null (the flag WP04 passes). The part never dispatches and never writes the literal `review_cycle`.
4. `renderCancellation(view)`: the body of the `cancellation` wrapper the screen draws ABOVE the review panel (`sk-notice`) with the canceled lane word and tone (from the lane tables; DW-22), the `cancellation.reason` and its source in words (`REASON_SOURCE_WORDS`: operator, synthetic); a null reason draws NO made-up text; null cancellation draws nothing.
5. Verdict, override and cancellation are text in the DOM, never colour alone (NFR-011).

**Files**: `review-parts.ts`, `wp-review-parts.test.ts`. **Edge cases**: a verdict outside the table renders its raw text with the neutral tone (cast test); `approved` as a verdict word is read only through `VERDICT_BADGES` (the HAZARD of research D-07: never compare, never type the literal); a cycle with every nullable member null (WP-30, cycle 3) renders absent markers only and no "Open review".

### T037 The thirteen stories: `Screens/Work Package/Review and history`

**Steps**: create `sk-work-package-screen.review-history.stories.ts` (title `Screens/Work Package/Review and history`, 13 stories, dark, 1280 px, `shellFrame` as the catalogue): WP-02 (`wpReviewNone` + `detailNoCycles`); WP-03 (`wpApproved` + `detailPopulated`, `cycles: 'last'`); WP-04 (`wpChangesRequested` + `detailPopulated`, `cycles: 'first'`); WP-05 (`wpOverride`); WP-06 (`wpOverridePartial`); WP-07 (`wpDone`); WP-08 (`wpHistoryRich`); WP-23 (`wpCanceled`); WP-24a (`wpCanceledSynthetic`); WP-24b (`wpCanceledNullReason`); WP-28 (`wpApproved` + `detailPopulated`, both cycles); WP-29 (`wpApproved` + `detailNoCycles`: a latest result present and no cycles, Q11's summary-alone case: no cycles region, no none-found text); WP-30 (`wpPopulated` + `detailUnparseableCycle`). Build ONLY with WP04's `fixtures.ts` and `pairDetail`; the review-state agreement rule holds (a pair whose Work Package has no `latestResult` uses `cycles: 'none'` except WP-30; WP-29 is the one deliberate exception). Stories `WP-05`, `WP-06`, `WP-07`, `WP-08`, `WP-23`, `WP-24a`, `WP-24b` are Work-Package-only (`detail: null`, bare lists). Exactly 13 stories discovered for the title. Story id convention (contract, Story catalogue): the export name is `Wp` + the row number in two digits + the optional lowercase letter (`Wp01`, `Wp21b`, `Wp36a`), and `tags` carries exactly one row tag `wp-<NN><letter>` in lowercase (`'wp-01'`, `'wp-21b'`) beside the tier tag `vw-<n>` and any `tab-<n>` tag; WP10's parser reads the `wp-` tag and cross-checks it against the export name.

### T038 Tests: order, EV-6, omitted versus empty, foreign values

**Steps** (red-first; a revert check per file in the hand-off):
1. `sk-work-package-screen.events-6.test.ts` (EV-6): activating "Open review" on a cycle with a path emits `sk-open-artifact` exactly once, `toEqual({ missionId, path, kind })` where `kind` is compared with the export `REVIEW_CYCLE_ARTIFACT_KIND` (never a typed literal), `bubbles` and `composed` true, not cancelable; a cycle with a null `artifactPath` has no control at all (DOM absence) paired with a sibling cycle that has one (positive control, same listener); with `mission` null the control is inert and emits nothing, with the same positive control; Enter and Space operate it.
2. `wp-history-parts.test.ts`: order tests with TEST-ONLY inputs built by cast (non-chronological history; the DOM keeps array order; "Current" is on the last array element, not the latest `at`), a single-entry history, an empty history (no "Current", empty form); revert check: adding a sort fails the test; forced and reason markers in words; first entry without a "from"; foreign lane values render raw in array order.
3. `wp-review-parts.test.ts`: cycles in DESCENDING `cycleNumber` built by cast keep the array order (the order the contract gives, ascending in a correct host; no sort, no comparison); the `reviewCycles` omitted versus `[]` pair, through the screen (omitted, built from `detailOmittedProvisional`, draws no cycles region and no "none found" text; `[]` with a no-result Work Package (`wpReviewNone` + `detailNoCycles`), draws `NO_CYCLES_TEXT`), and the review composition rows one test each (result with `[]` (`wpApproved` + `detailNoCycles`): the summary alone, NO `review-cycles` region and no `NO_CYCLES_TEXT`, paired with the no-result row as its positive control; no result with `[]`: both texts and both ids; no result with omitted cycles: the empty summary form only; result with omitted cycles: the summary only); latest result alone (no cycles) draws the summary and nothing else in the panel; override complete versus partial (the "merge gate stays blocked" text only for partial; blank members show the absent marker); null reviewer and time show absent markers; a foreign verdict shows raw text, never `undefined`; canceled with operator reason, synthetic reason and null reason (no made-up text, no empty reason element); `renderCancellation` null draws nothing (paired with the present case).
4. Counts with equality; every loop asserts N.

### T039 Side-by-side hand-over (no PNG committed)

**Steps**: for EACH of the thirteen stories produce an uncommitted side-by-side screenshot against `<prototype>/04-work-package.html` (`?wp=WP04` for history and review cycles; the rows with "None" prototype source are compared to the named analogue), inside the pinned container (`pnpm visual` for the actual images only; its red for missing snapshots is the known red and NOT an exit check; never `pnpm visual:update`; no PNG staged). Read and describe each image. Map every visible difference to a DW item as the CP-1 entry and the register state them (DW-9 to DW-15, DW-22) or flag it as an unconfirmed difference and fix it. Other work packages' regions are stubs in your captures: say so.

## Test strategy

Positive controls: every no-event or absence assertion has its present-sibling control in the same test (EV-6 null path, the null-path control, `reviewCycles` omitted versus `[]`). Exactly-one-event: EV-6. Order tests use cast inputs so a later sort fails them (revert check proves it). Revert checks per file (listed): events-6 (hard-code the kind literal; dispatch on hover), history (add a sort; mark "Current" by lane), review (draw "Open review" for a null path; compare cycle numbers). Foreign values: verdict, lane. Exit evidence: `pnpm visual` is NOT an exit check of this work package (its stories have no committed baseline until WP10, so missing snapshots are the known red); the exit evidence is the uncommitted side-by-side screenshot per story against the prototype, no PNG committed. All other gates of the list green, including `pnpm lint:data-driven && pnpm test:data-driven` (your files must hold no verdict, change-state or staleness literal).

## Definition of Done

- `history-parts.ts` and `review-parts.ts` bodies complete, every signature unchanged; the parts never dispatch; the `review_cycle` literal appears nowhere in your files.
- Thirteen stories exist (exactly), built from `fixtures.ts` only.
- EV-6, order, omitted-versus-empty, foreign-value tests pass with the listed revert checks.
- Hand-off lists commit hashes verified with `git cat-file -t`, thirteen side-by-side images read and described with differences mapped to confirmed DW items, change requests and out-of-map edits (none expected).
- No PNG staged; nothing outside `owned_files` edited.

## Risks

- The verdict `approved` equals a lane word: any literal of it outside `defaults/review.ts` is a gate hit and a review failure; read through tables only.
- "Current" must follow position: tests with cast inputs are the guard.
- Hand-rolled notice or timeline chrome: notices are `sk-notice`, the timeline is the adopted sheet (E-17), buttons are `sk-button`.
- Two views of one history (latest result and cycles) are shown unreconciled by design (N-4); do not "fix" a disagreement.

- The cancellation notice sits above the review panel but is drawn from `review-parts.ts`: do not move it into the screen file; the screen only calls `renderCancellation`.
- A history entry whose verdict word equals a lane word must still go through `resolveVerdict` (table lookup), never a comparison.

## Reviewer guidance

Check DW-9 to DW-15 and DW-22 (plus the inherited DW-23 and DW-30) against the CP-1 entry; no Mission phase timeline; "Current" only on the last array element; no lane-keyed marker; times relative; no inline review text, "Open review" only for non-null paths, named per cycle; verdict words with tone and text; partial override states the merge gate stays blocked; empty cycles with no result say "none found on the primary planning surface", a result with empty cycles shows the summary alone, and omitted draws nothing; cancellation null reason invents nothing; no `review_cycle`, `approved` or other self-check literal; order tests use cast inputs and the sort revert fails; thirteen stories each mapped. The reviewer is a separate agent; it re-runs two revert checks and rejects any unconfirmed difference from the prototype.


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

**Drift register status and visual authority (C-006, NFR-008).** The prototype `<prototype>/04-work-package.html` (and `<prototype>/05-artifact.html` for the artifact links) is the visual source of truth. The drift register DW-1 to DW-30 (`spec.md`) stands as the CP-1 operator rulings (2026-10-05) left it: DW-10, DW-11, DW-12, DW-16, DW-17, DW-24 and DW-30 are CONFIRMED with the amended text (the entry in `tracer-design-decisions.md` headed "CP-1 operator rulings (2026-10-05)" is the `CP-1 confirmed` entry; before it exists, no DW item is allowed); the other 24 items are built exactly as the register states them and are confirmed by the operator at the Storybook review after the last WP, as on #4. A difference from the prototype that is in neither the register nor the entry is a REJECT item for the work package that introduces it, not a "design review" item. DW-7, DW-24 and DW-30 carry the amended text of the 2026-10-05 rulings (DW-24: three columns from `min-width: 848px`, one at `max-width: 688px`; DW-30: the narrowed E-18).

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
5. The drift items relied on, named by DW id as the CP-1 entry and the register state them (not applicable before CP-1), and every difference from the prototype you saw that is NOT in that list (a REJECT item you must fix before handing over).
6. Every screenshot or image you produced, read and described (what is drawn, the width, anything wrong); uncommitted; where the orchestrator can find it.
7. Exceptions touched (E-17 to E-20 and #4's E-04 to E-16), gaps met (G-09 to G-13), and any decision you took that the plan did not fix.
8. `git status --short` empty after the last commit, and the statement that nothing is running.
9. No absolute path or username appears in the hand-off text itself (use the placeholders).

The reviewer is a separate agent: it reads your hand-off first, re-runs two revert checks, and rejects on any item above that is missing or false.
