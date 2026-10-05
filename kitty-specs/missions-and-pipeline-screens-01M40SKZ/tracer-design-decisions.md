# Tracer: design decisions

Running log of design decisions and their outcomes. Newest last. Full reasoning and rejected alternatives live in `research.md`; this file records what changed and when. Spike outcomes are appended by the work packages that run them.

## Plan phase (2026-10-03), decided in `research.md`

- D-01 five elements; row, card, inspector and headers private. D-03 one dispatch site per event; screens declare child events with `@fires`; library events stop at the boundary.
- D-09 vendor the contract byte for byte at `contracts/spec-kitty/` with `PIN.json` (rejected: fetch at gate time, submodule, npm package). D-10 types from `openapi-typescript` into a committed generated file, freshness byte-compared. D-11 fixtures generated from the examples and named overlays (counts tallied, every other derived value declared per fixture), data-only `.ts` that Node can load. D-12 gate `contract` (seven checks with a coherence check that recomputes the contract's derivations, three plants, relaxations with a reverted-must-fail proof, negative node tests).
- D-08 gate `data-driven` as an ESLint `no-restricted-syntax` config (31 selector entries, S1 to S12 with one entry per alternative, `noInlineConfig`) with a fixed allow-list; all vocabulary of the gate (14 words plus four status words) in `src/defaults/`; no view-type field named like a lane or a phase (`RowView.blockedBadge`).
- D-15 adopt the library's styles-only families (extends the 2026-10-02 progress ruling); exceptions E-01 to E-05 for the operator.
- D-16 native `<button aria-pressed>` over the segmented-choice sheet (rejected: `sk-button` row, `sk-action-row`, roving tabindex). D-17 phase bar over `sk-status-indicator`, connector by spike S2 (pre-decision B, scoped paint exception).
- D-23 filter by toggling `hidden` on the wrapping `li` (library host `display` beats UA `[hidden]`). D-24 `now` property plus hook, ISO fallback.
- D-28 shell footer and inspector agree through an optional `progress.percentage`; the 58 existing baselines must stay identical.
- Open for the operator: the drift register DR-1 to DR-12 and the copy defaults (P-6), PROVISIONAL until the orchestrator obtains confirmation at checkpoint CP-1, owned by the orchestrator between IC-03a (spikes, approved) and IC-03b (skeletons and manifest freeze); reviewers audit against AD-1 to AD-3 plus the DR list as provisional, and an unconfirmed DR becomes a REJECT item. At PR time: exceptions E-01 to E-05 and spec amendment proposals P-1 to P-8. Already approved by the operator on 2026-10-03 (entry "Operator approved exceptions E-06, E-07, X-1" below): P-9 and P-10 with exceptions E-06 and E-07, and process exception X-1.

## Spike outcomes (to be appended by the orchestrator from the work package reports)

| Spike | Work package | Outcome | Decision changed |
|---|---|---|---|
| S0 contract tooling on Node 22.22.2 | IC-01 | pending | |
| S1 segmented-choice sheet in a shadow root | IC-03a | pending | |
| S2 phase bar candidates A, B, C | IC-03a | pending | |
| S3 action-row row and card, notice alert, hidden `li`, hidden search label | IC-03a | pending | |
| S4 native progress without a label | IC-03a | pending | |

## Plan amendment rulings P-1..P-10 (2026-10-03)

Orchestrator rulings on the plan's amendment proposals, applied to `spec.md` in one commit.

- P-1 accept: C-002 records "mission-status contract 1.0.0 at spec-kitty 9f41e48"; it becomes 1.0.0-SNAPSHOT on a later re-pin once spec-kitty's release-tooling slice lands.
- P-2 accept: NFR-009 (gate `data-driven`), NFR-010 (gate `contract`), the e-mail hygiene rule and NFR-007's username-leg wording as the plan states it.
- P-3 accept: FR-033, optional `ShellMission.progress.percentage`; the 58 existing shell baselines stay unchanged.
- P-4 accept: the board's scroll region counts as a control in NFR-003.
- P-5 build it: new FR-034, a visually hidden polite live region announcing the number of Missions shown after a filter or search change and after load more; covered by an interaction/a11y test.
- P-6 deferred to checkpoint CP-1 as the plan says (operator confirms DR-1..DR-12 and the copy defaults after IC-03a); the spec keeps them provisional.
- P-7 accept: the listed public properties are declared with defaults.
- P-8 accept: PL-01 built from planned, claimed, in_progress and canceled work packages (review pending; Review and Approved at 0). PL-11 (`SubtaskProgress1280`) shows all five columns populated; PL-03 and PL-09 show Done and Planned/Review/Done.
- P-9 accept (fold, no follow-up): the node:test suites of `scripts/hygiene`, `scripts/gate-proof` and `scripts/terminology.test.mjs` are wired into a CI gate. Exception E-06: edits an accepted gate's command and plant. Scope: the hygiene and gate-proof jobs' commands, one plant. Rationale: the suites guard the gates and ran nowhere. Sunset: when the accepted gates' own mission absorbs the suites.
- P-10 accept: `linterOptions: { noInlineConfig: true }` in `eslint.no-io.config.mjs` with a plant proving an inline disable no longer silences it. Exception E-07: edits an accepted gate's configuration. Scope: that one option and one plant. Rationale: an inline disable comment silences the gate today (reproduced). Sunset: when the gate config is rebuilt on a shared base with `noInlineConfig`.

## Operator approved exceptions E-06, E-07, X-1 (2026-10-03)

Given directly by the operator on 2026-10-03 and recorded here verbatim-dated by the orchestrator. This entry is the approval the charter's "Amendments and exceptions" rule requires; WP01 and WP02 check for it as a file precondition before their first subtask.

- E-06 (P-9: node:test suites wired into the hygiene gate): APPROVED. Scope note (orchestrator, same rationale, listed for the operator in the PR description): `test:scripts` also runs `scripts/preflight.test.mjs` and `scripts/manifest-screen.test.mjs`, which guard the preflight and manifest-screen gates and ran in no gate either.
- E-07 (P-10: noInlineConfig on the no-io gate): APPROVED.
- X-1 (widen the app-shell mission's gate-proof-record schema and `gate-proof.test.mjs` so new gate ids can be registered, with a test that a new gate id still needs a real proof entry): APPROVED. A registered gate id must not pass `gate-proof.test.mjs` or the schema without a real proof entry; the widening adds ids, it does not relax the check.

## CP-1 confirmed (2026-10-03)

The operator reviewed the WP03 spike evidence: a side-by-side comparison of prototype and spike for every item, rendered with the visual gate's settings at 1280 px in the dark theme. The orchestrator recorded the answers here. Every work package from WP04 on audits against this entry. Drift that is neither confirmed here nor listed in AD-1 to AD-3 is a REJECT.

**Confirmed drift** (approved, not a defect):
- DR-2: the ten card state words.
- DR-3: the lane-summary words, in reverse column order.
- DR-4: a stale Mission that is also active shows both pills.
- DR-5: host-neutral error copy, in the library notice look.
- DR-6: the arrow on every Missions row.
- DR-8: phase-bar candidate B.
- DR-10: the shell footer shows the same percentage as the inspector.
- N-1: the page header's typography and layout.
- N-2: the header band is not full-bleed.
- N-3: filled pills, a smaller slug, a smaller lifecycle/time block.
- **S2:** candidate B, a token-painted connector. **Exception E-04 is APPROVED**: a token-only `background` on the connector in `sk-phase-bar.ts`, nothing else.
- **RINGS:** the phase indicators draw only the library glyph, with no ring and no filled dot.
- **COPY:** every provisional copy default is confirmed as listed in the CP-1 index: the Pipeline empty copy, the host-neutral error bodies, and the card state words.

**Rejected drift: the screens must match the prototype.**
- **DR-1:** the card subtask bar shows only on cards in the In progress column (claimed and in_progress), as in the prototype's single coding card. Cards in other columns show no bar, even when `subtaskProgress.total > 0`. The bar's source stays `subtaskProgress`.
- **DR-7:** the inspector matches the prototype's width (260 px) and content (see N-6).
- **DR-9:** the Pipeline `empty` state uses the same empty-state panel treatment as the Missions empty state (the prototype's nearest analogue), not an info notice. The copy stays as confirmed.
- **DR-11:** the Mission progress percentage is displayed rounded to a whole percent (68%, as in the prototype). The value is still taken from `MissionProgress.weightedPercentage` as given, so this is display formatting only, and the same rounding applies in the shell footer (DR-10 stays consistent).
- **DR-12:** PL-01 shows a card in the Review column, as in the prototype. Its phase bar therefore shows review in progress: the contract derives that whenever a work package is in review. The fixture stays contract-valid and passes gate `contract`, so the board matches and the phase bar follows the contract.
- **N-4:** lanes are flat, as in the prototype, with a small uppercase mono title and no nested card. The five lanes fit at 1280 px without horizontal scrolling.
- **N-5:** cards match the prototype: text wrapping (no mid-word wrap of "depends on WP03"), spacing under the title, and the trailing arrow.
- **N-6:** the inspector uses metric rows with the label on the left and the value on the right, "Current step" in small uppercase mono, the folder icon on View artifacts, and the notice size as in the prototype.
- **N-7:** the loading and empty panels use the prototype's spacing and weight.

**How the rejected items are met (operator ruling):** use scoped local exceptions plus design-library issues, as the app shell did.
- Where layout CSS (grid, flex, gap, `%`/`fr`) cannot reach the prototype, a token-only local override or stand-in is allowed, scoped to these screens.
- Each one is recorded as a numbered exception (E-08 and up) in `contracts/gates.md` and in the PR description, with its scope, its rationale, and a sunset tied to a spec-kitty-design issue that adds the missing variant to the library.
- The implementing work package writes the gap text; the orchestrator files the design-library issues.
- No raw colour or font literals.
- For a size the token set lacks (the 260 px inspector, a lane minimum width), the exception names the value and the issue that will add a token.

## WP04 frozen surface and CP-1 consequences (2026-10-03)

Reported by the implementing work package; the orchestrator owns this file.

- The manifest was regenerated once (IC-03b). Frozen: `sk-missions-screen` (`status`, `project`, `branch`, `missions`, `pageInfo`, `now`, `filter`, `query`, `loadingMore`, `laneGroups`, `labels`, `errorMessage`; events `sk-open-mission`, `sk-search`, `sk-load-more`, `@fires` `sk-filter-change`), `sk-pipeline-screen` (`status`, `mission`, `laneGroups`, `labels`, `missionsHref`, `errorMessage`; events `sk-view-artifacts`, `sk-open-missions`, `@fires` `sk-select-work-package`), `sk-filter-toggle-group` (`options`, `value`, `label`; `sk-filter-change`), `sk-phase-bar` (`phases`, `labels`, `label`; no events), `sk-work-package-board` (`workPackages`, `laneGroups`, `missionId`, `labels`, `label`; `sk-select-work-package`). No slot, no part.
- The CP-1 rejections add NO property, attribute, event, slot or part. They are met inside the frozen surface: DR-1 by an optional `showsProgress` field of the `LaneGroup` value (change request CR-1), DR-11 by a `formatWholePercent` helper (CR-2, CR-3), DR-12 by a fixture change (CR-4), DR-9 inside the same element, DR-7 and N-4 to N-7 by exceptions E-08 to E-13 (`contracts/gates.md`).
- E-04 is approved; its stylelint block belongs to IC-05 (the only writer of `stylelint.config.mjs`).


## Routing of WP04's CP-1 change requests (orchestrator ruling, 2026-10-03)

WP04 froze the public surface. CR-1 to CR-5 implement the CP-1 rejections in files owned by work packages that are already approved. Each request goes to the downstream work package that already edits that area; that package may make it as a permitted out-of-map edit (plain `git commit`, listed in its hand-off), red-first:
- **CR-1 → WP07 (board).** Add `LaneGroup.showsProgress` in `src/logic/types.ts` and `src/defaults/lanes.ts`, true on the default In progress group only (DR-1). The data-driven gate stays green: the flag is data, not a lane literal.
- **CR-2 and CR-3 → WP09 (Pipeline).** Add `formatWholePercent` in `src/logic/`. The shell's `renderFooter` rounds the given percentage the same way, and the existing shell baselines stay unchanged (DR-11, DR-10).
- **CR-4 → WP09.** The `detailImplement` overlay gains a for_review work package, so review is in progress. Regenerate it with `contract:generate` only; gate `contract` must stay green (DR-12).
- **CR-5 → WP06 (phase bar, the owner of `stylelint.config.mjs`).** Add the stylelint exception blocks for E-04 and E-08 to E-13, each scoped to the named files. No global relaxation.
- **E-10 lane minimum width:** measure it from the prototype at `<kitty-desktop>/screens-opendesign-v2/03-pipeline.html`. This is outside the repo; the orchestrator passes the path in the work-package dispatch. Use the smallest value at which five lanes fit 1280 px inside the shell's content area.

## Routing of WP04 review findings (orchestrator ruling, 2026-10-03)

- **F3 (sev 2), stylelint ownership across the two chains.** CR-5 is split:
  - WP06 writes the stylelint blocks for E-04 and E-08 to E-12, and adds `min-inline-size` to the property allow list for E-10's scope only (F5).
  - WP08 writes its own E-13 block, for the Missions screen's loading and empty panels, as a permitted out-of-map edit, because WP08 does not descend from WP06.
  - WP10 resolves both blocks when it merges the chains, keeping each one scoped.
- **F1 (sev 2), untyped `label` field.** Annotate `label: string` and regenerate the manifest with `manifest:generate`: WP06 on `sk-phase-bar`, WP07 on `sk-work-package-board`.
- **F2 (sev 2).** The surface-freeze test does not see a dropped `@fires` or a changed attribute in source; only `manifest:check` catches those. Queued for the wrap-up fold: extend the test, or document that `manifest:check` is the guard.
- **F4 (sev 1).** The board contract has conflicting text on its metadata slot (actor or the trailing arrow). N-5 is decided: the prototype's card has the actor plus dependency row and the trailing arrow, so both stand. WP07 implements both and corrects the contract text through its kitty-specs patch.
- **F6 (sev 1):** import the `@fires` payload types. WP08 and WP09 do this for their screens.
- **F7 (sev 1):** `surface-freeze.test.ts` is outside `owned_files`. Recorded; it is accepted as WP04's out-of-map test.

## E-10 lane minimum width corrected to 96 px (orchestrator ruling, 2026-10-03)

WP07 measured the real shell at 1280 px. The content cell is 904 px, not the 936 px of WP06's derivation, because the `main` padding is 40 px and not 24 px. With the 260 px inspector, 120 px lanes overflow by about 46 px, which breaks the N-4 rejection (five lanes must fit without horizontal scroll). WP09 adds the prototype's 24 px board padding, which brings the fit to about 98 px, so E-10 is set to **96 px**:
- WP07 changes the value in `stylelint.config.mjs` (a permitted out-of-map edit) and in the board's lane rule, with a test that fails first: five lanes inside the real content width, no overflow.
- WP09 re-checks the fit on the full Pipeline screen.

## Operator rulings on the WP08 review (2026-10-03)

The WP08 review rejected two items against CP-1. The operator ruled directly:
- **F1, the empty, loading and no-match panels:** they match the prototype (N-7 rejected). Exception **E-13 is extended**, scoped to the Missions screen's panel rules only:
  - token-only `background`;
  - token-only `border-radius`;
  - a `border` in a token colour and token width, with the `dashed` style keyword. `dashed` is the only non-token value.

  The sunset stays spec-kitty-design#510.
- **F4, the panel heading:** it uses the prototype's display face. E-13 additionally allows a token-only `font-family` (the display-face token) on the panel heading only.

Accepted as drift, from the reviewer's rulings, and listed in the PR description:
- the raw contract topology values (`single_branch`);
- the lane-summary typography;
- the page header (N-1/N-2).

F2 (title and slug inline, as in the CP-1 spike) is fixed with a layout-only `::part(trigger)` `grid-template-areas` rule; no exception is needed.

## Operator ruling on the WP07 review (2026-10-03)

- **F-1, lane-title letter-spacing:** the title matches the prototype. Exception **E-09 is extended** with one pinned literal, `letter-spacing: 0.08em`, on the board's lane title rule only. It sunsets on spec-kitty-design#506, which adds a tracking token. Nothing else in E-09 changes. This also resolves F-2: E-09's letter-spacing entry is now used.
- **Accepted, from the reviewer's rulings:**
  - the library's filled sans pills (seen and confirmed at CP-1 under DR-2 and N-3);
  - the visually hidden board heading (the prototype shows none; contract P-7).
- **Addendum to the WP08 rulings (orchestrator, 2026-10-03):** the operator's F1 ruling is "match the prototype". The prototype's loading panel has a solid border, so E-13 also allows the `solid` style keyword on the loading panel only; empty and no-match keep `dashed`. Separately, `--sk-font-display` (Falling Sky) may not be loaded in Storybook, so the panel heading can still render in the sans face even with correct CSS. This is to be checked at the operator's Storybook review, with font loading as a host or Storybook-preview concern.

## E-13 on the Pipeline screen (orchestrator ruling, 2026-10-03)

DR-9 was rejected at CP-1: the Pipeline `empty` state uses the same panel treatment as the Missions empty state. The operator's WP08 rulings gave that panel the prototype's chrome (token background and radius, a dashed border on empty, a solid border on loading) and the display face. WP09 therefore adds E-13's Pipeline half: the same properties and keywords, scoped to `sk-pipeline-screen/sk-pipeline-screen.ts` only, with token values only and `dashed`/`solid` as the only keywords; sunset spec-kitty-design#510. WP10 keeps both halves, each scoped to its own file.

## Operator rulings on the WP09 review (2026-10-03)

- **Q1, inspector chrome:** it matches the prototype's flat full-height panel: hero background, a 1 px left border only, no radius, and no floating `sk-card`. Exception **E-12 is extended** with token-only `background`, `border-inline-start` (token colour and width, `solid`) and `border-radius: 0`, scoped to the Pipeline parts files; sunset spec-kitty-design#509.
- **Q2, narrow lanes:** the board keeps five lanes without scroll (N-4, E-10 96 px). Lane titles and card titles wrap **only between words**, never mid-word. A single over-long word is ellipsized, and the full text stays in the accessible name and a title tooltip. Wrapped lane titles ("IN / PROGRESS") are accepted. This touches the board (WP07's files), so WP09's rework makes it as a permitted out-of-map edit under E-11 (card text wrapping), with a test.
- **Phase band:** the prototype's hero background and bottom rule are restored, as token-only `background` and `border-block-end` on the phase band, under the same E-12 extension.
- **Covered by the CP-1 N-6 rejection, no question needed:**
  - F2: the eyebrow gets `letter-spacing: 0.08em`, pinned in the same way as E-09 and extended to `pipeline-parts.ts`.
  - F3: View artifacts is a content-width outlined button.
  - F4: the notice body uses the token text size (14 px).
- **Also fixed in the rework:** F6, the tab tags 12/19 in the contract and plan text (through the patch); F7, a long breadcrumb wraps or ellipsizes instead of clipping. F8 (duplicated "Current step") is spec copy; it is left as is and noted in the PR.

## WP09 rework: tab tags recorded here, not in plan.md (orchestrator, 2026-10-04)

The Pipeline screen's focus stories are `tab-12` (the WP01 card) and `tab-19` (View artifacts). Tab stops are counted from the page start and include the header's settings button. The contract carries these numbers. `plan.md` is not edited, because an edit would make the recorded analysis stale and block the next claim; this entry supersedes any older tab numbers in the plan.

## Chain merge for WP10 (orchestrator ruling, 2026-10-04)

Merging chain B's approved WP08 tip (lane-h) into WP10's lane (lane-j, created from WP09's approved tip) conflicts in `stylelint.config.mjs`, `package.json` (`test:scripts`) and `gates/plants/stylelint/plant.json`. Each chain extended the exception table, the script list and the plant registry independently.

The plan's fallback (Lane mechanics item 4: serialise the chains) no longer applies, because both chains are built and approved. The merge resolution is **WP10's first subtask**, done in its own lane and covered by its review:
- **Keep every exception entry from both chains**, each scoped to its own files: E-13's Missions half and Pipeline half, and the E-09, E-11 and E-12 extensions.
- **Reconcile the tests.** WP08's `scripts/stylelint-e13.test.mjs` asserts that the Pipeline file refuses the panel declarations, which contradicts the approved Pipeline half. Each half's test asserts its own file only, and neither file leaks to the other or to siblings.
- **Union `test:scripts` and the plant registry.**
- **Regenerate `custom-elements.json` with `manifest:generate` only.**
- **Run the full gate set and gate-proof green on the merged tree before any other WP10 work.**

## Chain merge resolution recorded by WP10 (2026-10-04)

WP10 merged chain B (lane-h, approved WP08 tip) into its lane. Three conflicts, resolved as ruled:
- `stylelint.config.mjs`: the exception table of chain A (E-04, E-08 to E-12 and the Pipeline half of E-13) was kept whole; chain B's stand-alone `E13_FILES` block and override were folded into the table as the Missions half of E-13 (file `sk-missions-screen/sk-missions-screen.ts`, same five properties, `dashed` and `solid` as the only non-token words), so every exception entry is declared once and merged per file by `exceptionOverrides()`.
- `scripts/stylelint-e13.test.mjs` (chain B) asserted that the Pipeline file refuses the panel declarations. It now asserts the Missions file allows them, a sibling file refuses them, the Pipeline file allows them through its own half, and neither screen file is granted E-09, E-10 or E-12 properties. `scripts/stylelint-exceptions.test.mjs` (chain A) gained the Missions half of E-13 as a case; its out-of-scope probe file moved from `sk-missions-screen.ts` (now in scope) to the sibling `mission-row-parts.ts`.
- `package.json` `test:scripts` is the union (`stylelint-exceptions`, `stylelint-e13`, and the new `terminology` test); `gates/plants/stylelint/plant.json` holds all four plants (exception-leak, min-inline-size, inspector-leak, weight). `custom-elements.json` regenerated with `pnpm manifest:generate`: no diff against the merge result. No status file conflicted.
- Story count on the merged tree: 118, of which 60 are new (24 Missions, 22 Pipeline, 6 board, 4 filter group, 4 phase bar), as planned; PL-10 (empty) was confirmed at CP-1 and is built, so the 117 case did not apply.


## Operator Storybook review: findings (2026-10-04)

All ten work packages were approved. The operator then reviewed the screens in Storybook and asked for eight changes. They are fixed before the wrap-up, on the integration lane (lane-j), and reviewed independently:

1. **Filter toggle group:** a joined segmented control. Only the first and last segments get the outer border radius; the inner segments have straight corners, and the buttons are no longer separately bordered.
2. **Missions:** a gap between the "Load more Missions" button and the no-match panel above it.
3. **Missions:** the empty, loading and error panels stretch across the full content width, like the content of the other states.
4. **Notice (both screens):** the text block aligns with the top of the info icon.
5. **Pipeline:** the current-step inspector runs the full height of the content area, like the rail and sidebar.
6. **Pipeline:** the empty, loading and error panels stretch across the full content width (same as 3).
7. **Phase bar:** always takes the full width of its row, whatever the number of phases.
8. **Pipeline responsive:** placing the current-step inspector below the board is fine, but on tablet and smaller tiers it spans the full width.

Where layout CSS cannot reach a result (for example the segmented radius on the library's buttons), a scoped token-only exception is used under the operator's standing ruling, recorded in gates.md with a spec-kitty-design sunset.
9. **Missions (added during the same review):** the gap between the last Mission row and the "Load more Missions" button equals the gap between the search and filter toolbar and the first Mission row. Both use the same token gap, and item 2's gap below the no-match panel matches it.
5b. **Pipeline (follow-up to item 5):** the inspector runs flush to the bottom and right edges, like the sidebar and rail. A gap under it creates an unwanted focus point. The accepted shell's padding for other screens does not change.
8b. **Pipeline (follow-up to item 8):** on tablet and smaller tiers, where the current-step inspector stacks full width below the board, it gets a top and a bottom border and a border radius. On the wide tier it stays the flat full-height column with a left border only. E-12 is extended narrowly to allow this, on the Pipeline parts and on these tiers only.
10. **Missions (stacked mobile tiers):** the row's lifecycle status badge starts on the same left edge as the title, the tag pills and the time line. Before this it was indented with extra left padding.
1b. **Filter toggle group, wrapped (follow-up to item 1):** when the group wraps, each visual row reads as its own rounded segment run. The first segment of a row gets the start radius and the last gets the end radius. A segment alone on its row (for example "Discarded" spanning the full width, which the operator likes) gets both. Inner corners stay straight. The row positions are measured inside the element (no I/O; the public surface is unchanged).
5c. **Pipeline (follow-up to 5b, from the independent review):** at the wide tier (container width of 761px and up) the phase band runs flush to both edges of the content column: on the right it aligns with the flush inspector, which removes the 24px step at the top right, and on the left it meets the sidebar. Its inner content keeps token padding. The stacked tiers are unchanged.
11. **State panels (regression from items 3 and 6, found by the independent review):** the full-width state panels keep the library's centred content (label and progress bar) and the loading panel's card fill on both screens. Full width does not mean left-aligned content.

## Operator approval of the Storybook fix round (2026-10-04)

The operator re-checked the screens in Storybook after the second independent review (items 1 to 10, 1b, 5b, 5c, 8b and 11) and approved them visually. Rulings on the questions left open:

- **DONE column at 1024 collapsed:** fix it in the wrap-up. The board must keep every lane column reachable at the 1024 collapsed tier (no clipped DONE column); a test asserts it.
- **Progress fill colour (WP10 Q1):** the design library's yellow is accepted as confirmed drift from the prototype. No token request.
- **Phase bar at 390 (WP10 Q2):** fix it in the wrap-up. The scrolling phase band is keyboard-focusable (arrow keys scroll it, a visible focus ring) and shows an edge fade when phases are off-screen on that side; tests cover focus, keyboard scroll and the fade state.

## Pre-merge squad rulings (2026-10-04)

The aggregate review squad (R1 to R3, report-only) confirmed 17 findings, none at severity 4 or 5. The operator ruled on the forks:

- **Card header in narrow lanes (PR-VISUAL-001, PR-VISUAL-002):** at the narrow lane width the state pill always stacks on its own line under the WP id, on every card, so no pill is clipped and the board reads uniformly. Wide lanes keep the inline header.
- **State stories (PR-VISUAL-006):** each empty, loading and error story gets a shell fixture that matches its state, so the chrome does not contradict the content.
- **E-16 sunset:** spec-kitty-design#514 (a focusable overflow scroller with edge fades), filed for this.

Every other confirmed finding has a single remedy and goes to the fix round as written in the squad's confirmed set. `scripts/stylelint-e13.test.mjs` was retired in the development-assist cleanup and its cases were folded into `scripts/stylelint-exceptions.test.mjs`. Earlier entries in this log that name the old file are historical; the normative references in `contracts/gates.md` are updated.

### Squad fix round (2026-10-04)

The 17 confirmed findings were worked on the lane; this records what the kitty-specs side needs.

- **Card header (PR-VISUAL-001, PR-VISUAL-002; N-5):** below a 200px card container (the width at which the card grid already switches layout) the state pill always stacks on its own line under the work package id, on every card; at 200px and above they share one row. The pill's tag shrinks inside the card and ends in an ellipsis only for a word wider than the card (the full word is its text and `title`); card and pill padding are one token step tighter in narrow lanes so the common state words (queued, claimed, coding, review, done) show whole in the narrowest 90px lane. Tests: the card header cases in `test/sk-pipeline-screen.test.ts` (1024, 800, 390, 320) and `test/sk-work-package-board.test.ts`.
- **Exceptions (PR-EXC-001 to PR-EXC-004):** E-14, E-15 and E-16 are tightened in `stylelint.config.mjs` to what their rows say (new `pinned` and `unstrict` options of the `EXCEPTIONS` table); each hole has a refusal case in `scripts/stylelint-exceptions.test.mjs`. The keyword leak (`solid`, `dashed`, `none` allowed file-wide on properties no row grants) was left as is: those words are meaningless on the properties concerned.
- **PR-ARCH-002 (operator ruling 2026-10-04):** the loading, error and empty panel markup stays duplicated in the two screens. A shared module would need a third file in the E-03 `class=` override; the exception is not widened. Revisit when the design library ships a state panel.
- **Spoken lane count (PR-A11Y-001):** the digit is `aria-hidden` and a visually hidden span after it carries the words (`LANE_COUNT_TEXT` in `src/defaults/lanes.ts`); research D-18 is updated.

Operator rulings on the fix round (2026-10-04):
- **Pill words at the narrowest lanes:** accepted. The pill never overflows the card; at 90px lanes only the longest state words (approved, canceled, not started) end in an ellipsis, with the full word in the tooltip.
- **Narrow-lane card and pill padding** one token step tighter (narrow lanes only; wide lanes unchanged): accepted.
- **Keyword allowances:** the non-token keywords an exception row grants (`solid`, `dashed`, `none`) are accepted only on the properties that row grants, in that row's file, not file-wide; this is part of PR-EXC-001. Layout properties the base layout-only rule already allows (`display`, `flex`, and their `none`) are outside the exceptions and unchanged.

## Landing pass on PR #6: operator rulings (2026-10-04)

A fresh second-opinion squad (correctness and design lenses) reviewed the integrated diff during the landing pass. Every MINOR and every foldable NOTE was folded as its own `(landing)` commit. Operator rulings on the forks:

- **Event naming:** verb-noun. The sample's `sk-mission-open` is renamed to `sk-open-mission`, so one name means "open a Mission". The shell's older events (`sk-toggle-*`, `sk-tree-toggle`, `sk-mission-retry`, `sk-shell-retry`, `sk-navigate`) are left for a separate pass.
- **Draft and stale:** a draft Mission appears only under All, never under Stale or another status filter, even when it is stale.
- **Shell flush slot:** `sk-mission-shell` gains a `flush` content option and a public `--sk-mission-shell-content-padding` property. The Pipeline screen uses them, and E-15 with its negative margins is removed. spec-kitty-design#512 stays as the long-term library ask.
- **Pipeline side-by-side tier:** the board and the current-step sidebar sit side by side from 881 container px. At 880 px and below, the current step stacks under the board with the tablet border and radius. This replaces the 760 px boundary of items 8 and 8b.

Deliberate behaviour, stated rather than changed: an unknown phase status shows as pending (data model), and 99.5 displays as 100% under the DR-11 whole-percent ruling.
