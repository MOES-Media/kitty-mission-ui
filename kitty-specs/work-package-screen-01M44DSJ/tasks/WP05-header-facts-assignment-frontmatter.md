---
work_package_id: WP05
title: Header, Facts, Assignment and Frontmatter (chain X)
dependencies:
- WP04
requirement_refs:
- FR-002
- FR-003
- FR-005
- FR-006
- FR-007
- FR-018
- FR-019
- FR-021
- FR-035
- FR-036
- FR-037
- NFR-011
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T11:14:32.055631+00:00'
subtasks:
- T029
- T030
- T031
- T032
- T033
- T034
phase: Phase 2 - Regions
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-work-package-screen/
create_intent:
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.header-facts.stories.ts
- packages/mission-ui/test/sk-work-package-screen.events-4.test.ts
- packages/mission-ui/test/wp-header-parts.test.ts
- packages/mission-ui/test/wp-facts-parts.test.ts
- packages/mission-ui/src/elements/sk-work-package-screen/header-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/facts-parts.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-work-package-screen/header-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/facts-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.header-facts.stories.ts
- packages/mission-ui/test/sk-work-package-screen.events-4.test.ts
- packages/mission-ui/test/wp-header-parts.test.ts
- packages/mission-ui/test/wp-facts-parts.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP05 - Header, Facts, Assignment and Frontmatter (chain X) (IC-04)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the bodies of `header-parts.ts` (all but the breadcrumb renderer, which WP04 wrote complete) and `facts-parts.ts` (Facts, Assignment, Frontmatter); build the ten stories of the title `Screens/Work Package/Header and facts`; and prove with tests the crumb event EV-4, the DOM-absence and omitted-versus-null behaviour of the staleness and facts regions, and the visually hidden `not_applicable` text. You replace stub bodies only: every signature of the contract's "Part signatures" table stays. Note on `create_intent`: `header-parts.ts` and `facts-parts.ts` appear there only so that finalize-tasks finds the literal paths; each file is created as a stub by WP04 and replaced here (you edit it, you do not create a second one, and every signature stays).

PRECONDITION (file precondition, first step): checkpoint CP-1 has completed (see "First step").

## Context

Read `plan.md` (IC-04, "Shared files", "Architecture" placement), `contracts/sk-work-package-screen.md` (authoritative: Regions `header`, `facts`, `assignment`, `frontmatter`; Semantics (headings, breadcrumb, text for status); Behaviour rules; Story catalogue rows for "Header and facts"; "Part signatures"), `contracts/defaults.md` (the copy and the resolvers you import), `data-model.md` ("ActorText", staleness display, events), `research.md` D-08 (actor, staleness), D-12, D-14, `spec.md` (Q1, Q10, DW-1 to DW-7, DW-16 not yours, state rows WP-01, WP-09, WP-17 to WP-22, WP-38, EV-4), and the WP04 hand-off (the exact `HeaderView`, `FactsView`, `AssignmentView`, `FrontmatterView` types).

Requirements: FR-002 (header: breadcrumb, `h1` title, status badge, actor badge), FR-003 (crumb emits `sk-open-mission`, EV-4), FR-005 (Facts), FR-006 (Assignment against authored, never merged), FR-007 (Frontmatter), FR-018 (the staleness region is not drawn when the property is omitted; omitted differs from null and from `not_applicable`), FR-019 (staleness look), FR-021 (a null `statusLane` gives "not started", empty history, no actor), FR-036 (the stories this WP authors, one per catalogue row, ids by the story id convention), FR-035 (the EV-4 test with positive control), FR-037 (WP-01 in `shellFrame` is the screen as shell content), NFR-011 (text for every status).

Chain context: this is chain X (WP05, then WP06, then WP09). Chain Y (WP07, WP08) runs in parallel and shares no file with you. You never edit `sk-work-package-screen.ts`, `panel-parts.ts`, `library-sheets.ts`, the lint configs, `index.ts` or the manifest.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics", and checks the CP-1 ancestry); do not create, switch or reset branches yourself.

## First step: CP-1 file precondition

Before any edit confirm that `tracer-design-decisions.md` holds the entry `CP-1 confirmed` and that `git merge-base --is-ancestor <CP-1 commit> HEAD` succeeds (the dispatch names the commit). If not, STOP and report. Read the entry: the confirmed items (DW-10, DW-11, DW-12, DW-16, DW-17, DW-24, DW-30) are allowed as ruled and the other items as the register states them (confirmed later at the Storybook review); DW-1 to DW-7, DW-12 (relative time in the Facts "Last transition" row; shared with WP06), DW-15 (the dropped Evidence notice; shared with WP06), DW-21 (the Assignment panel) and DW-29 (the `sk-page-header` band) are yours (header, actor badge, staleness, Facts, Assignment, Frontmatter); DW-23 (placement) and DW-30 (panel look) are inherited from the skeleton (WP04) and built as the register states (DW-30 is confirmed with the narrowed E-18; DW-23 awaits the Storybook review); DW-7 as amended (dependencies are titled pills, plain, NOT actionable) and the copy as the entry confirms it.

## Subtasks

### T029 Header: breadcrumb call, `h1`, status badge, actor badge, staleness badge

**Purpose**: the page header band of every `ready` Work Package.

**Steps** (red-first with `wp-header-parts.test.ts`):
1. `renderHeader(view, onOpenMission)`: call WP04's `renderBreadcrumb` for the crumb (do NOT edit that function and do not re-implement a crumb; no other file carries `sk-breadcrumbs*`), then the `h1` with the contract `title` (DW-2: the title everywhere; the "Evidence" notice of the prototype is dropped, DW-15), the status badge as an `sk-pill-tag` from the lane badge table (`resolveStateBadge`: word and tone together; a null `statusLane` gives `NOT_STARTED_BADGE`; an unknown lane value shows raw with the neutral tone), the actor badge as an `sk-pill-tag` with `joinHandles(actor)` (absent when all three handles are null; no placeholder text, DW-4), and the staleness badge only when `stalenessView` says role `badge`: `STALE_BADGE` word with the minutes through `STALENESS_MINUTES_TEXT` as given (a null minutes value drops the minutes clause) and the reason word through `STALENESS_REASON_WORDS` with raw fallback (DW-5).
2. The band is an `sk-page-header` (the #4 precedent of N-1 and N-2, DW-29; use the slots as #4's Pipeline screen does: the crumb and eyebrow text, the `h1` title, the badges as supporting content) and you return the BODY of the band only: WP04's screen file draws the `data-region="header"` wrapper around what you return (panel ownership). The band wraps (becomes a column) at the one-column threshold, which WP04's layout already sets: you add only inner flex/gap layout through `headerStyles` with `--sk-*` tokens; no colour, font or size literal. No hand-rolled band, no `sk-status-indicator` (the status is the `sk-pill-tag`).
3. The `h1` is the page heading (`h1` is the Work Package title when present, else `wpId`); the status badge text and the actor badge text are DOM text (NFR-011).
4. Pills are `sk-pill-tag`; the status is never colour alone (the lane word is the pill text).

**Files**: `header-parts.ts`, `wp-header-parts.test.ts`. **Edge cases**: a very long title wraps between words and never mid-word (a single over-long word ellipsizes with the full text as the accessible name and a title tooltip, as #4 ruled: reuse `overflow-region.ts` if #4's pattern applies, do not hand-roll); `stalenessView` role `row` or `none` draws nothing in the header.

### T030 Facts, Assignment, Frontmatter

**Purpose**: the left column's three panels, each only with what the contract carries.

**Steps** (red-first with `wp-facts-parts.test.ts`):
1. `renderFacts(view)`: a `dl` (the adopted `sk-facts*` classes, E-17, in this file) with the rows Work Package (`wpId`), Committed state (the status lane word and tone of the header badge, `resolveStateBadge(statusLane)` as the header uses it: a null lane gives `NOT_STARTED_BADGE`, an unknown lane its raw text with the neutral tone; the prototype shows the same lane word as a badge; this row is always drawn, the `WorkPackage` carries no other committed-state field and nothing is invented), Actor (the same joined string as the header), Target branch (`mergeTargetBranch`) and, each ONLY when present: Phase (`phaseLabel`), Task type, Tracker refs (empty array draws no row), Last transition (relative text through `resolveActivity` with ISO fallback), Forced transitions (`forceCount` as given, text with the number), Implementer of record. A null or empty value draws no row and no label.
2. Staleness in Facts (D-08): role `row` draws a quiet row (`FRESH_TEXT` for fresh; for a status that is not a table key the RAW status text, never nothing, never `undefined`); a `not_applicable` status draws NO visible element but carries visually hidden text through `visually-hidden.ts`: `STALENESS_NOT_APPLICABLE_TEXT(reason)` ("Staleness: not applicable, <reason>", reason through `STALENESS_REASON_WORDS`, raw fallback, a null reason drops the clause); an absent staleness (null or the property omitted) draws nothing at all.
3. `renderAssignment(view)`: the body (the panel heading is the screen's) with seven separate rows (agent, assignee, role, profile, version, model, provider), each only when non-null, and the authored recommendation (role, profile, model) as a SECOND labelled group (`h3`), never merged with the assigned values; an all-null group is not drawn; no placeholder (DW-21).
4. `renderFrontmatter(view)`: dependencies as titled `sk-pill-tag` pills, plain and NOT actionable (P-7, DW-7 as amended: a dependency is a control only as a node of the Dependency chain, so no two controls share an accessible name); requirement references as pills; priority and execution mode as rows, each only when present. The panel is drawn on every Work Package; with nothing present it still shows its heading with the quiet empty form from WP04's `renderEmptyForm`.
5. You return panel BODIES only (panel ownership): WP04's screen file draws the three panels with `renderPanel` and the ids `facts`, `assignment`, `frontmatter` (the Assignment panel only when a group has a non-null member, per the "Drawn when" table); call no `renderPanel` and write no `data-region`.
6. `factsStyles`: layout only (gaps, wrapping of long values).

**Files**: `facts-parts.ts`, `wp-facts-parts.test.ts`. **Edge cases**: the dependency pills read the RESOLVED dependencies (`ResolvedLists`, bare form: id only; detail form: id and title), never the raw payload lists; a handle-only actor shows only that handle in the badge, the row and the Assignment (WP-18); a three-null redacted actor shows no badge and no assignment rows (WP-19).

### T031 The ten stories: `Screens/Work Package/Header and facts`

**Purpose**: one story per state-matrix row you own, in the shell frame.

**Steps**: create `sk-work-package-screen.header-facts.stories.ts` (title `Screens/Work Package/Header and facts`, 10 stories, dark theme, 1280 px, inside `shellFrame({ layout: 'mission', current: <work packages item>, flush })`), with the fixture and pairing of the catalogue: WP-01 (`wpPopulated` + `detailPopulated`, `cycles: 'none'`: the Review panel shows the empty summary form and the none-found cycles statement, the screen as shell content, FR-037); WP-09 (`wpNoEvents`); WP-17 (`wpActorStructured`); WP-18 (`wpActorHandle`); WP-19 (`wpActorRedacted`); WP-20 (`wpStale`); WP-21a (`wpFresh`); WP-21b (`wpNotApplicable`); WP-22 (`wpStalenessOmitted`); WP-38 (`wpFactsNull`). Build props ONLY with WP04's `fixtures.ts` builders and `pairDetail`; add nothing to it: WP04 created a builder for every fixture name, so a gap is a change request to the orchestrator (the file is WP04's alone). The ids follow the catalogue so WP10's row-to-story test finds exactly these ten. `tags` carry `vw-1280`-style tier tags as #4 does. Stories contain no path, username or e-mail. Story id convention (contract, Story catalogue): the export name is `Wp` + the row number in two digits + the optional lowercase letter (`Wp01`, `Wp21b`, `Wp36a`), and `tags` carries exactly one row tag `wp-<NN><letter>` in lowercase (`'wp-01'`, `'wp-21b'`) beside the tier tag `vw-<n>` and any `tab-<n>` tag; WP10's parser reads the `wp-` tag and cross-checks it against the export name.

**Validation**: exactly 10 stories discovered for the title; `pnpm build-storybook` builds; the regions you do not own render as their stubs (empty), which is expected until the chains merge in WP10. **Edge cases**: WP-21b and WP-22 render the SAME visible output (nothing for staleness), differing only by the hidden text; both stories exist because the tests need both.

### T032 Tests: EV-4, DOM absence with presence controls, omitted versus null, hidden text

**Purpose**: behaviour proofs the stories cannot give.

**Steps** (all red-first; one deliberate revert per file listed in the hand-off):
1. `sk-work-package-screen.events-4.test.ts` (EV-4): activating the Mission crumb emits `sk-open-mission` exactly once with `{ missionId, slug }` (`toEqual`), `bubbles` and `composed` true, not cancelable, against WP04's crumb renderer and dispatch method; with `mission` null the crumb is inert and emits nothing, WITH a positive control in the same test (the same listener receives the event once `mission` is set); the Enter and Space keys operate it (the control is the `sk-button` the contract names, `variant="ghost"`, inside the breadcrumb list item: assert the element is an `sk-button`, not an `a` or a raw `button`, and that the key activation reaches the handler through it). Do not re-emit anything else: assert no other `sk-*` name was seen.
2. `wp-header-parts.test.ts`: null lane gives "not started" and no actor badge (WP-09, FR-021); an unknown lane value shows raw (`on_hold`-style, built by cast); actor badge text for structured, handle-only and redacted actors; the staleness badge only for `stale`, minutes as given and dropped when null; the `h1` text equals the title; `fresh`, `not_applicable` and an unknown status draw no header badge; the contract's provisional-staleness example `wpProvisional` drawn through the screen shows exactly what `stalenessView` says for its status (badge, quiet row or nothing) with its minutes and reason words and no `undefined`.
3. `wp-facts-parts.test.ts`: DOM-absence tests, each paired with a sibling fixture where the row is present (positive control): a null or empty value draws no row, no label text (WP-38 against WP-01); the Committed state row shows the same lane word as the header badge for a known lane, "not started" for a null lane and the raw text for an unknown lane (Committed-state rule), paired with the header badge text of the same fixture; staleness `fresh` draws the quiet row, an unknown status draws its raw text (foreign value, built by cast), `not_applicable` draws NO visible staleness element and the visually hidden text "Staleness: not applicable, <reason>" is found by a DOM text query (WP-21b) while the omitted fixture (WP-22) has neither element nor text, and null staleness equals omitted in the visible output (omitted versus null versus `not_applicable` as the paired tests the contract requires); Assignment: authored never merged with assigned; an all-null group not drawn; Frontmatter dependencies are plain pills (no control, no tab stop) and a dependency name appears in exactly one control across the whole screen (the chain node is WP07's; assert here that the Frontmatter has none).
4. Counts with equality: each loop over fixtures asserts N.

**Validation**: `pnpm test` lists all three files with reporter pass above 0; each test fails when the behaviour it proves is reverted.

### T033 Layout CSS, exceptions check and the data-driven self-check

**Steps**: keep `headerStyles` and `factsStyles` layout-only with `--sk-*` tokens; `pnpm lint:styles` green; any `class=` in your two files carries an approved prefix of WP04's E-17 rows (`sk-breadcrumbs*` is the crumb renderer's, already complete; `sk-facts*` is yours in `facts-parts.ts`); if you need a class WP04 did not grant, that is a change request, not an edit of the lint config. Run the self-check list: no verdict, change-state, staleness-status or `review_cycle` string literal and no `=== '<word>'` in your files; `pnpm lint:data-driven && pnpm test:data-driven` green.

### T034 Side-by-side hand-over (no PNG committed)

**Steps**: for EACH of your ten stories produce an uncommitted side-by-side screenshot against `<prototype>/04-work-package.html` (the matching `?wp=` state: WP01 / WP03 / WP04 as the catalogue says) inside the pinned container: `pnpm visual` may be run to obtain the actual images for the missing snapshots (its red is expected and is NOT an exit check); never run `pnpm visual:update`; stage no PNG. Read each image and describe it in the hand-off (what is drawn, the width, any difference). Map every visible difference to a DW item of the register AS CONFIRMED at CP-1, or list it as an unconfirmed difference (a REJECT item) and fix it. Regions of other work packages are empty in your captures: say so, and compare only your regions.

## Test strategy

Positive controls: the EV-4 no-event assertion has the same-listener positive control; every DOM-absence test has a sibling fixture where the element is present; the hidden-text query is paired with the omitted fixture. Exactly-one-event: EV-4. Revert checks (listed per file): events-4 (drop `composed`; fire on keydown of any key), header (render the stale badge for every status), facts (draw the row for null values; draw visible text for `not_applicable`). Foreign values: unknown lane, unknown staleness status and reason (cast) render raw, never `undefined`. Exit evidence: `pnpm visual` is NOT an exit check of this work package (its stories have no committed baseline until WP10, so missing snapshots are the known red); the exit evidence is the uncommitted side-by-side screenshot per story against the prototype, no PNG committed. All other gates of the list green.

## Definition of Done

- `header-parts.ts` and `facts-parts.ts` bodies complete with every signature unchanged; the crumb renderer untouched.
- Ten stories exist (exactly), built only from `fixtures.ts` builders.
- Tests pass with listed revert checks; DOM-absence tests have presence controls; the hidden-text test is by DOM text query.
- Hand-off lists commit hashes verified with `git cat-file -t`, the ten side-by-side images read and described with each difference mapped to a confirmed DW item or flagged, change requests, and any out-of-map edit (none expected).
- No PNG staged; no file outside `owned_files` edited.

## Risks

- Hand-rolled chrome tempts: pills are `sk-pill-tag`, panel containers are WP04's (`renderPanel`, drawn in the screen file), the band is `sk-page-header`, rows use the `sk-facts*` classes (E-17); anything else is a review failure.
- Copy comes only from `wp-copy.ts` (CP-1 copy list); a string typed in a part file is a defect.
- The row staleness for an unknown status must show the raw text (FR-023); the easy mistake is dropping it.
- Your captures show stubs for the other regions: do not "fix" that by drawing them.

## Reviewer guidance

Check against the DW register as the CP-1 entry and the register state them: DW-1 to DW-7, DW-12, DW-15, DW-21 and DW-29 only (plus the inherited DW-23 and DW-30), each as the register states (DW-12 is confirmed); DW-7 as amended (dependency pills plain); any other difference is REJECT. Verify the actor badge joins handles with a colon and is absent for three nulls; the stale badge only for `stale`; `fresh` a quiet row; `not_applicable` visually hidden text found by a DOM query and nothing visible; an omitted staleness draws nothing and no hidden text. Check Assignment never merges authored with assigned; the Frontmatter has no control; no `sk-breadcrumbs*` class outside `renderBreadcrumb`; no literal of the self-check list; counts asserted with equality; the ten side-by-side images each mapped to confirmed drift. The reviewer is a separate agent; it re-runs two revert checks and rejects any difference from the prototype that the CP-1 entry did not confirm.


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
