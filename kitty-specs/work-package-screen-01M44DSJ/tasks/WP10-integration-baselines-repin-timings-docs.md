---
work_package_id: WP10
title: Integration, baselines, re-pin, timings and documentation
dependencies:
- WP09
requirement_refs:
- FR-032
- FR-033
- FR-034
- FR-036
- FR-037
- FR-038
- NFR-001
- NFR-002
- NFR-007
- NFR-008
- NFR-010
- C-006
- C-009
- C-011
- C-012
- SC-001
- SC-002
- SC-003
- SC-004
- SC-005
- SC-006
- SC-007
- SC-008
- SC-009
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-06T06:09:51.470805+00:00'
subtasks:
- T058
- T059
- T060
- T061
- T062
- T063
- T064
- T065
phase: Phase 3 - Integration
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: apps/storybook/tests/visual/__snapshots__/
create_intent:
- packages/mission-ui/test/wp-pairing.test.ts
- scripts/wp-story-catalogue.test.mjs
- packages/mission-ui/test/host-composition.test.ts
execution_mode: code_change
owned_files:
- apps/storybook/tests/visual/__snapshots__/**
- packages/mission-ui/test/host-composition.test.ts
- packages/mission-ui/test/wp-pairing.test.ts
- scripts/wp-story-catalogue.test.mjs
- .github/workflows/ci.yml
- package.json
- README.md
- CHANGELOG.md
- packages/mission-ui/CHANGELOG.md
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP10 - Integration, baselines, re-pin, timings and documentation (IC-09)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Integrate the two chains and make the mission shippable as ONE pull request: commit the 56 new baseline PNGs (the ONLY work package that commits baselines), checked side by side against the prototype and the CP-1 entry; add the row-to-story node test, the pairing test and the host-composition test (SC-008); prove the shell stories are untouched (FR-037); run five consecutive clean `pnpm visual` runs and `pnpm gate-proof`; re-derive the CI timeouts; reconcile README and CHANGELOGs; regenerate the manifest once; re-pin the contract to `main` with its proofs when spec-kitty#5625 is on `main` (else HALT to the operator); run the drift review against the register as the CP-1 entry and the register state them; and write the inputs for the pull-request description.

## Context

Read `plan.md` (IC-09, "PR shape and wrap-up", "Gates", "FR-037 (resolved)", "Rulings applied"), `contracts/contract-pin.md` ("Pairing", "Gate `contract`: C8", the wrap-up proofs), `contracts/gates.md` (the `visual`, `gate-proof` and `contract` rows; E-17 to E-20; the plant text before and after the re-pin), `contracts/sk-work-package-screen.md` ("Story catalogue", "Row-to-story node test"), `research.md` D-09 step 4, D-15, D-16, D-18, R-02, R-06, `spec.md` (state matrix, drift register, success criteria SC-001 to SC-009), and #4's wrap-up and timeout rule (its `contracts/gates.md`, "timeouts", and its recorded runs). Requirements: FR-032 (the manifest regenerated once, `manifest:check` green), FR-033 and NFR-010 (the contract gate on `main`), FR-034 and NFR-001 (all gates), FR-036 (every row a story with an approved baseline, side-by-side review), FR-037 (shell stories untouched), FR-038 (exception table as ruled, gaps G-09 to G-13 for the PR), NFR-002 (five consecutive clean visual runs), NFR-007, NFR-008 (zero unapproved differences), C-006, C-009, C-011, C-012, SC-001 to SC-009.

Your lane: you depend on WP09 (chain X plus chain Y merged in by the orchestrator earlier), so the whole screen is drawn. All region WPs handed over uncommitted side-by-side screenshots; they are your cross-check, not your baselines.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP09. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `plan.md`, "Lane mechanics"); do not create, switch or reset branches yourself.

## First step (T058)

See T058: confirm the tree before anything else.

## Subtasks

### T058 First step: confirm the merged tree and run the full gate set

**Steps**:
1. Confirm the CP-1 entry is an ancestor (`git merge-base --is-ancestor <CP-1 commit> HEAD`, the dispatch names the commit) and that both chains are present: the five story files (`header-facts`, `review-history`, `chains-work`, `states`, `tiers`) and every part file with a non-stub body (`grep -L "return nothing" ...` style check: a part whose render functions all still return `nothing` is a stub: STOP and report). If a chain is absent: STOP and report; never merge.
2. Run every gate on the merged tree and record each (command, exit code, reporter count): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm contract:check && pnpm test:contract`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test`, `pnpm build-storybook`. A red is escalated to the orchestrator unless it is your own scope (baselines, timeouts, docs, the three new tests).
3. Count the stories: exactly 56 new stories across the five titles (10, 13, 19, 8, 6) and zero committed PNG for them so far.

### T059 Manifest regeneration, shell check (FR-037), host-composition test (SC-008)

**Steps**:
1. Regenerate the manifest ONCE: `pnpm manifest:generate`, commit `packages/mission-ui/custom-elements.json` as an out-of-map edit; `pnpm manifest:check` green. The surface was frozen by WP04: the diff must show no public property or event change; any difference is a reported WP04 exception (explain it), never silently committed.
2. FR-037 shell check: SH-06 and SH-07 (`MissionWorkPackageSelected1280` and `MissionWorkPackageNoneSelected1280` of `app-shell-01M3V82X`) stay untouched: assert `git diff <base> HEAD -- packages/mission-ui/src/elements/sk-mission-shell/` is empty for the shell story file `sk-mission-shell.stories.ts`, and that the 118 existing baselines are byte-identical (`git diff --stat <base> HEAD -- apps/storybook/tests/visual/__snapshots__/` shows only ADDED files, none modified or deleted, and the count of pre-existing PNGs is 118). Put these as runnable commands in the hand-off (the orchestrator's `<base>` is the build base merge commit).
3. `host-composition.test.ts` (extend #4's file with new tests; do not weaken existing ones; SC-008): a host-like page composes `sk-mission-shell` (with `flush`) and `sk-work-package-screen`, passing ONLY contract-shaped data (the fixtures), the Mission, `status`, `detailStatus`, `now` and `labels`; it routes the four events (`sk-select-work-package`, `sk-open-mission`, `sk-open-artifact`, `sk-retry-load`) with exact payloads (`toEqual`, exactly one per activation, positive control for every no-event), and shows the screen did no I/O (spy on `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage` and `setTimeout` and assert zero calls with a positive control that the spy catches a deliberate call). No change to the screen to make the host fit.

**Files**: `host-composition.test.ts`; out-of-map: `packages/mission-ui/custom-elements.json` (regeneration only).

### T060 Row-to-story node test and pairing test

**Steps** (red-first; each has a revert check and a negative case):
1. `scripts/wp-story-catalogue.test.mjs` (`node:test`; wire it in `package.json` as a script and into the existing node test aggregation): (a) parse the specification's state matrix rows with ONE anchored pattern (`^\| (WP-\d+) \|`) from the mission's `spec.md` (read-only) and assert exactly 50 rows; (b) parse the story ids of the catalogue in `contracts/sk-work-package-screen.md` and assert exactly 56; (c) map a story to its row by stripping one trailing lowercase letter; assert every row has at least one story and every story maps to a row; (d) assert the set of stories whose id differs from their row equals the six extras (WP-21b, WP-24b, WP-33b, WP-35b, WP-35c, WP-36b) and that the stories of each title number 10, 13, 19, 8 and 6; (e) discover the stories in the REAL story files (the five `*.stories.ts`) by the story id convention of the contract (the one `wp-<NN><letter>` tag per story is the id; the export name `Wp<NN><letter>` must equal it; a story with no tag, two row tags or a mismatching export fails; a repeated id fails) and assert the same 56 ids and the same per-title counts; (f) an empty parse FAILS (the counts are asserted, so empty versus empty cannot pass). Run it against the real files AND against a temp copy with one row deleted to prove it fails (the negative case, spawned or in-process on the copy).
2. `packages/mission-ui/test/wp-pairing.test.ts` (vitest; imports `fixtures.ts`): take the pairing table of `contract-pin.md` as input and assert: every pair agrees on `wpId` after `pairDetail`; no pair makes a Work Package depend on itself; for WP-01, WP-13 and WP-14 the `dependencies` ids of both sides are equal and, for WP-13, `readiness.unsatisfied` equals both; the review-state agreement holds for every pair except the literal exemption list WP-29 and WP-44 (a present `latestResult` with no cycles; WP-30 and WP-35b carry a null verdict), with a negative case that a non-exempt present-result pair without a matching last cycle fails (negative case: `wpPopulated` + `detailPopulated` WITHOUT `cycles: 'none'` fails); no two stories share the Work Package fixture, detail fixture, `cycles` option and status/detailStatus unless the table lists them as same-composition rows (WP-01, 11, 25, 31, 34 differ in region under test; WP-46 to 48 differ in viewport; WP-28 and WP-49 differ in tab-order tag only (cycles versus tab stops); WP-30 and WP-35b differ in the region under test; each exemption is a literal id list in the test); negative case: WP-02 against WP-29 must NOT be flagged as a shared pairing. Assert it ran over the expected number of stories (counts with equality).
3. WP-32: assert (reuse WP07's assertion or re-run it here over the real story) that no word implying removal appears in the workspace panel.

**Files**: `scripts/wp-story-catalogue.test.mjs`, `packages/mission-ui/test/wp-pairing.test.ts`; `package.json` (owned here: script wiring).

### T061 Baselines, side-by-side review, five clean runs, gate-proof

**Purpose**: the only commit of baseline PNGs, from the merged stories.

**Steps**:
1. Inside the pinned container only: `pnpm visual:update` (through `scripts/visual.sh`, which fails rather than skips). Confirm `git status --short` shows ONLY new files for the 56 stories (plus nothing modified among the 118). Never hand-edit or copy a PNG. Stage the new PNGs explicitly (never `git add -A`).
2. Review EVERY new baseline: Read each PNG, put it beside the prototype (`<prototype>/04-work-package.html` at the matching state and width; "None" rows against the named analogue) and beside the uncommitted side-by-side screenshot the region work package handed over (the cross-check: a change from that image is explained). Map each visible difference to a DW item as the `CP-1 confirmed` entry and the register state them; an unconfirmed difference is a REJECT item: report it as a change request to the owning WP (do not paper over it by re-baselining). Describe each image in the hand-off (what is drawn, the width, anything wrong): 56 descriptions.
3. Five consecutive clean `pnpm visual` runs in the container on an unchanged commit (NFR-002: 0 failures, each run a fresh invocation, the commit hash printed before and after); record the five exit codes and the wall time of each. These runs are against the provisional branch pin; if T064 re-pins afterwards (the re-pin rule), the fixtures are regenerated and T064 step 5 repeats this step and the baseline check on the re-pinned tree, whose results are the exit evidence.
4. `pnpm gate-proof` (inside the container where it requires it): all plants fail as planted and pass when removed, including plant 4 of the contract gate; the record is green.

**Files**: `apps/storybook/tests/visual/__snapshots__/**` (the 56 new PNGs). **Edge cases**: a flake in the five runs is investigated (font, animation, timing), never retried until green; a baseline of a story with a viewport tag is compared at that viewport.

### T062 CI timeouts re-derived and the timing record

**Steps**: re-derive the `visual` and `unit-tests` job timeouts in `.github/workflows/ci.yml` (timeouts only) by #4's rule from #4's recorded runs scaled by (174 x 5) / (118 x 5) (174 baselines in all: 118 + 56), using your five recorded wall times as the cross-check; record the derivation (inputs, formula, result, margin) in the hand-off for the orchestrator to place in the mission timing record (you write nothing under `kitty-specs/`). Edit no other part of `ci.yml`; the gate commands stay unchanged. The CI job command for `contract` is unchanged (C8 enforcement in the wrap-up is a recorded limitation).

**Files**: `.github/workflows/ci.yml`. **Validation**: a YAML parse of the file succeeds; the diff shows only timeout lines.

### T063 README, CHANGELOGs, terminology

**Steps**: reconcile `README.md` (the new element, its ten properties and four events in one short section; the quickstart link; the contract pin note; where stories live: `Screens/Work Package/`) and both `CHANGELOG.md` files (replace the per-IC lines WP01 and WP02 added with one coherent entry per slice; do not duplicate); no absolute path, no username; the word "feature" appears nowhere (C-009); "Mission" is the term, "status lane" and "code lane" stay distinct. Run `pnpm hygiene` and a grep for "feature" over the files this mission touched.

**Files**: `README.md`, `CHANGELOG.md`, `packages/mission-ui/CHANGELOG.md`, `package.json` (only script wiring).

### T064 Contract re-pin to `main` and its proofs (HALT if #5625 is not on `main`)

**Steps**:
1. Ask the orchestrator (in the hand-off, before this step) whether spec-kitty#5625 is on spec-kitty `main` and which `main` sha to pin; the dispatch carries it. If it is NOT on `main`: HALT and report (the plan does not choose; the operator is asked). Do not claim a main pin for a branch commit.
2. With the sha: `pnpm contract:update --sha <main sha>` (network; the command fetches upstream `main` and fails closed unless the sha is an ancestor of it). This is the one other writer of `contracts/spec-kitty/PIN.json`, the generated files and plant 4: commit them as ONE re-pin commit (out-of-map edits, listed): `PIN.json` `provenance: "main"` with neither `branch` nor `reason`; `types.generated.ts` and `fixtures.generated.ts` regenerated; edit the independent literal floors ONLY if the file count or fixture count changed (150 and 70 expected; changing them is a deliberate, explained edit, never derived); rewrite plant 4 in the same commit: `find` is `"provenance": "main"` and `replace` is `"provenance": "branch"` (it leaves a branch pin with neither `branch` nor `reason`: token `pin provenance`); a `pnpm gate-proof` follows the rewrite.
3. Run the blocking proofs: `pnpm contract:verify-remote` (upstream bytes equal; the pinned commit is an ancestor of upstream `main`), `pnpm contract:check --require-main` (zero), `pnpm contract:check && pnpm test:contract`; and show the three node-tested wrap-up proofs pass (the CLI exit codes of `--require-main`: branch pin non-zero with token `pin provenance`, main pin zero; the verify-remote provenance decision; the ancestry check refusing a side-branch sha) by running `pnpm test:contract` with its reporter counts.
4. `git grep` for the lane checkout path prefix and the OS username over the tree: empty. `git status --short` empty.
5. After the re-pin commit (the re-pin rule), on the re-pinned tree and in this order: (a) fixtures freshness: `pnpm contract:check && pnpm test:contract` green (generated files equal to a fresh regeneration); (b) `pnpm build-storybook` and `pnpm test` green (fixture changes can break stories and tests); (c) the baseline check: `pnpm visual` inside the container. If any image differs, read the actual and expected images, describe each difference, map it to a DW item or flag it as a REJECT item, and only after that review run `pnpm visual:update` (container) and commit the changed PNGs with their descriptions in the hand-off; (d) five consecutive clean `pnpm visual` runs on the final unchanged commit (record the five exit codes and wall times; these replace the T061 runs as the NFR-002 evidence); (e) `pnpm gate-proof` again (plant 4 was rewritten). If the re-pin changes nothing rendered, say so with the zero-diff evidence of (c).

**Files**: out-of-map (the re-pin commit): `contracts/spec-kitty/PIN.json`, `packages/mission-ui/src/contract/types.generated.ts`, `fixtures.generated.ts`, `gates/plants/contract/plant.json` (plus `scripts/contract/check.test.mjs` only if a floor literal must change). **Risks**: a re-pin can change contract text (R-01): any type error or fixture failure is a report to the orchestrator, not an absorption.

### T065 Drift review and the pull-request inputs

**Steps**: write, in the hand-off (the orchestrator assembles the PR description from it; nothing under `kitty-specs/`): (1) the drift review: for the 56 baselines, a table story to differences to DW item as the CP-1 entry and the register state them, with zero unconfirmed differences (NFR-008, SC-007); (2) the exceptions as ruled, each with the evidence: E-17 per file, E-18 (narrowed to the five CP-1 properties, sunset spec-kitty-design#516), E-19 (a) (deleted: the probe passed), E-19 (b), E-20 (dropped: `sk-button` nodes), each with scope, rationale and sunset; (3) the gaps G-09 to G-13 as design-library issues to file (G-11 is the S9 residue, covered by the narrowed E-18 and spec-kitty-design#516; the Evidence chain gap is spec-kitty-design#517); (4) the DW register (seven items confirmed at CP-1, 24 confirmed at the Storybook review) and the amendments P-1 to P-4, P-6 and P-7; (5) the timing record (T062); (6) the five visual run results (those of T064 step 5 after the re-pin, with those of T061 beside them), the `gate-proof` result and the pre-compaction facts the orchestrator needs for the wrap-up integrity checks (the tree hash of your tip, the commit list by slice: contract 1.1 tooling and fixtures (WP01), defaults, logic and gate cases (WP02), skeleton and layout (WP04), header and facts (WP05), history and review (WP06), chains, subtasks, workspace and links (WP07), states (WP08), tiers, accessibility and edge cases (WP09), integration, baselines and re-pin (WP10); there is no spike slice); (7) the checklist of the self-check items run over the whole tree (no literal of the data-driven list outside `defaults/` and `contract/`; no `review_cycle` outside `REVIEW_CYCLE_ARTIFACT_KIND`; no `Date`, timer or I/O in the screen).

## Test strategy

Positive controls: the catalogue test and the pairing test each carry a negative case (a deleted row; a pair without `cycles: 'none'`; WP-02 versus WP-29 not flagged) and an empty-parse failure; the host-composition spy has a deliberate-call control; the five runs are separate invocations. Exactly-one-event: every emit assertion of the host-composition test. Counts with equality: 50 rows, 56 stories, per-title 10, 13, 19, 8, 6, 118 pre-existing baselines, 174 in total, five runs. Revert checks per test file (listed): catalogue (remove one story), pairing (drop the review-state rule), host-composition (route the wrong event). This work package runs `pnpm visual` and `pnpm gate-proof` as REAL exit checks (it is the first work package where they run green), inside the pinned container.

Exit evidence (all runnable): all gates of the list green on the merged tree; five consecutive green `pnpm visual` runs (NFR-002) taken AFTER the re-pin (T064 step 5; when the re-pin HALTs, the runs on the provisional pin with the HALT report); `pnpm gate-proof` green; exactly 56 new PNGs added and 118 unchanged; the shell story file diff empty; `pnpm contract:verify-remote` and `pnpm contract:check --require-main` green (when #5625 is on `main`), else a HALT report; `git status --short` empty after the last commit.

## Definition of Done

- 56 baselines committed and each reviewed against the prototype and the CP-1 entry (56 descriptions in the hand-off); zero unconfirmed differences.
- Catalogue, pairing and host-composition tests pass with listed revert checks and negative cases.
- Timeouts re-derived and recorded; README and CHANGELOGs reconciled; manifest regenerated once.
- The re-pin to `main` done with its proofs, or an explicit HALT report.
- Hand-off lists commit hashes verified with `git cat-file -t`, every out-of-map edit with rationale, the five run results, the gate-proof result and the PR-description inputs.
- No push; the orchestrator owns accept, cleanup, squad, compaction, rebase, the Storybook review by the operator and the draft pull request.

## Risks

- Baselines are committed once, from the merged stories: a late region fix means re-baselining in this work package only; never edit another WP's files.
- #5625 may not be on `main` (R-02): HALT, do not choose.
- 174 baselines lengthen CI (R-06): the timeout derivation is the mitigation; do not raise a timeout without the derivation.
- A flaky visual run hides a real instability: fix the cause.
- The first clean `pnpm visual` run happens here: reds at this point can come from any earlier work package; classify and report, never absorb.

## Reviewer guidance

Check the 56 PNG count and that the 118 existing ones are byte-identical; read each baseline beside the prototype and the CP-1 entry (use the region WPs' side-by-side images as the cross-check); the shell story file has an empty diff; the catalogue test asserts exact counts and fails on a deleted row; the pairing test has its negative cases; the host-composition test shows zero I/O with a positive control; five clean runs are evidenced by five distinct invocations; the re-pin commit contains `provenance: "main"` and the rewritten plant (or a HALT report exists); no absolute path or username in any committed file; `ci.yml` diff is timeouts only. The reviewer is a separate agent; it re-runs two revert checks, the catalogue test against a temp copy and one `pnpm visual` run, and audits visual drift against the register as the CP-1 entry and the register state them.


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
