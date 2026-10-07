---
work_package_id: WP07
title: Owned files, chains, subtasks, workspace and links (chain Y)
dependencies:
- WP04
requirement_refs:
- FR-004
- FR-008
- FR-009
- FR-010
- FR-015
- FR-016
- FR-017
- FR-018
- FR-023
- FR-035
- FR-036
- NFR-011
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T11:14:33.295771+00:00'
subtasks:
- T040
- T041
- T042
- T043
- T044
- T045
- T046
phase: Phase 2 - Regions
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-work-package-screen/
create_intent:
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.chains-work.stories.ts
- packages/mission-ui/test/sk-work-package-screen.events-1.test.ts
- packages/mission-ui/test/sk-work-package-screen.events-5.test.ts
- packages/mission-ui/test/wp-files-parts.test.ts
- packages/mission-ui/test/wp-chain-parts.test.ts
- packages/mission-ui/test/wp-work-parts.test.ts
- packages/mission-ui/src/elements/sk-work-package-screen/files-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/chain-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/work-parts.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-work-package-screen/files-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/chain-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/work-parts.ts
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.chains-work.stories.ts
- packages/mission-ui/test/sk-work-package-screen.events-1.test.ts
- packages/mission-ui/test/sk-work-package-screen.events-5.test.ts
- packages/mission-ui/test/wp-files-parts.test.ts
- packages/mission-ui/test/wp-chain-parts.test.ts
- packages/mission-ui/test/wp-work-parts.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP07 - Owned files, chains, subtasks, workspace and links (chain Y) (IC-06)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Fill the bodies of `files-parts.ts` (Owned files), `chain-parts.ts` (Evidence chain and Dependency chain) and `work-parts.ts` (Subtasks, Workspace, artifact links); build the nineteen stories of `Screens/Work Package/Chains, subtasks, workspace and links`; and prove with tests the dependency-node and artifact-link events (EV-1, EV-5), the workspace omitted-versus-all-null pair and the WP-32 no-removal-word test. You replace stub bodies only. Note on `create_intent`: `files-parts.ts`, `chain-parts.ts` and `work-parts.ts` appear there only so that finalize-tasks finds the literal paths; each file is created as a stub by WP04 and replaced here (you edit it, you do not create a second one, and every signature stays).

PRECONDITION (file precondition, first step): checkpoint CP-1 has completed (see "First step").

## Context

Read `plan.md` (IC-06, "Shared files", Risks: CP-1 outcomes for the chains), `contracts/sk-work-package-screen.md` (Regions `owned-files`, `evidence-chain`, `dependency-chain`, `subtasks`, `workspace`, `artifact-links`; Semantics (chains, lists, control names); Behaviour rules; Story catalogue rows for this title; "Test obligations by owner"; "Part signatures"), `contracts/defaults.md` (`files.ts`, `wp-copy.ts`; `filesView`, `resolveChangeState`, `resolveLists`, `dependencyNodeLabel`), `data-model.md` (`ResolvedLists`, `ResolvedFile` and `FilesView`), `research.md` D-06, D-08 (no arithmetic), D-12 (E-17, G-12; E-20 dropped), D-14, `contracts/gates.md` (E-17; E-20 dropped), `spec.md` (Q2, Q3a, Q3e, Q4, Q6, DW-8, DW-16 to DW-20, state rows WP-10 to WP-16, WP-25 to WP-27, WP-31 to WP-35, WP-50, EV-1, EV-5), and the WP04 hand-off (view types `FilesView`, `EvidenceChainView`, `DependencyChainView`, `SubtasksView`, `WorkspaceView`, `ArtifactLinksView`).

Requirements: FR-004 (one source per list: parts read only `ResolvedLists`), FR-008 (subtasks: bar from `subtaskProgress` as given, hidden at total 0; list of id, title, lane word), FR-009 (dependency chain nodes with id, title, lane word, readiness in words, each node an actionable control emitting `sk-select-work-package`), FR-010 (owned files with glob marker and change-state word, all-unknown collapsed to one note), FR-015 (workspace: four members, no path, no claim of removal), FR-016 (artifact links only when non-null), FR-017 (evidence chain), FR-018 (the workspace and links regions are not drawn when the detail property is omitted), FR-023, FR-036 (the stories this WP authors, one per catalogue row, ids by the story id convention), FR-035 (EV-1 and EV-5 tests), NFR-011.

Chain Y: WP07, then WP08 (WP09 follows chain X and the orchestrator merges your chain into it). You share no file with chain X.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics", and checks the CP-1 ancestry); do not create, switch or reset branches yourself.

## First step: CP-1 file precondition

Before any edit confirm the `CP-1 confirmed` entry in `tracer-design-decisions.md` and `git merge-base --is-ancestor <CP-1 commit> HEAD` (the dispatch names the commit). If absent: STOP and report. Read the entry for: DW-8 (owned-file word drift), DW-16 to DW-20 (all yours; DW-23 (placement) and DW-30 (panel look) are inherited from the skeleton (WP04) and built as the register states (DW-30 is confirmed with the narrowed E-18; DW-23 awaits the Storybook review)) (chains, workspace, spec and prompt links, subtasks), DW-18 (path and "removed" notice dropped), and the CP-1 outcomes: DW-16 is a native `ol` of `sk-pill-tag` items (S5 variant D, no exception, library gap spec-kitty-design#517) and DW-17 nodes are ghost `sk-button`s (S6 passed, E-20 dropped, so there is NO raw `<button>`).

## Subtasks

### T040 Owned files

**Steps** (red-first with `wp-files-parts.test.ts`):
1. `renderOwnedFiles(view)`: a `ul` of rows from `filesView(ResolvedLists.ownedFiles)`: the pattern as authored (brace patterns shown as authored), the glob marker `GLOB_MARKER` ("set of files") for `isGlob`, and the change-state word as an `sk-pill-tag` from `resolveChangeState` (changed info, unchanged neutral, unknown neutral; a foreign state shows raw neutral; never colour alone). When `allUnknown` is true: NO per-row badges and ONE quiet note `CHANGE_STATE_UNAVAILABLE_NOTE`; a single `unknown` among others is shown (WP-25); a foreign state among known ones is shown raw and does not collapse the list; a null state (bare degradation) shows no badge and no note.
2. Empty list: WP04's `renderEmptyForm(NO_FILES_TEXT)` ("No owned files declared", host-neutral: DW-8 replaced the prototype's "No committed file list is surfaced in the approved source").
3. The rows are keyed by `pattern` (`repeat`) so an update keeps node identity (NFR-006). Long paths wrap between words; a single over-long word ellipsizes with the full text as the accessible name and a title tooltip (reuse #4's overflow helper).

**Files**: `files-parts.ts`, `wp-files-parts.test.ts`. **Edge cases**: the part reads `ResolvedLists` only (never `workPackage.ownedFiles`); no per-row badge for a null state.

### T041 Evidence chain

**Steps**: `renderEvidenceChain(view)`: a native ordered list (`ol`) of `sk-pill-tag` items (Mission, Work Package, state word; the state word through the lane badge words; a null lane gives the not-started word; an unknown lane shows raw) with `aria-hidden` arrow separators and a layout-only `flex-wrap` (CP-1 ruling, spike variant D; NOT `sk-evidence-chain`, which does not fit the column; no style exception; the library gap is spec-kitty-design#517). You return the body of the `evidence-chain` panel (panel ownership: WP04's screen file draws the container, the id and the title `EVIDENCE_TITLE`). It is always drawn and has NO control and no tab stop.

**Files**: `chain-parts.ts`. **Edge cases**: the stages are data (`stages` as an array property), not hard-coded markup; the state word is never a lane literal.

### T042 Dependency chain

**Steps** (red-first with `wp-chain-parts.test.ts`):
1. `renderDependencyChain(view, onSelectWorkPackage)`: a semantic list (`ul`) of nodes, each node a control carrying visible id, title and lane word, with the accessible name `dependencyNodeLabel(wpId, title, laneWord)` (title falls back to the id when null; the lane word is the resolved word or the raw value; a null lane gives the not-started word), decorative `aria-hidden` arrow separators, ONE tab stop per node. Nodes are `sk-button` with `variant="ghost"` (the manifest's quiet look; the library declares only `primary`, `secondary`, `ghost`, `danger-secondary`, no `quiet`); E-20 is dropped, so no raw `<button>`. The three texts (id, title, lane word) are wrapped in ONE slot element (three bare spans become flex items and shatter letter by letter), the nodes are stacked vertically in the narrow column, and layout-only `::part(button)` rules (`overflow-wrap`, `text-align`) handle long titles (CP-1 ruling for DW-17). Activation calls `onSelectWorkPackage(dependency wpId)`; WP04's dispatch method turns it into `sk-select-work-package` `{ missionId, wpId }`; the node is inert when `mission` is null.
2. Readiness in WORDS from `readiness` and `readyToStart` as given: blocked (`BLOCKED_TEXT`, the `unsatisfied` ids marked unsatisfied with text `UNSATISFIED_TEXT`, never colour alone), ready (`readyToStart` true: `SATISFIED_TEXT` and `READY_TEXT`); started or finished (`satisfied` true and `readyToStart` false, because `readyToStart` is `planned AND satisfied`: WP-01, 03, 04, 07 and most stories): `SATISFIED_TEXT` only, with neither `READY_TEXT` nor `BLOCKED_TEXT`. `BLOCKED_TEXT` follows `satisfied` false (the unsatisfied ids), never `readyToStart` false alone; no arithmetic, no counting. No dependencies: `renderEmptyForm(NO_DEPENDENCIES_TEXT)`.
3. A dependency is a control ONLY here: Frontmatter dependencies (WP05) are plain pills (P-7), so no two controls share an accessible name.
4. You return the body of the `dependency-chain` panel (the container, id and title `DEPENDENCIES_TITLE` are WP04's, panel ownership); titles containing `[path]` or `[email]` markers render verbatim, not parsed (WP-50).

**Files**: `chain-parts.ts`, `wp-chain-parts.test.ts`. **Edge cases**: a title equal to the id (WP-16) shows once, not twice; a very long title wraps between words.

### T043 Subtasks, Workspace, artifact links

**Steps** (red-first with `wp-work-parts.test.ts`):
1. `renderSubtasks(view)`: the progress bar is a native `<progress>` (adopted `sk-progress*` classes, E-17) taking `done` and `total` from `subtaskProgress` AS GIVEN (no arithmetic; a whole-percent figure only through #4's `formatWholePercent` if the label shows one), hidden when `total` is 0, with an accessible name from #4's `SUBTASK_PROGRESS_TEXT`; below it a `ul` of subtasks (id, title, lane word); a null title shows the id alone; a null lane shows the not-started word; an unknown lane shows raw; rows keyed by subtask `id`. None: `renderEmptyForm(NO_SUBTASKS_TEXT)` and no bar (WP-10). The list comes from `ResolvedLists` (the detail list wins over the 1.0 map).
2. `renderWorkspace(view)`: a `dl` (adopted `sk-facts*` classes, E-17) with exactly four rows: Code lane (`laneId`), Lane branch, Planning branch, Worktree present (`YES_WORD`/`NO_WORD`); every null member keeps its row and shows `ABSENT_MARKER` (the one absent marker; no "none" word, no omitted row), the code lane never confused with a status lane; NO path (C-008, R-3) and NO "removed" claim (R-4: `worktreePresent: false` reads "no" and nothing implies removal: assert no word implying removal). The screen does not draw the panel when the `workspace` property is omitted; all-null members (no lanes) draw the panel with absent forms (WP-33b).
3. `renderArtifactLinks(view, onOpenArtifact)`: "Open spec.md" (`OPEN_SPEC_LABEL`) from `artifactReferences.spec` and "Open prompt" (`OPEN_PROMPT_LABEL`) from `artifactReferences.prompt`, each an `sk-button` with `variant="ghost"` (DW-19's quiet look) ONLY when non-null (not disabled, not a placeholder); the screen draws no wrapper when both are null or when `detail` is omitted. Activation passes the reference `{ path, kind }` to `onOpenArtifact`; the `kind` is passed through unbranched (a string) and WP04's dispatch method builds `sk-open-artifact` `{ missionId, path, kind }`. Inert when `mission` is null. No markdown is rendered and nothing is read from the artifact (the screen never reads `promptMarkdown`).
4. You return bodies only (panel ownership): WP04's screen file draws the `subtasks` and `workspace` panels with `renderPanel` and the `artifact-links` actions wrapper (no panel, no title), and decides from the "Drawn when" table whether each is drawn; call no `renderPanel` and write no `data-region`.

**Files**: `work-parts.ts`, `wp-work-parts.test.ts`. **Edge cases**: `subtaskProgress` total 0 hides the bar but a non-empty detail list still shows (both payloads shown as given, R-08); a foreign artifact `kind` string passes through unchanged.

### T044 The nineteen stories: `Screens/Work Package/Chains, subtasks, workspace and links`

**Steps**: create `sk-work-package-screen.chains-work.stories.ts` (title as above, 19 stories, dark, 1280 px, `shellFrame`): WP-10 (`wpNoEvents` + `detailSubtasksNone`); WP-11 (`wpPopulated` + `detailPopulated`, `cycles: 'none'`); WP-12 (`detailSubtaskNulls`); WP-13 (`wpBlocked` + `detailDepsBlocked`); WP-14 (`wpReady` + `detailPopulated`); WP-15 (`detailDepsNone`); WP-16 (`detailDepNullLane`); WP-25 (files of `detailPopulated`); WP-26 (`detailUnknownChangeState`); WP-27 (`detailOwnedNone`); WP-31 (workspace of `detailPopulated`); WP-32 (`detailWorkspaceNoWorktree`); WP-33a (`detailPlanningLane`); WP-33b (`detailNullWorkspace`); WP-34 (links of `detailPopulated`); WP-35a (`detailLinksPromptNull`); WP-35b (`detailUnparseableCycle`, spec null); WP-35c (`detailLinksNone`); WP-50 (`detailRedaction`). Pairs exactly as the pairing table (each `cycles: 'none'` unless the table says otherwise). Build ONLY with WP04's `fixtures.ts` and `pairDetail`. Exactly 19 stories discovered for the title. Story id convention (contract, Story catalogue): the export name is `Wp` + the row number in two digits + the optional lowercase letter (`Wp01`, `Wp21b`, `Wp36a`), and `tags` carries exactly one row tag `wp-<NN><letter>` in lowercase (`'wp-01'`, `'wp-21b'`) beside the tier tag `vw-<n>` and any `tab-<n>` tag; WP10's parser reads the `wp-` tag and cross-checks it against the export name.

### T045 Tests: EV-1, EV-5, workspace pair, WP-32, omitted regions

**Steps** (red-first; revert check per file listed):
1. `sk-work-package-screen.events-1.test.ts` (EV-1): activating a dependency-chain node (pointer, Enter, Space) emits `sk-select-work-package` exactly once, `toEqual({ missionId, wpId })` with the DEPENDENCY's id, `bubbles`, `composed`, not cancelable; inert with `mission` null, with the positive control (same listener, event once `mission` is set); no other `sk-*` name seen.
2. `sk-work-package-screen.events-5.test.ts` (EV-5): "Open spec.md" and "Open prompt" each emit `sk-open-artifact` exactly once with `toEqual({ missionId, path, kind })` (path and kind equal to the reference given; a foreign kind string passes through unchanged); a null reference draws no control (DOM absence) paired with the present sibling; inert with `mission` null with its positive control.
3. `wp-chain-parts.test.ts`, `wp-files-parts.test.ts`, `wp-work-parts.test.ts`: the DOM-absence and paired tests: workspace omitted (from `detailOmittedProvisional`: region absent, no heading, no label text) versus all-null (from `detailNullWorkspace`: panel drawn, the four rows present with `ABSENT_MARKER` for each null member, asserted by exact text, and no empty value) as a PAIR, through the screen; the screen mounted with `wpWithPrompt` draws no prompt body text anywhere (N-3), paired with `wpPopulated` where the same query finds the Open prompt control; the WP-32 test (`worktreePresent` false shows "no" and no word implying removal: assert a list of words such as removed, deleted, missing, gone is absent, paired with the true case); the all-unknown note versus mixed (a foreign state among known stays visible; a null state draws nothing); subtasks: bar hidden at total 0 with a present-bar control; a null title shows the id alone; an unknown lane shows raw; owned files key identity (re-render with one row changed keeps other nodes the same objects); WP-50 redaction markers, verbatim (`detailRedaction`, through the screen): the literal text `[path]` and the literal text `[email]` appear unchanged and unparsed in the DOM text of a subtask title row and in the visible title of a dependency node (and in that node's accessible name from `dependencyNodeLabel`); no element is created from the marker (no link, no `mailto:`, no path-like text node split), asserted by the text content of the row equalling the title as given; paired with a fixture title without markers where the same query finds the plain title; the dependency node name equals `dependencyNodeLabel(...)` and the set of control names in the column has no duplicates; the evidence chain has no control; readiness words for blocked and ready.
4. Counts with equality; every loop asserts N.

### T046 Side-by-side hand-over (no PNG committed)

**Steps**: for EACH of the nineteen stories produce an uncommitted side-by-side screenshot against `<prototype>/04-work-package.html` (`?wp=WP04` file list, dependency chain, workspace; `?wp=WP03` links and the empty owned-files panel; "None" rows against the named analogue) in the pinned container (`pnpm visual` for actual images only; its red is the known red and NOT an exit check; never `pnpm visual:update`; no PNG staged). Read and describe each image; map every visible difference to a DW item as the CP-1 entry and the register state them (DW-8, DW-16 to DW-20) or flag it as unconfirmed and fix it. Other regions are stubs in your captures: say so.

## Test strategy

Positive controls: every no-event or absence test is paired with its present sibling in the same test. Exactly-one-event: EV-1 and EV-5. DOM-absence with presence controls: null links, omitted workspace, hidden bar. Revert checks per file (listed): events-1 (emit on hover; use the wrong id), events-5 (drop `kind` passthrough), files (collapse a foreign state), chain (make Frontmatter-style plain pills), work (draw the bar at total 0; add a path row). Foreign values: unknown lane, foreign change state, foreign artifact kind. Exit evidence: `pnpm visual` is NOT an exit check of this work package (its stories have no committed baseline until WP10, so missing snapshots are the known red); the exit evidence is the uncommitted side-by-side screenshot per story against the prototype, no PNG committed. All other gates green.

## Definition of Done

- Three part files complete with signatures unchanged; no dispatch in a part; no arithmetic on contract values; no path or removal claim in the workspace.
- Nineteen stories (exactly), fixtures only through `fixtures.ts`.
- EV-1 and EV-5 tests, the paired tests and the WP-32 test pass with listed revert checks; no raw `<button>` in `chain-parts.ts` (E-20 dropped); the three node texts sit in one slot element.
- Hand-off lists commit hashes verified with `git cat-file -t`, nineteen side-by-side images read and described with differences mapped to confirmed DW items, change requests and out-of-map edits (none expected).
- No PNG staged; nothing outside `owned_files` edited.

## Risks

- The CP-1 entry decided the chain primitives (Evidence chain: `ol` of `sk-pill-tag`; Dependency chain: ghost `sk-button` nodes); follow it, not a guess. E-20 is dropped and is NOT yours to add: if `sk-button` fails after the entry said it passes, report a change request.
- Raw `<button>`, `class=` with an unapproved prefix, or hand-written chrome in these files is a review failure (E-17 rows are per file).
- The two payloads can disagree (a detail list differing from the 1.0 map): show as given (R-08).
- A hidden duplicate accessible name (two controls named alike) fails NFR-003 and WCAG 2.4.4: tests assert uniqueness.

## Reviewer guidance

Check DW-8 and DW-16 to DW-20 (plus the inherited DW-23 and DW-30) against the CP-1 entry; the Frontmatter has no control and the dependency is a control only as a chain node; node names include id, title and lane word; the bar equals `subtaskProgress` as given and is hidden at 0; no path and no "removed"; each link only when non-null; `kind` passes through; parts read `ResolvedLists` only; every `class=` has an approved prefix for its file; no self-check literal; nineteen stories each mapped. The reviewer is a separate agent; it re-runs two revert checks and rejects any unconfirmed difference from the prototype.


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
