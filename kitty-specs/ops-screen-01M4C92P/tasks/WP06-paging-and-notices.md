---
work_package_id: WP06
title: 'Paging and notices: header, count, Load more, skipped and load-more error (chain Y)'
dependencies:
- WP04
requirement_refs:
- FR-003
- FR-004
- FR-005
- FR-021
- FR-022
- FR-023
- FR-024
- FR-029
- FR-030
- FR-031
- FR-032
- FR-044
- NFR-012
- C-004
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: bc7a65440f45687c4ba5f887d57fdd03fc03a0d9
created_at: '2026-10-11T09:23:56.441567+00:00'
subtasks:
- T031
- T032
- T033
- T034
- T035
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-ops-screen/
create_intent:
- packages/mission-ui/src/elements/sk-ops-screen/ops-page-parts.ts
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.paging.stories.ts
- packages/mission-ui/test/ops-page-parts.test.ts
- packages/mission-ui/test/sk-ops-screen.events.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-ops-screen/ops-page-parts.ts
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.paging.stories.ts
- packages/mission-ui/test/ops-page-parts.test.ts
- packages/mission-ui/test/sk-ops-screen.events.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - Paging and notices: header, count, Load more, skipped and load-more error (chain Y) (IC-05)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Fill `ops-page-parts.ts`: the page header, the source notice, the section heading and count badge, the profile fact, Load more, the skipped note and the load-more error with its refresh action; build the stories OP-01, OP-15 to OP-18, OP-24, OP-25, OP-28 and OP-35 (9) in `Screens/Ops/Paging and notices`; prove EV-1, EV-2, EV-4 and EV-5 with tests.

## Context

Read `plan.md` (D-05 to D-08, IC-05), `contracts/sk-ops-screen.md` (events, announcements), `contracts/defaults.md`, the CP-1 entry, `spec.md` (FR-003 to FR-005, FR-021 to FR-024, FR-029 to FR-032, OP-01, OP-15 to OP-18, OP-24, OP-25, OP-28, OP-35, EV-1 to EV-5, DO-1, DO-2, DO-12, DO-15, DO-16, DO-17) and the Missions screen's Load more and busy mechanics, which you repeat exactly.

You own `ops-page-parts.ts` (stub created by WP04; replace bodies, keep signatures), the paging stories and your tests. Dispatch lives in the screen file (WP04): the parts call the handlers they are given. EV-3 (first-page error retry) needs the error state and is proven by WP07; do not test it here.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## First step: CP-1 file precondition

Before any edit confirm that `tracer-design-decisions.md` contains a dated entry marked `CP-1 confirmed` (it names the confirmed or amended drift items DO-13, DO-22, DO-24, the exceptions E-40 to E-43 as approved, narrowed or dropped, the tier thresholds and the controller decision) and that `git merge-base --is-ancestor <CP-1 commit> HEAD` succeeds (the dispatch names the commit). If either fails: STOP and report; never write the entry yourself. The drift register DO-1 to DO-24 stands as that entry leaves it: the items the entry confirms are CONFIRMED; the rest are built exactly as the register states them and are confirmed by the operator at the Storybook review after the last work package. A difference from the prototype in neither the register nor the entry is a REJECT item for the work package that introduces it.

## Subtasks

### T031 CP-1 FILE PRECONDITION and drift items

See "First step". Your drift items: DO-1, DO-2, DO-12, DO-15, DO-16, DO-17 and the inherited wrapping rule (E-42) as the CP-1 entry settles them.

### T032 Header, notice, heading and badge, profile fact

**Steps** (red-first with `ops-page-parts.test.ts`): header: eyebrow "Project", title "Ops", a muted line naming the project (shell-supplied, never a literal; absent when none is supplied), and the "Read only" badge as `sk-page-header` content; the skip link belongs to the shell. One neutral `sk-notice` with the host-neutral source copy (no path or format). Section: eyebrow "Invocation records", heading "Newest records", and the count badge from `opsCountText(items.length, totalCount)` ("6 of 249"; equal: "249 records"); `totalCount` smaller than loaded is shown as given, and nothing flags a lag; the screen counts only `items.length`. When `profile` is non-null one quiet mono fact "Profile: {profile}" sits in the heading (OQ-2 a): no chip, no control, no event. The heading is programmatically focusable (`tabindex="-1"`) as the focus fallback target.

**Files**: `ops-page-parts.ts`, `ops-page-parts.test.ts`.

### T033 Load more, skipped note, load-more error

**Steps** (red-first): Load more: `sk-button variant="secondary" ?busy` below the rows when `pageInfo.hasNextPage` is true and `nextPageCursor` non-null; the row `li` of the list carries `aria-busy` during `loadingMore`; the last page shows no control and says nothing about the end. Skipped note: when `skippedCount` is above 0, one quiet `sk-notice` below the list with the singular/plural sentence "in this project", never "for this profile" (FR-024, CG-8); none at 0. Load-more error: when `loadMoreError` is non-null the rows and badge stay, Load more is replaced by an `sk-notice` (tone danger, `announce` off because the live region speaks) and a retry `sk-button`; a code equal to `CURSOR_REFUSAL_CODE` (compared through the constant, never a literal) swaps the sentence and the button text to "Refresh from the newest". Handlers: `onLoadMore`, `onRetry`, `onRefresh` passed in; the parts never dispatch.

**Files**: `ops-page-parts.ts`. **Edge cases**: `loadMoreError` with an unknown or null code shows the generic sentence and the retry; `hasNextPage` true with a null cursor draws no control.

### T034 Stories: `Screens/Ops/Paging and notices` (9)

**Steps**: `sk-ops-screen.paging.stories.ts`, title `Screens/Ops/Paging and notices`, dark, 1280 px, `shellFrame` with `flush`, arguments from `fixtures.ts` only: OP-01 (ready, six rows, `totalCount` 249, header, notice, badge), OP-15 (count badge), OP-16 (`hasNextPage` and `loadingMore`), OP-17 (last page), OP-18 (skipped note, 3), OP-24 (load-more error), OP-25 (refused cursor), OP-28 (200 rows on a page), OP-35 (profile disagreement: loading look, nothing announced). Exactly 9 stories. Story ids as in WP05 (`Op01`, row tag `op-01`).

**Files**: `sk-ops-screen.paging.stories.ts`.

### T035 Tests and hand-over

**Steps** (red-first; revert check per file): `sk-ops-screen.events.test.ts`: EV-1 `sk-load-more` `{ cursor }` exactly once, `bubbles`, `composed`, not cancelable, `toEqual` detail; a second activation for the same cursor emits nothing until `loadingMore`, `items` or `pageInfo` changes (then it emits again); EV-2 nothing while `loadingMore`, with no cursor and on the last page; EV-4 `sk-retry-load` `{ target: 'ops-page', cursor }` with the cursor that failed; EV-5 `{ target: 'ops-page' }` with NO cursor key on a refused cursor; each no-event case with a positive control. `ops-page-parts.test.ts`: badge texts (6 of 249, equal, total smaller than loaded), skipped note present/absent pairs, profile fact present/absent, the aria-busy and busy states, header content. OP-35: a page whose items disagree with a non-null `profile` draws the loading look and the live region does not change. Side-by-side: one uncommitted screenshot per story against `<prototype>/07-ops.html` (rows may be stubs if WP05 is not merged in your lane; say so), read, described, mapped to DO items.

**Files**: `sk-ops-screen.events.test.ts`, `ops-page-parts.test.ts`.

## Test strategy

Exactly-one-event with positive controls for EV-1, EV-2, EV-4, EV-5; once-per-cursor proved by repeating the activation; equality counts; revert check per file (for example: drop the cursor memo, send a cursor on refresh, compare the code to a literal). `pnpm visual` is NOT an exit check; side-by-side screenshots are. All other gates green.

## Definition of Done

- `ops-page-parts.ts` complete, signatures unchanged, no dispatch in a part; nine stories exactly.
- EV-1, EV-2, EV-4, EV-5 tests with listed revert checks; OP-35 no-announcement proof.
- Hand-off lists commits verified, nine images described, DO mapping, change requests (for example if a screen-file handler does not match the contract) and out-of-map edits (none expected).

## Risks

- Two owners for the heading focus target: the heading is drawn here, the focus move is WP04's; verify with WP07's tests rather than editing the screen file.
- Wording that claims a total is exact or that says "for this profile" about skipped records.
- The refresh action sending a stale cursor: payload equality on the key set.

## Reviewer guidance

Check the Missions mechanics are repeated not reinvented, the cursor-refusal code is compared through the constant, the skipped note says "in this project", the count badge arithmetic is `items.length` only, payload key sets are exact (no cursor on refresh), no control for a null cursor, and the paging stories match the list of nine. Re-run two revert checks.

Implementation command: `spec-kitty agent action implement WP06 --agent claude` (orchestrator-run).

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
