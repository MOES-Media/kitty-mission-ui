---
work_package_id: WP13
title: Integration, baselines and wrap-up inputs (IC-11)
dependencies: [WP12]
requirement_refs:
- FR-037
- FR-038
- FR-041
- FR-043
- NFR-001
- NFR-002
- NFR-008
- NFR-010
- NFR-013
- SC-001
- SC-007
- SC-008
- SC-009
- C-006
- C-009
- C-011
- C-012
- C-008
- C-010
- NFR-007
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-08T08:13:33.039417+00:00'
subtasks:
- T087
- T088
- T089
- T090
- T091
- T092
- T093
- T094
phase: Phase 5 - Integration
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: apps/storybook/tests/visual/__snapshots__/
create_intent:
- scripts/artifact-story-catalogue.test.mjs
execution_mode: code_change
owned_files:
- apps/storybook/tests/visual/__snapshots__/**
- scripts/artifact-story-catalogue.test.mjs
- package.json
- .github/workflows/ci.yml
- README.md
- CHANGELOG.md
- packages/mission-ui/CHANGELOG.md
- packages/mission-ui/test/sk-artifact-screen.integration*.test.ts
role: implementer
---

# Work Package Prompt: WP13 - Integration, baselines and wrap-up inputs (IC-11)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Integrate. This is the ONLY work package that commits baseline PNGs: the 45 dark-theme baselines, each checked side by side against the prototype and the CP-1 entry. Also the row-to-story node test, the FR-037 shell check, the host-composition test (SC-009), five consecutive local `pnpm visual` runs in the pinned container, `pnpm gate-proof`, the re-derived timeouts, README and CHANGELOG, the drift review and the PR-description inputs.

## Context

Visual baselines are committed only here, as on #4 and #5, and only generated inside the pinned container (`pnpm visual:update` through `scripts/visual.sh`); every new PNG is Read and described; never hand-edit or copy a PNG. NFR-002 and SC-007 are evidenced by five consecutive local `pnpm visual` runs on an unchanged tip, all with 0 failures, recorded in the WP report (as #4 and #5 did); the green CI `visual` job (it repeats every story five times with `--repeat-each=5`) on the final tip is additional evidence, not a substitute. The wrap-up (accept, test cleanup, aggregate squad, history compaction into the named slices, rebase, full gate re-run, the operator's Storybook review, the DRAFT PR) belongs to the orchestrator; this WP only prepares its inputs.

Read first: `plan.md` section "IC-11" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-11. Requirements: FR-037, FR-038, FR-041, FR-043, NFR-001, NFR-002, NFR-008, NFR-010, NFR-013, SC-001, SC-007, SC-008, SC-009, C-006, C-009, C-011, C-012, C-008, C-010, NFR-007.
Requirements NFR-014 and NFR-015 (amendment A-7, accepted) are written into `spec.md` (CP-1 write-back item (7), 2026-10-07). They bind this work package as the plan's traceability table states: forced colors and reduced motion, and target size (a tab at least 36 px, a Work Package control at least 24 px of block size).

## Precondition (first step, before the first subtask)

**First step**: a full gate run on the merged tree (every gate command of the plan's gate set, `pnpm gate-proof` included) and a record of any pre-existing red against the WP01 baseline. If `main` moved since WP01, re-run `pnpm contract:update --sha` and repeat the freshness check, the visual runs and the baseline check on the re-pinned tree.

## CP-1 rulings binding on this work package (2026-10-07)

The operator's CP-1 rulings are complete and binding (verbatim in "Binding rulings" below; `plan.md`, "CP-1 rulings (2026-10-07)"). No PENDING CP-1 value remains. For this work package:

- **PR description inputs**: exceptions E-23 and E-25 to E-29 as ruled (values and sunsets), gaps G-14 (reworded) to G-21, amendments A-1 to A-9 (A-8a and A-8b accepted, A-10 not written), the markdown budget O3 values and the timing evidence, the accepted facts-look drift (DA-34, DA-28), and WebKit untested as an accepted open risk (Kitty Desktop on Linux runs WebKitGTK).
- The drift review is against the register DA-1 to DA-41 as confirmed at CP-1 (2026-10-07); baselines are committed here only.

## Subtasks

### Subtask T087: First step: full gate run on the merged tree

**Steps**:
1. Run every gate command (typecheck, lint, lint:styles, lint:no-io and test:no-io, lint:data-driven and test:data-driven, manifest:check, hygiene, test:scripts, contract:check, test:contract, test:terminology, test, build-storybook); class each red against the WP01 baseline as pre-existing or introduced.
2. Check whether `main` moved since WP01; if so, re-pin (out-of-map edit) and repeat.

**Files**: WP report

**Validation**: baseline classification recorded

### Subtask T088: Row-to-story node test

**Steps**:
1. `scripts/artifact-story-catalogue.test.mjs` (node:test, run by `test:scripts`; modelled on #5's `scripts/wp-story-catalogue.test.mjs` but DELIBERATELY added to `test:scripts` so CI runs it, a new CI behaviour not precedent, PLAN-FRESH4-010): reads the rows of the CP-1-amended spec, takes the 45 from the length of the pairing table in `fixtures.ts` with a guard that it equals the catalogue, normalises trailing letters, and runs against a temp copy with a row deleted to prove it fails. Add it to the root `test:scripts` script.

**Files**: `scripts/artifact-story-catalogue.test.mjs`, root `package.json`

**Validation**: green, and red against a temp copy with a row deleted

### Subtask T089: FR-037 shell check and host-composition test (SC-009)

**Steps**:
1. Every pre-existing baseline identical (including the shell stories that draw icons, which the two additive glyphs cannot change) and `sk-mission-shell.stories.ts` with an empty diff.
2. The host-composition test (SC-009): a host renders the screen passing only contract-shaped data, the Mission, the view states, `now` and labels, with no change to the screen and no I/O performed by it.

**Files**: `test/sk-artifact-screen.integration*.test.ts`

**Validation**: green

### Subtask T090: Generate and review the 45 baselines

**Steps**:
1. In the pinned container only: `pnpm visual:update` (through `scripts/visual.sh`, which fails rather than skips); the 45 dark-theme baselines of the state matrix at the tier each row names; `git status --short` shows only your own baselines added.
2. Read every new PNG and describe it (what is drawn, which width, anything wrong) and check it side by side against the prototype and the CP-1 entry; record the snapshot size and settle time of AV-30d and AV-30f (clip the 256 KiB story to its first screen only if warranted, reported).

**Files**: `apps/storybook/tests/visual/__snapshots__/**`

**Validation**: 45 new baselines, none hand-edited

### Subtask T091: Five consecutive visual runs and gate-proof

**Steps**:
1. Five consecutive local `pnpm visual` runs in the pinned container on an unchanged tip, all with 0 failures, recorded in the WP report; `pnpm gate-proof` green (the five plants of WP05 included); after the last tip, re-run every gate self-test on the final tree (a reviewer check).

**Files**: WP report

**Validation**: five runs, 0 failures each

### Subtask T092: Timeouts, scripts, documents

**Steps**:
1. Re-derive the other CI timeouts in `ci.yml` by #4's rule (WP05 already re-derived the `unit-tests` proof-leg timeout); reconcile root `package.json`; README and both CHANGELOGs (one line per slice: contract re-vendor and fixtures; markdown-it dependency; defaults, logic and gate cases; markdown model; renderer, corpus, lint rules and plants; exceptions, Stylelint grant and lint configuration; skeleton, layout and surface freeze; document pane; refusals and states; inspector, tree and Work Package links; tiers, accessibility and edge cases; integration and baselines); one `pnpm manifest:generate` only if the surface changed.

**Files**: `ci.yml`, `package.json`, `README.md`, `CHANGELOG.md`, `packages/mission-ui/CHANGELOG.md`

**Validation**: `pnpm manifest:check`, `pnpm hygiene` green

### Subtask T093: Drift review against the confirmed register

**Steps**:
1. Review every baseline against the drift register as confirmed at CP-1 (DA-1 to DA-41 as ruled); anything outside it is a REJECT item, not a design-review item. Record the review in the WP report.

**Files**: WP report

**Validation**: recorded

### Subtask T094: PR description inputs

**Steps**:
1. List for the orchestrator: the dependency record of FR-043 (`markdown-it` 15.0.2, MIT, the licences of its transitive set as printed by `pnpm why markdown-it`, the advisory query RE-RUN against both the repository list and the GitHub global advisory database, the measured bundle figure and the hostile-corpus evidence); exceptions as ruled; gaps G-14 to G-21; amendments as ruled; WebKit untested as an accepted open risk (Kitty Desktop on Linux runs WebKitGTK); timing. No absolute path or username anywhere.

**Files**: WP report

**Validation**: every FR-043 datum present

## Acceptance (all runnable)

1. Five consecutive local `pnpm visual` runs in the pinned container on an unchanged tip, all with 0 failures, recorded in the WP report (the green CI `visual` job is additional).
2. Every pre-existing baseline identical (FR-037) and `sk-mission-shell.stories.ts` with an empty diff.
3. The row-to-story test green and red against a temp copy with a row deleted; the host-composition test green.
4. `pnpm gate-proof` and `pnpm test:terminology` green on the integrated tree; the timeouts re-derived.
5. The drift review against the register as confirmed at CP-1 recorded; the PR description inputs listed.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

A gate failure that forces a source change is a reported change request, not an edit. Baselines generated outside the pinned container are invalid.

## Reviewer Guidance

Read every PNG beside the prototype. Count the baselines (45) and check no pre-existing PNG changed. Check the five runs are consecutive on one tip. Check the story-catalogue test is in `test:scripts`. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-11

#### IC-11 Integration, baselines and wrap-up inputs
- **Purpose**: Integrate; the BASELINES: the only WP that commits baseline PNGs (after the chains merge), each checked side by side against the prototype and the CP-1 entry by the reviewer; the row-to-story node test `scripts/artifact-story-catalogue.test.mjs` (a node:test file run by `test:scripts`, modelled on #5's `scripts/wp-story-catalogue.test.mjs`, which #5 runs under `test:terminology`, while this one is deliberately added to `test:scripts` so that CI runs it (PLAN-FRESH4-010): it reads the rows of the CP-1-amended spec, takes the 45 from the length of the pairing table with a guard that it equals the catalogue, normalises trailing letters, and runs against a temp copy with a row deleted to prove it fails); the shell check for FR-037 (every pre-existing baseline identical, including the shell stories that draw icons, which the two additive glyphs cannot change; `sk-mission-shell.stories.ts` empty diff); the host-composition test (SC-009); **NFR-002 and SC-007 are evidenced by five consecutive local `pnpm visual` runs in the pinned container on an unchanged tip, all with 0 failures, recorded in the WP report (as #4 and #5 did); the green CI `visual` job (it repeats every story five times with `--repeat-each=5`) on the final tip is additional evidence, not a substitute**; the snapshot size and settle time of AV-30d and AV-30f are recorded (clip the 256 KiB story to its first screen if the size or settle time warrants); `pnpm gate-proof`; `pnpm test:terminology` green over the integrated tree; the other timeouts re-derived; README and CHANGELOG reconciled; if `main` moved since IC-01a, re-run `contract:update --sha` and repeat the freshness check, the visual runs and the baseline check on the re-pinned tree; the drift review against the register as confirmed at CP-1; PR description inputs (the dependency record of FR-043 with the advisory query re-run against both sources (the repository list and the global database), exceptions as ruled, gaps G-14 to G-21, amendments, WebKit untested as an accepted open risk (Kitty Desktop on Linux runs WebKitGTK), timing). Depends on IC-10.
- **Relevant requirements**: FR-037, FR-038, FR-041, NFR-001, NFR-002, NFR-010, NFR-013, SC-001, SC-007, SC-009.
- **Affected surfaces**: `apps/storybook/tests/visual/__snapshots__/` (the 45 baselines), `scripts/artifact-story-catalogue.test.mjs`, root `package.json` (`test:scripts` entry), `.github/workflows/ci.yml` (the other timeouts), `README.md` and both `CHANGELOG.md`, `custom-elements.json` (the one regeneration, only if the surface changed), `contracts/spec-kitty/**` only if `main` moved (re-pin). No source file under `packages/*/src` unless a gate failure forces a reported change request.
- **Exit checks**: five consecutive local `pnpm visual` runs in the pinned container on an unchanged tip, all with 0 failures, recorded in the WP report (the green CI `visual` job is additional); every pre-existing baseline identical (FR-037) and `sk-mission-shell.stories.ts` with an empty diff; the row-to-story test green and red against a temp copy with a row deleted; the host-composition test green; `pnpm gate-proof` and `pnpm test:terminology` green on the integrated tree; the timeouts re-derived; the drift review against the register as confirmed at CP-1 recorded; the PR description inputs listed.
- **Depends on**: IC-10.

### From `plan.md`: shared-file rows that name IC-11

| File | Writer | Everyone else |
|---|---|---|
| `src/index.ts`, `custom-elements.json` | IC-06b (full public surface: 13 properties with attributes, `@fires` including the untrusted-`href` text of `sk-open-link`, all five literal `dispatchEvent` methods and payload builders); later only `pnpm manifest:generate` | a surface change is reported; IC-11 regenerates once; manifest conflicts resolve by regeneration only |
| `src/contract/**`, `scripts/contract/**`, `contracts/spec-kitty/**` | IC-01a only (bulk generators and `checkBulk` included; IC-11's final re-pin check is the one other writer, if main moved) | a missing fixture is a change request |
| `package.json` (root), `.github/workflows/ci.yml` | IC-11, except the named edits: IC-01a needs no `test:contract` edit (the script is a glob that already matches new test files); IC-01b adds `markdown-it` to `packages/mission-ui/package.json` and the lockfile; IC-04 adds `gates/markdown-lint.selftest.ts` to the `test:no-io` script, `scripts/bundle-budget.test.mjs` to `test:scripts` and re-derives the `unit-tests` proof-leg timeout in `ci.yml`; IC-11 adds `scripts/artifact-story-catalogue.test.mjs` to `test:scripts` and re-derives the other timeouts; IC-02 adds its test files if the globs need it | change request |
| `README.md`, both `CHANGELOG.md` | IC-11 | change request |
| `scripts/artifact-story-catalogue.test.mjs` | IC-11 | none |
| baseline PNGs | IC-11 only | none |

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-1** (`AV-33`, `AV-34`, `AV-35`, `FR-036`, `DA-33`; ACCEPTED; numbers ruled at CP-1, 2026-10-07: T = 45 rem (720 px), toolbar stack option C): the prototype's `.reading-layout` stays two columns down to a viewport of 800 px; the spec's "inspector under the toolbar at about 1100 px" misreads the prototype (at 1100 px only the shell changes tier). The rows become: AV-33 two columns at a 1100 px viewport (the shell's expanded tier edge; the spec's title "collapsed tier" is corrected to "expanded tier edge"), AV-34 one column with the inspector first at 800 px (the collapsed tier, content cell 688 px), AV-35 mobile at 620 px (the mobile tier, toolbar stacked, tables scrolling). The rule (PLAN-A11Y-001 (a)): two columns only from a content cell of at least 720 px, which the mobile tier (cell = viewport, below 720 px) can never reach; the 801 to 831 px viewport window of the collapsed tier (cell 689 to 719 px) shows one column where the prototype shows two, recorded as confirmed drift at CP-1 (DA-33). S-A6 samples 689, 719, 720, 732, 799, 800, 801, 831, 832, 1099 and 1100 px, recording for each viewport the one tier the shell selects and the content-cell width and fixes the numbers and the toolbar-stack threshold. Not taken: keeping 689 (a 419 px document column in the mobile tier) and a viewport media query at 800 px (contradicts FR-036).

- **A-2** (`FR-043`, `C-013`; ACCEPTED): `markdown-it` 15.0.2 ships its own types; the dependency record lists no `@types/markdown-it`. The "and its types" wording is dropped.

- **A-3** (`FR-032`, `EV-6`, `EV-7`; ACCEPTED): `sk-retry-load` is shared with #5 but its payload is a discriminated union on `target` (`'content'` and `'listing'` here, `'work-package'` and `'detail'` there). The union, both detail types and the one `declare global` live in a neutral `src/retry-types.ts` (PLAN-DESIGN-002 (a), the `shell-types.ts` precedent); #5's names (`RetryLoadDetail`, alias `SkRetryLoadDetail`) stay as re-exports, and the single named edit of #5's merged files is in the shared-files table (D-04).

- **A-4** (`FR-005`, `NFR-009`; ACCEPTED): the lint rule set is named (D-06, R1 to R5; R2 reshaped by PLAN-CORRECT-001 (b), R4 by PLAN-FRESH-001 (a)) and the `data-driven` gate learns `ArtifactKind` and the seven refusal codes from schema enums (D-11), which the spec left to this plan.

- **A-5** (`FR-003`, `AV-15`, `AV-29`, `DA-3`; REJECTED): the proposed collapse of every per-kind icon to one file glyph is NOT adopted. Replacement: the magnifier (`<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>`) and the table (`<path d="M5 5h14v14H5zM5 10h14"/>`) glyphs of the prototype (`05-artifact.html:23-24`) are added to `shell-icons.ts` (and `shell-types.ts`) as two additive `ShellIcon` members, `magnifier` and `table`, the file's own stated rule being "paths copied from the prototype"; the per-kind icon stays data in `defaults/artifact-kinds.ts`, so DA-3 is met without drift; existing baselines are untouched (FR-037 protects baselines, not additive glyphs); G-17 shrinks to the general icon-set gap (#4's G-08). The prototype's no-fold glyph for `plan.md` and `tasks.md` goes to CP-1 as a question.

- **A-6** (the drift register; ACCEPTED as "keep"; values ruled at CP-1, 2026-10-07: DA-39 a pinned 900 px, DA-40 a pinned 68 px): two items the prototype carries and the register does not mention are DA-39 (the raw block's reading measure, `.raw-view` `width: min(900px, 100%)`) and DA-40 (the toolbar band's `min-height: 68px`); each is carried with a token where one exists, otherwise by E-25 or E-28 pinned. S-A2 and S-A4 include the two numbers in their prototype side-by-sides.

- **A-7** (`NFR-004`, `NFR-011`, new `NFR-014`, `NFR-015`; ACCEPTED): NFR-004 gains a reflow clause (at a 200% root size the 1100 px viewport resolves to one column, and at 320 px and 400% only tables scroll); NFR-011's list of non-colour-only states gains the selected tab and the current tree row; NFR-014 forced colors and reduced motion (the selected tab, the focus ring and the table box stay distinguishable in forced colors; the screen's own elements run no animation under reduced motion); NFR-015 target size (a tab at least 36 px and a Work Package control at least 24 px of block size).

- **A-8** (`N-Q12`, `FR-007`, `EV-2`; amendment to N-Q12, PROPOSED and ACCEPTED in whole at CP-1 on 2026-10-07 (A-8a and A-8b both stand as drafted; the revert recipes below stay as the record); it is NOT a clarification that changes no ruling). It is TWO separately rejectable parts; the host obligation is neither.
  - **A-8a (layer 1)**: markdown-it's default `validateLink` turns `javascript:`, `vbscript:`, `file:` and non-image `data:` destinations into LITERAL TEXT (the paragraph shows the raw `[x](...)` source, with no inert link and no `title`), where N-Q12 says "inert text with the destination in `title`". Written in IC-03 (link table, the `[x](javascript:1)` yields-no-`link_open` test) and IC-04 (corpus entries whose expected text is the literal source). IF REJECTED, the literal N-Q12 stands: the stuck point is the one line `md.validateLink = () => true` inside `parse.ts` (the instance is still never exported, so R1, R2 and the export-shape test are untouched); the blocked schemes then reach `classifyLink`, whose row 7 already returns inert, and the renderer draws the inert span with the destination in `title`; the layer-1 test flips to "a `link_open` exists and is classified inert, with no `href`", and the corpus expectations change from the literal source to the link text. Cost: one line, one test and the corpus expectations, all inside IC-03 and IC-04 files; no other WP is touched. The defence in depth is then `classifyLink` plus the walker (R4, the structural test), which the plan states as the accepted loss.
  - **A-8b (three narrowings)**: of an absolute link that N-Q12 would send as `sk-open-link`: a `mailto:` with a query or fragment (row 6), an authority with userinfo (`@`, row 5) and a destination over 2048 characters (row 1) are inert; an external link carries its truncated destination in `title`. Each narrowing is individually rejectable: a rejected one reverts its own table row and unit rows to N-Q12's literal wording (the destination is sent as `sk-open-link` and the host obligation covers it); the other two stay.
  - Until CP-1 the plan, the link table and the corpus are written to A-8a and A-8b as proposed. The sentence of `EV-2` in `spec.md` was REVERTED (done, commit of the operator's rulings). The HOST OBLIGATION stays a contract obligation in `contracts/sk-artifact-screen.md` and in the `@fires` text of `sk-open-link` whatever CP-1 decides (the `href` is untrusted; the host re-validates the scheme, never navigates its window to it, and shows the destination first). If A-8 is approved (in whole or in part), the orchestrator writes the EV-2 sentence back. [CP-1, 2026-10-07: A-8 approved in whole; the EV-2 sentence is written back in `spec.md`. WP04's `mailto:` check also rejects a leading or trailing `@`, which the A-8b wording does not name; the operator was told.]

- **A-9** (`FR-001`; ACCEPTED with PLAN-DESIGN-022 (a)): FR-001's "twelve properties" becomes THIRTEEN: the twelve named there plus one optional `vocabulary` property (`ArtifactVocabulary | null`, default null meaning the `defaults/` values), passed into the logic functions, so a later charter-driven pipeline changes props and not the element (the spec's dynamic-pipeline constraint). The surface is 13 properties everywhere (this plan, `data-model.md`, `contracts/sk-artifact-screen.md`, `contracts/gates.md`, the surface-freeze text, IC-06b).

- **A-10** (`NFR-006`; NOT WRITTEN: ruled at CP-1 on 2026-10-07, no multiplier): the spec numbers (500 ms, 200 ms) ARE the gate ceilings, with NO multiplier. A multiplier on any ceiling is allowed ONLY as this numbered amendment, which IC-04 reports with its S-A0 step two figures (best of three, Chromium) and the operator decides at CP-1; until the operator rules, a test over the spec numbers that fails is a finding, not a trigger to scale. The default is no multiplier, and no amendment is written if the headroom is about 2x or more. [CP-1, 2026-10-07: no amendment is written; the markdown budget was raised to option O3 instead (`maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000), and a ceiling test that flakes goes back to the operator and is never quietly relaxed.]

New drift-register entry for CP-1 (PLAN-SECURE-009, ruled 2026-10-06): **DA-41** (proposed; CONFIRMED at CP-1, 2026-10-07): in the raw and fallback views only, a quiet notice drawn with the library `sk-notice` of tone `info` "contains N bidirectional control characters" (words and the code-point list, U+202A to U+202E, U+2066 to U+2069 and U+200E and U+200F, from `defaults/`; the text itself is shown unchanged, so FR-012 and the escaped-source equality hold). There is no prototype counterpart; the operator decides its look at CP-1. R-09 is corrected to "accepted, no mitigation" (the rendered view shows no notice).

Spec rows read as amended by the rulings (the spec rows were written back by the orchestrator at CP-1 on 2026-10-07; this list is kept as the record, and a reviewer holding an older spec text reads these rows as follows): AV-32 (focus order) reads "tree, inspector, tabs, document" because the inspector is first in the DOM (PLAN-A11Y-009 (b)); FR-035 ("the document pane focusable; documented focus order tree, tabs, document, inspector") reads the same order, tree, inspector, tabs, document; NFR-003's "scrolling region counts as a control" reads "a scroll region is a tab stop only while it overflows" (PLAN-A11Y-003 (a)); FR-012 ("the block is focusable and named, so it scrolls by keyboard") and DA-23 ("both the rendered article and the raw block focusable and named", a drift-register item shown to the operator at CP-1) read "focusable and named only while it overflows", the same rule, on the element that actually scrolls; NFR-005 ("asserted in the corpus test by observing resource loads") reads "asserted by the structural walk of the produced template (the proof, PLAN-TEST-003 (a)); a CSP and a resource-load observation are corroboration only".

Also noted for CP-1, not amendments: task-list checkboxes (`- [ ]`) are not parsed by core markdown-it and show as literal text.

#### Build base (dependency on #4 and #5)

#4 is MERGED (`cef2d53`); this branch holds it. **Base A only (operator ruling PLAN-DESIGN-017, 2026-10-06)**: implementation builds on #5 AFTER #5 has merged to `main`. IC-01a is blocked until then: that is its entry condition, not a choice put to the operator at dispatch. The orchestrator re-verifies the merge state upstream at dispatch (`gh pr list` on the repository, `git ls-tree` of the merged `main`) and does not dispatch IC-01a otherwise; the local refs are never evidence. **State of #5 as of the verification date (2026-10-06)**: no pull request for #5 exists upstream; the planning branch `feat/work-package-screen-5` holds planning artifacts only (its commit `1b43257` carries a `status.json` with WP01 to WP09 approved and WP10 in progress); the implementation exists on `kitty/mission-work-package-screen-01M44DSJ` and its lane branches `-lane-a` to `-lane-j` (lane-j tip `d15cb5d`, 2026-10-06 09:47 +0200; every symbol below was re-read at that tip), and nothing is merged to the target branch yet. Every row of the table below was checked against real code, not against a plan, and is re-read on the merged tree by the orchestrator (a mismatch is reported, not absorbed; the list is the checklist of `contracts/sk-artifact-screen.md`, "Dependencies on #4 and #5"). IC-01a starts from "`main` with #4 and #5 merged", records the sha, and runs the full gate set for a green baseline first. Nothing is stacked, so the maintainer's practice of landing stacked slices himself does not arise.

What this mission needs from #5:

| Need | Where it comes from (verified symbol, lane-j tip `d15cb5d`) |
|---|---|
| `sk-select-work-package` `{ missionId, wpId }`, `sk-open-mission` `{ missionId, slug }`, `LabelHooks`, `lookup`, `relativeTime`, `resolveActivity`, `VIEW_STATES`, `renderIcon`, `shellFrame`, `flush`, gates, `classOnly` ESLint helper, the exception table to E-16 | #4, merged |
| `sk-retry-load` and its payload: `RetryLoadDetail`, the landed union of `WorkPackageRetryDetail` and `DetailRetryDetail` (each `{ missionId, wpId, target }`), a type in `logic/wp-retry.ts`, aliased `SkRetryLoadDetail` in `sk-work-package-screen.ts` (`export type SkRetryLoadDetail = RetryLoadDetail`), whose `HTMLElementEventMap` entry `CustomEvent<SkRetryLoadDetail>` is today the one `declare global` of the key | #5, new. IC-06b moves both detail types, the union and the one `declare global` to the neutral `src/retry-types.ts` (D-04); #5's names stay as re-exports |
| `REVIEW_CYCLE_ARTIFACT_KIND` in `defaults/review.ts`, typed `components['schemas']['ArtifactKind']` | #5; this mission's `defaults/artifact-kinds.ts` owns the whole kind table and IMPORTS that constant (D-12) |
| `factsSheet` (and the event-timeline sheet) in `library-sheets.ts` | #5; imported, never added here |
| `eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts` and `gates/fixtures/data-driven/**` as #5 extended them (S13 and S14, 38 selector entries, bare words matched only in comparisons) | #5; IC-02 extends the merged file in that shape and derives every count from the arrays, not from literals |
| Contract tooling: `--from-repo`, `PIN.json` provenance fields, check C8, `update.test.mjs`, `cli.test.mjs`, the literal counts in `registry.test.mjs`, `overlays.test.mjs`, `check.test.mjs`; additive lines in `contract/types.ts`, `logic/types.ts`, `defaults/index.ts` | #5 IC-01 and later; the final re-vendor still uses the public `--sha` form (D-09) |
| Exceptions E-17 to E-22 and the `stylelint-exceptions.test.mjs` cases | #5; this mission's numbering starts at E-23 with no gap |
| `sk-open-artifact` `SkOpenArtifactDetail { missionId, path, kind }` (`sk-work-package-screen.ts`) | #5 (emitted by the Work Package screen); consumed by the host; this screen never imports or re-emits it (asserted with a dispatched event of the same name and shape, a plain `CustomEvent`) |
| `scripts/wp-story-catalogue.test.mjs` (a node:test row-to-story test; on #5's tip it runs under `test:terminology`, which CI does not run) | #5; the model for this mission's, which is deliberately placed in `test:scripts` so CI runs it (a new CI behaviour, not precedent, PLAN-FRESH4-010) |

Because this mission lands after #5, its contract re-vendor (151 files at plan-time main) already contains #5's 1.1 slice (`WorkPackageDetail*` schemas are present at `2261ad5`), and there is no "whichever lands second" case. After IC-11, every gate self-test is re-run on the final tree (a reviewer check). The shared files below are the additive edits this mission makes on the merged tree.

| Shared file | #5 (merged) holds | This mission adds | Rule |
|---|---|---|---|
| `packages/mission-ui/src/index.ts`, `custom-elements.json` | its screen's exports and manifest | `sk-artifact-screen` | manifest by `pnpm manifest:generate` only; `index.ts` by hand, additive |
| `package.json` (root and package), `pnpm-lock.yaml` | its scripts | `markdown-it`, script entries (`test:no-io`, `test:scripts`) | by hand, additive; lockfile by `pnpm install` |
| `eslint.config.mjs`, `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs` | E-17 to E-22 and their cases | R1 to R5, `noInlineConfig`, the `chProperties` grant, E-23, E-25 to E-27 (E-29), E-28 | ids are appended after E-21; by hand |
| `eslint.data-driven.config.mjs`, `gates/fixtures/data-driven/**`, `gates/data-driven.selftest.ts` | S13 and S14 words, 38 entries, `EXPECTED_WORDS` | kinds and codes, bare-word comparison selectors | every count is derived from the arrays (no literal arithmetic); re-run both data-driven commands |
| `packages/mission-ui/src/library-sheets.ts` | `factsSheet`, event-timeline | uses `factsSheet` | not edited |
| `defaults/index.ts`, `logic/types.ts`, `contract/types.ts`, `contract/bulk.ts` | additive lines | re-exports, view types, bulk generators (the shared `LabelHooks` of `logic/types.ts` is NOT edited here) | by hand, additive |
| `shell-types.ts`, `shell-icons.ts` (#4's files) | the closed `ShellIcon` set and the glyph paths | two additive members, `magnifier` and `table` (paths from `05-artifact.html:23-24`) | additive only; no existing member or path edited |
| `scripts/contract/*.test.mjs` literals (`registry`, `overlays`, `check`) | its fixture counts | 30 registered fixtures | counts relative to the merged base, derived from the registry where possible |
| `gates/plants/**`, `.github/workflows/ci.yml` timeouts, `surface-freeze.test.ts`, `story-support/shell-frame.ts` | its plants, tests, timeouts | five plants, the unit-tests proof-leg timeout, 13 properties of this screen, the sidebar tree option | by hand; plants are array entries |
| `sk-retry-load` typing: `logic/wp-retry.ts` and `sk-work-package-screen.ts` | `RetryLoadDetail` (the landed union), the alias `SkRetryLoadDetail`, the event-map entry | a neutral `src/retry-types.ts` holding `RetryLoadDetail`, `SkArtifactRetryDetail`, the union and the one `declare global` | ONE named edit of #5's merged files, by IC-06b: `logic/wp-retry.ts` re-exports `RetryLoadDetail`, `sk-work-package-screen.ts` keeps its alias and loses its event-map entry; #5's names, tests and manifest text are unchanged |
| both `CHANGELOG.md`, `README.md` | its entries | one line per slice | by hand |

### From `contracts/`: what this work package is held to (verbatim)

#### Story to fixture pairing (`contracts/contract-pin.md`)

#### Pairing (story to fixtures)

`contracts/sk-artifact-screen.md` names the stories; IC-06b is the sole owner and creates a pairing table `row -> { listing, content, refusal, selectedPath, mission, workPackages, status, contentStatus }` in `fixtures.ts`, and IC-11's row-to-story test reads it. Constraint (as #5): where both a listing and a content are given, `content.path` must equal `selectedPath`, and the entry for that path must exist in the listing unless the row is the "selected path not in the listing" edge case (R-12). The content examples whose paths `listingPopulated` lacks (`ContentRedacted`, `ContentJson`, `ContentEmpty`) therefore pair with `listingWithOpenFiles`.

#### Self-check list for reviewers (`contracts/gates.md`; its own heading says to copy it into every WP brief that touches these files)

#### Self-check list for reviewers (copy into every WP brief that touches these files)

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q8, operator ruling 2026-10-06.** **Contract pin.** Ruling: vendor from `main` at `1.0.0-SNAPSHOT`, the `contract` gate checking the pin, re-vendor when spec-kitty#5776 or the `1.0.0` tag changes the artifact shapes or vocabulary. (Finding: the pin on this branch is #4's `9f41e48`, which has no artifact reads; FR-038.)

#### Operator rulings on the plan-phase forks, 2026-10-06

After the plan squad held 23 forks, the operator ruled "ACCEPT ALL" of the arbiter's recommendations on 2026-10-06, for all 23 forks and the plan amendments A-1 to A-8. They bind tasks and review; the plan carries the detail. In short:

- **Base A**: build on #5 (after it merges). **Retry types**: a neutral `src/retry-types.ts` holds the shared `sk-retry-load` union (A-3). **Splits**: IC-01 and IC-06 are split; IC-02 stays whole.
- **Layout**: two columns only from a content cell of 720 px or wider, never in the mobile tier (A-1 accepted; numbers settled at CP-1 on S-A6 [T = 45 rem, ruled 2026-10-07]). **Inspector first in the DOM**; grid placement keeps it on the right in two columns. A-6 (DA-39, DA-40) accepted; values pending CP-1 [ruled at CP-1, 2026-10-07: 900 px and 68 px pinned].
- **Exceptions**: E-23 gets a `ch` grant in the Stylelint mechanism and complete property tables; tabs prefer the adopted segmented-choice family (S-A5 decides, pending CP-1) [ruled at CP-1, 2026-10-07: the token paint variant, E-26; see "Operator rulings at CP-1, 2026-10-07" below].
- **Renderer**: `parse.ts` exports only `parseTokens`; lint rule R4 is strict only in `logic/markdown`; element files use a reviewed named list; table scroll boxes get positional names with no document text in `aria-*`; request absence is proved by a CSP meta plus `securitypolicyviolation` with a positive control; a bidi-control notice and a corrected R-09 (a new DA entry at CP-1) [DA-41, confirmed 2026-10-07].
- **Spec edits**: the unapproved EV-2 sentence is REVERTED (done above); A-8 and the N-Q12 narrowings are decided at CP-1, not before [A-8a and A-8b accepted as drafted at CP-1, 2026-10-07; the EV-2 sentence is written back].
- **Evidence**: five local pinned `pnpm visual` runs in IC-11 (CI repeat is extra). Node-only tests via `scripts/` and `?raw`. NFR-006 gets hard ceilings plus a parse-count spy.
- **Tree**: an unreadable row stays disabled and `current` is empty when the selected leaf is unavailable; the host never writes tree toggles back. **Truncation note**: owned by IC-07. **Focus**: a table or panel is a tab stop only while it overflows. **Headings**: a visually hidden h1 where the pane has none.
- **Vocabulary**: one optional `vocabulary` property (so 13 properties; FR-001's "twelve" is amended by the plan). **Icons**: A-5 rejected; the magnifier and table glyphs are added to `shell-icons.ts`.
- A-2, A-4, A-7 accepted. Values that depend on spikes are PENDING CP-1, not decided [ruled at CP-1 on 2026-10-07: see "Operator rulings at CP-1, 2026-10-07" below].

#### Operator rulings on the seven new plan forks, 2026-10-06

The operator accepted the orchestrator's recommendations on 2026-10-06. Binding on tasks and review.

- **PLAN-FRESH3-001 (a)**: reuse `OverflowRegion`, extended to several targets and both axes as one named additive edit.
- **PLAN-FRESH3-004 (b)**: the `vocabulary` claim covers only the functions that read a member; a foreign refusal code goes through `labels.refusal`.
- **Partly filled `vocabulary`**: completed per group against `defaults/` (the conservative option).
- **PLAN-FRESH3-005 (b)**: IC-06b derives the R4 binding list from its stubs; IC-06a lands only the schema.
- **PLAN-FRESH3-006 (a)**: the truncation note, the redaction line and the bidi notice are drawn with `sk-notice`; no new exception.
- **PLAN-FRESH3-008 (b)**: the host keeps a Set from `sk-tree-toggle` (read-only, never written back to the shell) and passes it as `expandedIds` on the next rebuild, so opened folders stay open.
- **PLAN-FRESH3-010 / AV-17 (b)**: the AV-17 test moves to IC-10; only the story title stays with IC-09.

CP-1 items stay pending CP-1 [all ruled on 2026-10-07; see below].

#### Operator rulings on the four last plan forks, 2026-10-06

- **PLAN-FRESH4-002 (a)**: screen-side focus detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null. The public surface is unchanged.
- **PLAN-FRESH4-003 (b)**: no axe; role, name, landmark and idref assertions plus a Playwright `ariaSnapshot` dump. Axe leaves the spikes and IC-10's exit checks.
- **PLAN-FRESH4-007 (b)**: `copy` is removed from `ArtifactVocabulary` (five groups); string overrides go through `labels`.
- **PLAN-FRESH4-008 (a)**: `artifact_listing_unreadable` is not retryable in the content-refusal table; the listing failure is `status: error` (AV-14), consistent with FR-015.

#### Operator ruling on analyze A1 (tasks phase), 2026-10-06

The operator ruled option (A): `markdownFor` and its tests move from IC-02 (WP03) to IC-03 (WP04, exported from `logic/markdown/model.ts`); WP03 types the `markdown` input of `resolveArtifactView` and the vocabulary budget group structurally in `artifact-types.ts`. No WP count, dependency or signature changes. Applied in plan.md (two sentences), `contracts/defaults.md` and the WP03 and WP04 prompts.

### Operator rulings at CP-1, 2026-10-07 (CP-1 confirmed)

CP-1 confirmed, 2026-10-07. The operator ruled on the WP06 evidence (WP06 approved; the spikes S-A1 to S-A6 were run in Chromium and Firefox 153; WebKit could not launch on the host and is NOT TAKEN). The rulings below are binding and complete; they bind tasks and review. The write-through to the plan, the contracts and the work package prompts is recorded in `plan.md`, "CP-1 rulings (2026-10-07)".

1. **Markdown budget: option O3.** `maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000 (the cells move with the tokens). `maxDepth` 24 and the other limits are unchanged. No A-10 multiplier: A-10 is not written. Risk noted: inline-heavy 149k-token documents measured 437 to 512 ms against the 500 ms ceiling, so the ceiling test uses a document shape and a margin that do not flake; if it flakes, that goes back to the operator and the ceiling is never quietly relaxed.
2. **Tab control: the token paint variant.** E-26 becomes the paint entry: token `border-color`, `background` and `color` keyed on `aria-selected`, the forced-colours `Highlight` border, and the raw `<button type="button" role="tab">` allowance. The segmented-choice class is not used, so the `sk-segmented-choice*` row leaves E-27. Both panels are rendered (one `hidden`), or `aria-controls` is omitted on the unselected tab, so that no idref dangles. Sunset: G-16.
3. **Work Package pill: raw `button.sk-pill-tag`** (S-A4 outcome (c)). E-29 is approved and `sk-pill-tag` goes into E-27 as `classOnly` for `inspector-parts.ts`. Sunset: G-21. DA-29 is resolved by this ruling.
4. **Inspector facts: the library `sk-facts` look is accepted**: no row separators and 16 px values (14 px terms). Recorded explicitly as accepted drift in DA-34 and DA-28. No exception.
5. **Toolbar stack: option C.** Container `max-width: 38.75rem` combined with `:host(:state(shell-mobile))` through #5's `ShellTierController`, which gives zero drift across the sampled widths (no toolbar window). This amends FORK-2 (a) of 2026-10-07: the one-column rule stays the A-1 container threshold T = 45 rem (720 px) with no controller, and the controller is used ONLY for the toolbar stack. The controller consumes the host's one `attachInternals()`, so the screen must not call `attachInternals` anywhere else.
6. **Prose: keep our token CSS (E-23).** The `ch` grant is approved for `max-width: 68ch`. `letter-spacing` and `text-wrap` are dropped (not in E-23). G-14 is reworded: `sk-prose` exists in `@spec-kitty/styles` 1.1.0-rc.10 but does not match the prototype.
7. **Everything else as the evidence recommends.**
   - The drift register DA-1 to DA-41 is confirmed as proposed, with these additions: (i) DA-34 and DA-28 name the facts drift; (ii) DA-23 reads "focusable only while it overflows", and Home and End are inert for single-line files; (iii) DA-33 has no toolbar window under option C; (iv) DA-29 is resolved by the pill ruling. DA-39 (`900px` measure) and DA-40 (`68px` toolbar `min-height`) are kept as pinned values; DA-41 (the bidirectional-control notice) is confirmed.
   - A-1 numbers: T = 720 px (45 rem); the toolbar stack is option C of ruling 5.
   - A-8a and A-8b are accepted as drafted (both parts); the EV-2 sentence is written back. Note: WP04's `mailto:` check also rejects a leading or trailing `@`.
   - E-25: `white-space: pre-wrap` plus a pinned 900 px measure; no `overflow-wrap` grant; no box paint.
   - E-28: the `270px` track and the `68px` toolbar `min-height` are pinned.
   - A-10 is not written.
   - The copy stays as rendered (`contracts/defaults.md`).
   - WebKit is untested: an ACCEPTED OPEN RISK (Kitty Desktop on Linux runs WebKitGTK). The PR description states it.

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

Timing (PLAN-TEST-008 (a), ruled 2026-10-06): the spec numbers of NFR-006 are HARD ceilings (500 ms for a 256 KiB document and for a 1000-entry tree, 200 ms for a re-render), each measured as the best of three runs after a warm-up, in Chromium (the engine that asserts them), by the test clock (never in the screen). Before the clock starts the test pins the expected branch: the 256 KiB document (`makeLargeMarkdown`, the large content of the stories) must resolve to `ok` with a block count above 0, and the over-budget document to `fallback`, so a fast fallback cannot pass the large-document check. The re-render claim is proved by a counted `parseTokens` spy: after N property changes that leave `content` unchanged the spy count is 1 (removing the cache fails it), plus the node identity of an unchanged rendered block. The spec numbers (500 ms, 200 ms) ARE the gate ceilings; there is no multiplier. A multiplier would be allowed ONLY as the numbered amendment A-10 (`plan.md`); CP-1 ruled on 2026-10-07 that A-10 is NOT written and there is no multiplier: a test over the spec numbers that fails is a finding that goes back to the operator and is never quietly relaxed. The markdown budget is the option O3 values (`maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000), and the ceiling test uses a document shape and a margin that do not flake, because inline-heavy 149k-token documents measured 437 to 512 ms against the 500 ms ceiling.

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative and tool-owned; stage only these). A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit. The part files created as stubs by WP08 are owned by WP09, WP10 and WP11 afterwards.

**Gates this work package must pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test:scripts`, `pnpm contract:check && pnpm test:contract`, `pnpm test` (the unit-tests gate; its output must list your test files), `pnpm build-storybook`, and `pnpm test:terminology` for every work package that writes under `packages/*/src` (and its exit check). `pnpm visual` is NOT an exit check before WP13; `pnpm gate-proof` is run by the orchestrator where a plant changed. A gate that is red is classed against the baseline table WP01 recorded and the orchestrator names in the dispatch (`tracer-approach.md`): a red absent from it is INTRODUCED and fixed here; a red present in it is reported as pre-existing and not fixed here.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two of them.

**Test quality rules and test strategy**: the binding text is quoted VERBATIM in the section "Test strategy and test quality rules (verbatim)" below (#4 D-34 rules 1 to 5 and this mission's `research.md` D-19). Rule 6 of #4 is its 500-Mission test and does not apply here.

**Visual drift = REJECT.** The approved prototype (`<prototype>/05-artifact.html` with `prototype.css`) is the visual authority (C-006, NFR-008). The only allowed differences are the drift register DA-1 to DA-41 (`spec.md` "Visual Drift Register", extended by DA-39 to DA-41 in the plan) AS CONFIRMED by the operator at CP-1 (DA-1 to DA-41 confirmed on 2026-10-07; an entry not confirmed would be PROPOSED) and any entry the operator did not confirm is a REJECT item for the work package that introduces it. Any other visible difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off (uncommitted; no baseline PNG before WP13).

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, history compaction into named slices and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with `spec-kitty safe-commit` (explicit files, `--to-branch`), a conventional message (`feat(artifact-viewer-screen): ... (#7)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Named edits outside this work package's own surface (recorded in the hand-off with a one-line rationale)

- `packages/mission-ui/custom-elements.json` (owner WP08): one regeneration by `pnpm manifest:generate`, ONLY if the surface changed
- `contracts/spec-kitty/**`, `scripts/contract/**`, `packages/mission-ui/src/contract/**` (owner WP01): ONLY if `main` moved since WP01 (re-pin by `pnpm contract:update --sha`)
- No source file under `packages/*/src` unless a gate failure forces a reported change request

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP12. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP13 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
