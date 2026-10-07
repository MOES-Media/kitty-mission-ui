# Contract: vendoring Mission Status 1.1 (pin, re-pin, types, fixtures)

Decision D-09 and D-10 in `research.md`; the Q8 ruling (2026-10-04) is the authority. #4's file of the same name (`kitty-specs/missions-and-pipeline-screens-01M40SKZ/contracts/contract-pin.md`) describes the mechanism this mission extends; it is not repeated here. Owner of every file below: IC-01 only (a missing fixture is a change request, `plan.md`, "Shared files").

The plan-phase forks are ruled (operator, 2026-10-05; `plan.md`, "Rulings applied"); this file carries the ruled text.

## How #4 vendored 1.0 (the baseline this extends)

`contracts/spec-kitty/{mission-status,_shared}/` hold the upstream files byte for byte (98 at the 1.0 pin `9f41e48fe0e8b00cd040690598e90c37d82ea4a2`); `contracts/spec-kitty/PIN.json` records `repo`, `sha`, `committerDate`, `retrievedAt`, `paths`, `infoVersion`, `changelogTopVersion` and a sha256 per file. `pnpm contract:update --sha <sha>` fetches that commit from the public repository (`git fetch --depth 1`), replaces both directories as a whole, regenerates `types.generated.ts` (`openapi-typescript` 7.13.0) and `fixtures.generated.ts`, rewrites the pin and runs the checks. Gate `contract` C1 compares pin and bytes (hash, file set, `sha` shape, `infoVersion`, `changelogTopVersion`), C2 and C3 byte-compare the generated files with a fresh generation, C4 validates every fixture against its dereferenced schema. `pnpm contract:verify-remote` (network, not a gate) checks the pinned bytes against upstream.

## 1.1 vendoring (what this mission does)

| Step | Command or file | Result |
|---|---|---|
| 1. Provisional pin | `pnpm contract:update --from-repo <checkout of the spec-kitty lane of mission mission-status-contract-1-1-01M42XJC> --sha <tip of that lane>` (plan-time tip: `8cc31f4429ddc0b8baaba9fb6c8ccdb65e9a53a5`, an ancestor of the lane's later tips; `contracts/mission-status` and `contracts/_shared` are identical between them at plan time; the orchestrator records the sha used at IC-01 dispatch) | `contracts/spec-kitty/**` replaced by the 1.1 files (150 at the plan-time tip); `PIN.json` rewritten with `sha`, `provenance: "branch"`, `branch: "kitty/mission-mission-status-contract-1-1-01M42XJC-lane-a"`, `reason`, `infoVersion` and `changelogTopVersion` (read from the pinned commit at IC-01; `1.1.0-SNAPSHOT` at plan-time tip `8cc31f44` only, never hard-coded in a test or exit check; 1.1 is the slice label, not a promised version string) |
| 2. Regenerate | part of step 1 | types and fixtures regenerated; #4's 22 fixture exports unchanged in value (1.1 is additive), registry gains the names below |
| 3. Develop | WPs run `contract:check` and `test:contract` as for 1.0 | gate green on the provisional pin |
| 4. Re-pin | when #5625 is on `spec-kitty` `main`: `pnpm contract:update --sha <main sha>` (network); the command fetches upstream `main` and requires `<main sha>` to be an ancestor of it (`git merge-base --is-ancestor`), failing closed otherwise | `provenance: "main"`; no `branch`/`reason` |
| 5. Prove | `pnpm contract:verify-remote` (also requires the pin sha to be an ancestor of upstream `main` for a `main` pin), `pnpm contract:check --require-main` (both blocking in the wrap-up, orchestrator-run before the draft PR; IC-09 exit check) | upstream bytes equal; the pinned commit is on `main`; no branch pin |

`--from-repo` rules: the path is an argument only. It is never written to `PIN.json`, a fixture, a script output that is committed, or a document (hygiene scans the files; the update command prints a relative description only). Files are read with `git ls-tree -r` and `git cat-file blob` at the given sha, never from a working tree, so uncommitted lane edits cannot enter. `--from-repo` and `--sha` are both required together; `--sha` alone keeps the network behaviour of #4. The sha must exist in the given repository (fail closed otherwise).

Tests of the `--from-repo` rules (new file `scripts/contract/update.test.mjs`, `node:test`, temp git repositories): the git read is factored into one function; (1) commit a file, then edit the working tree: the vendored bytes equal the committed blob; (2) a missing sha throws; (3) `--from-repo` without `--sha` is refused, and `--sha` without `--from-repo` keeps the network path; (4) after an update from a uniquely named temp directory, neither `PIN.json`, nor the generated headers, nor the captured stdout contains that directory name. Each test has a reverted-must-fail check (revert the rule, the test fails). The IC-01 manual `git grep` of the checkout path prefix stays as an additional hygiene check, not as the proof.

### `PIN.json` additions

```json
{
  "provenance": "branch",
  "branch": "kitty/mission-mission-status-contract-1-1-01M42XJC-lane-a",
  "reason": "contract 1.1 (spec-kitty#5625) not on main at vendoring time; re-pin before the pull request"
}
```

`provenance` is `"main"` or `"branch"`. `main` carries neither `branch` nor `reason`. `branch` is the name of the lane branch the commit was read from, as a label; a commit of a local lane has no upstream ref, so the sha (with the hashed files) is the authority and the name is for a human reader only (the repository the name belongs to is the local lane checkout). The existing keys keep their meaning (`retrievedAt` stays informational and uncompared).

### Gate `contract` change: C8 pin provenance

| # | Check | Token |
|---|---|---|
| C8 | `provenance` is `main` or `branch`; `branch` implies non-empty `branch` and `reason`; `main` implies neither; with `--require-main`, `provenance` must be `main` | `pin provenance` |

`contract:check` without the flag accepts a `branch` pin (development); `--require-main` is the PR-readiness form. The flag is read from `process.argv` by `scripts/contract/check.mjs` (today `main()` takes no arguments; IC-01 adds the parsing) and `pnpm` passes it through. The CI job's gate command is unchanged (so `ciCommand` equality and plants keep their meaning); the PR-readiness form runs in the wrap-up, which is a recorded limitation: CI alone cannot see an unrepinned branch pin (research R-02).

Function-level node tests in `check.test.mjs`: a `branch` pin without `reason` gives `pin provenance`; `--require-main` on a `branch` pin gives `pin provenance`; `--require-main` on a `main` pin is clean (positive control).

CLI-level node tests (new file `scripts/contract/cli.test.mjs`, `node:test`, `child_process` spawn of the real scripts against a temp copy of the repository files): `node scripts/contract/check.mjs --require-main` on a `branch` pin exits non-zero and prints `pin provenance`; the same command on a `main` pin exits 0 (positive control); `node scripts/contract/check.mjs` without the flag on a `branch` pin exits 0. The provenance decision of `verify-remote` is factored into a pure function and tested for both outcomes: a `branch` pin prints "not verifiable upstream" and exits 0, and exits non-zero with `--require-main`; the function is also spawned once through the CLI to prove the flag reaches it. These CLI spawns are part of the IC-01 exit checks.

Pin anti-vacuity guard (independent of the pin): the literal floors live in the tests and are edited deliberately at each re-pin; they are NOT computed from `Object.keys(PIN.files)`, because `checkPin` already compares the pin with the directory (file set) and a wrong or emptied vendoring shrinks both together. `check.test.mjs` positive control asserts `vendoredFiles === 150` and `fixtures === 70` (22 + 48), the bulk-page count unchanged; the negative test builds the mismatch from a dropped pin key as today. A presence check for named anchor files (`openapi.yaml`, `schemas/WorkPackageDetail.yaml`, `schemas/ReviewCycle.yaml`, `schemas/Workspace.yaml` and their examples) is added to `check.mjs` and tested with a temp copy missing one anchor. `verify-remote` may additionally compare the file count with `git ls-tree` at the pinned sha. The totals stay 150 files and 70 fixtures under the rulings of 2026-10-05: all 48 new exports are kept (the two omitted-member fixtures validate through named relaxations, the two refusal fixtures are consumed by WP-36a and WP-36b).

Provenance is not only a label: for a `main` pin, `update.mjs` (when writing it) and `verify-remote.mjs` (when checking it) fetch upstream `main` and require the pin sha to be an ancestor (`git merge-base --is-ancestor <sha> <fetched main>`), failing closed otherwise. The ancestry decision is a pure function covered by a node test using a temp repository in which the sha is on a side branch only (the planted case: `update` refuses to write `main`, `verify-remote` exits non-zero); the same test spawns the command once. This proof is listed in the wrap-up proofs (`plan.md`, "PR shape").

### Other tooling changes

- C5 (coherence) gains `WorkPackage`-scoped rules, recomputed independently of `overlays.mjs` as #4 does for Mission documents, applied to every `WorkPackage` fixture (the ten contract examples included; a contract example that violates a rule is escalated, never relaxed): `readyToStart` equals (`statusLane` is `planned` and `readiness.satisfied`); `subtaskProgress.done` and `.total` equal the counts of the `subtasks` map; `history` is non-decreasing by `at` then ascending by `eventId`; the last history entry's `toStatusLane` equals `statusLane`, and a null `statusLane` goes with an empty history; `readiness.unsatisfied` is a subset of `dependencies`. Each rule has a negative node test (a fixture built to violate exactly that rule fails with its token, and passes when reverted).
- `actorProblems` is extended to the `WorkPackage` shapes (`actor`, `history[].actor`, `review.latestResult.reviewer`, `detail.reviewCycles[].reviewer`) so the sentence "every actor value comes from `SYNTHETIC_ACTORS`" is enforced for `WorkPackage` and `WorkPackageDetail` documents. `SYNTHETIC_ACTORS` gains the contract example handles the fixtures keep (for example `reviewer-renata`), each listed in the IC-01 hand-off; C6's username leg still scans every string value.
- C7 (event-stream identifiers) is unchanged; the 1.1 names the screen uses (`ReviewCycle`, `WorkPackageDetail`, ...) are not stream names.
- New named relaxations (below): `RELAXATIONS` entries already carry their own `schema` in #4 (`phases-open`, `lane-open`); `check.mjs` gains the assertion that a fixture's `def.schema` equals `RELAXATIONS[relaxation].schema` (#4's `lane-open` stays bound to `MissionDetail`, unchanged).

## Relaxations new in this mission (modelled on #4's `lane-open`, which cannot be reused for the first two)

#4's `lane-open` patches `MissionDetail.workPackages[].statusLane` through `schema.allOf` and allows only `/workPackages/N/statusLane`; applied to `WorkPackage` or `WorkPackageDetail` its patch would throw and its path rule would reject the other lane members. Four new entries are declared in `scripts/contract/registry.mjs` `RELAXATIONS` (operator ruling 2026-10-05, CORRECT-003 (a), for the last two):

| Name | Schema | Patch (lane members become `string` or `null`; nothing else changes) | `allowedPath` (strict errors may only be at) |
|---|---|---|---|
| `wp-lane-open` | `WorkPackage` | `statusLane`; `history[].fromStatusLane`; `history[].toStatusLane`; the values of the open `subtasks` map | `^/statusLane$`, `^/history/\d+/(from\|to)StatusLane$`, `^/subtasks/[^/]+$` |
| `detail-lane-open` | `WorkPackageDetail` | `Subtask.statusLane` and `DependencyRef.statusLane` inside the detail's `subtasks` and `dependencies` | `^/subtasks/\d+/statusLane$`, `^/dependencies/\d+/statusLane$` |
| `provisional-omittable` | `WorkPackage` | removes `staleness` from `required` (nothing else) | the `required` error at the document root, naming only `staleness` |
| `detail-omittable` | `WorkPackageDetail` | removes `reviewCycles` and `workspace` from `required` (nothing else) | the `required` error at the document root, naming only `reviewCycles` or `workspace` |

Why the last two exist: `stripHost` only removes keys and never adds one, so a document with `staleness`, `reviewCycles` or `workspace` truly absent would fail the strict closed schema; these are the only fixtures that prove omitted differs from null or empty (FR-018, Q9), so they stay single-source fixtures checked by the gate rather than being built in stories. Proof, per entry, in `check.test.mjs`: the fixture passes the relaxed schema, fails the strict one, and every strict error is at an allowed path (a fixture with an unknown value elsewhere, for example `verdict`, or missing any other member, still fails); reverting the patch makes the fixture fail (reverted-must-fail). `registry.test.mjs`'s relaxed-count and kind-tally assertions are updated (below).

## Generated types header (updated)

```
/**
 * Generated by `pnpm contract:generate` (openapi-typescript 7.13.0) from
 * contracts/spec-kitty/mission-status/openapi.yaml at spec-kitty <sha>
 * (mission-status contract <version read from the pinned commit at IC-01>). Do not edit: the contract gate regenerates and byte-compares this file.
 */
```
(No path, no timestamp, as in #4.)

## Test files and literals IC-01 updates

`scripts/contract/check.test.mjs`, `registry.test.mjs`, `overlays.test.mjs` are all in IC-01's scope, with revert checks per file. Literals to edit: vendored files 98 to 150; fixtures 22 to 70; the registry tally of #4 (`15 valid, 4 host, 3 relaxed`) to the new tally (valid 59, host 4, relaxed 7 under the inventory below: the 48 new exports are 44 valid and 4 relaxed); `kinds.length` 22 to 70; `overlays.test.mjs` `Object.keys(fixtures).length` 22 to 70; the guard texts "registry of 21 entries against 22 exports" and "PIN.files of 97 keys against 98 files" are rewritten from computed values with the 69 and 149 variants. New files: `update.test.mjs`, `cli.test.mjs`.

## Fixture inventory for this mission (added to #4's 22; frozen after IC-01)

`Kind`: `valid` (contract document as is, or an overlay that stays valid), `host` (a document with host-only fields stripped before validation, as #4's four; this mission adds none), `relaxed` (named relaxation with a reverted-must-fail proof; includes the two omitted-member documents). `satisfies` ends each export (`WorkPackage` fixtures `satisfies WorkPackage` unless noted, and are accepted as `WorkPackageRecordView`). Overlays are named in `overlays.mjs`; counts and derived values are declared per overlay as in #4.

### Lane-rewrite rule (every overlay that changes `statusLane`)

An overlay that changes `statusLane` also rewrites, in the same overlay: the `history` (a prefix of the base history, plus appended entries with later `at` and ascending `eventId` where the target lane lies beyond the base), so that the last entry's `toStatusLane` equals the new `statusLane`; `lastTransitionAt` and `lastEventId` to that entry's; `subtasks` and `subtaskProgress` (planned or claimed lane: none done; `in_progress`: partly done; `for_review`, `approved`, `done`: all done); `review` consistently with the entries' `reviewVerdict`; and `readyToStart`. The C5 `WorkPackage` rules above recompute all of it, so an overlay cannot drift. Concrete overlays (base `WorkPackage.populated`, WP04, history entries 1 to 5, ends at `for_review`):

| Fixture | Lane | History | Subtasks and progress | Review |
|---|---|---|---|---|
| `wpPopulated` | `in_progress` | first 2 entries | map = the three subtask ids of `detailPopulated` (`T017` done, `T018` in progress, `T019` planned); progress 1 of 3; `dependencies` `[WP03]` and `ownedFiles` patterns equal `detailPopulated`'s | `latestResult` null, `override` null |
| `wpReviewNone` | `for_review` | first 3 entries | all done | both null |
| `wpChangesRequested` | `in_progress` | first 4 entries (the 4th carries `changes_requested`) | `T017` done, `T018` in progress, `T019` planned | `latestResult` changes requested with the reference of the 4th entry |
| `wpApproved` | `approved` | all 5, plus a 6th `for_review` to `approved` by a reviewer with `reviewVerdict` approved | all done | `latestResult` approved with reference |
| `wpDone` | `done` | as `wpApproved`, plus a 7th `approved` to `done` | all done | `latestResult` approved |
| `wpReady` | `planned` | one entry (null to `planned`) | none done | none |
| `wpBlocked` | `planned` | one entry (null to `planned`) | none done | none |

### `WorkPackage` fixtures

| Export | Kind | Base example and overlay | Rows |
|---|---|---|---|
| `wpPopulated` | valid | `WorkPackage.populated`, overlay per the table above | WP-01, and the default WorkPackage side of every pair that does not name another (Pairing) |
| `wpWithPrompt` | valid | `WorkPackage.with-prompt` | named test: WP07 `wp-work-parts.test.ts`, the screen mounted with it draws no prompt body text anywhere (N-3: the screen ignores `promptMarkdown`), paired with `wpPopulated` where the same assertion finds the Open prompt control |
| `wpProvisional` | valid | `WorkPackage.provisional` | named test: WP05 `wp-header-parts.test.ts`, the contract's provisional-staleness example drawn through the screen shows exactly what `stalenessView` says for its status (badge, quiet row or nothing), with its minutes and reason words and no `undefined` |
| `wpNoEvents` | valid | `WorkPackage.no-events` | WP-09, WP-10 |
| `wpActorStructured` | valid | `WorkPackage.actor-structured` | WP-17 |
| `wpActorHandle` | valid | `WorkPackage.actor-handle` | WP-18 |
| `wpActorRedacted` | valid | `WorkPackage.actor-redacted` | WP-19 |
| `wpCanceled` | valid | `WorkPackage.canceled` (operator reason) | WP-23 |
| `wpCanceledSynthetic` | valid | `wpCanceled` with `reasonSource: synthetic` | WP-24a |
| `wpCanceledNullReason` | valid | `wpCanceled` with `reason: null` | WP-24b |
| `wpOverride` | valid | `WorkPackage.override` | WP-05 |
| `wpOverridePartial` | valid | `WorkPackage.override-partial` | WP-06 |
| `wpReviewNone` | valid | overlay per the table | WP-02 |
| `wpApproved` | valid | overlay per the table | WP-03, WP-28, WP-29, WP-49 |
| `wpChangesRequested` | valid | overlay per the table | WP-04 |
| `wpDone` | valid | overlay per the table | WP-07 |
| `wpHistoryRich` | valid | forced transition (`forceCount` set to the number of forced entries), a transition with `reason`, first entry `fromStatusLane` null, history non-decreasing | WP-08 |
| `wpStale` / `wpFresh` / `wpNotApplicable` | valid | `staleness` stale (minutes, reason), fresh, not_applicable with a reason | WP-20, WP-21a, WP-21b |
| `wpStalenessOmitted` | relaxed `provisional-omittable` | `wpPopulated` with the `staleness` property absent | WP-22 |
| `wpFactsNull` | valid | optional members null or empty (`executionMode`, `priority`, `mergeTargetBranch`, `phaseLabel`, `trackerRefs`, `implementerOfRecord`) | WP-38 |
| `wpBlocked` | valid | overlay per the table: `dependencies` `[WP01, WP02]`, `readiness` unsatisfied with exactly those two ids, `readyToStart` false | WP-13 |
| `wpReady` | valid | overlay per the table: `readiness` satisfied, `readyToStart` true, `dependencies` `[WP03]` | WP-14 |
| `wpLong` | valid | long unbroken-word and long-sentence title, reason, reference (carried by a present `review.latestResult`, so the pair is a review-state exemption, with WP-29), branch, handles | WP-44 |
| `wpBulkHistory` | valid | `bulk.makeWorkPackageHistory(60)` (non-decreasing, coherent with `statusLane`) | WP-44 |
| `wpUnknownLane` | relaxed `wp-lane-open` | `statusLane`, history lanes and subtask-map lanes with a value outside the nine (`on_hold`) | WP-45 |

### `WorkPackageDetail` and refusal fixtures

| Export | Kind | Base example and overlay | Rows |
|---|---|---|---|
| `detailPopulated` | valid | `WorkPackageDetail.populated` (two cycles, changes requested then approved, with `artifactPath`, three subtasks, one dependency, mixed files, workspace, both links) | WP-03, WP-04, WP-28, WP-49 with cycles; WP-01, WP-11, WP-14, WP-25, WP-31, WP-34, WP-46, WP-47, WP-48 with `cycles: 'none'` (an empty-cycles derivative made by `pairDetail`, no new fixture) |
| `detailNoCycles` | valid | `.no-cycles` | WP-02, WP-29 |
| `detailNullWorkspace` | valid | `.null-workspace` (all members null, `worktreePresent` false: the "no lanes" workspace) | WP-33b |
| `detailWorkspaceNoWorktree` | valid | `detailPopulated` with `workspace` `laneId` `lane-a`, a lane branch, `planningBranch` set, `worktreePresent` false (a lane present but no worktree; no claim that it was removed, R-4) | WP-32 |
| `detailPlanningLane` | valid | `.planning-lane` | WP-33a |
| `detailUnknownChangeState` | valid | `.unknown-change-state` (three `unknown` files) | WP-26 |
| `detailUnparseableCycle` | valid | `.cycle-without-path` (cycle 2 all null, `spec` null; after the re-pin to `main` b61d1fa33, whose `.unparseable-cycle` carries a pointer and a path, the all-null cycle is this example) | WP-30, WP-35b |
| `detailRefusalNotFound` | valid (`WorkPackageDetailRefusal`) | `WorkPackageDetailRefusal.not-found` | WP-36a (its `code` feeds `detailRefusalCode`) |
| `detailRefusalUnreadable` | valid (`WorkPackageDetailRefusal`) | `.source-unreadable` | WP-36b (its `code` feeds `detailRefusalCode`) |
| `detailSubtasksNone` | valid | `detailPopulated`, `subtasks: []` (paired with `wpNoEvents`, whose 1.0 `subtaskProgress` total is 0) | WP-10 |
| `detailSubtaskNulls` | valid | one subtask with `title` null and `statusLane` null | WP-12 |
| `detailDepsNone` | valid | `dependencies: []` | WP-15 |
| `detailDepsBlocked` | valid | `detailPopulated` with two dependencies with titles, `WP01` (lane `planned`) and `WP02` (lane `in_progress`), ids equal to `wpBlocked.readiness.unsatisfied` | WP-13 |
| `detailDepNullLane` | valid | a dependency with `statusLane` null and a title equal to its id | WP-16 |
| `detailOwnedNone` | valid | `ownedFiles: []` | WP-27 |
| `detailLinksPromptNull` | valid | `artifactReferences.prompt` null | WP-35a |
| `detailLinksNone` | valid | both null | WP-35c |
| `detailRedaction` | valid | subtask and dependency titles containing `[path]` and `[email]` | WP-50 |
| `detailLong` | valid | `bulk.makeSubtasks(40)`, `bulk.makeOwnedFiles(100)`, long titles | WP-44 |
| `detailUnknownLanes` | relaxed `detail-lane-open` | a dependency and a subtask with an unknown lane value | WP-45 |
| `detailOmittedProvisional` | relaxed `detail-omittable` | `detailPopulated` without `reviewCycles` and `workspace` | named tests (FR-018): WP06 `wp-review-parts.test.ts` (the omitted side of the `reviewCycles` omitted-versus-`[]` pair, against `detailNoCycles`) and WP07 `wp-work-parts.test.ts` (the omitted side of the workspace omitted-versus-all-null pair, against `detailNullWorkspace`); it is the reason `detail-omittable` exists |

Total new exports: 27 `WorkPackage` + 21 detail and refusal = 48; total fixtures 22 + 48 = 70. The totals are settled by the rulings of 2026-10-05 (CORRECT-003 (a) keeps the two omitted-member fixtures, CORRECT-008 (a) keeps the two refusal fixtures). Kind tally of the 70: valid 59 (15 of #4 + 44 new), host 4 (#4's), relaxed 7 (#4's 3 + `wpUnknownLane`, `detailUnknownLanes`, `wpStalenessOmitted`, `detailOmittedProvisional`). The exact count is fixed by the literal in `check.test.mjs` and `registry.test.mjs` (above), in both directions. Every `actor` value comes from `SYNTHETIC_ACTORS` (enforced by the extended `actorProblems`); reviewers and handles in fixtures are synthetic; no path or e-mail (the `[path]` and `[email]` markers are redaction tokens the contract defines).

### Pairing (host compositions)

A story pairs a `workPackage` with a `detail`; pairs are declared in the story files through one helper `pairDetail(workPackage, detail, options?)` in `elements/sk-work-package-screen/fixtures.ts`, never as fixtures. The helper returns the detail with `wpId` set to the WorkPackage's `wpId` (the detail examples carry fixed ids WP01 to WP06, the WorkPackage bases WP01 to WP10, so the id is rewritten on the detail side for every pair) and, where the table says so, with `reviewCycles` reduced by the `cycles` option: `'first'` (first cycle only), `'last'` (last cycle only) or `'none'` (an empty-cycles derivative: `reviewCycles: []`). A WorkPackage-only story renders `detail: null` (bare lists, FR-004 degradation) unless the table names a detail. Unless a row names another WorkPackage, the WorkPackage side is `wpPopulated` (WP04, `in_progress`, no review result yet).

Review-state agreement (operator ruling 2026-10-05, FRESH-002 (a)): a pair must not tell two stories about the review. Every pair whose WorkPackage has no `review.latestResult` therefore uses `cycles: 'none'`, except the two rows that deliberately carry the unparseable cycle (WP-30 and WP-35b: its verdict is null, so it asserts nothing about a result). Where a `latestResult` is present, the last paired cycle carries the same verdict (WP-03 approved, WP-04 changes requested, WP-28 and WP-49 approved); WP-29 and WP-44 are the two deliberate cases of a present `latestResult` with no cycles (Q11's summary-alone case: the summary shows alone, with no cycle rows and no none-found statement); WP-44 needs it because the long "reference" of its pass text exists only as `review.latestResult.reference`. The documented exemption list of the review-state agreement rule is therefore exactly WP-29 and WP-44 (plus WP-30 and WP-35b, which carry a null verdict).

| Story | WorkPackage | Detail |
|---|---|---|
| WP-01 | `wpPopulated` | `detailPopulated`, `cycles: 'none'` (no review yet: the Review panel shows the empty summary form and the none-found cycles statement) |
| WP-02 | `wpReviewNone` | `detailNoCycles` |
| WP-03 | `wpApproved` | `detailPopulated`, `cycles: 'last'` |
| WP-04 | `wpChangesRequested` | `detailPopulated`, `cycles: 'first'` |
| WP-10 | `wpNoEvents` (its `subtasks` map is empty and `subtaskProgress` is 0 of 0, so both payloads agree) | `detailSubtasksNone`, `cycles: 'none'` |
| WP-12, 15, 16, 27, 50 | `wpPopulated` | `detailSubtaskNulls`, `detailDepsNone`, `detailDepNullLane`, `detailOwnedNone`, `detailRedaction`, each `cycles: 'none'` |
| WP-11, 25, 31, 34 | `wpPopulated` | `detailPopulated`, `cycles: 'none'` |
| WP-28 | `wpApproved` | `detailPopulated` (both cycles) |
| WP-13 | `wpBlocked` | `detailDepsBlocked`, `cycles: 'none'` |
| WP-14 | `wpReady` | `detailPopulated`, `cycles: 'none'` |
| WP-26, 32, 33a, 33b, 35a, 35c | `wpPopulated` | `detailUnknownChangeState`, `detailWorkspaceNoWorktree`, `detailPlanningLane`, `detailNullWorkspace`, `detailLinksPromptNull`, `detailLinksNone`, each `cycles: 'none'` |
| WP-29 | `wpApproved` (a `latestResult` is present) | `detailNoCycles` |
| WP-30, 35b | `wpPopulated` | `detailUnparseableCycle` (the all-null cycle is kept) |
| WP-44 | `wpLong` (plus `wpBulkHistory` as the history) | `detailLong`, `cycles: 'none'` (the subject is long text, not review; `wpLong` carries a `latestResult` with the long reference, so the summary shows alone like WP-29: a documented exemption of the review-state agreement) |
| WP-45 | `wpUnknownLane` | `detailUnknownLanes`, `cycles: 'none'` |
| WP-46, 47, 48 | `wpPopulated` | `detailPopulated`, `cycles: 'none'` (as WP-01; the tiers differ only in the viewport) |
| WP-49 | `wpApproved` | `detailPopulated` (dependencies, two cycles with paths, spec and prompt links, so the tab-stop test sees every control kind) |
| WP-05 to 09, 17 to 24b, 38 | the row's `wp...` fixture | none |

WP-29 differs from WP-02 on the WorkPackage side (`wpApproved` against `wpReviewNone`), so the two are not the same composition; `wpApproved` against `detailPopulated` (WP-28, WP-49) carries a subtask list that differs from its 1.0 map, which is shown as given (research R-08).

The IC-09 node test takes this table as input and asserts: every pair agrees on `wpId` after pairing (no deliberate disagreement case exists in the stories; the mismatched-detail behaviour is covered by IC-07's element tests with cast inputs); no pair makes a Work Package depend on itself; for WP-01, WP-13 and WP-14 the `dependencies` ids of both sides are equal and, for WP-13, `readiness.unsatisfied` equals both; the review-state agreement above holds for every pair (with a negative case: `wpPopulated` + `detailPopulated` without `cycles: 'none'` fails); and no two stories share WorkPackage fixture, detail fixture, `cycles` option and status/detailStatus unless the table lists them as same-composition rows (WP-01, 11, 25, 31, 34, which differ in region under test; the viewport rows WP-46 to 48, which differ in viewport; WP-28 and WP-49, the same `wpApproved` + `detailPopulated` composition, which differ in what they test: WP-28 the cycle rows and "Open review", WP-49 the tab order, told apart by the tab-order tag only; and WP-30 and WP-35b, the same `wpPopulated` + `detailUnparseableCycle` composition, which differ in the region under test: WP-30 the cycle, WP-35b a different region (the unparseable cycle kept beside it); each exempt row set is listed by literal ids in the test, so a new accidental duplicate still fails); negative case: WP-02 against WP-29 must not be flagged as a shared pairing. The lists of the two payloads may otherwise differ (research R-08) and are shown as given. For WP-32 the test asserts that no word implying removal appears in the workspace panel.
