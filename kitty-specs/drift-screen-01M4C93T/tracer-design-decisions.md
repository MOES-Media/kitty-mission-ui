# Drift screen: design decisions

Running log for mission `drift-screen-01M4C93T` (mission-ui#10). Newest last.

## Operator rulings on the specify phase (2026-10-08)

- Q1 to Q10 and the five confirmations: all as recommended (see `operator-questions.md`, `spec.md` Clarifications).
- The V2 prototype pages are current.
- The contract is re-vendored once, first, by #9 Projects after PR #5881 merges; no stacked branches; #10 starts implementation from `main` after the re-vendor.
- Exceptions E-35..E-39 for this mission. Retry target `drift-report`. `sk-open-mission` carries `{ missionId, slug }`.

## Plan phase (2026-10-08)

Decisions D-01 to D-16 are in `research.md`; spikes S1 to S6 precede CP-1. The adversarial squad ran in-session (the dispatch forbade sub-agents), so the three lens groups were applied one after another by one agent: independence is weaker than the protocol assumes. 15 findings, 14 confirmed, 1 refuted (PLAN-GOV-002: `check-prerequisites` is valid without `setup-plan`); fix round 1 applied all 14; a fresh sweep found 2 more (PLAN-FRESH-001 sev 3, -002 sev 1), fixed in round 2; verification resolved all 16. No fork reached HALT. Pending for CP-1: E-35..E-39 (E-36..E-38 may be dropped by S1), the E-18 scope extension to this element's `panel-parts.ts`, DD-1..DD-21.

## Operator: start now, stacked on #9's re-vendor (2026-10-09)

- **Operator ruling: start #10 now, stacked on #9's contract re-vendor**, instead of waiting for #9 to land on `main` (plan Build base 2).
  - #9's re-vendor commit (spec-kitty `805e122df79e862571839715d023920904891851`, `provenance: main`, which already holds every Drift path, schema and example) is cherry-picked onto `feat/drift-screen-10` as d961b4d (`-x`, from #9's 521573e).
  - #10 still does not re-vendor.
  - WP01's stop-check reads "the re-vendor commit from `main`" as this commit until #9 lands.
- **Landing order:** #10's PR lands after #9's. When #9 has merged, `main` is merged into #10. The vendored files are identical, and the registry/overlay entries are append-only, so whoever lands second re-reads them and resolves.

## WP01 approved (2026-10-10)

- **Contract wiring:** stacked on d961b4d with no re-vendor. 17 registry fixtures were appended after #9's entries (89 in all: valid 73, host 4, relaxed 12). The relaxation `drift-vocabulary-open` leaves `sourceCode` closed.
- **Scoped, foreign and unlisted overlays:** they are kind `valid`, which is correct. They carry no host-only fields and validate against the strict schema.
- **The 1000-finding bulk report:** it stays out of the registry because of its size, following the 500-Mission bulk page precedent. IC-02's `fixtures.ts` exposes it through `makeDriftReport`.
- **Gate baseline under load:** `pnpm test` and gate-proof's visual leg failed only on stability and focus timeouts at load averages of 19 to 48 from other missions. Everything else was green. The confirmation runs are serialized on a quiet machine.

## WP02 review (2026-10-10)

- **Orchestrator (contract wording, single remedy):** `contracts/defaults.md` now names `DRIFT_NOT_FOUND_HEADING`, `DRIFT_NOT_FOUND_BODY` and `DRIFT_LOADING_LABEL`. The unprefixed names already exist (#5's `wp-copy.ts`, `lifecycle.ts`), so `export *` would be ambiguous. IC-03b and IC-04 import the prefixed names.
- **The finding title is `summary`** (FR-010, DR-10). The WP text "explanation fallback to summary" is stale.
- **For CP-1:** the head badge reads the severity word ("error") where the prototype reads "disagreement".
- **Landing conflict with #9:** both edit the retry union. Affected files: `logic/wp-retry.ts` (the union line and the `retryDetail` signature), `sk-work-package-screen.ts` (the `retryLoad`/`retryPayload` signatures), `wp-retry-union.test.ts` (the case arms), and the `logic`/`defaults` index files (appends). There is no semantic clash. #10 lands after #9 (stacked), so on its merge of `main` it adopts #9's shape:
  - union `WorkPackageRetryMember | ProjectRetryDetail | ProjectsRetryDetail | FoldersRetryDetail | DriftRetryDetail`;
  - `WorkPackageScreenRetryDetail` is dropped in favour of #9's `WorkPackageRetryMember`;
  - the screen keeps #9's `WorkPackageRetryTarget`;
  - both sets of case arms stay;
  - then re-run typecheck, the union test and `manifest:check`.

## CP-1 confirmed (2026-10-10)

Operator rulings on the WP03 evidence packet (spikes S1 to S6). The exact values are in `research/cp1-evidence.md`, sections 4 to 7, which is binding for every value cited here. Every grant is narrow, pinned to its file, token-only except the named literals, and leak-tested against every sibling part file. A WP that cannot match the prototype within these grants reports the gap; it does not widen a grant.

**Fidelity (operator: "grant all, including the 44 px buttons")**
- G-1 to G-8 are granted, under the reused number **E-37**:
  - G-1 screen type (`--sk-text-sm`, `line-height: 1.5`);
  - G-2 mono and muted;
  - G-3 eyebrow (extends E-09's pinned `0.08em`);
  - G-4 outlined mono pill (`line-height: 1.2`);
  - G-5 header band;
  - G-6 detail title (`line-height: 1.3`);
  - G-7 buttons, variant `secondary`;
  - G-8 Facts.
  The original E-37 table restyle is dropped (S1).
- **F-2 option C:** the lane table is the library `data-table` family with `OverflowRegion`, plus the type grants G-2 and G-3 on cells and headers (headers `letter-spacing: 0.06em`, `padding: var(--sk-space-3)`). The library frame (zebra, horizontal rules only, no outer border) is confirmed drift **DD-22**. WP04 adds `dataTableSheet` to `library-sheets.ts` (change request).
- **F-3:** Rescan and Copy get a pinned `min-block-size: 44px` on `sk-button::part(button)` in this screen's part files, under E-37 (the E-10 precedent for a pinned px).

**Exceptions**
- **E-35 kept:** the 420 px list track, one column below a container width of 800, and `:state(shell-mobile)`.
- **E-36 kept:** the raw `role="option"` finding button, with `--sk-border-selected` as the selected marker (S6, 10.3:1) and a forced-colours `Highlight` marker.
- **E-37 reused** for the grants above.
- **E-38 re-scoped (F-1 option a):** the host owns the copy (Q5 stands). The field is our own `code` plus `sk-button`, and the command wraps (`overflow-wrap: anywhere`). The Copy button stays a library pill. The library gap (no request-only copy field) is filed at wrap-up.
- **E-39, F-4 recommended:** the slug in rows and the header takes `overflow-wrap: anywhere`, not an ellipsis.
- **E-18 extended** to `panel-parts.ts` (same sunset, #516).

**Thresholds (S2):** two panes from 800 px up (DR-27 keeps two panes at 1100); one column below a container width of 800. The first table scroller appears at a cell width of 744.

**Other rulings**
- **F-5:** the shell's content cell scrolls as a whole; the panes are not independent scrollers. Confirmed drift **DD-23**. The shared shell is not changed.
- **F-6:** panel labels are eyebrows in the `sk-section-header` eyebrow slot, named through `aria-labelledby`.
- **F-7:** the authority pill is neutral; no tone table is invented.
- **F-8:** the head badge reads the severity word (`error`), not "disagreement".
- **Register:** DD-1 to DD-21 confirmed, plus DD-22 and DD-23. N-1 to N-9 are closed by the grants and rulings above. N-11 needs no action. N-12 is pre-existing shell drift.
- **Spec amendments:** A-2, A-3, A-4, A-6 and A-7 as written in the packet. A-5 does not arise (F-1 option a).
- **Not measured:** WebKit and the Desktop webview (S5 untested there, an accepted risk as on #7); G-6's height after the 1.3 line-height; the prototype Facts geometry.

## CP-1 addendum at the WP04 review (2026-10-10)

Orchestrator, applying the operator's standing prototype-fidelity preference (narrow, pinned, token-only grants), with values measured on `06-drift.html` by the WP04 reviewer. WP04 owns the lint configs, so these are added now; WP05 and WP06 use them.
- **E-39 extended** to `detail-parts.ts`: `overflow-wrap: anywhere` on the Facts `dd`.
- **E-37 additions in `resolution-parts.ts`:** the copy result `color: var(--sk-fg-muted)`; the command text `color: var(--sk-fg-body)`; `min-block-size: 1.5em`, pinned, so the copy result does not shift the layout.
- **E-37 addition in `header-parts.ts`:** the Rescan text `color: var(--sk-fg-body)`. The prototype is 214; the library secondary is 255. Its background and border are measured in WP05 and reported, not widened.
- **The four ESLint `class=` rows** (`sk-data-table` in table-parts, `sk-facts` in detail-parts, `sk-empty-state` and `sk-progress` in state-parts) are recorded under F-2 and the E-17 precedent. They are needed by the library families CP-1 adopted.
- **`::part` selectors are pinned per file**, following #5's `wp-part-selectors.test.ts`, so the later `sk-button::part(button)` and `sk-pill-tag::part(tag)` rules stay guarded.
- **Not granted:** `text-wrap` (optional; refused everywhere today).

## Rulings at WP06: scoped button rules and part-file copy (2026-10-10)

- **Orchestrator (defect, single remedy): scope every `sk-button::part(button)` rule by a data attribute.** Unscoped rules hit every `sk-button` in the shared shadow root, so the Facts Mission link renders as a 44 px semibold button where the prototype has plain mono text. The selector pins in `drift-part-selectors.test.ts` and `stylelint.config.mjs` change, as named out-of-map edits by WP06:
  - `sk-button[data-copy]::part(button)` in `resolution-parts.ts`;
  - `sk-button[data-rescan]::part(button)` in `header-parts.ts`;
  - a new narrow grant, `sk-button[data-mission-link]::part(button)` in `detail-parts.ts`, set to the mono family, normal weight and zero padding, so it matches the prototype's plain mono link.
  
  The unscoped form is refused (planted).
  - WP05 adds `data-rescan` to its Rescan button. If WP05 is already done, the WP07 merge or WP06 applies it as a named out-of-map edit.
- **Orchestrator (data-driven rule, single remedy): the part files hold no copy.** The static labels (Authoritative side, Facts, Mission, File, Derived side, Suggested resolution, the table `aria-label`) and the S5 manual-selection fallback sentence ("Select the command and copy it with your keyboard") move to `defaults/drift-copy.ts`, as a named out-of-map edit by WP06 to WP02's file. `contracts/defaults.md` is patched to match.

## Rulings at WP05 (2026-10-10)

- **Orchestrator (standing prototype-fidelity preference, narrow pinned grant):** at 620 px the last-scan and Rescan row sits about 12 px right of the title. The gap comes from the library's empty `sync` slot in `sk-page-header::part(meta)`. The fix is a grant on `sk-page-header::part(meta)` in `header-parts.ts` only, closing the gap token-only (for example `column-gap: 0`, or hiding the empty slot), measured against the prototype at 620. It is a named out-of-map edit by WP05 to the config, the exceptions test and `drift-part-selectors.test.ts`.
- **The Rescan button carries `data-rescan`,** to match the scoped selector ruled at WP06.
- **`sourceCode` stays out of the list rows.** The spec's Q3 and DR-32 place it under the detail title. The WP05 prompt's T026 line is stale on this point, and the spec wins.
- **The listbox gets its own accessible name from `defaults/`:** a findings-list label, as a named out-of-map edit to `defaults/drift-copy.ts` and a `contracts/defaults.md` patch. It is not named by the head count.
- **Confirmed as built:**
  - the visually hidden per-severity roll-up;
  - the truncation notice with `tone="info"`;
  - `announce="off"` on both notices;
  - "Rescanning" while busy;
  - the roving tab stop rule.
- **The states' library look** (no dashed card, Retry below the notice) is covered by DD-18. It is flagged for the operator's Storybook review.
- **Note for the WP07 merge (2026-10-10):** WP05's lane still carries the unscoped `sk-button::part(button)` Rescan rule, although its button has `data-rescan`. WP06's `drift-part-selectors.test.ts` refuses that form. On merging lanes e and f, the header rule becomes `sk-button[data-rescan]::part(button)`. The union of the two pin-test edits keeps `::part(meta)` (WP05) and the scoped selectors (WP06).
- **WP05 approved (2026-10-10).** Fold into WP07: fix the revert note in `sk-drift-screen.list-keys.test.ts` (the import swap); scope the header rule to `[data-rescan]`, because the unscoped form also paints Retry and Return at 44 px.

## WP06 approved; folded into WP07 (2026-10-10)

Each item below is a named out-of-map edit WP07 may make.
- **Table cell colour (standing fidelity preference, narrow pinned grant).** The prototype `td` is `--sk-fg-body` (214); the library paints 255. Add `color: var(--sk-fg-body)` on `.sk-data-table td` in `table-parts.ts`, plus that value in the table-parts E-37 config row, with a leak test and a plant.
- **Copy announcement (FR-021, defect).** When the host answers `manual` but the selection read-back failed, the screen's live region still says "the command is selected". The screen learns the read-back result from the resolution part (callback or event) and announces `COPY_MANUAL_FALLBACK` instead. This is an edit to the frozen screen file, red-first.
- **`SelectContents` directive.** Select only on the transition into `manual`, not on every re-render, so a host re-render cannot steal the user's partial selection. Red-first.
- **Test nits:**
  - EV-3/EV-4 keyboard tests assert the event flags;
  - the "at 620" scroller test mounts at 620 or is renamed;
  - the "equal rows dropped" test asserts that its fixture really contains equal rows;
  - the list-keys revert note names the import swap.
- **Header rule scoped to `sk-button[data-rescan]`** when lanes e and f merge (see the WP05 note).

## Rulings at WP07 (2026-10-10)

Each item is a named out-of-map edit WP07 may make; each is red-first.
- **Row-title leak (defect, single remedy).** The detail's G-6 `[data-title]` rule in `detail-parts.ts` also styles the list rows' `<strong data-title>`, so rows render 18 px display face where the prototype has 14 px. Scope it to the detail region, for example `[data-region='detail'] [data-title]`, and measure the row title back to 14 px bold at 214.
- **Missing `scannedAt` (defect, single remedy).** The header must never print "last scan undefined". Follow the spec: show the raw string, or no line at all. Fix `lastScanLine` and the header and state parts. The `it.fails` pin is removed and becomes a normal passing test, because hiding markers are not allowed in the final tree.
- **Mission link wrap (standing fidelity preference, narrow pinned grant).** Add `text-align: start` on `sk-button[data-mission-link]::part(button)` in `detail-parts.ts`, with a pass case, leak tests and a plant.
- **Copy divider and pane:** covered by the F-1 ruling (the Copy button stays a library pill). No change.
- **WP07 approved (2026-10-10).** These test nits are folded into WP08:
  - the tiers "620 Copy" test gets a `toEqual` detail and scrolls the table;
  - the 200% test passes the unbreakable slug;
  - the forced-colours scroll-box check asserts the box, with a ring control;
  - the perf control proves the 200 ms assertion can trip.
- **Lesson from #9's public CI (2026-10-10):** pixel literals that depend on a monospace glyph width fail on runners with a different fallback font (the prototype never loads JetBrains Mono). WP08 and the final review make every measured literal font-independent: heights from the computed line height and padding, and widths only where the font is bundled (Inter, Falling Sky), or as relations.

## G-9 ruling at WP08 (2026-10-10)

- G-9 (E-37): busy rescan button start padding --sk-space-7 so the spinner clears the label; operator standing preference for narrow pinned token grants, applied by the orchestrator 2026-10-10, reported to the operator.

## Storybook review (2026-10-11)

The operator reviewed the 38 Drift stories: "the rest looks good". There is one change.

- **SR-1, the pane divider reaches the bottom.** The divider between the list and the detail, the list pane's `border-inline-end`, must run to the bottom of the shell's content cell. Today it stops where the shorter pane's content ends.
  - The two-pane layout fills at least the height of the content cell. When the content is taller than the cell, the divider runs the full content height, and the cell still scrolls as a whole (F-5, DD-23).
  - This applies only to the two-pane tier. In the one-column tiers there is no divider.
  - The affected baselines are regenerated in the pinned container.

## Operator rulings on the pre-merge squad forks (2026-10-11)

- **CONTRACT-002, scoped scan: stay silent.** When the screen is scoped to one Mission and a report arrives that holds another Mission's finding, nothing is announced, as FR-009 and FR-026 say. This needs a paired test.
- **A11Y-004, the busy state.** The root is `aria-busy` only during the first load. During a rescan, the busy state sits on the Rescan control, and "Rescanning" is announced once in the polite region (the copy lives in `defaults/`). This also covers A11Y-003, because the busy state is now perceivable.
- **BOUNDARY-002, retry types: follow #7.**
  - `RetryLoadDetail` stays exact, so the Work Package screen's public `SkRetryLoadDetail` is not widened.
  - Drift's retry detail joins the separate `RetryLoadEventDetail` union only, mirroring #7's `SkArtifactRetryLoadDetail`.
  - The surface-freeze test pins both unions.
- **BOUNDARY-005, grant sunsets: file the issues and cite them.** The orchestrator files the design-library gaps on spec-kitty/spec-kitty-design, as on #7 and #9. Each grant comment then cites its issue.

## Pre-merge fix round 2 notes (2026-10-11)

- **F-4.** The DR-18 clean-state last-scan line is drawn sans, by analogy with the empty-state body text. The prototype has no clean state that pins this.
- **F-5.** The frozen `sk-drift-screen.ts` changed in this fold round. `updated()` now handles focus that is lost while the element stays connected: it keeps the detach branch, plus a re-check one animation frame later. The redundant synchronous branch is removed. The busy line follows the A11Y-004 ruling. The a11y test for the scroller going from 620 to 1600 pins the remaining path.
- **Rescan with no change (orchestrator copy ruling).** A rescan that returns the same scan time and count must not leave "Rescanning" in the live region, because announcements follow what is shown. It announces "Rescan complete: no changes" once. The copy lives in `defaults/`.
- **Round 3 (S-1, S-2).** The rescan's end line is decided against the report captured when `rescanning` rises. It is announced one task after the flag falls, so that a report delivered in a separate update from the host is seen first. The frozen `sk-drift-screen.ts` therefore gains `scheduleRescanEnd`, `cancelRescanTimer` and `disconnectedCallback`. The surface-freeze test records these.
- **Operator ruling on the rescan timer (2026-10-11): drop the timer and put the requirement in the contract.** NFR-005 ("no timers") binds. The one-task `setTimeout` is removed, together with `scheduleRescanEnd`, `cancelRescanTimer` and the `disconnectedCallback` they needed.
  - **Contract.** The host delivers the new report before, or in the same update as, clearing `rescanning`. When the flag clears in the same update or after the report, the end line is decided against the report captured at the rising edge.
  - **Flag cleared first.** If a host clears the flag before delivering the report, the screen announces "Rescan complete: no changes", then the real line when the report lands. This is documented and tested.
  - **Gate gap.** The no-io gate gains a rule that bans `setTimeout` and `setInterval` (any argument form) in screen and parts source, with a plant.
