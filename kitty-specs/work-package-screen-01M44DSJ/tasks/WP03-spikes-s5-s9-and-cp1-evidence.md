---
work_package_id: WP03
title: Foundation spikes S5 to S9 and CP-1 evidence
dependencies:
- WP02
requirement_refs:
- FR-029
- FR-030
- FR-036
- FR-038
- NFR-008
- C-005
- C-006
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T09:09:09.550444+00:00'
subtasks:
- T016
- T017
- T018
- T019
- T020
- T021
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: spikes/ic-03a/
create_intent:
- spikes/ic-03a/s5-evidence-chain.stories.ts
- spikes/ic-03a/s6-dependency-node.stories.ts
- spikes/ic-03a/s7-event-timeline.stories.ts
- spikes/ic-03a/s8-grid.stories.ts
- spikes/ic-03a/s8-container-probe.ts
- spikes/ic-03a/s9-card-panel.stories.ts
execution_mode: code_change
owned_files:
- spikes/ic-03a/**
- apps/storybook/.storybook/main.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - Foundation spikes S5 to S9 and CP-1 evidence (IC-03a)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Answer five questions with evidence BEFORE the surface freeze (spikes S5 to S9 of `research.md`), as throwaway stories committed under `spikes/ic-03a/`, and produce the evidence packet the orchestrator puts in front of the operator at checkpoint CP-1 (prototype beside spike render, accessibility trees, the Stylelint probe result, the derived container thresholds). Then delete ALL spike code with a named final commit so that nothing of it reaches the lane tip or the pull request. This work package ships no product code: its approved tip tree equals its base tree.

## Context

Read `plan.md` (IC-03a, CP-1, "Shared files": the `spikes/ic-03a/**` row), `research.md` ("Spikes" table S5 to S9, D-12, D-13, D-14, "Library gaps" G-09 to G-13, "Not verified in this phase"), `contracts/gates.md` (E-17 to E-20 and their conditions), `contracts/sk-work-package-screen.md` ("Layout", "Semantics", "Regions"), `spec.md` (DW-1 to DW-30 and the state matrix rows the spikes touch: WP-01, WP-08, WP-13, WP-46 to WP-48). Requirements: FR-029 (columns by container thresholds), FR-030 (the focus ring and one tab stop per node), FR-036 (stories and the visual review), FR-038 (elements over CSS: the evidence decides E-18, E-19 (a), E-20), NFR-008 (prototype fidelity), C-005, C-006.

The prototype is `<prototype>/04-work-package.html` (with `05-artifact.html` for links), outside the repository. The shell, `shellFrame`, `flush`, `library-sheets.ts`, `progress-sheet.ts`, `visually-hidden.ts` and the Stylelint exception machinery are #4's, already merged.

CP-1 is orchestrator-owned and is NOT part of this work package. You do not ask the operator anything, you do not write `tracer-design-decisions.md`, and you do not decide an exception: you deliver evidence and a recommendation per spike; the orchestrator records it and obtains the rulings.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP02. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.

## Subtasks

### T016 Scaffolding: the two permitted additions and the pinned container

**Purpose**: make the throwaway stories renderable with the smallest possible footprint, all of it removable in one commit.

**Steps**:
1. Create `spikes/ic-03a/` at the repository root. Add exactly TWO configuration additions, each removed by the final commit: (a) one `stories` entry for `spikes/ic-03a/**/*.stories.ts` in `apps/storybook/.storybook/main.ts` (whose glob is otherwise `packages/mission-ui/src/**/*.stories.ts`); (b) one ESLint `ignores` entry for `spikes/ic-03a/**` in `eslint.config.mjs` (out-of-map edit: the plan names this one entry as IC-03a's and the file as IC-03b's otherwise).
2. The path stays OUTSIDE the Stylelint, manifest and unit-test globs (check by reading them: `lint:styles` globs `packages/*/src/**`, the manifest analyzer reads the package, vitest includes `packages/mission-ui/test`). Do not widen any of them.
3. Confirm the pinned container runs (`scripts/visual.sh`); the spike evidence is captured with the pinned-container screenshot run, NOT with a committed-snapshot `pnpm visual` pass (the spikes have no committed snapshots, and missing snapshots are an expected red whose actual images are the raw material). Never run `pnpm visual:update`; no PNG is committed.
4. Name the one-line preamble of every spike file: `// Throwaway spike for CP-1 evidence; deleted by the final commit of WP03.`

**Files**: `spikes/ic-03a/**`, `apps/storybook/.storybook/main.ts`; out-of-map: `eslint.config.mjs` (one `ignores` entry). **Validation**: `pnpm build-storybook` builds with the spike stories listed; `pnpm lint`, `pnpm lint:styles`, `pnpm manifest:check` and `pnpm test` stay green with the spike present (that proves the exclusions).

### T017 Spikes S5 (evidence chain) and S6 (dependency node)

**S5 question**: does `sk-evidence-chain` with its property-only `stages` (id, label, displayValue, `annotation` and tone for the state word through the lane badge words, from #4's `STATE_BADGES`) render the prototype's Evidence chain (Mission, Work Package, state), and does the accessibility tree show an ordered list with decorative connectors? Pass rule: side-by-side shows only DW-16; the tree shows the order. If it fails: a native `ol` with the sheet, record the gap.

**S6 question**: does a semantic list of `sk-button` nodes with `variant="ghost"` (the quiet look) with `aria-hidden` arrow separators render the Dependency chain (id, title, lane word per node) as labelled controls with an accessible name from `dependencyNodeLabel(wpId, title, laneWord)` (WP02's `wp-copy.ts`)? Pass rule: focus ring visible, text visible, exactly ONE tab stop per node, the accessible name equals the builder's output. If it fails: E-20 applies (raw `<button>` in `chain-parts.ts` only); record exactly why `sk-button` cannot carry the three pieces of text.

**Steps**: build each as a story with the fixtures `wpPopulated` + `detailPopulated` (and `detailDepsBlocked` for S6 with two nodes), inside `shellFrame({ layout: 'mission', flush })` at 1280 px. Capture the prototype page at the same width and the spike render; produce one side-by-side image per spike. Dump the accessibility tree (Playwright `page.accessibility.snapshot()` or the equivalent the container offers) as text into the report. Press Tab through S6 and record the stop count.

**Files**: `spikes/ic-03a/s5-evidence-chain.stories.ts`, `s6-dependency-node.stories.ts`. **Edge cases**: a long title in a node (use `wpLong`-style text) must wrap between words and the control must stay one stop; an unknown lane value in a node shows raw.

### T018 Spike S7 (event-timeline sheet)

**Question**: does the adopted `event-timeline` sheet, imported into a shadow root through `library-sheets.ts`'s adoption mechanism (spike code adds the sheet locally; the real addition is WP04's), reproduce the prototype's lane history (marker, summary, metadata, "Current")? Pass rule: side-by-side shows only DW-10 and DW-11 (the lane-keyed "Complete" marker is dropped; "Current" on the LAST array element; time as relative text). If it fails: a scoped paint exception (extension of E-17), recorded with the exact property.

**Steps**: story with `wpHistoryRich`-like data (forced entry, an entry with a reason, a first entry with `fromStatusLane` null) rendered with the sheet's own classes in a shadow root; one side-by-side; one note on whether the family needs any class beyond the E-17 prefix `sk-event-timeline*`. **Files**: `spikes/ic-03a/s7-event-timeline.stories.ts`. **Edge cases**: a 60-entry history (use `bulk.makeWorkPackageHistory(60)`) scrolls with the page and does not overflow.

### T019 Spike S8 (container-query grid, thresholds, Stylelint probe)

**Question**: does a three-column container-query grid with the prototype's track recipe (`minmax(220px, .8fr) minmax(320px, 1.3fr) minmax(220px, .8fr)`; two columns `minmax(220px, .8fr) minmax(320px, 1.2fr)` with the third stack spanning as two explicit tracks `minmax(0, 1fr) minmax(0, 1fr)`; one column) inside `shellFrame` with `flush` reproduce the prototype at 1280, 1100, 800 and 620 px, and which container thresholds make it so?

**Steps**:
1. Derive the thresholds from the shell's REAL content widths (expanded tier: viewport minus 296 px; collapsed tier: viewport minus 112 px): about 984 px at 1280, 804 px at 1100, 688 px at 800. Candidate thresholds are about 805 px (three columns above) and about 690 px (one column at or below). Measure the actual content cell in the browser (`getBoundingClientRect` of the container) at each of the four viewports; do not copy the arithmetic from this prompt.
2. Render the spike at 1280, 1100, 800 and 620 px; assert (in the spike, as a console-free measurement dumped to the report) the grid track count 3, 2, 1, 1 and that the header band becomes a column at the one-column threshold (the prototype's `.page-header` rule sits in its 800 px block; its 620 px block has no rule for this screen). One side-by-side per viewport against the prototype.
3. Stylelint probe (E-19 (a)): write ONE probe file containing `@container (min-width: 805px)` in a CSS-in-TS block, placed where Stylelint would normally scan it (a temporary copy under `packages/mission-ui/src/` that you delete before committing, or Stylelint run on the spike path with an explicit `--config`), run `pnpm lint:styles` (or the equivalent explicit Stylelint call) and record the verbatim result: pass (E-19 (a) is then deleted and G-13 stays a library note) or fail (an at-rule form must be added to the `EXCEPTIONS` table by WP04). The probe file is never committed outside `spikes/ic-03a/`.
4. Confirm that the `220px` and `320px` track minimums are what E-19 (b) covers and that no `repeat(N, ...)` form is used (the data-driven gate S12.1 refuses a hard-coded track count in CSS text).

**Files**: `spikes/ic-03a/s8-grid.stories.ts`, `s8-container-probe.ts`. **Validation**: the report carries, per viewport: measured cell width, track count, prototype column count, and the final recommended threshold values with the evidence line that justifies them; adjust the candidates if the measurement says so.

### T020 Spike S9 (`sk-card` with `sk-section-header` as the panel)

**Question**: does `sk-card` (inset where nested) with an `sk-section-header` title render the prototype's `.panel` (border, radius, background, `h2` title), and does the accessibility tree show a named `h2` heading in a `section` (`aria-labelledby`)? Pass rule: no visible difference (DW-30 "keep"); the tree shows the heading and the region name. If a residue exists: record EXACTLY what differs (title typography, inset padding), with the token values, so a narrowed E-18 can list only that gap, scoped to `panel-parts.ts`, with a design-library sunset. If S9 proves no gap there is no E-18.

**Steps**: story with two panels (one with a list body, one nested inset), side-by-side against the prototype `.panel` at 1280 px, accessibility tree text, and a plain statement: "no residue" or the residue list with token values. Check the heading level (the `sk-section-header` must yield an `h2`; sub-groups are `h3`).

**Files**: `spikes/ic-03a/s9-card-panel.stories.ts`. **Edge cases**: a very long panel title wraps between words; a panel inside a panel (inset) keeps its border distinct.

### T021 CP-1 packet, the named final commit and the tip-tree check

**Purpose**: deliver the evidence and leave nothing behind.

**Steps**:
1. Write the spike report in the hand-off (the orchestrator copies it into `tracer-design-decisions.md`; you write nothing under `kitty-specs/`): per spike S5 to S9 the question, the pass rule, the result, the evidence (side-by-side image names, accessibility tree text, measurements) and a RECOMMENDATION for the dependent decision (E-18 needed or not and for what exactly; E-19 (a) needed or deleted; E-20 needed or dropped; the two threshold values; whether S5 and S7 need a fallback). Add the hardest-items packet the plan lists for CP-1: event-timeline history, dependency node, the `sk-card` panel beside the prototype `.panel`, the three-column grid at 1280, 1100, 800 and 620.
2. The side-by-side captures go into the REPORT (image files under the container's output directory or the scratchpad the orchestrator names), NOT into the tree: no PNG is committed.
3. Final commit, named exactly `chore(ic-03a): remove spike code`: delete `spikes/ic-03a/**`, the `stories` entry in `apps/storybook/.storybook/main.ts` and the `ignores` entry in `eslint.config.mjs`.
4. Tip-tree check (runnable, in the hand-off): `git ls-tree -r HEAD -- spikes/` is empty; `git diff <base> HEAD --stat` is empty for `apps/storybook/.storybook/main.ts` and `eslint.config.mjs`; the tip tree equals the base tree: `git rev-parse HEAD^{tree}` equals `git rev-parse <base>^{tree}` where `<base>` is the commit the orchestrator names as the lane base. The reviewer repeats it.

**Validation**: all of the above exit 0; `git status --short` empty.

## Test strategy

The spikes are throwaway; their proof is evidence, not tests. Still: every spike states a pass rule BEFORE it renders (written in the report first), and a positive control accompanies every negative claim (for example "no residue" in S9 is shown by the prototype `.panel` and the card captured at the same size and the same theme; "one tab stop per node" in S6 is shown by a Tab walk that also counts a known multi-stop control). No unit test is added. Visual: the pinned-container screenshot run only, uncommitted; `pnpm visual` is not an exit check and `pnpm visual:update` is never run. `pnpm gate-proof` is not run.

Exit evidence (all runnable): `git ls-tree -r HEAD -- spikes/` empty; the tip tree equals the base tree; the `stories` and `ignores` entries gone; `git log --oneline` shows the commit named `chore(ic-03a): remove spike code` last; `pnpm lint`, `pnpm lint:styles`, `pnpm manifest:check`, `pnpm test`, `pnpm build-storybook`, `pnpm hygiene` green on the final tree; the spike report and the CP-1 packet are in the hand-off.

## Definition of Done

- Spikes S5 to S9 each have a pass rule, a result, evidence and a recommendation in the hand-off; the Stylelint probe result is verbatim.
- The two thresholds are written from measured content widths at 1280, 1100, 800 and 620.
- The final commit has the exact name; no spike file, no config entry, no PNG remains; the tip tree equals the base tree.
- The hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edit (`eslint.config.mjs`) with rationale, and states that no exception was decided here.

## Risks

- A spike can change a part's shape or add an exception: that is why spikes precede the surface freeze; report such a consequence prominently.
- Prototype captures need `<prototype>` outside the repo: use the path the orchestrator gives; never write it into a file.
- An accessibility snapshot API can differ in the container: record the method used so the reviewer can repeat it.
- A leftover probe file under `packages/mission-ui/src/` would break `lint:styles` and the manifest: delete it before every commit and check `git status --short`.

## Reviewer guidance

Check the tip: no spike file, tip tree equals base tree, the final commit name exact, the two config entries gone. Check that every spike has the question, pass rule, result and recommendation, that numbers (cell widths, track counts) are measured values, that S9 states "no residue" or lists the residue with token values, that the probe output is verbatim, and that no recommendation reopens an arbiter-ruled item (all forks, P-1 to P-7, E-17 to E-20 are closed; only the conditional exceptions depend on this evidence). Spike code is throwaway and is not reviewed for style. The reviewer is a separate agent; it re-runs the tip-tree commands itself.


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
