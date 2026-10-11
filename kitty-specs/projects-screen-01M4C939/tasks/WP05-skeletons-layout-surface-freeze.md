---
work_package_id: WP05
title: Element skeletons, layout and surface freeze
dependencies:
- WP04
requirement_refs:
- FR-001
- FR-016
- FR-020
- FR-026
- FR-032
- FR-033
- NFR-005
- C-001
planning_base_branch: feat/projects-screen-9
merge_target_branch: feat/projects-screen-9
branch_strategy: Planning artifacts for this mission were generated on feat/projects-screen-9. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/projects-screen-9 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-projects-screen-01M4C939
base_commit: 83860b7427fc4824fdfef9b6b2dd1287ccae0c54
created_at: '2026-10-08T09:03:51.006307+00:00'
subtasks:
- T027
- T028
- T029
- T030
- T031
- T032
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-projects-screen/
create_intent:
- packages/mission-ui/src/elements/sk-projects-screen/sk-projects-screen.ts
- packages/mission-ui/src/elements/sk-open-project-dialog/sk-open-project-dialog.ts
- packages/mission-ui/test/sk-projects-screen.skeleton.test.ts
- packages/mission-ui/test/sk-open-project-dialog.skeleton.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-ui/src/index.ts
- packages/mission-ui/custom-elements.json
- packages/mission-ui/src/elements/sk-projects-screen/sk-projects-screen.ts
- packages/mission-ui/src/elements/sk-open-project-dialog/sk-open-project-dialog.ts
- packages/mission-ui/test/sk-projects-screen.skeleton.test.ts
- packages/mission-ui/test/sk-open-project-dialog.skeleton.test.ts
- packages/mission-ui/test/surface-freeze.test.ts
- stylelint.config.mjs
- eslint.config.mjs
- scripts/stylelint-exceptions.test.mjs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP05 - Element skeletons, layout and surface freeze (IC-04)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

Do not spawn sub-agents or forks; do this work package yourself.

## Objective

Create `sk-projects-screen` (five properties, three events) and `sk-open-project-dialog` (five properties, three events) as complete shells: attributes and run-time defaults, `@fires`, literal `dispatchEvent` methods, payload builders, container queries, the status switch, the focus rule, composed styles, stub part files with their FINAL signatures, registration, the exceptions as ruled at CP-1 with proof cases, the skeleton and surface-freeze tests, and the ONE manifest regeneration that freezes the surface. After this WP no region WP edits an element class, `index.ts`, the manifest or a lint config: they replace part bodies only.

## Context

Plan IC-04b, CP-1, Shared files, Architecture (Screen composition, Dialog composition); `contracts/sk-projects-screen.md` and `contracts/sk-open-project-dialog.md` (authoritative: properties, events, rendering by `status`, part signatures); `data-model.md`; `research.md` D-11, D-14..D-20; `contracts/gates.md` (E-31..E-34). Requirements FR-001, FR-016 (surface), FR-020 (container queries), FR-026 (surface frozen, `manifest:check`), FR-032 (exceptions), FR-033 (the two `src/index.ts` lines), NFR-005, C-001. Precedent: #5's `sk-work-package-screen.ts` skeleton and its stub-parts approach.

## Branch Strategy

Planning branch and final merge target: `feat/projects-screen-9`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator creates or verifies the lane and merges the target branch in); do not create, switch or reset branches yourself.

## Preconditions and stop-checks

FILE PRECONDITION (first step, first exit check). Confirm that `tracer-design-decisions.md` in this mission's directory (read-only for you) contains a dated entry headed `CP-1 confirmed` naming which of DP-1..DP-27 the operator confirmed, the exceptions E-31..E-34 as ruled (each with the spike that decided it), the amendments P-1..P-3 as ruled and the two container thresholds. Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree, where `<CP-1 commit>` is the hash the dispatch names. If the entry is absent or not an ancestor: STOP and report; never write the entry yourself. The reviewer REJECTS if it was not present before your first commit.

## Subtasks

### Subtask T027: FILE PRECONDITION and spike outcomes

**Purpose**: CP-1 is not a dependency the tool can express; this is the gate.

**Steps**:
1. FILE PRECONDITION (first step, first exit check). Confirm that `tracer-design-decisions.md` in this mission's directory (read-only for you) contains a dated entry headed `CP-1 confirmed` naming which of DP-1..DP-27 the operator confirmed, the exceptions E-31..E-34 as ruled (each with the spike that decided it), the amendments P-1..P-3 as ruled and the two container thresholds. Verify with `git merge-base --is-ancestor <CP-1 commit> HEAD` in your worktree, where `<CP-1 commit>` is the hash the dispatch names. If the entry is absent or not an ancestor: STOP and report; never write the entry yourself. The reviewer REJECTS if it was not present before your first commit.
2. Read the spike outcomes and the CP-1 ruling on P-1 (the dialog has no `labels`), P-2 and P-3 there: they decide the exact property lists of T028 and T029. Apply the rulings; if a ruling is missing for a point you need, STOP and report.

**Files**: none
**Validation**: Hand-off quotes the CP-1 commit hash and the ancestry check.

### Subtask T028: `sk-projects-screen.ts`: surface, switches, layout, dispatch, focus

**Purpose**: FR-001, FR-009..FR-014 wiring, FR-020, FR-026.

**Steps**:
1. Properties exactly as the contract states (five: `entries`, `status`, `now`, `labels`, `errorMessage`), `status` attribute reflected with the four charter states, unknown collapses to `empty`; `@screen` JSDoc line for the manifest gate.
2. `@fires` and ONE literal `dispatchEvent(new CustomEvent(..., { detail, bubbles: true, composed: true }))` per event in this file only: `sk-open-project` `{ key }`, `sk-request-open-project`, `sk-retry-load` (the shared event is declared once already; do not redeclare its `HTMLElementEventMap` entry). Payloads built with WP02's `project-retry.ts`; a keyless entry's retry is inert.
3. Status switch: whole-list `loading`, `error`, `empty` replace the list (the whole-list state wins); `ready` renders the list through `resolveEntry`. Draw the containers, the one polite visually-hidden live region (copy builders from `defaults/`, never on first render) and call part functions (stubs) for bodies.
4. Container queries: host `container-type: inline-size`; the single-column row switch and header stack use the thresholds CP-1 recorded (from spike S3); narrow column `min(900px, 100%)` centred; grid `minmax(0, 1fr)` on every stack.
5. Focus rule (D-15): `willUpdate` records `shadowRoot.activeElement`; `updated()` moves focus to the `h1` (`tabindex=-1`) only when the recorded node is gone.
6. Draw the `data-region` hooks the contract lists (`header`, `toolbar`, `list`, `notice`, `state`; rows carry `data-key`; the live region is `[data-live]`). When the screen re-emits an event that arrived from a child it calls `event.stopPropagation()` before its own dispatch (as `sk-missions-screen` does). Compose `static styles` from every part's styles export.

**Files**: sk-projects-screen.ts
**Validation**: Skeleton tests (T032) green.

### Subtask T029: `sk-open-project-dialog.ts`: surface, native dialog, focus capture

**Purpose**: FR-016..FR-018 surface and D-16/D-19.

**Steps**:
1. Properties `open`, `location`, `folders`, `selected`, `status` (and `labels` only if CP-1 ruled against P-1); `@fires` `sk-browse-folder` `{ location }`, `sk-confirm-open-project` `{ location }`, `sk-retry-load` (shared; `target: 'folders'`). Literal dispatch methods in this file only.
2. Native `<dialog>`: `showModal()` on `open` becoming true, `close()` when false in `updated()`; native `cancel` (Escape) and a backdrop click set `open` false itself (semi-controlled). Record the deep active element in `willUpdate` when `open` turns true; return focus after close if still connected.
3. The polite visually-hidden status region inside the dialog (NFR-012); no timers, no storage (the `no-io` gate scans this file). The dialog is a sibling element the host places; it is independent of the list. It is a widget: it has a `status` property but NO `@screen` JSDoc line (the screen has one). When the dialog opens, focus moves to its first control (the listbox's active option, else Cancel).

**Files**: sk-open-project-dialog.ts
**Validation**: Skeleton tests green.

### Subtask T030: Stub part files with FINAL signatures

**Purpose**: Region WPs replace bodies and keep signatures (a change is a change request).

**Steps**:
1. Create `header-parts.ts` (`renderHeader`, `renderToolbar`), `row-parts.ts` (`renderRow`), `state-parts.ts` (`renderListState`, `renderNotice`) under `sk-projects-screen/` and `folder-list-parts.ts` (`renderFolderList`) under `sk-open-project-dialog/` exactly per the "Part signatures" sections of `contracts/sk-projects-screen.md` and `contracts/sk-open-project-dialog.md` (authoritative; the `EntryView` type comes from WP02's `logic/`): a stub render function returns `nothing`, a stub styles export is an empty `css`. Each `<Region>View` is a plain readonly exported object type; record any view type you add beyond the contract in the hand-off.
2. These stubs are out-of-map creations: from this point the files are owned by WP06 (screen parts) and WP07 (`folder-list-parts.ts`). Part files import only from `defaults/`, `logic/` and the library and never dispatch.

**Files**: stub parts (out-of-map creations)
**Validation**: Every stub compiles; the screen renders with all stubs: containers present, bodies empty.

### Subtask T031: Registration, manifest and the exceptions as ruled

**Purpose**: FR-033, FR-026, FR-032.

**Steps**:
1. `src/index.ts`: guarded registration of both elements and the type exports, one line each (Drift and Ops edit the same file; keep it minimal). Add the P-2 `ProjectLabelHooks` export if CP-1 confirmed it.
2. `pnpm manifest:generate && pnpm manifest:check` (the one regeneration that freezes the surface).
3. Exceptions E-31..E-34 EXACTLY as the CP-1 entry rules them (an unruled exception is not added; an unused number stays unused). Each ruled one gets its Stylelint or ESLint entry scoped to its file, token values only, and an in-file proof case in `scripts/stylelint-exceptions.test.mjs` style (a sixth property or an out-of-file use is refused). Add the leak plant for each `classOnly([...])` prefix. Nothing else touches the lint configs.

**Files**: index.ts, custom-elements.json, stylelint.config.mjs, eslint.config.mjs, scripts/stylelint-exceptions.test.mjs
**Validation**: `pnpm lint`, `pnpm lint:styles`, `pnpm test:scripts`, `pnpm manifest:check` green.

### Subtask T032: Skeleton tests and the surface-freeze test

**Purpose**: FR-026, FR-030 (skeleton share), the layout cases.

**Steps**:
1. `sk-projects-screen.skeleton.test.ts` and `sk-open-project-dialog.skeleton.test.ts`: one test per event (exactly one event, exact payload with `toEqual`, `bubbles`, `composed`, not cancelable), each driven by calling the element's handler method through a type cast (no test-only template hook, no public method, no new property or event: the freeze test would fail if one were). Say so in a header comment. A positive control accompanies every no-event assertion.
2. Layout cases inside `shellFrame` with `layout: 'picker'` at 1280, 1100, 800, 620 (`page.viewport` first). Use small inline data, not fixtures (WP06 and WP07 own fixtures).
3. `surface-freeze.test.ts`: extend with both elements' properties, attributes, defaults and event names (counts asserted by equality: 5 and 3, 5 and 3) and the shell `layout` value set (`project`, `mission`, `picker`).

**Files**: the three test files
**Validation**: Revert checks named: rename an event, change a default.

## Definition of Done

- CP-1 precondition verified before the first commit.
- Both elements complete as shells with the full public surface; one literal dispatch per event; no event or property beyond the contract.
- Stub parts have final signatures; view types recorded in the hand-off.
- Manifest regenerated once; `manifest:check` green; exceptions exactly as ruled with proof cases; `pnpm lint:no-io` and `lint:data-driven` green.
- Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done` record (orchestrator-run), not a ticked checkbox.

## Risks

- A ruling at CP-1 may change a property list (P-1..P-3): apply, never guess.
- `src/index.ts` and `custom-elements.json` are shared with the other screen missions: one-line edits only.
- The dialog `no-io` scan: `showModal` and `close` are DOM APIs, not I/O; no timers.

## Reviewer Guidance

Verify the CP-1 ancestry; read the manifest for exactly the declared properties and events; grep dispatches (literal names, element files only); check that no exception exists that the CP-1 entry did not rule; confirm stub signatures match the contracts.

The reviewer is a separate agent. It checks the self-check list of `contracts/gates.md`, re-runs two revert checks, and REJECTS any prototype drift outside the confirmed register.

## Out-of-map edits

The four stub part files (created here, owned by WP06 and WP07 afterwards), `eslint.config.mjs` is yours (WP04's `ignores` entry is gone by then).

## Owned files, red-first, commit rule

**Owned files**: the frontmatter `owned_files` is authoritative; stage only these. `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file outside the list is changed only as the plan's table "Shared files: who may write them" allows for this work package; each such out-of-map edit is committed by you with plain `git add <path>` and `git commit`, and listed in the hand-off with a one-line rationale. A change you need in a file you do not own is a change request (file, change, reason). A generated file (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`) is never edited by hand: a conflict is resolved by regeneration only.

**Gates this work package must pass before hand-off** (run from the lane worktree root, each exits 0 with a pass count above 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test` (its output must list your test files), `pnpm test:scripts`, `pnpm build-storybook`, `pnpm contract:check && pnpm test:contract`. `pnpm visual` and `pnpm gate-proof` are NOT exit checks except where this prompt says so. If a script name differs on the build base, use the base's name and say so.

**Red-first.** For every behaviour, plant or gate case: write the failing test first, see it fail for the right reason, record the failing line in the hand-off, then implement. Per test file, one deliberate revert (temporary local edit, never committed) that produces a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two.

**Test-quality rules** (binding, from missions #4 and #5): every no-event test carries a positive control in the same test; every emit test asserts exactly one event, `bubbles` true, `composed` true, `cancelable` false and the detail with `toEqual`; counts are asserted by equality and every loop asserts it ran N times; not-drawn regions have a DOM-absence assertion paired with a present case; foreign values render their raw text, never `undefined`; vitest browser-mode tests call `page.viewport` first; the word "feature" never appears (the term is "Mission").

**Data-driven rules** (FR-019, NFR-009): `healthy` and `schema_drift` appear only in `defaults/` and `src/contract/`; no `=== 'healthy'`; no per-project literal (`main`, `spec-kitty`) in a component; no `Date`, `setTimeout`, `fetch`, `localStorage`, `location` or `history`; no `Math.` on contract values; every `dispatchEvent` has a literal `sk-*` name, sits in the element file and is declared by `@fires` (part files never dispatch); the screen never parses a location, branch or name and never derives health from `schemaVersion`; every `class=` has an approved prefix in that file's E-34 row or the file has none; no absolute home path or username in any committed file.

**Drift register and visual authority** (NFR-008): the prototype page `<prototype>/01-projects.html` is the visual source of truth. DP-1..DP-27 (`spec.md`) are PROPOSED until the `CP-1 confirmed` entry exists in `tracer-design-decisions.md`, and afterwards only the items that entry confirms are allowed. A difference in neither the register nor the CP-1 entry is a REJECT item for the WP that introduces it, not a design review item.

**Baselines**: PNGs are generated only inside the pinned container and committed ONLY in WP09. Other WPs commit no PNG, never run `pnpm visual:update`, and hand over uncommitted side-by-side screenshots against the prototype.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, compaction of history, a rebase and the operator's Storybook review (orchestrator-owned). Commit on your lane branch with a conventional message (`feat(projects-screen): ... (#9)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report; never retry it another way. Never pattern-kill processes, never `git stash`, never `git rebase`, never `rm` with a glob or variable; `core.bare` must stay false. Nothing is left running when you finish.
- Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics.
- Directory guard before any repo-wide command (`pnpm`, `eslint .`, `ruff`, `git add`): `test "$(git rev-parse --show-toplevel)" = "<lane>"`.
- No absolute paths and no usernames in any committed file or hand-off (use `<repo>`, `<prototype>`, `<lane>`); run `pnpm hygiene` before committing. Temporary files go under the scratchpad directory the orchestrator names (TMPDIR).
- Elements over CSS: every UI primitive the design library provides is rendered with its `sk-*` element; project CSS is layout-only with `--sk-*` tokens; a missing primitive is recorded as a design-library gap, never hand-rolled outside a numbered exception ruled at CP-1.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript; no I/O in screens.
- `tracer-*.md`, `spec.md`, `plan.md` and everything else under `kitty-specs/` are orchestrator-owned: report outcomes, decisions and friction in the hand-off; write nothing there.
- Do not run `spec-kitty` commands that mutate mission state; the orchestrator moves tasks.


Implementation command: `spec-kitty agent action implement WP05 --agent claude`
