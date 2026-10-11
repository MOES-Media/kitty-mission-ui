---
work_package_id: WP06
title: Foundation spikes S-A1 to S-A6 and CP-1 evidence (IC-05)
dependencies: [WP05]
requirement_refs:
- FR-036
- FR-040
- NFR-008
- C-006
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T12:33:51.352064+00:00'
subtasks:
- T033
- T034
- T035
- T036
- T037
- T038
- T039
- T040
- T041
phase: Phase 2 - Spikes and checkpoint
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: spikes/ic-05/
execution_mode: code_change
owned_files:
- spikes/ic-05/**
- apps/storybook/.storybook/main.ts
role: implementer
---

# Work Package Prompt: WP06 - Foundation spikes S-A1 to S-A6 and CP-1 evidence (IC-05)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Answer the six spike questions S-A1 to S-A6 (`research.md` "Spikes") with evidence, as throwaway stories under `spikes/ic-05/`, and hand the orchestrator the CP-1 evidence. NOTHING of the spike code or its renders stays in the tree: a named final commit removes it.

## Context

The spikes are the operator's CP-1 evidence: the orchestrator puts the prototype beside the spike renders (prose and the full-syntax document, the raw block, a wide table in its scroll box, the inspector, the tablist and inline link control, the container thresholds per shell tier) in front of the operator. CP-1 itself is NOT a work package: it is an orchestrator step after this WP is approved and before WP07 (see "CP-1" below). The plan's CP-1 write-back list items (1) to (10) are CP-1 work and are NOT resolved here. A spike may change a part's shape or add an exception, which is why spikes precede the surface freeze.

Read first: `plan.md` section "IC-05" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-05. Requirements: FR-036, FR-040, NFR-008, C-006.

## Subtasks

### Subtask T033: Spike scaffold: two additions only

**Steps**:
1. Create `spikes/ic-05/**` stories made renderable by EXACTLY two additions, both removed by the final commit: one `stories` entry in `apps/storybook/.storybook/main.ts` and one ESLint `ignores` entry.
2. No committed baseline, no PNG in the tree; uncommitted pinned-container screenshots (prototype beside spike) go into the WP report.

**Files**: `spikes/ic-05/**`, `apps/storybook/.storybook/main.ts`, `eslint.config.mjs` (one entry)

**Validation**: the two additions are the only edits outside `spikes/`

### Subtask T034: S-A1: prose look and tokens

**Steps**:
1. Render the prototype `.prose` text and a full-syntax document with the real renderer beside the prototype at 1280 px; list the token names that exist for line height, mono font, the 800 px measure and the 68ch paragraph; state whether `max-width: 68ch` needs the new `ch` grant.

**Files**: report

**Validation**: output: E-23 content (property tables and values, PENDING CP-1), DA-15 and DA-17 evidence

### Subtask T035: S-A2: raw and fallback block

**Steps**:
1. `pre` block with `white-space: pre-wrap; overflow-wrap: normal; overflow-x: auto` on a 256 KiB single line; wraps at spaces, scrolls sideways, keyboard-scrollable, prototype look; the prototype's raw block width `min(900px, 100%)` beside it (DA-39).

**Files**: report

**Validation**: output: E-25 content, DA-22, DA-23, DA-39 value

### Subtask T036: S-A3: table in its own scroll box

**Steps**:
1. Wide-table fixture at 1280, 1100, 800 and 620 px: `div` with a region role, `tabindex=0`, a positional accessible name; PageDown and arrow keys in a real browser; a table that does not overflow beside one that does (a tab stop only while it overflows); explicit role, name and landmark assertions and a Playwright `ariaSnapshot` (no axe).

**Files**: report

**Validation**: output: E-23 table part, DA-16

### Subtask T037: S-A4: inspector, pills, toolbar band

**Steps**:
1. Flat inspector with the adopted `facts` sheet, `sk-notice` and `sk-pill-tag` pills, every row filled and with long values; one ellipsis rule; which library control renders a CLICKABLE Work Package pill: try `sk-pill-tag` interactivity, then an `sk-button` secondary small, then a raw button (outcomes (a), (b), (c); (c) is conditional exception E-29 and gap G-21); the inspector as a `div role=group`, not an `aside`, asserted by listing the landmarks; block size at least 24 px; the toolbar band `min-height: 68px` beside the prototype (DA-40).

**Files**: report

**Validation**: output: the pill control choice, DA-39/DA-40 numbers, E-28

### Subtask T038: S-A5: tablist control and inline link control

**Steps**:
1. Compare variants (a) `sk-button role=tab` and (c) a raw button carrying the adopted segmented-choice family class plus `role=tab` (preferred; does the selected look follow `aria-selected`?) in Chromium, WebKit and Firefox: role, accessible name, idref resolution (`aria-controls`, `aria-labelledby` across shadow roots for variant (a)), the accessibility-tree dump (`ariaSnapshot`), a forced-colors screenshot of each.
2. Check the `<a role="link" tabindex="0">` inline link control (D-14): keyboard, screen-reader name with the visually hidden kind suffix, inert links as `span`s.

**Files**: report

**Validation**: output: D-13 and D-14 evidence, E-26

### Subtask T039: S-A6: container thresholds per shell tier

**Steps**:
1. For each viewport 1280, 1100, 1099, 1000, 832, 831, 801, 800, 799, 732, 720, 719, 689 and 620 px (this is the one sampling list of `research.md` S-A6; the plan's list of 689 to 1100 px with 1280, 1000 and 620 px is the same set), record the ONE tier the shell selects (expanded from 1100 px, collapsed from 720 px, mobile below 720 px where the cell equals the viewport, so the cell width is NOT monotonic across the 720 px edge) and the resulting content-cell width.
2. Check that no mobile-tier cell reaches the two-column threshold; derive thresholds as #5's S8 did, choose the toolbar-stack threshold with the 720 px edge in mind, record them in rem (T = 720 px, 45 rem, and 620 px are the PENDING plan values).

**Files**: report

**Validation**: output: the per-tier table, A-1 numbers, E-28 values

### Subtask T040: CP-1 evidence assembly

**Steps**:
1. Assemble the WP report: for each of S-A1 to S-A6 the answer, the evidence (screenshots listed by name, never committed), and the decision it feeds; the S-A4 DA-39 and DA-40 numbers and the S-A6 per-tier table are called out; list candidate exceptions with their property tables; list the copy defaults seen.

**Files**: WP report

**Validation**: every CP-1 ask of the plan that depends on a spike has its evidence

### Subtask T041: Named final commit: remove the spike code

**Steps**:
1. Remove `spikes/ic-05/**`, the `stories` entry and the ESLint `ignores` entry in ONE commit with the exact message `chore(ic-05): remove spike code`.

**Files**: `spikes/ic-05/**`, `apps/storybook/.storybook/main.ts`, `eslint.config.mjs`

**Validation**: `git ls-tree -r HEAD -- spikes/` empty on the tip and the tip tree equals its base tree

## Acceptance (all runnable)

1. `git ls-tree -r HEAD -- spikes/` prints nothing, and `git diff --exit-code <WP05 tip sha> HEAD` prints nothing and exits 0 (the tip tree equals its base tree).
2. The CP-1 screenshots (prototype beside spike for S-A1 to S-A6, with the S-A4 DA-39 and DA-40 numbers and the S-A6 per-tier table) are listed in the WP report; no PNG is committed.
3. `pnpm test:terminology` green on the tip.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

A spike can change a part's shape or add an exception; this is why spikes precede the surface freeze. A spike result that contradicts a plan assumption is a report to the orchestrator, never a silent plan edit.

## Reviewer Guidance

Check `git diff <base> <tip> --stat` is empty. Check the report answers each spike question with evidence, not opinion. Check no baseline PNG was added. Check the named final commit exists with the exact message. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-05

#### IC-05 Foundation spikes and CP-1 evidence
- **Purpose**: spikes S-A1 to S-A6 (`research.md`) as throwaway stories under `spikes/ic-05/`, made renderable by exactly two additions, both removed by the named final commit: one `stories` entry in `apps/storybook/.storybook/main.ts` and one ESLint `ignores` entry. Uncommitted pinned-container screenshots (prototype beside spike) go into the WP report, not the tree. No committed baseline. Review check: `git ls-tree -r HEAD -- spikes/` empty on the tip and the tip tree equals its base tree (as #5). S-A4 also answers which library control renders a clickable Work Package pill and carries the DA-39 and DA-40 numbers; S-A5 compares variants (a) and (c) of the tablist control in three engines; S-A6 measures per shell tier over the extended sampling list.
- **Relevant requirements**: FR-036, FR-040, NFR-008, DA-15 to DA-17, DA-22, DA-23, DA-33, DA-34.
- **Affected surfaces**: `spikes/ic-05/**`, the one `stories` entry in `apps/storybook/.storybook/main.ts` and the one ESLint `ignores` entry, all removed by the named final commit (`chore(ic-05): remove spike code`); nothing else.
- **Exit checks**: `git ls-tree -r HEAD -- spikes/` is empty on the tip and the tip tree equals its base tree; the CP-1 screenshots (prototype beside spike for S-A1 to S-A6, with the S-A4 DA-39 and DA-40 numbers and the S-A6 per-tier table) are listed in the WP report; no PNG is committed; `pnpm test:terminology` green on the tip.
- **Depends on**: IC-04 (S-A1 needs the real renderer). **Risks**: a spike can change a part's shape or add an exception, which is why spikes precede the surface freeze.

### From `plan.md`: shared-file rows that name IC-05

| File | Writer | Everyone else |
|---|---|---|
| `spikes/ic-05/**` and its one `stories` entry and one ESLint `ignores` entry | IC-05 only, all removed by its named final commit | none |

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-1** (`AV-33`, `AV-34`, `AV-35`, `FR-036`, `DA-33`; ACCEPTED, numbers PENDING CP-1): the prototype's `.reading-layout` stays two columns down to a viewport of 800 px; the spec's "inspector under the toolbar at about 1100 px" misreads the prototype (at 1100 px only the shell changes tier). The rows become: AV-33 two columns at a 1100 px viewport (the shell's expanded tier edge; the spec's title "collapsed tier" is corrected to "expanded tier edge"), AV-34 one column with the inspector first at 800 px (the collapsed tier, content cell 688 px), AV-35 mobile at 620 px (the mobile tier, toolbar stacked, tables scrolling). The rule (PLAN-A11Y-001 (a)): two columns only from a content cell of at least 720 px, which the mobile tier (cell = viewport, below 720 px) can never reach; the 801 to 831 px viewport window of the collapsed tier (cell 689 to 719 px) shows one column where the prototype shows two, recorded as confirmed drift at CP-1 (DA-33). S-A6 samples 689, 719, 720, 732, 799, 800, 801, 831, 832, 1099 and 1100 px, recording for each viewport the one tier the shell selects and the content-cell width and fixes the numbers and the toolbar-stack threshold. Not taken: keeping 689 (a 419 px document column in the mobile tier) and a viewport media query at 800 px (contradicts FR-036).

- **A-6** (the drift register; ACCEPTED as "keep", values PENDING CP-1): two items the prototype carries and the register does not mention are DA-39 (the raw block's reading measure, `.raw-view` `width: min(900px, 100%)`) and DA-40 (the toolbar band's `min-height: 68px`); each is carried with a token where one exists, otherwise by E-25 or E-28 pinned. S-A2 and S-A4 include the two numbers in their prototype side-by-sides.

Screen layout, from the prototype (`.reading-layout`: `minmax(0, 1fr) 270px`, one column with the inspector first at a viewport of 800 px or less, `document-toolbar` column at 620 px or less) and the shell's real content widths. The shell has three tiers (`sk-mission-shell.ts`: expanded from a viewport of 1100 px, content cell = viewport minus 296 px; collapsed from 720 px, cell = viewport minus 112 px; mobile below 720 px, single column and no rail, cell = viewport), derived as #5 derived its own and proven by spike S-A6. The cell width is NOT monotonic in the viewport across the 720 px tier edge (a 719 px viewport gives a cell of 719 px, a 720 px viewport gives 608 px), so a threshold must be one the mobile tier cannot reach. The ruling (PLAN-A11Y-001 (a), A-1) is the rule below; its figures are PENDING CP-1 on S-A6:

| Content cell (container) | Layout |
|---|---|
| width at or above T = 720 px (45 rem; two columns), PENDING CP-1 (S-A6) | document pane `minmax(0, 1fr)` and inspector 270 px (E-28), the inspector placed in the right-hand track by grid placement although it is FIRST in the DOM (PLAN-A11Y-009 (b)). The shell's mobile tier (cell = viewport, below 720 px) can never reach T. The 1100 px viewport (content about 804 px) is HERE: two columns, which corrects spec rows AV-33 and DA-33 (amendment A-1) |
| width below T (one column) | one column, the inspector first (it is first in the DOM, so there is no `order` property), flat inspector with a top border. The 800 px viewport gives a cell of 688 px and is HERE. Viewports 801 to 831 px on the collapsed tier (cell 689 to 719 px) are also here although the prototype shows two columns: a 31 px window of confirmed drift, recorded at CP-1 (DA-33) |
| viewport 620 px, in the shell's mobile tier (cell = viewport); provisional toolbar-stack cell threshold 620 px, PENDING CP-1 (S-A6) | the toolbar stacks; tables keep their own scroll box (they have it at every width). The prototype's 620 px breakpoint lies inside the mobile tier. A cell threshold below 608 px trades the 720 to 732 px viewport window (cell 608 to 620, where the prototype does not stack) for the 601 to 620 px window (where it does); S-A6 measures both and the choice is the operator's at CP-1 |

The shell owns the viewport tiers; the screen's thresholds are container queries on its own host (`container-type: inline-size`, the probe passed for #5), written in rem so the column switch follows the reader's text size (NFR-004; the figures above convert at the default 16 px root), values measured by S-A6 over the sampling list 689, 719, 720, 732, 799, 800, 801, 831, 832, 1099 and 1100 px, recording for each viewport the ONE tier the shell selects and the resulting content-cell width (with 1280, 1000 and 620 px) and recorded in `contracts/sk-artifact-screen.md`, "Layout". Every `display: grid` declares `grid-template-columns: minmax(0, 1fr)`-based tracks (#5's spike S9 lesson).

#### CP-1 asks (what the operator is shown and decides)

The operator's rulings of 2026-10-06 ("accept all" on the 23 plan forks and on A-1 to A-8, A-5 and A-8 excepted as stated below) settled the PRINCIPLES. CP-1 takes the values that need spike evidence, marked PENDING CP-1 throughout, and the two items that were proposed only.

1. The drift register DA-1 to DA-38, DA-39 and DA-40 (A-6, ruled "keep"; the raw block measure and the toolbar `min-height` values PENDING S-A2 and S-A4) and the new entry DA-41 (the bidirectional-control notice, below), with the six spike renders (S-A1 to S-A6) beside the prototype.
2. Spec amendments: the A-1 numbers (PENDING S-A6); A-8a (layer 1) and A-8b (the three N-Q12 narrowings), PROPOSED and decided here and nowhere else, each separately rejectable; and A-10 (a NFR-006 ceiling multiplier), only if IC-04 reports S-A0 step two figures that show a need (default: none).
3. Exceptions E-23 and E-25 to E-28, each decided on its spike evidence (E-26 is conditional on S-A5; E-23 on S-A1 and S-A3, including the `ch` grant values; E-25 on S-A2; E-28 on S-A6), and the conditional E-29 on S-A4. The design-library issues for G-14 to G-16, G-19, G-20 and (only if E-29 applies) G-21 (and G-17, G-18) are drafted before CP-1 and filed on the operator's word at CP-1, so each ruled exception cites a number.
4. The copy defaults (`contracts/defaults.md`), including the bidirectional-control notice words, and the container thresholds S-A6 measured, per shell tier.
5. The tab-control and inline-link-control choice (D-13, D-14) on the S-A5 evidence (variant (c), a raw button with the segmented-choice family class plus `role="tab"`, is the preferred candidate; PENDING S-A5), and the Work Package pill control (S-A4 outcomes (a), (b), (c)).
6. Notes, not decisions: (i) the prototype draws a no-fold glyph for `plan.md` and `tasks.md` (`05-artifact.html:21-22`); the plan keeps the existing `file` glyph for them, and whether the no-fold glyph is intended is read at CP-1 (the data table makes either answer a data change); (ii) the optional shell fold of PLAN-DESIGN-005 (`isSidebarTreeShown()` requiring that `current` matches a route leaf, a latent shell defect for any host) is NOT adopted here, because it touches shell code under FR-037; it is raised as a note for the operator; (iii) the cross-flag that #5's shipped container rule (`@container (min-width: 848px)` and `(max-width: 688px)` in `sk-work-package-screen.ts`) shows two columns in the viewports 689 to 719 px of the shell's mobile tier, which is the defect A11Y-001 fixes here; under "one shared rule" the operator decides whether #5 gets the same correction, and this mission changes nothing in #5 for it.

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q1, operator ruling 2026-10-06.** **Markdown rendering.** #5 ruled "no markdown rendering in the Work Package screen; the host decides". Here rendering is the point. Ruling: the screen renders with `markdown-it` (`html: false`), turned into Lit templates from its token stream, so there is no `innerHTML` or `unsafeHTML` at all. Links never navigate (relative artifact links and external links emit events), images are not loaded (alt text and a link), tables scroll inside their own box, and any throw falls to the AV-05 fallback. If a later need forces HTML output, it goes through DOMPurify with a fixed allowlist first. The library is a new runtime dependency, approved; the hostile-corpus test is the gate.
- **Q5, operator ruling 2026-10-06.** **Fallback trigger and non-markdown files.** Ruling: a known text `mediaType` that is not markdown (json, yaml, jsonl, csv, plain) shows Raw only, with no Rendered tab and no notice; the "Rendered view degraded" fallback is only for a markdown file whose renderer throws or exceeds a render budget.

#### Operator rulings on the plan-phase forks, 2026-10-06

After the plan squad held 23 forks, the operator ruled "ACCEPT ALL" of the arbiter's recommendations on 2026-10-06, for all 23 forks and the plan amendments A-1 to A-8. They bind tasks and review; the plan carries the detail. In short:

- **Base A**: build on #5 (after it merges). **Retry types**: a neutral `src/retry-types.ts` holds the shared `sk-retry-load` union (A-3). **Splits**: IC-01 and IC-06 are split; IC-02 stays whole.
- **Layout**: two columns only from a content cell of 720 px or wider, never in the mobile tier (A-1 accepted; numbers settled at CP-1 on S-A6). **Inspector first in the DOM**; grid placement keeps it on the right in two columns. A-6 (DA-39, DA-40) accepted; values pending CP-1.
- **Exceptions**: E-23 gets a `ch` grant in the Stylelint mechanism and complete property tables; tabs prefer the adopted segmented-choice family (S-A5 decides, pending CP-1).
- **Renderer**: `parse.ts` exports only `parseTokens`; lint rule R4 is strict only in `logic/markdown`; element files use a reviewed named list; table scroll boxes get positional names with no document text in `aria-*`; request absence is proved by a CSP meta plus `securitypolicyviolation` with a positive control; a bidi-control notice and a corrected R-09 (a new DA entry at CP-1).
- **Spec edits**: the unapproved EV-2 sentence is REVERTED (done above); A-8 and the N-Q12 narrowings are decided at CP-1, not before.
- **Evidence**: five local pinned `pnpm visual` runs in IC-11 (CI repeat is extra). Node-only tests via `scripts/` and `?raw`. NFR-006 gets hard ceilings plus a parse-count spy.
- **Tree**: an unreadable row stays disabled and `current` is empty when the selected leaf is unavailable; the host never writes tree toggles back. **Truncation note**: owned by IC-07. **Focus**: a table or panel is a tab stop only while it overflows. **Headings**: a visually hidden h1 where the pane has none.
- **Vocabulary**: one optional `vocabulary` property (so 13 properties; FR-001's "twelve" is amended by the plan). **Icons**: A-5 rejected; the magnifier and table glyphs are added to `shell-icons.ts`.
- A-2, A-4, A-7 accepted. Values that depend on spikes are PENDING CP-1, not decided.

#### Operator rulings on the seven new plan forks, 2026-10-06

The operator accepted the orchestrator's recommendations on 2026-10-06. Binding on tasks and review.

- **PLAN-FRESH3-001 (a)**: reuse `OverflowRegion`, extended to several targets and both axes as one named additive edit.
- **PLAN-FRESH3-004 (b)**: the `vocabulary` claim covers only the functions that read a member; a foreign refusal code goes through `labels.refusal`.
- **Partly filled `vocabulary`**: completed per group against `defaults/` (the conservative option).
- **PLAN-FRESH3-005 (b)**: IC-06b derives the R4 binding list from its stubs; IC-06a lands only the schema.
- **PLAN-FRESH3-006 (a)**: the truncation note, the redaction line and the bidi notice are drawn with `sk-notice`; no new exception.
- **PLAN-FRESH3-008 (b)**: the host keeps a Set from `sk-tree-toggle` (read-only, never written back to the shell) and passes it as `expandedIds` on the next rebuild, so opened folders stay open.
- **PLAN-FRESH3-010 / AV-17 (b)**: the AV-17 test moves to IC-10; only the story title stays with IC-09.

CP-1 items stay pending CP-1.

#### Operator rulings on the four last plan forks, 2026-10-06

- **PLAN-FRESH4-002 (a)**: screen-side focus detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null. The public surface is unchanged.
- **PLAN-FRESH4-003 (b)**: no axe; role, name, landmark and idref assertions plus a Playwright `ariaSnapshot` dump. Axe leaves the spikes and IC-10's exit checks.
- **PLAN-FRESH4-007 (b)**: `copy` is removed from `ArtifactVocabulary` (five groups); string overrides go through `labels`.
- **PLAN-FRESH4-008 (a)**: `artifact_listing_unreadable` is not retryable in the content-refusal table; the listing failure is `status: error` (AV-14), consistent with FR-015.

#### Operator ruling on analyze A1 (tasks phase), 2026-10-06

The operator ruled option (A): `markdownFor` and its tests move from IC-02 (WP03) to IC-03 (WP04, exported from `logic/markdown/model.ts`); WP03 types the `markdown` input of `resolveArtifactView` and the vocabulary budget group structurally in `artifact-types.ts`. No WP count, dependency or signature changes. Applied in plan.md (two sentences), `contracts/defaults.md` and the WP03 and WP04 prompts.

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

Timing (PLAN-TEST-008 (a), ruled 2026-10-06): the spec numbers of NFR-006 are HARD ceilings (500 ms for a 256 KiB document and for a 1000-entry tree, 200 ms for a re-render), each measured as the best of three runs after a warm-up, in Chromium (the engine that asserts them), by the test clock (never in the screen). Before the clock starts the test pins the expected branch: the 256 KiB document (`makeLargeMarkdown`, the large content of the stories) must resolve to `ok` with a block count above 0, and the over-budget document to `fallback`, so a fast fallback cannot pass the large-document check. The re-render claim is proved by a counted `parseTokens` spy: after N property changes that leave `content` unchanged the spy count is 1 (removing the cache fails it), plus the node identity of an unchanged rendered block. The spec numbers (500 ms, 200 ms) ARE the gate ceilings; there is no multiplier. A multiplier is allowed ONLY if proposed as the numbered amendment A-10 (`plan.md`), reported by IC-04 with its S-A0 step two figures (the real `parse.ts` chunk and the corpus in Chromium) and decided at CP-1 (PENDING CP-1); until the operator rules, a test over the spec numbers that fails is a finding, not a trigger to scale, and none is written before the measurement.

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative and tool-owned; stage only these). A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit. The part files created as stubs by WP08 are owned by WP09, WP10 and WP11 afterwards.

**Gates this work package must pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test:scripts`, `pnpm contract:check && pnpm test:contract`, `pnpm test` (the unit-tests gate; its output must list your test files), `pnpm build-storybook`, and `pnpm test:terminology` for every work package that writes under `packages/*/src` (and its exit check). `pnpm visual` is NOT an exit check before WP13; `pnpm gate-proof` is run by the orchestrator where a plant changed. A gate that is red is classed against the baseline table WP01 recorded and the orchestrator names in the dispatch (`tracer-approach.md`): a red absent from it is INTRODUCED and fixed here; a red present in it is reported as pre-existing and not fixed here.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two of them.

**Test quality rules and test strategy**: the binding text is quoted VERBATIM in the section "Test strategy and test quality rules (verbatim)" below (#4 D-34 rules 1 to 5 and this mission's `research.md` D-19). Rule 6 of #4 is its 500-Mission test and does not apply here.

**Visual drift = REJECT.** The approved prototype (`<prototype>/05-artifact.html` with `prototype.css`) is the visual authority (C-006, NFR-008). The only allowed differences are the drift register DA-1 to DA-41 (`spec.md` "Visual Drift Register", extended by DA-39 to DA-41 in the plan) AS CONFIRMED by the operator at CP-1; before CP-1 every entry is PROPOSED and any entry the operator did not confirm is a REJECT item for the work package that introduces it. Any other visible difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off (uncommitted; no baseline PNG before WP13).

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, history compaction into named slices and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with `spec-kitty safe-commit` (explicit files, `--to-branch`), a conventional message (`feat(artifact-viewer-screen): ... (#7)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Named edits outside this work package's own surface (recorded in the hand-off with a one-line rationale)

- `eslint.config.mjs`: ONE `ignores` entry for `spikes/ic-05/**`, added and removed by this WP

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP05. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP06 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
