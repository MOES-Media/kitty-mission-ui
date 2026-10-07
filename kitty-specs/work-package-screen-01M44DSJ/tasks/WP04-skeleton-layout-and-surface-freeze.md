---
work_package_id: WP04
title: 'Foundation: skeleton, layout and surface freeze'
dependencies:
- WP03
requirement_refs:
- FR-001
- FR-028
- FR-029
- FR-030
- FR-032
- FR-035
- FR-038
- C-001
- C-003
- C-005
- C-010
- NFR-005
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T09:41:42.338325+00:00'
subtasks:
- T022
- T023
- T024
- T025
- T026
- T027
- T028
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/elements/sk-work-package-screen/
create_intent:
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.ts
- packages/mission-ui/src/elements/sk-work-package-screen/panel-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/fixtures.ts
- packages/mission-ui/test/sk-work-package-screen.skeleton.test.ts
- packages/mission-ui/src/library-sheets.ts
- packages/mission-ui/test/surface-freeze.test.ts
- scripts/stylelint-exceptions.test.mjs
execution_mode: code_change
owned_files:
- packages/mission-ui/src/index.ts
- packages/mission-ui/custom-elements.json
- packages/mission-ui/src/library-sheets.ts
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.ts
- packages/mission-ui/src/elements/sk-work-package-screen/panel-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/fixtures.ts
- packages/mission-ui/test/sk-work-package-screen.skeleton.test.ts
- packages/mission-ui/test/surface-freeze.test.ts
- stylelint.config.mjs
- eslint.config.mjs
- scripts/stylelint-exceptions.test.mjs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP04 - Foundation: skeleton, layout and surface freeze (IC-03b)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Create `sk-work-package-screen` with its FULL public surface (ten properties, four events), the real container-query layout (three, two and one columns), the panel wrapper, a stub of EVERY other part file with its final export signatures, the not-found and breadcrumb renderer and the shared regional empty-form helper written COMPLETE, the status and regional-notice switches, the focus rule, the two adopted library sheets, the exceptions as ruled, fixture builders and `pairDetail`, one skeleton test per event and the layout cases, the surface-freeze test, registration, and the ONE manifest regeneration that freezes the surface. After this work package no region work package edits the screen file, `library-sheets.ts`, `panel-parts.ts`, the lint configs, `index.ts` or the manifest: they replace stub bodies only.

PRECONDITION: checkpoint CP-1 has completed (file precondition, T022).

## Context

Read `plan.md` (IC-03b, CP-1, "Shared files", "Lane mechanics" item 5, "Architecture" layout table), `contracts/sk-work-package-screen.md` (authoritative: properties, events, rendering by `status`, layout, regions, semantics, announcements, focus order, "Part signatures", "Dependencies on #4"), `data-model.md` (view states, `WpScreenMission`, events, payload rule), `research.md` D-01 to D-05, D-12, D-13, D-14, D-16, `contracts/gates.md` (E-17 to E-20), `contracts/defaults.md`, the WP03 spike report as recorded by the orchestrator in `tracer-design-decisions.md`, and #4's "Add an element" recipe and its Pipeline screen files (`sk-pipeline-screen`, `card-parts.ts`, `shell-frame.ts`) as the code precedent.

Requirements: FR-001 (element and ten properties), FR-028 (view-state contract with `not-found` and `nothing-selected`), FR-029 (responsive columns by container thresholds), FR-030 (keyboard and focus: the focus rule), FR-032 (typed properties and events, surface frozen, `manifest:check` green), FR-035 (one skeleton test per event), FR-038 (elements over CSS, exceptions), C-001, C-003 (read-only: the screen only asks the host to read again, `sk-retry-load`), C-005, C-010, NFR-005 (no I/O: the `no-io` gate scans every new file) (renders inside `sk-mission-shell` with `flush`).

Reused from #4 by import (never copy): `view-state.ts` (`ViewState`, `normaliseViewState`), `library-sheets.ts`, `progress-sheet.ts`, `visually-hidden.ts`, `overflow-region.ts`, `story-support/shell-frame.ts`, `logic/labels.ts` (`LabelHooks`), the event detail types `SkSelectWorkPackageDetail` (from `sk-work-package-board`) and `SkOpenMissionDetail` (from `sk-missions-screen`) with `import type`. `WorkPackageView` (#4's) stays untouched: this screen's type is `WorkPackageRecordView`.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP03. Start from the approved parent's tip (the orchestrator pre-creates the lane from the approved WP03 tip, merges the target branch in so the CP-1 entry is present, and verifies the ancestry before dispatch per `plan.md`, "Lane mechanics" item 5); do not create, switch or reset branches yourself.

## Subtasks

### T022 FILE PRECONDITION (first step, first exit check)

Before anything else confirm that `tracer-design-decisions.md` (in this mission's directory, read-only for you) contains a dated entry (headed "CP-1 operator rulings (2026-10-05)", the `CP-1 confirmed` entry) naming the seven confirmed DW items (DW-10, DW-11, DW-12, DW-16, DW-17, DW-24, DW-30), the 24 items left to the operator's Storybook review, and the decisions for the conditional exceptions (E-18 narrowed and approved, E-19 (a) deleted, E-20 dropped) and the two container thresholds (848 and 688 px). Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree, where `<CP-1 commit>` is the hash the dispatch names. If the entry is absent or not an ancestor: STOP and report; do not start; never write the entry yourself. The reviewer REJECTS if it was not present before your first commit (`git merge-base --is-ancestor <CP-1 commit> <first WP04 commit>`; the first WP04 commit follows the orchestrator's merge commit). Also read the spike outcomes there: they decide T027 and the thresholds of T023.

### T023 The screen element: surface, switches, layout, dispatch, focus

**Purpose**: the one file everything else plugs into; frozen at the end.

**Steps** (red-first with the skeleton test of T026):
1. Class `SkWorkPackageScreen` in `sk-work-package-screen.ts`, `@screen`, with exactly ten properties: `status` (attribute `status`, reflected, default `'loading'`, unknown collapses to `empty` via a local `normaliseWpStatus` that uses #4's `normaliseViewState` for the four charter states and an allow-list for `not-found` and `nothing-selected`), `detailStatus` (`detail-status`, default `'ready'`, unknown collapses to `error`), `detailRefusalCode` (no attribute, `string | null`, default null), `workPackage` (`WorkPackageRecordView | null`), `detail` (`WorkPackageDetailView | null`), `mission` (`WpScreenMission | null`), `wpId` (`wp-id`, default `''`), `now` (`now`, default null), `labels` (`LabelHooks | null`), `errorMessage` (`error-message`, default `''`). `WpScreenStatus`, `DetailStatus` and `WpScreenMission` are declared in this file (not in `view-state.ts`). No `laneGroups`.
2. `@fires` for all four events, with typed details: `sk-select-work-package` (`SkSelectWorkPackageDetail`, imported), `sk-open-mission` (`SkOpenMissionDetail`, imported), `sk-open-artifact` (`SkOpenArtifactDetail { missionId, path, kind }`, new, exported here), `sk-retry-load` (`SkRetryLoadDetail { missionId, wpId, target }`, new, exported here). EXACTLY ONE literal `dispatchEvent(new CustomEvent<T>('sk-...', { detail, bubbles: true, composed: true }))` per event in this file, never in a part file. The payload builders take `missionId` from `mission.missionId` and the Work Package id from ONE chain: `wpId` property, then `workPackage.wpId`, then `detail.wpId` (`retryDetail` from WP02's `logic/wp-retry.ts` plus small literal builders). Controls that need `missionId` are handed to parts as INERT (a handler that does nothing and a flag to draw them inert) when `mission` is null. The Open-review handler reads `REVIEW_CYCLE_ARTIFACT_KIND` from `defaults/review.ts`; the screen never writes the literal.
3. Rendering by `status` (table in the contract): `loading`, `error`, `empty` (also `ready` with `workPackage === null`), `ready`, `not-found`, `nothing-selected`; the status switch and the regional-notice switch (for `detailStatus` `loading`, `error`, `not-found`, drawn ONCE at the position of the first detail-only region, in place of the three detail-only regions) call into `state-parts.ts` stubs. Compute `ResolvedLists` once through `resolveLists`, passing `detail` ONLY when `detailStatus` is `ready` and `null` under `loading`, `error` and `not-found` (the detail input rule: a stale detail never mixes detail-form lists with the notice; WP08 owns the tests); draw every `data-region` element of the `ready` screen here (the header band of the data-less `loading` and `not-found` states is the one exception: `state-parts.ts` draws it, panel ownership exception); build every `<Region>View` here, each returning `null` for the contract's 'not drawn' form (table "Containers and drawn-when" of `contracts/sk-work-package-screen.md`); parts never read the raw payloads.
4. Layout: host `container-type: inline-size`; the grid with the CP-1 container thresholds (`@container (min-width: 848px)` three columns, `@container (max-width: 688px)` one column, two columns between; 848, NOT 805; the screen intentionally shows two columns in the browser-window band of about 1101 to 1143 px; the final values are in the CP-1 entry): three columns `minmax(220px, .8fr) minmax(320px, 1.3fr) minmax(220px, .8fr)`; two columns `minmax(220px, .8fr) minmax(320px, 1.2fr)` with the third stack spanning all columns as two explicit tracks `minmax(0, 1fr) minmax(0, 1fr)` (NO `repeat(N, ...)` form); one column; the header band becomes a column at the one-column threshold. EVERY `display: grid` stack (the three column stacks and the panel stacks) declares `grid-template-columns: minmax(0, 1fr)`: without it one unbreakable word widens the whole column (spike S9 lesson; the prototype's `.stack` lacks it). DW-23 placement (as the CP-1 entry and the register state them; proposed: col 1 Facts, Assignment, Frontmatter, Owned files; col 2 Lane history, Review; col 3 Evidence chain, Dependency chain, Subtasks, Workspace, artifact links). PANEL OWNERSHIP (one rule, contract "Panel and region ownership"): THIS file draws every element that carries a `data-region` id, with the ids of the contract's "Regions" table: each titled panel through `renderPanel(id, title, body)` (titles from `wp-copy.ts`; the Review panel through `renderPanel(null, REVIEW_TITLE, body)`), and as plain wrappers the `header` band, `review-summary`, `review-cycles`, `cancellation`, `artifact-links` and `detail-notice`. The part renderers you call return the BODY of that element only (stubs return `nothing`, so the container, id and heading exist and the body is empty); a region whose view is `null` draws nothing at all. The regional-notice switch puts the `detail-notice` wrapper inside the Review panel in the place `review-cycles` would take. Layout CSS only, `--sk-*` tokens only.
5. The focus rule in `updated()`: when the previously focused element inside the shadow root has been detached by a `status`, `detailStatus` or `wpId` change, move focus to the `h1` (`tabindex=-1`), or to the root element (`tabindex=-1`) when no `h1` is drawn; no property, no event. The one polite, visually hidden live region follows the "Announcements" table (never on first render); it is wired here so IC-08 only tests it, with the copy builders of `wp-copy.ts`.
6. Compose `static styles` from every part's `<region>Styles` and adopt the sheets (`library-sheets.ts`, T024); import the existing `progress-sheet.ts`; no second progress sheet.

**Files**: `sk-work-package-screen.ts`. **Edge cases**: a detail with a different `wpId` is treated as omitted (via `resolveLists`); `status` `ready` with `workPackage` null renders as `empty`; unknown `detailStatus` collapses to `error`; `detailRefusalCode` is read only when `detailStatus` is `error` or `not-found`.

### T024 Parts: `panel-parts.ts` complete, stubs for the rest, two complete renderers, the sheets

**Steps**:
1. `panel-parts.ts` COMPLETE: `renderPanel(id: string | null, title, body, options?: { inset?: boolean })` over `sk-card` and `sk-section-header` (one `section` named by its `h2` via `aria-labelledby`; `data-region` carried when `id` is not null; called by the screen file only, never by a part), `panelStyles` (layout plus the narrowed E-18, which CP-1 approved: EXACTLY five properties with tokens: border width 1px `--sk-border-width-1`, radius `--sk-radius-md`, padding `--sk-space-5`, title 18px at weight 700 (the title size and weight tokens; a raw literal stays refused, so if no token for 18px exists report a change request), and the title-to-body gap `--sk-space-4`; nothing else, no `letter-spacing`).
2. Create EVERY other part file as a stub with its FINAL export signatures, exactly as the "Part signatures" table of `contracts/sk-work-package-screen.md`: `header-parts.ts` (`renderBreadcrumb`, `renderHeader`, `headerStyles`), `facts-parts.ts` (`renderFacts`, `renderAssignment`, `renderFrontmatter`, `factsStyles`), `files-parts.ts` (`renderOwnedFiles`, `filesStyles`), `history-parts.ts` (`renderHistory`, `historyStyles`), `review-parts.ts` (`renderReviewSummary`, `renderReviewCycles`, `renderCancellation`, `reviewStyles`), `chain-parts.ts` (`renderEvidenceChain`, `renderDependencyChain`, `chainStyles`), `work-parts.ts` (`renderSubtasks`, `renderWorkspace`, `renderArtifactLinks`, `workStyles`), `state-parts.ts` (`renderStatusContent`, `renderDetailNotice`, `renderEmptyForm`, `stateStyles`). A stub render function returns `nothing` (the BODY of its region; the screen file owns the container) and a stub styles export is an empty `css`. Each `<Region>View` is a plain readonly object type exported from its file (the exact view types are recorded in your hand-off for the orchestrator to copy into the contract file). Later work packages keep every signature; a signature change is a change request.
3. COMPLETE in `header-parts.ts`: `renderBreadcrumb(view, onOpenMission)`: `nav` with `aria-label` `BREADCRUMB_LABEL` containing an `ol`; the Mission crumb is an `sk-button` (variant `ghost`: the manifest has no `quiet` variant; library element, no raw `<button>`, no `<a>`), inside the `ol` list item that carries the adopted `sk-breadcrumbs*` sheet classes, whose click calls the handler (inert when `mission` is null); Enter and Space come from the element (no key handler of ours); the `wpId` crumb carries `aria-current="page"`; the `/` separators are `aria-hidden`. This is the one renderer used by the ready header and the not-found header; no other file carries `sk-breadcrumbs*`.
4. COMPLETE in `state-parts.ts`: `renderEmptyForm(text: string, heading?: string)`, the one shared empty-form helper (every regional empty form of WP05 to WP07 calls it with the text only; WP08's whole-screen `empty` state calls it with `text` and `heading`; with `heading` omitted no heading element is drawn, and a test covers both calls; no other file carries `sk-empty-state*`), with its E-17 override and a leak plant (T027).
5. `library-sheets.ts`: add the adopted `facts` and `event-timeline` sheets (one write, before the chains fork; operator ruling 2026-10-05, ARCH-003 (A)). Reuse `progress-sheet.ts`.
6. Part files import only from `defaults/`, `logic/` and the library; none dispatches an event.

**Files**: `panel-parts.ts`, `library-sheets.ts`; out-of-map creations (stubs, owned by later work packages from now on): `header-parts.ts`, `facts-parts.ts`, `files-parts.ts`, `history-parts.ts`, `review-parts.ts`, `chain-parts.ts`, `work-parts.ts`, `state-parts.ts` under `packages/mission-ui/src/elements/sk-work-package-screen/`. **Validation**: every stub compiles against its signature; the screen renders with all stubs: every container, `data-region` element and panel heading is present and every body is empty.

### T025 `fixtures.ts`: prop builders and `pairDetail`

**Purpose**: one place that turns contract fixtures into screen props; later WPs add only NEW exports.

**Steps**: `fixtures.ts` creates a prop builder for EVERY fixture name in `contracts/contract-pin.md` (inventory) and the pairing table, and `pairDetail(workPackage, detail, options?)`: it returns the detail with `wpId` rewritten to the Work Package's `wpId` and, with the `cycles` option, `reviewCycles` reduced (`'first'` first cycle only, `'last'` last cycle only, `'none'` an empty list); a Work-Package-only story passes `detail: null`. Provide the `mission` host prop builder (synthetic Mission, name, slug, count) and the shell-frame parameters the stories share (`shellFrame({ layout: 'mission', current: <work packages item>, flush })`). No builder invents a pair outside the pairing table. Ownership rule: you create a builder for EVERY fixture name; WP05 to WP10 add nothing to this file and only import it, so a missing builder found later is a change request against you, not an edit. Fixtures contain no path, username or e-mail.

**Files**: `fixtures.ts`. **Edge cases**: `pairDetail` must not mutate its inputs (assert in the skeleton test); the `'last'` and `'first'` options on a one-cycle detail return that cycle.

### T026 Registration, skeleton tests, surface-freeze test

**Steps** (red-first):
1. `src/index.ts`: guarded registration of `sk-work-package-screen` (as #4's pattern) and the type exports (`WpScreenStatus`, `DetailStatus`, `WpScreenMission`, `SkOpenArtifactDetail`, `SkRetryLoadDetail`), typed `HTMLElementEventMap` entries for the two new events. This is the only registration site.
2. `test/sk-work-package-screen.skeleton.test.ts`: one test per event (exactly one event, exact payload with `toEqual`, `bubbles`, `composed`, not cancelable) for `sk-select-work-package`, `sk-open-mission`, `sk-open-artifact`, `sk-retry-load`, each driven by calling the screen's handler method for that event (the dispatch methods are `protected` or `private` TypeScript members, reached in the test through a type cast; NO test-only template hook, no public method and no new property or event is added to the shipped surface, and the freeze test would fail if one were; the stubs draw no controls, so the handler is called the way the later parts will call it, and the test file says so in a header comment), and `sk-open-mission` is additionally driven by a real click on the complete breadcrumb control as the proof that the handler wiring is real, with a positive control per no-event assertion; the payload-rule branches are IC-07's, not here. Layout cases: grid track count 3, 2, 1, 1 at 1280, 1100, 800 and 620 px viewports inside `shellFrame` (call `page.viewport` first); the 1280 px case is the acceptance check that the 1280 px story has three columns.
3. `test/surface-freeze.test.ts` extended: the ten properties with attributes and run-time defaults (status `loading`, detailStatus `ready`, detailRefusalCode null, workPackage null, detail null, mission null, wpId `''`, now null, labels null, errorMessage `''`) and the four event names; assert counts with equality (10 and 4).

**Files**: `index.ts`, the two test files. **Validation**: `pnpm test` lists both; revert check per file (rename an event; change a default; break a track recipe).

### T027 Exceptions as ruled (ESLint and Stylelint)

**Purpose**: the operator-approved exceptions, exactly as ruled, each proven.

**Steps** (per the CP-1 entry's decisions; `contracts/gates.md` is the single statement of every scope):
1. E-17 APPROVED: grant the table of `contracts/gates.md` exactly as listed (the gate grant table): one `classOnly([...])` override per LISTED file, written now for every listed part file, including the stubs that carry no `class=` yet (WP05 to WP08 must never need a lint-config edit), each with a leak plant (a class outside the file's prefixes is refused): `sk-event-timeline*` in `history-parts.ts`; `sk-facts*` in `facts-parts.ts` and `work-parts.ts`; `sk-breadcrumbs*` in `header-parts.ts` ONLY; `sk-empty-state*` and `sk-progress*` in `state-parts.ts`; `sk-progress*` in `work-parts.ts`; No override for `files-parts.ts`, `review-parts.ts`, `chain-parts.ts`, `panel-parts.ts` or `sk-work-package-screen.ts` (none of them carries a class). There is NO `sk-breadcrumbs*` row for `state-parts.ts`. Tests: the ESLint override leak plants live with #4's E-01 to E-03 leak plants (find that test file with a grep; if it is not `scripts/stylelint-exceptions.test.mjs` list it as an out-of-map edit).
2. E-19 (b) APPROVED: the track minimums `220px` and `320px` inside `minmax()` of `grid-template-columns` in `sk-work-package-screen.ts` only, proven by a case in `scripts/stylelint-exceptions.test.mjs`.
3. E-19 (a) is DELETED (the S8 probe passed; CP-1): add nothing for the two container lengths `848px` and `688px` and say so in the hand-off.
4. E-18 APPROVED NARROWED (CP-1): one entry in `panel-parts.ts` only listing exactly the five properties (border width, radius, padding, title size and weight, title-to-body gap), token values only, sunset spec-kitty-design#516 (a compact density for `sk-card`), with a case in `scripts/stylelint-exceptions.test.mjs` proving that a sixth property in that file is refused.
5. E-20 is DROPPED (CP-1): add no `RAW_ELEMENT` allowance for `button` in `chain-parts.ts`.
6. No raw colour or font literal anywhere; no other file is granted anything.

**Files**: `eslint.config.mjs`, `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs`. **Edge cases**: E-17 is granted for every file the table lists, so the region WPs find their override in place; a later need for a class in a file with no override, or a prefix outside the table, is a change request in that WP's hand-off to the orchestrator (the exception would need the operator's approval), never an edit of the lint config by the WP.

### T028 The freeze and the shell-frame scratch story

**Steps**:
1. Add a `shellFrame` SCRATCH story (not committed: no baseline, not a 57th story) proving the frame at 1280 px renders the screen with three columns; use it for your own side-by-side against the prototype shell, then delete it before the final commit (`git status --short` empty).
2. Run `pnpm manifest:generate` ONCE and commit `custom-elements.json` (the freeze); `pnpm manifest:check` green. A planted undeclared event in the screen file makes the `manifest` gate fail (revert check, then restore).
3. Run every gate. From here on no work package changes the public surface; an unavoidable change is a reported exception that WP10 regenerates once.
4. Hand-off: the exact view types of every `<Region>View`, the final thresholds written, the E-xx decisions applied, every file created as a stub.

## Test strategy

Positive controls: each skeleton event test also asserts that an unrelated interaction emits nothing (no-event) while the targeted one emits exactly one; the layout test asserts the three-column case first (so a vacuous grid fails). Exactly-one-event: all four events, with `toEqual` payloads. Revert checks per test file (listed in the hand-off): skeleton (drop `composed`; change a payload member), surface-freeze (change a default or remove a property), exceptions (remove a leak plant's prefix guard). DOM-absence tests of the region bodies are the region WPs'; here the skeleton asserts (panel ownership) that with all parts stubbed `wpPopulated` + `detailPopulated` (`cycles: 'none'`) gives exactly the 13 ids of the contract's region-set test, each drawn by THIS file, and that a null view draws no container (an Assignment with both groups all-null; a detail with `workspace` omitted). Exit evidence: `pnpm visual` is not run as an exit check (no committed baseline for the screen exists until WP10; the existing 118 baselines are unaffected, and running it once to confirm that is allowed but not required). The side-by-side of the scratch story against the prototype is uncommitted and goes in the hand-off.

Acceptance (all runnable): `pnpm manifest:check` exits 0 and the manifest lists the tag, the ten properties with defaults and the four events; a planted undeclared event fails the `manifest` gate; the skeleton tests pass at 3, 2, 1, 1 columns; every leak plant is refused; every gate of the list exits 0; `git status --short` is empty after the final commit.

## Definition of Done

- The CP-1 precondition was verified before the first commit; the hand-off names the CP-1 commit.
- Ten properties, four events, one literal dispatch per event, `@fires` declared, manifest regenerated once and checked.
- Every part file exists with final signatures; `renderBreadcrumb` and `renderEmptyForm` are complete; `panel-parts.ts` is complete.
- Exceptions applied exactly as the CP-1 entry decided (E-18 narrowed to five properties, no E-19 (a), no E-20); each proven.
- Every `display: grid` stack carries `grid-template-columns: minmax(0, 1fr)` (a skeleton test with a long unbreakable word proves the column does not widen); the thresholds are 848 and 688 px.
- The hand-off lists commit hashes verified with `git cat-file -t`, out-of-map creations and edits with rationale, change requests, every exception touched (E-17 to E-20), the drift items relied on and the view types for the contract's "Part signatures".

## Risks

- The surface must reflect spike outcomes: read the CP-1 entry before designing the thresholds and exceptions.
- A wrong signature here forces a change request in every region work package: write the signatures from the contract table, not from memory.
- The one-site dispatch rule: a second `dispatchEvent` of the same name in a part file fails the manifest gate and the review.
- The manifest analyzer's bundled TypeScript (about 5.4) rejects newer syntax: no `accessor`.

## Reviewer guidance

Check the CP-1 entry predates the first commit; the surface equals `contracts/sk-work-package-screen.md` (ten properties, four events, defaults); no part file dispatches; the manifest was generated, not edited; every stub matches its signature; `renderBreadcrumb` and `renderEmptyForm` are complete and the only carriers of `sk-breadcrumbs*` and `sk-empty-state*`; E-xx entries equal the CP-1 decisions and nothing broader; the track recipe has no `repeat(N, ...)`; every grid stack has `grid-template-columns: minmax(0, 1fr)`; the thresholds are `min-width: 848px` and `max-width: 688px`; E-18 lists exactly the five properties; the screen file has no lane, phase, verdict, change-state or staleness literal and no `review_cycle` literal; focus rule present. The reviewer is a separate agent; it re-runs two revert checks and audits visual drift of the scratch capture against the DW register as the CP-1 entry and the register state them.


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
