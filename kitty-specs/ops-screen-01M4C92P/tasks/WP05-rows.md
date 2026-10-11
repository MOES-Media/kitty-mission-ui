---
work_package_id: WP05
title: 'Rows: head, badge, facts and inert evidence (chain X)'
dependencies:
- WP04
requirement_refs:
- FR-006
- FR-007
- FR-008
- FR-009
- FR-010
- FR-011
- FR-012
- FR-013
- FR-014
- FR-015
- FR-016
- FR-017
- FR-018
- FR-019
- FR-036
- FR-039
- FR-044
- NFR-005
- NFR-011
- NFR-012
- C-003
- C-005
- C-009
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: bc7a65440f45687c4ba5f887d57fdd03fc03a0d9
created_at: '2026-10-11T09:23:46.031162+00:00'
subtasks:
- T025
- T026
- T027
- T028
- T029
- T030
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-ops-screen/
create_intent:
- packages/mission-ui/src/elements/sk-ops-screen/ops-row-parts.ts
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.rows.stories.ts
- packages/mission-ui/test/ops-row-parts.test.ts
- packages/mission-ui/test/sk-ops-screen.rows.test.ts
- packages/mission-ui/test/sk-ops-screen.evidence.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/elements/sk-ops-screen/ops-row-parts.ts
- packages/mission-ui/src/elements/sk-ops-screen/sk-ops-screen.rows.stories.ts
- packages/mission-ui/test/ops-row-parts.test.ts
- packages/mission-ui/test/sk-ops-screen.rows.test.ts
- packages/mission-ui/test/sk-ops-screen.evidence.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP05 - Rows: head, badge, facts and inert evidence (chain X) (IC-04)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Fill `ops-row-parts.ts`: the row head (id and badge), the facts list, the quiet and redacted words, the Mission, Work Package, Mode and swept-Op facts, and the inert evidence rendering; build the stories OP-02 to OP-14, OP-26, OP-27 and OP-33 (16) in `Screens/Ops/Rows`; prove with tests that no item-derived value can create a loadable or navigable element.

## Context

Read `plan.md` (D-03, D-04, D-11, D-13, IC-04, Implementation Concern Map), `contracts/sk-ops-screen.md` (structural rules), `contracts/defaults.md`, `contracts/gates.md` (R-ops-1, E-40 to E-43, self-check list), the CP-1 entry (row construction, facts look, wrapping), `spec.md` (FR-006 to FR-020, FR-036, OP-02 to OP-14, OP-26, OP-27, OP-33, DO-5 to DO-11, DO-13, DO-18 to DO-24, NFR-005, NFR-011, NFR-012) and the WP02 modules `ops-row.ts`, `ops-time.ts`, `ops-copy.ts`.

You own `ops-row-parts.ts` (created as a stub by WP04: replace the body, keep every signature), the rows stories and your tests. The screen file and `fixtures.ts` are not yours: a wiring line needed is an out-of-map edit at the stub WP04 left; a missing fixture helper is a change request. Rows are plain `li` items.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## First step: CP-1 file precondition

Before any edit confirm that `tracer-design-decisions.md` contains a dated entry marked `CP-1 confirmed` (it names the confirmed or amended drift items DO-13, DO-22, DO-24, the exceptions E-40 to E-43 as approved, narrowed or dropped, the tier thresholds and the controller decision) and that `git merge-base --is-ancestor <CP-1 commit> HEAD` succeeds (the dispatch names the commit). If either fails: STOP and report; never write the entry yourself. The drift register DO-1 to DO-24 stands as that entry leaves it: the items the entry confirms are CONFIRMED; the rest are built exactly as the register states them and are confirmed by the operator at the Storybook review after the last work package. A difference from the prototype in neither the register nor the entry is a REJECT item for the work package that introduces it.

## Subtasks

### T025 CP-1 FILE PRECONDITION and drift items

See "First step". Your drift items are DO-5 to DO-11, DO-13, DO-18 to DO-24 as the CP-1 entry settles them (row construction and facts look per the S-O1 outcome, wrapping per S-O3).

### T026 Row head, badge and facts

**Steps** (red-first with `ops-row-parts.test.ts`): `renderOpsRow(view)` over the `OpsRowView` of WP02: an `li` per Op in the order given, never re-sorted; the head holds the id (mono, wrapped in `bdi`) and the `sk-pill-tag` badge carrying the outcome or status word and tone (the word is always in the DOM, NFR-011); the facts list in order Profile, Action, Actor, Started, Completed, Evidence, then Mission, Work Package, Mode and Closed by only when present; Profile, Action and Actor values mono, in `bdi`, as given; Actor null draws the quiet word "Not shown"; open Op: status word "open", Completed and Evidence say "Not recorded yet"; swept Op: "Closed by: sweep"; unknown outcome, closer, mode or kind: raw word, neutral tone. Times: `<time class="mono" datetime="{served string}">` with the UTC text from `formatUtcInstant`; an unparseable value prints as given with no `datetime`. The row carries no listener, role, tabindex, hover or active style (DO-18). Framing per the CP-1 decision (E-40/E-41 only if kept). Words and tones only from `ops-copy.ts` via the view-model; no vocabulary literal.

**Files**: `ops-row-parts.ts`, `ops-row-parts.test.ts`, `sk-ops-screen.rows.test.ts`. **Edge cases**: 128-character profile and a long action ellipsize/wrap per CP-1 with the full text in `title` and the accessible name; a missing optional fact leaves no empty term.

### T027 Evidence, inert by construction

**Steps** (red-first with `sk-ops-screen.evidence.test.ts`): evidence renders its class word as a quiet label and `value` as a text binding inside `<span data-evidence-value>` (mono, wrapped, full 512 characters, never truncated); `redacted` true adds the quiet "changed" word whose accessible description is the explanation (OQ-7); `evidence` null draws the quiet word without claiming none was recorded ("Not recorded" for a closed Op, "Not recorded yet" for an open one). Every item-derived text sits in a `bdi`. No `unsafeHTML`, `unsafeSVG`, `.innerHTML`, `href`, `src`, `srcset` on an item value (R-ops-1 enforces it; add no suppression). The structural walk (NFR-005, SC-004): for EVERY evidence fixture, including the hostile one (markup, a `javascript:` address, bidirectional override, an unbroken 512-character token), walk the rendered shadow tree and assert it finds 0 anchors, images, `src`, `href` or `srcset` attributes and 0 loadable elements, with a POSITIVE CONTROL (a deliberately built anchor in a scratch element is found by the same walker) and an anti-vacuity floor (the walk visited at least the expected number of nodes and fixtures; N asserted with equality). The CSP-observation test is WP08's.

**Files**: `ops-row-parts.ts`, `sk-ops-screen.evidence.test.ts`.

### T028 Stories: `Screens/Ops/Rows` (16)

**Steps**: `sk-ops-screen.rows.stories.ts`, title `Screens/Ops/Rows`, dark, 1280 px, inside `shellFrame` as shell content with `flush`; arguments only from WP01's `fixtures.ts`. Stories: OP-02 (closed done), OP-03 (failed), OP-04 (abandoned), OP-05 (open), OP-06 (swept), OP-07 (evidence null), OP-08 (repo_path), OP-09 (text, 512 characters wrapped), OP-10 (url as text), OP-11 (redacted), OP-12 (Mission and Work Package present and absent), OP-13 (the four modes), OP-14 (time with a `+02:00` source offset), OP-26 (unknown outcome, closer, mode, kind), OP-27 (long texts), OP-33 (null actor). Exactly 16 stories discovered. Story id convention: the export name is `Op` plus the row number in two digits and an optional lowercase letter (`Op02`, `Op12a`); `tags` carries exactly one row tag `op-<NN><letter>` in lowercase beside the tier tag `vw-<n>`.  A row that needs two renders (OP-12 present and absent, OP-13 four modes) shows them in ONE story.

**Files**: `sk-ops-screen.rows.stories.ts`.

### T029 Tests

**Steps** (red-first): `sk-ops-screen.rows.test.ts`: per story row the DOM facts (words, tones, fact order, absent facts truly absent with a paired present fixture), the swept fact, unknown values raw, the `datetime` equals the served string exactly, the row is not a tab stop (Tab skips it; EV-6: clicking a row, id, evidence value and time emits nothing, with a positive control event from a sibling), Actor null quiet word, and a counted loop over all rows of the six-row default page. `ops-row-parts.test.ts`: the part as a pure function of the view-model.

**Files**: the two test files. **Validation**: exit pass counts; a revert check per file (for example: render the evidence value through `unsafeHTML`, drop the `bdi`, add a tabindex).

### T030 Side-by-side hand-over (no PNG committed)

**Steps**: for EACH of the 16 stories produce an uncommitted side-by-side screenshot against `<prototype>/07-ops.html` in the pinned container (`pnpm visual` for actual images only; its red is the known red; never `pnpm visual:update`; no PNG staged). Read and describe each; map every difference to a DO item as the CP-1 entry and the register state them, or flag it unconfirmed and fix it. The default six-row view is OP-01 (WP06's); ready-state captures here show the page parts as stubs.

## Test strategy

Positive controls on the structural walk and on every no-event case; equality counts on rows, facts and fixtures; revert check per test file. `pnpm visual` is NOT an exit check; exit evidence is the uncommitted side-by-side screenshot per story. All other gates green, plus `pnpm lint:data-driven` and `pnpm test:data-driven`.

## Definition of Done

- `ops-row-parts.ts` complete, every signature unchanged; rows inert; evidence text-only and `bdi`-isolated.
- 16 stories exactly; structural walk proven on every evidence fixture with a positive control.
- Hand-off lists commits verified with `git cat-file -t`, 16 side-by-side images read and described with differences mapped to DO items, change requests and out-of-map edits (none expected).

## Risks

- A drift from the prototype row looks "close enough": drift not in the register is a REJECT, not a design discussion.
- The structural walk passing vacuously on an empty tree: anti-vacuity floor and positive control.
- `bdi` or `overflow-wrap` helping one fixture and hurting another: all 512-character cases are in the same test.

## Reviewer guidance

Check the row against the register and the CP-1 entry (frame, facts look, wrapping), that nothing derived from an item can become a link or loaded element (read the template, not only the tests), the quiet words never claim "none", unknown values raw, order never altered, one story per row of the list, and that no vocabulary literal or arithmetic crept in. Re-run two revert checks.

Implementation command: `spec-kitty agent action implement WP05 --agent claude` (orchestrator-run).

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
