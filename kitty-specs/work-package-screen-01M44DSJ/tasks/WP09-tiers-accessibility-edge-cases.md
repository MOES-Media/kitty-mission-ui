---
work_package_id: WP09
title: Tiers, accessibility and edge cases
dependencies:
- WP06
requirement_refs:
- FR-022
- FR-029
- FR-030
- FR-031
- FR-035
- FR-036
- NFR-003
- NFR-004
- NFR-006
- NFR-011
- SC-005
- SC-009
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T13:53:39.204498+00:00'
subtasks:
- T052
- T053
- T054
- T055
- T056
- T057
phase: Phase 2 - Regions
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-work-package-screen/
create_intent:
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.tiers.stories.ts
- packages/mission-ui/test/sk-work-package-screen.a11y.test.ts
- packages/mission-ui/test/sk-work-package-screen.perf.test.ts
- packages/mission-ui/test/sk-work-package-screen.time.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-work-package-screen/sk-work-package-screen.tiers.stories.ts
- packages/mission-ui/test/sk-work-package-screen.a11y.test.ts
- packages/mission-ui/test/sk-work-package-screen.perf.test.ts
- packages/mission-ui/test/sk-work-package-screen.time.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP09 - Tiers, accessibility and edge cases (IC-08)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Build the six stories of `Screens/Work Package/Tiers and edge cases` (long texts, unknown lane values, the responsive tiers at 1100, 800 and 620 px viewports, and the focus-order story) and the tests that prove accessibility and performance of the whole screen: semantics, announcements, unique control names, tab order, keyboard operation, EV-2 and EV-8, the focus-restoration tests for the detail-retry and dependency-node triggers, the 200 percent large-text test (NFR-004) with the 100 percent no-overflow and no-mid-word-wrap assertions (US6 AC3, WP-44), the FR-022 relative-time tests and the structural render-responsiveness test (NFR-006). This work package edits ONLY its own stories and tests: a part change it finds necessary is a change request to the owning work package (the orchestrator), never an edit.

PRECONDITION (file precondition, first step): checkpoint CP-1 has completed (see "First step").

## Context

Read `plan.md` (IC-08, "Shared files", "Lane mechanics" item 3), `contracts/sk-work-package-screen.md` (Layout acceptance check; Semantics table; Announcements table; Focus order; Behaviour rules; Story catalogue rows for `Tiers and edge cases`; "Test obligations by owner": EV-2, NFR-006, NFR-004), `contracts/defaults.md` (announcement and accessible-name copy), `research.md` D-13, D-14, D-15, D-17 (NFR-006 structure), `spec.md` (FR-022, FR-029 to FR-031, DW-23, DW-24, DW-29, state rows WP-44 to WP-49, EV-2, EV-8, NFR-003, NFR-004, NFR-006, SC-005, SC-009), and the hand-offs of WP04 to WP08.

Requirements: FR-022 (relative time from `now` or the label hook, ISO fallback: the time tests of T054 step 5), FR-029 (the 3, 2, 1, 1 column switch, repeated here as WP-46 to WP-48), FR-030 (keyboard and focus: documented focus order with `tab-<n>` tags, visible ring, no trap), FR-031 (accessible semantics: lists, text for status, one polite live region, labelled progress), FR-036 (the stories this WP authors, one per catalogue row, ids by the story id convention), FR-035 (EV-2 and EV-8 with positive controls), NFR-003 (every control reachable and operable by keyboard, tab stops equal controls shown), NFR-004 (200 percent root font size, 1100 px and 720 px, no horizontal overflow), NFR-006 (40 subtasks, 60 history entries, 100 files in 200 ms or less, structural proof), NFR-011, SC-005, SC-009.

Your lane: you depend on WP06 (chain X). The orchestrator merges the approved WP08 tip (chain Y) into your lane BEFORE dispatch (`git merge --no-ff`, `custom-elements.json` resolved by `pnpm manifest:generate` only, the `status.json` rule applied, both chains' stories checked present). The tool records only WP06 as your dependency; WP08 is merged in by the orchestrator (`plan.md`, "Lane mechanics" item 3). If the merge conflicted beyond `custom-elements.json` and `status.json`, the orchestrator serialised the chains and says so in the dispatch.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP06, with WP08 merged in by the orchestrator. Start from the approved parent's tip plus that merge (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.

## First step: CP-1 file precondition and merged-lane check

Before any edit: (1) confirm the `CP-1 confirmed` entry in `tracer-design-decisions.md` and `git merge-base --is-ancestor <CP-1 commit> HEAD` (the dispatch names the commit); if absent: STOP and report. (2) Confirm chain Y is present: `git log --oneline` shows the WP07 and WP08 commits, and `ls packages/mission-ui/src/elements/sk-work-package-screen/` shows `sk-work-package-screen.chains-work.stories.ts` and `sk-work-package-screen.states.stories.ts`; if either chain is absent: STOP and report (never merge yourself). DW-23, DW-24 and DW-29 are yours as confirmed.

## Subtasks

### T052 The six stories: `Screens/Work Package/Tiers and edge cases`

**Steps**: create `sk-work-package-screen.tiers.stories.ts` (title `Screens/Work Package/Tiers and edge cases`, 6 stories, dark, inside `shellFrame({ layout: 'mission', current: <work packages item>, flush })`): WP-44 (`wpLong` with `wpBulkHistory` as the history, `detailLong`, `cycles: 'none'`: `wpLong` carries a `latestResult` whose long reference is drawn in the summary alone, like WP-29, a documented exemption of the review-state agreement rule; long title, reason, reference, branch and handle texts, a 40-subtask list, a 60-entry history, 100 owned files; 1280 px; no mid-word wrap, no horizontal overflow of the page); WP-45 (`wpUnknownLane` + `detailUnknownLanes`, `cycles: 'none'`: unknown lane values in the header, history, a dependency and a subtask, shown raw, in order, nothing dropped); WP-46 (the WP-01 pairing, `wpPopulated` + `detailPopulated` `cycles: 'none'`, 1100 px viewport tag `vw-1100`: the shell is in its expanded tier, the content cell is about 804 px, two columns and the third stack spanning below in two sub-columns); WP-47 (same fixtures, 800 px, `vw-800`: one column, header wraps); WP-48 (same fixtures, 620 px, `vw-620`: single column, header wraps, timeline readable); WP-49 (`wpApproved` + `detailPopulated`: dependencies, two cycles with paths, spec and prompt links, so the tab-stop test sees every control kind: crumb, dependency-chain nodes, review links, spec and prompt actions; tagged `tab-<n>` as #4's `tab-12` and `tab-19`). The viewport stories use the same viewport mechanism #4's tier stories use (a `vw-<n>` tag read by the visual spec), and the column switch follows the CONTENT width, not the viewport. Build ONLY with WP04's `fixtures.ts` and `pairDetail`. Exactly 6 stories discovered for the title. Story id convention (contract, Story catalogue): the export name is `Wp` + the row number in two digits + the optional lowercase letter (`Wp01`, `Wp21b`, `Wp36a`), and `tags` carries exactly one row tag `wp-<NN><letter>` in lowercase (`'wp-01'`, `'wp-21b'`) beside the tier tag `vw-<n>` and any `tab-<n>` tag; WP10's parser reads the `wp-` tag and cross-checks it against the export name.

**Edge cases**: WP-46 to WP-48 name VIEWPORT widths of 1100, 800 and 620 (the shell's tiers), not "collapsed tier"; the 620 px story has no further rule beyond the one-column layout (the prototype's 620 px block has no rule for this screen). The thresholds are 848 px (three columns from) and 688 px (one column at or below); the 1100 px story (cell 804) is two columns, the 800 px story (cell 688) one column; there is no sideways scroll at a 1101 px viewport (cell 805), the case that 805 px broke by 19 px, a deliberate deviation from the prototype that shows two columns there.

### T053 Accessibility tests: semantics, announcements, names, tab order

**Steps** (red-first; `sk-work-package-screen.a11y.test.ts`, call `page.viewport` first in every test):
1. Semantics, one test per row of the "Semantics" table in every state that draws it: `h1` (title, else `wpId`, else "Choose a Work Package": `ready`, `loading`, `not-found` and `nothing-selected` have one; `error` and `empty` have none, asserted absent), panel titles `h2`, sub-groups `h3`; each panel a `section` named by its heading; lists as specified (`ol` history and cycles, `ul` subtasks, files, dependencies, `dl` Facts and Workspace); the breadcrumb `nav` with `aria-label` containing an `ol`, the `wpId` crumb `aria-current="page"`, separators `aria-hidden`; the evidence chain an ordered list with no control; the dependency chain a list of nodes with names from `dependencyNodeLabel`; text for status (lane, verdict, override, force, staleness, change state, readiness, refusal) as DOM text (NFR-011, SC-009).
2. Announcements, ONE TEST PER ROW of the "Announcements" table, including the negative rows: first render is silent; a property refresh with the same `wpId` is silent; `status` to `loading` announces `announceLoading(wpId)`; to `ready` (or `wpId` change while ready and the load completes) announces `announceLoaded(wpId)` once; to `error` the region says nothing (the assertive alert notice is the only announcer: assert it is not duplicated); to `not-found` `announceNotFound(wpId)`; `empty` and `nothing-selected` silent; `detailStatus` loading then ready `ANNOUNCE_DETAIL_LOADING` then `ANNOUNCE_DETAIL_LOADED`; error or not-found `ANNOUNCE_DETAIL_UNAVAILABLE` once while the regional notice has no live role. Assert there is exactly ONE live region (polite, visually hidden).
3. Unique control names: in WP-28 and WP-49 compositions the set of accessible control names has NO duplicates ("Open review, cycle N" per cycle; a dependency is a control only as a chain node).
4. Tab order: in the WP-49 composition Tab visits, in order, the Mission crumb, the Open review controls (column 2, cycle order), the dependency-chain nodes, Open spec.md, Open prompt; the number of tab stops equals the number of controls shown (NFR-003); Frontmatter dependency pills are not stops; no trap (Shift+Tab returns); each stop shows a visible focus ring (assert the outline/ring is non-zero via the computed style the library defines, never a raw value comparison); the retry and return states' order is WP08's, not repeated here. Record the final `tab-<n>` numbers in the story tags and the hand-off.
5. Keyboard operation: Enter and Space operate every control kind (crumb, node, link, review link, retry, return) and each emits exactly its event once (use the existing events tests' patterns; positive control per no-event).
6. Per-tier reachability (NFR-003, SC-005: "in every tier"): repeat steps 4 and 5 for the WP-49 composition at each tier, with the screen's container (the shell's content cell) at the 1280, 1100, 800 and 620 px viewports: at each tier the tab-stop count EQUALS the number of controls shown (equality, the same count at every tier because no control is hidden by the layout), the order is the documented order (the columns stack but the focus order is unchanged), every stop is reachable by Tab and operable by Enter and Space with exactly its event once, and no control is clipped out of view (scroll it into view and assert it is visible and not zero-sized). Positive control: a fixture render where one control is made `display: none` at the narrow tier by the test fails the count assertion.

**Files**: `sk-work-package-screen.a11y.test.ts`. **Edge cases**: the live-region texts name the Work Package by id as given; a text that says only "loaded" fails.

### T054 EV-2, EV-8, NFR-004, the 100 percent text assertions and the FR-022 time tests

**Steps** (same file):
1. EV-2, TWO separate cases (a single case cannot yield one event from two injections), each with its own listener on a WRAPPER around the screen and each asserting exactly one event (the injected instance itself, not a clone, no re-emission) and no other `sk-*` name: (a) dispatch `sk-select-work-package` AT the screen element; (b) dispatch it from INSIDE the shadow tree (on a rendered element, `bubbles` and `composed` true). The positive control: a dependency-chain activation yields exactly one event with the exact payload `toEqual({ missionId, wpId })` (an event dispatched on or above the host would never enter the screen, so the control must be an activation that originates inside it).
2. EV-8: focus and scroll interactions (focus a control, scroll the page, tab through) emit no `sk-*` event, with the positive control that a real activation does emit.
3. NFR-004: set the root font size to 200 percent; at 1100 px and 720 px viewports (`page.viewport` first) assert NO horizontal overflow of the content area caused by the screen (`scrollWidth` does not exceed `clientWidth` of the content area; a positive control: a deliberately overflowing test element does exceed, proving the measurement works).
4. Text size at 100 percent (the 100 percent text-size test; US6 AC3, WP-44, WP-46 to WP-48; same a11y file): at the default root font size and at viewports 1280, 1100, 800 and 620 px (`page.viewport` first), with `wpLong` + `wpBulkHistory` + `detailLong` and the WP-01 pairing: (a) no horizontal overflow of the content area, with the same overflowing control element as the positive control; (b) no mid-word wrap: for every word of the long title, reason, reference, path, branch and handle texts a `Range` over that word has exactly one client rect, and an element whose single word is wider than its box ellipsizes (`text-overflow: ellipsis`) with the full text as accessible name or title instead of wrapping; a control element with a word long enough to wrap mid-word proves the check can fail. Each loop asserts it ran the expected number of words and viewports.
5. FR-022 relative time (the new file `sk-work-package-screen.time.test.ts`, red-first, drawn through the screen, `page.viewport` first): (a) with `now` set to a fixed RFC 3339 instant, the Facts row "Last transition" and the lane-history times print the relative text of `resolveActivity`/`relativeTime` (an event a known span before `now`), positive control: two different spans give two different texts; (b) with `now` null the same places print the ISO text of the input; (c) the label hook, UNCONDITIONAL (never dropped): WP02's first step recorded whether #4's `LabelHooks` declares a time hook; if it does, its text is in the DOM and wins over the relative text; if it does not, the screen's hook surface adds none and the case asserts the arm as realised through the `labels.state` and `labels.lane` hooks only (an extra time function cast into `labels` is never called, positive control: the lane hook IS called and its text is in the DOM); (d) an unparsable timestamp (built by cast) prints its raw input text, never `undefined`, `NaN` or an empty string, and the surrounding row is still drawn. Each case asserts its expected row count (an empty loop fails); revert check: ignore `now` and the (a) test fails.

### T055 NFR-006 structural render test

**Steps** (`sk-work-package-screen.perf.test.ts`): the property change replaces `workPackage` with a copy in which exactly ONE history entry is altered AND replaces `detail` with a copy in which exactly ONE subtask lane is altered (with `detailLong` present, `resolveLists` takes subtasks and files from the detail, so a changed `workPackage.subtasks` lane would change no rendered row; the subtask alteration therefore goes in `detail.subtasks`). Assert: (1) both altered rows' text changed (positive control; it can pass because each alteration sits in the property that feeds its list); (2) the OTHER rows' nodes are the SAME objects (lists keyed by stable id: history `eventId`, subtask `id`, file `pattern`; compare node identity before and after); (3) the rendered counts equal 40 subtasks, 60 history entries and 100 files EXACTLY (equality, not "at least"); (4) the median of several runs of initial render and of the re-render is 200 ms or less: a coarse guard, NOT the pass criterion. Inputs: `wpLong`, `wpBulkHistory`, `detailLong`.

**Edge cases**: if the re-render recreates non-altered rows, the cause is a missing key in a part: report it as a change request to the owner (WP06 for history, WP07 for subtasks and files); do not edit the part.

### T056 Focus-restoration tests for the detail-retry and dependency-node triggers

**Steps** (in the a11y file, vitest browser mode): focus a dependency-chain node; the host swaps `wpId` (and the data), the focused node is detached; assert focus lands on the `h1` (`tabindex=-1`); negative control: a swap that keeps the node (same dependency) leaves focus where it was. Second test in the same file: the detail-retry trigger (`status` ready, `detailStatus` `error` to `loading` after Retry of the detail; the focused Retry control is detached; assert focus lands on the real `h1` drawn by WP05's `renderHeader`; negative control: no detach, focus stays). It lives here, not in WP08, because WP08's lane has `renderHeader` as a stub. The whole-screen retry trigger is WP08's test (one test per trigger, VISUAL-011 (a)).

### T057 Side-by-side hand-over (no PNG committed)

**Steps**: for EACH of the six stories produce an uncommitted side-by-side screenshot against `<prototype>/04-work-package.html` at the matching viewport (the prototype's 1100 px, 800 px and 620 px breakpoints for WP-46 to WP-48; the 1280 px page for WP-44, WP-45, WP-49 against the named analogue) in the pinned container (`pnpm visual` for actual images only; its red is the known red and NOT an exit check; never `pnpm visual:update`; no PNG staged). Read and describe each image; map every difference to a DW item as the CP-1 entry and the register state them (DW-23, DW-24, DW-29 and those inherited from other WPs) or flag it as unconfirmed and report it as a change request to the owning work package. In the merged lane every region is drawn: this is the first capture set where the whole screen is visible, so also state in the hand-off any region that looks wrong at a tier.

## Test strategy

Positive controls: every no-event assertion shares a listener with a real activation (EV-2, EV-8); the overflow measurement has a deliberately overflowing control; the perf test has the altered-row control; the focus-restoration tests have the kept-node and no-detach controls. Exactly-one-event: every emit assertion. Counts with equality (40, 60, 100; tab stops; control names). Revert checks per file (listed): a11y (remove a heading level; add a second live region; duplicate an accessible name; announce on first render; let one long word wrap mid-word), perf (drop a `repeat` key; render 39 rows), time (ignore `now`; drop the ISO fallback). Foreign values: WP-45 composition renders raw lane values (assert, with positive control, no `undefined`). Exit evidence: `pnpm visual` is NOT an exit check of this work package (its stories have no committed baseline until WP10, so missing snapshots are the known red); the exit evidence is the uncommitted side-by-side screenshot per story against the prototype, no PNG committed. All other gates green on the merged lane.

## Definition of Done

- Six stories (exactly) and three test files (a11y, perf, time); no part file, no screen file, no lint config edited.
- Every Semantics row and every Announcements row has a test; EV-2, EV-8, NFR-004, NFR-006 and the dependency-node focus-restoration test pass with listed revert checks.
- Tab-stop numbers recorded; control names unique.
- Hand-off lists commit hashes verified with `git cat-file -t`, six side-by-side images read and described, every change request to a part owner, and the confirmation that both chains were present before your first commit.
- No PNG staged; nothing outside `owned_files` edited.

## Risks

- The tests exercise parts you do not own: a failure is a change request to the owner, never a patch.
- A structural perf test written as a pure timing assertion is flaky and vacuous: the identity and count assertions are the proof.
- Announcement tests are order-sensitive: wait for the render promise, not a timer.
- Container widths, not viewports, decide columns: assert content width in the layout checks you add, not the viewport number alone.

- The orchestrator's merge of chain Y into your lane can move story or test files: re-read the tree after the merge and before writing a test that names a story.
- Tab-stop numbers (`tab-<n>`) depend on the control set of every region: record them only from the merged lane and re-check them if a change request lands.
- WP-44 is a heavy story (40, 60 and 100 rows): if Storybook or the screenshot run is slow, say so in the hand-off for the WP10 timing record; do not reduce the counts.

## Reviewer guidance

Check that every row of the Semantics and Announcements tables is covered (including the negative rows), that EV-2's control is an internal activation, that control-name uniqueness and tab-stop equality are asserted, that NFR-006 asserts identity and exact counts (the 200 ms bound is only a guard), that NFR-004 has its overflow positive control, that WP-46 to WP-48 are viewport stories at 1100, 800, 620, and that no part or config file was edited. Check DW-23, DW-24 and DW-29 against the CP-1 entry. The reviewer is a separate agent; it re-runs two revert checks and rejects any unconfirmed difference from the prototype.


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
