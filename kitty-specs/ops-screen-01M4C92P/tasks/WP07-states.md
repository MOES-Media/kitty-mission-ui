---
work_package_id: WP07
title: 'States: loading, empty, error, live region and focus proof (chain Y)'
dependencies:
- WP06
requirement_refs:
- FR-025
- FR-026
- FR-027
- FR-028
- FR-033
- FR-034
- FR-044
- NFR-012
- NFR-013
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: ead62ee6d6b62c7aba056d680915659cc1d14341
created_at: '2026-10-11T10:04:30.860807+00:00'
subtasks:
- T036
- T037
- T038
- T039
- T040
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-ops-screen/
create_intent:
- packages/mission-ui/src/elements/sk-ops-screen/ops-state-parts.ts
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.states.stories.ts
- packages/mission-ui/test/ops-state-parts.test.ts
- packages/mission-ui/test/sk-ops-screen.states.test.ts
- packages/mission-ui/test/sk-ops-screen.announce.test.ts
- packages/mission-ui/test/sk-ops-screen.events-retry.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-ops-screen/ops-state-parts.ts
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.states.stories.ts
- packages/mission-ui/test/ops-state-parts.test.ts
- packages/mission-ui/test/sk-ops-screen.states.test.ts
- packages/mission-ui/test/sk-ops-screen.announce.test.ts
- packages/mission-ui/test/sk-ops-screen.events-retry.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP07 - States: loading, empty, error, live region and focus proof (chain Y) (IC-06)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Fill `ops-state-parts.ts`: the loading, empty (three wordings) and error looks; build the stories OP-19 to OP-23, OP-36 and OP-37 (7) in `Screens/Ops/States`; prove with tests the live-region announcements (NFR-013), the focus rule (FR-034), the first-page retry event EV-3, and the contract rulings R-A to R-E (NFR-012) that concern states.

## Context

Read `plan.md` (D-02, D-08, D-09, IC-06), `contracts/sk-ops-screen.md` (look resolution, events, announcements, focus), `contracts/defaults.md` (empty, loading, error by code), the CP-1 entry, `spec.md` (FR-025 to FR-028, FR-033, FR-034, OP-19 to OP-23, OP-36, OP-37, EV-3, DO-3, DO-4, DO-21, NFR-012, NFR-013) and the Missions screen's state parts and announcement tests.

You own `ops-state-parts.ts` (stub created by WP04; replace bodies, keep signatures), the states stories and your tests. The live region and the focus rule are implemented in the screen file by WP04: you fill what it calls and PROVE the behaviour. If a test cannot pass without a change in `sk-ops-screen.ts`, make the smallest change at the wiring line as a recorded out-of-map edit with a one-line rationale and a test that fails without it; anything larger is a change request.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP06. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## First step: CP-1 file precondition

Before any edit confirm that `tracer-design-decisions.md` contains a dated entry marked `CP-1 confirmed` (it names the confirmed or amended drift items DO-13, DO-22, DO-24, the exceptions E-40 to E-43 as approved, narrowed or dropped, the tier thresholds and the controller decision) and that `git merge-base --is-ancestor <CP-1 commit> HEAD` succeeds (the dispatch names the commit). If either fails: STOP and report; never write the entry yourself. The drift register DO-1 to DO-24 stands as that entry leaves it: the items the entry confirms are CONFIRMED; the rest are built exactly as the register states them and are confirmed by the operator at the Storybook review after the last work package. A difference from the prototype in neither the register nor the entry is a REJECT item for the work package that introduces it.

## Subtasks

### T036 CP-1 FILE PRECONDITION and drift items

See "First step". Your drift items: DO-3, DO-4, DO-21 and the host-neutral copy list the CP-1 entry confirms.

### T037 Loading, empty and error looks

**Steps** (red-first with `ops-state-parts.test.ts`): header and source notice stay in every non-ready look (OP-36); only the list region is replaced. `loading`: the library indeterminate progress labelled "Reading invocation records", the sentence that no agent is invoked, `aria-busy="true"` on the region, no list, no badge, a focusable heading (`tabindex="-1"`). `empty`: heading "No invocation records" with the neutral sentence; with a non-null `profile` "No records for this profile" naming the profile in mono; with `skippedCount` above 0 the heading line names the count ("No readable records. N records ... not shown") and the skipped note logic is not duplicated; `ready` with zero items renders as empty (OP-37). `error`: a `role="alert"` danger `sk-notice` "Invocation records unavailable" with the sentence chosen by `refusalCode` from `ops-copy.ts` (`ops_unreadable` and any unknown or null code use the generic host-neutral body; `errorMessage` overrides when non-empty), "No invocation rows are shown", and a retry `sk-button` calling the handler. The alert is the only announcer of an error. No path or format named anywhere (OQ-6).

**Files**: `ops-state-parts.ts`, `ops-state-parts.test.ts`.

### T038 Stories: `Screens/Ops/States` (7)

**Steps**: `sk-ops-screen.states.stories.ts`, title `Screens/Ops/States`, dark, 1280 px, `shellFrame` with `flush`, arguments from `fixtures.ts` only: OP-19 (empty), OP-20 (empty with skipped), OP-21 (empty with profile), OP-22 (loading), OP-23 (error 500), OP-36 (header and notice in the non-ready looks: ONE story, the `loading` look with a non-null `profile` and a supplied project line, so its arguments differ from OP-22; the test of T039 asserts header and notice in all three non-ready looks), OP-37 (zero count `ready`). Exactly 7 stories, one per row (the plan's 36 stories are one per built row). If your reading of the matrix gives a different count, STOP and report: do not decide it.

**Files**: `sk-ops-screen.states.stories.ts`.

### T039 Tests

**Steps** (red-first; revert check per file): `sk-ops-screen.states.test.ts`: each look's DOM (paired present/absent), `ready` with zero items equals the empty look, unknown status collapses to empty, unknown and null refusal codes show the generic body (never `undefined`), `errorMessage` override, `aria-busy`, headings focusable. `sk-ops-screen.announce.test.ts` (NFR-013): the live-region text and the COUNT of changes for every row of the announcement table: loading entered, ready entered, rows added by a load-more ("N more records loaded"), empty entered, load-more error appears, error look (none), a mismatched page (none), the same shown pair re-rendered (none), a late page that agrees (announced once); every no-change case has the positive control of a sibling change. `sk-ops-screen.events-retry.test.ts` (EV-3): the first-page retry emits `sk-retry-load` `{ target: 'ops-page' }` exactly once with `toEqual`, `bubbles`, `composed`, not cancelable, plus the no-event cases with positive controls. Focus: removing the focused control (the last page arrives, a state replaces the list) moves focus to the heading only when focus was inside the screen or on the body (negative control: focus elsewhere stays); focus order heading, Load more or error actions, retry. Contract rulings (NFR-012): a null-actor Op is served in `items` and draws the quiet word; a page whose `skippedCount` is above 0 shows the note and none of the skipped records exist in the DOM.

**Files**: the four test files.

### T040 Side-by-side hand-over (no PNG committed)

**Steps**: one uncommitted side-by-side screenshot per story against `<prototype>/07-ops.html?state=empty`, `?state=loading`, `?state=error` and the default page (OP-37 against the empty variant), read, described, mapped to DO items or flagged and fixed.

## Test strategy

Announcement tests assert text AND change count; positive controls on every no-announcement and no-event case; revert check per file (for example: announce the mismatched page, drop the `target`, move focus when focus was elsewhere). `pnpm visual` is NOT an exit check. All other gates green.

## Definition of Done

- `ops-state-parts.ts` complete, signatures unchanged; seven stories exactly.
- Announcement, focus, EV-3 and ruling tests pass with listed revert checks; any screen-file edit is minimal, recorded and test-backed.
- Hand-off lists commits verified, images described, DO mapping, change requests and out-of-map edits.

## Risks

- Announcing twice (alert plus region) is the easy defect: the error look is never duplicated in the region.
- Focus tests are timing-sensitive: wait for `updateComplete` plus one animation frame, never a sleep.
- The OP-36 story must differ from OP-22 in its arguments, or its baseline duplicates OP-22's.

## Reviewer guidance

Check header and notice stay in non-ready looks, empty wordings by precedence, host-neutral copy, the alert is the only error announcer, no announcement on a mismatched page, focus moves only when it should, EV-3 payload exact, and OP-36 is a distinct, single story. Re-run two revert checks.

Implementation command: `spec-kitty agent action implement WP07 --agent claude` (orchestrator-run).

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these): `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file outside that list is changed ONLY where this prompt says so, as a recorded out-of-map edit: committed by you with plain `git add <path>` and `git commit`, listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request in the hand-off (file, change, reason), not an edit. A generated file (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) is never edited by hand: a conflict in one is resolved by regeneration only. The plan's shared-file owners (`tasks-notes.md`, "Shared files") are: `fixtures.generated.ts`, `types.generated.ts` and contract tooling WP01; `defaults/ops-copy.ts`, `logic/ops-*.ts`, the data-driven gate and `eslint.config.mjs` WP02; `sk-ops-screen.ts`, `src/index.ts`, `defaults/index.ts`, `custom-elements.json`, `stylelint.config.mjs` WP04; each part file and its stories and tests its named WP; baselines and the timing record WP09 only.

**Gates this work package must pass before hand-off** (each exits 0, with the reporter's pass count above 0 and fail 0 where a reporter exists; run from the lane worktree root, after confirming `git rev-parse --show-toplevel` is that worktree): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (the unit-tests gate: its output must list your test files), `pnpm build-storybook`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm contract:check && pnpm test:contract`. `pnpm visual` and `pnpm gate-proof` are NOT exit checks of every work package: this prompt's "Test strategy" says whether they run. If a script name differs on the build base, use the name the base provides and say so.

**Red-first rule.** For every behaviour, plant and gate case write the failing test (or the plant, or the negative case) FIRST, run it, see it fail for the right reason, record the failing line in the hand-off, and only then implement. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) that produces a named failing test, then the restore, is listed in the hand-off (revert check); the reviewer re-runs two of them.

**Test-quality rules (binding).**
1. Every no-event test carries a positive control in the same test: the same listener on the same target receives an event when a sibling action that does emit is performed.
2. Every emit test asserts exactly one event (`events.length` equal to 1), `bubbles` true, `composed` true, `cancelable` false, and the detail with `toEqual` (never `toMatchObject`).
3. Counts are asserted with equality, never "at least"; every loop over fixtures, stories, rows or items asserts it ran the expected N times (an empty loop must fail).
4. A not-drawn element has a DOM-absence assertion PAIRED with a sibling fixture where it is present (positive control). Omitted, empty and null are separate paired tests.
5. Order tests use test-only inputs built by cast so that a later sort or filter fails them; the screen never re-sorts `items`.
6. Foreign values (an outcome, closer, mode, evidence kind, status or refusal code outside the tables) render their raw text in the DOM and never `undefined`.
7. Vitest browser-mode tests call `page.viewport` first.
8. Terminology (C-009): the word "feature" never appears in source, stories, fixtures or docs; "Mission" is the term, "Op" is the invocation record, "sweep" is `doctor_sweep` in copy.

**Data-driven and self-check rules (C-007, FR-038, NFR-009; `contracts/gates.md`, copied here).** No `open`, `closed`, `agent`, `query`, `text`, `url`, `failed`, `abandoned`, `advisory`, `task_execution`, `mission_step`, `doctor_sweep`, `repo_path`, `ops_unreadable` or `invalid_page_cursor` literal outside `defaults/`, `contract/` and stories, and no `=== '<word>'` comparison: read tables through `lookup` with the raw value as fallback. No profile or action literal in any non-fixture file. No `Date`, `new Date`, `setTimeout`, `fetch`, storage, `location` or `history` use; no `Math.` on contract values; no arithmetic beyond `items.length`. Every `dispatchEvent` has a literal `sk-*` name, sits in `sk-ops-screen.ts` and is declared by `@fires` (part files receive handlers as arguments and never dispatch). No `href`, `src`, `srcset`, `unsafeHTML`, `unsafeSVG` or `innerHTML` in a parts file. Rows carry no listener, role or tabindex. Absolute-path and username check on every new file.

**Drift register status and visual authority (C-006, NFR-008).** The prototype `<prototype>/07-ops.html` and its `?state=` variants are the visual source of truth. The register DO-1 to DO-24 (`spec.md`) stands as the CP-1 entry leaves it (see "First step"; before CP-1 exists, no DO item is confirmed). Not applicable to WP01 to WP03.

**Baselines (operator standing rule).** Baseline PNGs are generated only inside the pinned container (`scripts/visual.sh`) and are committed ONLY in WP09. Work packages WP01 to WP08 commit no PNG and never run `pnpm visual:update`; `pnpm visual` is NOT an exit check of WP05 to WP08 (their stories have no committed baseline, so missing snapshots are the known red). Their exit evidence is one uncommitted side-by-side screenshot per story against the prototype, handed over in the report. Nothing is ever hand-edited or copied as a PNG.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, the aggregate review squad, compact history and a rebase (orchestrator-owned). Commit on your lane branch with a conventional message (`feat(ops-screen): ... (#11)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- No push, no pull request, no issue comment. Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics. Never `git rebase`, never `git stash`; `core.bare` must stay false.
- A command that is DENIED means stop and report; never retry it another way, never pattern-kill processes, never `rm` with variable globs. Nothing is left running when you finish. Any repo-wide command (`ruff`, `prettier`, `eslint .`) first confirms `git rev-parse --show-toplevel` is your worktree.
- No absolute paths and no usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`, `<lane>`); run `pnpm hygiene` before committing. This holds for fixtures, stories, tests, comments and the hand-off text.
- Visual baselines only inside the pinned container; committed only in WP09. Read every screenshot you produce and describe it in the hand-off (what is drawn, at which width, anything wrong).
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens (Stylelint rejects raw colour, font and size literals); every UI primitive the design library provides is rendered with its `sk-*` element (elements over CSS); a missing primitive is a recorded component gap, never hand-rolled outside the numbered exceptions E-40 to E-43 (as approved at CP-1) and the earlier missions' E-04 to E-39.
- `tracer-*.md`, `spec.md`, `plan.md` and every other file under `kitty-specs/` are orchestrator-owned except where this prompt names an out-of-map edit: report spike outcomes, decisions and friction in the hand-off; write nothing there otherwise.
- Do not run `spec-kitty` commands that mutate mission state; the orchestrator moves tasks.

## Hand-off checklist (the report you write when you move to review)

1. Commit hashes of your work, each verified with `git cat-file -t <hash>` (report the output), in the order made, with the one-line subject of each.
2. For every gate of "Gates this work package must pass": command, exit code, reporter pass count. A gate you did not run, and why, is stated.
3. The failing line recorded for every red-first test or plant, and the revert check per test file (what you reverted, which named test failed, that you restored it).
4. Out-of-map edits, each with a one-line rationale; change requests (file, change, reason) for anything you needed but do not own.
5. The drift items relied on, named by DO id as the CP-1 entry and the register state them, and every difference from the prototype you saw that is NOT in that list (a REJECT item you must fix before handing over).
6. Every screenshot or image you produced, read and described; uncommitted; where the orchestrator can find it.
7. Exceptions touched (E-40 to E-43), gaps met, and any decision you took that the plan did not fix.
8. `git status --short` empty after the last commit, and the statement that nothing is running.
9. No absolute path or username appears in the hand-off text itself (use the placeholders).

The reviewer is a separate agent: it reads your hand-off first, re-runs two revert checks, and rejects on any item above that is missing or false.
