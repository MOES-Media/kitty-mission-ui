---
work_package_id: WP02
title: Ops defaults, pure logic and the data-driven and R-ops-1 gates
dependencies:
- WP01
requirement_refs:
- FR-017
- FR-018
- FR-028
- FR-032
- FR-038
- FR-039
- NFR-005
- NFR-009
- C-004
- C-007
- C-009
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: 0916ee93a4068dd2f7f6bb69d1da6b18fc64c92b
created_at: '2026-10-10T10:53:16.770952+00:00'
subtasks:
- T007
- T008
- T009
- T010
- T011
- T012
- T013
history: []
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/logic/
create_intent:
- packages/mission-ui/src/defaults/ops-copy.ts
- packages/mission-ui/src/logic/ops-look.ts
- packages/mission-ui/src/logic/ops-row.ts
- packages/mission-ui/src/logic/ops-time.ts
- packages/mission-ui/src/logic/ops-text.ts
- packages/mission-ui/src/retry-types.ts
- packages/mission-ui/test/ops-copy.test.ts
- packages/mission-ui/test/ops-look.test.ts
- packages/mission-ui/test/ops-row.test.ts
- packages/mission-ui/test/ops-time.test.ts
- packages/mission-ui/test/ops-text.test.ts
- packages/mission-ui/test/ops-retry-union.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/defaults/ops-copy.ts
- packages/mission-ui/src/logic/ops-look.ts
- packages/mission-ui/src/logic/ops-row.ts
- packages/mission-ui/src/logic/ops-time.ts
- packages/mission-ui/src/logic/ops-text.ts
- packages/mission-ui/src/logic/index.ts
- packages/mission-ui/src/logic/wp-retry.ts
- packages/mission-ui/src/retry-types.ts
- packages/mission-ui/test/ops-copy.test.ts
- packages/mission-ui/test/ops-look.test.ts
- packages/mission-ui/test/ops-row.test.ts
- packages/mission-ui/test/ops-time.test.ts
- packages/mission-ui/test/ops-text.test.ts
- packages/mission-ui/test/ops-retry-union.test.ts
- packages/mission-ui/test/wp-retry-union.test.ts
- eslint.data-driven.config.mjs
- gates/data-driven.selftest.ts
- gates/fixtures/data-driven/**
- gates/plants/data-driven/**
- eslint.config.mjs
- gates/plants/eslint/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - Ops defaults, pure logic and the data-driven and R-ops-1 gates (IC-02)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Write the Ops copy module, the four pure `logic/` modules with unit tests, the retry-union member, the data-driven gate extension with self-test cases and a plant, and the R-ops-1 ESLint selector set with a plant. After this work package every word, tone, text and decision of the screen exists as tested pure code; no element exists yet.

## Context

Read `plan.md` (D-02 to D-05, D-11 to D-13, IC-02, Build base 2), `contracts/defaults.md` (the key table is the module's content), `contracts/sk-ops-screen.md` (look resolution), `contracts/gates.md` (data-driven extension, R-ops-1, self-check list), `data-model.md`, `research.md` (R-04 to R-07) and the precedents in `packages/mission-ui/src/defaults/`, `logic/` (`lookup.ts`, `wp-retry.ts`), `eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts`. Requirements: FR-017, FR-018, FR-028 (the union member), FR-032 (the function), FR-038, FR-039, NFR-005, NFR-009, C-004, C-007, C-009.

Exports: `ops-copy.ts` is NOT exported from `defaults/index.ts` here (that one-line export is WP04's, plan "Shared one-line touches"); your tests import it by its own path. `logic/index.ts` is yours (exports of the four logic modules).

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP01. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## Subtasks

### T007 `defaults/ops-copy.ts`

**Steps** (red-first with `ops-copy.test.ts`): implement every key of `contracts/defaults.md` AND the announcement texts of the table in `contracts/sk-ops-screen.md` ("Loading invocation records"; "{loaded} of {total} records loaded"; "{n} more records loaded"; the empty heading; the load-more error sentence), which `defaults.md` does not list: header, source notice, section texts, count text (`opsCountText(loaded, total)`: "{loaded} of {total}", equal "{total} records", singular as the table states), `skippedText(n)` (singular and plural), `loadedAnnouncement(...)`, outcome, status, closer, mode and evidence-class tables (word and tone, tones from the existing `BadgeTone`), fact terms, quiet words, redacted word and description, load-more, load-more error, refused cursor and refresh, empty (plain, profile, skipped), loading, error by refusal code with the generic fallback, months, and the constants `CURSOR_REFUSAL_CODE` and `ERROR_RETRY_LABEL`. Tables are keyed by the contract word and read through `lookup`; an unknown key falls back to the raw word with the neutral tone.

**Files**: `defaults/ops-copy.ts`, `ops-copy.test.ts`. **Edge cases**: counts 0, 1, 2 and 249; host-neutral copy (no path, file format or host name, OQ-6); "Mission" never "feature".

### T008 `logic/ops-time.ts` and `logic/ops-text.ts`

**Steps** (red-first): `formatUtcInstant(iso)` exactly as plan D-04: strict RFC 3339 pattern; fields converted to UTC by integer arithmetic on the parsed numbers; printed `D Mon YYYY, HH:MM:SS UTC` with month names from `ops-copy.ts`; fractional seconds dropped from the text; range checks (calendar-valid day incl. leap years, hour, minute, second 0 to 59 with a leap-second `60` invalid here, offset hours 0 to 23, minutes 0 to 59); any failure returns null so the caller prints the string as given with no `datetime`. NO `Date`, `Date.parse`, `Intl` or clock use anywhere. `ops-text.ts`: the pure text helpers the parts need (count text, skipped text, announcement text) wrapping `ops-copy.ts` with the `labels` override hooks (`labels.time`, `labels.copy`).

**Files**: `logic/ops-time.ts`, `logic/ops-text.ts`, `ops-time.test.ts`, `ops-text.test.ts`. **Edge cases (one test each)**: `+02:00`, `-05:30`, `Z`, midnight rollover across a day, month and year, 29 February in leap and non-leap years, second `60`, offset `+24:00`, fractional seconds, a string with a trailing space, an empty string, a non-string cast.

### T009 `logic/ops-row.ts` and `logic/ops-look.ts`

**Steps** (red-first): `buildOpsRow(item, vocabulary, labels)` per plan D-03: badge (outcome word and tone for a non-null outcome, else the status word and tone), the ordered fact list (Profile, Action, Actor, Started, Completed, Evidence, then Mission, Work Package, Mode, Closed by when present) with absent facts removed (Mission, Work Package, Mode, Closed by) or replaced by the quiet word (Actor, Completed, Evidence), the evidence display (class word, value, `changed` flag). No branch on a vocabulary literal: the tone table is data. `resolveOpsLook(props)` per `contracts/sk-ops-screen.md` (the six-row precedence table) returning `{ look, reason }`. Unit tests: every table row, an unknown status, `ready` with zero items, a mismatched profile (exact equality: `Ops-A` versus `ops-a` disagrees), `profile` null (no check), defensive combinations (open with an outcome, closed with a null outcome, a null `completedAt` on a closed Op), unknown vocabularies (raw word, neutral tone), a swept Op.

**Files**: `logic/ops-row.ts`, `logic/ops-look.ts`, `ops-row.test.ts`, `ops-look.test.ts`. **Edge cases**: nothing reads `items` order; no sorting; no arithmetic beyond what the table states.

### T010 Retry-union member and `logic/index.ts`

**Steps**: extend the existing `RetryLoadDetail` union with the Ops member `{ target: 'ops-page'; cursor?: string }`, in `retry-types.ts` if the file exists on the build base, else in `logic/wp-retry.ts` (T001 recorded which; if `retry-types.ts` exists, `wp-retry.ts` is left alone). The union is EXTENDED, never redeclared, and `HTMLElementEventMap['sk-retry-load']` stays declared once (FR-028): do not touch any element's declaration. Update the existing `wp-retry-union.test.ts` and add `ops-retry-union.test.ts` (the member typechecks, narrows on `target`, carries no `missionId` or `wpId`, and the cursor is optional). Add the exports of the four logic modules to `logic/index.ts`.

**Files**: the union file, `logic/index.ts`, `wp-retry-union.test.ts`, `ops-retry-union.test.ts`.

### T011 Data-driven extension (plan D-12)

**Steps** (red-first with the self-test): `eslint.data-driven.config.mjs` reads `OpsOutcome`, `OpsClosedBy`, `OpsModeOfWork`, `OpsEvidenceKind`, `OpsInvocationStatus`, `OpsRefusalCode` and the `invalid_page_cursor` constant from the vendored schemas. Matched anywhere as literals: `task_execution`, `mission_step`, `doctor_sweep`, `repo_path`, `ops_unreadable`, `invalid_page_cursor`, `abandoned`. Matched only in a comparison or case label (common identifiers): `open`, `closed`, `agent`, `query`, `text`, `url`, `failed`, `advisory`. `done` is already gated as a lane. Self-test cases in `gates/data-driven.selftest.ts` (and `gates/fixtures/data-driven/**`): one violating case per word class, a bare-word property (`{ text: ... }`, `{ url: ... }`) that must stay clean, and a counted assertion that the gate found exactly the expected violations (not vacuous). Add one gate-proof plant for the new mechanism (`'doctor_sweep'` literal outside `defaults/` is refused) in `gates/plants/data-driven/`.

**Files**: `eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts`, `gates/fixtures/data-driven/**`, `gates/plants/data-driven/**`.

### T012 R-ops-1 ESLint selectors with a plant

**Steps**: in `eslint.config.mjs` add a rule set scoped to `packages/mission-ui/src/elements/sk-ops-screen/*-parts.ts` refusing `unsafeHTML`, `unsafeSVG`, `.innerHTML`, assignment to `innerHTML`, and an attribute binding named `href`, `src`, `srcset`, `action`, `formaction` or `xlink:href`. Add the plant (`gates/plants/eslint/`: an `href` bound to an item value in `ops-row-parts.ts` is refused) with its `.plant` file, matching the existing plant mechanism. Run `node scripts/gate-proof.mjs local --only eslint` and `--only data-driven`. If a gate-proof count test (`scripts/gate-proof/gate-proof.test.mjs`) asserts plant counts and needs a number changed, make the minimal edit as a recorded out-of-map edit.

**Files**: `eslint.config.mjs`, `gates/plants/eslint/**`.

### T013 Exit checks

**Steps**: `pnpm test:data-driven`, `node scripts/gate-proof.mjs local --only data-driven --only eslint`, all unit tests green with the reporter's pass count, `pnpm lint:no-io && pnpm test:no-io` (no clock, storage, fetch in `logic/`), the full gate list. Record the revert check per test file.

## Test strategy

Red-first throughout; positive controls on every refusal; the self-test asserts equality counts so it cannot pass vacuously; one revert check per test file (for example: change the leap-second range check, drop the exact-equality profile rule, delete one tone-table row). `pnpm visual` does not run. `node scripts/gate-proof.mjs local` runs for the two legs this work package adds plants to.

## Definition of Done

- `ops-copy.ts` covers every key of `contracts/defaults.md`; the four logic modules and their tests pass; no `Date`, `Intl` or clock use.
- The retry-union member exists once and `HTMLElementEventMap['sk-retry-load']` is still declared once.
- Data-driven extension green with self-test cases, the bare-word case clean, one plant proven; R-ops-1 plant proven.
- Hand-off states where the union lives and lists every edit outside `owned_files` (expected: none or the gate-proof count).

## Risks

- The `Date` temptation: parsing with `Date.parse` is not allowed here (D-04) because it would put a clock-capable API in `logic/`; do the arithmetic on numbers.
- The data-driven bare-word split: `text` and `url` are common identifiers; matching them anywhere would flag every unrelated property.
- Two owners for the union: if `retry-types.ts` exists on the build base, editing `wp-retry.ts` as well splits the union.

## Reviewer guidance

Check the time function against the edge-case list (re-run two), the exact-equality look rule, that tone tables are data (no branch on a vocabulary word), that the gate extension is neither too broad (bare words) nor vacuous (counts), that the plants fail without their rule, that the union is extended not redeclared, and that `ops-copy.ts` copy is host-neutral.

Implementation command: `spec-kitty agent action implement WP02 --agent claude` (orchestrator-run).

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
