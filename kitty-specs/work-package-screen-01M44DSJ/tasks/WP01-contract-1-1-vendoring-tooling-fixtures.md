---
work_package_id: WP01
title: Contract 1.1 vendoring, tooling and fixtures
dependencies: []
requirement_refs:
- FR-032
- FR-033
- FR-034
- C-002
- C-008
- NFR-001
- NFR-007
- NFR-010
planning_base_branch: feat/work-package-screen-5
merge_target_branch: feat/work-package-screen-5
branch_strategy: Planning artifacts for this mission were generated on feat/work-package-screen-5. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/work-package-screen-5 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-work-package-screen-01M44DSJ
base_commit: e1152254a3494bfd74ac14e4a3b3bd80c066356a
created_at: '2026-10-05T07:38:53.812161+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
- T008
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-05T12:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: node-norris
authoritative_surface: scripts/contract/
create_intent:
- scripts/contract/update.test.mjs
- scripts/contract/cli.test.mjs
execution_mode: code_change
owned_files:
- contracts/spec-kitty/**
- scripts/contract/**
- packages/mission-ui/src/contract/**
- gates/plants/contract/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Contract 1.1 vendoring, tooling and fixtures (IC-01)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load node-norris` (role: implementer). Follow its boundaries for the whole work package.

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Replace mission-ui#4's contract 1.0 pin with the provisional contract 1.1 pin (the local lane of spec-kitty#5625), through a new `--from-repo` option of `contract:update` that reads git objects only; add the pin provenance check C8 with function-level and CLI-level tests and its plant; add the WorkPackage coherence rules, the four new relaxations and the 48 new fixtures with their overlays and bulk generators; add the widened view types. When this work package is approved, `pnpm contract:check && pnpm test:contract` is green on the 1.1 pin, the generated types and 70 fixtures are fresh, and nothing under `packages/mission-ui/src/elements/` has changed. This is data and tooling only: no element, no story, no CSS.

## Context

The build base is "mission-ui#4 merged into `main`, `main` merged into `feat/work-package-screen-5`" (`plan.md`, "Build base"); it is met (merge commit `9aad6ef`). The dispatch names the sha you start from; if it names none, do not start. Read, in this order: `plan.md` (IC-01, "Lane mechanics", "Shared files", "Gates"), `contracts/contract-pin.md` (the authority for this work package: pin additions, C8, relaxations, fixture inventory, pairing), `contracts/gates.md` (the `contract` row and "Gate `contract`: C8 and its plant"), `research.md` D-09, D-10, D-11 and spike S0, `data-model.md` ("Widened view types"), and #4's `contracts/contract-pin.md` and `contracts/gates.md` (reference mechanism, under `kitty-specs/missions-and-pipeline-screens-01M40SKZ/` after the merge; read-only).

Requirements: FR-032 (the generated types and the manifest-visible types, in part: the widened view types are IC-01's), FR-033 (contract-derived fixtures), FR-034 (the `contract` gate is one of the quality gates), C-002 (types generated from the vendored contract at a recorded pin), C-008 (no path or username anywhere), NFR-001, NFR-007 (fixture hygiene), NFR-010 (the `contract` gate covers 1.1).

Version strings: `infoVersion`, `changelogTopVersion` and the generated-header version are read from the pinned commit. `1.1.0-SNAPSHOT` is the value at the plan-time tip `8cc31f4429ddc0b8baaba9fb6c8ccdb65e9a53a5` only. No test, plant or exit check may hard-code it; 1.1 is the slice label, not a promised version string.

Paths: `<lane-1.1>` is the spec-kitty lane `mission-status-contract-1-1-01M42XJC` (a local checkout, the branch `kitty/mission-mission-status-contract-1-1-01M42XJC-lane-a`). It is given to you as a command-line argument by the orchestrator in the dispatch together with the sha to pin (the plan-time commit, or the lane tip at dispatch; the orchestrator records which). You never write that path into any file, command output you commit, or the hand-off.

## Branch Strategy

Planning branch and final merge target: `feat/work-package-screen-5`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); this work package has no dependency, so it starts from the merged build base the orchestrator records. Do not create, switch or reset branches yourself.

## Subtasks

### T001 Baseline record and spike S0 set-up

**Purpose**: a red found later must be attributable. Record the green baseline of every gate command on the merged build base BEFORE any change, and prove the spike S0 premise.

**Steps**:
1. In the lane worktree run, and record (command, exit code, reporter pass count) in the hand-off: `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm contract:check && pnpm test:contract`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test`, `pnpm build-storybook`, and, inside the pinned container only, `pnpm visual` and `pnpm gate-proof`. A red at baseline is escalated to the orchestrator and not absorbed (stop and report).
2. Record the merge-base facts the plan relies on: the `contracts/spec-kitty/` file count (98 at the 1.0 pin) and the fixture count (22), the 1.0 pin `sha` read from `PIN.json`, and the `RELAXATIONS` names in `scripts/contract/registry.mjs`.
3. Confirm by reading, not assuming, the #4 symbols this work package edits: `scripts/contract/{update,check,verify-remote,overlays,registry,generate,common,remote}.mjs`, `check.test.mjs`, `registry.test.mjs`, `overlays.test.mjs`, `packages/mission-ui/src/contract/{types.ts,bulk.ts}`. If a name in `contracts/sk-work-package-screen.md`, "Dependencies on #4", or in `contract-pin.md` does not exist, report the mismatch (R-03); do not absorb it.

**Files**: none written. **Validation**: the baseline table is in the hand-off before the first commit.

### T002 `contract:update --from-repo` with node tests

**Purpose**: the 1.1 commit exists only in a local lane, so the update command must read a commit from a local git directory without touching its working tree and without leaking its path.

**Steps** (red-first: write `update.test.mjs` first):
1. In `scripts/contract/update.mjs` add the option `--from-repo <path>`: it requires `--sha <40 hex>` (both together; `--from-repo` without `--sha` is refused; `--sha` alone keeps #4's network behaviour unchanged). The git read is factored into ONE function (for example `readTreeFromRepo(repoPath, sha, paths)`): `git ls-tree -r <sha> -- <paths>` and `git cat-file blob <blob>` per file, never a working-tree read, so an uncommitted edit in the lane cannot enter. An unknown sha fails closed (non-zero, a message that does not contain the path).
2. The rest of the flow is #4's, unchanged: replace both vendored directories as a whole, regenerate `types.generated.ts` and `fixtures.generated.ts`, rewrite the pin, run the checks. The command prints a relative description only; the path argument is NEVER written to `PIN.json`, any generated header, any fixture, any committed script output or any doc.
3. `scripts/contract/update.test.mjs` (new, `node:test`, temp git repositories created under a uniquely named temp directory): (a) commit a file, then edit the working tree: the vendored bytes equal the committed blob; (b) a missing sha throws; (c) `--from-repo` without `--sha` is refused and `--sha` without `--from-repo` takes the network path (assert the branch taken by an injected fetcher, never a real fetch); (d) after an update run from the uniquely named temp directory, neither `PIN.json`, nor the generated headers, nor the captured stdout and stderr contain that directory name.
4. Revert check per test: revert the rule it proves and watch the named test fail (for (a) swap the blob read for a working-tree read; for (d) write the argument into the pin).

**Files**: `scripts/contract/update.mjs`, `scripts/contract/update.test.mjs` (new). **Edge cases**: a sha that exists but whose tree lacks one of the vendored paths fails closed; Windows-style paths are out of scope; the command must not require a clean working tree in the source repository.

### T003 Provisional 1.1 pin: vendor, regenerate, record provenance

**Purpose**: the one vendored copy becomes 1.1 (additive over 1.0: "Changed: Nothing", "Removed: Nothing").

**Steps**:
1. Run `pnpm contract:update --from-repo <lane-1.1 as given> --sha <sha as given>` (shell-quote the arguments; the path stays in the shell history only). Do not commit the shell history or command text that contains the path into any file.
2. `PIN.json` gains `provenance: "branch"`, `branch: "kitty/mission-mission-status-contract-1-1-01M42XJC-lane-a"` (the real lane branch name, a label) and `reason: "contract 1.1 (spec-kitty#5625) not on main at vendoring time; re-pin before the pull request"`; `infoVersion` and `changelogTopVersion` are read from the pinned commit by the existing helper (`changelogTopVersionOf` already matches a `-SNAPSHOT` heading). `main` pins carry neither `branch` nor `reason`.
3. Vendored files: 150 tracked files under `contracts/spec-kitty/{mission-status,_shared}` (98 before). `types.generated.ts` header: no path, no timestamp.
4. Run the spike S0 pass rule: `pnpm contract:check` green on a clean tree twice in a row, `tsc` strict-clean on the generated types, and a planted run red (the plant of T004).
5. Hygiene: `git grep` of the lane checkout's path prefix (and of the OS username) over the working tree is empty; this is an additional check beside the node tests of T002, not the proof.

**Files**: `contracts/spec-kitty/**`, `packages/mission-ui/src/contract/types.generated.ts`, `fixtures.generated.ts` (both only through `pnpm contract:generate`). **Validation**: `pnpm contract:check` exits 0; `git diff --stat` of `contracts/spec-kitty/` shows 150 files and no file outside the two vendored directories plus `PIN.json`.

### T004 C8, `--require-main`, CLI tests, ancestry check, plant 4

**Purpose**: a branch pin must be impossible to ship by accident, and a `main` label must not be self-asserted for an unmerged commit.

**Steps** (red-first):
1. `scripts/contract/check.mjs`: new check C8 (token `pin provenance`): `provenance` is `main` or `branch`; `branch` implies non-empty `branch` and `reason`; `main` implies neither; with `--require-main`, `provenance` must be `main`. The flag is read from `process.argv` (today `main()` takes no arguments; add the parsing); `pnpm` passes it through. The CI gate command stays unchanged.
2. Function-level tests in `check.test.mjs`: a `branch` pin without `reason` gives `pin provenance`; `--require-main` on a `branch` pin gives `pin provenance`; `--require-main` on a `main` pin is clean (positive control).
3. CLI-level tests in `scripts/contract/cli.test.mjs` (new, `node:test`, `child_process` spawn of the real scripts against a temp copy of the repository files): `check.mjs --require-main` on a `branch` pin exits non-zero and prints `pin provenance`; the same on a `main` pin exits 0 (positive control); without the flag on a `branch` pin exits 0. The `verify-remote` provenance decision is factored into a pure function and tested for both outcomes (a `branch` pin prints "not verifiable upstream" and exits 0, and exits non-zero with `--require-main`); spawn it once through the CLI to prove the flag reaches it.
4. Ancestry: for a `main` pin, `update.mjs` (when writing it) and `verify-remote.mjs` (when checking it) fetch upstream `main` and require the pin sha to be an ancestor (`git merge-base --is-ancestor <sha> <fetched main>`), failing closed. The decision is a pure function covered by a node test using a temp repository in which the sha is on a side branch only (`update` refuses to write `main`, `verify-remote` exits non-zero); the same test spawns the command once. No real network in any test.
5. Plant 4: an array entry in `gates/plants/contract/plant.json` (same `ciCommand` as the other three): an anchored edit of `contracts/spec-kitty/PIN.json` with `find` = the line `"reason":` (unique in the file) and `replace` = `"reasonPlanted":`. C8 fails with token `pin provenance`; `PIN.json` is not in its own hash list, so C1 stays green and the plant is single-purpose. The contract plant list becomes four. Show plant 4 red then green.
6. `verify-remote` on the branch pin prints "not verifiable upstream (local lane commit)".

**Files**: `scripts/contract/check.mjs`, `check.test.mjs`, `cli.test.mjs` (new), `update.mjs`, `verify-remote.mjs`, `gates/plants/contract/plant.json`. **Edge cases**: the plant text and the shipped pin must stay consistent (WP10 rewrites the plant in the re-pin commit); `retrievedAt` stays informational and uncompared.

### T005 Independent literal floors and the anchor-file presence check

**Purpose**: the anti-vacuity guard must not be derived from the thing it guards.

**Steps**: `check.test.mjs` positive control asserts `vendoredFiles === 150` and `fixtures === 70` (22 + 48) as INDEPENDENT literals (never computed from `Object.keys(PIN.files)`, because `checkPin` already compares the pin to the directory and a pin and directory that shrink together would keep a derived guard green); the bulk-page count is unchanged. Add to `check.mjs` a presence check for the named anchor files (`openapi.yaml`, `schemas/WorkPackageDetail.yaml`, `schemas/ReviewCycle.yaml`, `schemas/Workspace.yaml` and their examples), tested with a temp copy missing one anchor. The negative test builds the mismatch from a dropped pin key as today; rewrite the guard texts "registry of 21 entries against 22 exports" and "PIN.files of 97 keys against 98 files" from computed values with the 69 and 149 variants. `verify-remote` may additionally compare the file count with `git ls-tree` at the pinned sha.

**Validation**: the floors fail when the vendored set is shrunk by one file (revert check). **Files**: `scripts/contract/check.mjs`, `check.test.mjs`, `verify-remote.mjs`.

### T006 C5 WorkPackage rules and extended `actorProblems`

**Purpose**: a fixture must not lie about the contract's derived values; #4's C5 has no `WorkPackage` rule.

**Steps** (red-first, each rule has a negative node test: a fixture built to violate exactly that rule fails with its token and passes when reverted):
1. C5 gains `WorkPackage`-scoped rules, recomputed independently of `overlays.mjs`, applied to every `WorkPackage` fixture (the ten contract examples included; a contract example that violates a rule is escalated, never relaxed): `readyToStart` equals (`statusLane` is `planned` and `readiness.satisfied`); `subtaskProgress.done` and `.total` equal the counts of the `subtasks` map; `history` is non-decreasing by `at`, then ascending by `eventId`; the last history entry's `toStatusLane` equals `statusLane`, and a null `statusLane` goes with an empty history; `readiness.unsatisfied` is a subset of `dependencies`.
2. `actorProblems` is extended to the `WorkPackage` shapes (`actor`, `history[].actor`, `review.latestResult.reviewer`, `detail.reviewCycles[].reviewer`). `SYNTHETIC_ACTORS` gains the contract example handles the fixtures keep (for example `reviewer-renata`); list each addition in the hand-off. C6's username leg still scans every string value.
3. C7 is unchanged (the 1.1 names the screen uses are not event-stream names).

**Files**: `scripts/contract/check.mjs`, `check.test.mjs`, the module holding `SYNTHETIC_ACTORS`. **Edge cases**: a literal lane word inside a rule would trip the data-driven gate only under `packages/*/src`; the scripts directory is outside it, but keep lane words data-derived anyway.

### T007 Relaxations, overlays, registry and the 48 new fixtures, bulk generators

**Purpose**: every fixture the stories need, valid against the contract or against a named, proven relaxation.

**Steps**:
1. `scripts/contract/registry.mjs` `RELAXATIONS` gains four named entries, each with its own `schema` and `allowedPath`, modelled on #4's `lane-open` (which stays bound to `MissionDetail`, unchanged): `wp-lane-open` (`WorkPackage`: `statusLane`, `history[].fromStatusLane`, `history[].toStatusLane`, the values of the open `subtasks` map; allowed `^/statusLane$`, `^/history/\d+/(from|to)StatusLane$`, `^/subtasks/[^/]+$`), `detail-lane-open` (`WorkPackageDetail`: `Subtask.statusLane` and `DependencyRef.statusLane`; allowed `^/subtasks/\d+/statusLane$`, `^/dependencies/\d+/statusLane$`), `provisional-omittable` (`WorkPackage`: removes `staleness` from `required`, allowed the root `required` error naming only `staleness`), `detail-omittable` (`WorkPackageDetail`: removes `reviewCycles` and `workspace` from `required`, allowed the root `required` error naming only those). `check.mjs` gains the assertion that a fixture's `def.schema` equals `RELAXATIONS[relaxation].schema`.
2. Proof per entry in `check.test.mjs`: the fixture passes the relaxed schema, fails the strict one, and every strict error is at an allowed path (a fixture with an unknown `verdict` elsewhere, or missing any other member, still fails); reverting the patch makes the fixture fail (reverted-must-fail). Update `registry.test.mjs` relaxed-count and kind-tally assertions.
3. `overlays.mjs` and the registry produce the 48 new exports of the inventory in `contract-pin.md` (27 `WorkPackage` + 21 detail and refusal), under the lane-rewrite rule: every overlay that changes `statusLane` rewrites the history (a prefix of the base history plus appended entries with later `at` and ascending `eventId`), `lastTransitionAt`, `lastEventId`, `subtasks` and `subtaskProgress`, `review` consistently and `readyToStart`. The concrete overlays are the table in `contract-pin.md` (`wpPopulated`, `wpReviewNone`, `wpChangesRequested`, `wpApproved`, `wpDone`, `wpReady`, `wpBlocked`). The pair-relevant facts are asserted by C5 and by the IC-09 pairing test later, so build `wpPopulated` with its `dependencies` `[WP03]`, its `ownedFiles` patterns equal to `detailPopulated`'s and its three subtask ids equal to `detailPopulated`'s.
4. Kind tally of the 70: valid 59 (15 of #4 plus 44 new), host 4 (#4's), relaxed 7 (#4's 3 plus `wpUnknownLane`, `detailUnknownLanes`, `wpStalenessOmitted`, `detailOmittedProvisional`). Edit the literals: `registry.test.mjs` tally and `kinds.length` 22 to 70; `overlays.test.mjs` `Object.keys(fixtures).length` 22 to 70. Every `satisfies` clause follows the inventory (`WorkPackage` fixtures `satisfies WorkPackage` unless noted).
5. `packages/mission-ui/src/contract/bulk.ts` gains `makeWorkPackageHistory(60)`, `makeSubtasks(40)` and `makeOwnedFiles(100)` (self-contained, pure, deterministic; the history non-decreasing and coherent with the `statusLane` it ends on).
6. Fixture hygiene: no path, no e-mail, no username; actors only from `SYNTHETIC_ACTORS`; the `[path]` and `[email]` tokens in `detailRedaction` are the contract's redaction markers.

**Files**: `scripts/contract/{registry,overlays}.mjs`, their tests, `packages/mission-ui/src/contract/bulk.ts`, `fixtures.generated.ts` (generated). **Edge cases**: `wpUnknownLane` must keep `statusLane`, the history lanes and the subtask-map values consistent through the lane-rewrite rule even though the value (`on_hold`) is outside the nine; unknown change state and verdict are NOT relaxed (the contract has `unknown` as a member and `verdict` is `approved | changes_requested | null`).

### T008 View types, literals, `tsc`, hygiene, CHANGELOG line

**Purpose**: the screen's widened types exist as supertypes of the contract types and nothing of #4 moved.

**Steps**:
1. `packages/mission-ui/src/contract/types.ts` gains `WorkPackageRecordView`, `HistoryEntryView`, `WorkPackageDetailView`, `SubtaskView`, `DependencyRefView` exactly as `data-model.md` ("Widened view types") defines them. #4's `WorkPackageView` stays untouched. Before adding, grep the four new names other than `WorkPackageRecordView` for collisions.
2. `tsc` is green for the Pipeline board and screen (they still compile against the unchanged `WorkPackageView`); every generated fixture is accepted as its view type (a compile-time `satisfies` check in a scratch or the existing type test, not shipped as a new export).
3. Verify the version strings are read, not typed: `grep -rn "1.1.0-SNAPSHOT" scripts packages gates` matches nothing hard-coded in a test or exit check.
4. Add the one CHANGELOG line for IC-01 (out-of-map edit, `CHANGELOG.md` root and `packages/mission-ui/CHANGELOG.md`; WP10 reconciles). If `package.json` must name the two new node test files for the `test:contract` script, that is the one other out-of-map edit; keep it minimal and say so in the hand-off.
5. Run the full exit list below and write the hand-off.

**Files**: `packages/mission-ui/src/contract/types.ts`; out-of-map: both `CHANGELOG.md` files (one line each), `package.json` only if the test script glob needs it.

## Test strategy

Positive controls: `--require-main` on a `main` pin is clean (T004); the floors pass on the real vendoring (T005); every relaxation passes its relaxed schema (T007); each C5 rule passes the contract examples (T006). Exactly-one-event rules do not apply (no element). Revert checks (listed per test file in the hand-off): `update.test.mjs` (working-tree read, path leak), `cli.test.mjs` (drop the argv parse; make `verify-remote` ignore the flag), `check.test.mjs` (drop the C8 branch rule, the floors, each C5 rule), `registry.test.mjs` (drop a relaxation), `overlays.test.mjs` (break the lane-rewrite of one overlay). Anti-vacuity: each new test file's reporter count is above 0 and the plan's literal counts (150 files, 70 fixtures, valid 59, host 4, relaxed 7) appear as literals. No visual test is run by this work package except the baseline record of T001 (inside the pinned container, no baseline written); `pnpm gate-proof` runs once at the end to show plant 4 red.

Exit evidence (all runnable): `pnpm contract:check && pnpm test:contract` green with reporter pass above 0; plant 4 red then green; the CLI spawns pass (`check.mjs --require-main` on a branch pin non-zero with token `pin provenance`, on a main pin zero, without the flag on a branch pin zero); `contract:verify-remote` prints "not verifiable upstream" for the branch pin; the ancestry test (sha on a side branch refused) passes; `pnpm typecheck` green; `pnpm hygiene` green; a `git grep` of the checkout path prefix is empty; `git status --short` empty after the last commit; revert check per test file listed.

## Definition of Done

- All exit evidence commands exit 0; the baseline record of T001 is in the hand-off.
- The hand-off lists commit hashes verified with `git cat-file -t`, the sha pinned and who supplied it, the `SYNTHETIC_ACTORS` additions, the out-of-map edits with rationale, every change request, and the revert check per test file.
- `PIN.json` contains no path; `provenance` is `branch`; the plant text matches the shipped pin.
- No file under `packages/mission-ui/src/elements/`, `apps/` or `kitty-specs/` is touched.

## Risks

- S0: 150 vendored files make the types large; `unevaluatedProperties` can be lost in the generated types (as in #4): if `tsc` strict breaks, fall back to a JSON twin as #4 D-12 did and report to the orchestrator before continuing.
- The lane tip can move before dispatch: use exactly the sha the orchestrator gave you; the plan-time commit is an ancestor of the later tips with identical contract paths.
- A relaxation that is too wide would let a bad fixture through: the allowed-path regexes are anchored and each has a reverted-must-fail proof.
- Windows or macOS git differences are out of scope; the node tests use only portable git plumbing.

## Reviewer guidance

Check that `PIN.json` and every generated header carry no path; that `update.mjs` reads git objects only (revert the blob read and see test (a) fail); that the floors are literals and not computed; that C5 rules are recomputed independently of `overlays.mjs`; that each of the four relaxations has its three-part proof; that `wpPopulated`'s dependencies, files and subtask ids equal `detailPopulated`'s; that #4's `WorkPackageView` and `lane-open` are unchanged; that no hard-coded version string exists; and that the plant is single-purpose. The reviewer is a separate agent; it re-runs two revert checks and runs `pnpm contract:check && pnpm test:contract` itself. Visual drift does not apply here (no pixels).


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

**Drift register status and visual authority (C-006, NFR-008).** The prototype `<prototype>/04-work-package.html` (and `<prototype>/05-artifact.html` for the artifact links) is the visual source of truth. The drift register DW-1 to DW-30 (`spec.md`) is PROPOSED until checkpoint CP-1 and CONFIRMED afterwards: before the `CP-1 confirmed` entry exists in `tracer-design-decisions.md`, no DW item is allowed; afterwards only the DW items that entry names as confirmed (with the operator's amendments) are allowed. An unconfirmed difference is a REJECT item for the work package that introduces it, not a "design review" item. DW-7, DW-24 and DW-30 carry the amended text of the 2026-10-05 rulings.

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
5. The drift items relied on, named by DW id as confirmed in the CP-1 entry (not applicable before CP-1), and every difference from the prototype you saw that is NOT in that list (a REJECT item you must fix before handing over).
6. Every screenshot or image you produced, read and described (what is drawn, the width, anything wrong); uncommitted; where the orchestrator can find it.
7. Exceptions touched (E-17 to E-20 and #4's E-04 to E-16), gaps met (G-09 to G-13), and any decision you took that the plan did not fix.
8. `git status --short` empty after the last commit, and the statement that nothing is running.
9. No absolute path or username appears in the hand-off text itself (use the placeholders).

The reviewer is a separate agent: it reads your hand-off first, re-runs two revert checks, and rejects on any item above that is missing or false.
