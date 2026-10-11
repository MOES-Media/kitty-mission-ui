# ui#10 pre-merge squad: confirmed findings and the acceptance bar for the fix round (2026-10-11)

**Sources.** The R1 files (`r1-*.md`) and the R2 merge (`r2-merged.md`) list 39 findings. The R3 refuter verdicts (`r3-refute-1..5.md`) confirm 37 and refute 2: CONTRACT-009, the perf median, which is documented and matches its sibling; and BOUNDARY-011, the callback the tracer prescribes. The operator's rulings on the forks are in the tracer, under "Operator rulings on the pre-merge squad forks (2026-10-11)". This file outranks any paraphrase of it. Where the refuter corrected a remedy, its corrected remedy is the bar.

## Fixed at the port, not in this round
These depend on the public main, or on #7 landing.
- **BOUNDARY-002:** the retry types follow #7 (operator ruling).
- **BOUNDARY-003:** the CI visual timeouts are re-derived from the merged baseline count.
- **BOUNDARY-009:** the bulk channel is folded on the second landing.

## Fixed after the design-library issues are filed
- **BOUNDARY-005:** each grant comment cites its issue (operator ruling).

## Fix in this round (lane-h)
### Behaviour
1. **CONTRACT-002 (sev3).** A scoped scan that receives a report holding another Mission's finding, or a ready look with `report` null, announces nothing (operator ruling).
   - Test: a paired, red-first test, with a positive control.
2. **CONTRACT-001 (sev3).** Normalise a non-string or empty `scannedAt` to null in `announcementInput`, so that no "last scan undefined" and no "last scan " text is ever produced.
   - Test: a red-first loading-to-ready test.
3. **A11Y-004 and A11Y-003 (operator ruling).** The busy state moves.
   - **Busy:** `[data-root]` is `aria-busy` only while `state === 'loading'`. During a rescan the busy state sits on the Rescan control, and "Rescanning" is announced once in the polite region (the copy lives in `defaults/`).
   - **Tests:** update the header test (~line 157) and add the announcement test.
4. **A11Y-001 (sev3).** After an update, if the previously focused node is still connected but no longer focusable, or `shadowRoot.activeElement` is null, move focus to the D-09 fallback.
   - Test: the 620 → 1600 lane-table scroller case, with a control.
5. **A11Y-002 (sev3).** At 390 px with 200% text, the authority pill wraps.
   - **Grant G-10:** a narrow, pinned grant (`overflow-wrap`/`white-space` keywords) on `sk-pill-tag[data-authority]::part(tag)` only, with a leak plant. It is applied under the operator's standing preference for narrow grants. Record it in the README grants list.
   - **Test:** add 390 and 620 to the 200% reflow test.
6. **A11Y-005 (sev3).** The Copy button's accessible name says what it copies: a `defaults/` entry starting with "Copy", passed through sk-button's `label`.
7. **CONTRACT-003 (sev3).** FR-018 / Q4(a): on a truncated report, the roll-up is labelled as covering only the shown findings.
   - Copy: in `defaults/`.
   - Test: paired, truncated against not truncated.
8. **CONTRACT-005 (sev2).** Plurals come from the defaults table. An unknown word or a word from a label hook is never pluralised.
9. **CONTRACT-004 (sev2).** Replace both real Mission slugs in `fixtures.ts:70-71` with synthetic ones, and update the tests that assert them.
   - Do NOT use any name from a real repository.
   - The orchestrator folds this into the commit that introduced the fixtures during compaction.
10. **CONTRACT-010 (sev1).**
    - (a) An empty-summary row falls back to the kind word, as the detail does.
    - (b) Remove the dead `KIND_COPY` explanation if it is dead; verify that first.
    - (c) Align the contract's tab numbering with the tests.
    - (d) Remove the duplicate CHANGELOG bullet.

### Structure
11. **BOUNDARY-001 (sev3).** Renumber the Drift data-driven selectors S15.x to the next free group not used by #7 (#7 uses S15.1..S15.5; pick S17).
    - Rename the fixtures to `s17-*`.
    - Update the headers, the selftest and the count comments.
12. **BOUNDARY-004 (sev2).** Scope the cross-part CSS:
    - the `[data-last-scan]` rule to the header part's own element;
    - one shared, scoped `sk-pill-tag::part(tag)` rule instead of two unscoped copies;
    - the resolution eyebrow rule must not reach the detail part's note markup.
    - Add confinement tests for each.
13. **BOUNDARY-006 (sev2).**
    - Correct the screen header comment about which parts draw `data-region`.
    - Draw the resolution section in ONE place, with one `resolution-title` id.
14. **BOUNDARY-007 (sev2).**
    - One slug-or-Mission-id helper, replacing the three copies.
    - `selectedIndex` reuses `sameKey`.
    - Merge `DriftState` into `DriftScreenStatus`.
    - The `missions` read uses the own-key lookup (`sk-drift-screen.ts:397`).
    - Drop the SeverityView/StateBadge sub-point (refuted).
15. **BOUNDARY-008 (sev1).** Un-export the nine unused helpers and types. Keep `slugOf` and the optional `id` (corrected).
16. **BOUNDARY-010 and CONTRACT-006 (sev2), docs.**
    - The README `labels` sentence lists all hooks.
    - The README remedy sentence matches the behaviour: an unknown remedy draws no command.
    - The contract names `SkDriftRetryLoadDetail`.
    - The CHANGELOG ordering is fixed.
17. **BOUNDARY-012 (sev1).** Move `src/contract/drift-types.check.ts` to `test/` as `expectTypeOf` checks.
18. **BOUNDARY-013 (sev2).** The surface freeze checks `sk-retry-load` with the drift detail cast-free, and names `DriftFindingView` and `LaneComparisonView`.

### Tests
19. **TESTS-001 (sev3).** Add `scripts/drift-story-catalogue.test.mjs` to `test:scripts`. Add the WP catalogue and visual-tags script tests too, if they are also missing, and say so.
20. **TESTS-002 (sev3).** Add a test where the same `scannedAt` and state come with a different count, which must announce. Add a revert check on the count comparison.
21. **TESTS-003 (sev2).** The change sample waits one animation frame. A separate perf project is NOT added here, because #7's perf split arrives at the port.
22. **TESTS-004 (sev2).** Set a two-pane viewport (1280x800) in the `detail`, `events-detail`, `resolution` and `rescan-busy` tests, keeping any deliberate mobile cases explicit.
23. **TESTS-005 (sev2).** Add a test that the detail blocks stack at the start (gap pinned, no stretch) in a tall cell. Removing `align-content: start` must fail it.
24. **TESTS-006 (sev1).** Add a 620 case to the divider test.
25. **TESTS-007 (sev1).** Comment the report-identity guard as belt-and-braces.
26. **TESTS-008 (sev1).** Add a test for the same instant spelled two ways, which must not announce "Rescanned".
27. **TESTS-010 (sev1).** The busy spinner's right edge must not pass the label's left edge. Compare Copy and the Mission link against their idle padding.
28. **CONTRACT-008 (sev1).** Add a source scan that the part files hold no copy (string literals other than attribute and CSS values), with a plant.
29. **A11Y-006 (sev2).** The reduced-motion test descends into the open shadow roots of sk-button and sk-pill-tag. Positive control: the busy cue animates without the preference.
30. **CONTRACT-007 = TESTS-009 (sev2).** Give DR-32 a distinct variant (a finding with a different sourceCode), and make DR-01 and DR-08 differ. Update the counts in the README and CHANGELOG.
    - Regenerate ONLY the affected baselines in the pinned container (`scripts/visual.sh --update`).

## BOUNDARY-005: the sunset map (issues filed on spec-kitty/spec-kitty-design, 2026-10-11)
| Grant | Issue |
|---|---|
| E-35 | #530 |
| E-36 | #527 |
| G-1, G-2 | #531 |
| G-3 | #509 |
| G-4 | #526 |
| G-5 | #529 |
| G-6 | #516 |
| E-18 extension | #516 |
| G-7, G-9 | #532 |
| E-37 table | #533 |
| E-38 | #534 |
| E-39 | #535 |
| G-10 | #535 |
| G-8 | #523 |

## R3 refuter verdicts

- CODE-BOUNDARY-001 confirmed sev3 — lane-h eslint.data-driven.config.mjs:142-146 and #7 (b31eb70) :145-149 both define S15.1..S15.5 (different words), and both trees hold s15-2/3/4/5 fixtures at identical paths (s15-1/6/7 differ by name, so only 4 add/add). Remedy: as proposed (renumber Drift to the next free group, rename fixtures, update headers/selftest/count comment).
- CODE-BOUNDARY-002 confirmed sev3 — lane-h wp-retry.ts widens RetryLoadDetail with DriftRetryDetail and index.ts:89 exports it from ./logic/wp-retry.js; #7's retry-types.ts keeps RetryLoadDetail as WP+Projects and adds RetryLoadEventDetail (main has no retry-types.ts, so #7 introduces it). Not a true FORK if #7 lands first: (a) is the obvious remedy; only if #10 lands first does it become a reconcile on #7's side. Remedy: as proposed, option (a), applied at second landing.
- CODE-BOUNDARY-003 confirmed sev3 — lane-h ci.yml has visual timeout-minutes 18 and matrix visual 43; main (e69de14) has 28 and 47; the lane's values are lower. Remedy: as proposed (re-derive both from the merged baseline count; pick neither side).
- CODE-BOUNDARY-004 confirmed sev2 — state-parts.ts:83 draws `<p ... data-last-scan>` and header-parts.ts has an unscoped `[data-last-scan]` mono/muted rule; `sk-pill-tag::part(tag)` is declared verbatim and unscoped at list-parts.ts:153 and detail-parts.ts:97; resolution-parts' `[data-region='resolution'] [data-eyebrow]` also covers detail-parts' note markup. Remedy: as proposed.
- CODE-BOUNDARY-005 confirmed sev2 — stylelint.config.mjs sunset list says "numbers allocated by the operator" and eslint E-36 says "sunset: one in the design library", with no issue numbers. Remedy: as proposed; the FORK is genuine (issue numbers need the operator or filing; E-04 "issue pending" is the alternative).
- CODE-BOUNDARY-006 confirmed sev2 — panel-parts.ts:23 draws data-region (callers pass 'authority'/'facts' at detail-parts.ts:70-71) and both resolution-parts.ts:84 and detail-parts.ts:25 draw `<section data-region="resolution" aria-labelledby=...>`, contradicting the sk-drift-screen.ts:4-6 header. Remedy: as proposed.
- CODE-BOUNDARY-007 confirmed sev2 — slug-else-id is written in list-parts.ts:38-41, header-parts.ts:24-26 and drift-finding.ts:115; selectedIndex (drift-report.ts:62) re-implements sameKey (drift-finding.ts:59); DriftState duplicates DriftScreenStatus; the direct this.missions?.[this.missionId] is at sk-drift-screen.ts:397 (cited as :376, a line-number drift only). The SeverityView/StateBadge point is weak (StateBadge is a shared pre-existing type) and should be dropped. Remedy: as proposed, minus the SeverityView/StateBadge item.

- CODE-BOUNDARY-008 confirmed sev1 — the nine exports have no importer outside their module (grep over src/test/apps), but the "slugOf fallback is dead" half is wrong: slugOf is not exported and test/sk-drift-screen.skeleton.test.ts:666 calls renderPanel without an id, so the fallback is exercised. Remedy: un-export the helpers/types only; leave slugOf and keep `id` optional (or drop both fallback and that test case together).
- CODE-BOUNDARY-009 confirmed sev2 — a real cross-PR seam (both PRs rewrite checkBulk/checkHygieneScope/checkCoherence); not verified line-by-line against #7, but the claim is a reconcile-time note, not a defect at this tip. Remedy: as proposed, executed on the second landing.
- CODE-BOUNDARY-010 confirmed sev2 — README.md:99 (Drift section) says `labels` is "optional lane-word hooks"; contracts/sk-drift-screen.md:33 lists `RetryLoadDetail` while sk-drift-screen.ts:68 and index.ts:67 publish `SkDriftRetryLoadDetail`; CHANGELOG line 70 sits at the bottom of Added after #1 entries while the screen entry is at line 9. Remedy: as proposed.
- CODE-BOUNDARY-011 refuted sev0 — tracer-design-decisions.md:121 rules "callback or event" from the resolution part to the screen for this exact read-back; `hidden` is a static attribute Lit does not reset on re-render, and selection must run post-commit, so a declarative readBack prop adds a re-render round trip for no defect shown. Remedy: none (at most a note for a later refactor).
- CODE-BOUNDARY-012 confirmed sev1 — src/contract/drift-types.check.ts is the only *.check.ts in the tree, has runtime `export const x = finding` over `declare const`, and tsconfig includes test/ so the move loses no typecheck coverage; package main is src/index.ts. Remedy: as proposed (move to test/ as expectTypeOf, like #7's retry-types.test.ts).
- CODE-BOUNDARY-013 confirmed sev2 — surface-freeze.test.ts:402-427 adds listeners only for sk-select-finding, sk-rescan-drift, sk-copy-command (not sk-retry-load), and never names DriftFindingView or LaneComparisonView, which index.ts:93,99 export. Remedy: as proposed.
- CODE-CONTRACT-001 confirmed sev3 — reproduced on the lane-h tip: loading then ready with scannedAt deleted gives "Drift scan loaded: 5 findings, last scan undefined"; scannedAt '' gives "last scan " (shown()/reportLine test only === null). Remedy: as proposed (normalise non-string/empty scannedAt to null in announcementInput; add red-first loading->ready test), noting that null then announces no ready line at all, so decide whether a clause-less ready line is wanted.
- CODE-CONTRACT-002 confirmed sev3 — reproduced: scoped ready then foreign report, and ready with report null, both give state loading and announce "Loading drift scan"; FR-009 (spec.md:272) and FR-008 (:271,:192) say nothing is announced. Remedy: as proposed; the FORK is weak (FR-009's "nothing announced" is explicit, so option (a) silence is the obvious remedy), but a positive control is needed because a real status 'loading' must still announce.

- CODE-CONTRACT-003 confirmed sev3 — FR-018 and Q4(a) require the roll-up to be labelled as covering the shown findings; headSummary/SEVERITY_ROLLUP_TEXT/renderHead take no truncated input, and the only truncation text (TRUNCATION_TEXT, in a separate sk-notice) does not label the roll-up; no test mentions it. Remedy: as proposed.
- CODE-CONTRACT-004 confirmed sev2 — NFR-007 says "Mission slugs are synthetic"; fixtures.ts:70-71 use <a public spec-kitty Mission slug> (public spec-kitty Mission, exists in the spec-kitty checkout) and <a private Mission slug> (exists only in the operator's private private workspaces); tests assert both. Sev lowered (060 is public; only the second is a private name). Remedy: as proposed; the history-rewrite question is a FORK for the operator, the rest is obvious.
- CODE-CONTRACT-005 confirmed sev2 — SEVERITY_ROLLUP_TEXT (drift-copy.ts:22-23) appends "s" to any word, and headSummary feeds it the raw/hooked word from resolveSeverity, so unknown "critical" gives "2 criticals" and hook words are pluralised. Remedy: as proposed (plural in the defaults table; no plural for unknown or hooked words).
- CODE-CONTRACT-006 confirmed sev2 — README.md:99 (Drift section) calls labels "(optional lane-word hooks)" while LabelHooks (logic/types.ts:24-36) adds kind, severity, authority, derivedSide, refusal; README.md:105-106 says an unseen remedy is "drawn neutrally with its raw word", but drift-finding.ts:122-123 yields command null for an unknown remedy (nothing drawn). Remedy: as proposed.
- CODE-CONTRACT-007 confirmed sev2 — md5sum: screens-drift-detail--dr-32.png equals dr-02.png (6d5ce4c7) and screens-drift-tiers--dr-01.png equals screens-drift-detail--dr-08.png (ccf1b8fd); DR-32 is reportPopulated select 1 (same as the DR-02 default) and DR-01 is select 0 (same as DR-08). Remedy: as proposed (distinct DR-32 variant; DR-01 and DR-08 differ; fix the counts in README/CHANGELOG), and re-run the pinned container baselines.
- CODE-CONTRACT-008 confirmed sev1 — drift-defaults.test.ts:17 only checks constants exist; no test under test/ scans the part files for text (drift-part-selectors.test.ts pins selectors only), so the "part files hold no copy" ruling is unenforced; the tree is clean today, so the impact is a latent guard gap, not a defect. Remedy: add the source scan with a plant (or at minimum rename the test so it does not claim the ruling).
- CODE-CONTRACT-009 refuted sev1 — the median-of-7 rule is stated in the test header and mirrored by the sibling sk-work-package-screen.perf.test.ts:103-121; the tracer's WP07 fold-in (line 141) asked only for a trip control, which exists; this is a test-rigor choice, not a broken requirement, and cannot be confirmed as a fault from the code. Remedy: record the median rule as an NFR-006 note in the tracer (cheap, optional); no code change required.
- CODE-CONTRACT-010 confirmed sev1 — (a) list-parts.ts:80 draws finding.summary while drift-finding.ts:128 falls back to the kind word when empty; (c) contracts/sk-drift-screen.md:65-67 numbers tab-1..tab-6 while a11y.test.ts:117-120 asserts 7..10; (d) CHANGELOG.md lines 14 and 84 list the drift logic modules twice; (b) dead KIND_COPY explanation not independently probed beyond the reviewer's source reading. Remedy: as proposed.

- CODE-TESTS-001 confirmed sev3 — package.json:36 test:scripts omits drift-story-catalogue.test.mjs and ci.yml (lines 300/339/378) never calls test:terminology (package.json:37). Remedy: as proposed.
- CODE-TESTS-002 confirmed sev3 — drift-announce.ts:32 `prev.count === next.count` has no test with equal scannedAt/state and a different count (every rescan test changes scannedAt). Remedy: as proposed.
- CODE-TESTS-003 confirmed sev2 — perf.test.ts runs a 200 ms wall-clock median in the default vitest include (vitest.config.ts has one project), and the change sample stops at updateComplete (no frame). Remedy: as proposed (rAF in the change sample plus a separate project or retry headroom).
- CODE-TESTS-004 confirmed sev2 — grep finds no `page.viewport` in detail/events-detail/resolution/rescan-busy tests, whose mount() never sets one; tiers.test.ts shows shell-mobile is viewport-driven, so default 414 is the mobile tier. Remedy: as proposed.
- CODE-TESTS-005 confirmed sev2 — `align-content: start` at sk-drift-screen.ts:~131 on [data-region='detail'] is real, and no divider/detail test asserts block spacing; the finding's own mutant run supports it (not re-run by me). Remedy: as proposed.
- CODE-TESTS-006 confirmed sev1 — lines ~159-162 duplicate the @container rule (code comment admits it); divider.test.ts has only 1280 and 800 cases, no 620. Remedy: as proposed (a 620 case is preferred over dropping the declaration, since the shell tier is the shell's to name).
- CODE-TESTS-007 confirmed sev1 — sk-drift-screen.ts:327 `pending.report === this.report` duplicates willUpdate's null-out at line 343, so the mutant is equivalent. Remedy: as proposed (comment it as belt-and-braces; no FORK).
- CODE-TESTS-008 confirmed sev1 — drift-announce.ts:36 `after <= before` is the only guard for equal instants spelled differently (string-equal branch at line 31 does not catch them), and the announce tests have no such case. Remedy: as proposed.

- CODE-TESTS-009 confirmed sev1 — git ls-tree at the tip shows dr-02 and dr-32 share blob 9f479ee, dr-08 and dr-01 share 9ed82f9; Dr32 story is `reportPopulated select 1` at 1280x1100, the same args as Dr02 (default). Remedy: as proposed (accept, or give DR-32 a finding with a different sourceCode); no fork.
- CODE-TESTS-010 confirmed sev1 — the rescan-busy test asserts only padding (`toBe(32)`) and `not.toBe(32)` for Copy and the Mission link; it never measures the spinner against the label (library cue is absolute at --sk-space-2, one --sk-space-4 wide). Read, not mutated. Remedy: as proposed (spinner right <= label left; compare Copy/link to their idle padding).
- CODE-A11Y-001 confirmed sev3 — `updated()` (sk-drift-screen.ts:371-375) returns unless `before.isConnected` is false, and `renderLaneTable` drops role/tabindex when `overflowing` goes false, so the focused scroller stays connected but unfocusable; matches FR-025's "body or null" loss definition. Code-read only, the reviewer's browser probe was not re-run. Remedy: as proposed (also refocus when `before` is still connected but `shadowRoot.activeElement` is null), plus an a11y test.
- CODE-A11Y-002 confirmed sev3 — library `.sk-pill-tag` is `white-space: nowrap` (verified in dist/elements.js) and detail-parts.ts:70 puts the 31-char "The Mission's status event log" into it; NFR-004 and DR-29 cover only 1100/720/620, so 390 at 200% is unobserved (outside the spec'd widths, so sev3). Remedy: as proposed (scoped `sk-pill-tag[data-authority]::part(tag)` wrap, a narrow E-37 grant: apply and report; add 390 to the 200% test).
- CODE-A11Y-003 confirmed sev2 — sk-button renders `<button part=button>` with only aria-label/disabled and no aria-busy (verified in dist/elements.js), so the host's aria-busy (header-parts.ts:40) is not on the focused control; no rescanning announcement exists. The operator ruling of 2026-10-11 (tracer, "A11Y-004") says it is covered by the Rescanning announcement. Remedy: corrected, implement that ruling (one polite "Rescanning" announcement on the false->true edge, copy in defaults/); inner-button aria-disabled is optional and library-owned (file it); update the G-9/header tests.
- CODE-A11Y-004 confirmed sev2 — sk-drift-screen.ts:473 sets busy = loading || rescanning on [data-root], but it is NOT a fork: the operator already ruled (tracer, 2026-10-11) that the root is aria-busy only during first load and rescan busy sits on the Rescan control. The ruling is not yet implemented at the tip. Remedy: corrected, implement the ruling (busy = state === 'loading'), update header test line 157 (asserts root busy during rescan) and DR-21 wording to the Rescan control.
- CODE-A11Y-005 confirmed sev3 — COPY_LABEL = 'Copy' (drift-copy.ts:88) is passed as the slot only (resolution-parts.ts:88), so the name has no object; but the button sits in a section labelled "Suggested resolution", so it is not a WCAG failure (sev2 overstated). sk-button's `label` maps to aria-label on the inner button (verified). Remedy: as proposed (COPY_ACCESSIBLE_LABEL starting with "Copy", e.g. "Copy command", via `label=`; patch contracts/defaults.md and the Copy-name tests).
- CODE-A11Y-006 confirmed sev2 — `moving()` (a11y.test.ts:380-386) uses `root(screen).querySelectorAll('*')`, which does not cross into the sk-button shadow root where `.sk-button__busy-cue` animates; the library's reduced-motion rule currently masks it. Remedy: as proposed (descend into open shadow roots of sk-button/sk-pill-tag, with a positive control that the busy cue animates without the preference).
