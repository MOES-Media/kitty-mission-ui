# ui#11 pre-merge fix round: independent verification at lane-i 3dcd4bf (2026-10-11). 19 RESOLVED, 1 PARTIAL (1), 0 NOT-RESOLVED, item 20 accepted; 5 fresh findings (1 sev2 introduced, 2 sev2 pre-existing gaps, 2 sev1)

Scope: the fixes are c551ca2..c7f2f19, plus 090bfc1 (the kitty-specs patch) and the planning merge 3dcd4bf. The bar is r3-confirmed.md items 1–21, with the operator and orchestrator rulings in tracer-design-decisions.md ("Storybook review" and "Operator rulings on the pre-merge squad"). The port-time items were not verified.

Method: my own detached worktree `wt-verify` at 3dcd4bf, with `pnpm install --frozen-lockfile`.
- Every revert and plant was a temporary edit made by `verify-tools/mut.py`, and the file was written back byte for byte. Two whole-file reverts went to c551ca2 and were restored from a copy.
- Three temporary probe tests, `test/zz-verify-probe{,2,3}.test.ts`, were created and then deleted. `git status` was clean after each batch.
- Targeted runs used `pnpm exec vitest run <file>` in packages/mission-ui, and `node --test`, `pnpm typecheck` or `pnpm test:data-driven` at the root.
- The gate log is `verify-gates.log`. The baseline crops are in `verify-png/`.

Gates (run once each, load 3.1–3.5 at each start): typecheck 0, lint 0, lint:styles 0, test:scripts 449/449, test:data-driven 128/128, and `pnpm test` 89 files / 1563 tests. Extra: lint:data-driven 0. `pnpm visual` was not run.

| Item | Finding | Verdict | Revert evidence |
|---|---|---|---|
| 1 | A11Y-001 rem thresholds, wrapping facts, unshrinking badges | PARTIAL | **What holds:**<ul><li>Reverting ops-row-parts.ts to c551ca2 turns 6 tests red: the 200% truncation test, the badge-word test, "badge never shrinks", OP-27, the rem tier test and the single-source test.</li><li>Single mutants are each killed: no `flex-shrink: 0`; facts back to ellipsis; evidence labels back to ellipsis; the row 696px or 588px threshold; the page 588px threshold; and `break-word` dropped from dt/dd.</li><li>At 16 px only the header line differs (see Baselines), apart from OP-27, where wrapping is the ruling, and the OP-21 period.</li></ul>**Gap 1, from the spot-check.** My own 200% probe walked every text element of the screen, nested shadow roots included, at 1280, 800, 620 and 390. It covered 10 scenarios: ready with Load more, refused cursor, load-more error, empty with profile and skipped records, error, loading, and three profile lengths. **One element is still truncated**: the section-heading profile fact `code[data-profile-fact]` ("Profile: …", FR-031 calls it a fact) keeps the ellipsis.<ul><li>OPS_PROFILE "architect-alphonso" is cut at 390: sw 454 > cw 326.</li><li>A 26-character profile is cut at 620 and 390.</li><li>The 128-character profile is cut at every width.</li></ul>The rows, badges, page pills, header and notices are all whole. The page's horizontal scroll at 390 (533 > 390) is the shell's A11Y-009, as R1 found. **Gap 2:** `flex-shrink: 0` introduced F-1. |
| 2 | A11Y-002 200% truncation test | RESOLVED | The test runs at 1280, 800, 620 and 390, on all 29 fixtures (real lengths), and asserts 32 px. It has a positive control (a forced nowrap clip is detected) and a cell-count floor. It is red before item 1: see the whole-file revert above. Its scope is row cells only (dt, dd, id, evidence labels, badge part), so it cannot see F-2's profile fact. |
| 3 | A11Y-003 "Loading more records" | RESOLVED | Exact sequence: the test collects `['Loading more records', '4 more records loaded']` with a count of 1 each. An unrelated update while busy gives 0. The copy is in defaults (`announceLoadingMore`) and follows `labels.copy`. Mutants killed:<ul><li>Returning null instead of the busy line turns 5 tests red.</li><li>Dropping `!previous.busy` turns the sequence test red (it announces twice).</li><li>Announcing in any look turns the "only the ready look" test red.</li></ul>By reading: a busy end with no rows is silent, and a retry that clears the error and goes busy says the line once. The tests cover both. |
| 4 | A11Y-007 page identity | RESOLVED | `samePage := true` turns 3 tests red. Dropping the cursor term turns the cursor test red. Dropping the first-id term turns the first-id test red. Dropping `firstId === previous.firstId` from `added` turns the "longer list is not rows added" test red. Each test has a paired control: structural copies and an equal cursor stay silent. |
| 5 | TESTS-001 error announced once | RESOLVED | Removing the `errorKey !== previous.errorKey` guard turns both new tests red (code null and `invalid_page_cursor`). Each test has 6 unrelated updates plus a labels change, and a positive control. |
| 6 | CONTRACT-001 omitted optional fields | RESOLVED | Each `?? null` reverted alone (`actor`, `completedAt`, `missionId`, `wpId`, `closedBy`, `outcome`) turns its test red, 6 of 6 KILLED. The outcome test asserts that the status hook, not the outcome hook, is called (`['status:closed']`). No other Ops code reads these fields raw (grep). |
| 7 | CONTRACT-002 two sentences, profile between | RESOLVED | Collapsing to one paragraph turns 3 tests red. Putting the skipped sentence before the code turns 2 red. Dropping the period from `emptyProfile` turns 4 red. The OP-21a story exists (catalogue 37 stories, test:scripts green), and its baseline shows heading, sentence, code, then the skipped sentence. |
| 8 | CONTRACT-003/008, BOUNDARY-015 header line | RESOLVED | Dropping `\|\| name === ''` turns the empty-name test red. A literal ` · ` instead of `copy('headerSeparator')` turns the separator-hook test red. Restoring "local invocation records" turns 5 tests red. `OpsScreenStatus` is declared only in sk-ops-screen.ts, and fixtures.ts imports it as a type. |
| 9 | TESTS-002 `labels.closer` | RESOLVED | Removing `labels?.closer?.(closedBy) ??` turns the closer test red. That test also pins the undefined fallback and the hidden `agent`. |
| 10 | TESTS-003 formatUtcInstant boundaries | RESOLVED | `>=` → `>` on the day carry turns 2 cases red (28 Feb, and 31 Dec → 1 Jan 2027). `month < 1` → `< 0` turns the month-0 case red. The code was already correct (R1 found only surviving mutants), so the change is test-only, which meets the bar. |
| 11 | TESTS-004 injectable refusal table | RESOLVED | Replacing the lookup with the constant `'errorBody'` turns the injected-table test red. The default still maps `ops_unreadable` → `errorBody`, matching CP-1 (tracer :67) and the ruling. FR-027, the OP-26 row and the spec edge case are amended in 090bfc1, and defaults.md says the same. |
| 12 | BOUNDARY-005 own page-pill attribute | RESOLVED | Restoring the shared `data-ops-badge` in ops-page-parts.ts turns 6 tests red across ops-page-parts and ops-part-selectors. Adding `data-ops-badge` to only the read-only pill, or only the count pill, turns 2 red each, the computed-style test included. Computed styles (probe):<ul><li>Row badge part: `display:block; overflow:hidden; text-overflow:ellipsis`, `font-weight` 400 inherited from its host (`inherit` rule), host `flex-shrink:0; align-self:flex-start`.</li><li>Count and read-only part: the library `display:flex; overflow:visible`, padding 4/8, 1px solid border, mono, `font-weight` 400 from the page token, line height 14.4 px, tabular-nums; host `flex-shrink:1`.</li><li>Plain pill: 0 border, Inter, 500.</li></ul>Neither kind takes the other's rules. |
| 13 | BOUNDARY-006 #7's bare-word shapes | RESOLVED | Dropping any one of S16.5, .6, .7, .9, .10 or .11 turns test:data-driven red (4–5 tests each). The identifier key `{ text: 1 }` stays silent by design, with a self-test. lint:data-driven is 0 on src. Residual shapes are in F-5. |
| 14 | TESTS-006/007/008 fail-closed scanner | RESOLVED (but see F-3) | Every plant in the real ops-row-parts.ts is red in ops-part-selectors.test:<ul><li>a second `css` template;</li><li>a `${css``}` interpolation;</li><li>`overflow-wrap: anywhere !important` on `[data-ops-head]`;</li><li>`OVERFLOW-WRAP: ANYWHERE`, which is also refused by Stylelint;</li><li>`:is([data-ops-evidence], [data-ops-head])` replacing an existing selector;</li><li>a `lit.css` namespace template;</li><li>an `unsafeCSS('…')` string (`rules()` scans the whole source, so neither escapes).</li></ul>Shorthand plants (`font`, `border-*`, `background-color`, `ROW-GAP`) are covered by new synthetic cases. A page-file sibling `::part` selector is refused by the exact pin. **Two plants fool the attribute check, all three layers green:** `[data-ops-head]:not([data-ops-id])` and `[data-ops-id] ~ [data-ops-facts] dd` added to the existing evidence rule (F-3). |
| 15 | TESTS-005 catalogue tests in `test:scripts` | RESOLVED | Removing the three files from `test:scripts` turns the new terminology.test case red. The test:scripts run lists them, and the count rose to 449. |
| 16 | BOUNDARY-008 tabular-nums under E-40 | RESOLVED | The E-40 comment (stylelint.config.mjs:379-391) records the `tabular-nums` literal as coming from the WP04 fix ruling, and lists Ops G-1..G-6. |
| 17 | BOUNDARY-010 `Ops G-n` | RESOLVED | Renaming `id: 'Ops G-4'` back to `'G-4'` turns stylelint-exceptions.test red. A grep of the Ops sources, tests, configs, README and CHANGELOGs finds no bare G-1..G-6. |
| 18 | BOUNDARY-012 `opsLoadedText` | RESOLVED | It is deleted, and `git grep` finds 0 hits outside kitty-specs. |
| 19 | BOUNDARY-013 surface test, `OpsRowView` members | RESOLVED | The chosen option is to export them: `OpsFact`, `OpsFactKind` and `OpsEvidenceDisplay` come from the entry, and the CHANGELOG says so. Dropping `OpsFact` from index.ts turns typecheck red (TS2694 at surface-freeze.test.ts:358). The test is renamed, and its comment now says that the copy is not exported (asserted). |
| 20 | A11Y-004 | ACCEPTED | No change, by the orchestrator ruling (DO-16 parity). |
| 21 | Docs (CONTRACT-004/005/006, BOUNDARY-015) | RESOLVED | <ul><li>Contract: "Twelve properties".</li><li>FR-001: twelve, with `project`.</li><li>data-model: a `project` row.</li><li>defaults.md: `countAllOne`, `announceLoadedOne`, `announceMoreOne`, `quietCompletedClosed`, the separator row and the announcements row.</li><li>ops-copy.ts header comment fixed.</li><li>Package CHANGELOG: twelve properties, the refusal-code line and the omitted-field and omitted-evidence wording.</li><li>README: the data-driven row has no counts; Ops G-1..G-6 are named in the README and both CHANGELOGs; 211 stories, which matches the 211 PNGs.</li></ul>Stale text that the item did not list is in F-4. |

## Baselines

- `git diff --stat c551ca2 c7f2f19 -- '*.png'`: 37 files, all `screens-ops-*` (36 modified, plus the new `op-21-a`). No non-Ops PNG changed, and c7f2f19..HEAD changes no PNG.
- A pixel diff (PIL, threshold 24) of all 36 modified baselines confines every change to the header line band (y 222–234; 214–226 at 620), with two exceptions:
  - **OP-27** changes from y 1107 down: the profile and action now wrap over several lines instead of `…`. The crop `verify-png/op27-pair.png` was checked by eye; the wrap is the ruling.
  - **OP-21** gains the period after "No records for this profile" (y 453–466).
- Checked by eye: OP-27 (pair), OP-21 (pair), OP-21a (new: heading, "No records for this profile.", `architect-alphonso`, then "3 records in this project could not be read and are not shown."), and the header crop ("example-project · invocation records").
- The evidence-label rows OP-08, OP-10 and OP-11 and the paging rows OP-15 and OP-24 differ only in the header band. So the evidence labels, row badges and count pill are pixel-identical at 16 px, and the attribute split (item 12) left the page pills' look unchanged.

## Fresh sweep (git diff c551ca2..lane-i, excluding kitty-specs)

- **F-1 (sev2, introduced by item 1's `flex-shrink: 0`).** A long unknown outcome, a raw host word under OP-26, now overflows the row and the page in a non-stacked head. Before the fix, the badge shrank and ellipsized. Probe with `outcome` of 141 characters:

  | View | Before (c551ca2) | Now |
  |---|---|---|
  | 1280 | badge 705 px, ellipsized | badge 1033 px, row `li` scrollWidth 1061 > 898, badge right edge 1252 past the row's 1090 |
  | 800 | document 800/800 | document scrolls, 1062 > 800 |
  | 800 at 200% | — | document 2097 > 800 (the head now stacks there, and the stacked case below applies) |

  The stacked case at 390 already overflowed before the fix (document 676 for 89 characters, 1050 for 141). That part is pre-existing, but it is now reached at more widths. No test uses a long outcome; `opsUnknownOutcome` is short.

  Remedy: add `max-width: 100%` to `sk-pill-tag[data-ops-badge]`. Normal words then keep their whole width, and a word longer than the row ellipsizes at the row edge, with the title and the accessible name. The same line also fixes the stacked case. Add a test with a ~140-character unknown outcome at 1280, 800, 390 and 800@200% that asserts no row or document overflow. `max-width` is in Stylelint's layout list.
- **F-2 (sev2, pre-existing; the A11Y-001 fix left it uncovered).** The section-heading profile fact (`code[data-profile-fact]`, ops-page-parts.ts) still ellipsizes at 200%:
  - "Profile: architect-alphonso" (the story's own OPS_PROFILE) is cut at 390;
  - a 26-character profile is cut at 620 and 390.

  The ruling's reason is that "nothing is hidden at any text size", and FR-031 calls this element a fact. The title is not reachable by keyboard or touch, as R1 noted for the badges. The new 200% test scans row cells only.

  Remedy: let the profile fact wrap as the empty-look profile does (Ops G-5 analogue: `overflow-wrap: anywhere` or `break-word`, pinned to `[data-profile-fact]` in ops-part-selectors.test). Then extend the 200% test to the section header, the page pills and the header line. If the operator prefers to keep the ellipsis, record it as a ruling.
- **F-3 (sev2, pre-existing gate gap; item 14 did not close it).** `hasAttr` matches the attribute anywhere in a selector, including inside `:not()` and in a compound before a combinator. So E-43 confinement (b) accepts two plants, which also pass Stylelint and ESLint:
  - `[data-ops-evidence], [data-ops-id] ~ [data-ops-facts] dd { overflow-wrap: anywhere }`, which puts `anywhere` on every fact value;
  - `[data-ops-head]:not([data-ops-id])`.

  The same helper is used by (a) on the row file and by (e). Remedy: test the attribute on the subject compound only, the text after the last combinator with `:not(...)` removed. Add the two plants above as negative cases.
- **F-4 (sev1, doc drift against the rulings).**
  - spec.md FR-020 ("a pill or a fact term ellipsizes"), DO-13 and the E-43 row in contracts/gates.md ("every other text … ellipsizes") still describe the ellipsis that the A11Y-001 ruling removed from facts.
  - FR-025 and defaults.md's "empty, skipped" row still say the skipped sentence is "appended to the headline". With a profile, it now follows the code as its own paragraph.
  - FR-033 and NFR-013 do not name "Loading more records" or the page-identity rule; only defaults.md and the tracer do.

  Remedy: one kitty-specs patch line for each, add-only where the archive-freeze rule applies.
- **F-5 (sev1, residual of item 13; beyond the bar).** These still pass lint:data-driven, checked with a planted file in src/logic that was then deleted:
  - `s.includes(\`failed\`)` (a template-literal argument);
  - `o[\`failed\`]`;
  - `new Set(['failed']).has(s)`;
  - `['failed'].some(…)`;
  - `s.startsWith('failed')`.

  Remedy: add the expression-free TemplateLiteral form to S16.5 and S16.11, or ledger the rest as accepted limits of a syntactic gate.

Checked clean in the sweep:
- the copy table: 49 keys, the host-neutral matcher, and `headerSeparator` free of path characters;
- `opsEmptyText` and `renderOpsEmpty` without a profile: one paragraph, the same as before;
- `busy` tracking across looks;
- the error-before-busy precedence (a retry that clears the error says "Loading more records" once);
- the removed `loadingMore` cases in the "same shown pair" loop, now covered by the busy-end test;
- the `fixtures.ts` type-only import from the screen (no runtime cycle);
- the rem container queries, which resolve against the root size as the tier test proves;
- no `it.skip`, `.only` or `.fails` added;
- no non-Ops file touched outside the configs, scripts, README and CHANGELOGs listed in the diff.

## Round 2 verification

At lane-i b122f8b. Round 2 is 3dcd4bf..b122f8b: d82d926, 5a75fd6, d9ccc9a, 9ccc056, the spec and tracer commit b703ce7, and the planning merge. **Result: 3 RESOLVED (item 1, F-2, F-3) and 3 PARTIAL (F-1, F-4, F-5), 0 NOT-RESOLVED. 1 fresh finding: R2-1, sev2, introduced by Ops G-7.**

Method: my own detached worktree `wt-verify2` at b122f8b, with `pnpm install --frozen-lockfile`.
- Every revert or plant was a temporary edit made by `verify-tools/mut.py` and restored byte for byte.
- The temporary probe `test/zz-verify-r2.test.ts` and the temporary plant `src/logic/zz-verify-plant.ts` were created and then deleted. `git status` was clean after each batch.
- The probe output is in `verify-tools/probe-r2.out`.

Gates (run once each, load 4.9–5.3 at each start): typecheck 0, lint:styles 0, test:scripts 452/452, and `pnpm test` 89 files / 1570 tests. The log is `verify2-gates.log`. `pnpm visual` was not run.

| Item | Verdict | Evidence |
|---|---|---|
| 1 / F-2 | RESOLVED | **The profile fact now wraps.** Putting the ellipsis triplet back on `[data-profile-fact]` turns 2 tests red: the new 200% header-and-pill test (3 profiles × 4 widths) and the edge test for the 128-character profile.<br>**My full-screen 200% probe** is the same walk as round 1: 9 scenarios × 1280, 800, 620 and 390, 17,136 text cells. It finds **no truncated element**. That includes "architect-alphonso", a 26-character profile and a 128-character profile, the page pills and the header line. The only remaining overflow is the page scrolling 533 > 390 at 390, which is the shell's A11Y-009 and appears in every scenario. |
| F-1 | PARTIAL | **What holds:** a ~140-character unknown outcome no longer overflows the row or the page at any width.<ul><li>1280: badge 866 px, part 1031/864 (ellipsized), title intact.</li><li>800: 766 px, page 800/800.</li><li>390: 356 px.</li><li>800 at 200%: 734 px.</li><li>390 at 200%: 324 px.</li></ul>Removing `max-width: 100%` turns 2 tests red: the new F-1 a11y test and the (g) Ops G-7 pin. Setting `max-width: 50%` is refused by Stylelint. The grant is recorded in stylelint.config.mjs, the tracer, the README and both CHANGELOGs.<br>**Gap (R2-1):** in a head that is not stacked, the badge now takes the whole head, and the record **id collapses to 0 px wide** (0×546 px, one character per line). The head then overflows by 12 px (scrollWidth 878 > 866 at 1280; 778 > 766 at 800). The new test checks the badge and the page, not the id. |
| F-3 | RESOLVED | **The new check holds against the earlier plants.** Restoring the old whole-selector match turns 2 tests red. My two round-1 plants in the real ops-row-parts.ts are now red: `[data-ops-id] ~ [data-ops-facts] dd` and `[data-ops-head]:not([data-ops-id])`.<br>**Ten attempts to fool it**, added to the existing evidence rule:<ul><li>Refused as expected: `dd::part(x)`; `[data-ops-id]::part(tag)`; `dd:nth-child(2n+1)` (a false refusal, harmless); `[data-ops-evidence], [data-ops-facts] dd` (a comma list); `:host([data-ops-id]) dd`; `dd[data-ops-id-x]`; `dd:nth-child(n of :not([data-ops-id]))`. The `:is`, `:where` and `:has` cases are in its own plants.</li><li>Accepted, all three harmless:<ul><li>`[data-ops-facts] dd [data-ops-id]`, whose subject really has the attribute;</li><li>`dd:nth-child(n of [data-ops-id], [data-ops-evidence])`, where `of S` constrains the subject itself, although the naive comma split gives a garbled parse;</li><li>`dd::slotted([data-ops-id])`, which needs a slot and the screen has none.</li></ul></li></ul>No accepted plant reaches an element that lacks the attribute. Nit (sev1): `rules()` splits on every comma, including commas inside `:nth-child(… of A, B)`. Refusing any `(` that contains a comma would make the check strictly fail-closed. |
| F-5 | PARTIAL | **Now caught:** `` s.includes(`failed`) ``, `new Set([...]).has(s)`, `startsWith`, `` endsWith(`open`) ``, `new Map([['failed', 1]])` and `` m.get(`failed`) ``. Removing the template alternative, or `startsWith`/`endsWith`, turns test:data-driven red.<br>**Still silent**, and both were named in my F-5 remedy:<ul><li>`` o[`failed`] ``, the template form of S16.11;</li><li>`['failed'].some(…)`.</li></ul>Also silent: `.find(…)` and `'failed' in o`. These are sev1. Add the TPL form to S16.11, or ledger the rest as accepted limits of the syntactic gate. |
| F-4 | PARTIAL | b703ce7 amends FR-020, DO-13, the E-43 row in gates.md, FR-025, the defaults.md "empty, skipped" row, FR-033 and NFR-013, and records Ops G-7 in the tracer. **Two new sentences misdescribe the code** (sev1):<ul><li>**FR-033** says a longer list counts as "rows added" only with "the same first id and the same next cursor". The code (`added`) requires only the same first id. A real load-more always changes the cursor, and still says "N more records loaded".</li><li>**NFR-013** says "a longer list of another page, cursor or first id announces nothing". A different page announces "{loaded} of {total} records loaded", and a longer list with a new cursor is the normal load-more announcement.</li></ul>Remedy: "rows added when the first record is unchanged; a page with another first record or cursor is announced as loaded". |

### Fresh sweep (git diff 3dcd4bf..lane-i, excluding kitty-specs)

- **R2-1 (sev2, introduced by Ops G-7).** In a head that is not stacked, `flex-shrink: 0` together with `max-width: 100%` lets a word longer than the row take the whole head, and the record id gets 0 px. Measured with a 141-character outcome at 1280 and 800: the id is 0×546 px, rendered one character per line, and the head overflows by 12 px. The id is the row's one identifying value, so it becomes unreadable. An 89-character word leaves the id 95–195 px wide, which is acceptable.

  Remedy: `flex-wrap: wrap` on `[data-ops-head]` (layout only, no grant), so a badge that cannot sit beside the id moves to its own line. Then extend the F-1 test to assert that the id width is at least ~8 characters and that head scrollWidth ≤ clientWidth.
- Checked clean:
  - The page-file comment and rule split: the count and read-only pills keep the E-42 ellipsis, and only the profile wraps, with `break-word` as allowed in the page file.
  - The G-7 Stylelint block is file-scoped with keyword `100%` only.
  - The `maxWidthViolations` plants cover `max-inline-size`, `!important`, a comma list and a descendant.
  - The README and CHANGELOG grant lists (G-1..G-7) and story counts are unchanged and correct.
  - No `.skip`, `.only` or `.fails` was added, and no PNG changed in round 2.

## Round 3 verification

At lane-i 9a2d3e7. Round 3 is b122f8b..9a2d3e7: 8de31b8, 617a28f, 45b0788, c537816, the spec commit 462a910 and the planning merge. **Result: R2-1, F-5 and F-4 are all RESOLVED. The fresh sweep finds nothing at severity 1 or above.**

Method: my own detached worktree `wt-verify3`, with `pnpm install --frozen-lockfile`. The temporary probe and the temporary plant file were deleted afterwards, and `git status` was clean.

Gates (run once each, load 3.6–3.9 at each start): typecheck 0, lint 0, and `pnpm test` 89 files / 1571 tests. The log is `verify3-gates.log`.

| Item | Verdict | Evidence |
|---|---|---|
| R2-1 | RESOLVED | **Long-outcome probe (141, 89 and 9 characters) at 1280, 800 and 390:**<ul><li>no page or row overflow;</li><li>head scrollWidth equals clientWidth everywhere (866/866, 766/766, 356/356);</li><li>the id keeps one readable line, 218×21 px at 1280 and 800, with a long badge wrapping to its own line.</li></ul>**Normal looks unchanged:** across all 29 fixtures at 1280 and 800, no badge left the id's line. This round changed no PNG.<br>**Revert:** removing `flex-wrap: wrap` turns the F-1 a11y test red; it now includes the id-width assertions. |
| F-5 | RESOLVED | Both of my plants now fire. `` o[`failed`] `` fires S16.11 and `['failed'].some(…)` fires S16.6. The selftest covers the new shapes (some, every, find*, filter, `in`). |
| F-4 | RESOLVED | FR-033 and NFR-013 (462a910) now match the code. "N more" needs the same first record and more rows, and the cursor does not decide it. Another first id gives "{loaded} of {total} records loaded". An unchanged first id, cursor and row count gives silence. |

Fresh sweep (`git diff b122f8b..tip`, excluding kitty-specs): `flex-wrap` on `[data-ops-head]` is layout only and needs no grant. The test-only depth-aware comma split (c537816) and the removal of the unused `OPS_SEARCH_METHODS` constant left both lint and typecheck green. No new defect was found.
