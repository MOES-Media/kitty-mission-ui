---
work_package_id: WP01
title: Contract slice check, Ops fixtures and gate baseline
dependencies: []
requirement_refs:
- FR-002
- FR-041
- NFR-001
- NFR-007
- NFR-010
- C-002
- C-008
- C-012
- C-013
- C-014
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: 0916ee93a4068dd2f7f6bb69d1da6b18fc64c92b
created_at: '2026-10-10T10:02:12.534065+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
history: []
agent_profile: node-norris
authoritative_surface: packages/mission-ui/src/contract/
create_intent:
- packages/mission-ui/src/elements/sk-ops-screen/fixtures.ts
- packages/mission-ui/test/ops-fixtures.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/contract/**
- scripts/contract/**
- gates/plants/contract/**
- packages/mission-ui/src/elements/sk-ops-screen/fixtures.ts
- packages/mission-ui/test/ops-fixtures.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Contract slice check, Ops fixtures and gate baseline (IC-01)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Verify, as a stop-check, that the Ops slice of the Mission Status contract is already vendored on `main` (this work package vendors nothing); record the green gate baseline of the build base; register the Ops fixtures in the generation step (contract examples plus named overlays) and the story-argument helpers; keep `contract:check --require-main` green.

## Context

Read `plan.md` (Build base items 1 to 4, IC-01, Implementation Concern Map), `spec.md` (Contract Basis, FR-002, FR-041, NFR-007, NFR-010, C-002, C-008), `data-model.md`, `contracts/gates.md` (`contract` row) and the closest precedent: `kitty-specs/missions-and-pipeline-screens-01M40SKZ` WP01 (fixtures and relaxations) and `kitty-specs/work-package-screen-01M44DSJ` WP01 (overlays and the registry). Requirements: FR-002 (contract-shaped inputs), FR-041, NFR-001, NFR-007, NFR-010, C-002, C-008, C-012, C-013, C-014.

Why first: every later work package imports the generated Ops types and the fixtures; the baseline recorded here is what nobody later mistakes for a regression. The vendored pin is `contracts/spec-kitty/PIN.json`; the contract tooling lives in `scripts/contract/` (generator, checker, overlays, registry, validators). Fixtures are generated from the contract's own examples; nothing is invented around them.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: none (entry condition T001 below). Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## First step: entry condition

WP01 starts only after spec-kitty PR #5881 has merged AND the Projects mission (#9) has re-vendored the contract on `main` (T001 is that stop-check; it is also the first exit check). If it fails: STOP and report; vendor nothing, never edit `PIN.json`.

## Subtasks

### T001 ENTRY CONDITION and stop-check (first step, first exit check)

**Purpose**: this mission does not start until the shared contract re-vendor has landed (operator rule, 2026-10-08: no stacking; the Projects mission (#9) vendors once, first).

**Steps** (run all; any failure is STOP and report, nothing is vendored here):
1. spec-kitty PR #5881 is merged: `gh pr view 5881 --repo spec-kitty/spec-kitty --json state,mergedAt` reports `MERGED` (if `gh` is denied, stop and report: do not guess).
2. `contracts/spec-kitty/PIN.json` has `"provenance": "main"` and its `files` map lists an `OpsInvocationPage.yaml` schema and the Ops examples (`OpsInvocationPage.first`, `.last`, `.empty`, the nine `OpsInvocation` examples, `OpsRefusal.ops-unreadable`, `PageCursorRefusal.invalid`); the files exist on disk with the pinned hashes (`pnpm contract:check --require-main` is the authority).
3. The #9 Projects re-vendor commit is on `main` and is an ancestor of `HEAD` (`git merge-base --is-ancestor <re-vendor commit> HEAD`; the dispatch names the commit).
4. Record the retry-union location for WP02: `ls packages/mission-ui/src/retry-types.ts`; if absent, the union is in `packages/mission-ui/src/logic/wp-retry.ts`. Say which in the hand-off (plan, Build base item 2).

**Files**: none. **Validation**: the hand-off quotes the four results verbatim.

### T002 Gate baseline on the build base

**Steps**: run every gate command of "Gates this work package must pass" plus `pnpm visual` (pinned container; read-only run, no `visual:update`) and `node scripts/gate-proof.mjs local` on the unchanged build base and record command, exit code, reporter counts and wall-clock in the hand-off. A red found on the build base is escalated at once (BLOCKED report), never absorbed. This is the baseline that WP09 compares against.

**Files**: none (the orchestrator transcribes the record into `contracts/gates.md`, "Timing record"). **Validation**: every command has an entry.

### T003 Register the contract-derived Ops fixtures

**Purpose**: FR-041, the examples as fixtures.

**Steps** (red-first with `scripts/contract/*.test.mjs` and `ops-fixtures.test.ts`):
1. Register in the generation step (`scripts/contract/registry.mjs` and `generate.mjs`): the page examples `first` (an open Op and a closed one, `hasNextPage` true, `totalCount` 5, `skippedCount` 1), `last`, `empty`; the nine `OpsInvocation` examples (`open`, `closed-by-agent`, `closed-by-doctor-sweep`, `evidence-null`, `evidence-repo-path`, `evidence-url`, `evidence-url-redacted`, `evidence-text`, `evidence-text-redacted`); `OpsRefusal.ops-unreadable`; `PageCursorRefusal.invalid`.
2. Regenerate `types.generated.ts` and `fixtures.generated.ts` with `pnpm contract:generate`; never hand-edit them; the Ops types (`OpsInvocation`, `OpsInvocationPage`, `OpsEvidence`, the vocabularies, `OpsRefusalCode`) must be exported.
3. Assert the produced fixture count with equality in `ops-fixtures.test.ts` and record it.

**Files**: `scripts/contract/**`, `packages/mission-ui/src/contract/**` (generated), `packages/mission-ui/test/ops-fixtures.test.ts`. **Edge cases**: the fixtures are synthetic; none may contain an absolute path, a real e-mail address or a credential-shaped string.

### T004 Overlays and named relaxations

**Steps**: add overlays (`overlays.mjs`, with tests) deriving from the examples: a row of every `outcome` (`done`, `failed`, `abandoned`), `closedBy`, `modeOfWork` (all four) and evidence kind; redaction (`redacted` true with `[path]` and `[email]` markers); a null-actor row; null Mission and Work Package; a 512-character evidence value; a hostile inert evidence value (markup, a `javascript:` address, an unbroken 512-character token, a bidirectional-override character); unknown outcome, closer, mode and evidence kind; a 128-character profile; a long action; a `+02:00` start offset; a page with `hasNextPage` and a last page. About 14 contract-derived and 22 overlay fixtures in all (plan, Scale/Scope). Named relaxations: `ops-vocab-open` (the overlays that deliberately carry a foreign vocabulary value are exempt from vocabulary validation, and only they) and `ops-field-length` (none expected; recorded only if a generated overlay needs one). Each relaxation has a test proving an overlay without the relaxation is refused.

**Files**: `scripts/contract/overlays.mjs`, `registry.mjs`, their tests. **Edge cases**: overlays are checked against the contract schema except where a named relaxation applies; actors come only from the synthetic allow-list.

### T005 Story-argument helpers and the 200-row builder

**Steps**: create `elements/sk-ops-screen/fixtures.ts`: story argument helpers returning property objects for the ten state/page combinations the stories need (ready first page, loading-more, last page, load-more error with a code, refused cursor, empty, empty with skipped, empty with profile, error with each refusal code, mismatched profile), overlay builders by name, and a deterministic 200-row page builder (and a 1,000-row accumulator for NFR-006). No arithmetic on contract values; builders take counts as given. This file is the ONLY place the stories get arguments from: later work packages import and never edit it (a gap is a change request to the orchestrator).

**Files**: `elements/sk-ops-screen/fixtures.ts`, `ops-fixtures.test.ts`. **Validation**: a test per helper asserts the produced shape against the generated types.

### T006 Exit checks

**Steps**: `pnpm contract:check --require-main` and `pnpm test:contract` green (reporter count above 0, fail 0); `pnpm hygiene` green on the new fixtures; `pnpm typecheck`; record the fixture count and the `test:contract` wall-clock in the hand-off. The plant for the contract gate still fails when the fixtures are tampered with (`node scripts/gate-proof.mjs local --only contract`).

## Test strategy

Positive controls for every relaxation test (the same overlay without the relaxation is refused); fixture counts asserted with equality; a revert check per test file. `pnpm visual` runs only as the T002 baseline read; `pnpm gate-proof` runs for the contract leg.

## Definition of Done

- T001 stop-check passed and recorded; build base gate baseline recorded.
- Ops types and fixtures generated (not hand-edited); `contract:check --require-main` green; relaxations tested both ways.
- `fixtures.ts` helpers cover every state the 36 stories need; fixture count recorded.
- Hygiene green: no path, username, credential-shaped value or real e-mail in any fixture.

## Risks

- The Ops slice absent from the pin: T001 stops the mission; do not vendor around it.
- An overlay passing only because a relaxation is too broad: each relaxation is scoped to named overlays and tested.
- Pin drift: a pin that is not `main` makes `--require-main` red; report, never edit `PIN.json`.

## Reviewer guidance

Check the stop-check evidence is real (not paraphrased), that nothing is vendored, that generated files are untouched by hand, that the relaxations are narrow and tested both ways, that hostile and unknown-vocabulary overlays exist, and that no fixture value looks like a path, e-mail or credential.

Implementation command: `spec-kitty agent action implement WP01 --agent claude` (orchestrator-run).

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
