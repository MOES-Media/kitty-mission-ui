---
work_package_id: WP07
title: Exceptions, Stylelint grant and lint configuration (IC-06a)
dependencies: [WP06]
requirement_refs:
- FR-040
- C-005
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T20:59:31.895967+00:00'
subtasks:
- T042
- T043
- T044
- T045
- T046
phase: Phase 3 - Lint, skeleton and freeze
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: stylelint.config.mjs
execution_mode: code_change
owned_files:
- stylelint.config.mjs
- scripts/stylelint-exceptions.test.mjs
role: implementer
---

# Work Package Prompt: WP07 - Exceptions, Stylelint grant and lint configuration (IC-06a)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Land every lint and Stylelint change the screen needs, each with its reverted-must-fail proof, BEFORE any element code exists: the `chProperties` grant, E-23 as a literal `EXCEPTIONS` entry, E-25, E-28, E-26 (the PAINT entry), E-29, the E-27 `classOnly` overrides, the E-26 raw-button allowance, and the options schema of rule R4 with its EMPTY named list.

## Context

Everything in this WP is driven by the operator's CP-1 ruling. The E-23 entry in `stylelint.config.mjs` must equal the CP-1 ruling property for property (the reviewer diffs the two). The named list of rule R4 for the element files is NOT written here: IC-06b (WP08) derives it from the stubs it writes (PLAN-FRESH3-005 (b)); this WP lands only the schema and the empty list. No file under `packages/*/src` is touched.

Read first: `plan.md` section "IC-06a" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-06a. Requirements: FR-040, C-005.

## Precondition (first step, before the first subtask)

**FILE PRECONDITION (first step, first exit check)**: the dated entry `CP-1 confirmed` exists in `tracer-design-decisions.md` and in `spec.md` Clarifications, committed on the target branch BEFORE this WP's first commit, and `git merge-base --is-ancestor <CP-1 commit> HEAD` holds in the lane worktree. The `CP-1 confirmed` entry now EXISTS (2026-10-07): the CP-1 commit is the one whose subject begins `spec(artifact-viewer-screen): CP-1 confirmed` (find it with `git log --grep='CP-1 confirmed' --format=%H`); the lane worktree must contain it, so merge the planning branch into the lane before dispatch. If absent: STOP and report; edit nothing. The reviewer REJECTS if the entry was not present before the first IC-06a commit.

## CP-1 rulings binding on this work package (2026-10-07)

The operator's CP-1 rulings are complete and binding (verbatim in "Binding rulings" below; `plan.md`, "CP-1 rulings (2026-10-07)"). No PENDING CP-1 value remains. For this work package:

- **E-23** is the literal entry of `contracts/gates.md` as written there (the ruled values): the `ch` grant covers `max-width: 68ch` only; `letter-spacing` and `text-wrap` are NOT in the entry (dropped). The reviewer diffs the entry against the ruling.
- **E-25** (`source-parts.ts`): keyword `white-space: pre-wrap`, tokens `font-family`, `font-size`, `color`, the E-16 focus-ring properties, and the pinned `max-width: 900px` (named `unstrict` entry with `pxProperties`). NO `overflow-wrap` grant; NO box paint (`border`, `border-radius`, `background` are not granted).
- **E-26** (`tab-parts.ts`) is the PAINT entry: token `border-color`, `background` and `color` keyed on `aria-selected`, plus the keywords `Highlight` and `CanvasText` for `border-color` inside `@media (forced-colors: active)`; ESLint allows the raw `<button type="button" role="tab">` with no class there. No `sk-segmented-choice*` row in E-27.
- **E-27**: `inspector-parts.ts` gets `sk-facts*` and `sk-pill-tag`; `tab-parts.ts` gets nothing.
- **E-28**: `270px` inside `grid-template-columns` (`sk-artifact-screen.ts`) and `68px` as `min-height` (`toolbar-parts.ts`), both pinned.
- **E-29** (`inspector-parts.ts` only): a raw `<button type="button" class="sk-pill-tag">`.
- Sunsets: E-23 G-14 (reworded) and G-19, E-25 G-15, E-26 G-16, E-27 G-20, E-28 G-19, E-29 G-21.

## Subtasks

### Subtask T042: FILE PRECONDITION: the `CP-1 confirmed` entry

**Steps**:
1. Verify the entry in `tracer-design-decisions.md` and `spec.md` Clarifications and the ancestor check named above; name the CP-1 commit in the WP report. Read the ruling on E-23, E-25 to E-29, the `ch` grant values and the copy defaults before writing any value.

**Files**: none

**Validation**: ancestor check exits 0

### Subtask T043: `chProperties` grant in `exceptionOverrides()`

**Steps**:
1. Add `chProperties` as a third per-entry key beside `pxProperties` and `emProperties` in `stylelint.config.mjs` `exceptionOverrides()` (the base `unit-allowed-list` is `['%', 'fr']` and cannot otherwise express `max-width: 68ch`); `unit-allowed-list` gains `ch` when any entry names it; `declaration-property-unit-disallowed-list` is adjusted the same way.
2. Proof cases (`unit-allowed-list` and `declaration-property-unit-disallowed-list`): `ch` allowed in the granted file on the granted property, refused in a sibling file, refused on a property without the grant, each reverted-must-fail.

**Files**: `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs`

**Validation**: all proof cases red when the grant is reverted

### Subtask T044: E-23 literal entry, E-25, E-28, E-26 paint

**Steps**:
1. Write E-23 as a literal `EXCEPTIONS` entry (files, properties, unstrict, values, pinned, pxProperties, chProperties) with the complete property tables of `contracts/gates.md`, values AS RULED at CP-1 (the plan-time values are candidates only). E-25 (raw and escaped-source block, `source-parts.ts`) and E-28 (inspector track `270px` in `sk-artifact-screen.ts`; the toolbar band `min-height` in `toolbar-parts.ts`, DA-40 kept) as ruled (E-28: `270px` track and `68px` toolbar `min-height`, both pinned); E-26 as the PAINT entry for `tab-parts.ts`; E-29 (the raw `button.sk-pill-tag` in `inspector-parts.ts`) as ruled.
2. Each entry has proof cases in `scripts/stylelint-exceptions.test.mjs` and a leak case (a sibling file is refused).

**Files**: `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs`

**Validation**: the E-23 entry equals the CP-1 ruling property for property

### Subtask T045: ESLint: E-27 `classOnly`, E-26 raw-button allowance, R4 options schema

**Steps**:
1. E-27: one `classOnly([...])` override per file exactly as the table of `contracts/gates.md` (inspector `sk-facts*` and `sk-pill-tag` (E-29); state-parts `sk-empty-state*` and `sk-progress*`; refusal-parts `sk-empty-state*`; tab-parts none (E-26 is a paint entry and the tab carries no class); the others none), each with a leak plant; the stubs IC-06b creates are covered.
2. E-26 raw-button allowance (`type="button" role="tab"`, NO `class`) for `tab-parts.ts`, with a leak plant (a raw button without that exact shape, or in another file, is refused); E-29 raw-button allowance (`type="button"`, class `sk-pill-tag` only) for `inspector-parts.ts` only, with a leak plant.
3. The options schema of rule R4 for `elements/sk-artifact-screen/**` and the EMPTY named list (structural attribute names and named property or boolean bindings, each needing a one-line reason; `href`, `src`, `srcset`, `srcdoc`, `style`, `on*` and `.innerHTML` are never accepted by the schema), with leak cases.

**Files**: `eslint.config.mjs`, `eslint-rules/**` (options only)

**Validation**: `pnpm lint` green; a leak case per exception

### Subtask T046: `calculateConfigForFile` case and exit run

**Steps**:
1. Add the named case to `gates/markdown-lint.selftest.ts` that every overridden screen file and one `elements/**` file keep R1 to R5 (`ESLint.calculateConfigForFile`).
2. Run `pnpm lint:styles`, `pnpm lint`, `pnpm test:scripts`, `pnpm lint:no-io && pnpm test:no-io`; diff the E-23 entry against the CP-1 ruling.

**Files**: `gates/markdown-lint.selftest.ts` (named additions)

**Validation**: all of Acceptance exits 0

## Acceptance (all runnable)

1. `pnpm lint:styles`, `pnpm lint` and `pnpm test:scripts` green.
2. Every proof case red when its grant is reverted, with a leak case per exception (a sibling file refused); the `ch` grant refused on a non-granted property and for a file outside the entry.
3. `pnpm lint:no-io && pnpm test:no-io` green with the added case.
4. The E-23 entry in `stylelint.config.mjs` equals the CP-1 ruling property for property.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

A value the CP-1 ruling did not confirm is a REJECT item here. An exception needed beyond the ruled list is a stop and a change request, not an edit.

## Reviewer Guidance

Confirm the CP-1 entry predates the first commit. Revert each grant yourself. Diff E-23 against the ruling. Confirm no file under `packages/*/src` changed and the R4 named list is EMPTY (IC-06b derives it). The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-06a

#### IC-06a Exceptions, Stylelint grant and lint configuration
- **Purpose**: every lint and Stylelint change the screen needs, each with its reverted-must-fail proof, before any element code exists (PLAN-DESIGN-019): the **`chProperties` grant in `exceptionOverrides()`** of `stylelint.config.mjs` (the `ch` unit as a per-property grant beside `pxProperties` and `emProperties`; the base `unit-allowed-list` is `['%', 'fr']` and cannot otherwise express `max-width: 68ch`), with `unit-allowed-list` and `declaration-property-unit-disallowed-list` cases: allowed in the granted file, refused in a sibling file, refused on a property without the grant, reverted-must-fail; **E-23 written as a literal `EXCEPTIONS` entry** (files, properties, unstrict, values, pinned, pxProperties, chProperties) with the complete property tables of `contracts/gates.md` (values ruled at CP-1, S-A1 and S-A3), E-25 and E-28 as ruled at CP-1, E-26 as the PAINT entry (token `border-color`, `background` and `color` keyed on `aria-selected` plus the forced-colours `Highlight` border), and E-29 (the raw `button.sk-pill-tag`); the E-27 `classOnly` overrides (now including `sk-pill-tag` for `inspector-parts.ts` and no segmented-choice row), the E-26 raw-button allowance (`type="button" role="tab"`, no class), the options schema of rule R4 for `elements/sk-artifact-screen/**` and the EMPTY named list (structural attribute names and named property or boolean bindings, each needing a one-line reason; `href`, `src`, `srcset`, `srcdoc`, `style`, `on*` and `.innerHTML` never accepted by the schema), with the leak cases; the list itself is derived by IC-06b from the stubs it writes (PLAN-FRESH3-005 (b)), because no element code exists yet here, and the `ESLint.calculateConfigForFile` case (a named addition to `gates/markdown-lint.selftest.ts`) that every overridden screen file and one `elements/**` file keep R1 to R5.
- **Relevant requirements**: FR-040, C-005.
- **Affected surfaces**: `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs`, `eslint.config.mjs`, `eslint-rules/**` (options only), `gates/markdown-lint.selftest.ts` (named additions). No file under `packages/*/src`.
- **Exit checks**: `pnpm lint:styles`, `pnpm lint` and `pnpm test:scripts` green; every proof case red when its grant is reverted, with a leak case per exception (a sibling file refused); the `ch` grant refused on a non-granted property and for a file outside the entry; `pnpm lint:no-io && pnpm test:no-io` green with the added case; the E-23 entry in `stylelint.config.mjs` equals the CP-1 ruling property for property (the reviewer diffs the two).
- **Depends on**: IC-05 and CP-1 (file precondition: the `CP-1 confirmed` entry; the WP stops and reports if absent; the reviewer rejects if it was not present before the first IC-06a commit).

### From `plan.md`: shared-file rows that name IC-06a

| File | Writer | Everyone else |
|---|---|---|
| `eslint.config.mjs`, `eslint-rules/**`, `gates/markdown-lint.selftest.ts` | IC-04 (rules R1 to R5, the `noInlineConfig` block, the local rules R1 and R4, the self-test and its leak cases), IC-06a (the options schema of rule R4 for the element files and the EMPTY named list with its leak cases; E-27 `classOnly` overrides, E-26 raw-button allowance (ruled at CP-1), and the `calculateConfigForFile` case that every override keeps R1 to R5) and IC-06b (ONLY the reviewed named list of rule R4 for the element files, DERIVED from the stubs and the part signatures it writes, each name with a one-line reason; PLAN-FRESH3-005 (b)). A name a later Work Package needs that the list lacks is a stop and a change request to the orchestrator, not an edit | none |
| `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs` | IC-06a (the `chProperties` grant in `exceptionOverrides()` with its proof cases; E-23 as a literal `EXCEPTIONS` entry, E-25, E-28 as ruled at CP-1, E-26 as the paint entry, E-29 as ruled, each with proof cases) | none |

### From `plan.md`: lane mechanics (orchestrator-owned; WP agents never do any of this)

As #4 and #5 recorded (a spec-kitty tooling issue fast-forward `kitty/mission-<slug>` before every first claim and after any merge of `main`; a spec-kitty tooling issue and a spec-kitty tooling issue for dependent lanes and `status.json`; `owned_files` and `lanes.json` `write_scope` tool-owned and never hand-edited): (0) the entry condition of IC-01a (#5 merged upstream) is checked first and a miss is a stop; (1) record the base sha at dispatch; (2) pre-create each dependent lane from the approved parent's tip; (3) IC-10 is parented on IC-08 (chain X): the orchestrator merges the approved IC-09 tip into its lane (`git merge --no-ff`), resolves `custom-elements.json` by `pnpm manifest:generate` only, checks both chains' stories are present, and checks owned-files disjointness: the files changed by IC-09's tip against the `owned_files` of IC-07 and IC-08, where any overlap is a stop, reported, not merged by hand; (4) fallback: if that merge conflicts beyond `custom-elements.json` and `status.json`, serialise IC-09 after IC-08 and record it; (5) the CP-1 entry reaches the lanes by being committed on the target branch and `kitty/mission-<slug>` fast-forwarded; `git merge-base --is-ancestor <CP-1 commit> HEAD` is checked before `implement` and by the reviewer; (6) after IC-01b is approved the orchestrator copies the gzip figure and the node timing table from the IC-01b WP report into `research.md` D-05 and commits on the target branch (fast-forwarding `kitty/mission-<slug>`), BEFORE IC-04 is dispatched, because IC-04 sets the bundle budget from them (`research.md` is on the orchestrator's partition and is never written in a lane).

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-4** (`FR-005`, `NFR-009`; ACCEPTED): the lint rule set is named (D-06, R1 to R5; R2 reshaped by PLAN-CORRECT-001 (b), R4 by PLAN-FRESH-001 (a)) and the `data-driven` gate learns `ArtifactKind` and the seven refusal codes from schema enums (D-11), which the spec left to this plan.

- **A-6** (the drift register; ACCEPTED as "keep"; values ruled at CP-1, 2026-10-07: DA-39 a pinned 900 px, DA-40 a pinned 68 px): two items the prototype carries and the register does not mention are DA-39 (the raw block's reading measure, `.raw-view` `width: min(900px, 100%)`) and DA-40 (the toolbar band's `min-height: 68px`); each is carried with a token where one exists, otherwise by E-25 or E-28 pinned. S-A2 and S-A4 include the two numbers in their prototype side-by-sides.

#### CP-1 asks (what the operator is shown and decides)

The operator's rulings of 2026-10-06 ("accept all" on the 23 plan forks and on A-1 to A-8, A-5 and A-8 excepted as stated below) settled the PRINCIPLES. CP-1 took the values that needed spike evidence (marked PENDING CP-1 until the operator's rulings of 2026-10-07) and the two items that were proposed only; all are ruled (`plan.md`, "CP-1 rulings (2026-10-07)").

1. The drift register DA-1 to DA-38, DA-39 and DA-40 (A-6, ruled "keep"; the raw block measure and the toolbar `min-height` values ruled at CP-1 on S-A2 and S-A4: a pinned 900 px and a pinned 68 px) and the new entry DA-41 (the bidirectional-control notice, below), with the six spike renders (S-A1 to S-A6) beside the prototype.
2. Spec amendments: the A-1 numbers (ruled at CP-1 on S-A6: T = 45 rem, toolbar stack option C); A-8a (layer 1) and A-8b (the three N-Q12 narrowings), PROPOSED and decided at CP-1 and nowhere else (both ACCEPTED as drafted on 2026-10-07; each stays separately revertable); and A-10 (a NFR-006 ceiling multiplier), only if IC-04 reported S-A0 step two figures that showed a need (ruled at CP-1: A-10 is NOT written, no multiplier).
3. Exceptions E-23 and E-25 to E-28, each decided on its spike evidence (ruled at CP-1: E-26 became the PAINT entry on S-A5; E-23 on S-A1 and S-A3, with the `ch` grant for `max-width: 68ch`; E-25 on S-A2; E-28 on S-A6), and E-29 on S-A4 (APPROVED). The design-library issues for G-14 to G-16, G-19, G-20 and G-21 (and G-17, G-18) are drafted before CP-1 and filed on the operator's word, so each ruled exception cites a number (filing is not covered by the CP-1 rulings and waits for the operator's word).
4. The copy defaults (`contracts/defaults.md`), including the bidirectional-control notice words, and the container thresholds S-A6 measured, per shell tier.
5. The tab-control and inline-link-control choice (D-13, D-14) on the S-A5 evidence (variant (c), a raw button with the segmented-choice family class plus `role="tab"`, was the preferred candidate and failed its own criterion on the S-A5 evidence; ruled at CP-1: the token paint variant, E-26), and the Work Package pill control (S-A4 outcomes (a), (b), (c); ruled at CP-1: outcome (c), a raw `button.sk-pill-tag`, E-29).
6. Notes, not decisions: (i) the prototype draws a no-fold glyph for `plan.md` and `tasks.md` (`05-artifact.html:21-22`); the plan keeps the existing `file` glyph for them, and whether the no-fold glyph is intended is read at CP-1 (the data table makes either answer a data change); (ii) the optional shell fold of PLAN-DESIGN-005 (`isSidebarTreeShown()` requiring that `current` matches a route leaf, a latent shell defect for any host) is NOT adopted here, because it touches shell code under FR-037; it is raised as a note for the operator; (iii) the cross-flag that #5's shipped container rule (`@container (min-width: 848px)` and `(max-width: 688px)` in `sk-work-package-screen.ts`) shows two columns in the viewports 689 to 719 px of the shell's mobile tier, which is the defect A11Y-001 fixes here; under "one shared rule" the operator decides whether #5 gets the same correction, and this mission changes nothing in #5 for it.

### From `contracts/`: what this work package is held to (verbatim)

#### Test obligations of IC-06a (`contracts/sk-artifact-screen.md`, "Test obligations by owner")

- IC-06a: the proof cases of `scripts/stylelint-exceptions.test.mjs` (the `ch` grant allowed in its file, refused in a sibling and on a property without the grant; E-23, E-25, E-28 allowed, refused in a sibling, reverted-must-fail), the ESLint override cases (E-27, the E-26 raw-button shape, the R4 options schema with the empty element list and its leak cases) and `calculateConfigForFile` for every overridden screen file and one `elements/**` file keeping R1 to R5.

#### Exceptions (`contracts/gates.md`)

#### Exceptions ruled at CP-1 (2026-10-07): E-23 and E-25 to E-29

Six exceptions (E-29 approved at CP-1). E-24 (tables) is merged into E-23: the merge keys exceptions by file and both were `prose-styles.ts`, and Stylelint cannot scope a grant by selector.

| Id | Item | Files (only) | Allowed | Sunset |
|---|---|---|---|---|
| E-23 | Prose typography of the rendered document and its tables (DA-15, DA-16, DA-17) and the inline link look: the prototype's `.prose` measure, line height, paragraph measure, heading rhythm, list and quote and code and rule looks, table cell borders and alignment, header mono face, link underline and cursor, and the focus ring of the followable links, the rendered article, the pane and the table scroll box. Only properties outside `LAYOUT_PROPERTIES` need a grant (`padding`, `padding-inline`, `margin`, `gap`, `overflow-x` are layout and take tokens with no exception; `padding-inline-start` and `border-inline-start` are NOT in the layout list). Any property whose value a token provides is written with the token and needs no exception (S-A1 and S-A3 decide which) | `prose-styles.ts` | the COMPLETE table is the literal entry in "E-23 as an `EXCEPTIONS` entry" below: token values for `color`, `font-family` (the mono token on code and the table header), `font-size`, `font-weight`, `background`, `border` and `border-radius` (with the keyword `solid`), `border-inline-start` (the quote rule), `padding-inline-start` (list indent; token only, and, like `font-family`, `font-weight` and `border-inline-start`, it is NOT in `STRICT_PROPERTIES` of `stylelint.config.mjs`, so the entry lists it under `strict` and a literal such as `2rem` is refused); keywords for `font-style` (`italic`, `normal`), `border-collapse` (`collapse`), `text-align` (`left`, `center`, `right`, the keywords of `data-align` on table cells), `vertical-align` (`top`, if S-A3 keeps it), `white-space` (`pre`, `pre-wrap`) and `overflow-wrap` (`break-word`) for prose code and tables, `list-style-type` (`disc`, `decimal`, `none`), `text-decoration` (`underline` on followable links, `none` on inert links, so followable links differ from inert text by more than colour), `cursor` (`pointer`); the ring properties token `outline-width`, `outline-offset`, token `outline-color` with `outline-style: solid` (E-16's pattern) on `[data-md=link]`, the rendered article, the pane and the table box; pinned literals, each named and proven, through NAMED `unstrict` entries because `max-width` and `line-height` are strict properties: `max-width: 800px` (reading measure) and `max-width: 68ch` (paragraph measure, which needs the `ch` grant of the Stylelint mechanism, below), `line-height: 1.65` (unless S-A1 finds a token). The programmatic focus of the pane keeps the browser's default `:focus-visible` behaviour. Property values ruled at CP-1 (S-A1 and S-A3, 2026-10-07): the `ch` grant is approved for `max-width: 68ch`; `letter-spacing` and `text-wrap` are NOT in the entry (dropped); the token CSS is kept rather than the library `sk-prose` sheet | G-14 (`sk-prose` exists in `@spec-kitty/styles` 1.1.0-rc.10 but does not match the prototype: 640 px column, 24 px line height, h1 32 px and h2 24 px, sans 14 px table header, no paragraph measure, tables only styled with `sk-data-table` classes the renderer cannot emit) and G-19 (reading-width token); the design-library issues are drafted before CP-1 and filed on the operator's word at CP-1 (the one rule of this file's preamble) |
| E-25 | The raw and escaped-source block (DA-22, DA-23): a preformatted block that wraps at spaces and scrolls sideways for an unbroken line, and its measure (DA-39: `width: min(900px, 100%)` in the prototype, ruled "keep" and pinned at 900 px at CP-1) | `source-parts.ts` | keyword `white-space: pre-wrap`, token `font-family`, `font-size`, `color`, the E-16 focus-ring properties, and `max-width: 900px` (a named `unstrict` entry with the pinned value and `pxProperties`; S-A2 found no token for the measure, and a block fills the pane up to 900 px as the prototype's `min()` does) for DA-39. NO `overflow-wrap` grant (`normal` is the initial value and S-A2 found no failing case). NO box paint: `border`, `border-radius` and `background` are NOT granted (the prototype's block has no box). `padding` is layout. Keyboard: ArrowRight scrolls the focused block 40 px per press, Home, End, PageDown and Space do not scroll it horizontally (S-A2), so a single-line file is practically unreachable by keyboard past its first screen; the text stays selectable (accepted, CP-1). The bidirectional-control notice above the block is an `sk-notice` (tone `info`) and takes no property from this row (PLAN-FRESH3-006 (a)) | G-15 (`sk-code-block`) |
| E-26 | The tablist as a native `<button type="button" role="tab">` PAINTED with tokens (the paint variant of S-A5, ruled at CP-1). The library's segmented-choice class is NOT used: its selected look follows `aria-pressed` and never `aria-selected` (S-A5), and `aria-pressed` is invalid on a tab. The paint: token `border-color`, `background` and `color` keyed on `[aria-selected='true']`, and, in `@media (forced-colors: active)`, a `Highlight` border on the selected tab (`CanvasText` on the others), so the selected tab stays distinguishable without its background. A tab keeps a block size of at least 36 px (the prototype's `.segment`; the paint variant measured 36 px in S-A5, asserted in IC-10). No idref dangles: BOTH panels are rendered (the unselected one `hidden`), or `aria-controls` is omitted on the unselected tab | `tab-parts.ts` | ESLint: raw `<button` only as `type="button" role="tab"` in this file, with NO `class=` and no `classOnly` for the file (leak plant: a raw button without that exact shape, or in another file, is refused); Stylelint: a PAINT entry for `tab-parts.ts` allowing token `border-color`, `background` and `color` and the keywords `Highlight` and `CanvasText` for `border-color` inside the forced-colors query, each with an allowed case, a refused-in-a-sibling case and a reverted-must-fail proof | G-16 (no tabs element with tablist semantics; shares #4's E-01 sunset, design-library #501, a library tabs element or `sk-button` ARIA passthrough) |
| E-27 | `class=` allowance for the library's styles-only families, one `classOnly([...])` override per file, each with a leak plant (as #4's E-01 to E-03 and #5's E-17) | `inspector-parts.ts`: `sk-facts*` and `sk-pill-tag` (E-29, ruled at CP-1). `state-parts.ts`: `sk-empty-state*`, `sk-progress*`. `refusal-parts.ts`: `sk-empty-state*`. `tab-parts.ts`: none (E-26 is a paint entry; the tab carries no class). `sk-artifact-screen.ts`, `toolbar-parts.ts`, `document-parts.ts`, `source-parts.ts`: none. IC-06a grants exactly this table, stubs included | class attribute with those prefixes per file; nothing else | G-20 (the library elements for the facts, empty-state and progress families, as #4 and #5) |
| E-28 | Layout lengths with no token: the inspector track (`270px`, the prototype's value) and the toolbar band's `min-height` (DA-40, kept at CP-1: the prototype's 68 px) | `sk-artifact-screen.ts` (the track); `toolbar-parts.ts` (the band) | two pinned lengths: `270px` inside `grid-template-columns` and `68px` as `min-height` (both pinned at CP-1); the container-query lengths are written in rem and need no entry (the probe passed for #5: container-query lengths need no entry), so E-28 is only these two lengths (the track is `270px`, not rem or a clamp: pinned at CP-1) | G-19 (`--sk-layout-inspector-width`; #4's E-08 and spec-kitty-design#505 ask for the same token) |
| E-29 | APPROVED at CP-1 (S-A4 outcome (c)): a raw `<button type="button" class="sk-pill-tag">` for the clickable Work Package pill. `sk-pill-tag` has no interactivity of its own, outcome (a) is a role hack with hand-written key handling, and outcome (b) `sk-button` loses the pill look (DA-29); the raw button is a native button (Tab, Enter and Space), 26 px block size (at least 24 px), a round focus ring, an ellipsis rule that works, the full text in `title` and the accessible name | `inspector-parts.ts` only | ESLint: raw `<button type="button">` in this file only, with a leak plant (a raw button elsewhere is refused), carrying only the class `sk-pill-tag` (the E-27 `classOnly` for the file); block size at least 24 px | G-21 (a library interactive pill) |

#### The `chProperties` grant and E-23 as an `EXCEPTIONS` entry (IC-06a)

`stylelint.config.mjs` `exceptionOverrides()` builds `unit-allowed-list` as `['%', 'fr']` plus `px` and `em` only for the properties named in `pxProperties` and `emProperties`; there is no `ch` grant, so `max-width: 68ch` (the prototype's `.prose p` measure) cannot be written. Ruling (PLAN-DESIGN-013 and PLAN-CORRECT-009 (a), 2026-10-06): IC-06a adds `chProperties` as a third per-entry key, picked like `pxProperties`; `unit-allowed-list` gains `ch` when any entry names it; `declaration-property-unit-disallowed-list` forbids `ch` in the catch-all key and, in each partition key, on the properties that do not own it (a px-only property forbids `em` and `ch`, an em-only one `px` and `ch`, a ch-only one `px` and `em`). Proof cases in `scripts/stylelint-exceptions.test.mjs`: `68ch` allowed on `max-width` in `prose-styles.ts`, refused in a sibling file, refused on a property without the grant, `68em` and `68px` refused where only `ch` is granted, and a reverted-must-fail proof (without the grant the case fails with the unit message). The grant is general, so it reuses the px and em partition logic ("one shared rule").

E-23 is written as a LITERAL entry, so the CP-1 ruling is executable as written (the values below are the values RULED at CP-1 on 2026-10-07; `letter-spacing` and `text-wrap` are deliberately absent; a property needed beyond this list is a change request to the orchestrator, not an edit):

```js
{
  id: 'E-23',
  files: ['sk-artifact-screen/prose-styles.ts'],
  properties: ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'background', 'border', 'border-radius',
    'border-inline-start', 'border-collapse', 'padding-inline-start', 'text-align', 'vertical-align', 'white-space',
    'overflow-wrap', 'list-style-type', 'text-decoration', 'cursor',
    'outline-width', 'outline-style', 'outline-color', 'outline-offset', 'max-width', 'line-height'],
  strict: ['font-family', 'font-weight', 'border-inline-start', 'padding-inline-start'],   // none of the four is in STRICT_PROPERTIES (checked at stylelint.config.mjs): `strict` makes the token-only rule apply to them
  unstrict: ['max-width', 'line-height'],            // named: both are strict properties, so the pinned values are their only guard
  keywords: { border: ['solid'], 'border-inline-start': ['solid'] },
  values: {
    'max-width': ['800px', '68ch'], 'line-height': ['1.65'],
    'font-style': ['italic', 'normal'], 'border-collapse': ['collapse'], 'text-align': ['left', 'center', 'right'],
    'vertical-align': ['top'], 'white-space': ['pre', 'pre-wrap'], 'overflow-wrap': ['break-word'],
    'list-style-type': ['disc', 'decimal', 'none'], 'text-decoration': ['underline', 'none'], cursor: ['pointer'],
    'outline-width': [], 'outline-color': [], 'outline-style': ['solid'],
    'outline-offset': ['/^calc\\(-1 \\* var\\(--sk-border-width-[0-9]+\\)\\)$/'],
  },
  pinned: ['max-width', 'line-height', 'text-decoration', 'cursor'],
  pxProperties: ['max-width'],
  chProperties: ['max-width'],
}
```

E-25 (`source-parts.ts`) and E-28 (`sk-artifact-screen.ts`, `toolbar-parts.ts`) are written the same way once CP-1 rules DA-39 and DA-40; each entry gets an allowed case, a refused-in-a-sibling case and a reverted-must-fail proof.

Drift items met WITHOUT an exception (confirmed at CP-1): DA-3 to DA-14 (words, icons (the two additive glyphs of IC-02 make DA-3 hold with no drift), tree data), DA-18 to DA-21 (inert images, links, hostile text, the library `sk-notice`), DA-10, DA-32 and DA-41 (the truncation note, the redaction line and the bidirectional-control notice: each an `sk-notice` of tone `info`, in files that carry no exception), DA-24 to DA-28, DA-30, DA-31 and DA-34 (the adopted `facts` sheet with its accepted look, `sk-button`, `sk-notice`; DA-29 is met BY E-29), DA-35, DA-36, DA-37.

#### Self-check list for reviewers (`contracts/gates.md`; its own heading says to copy it into every WP brief that touches these files)

#### Self-check list for reviewers (copy into every WP brief that touches these files)

## Binding rulings (verbatim from `spec.md` Clarifications)

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

- `eslint.config.mjs` (owner WP05): the E-27 `classOnly` overrides, the E-26 raw-button allowance, the R4 options schema and the EMPTY named list
- `eslint-rules/**` (owner WP05): options only
- `gates/markdown-lint.selftest.ts` (owner WP05): named additions

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP06. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP07 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
