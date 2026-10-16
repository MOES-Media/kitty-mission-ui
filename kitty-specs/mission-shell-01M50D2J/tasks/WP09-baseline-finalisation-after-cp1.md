---
work_package_id: WP09
title: 'IC-08b: Baseline finalisation after CP-1'
dependencies:
- WP08
requirement_refs:
- FR-018
- SC-007
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement
  this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless
  the human explicitly redirects the landing branch.
subtasks:
- T044
- T045
- T046
- T047
history: []
agent_profile: frontend-freddy
authoritative_surface: apps/storybook/tests/visual/__snapshots__/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- apps/storybook/tests/visual/__snapshots__/shell-*.png
role: implementer
tags: []
tracker_refs: []
---

# WP09 — IC-08b: Baseline finalisation after CP-1

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Turn WP08's eleven candidate `shell-*.png` baselines into the final, approved set. Check the CP-1 record first, apply
any CP-1 amendment under the plan IC-08b grant, regenerate or verify the baselines against `design-review.sha256`,
and re-prove P-6 (and P-7 when `MissionShell.svelte` changes). If CP-1 approved the candidates unchanged, this WP
applies nothing and only verifies.

## Context

- **Plan**: IC-08b ("Baseline finalisation after CP-1"). It depends on IC-08a (WP08) and on CP-1 ("Design review",
  orchestrator-owned, **not** a work package). Plan "Timeline risks" 3 (CP-1 latency gates this WP and the final
  visual run) and 4 (the pinned image on Linux x86_64 with podman, run under `heavy`, about 18 min per visual run, one
  at a time).
- **CP-1 procedure**: tasks-notes "CP-1: an orchestrator checkpoint, not a work package", steps 1 to 5. The
  orchestrator commits `design-review.md` (a dated `CP-1 confirmed` entry with any amendments) and
  `design-review.sha256` on `feat/mission-shell-18`, and brings that commit into this lane before dispatch. This WP
  checks both as its first step and stops if either is absent (step 4). If P-6 is re-anchored, this WP reports the new
  anchor and the orchestrator updates the contract anchor quotes (step 5).
- **Research**:
  - R-14 (CP-1, the record, the checks). Candidates come only from `heavy pnpm visual:update` in the pinned image.
    IC-08b applies the amendment, regenerates, re-proves P-6, and **asks the orchestrator to update both records**.
    Any rebase or commit touching a `shell-*.png` after CP-1 reopens CP-1.
  - R-12 (the ruled P-6, decision `01M50HMCBJMREJ5XJASGE29X73`, option A): a guaranteed visible tone change on the
    reconnecting line of the tone table in `src/ui/ConnectionBanner.svelte`. Token
    `shell-connection-banners--reconnecting-1280-diff.png`.
  - R-15 (proof-leg cost): P-7 is the mounted-shell routing plant in `test/shell`; WP10 derives provisional timeouts
    from the leg times recorded here.
  - R-17 (the frozen surface, the visual harness, baseline rule R5-01).
- **Contracts** (normative; never contradict them):
  - `contracts/stories.md`: the 11-row "Catalogue", "Baselines and approval (research R-14)", "Plants" (P-6).
  - `contracts/connection-presentation.md`: the five banner conditions with tone, announce, title and default copy,
    the Refresh button, and the P-6 anchor line `reconnecting: { tone: 'attention', announce: 'polite' },`. Every row
    carries the design-review flag; CP-1 confirms or amends it.
- **Squad findings applied**: R5-05 (`design-review.sha256` in `sha256sum` format, set equality, reopen rule); R6-04
  (IC-08 split around CP-1, the amendment grant); FS-04 (the grant covers P-6's find and replace and the banner and
  copy tests; P-6 stays a visible tone change; regression exit checks `pnpm test`, `pnpm lint`, `pnpm typecheck`, and a
  P-7 re-proof when `MissionShell.svelte` is touched); R5-01 (no existing baseline changes).
- **Spec**: FR-018 (an approved baseline for each banner state and layout composition, flagged for design review) and
  SC-007 (every banner state and layout composition has a story with an approved baseline in the visual gate; the
  design-review flag is recorded on the pull request).
- **What the dependency delivers** (WP08, IC-08a): the eleven stories under `packages/mission-shell/src/stories/`, the
  Storybook integration, P-5, the moved P-6 in `gates/plants/visual/plant.json`, and the eleven candidate
  `shell-*.png` committed as WP08's recorded out-of-map edit, with WP08's local P-6 leg time. Earlier WPs deliver
  `src/core/connection.ts` and the controller (WP03) and the view `src/ui/**` with the banner tone table and the
  `SCREENS` table that P-7 anchors on (WP06).
- **Who consumes this WP**: the orchestrator (the new anchor and new hashes, when there was an amendment); WP10 (IC-09)
  re-runs `sha256sum -c` in its frozen-surface check and uses the leg times recorded here; the pre-merge squad runs
  `sha256sum -c` again; the PR body carries the "Design review" section (SC-007).

## Ownership

**Owned files** (stage only these, plus the recorded out-of-map edits):

- `apps/storybook/tests/visual/__snapshots__/shell-*.png`

**Out-of-map edits** (ALL only for a CP-1 amendment, plan IC-08b grant / FS-04):

- `packages/mission-shell/src/ui/**` (owned by WP06) — apply amended presentation.
- `packages/mission-shell/src/core/connection.ts` (owned by WP03) — amended copy/conditions.
- `gates/plants/visual/plant.json` (owned by WP08) — re-anchor P-6 only if CP-1 changes the reconnecting tone (P-6 must
  remain a VISIBLE tone change, e.g. danger → info if CP-1 makes reconnecting danger).
- `packages/mission-shell/test/shell/banners.test.ts` (owned by WP06) and
  `packages/mission-shell/test/logic/connection.test.ts` (owned by WP03) — follow an amendment.

The two contract anchor quotes (`contracts/connection-presentation.md`, `contracts/stories.md`) are **NOT** edited from
the lane. Plan IC-08b lists them in the grant, but tasks-notes CP-1 step 5 routes them through the orchestrator,
because planning artifacts are not edited from a lane. WP09 reports the new anchor, and the orchestrator updates both
quotes on `feat/mission-shell-18` in the same commit as the new `design-review.sha256`.

If CP-1 approved the candidates unchanged, **none** of these out-of-map edits is made. Each edit that is made is listed
in the final report with the amendment it implements. Any other change you need in a file you do not own (for example
a story in `src/stories/**`, which is WP08's and outside the grant) is a **change request** in the final report (file,
change, reason), not an edit.

**Do not touch**:

- `kitty-specs/mission-shell-01M50D2J/design-review.md` and `design-review.sha256` (the orchestrator's records), and
  every other file under `kitty-specs/`, including `contracts/*.md`.
- **Any existing baseline** (R5-01): no `__snapshots__/*.png` other than the eleven `shell-*.png` may be added,
  modified, deleted or renamed. No `shell-*.png` beyond the eleven catalogue ids may be added.
- The visual harness: `scripts/visual.sh`, `apps/storybook/playwright.config.ts`, `apps/storybook/tests/visual/**`
  except the `shell-*.png` files.
- `packages/mission-ui/**` (C-002, SC-006).
- The frozen surface (C-003; research R-17): `src/client/port.ts` and all of `src/client/**`, `src/contract/stream.ts`,
  `src/testing.ts`, `src/index.ts`, `src/harness/**`, `src/Shell.svelte`, `contracts/fixtures/*`, and the gate wiring
  (the `ci.yml` structure, `scripts/gate-proof.mjs` and `scripts/gate-proof/**`, every plant's `ciCommand` and
  `prepare`, the root gate scripts, `apps/storybook`'s `scripts`).
- `packages/mission-shell/src/stories/**`, `apps/storybook/.storybook/**`, `apps/storybook/package.json`,
  `pnpm-lock.yaml`, `gates/plants/storybook-build/**`, `gates/plants/unit-tests/plant.json`, `eslint.config.mjs`.

## Subtask T044: CP-1 file precondition (first step and first exit check)

**Purpose**: no finalisation without an approval record. CP-1 is an orchestrator checkpoint the tool cannot express
as a dependency, so this WP checks for it by hand before doing anything else (tasks-notes CP-1 step 4; research R-14).

**Steps**:

1. Set the base: `base=$(git merge-base HEAD main)`.
2. Check that both files exist in the lane:
   - `kitty-specs/mission-shell-01M50D2J/design-review.md`;
   - `kitty-specs/mission-shell-01M50D2J/design-review.sha256`.
3. Find the CP-1 commit (the commit that added the record) and check it is in this lane:
   ```bash
   cp1=$(git log --format=%H --diff-filter=A -n 1 -- kitty-specs/mission-shell-01M50D2J/design-review.md)
   git merge-base --is-ancestor "$cp1" HEAD
   ```
   The second command must exit 0. Also confirm `design-review.sha256` is present at `$cp1`
   (`git cat-file -e "$cp1":kitty-specs/mission-shell-01M50D2J/design-review.sha256`).
4. Read `design-review.md`. It must contain a **dated** entry with the literal text `CP-1 confirmed` (an ISO date
   `YYYY-MM-DD` on the entry). Copy out the amendments it lists, verbatim, or the statement that there are none.
5. Read `design-review.sha256` and check its form:
   - `sha256sum` format: each line is 64 lowercase hex characters, two spaces, a path;
   - every path is repository-relative (no leading `/`, no `..`, no home or user segment) and lies under
     `apps/storybook/tests/visual/__snapshots__/shell-`;
   - exactly eleven lines, one per catalogue id of `contracts/stories.md` (5 `shell-connection-banners--*-1280`, 6
     `shell-layouts--*-1280`), no duplicates.
6. **Stop and report** if any check fails: a file is missing, `$cp1` is not an ancestor of `HEAD`, the entry is undated
   or does not say `CP-1 confirmed`, or the hash file is malformed. Do not create, repair or edit either record. Do not
   wait for the operator. Mark nothing done.
7. Classify each amendment against the grant (plan IC-08b):
   - **in grant**: banner tone or announce (`src/ui/ConnectionBanner.svelte`), shell presentation in `src/ui/**`,
     copy or condition mapping in `src/core/connection.ts`, and the banner and copy tests that follow them;
   - **out of grant**: anything in `packages/mission-ui/**`, the port or the frozen surface, the stories or the
     catalogue (a new, renamed or removed story), the harness, or a new dependency. Those are a change request to the
     orchestrator; stop if one blocks the finalisation.
   - **ambiguous**: an amendment you would have to interpret. Report it with the reading you propose and stop; do not
     guess at the operator's intent.

**Files**: none edited (read only).

**Validation**: the final report quotes the dated `CP-1 confirmed` line, the `$cp1` hash and the ancestor check's exit
status, the line count of `design-review.sha256`, and the amendment list with each item classified. "No amendments"
is recorded explicitly when that is the case.

## Subtask T045: Apply amendments (if any) under the grant

**Purpose**: make the shell match what the operator confirmed at CP-1, within the IC-08b grant, and keep P-6 a
visible tone change (FS-04; research R-12).

**If CP-1 approved the candidates unchanged**: T045 is a **no-op**. Change no file. Record "T045: no-op, CP-1
approved the candidates unchanged" in the final report and mark it done.

**Steps** (amendment path):

1. Apply each in-grant amendment in its one home (contract `connection-presentation.md`, "One home for each part",
   FS-06):
   - copy and the state → condition mapping in `packages/mission-shell/src/core/connection.ts`;
   - tone and announce in the one-line-per-condition table in `packages/mission-shell/src/ui/ConnectionBanner.svelte`;
     keep the table one line per condition and keep the reconnecting entry on a single line;
   - layout or presentation in `packages/mission-shell/src/ui/**` (shell CSS lays out only; spacing from a
     `--sk-space-*` token). `MissionShell.svelte` keeps exactly one root `<sk-mission-shell>` and the `SCREENS` table
     one entry per line (P-7 anchors on `drift: DriftScreen,`).
2. Keep the domain language: "Mission", "service" and "contract" as the contract uses them; the terminology gate scans
   the copy. The banned synonym for "mission" never appears.
3. Follow the amendment in the tests, and only as far as it reaches:
   - `packages/mission-shell/test/logic/connection.test.ts` for copy and condition changes;
   - `packages/mission-shell/test/shell/banners.test.ts` for tone, announce and rendering changes.
   Update the expected values; never weaken an assertion, delete a case, or loosen a timing check (NFR-004 tests stay
   on the fake scheduler).
4. **P-6 re-anchor** (only if CP-1 changes the reconnecting tone):
   - The new `find` is the amended reconnecting line, byte for byte, for example
     `reconnecting: { tone: 'danger', announce: 'polite' },`. It must occur **exactly once** in
     `ConnectionBanner.svelte` (`grep -cF` gives 1).
   - The new `replace` changes **only the tone**, to a different tone that renders visibly differently: if the new
     tone is `danger`, replace with `info`; otherwise `danger` stays the replacement unless it equals the new tone.
     The replacement tone must differ from the new reconnecting tone; never pick a tone that renders the same.
   - Edit only `find` and `replace` in `gates/plants/visual/plant.json`. `gate`, `ciCommand`, `prepare`,
     `expectFailPattern` (the token stays `shell-connection-banners--reconnecting-1280-diff.png`, since the story id
     does not change) and the overlay `target` stay byte-identical.
   - If CP-1 changes the reconnecting line in any other way (for example its `announce`), the current `find` breaks
     too. Report it to the orchestrator before editing the plant, with the proposed `find` and `replace`; the grant is
     worded for a tone change.
5. **Report the new anchor** for the orchestrator (tasks-notes CP-1 step 5): the old `find`, the new `find`, the new
   `replace`, and the two contract places that quote them (`contracts/connection-presentation.md`, "Banners";
   `contracts/stories.md`, "Plants" P-6). Do not edit the contracts.
6. Commit the amendment as its own commit, listing each out-of-map file in the message body with the amendment it
   implements.

**Files** (amendment path only): `packages/mission-shell/src/core/connection.ts`, `packages/mission-shell/src/ui/**`,
`packages/mission-shell/test/logic/connection.test.ts`, `packages/mission-shell/test/shell/banners.test.ts`,
`gates/plants/visual/plant.json`.

**Validation**:

- `pnpm --filter @moes-media/mission-shell typecheck` (svelte-check, `--fail-on-warnings`) and `pnpm lint` are clean.
- `git diff --name-only "$cp1" HEAD` lists only the granted files and `shell-*.png`.
- When re-anchored: the new `find` occurs exactly once, and the `replace` tone differs from the new reconnecting tone.
- The final report records every amendment with the file and line it changed, or the no-op line.

## Subtask T046: Regenerate or finalise the baselines and check them against the record

**Purpose**: the eleven `shell-*.png` in the lane are exactly the approved set: hash for hash with
`design-review.sha256` when nothing changed, or freshly regenerated in the pinned image with new hashes handed to the
orchestrator when an amendment changed pixels (research R-14; R5-05; R5-01).

**Steps**:

1. **No-amendment path** (verify only). Do **not** run `visual:update`: a regeneration can change bytes without
   changing pixels, and any commit touching `shell-*.png` after CP-1 reopens it.
   - `sha256sum -c kitty-specs/mission-shell-01M50D2J/design-review.sha256` from the repository root; every line
     prints `OK`.
   - Go to step 3.
2. **Amendment path** (regenerate), in the pinned image only (Linux x86_64 and podman), foreground:
   - `heavy pnpm visual:update`. Never generate baselines with a host browser.
   - Compare against the CP-1 set: `git diff --name-only "$cp1" -- apps/storybook/tests/visual/__snapshots__/`. Each
     changed `shell-*.png` must be explained by an amendment (for example a reconnecting copy change touches only
     `shell-connection-banners--reconnecting-1280.png`). Open every changed PNG and check it against the amendment and
     its catalogue composition.
   - A `shell-*.png` that changed with no amendment reaching it is byte churn: restore it with
     `git checkout "$cp1" -- <path>` and record it as a stability finding.
   - If `visual:update` rewrote any existing (non-`shell-*`) baseline, restore it with `git checkout -- <path>` and
     record it as a stability finding.
   - Produce the proposed record lines, repository-relative and sorted:
     `sha256sum apps/storybook/tests/visual/__snapshots__/shell-*.png`. Put them **in the final report only**; do not
     write them to a tracked file.
   - Check them now with a copy outside the repository (for example in a temporary directory removed afterwards):
     `sha256sum -c <that copy>` from the repository root prints `OK` for all eleven.
   - Ask the orchestrator to update **both** records: a new dated entry in `design-review.md` (the operator
     re-confirms the changed PNGs) and the new `design-review.sha256`, together with the anchor quotes if P-6 was
     re-anchored (T045 step 5). Until that commit is in the lane, `sha256sum -c` on the committed record is expected
     to fail on the changed lines; say which lines in the report.
   - Commit the regenerated PNGs as their own commit.
3. **Set equality** (both paths): the set of `apps/storybook/tests/visual/__snapshots__/shell-*.png` on disk equals the
   set of paths in the record (the committed one, or the proposed lines on the amendment path):
   ```bash
   diff <(ls apps/storybook/tests/visual/__snapshots__/shell-*.png | sort) \
        <(awk '{print $2}' kitty-specs/mission-shell-01M50D2J/design-review.sha256 | sort)
   ```
   Empty output. Exactly eleven files, named as the eleven catalogue ids.
4. **R5-01**, with `$base` from T044:
   `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/` passes, and
   `git diff --name-only --diff-filter=A "$base" -- apps/storybook/tests/visual/__snapshots__/` lists only the eleven
   `shell-*.png`.
5. `git status --porcelain -- apps/storybook/tests/visual/__snapshots__/` is empty at hand-off (nothing regenerated and
   left uncommitted).

**Files**: `apps/storybook/tests/visual/__snapshots__/shell-*.png` (rewritten only on the amendment path).

**Validation**: steps 1 or 2, and 3 to 5, pass. The final report says which path ran, and carries the `sha256sum -c`
output (or the proposed lines and the outside-copy check), the set-equality result and the R5-01 result.

## Subtask T047: Re-proofs and regression

**Purpose**: the final baselines carry a live plant, and any amendment broke nothing (FS-04; plan IC-08b exit checks;
research R-12, R-15).

**Steps** (every `heavy` command in the foreground, one at a time, nothing left running):

1. **P-6 re-proof**: `heavy pnpm gate-proof leg --gate visual` (about 40 minutes: two runs of about 18 min), on the new
   anchor if T045 re-anchored. The clean run is green and does **not** print
   `shell-connection-banners--reconnecting-1280-diff.png`; the planted run fails and prints it. The plan requires this
   after any amendment; run it on the no-amendment path too, so the final, CP-1-approved set has its own proof in this
   lane. Record the leg time and the clean `Gate: visual` step time (NFR-005 holds the gate within 28 minutes; report
   it if the step nears that).
2. **P-7 re-proof**, whenever T045 touched `packages/mission-shell/src/ui/MissionShell.svelte`:
   `heavy pnpm gate-proof leg --gate unit-tests`. Every unit-tests plant (including P-1 and P-7) fails with its own
   token (`mounted screen mismatch on drift` for P-7), and the clean run is green. Confirm first that
   `drift: DriftScreen,` still occurs exactly once in `MissionShell.svelte`; if the amendment moved it, stop and report
   to the orchestrator (the P-7 anchor is WP06's and `gates/plants/unit-tests/plant.json` is not in the grant). Record
   the leg time. If `MissionShell.svelte` was not touched, record "P-7 re-proof not required".
3. **Regression**:
   - `heavy pnpm test`;
   - `pnpm lint` (and `pnpm lint:no-io`);
   - `pnpm typecheck`;
   - `pnpm test:terminology` and `pnpm hygiene` (the copy and the PNGs).
4. **Visual gate**: `heavy pnpm visual` is green against the final baselines. On the amendment path, also run
   `heavy pnpm visual -- --repeat-each=5` (the gate's own repeat count) with every test passed and none flaky; fix
   flakiness through a granted file or a change request to WP08, never the harness.
5. Record in the final report: each command, its exit status, and the times of steps 1, 2 and 4.

**Files**: none edited.

**Validation**: every command above exits 0, and the leg logs show each plant failing with its own token.

## Plants

None owned. This WP re-proves:

- **P-6, visual** (owner WP08): overlay on `packages/mission-shell/src/ui/ConnectionBanner.svelte`, `find`
  `reconnecting: { tone: 'attention', announce: 'polite' },` → `replace`
  `reconnecting: { tone: 'danger', announce: 'polite' },`, or the re-anchored pair from T045. Failure-only token:
  `shell-connection-banners--reconnecting-1280-diff.png`. Proven with `heavy pnpm gate-proof leg --gate visual`.
- **P-7, unit-tests** (owner WP06), only when `MissionShell.svelte` is touched: `drift: DriftScreen,` →
  `drift: OpsScreen,`. Failure-only token: `mounted screen mismatch on drift`. Proven with
  `heavy pnpm gate-proof leg --gate unit-tests`.

## Exit checks

- [ ] **T044 first**: `design-review.md` has a dated `CP-1 confirmed` entry, `design-review.sha256` exists in
      `sha256sum` format with eleven repository-relative lines, and `git merge-base --is-ancestor "$cp1" HEAD` exits 0.
      Otherwise the WP stopped and reported.
- [ ] Amendments: each is listed and classified, and applied only under the grant; or "T045: no-op" is recorded.
- [ ] No-amendment path: `sha256sum -c kitty-specs/mission-shell-01M50D2J/design-review.sha256` prints `OK` for all
      eleven, and no `shell-*.png` changed since `$cp1` (`git diff --exit-code "$cp1" -- apps/storybook/tests/visual/__snapshots__/`).
- [ ] Amendment path: the baselines were regenerated with `heavy pnpm visual:update`; every changed PNG is explained by
      an amendment; the proposed `sha256sum` lines pass `sha256sum -c` from an outside copy; the orchestrator is asked to
      update both records (and the anchor quotes if re-anchored).
- [ ] The set of `shell-*.png` equals the set listed in the record: exactly the eleven catalogue ids.
- [ ] `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/` passes, and only
      `shell-*.png` are added (R5-01).
- [ ] If re-anchored: the new `find` occurs exactly once, the `replace` tone differs, and only `find` and `replace`
      changed in `gates/plants/visual/plant.json`. The new anchor is in the final report.
- [ ] `heavy pnpm gate-proof leg --gate visual` passes (P-6). Local leg time and clean gate-step time recorded.
- [ ] `heavy pnpm gate-proof leg --gate unit-tests` passes (P-7) if `MissionShell.svelte` was touched, with the leg
      time recorded; otherwise "not required" is recorded.
- [ ] `heavy pnpm test`, `pnpm lint`, `pnpm lint:no-io`, `pnpm typecheck`, `pnpm test:terminology` and `pnpm hygiene`
      are green.
- [ ] `heavy pnpm visual` is green (and `--repeat-each=5` on the amendment path).
- [ ] `git diff --name-only "$cp1" HEAD` lists only the owned files and the recorded out-of-map edits. `design-review.*`,
      `contracts/*.md`, the harness, `packages/mission-ui/**` and the frozen surface are unchanged.
- [ ] Tracked files have no local paths or usernames (C-006); the proposed hash lines carry repository-relative paths.
- [ ] Each subtask is marked: `spec-kitty agent tasks mark-status T044 --status done` (and T045, T046, T047).
- [ ] All `heavy` commands ran in the foreground, one at a time, with nothing left running. No push, no PR.

## Definition of Done

- **Record checked**: the CP-1 record is present in the lane and well-formed, and was checked before any other step.
- **Amendments**: every CP-1 amendment is applied in its one home within the IC-08b grant, with its tests following
  it; or the no-op is recorded. Out-of-grant amendments are change requests.
- **Baselines**: the eleven `shell-*.png` are the approved set: hash-identical to `design-review.sha256`, or
  regenerated in the pinned image with the proposed hashes handed to the orchestrator. The set matches the record, and
  no existing baseline changed.
- **P-6**: re-proven on the final baselines, on the new anchor if re-anchored, and still a visible tone change. The new
  anchor, if any, is reported for the orchestrator's contract update.
- **P-7**: re-proven if `MissionShell.svelte` changed.
- **Regression**: tests, lint, typecheck, terminology, hygiene and the visual gate are green; the leg times are in the
  final report for WP10.

## Risks

- **Missing or late CP-1 record** (plan "Timeline risks" 3): stop and report; never create the record yourself and
  never wait for the operator.
- **Byte churn**: `visual:update` can rewrite a PNG with identical pixels and different bytes, which breaks the hashes
  and reopens CP-1. Never regenerate on the no-amendment path; on the amendment path restore every PNG the amendment
  does not reach.
- **Vacuous P-6**: a re-anchored `replace` that renders the same as the new tone proves nothing. The replacement tone
  must differ, with `info` when the new tone is `danger` (FS-04).
- **Anchor drift**: an amendment that changes the reconnecting line other than its tone, or moves the P-7 line, breaks
  a plant whose file is outside or at the edge of the grant. Report before editing.
- **Scope creep**: an amendment that reaches stories, mission-ui, the port or the harness is not this WP's. File a
  change request.
- **Records out of step**: after an amendment, the committed `design-review.sha256` no longer matches until the
  orchestrator updates it. Say which lines differ, so the reviewer does not read the expected mismatch as a defect.
- **Visual cost and memory**: each visual run is about 18 min and the visual leg about 40. Run only under `heavy`, in
  the foreground, one at a time.

## Reviewer Guidance

- **Precondition**: repeat T044: both records exist, the entry is dated and says `CP-1 confirmed`, and
  `git merge-base --is-ancestor "$cp1" HEAD` exits 0. Confirm the implementer did this first (the log order).
- **Hashes**: run `sha256sum -c kitty-specs/mission-shell-01M50D2J/design-review.sha256` yourself. On the amendment
  path, check it again after the orchestrator's record commit is in the lane, and check the proposed lines matched.
- **Set equality**: repeat the T046 step 3 `diff`; eleven files, the catalogue ids, nothing more.
- **R5-01**: `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/`, and
  `git diff --name-only "$base" -- apps/storybook/tests/visual/__snapshots__/` lists only `shell-*.png`.
- **No-op honesty**: on the no-amendment path, `git diff "$cp1" HEAD` is empty for code, tests, plants and PNGs.
- **Amendments**: each change traces to a line of `design-review.md`; nothing else changed. The tone table is still one
  line per condition; copy uses the domain language. Tests were updated, not weakened (compare assertion counts).
- **Non-vacuity of P-6**: in the leg log, the clean run passed without the token and the planted run printed
  `shell-connection-banners--reconnecting-1280-diff.png`. When re-anchored, `grep -cF` of the new `find` in
  `ConnectionBanner.svelte` gives 1, the `replace` tone differs from the new tone, and the other `plant.json` fields
  are byte-identical (`git diff` of the file).
- **Positive control for P-7** (if `MissionShell.svelte` changed): the unit-tests leg log shows
  `mounted screen mismatch on drift` in the planted run only.
- **Boundaries**: `design-review.*`, `contracts/*.md`, `src/stories/**`, the harness, `packages/mission-ui/**` and the
  frozen surface are unchanged in the lane.
- **Report**: the new anchor (if any) and the proposed hash lines (if any) are present for the orchestrator; the leg
  times are recorded for WP10.

## Implementation command

`spec-kitty agent action implement WP09 --agent claude`
