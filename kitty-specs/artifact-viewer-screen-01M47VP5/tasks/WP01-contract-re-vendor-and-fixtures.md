---
work_package_id: WP01
title: Contract re-vendor, fixtures and relaxations (IC-01a)
dependencies: []
requirement_refs:
- FR-038
- FR-044
- C-002
- NFR-007
- NFR-010
- C-008
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T07:03:58.399268+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
phase: Phase 1 - Foundation
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: contracts/spec-kitty/
execution_mode: code_change
owned_files:
- contracts/spec-kitty/**
- scripts/contract/**
- packages/mission-ui/src/contract/**
role: implementer
---

# Work Package Prompt: WP01 - Contract re-vendor, fixtures and relaxations (IC-01a)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Keep the Mission Status contract pin (#5's `b61d1fa`, `provenance: main`, which already holds every artifact read; operator ruling 2026-10-07, so there is no `contract:update`), regenerate the fixtures, register the 13 contract examples and 17 overlays, add the two relaxations and the four bulk generators, and record a green baseline of every gate on `main` with #4 and #5 merged. Nothing else: no element, no default, no logic.

## Context

IC-01a is the first work package and the only one with an external entry condition (Base A, operator ruling PLAN-DESIGN-017): it is BLOCKED until mission-ui#5 has merged to `main`. The orchestrator re-verifies the merge upstream at dispatch (`gh pr list` on the repository, `git ls-tree` of the merged `main`; local refs are never evidence) and does not dispatch this work package otherwise. Every later work package builds on the fixtures, types and pin written here, and IC-11 re-pins only if `main` moved.

Read first: `plan.md` section "IC-01a" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-01a. Requirements: FR-038, FR-044, C-002, NFR-007, NFR-010, C-008.

## Precondition (first step, before the first subtask)

**Entry condition (Base A)**: mission-ui#5 is merged to `main`. This is the first step and the first exit check (the first subtask). The WP agent confirms from the dispatch that the orchestrator verified it, records the base sha, and STOPS and reports if the merged tree lacks any symbol of the plan's "What this mission needs from #5" table. It is an entry condition, not a choice put to the operator at dispatch.

## Subtasks

### Subtask T001: Entry condition and green baseline

**Steps**:
1. Confirm the dispatch names the merged-`main` sha with #4 and #5 both merged; record it in the WP report.
2. Re-read each row of the plan's "What this mission needs from #5" table against the merged tree (symbol, file); a mismatch is reported, not absorbed.
3. Run every gate command once on the unchanged tree and record pass/fail per gate: typecheck, lint, lint:styles, lint:no-io and test:no-io, lint:data-driven and test:data-driven, manifest:check, hygiene, test:scripts, test:contract, contract:check, test:terminology, test (unit-tests), build-storybook, `pnpm visual` in the pinned container, `pnpm gate-proof`. This is the baseline against which later reds are classed as pre-existing or introduced.

**Files**: WP report; the ORCHESTRATOR then writes the baseline table into `tracer-approach.md` and names it in every later dispatch

**Validation**: the baseline table is in the report; a red gate on the unchanged tree is named, never fixed here

### Subtask T002: Confirm the pin (no re-vendor)

Operator ruling 2026-10-07 (FORK-4 (a)): the pin stays at #5's `b61d1fa`. Its tree already holds the artifact reads and equals the `contracts` tree of spec-kitty `main` at `2261ad5` and at the tip checked on 2026-10-07, so `pnpm contract:update` is NOT run and nothing under `contracts/spec-kitty/**` changes.

**Steps**:
1. Read `contracts/spec-kitty/PIN.json`: `sha` `b61d1fa336478dae023a2d82808fef0d811816c3`, `provenance` `main`. Run `pnpm contract:check --require-main`.
2. Count BLOBS of the vendored tree with `git ls-tree -r` (never tree entries): 151, 142 under `mission-status` and 9 under `_shared`; confirm it holds `paths/missions_missionId_artifacts.yaml`, `paths/missions_missionId_artifacts_content.yaml`, `parameters/ArtifactPath.yaml`, the nine `schemas/Artifact*.yaml`, the seven `responses/Artifact*.yaml` and the 13 artifact examples. A missing one is reported, not fixed here.
3. Optionally run `pnpm contract:verify-remote` (network) to confirm the vendored bytes equal upstream. Confirm `PIN.json` carries no filesystem path (`git grep` of the checkout path prefix is empty). If the pin or the tree differs from the above, STOP and report: that is a decision for the operator, not a re-vendor to run.

**Files**: none changed (`contracts/spec-kitty/**` is read only here)

**Validation**: `pnpm contract:check --require-main` green; the diff of `contracts/spec-kitty/**` against the base is empty

### Subtask T003: Regenerate types and fixtures; update literals

**Steps**:
1. Regenerate with `pnpm contract:generate` (never edit a generated file by hand). The generated types already hold the artifact types, so the diff is in the fixtures only.
2. Update the vendored file count (151 at plan time, read from the pinned tree), the fixture count and kind tallies in `registry.test.mjs`, `overlays.test.mjs` and `check.test.mjs`, each relative to the merged base's own current literal; prefer deriving a count from the registry over a new literal.
3. `infoVersion`, `changelogTopVersion` and the generated-header version are read from the pinned commit (`1.0.0-SNAPSHOT` at plan time); no test may hard-code them.

**Files**: `scripts/contract/*.test.mjs`, `packages/mission-ui/src/contract/**`

**Validation**: `pnpm test:contract` green with a reporter pass count above 0

### Subtask T004: Register the 13 example fixtures and the 17 overlays

**Steps**:
1. Register in `registry.mjs` and `overlays.mjs`: the 13 examples (`ArtifactListing.populated` and `.truncated`, `ArtifactContent.markdown`, `.redacted`, `.json`, `.empty`, and the seven `ArtifactRefusal.*`).
2. Register the 17 named overlays of `contracts/contract-pin.md` "Fixture inventory" (a listing with the open files, empty, unreadable rows, unknown kind in a listing and in a content (two fixtures), unknown refusal code, long names, deep nesting, full-syntax markdown, hostile text, the four non-markdown media types, a BOM, a prompt and a review cycle). The full-syntax document and the hostile text never contain the whole word `feature` and never a credential-shaped string (assembled at run time in tests, never stored).
3. Every value synthetic: `[path]` and `[email]` appear only as the contract's markers.

**Files**: `scripts/contract/registry.mjs`, `scripts/contract/overlays.mjs`, generated fixtures

**Validation**: 30 new registered documents: 27 valid and 3 relaxed; the checker reports each one producible by the contract

### Subtask T005: Add the two relaxations with reverted-must-fail proofs

**Steps**:
1. `artifact-kind-open`: patch the `kind` property of `ArtifactEntry` and `ArtifactContent` to `{ type: string, minLength: 1 }`, `allowedPath` `/^\/entries\/\d+\/kind$|^\/kind$/`.
2. `refusal-code-open`: patch the `code` property of the LAST `allOf` entry of `ArtifactRefusal` to `{ type: string, minLength: 1 }`, `allowedPath` `/^\/code$/`.
3. Proof for each: with the patch removed the fixture fails the strict schema and check C4 reports `fails even the <name> schema` (token `violates contract`).

**Files**: `scripts/contract/*.mjs` and tests

**Validation**: each relaxation is red when reverted, green when restored

### Subtask T006: Bulk generators, `checkBulk` and view types

**Steps**:
1. Add to `bulk.ts` the pure generators `makeArtifactListing(n, { truncated })`, `makeLargeMarkdown(bytes, path)`, `makeLongLine(bytes)` and `makeOverBudgetMarkdown(...)`; never registered, never stored.
2. Extend `checkBulk` so each generator output validates against the contract schema (the listing generator at 1000 entries and in its truncated form).
3. Add view aliases `ArtifactListingView` and `ArtifactContentView` to `contract/types.ts` (additive lines only).

**Files**: `packages/mission-ui/src/contract/bulk.ts`, `types.ts`, `scripts/contract/**`

**Validation**: `checkBulk` red when a generator is made to emit an invalid document, green otherwise

### Subtask T007: Exit run on the pinned tree

**Steps**:
1. `tsc` and the tests of #4's three screens and of #5's screen stay green on the new pin; a break is fixed in the tooling or the overlays and reported, never by editing a screen.
2. Run the exit checks below; record the base sha and the pin sha in the WP report.

**Files**: WP report

**Validation**: all exit checks in Acceptance exit 0

## Acceptance (all runnable)

1. `pnpm test:terminology` green.
2. `pnpm contract:check && pnpm test:contract` green with the reporter pass count above 0 (and `--require-main` if the merged base's check has it).
3. Both relaxations are red when reverted.
4. `tsc` green for the existing screens; their tests green.
5. Hygiene green (no path in `PIN.json`); `git grep` for the checkout path prefix is empty.
6. The base sha and the pin sha are recorded in the WP report; the baseline table of the first subtask is in the report.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

R-01 (the re-vendor changes WorkPackage fixtures #4 or #5 rely on: fix in tooling or overlays, report, never edit a screen). R-02 (`main` moves between plan and dispatch: IC-11 re-pins and repeats the checks).

## Reviewer Guidance

Count with `git ls-tree -r`, not tree entries. Check provenance is `main` and no path is recorded. Check the literals are relative to the merged base and derived where possible. Check each relaxation's reverted proof by reverting it yourself. Check no fixture value holds a path, username, e-mail address or credential-shaped string. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-01a

#### IC-01a Contract re-vendor and fixtures
- **Entry condition (Base A, PLAN-DESIGN-017)**: #5 is merged to `main`; the orchestrator re-verifies this upstream at dispatch (`gh pr list` on the repository and `git ls-tree` of the merged `main`) and the IC is not dispatched otherwise.
- **Purpose**: baseline record on `main` with #4 and #5 merged (run every gate command once, including `pnpm visual` in the pinned container and `pnpm gate-proof`, by the implementation agent or the orchestrator, never by a plan-phase agent); **keep the contract pin** (FR-038, Q8; operator ruling 2026-10-07, FORK-4 (a)): #5 vendored spec-kitty `main` at `b61d1fa` (`provenance: main`) and that tree already holds every artifact read (nine `schemas/Artifact*.yaml` including `ArtifactRefusalCode`, seven responses, 2 paths, 1 parameter and 13 examples; 151 blobs by `git ls-tree -r`), and the `contracts` tree of `main` at `2261ad5` and at the tip checked on 2026-10-07 is the same tree, so there is NO `contract:update` and no change under `contracts/spec-kitty/**`; verify the pin with `pnpm contract:check --require-main` and a blob count of the vendored tree; regenerate types and fixtures (the generated types already hold the artifact types; only the fixtures file gains documents); update the literals (vendored file count to the figure read from the pinned tree, 151 at plan time; fixture count and kind tallies in `registry.test.mjs`, `overlays.test.mjs` and `check.test.mjs`, relative to the merged base); register the 13 example fixtures (`ArtifactListing.populated` and `.truncated`, `ArtifactContent.markdown`, `.redacted`, `.json`, `.empty`, seven `ArtifactRefusal.*`) and the 17 named overlays of `contracts/contract-pin.md` (a listing with the open files, empty, unreadable, unknown kind (listing and content, two fixtures), unknown refusal code, long names, deep nesting, full-syntax markdown, hostile text, the four non-markdown media types, a BOM, a prompt and a review cycle); the bulk generators (`makeArtifactListing`, `makeLargeMarkdown`, `makeLongLine`, `makeOverBudgetMarkdown`) in `bulk.ts`, validated by an extended `checkBulk` and never registered or stored; the two relaxations `artifact-kind-open` and `refusal-code-open` (the latter patches the `code` property of the last `allOf` entry of `ArtifactRefusal`, `allowedPath` `/^\/code$/`) with reverted-must-fail proofs; view types.
- **Relevant requirements**: FR-038, FR-044 (part), C-002, NFR-007, NFR-010.
- **Affected surfaces**: `contracts/spec-kitty/**`, `scripts/contract/**`, `packages/mission-ui/src/contract/**`, new `*.test.mjs` files under `scripts/contract/` (picked up by the `test:contract` glob `node --test scripts/contract/*.test.mjs`, so no edit of that script is needed, PLAN-FRESH4-010).
- **Exit checks**: `pnpm test:terminology` green; `pnpm contract:check && pnpm test:contract` green with reporter pass above 0 (and `--require-main` if the base's check has it); relaxations red when reverted; `tsc` green for the existing screens (the re-vendor must not break #4's board and Pipeline fixtures or #5's; a failure is fixed in the tooling or overlays and reported, never by editing a screen); hygiene green (no path in `PIN.json`); `git grep` for the checkout path prefix empty; the base sha and the pin sha recorded in the WP report.
- **Version strings**: `infoVersion`, `changelogTopVersion` and the generated-header version are read from the pinned commit (`1.0.0-SNAPSHOT` at plan time); no test may hard-code them.
- **Depends on**: #5 merged (the entry condition). **Risks**: R-01 (the re-vendor changes WorkPackage fixtures #4 or #5 rely on), R-02 (main moves between plan and dispatch).

### From `plan.md`: shared-file rows that name IC-01a

| File | Writer | Everyone else |
|---|---|---|
| `src/contract/**`, `scripts/contract/**`, `contracts/spec-kitty/**` | IC-01a only (bulk generators and `checkBulk` included; IC-11's final re-pin check is the one other writer, if main moved) | a missing fixture is a change request |
| `package.json` (root), `.github/workflows/ci.yml` | IC-11, except the named edits: IC-01a needs no `test:contract` edit (the script is a glob that already matches new test files); IC-01b adds `markdown-it` to `packages/mission-ui/package.json` and the lockfile; IC-04 adds `gates/markdown-lint.selftest.ts` to the `test:no-io` script, `scripts/bundle-budget.test.mjs` to `test:scripts` and re-derives the `unit-tests` proof-leg timeout in `ci.yml`; IC-11 adds `scripts/artifact-story-catalogue.test.mjs` to `test:scripts` and re-derives the other timeouts; IC-02 adds its test files if the globs need it | change request |

### From `plan.md`: lane mechanics (orchestrator-owned; WP agents never do any of this)

As #4 and #5 recorded (a spec-kitty tooling issue fast-forward `kitty/mission-<slug>` before every first claim and after any merge of `main`; a spec-kitty tooling issue and a spec-kitty tooling issue for dependent lanes and `status.json`; `owned_files` and `lanes.json` `write_scope` tool-owned and never hand-edited): (0) the entry condition of IC-01a (#5 merged upstream) is checked first and a miss is a stop; (1) record the base sha at dispatch; (2) pre-create each dependent lane from the approved parent's tip; (3) IC-10 is parented on IC-08 (chain X): the orchestrator merges the approved IC-09 tip into its lane (`git merge --no-ff`), resolves `custom-elements.json` by `pnpm manifest:generate` only, checks both chains' stories are present, and checks owned-files disjointness: the files changed by IC-09's tip against the `owned_files` of IC-07 and IC-08, where any overlap is a stop, reported, not merged by hand; (4) fallback: if that merge conflicts beyond `custom-elements.json` and `status.json`, serialise IC-09 after IC-08 and record it; (5) the CP-1 entry reaches the lanes by being committed on the target branch and `kitty/mission-<slug>` fast-forwarded; `git merge-base --is-ancestor <CP-1 commit> HEAD` is checked before `implement` and by the reviewer; (6) after IC-01b is approved the orchestrator copies the gzip figure and the node timing table from the IC-01b WP report into `research.md` D-05 and commits on the target branch (fast-forwarding `kitty/mission-<slug>`), BEFORE IC-04 is dispatched, because IC-04 sets the bundle budget from them (`research.md` is on the orchestrator's partition and is never written in a lane).

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

#### Build base (dependency on #4 and #5)

#4 is MERGED (`cef2d53`); this branch holds it. **Base A only (operator ruling PLAN-DESIGN-017, 2026-10-06)**: implementation builds on #5 AFTER #5 has merged to `main`. IC-01a is blocked until then: that is its entry condition, not a choice put to the operator at dispatch. The orchestrator re-verifies the merge state upstream at dispatch (`gh pr list` on the repository, `git ls-tree` of the merged `main`) and does not dispatch IC-01a otherwise; the local refs are never evidence. **State of #5 as of the verification date (2026-10-06)**: no pull request for #5 exists upstream; the planning branch `feat/work-package-screen-5` holds planning artifacts only (its commit `1b43257` carries a `status.json` with WP01 to WP09 approved and WP10 in progress); the implementation exists on `kitty/mission-work-package-screen-01M44DSJ` and its lane branches `-lane-a` to `-lane-j` (lane-j tip `d15cb5d`, 2026-10-06 09:47 +0200; every symbol below was re-read at that tip), and nothing is merged to the target branch yet. Every row of the table below was checked against real code, not against a plan, and is re-read on the merged tree by the orchestrator (a mismatch is reported, not absorbed; the list is the checklist of `contracts/sk-artifact-screen.md`, "Dependencies on #4 and #5"). IC-01a starts from "`main` with #4 and #5 merged", records the sha, and runs the full gate set for a green baseline first. Nothing is stacked, so the maintainer's practice of landing stacked slices himself does not arise.

What this mission needs from #5:

| Need | Where it comes from (verified symbol, lane-j tip `d15cb5d`) |
|---|---|
| `sk-select-work-package` `{ missionId, wpId }`, `sk-open-mission` `{ missionId, slug }`, `LabelHooks`, `lookup`, `relativeTime`, `resolveActivity`, `VIEW_STATES`, `renderIcon`, `shellFrame`, `flush`, `segmentedChoiceSheet`, gates, `classOnly` ESLint helper, the exception table to E-16 | #4, merged |
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

#### Fixture inventory (`contracts/contract-pin.md`)

#### Fixture inventory (frozen after IC-01a; names are the generated export names)

#### Registered fixtures (stored in `fixtures.generated.ts`; 13 examples and 17 overlays)

| Fixture | Source | Used by |
|---|---|---|
| `listingPopulated`, `listingTruncated` | contract examples | AV-01 to AV-04, AV-15, AV-17 |
| `contentMarkdown`, `contentRedacted`, `contentJson`, `contentEmpty` | contract examples | AV-01, AV-08, AV-06, AV-07 (`contentEmpty` is text/plain: row 9b; the markdown empty file of row 9a is an IC-07 element test with inline content built from `contentEmpty`, no new fixture or story) |
| `refusalInvalidPath`, `refusalNotFound`, `refusalTooLarge`, `refusalNotText`, `refusalSecret`, `refusalUnreadable`, `refusalListingUnreadable` | contract examples | AV-09 to AV-14, AV-23 |
| `listingWithOpenFiles` | overlay: the entries of `listingPopulated` plus one entry for each open path the content examples and overlays use that `listingPopulated` lacks (`notes/handoff.md`, `contracts/schema.json`, `notes/empty.txt`, and the paths of `contentJsonl`, `contentCsv`, `contentPlain`), in byte order, `truncated: false`; valid against `ArtifactListing` | AV-06, AV-07, AV-08 and the media-type overlays (the listing holds the open path, so size and modified facts come from the entry, AV-24) |
| `listingEmpty` | overlay: `entries: []`, `truncated: false` | AV-18 |
| `listingUnreadableRows` | overlay: three entries with `readable: false` | AV-16 |
| `listingUnknownKind` (relaxed) | overlay: one entry whose kind is outside the enum | AV-29, SC-004 |
| `contentUnknownKind` (relaxed) | overlay: the content of that entry (same path, same unknown kind); the two are separate registry documents | AV-29, SC-004 |
| `refusalUnknownCode` (relaxed) | overlay: a `code` outside the seven, `status: 500` | EV, SC-004 |
| `listingLongNames` | overlay: a 200-character file name, a path near 512 characters | AV-30a, AV-30b |
| `listingDeep` | overlay: ten nested folders | AV-30c |
| `contentFeatures` | overlay: a markdown document exercising every FR-006 element (the document text and its headings never contain the whole word `feature`, C-009), a wide table, nested lists, quotes, code, rules, internal and external links to entries of `listingPopulated` (path `plan.md`) | AV-03 |
| `contentHostile` | overlay: hostile TEXT (script tags, `javascript:` links, remote image destinations, unclosed constructs); no credential-shaped string (path `research.md`) | AV-04 |
| `contentYaml`, `contentJsonl`, `contentCsv`, `contentPlain` | overlays: media type and path changed (`contracts/api.yaml` for the YAML one, the others under `notes/`), content kept short | AV-06 |
| `contentBom` | overlay: leading U+FEFF (path `notes/with space.md`) | edge case |
| `contentPrompt`, `contentReviewCycle` | overlays: kind `work_package_prompt` at `tasks/WP01-example.md` and kind `review_cycle` at `tasks/WP01-example/review-cycle-1.md` | AV-27, AV-28 |

The registry grows by 30 documents; 27 are valid and 3 are relaxed. The totals in `registry.test.mjs` and `overlays.test.mjs` are updated relative to the base's own totals (22 on this checkout; #5 changes them).

Host props (not registry documents; builders in the element's `fixtures.ts`): `missionFacts`, `workPackageList`, shaped like `MissionDetail` fields (AV-25, AV-26).

#### Bulk generators (NOT registered, never stored; FR-044, size)

`packages/mission-ui/src/contract/bulk.ts` gains pure functions, imported by the element's `fixtures.ts` builders: `makeArtifactListing(n, { truncated })` (the 1000-entry nested tree, AV-30d, NFR-006, and its truncated form), `makeLargeMarkdown(bytes, path)` (a valid 256 KiB markdown document that the model resolves to `{ kind: 'ok' }` with a block count above 0, a pinned expectation asserted in IC-03 and in the NFR-006 test, AV-30f), `makeLongLine(bytes, path)` (one unbroken 256 KiB line, AV-30e), `makeOverBudgetMarkdown(path)` (a markdown document over the token budget that resolves to `fallback`, pinned the same way, AV-05). Each content generator takes the path it is opened at, and the story pairs it with a listing from `makeArtifactListing` that contains that path. IC-01a extends `checkBulk` in `scripts/contract/check.mjs` (today the only place generated documents are validated against the contract) to validate each generator's output: listings against `ArtifactListing`, contents against `ArtifactContent`, and a size assertion that no generated document is written to a stored file. A bulk generator is never a registry entry, so `fixtures.generated.ts` stays small and check C3's byte comparison does not carry hundreds of KiB.

Every fixture value is synthetic: `[path]` and `[email]` markers appear only as the contract's markers.

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q8, operator ruling 2026-10-06.** **Contract pin.** Ruling: vendor from `main` at `1.0.0-SNAPSHOT`, the `contract` gate checking the pin, re-vendor when spec-kitty#5776 or the `1.0.0` tag changes the artifact shapes or vocabulary. (Finding: the pin on this branch is #4's `9f41e48`, which has no artifact reads; FR-038.)

#### Operator rulings on the plan-phase forks, 2026-10-06

After the plan squad held 23 forks, the operator ruled "ACCEPT ALL" of the arbiter's recommendations on 2026-10-06, for all 23 forks and the plan amendments A-1 to A-8. They bind tasks and review; the plan carries the detail. In short:

- **Base A**: build on #5 (after it merges). **Retry types**: a neutral `src/retry-types.ts` holds the shared `sk-retry-load` union (A-3). **Splits**: IC-01 and IC-06 are split; IC-02 stays whole.
- **Layout**: two columns only from a content cell of 720 px or wider, never in the mobile tier (A-1 accepted; numbers settled at CP-1 on S-A6). **Inspector first in the DOM**; grid placement keeps it on the right in two columns. A-6 (DA-39, DA-40) accepted; values pending CP-1.
- **Exceptions**: E-23 gets a `ch` grant in the Stylelint mechanism and complete property tables; tabs prefer the adopted segmented-choice family (S-A5 decides, pending CP-1).
- **Renderer**: `parse.ts` exports only `parseTokens`; lint rule R4 is strict only in `logic/markdown`; element files use a reviewed named list; table scroll boxes get positional names with no document text in `aria-*`; request absence is proved by a CSP meta plus `securitypolicyviolation` with a positive control; a bidi-control notice and a corrected R-09 (a new DA entry at CP-1).
- **Spec edits**: the unapproved EV-2 sentence is REVERTED (done above); A-8 and the N-Q12 narrowings are decided at CP-1, not before.
- **Evidence**: five local pinned `pnpm visual` runs in IC-11 (CI repeat is extra). Node-only tests via `scripts/` and `?raw`. NFR-006 gets hard ceilings plus a parse-count spy.
- **Tree**: an unreadable row stays disabled and `current` is empty when the selected leaf is unavailable; the host never writes tree toggles back. **Truncation note**: owned by IC-07. **Focus**: a table or panel is a tab stop only while it overflows. **Headings**: a visually hidden h1 where the pane has none.
- **Vocabulary**: one optional `vocabulary` property (so 13 properties; FR-001's "twelve" is amended by the plan). **Icons**: A-5 rejected; the magnifier and table glyphs are added to `shell-icons.ts`.
- A-2, A-4, A-7 accepted. Values that depend on spikes are PENDING CP-1, not decided.

#### Operator rulings on the seven new plan forks, 2026-10-06

The operator accepted the orchestrator's recommendations on 2026-10-06. Binding on tasks and review.

- **PLAN-FRESH3-001 (a)**: reuse `OverflowRegion`, extended to several targets and both axes as one named additive edit.
- **PLAN-FRESH3-004 (b)**: the `vocabulary` claim covers only the functions that read a member; a foreign refusal code goes through `labels.refusal`.
- **Partly filled `vocabulary`**: completed per group against `defaults/` (the conservative option).
- **PLAN-FRESH3-005 (b)**: IC-06b derives the R4 binding list from its stubs; IC-06a lands only the schema.
- **PLAN-FRESH3-006 (a)**: the truncation note, the redaction line and the bidi notice are drawn with `sk-notice`; no new exception.
- **PLAN-FRESH3-008 (b)**: the host keeps a Set from `sk-tree-toggle` (read-only, never written back to the shell) and passes it as `expandedIds` on the next rebuild, so opened folders stay open.
- **PLAN-FRESH3-010 / AV-17 (b)**: the AV-17 test moves to IC-10; only the story title stays with IC-09.

CP-1 items stay pending CP-1.

#### Operator rulings on the four last plan forks, 2026-10-06

- **PLAN-FRESH4-002 (a)**: screen-side focus detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null. The public surface is unchanged.
- **PLAN-FRESH4-003 (b)**: no axe; role, name, landmark and idref assertions plus a Playwright `ariaSnapshot` dump. Axe leaves the spikes and IC-10's exit checks.
- **PLAN-FRESH4-007 (b)**: `copy` is removed from `ArtifactVocabulary` (five groups); string overrides go through `labels`.
- **PLAN-FRESH4-008 (a)**: `artifact_listing_unreadable` is not retryable in the content-refusal table; the listing failure is `status: error` (AV-14), consistent with FR-015.

#### Operator ruling on analyze A1 (tasks phase), 2026-10-06

The operator ruled option (A): `markdownFor` and its tests move from IC-02 (WP03) to IC-03 (WP04, exported from `logic/markdown/model.ts`); WP03 types the `markdown` input of `resolveArtifactView` and the vocabulary budget group structurally in `artifact-types.ts`. No WP count, dependency or signature changes. Applied in plan.md (two sentences), `contracts/defaults.md` and the WP03 and WP04 prompts.

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

Timing (PLAN-TEST-008 (a), ruled 2026-10-06): the spec numbers of NFR-006 are HARD ceilings (500 ms for a 256 KiB document and for a 1000-entry tree, 200 ms for a re-render), each measured as the best of three runs after a warm-up, in Chromium (the engine that asserts them), by the test clock (never in the screen). Before the clock starts the test pins the expected branch: the 256 KiB document (`makeLargeMarkdown`, the large content of the stories) must resolve to `ok` with a block count above 0, and the over-budget document to `fallback`, so a fast fallback cannot pass the large-document check. The re-render claim is proved by a counted `parseTokens` spy: after N property changes that leave `content` unchanged the spy count is 1 (removing the cache fails it), plus the node identity of an unchanged rendered block. The spec numbers (500 ms, 200 ms) ARE the gate ceilings; there is no multiplier. A multiplier is allowed ONLY if proposed as the numbered amendment A-10 (`plan.md`), reported by IC-04 with its S-A0 step two figures (the real `parse.ts` chunk and the corpus in Chromium) and decided at CP-1 (PENDING CP-1); until the operator rules, a test over the spec numbers that fails is a finding, not a trigger to scale, and none is written before the measurement.

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative and tool-owned; stage only these). A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit. The part files created as stubs by WP08 are owned by WP09, WP10 and WP11 afterwards.

**Gates this work package must pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test:scripts`, `pnpm contract:check && pnpm test:contract`, `pnpm test` (the unit-tests gate; its output must list your test files), `pnpm build-storybook`, and `pnpm test:terminology` for every work package that writes under `packages/*/src` (and its exit check). `pnpm visual` is NOT an exit check before WP13; `pnpm gate-proof` is run by the orchestrator where a plant changed. A gate that is red is classed against the baseline table WP01 recorded and the orchestrator names in the dispatch (`tracer-approach.md`): a red absent from it is INTRODUCED and fixed here; a red present in it is reported as pre-existing and not fixed here.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two of them.

**Test quality rules and test strategy**: the binding text is quoted VERBATIM in the section "Test strategy and test quality rules (verbatim)" below (#4 D-34 rules 1 to 5 and this mission's `research.md` D-19). Rule 6 of #4 is its 500-Mission test and does not apply here.

**Visual drift = REJECT.** The approved prototype (`<prototype>/05-artifact.html` with `prototype.css`) is the visual authority (C-006, NFR-008). The only allowed differences are the drift register DA-1 to DA-41 (`spec.md` "Visual Drift Register", extended by DA-39 to DA-41 in the plan) AS CONFIRMED by the operator at CP-1; before CP-1 every entry is PROPOSED and any entry the operator did not confirm is a REJECT item for the work package that introduces it. Any other visible difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off (uncommitted; no baseline PNG before WP13).

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, history compaction into named slices and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with `spec-kitty safe-commit` (explicit files, `--to-branch`), a conventional message (`feat(artifact-viewer-screen): ... (#7)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Named edits outside this work package's own surface (recorded in the hand-off with a one-line rationale)


The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: none (entry condition below). Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

**Base A, entry condition**: this work package is BLOCKED until mission-ui#5 has merged to `main` (operator ruling PLAN-DESIGN-017). The tool cannot express an external dependency, so the first subtask is a stop-check and the orchestrator does not dispatch it otherwise.

Implementation command: `spec-kitty agent action implement WP01 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
