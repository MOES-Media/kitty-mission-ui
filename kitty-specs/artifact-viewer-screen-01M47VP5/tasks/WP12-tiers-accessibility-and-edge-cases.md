---
work_package_id: WP12
title: Tiers, accessibility and edge cases (IC-10)
dependencies: [WP10]
requirement_refs:
- FR-031
- FR-032
- FR-033
- FR-034
- FR-035
- FR-036
- NFR-002
- NFR-003
- NFR-004
- NFR-006
- NFR-009
- NFR-011
- SC-002
- SC-004
- SC-006
- SC-010
- C-007
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-08T07:20:04.024285+00:00'
subtasks:
- T077
- T078
- T079
- T080
- T081
- T082
- T083
- T084
- T085
- T086
phase: Phase 5 - Integration
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
- packages/mission-ui/src/elements/sk-artifact-screen/tiers-edge-cases.stories.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-artifact-screen/tiers-edge-cases.stories.ts
- packages/mission-ui/test/sk-artifact-screen.tier*.test.ts
- packages/mission-ui/test/sk-artifact-screen.a11y*.test.ts
- packages/mission-ui/test/sk-artifact-screen.timing*.test.ts
- packages/mission-ui/test/sk-artifact-screen.media*.test.ts
- packages/mission-ui/test/sk-artifact-screen.composition*.test.ts
- packages/mission-ui/test/sk-artifact-screen.dynamic*.test.ts
- packages/mission-ui/test/sk-artifact-screen.truncation*.test.ts
- packages/mission-ui/test/sk-artifact-screen.eyebrow*.test.ts
role: implementer
---

# Work Package Prompt: WP12 - Tiers, accessibility and edge cases (IC-10)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Deliver the `Tiers and edge cases` stories (AV-30, AV-32a to d, AV-33 to AV-35) and the cross-cutting tests: tier outcomes, focus order and tab stops, large text, the NFR-006 hard ceilings with the parse-count spy, semantics, heading outline, announcements, forced colors and reduced motion, target size, EV-8, the SC-002 audit, the dynamic-pipeline test, the AV-17 test and the eyebrow half of AV-29.

## Context

Parented on WP10 (chain X) by the tool; the ORCHESTRATOR merges the approved WP11 tip (chain Y) into this lane (`git merge --no-ff`), resolves `custom-elements.json` by `pnpm manifest:generate` only, checks both chains' stories are present and checks owned-files disjointness (WP11's changed files against the owned files of WP09 and WP10; any overlap is a stop, reported, not merged by hand). If that merge conflicts beyond `custom-elements.json` and `status.json`, WP11 is serialised after WP10 and the fact recorded. The tool records the dependency on WP10 only (dependencies are tool-owned and not hand-edited). This WP adds tests and stories only: no part file and no `sk-artifact-screen.ts`.

Read first: `plan.md` section "IC-10" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-10. Requirements: FR-031, FR-032, FR-033, FR-034, FR-035, FR-036, NFR-002, NFR-003, NFR-004, NFR-006, NFR-009, NFR-011, SC-002, SC-004, SC-006, SC-010, C-007.
Requirements NFR-014 and NFR-015 (amendment A-7, accepted) are written into `spec.md` (CP-1 write-back item (7), 2026-10-07). They bind this work package as the plan's traceability table states: forced colors and reduced motion, and target size (a tab at least 36 px, a Work Package control at least 24 px of block size).

## Precondition (first step, before the first subtask)

**First step**: confirm chain Y is merged in: the WP11 tip (named in the dispatch) is an ancestor of HEAD, and the WP11 stories (`inspector-tree.stories.ts`) are present. If absent: STOP and report. Also confirm the `CP-1 confirmed` entry is an ancestor.

## CP-1 rulings binding on this work package (2026-10-07)

The operator's CP-1 rulings are complete and binding (verbatim in "Binding rulings" below; `plan.md`, "CP-1 rulings (2026-10-07)"). No PENDING CP-1 value remains. For this work package:

- **Thresholds**: two columns from a cell of 45 rem (720 px); the 801 to 831 px viewport window (collapsed tier, cell 689 to 719 px) is one column where the prototype is two (confirmed drift, DA-33); the toolbar stack is option C (`@container (max-width: 38.75rem)` combined with `:host(:state(shell-mobile))`), so there is NO toolbar window: assert a row at viewports 732, 720, 719 and 689 and stacked at 620, with positive controls. AV-33 (1100 px, two columns), AV-34 (800 px, one column, inspector first), AV-35 (620 px, toolbar stacked, tables scrolling).
- **Single `attachInternals`**: the controller consumes the host's one `attachInternals()`; assert the source holds no second call.
- **NFR-014 and NFR-015**: forced-colors emulation asserts the selected tab's `Highlight` border (E-26 paint), the focus ring and the table box; a tab at least 36 px, a Work Package control (`button.sk-pill-tag`) at least 24 px.
- **Focus order**: tree, inspector, tabs, document; Home and End are inert for a single-line file (documented, DA-23).
- **NFR-006 ceiling test (ruling 1)**: there is NO multiplier (A-10 is not written). Use a document shape and a margin that do not flake: inline-heavy 149k-token documents measured 437 to 512 ms against the 500 ms ceiling, the mixed 100k-token shapes 175 to 226 ms. Pin the expected branch (`ok`) first, take the best of three after a warm-up, and choose the large fixture (`makeLargeMarkdown`) so that its best-of-three sits well under 500 ms with headroom stated in the test. If the ceiling still flakes, STOP and report to the operator; never relax it.
- WebKit is untested and an ACCEPTED OPEN RISK; do not claim WebKit coverage.

## Subtasks

### Subtask T077: Merge-step checks and the repeated AV-01/AV-08 side-by-side

**Steps**:
1. Verify the precondition above and the owned-files disjointness result named in the dispatch.
2. Repeat the side-by-side for AV-01 and AV-08 on the merged chains (the inspector facts and inspector redaction line of those two rows are checked here, because they are WP11's) and record it in the WP report.

**Files**: WP report

**Validation**: side-by-side recorded

### Subtask T078: Tier stories and outcome assertions (AV-30, AV-33 to AV-35)

**Steps**:
1. Story title `Tiers and edge cases`: AV-30a long path, AV-30b 200-character file name, AV-30c deep nesting, AV-30d 1000-entry tree, AV-30e very long unbroken source line, AV-30f 256 KiB document (six stories; clip the 256 KiB story to its first screen if size or settle time warrants), AV-33 (1100 px, expanded tier edge, two columns), AV-34 (800 px, collapsed tier, one column, inspector first), AV-35 (620 px, mobile tier, toolbar stacked, tables scrolling); AV-32a to AV-32d are also STORIES of this file (focus order, focus ring on an inline link, on a table scroll box and on the raw block), thirteen stories in all (the catalogue row of `contracts/sk-artifact-screen.md`).
2. Outcome assertions (inspector placement, toolbar stacking) at the S-A6 widths and at 1000 px, with a control width where the outcome flips.

**Files**: `tiers-edge-cases.stories.ts`, `test/sk-artifact-screen.tier*.test.ts`

**Validation**: outcomes asserted with a flipping control

### Subtask T079: Focus order, tab stops and NFR-003

**Steps**:
1. AV-32a to AV-32d: focus order tree, inspector, tabs, document; focus ring on an inline link, on a table scroll box and on the raw block; `tab-<n>` counts start at the shell's wrapper, at 1280, 800 and 620 px, asserting the inspector's controls come before the tabs at every width (A11Y-009 (b)).
2. NFR-003: tab stops equal controls shown; a scroll region is a tab stop only while it overflows, with an overflowing and a non-overflowing document as the pair of controls; helper controls: a deliberately wide child flips the overflow detector, content growing inside a pane box of unchanged size does too, and an added `button` flips the stop count.

**Files**: `test/sk-artifact-screen.a11y*.test.ts`

**Validation**: each helper has its control

### Subtask T080: Large text and reflow (NFR-004)

**Steps**:
1. Root font size 200% at 1100 and 720 px: no horizontal overflow, the resolved track count at 200% at 1100 px (one column), and a 320 px at 400% reflow check (only tables scroll).

**Files**: `test/sk-artifact-screen.tier*.test.ts`

**Validation**: helper with a control

### Subtask T081: NFR-006 hard ceilings and the parse-count spy

**Steps**:
1. 256 KiB document, 1000-entry tree and a re-render on a property change that leaves `content` untouched: HARD ceilings at the spec numbers (500 ms, 500 ms, 200 ms), each the best of three after a warm-up, expected branch pinned first (`makeLargeMarkdown` resolves to `ok` with block count above 0; `makeOverBudgetMarkdown` to `fallback`); the cache proved by a counted `parseTokens` spy over N property changes that leave `content` unchanged (a revert of the cache fails it). There is no multiplier (A-10 is not written, CP-1 2026-10-07).

**Files**: `test/sk-artifact-screen.timing*.test.ts`

**Validation**: a test over the spec numbers that fails is a finding, not a trigger to scale

### Subtask T082: Semantics, heading outline, announcements

**Steps**:
1. Explicit role, accessible-name, landmark and idref assertions and no axe, no new devDependency (PLAN-FRESH4-003 (b)); heading outline over the six fixtures (markdown, json, empty, refused, not-found, hostile): one `h1` in every state except a rendered markdown body, which keeps the headings it was authored with; announcement assertions.

**Files**: `test/sk-artifact-screen.a11y*.test.ts`

**Validation**: assertions explicit, no axe

### Subtask T083: Forced colors, reduced motion and target size

**Steps**:
1. Using the Vitest browser `cdp()` session (`Emulation.setEmulatedMedia` with `forced-colors: active` and `prefers-reduced-motion: reduce`): assert the computed outline, border and animation values, each with a positive control that the same element differs without the emulation; a tab at least 36 px and a Work Package control at least 24 px of block size (NFR-014, NFR-015). A new test file owned here; `vitest.config.ts` is not edited (PLAN-FRESH4-004).

**Files**: `test/sk-artifact-screen.media*.test.ts`

**Validation**: positive controls present

### Subtask T084: EV-8, the SC-002 audit and the host composition

**Steps**:
1. EV-8 (positive control: a dispatched `sk-open-artifact` is consumed, nothing re-emitted); the SC-002 audit: a capture-phase listener for every `sk-*` name on the document through the composition test, the seen names a subset of the manifest's events and at least the five declared events seen; unknown kind and unknown code in a full host composition.

**Files**: `test/sk-artifact-screen.composition*.test.ts`

**Validation**: subset and at-least-five assertions

### Subtask T085: Dynamic-pipeline test (SC-004)

**Steps**:
1. A `vocabulary` with a thirteenth kind, its own icon and a different container segment renders with no change to the element; a refusal code outside the seven renders through `labels.refusal` as its eyebrow with the generic sentence and no retry; a type-level case shows `copy` is not a member of `ArtifactVocabulary`; a refusal code is NOT carried by `vocabulary`.

**Files**: `test/sk-artifact-screen.dynamic*.test.ts`

**Validation**: foreign values render in full

### Subtask T086: AV-17 test and the eyebrow half of AV-29, exit evidence

**Steps**:
1. AV-17: the note present when `truncated`, absent otherwise, read through the screen on the merged chains (moved here from IC-09, PLAN-FRESH3-010 (b)); the eyebrow half of AV-29: the raw kind word of an unknown kind as the document eyebrow, read through the screen on the merged chains (PLAN-FRESH4-001).
2. `pnpm test:terminology` green; the AV-17 test green on the merged tree.

**Files**: `test/sk-artifact-screen.truncation*.test.ts`, `test/sk-artifact-screen.eyebrow*.test.ts`

**Validation**: all of Acceptance exits 0

## Acceptance (all runnable)

1. `pnpm test:terminology` green.
2. The NFR-003, NFR-004 and NFR-006 helpers with their controls; the NFR-006 hard ceilings at the spec numbers.
3. The forced-colors and reduced-motion tests (the `cdp()` mechanism with positive controls); role, accessible-name, landmark and idref assertions green (no axe, no new devDependency); the tier outcome assertions.
4. The SC-002 audit; the dynamic-pipeline test; the AV-17 test and the eyebrow half of AV-29 green on the merged tree.
5. The owned-files disjointness check at the merge step and the repeated AV-01 and AV-08 side-by-side recorded in the WP report.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

A defect found in a chain X or Y file is a change request to the orchestrator. A timing test that fails is reported with figures, never scaled by multiplier.

## Reviewer Guidance

Check every helper has its control (a deliberately wide child, an added button, content growing in a box of unchanged size). Check the expected branch is pinned before the clock starts. Check no axe dependency. Check the SC-002 audit counts at least the five declared events. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-10

#### IC-10 Tiers, accessibility and edge cases
- **Purpose**: Story title `Tiers and edge cases`: AV-30 (six variants), AV-32a to AV-32d (focus order: tree, inspector, tabs, document; focus ring on an inline link, on a table scroll box and on the raw block), AV-33 (expanded tier edge, 1100 px, two columns), AV-34 (collapsed tier, 800 px, one column), AV-35 (mobile tier, 620 px); focus-order and `tab-<n>` tests (counts start at the shell's wrapper) **at 1280, 800 and 620 px**, asserting the inspector's controls come before the tabs at every width (A11Y-009 (b)); the NFR-004 test (root font size 200% at 1100 and 720 px, no horizontal overflow, the resolved track count at 200% at 1100 px, and a 320 px at 400% reflow check) and NFR-003 (tab stops equal controls shown; a scroll region is a tab stop only while it overflows, with an overflowing and a non-overflowing document as the pair of controls), each as a helper with a control (a deliberately wide child flips the overflow detector, and so does content growing inside a pane box of unchanged size; an added `button` flips the stop count); NFR-006 timing tests (256 KiB, 1000 entries, re-render) as HARD ceilings at the spec numbers, each measured as the best of three after a warm-up, with the expected branch pinned first (`makeLargeMarkdown` resolves to `ok` and its block count is above 0 before the clock starts; `makeOverBudgetMarkdown` to `fallback`), and the cache proved by a counted `parseTokens` spy over N property changes that leave `content` unchanged (a revert of the cache fails it); the ceilings are the spec numbers and there is no multiplier (A-10 is not written, CP-1 2026-10-07); the semantics, heading-outline (a test over the six fixtures: markdown, json, empty, refused, not-found, hostile; one `h1` in every state except a rendered markdown body, which keeps the headings it was authored with) and announcement tests, with explicit role, accessible-name, landmark and idref assertions and no axe (PLAN-FRESH4-003 (b)); forced-colors and reduced-motion assertions by the Vitest browser `cdp()` session (`Emulation.setEmulatedMedia` with `forced-colors: active` and `prefers-reduced-motion: reduce`, asserting the computed outline, border and animation values, each with a positive control that the same element differs without the emulation; a new test file owned by IC-10, no edit of `packages/mission-ui/vitest.config.ts`, PLAN-FRESH4-004) and the bounding-box assertions (a tab at least 36 px, a Work Package control at least 24 px); the AV-33 to AV-35 outcome assertions (inspector placement, toolbar stacking) at the S-A6 widths and at 1000 px, with a control width where the outcome flips; EV-8 (positive control: a dispatched `sk-open-artifact` is consumed, nothing re-emitted); the SC-002 audit (a capture-phase listener for every `sk-*` name on the document through the composition test: the seen names are a subset of the manifest's events and at least the five declared events were seen); unknown kind and unknown code in a full host composition; the dynamic-pipeline test (SC-004: a `vocabulary` with a thirteenth kind, its own icon and a different container segment renders with no change to the element, and a refusal code outside the seven renders through `labels.refusal` as its eyebrow with the generic sentence and no retry; a type-level case shows that `copy` is not a member of `ArtifactVocabulary`; a refusal code is NOT carried by `vocabulary`); **AV-17 (the note present when `truncated`, absent otherwise, read through the screen on the merged chains; moved here from IC-09, PLAN-FRESH3-010 (b))**; **the eyebrow half of AV-29 (the raw kind word of an unknown kind as the document eyebrow, read through the screen on the merged chains; moved here from IC-09, PLAN-FRESH4-001)**; exit check `pnpm test:terminology` green, and the AV-17 test green on the merged tree. FR-034 to FR-036, NFR-002 to NFR-004, NFR-006, NFR-011. Merge step: the orchestrator merges IC-09 into IC-08's lane and runs the owned-files disjointness check; the side-by-side for AV-01 and AV-08 is repeated here. Depends on IC-08 with IC-09 merged in by the orchestrator.
- **Relevant requirements**: FR-034 to FR-036, NFR-002 to NFR-004, NFR-006, NFR-011, NFR-014, NFR-015, SC-002, SC-004, SC-006, SC-010.
- **Affected surfaces**: the `Tiers and edge cases` stories file; new test files under `test/` (tier, accessibility, timing, forced-colors and reduced-motion, composition and dynamic-pipeline tests); no part file and no `sk-artifact-screen.ts`; `packages/mission-ui/vitest.config.ts` is NOT edited (PLAN-FRESH4-004). A defect found in a chain X or chain Y file is a change request to the orchestrator, not an edit here.
- **Exit checks**: `pnpm test:terminology` green; the NFR-003, NFR-004 and NFR-006 helpers with their controls; the NFR-006 hard ceilings at the spec numbers; the forced-colors and reduced-motion tests (the `cdp()` mechanism with positive controls); the role, accessible-name, landmark and idref assertions green (no axe, no new devDependency); the tier outcome assertions; the SC-002 audit; the dynamic-pipeline test; the AV-17 test and the eyebrow half of AV-29 green on the merged tree; the owned-files disjointness check at the merge step and the repeated AV-01 and AV-08 side-by-side recorded in the WP report.
- **Depends on**: IC-08 with IC-09 merged in by the orchestrator.

### From `plan.md`: lane mechanics (orchestrator-owned; WP agents never do any of this)

As #4 and #5 recorded (a spec-kitty tooling issue fast-forward `kitty/mission-<slug>` before every first claim and after any merge of `main`; a spec-kitty tooling issue and a spec-kitty tooling issue for dependent lanes and `status.json`; `owned_files` and `lanes.json` `write_scope` tool-owned and never hand-edited): (0) the entry condition of IC-01a (#5 merged upstream) is checked first and a miss is a stop; (1) record the base sha at dispatch; (2) pre-create each dependent lane from the approved parent's tip; (3) IC-10 is parented on IC-08 (chain X): the orchestrator merges the approved IC-09 tip into its lane (`git merge --no-ff`), resolves `custom-elements.json` by `pnpm manifest:generate` only, checks both chains' stories are present, and checks owned-files disjointness: the files changed by IC-09's tip against the `owned_files` of IC-07 and IC-08, where any overlap is a stop, reported, not merged by hand; (4) fallback: if that merge conflicts beyond `custom-elements.json` and `status.json`, serialise IC-09 after IC-08 and record it; (5) the CP-1 entry reaches the lanes by being committed on the target branch and `kitty/mission-<slug>` fast-forwarded; `git merge-base --is-ancestor <CP-1 commit> HEAD` is checked before `implement` and by the reviewer; (6) after IC-01b is approved the orchestrator copies the gzip figure and the node timing table from the IC-01b WP report into `research.md` D-05 and commits on the target branch (fast-forwarding `kitty/mission-<slug>`), BEFORE IC-04 is dispatched, because IC-04 sets the bundle budget from them (`research.md` is on the orchestrator's partition and is never written in a lane).

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-1** (`AV-33`, `AV-34`, `AV-35`, `FR-036`, `DA-33`; ACCEPTED; numbers ruled at CP-1, 2026-10-07: T = 45 rem (720 px), toolbar stack option C): the prototype's `.reading-layout` stays two columns down to a viewport of 800 px; the spec's "inspector under the toolbar at about 1100 px" misreads the prototype (at 1100 px only the shell changes tier). The rows become: AV-33 two columns at a 1100 px viewport (the shell's expanded tier edge; the spec's title "collapsed tier" is corrected to "expanded tier edge"), AV-34 one column with the inspector first at 800 px (the collapsed tier, content cell 688 px), AV-35 mobile at 620 px (the mobile tier, toolbar stacked, tables scrolling). The rule (PLAN-A11Y-001 (a)): two columns only from a content cell of at least 720 px, which the mobile tier (cell = viewport, below 720 px) can never reach; the 801 to 831 px viewport window of the collapsed tier (cell 689 to 719 px) shows one column where the prototype shows two, recorded as confirmed drift at CP-1 (DA-33). S-A6 samples 689, 719, 720, 732, 799, 800, 801, 831, 832, 1099 and 1100 px, recording for each viewport the one tier the shell selects and the content-cell width and fixes the numbers and the toolbar-stack threshold. Not taken: keeping 689 (a 419 px document column in the mobile tier) and a viewport media query at 800 px (contradicts FR-036).

- **A-7** (`NFR-004`, `NFR-011`, new `NFR-014`, `NFR-015`; ACCEPTED): NFR-004 gains a reflow clause (at a 200% root size the 1100 px viewport resolves to one column, and at 320 px and 400% only tables scroll); NFR-011's list of non-colour-only states gains the selected tab and the current tree row; NFR-014 forced colors and reduced motion (the selected tab, the focus ring and the table box stay distinguishable in forced colors; the screen's own elements run no animation under reduced motion); NFR-015 target size (a tab at least 36 px and a Work Package control at least 24 px of block size).

- **A-9** (`FR-001`; ACCEPTED with PLAN-DESIGN-022 (a)): FR-001's "twelve properties" becomes THIRTEEN: the twelve named there plus one optional `vocabulary` property (`ArtifactVocabulary | null`, default null meaning the `defaults/` values), passed into the logic functions, so a later charter-driven pipeline changes props and not the element (the spec's dynamic-pipeline constraint). The surface is 13 properties everywhere (this plan, `data-model.md`, `contracts/sk-artifact-screen.md`, `contracts/gates.md`, the surface-freeze text, IC-06b).

- **A-10** (`NFR-006`; NOT WRITTEN: ruled at CP-1 on 2026-10-07, no multiplier): the spec numbers (500 ms, 200 ms) ARE the gate ceilings, with NO multiplier. A multiplier on any ceiling is allowed ONLY as this numbered amendment, which IC-04 reports with its S-A0 step two figures (best of three, Chromium) and the operator decides at CP-1; until the operator rules, a test over the spec numbers that fails is a finding, not a trigger to scale. The default is no multiplier, and no amendment is written if the headroom is about 2x or more. [CP-1, 2026-10-07: no amendment is written; the markdown budget was raised to option O3 instead (`maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000), and a ceiling test that flakes goes back to the operator and is never quietly relaxed.]

Spec rows read as amended by the rulings (the spec rows were written back by the orchestrator at CP-1 on 2026-10-07; this list is kept as the record, and a reviewer holding an older spec text reads these rows as follows): AV-32 (focus order) reads "tree, inspector, tabs, document" because the inspector is first in the DOM (PLAN-A11Y-009 (b)); FR-035 ("the document pane focusable; documented focus order tree, tabs, document, inspector") reads the same order, tree, inspector, tabs, document; NFR-003's "scrolling region counts as a control" reads "a scroll region is a tab stop only while it overflows" (PLAN-A11Y-003 (a)); FR-012 ("the block is focusable and named, so it scrolls by keyboard") and DA-23 ("both the rendered article and the raw block focusable and named", a drift-register item shown to the operator at CP-1) read "focusable and named only while it overflows", the same rule, on the element that actually scrolls; NFR-005 ("asserted in the corpus test by observing resource loads") reads "asserted by the structural walk of the produced template (the proof, PLAN-TEST-003 (a)); a CSP and a resource-load observation are corroboration only".

Screen layout, from the prototype (`.reading-layout`: `minmax(0, 1fr) 270px`, one column with the inspector first at a viewport of 800 px or less, `document-toolbar` column at 620 px or less) and the shell's real content widths. The shell has three tiers (`sk-mission-shell.ts`: expanded from a viewport of 1100 px, content cell = viewport minus 296 px; collapsed from 720 px, cell = viewport minus 112 px; mobile below 720 px, single column and no rail, cell = viewport), derived as #5 derived its own and proven by spike S-A6. The cell width is NOT monotonic in the viewport across the 720 px tier edge (a 719 px viewport gives a cell of 719 px, a 720 px viewport gives 608 px), so a threshold must be one the mobile tier cannot reach. The ruling (PLAN-A11Y-001 (a), A-1) is the rule below; its figures were ruled at CP-1 (2026-10-07) on S-A6:

| Content cell (container) | Layout |
|---|---|
| width at or above T = 45 rem (720 px; two columns), ruled at CP-1 (S-A6) | document pane `minmax(0, 1fr)` and inspector 270 px (E-28), the inspector placed in the right-hand track by grid placement although it is FIRST in the DOM (PLAN-A11Y-009 (b)). The shell's mobile tier (cell = viewport, below 720 px) can never reach T. The 1100 px viewport (content about 804 px) is HERE: two columns, which corrects spec rows AV-33 and DA-33 (amendment A-1) |
| width below T (one column) | one column, the inspector first (it is first in the DOM, so there is no `order` property), flat inspector with a top border. The 800 px viewport gives a cell of 688 px and is HERE. Viewports 801 to 831 px on the collapsed tier (cell 689 to 719 px) are also here although the prototype shows two columns: a 31 px window of confirmed drift, recorded at CP-1 (DA-33) |
| toolbar stack, OPTION C (ruled at CP-1): a container query `@container (max-width: 38.75rem)` (620 px) COMBINED with `:host(:state(shell-mobile))` from #5's `ShellTierController`, so the toolbar stacks only in the shell's mobile tier at a cell of 620 px or less | the toolbar stacks; tables keep their own scroll box (they have it at every width). The prototype's 620 px breakpoint lies inside the mobile tier. S-A6 measured zero drift over the sampled widths (no 720 to 732 px window, no 601 to 620 px window); the container-only option A (a 13 px window at 720 to 732 px) and the lower-threshold option B (fails the 620 px anchor) are rejected. The controller is used ONLY for this rule: the one-column rule stays the container threshold T with no controller, and the controller consumes the host's one `attachInternals()`, so the screen calls `attachInternals` nowhere else |

The shell owns the viewport tiers; the screen's thresholds are container queries on its own host (`container-type: inline-size`, the probe passed for #5), written in rem so the column switch follows the reader's text size (NFR-004; the figures above convert at the default 16 px root), values measured by S-A6 over the sampling list 689, 719, 720, 732, 799, 800, 801, 831, 832, 1099 and 1100 px, recording for each viewport the ONE tier the shell selects and the resulting content-cell width (with 1280, 1000 and 620 px) and recorded in `contracts/sk-artifact-screen.md`, "Layout". Every `display: grid` declares `grid-template-columns: minmax(0, 1fr)`-based tracks (#5's spike S9 lesson).

### From `contracts/`: what this work package is held to (verbatim)

#### Story catalogue (`contracts/sk-artifact-screen.md`): the stories this work package owns

| Title | Stories |
|---|---|
| `Tiers and edge cases` (IC-10) | AV-30a long path, 30b 200-character file name, 30c deep nesting, 30d 1000-entry tree, 30e unbroken source line, 30f 256 KiB document; AV-32a focus order (tree, inspector, tabs, document), 32b focus ring on an inline link, 32c focus ring on a table scroll box, 32d focus ring on the raw block; AV-33 (1100 px, the expanded tier edge, two columns), AV-34 (800 px, collapsed tier, one column), AV-35 (620 px, mobile tier) |

Count: 9 + 10 + 13 + 13 = 45 (35 rows: AV-25 and AV-26 two states each, AV-30 six, AV-32 four). Row to story map and the fixture of each story: `contract-pin.md`, "Pairing". A story title is owned by exactly one WP. The tier test of IC-10 also samples 1000 px (collapsed tier, two columns) without a baseline.

#### Test obligations of IC-10 (`contracts/sk-artifact-screen.md`, "Test obligations by owner")

- IC-10: NFR-003, NFR-004 and NFR-006 as helpers, each with a one-line control (a deliberately wide child flips the overflow detector; an added `button` flips the stop count); NFR-004 also asserts the resolved track count at a 200% root size (one column at 1100 px) and a 320 px at 400% reflow check (tables may scroll, the page does not); EV-8; SC-002 (a capture-phase listener for every `sk-*` name on the document during the whole composition test: the seen names are a subset of the manifest's events and at least the five declared events were seen); semantics (the heading-outline test over six fixtures: markdown, json, empty, refused, not-found, hostile; one `h1` in every state except a rendered markdown body); the focus order at 1280, 800 and 620 px (inspector before tabs); NFR-003 with an overflowing and a non-overflowing document; NFR-006 as hard ceilings, best of three after a warm-up, branches pinned, with the `parseTokens` spy; the role, accessible-name, landmark and idref assertions (the semantics, tab and landmark tests, no axe); forced-colors and reduced-motion, by ONE mechanism (PLAN-FRESH4-004): in the Chromium browser test, the Vitest browser `cdp()` session (`import { cdp } from 'vitest/browser'`) sends `Emulation.setEmulatedMedia` with the features `forced-colors: active` and, in a second case, `prefers-reduced-motion: reduce`, and the test asserts the COMPUTED values (the selected tab, the focus ring and the table box keep a computed outline or border that is not `none` and not the same colour as the unselected control under forced colors; no running animation or transition duration above 0 on the screen's own elements under reduced motion), each with a positive control that the same element differs without the emulation (the emulation cleared, the value changes); the test file is new and owned by IC-10, `packages/mission-ui/vitest.config.ts` is NOT edited and no project option is added; evidence is one uncommitted forced-colors screenshot per region WP; bounding-box assertions (a tab at least 36 px and a Work Package control at least 24 px of block size); AV-33 to AV-35 outcome assertions (inspector order, toolbar stacking) at the S-A6 widths with a control width where the outcome flips; the dynamic-pipeline composition (SC-004, with a `vocabulary` that adds a kind, an icon and a container segment, and a refusal code outside the seven through `labels.refusal`, and a type-level case that `copy` is not a vocabulary member); AV-17 (the note present when `truncated`, absent otherwise, read through the screen on the merged chains; moved from IC-09); the eyebrow half of AV-29 (the raw kind word of an unknown kind as the document eyebrow, read through the screen on the merged chains; moved from IC-09 as AV-17 was, PLAN-FRESH4-001); the owned-files disjointness check at the merge step.

#### Self-check list for reviewers (`contracts/gates.md`; its own heading says to copy it into every WP brief that touches these files)

#### Self-check list for reviewers (copy into every WP brief that touches these files)

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q7, operator ruling 2026-10-06.** **Events.** Ruling: `sk-select-artifact` `{ missionId, path, kind }` (internal markdown link; the tree leaf is the shell's `sk-navigate`, Q2); reuse `sk-select-work-package`, `sk-open-pipeline` and `sk-retry-load` from #5; new `sk-open-link` `{ href }`; all verb-noun; `sk-open-artifact` is consumed from #5, not re-emitted. **Conflict found by this phase: #5 has no `sk-open-pipeline` (its P-1 ruling collapsed it into `sk-open-mission`). See N-Q10.**
- **N-Q10, operator ruling 2026-10-06.** **"Return to Pipeline"** emits `sk-open-mission` `{ missionId, slug }` (option (a)). No `sk-open-pipeline` event exists or is added; this supersedes the literal reuse in Q7. The `mission` property carries `slug`. EV-5 and AV-23 read as ruled.
- **Q9, operator ruling 2026-10-06.** **Large listings.** Ruling: no virtualization in v1; a 1000-row tree is plain DOM, folders collapsed except the path to the selected file, the `truncated` note when it applies; revisit if the Storybook review shows a cost.

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

- none planned; `packages/mission-ui/vitest.config.ts` is NOT edited (PLAN-FRESH4-004); a defect in a chain X or chain Y file is a change request to the orchestrator, not an edit

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP10. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

**Dependency note**: the tool-recorded dependency is WP10 only; WP11 (chain Y) is merged into this lane by the orchestrator (plan "Lane mechanics" item 3) and the first subtask stops if chain Y is absent.

Implementation command: `spec-kitty agent action implement WP12 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
