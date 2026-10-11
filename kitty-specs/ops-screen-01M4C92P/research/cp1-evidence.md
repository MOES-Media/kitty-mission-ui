# WP03 evidence packet: spikes S-O1..S-O4 for CP-1 (mission ops-screen-01M4C92P)

Committed copy for CP-1 (2026-10-11). The reviewer corrections of 2026-10-11 are applied inline and listed at the end; where the body and a correction conflicted, the correction won. The image binaries, `run.mjs` and the raw `measurements-*.json` are NOT committed: they stay in `<evidence>` (the uncommitted evidence folder) and are named here as uncommitted evidence. Paths: `<prototype>` is the prototype checkout, `<repo>` this repository.

All numbers were taken in the pinned Playwright container (chromium, dark scheme, DPR 1, reduced motion) against the Storybook build that holds the throwaway spike stories, and against a copy of the prototype page. Measurement driver: `run.mjs` and raw output `measurements-*.json`, images `*.png`, all in this uncommitted folder (`<evidence>`). Nothing in `<evidence>` is committed. Fonts: the prototype imports a web mono font from the network, which is unavailable; both prototype and project fall back to the same system mono, so mono widths are comparable but are not the real face.

Not measured: real JetBrains Mono metrics; tier boundary attribute timing to the pixel (the shell `tier` attribute was read straight after each 1 px resize with no settling wait; corrected: the expanded tier begins at 1100, the shell `min-width: 1100px`, not 1130, and the 1100-1129 sweep reads are stale); the S-O4 "before fallback" activeElement at the error-notice step (only the after-fallback value was recorded; the "control replaced by nothing" step shows the pre-fallback value, `body`).

## Cross-cutting finding (affects S-O1 and the exceptions list)

The row cannot be a plain-`li` construction with the current Stylelint allowlist even if E-40..E-43 are approved as written. Verbatim probe below: `border`, `border-radius`, `background`, `margin-bottom`, `font-size`, `line-height`, `font-family`, `font-weight`, `font-variant-numeric`, `color`, `overflow-wrap`, `text-overflow`, `white-space` are all refused outside an exception, and `border: ... solid ...` is refused twice (property and the literal `solid`). E-40 as written grants `border`, `border-radius`, `padding`; it does not grant `background`, nor typography. The prototype row typography (body 14 px / line-height 1.5, mono face on id, values and times, bold id, muted terms) needs `font-size`, `line-height`, `font-family`, `font-weight`, `font-variant-numeric`, `color`. Without those, a plain li renders at 16 px with `line-height: normal` and shows the row 0.4 px to 1 px different per row (spike (c) vs (d) below) and in the wrong face. Also: there is no line-height token (`--sk-leading-*` absent in the tokens), so `line-height: 1.5` is a literal that strict-value refuses even where `line-height` is granted. This needs a decision at CP-1; it is a proposed grant for the orchestrator, not self-authorised.

## S-O1 Row frame and facts

Question: which construction reproduces `article.collection-row.invocation-row`?
Method: shell + `flush`, 1280x1100, content-narrow wrapper (24 px padding, 900 px cap), six prototype rows, the prototype page beside it. Constructions: (a) plain `li` + library facts classes (`sk-facts sk-facts--two-col sk-facts--compact`, library sheet adopted); (b) library `sk-card inset` + the same facts; (c) plain `li` + project grid (prototype tracks), no typography; (d) = (c) + prototype body typography (font-size text-sm, line-height 1.5). Pill = `sk-pill-tag status=success|danger` (the Missions precedent), not the prototype `.badge`.

Measurements (first row; `measurements-s1.json`):

| | prototype | (a) li + lib facts | (b) sk-card inset | (c) li + grid | (d) li + grid + typography |
|---|---|---|---|---|---|
| row border | 1px, radius 12px | 1px, 12px | 2px, 16px | 1px, 12px | 1px, 12px |
| row padding | 16px | 16px | 32px | 16px | 16px |
| row background | rgb(24,26,31) | same | rgb(28,31,37) (inset surface) | same | same |
| row heights (6) | 210.39 210.39 271.39 210.39 250.39 250.39 | 222 x6 | 256 x6 | 210 210 272 210 251 251 | 210 210 272 210 251 251 |
| gap between rows | 8 | 8 | 8 | 8 | 8 |
| id font | 14px/21px mono bold | 16px/normal | 16px/normal | 16px/normal | 14px/21px |
| term font | 14px/21px sans 400 | 14px/normal 500 | 14px/normal 500 | 16px/normal 400 | 14px/21px |
| value font | 14px/21px mono | 16px/normal sans | 16px/normal sans | 16px mono | 14px/21px mono |
| facts grid | 2 cols 421+421, col gap 24; pair cols 112.47 + 296.53, gap 12, padding-block 12 | one dl, 2 tracks `73px 785px` (term, value), row gap 4: ONE column of 6 facts | same, `73px 751px` | 2 cols 421+421, gap 24; pairs 112.47 + 296.53 | identical to prototype (421/421/24; 112.47/296.53/12/12) |
| pill (done) | 42x24.39, mono 12px, 1px border | 52x26, sans 12px, no border | 52x26 | 52x26 | 52x26 |

Images read (all uncommitted, in `<evidence>`): `s1-sbs-a.png`, `s1-sbs-b.png`, `s1-sbs-c.png`, `s1-sbs-d.png` (prototype above, spike below, magenta separator), `s1-prototype-page.png`, `s1-c-page.png`.
- (a): rows are single-column stacks of Term/Value pairs, tighter, no dividers, no two-column grid; the 512-character-style evidence token in row 3 runs off the right edge of the row (clipped at the viewport of the row), because the library `dd` does not wrap. Visibly different from the prototype.
- (b): same single-column stack inside a 32 px padded, 2 px bordered, lighter card (rows 256 px, 46 px taller than the prototype); evidence token overflows the card. Visibly different, and the card padding and border are not adjustable (no part-free token).
- (c)/(d): same two-column grid, term/value tracks, dividers (1 px lines under all but the last pair), same row border and radius. (c) text is 16 px so rows differ by up to 1 px and the glyphs are larger; (d) matches the prototype's term/value/id geometry exactly (112.47/296.53 pair tracks, 421/421 columns, 14px/21px). Remaining differences in (d): (i) the pill: `sk-pill-tag` is 52x26, sans, borderless, versus the prototype's 42x24.39 mono outlined pill (the Missions screen already ships `sk-pill-tag`; this is a library-vs-prototype pill difference, not a construction difference); (ii) the prototype `dl` is 2 px taller per row (140 vs 138) because its date values are an inline mono `time` inside a sans `dd` (the line box grows to 23 px); the spike put the mono class on the `dd` itself; the real build should reproduce the `dd > time.mono` shape or accept the 2 px; (iii) row heights 210/272/251 vs 210.39/271.39/250.39 (<= 1.6 px, from the pill height).

Accessibility trees (text, `ariaSnapshot` of the first row): prototype, (a), (b), (c), (d) are the same except that the prototype exposes `time` elements inside the Started/Completed definitions (the spike did not use `time`):

```
- article|listitem:
  - strong: 01M0MCVYB7BT7MQZ0MBK9FW63Q
  - text: done
  - term: Profile
  - definition: reviewer-renata
  - term: Action
  - definition: audit
  - term: Actor
  - definition: operator
  - term: Started
  - definition: [prototype: time: 22 Aug 2026, 09:29:46 UTC]
  - term: Completed
  - definition: [prototype: time: 22 Aug 2026, 09:49:22 UTC]
  - term: Evidence
  - definition: Not recorded
```

Stylelint probe (verbatim, `stylelint --stdin --stdin-filename` with the future `ops-row-parts.ts` path under the unmodified base config; input is the css-in-lit file `probe-input.ts`):
```

packages/mission-ui/src/elements/sk-ops-screen/ops-row-parts.ts
   8:5   ✖  Use var(--sk-*), 0, auto, inherit, currentColor or transparent (solid is a literal).  scale-unlimited/declaration-strict-value
   8:5   ✖  Unexpected property "border"                                                          property-allowed-list
   9:5   ✖  Unexpected property "border-radius"                                                   property-allowed-list
  10:5   ✖  Unexpected property "background"                                                      property-allowed-list
  17:5   ✖  Unexpected property "margin-bottom"                                                   property-allowed-list
  26:37  ✖  Unexpected unit "px"                                                                  unit-allowed-list
  31:5   ✖  Unexpected property "font-size"                                                       property-allowed-list
  32:5   ✖  Use var(--sk-*), 0, auto, inherit, currentColor or transparent (1.5 is a literal).    scale-unlimited/declaration-strict-value
  32:5   ✖  Unexpected property "line-height"                                                     property-allowed-list
  35:5   ✖  Unexpected property "font-size"                                                       property-allowed-list
  38:5   ✖  Unexpected property "overflow-wrap"                                                   property-allowed-list
  42:5   ✖  Unexpected property "text-overflow"                                                   property-allowed-list
  43:5   ✖  Unexpected property "white-space"                                                     property-allowed-list

✖ 13 problems (13 errors, 0 warnings)
  2 errors potentially fixable with the "--fix" option.

exit=2
```
Second probe (alternatives for the 80 px track and margins), verbatim:
```

packages/mission-ui/src/elements/sk-ops-screen/ops-row-parts.ts
   8:36  ✖  Unexpected unit "rem"                   unit-allowed-list
  14:5   ✖  Unexpected property "margin-block-end"  property-allowed-list

✖ 2 problems (2 errors, 0 warnings)

exit=2
```
Reading: probe 2 reports no problem for the `.a` rule (lines 4-5 of its input), i.e. none for `calc(var(--sk-space-10) + var(--sk-space-4))` (= 64 + 16 = 80 px, exactly the prototype's term minimum); only the `5rem` form is refused (unit). So `minmax(calc(var(--sk-space-10) + var(--sk-space-4)), .55fr)` passes the unmodified config: E-41 is not needed. `margin-block: 0 var(--sk-space-3)` passes; `margin-bottom` and `margin-block-end` do not. `container-type`/`container-name` pass.

Recommendation S-O1 / CP-1 questions 1 and 2 (the operator rules):
- Construction: (c)/(d), a plain `li` in a `ul` with a project grid; neither the library facts element (one column, no dividers, does not wrap the evidence) nor `sk-card` (2 px border, 32 px padding, lighter inset surface, non-adjustable) reproduces the row, and neither avoids a residue that needs CSS. This confirms DO-22/DO-24 as "the same look built by the project grid; the library facts and card differ and the register records that" (as #7 DA-34).
- E-40: needed, but widened or re-scoped: it must grant `background` and the border style keyword (or `border-width`/`border-style`/`border-color` are not in any allowlist either), plus `border-radius`; and the typography declarations in the cross-cutting finding (`font-size`, `line-height` with a literal 1.5, `font-family`, `font-weight`, `font-variant-numeric`, `color`) have no exception at all. Propose to the operator, token-only and file-scoped to `ops-row-parts.ts`, either (1) widen E-40 to the row paint above and add one typography grant, or (2) accept row text at the shell's inherited 16 px sans with no mono (drift). I recommend (1); the `line-height: 1.5` literal needs a decision (grant a literal, ask the design library for a leading token, or accept `normal`: (c) with `normal` is within 1 px per row).
- E-41: delete. The calc-of-tokens track passes the unmodified config.

## S-O2 Tier thresholds

Question: container thresholds that match the prototype's 800 and 620 px viewport breakpoints; is `ShellTierController` needed?
Method: every viewport width from 380 to 1300 (921 widths, 1 px steps, height 900) measured in the browser for the prototype (`.content-narrow` width, computed facts columns, head flex direction) and for the project shell (flush) with the (c) row (container = the 900-capped cell; content-box width), `measurements-s2.json`.

Results:
- Prototype: facts one column iff viewport <= 800 (switch at 801); head stacked iff viewport <= 620 (switch at 621); content padding 16 up to 813, 24 from 814 (sidebar stacking at 1100 changes widths but not these switches).
- Project shell: tier `mobile` up to 719, `collapsed` 720..1099, `expanded` from 1100 (corrected from 1130; the shell `min-width: 1100px`; the 1100-1129 reads in the sweep are stale); content padding 16 in mobile and 24 otherwise; cell width = viewport - 32 in mobile, viewport - 104 in collapsed (rail 56 + padding 48), then capped at 900.
- Cell width at the prototype's breakpoints: viewport 800 -> 696 px, 801 -> 697, 620 -> 588, 621 -> 589, 390 -> 358.
- Feasibility computed over all 921 widths: facts one column needs a container threshold T with 696 <= T < 697; head stack needs 588 <= T < 589. Both feasible, so the thresholds are `max-width: 696px` (facts) and `max-width: 588px` (head and section heading).
- Verification: injected `@container cell (max-width: 696px)` (facts 1fr) and `(max-width: 588px)` (head column), compared against the prototype at every width 380..1300: 0 mismatches over 921 widths. Negative controls: 697/589 -> 2 mismatches when settled (two animation frames after each resize; the original 72 came from reading the shell tier with no wait); 696/589 -> 1 mismatch (621); 697/588 -> 1 mismatch (801).
- The 620 px head stack lies inside the shell's mobile tier (<= 719), so a pure container query reproduces it; `ShellTierController` / `:state(shell-mobile)` is not needed for this screen.
- Caveat: the thresholds are exact only for the present shell chrome (rail 56, padding 24/16, mobile at 720). They are in px literals in a container query; `unit-allowed-list` allows px only via an exception (probe 1 line 26 shows `px` refused in `grid-template-columns`; `@container ... (max-width: 700px)` was NOT flagged in probe 1: no report on line 45), so media/container conditions pass as written. Re-derive if the shell changes.

Recommendation (CP-1 question 4): use two container queries on a wrapper (not the host) at 696 px and 588 px; no controller; record the dependency on the shell widths in the plan.

## S-O3 Wrapping

Question: which rule keeps the row inside its width and the 512 characters readable?
Method: 15 rows (5 contents x head / pill / fact value) per rule; contents: 26-character id, 128-character unbroken profile, 69-character hyphenated action, 512-character unbroken token, 512-character prose. Rules: (a) `overflow-wrap: anywhere`; (b) shared ellipsis rule (overflow hidden, ellipsis, nowrap, pill part likewise); (c) hybrid per FR-020 (id and evidence wrap anywhere; every other long value and every pill ellipsize). Viewports 1280, 800, 390 with the S-O2 container rules applied; `measurements-s3.json`; images `s3-{a,b,c}-{1280,800,390}.png`, `s3-fix-*-390.png`.

Results:
- (a) anywhere: text wraps in head and fact (512 characters: 7..9 lines in the head, 11..24 in a fact; 15..24 at 390), but the library pill does not wrap (its `::part(tag)` keeps nowrap): a long pill pushes the row (row scrollWidth over by 35 to 3291 px) and the shell content area scrolls horizontally by 2678 px (1280), 2928 (800), 3262 (390). `sk-pill-tag` text of 128 characters sits outside the row at 1280 (`s3-a-1280.png`); the head id collapses to one character per line beside it. FAIL.
- (b) ellipsis everywhere: no row overflow at 1280 and 800, but 10 to 11 of the 15 rows truncate, including both 512-character evidence rows (clipped by 3253 and 3799 px): evidence is not readable in full. At 390 the head with `align-items: flex-start` (stacked) lets the nowrap `strong` run out of the row (shell scroll 3739). FAIL for evidence.
- (c) hybrid: 1280 and 800: 0 offenders, shell overflow 0; evidence token 7 lines (1280) and 9 (800) in the head, 16 and 22 in a fact; evidence prose 5 and 8 lines in the head, 16 and 24 in a fact; all 512 characters visible; id26 never truncates at 1280 and 800; the 128-character profile, long action and every long pill ellipsize (`title` carries the full text). At 390 with the stacked head: 2 head rows (128-character profile, long action) overflow because a flex-column `strong` with `align-items: flex-start` does not shrink (shell scroll 667). Fix tested at 390: `align-items: stretch` on the stacked head (a layout property that passes the unmodified Stylelint) gives shell overflow 0 and 0 offenders, pill width unchanged (52 px); `max-width: 100%` on the `strong` also works but is refused by Stylelint (probe 3: `100%` literal, `max-inline-size` not allowed).
- The id (26 characters, mono) fits unwrapped at all three widths (1 line at 1280/800; wraps to 4 lines inside a 358 px fact value at 390 only when placed in a value).

Probe 3 (verbatim), exceptions for these declarations:
```

packages/mission-ui/src/elements/sk-ops-screen/ops-row-parts.ts
   4:8  ✖  Use var(--sk-*), 0, auto, inherit, currentColor or transparent (100% is a literal).  scale-unlimited/declaration-strict-value
   5:8  ✖  Unexpected property "max-inline-size"                                                property-allowed-list
   8:8  ✖  Unexpected property "font-family"                                                    property-allowed-list
   9:8  ✖  Unexpected property "font-variant-numeric"                                           property-allowed-list
  10:8  ✖  Unexpected property "font-weight"                                                    property-allowed-list
  11:8  ✖  Unexpected property "color"                                                          property-allowed-list

✖ 6 problems (6 errors, 0 warnings)
  1 error potentially fixable with the "--fix" option.

exit=2
```
Image reads: `s3-a-1280.png` (shell with row 5 showing a vertical 1-character-per-line id and a pill sticking out of the row's right edge, rows 1-4 fine), `s3-fix-stretch-390.png` (390 px: stacked head, id on its own line, pill below, 128-character profile ellipsized with an ellipsis, long pill ellipsized inside the row, no horizontal scroll). The `maxwidth` variant image `s3-fix-maxwidth-390.png` looks the same.

Hybrid accessibility tree at 390 (evidence token placed in the head; the pill/fact tree is in `measurements-s3.json`): the `strong` holds the full 512 characters as text; nothing is lost for assistive technology under any rule.

Recommendation (CP-1 question 3): adopt rule (c): E-43 as written is needed (`overflow-wrap: anywhere` on the id and the evidence value, which are the unbroken tokens); E-42 is needed too, extended to `text-overflow` and `white-space` (plus `overflow-wrap`, which is E-21; probe 3 and probe 1 show `overflow` passes the unmodified config and needs no grant, while `text-overflow`, `white-space` and `overflow-wrap` do not), for the head `strong` when it is not an id, fact values and the pill part (the shared pill rule is the Work Package screen's E-21 one). The head `strong` as the id needs only E-43 (wrap), not the ellipsis. Add `align-items: stretch` to the stacked head (no exception). Wrapping alone (a) is refused; ellipsis alone (b) is refused.

## S-O4 Focus across paging

Question: what is `document.activeElement` at each step, does `sk-button busy` keep focus, is the heading fallback exercised?
Method: (a) the real Missions screen (`sk-missions-screen`, requestedCursor memo, busy toggle, `aria-busy` on the `li`), properties changed from script after focusing Load more; (b) a harness with the same Load more markup plus a load-more error notice, the "nothing" case and a D-09 fallback (`activeElement === body` after the step -> focus the `h2[tabindex=-1]`). Deep active element (through shadow roots) read immediately and after two animation frames; the two readings agree at every step. Raw: `measurements-s4.json`; image `s4-harness.png`.

(a) real Missions screen:
1. Load more focused: `sk-missions-screen > sk-button[Load more Missions] > button`.
2. `loadingMore=true` (li `aria-busy=true`, button `busy` attribute set): focus stays on the same inner `button`; the inner button is NOT disabled (`disabled=false`, no `aria-disabled`, no `aria-busy`).
3. Page arrived (`missions` replaced by a longer list, busy off, next page still present): focus stays on the same button.
4. Last page (`pageInfo.hasNextPage=false`; control removed): `document.activeElement` is `body`.
5-7. Enter on the focused Load more: `sk-load-more` emitted once (cursor `cGFnZS0y`), focus stays; host sets `loadingMore`: stays; page arrives: stays.

(b) harness:
1. focused: `sk-button#more > button`. 2. busy on: same, not disabled. 3. items replaced and busy off: same.
4. control replaced by the error notice: D-09 fallback ran and moved focus to `h2#sec` (before-fallback value not recorded separately; step 6 shows the mechanism: the focused control removed leaves `body`).
5. control restored and focused. 6. control replaced by nothing: `body`. 7. after the fallback: `h2#sec`.
Accessibility tree of the harness section after step 7:
```
- heading "Newest records" [level=2]
- list:
  - listitem: row 1 ... row 6
```
Findings: `sk-button busy` keeps focus across the busy toggle and the page arrival (focus is never lost while the control remains); focus is lost to `body` exactly when the control is removed (last page, replaced by the error notice), so the D-09 heading fallback is exercised in those two cases and in no other.

Recommendation (D-09): confirm as planned: focus capture needs to handle only control removal; do not re-focus the button on busy toggles; the fallback target `h2[tabindex=-1]` works (focus lands on it and is visible to the a11y tree). Note: the `busy` button is still focusable and activatable (not disabled), so the `requestedCursor` memo (one emit per cursor) is what prevents double requests; keep it.

## CP-1 question 5: bidirectional-control notice for evidence

The spikes did not render a bidirectional override; no measurement taken. Recommendation from the plan alone: D-11 isolates every value in a `bdi`; a notice would be visible chrome the prototype does not have; recommend NOT adding #7's notice, and leaving the story corpus (`opsEvidenceBidi`) to prove reordering cannot leak out of the `bdi`. This is judgement, not evidence.

## Open CP-1 concern: opsEmptyText order (profile > skipped > plain)

What the prototype shows: the empty state (`07-ops.html?state=empty`) is only "No invocation records" with "No local `kitty-ops/*.jsonl` records are available for this project." There is no profile filter, no skipped count, no skipped note and no Load more anywhere in `07-ops.html`, `prototype.js` or the states page (searched for "skipped"; zero hits). So the prototype is silent: neither confirms nor contradicts the order.
Recommendation: do not let one branch hide the other. A profile-filtered empty page with `skippedCount > 0` should show the profile sentence AND the skipped sentence (FR-024 says the note appears "in the empty state" too; OP-20 names the count). Keep the precedence only for the headline and compose the body: headline per profile > plain, then the skipped note appended whenever `skippedCount > 0`. Because CG-8 says `skippedCount` is not profile-filtered, word it "in this project" (already the rule). This is a recommendation; the operator rules.

## Reviewer corrections (independent re-measurement, 2026-10-11)
- The 697/589 control gives 2 mismatches when settled (two animation frames after each resize), not 72; the 72 came from reading the shell tier with no wait.
- The expanded tier begins at 1100 (shell `min-width: 1100px`), not 1130. The 1100–1129 sweep data is stale reads; the 696/588 conclusion stands (0 mismatches over 921 widths, every single-px control mismatches only at its boundary).
- Probe 1: the `@container` rule is on line 45, not 44.
- E-42: `overflow` passes the unmodified config; the grant needs only `text-overflow` and `white-space` (`overflow-wrap` is E-21).
- Operator calls flagged by the reviewer: container queries on a wrapper (D-10 says host); E-41 deletion via `calc(var(--sk-space-10) + var(--sk-space-4))`; grants beyond E-40 (`background`, `solid`, typography, `line-height: 1.5` literal); the pill (`sk-pill-tag` vs the prototype's mono outlined badge); the opsEmptyText composition.
