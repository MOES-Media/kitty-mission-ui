---
work_package_id: WP08
title: States (chain Y)
dependencies:
- WP07
requirement_refs:
- FR-024
- FR-025
- FR-026
- FR-027
- FR-028
- FR-031
- FR-035
- FR-036
- FR-037
- NFR-011
- SC-004
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T12:23:25.789850+00:00'
subtasks:
- T047
- T048
- T049
- T050
- T051
phase: Phase 2 - Regions
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-work-package-screen/
create_intent:
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.states.stories.ts
- packages/mission-ui/test/sk-work-package-screen.states.test.ts
- packages/mission-ui/test/sk-work-package-screen.events-3.test.ts
- packages/mission-ui/test/sk-work-package-screen.events-7.test.ts
- packages/mission-ui/test/wp-state-parts.test.ts
- packages/mission-ui/src/elements/sk-work-package-screen/state-parts.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-work-package-screen/state-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.states.stories.ts
- packages/mission-ui/test/sk-work-package-screen.states.test.ts
- packages/mission-ui/test/sk-work-package-screen.events-3.test.ts
- packages/mission-ui/test/sk-work-package-screen.events-7.test.ts
- packages/mission-ui/test/wp-state-parts.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP08 - States (chain Y) (IC-07)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the bodies of `state-parts.ts` other than `renderEmptyForm` (which WP04 wrote complete): the whole-screen states (`loading`, `error`, `empty`, `not-found`, `nothing-selected`) and the regional detail notice and busy indicator; build the eight stories of `Screens/Work Package/States`; and prove with tests the retry and return events (EV-3, EV-7), the region-set property (SC-004), the payload rule (one test per branch), the unknown refusal code, the focus order of the retry and return states and the focus-restoration test for the whole-screen retry trigger (the detail-retry trigger is WP09's: its h1 is drawn by WP05's header, a stub in this lane). The status switch and the regional-notice switch in the screen file were wired by WP04: you fill what they call, you never edit the screen file. Note on `create_intent`: `state-parts.ts` appear there only so that finalize-tasks finds the literal paths; each file is created as a stub by WP04 and replaced here (you edit it, you do not create a second one, and every signature stays).

PRECONDITION (file precondition, first step): checkpoint CP-1 has completed (see "First step").

## Context

Read `plan.md` (IC-07, "Shared files"), `contracts/sk-work-package-screen.md` (Rendering by `status`; Regions and the region-set test; Semantics; Announcements; Behaviour rules; Focus order; Story catalogue rows for `States`; "Test obligations by owner" IC-07; "Part signatures"), `contracts/defaults.md` (`refusals.ts`, `wp-copy.ts`, `resolveRefusal`, `retryDetail`), `data-model.md` ("View states", the two "no detail" paths, "Events" payload rule), `research.md` D-03, D-04 (payload rule), D-14, D-17, `spec.md` (Q7, FR-024 to FR-028, DW-25 to DW-28, state rows WP-36 to WP-43, EV-3, EV-7, SC-004), and the WP04 hand-off (`StatusContentView`, `DetailNoticeView`, the handler shapes).

Requirements: FR-024 (`detailStatus` governs the detail regions only; refused detail is one regional notice with retry), FR-025 (whole-screen states with the #4 panel look and host-neutral copy), FR-026 (not found: "Task detail unavailable", "Return to Pipeline" emitting `sk-open-mission`, header with crumb and id only), FR-027 (nothing selected), FR-028 (view-state contract: each state is a story), FR-031 (retry focus restoration; text for refusal), FR-036 (the stories this WP authors, one per catalogue row, ids by the story id convention), FR-035 (EV-3 and EV-7 tests), FR-037 (WP-43 in `shellFrame` is the screen as shell content with nothing selected), NFR-011, SC-004 (a refused or pending detail leaves 100 percent of the 1.0 regions and replaces exactly the detail regions with one notice).

Reused: WP04's complete `renderEmptyForm` (every regional or whole-screen empty form calls it; no other file carries `sk-empty-state*`) and complete `renderBreadcrumb` in `header-parts.ts` (the not-found header uses it; you import it and never re-implement a crumb); #4's loading and error panel look (`sk-notice`, labelled indeterminate progress) and its host-neutral copy rule (DR-5).

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP07. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics", and checks the CP-1 ancestry); do not create, switch or reset branches yourself.

## First step: CP-1 file precondition

Before any edit confirm the `CP-1 confirmed` entry in `tracer-design-decisions.md` and `git merge-base --is-ancestor <CP-1 commit> HEAD` (the dispatch names the commit). If absent: STOP and report. DW-25 to DW-28 are yours (not-found copy, nothing-selected shape, loading and error looks including the data-less loading header band, the partial-detail notice), plus DW-29 for the data-less header bands of loading and not-found (the page header keeps its frame, #4 D-33); DW-23 (placement) and DW-30 (panel look) are inherited from the skeleton (WP04) and built as the register states (DW-30 is confirmed with the narrowed E-18; DW-23 awaits the Storybook review), plus the confirmed copy list for the states (`wp-copy.ts`).

## Subtasks

### T047 Whole-screen states

**Purpose**: the frame stays, the state's own content replaces the screen content only.

**Steps** (red-first with `wp-state-parts.test.ts`):
1. `renderStatusContent(view, handlers)` returns, per `status`:
   - `loading`: a visible busy indicator (labelled indeterminate progress, `aria-busy`, NO `role=status` and no live text: the announcement belongs to the one live region WP04 wired), the data-less header band (registered drift under DW-27, #4 D-33 precedent: page headers keep their frame; the data-less loading header: an element with `data-region="header"` that YOU draw in `renderStatusContent`, an `sk-page-header` holding WP04's complete `renderBreadcrumb` and an `h1` with `wpId`, or "Choose a Work Package" when `wpId` is empty; no title, no badges; you never call `renderHeader`, which is chain X's and may still be a stub in your lane), no panels. The `sk-progress*` class is your file's E-17 prefix.
   - `error`: an `sk-notice` (assertive alert: the only announcer of an error) with the body from `errorMessage` or the default `WP_ERROR_BODY`, and a retry `sk-button` that calls `handlers.onRetry('work-package')` (WP04's dispatch builds `sk-retry-load` `{ missionId, wpId, target: 'work-package' }`); none of the panels.
   - `empty` (and `ready` with `workPackage` null): WP04's `renderEmptyForm(WP_EMPTY_BODY, WP_EMPTY_HEADING)` panel (body text first, optional heading second), host-neutral copy.
   - `not-found`: the same data-less header form (`data-region="header"`, `sk-page-header`, WP04's `renderBreadcrumb` and the `wpId` ONLY; a 404 has no title; the `h1` is the `wpId`), the panel "Task detail unavailable" (`NOT_FOUND_HEADING`, `NOT_FOUND_BODY` host-neutral) and a "Return to Pipeline" `sk-button` (`RETURN_TO_PIPELINE_LABEL`) that calls `handlers.onOpenMission` (WP04 emits `sk-open-mission` `{ missionId, slug }`, the same event as the crumb: P-1; there is no `sk-open-pipeline`).
   - `nothing-selected`: eyebrow `NOTHING_SELECTED_EYEBROW` ("Mission"), `h1` `NOTHING_SELECTED_HEADING` ("Choose a Work Package"), the Mission `slug` and "N Work Packages" from #4's `LANE_COUNT_TEXT` with `mission.workPackageCount` AS GIVEN; the sidebar wording only if the confirmed copy says so.
2. The one `h1` rule (contract Semantics table): every whole-screen state draws an `h1` EXCEPT `error` and `empty` (which draw no header and no `h1`); `loading`, `not-found` and `nothing-selected` draw one, with the title/`wpId`/"Choose a Work Package" rule the screen's; you supply the content. Controls that need `missionId` (retry, return) are inert when `mission` is null (the flag WP04 passes).
3. Whole-screen states draw NO `data-region` id of a ready screen except `header` in `loading` and `not-found` (the data-less headers above); `error`, `empty` and `nothing-selected` draw none.

**Files**: `state-parts.ts`, `wp-state-parts.test.ts`. **Edge cases**: `errorMessage` empty uses the default; a very long `errorMessage` wraps between words; `nothing-selected` with `mission` null draws the heading with no slug and no count (no `undefined`).

### T048 Regional detail notice and busy indicator

**Purpose**: Q7 and SC-004: the detail may fail alone.

**Steps**:
1. `renderDetailNotice(view, onRetry)` draws the BODY of the ONE `detail-notice` wrapper that WP04's screen file draws inside the Review panel in place of the three detail-only regions (`review-cycles`, `workspace`, `artifact-links`; panel ownership: you write no `data-region`), only when `detailStatus` is `loading`, `error` or `not-found` (the screen file decides the position and the call; you decide the content):
   - `loading`: a busy indicator labelled `DETAIL_LOADING_LABEL`, no panels, no live role of its own.
   - `error` and `not-found`: an `sk-notice` headed `DETAIL_REFUSAL_HEADING` naming the refusal in WORDS through `resolveRefusal(detailRefusalCode)` (`not_found` and `source_unreadable` through `DETAIL_REFUSAL_WORDS`; an unknown code shows its RAW text; a null code shows the generic `DETAIL_REFUSAL_GENERIC`: the screen never claims a code the host did not give) and a retry `sk-button` (`DETAIL_RETRY_LABEL`) calling `onRetry('detail')` (WP04's `retryDetail` builds `sk-retry-load` `{ missionId, wpId, target: 'detail' }`). The notice carries NO live role (the announcement belongs to the one live region: `ANNOUNCE_DETAIL_UNAVAILABLE` once), so nothing is announced twice.
2. The 1.0 regions (and the three overlapping lists in their bare 1.0 forms) stay exactly as under `ready`: you add no condition to any other part.
3. `detailStatus` `ready` with `detail` null (omitted by the host) draws NOTHING here: no notice, no claim that anything is missing.

**Files**: `state-parts.ts`. **Edge cases**: unknown `detailStatus` has been collapsed to `error` by WP04: the notice then uses the generic wording when the code is null.

### T049 The eight stories: `Screens/Work Package/States`

**Steps**: create `sk-work-package-screen.states.stories.ts` (title `Screens/Work Package/States`, 8 stories, dark, 1280 px, `shellFrame`): WP-36a (`detailStatus: 'not-found'`, `wpPopulated`, `detailRefusalCode` taken from `detailRefusalNotFound`'s `code`); WP-36b (`detailStatus: 'error'`, `wpPopulated`, code from `detailRefusalUnreadable`); WP-37 (`detailStatus: 'loading'`, `wpPopulated`); WP-39 (status `loading`, no fixture); WP-40 (status `empty` with `workPackage` null, no fixture); WP-41 (status `error`, no fixture); WP-42 (status `not-found`, `wpId` and `mission` only); WP-43 (status `nothing-selected`, `mission` only; this is the screen as shell content with nothing selected, FR-037). For WP-36 and WP-37 the detail is `null` (the detail is pending or refused; the bare lists show). Build ONLY with WP04's `fixtures.ts`. WP-42 draws its crumb with the WP04 renderer. Exactly 8 stories discovered for the title. Story id convention (contract, Story catalogue): the export name is `Wp` + the row number in two digits + the optional lowercase letter (`Wp01`, `Wp21b`, `Wp36a`), and `tags` carries exactly one row tag `wp-<NN><letter>` in lowercase (`'wp-01'`, `'wp-21b'`) beside the tier tag `vw-<n>` and any `tab-<n>` tag; WP10's parser reads the `wp-` tag and cross-checks it against the export name.

### T050 Tests

**Steps** (red-first; revert check per file listed in the hand-off):
1. `sk-work-package-screen.events-7.test.ts` (EV-7): retry on `error` emits `sk-retry-load` exactly once with `toEqual({ missionId, wpId, target: 'work-package' })`; retry on a refused detail (`error` and `not-found`) emits `target: 'detail'`; `bubbles`, `composed`, not cancelable; positive control for every no-event case; inert with `mission` null (then emits nothing, with the same positive control).
2. `sk-work-package-screen.events-3.test.ts` (EV-3): "Return to Pipeline" emits `sk-open-mission` exactly once with `toEqual({ missionId, slug })`, the same event as the crumb; no `sk-open-pipeline` is ever seen.
3. `sk-work-package-screen.states.test.ts`:
   - Region-set test (SC-004), with `ready` and `detail` present as the POSITIVE CONTROL: under `detailStatus` `loading`, `error` and `not-found` the set of `data-region` ids equals the ready set minus exactly the detail-only ids (`review-cycles`, `workspace`, `artifact-links`) plus the one `detail-notice`; with `detailStatus` `ready` and `detail` null it equals the ready set minus the detail-only ids and has NO `detail-notice`; under whole-screen `loading` and `not-found` the set is exactly `header`, under `error`, `empty` and `nothing-selected` it is empty (no panel id). The test asserts it found EXACTLY the 13 ids `wpPopulated` + `detailPopulated` draw (anti-vacuity). Because WP04's screen file draws every container and id (panel ownership), the test needs no other chain: it runs in your lane with chain X's parts still stubs (empty bodies, ids present); the whole-screen `header` id under `loading` and `not-found` is YOUR `renderStatusContent` output, the one exception to the screen-draws-every-id rule (panel ownership); say so in the hand-off.
   - Detail input rule: for each of `detailStatus` `loading`, `error` and `not-found` with a populated `detail` still passed (use `detailPopulated` paired with a Work Package whose subtask, dependency and owned-file entries have titles and change states differing from the bare ids), the DOM shows the three lists in their bare 1.0 forms (ids only, no detail title, no change-state badge) and none of the detail-only regions, with the positive control that `detailStatus` `ready` with the same props shows the detail forms; and the element-level test of `detail` null with `detailStatus` `ready` (bare lists, no detail-only region, no `detail-notice`, no "none" claim). These tests are yours (WP04 owns the rule's code, you own its proof); a failure is a change request to the orchestrator.
   - The empty-panel line: WP-40 draws the frame and the neutral empty copy (one assertion).
   - The unknown refusal-code test: a foreign `detailRefusalCode` shows its raw text and a null code shows the generic wording, never `undefined`.
   - Payload-rule tests, ONE PER BRANCH, driven through the retry and return controls: the id comes from the `wpId` property when set; else from `workPackage.wpId`; else from `detail.wpId`; a detail whose `wpId` differs from `workPackage.wpId` is treated as omitted (bare lists, no detail-only region, no notice, and retry payloads use the Work Package's id); with `mission` null the controls that need `missionId` (crumb, retry, return) are drawn inert and emit nothing (positive control: set `mission`).
   - Focus order for the retry and return states (retry or return is the tab stops the state draws; Tab reaches it in documented order, with a visible ring); focus-restoration test for the whole-screen trigger (Retry of the whole screen, error to loading; the Retry of the detail trigger is WP09's, because its target h1 is drawn by WP05's `renderHeader`, a stub in this lane): the previously focused element is detached and focus lands on the `h1` (or the root `tabindex=-1` element when no `h1` is drawn: the states `error` and `empty` draw none, so the root-fallback test detaches the focused element on a change into `error` or `empty`; `loading` always draws an `h1`); a negative control (no detach, focus stays).
4. Counts with equality; every loop asserts N.

**Validation**: each file lists in `pnpm test`; each fails when its behaviour is reverted (for example: drop the `target`, treat a mismatched detail as present, draw the notice for `ready` with `detail` null).

### T051 Side-by-side hand-over (no PNG committed)

**Steps**: for EACH of the eight stories produce an uncommitted side-by-side screenshot against `<prototype>/04-work-package.html` (`?wp=WP01` and `?wp=WP02` for "Task detail unavailable"; `?state=unselected` for nothing selected; the prototype has no loading or error state: compare to #4's loading and error panel look, as DW-27 says; WP-36 and WP-37 to #4's notice and loading look) in the pinned container (`pnpm visual` for actual images only; its red is the known red and NOT an exit check; never `pnpm visual:update`; no PNG staged). Read and describe each image; map every difference to a DW item as the CP-1 entry and the register state them (DW-25 to DW-28) or flag it as unconfirmed and fix it. If the other chain is not merged in your lane, say so: your ready-state captures (WP-36, WP-37) show stubs for the regions of chain X.

## Test strategy

Positive controls: every no-event or inert assertion shares its listener with a positive control; the region-set test uses `ready` with detail as its positive control and asserts the anti-vacuity floor. Exactly-one-event: EV-3 and EV-7. Revert checks per file (listed). Foreign values: unknown refusal code (raw), null code (generic), unknown `status` (collapses to `empty`), unknown `detailStatus` (collapses to `error`). One test per payload-rule branch and the whole-screen focus-restoration test (the detail-retry and dependency-node triggers are WP09's). Exit evidence: `pnpm visual` is NOT an exit check of this work package (its stories have no committed baseline until WP10, so missing snapshots are the known red); the exit evidence is the uncommitted side-by-side screenshot per story against the prototype, no PNG committed. All other gates green.

## Definition of Done

- `state-parts.ts` bodies complete (every signature unchanged; `renderEmptyForm` untouched); no edit of the screen file; no dispatch in a part.
- Eight stories (exactly); host-neutral copy from `wp-copy.ts`.
- EV-3, EV-7, region-set, payload-rule, refusal, focus-order and focus-restoration tests pass with listed revert checks.
- Hand-off lists commit hashes verified with `git cat-file -t`, eight side-by-side images read and described with differences mapped to confirmed DW items, change requests (for example a screen-file switch that does not call you as the contract says) and out-of-map edits (none expected).
- No PNG staged; nothing outside `owned_files` edited.

## Risks

- The region-set test needs the regions of both chains to be meaningful: coordinate through the hand-off, never by editing another chain's files.
- Announcing twice (the notice plus the live region) is the easy defect: the detail notice carries no live role; the error notice is the only error announcer.
- A copy string that names the host ("the dashboard", "the app") breaks DR-5: all copy is host-neutral and lives in `wp-copy.ts`.
- Inert controls must be inert, not merely silent: they must not be focusable stops that do nothing, per the confirmed behaviour (draw them as non-activatable, tested).

## Reviewer guidance

Check DW-25 to DW-29 (plus the inherited DW-23 and DW-30) against the CP-1 entry; not-found shows crumb and id only, "Task detail unavailable" and one return action emitting `sk-open-mission`; nothing-selected shows the eyebrow, heading, slug and count as given; the loading indicator has no `role=status`; the error notice is the only error announcer; the detail notice is one element, not three, with no live role, and the 1.0 regions are untouched (SC-004); an unknown code shows raw; payload branches each tested; focus restoration tested per trigger with a negative control; copy is host-neutral; no self-check literal. The reviewer is a separate agent; it re-runs two revert checks and rejects any unconfirmed difference from the prototype or from #4's panel look.


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
