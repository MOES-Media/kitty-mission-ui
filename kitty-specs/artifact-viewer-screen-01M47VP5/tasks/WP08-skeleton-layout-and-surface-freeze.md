---
work_package_id: WP08
title: Skeleton, layout and surface freeze (IC-06b)
dependencies: [WP07]
requirement_refs:
- FR-001
- FR-002
- FR-032
- FR-037
- FR-039
- FR-040
- C-001
- C-003
- C-005
- C-010
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T21:37:29.521700+00:00'
subtasks:
- T047
- T048
- T049
- T050
- T051
- T052
- T053
- T054
phase: Phase 3 - Lint, skeleton and freeze
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/
create_intent:
- packages/mission-ui/src/elements/sk-artifact-screen/sk-artifact-screen.ts
- packages/mission-ui/src/elements/sk-artifact-screen/fixtures.ts
- packages/mission-ui/src/retry-types.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-artifact-screen/sk-artifact-screen.ts
- packages/mission-ui/src/elements/sk-artifact-screen/fixtures.ts
- packages/mission-ui/src/retry-types.ts
- packages/mission-ui/src/overflow-region.ts
- packages/mission-ui/src/logic/wp-retry.*
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.*
- packages/mission-ui/src/story-support/shell-frame.ts
- packages/mission-ui/src/index.ts
- packages/mission-ui/custom-elements.json
- packages/mission-ui/test/surface-freeze.test.ts
- packages/mission-ui/test/sk-artifact-screen.skeleton*.test.ts
- packages/mission-ui/test/sk-artifact-screen.layout*.test.ts
- packages/mission-ui/test/sk-artifact-screen.overflow*.test.ts
- packages/mission-ui/test/overflow-region.multi*.test.ts
- packages/mission-ui/test/retry-types.*
role: implementer
---

# Work Package Prompt: WP08 - Skeleton, layout and surface freeze (IC-06b)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Create `sk-artifact-screen` with its FULL public surface (thirteen properties, five events), the container-query layout, the selected-tab state, the overflow measurement, every part file as a stub with final signatures, the neutral `retry-types.ts`, the derived R4 named list, the shell-frame options, and the single manifest regeneration: the surface freeze.

## Context

After this WP the public surface is frozen: later WPs fill part bodies only and a surface change is reported. The screen file is written ONLY here (`sk-artifact-screen.ts`: class, properties and normaliser wiring, layout grid, inspector first in the DOM placed by the grid, container queries, the five dispatch methods, the selected-tab state, the `OverflowRegion` wiring and `overflowing` set, the hidden-heading wiring, the status and content-status switches, the import and call of every part renderer, composed `static styles`, sheet adoption, the three `willUpdate` caches and the focus rule). The thresholds come from S-A6 as ruled at CP-1, in rem.

Read first: `plan.md` section "IC-06b" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-06b. Requirements: FR-001, FR-002, FR-032, FR-037, FR-039, FR-040, C-001, C-003, C-005, C-010.

## Precondition (first step, before the first subtask)

**FILE PRECONDITION (first step, first exit check)**: the `CP-1 confirmed` entry exists and `git merge-base --is-ancestor <CP-1 commit> HEAD` holds (as WP07). The `CP-1 confirmed` entry now EXISTS (2026-10-07): the CP-1 commit is the one whose subject begins `spec(artifact-viewer-screen): CP-1 confirmed` (find it with `git log --grep='CP-1 confirmed' --format=%H`); the lane worktree must contain it, so merge the planning branch into the lane before dispatch. If absent: STOP and report. The reviewer REJECTS if it was not present before the first IC-06b commit.

## CP-1 rulings binding on this work package (2026-10-07)

The operator's CP-1 rulings are complete and binding (verbatim in "Binding rulings" below; `plan.md`, "CP-1 rulings (2026-10-07)"). No PENDING CP-1 value remains. For this work package:

- **Layout**: two columns when the content cell is at least 45 rem (720 px), a container query with NO controller; one column below, the inspector first in the DOM. The toolbar stacks by option C only: `@container (max-width: 38.75rem)` combined with `:host(:state(shell-mobile))`, written as a descendant rule (`:host(:state(shell-mobile)) [data-region='toolbar']` or the toolbar's own selector, inside the container query), as #5 writes its `:host(:state(shell-mobile))` rules. The layout tests sample 1280, 1100, 1000, 832, 831, 800, 732, 720, 719, 689 and 620 px and assert, with positive controls: two columns at 832 and above, one column at 831 and below; the toolbar a row at 732 and 720 (collapsed tier, cell 620 and 608) and at 719 and 689, and stacked at 620 (mobile tier); the custom state `shell-mobile` set in the mobile tier and absent in the others; and that the source holds exactly ONE `attachInternals` call (the controller's), none in the screen.
- **E-28** values are pinned: `270px` track; the toolbar band `min-height: 68px` is written here or in WP09 (whoever writes the band's rule).
- **Named edit, the markdown budget retune (ruling 1, option O3)**: `packages/mission-ui/src/defaults/markdown.ts` (owner WP03, in the lane history) gets `maxTokens` 150000, `maxNodes` 110000, `maxTableCells` 32000 (`maxDepth` 24 and the rest unchanged), and the pinned literal in `packages/mission-ui/test/artifact-defaults.test.ts` (the `toEqual` of `MARKDOWN_BUDGET`) changes with it. Exit evidence in this WP: `markdown-budget`, `markdown-model` and the corpus tests (WP05) green; `makeLargeMarkdown` still resolves to `ok` and `makeOverBudgetMarkdown` still resolves to `fallback` with reason `budget` (if the over-budget generator no longer exceeds 150,000 flattened tokens inside the 262,144-byte cap, STOP and report a change request: do not relax a limit); recorded in the hand-off as an out-of-map edit with the one-line rationale "CP-1 ruling 1". The ceiling-test shape is WP12's.

## Subtasks

### Subtask T047: FILE PRECONDITION: the `CP-1 confirmed` entry

**Steps**:
1. Verify the entry and the ancestor check; read the ruled thresholds (T = 45 rem; toolbar stack option C), the copy defaults, the tab-control choice (D-13: the token paint variant) and the Work Package pill control (S-A4: raw `button.sk-pill-tag`) before writing code.

**Files**: none

**Validation**: ancestor check exits 0

### Subtask T048: The screen element and its surface

**Steps**:
1. `sk-artifact-screen` with the thirteen properties of `contracts/sk-artifact-screen.md` (the twelve of FR-001 plus the optional `vocabulary`, A-9) with attributes and run-time defaults, the normalisers of the enumerated properties wired, `@fires` for all five events including the untrusted-`href` text of `sk-open-link`, and exactly five literal `dispatchEvent` sites with typed payload builders (one per event, `bubbles` and `composed` true).
2. The status and content-status switches, calls into `state-parts.ts`; the pane as `role="region"` named `DOCUMENT_LABEL(name)` with `tabindex="-1"` and no id; the visually hidden h1 where `needsHiddenHeading` says the pane has none (`src/visually-hidden.ts`, A11Y-005); the focus rule (PLAN-FRESH4-002 (a): screen-side detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null).
3. The three caches in `willUpdate` (markdown model by value of `content.content` and `content.mediaType`, path-to-kind map by listing, resolved tree).

**Files**: `sk-artifact-screen.ts`

**Validation**: the skeleton tests of this WP

### Subtask T049: Layout and selected-tab state

**Steps**:
1. Container-query layout on the host (`container-type: inline-size`): two columns from the S-A6 threshold (45 rem = 720 px, ruled at CP-1), the inspector FIRST in the DOM and placed in the right-hand track by grid placement (A11Y-009 (b); no `order` property), the toolbar stack by option C (`@container (max-width: 38.75rem)` combined with `:host(:state(shell-mobile))` through `protected readonly shellTier = new ShellTierController(this)`, #5's precedent; the controller is used ONLY for this rule, and `attachInternals` is called nowhere else in the screen or its parts); every `display: grid` declares `grid-template-columns: minmax(0, 1fr)`-based tracks (#5's S9 lesson); lengths in rem.
2. The selected-tab state: seed from `view`, reset on a path change, `onSelect`.

**Files**: `sk-artifact-screen.ts`

**Validation**: layout cases at the S-A6 sampling widths inside `shellFrame`

### Subtask T050: Part stubs, `fixtures.ts` and the derived R4 named list

**Steps**:
1. Create every `*-parts.ts` and `prose-styles.ts` as a stub with its FINAL export signatures (`contracts/sk-artifact-screen.md` "Part signatures"); `renderEmptyForm` is complete; record the exact view and handler types in that contract file under "View types recorded by IC-06b" (`DocumentView.eyebrow`, `LinkHandlers.overflowing`, ...).
2. `fixtures.ts`: a builder for every fixture name and the WHOLE story pairing table (`contracts/contract-pin.md`); `content.path` equals `selectedPath` wherever both are given.
3. Derive the reviewed named list of rule R4 for the element files FROM THE STUBS and the part signatures (every structural attribute name and named property or boolean binding, `tone` of `sk-notice` among them, each with a one-line reason) into the options WP07 landed in `eslint.config.mjs`.

**Files**: `fixtures.ts`, stubs, `eslint.config.mjs` (list only)

**Validation**: `pnpm lint` green over the stubs with the list, red when one name is removed from it

### Subtask T051: `OverflowRegion` named additive edit

**Steps**:
1. Extend `src/overflow-region.ts` by ONE named additive edit: an optional list of targets (several scrollers measured by one controller), an optional axis choice (horizontal, vertical or both; the default stays horizontal so its two present users behave exactly as before), a per-target result the screen reads as its `overflowing` set; measure-on-every-host-update and the fonts-ready pass are kept (PLAN-FRESH3-001 (a)).
2. Own unit tests; the board's and the Pipeline screen's existing tests stay green unchanged. Wire the screen's scroll elements (pane, rendered article, raw block, each table box) as targets.

**Files**: `src/overflow-region.ts`, `test/overflow-region.multi*.test.ts`, `test/sk-artifact-screen.overflow*.test.ts`

**Validation**: the `overflowing` set flips when a wide child is added (control: a narrow child does not) and in the CONTENT-ONLY case on both axes (control: same-size box whose content fits stays off; shrinking flips it off)

### Subtask T052: Neutral `retry-types.ts` and the named edit of #5's files

**Steps**:
1. `src/retry-types.ts` holds `RetryLoadDetail` (the landed two-member union, with `WorkPackageRetryDetail` and `DetailRetryDetail`, moved from `logic/wp-retry.ts`; FORK-1 (a), ruled 2026-10-07), `SkArtifactRetryDetail` (`target` `'content'` or `'listing'`), the union and the ONE `declare global` entry for `sk-retry-load` (A-3, D-04).
2. The ONE named edit of #5's merged files: `logic/wp-retry.ts` re-exports `RetryLoadDetail`; `sk-work-package-screen.ts` keeps its alias `SkRetryLoadDetail` and loses its event-map entry; no #5 name, test or manifest text changes.
3. A type-level assertion file under `test/` that compiles only with the union, so reverting it fails `pnpm typecheck`.

**Files**: `src/retry-types.ts`, `logic/wp-retry.ts`, `sk-work-package-screen.ts`, `test/retry-types.*`

**Validation**: reverting the union fails `pnpm typecheck`

### Subtask T053: Story-frame options, registration, manifest, surface freeze

**Steps**:
1. `story-support/shell-frame.ts`: an optional sidebar tree (`items`, `current`) so the shell tree stories need no new frame, and an optional `skipLink` text (default unchanged, `Skip to the content`, so no existing baseline moves) that this screen's stories pass as `Skip to artifact` (DA-2, C-010; PLAN-FRESH4-011).
2. Register in `src/index.ts` by hand (additive); regenerate `custom-elements.json` by `pnpm manifest:generate` ONCE (the freeze); `test/surface-freeze.test.ts` extended (13 properties with attributes and run-time defaults; the 5 event names); a manifest-text assertion that the `@fires` description of `sk-open-link` in `custom-elements.json` contains the word "untrusted", placed in the OWNED `test/surface-freeze.test.ts` (not in `scripts/check-manifest.mjs`, which no work package owns); revert proof: removing the word from the `@fires` text makes that test fail.

3. The screen file derives the content and listing it passes to the parts under the selection-agreement rule (`contracts/sk-artifact-screen.md`, Rendering; ruling 2026-10-07): a `content` whose `path` differs from a non-empty `selectedPath`, or a `listing` whose `missionId` differs from a non-empty `mission.missionId`, is passed as null, so the existing null look applies. Parts never see a disagreeing value.

**Files**: `shell-frame.ts`, `src/index.ts`, `custom-elements.json`, `test/surface-freeze.test.ts`

**Validation**: `pnpm manifest:check` green

### Subtask T054: Skeleton tests and exit evidence

**Steps**:
1. Skeleton tests: one per event, exactly one event, exact payload, `bubbles`, `composed`; an unknown value per enumerated property; layout track counts at least at 1280, 1100, 1000, 800, 720, 719 and 620 px and the two widths either side of the ruled threshold inside `shellFrame`; the DOM-order test (inspector before the pane) at 1280, 800 and 620 px; one test per cache; the pane is focusable; the selection-agreement rows (a content for another path, a listing for another Mission: the null look, nothing drawn from the disagreeing value, each with a positive control of an agreeing value).
2. An uncommitted side-by-side per tier (1280, 1100, 1000, 800, 720 and 620 px) with the stub parts, handed to the orchestrator before chains X and Y start; one `shellFrame` scratch story NOT committed.
3. `pnpm test:terminology` green.

**Files**: `test/sk-artifact-screen.skeleton*.test.ts`, `sk-artifact-screen.layout*.test.ts`

**Validation**: all of Acceptance exits 0

## Acceptance (all runnable)

1. `pnpm test:terminology` green.
2. Skeleton, layout, DOM-order, cache, focusable-pane and overflow tests green with their positive controls.
3. `surface-freeze.test.ts` extended (13 properties, 5 events); `pnpm manifest:check` green after the single regeneration.
4. Reverting the `retry-types.ts` union fails `pnpm typecheck`; #5's and #4's tests stay green unchanged.
5. `pnpm lint` green over the stubs with the named R4 list and red when one name is removed.
6. The side-by-side per tier is in the WP report, uncommitted.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

A surface change after this WP is reported, not made. A change to `overflow-region.ts`, `wp-retry.ts` or `sk-work-package-screen.ts` beyond the one named edit is a stop. A name a later WP needs that the R4 list lacks is a change request to the orchestrator.

## Reviewer Guidance

Confirm the CP-1 entry predates the first commit. Check the five dispatch methods have one literal `dispatchEvent` each. Check the inspector is first in the DOM at every width. Check `overflow-region.ts` defaults leave its two present users unchanged. Check each stub keeps the final signature and `renderEmptyForm` is complete. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-06b

#### IC-06b Skeleton, layout and surface freeze
- **Purpose**: `sk-artifact-screen` with the FULL public surface (thirteen properties, `contracts/sk-artifact-screen.md`, including the optional `vocabulary`) and the normalisers of its enumerated properties wired; the selected-tab state (seed from `view`, reset on a path change, `onSelect`) with its skeleton test; the container-query layout (thresholds from S-A6, in rem; the inspector FIRST in the DOM and placed by the grid, A11Y-009 (b)); the overflow measurement (A11Y-003): the screen's scroll elements (the pane, the rendered article, the raw block, each table box) are the targets of the package's existing `OverflowRegion` (`packages/mission-ui/src/overflow-region.ts`, "the one overflow measurement of the package", used by the Work Package board and the Pipeline screen), extended by ONE named additive edit owned by IC-06b: an optional list of targets (several scrollers measured by the one controller) and an optional axis choice (horizontal, vertical or both, the default staying horizontal so its two present users behave exactly as before), with a per-target result the screen reads as its `overflowing` set; measure-on-every-host-update and the fonts-ready pass are kept, so no bespoke detector exists, feeding the `overflowing` set the parts receive; the named edit of `overflow-region.ts` is made here, with its own unit tests, and the board's and the Pipeline screen's existing tests stay green unchanged; every `*-parts.ts` and `prose-styles.ts` as a stub with its final export signatures (`renderEmptyForm` complete, the `renderStatus` bodies are IC-08's); **the reviewed named list of rule R4 for the element files, derived from those stubs and the part signatures of `contracts/sk-artifact-screen.md`** (every structural attribute name and every named property or boolean binding the parts need, `tone` of `sk-notice` among them, each with a one-line reason, written into the options IC-06a landed; exit check: `pnpm lint` green over the stubs with the list, red when one name is removed from it); the screen file draws every region container and `data-region` element, the pane as `role="region"` named `DOCUMENT_LABEL(name)` with `tabindex="-1"` and no id (the shell's skip link is not involved), and the visually hidden h1 where `needsHiddenHeading` says the pane has none (`src/visually-hidden.ts`, A11Y-005); the status and content-status switches; the five typed dispatch methods and payload builders (one literal `dispatchEvent` site each, `@fires` declared with the untrusted-`href` text for `sk-open-link`); **the neutral `src/retry-types.ts`** holding `RetryLoadDetail` (moved from `logic/wp-retry.ts`), `SkArtifactRetryDetail`, the union and the one `declare global` entry for `sk-retry-load`, with the ONE named edit of #5's merged files (`logic/wp-retry.ts` re-exports `RetryLoadDetail`; `sk-work-package-screen.ts` keeps its alias `SkRetryLoadDetail` and loses its event-map entry), and a type-level assertion file under `packages/mission-ui/test/` that compiles only with the union, so reverting it fails `pnpm typecheck`; a manifest-text assertion, carried by the existing manifest check or the surface-freeze test, that the `@fires` description of `sk-open-link` contains the word "untrusted"; the three caches in `willUpdate` (markdown model by value, path-to-kind map by listing, resolved tree).
- **Affected surfaces** (the files of the shared-files table that IC-06b owns): `src/elements/sk-artifact-screen/sk-artifact-screen.ts`, every `*-parts.ts` and `prose-styles.ts` as stubs (`renderEmptyForm` complete), `fixtures.ts`, `src/retry-types.ts` (new) with the named edit of `logic/wp-retry.ts` and `sk-work-package-screen.ts`, `src/overflow-region.ts` (the one named additive edit) with its unit tests, `src/story-support/shell-frame.ts` (the sidebar tree option and the `skipLink` text option), `src/index.ts` and `custom-elements.json` (the one manifest regeneration), `eslint.config.mjs` (only the derived R4 named list), `test/surface-freeze.test.ts`, the skeleton, layout and type-level assertion tests under `test/`. The stories files of the later WPs are not touched.
- **Exit checks**: skeleton tests (one per event, exactly one event, exact payload, `bubbles`, `composed`; an unknown value per enumerated property; layout cases: track counts at the S-A6 sampling widths (at least 1280, 1100, 1000, 800, 720, 719 and 620 px and the two widths either side of the ruled threshold) inside `shellFrame`; the DOM order test (inspector before the pane) at 1280, 800 and 620 px; one test per cache; the pane is focusable; the `overflowing` set flips when a wide child is added, with the control that a narrow child does not, and the CONTENT-ONLY case on both axes: the pane box keeps exactly its size while its content grows (a wider table or a longer document, a late font load) and the set flips on, with the positive control that the same unchanged-size box with content that fits stays off and that shrinking the content flips it off again); `surface-freeze.test.ts` extended (13 properties with attributes and run-time defaults; the 5 event names); `fixtures.ts` builders; `story-support/shell-frame.ts` gains an optional sidebar tree (`items`, `current`) so the shell tree stories need no new frame, and an optional `skipLink` text (default unchanged, `Skip to the content`, so no existing baseline moves) that this screen's stories pass as `Skip to artifact` (DA-2, C-010; PLAN-FRESH4-011); `pnpm test:terminology` green (exit check); an uncommitted side-by-side per tier (1280, 1100, 1000, 800, 720 and 620 px) with the stub parts, handed to the orchestrator before chains X and Y start; one `shellFrame` scratch story NOT committed; the single manifest regeneration (the freeze).
- **Relevant requirements**: FR-001 (as amended by A-9), FR-002, FR-032, FR-037, FR-039, FR-040, C-001, C-005, C-010.
- **Depends on**: IC-06a and the CP-1 entry (file precondition, as IC-06a).

### From `plan.md`: shared-file rows that name IC-06b

| Shared file | #5 (merged) holds | This mission adds | Rule |
|---|---|---|---|
| `sk-retry-load` typing: `logic/wp-retry.ts` and `sk-work-package-screen.ts` | `RetryLoadDetail` (the landed union), the alias `SkRetryLoadDetail`, the event-map entry | a neutral `src/retry-types.ts` holding `RetryLoadDetail`, `SkArtifactRetryDetail`, the union and the one `declare global` | ONE named edit of #5's merged files, by IC-06b: `logic/wp-retry.ts` re-exports `RetryLoadDetail`, `sk-work-package-screen.ts` keeps its alias and loses its event-map entry; #5's names, tests and manifest text are unchanged |

| File | Writer | Everyone else |
|---|---|---|
| `src/index.ts`, `custom-elements.json` | IC-06b (full public surface: 13 properties with attributes, `@fires` including the untrusted-`href` text of `sk-open-link`, all five literal `dispatchEvent` methods and payload builders); later only `pnpm manifest:generate` | a surface change is reported; IC-11 regenerates once; manifest conflicts resolve by regeneration only |
| `sk-artifact-screen.ts` | IC-06b only: class, properties (the `vocabulary` property included) and their normalisers' wiring, layout grid, placement (inspector first in the DOM), container queries, the five dispatch methods, the selected-tab state (seed from `view`, reset on a path change, `onSelect`), the `OverflowRegion` wiring (the screen's scroll elements as its targets, both axes) and the `overflowing` set it feeds, the hidden-heading wiring, the status and content-status switches (calls into `state-parts.ts`), the import and call of every part renderer, the composed `static styles`, the adoption of the sheets, the three caches (`willUpdate`) and the focus rule. Region WPs fill part bodies only | change request to the orchestrator |
| every `*-parts.ts`, `prose-styles.ts` | created by IC-06b as stubs with final export signatures (`contracts/sk-artifact-screen.md`, "Part signatures"); `renderEmptyForm` is complete in IC-06b; the owning WP replaces stub bodies and keeps every signature | none |
| `fixtures.ts` of the element (prop builders and the story pairing table of `contracts/contract-pin.md`) | IC-06b creates a builder for every fixture name and the whole pairing table (IC-02 does not touch this file); later WPs only import | change request |
| `src/retry-types.ts` (new) and the named edit of #5's merged files | IC-06b only: the neutral file holds `RetryLoadDetail`, `SkArtifactRetryDetail`, the union and the one `declare global` of `sk-retry-load`; ONE named edit of #5's merged files: `logic/wp-retry.ts` re-exports `RetryLoadDetail`, `sk-work-package-screen.ts` keeps its alias `SkRetryLoadDetail` and loses its event-map entry (D-04); no #5 name, test or manifest text changes | a change to this file is reported |
| `packages/mission-ui/src/overflow-region.ts` (#4's file; `OverflowRegion`, used by the Work Package board and the Pipeline screen) | IC-06b only: ONE named additive edit (several targets and both axes; measure-on-update and the fonts-ready pass kept; PLAN-FRESH3-001 (a)); the existing options and behaviour of its two users, and their tests, are unchanged | a change to this file is reported |
| `eslint.config.mjs`, `eslint-rules/**`, `gates/markdown-lint.selftest.ts` | IC-04 (rules R1 to R5, the `noInlineConfig` block, the local rules R1 and R4, the self-test and its leak cases), IC-06a (the options schema of rule R4 for the element files and the EMPTY named list with its leak cases; E-27 `classOnly` overrides, E-26 raw-button allowance (ruled at CP-1), and the `calculateConfigForFile` case that every override keeps R1 to R5) and IC-06b (ONLY the reviewed named list of rule R4 for the element files, DERIVED from the stubs and the part signatures it writes, each name with a one-line reason; PLAN-FRESH3-005 (b)). A name a later Work Package needs that the list lacks is a stop and a change request to the orchestrator, not an edit | none |
| `story-support/shell-frame.ts` | IC-06b only | none |

### From `plan.md`: lane mechanics (orchestrator-owned; WP agents never do any of this)

As #4 and #5 recorded (a spec-kitty tooling issue fast-forward `kitty/mission-<slug>` before every first claim and after any merge of `main`; a spec-kitty tooling issue and a spec-kitty tooling issue for dependent lanes and `status.json`; `owned_files` and `lanes.json` `write_scope` tool-owned and never hand-edited): (0) the entry condition of IC-01a (#5 merged upstream) is checked first and a miss is a stop; (1) record the base sha at dispatch; (2) pre-create each dependent lane from the approved parent's tip; (3) IC-10 is parented on IC-08 (chain X): the orchestrator merges the approved IC-09 tip into its lane (`git merge --no-ff`), resolves `custom-elements.json` by `pnpm manifest:generate` only, checks both chains' stories are present, and checks owned-files disjointness: the files changed by IC-09's tip against the `owned_files` of IC-07 and IC-08, where any overlap is a stop, reported, not merged by hand; (4) fallback: if that merge conflicts beyond `custom-elements.json` and `status.json`, serialise IC-09 after IC-08 and record it; (5) the CP-1 entry reaches the lanes by being committed on the target branch and `kitty/mission-<slug>` fast-forwarded; `git merge-base --is-ancestor <CP-1 commit> HEAD` is checked before `implement` and by the reviewer; (6) after IC-01b is approved the orchestrator copies the gzip figure and the node timing table from the IC-01b WP report into `research.md` D-05 and commits on the target branch (fast-forwarding `kitty/mission-<slug>`), BEFORE IC-04 is dispatched, because IC-04 sets the bundle budget from them (`research.md` is on the orchestrator's partition and is never written in a lane).

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-1** (`AV-33`, `AV-34`, `AV-35`, `FR-036`, `DA-33`; ACCEPTED; numbers ruled at CP-1, 2026-10-07: T = 45 rem (720 px), toolbar stack option C): the prototype's `.reading-layout` stays two columns down to a viewport of 800 px; the spec's "inspector under the toolbar at about 1100 px" misreads the prototype (at 1100 px only the shell changes tier). The rows become: AV-33 two columns at a 1100 px viewport (the shell's expanded tier edge; the spec's title "collapsed tier" is corrected to "expanded tier edge"), AV-34 one column with the inspector first at 800 px (the collapsed tier, content cell 688 px), AV-35 mobile at 620 px (the mobile tier, toolbar stacked, tables scrolling). The rule (PLAN-A11Y-001 (a)): two columns only from a content cell of at least 720 px, which the mobile tier (cell = viewport, below 720 px) can never reach; the 801 to 831 px viewport window of the collapsed tier (cell 689 to 719 px) shows one column where the prototype shows two, recorded as confirmed drift at CP-1 (DA-33). S-A6 samples 689, 719, 720, 732, 799, 800, 801, 831, 832, 1099 and 1100 px, recording for each viewport the one tier the shell selects and the content-cell width and fixes the numbers and the toolbar-stack threshold. Not taken: keeping 689 (a 419 px document column in the mobile tier) and a viewport media query at 800 px (contradicts FR-036).

- **A-3** (`FR-032`, `EV-6`, `EV-7`; ACCEPTED): `sk-retry-load` is shared with #5 but its payload is a discriminated union on `target` (`'content'` and `'listing'` here, `'work-package'` and `'detail'` there). The union, both detail types and the one `declare global` live in a neutral `src/retry-types.ts` (PLAN-DESIGN-002 (a), the `shell-types.ts` precedent); #5's names (`RetryLoadDetail`, alias `SkRetryLoadDetail`) stay as re-exports, and the single named edit of #5's merged files is in the shared-files table (D-04).

- **A-9** (`FR-001`; ACCEPTED with PLAN-DESIGN-022 (a)): FR-001's "twelve properties" becomes THIRTEEN: the twelve named there plus one optional `vocabulary` property (`ArtifactVocabulary | null`, default null meaning the `defaults/` values), passed into the logic functions, so a later charter-driven pipeline changes props and not the element (the spec's dynamic-pipeline constraint). The surface is 13 properties everywhere (this plan, `data-model.md`, `contracts/sk-artifact-screen.md`, `contracts/gates.md`, the surface-freeze text, IC-06b).

Screen layout, from the prototype (`.reading-layout`: `minmax(0, 1fr) 270px`, one column with the inspector first at a viewport of 800 px or less, `document-toolbar` column at 620 px or less) and the shell's real content widths. The shell has three tiers (`sk-mission-shell.ts`: expanded from a viewport of 1100 px, content cell = viewport minus 296 px; collapsed from 720 px, cell = viewport minus 112 px; mobile below 720 px, single column and no rail, cell = viewport), derived as #5 derived its own and proven by spike S-A6. The cell width is NOT monotonic in the viewport across the 720 px tier edge (a 719 px viewport gives a cell of 719 px, a 720 px viewport gives 608 px), so a threshold must be one the mobile tier cannot reach. The ruling (PLAN-A11Y-001 (a), A-1) is the rule below; its figures were ruled at CP-1 (2026-10-07) on S-A6:

| Content cell (container) | Layout |
|---|---|
| width at or above T = 45 rem (720 px; two columns), ruled at CP-1 (S-A6) | document pane `minmax(0, 1fr)` and inspector 270 px (E-28), the inspector placed in the right-hand track by grid placement although it is FIRST in the DOM (PLAN-A11Y-009 (b)). The shell's mobile tier (cell = viewport, below 720 px) can never reach T. The 1100 px viewport (content about 804 px) is HERE: two columns, which corrects spec rows AV-33 and DA-33 (amendment A-1) |
| width below T (one column) | one column, the inspector first (it is first in the DOM, so there is no `order` property), flat inspector with a top border. The 800 px viewport gives a cell of 688 px and is HERE. Viewports 801 to 831 px on the collapsed tier (cell 689 to 719 px) are also here although the prototype shows two columns: a 31 px window of confirmed drift, recorded at CP-1 (DA-33) |
| toolbar stack, OPTION C (ruled at CP-1): a container query `@container (max-width: 38.75rem)` (620 px) COMBINED with `:host(:state(shell-mobile))` from #5's `ShellTierController`, so the toolbar stacks only in the shell's mobile tier at a cell of 620 px or less | the toolbar stacks; tables keep their own scroll box (they have it at every width). The prototype's 620 px breakpoint lies inside the mobile tier. S-A6 measured zero drift over the sampled widths (no 720 to 732 px window, no 601 to 620 px window); the container-only option A (a 13 px window at 720 to 732 px) and the lower-threshold option B (fails the 620 px anchor) are rejected. The controller is used ONLY for this rule: the one-column rule stays the container threshold T with no controller, and the controller consumes the host's one `attachInternals()`, so the screen calls `attachInternals` nowhere else |

The shell owns the viewport tiers; the screen's thresholds are container queries on its own host (`container-type: inline-size`, the probe passed for #5), written in rem so the column switch follows the reader's text size (NFR-004; the figures above convert at the default 16 px root), values measured by S-A6 over the sampling list 689, 719, 720, 732, 799, 800, 801, 831, 832, 1099 and 1100 px, recording for each viewport the ONE tier the shell selects and the resulting content-cell width (with 1280, 1000 and 620 px) and recorded in `contracts/sk-artifact-screen.md`, "Layout". Every `display: grid` declares `grid-template-columns: minmax(0, 1fr)`-based tracks (#5's spike S9 lesson).

#### CP-1 asks (what the operator is shown and decides)

The operator's rulings of 2026-10-06 ("accept all" on the 23 plan forks and on A-1 to A-8, A-5 and A-8 excepted as stated below) settled the PRINCIPLES. CP-1 took the values that needed spike evidence (marked PENDING CP-1 until the operator's rulings of 2026-10-07) and the two items that were proposed only; all are ruled (`plan.md`, "CP-1 rulings (2026-10-07)").

1. The drift register DA-1 to DA-38, DA-39 and DA-40 (A-6, ruled "keep"; the raw block measure and the toolbar `min-height` values ruled at CP-1 on S-A2 and S-A4: a pinned 900 px and a pinned 68 px) and the new entry DA-41 (the bidirectional-control notice, below), with the six spike renders (S-A1 to S-A6) beside the prototype.
2. Spec amendments: the A-1 numbers (ruled at CP-1 on S-A6: T = 45 rem, toolbar stack option C); A-8a (layer 1) and A-8b (the three N-Q12 narrowings), PROPOSED and decided at CP-1 and nowhere else (both ACCEPTED as drafted on 2026-10-07; each stays separately revertable); and A-10 (a NFR-006 ceiling multiplier), only if IC-04 reported S-A0 step two figures that showed a need (ruled at CP-1: A-10 is NOT written, no multiplier).
3. Exceptions E-23 and E-25 to E-28, each decided on its spike evidence (ruled at CP-1: E-26 became the PAINT entry on S-A5; E-23 on S-A1 and S-A3, with the `ch` grant for `max-width: 68ch`; E-25 on S-A2; E-28 on S-A6), and E-29 on S-A4 (APPROVED). The design-library issues for G-14 to G-16, G-19, G-20 and G-21 (and G-17, G-18) are drafted before CP-1 and filed on the operator's word, so each ruled exception cites a number (filing is not covered by the CP-1 rulings and waits for the operator's word).
4. The copy defaults (`contracts/defaults.md`), including the bidirectional-control notice words, and the container thresholds S-A6 measured, per shell tier.
5. The tab-control and inline-link-control choice (D-13, D-14) on the S-A5 evidence (variant (c), a raw button with the segmented-choice family class plus `role="tab"`, was the preferred candidate and failed its own criterion on the S-A5 evidence; ruled at CP-1: the token paint variant, E-26), and the Work Package pill control (S-A4 outcomes (a), (b), (c); ruled at CP-1: outcome (c), a raw `button.sk-pill-tag`, E-29).
6. Notes, not decisions: (i) the prototype draws a no-fold glyph for `plan.md` and `tasks.md` (`05-artifact.html:21-22`); the plan keeps the existing `file` glyph for them, and whether the no-fold glyph is intended is read at CP-1 (the data table makes either answer a data change); (ii) the optional shell fold of PLAN-DESIGN-005 (`isSidebarTreeShown()` requiring that `current` matches a route leaf, a latent shell defect for any host) is NOT adopted here, because it touches shell code under FR-037; it is raised as a note for the operator; (iii) the cross-flag that #5's shipped container rule (`@container (min-width: 848px)` and `(max-width: 688px)` in `sk-work-package-screen.ts`) shows two columns in the viewports 689 to 719 px of the shell's mobile tier, which is the defect A11Y-001 fixes here; under "one shared rule" the operator decides whether #5 gets the same correction, and this mission changes nothing in #5 for it.

#### Build base (dependency on #4 and #5)

#4 is MERGED (`cef2d53`); this branch holds it. **Base A only (operator ruling PLAN-DESIGN-017, 2026-10-06)**: implementation builds on #5 AFTER #5 has merged to `main`. IC-01a is blocked until then: that is its entry condition, not a choice put to the operator at dispatch. The orchestrator re-verifies the merge state upstream at dispatch (`gh pr list` on the repository, `git ls-tree` of the merged `main`) and does not dispatch IC-01a otherwise; the local refs are never evidence. **State of #5 as of the verification date (2026-10-06)**: no pull request for #5 exists upstream; the planning branch `feat/work-package-screen-5` holds planning artifacts only (its commit `1b43257` carries a `status.json` with WP01 to WP09 approved and WP10 in progress); the implementation exists on `kitty/mission-work-package-screen-01M44DSJ` and its lane branches `-lane-a` to `-lane-j` (lane-j tip `d15cb5d`, 2026-10-06 09:47 +0200; every symbol below was re-read at that tip), and nothing is merged to the target branch yet. Every row of the table below was checked against real code, not against a plan, and is re-read on the merged tree by the orchestrator (a mismatch is reported, not absorbed; the list is the checklist of `contracts/sk-artifact-screen.md`, "Dependencies on #4 and #5"). IC-01a starts from "`main` with #4 and #5 merged", records the sha, and runs the full gate set for a green baseline first. Nothing is stacked, so the maintainer's practice of landing stacked slices himself does not arise.

What this mission needs from #5:

| Need | Where it comes from (verified symbol, lane-j tip `d15cb5d`) |
|---|---|
| `sk-select-work-package` `{ missionId, wpId }`, `sk-open-mission` `{ missionId, slug }`, `LabelHooks`, `lookup`, `relativeTime`, `resolveActivity`, `VIEW_STATES`, `renderIcon`, `shellFrame`, `flush`, gates, `classOnly` ESLint helper, the exception table to E-16 | #4, merged |
| `sk-retry-load` and its payload: `RetryLoadDetail`, the landed union of `WorkPackageRetryDetail` and `DetailRetryDetail` (each `{ missionId, wpId, target }`), a type in `logic/wp-retry.ts`, aliased `SkRetryLoadDetail` in `sk-work-package-screen.ts` (`export type SkRetryLoadDetail = RetryLoadDetail`), whose `HTMLElementEventMap` entry `CustomEvent<SkRetryLoadDetail>` is today the one `declare global` of the key | #5, new. IC-06b moves both detail types, the union and the one `declare global` to the neutral `src/retry-types.ts` (D-04); #5's names stay as re-exports |
| `REVIEW_CYCLE_ARTIFACT_KIND` in `defaults/review.ts`, typed `components['schemas']['ArtifactKind']` | #5; this mission's `defaults/artifact-kinds.ts` owns the whole kind table and IMPORTS that constant (D-12) |
| `factsSheet` (and the event-timeline sheet) in `library-sheets.ts` | #5; imported, never added here |
| `eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts` and `gates/fixtures/data-driven/**` as #5 extended them (S13 and S14, 38 selector entries, bare words matched only in comparisons) | #5; IC-02 extends the merged file in that shape and derives every count from the arrays, not from literals |
| Contract tooling: `--from-repo`, `PIN.json` provenance fields, check C8, `update.test.mjs`, `cli.test.mjs`, the literal counts in `registry.test.mjs`, `overlays.test.mjs`, `check.test.mjs`; additive lines in `contract/types.ts`, `logic/types.ts`, `defaults/index.ts` | #5 IC-01 and later; the final re-vendor still uses the public `--sha` form (D-09) |
| Exceptions E-17 to E-22 and the `stylelint-exceptions.test.mjs` cases | #5; this mission's numbering starts at E-23 with no gap |
| `sk-open-artifact` `SkOpenArtifactDetail { missionId, path, kind }` (`sk-work-package-screen.ts`) | #5 (emitted by the Work Package screen); consumed by the host; this screen never imports or re-emits it (asserted with a dispatched event of the same name and shape, a plain `CustomEvent`) |
| `scripts/wp-story-catalogue.test.mjs` (a node:test row-to-story test; on #5's tip it runs under `test:terminology`, which CI does not run) | #5; the model for this mission's, which is deliberately placed in `test:scripts` so CI runs it (a new CI behaviour, not precedent, PLAN-FRESH4-010) |

Because this mission lands after #5, its contract re-vendor (151 files at plan-time main) already contains #5's 1.1 slice (`WorkPackageDetail*` schemas are present at `2261ad5`), and there is no "whichever lands second" case. After IC-11, every gate self-test is re-run on the final tree (a reviewer check). The shared files below are the additive edits this mission makes on the merged tree.

| Shared file | #5 (merged) holds | This mission adds | Rule |
|---|---|---|---|
| `packages/mission-ui/src/index.ts`, `custom-elements.json` | its screen's exports and manifest | `sk-artifact-screen` | manifest by `pnpm manifest:generate` only; `index.ts` by hand, additive |
| `package.json` (root and package), `pnpm-lock.yaml` | its scripts | `markdown-it`, script entries (`test:no-io`, `test:scripts`) | by hand, additive; lockfile by `pnpm install` |
| `eslint.config.mjs`, `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs` | E-17 to E-22 and their cases | R1 to R5, `noInlineConfig`, the `chProperties` grant, E-23, E-25 to E-27 (E-29), E-28 | ids are appended after E-21; by hand |
| `eslint.data-driven.config.mjs`, `gates/fixtures/data-driven/**`, `gates/data-driven.selftest.ts` | S13 and S14 words, 38 entries, `EXPECTED_WORDS` | kinds and codes, bare-word comparison selectors | every count is derived from the arrays (no literal arithmetic); re-run both data-driven commands |
| `packages/mission-ui/src/library-sheets.ts` | `factsSheet`, event-timeline | uses `factsSheet` | not edited |
| `defaults/index.ts`, `logic/types.ts`, `contract/types.ts`, `contract/bulk.ts` | additive lines | re-exports, view types, bulk generators (the shared `LabelHooks` of `logic/types.ts` is NOT edited here) | by hand, additive |
| `shell-types.ts`, `shell-icons.ts` (#4's files) | the closed `ShellIcon` set and the glyph paths | two additive members, `magnifier` and `table` (paths from `05-artifact.html:23-24`) | additive only; no existing member or path edited |
| `scripts/contract/*.test.mjs` literals (`registry`, `overlays`, `check`) | its fixture counts | 30 registered fixtures | counts relative to the merged base, derived from the registry where possible |
| `gates/plants/**`, `.github/workflows/ci.yml` timeouts, `surface-freeze.test.ts`, `story-support/shell-frame.ts` | its plants, tests, timeouts | five plants, the unit-tests proof-leg timeout, 13 properties of this screen, the sidebar tree option | by hand; plants are array entries |
| `sk-retry-load` typing: `logic/wp-retry.ts` and `sk-work-package-screen.ts` | `RetryLoadDetail` (the landed union), the alias `SkRetryLoadDetail`, the event-map entry | a neutral `src/retry-types.ts` holding `RetryLoadDetail`, `SkArtifactRetryDetail`, the union and the one `declare global` | ONE named edit of #5's merged files, by IC-06b: `logic/wp-retry.ts` re-exports `RetryLoadDetail`, `sk-work-package-screen.ts` keeps its alias and loses its event-map entry; #5's names, tests and manifest text are unchanged |
| both `CHANGELOG.md`, `README.md` | its entries | one line per slice | by hand |

### From `contracts/`: what this work package is held to (verbatim)

#### Test obligations of IC-06b (`contracts/sk-artifact-screen.md`, "Test obligations by owner")

- IC-06b: skeleton (one test per event, exact payload, `bubbles`, `composed`); layout track counts at the S-A6 sampling widths (at least 1280, 1100, 1000, 800, 720, 719 and 620 px and the two widths either side of the ruled threshold); the DOM order test (inspector before the pane) at 1280, 800 and 620 px; the selected-tab state (seed from `view`, reset on a path change, `onSelect`); unknown value per enumerated property; the pane is focusable; one test per cache; the `OverflowRegion` wiring (a wide child flips a region into the `overflowing` set, a narrow child does not, and content growing inside a box of unchanged size flips it, on both axes, with the control of content that fits) and the unit tests of the named edit of `overflow-region.ts`; the derived R4 element list (`pnpm lint` green over the stubs, red when a name is removed); surface freeze (13 properties); the type-level union check for `retry-types.ts`; an uncommitted side-by-side per tier (1280, 1100, 1000, 800, 720, 620 px) with the stub parts, so a layout error is seen before chains X and Y start.

#### Part signatures (`contracts/sk-artifact-screen.md`)

#### Part signatures (IC-06b creates every file as a stub with these final signatures)

| File | Exports |
|---|---|
| `toolbar-parts.ts` | `renderToolbar(view: ToolbarView)`, `toolbarStyles` |
| `tab-parts.ts` | `renderTabs(view: TabsView, onSelect: (tab: ArtifactTab) => void)`, `tabStyles` (the selected tab is held by the screen file) |
| `document-parts.ts` | `renderDocument(view: DocumentView, handlers: LinkHandlers)` (the document EYEBROW, the kind word drawn above the document title, DA-14, carried by `DocumentView.eyebrow: string` (the kind's label through `ARTIFACT_KIND_WORDS` and `labels.kind`, the raw kind when unknown, so AV-01 and AV-29 have an owner; IC-07's alone, PLAN-FRESH4-001); rendered body, the empty-file body by calling `renderEmptyForm` of `state-parts.ts`, the redaction line and the truncation note, each drawn with the library `sk-notice` of tone `info` (PLAN-FRESH3-006 (a)); the note's render body is IC-07's alone, PLAN-CORRECT-013 (a)), `documentStyles` |
| `source-parts.ts` | `renderSource(text: string, label: string, bidiNotice: string \| null, scrolls: boolean)` (raw, fallback source; the bidirectional-control notice above the block when `bidiNotice` is not null, drawn with the library `sk-notice` of tone `info`; the block is a tab stop only when `scrolls`, from the `overflowing` set), `sourceStyles` |
| `refusal-parts.ts` | `renderRefusal(view: RefusalView, onRetry: () => void)`, `refusalStyles` |
| `inspector-parts.ts` | `renderInspector(view: InspectorView, handlers: InspectorHandlers)`, `inspectorStyles` |
| `state-parts.ts` | `renderStatus(view: StatusView, handlers: StatusHandlers)` (stub in IC-06b; the bodies for loading, error, not-found and nothing-selected are IC-08's), `renderEmptyForm(text: string, heading?: string)` (COMPLETE in IC-06b; the one place `sk-empty-state*` appears besides the refusal block; AV-18 uses it), `stateStyles` |
| `prose-styles.ts` | `proseStyles` (the one stylesheet of the rendered document, E-23) |

The exact view and handler types are recorded by IC-06b in this file under "View types recorded by IC-06b" (the `DocumentView` type carries the `eyebrow` string, so the frozen signature holds the data the eyebrow needs). `LinkHandlers` (and the document view) also carry the `overflowing` set, so the renderer and the parts draw `tabindex="0"` and the table box's role and positional name only for a member (A11Y-003, A11Y-004).

#### Story to fixture pairing (`contracts/contract-pin.md`)

#### Pairing (story to fixtures)

`contracts/sk-artifact-screen.md` names the stories; IC-06b is the sole owner and creates a pairing table `row -> { listing, content, refusal, selectedPath, mission, workPackages, status, contentStatus }` in `fixtures.ts`, and IC-11's row-to-story test reads it. Constraint (as #5): where both a listing and a content are given, `content.path` must equal `selectedPath`, and the entry for that path must exist in the listing unless the row is the "selected path not in the listing" edge case (R-12). The content examples whose paths `listingPopulated` lacks (`ContentRedacted`, `ContentJson`, `ContentEmpty`) therefore pair with `listingWithOpenFiles`.

#### Self-check list for reviewers (`contracts/gates.md`; its own heading says to copy it into every WP brief that touches these files)

#### Self-check list for reviewers (copy into every WP brief that touches these files)

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q2, operator ruling 2026-10-06.** **Who draws the tree.** Ruling: the shell tree draws it (as it does Work Packages), fed by the pure `buildArtifactTree(entries)` helper this mission exports from `logic/`; `sk-artifact-screen` is the document pane plus inspector, set to `flush`. The screen's events stay about the document; the tree's `sk-navigate` and `sk-tree-toggle` are the shell's. Verified against #4's code: `TreeNode` already has `kind` (`leaf` or `folder`), `children`, `meta` (the count), `unavailable`, `expanded`, `icon` and `prefix`, and the shell emits `sk-navigate` `{ id, href }` and `sk-tree-toggle` `{ id, expanded }`.
- **Q7, operator ruling 2026-10-06.** **Events.** Ruling: `sk-select-artifact` `{ missionId, path, kind }` (internal markdown link; the tree leaf is the shell's `sk-navigate`, Q2); reuse `sk-select-work-package`, `sk-open-pipeline` and `sk-retry-load` from #5; new `sk-open-link` `{ href }`; all verb-noun; `sk-open-artifact` is consumed from #5, not re-emitted. **Conflict found by this phase: #5 has no `sk-open-pipeline` (its P-1 ruling collapsed it into `sk-open-mission`). See N-Q10.**
- **N-Q10, operator ruling 2026-10-06.** **"Return to Pipeline"** emits `sk-open-mission` `{ missionId, slug }` (option (a)). No `sk-open-pipeline` event exists or is added; this supersedes the literal reuse in Q7. The `mission` property carries `slug`. EV-5 and AV-23 read as ruled.

#### Operator rulings on the plan-phase forks, 2026-10-06

After the plan squad held 23 forks, the operator ruled "ACCEPT ALL" of the arbiter's recommendations on 2026-10-06, for all 23 forks and the plan amendments A-1 to A-8. They bind tasks and review; the plan carries the detail. In short:

- **Base A**: build on #5 (after it merges). **Retry types**: a neutral `src/retry-types.ts` holds the shared `sk-retry-load` union (A-3). **Splits**: IC-01 and IC-06 are split; IC-02 stays whole.
- **Layout**: two columns only from a content cell of 720 px or wider, never in the mobile tier (A-1 accepted; numbers settled at CP-1 on S-A6 [T = 45 rem, ruled 2026-10-07]). **Inspector first in the DOM**; grid placement keeps it on the right in two columns. A-6 (DA-39, DA-40) accepted; values pending CP-1 [ruled at CP-1, 2026-10-07: 900 px and 68 px pinned].
- **Exceptions**: E-23 gets a `ch` grant in the Stylelint mechanism and complete property tables; tabs prefer the adopted segmented-choice family (S-A5 decides, pending CP-1) [ruled at CP-1, 2026-10-07: the token paint variant, E-26; see "Operator rulings at CP-1, 2026-10-07" below].
- **Renderer**: `parse.ts` exports only `parseTokens`; lint rule R4 is strict only in `logic/markdown`; element files use a reviewed named list; table scroll boxes get positional names with no document text in `aria-*`; request absence is proved by a CSP meta plus `securitypolicyviolation` with a positive control; a bidi-control notice and a corrected R-09 (a new DA entry at CP-1) [DA-41, confirmed 2026-10-07].
- **Spec edits**: the unapproved EV-2 sentence is REVERTED (done above); A-8 and the N-Q12 narrowings are decided at CP-1, not before [A-8a and A-8b accepted as drafted at CP-1, 2026-10-07; the EV-2 sentence is written back].
- **Evidence**: five local pinned `pnpm visual` runs in IC-11 (CI repeat is extra). Node-only tests via `scripts/` and `?raw`. NFR-006 gets hard ceilings plus a parse-count spy.
- **Tree**: an unreadable row stays disabled and `current` is empty when the selected leaf is unavailable; the host never writes tree toggles back. **Truncation note**: owned by IC-07. **Focus**: a table or panel is a tab stop only while it overflows. **Headings**: a visually hidden h1 where the pane has none.
- **Vocabulary**: one optional `vocabulary` property (so 13 properties; FR-001's "twelve" is amended by the plan). **Icons**: A-5 rejected; the magnifier and table glyphs are added to `shell-icons.ts`.
- A-2, A-4, A-7 accepted. Values that depend on spikes are PENDING CP-1, not decided [ruled at CP-1 on 2026-10-07: see "Operator rulings at CP-1, 2026-10-07" below].

#### Operator rulings on the seven new plan forks, 2026-10-06

The operator accepted the orchestrator's recommendations on 2026-10-06. Binding on tasks and review.

- **PLAN-FRESH3-001 (a)**: reuse `OverflowRegion`, extended to several targets and both axes as one named additive edit.
- **PLAN-FRESH3-004 (b)**: the `vocabulary` claim covers only the functions that read a member; a foreign refusal code goes through `labels.refusal`.
- **Partly filled `vocabulary`**: completed per group against `defaults/` (the conservative option).
- **PLAN-FRESH3-005 (b)**: IC-06b derives the R4 binding list from its stubs; IC-06a lands only the schema.
- **PLAN-FRESH3-006 (a)**: the truncation note, the redaction line and the bidi notice are drawn with `sk-notice`; no new exception.
- **PLAN-FRESH3-008 (b)**: the host keeps a Set from `sk-tree-toggle` (read-only, never written back to the shell) and passes it as `expandedIds` on the next rebuild, so opened folders stay open.
- **PLAN-FRESH3-010 / AV-17 (b)**: the AV-17 test moves to IC-10; only the story title stays with IC-09.

CP-1 items stay pending CP-1 [all ruled on 2026-10-07; see below].

#### Operator rulings on the four last plan forks, 2026-10-06

- **PLAN-FRESH4-002 (a)**: screen-side focus detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null. The public surface is unchanged.
- **PLAN-FRESH4-003 (b)**: no axe; role, name, landmark and idref assertions plus a Playwright `ariaSnapshot` dump. Axe leaves the spikes and IC-10's exit checks.
- **PLAN-FRESH4-007 (b)**: `copy` is removed from `ArtifactVocabulary` (five groups); string overrides go through `labels`.
- **PLAN-FRESH4-008 (a)**: `artifact_listing_unreadable` is not retryable in the content-refusal table; the listing failure is `status: error` (AV-14), consistent with FR-015.

#### Operator ruling on analyze A1 (tasks phase), 2026-10-06

The operator ruled option (A): `markdownFor` and its tests move from IC-02 (WP03) to IC-03 (WP04, exported from `logic/markdown/model.ts`); WP03 types the `markdown` input of `resolveArtifactView` and the vocabulary budget group structurally in `artifact-types.ts`. No WP count, dependency or signature changes. Applied in plan.md (two sentences), `contracts/defaults.md` and the WP03 and WP04 prompts.

### Operator rulings at CP-1, 2026-10-07 (CP-1 confirmed)

CP-1 confirmed, 2026-10-07. The operator ruled on the WP06 evidence (WP06 approved; the spikes S-A1 to S-A6 were run in Chromium and Firefox 153; WebKit could not launch on the host and is NOT TAKEN). The rulings below are binding and complete; they bind tasks and review. The write-through to the plan, the contracts and the work package prompts is recorded in `plan.md`, "CP-1 rulings (2026-10-07)".

1. **Markdown budget: option O3.** `maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000 (the cells move with the tokens). `maxDepth` 24 and the other limits are unchanged. No A-10 multiplier: A-10 is not written. Risk noted: inline-heavy 149k-token documents measured 437 to 512 ms against the 500 ms ceiling, so the ceiling test uses a document shape and a margin that do not flake; if it flakes, that goes back to the operator and the ceiling is never quietly relaxed.
2. **Tab control: the token paint variant.** E-26 becomes the paint entry: token `border-color`, `background` and `color` keyed on `aria-selected`, the forced-colours `Highlight` border, and the raw `<button type="button" role="tab">` allowance. The segmented-choice class is not used, so the `sk-segmented-choice*` row leaves E-27. Both panels are rendered (one `hidden`), or `aria-controls` is omitted on the unselected tab, so that no idref dangles. Sunset: G-16.
3. **Work Package pill: raw `button.sk-pill-tag`** (S-A4 outcome (c)). E-29 is approved and `sk-pill-tag` goes into E-27 as `classOnly` for `inspector-parts.ts`. Sunset: G-21. DA-29 is resolved by this ruling.
4. **Inspector facts: the library `sk-facts` look is accepted**: no row separators and 16 px values (14 px terms). Recorded explicitly as accepted drift in DA-34 and DA-28. No exception.
5. **Toolbar stack: option C.** Container `max-width: 38.75rem` combined with `:host(:state(shell-mobile))` through #5's `ShellTierController`, which gives zero drift across the sampled widths (no toolbar window). This amends FORK-2 (a) of 2026-10-07: the one-column rule stays the A-1 container threshold T = 45 rem (720 px) with no controller, and the controller is used ONLY for the toolbar stack. The controller consumes the host's one `attachInternals()`, so the screen must not call `attachInternals` anywhere else.
6. **Prose: keep our token CSS (E-23).** The `ch` grant is approved for `max-width: 68ch`. `letter-spacing` and `text-wrap` are dropped (not in E-23). G-14 is reworded: `sk-prose` exists in `@spec-kitty/styles` 1.1.0-rc.10 but does not match the prototype.
7. **Everything else as the evidence recommends.**
   - The drift register DA-1 to DA-41 is confirmed as proposed, with these additions: (i) DA-34 and DA-28 name the facts drift; (ii) DA-23 reads "focusable only while it overflows", and Home and End are inert for single-line files; (iii) DA-33 has no toolbar window under option C; (iv) DA-29 is resolved by the pill ruling. DA-39 (`900px` measure) and DA-40 (`68px` toolbar `min-height`) are kept as pinned values; DA-41 (the bidirectional-control notice) is confirmed.
   - A-1 numbers: T = 720 px (45 rem); the toolbar stack is option C of ruling 5.
   - A-8a and A-8b are accepted as drafted (both parts); the EV-2 sentence is written back. Note: WP04's `mailto:` check also rejects a leading or trailing `@`.
   - E-25: `white-space: pre-wrap` plus a pinned 900 px measure; no `overflow-wrap` grant; no box paint.
   - E-28: the `270px` track and the `68px` toolbar `min-height` are pinned.
   - A-10 is not written.
   - The copy stays as rendered (`contracts/defaults.md`).
   - WebKit is untested: an ACCEPTED OPEN RISK (Kitty Desktop on Linux runs WebKitGTK). The PR description states it.

## Test strategy and test quality rules (verbatim)

From #4 `research.md` D-34 (rules 1 to 5; rule 6 is #4's 500-Mission test and does not apply):

**Test quality rules (binding; stated in every WP brief, checked by every reviewer).** The charter wants every event and its payload asserted; these rules make a test fail when the behaviour is reverted instead of passing vacuously:

1. Every no-event test carries a positive control in the same test: the same listener, on the same target, receives an event when a sibling action that does emit is performed (a listener on the wrong target or a misspelt event name cannot make "emits nothing" pass).
2. Every emit test asserts exactly one event (`events.length` equal to 1, so a library `click` bubbling beside the screen's own would show), `bubbles` and `composed` true, `cancelable` false, and the detail with deep equality (`toEqual`, not `toMatchObject`).
3. Counts are asserted with equality (3 and 7 phases, five columns, 22 fixtures, 118 stories against 118 baselines), never "at least". Every loop over fixtures, stories or items asserts that the loop ran the expected N times.
4. Every changed behaviour has a revert check: the WP report lists, per test file, one deliberate revert of the behaviour (a temporary local edit in the work-package worktree, never committed), the failing test name it produced, and the restore; the reviewer re-runs two of them.
5. The C-009 terminology check is a node test with a known-positive sample so it can fail (`scripts/terminology.test.mjs`, owned by IC-09; run by `pnpm test:scripts`, which is wired into the `hygiene` gate under ruling P-9, exception E-06); it scans `packages/*/src` source text and this mission's reader-facing guide `quickstart.md` (a docs line is how the word survived a source-only scan) for the word "feature" (case-insensitive, whole word; the spec, plan and decision records are not scanned because they quote the rule and the spec's own future-work prose) and its own test feeds a sample containing the word and requires a hit.

Reading note for rule 5 (not part of the quotation): "IC-09" and "this mission" there are #4's plan and mission. In this mission the terminology check is the existing `pnpm test:terminology` (`scripts/terminology.mjs` and its test), owned by no work package here and run as an exit check by every work package that writes under `packages/*/src`.

From this mission's `research.md` D-19:

#### D-19 Test strategy (D-34 of #4)
The package's vitest runs in Chromium only (`packages/mission-ui/vitest.config.ts`: browser mode, one chromium instance), so every file under `packages/mission-ui/test/` is a browser test: the pure model and logic are tested there too (the "model twin" is the same assertions run on the model without mounting a screen, in the same Chromium project), the screen, the corpus walk and the interaction tests use `page.viewport` first. Tests that need the file system or a bundler are `node:test` files under `scripts/`, run by `pnpm test:scripts` (the `hygiene` gate): the bundle budget (IC-04) and the row-to-story test (IC-11); #5's `scripts/wp-story-catalogue.test.mjs` is the model for the latter, but on #5's tip it runs under `test:terminology` (`node scripts/terminology.mjs && node --test scripts/terminology.test.mjs scripts/wp-story-catalogue.test.mjs scripts/visual-tags.test.mjs`), which CI does not run, so this mission deliberately places `scripts/artifact-story-catalogue.test.mjs` in `test:scripts` (run by the `hygiene` gate) so that CI runs it: a new CI behaviour, not precedent (PLAN-FRESH4-010); source scans use `import.meta.glob('../src/**/*.ts', { query: '?raw' })` in browser mode, as `defaults.test.ts` does with the contract YAML (PLAN-TEST-001 (b) plus (c), ruled 2026-10-06; the `unit-tests` gate command is unchanged). IC-01b checks that the root `vite` programmatic `build` is importable. No assertion on a class name; every event test has a positive control (the same interaction with a deliberately wrong precondition emits nothing, or the other event); every "no X" test is paired with a test that X appears in a control rendering (R-08); revert checks per test file; no `setTimeout` waits (`updateComplete`).

Request absence (PLAN-TEST-003 (a)): the structural walk (no `img`, `src` or `href`, assertions 1 and 3 of the corpus) is the stated proof of NFR-005. A `<meta http-equiv="Content-Security-Policy" content="img-src 'none'; frame-src 'none'; object-src 'none'">` is inserted in the corpus test file's document before rendering, with a `securitypolicyviolation` listener (it fires without a network), and a positive control: a hand-built `<img src="http://example.invalid/x.png">` triggers the listener. The meta applies to the corpus test file only, because a meta CSP cannot be removed for the document. A resource-timing observer is NOT used (it cannot see pending or `data:` requests).

Timing (PLAN-TEST-008 (a), ruled 2026-10-06): the spec numbers of NFR-006 are HARD ceilings (500 ms for a 256 KiB document and for a 1000-entry tree, 200 ms for a re-render), each measured as the best of three runs after a warm-up, in Chromium (the engine that asserts them), by the test clock (never in the screen). Before the clock starts the test pins the expected branch: the 256 KiB document (`makeLargeMarkdown`, the large content of the stories) must resolve to `ok` with a block count above 0, and the over-budget document to `fallback`, so a fast fallback cannot pass the large-document check. The re-render claim is proved by a counted `parseTokens` spy: after N property changes that leave `content` unchanged the spy count is 1 (removing the cache fails it), plus the node identity of an unchanged rendered block. The spec numbers (500 ms, 200 ms) ARE the gate ceilings; there is no multiplier. A multiplier would be allowed ONLY as the numbered amendment A-10 (`plan.md`); CP-1 ruled on 2026-10-07 that A-10 is NOT written and there is no multiplier: a test over the spec numbers that fails is a finding that goes back to the operator and is never quietly relaxed. The markdown budget is the option O3 values (`maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000), and the ceiling test uses a document shape and a margin that do not flake, because inline-heavy 149k-token documents measured 437 to 512 ms against the 500 ms ceiling.

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative and tool-owned; stage only these). A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit. The part files created as stubs by WP08 are owned by WP09, WP10 and WP11 afterwards.

**Gates this work package must pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test:scripts`, `pnpm contract:check && pnpm test:contract`, `pnpm test` (the unit-tests gate; its output must list your test files), `pnpm build-storybook`, and `pnpm test:terminology` for every work package that writes under `packages/*/src` (and its exit check). `pnpm visual` is NOT an exit check before WP13; `pnpm gate-proof` is run by the orchestrator where a plant changed. A gate that is red is classed against the baseline table WP01 recorded and the orchestrator names in the dispatch (`tracer-approach.md`): a red absent from it is INTRODUCED and fixed here; a red present in it is reported as pre-existing and not fixed here.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two of them.

**Test quality rules and test strategy**: the binding text is quoted VERBATIM in the section "Test strategy and test quality rules (verbatim)" below (#4 D-34 rules 1 to 5 and this mission's `research.md` D-19). Rule 6 of #4 is its 500-Mission test and does not apply here.

**Visual drift = REJECT.** The approved prototype (`<prototype>/05-artifact.html` with `prototype.css`) is the visual authority (C-006, NFR-008). The only allowed differences are the drift register DA-1 to DA-41 (`spec.md` "Visual Drift Register", extended by DA-39 to DA-41 in the plan) AS CONFIRMED by the operator at CP-1 (DA-1 to DA-41 confirmed on 2026-10-07; an entry not confirmed would be PROPOSED) and any entry the operator did not confirm is a REJECT item for the work package that introduces it. Any other visible difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off (uncommitted; no baseline PNG before WP13).

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, history compaction into named slices and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with `spec-kitty safe-commit` (explicit files, `--to-branch`), a conventional message (`feat(artifact-viewer-screen): ... (#7)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Named edits outside this work package's own surface (recorded in the hand-off with a one-line rationale)

- every `*-parts.ts` and `prose-styles.ts` of the element, created here as STUBS with final export signatures (`renderEmptyForm` COMPLETE); they are owned by WP09, WP10 and WP11 afterwards (the stubs are a recorded out-of-map creation)
- `eslint.config.mjs` (owner WP05): ONLY the derived R4 named list for the element files
- `logic/wp-retry.ts` and `elements/sk-work-package-screen/sk-work-package-screen.ts` are #5's merged files (absent on the planning base, hence declared as `.*` globs here): the ONE named edit of the plan, nothing else in them changes

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP07. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP08 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

## PR shape and standing rules (verbatim from `plan.md`)

Reading of the charter: the plan-phase squad runs once after this phase; the aggregate review squad before the draft PR is the operator's standing wrap-up rule (charter 046), report-only, over the implementation diff. ONE pull request, opened only after: accept, test cleanup, the aggregate squad, compaction of history into named slices, rebase onto `main`, full gate re-run, and the operator's Storybook review after the last WP and before wrap-up; then the DRAFT PR. Work packages never push and never open pull requests. Compaction slices, named in advance: contract re-vendor and fixtures (IC-01a); markdown-it dependency and supply-chain record (IC-01b); defaults, logic and gate cases (IC-02); markdown model (IC-03); markdown renderer, corpus, lint rules and plants (IC-04); exceptions, Stylelint grant and lint configuration (IC-06a); skeleton, layout and surface freeze (IC-06b); document pane (IC-07); refusals and states (IC-08); inspector, tree and Work Package links (IC-09); tiers, accessibility and edge cases (IC-10); integration and baselines (IC-11). There is no spike slice: the IC-05 spike code is deleted by a named final commit (`chore(ic-05): remove spike code`), as #5 did. **The PR description names the new runtime dependency** (`markdown-it` 15.0.2, MIT, the licences of its transitive set as printed by `pnpm why markdown-it`, the advisory check re-run at wrap-up against the repository list and the global database (six advisories at plan time), the measured bundle figure and the hostile-corpus evidence, FR-043). Every WP brief states: the word `feature` (whole word, any case) is forbidden in `packages/*/src`, story titles, doc comments, fixture content and corpus text (C-009; the identifier `contentFeatures` is safe, the prose around it is not), and every WP that writes under `packages/*/src` (IC-01a, IC-02 to IC-04, IC-06b, IC-07 to IC-11) runs `pnpm test:terminology` as an exit check (CI first sees a red tree only on the PR run, after compaction); no sub-agents; no push; baselines only inside the pinned container; `pnpm visual` is not an exit check before IC-11; no absolute path or username in any committed file (use `<repo>`, `<prototype>`); a denied command means stop and report; the test-quality rules of #4 D-34 and the drift register status are copied in.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report the exact text; never retry it another way, never pattern-kill processes, never `git stash`, never `git rebase`, never `rm` with variable globs. Keep `core.bare` false.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container and ONLY in WP13 (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off; never hand-edit or copy a PNG.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr` (rem in container queries); every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the ruled exceptions.
- Screens do no arithmetic on contract values (C-004); no kind, lane, phase or refusal-code literal outside `defaults/` (C-007); document text never becomes markup, a URL, a style or a selector (C-014).
- Never call status `materialize()`; never hand-edit spec-kitty state, `lanes.json`, `status.json`, `owned_files` or WP dependencies (all tool-owned).
- `tracer-*.md`, `spec.md`, `plan.md`, `research.md` and `contracts/` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
