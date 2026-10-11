# Pre-merge squad R1 findings (2026-10-11)

Four lens groups, report-only, on lane-i 9f66c2a. Profiles: architect-alphonso (boundary), reviewer-renata (contract), debugger-debbie (tests), frontend-freddy (a11y).

## R1 BOUNDARY (15 findings; what I checked and found clean is listed below)

Profile: architect-alphonso. I applied its directives on component boundaries, architectural coherence across components, and pattern selection. I reported only and implemented nothing.

**Found clean**
- **Layering.** `logic/ops-*` import only `defaults/`, `contract/types` and `logic/`. `defaults/ops-copy.ts` takes only a type from `logic/types.js`, which follows the lanes/files/staleness precedent. The part files are pure `html` of view-models: they register nothing and dispatch nothing, and both dispatches sit in `sk-ops-screen.ts`.
- **Barrel names.** No export name in `ops-copy.ts` or `logic/ops-*` collides with the `defaults/`/`logic/` barrels on main (55eea7a) or on #10 (`feat/drift-screen-10`).
- **css-alias ban.** The ban sits in `elementSyntaxRestrictions`, so `withoutClassBan`, `rawButtonOnly(...)` and every per-file override carry it. No aliased `css` import exists in main's or #10's `src`, so the ban does not interfere with the other screens.
- **no-io.** The gate is unchanged. The single `requestAnimationFrame` follows the `overflow-region.ts` precedent.
- **Data-driven gates.** Main's #7 data-driven config is clean on the Ops code. The Ops data-driven config is clean on #10's `src`.
- **Tag map and manifest.** `HTMLElementTagNameMap` is declared. `custom-elements.json` holds 12 fields (`project` included), 7 attributes and 2 events, which matches `surface-freeze.test.ts`.
- **Stylelint config.** The config enforces G-4, G-5 and G-6 correctly today; a direct Stylelint probe of 14 declarations agreed with the grants.

**3-way apply**
`git apply -3` of `0a1e4bd..lane-i` (with kitty-specs excluded) onto public origin/main 55eea7a, run in my scratch clone `boundary-apply`, leaves 35 conflicted paths. They are:
- the append-only registers, the README and the CHANGELOGs;
- the ESLint and data-driven configs and the selftest;
- 8 `gates/fixtures/data-driven/s15-*`/`s16-*` add/add collisions;
- the generated `fixtures.generated.ts` and `custom-elements.json`;
- `retry` and `wp-retry-union`, `surface-freeze`, `index.ts`, and the `contract/*` scripts.

- CODE-BOUNDARY-001 sev4 [CONFIRMED]: **Merged with main, the data-driven gate goes red on #7's code.** The Ops bare-word selectors S16.1 and S16.2 (`eslint.data-driven.config.mjs:150-153`; OPS_BARE_WORDS includes `text`, the `OpsEvidenceKind` member) fire on #7's markdown renderer, which compares markdown-it token types: `logic/markdown/model.ts:87` (`token.type === 'text'`), `model.ts:108` (`case 'text':`) and `render.ts:99` (`case 'text':`). `logic/markdown/` is not on the ALLOW_LIST. Probe: I extracted main 55eea7a's `packages/mission-ui/src` into my worktree and ran `eslint -c eslint.data-driven.config.mjs` (the lane-i config) over it. Result: exactly 3 errors, all S16.x Ops, in those 3 lines. #10's `src` gave 0. Remedy: **FORK**, one of:
  - (a) drop `text` from OPS_BARE_WORDS. Ops code never compares it; the evidence class is looked up through the `defaults/` table.
  - (b) put the Ops selectors in their own config block with `ignores: ['**/logic/markdown/**']`.
  - (c) refactor #7's markdown token types onto a constant. That touches merged #7 code and is not recommended.
- CODE-BOUNDARY-002 sev4 [CONFIRMED]: **The data-driven selector ids collide with #7 and #10.** Ops uses S15.1-5 and S16.1-4 (`eslint.data-driven.config.mjs:145-153`, `gates/data-driven.selftest.ts`, ALL_IDS), but main already holds #7's S15.1-5 and S16.1-11 with different meanings. #10 takes S17.1-7 (ui10 selftest). The fixture files `gates/fixtures/data-driven/s15-2..5`, `s16-1..4` come up as add/add conflicts in the 3-way apply; `s15-1-literal` only escapes by a different name. Probe: `git show origin/main:eslint.data-driven.config.mjs`, ui10's selftest, and the `git apply -3` status. Remedy: at the port, renumber Ops to S18 (anywhere) and S19 (shapes) in the config entries, the messages, ALL_IDS, every `toEqual(['S1x.y'])` and the fixture filenames (`s18-*`, `s19-*`). Fix the README data-driven row count in the same pass ("31 selectors" is already stale on main).
- CODE-BOUNDARY-003 sev4 [CONFIRMED]: **The `sk-retry-load` Ops member is in the wrong union and widens the Work Package screen's type.**
  - Lane-i adds `OpsPageRetryDetail` to `RetryLoadDetail` in `logic/wp-retry.ts:18-32`. It widens `retryDetail` to take `'ops-page'` and return null (`wp-retry.ts:48-49`, a dead branch for the WP screen), puts `opsRetryDetail` in the WP module (`:58`), and types the Ops screen's event with the WP screen's `SkRetryLoadDetail` (`sk-ops-screen.ts:13`, `@fires`, manifest `"CustomEvent<SkRetryLoadDetail>"`).
  - On main, #7 moved the payloads to the neutral `src/retry-types.ts`. That file keeps `RetryLoadDetail` (WP plus Projects) and adds the separate event union `RetryLoadEventDetail = RetryLoadDetail | SkArtifactRetryDetail`. `retryDetail` there is narrowed to `WorkPackageRetryMember['target']`.
  - #10 follows the same per-screen pattern (`SkDriftRetryLoadDetail`).
  - As written, merging the lane either reverts #7's narrowing or fails typecheck: `wp-retry-union.test.ts` calls `retryDetail('ops-page', …)`. It would also put `ops-page` into the Work Package and Projects screens' public detail type.

  Probe: I read main's `retry-types.ts` and `wp-retry.ts` and diffed lane-i's; the 3-way apply conflicts in `wp-retry.ts` and `wp-retry-union.test.ts`. Remedy:
  - In `retry-types.ts`, declare `OpsPageRetryDetail` and `export type SkOpsRetryDetail = OpsPageRetryDetail`, and append it to `RetryLoadEventDetail` only.
  - Revert the `wp-retry.ts` changes, and move `opsRetryDetail` to a `logic/ops-*` module.
  - Make the screen's `@fires {CustomEvent<SkOpsRetryDetail>}` and export it from `index.ts` beside `SkArtifactRetryDetail`.
  - Regenerate the manifest, and rewrite `wp-retry-union.test.ts`, `ops-retry-union.test.ts` and the surface type test.
- CODE-BOUNDARY-004 sev3 [CONFIRMED]: **The surface-freeze test pins conflicting exact declarer lists.** Lane-i's new test asserts `declarersOf('sk-retry-load')` equals `['sk-ops-screen','sk-work-package-screen']` (surface-freeze.test.ts, the "names the declarers of the two shared events" test). Main's Projects block asserts `['sk-artifact-screen','sk-open-project-dialog','sk-projects-screen','sk-work-package-screen']` with `retryDeclarations === 4` (main surface-freeze.test.ts:362-366). Both have to become 5 after the merge, and 6 with #10. Probe: read both, and the 3-way apply (UU). Remedy: keep ONE exact declarer list in a single place (main's block), extend it with `sk-ops-screen` and bump the count. Delete the duplicate Ops assertion, and reword the Ops "nine events" test to state the shared names only.
- CODE-BOUNDARY-005 sev3 [CONFIRMED]: **The badge grants leak between the row and page files at run time, and their selectors are not really confined.**
  - The row badge (`ops-row-parts.ts:163`) and both page pills (`ops-page-parts.ts:165,189`) carry the same `data-ops-badge`. All three part sheets are adopted into one shadow root (`sk-ops-screen.ts` static styles).
  - So the row's E-40 badge rule `[data-ops-badge]::part(tag)` (`ops-row-parts.ts:57-71`: `display:block`, `padding-block`, ellipsis triplet), and the five status-tone border rules, also apply to the "Read only" and count pills.
  - Going the other way, the page's G-3 rule `sk-pill-tag[data-ops-badge]::part(tag)` (`ops-page-parts.ts:88`, specificity 0,1,2) out-specifies the row rule (0,1,1). That sets the row badge's `font-weight`, so the row's `font-weight: inherit` is dead code.
  - `ops-part-selectors.test.ts` (a), (c), (g) and (h) parse each file's source on its own and cannot see this cascade, so the "leak-tested against the sibling parts" claim does not hold.

  Probe: a vitest browser probe in my worktree (since deleted) found the count pill's tag part at `display: block`. The control was a bare `sk-pill-tag` at `flex`. With `data-ops-badge` removed from the count pill, it went back to `flex`, which proves the row-file rule styles a page-file pill. Remedy:
  - Give the page pills their own attribute (e.g. `data-ops-page-badge`), or scope the row rules to `[data-ops-row] [data-ops-badge]`.
  - Pin the new names in `ops-part-selectors.test.ts`.
  - Add a computed-style test that sets the page's grant values apart from the row's.
  - Re-run the visual run for OP-01/15-18 (the pill display may change).
- CODE-BOUNDARY-006 sev3 [CONFIRMED]: **The Ops bare-word gate is weaker than #7's equivalent landed alongside it.** Ops S16 covers only comparison and case-label shapes. #7's S16.5-S16.11 also catch an `includes`/`indexOf`/`lastIndexOf` argument, an array receiver, a Map/Set `get`/`has` argument, computed keys and computed reads; that set was closed at #7's WP03 review. Probe: `['open', 'closed'].includes(s)` and `m.get('failed')` pass the lane-i data-driven config; only the literal `'abandoned'` was flagged (S15.1). Remedy: when renumbering (002), give the Ops bare words the full #7 shape set and add self-test cases for each shape.
- CODE-BOUNDARY-007 sev2 [PLAUSIBLE]: **R-ops-1 duplicates rules that already apply to these files.**
  - R-ops-1.a (`eslint.config.mjs`, `opsPartsRestrictions`) repeats the global `unsafeHTML|unsafeSVG|unsafeStatic` entry that is already in `elementSyntaxRestrictions` (base `eslint-rules/index.mjs:51`).
  - After the merge, R-ops-1.c and .d (innerHTML) repeat #7's R3, which is spread into the same Ops override through `elementSyntaxRestrictions`.
  - The result is two reports per violation, and two message families to keep in step. R-ops-1.e is a regex text match, while #7's own-id R4 rule `sk/markdown-template-attributes` already refuses `.href=` and `?href=` structurally.

  Probe: I read both configs; I did not run them together. Remedy: keep only R-ops-1.b and .e (or replace .e by applying R4 to `sk-ops-screen/*-parts.ts` with a reviewed name list), and keep the plant on .e.
- CODE-BOUNDARY-008 sev2 [CONFIRMED]: **A pinned literal that no ruling covers.** `font-variant-numeric: tabular-nums` is pinned in both E-40 blocks (`stylelint.config.mjs`, row and page entries). It is used at `ops-row-parts.ts:48,68` and `ops-page-parts.ts`. The CP-1 ruling says E-40 has "one pinned literal, `line-height: 1.5`", and G-1..G-6 do not mention it. Probe: `grep -n tabular kitty-specs/ops-screen-01M4C92P/**/*.md` returns nothing. The row E-40 block comment also leaves out G-1 (`border-block-end`) and G-2 (`1.2`), even though both are in its `properties` and `values`. Remedy: record it as a ruling (G-7, with the operator's narrow-grant standing preference cited) in the tracer and `gates.md`, or drop it. Bring the E-40 block comment up to date with G-1 and G-2.
- CODE-BOUNDARY-009 sev2 [CONFIRMED]: **G-4, G-5 and G-6 have no Stylelint scope proof, and G-5 is filed under the wrong id.** `scripts/stylelint-exceptions.test.mjs` CASES cover E-40 (twice), E-42 and E-43 only; the precedent is that every exception is proven to pass in scope, to fail out of scope, and to still reject its near misses. G-4, G-5 and G-6 have no such case for `dashed`, `line-height: 1.3` or the state file's `overflow-wrap: anywhere`. G-5 is registered as `id: 'E-42'`, but the value it grants (`anywhere`) is E-43's, and it cites E-21's sunset. Probe: a direct Stylelint run shows the config is correct today: `1px dashed red`, `line-height: 1.2`, `font-weight: 700` and `white-space: nowrap` fail in `ops-state-parts.ts`. No test pins that. Remedy: add CASES for G-4, G-5 and G-6 and give G-5 a consistent id and sunset, either "E-43 (G-5)" with E-43's sunset or a recorded reason.
- CODE-BOUNDARY-010 sev2 [CONFIRMED]: **Grant numbers collide with #10.** #10 names its fidelity grants G-1..G-10 under E-35..E-37 (ui10 `scripts/stylelint-exceptions.test.mjs:565-606`, `drift-part-selectors.test.ts`; "G-4" there is the drift pill rule). Ops names G-1..G-6 with other meanings in the same shared files, and registers bare `'G-4'` and `'G-6'` as exception ids. After both land, "G-4" is ambiguous in `stylelint.config.mjs` and in the scope-proof test. Probe: `git grep 'G-[1-6]'` on `feat/drift-screen-10`. Remedy: qualify the Ops grants at the port (e.g. ids `E-40 (G-4)` and `E-40 (G-6)`, or an `OG-n` prefix) and in every comment and test message.
- CODE-BOUNDARY-011 sev3 [PLAUSIBLE]: **The `proof (visual)` timeout breaks the 70% rule after the merge.** Main (55eea7a) has 255 baselines. #7's last green PR run took 30m44s for `proof (visual)` against a timeout of 47; Ops adds 36 baselines. Linear projection: about 35.0 min, which is 74% of 47 and over the 70% rule recorded in `gates.md`. The `visual` job projects to 15.7 of 28 (56%), which is fine. Lane-i does not touch `ci.yml`. Probe: the `ci.yml` matrix and `gh run view 38125645187` job times; the projection itself is not measured. Remedy: at the port, raise `proof (visual)` to at least 50 min (about 58 or more if #10 lands first), then re-derive the value from the PR's own CI run.
- CODE-BOUNDARY-012 sev2 [CONFIRMED]: **An exported helper nothing uses.** `opsLoadedText` (`logic/ops-text.ts:58`) is exported through `logic/index.ts`, but only tests call it. `lookAnnouncement` (`:93`) calls `loadedAnnouncement` directly. Probe: `grep -rlw opsLoadedText src` finds 1 file (the definition only). Remedy: delete it and its test, or route `lookAnnouncement` through it.
- CODE-BOUNDARY-013 sev2 [CONFIRMED]: **The public surface has gaps and the surface test overclaims.**
  - `src/index.ts:95` exports `OpsRowView` (an internal view-model, which now becomes frozen public surface). Its member types (`OpsFact`, `OpsEvidenceDisplay`, `OpsFactKind`) are not exported, so a consumer can hold the type but cannot name its parts.
  - The surface test "exports … the Ops copy from the package entry" imports `OPS_COPY` and `CURSOR_REFUSAL_CODE` from `../src/defaults/index.js`. The entry exports no `defaults`, so the claim is false.
  - `OpsLabelHooks.copy(key: string)` has an untyped key, because `OpsCopyKey` is not public.

  Probe: I read `index.ts`, `ops-text.ts:19-30` and the test. Remedy: drop `OpsRowView` from the entry (parts are private), or export its members. Rename the test, or actually export the copy keys (`OpsCopyKey`) from the entry if hosts are meant to override copy.
- CODE-BOUNDARY-014 sev2 [CONFIRMED]: **Generated files must be regenerated at the port, not hand-merged.** The 3-way apply conflicts in `src/contract/fixtures.generated.ts` and `custom-elements.json`. Lane-i's `generate.mjs` change (escaping bidi characters) applies to every fixture. Main's fixtures hold no raw bidi characters (I counted 0), so that change is safe. Probe: `git apply -3` status, and a scan of main's fixtures. Remedy: resolve both by running `contract:generate` and `manifest:generate` on the merged tree, then `contract:check --require-main` and `manifest:check`. Never take "ours" or "theirs".
- CODE-BOUNDARY-015 sev1 [CONFIRMED]: **Duplicated type and stale docs.**
  - `elements/sk-ops-screen/fixtures.ts:64` redeclares `OpsScreenStatus` instead of importing it from the screen, which risks drift.
  - The README and both CHANGELOGs say "Exceptions E-40, E-42 and E-43", but G-4 and G-6 are registered as their own Stylelint ids.

  Probe: I read the files. Remedy: change it to `import type { OpsScreenStatus }` and list the G grants (or their qualified ids from 010) in the README and the CHANGELOG.

### Summary
- **Merge blockers with public main (fix at the port):**
  - 001: the Ops bare word `text` turns the data-driven gate red on #7's markdown files (FORK).
  - 002: S15/S16 collide with #7, and #10 takes S17, so Ops moves to S18/S19.
  - 003: the `ops-page` member must move to `retry-types.ts` as `RetryLoadEventDetail | SkOpsRetryDetail`, and the `wp-retry.ts` widening must be reverted.
- **Seams:**
  - 004: the surface-freeze exact declarer lists conflict.
  - 005: the badge grants cascade across files through the shared `data-ops-badge` (measured).
  - 006: the Ops gate is weaker than #7's.
  - 007: R-ops-1 duplicates existing rules.
- **Grants:** an unrecorded `tabular-nums` literal (008), G-4/5/6 without scope proofs and G-5 under the wrong id (009), and the G-n names colliding with #10 (010).
- **Other:** `proof (visual)` projects to 74% of its timeout (011), a dead `opsLoadedText` (012), entry-surface gaps (013), generated files to regenerate (014), and a nit (015).
- **Clean:** layering, barrel names, the css-alias ban (no effect on other screens), no-io, the tag map and the manifest counts.

## R1 CONTRACT (8 findings; checked and clean: resolveOpsLook order and exact-equality mismatch (FR-032); the sk-load-more guards (look ready, hasNextPage, cursor non-null, not loadingMore, requestedCursor memo reset on loadingMore/items/pageInfo); sk-retry-load payloads for the error look ({target:'ops-page'}), load-more error ({target,cursor} from pageInfo.nextPageCursor, inert/disabled when null) and refused cursor (no cursor); the union extended in wp-retry.ts, not redeclared; bubbles/composed and @fires once each; announcements (first render silent by design, loading only for reason `status`, mismatch silent, error look not duplicated, "N more" only after rows grow, singular "1 of 1 record loaded" and "1 more record loaded"); D-09 focus (capture in willUpdate, move only when the node is detached and focus fell to the body; data-focus-target on every look's heading); FR-003 header and source notice drawn in every look via renderOpsFrame; project null draws no line; the part files hold no copy (grep for literals came up empty); `lookup` uses Object.hasOwn; skipped singular and plural; count badge "{loaded} of {total}", "{n} record(s)"; unknown outcome, closer, mode and evidence kind render raw with the neutral tone; the error body falls back to the generic text for unknown or null codes (CP-1); evidence is a text binding inside bdi with no loading element; the manifest has twelve fields, seven attributes and two events, matching the surface-freeze test; the Ops fixtures use synthetic ids, example.org addresses, inert hostile text and no absolute paths, usernames or e-mails; the actor handles stay within SYNTHETIC_ACTORS and contract:check checks them)

- CODE-CONTRACT-001 sev3 [CONFIRMED]: The omitted-evidence hardening covers only `evidence`. `buildOpsRow` (`packages/mission-ui/src/logic/ops-row.ts:67` uses `== null`) compares every other optional-looking field with `=== null` / `!== null`: actor at :61, completedAt at :63, missionId at :81, wpId at :82 and closedBy at :84. When one of these is omitted (undefined) the row draws a term with a BLANK value, and two facts appear that must be absent. A missing `actor` gives a blank Actor, where FR-014 and the edge case say "never blank". A missing `completedAt` gives a blank Completed. A missing `missionId` or `wpId` draws an empty "Mission" or "Work Package" fact (OQ-1 says absent when null). A missing `closedBy` draws an empty "Closed by" fact. A missing `outcome` passes the status word "closed" to `labels.outcome` instead of `labels.status`. Probe: a vitest browser probe in my own worktree omitted each field from `opsClosedByAgent`. buildOpsRow gave `["Actor",undefined]`, `["Mission",undefined]`, `["Work Package",undefined]`, `["Completed",undefined]` and an extra `["Closed by",undefined]`. The rendered screen showed `"Actor"` and `"Mission"` with no value. Remedy: compare with `== null` (or `?? null` at entry) for actor, completedAt, missionId, wpId, closedBy and outcome, as for evidence. Add one omitted-field test per field next to the evidence one, and fix the CHANGELOG line to match (see 005).

- CODE-CONTRACT-002 sev3 [CONFIRMED]: Empty look with a profile AND skipped records produces a run-on sentence: `packages/mission-ui/src/logic/ops-text.ts:69` joins `emptyProfile` ("No records for this profile", no full stop, `defaults/ops-copy.ts:52`) and the skipped sentence with a single space. Then `renderOpsEmpty` (`ops-state-parts.ts`) draws the profile `<code>` AFTER the skipped sentence, so the profile is separated from "for this profile". The test pins the defect: `test/ops-text.test.ts:71` expects `` `No records for this profile ${SKIPPED5}` ``. No story covers profile + skipped (OP-20 has no profile, OP-21 no skipped count), so the operator's Storybook review never saw it. Probe: `opsEmptyText('p-1', 1, null)` returned `"No records for this profile 1 record in this project could not be read and is not shown."`. Remedy: end the profile wording with a full stop, or join with ". ". Draw the profile code directly after the headline, before the skipped note. Update the test, and add an OP-20/OP-21 combined interaction test.

- CODE-CONTRACT-003 sev2 [CONFIRMED] FORK: The header tail copy `headerSupportingTail: 'local invocation records'` (`defaults/ops-copy.ts:18`, used at `sk-ops-screen.ts:222`) is not in `contracts/defaults.md` or the tracer. Its only record is the WP06 review-cycle-2 fix ("orchestrator ruling"). "local" is also the one word DO-3 and OQ-6 removed from the loading label: the prototype's "Reading local invocation records" became "Reading invocation records" (FR-026) to keep the copy host-neutral. Evidence: git grep finds the tail only in ops-copy.ts, tests and `tasks/WP06-paging-and-notices/review-cycle-2.md:22-23`. Options: (a) keep "local invocation records" (prototype words; the operator approved Storybook) and add the key to contracts/defaults.md and the tracer as a recorded ruling; (b) make it host-neutral ("invocation records") for consistency with DO-3, which changes the OP-01..OP-37 header baselines.

- CODE-CONTRACT-004 sev2 [CONFIRMED]: Contract documents are stale against the frozen surface and the rulings:
  - `contracts/sk-ops-screen.md` says "Eleven properties as in `data-model.md`".
  - `data-model.md`'s property table has no `project` row, although the tracer's project-property ruling re-froze the surface at twelve. The surface test (`surface-freeze.test.ts:276`) and the manifest have twelve.
  - spec FR-001 still says "eleven properties".
  - `contracts/defaults.md` lacks the singular keys `countAllOne`, `announceLoadedOne` and `announceMoreOne`, and the `quietCompletedClosed` key.
  - The source file's header comment (`defaults/ops-copy.ts:1-5`) still says "PROVISIONAL until the operator's Storybook review" and "This module is NOT exported from `defaults/index.ts` here". Both are false: the review approved it, and `defaults/index.ts` now has `export * from './ops-copy.js'`.

  Remedy: add `project` to data-model.md, say "twelve" in contracts/sk-ops-screen.md (and annotate FR-001), add the missing keys to contracts/defaults.md, and rewrite the ops-copy.ts header comment. If kitty-specs is already frozen on main, amend only the source comment.

- CODE-CONTRACT-005 sev2 [CONFIRMED]: CHANGELOG accuracy. `packages/mission-ui/CHANGELOG.md` says "an unknown ... refusal code shows its raw text", which is false. `opsErrorText` (`logic/ops-text.ts`) maps an unknown code to the generic `errorBody` (FR-027 and the CP-1 copy ruling); the code appears only in the invisible `data-error-code` attribute. The same file's "Eleven properties (... `labels`) plus `errorMessage`" reads as eleven, when the surface is twelve. "draws a quiet 'Not recorded' when `evidence` is omitted" is half-true: an omitted evidence on an open Op draws "Not recorded yet". The spec is inconsistent on the refusal-code point: the edge-case list and OP-26 say "raw word" for a refusal code, while FR-027 and CP-1 say generic text. Remedy: change the CHANGELOG to "an unknown or null refusal code shows the generic error sentence", say "twelve properties", reword the omitted-evidence line, and annotate the spec's edge case and OP-26 with the CP-1 ruling.

- CODE-CONTRACT-006 sev2 [CONFIRMED]: The README gate table was not updated for the data-driven extension. The `Gate: data-driven` row (README.md, Gates table) still reads "31 selectors, a self-test with 36 positive fixtures" and lists only phase, lane and status words. This mission took `SELECTOR_ENTRIES` from 40 to 49 (S15.1-5 and S16.1-4, `eslint.data-driven.config.mjs`), added the s15/s16 self-test fixtures (`gates/fixtures/data-driven` now holds 55 `s*` files) and added the Ops vocabularies. Evidence: `git show 0a1e4bd:eslint.data-driven.config.mjs` reports "alternative (40)" and HEAD reports 49. The README count was already stale at the base. Remedy: update the row to the real selector and fixture counts, and name the Ops vocabularies (or drop the counts and point at the config).

- CODE-CONTRACT-007 sev2 [CONFIRMED]: FR-034 and the implementation differ on the load-more error retry. FR-034 says that after Load more "focus stays on or returns to the control (or its replacement)". When the host answers a "Try again" by clearing `loadMoreError` and setting `loadingMore`, the retry button is removed and a busy Load more appears. D-09 (`sk-ops-screen.ts:376-392`) then sends focus to the section heading, not to the replacement Load more. The tracer's CP-1 "Focus (S-O4)" paragraph rules the heading fallback, so the spec text is the stale side. Evidence: code read of `updated` and `moveFocusIntoView`, and the tracer CP-1 Focus paragraph. Remedy: amend FR-034 to drop "(or its replacement)" and cite CP-1 S-O4. Otherwise (a FORK, if the operator prefers the spec) focus `[data-load-more]` before falling back to the heading.

- CODE-CONTRACT-008 sev1 [CONFIRMED]: Edge cases in the header line:
  - A `project` whose `name` is `''` gives the supporting line `" · local invocation records"` with a leading separator (`sk-ops-screen.ts:222`). The empty-string guard in `renderOpsFrame` (`ops-page-parts.ts`) never fires, because the string is never empty.
  - `HEADER_SEPARATOR` is imported from `defaults/missions-copy.ts`, so the separator is the one piece of header copy that `labels.copy` cannot reword.
  - `OpsScreenStatus` is declared twice: in `sk-ops-screen.ts` and again in `elements/sk-ops-screen/fixtures.ts`.

  Remedy: draw no line (or only the tail) when `project.name` is empty; leave the separator shared, but note it; import the type in fixtures.ts instead of redeclaring it.

Synthetic-data note (no finding): the Ops fixtures carry the public spec-kitty built-in profile ids (`reviewer-renata`, `python-pedro`, `architect-alphonso`), the agent handles `claude`, `codex` and `operator`, and one relative repository path, `src/specify_cli/status/models.py`. These come from the contract's own examples, all public upstream, and none is from a private workspace. No absolute path, username, e-mail or real Mission slug was found in fixtures.ts, the overlays, the generated Ops fixtures or the stories.

Summary: 8 findings, none blocking. The two real defects are 001 (only `evidence` handles an omitted field: an omitted actor, completedAt, missionId, wpId or closedBy draws blank or spurious facts) and 002 (the empty look with profile plus skipped renders a run-on sentence, pinned by a test and never shown in a story). 003 is a FORK on the undocumented "local invocation records" header tail. 004 to 007 are documentation drift: the contract docs still say eleven properties, the CHANGELOG's refusal-code claim is false, the README data-driven counts are stale, and FR-034 conflicts with CP-1 focus. Events, look resolution, announcements, focus, the copy location, plurals and the synthetic data are otherwise clean.

## R1 TESTS (9 findings; checked and found clean: no skip/only/todo/fails in any Ops test; the emit tests use exactly-one + toEqual detail + bubbles/composed/cancelable (expectOne); the loops over derived collections carry pinned counts (47 copy keys, 36 fixtures, 29 rows, 200, 8); no fake timers, no Date/Intl in product time code; the full unit suite is green (89 files, 1524 tests) and the Ops files are green under 3 shuffle seeds; perf headroom is about 7x (200 rows median 22 ms against 200; 1000 rows 68 ms against 500; append 17 ms) so flake risk under load is low; tier and state-card geometry bites (container 696/588 mutants KILLED, heights built from measured blocks plus pinned 48/1/16 inputs, no font-dependent pixel literals); visual spec fails on missing AND orphan baselines; the SAME_LOOK distinctness groups match the real hashes (op-22/35/36, op-19/37); ops-page-parts and ops-state-parts markup mutants 11/11 KILLED)

Mutation tally (own worktree, full unit suite for every survivor): 81 behavioural mutants in ops-time, ops-row, ops-text, ops-look, sk-ops-screen, ops-page-parts and ops-state-parts. 68 KILLED and 13 SURVIVED. Of the 13 survivors, 8 are equivalent or unobservable, and 5 are real (findings 001 to 004). A further 14 pixel-CSS mutants in ops-row-parts: 7 survived the unit suite (tone border colour swap, fact column ratio, gaps, pill padding, label size, quiet colour). Only the CI visual gate (repeat-each=5) catches them, by design. That is not a unit finding.

- CODE-TESTS-001 sev3 [CONFIRMED]: A load-more error is announced again on EVERY later update while it stays shown. The guard `errorKey !== previous.errorKey` at packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.ts (announcementText) can be deleted and the whole suite stays green. The "same shown pair re-rendered announces nothing" test (test/sk-ops-screen.announce.test.ts:209-233) runs only with `loadMoreError: null`. Probe/evidence: the mutant `if (errorKey !== null && errorKey !== previous.errorKey)` -> `if (errorKey !== null)` SURVIVED the full suite (89 files). Remedy: repeat the `same` loop of :209 on a screen mounted with `loadMoreError: { code: null }` (and with CURSOR_REFUSAL_CODE): each unrelated change (totalCount, loadingMore, labels, skippedCount) must give `w.count() === 0`. Keep the existing positive control.
- CODE-TESTS-002 sev3 [CONFIRMED]: The `labels.closer` hook is untested. FR-038 says the closer wording is overridable through `labels`. Deleting `labels?.closer?.(item.closedBy) ??` at packages/mission-ui/src/logic/ops-row.ts:87 leaves every test green, and no test file calls a `closer` hook (grep `closer:`/`closer(` over test/ finds only the vocabulary table test). Probe/evidence: the mutant SURVIVED the full suite. Remedy: in test/ops-row.test.ts, add a case with `labels = { closer: (w) => w === 'doctor_sweep' ? 'Swept' : undefined }`. Assert the Closed-by fact value is 'Swept', with a paired undefined-return fallback to the table word. Also assert that a non-drawn closer (agent) stays hidden even when the hook returns a word, since `closer.drawn` gates before the hook.
- CODE-TESTS-003 sev3 [CONFIRMED]: A midnight carry is not tested in formatUtcInstant. packages/mission-ui/src/logic/ops-time.ts:43 `minutes >= MINUTES_PER_DAY` -> `>` SURVIVED test/ops-time.test.ts and the full suite. Under the mutant, `2026-02-28T23:30:00-00:30` prints "28 Feb 2026, 24:00:00 UTC" instead of "1 Mar 2026, 00:00:00 UTC". A second survivor: `month < 1` -> `month < 0` (line 26). Under it, `2026-00-01T00:30:00+01:00` returns "31 Dec 2025, 23:30:00 UTC" instead of null. Probe/evidence: both mutants were run in the vitest batch, and both outputs were checked by running the original and mutated copies with `node --experimental-strip-types`. Remedy: add exact-equality cases for an offset landing exactly on 24:00 (forward carry to the next day, month and year: `2026-12-31T23:30:00-00:30` -> "1 Jan 2027, 00:00:00 UTC") and for month 00 with a negative-carry offset (-> null).
- CODE-TESTS-004 sev2 [CONFIRMED]: The refusal-code lookup in opsErrorText is unobservable. OPS_ERROR_BY_CODE maps `ops_unreadable` to `errorBody`, the same key as the fallback. So `return copyResolver(labels)(key ?? 'errorBody')` -> `('errorBody')` (packages/mission-ui/src/logic/ops-text.ts:208) SURVIVED the full suite. test/ops-text.test.ts:89-91 expects errorBody for every code. The table is a module constant, so no test can inject a distinct key. This also drifts from the spec: spec.md FR-027 says "`ops_unreadable` has its own sentence", while contracts/defaults.md:27 and tracer-design-decisions.md:67 give it the generic body. FORK: (a) keep one body: amend FR-027, and either drop the lookup or make the table injectable (the vocabulary parameter, as buildOpsRow has) so a test can prove the code path; (b) give `ops_unreadable` its own copy key: the test then distinguishes it.
- CODE-TESTS-005 sev3 [CONFIRMED]: The Ops story-catalogue tests never run in CI, including the row-to-story parity test and the baseline-distinctness test (the only guard that a story did not silently collapse into another's look). scripts/ops-story-catalogue.test.mjs is wired only into `test:terminology` (package.json:37). `test:terminology` appears in no job of .github/workflows/ci.yml. The hygiene job runs `pnpm hygiene && pnpm test:scripts`, and `test:scripts` lists scripts/terminology.test.mjs but not the catalogue tests. The same gap already existed for wp-story-catalogue.test.mjs and visual-tags.test.mjs (#5). This mission's WP09 brief allowed either script. Probe/evidence: `pnpm test:terminology` passes locally (314 pass, 0 fail), and a grep of ci.yml finds no terminology or story-catalogue reference. Remedy: add `scripts/ops-story-catalogue.test.mjs` (and the two older catalogue tests) to `test:scripts`. Note that ci.yml stays unchanged, so the gate-proof `ciCommand` binding is unaffected. FORK on whether to fold in the pre-existing #5 tests too: (a) fold all three now, (b) Ops only plus a ledger entry.
- CODE-TESTS-006 sev3 [CONFIRMED]: Selector confinement (c) is fooled by an interpolated css fragment, and neither Stylelint nor ESLint catches it either. Planting `const OPS_BOLD = css\`font-weight: var(--sk-weight-bold); line-height: 1.2;\`;` and `[data-ops-cell] h2 { ${OPS_BOLD} }` in ops-page-parts.ts passes test/ops-part-selectors.test.ts (20/20), `stylelint` and `eslint`. The rules() regex `([^{}\`;]+)\{([^{}]*)\}` (test:32) splits `${` so the host rule is never parsed. The bare-declaration fragment has no braces, so it is not a rule at all. Stylelint scopes by file only, so the granted properties pass in the page file. The same plant WITHOUT interpolation is KILLED by (c) and (g) (positive control). Probe/evidence: mut.py plant runs P1 (SURVIVED test and lint) and P1c (KILLED). Remedy: in ops-part-selectors.test.ts, fail closed on any `${` inside a `css` template of the Ops part files, and on more than one `css\`` template per file. An alternative is an ESLint no-restricted-syntax rule for TemplateLiteral expressions inside a `css` TaggedTemplateExpression in OPS_PARTS_GLOB.
- CODE-TESTS-007 sev3 [CONFIRMED]: Block (h) scans only the FIRST css template of ops-row-parts.ts (`rowSource = fullRowSource.slice(indexOf('css\`') ...)`, test:417). A second css template appended after it, carrying `color`, `font-weight` and `background` on the unpinned `[data-ops-head]`, passes all 20 selector tests plus Stylelint and ESLint (E-40 grants those properties file-wide). Probe/evidence: plant P6 SURVIVED. Placed BEFORE the main template, it is killed only incidentally, because the slice then grabs the wrong template. Remedy: in (h), run leaks() over every `css\`` template of the file, or assert exactly one css template per Ops part file (one assertion covers 006 and 007).
- CODE-TESTS-008 sev2 [CONFIRMED]: E-43 confinement (b) is fooled by `!important`. Adding `overflow-wrap: anywhere !important;` to the existing `[data-ops-head]` rule of ops-row-parts.ts passes the selector tests and Stylelint, because E-43 grants `anywhere` file-wide and Stylelint compares the value without the flag. The (b) regex `/^overflow-wrap:\s*anywhere$/` is anchored, so the flagged form never matches. Positive control: the same declaration without `!important` is KILLED by (b). The value match is also case-sensitive (`ANYWHERE` is the same CSS keyword). Probe/evidence: plants P7 (SURVIVED) and P7b (KILLED). Remedy: match `/^overflow-wrap:\s*anywhere\b/i`, and add an `!important` plant to (b) and (e). The font/border shorthand route (`font:`, `border-top:` in the page file) also escapes (c), but Stylelint's property-allowed-list KILLS it (P3), so that one is covered by layering: no action needed, beyond a comment in the test saying it relies on Stylelint for shorthands.
- CODE-TESTS-009 sev2 [PLAUSIBLE]: The hostile-corpus negative check waits 150 ms (`mount`, test/sk-ops-screen.hostile.test.ts:71) before asserting 0 violations and 0 requests. Its own positive controls need 400 ms (:86, :109, :164) to prove the observers see an event. A late load or violation from the corpus would land after the assertion: a false green under load. Separately, the OP-36 story (sk-ops-screen.states.stories.ts:57) is byte-identical to OP-22 (loading plus a profile the loading look never shows), so its baseline adds no coverage for the "header and notice in each non-ready state" row. The SAME_LOOK list legitimises this, and the unit tests cover the other looks. Probe/evidence: read only, no timing probe run. Remedy: wait the same 400 ms (or poll until two consecutive frames bring no new resource entry) before the 0/0 assertions. Optionally give OP-36 the empty or error look so its baseline is distinct, or note in the story that it is the loading instance by design.

Profile directives applied (debugger-debbie): structural root cause over point fixes. Findings 006, 007 and 008 are one class, a regex CSS scanner that is not fail-closed. The single structural remedy is one assertion: one interpolation-free css template per Ops part file, with flag-tolerant value matching. Differential probing: every survivor was paired with a KILLED positive-control variant (P1/P1c, P7/P7b, P3 stylelint), and delta-style single mutants localised each survivor to one line. The five-paradigm swarm was not dispatched, because sub-agents are forbidden by the brief. The paradigms were applied serially, and no fix was implemented.

## R1 A11Y (9 findings; clean on the following)

The clean items below come from probes in vitest browser mode (Chromium, headless) on my own worktree at 9f66c2a. The worktree was removed afterwards.

**Tab order**
- Header, source notice, skipped note and rows add no stops.
- There is exactly one stop each for Load more, Try again, Refresh from the newest and the first-page retry.
- There is no trap.

**Modifier chords**
- Behaviour is native: Shift+Enter, Ctrl+Space and Shift+Space activate. Ctrl/Alt/Meta+Enter do not, which is Chromium's normal button behaviour.
- No custom key handlers.

**Focus visible**
- The sk-button token ring shows.
- The fallback heading shows the UA ring with `:focus-visible` true.

**Focus across Load more**
- Focus stays on Load more across the busy toggle and the page arrival (S-O4 holds).
- The D-09 fallback goes to the section heading on the last page and on a load-more error.
- Focus is NOT moved when it was outside the screen.
- First-page Retry moves focus to the loading heading, then to the section heading.

**Accessibility tree**
- Headings are h1 "Ops", h2 section, and the loading `role=heading` level 2.
- Rows have no link, button, tabindex, img or iframe (0 found across all 29 fixtures).
- All 51 `time` elements carry `datetime`.
- `bdi` wraps every item-derived text.
- Every badge carries a word.
- dd elements get no duplicate name or description from `title` (CDP AX tree).

**Live region**
- Load-more error: one announcer. The notice has `announce=off`, and the polite region speaks.
- Error look: the polite region is silent, and the alert inside sk-notice speaks.
- A mismatched page announces nothing.
- An empty to empty-ready change announces nothing.
- "N more records loaded" is announced on arrival.

**Forced colours and reduced motion**
- In forced colours, the badges keep a 1px solid border plus their text.
- With reduced motion, the busy cue and the indeterminate progress stop animating.

**Contrast**
- Light theme: muted text 6.76 and badges at least 5.22.
- Dark theme: muted text 7.45 and badges at least 5.87.

**Long evidence**
- The 512-char evidence wraps inside its row at 390/620/800/1280 at 200%.
- The screen causes no horizontal scroll at 200% at any width. The only overflow found is in the shell; see 009.

- CODE-A11Y-001 sev4 [CONFIRMED]: At a 200% root font size, the row and section container queries do not scale. Text gets ellipsized and badge words are clipped.
  - Cause: the queries are in px (`@container (max-width: 696px)` / `588px`, ops-row-parts.ts:145-155, ops-page-parts.ts:103-112). The text doubles, but the thresholds stay fixed.
  - At 1280 px the facts stay two columns at 200%. The dd cell is 111 px, so 191 of the dt/dd cells of 29 rows end in an ellipsis: every Started and Completed timestamp ("5 Oct 2026, 14:20:00 UTC" is 111/403 px), every Mission id, every Profile, 26 Mode values, and the term "Work Package" itself. At 100% only 2 are truncated, both long synthetic values.
  - At 800 px, 102 cells are truncated.
  - At 800 px, ALL 29 row status badges clip their word ("open" 85/90 px, "abandoned" 135/162). The badge is the text half of a text-not-colour pair, and its `title` is not reachable by keyboard or touch.
  - This is a loss of content under WCAG 1.4.4 (Resize text). NFR-004 only measured overflow, so it passes.
  - Probe/evidence: test/zz-probe-a11y2.test.ts (scratch). It mounts all 29 fixtures in shellFrame at 1280 and 800, at 100% and at 200%, and counts `scrollWidth > clientWidth` on dt/dd and on the badges' `part=tag`.
  - Remedy:
    - (a) Express the thresholds in rem: 43.5rem and 36.75rem. These equal 696/588 px at the 16 px default, so the prototype parity and the visual baselines are unchanged, and the thresholds scale with text.
    - (b) Give the row badge `flex-shrink: 0` (or `min-width: max-content`) in a non-stacked head.
  - FORK on whether the timestamp and id values may wrap instead of ellipsizing at large text. The E-42 ruling says "every other text ... uses the ellipsis triplet". The options are:
    - Keep the ellipsis, relying on (a).
    - Allow `white-space: normal` for the time and mono values.

- CODE-A11Y-002 sev3 [CONFIRMED]: The NFR-004 test is blind to this.
  - test/sk-ops-screen.a11y.test.ts "200 percent text" mounts `opsProps.longPage(6)` (short synthetic rows) only, at 1100 and 720.
  - It asserts only the document, shell and cell overflow. It never measures ellipsis truncation or badge clipping.
  - It never covers 390, 620, 800 or 1280, or the 512-char evidence.
  - So 001 passed review.
  - Probe/evidence: read the test, and probed as in 001.
  - Remedy: mount `Object.values(OPS_INVOCATION_FIXTURES)` at 390, 620, 800 and 1280 at 200%. Assert no row badge `part=tag` has `scrollWidth > clientWidth`, and that no Started or Completed dd is truncated. Add a positive control.

- CODE-A11Y-003 sev3 [CONFIRMED] FORK: Activating Load more is silent to a screen reader until the page arrives.
  - `sk-button busy` sets neither `aria-busy` nor `disabled` on the focused inner `<button>`. Probe: inner aria-busy null, disabled false.
  - `aria-busy=true` on the parent `li` (ops-page-parts.ts:195) is not announced.
  - The polite region does not change when `loadingMore` flips. Probe: no announcements. `announcementText` (sk-ops-screen.ts:180-190) ignores `loadingMore`.
  - This is the gap #10 found, with no local announcement added. The spinner is the only cue.
  - Probe/evidence: test/zz-probe-a11y.test.ts, "load more -> busy" and "loading more announces nothing".
  - Remedy: add a copy key such as `announceLoadingMore` ("Loading more records"). Announce it from `willUpdate` when `loadingMore` goes false to true in the ready look. Alternatively, set `aria-describedby` on a hidden busy sentence.
  - FORK options:
    - Add the announcement (a new FR-033 row and a copy key).
    - Accept a silent busy state and record it.

- CODE-A11Y-004 sev2 [CONFIRMED]: The Load more control is an `li` inside the records `ul` (ops-page-parts.ts:191-198), so the list reports one item more than the records shown. The AX tree has 30 listitems for 29 rows: screen readers say "list, 30 items" and count the button as a record. This mirrors the Missions screen (sk-missions-screen.ts:317), which is a precedent and not a justification.
  - Probe/evidence: `page.getByRole('listitem')` returned 30 with 29 items.
  - Remedy: render Load more after the `</ul>` in a `div[aria-busy]` wrapper, keeping the same spacing token. Alternatively, give that li `role="none"`, but a non-list child in a ul is worse.

- CODE-A11Y-005 sev2 [CONFIRMED] FORK: Focus goes to the section heading in two places where FR-034 suggests the replacing control.
  - When a load-more error replaces Load more, focus moves to the section heading, not to Try again. When Try again is activated and Load more returns busy, focus moves to the heading again, not to Load more.
  - FR-034 says that after Load more "focus stays on or returns to the control (or its replacement)". The contract's Focus section and plan D-09 send focus to the heading. The spec and the contract disagree.
  - The keyboard user is one Tab away either way.
  - Probe/evidence: zz-probe "load more -> error -> retry" logs `focus H2:Newest records` after the error and after the retry.
  - Remedy, FORK options:
    - (a) Keep the heading and reword FR-034 to drop "or its replacement".
    - (b) Move focus to `[data-retry]` when it replaces a focused Load more, and to `[data-load-more]` when it replaces a focused retry. The heading stays the fallback for the last page and for state changes.

- CODE-A11Y-006 sev2 [PLAUSIBLE]: A fallback focus move can cut off the polite announcement made in the same update.
  - The live text is written during render. `moveFocusIntoView` then focuses the heading one animation frame later (sk-ops-screen.ts:200-209).
  - NVDA and JAWS usually flush queued polite speech on a focus change. The load-more error sentence, or "N more records loaded" on the last page, may never be spoken, and the user hears only "Newest records, heading level 2".
  - Similarly, in the error look the alert speaks, and then focus lands on the h2 inside that alert, which repeats the heading.
  - Probe/evidence: the ordering was read and confirmed in the probe logs. No real screen reader was available.
  - Remedy: write the announcement after the focus move: set it in `moveFocusIntoView` after `focus()`, or delay it one frame. Option 005(b) also helps, because focus would land next to the error.

- CODE-A11Y-007 sev2 [CONFIRMED]: "Refresh from the newest" can complete with no announcement.
  - If the host replaces `items` and `pageInfo` and clears `loadMoreError` with the same row count, no announcement is made. The look stays `ready` and `rows` is unchanged, so `announcementText` returns null (sk-ops-screen.ts:186-187).
  - When `errorKey` goes from non-null back to null, nothing is announced either.
  - The refused-cursor notice disappears, the rows are entirely different, and the user hears nothing. Focus jumps to the heading, because the Refresh button was removed.
  - If the host goes through `status: 'loading'` first, this does not occur. The contract does not require the host to do so (FR-030: "the host restarts at the first page").
  - Probe/evidence: zz-probe "refresh same count" produced 0 new announcements.
  - Remedy: when `errorKey` clears in the ready look, announce the loaded text ("{loaded} of {total} records loaded"). Alternatively, document in the contract that the host must pass through `loading` on a restart.

- CODE-A11Y-008 sev2 [PLAUSIBLE]: The loading look's focus target sits inside `aria-busy="true"`.
  - The `role=heading` div that receives focus after a first-page Retry is inside `div[data-ops-state][aria-busy="true"]` (ops-state-parts.ts:86-88).
  - ARIA allows assistive technology to withhold a busy subtree; VoiceOver is known to. The focused heading may be read as nothing.
  - Probe/evidence: the DOM was read, and focus landing there was confirmed (probe "retry->loading focus DIV:Reading invocation records"). The AT behaviour was not probed.
  - Remedy: keep `aria-busy` off the subtree that contains the focus target, for example by moving it to the `<progress>`. The progressbar already conveys busy. Alternatively, drop it and rely on the "Loading invocation records" announcement. This needs a matching spec tweak of FR-026 and OP-22.

- CODE-A11Y-009 sev1 [CONFIRMED]: At 390 px with a 200% root font size, the page scrolls horizontally by 143 px.
  - The cause is the shell top bar (`div[data-brand]` and `div[data-top-bar-actions]` in sk-mission-shell), not the Ops screen. The bare screen gives 0.
  - This is out of this mission's scope. It is recorded so the 390 claim is not blamed on the screen.
  - Probe/evidence: zz-probe-a11y2 "all+shell" gave docOver 143, and "all bare" gave docOver 0.
  - Remedy: raise it against the shell (a separate issue or the ledger). No change here.

