---
work_package_id: WP03
title: Foundation spikes S-O1 to S-O4 and CP-1 evidence
dependencies:
- WP02
requirement_refs:
- FR-020
- FR-034
- FR-037
- FR-043
- NFR-008
- C-005
- C-006
planning_base_branch: feat/ops-screen-11
merge_target_branch: feat/ops-screen-11
branch_strategy: Planning artifacts for this mission were generated on feat/ops-screen-11. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/ops-screen-11 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-ops-screen-01M4C92P
base_commit: a8c4a733531d6baa96d9d7350a24c3c3856aa2b2
created_at: '2026-10-11T08:07:52.991236+00:00'
subtasks:
- T014
- T015
- T016
- T017
- T018
history: []
agent_profile: frontend-freddy
authoritative_surface: spikes/ic-03a-ops/
create_intent:
- spikes/ic-03a-ops/**
execution_mode: code_change
model: ''
owned_files:
- spikes/ic-03a-ops/**
- apps/storybook/.storybook/main.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - Foundation spikes S-O1 to S-O4 and CP-1 evidence (IC-03)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Answer four questions with evidence before the surface freeze (spikes S-O1 to S-O4 of `research.md`) as throwaway stories under `spikes/ic-03a-ops/`, and produce the evidence packet the orchestrator puts in front of the operator at checkpoint CP-1. Then delete ALL spike code with a named final commit so that nothing of it reaches the lane tip or the pull request. This work package ships no product code: its approved tip tree equals its base tree.

## Context

Read `plan.md` (IC-03a, CP-1, D-09, D-10, D-11), `research.md` ("Spikes", "CP-1 questions the spikes answer", R-01, R-02), `contracts/gates.md` (E-40 to E-43 and their conditions), `contracts/sk-ops-screen.md` (Focus), `spec.md` (DO-13, DO-22, DO-24, OP-09, OP-27, OP-29 to OP-32; FR-020, FR-034, FR-037, FR-043) and the precedent `kitty-specs/work-package-screen-01M44DSJ/tasks/WP03-spikes-s5-s9-and-cp1-evidence.md` (scaffolding, final removal commit). The prototype is `<prototype>/07-ops.html` (with `?state=` variants) and `<prototype>/prototype.css`, outside the repository. The shell, `shellFrame`, `flush`, `library-sheets.ts`, `progress-sheet.ts` and the Stylelint exception machinery are earlier missions', already merged.

CP-1 is orchestrator-owned and is NOT part of this work package. You do not ask the operator anything, you do not write `tracer-design-decisions.md`, and you do not decide an exception: you deliver evidence and a recommendation per spike. Requirements: FR-020, FR-034, FR-037, FR-043, NFR-008, C-005, C-006.

## Branch Strategy

Planning branch and final merge target: `feat/ops-screen-11`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP02. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per `tasks-notes.md`, "Lane mechanics", and checks the entry conditions); do not create, switch or reset branches yourself.


## Subtasks

### T014 Scaffolding: the two permitted additions and the pinned container

**Steps**: create `spikes/ic-03a-ops/` at the repository root. Add exactly TWO configuration additions, each removed by the final commit: (a) one `stories` entry for `spikes/ic-03a-ops/**/*.stories.ts` in `apps/storybook/.storybook/main.ts`; (b) one ESLint `ignores` entry for `spikes/ic-03a-ops/**` in `eslint.config.mjs` (recorded out-of-map edit; the file is WP02's). Keep the path outside the Stylelint, manifest and unit-test globs (read them; do not widen any). Confirm the pinned container runs (`scripts/visual.sh`); capture evidence with the container's screenshot run, never a committed-snapshot `pnpm visual` pass and never `pnpm visual:update`; no PNG is committed. Every spike file begins `// Throwaway spike for CP-1 evidence; deleted by the final commit of WP03.`

**Files**: `spikes/ic-03a-ops/**`, `apps/storybook/.storybook/main.ts`; out-of-map: `eslint.config.mjs` (one entry). **Validation**: `pnpm build-storybook` lists the spike stories; `pnpm lint`, `pnpm lint:styles`, `pnpm manifest:check` and `pnpm test` stay green with the spike present.

### T015 Spike S-O1: row frame and facts

**Question**: which construction reproduces the prototype row (`article.collection-row.invocation-row`: a head with a mono `strong` id and a badge, and `dl.facts.invocation-facts`, two columns of `minmax(0, 1fr)`, each fact a `minmax(80px, .55fr) minmax(0, 1.45fr)` pair)? **Steps**: render the prototype row beside (a) a plain `li` with the library facts element if the library has one, (b) the library `sk-card` (inset), (c) a plain `li` with project layout CSS and the prototype grid, all in `shellFrame` at 1280 px with `flush`. Measure border width, radius, padding, term and value font sizes and row gaps against the prototype (`getBoundingClientRect`, computed style); run Stylelint on `minmax(80px, ...)` and record the verbatim output to learn whether the px track needs E-41. **Decides**: DO-22, DO-24, E-40, E-41. Pass rule: the side-by-side shows no difference beyond the register.

### T016 Spikes S-O2 and S-O3: tier thresholds and wrapping

**S-O2**: measure the content-cell width of the project layout (with `flush`) at viewports 1100, 800, 620 and 390 (do not copy arithmetic from any prompt; measure in the browser); derive the container thresholds at which facts become one column and the head and section heading stack so the screen matches the prototype's 800 px and 620 px breakpoints at zero drift; test whether a pure container query reproduces the 620 px head stack in the shell's mobile tier or `ShellTierController` with `:state(shell-mobile)` is needed (option C of the earlier missions). **Decides**: D-10 and the controller question.

**S-O3**: render a 26-character id, a 128-character profile, a long action, a 512-character unbroken evidence token and a 512-character prose evidence in the head, a pill and a fact value, with (a) `overflow-wrap: anywhere` and (b) the shared ellipsis rule. Record which keep the row within its width (no horizontal overflow at any tier) and keep the 512 characters readable in full. **Decides**: DO-13, E-43 and E-42, and whether the head `strong` needs an exception.

### T017 Spike S-O4: focus across paging

**Question**: in the Missions screen mechanics, what is `document.activeElement` at each step: Load more focused, `busy` toggled, `items` replaced, the control replaced by the load-more error notice, and by nothing (last page)? Does `sk-button busy` keep focus across the toggle and the page arrival? **Steps**: a throwaway story with the Missions mechanics (`requestedCursor` memo, `busy`, `aria-busy` on the `li`) and a harness that records `document.activeElement` (tag, text) after each step and after one animation frame; also whether the section heading fallback (`tabindex="-1"`) is exercised. **Decides**: D-09.

### T018 Evidence packet and removal

**Steps**: write the evidence packet in the hand-off: per spike the question, the method, the measurements (`measurements.json` content inline or at an uncommitted path), the side-by-side images read and described, the accessibility trees as text, the verbatim Stylelint probe, and a recommendation answering the five CP-1 questions of `research.md` (row construction and the final text of DO-22 and DO-24; E-40 and E-41 needed, narrowed or deleted; the id and evidence wrapping rule and E-43/E-42; tier thresholds and controller; whether to add the earlier mission's bidirectional-control notice to evidence). Images are uncommitted and their location is stated. Then delete ALL spike code and both configuration additions in one final commit titled `chore(ic-03a): remove spike code` and verify `git diff <base>..HEAD --stat` is empty (the tip tree equals the base tree).

**Files**: none surviving. **Validation**: `git diff --stat <base> HEAD` is empty.

## Test strategy

This work package proves nothing by tests; its quality is the evidence. Every claim is a measurement or an image that was read; no conclusion without its number. No gate beyond the full list staying green with the spike present, and again after removal. `pnpm visual` runs only as the container screenshot capture, never as an exit check.

## Definition of Done

- Four spikes answered with measurements, side-by-side images (read and described), the accessibility trees and the verbatim Stylelint probe.
- A recommendation for each of the five CP-1 questions, flagged as a recommendation (the operator rules).
- Final commit `chore(ic-03a): remove spike code`; tip tree equals base tree; no PNG committed; nothing running.

## Risks

- A spike left in the tree reaches the PR: the final removal commit and the empty diff are the guard.
- Measuring at the wrong width: the content cell is measured in the browser, not computed.
- Quietly deciding an exception: you recommend, the orchestrator and operator rule.

## Reviewer guidance

Check every spike has numbers and images, that the Stylelint probe is verbatim, that recommendations answer all five CP-1 questions, that the final commit empties the diff to the base, that no PNG or config addition survives, and that the hand-off contains no absolute path or username.

Implementation command: `spec-kitty agent action implement WP03 --agent claude` (orchestrator-run).

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
