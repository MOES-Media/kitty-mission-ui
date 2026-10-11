# Tracer: design decisions, Ops screen (mission-ui#11)

## Operator rulings, 2026-10-08 (specify phase)

- OQ-1 (a): Mission, Work Package and Mode facts shown when present, unlinked, hidden when null (drift DO-11).
- OQ-2 (a): no filter control; the host's `profile` is one quiet mono fact. No `sk-clear-profile`, no `sk-filter-ops`.
- OQ-3 (a): evidence null "Not recorded" (closed) / "Not recorded yet" (open); actor null "Not shown".
- OQ-4 (a): `done` success, `failed` danger, `abandoned` attention, `open` neutral; swept Op shows "Closed by: sweep".
- OQ-5 (a): badge "{loaded} of {total}".
- OQ-6 (a): host-neutral copy, no path or file format.
- OQ-7 (a): the word "changed" with an accessible description.
- OQ-8 (a), ruled by the orchestrator: exact string equality on `profile` (reference reader `op.profile == profile`; `OpsProfile` is a case-sensitive id).
- OQ-9: exact UTC, served string in `datetime`; no `now` property.
- OQ-10 (a): the V2 prototype pages are current.

## Orchestrator decisions (mechanical)

- Exceptions E-40..E-43 (Projects E-31..E-34, Drift E-35..E-39).
- `sk-retry-load` target `ops-page` (taken elsewhere: `work-package`, `detail`, #7's artifact targets, `project`, `projects`, `folders`, `drift-report`).
- Contract re-vendored once, first, by Projects after spec-kitty#5881; no stacked branches; implementation starts from `main`.
- `src/retry-types.ts` arrives with #7; extend the union wherever `main` holds it at branch start, recorded in plan.md.

## Contract-text notes for spec-kitty#5528 (orchestrator raises; not acted on here)

- Issue wording of `actor` nullability is stale.
- The code of the 400 for a bad `profile` is not stated by the contract.

## Operator: start now, stacked on #9's re-vendor (2026-10-10)

- **Operator ruling:** #11 starts now, stacked on #9's contract re-vendor, the same way as #10. It does not wait for #9 to land on `main` (plan Build base).
  - #9's re-vendor commit is cherry-picked onto `feat/ops-screen-11` as 0a1e4bd (`-x`, from #9's 521573e). It vendors spec-kitty `805e122df79e862571839715d023920904891851` with `provenance: main`, and holds every Ops path, schema and example.
  - #11 does not re-vendor.
  - WP01's stop-check reads "the re-vendor commit on `main`" as this commit until #9 lands.
- **Landing:** #11's PR lands after #9's. The project moved to the public repo MOES-Media/kitty-mission-ui, and #11 is ported there with the scrubbed-history rules before its PR opens.
  - The retry union and the contract registry/overlays are append-only.
  - The second mission to land merges `main` in and takes #9's shapes. The #10 tracer records the exact retry-union resolution.
  - CI timeouts take the larger value per job.

## CP-1 confirmed (2026-10-11)

Operator rulings on the WP03 evidence packet (spikes S-O1 to S-O4, the bidirectional question and the empty-text order). The exact values are in `research/cp1-evidence.md`, which is binding for every value cited here (its reviewer corrections override its body). Every grant is narrow, pinned to its file, token-only except the named literal, and leak-tested against every sibling part file. A WP that cannot match the prototype within these grants reports the gap; it does not widen a grant.

**Exceptions**
- **E-40 widened: the row frame and the row typography.** In `ops-row-parts.ts`, pinned to its selectors:
  - frame: `border` (token width plus the `solid` keyword), `border-radius`, `padding`, `background`;
  - typography: `font-size`, `font-family`, `font-weight`, `font-variant-numeric`, `color`;
  - every value is a token, except one pinned literal, `line-height: 1.5`, because no line-height token exists.
  - Sunset: a spec-kitty-design record-row element (and a leading token).
  - Row construction (S-O1 option d): a plain `li` in a `ul` with the project grid. `sk-card` and the library facts element are not used for the row (one column, no dividers, no evidence wrap; 2 px border, 32 px padding, lighter surface).
- **Status badge: narrow grant to match the prototype.** Folded into E-40 as a second clause. The badge keeps the `sk-pill-tag` element. A pinned token-only grant adds the outline border and the mono font, scoped by a data attribute to the Ops badge only and leak-tested against the sibling parts (the pill in the head, the profile fact and every other pill). Precedent: #10's G-4 "outlined mono pill". The pill is therefore matched by grant and is NOT a drift item.
- **E-41 deleted.** The number stays unused. The term minimum is `minmax(calc(var(--sk-space-10) + var(--sk-space-4)), .55fr)`, exactly 80 px, and it passes the unmodified Stylelint config (only the `5rem` form is refused). `margin-block: 0 var(--sk-space-3)` passes; `margin-bottom` does not.
- **E-42 narrowed:** `text-overflow` and `white-space` keyword values, plus `overflow-wrap` as in E-21, in `ops-row-parts.ts` and `ops-page-parts.ts`. `overflow` needs no grant.
- **E-43 approved:** `overflow-wrap: anywhere` on the id and the evidence value only. Every other text, every pill included, uses the ellipsis triplet (full text in `title`). At 390 px the stacked head uses `align-items: stretch` (no exception).

**opsEmptyText.** The headline is profile > plain. Whenever `skippedCount > 0`, the skipped note is appended, in the "in this project" wording, so the count is never hidden (FR-024, OP-20; CG-8 stands: the count is not profile-filtered). The old order profile > skipped > plain is dropped; `contracts/sk-ops-screen.md` and the spec are amended.

**Thresholds (S-O2).** Container queries at 696 px (facts become one column) and 588 px (the head and the section heading stack): 0 mismatches against the prototype over 921 widths, and each single-pixel control mismatches only at its boundary. No `ShellTierController`. The thresholds are exact only for the current shell chrome (rail 56, padding 24/16, mobile tier up to 719, expanded tier from 1100); re-derive them if the shell changes. The container is on a wrapper inside the screen rather than on the host, as an orchestrator ruling; D-10's wording is amended.

**Focus (S-O4).** D-09 confirmed. `sk-button busy` keeps focus (the inner button is not disabled), and focus is lost only when the control is removed (last page, or replaced by the error notice). The section-heading fallback (`h2[tabindex=-1]`) applies only when the control is removed. The `requestedCursor` memo stays: a busy button is still activatable.

**Bidi notice:** not added. D-11's `bdi` isolation stands, and the `opsEvidenceBidi` story proves reordering cannot leak out. This is a judgement, not a measurement.

**CP-1 copy decisions** (from the WP01/WP02 records, confirmed as ruled):
- "1 record" is singular; the announcements are "1 of 1 record loaded" and "1 more record loaded".
- `quietCompletedClosed` = "Not recorded", and an unknown status falls back to the same.
- The closer `agent` is not drawn; an unknown closer is drawn raw under "Closed by".
- Only `ops_unreadable` maps to `errorBody`; every other refusal gets the generic text.
- `announceLoading` is "Loading invocation records"; the load-more retry is "Try again"; the empty-look announcement is the empty heading.

**Register:** DO-1 to DO-24 confirmed as CP-1 leaves it. DO-13, DO-22 and DO-24 text is updated (DO-13: id and evidence wrap anywhere, E-43; DO-22: the same look built by the project grid, the library facts element differs, as #7 DA-34; DO-24: plain `li` rows with the project grid, no card, E-40 widened). The pill is matched by grant, so it is not a drift item.

**Not measured:** the real mono face (both sides fell back to the same system mono); WebKit; the Desktop webview.

## Fidelity grants at WP05 and WP06 (2026-10-11)

These are applied under the operator's standing preference: narrow, pinned, token-only grants that match the prototype; only broad or accessibility-affecting grants go to the operator. They extend E-40 and are pinned in `stylelint.config.mjs`, with leak plants. Their selectors are pinned in `ops-part-selectors.test.ts`.

- **G-1, facts dividers (DO-24).** `border-block-end` takes a token width, `solid` and a token colour, on the fact rows in `ops-row-parts.ts`; the last row resets to `0`. A four-sided `border` cannot draw a one-sided divider.
- **G-2, badge line height.** `line-height: 1.2` is pinned and scoped to `[data-ops-badge]`. It follows #10's G-4 (outlined mono pill, `line-height: 1.2`) and closes the 0.39 px head residual.
- **G-3, the page badges.** The "Read only" and count pills in `ops-page-parts.ts` take the same outlined mono badge clause as the row badge, aligned to the end of the heading as in the prototype. This is the E-40 badge clause, extended to that file for those two selectors only.

## Operator ruling: the project property (2026-10-11)

FR-003 and DO-17 require the muted project line, which the shell supplies and which is never a literal. The surface frozen at WP04 (eleven properties, no slots) could not receive it.

**Operator ruling:** add `project: Project | null` to `sk-ops-screen`, contract-shaped as on the Missions screen, and render `project.name` as the header's supporting line. The surface is re-frozen at twelve properties. The surface-freeze test, `custom-elements.json` and the stories carry it. When `project` is null, no line is drawn: this is a paired test.

The change lands in the WP06 fix round, as a recorded out-of-map edit to WP04's files.

## Fidelity grants and register at WP07 (2026-10-11)

These are applied under the operator's standing preference: narrow, pinned, token-only grants that match the prototype.

- **G-4, the state panel card.** In `ops-state-parts.ts`, the empty, loading and error panel takes the prototype's card:
  - `border`: a token width, the keyword `dashed` (empty) or `solid` (loading and error), and a token colour;
  - `border-radius`: a token;
  - `background`: a token.
  The grant is pinned to the state panel selector, confined by a check in `ops-part-selectors.test.ts`, and has a leak plant.
- **G-5, E-42 extended to `ops-state-parts.ts`.** The `overflow-wrap` keyword, so that a long profile in the empty look wraps instead of being clipped. E-42's other keywords are not extended.
- **DO-25, the "Try again" control in the error look.** The spec requires it (OP-23); the prototype has none. This is confirmed drift, a spec-mandated addition.
- **The copy key `emptySkipped`** and its `emptySkippedText` are dead since the CP-1 empty-text change. They are removed in the WP07 fix round, as an out-of-map edit to WP02's file.
- **The class allowance for `sk-empty-state` and `sk-progress`** in `eslint.config.mjs` (the E-03 precedent; the library has no element for either) is accepted.

## Rulings at the WP07 review (2026-10-11)

- **G-4 narrowed.** The card is drawn on the empty look (dashed border) and the loading look (solid border) only. The error look's panel is the danger notice itself, as in the prototype, so a card around it would draw a double frame.
- **G-6, the empty-look typography.** This is a narrow, pinned grant in `ops-state-parts.ts` that matches the prototype's `.empty-state`:
  - a heading weight token (700);
  - no gap between the heading and the body;
  - a body `line-height: 1.5`, the one pinned literal, as in E-40.
  It is confined to the empty-state heading and body selectors, with a leak plant.
- **OP-36 and OP-22** look identical, because the loading look does not draw the profile. This is accepted as a duplicate baseline, following the AV-25a/AV-26a precedent on #7.
- **The dead focus guard** in `sk-ops-screen.ts` (the `document.activeElement` line inside the shadow root) is removed. The `isConnected` guard is pinned by a test.
- **G-6 extended to the loading look (2026-10-11, at the WP07 fix round).** The loading body takes the same pinned `line-height: 1.5`. That closes the 29 px against 33 px label-to-body distance measured against the prototype's `.state-loading`. It is confined to the loading body selector, with a leak plant.
- **G-6, line height moved to the card (2026-10-11, at the WP07 re-review).** The prototype sets no line height on the state panels: every line inside inherits the page's 1.5. So the pinned `line-height: 1.5` goes on the state card itself, for both the empty and the loading look, instead of on individual bodies. The heading, the body and the loading label then inherit it. That closes the remaining residuals: the empty heading at 21 px against 23, and the loading label at 17 px against 21. It is one selector per look, confined and leak-planted.
- **G-6, the empty heading keeps the prototype's 1.3 (2026-10-11).** The prototype's `h2` keeps its own `line-height: 1.3` (18 × 1.3 = 23.4 px). The card-level 1.5 therefore leaves the empty card at 146 px against 142.4. Add the pinned `line-height: 1.3` on the empty-state heading only, as #10's G-6 (the detail title at 1.3) did, confined and leak-planted.

## Storybook review (2026-10-11)

The operator reviewed the 36 Ops stories at the lane-i tip `aecce41` and approved them as they stand. The page header keeps the library `sk-page-header` look under DO-17, the same header as Missions. No change was requested.

## Operator rulings on the pre-merge squad (2026-10-11)

- **BOUNDARY-001, the bare-word gate against #7's markdown code: option (b).** The Ops data-driven selectors get their own config block, which ignores `packages/mission-ui/src/logic/markdown/**`.
  - The word `text` stays in the Ops list.
  - #7's code is not changed.
  - A self-test proves both halves: `text` used in an Ops file is still refused, and `logic/markdown/` is not scanned by the Ops block.
- **A11Y-001, 200% text: rem breakpoints plus wrapping.**
  - The container thresholds become `43.5rem` and `36.75rem`, identical to 696/588 px at 16 px.
  - Fact values (timestamps, ids, the "Work Package" term) wrap instead of ellipsizing, so nothing is hidden at any text size. E-42's ellipsis no longer applies to fact values.
  - Status badges never shrink.
  - The look at normal text size is unchanged.
  - The 200% test measures truncation at 1280, 800, 620 and 390 px.
- **A11Y-003, Load more: announce it.** "Loading more records" is announced once in the polite region when Load more starts, with the copy in `defaults/`. "N more records loaded" follows when the page arrives.
- **CONTRACT-003, header copy: drop "local".** The header line reads "<project> · invocation records", host-neutral as DO-3 requires. The header baselines are regenerated.
- **Orchestrator rulings on the remaining forks:**
  - **A11Y-005 and CONTRACT-007:** focus after a load-more error goes to the section heading. That is D-09 as confirmed at CP-1. FR-034's "or its replacement" wording is amended.
  - **TESTS-004:** refusal copy stays generic for every code except `ops_unreadable`, as CP-1 ruled. FR-027's "its own sentence" is amended, and the lookup table stays injectable.
  - **TESTS-005:** fold all three catalogue tests (Ops, Work Package and visual-tags) into `test:scripts`.
- **Ops G-7 (pre-merge fix round 2, under the standing preference).** `max-width: 100%`, the keyword only, applies to `sk-pill-tag[data-ops-badge]` in `ops-row-parts.ts`. With it, a status badge keeps its natural width and ellipsizes a host word wider than the row instead of overflowing. It is confined by selector pin (g) and leak-planted.
