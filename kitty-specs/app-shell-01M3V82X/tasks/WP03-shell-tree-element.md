---
work_package_id: WP03
title: sk-shell-tree pattern element
dependencies:
- WP02
requirement_refs:
- FR-003
- FR-011
- FR-014
planning_base_branch: feat/app-shell
merge_target_branch: feat/app-shell
branch_strategy: Planning artifacts for this mission were generated on feat/app-shell. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/app-shell unless the human explicitly redirects the landing branch.
subtasks:
- T014
- T015
- T016
- T017
- T018
phase: Phase 2 - Pattern elements
history:
- timestamp: '2026-10-01T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-shell-tree/
create_intent:
- packages/mission-ui/src/elements/sk-shell-tree/fixtures.ts
- packages/mission-ui/src/elements/sk-shell-tree/sk-shell-tree.stories.ts
- packages/mission-ui/test/sk-shell-tree.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-shell-tree/**
- packages/mission-ui/test/sk-shell-tree.test.ts
- apps/storybook/tests/visual/__snapshots__/mission-shell-tree--*.png
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - sk-shell-tree pattern element

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole WP.

Do not spawn sub-agents or forks; do this WP yourself.

## Objective

Make `sk-shell-tree` real: a heading, leaves as non-flush `sk-action-row` route rows, folders as native `<details>/<summary>`, selection, `sk-navigate` and `sk-tree-toggle`, with its 5 stories, baselines and tests.

## Context

Read `contracts/sk-shell-tree.md` (authoritative), `data-model.md` (`TreeNode`, toggle rule), `research.md` D-04 (folder toggle mechanism, evidence, the dark-theme colour fallback that needs operator approval first), D-05, D-08 G-05/G-14; `spec.md` FR-003, FR-011. The skeleton exists from WP01 (do not change JSDoc or members). You may reuse `sk-shell-nav-item`-style event code but the tree renders `sk-action-row` directly for leaves.

## Subtasks

### T014 Render leaves, headings, selection
`heading` in an `sk-section-header` title slot; `label` as the accessible name of the group (`role="group"` via `aria-label` on a wrapper `<div>`; no new landmark). Leaves: non-flush `sk-action-row` route rows with icon in `marker`, `meta` text in the row's trailing slot, `prefix` shown before the label. `current` equals a leaf id: that leaf `selected` with `aria-current="page"`; empty marks none. `unavailable` renders no link (a non-route row). Long names wrap through library row behaviour (G-14).

### T015 Folders with details/summary
Each folder is `<details ?open=${expanded}>` with `<summary>` containing the non-interactive row content (icon, text, count); nested leaves inside. Hide the default marker with `summary::-webkit-details-marker { display: none }` and `list-style` handling only through allowed properties; keep the default summary focus ring (both recorded under G-05 in a header comment). Folder rendering is keyed by the identity of `items` (use `repeat` or `guard`) so a new `items` array resets state. Check summary colour inheritance in the dark theme by viewing a story; if it is wrong, STOP and ask the operator before using the documented fallback (one native `<button aria-expanded aria-controls>` with a narrow `eslint-disable-next-line no-restricted-syntax` naming G-05); do not apply the fallback on your own.

### T016 Events
`sk-navigate { id, href }` for a leaf (unmodified primary click or Enter; modified clicks emit nothing). `sk-tree-toggle { id, expanded }` from the `toggle` event ONLY when the new open state differs from the rendered model (so no event on first render or on an `items` reset, and no loop with a host that writes state back). `sk-action-row-activate` is stopped at the tree boundary. `bubbles: true, composed: true`. The tree scrolls inside the sidebar, not the content: add no height rules that fight the shell (WP04 owns the scroll container).

### T017 Fixtures and the 5 stories
`packages/mission-ui/src/elements/sk-shell-tree/fixtures.ts` (synthetic work packages and artifacts, one with very long unbroken names) and `packages/mission-ui/src/elements/sk-shell-tree/sk-shell-tree.stories.ts`, title `Mission/Shell tree`, exports `WorkPackagesSelected`, `WorkPackagesNoneSelected`, `ArtifactsFolderExpanded`, `FolderCollapsed`, `LongNames`; ids `mission-shell-tree--work-packages-selected` etc.

### T018 Tests and baselines
`packages/mission-ui/test/sk-shell-tree.test.ts` (`page.viewport` first, reset in `afterEach`): leaf click and Enter payload; modified click emits nothing; selected leaf has `aria-current="page"`, none selected has none; `<summary>` exposes expanded state (`aria-expanded` through the accessibility tree or `details.open`); toggle emits `{ id, expanded }`; NO `sk-tree-toggle` on first render, none on an `items` reset, none when a host writes the state back (loop test); library event does not escape; unavailable leaf has no link. Then `pnpm visual:update` in the pinned container, Read and describe the five PNGs; only `mission-shell-tree--*.png` may be added.

## Acceptance (all runnable)

1. `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io && pnpm hygiene` exits 0.
2. `pnpm test` exits 0 and lists `sk-shell-tree.test.ts`.
3. `pnpm manifest:check` exits 0.
4. `pnpm visual` exits 0 and `ls apps/storybook/tests/visual/__snapshots__/ | grep -c '^mission-shell-tree--'` prints `5`; `git status --short` shows nothing outside the owned paths.
5. `pnpm storybook:build-only` exits 0 and `node -e "const i=require('./apps/storybook/storybook-static/index.json');const n=Object.values(i.entries).filter(e=>e.type==='story'&&e.title==='Mission/Shell tree').length;if(n!==5)process.exit(1)"` exits 0.
6. Planted `style=` attribute is caught: `printf 'import { html } from "lit";\nexport const plant = html`<div style="color:red">x</div>`;\n' > packages/mission-ui/src/plant-style-attr.ts; pnpm lint; rc=$?; rm -f packages/mission-ui/src/plant-style-attr.ts; test "$rc" -ne 0` exits 0.
7. Planted I/O is caught: `printf 'export const plant = () => window.matchMedia("(min-width: 1px)");\n' > packages/mission-ui/src/plant-io.ts; pnpm lint:no-io; rc=$?; rm -f packages/mission-ui/src/plant-io.ts; test "$rc" -ne 0` exits 0.
8. `git status --short` is empty after the final commit.

## Design-review items (Risk 5) touched

Native `<details>` folders and hidden marker (G-05, sunset: library tree); summary colour inheritance outcome; non-flush bordered rows; long-name wrapping (G-14 only if a head primitive fails the long-name story). List in the hand-off.

## Definition of Done

All acceptance commands exit 0; 5 stories and baselines, each PNG Read and described; the dark-theme summary colour result is stated explicitly (pass, or stopped for operator); hand-off lists commits verified with `git cat-file -t`.

## Reviewer guidance

Check there is no toggle event on first render or reset, that a write-back host cannot loop, that `unavailable` leaves are not links, and that the fallback button was NOT introduced without operator approval.

## Branch Strategy

Planning branch and final merge target: `feat/app-shell`. Execution happens in the lane worktree allocated by `finalize-tasks` (see `lanes.json`); depends on: WP02. Serial chain: the lane is created from the parent lane's branch, so you start with the previous WP's commits present. Start with `spec-kitty agent action implement WP03 --agent claude --mission app-shell-01M3V82X` and enter the workspace it reports. Do not switch branches in the shared checkout.

## Hard rules (every WP in this mission)

- Do not spawn sub-agents or forks; do this WP yourself.
- If any command is DENIED, stop and report; never retry it another way.
- No absolute home paths or usernames in any committed file (use `<repo>` placeholders). Run `pnpm hygiene` before committing.
- Baselines are generated ONLY inside the pinned container (`pnpm visual:update`, which fails rather than skips when podman or docker cannot start it). You must Read every new PNG and describe it in your hand-off (what is drawn, which tier, anything wrong). Never hand-edit or copy a PNG.
- Source syntax must stay compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no `satisfies`, no 5.5+ features.
- No-I/O rules (research D-02): bare `matchMedia`, `.focus()`, `document.activeElement`, `showModal()`, `document.addEventListener` pass; `window.*` fails. Avoid identifiers named `parent`, `top`, `location`, `frames`, `opener`.
- Stylelint allow-list (research D-02): layout properties only, values `var(--sk-*)`, `0`, `auto`, `inherit`; units `%` and `fr` only; no `border`, `outline`, `transform`, `overflow-wrap`, `px`, `rem`. ESLint bans raw `<button>/<input>`, `class=`, `style=`. Visible text lives in slots.
- Manifest surface is frozen by WP01. Keep `pnpm manifest:check` green. Run `pnpm manifest:generate` and commit the result only if you changed JSDoc (`@fires`, `@slot`, `@csspart`, `@screen`) or public members; resolve any `custom-elements.json` conflict by regeneration, never by hand-merging.
- Visible text in slots never attributes (no names or labels in attributes that screen readers or visuals read as content other than the documented `label`/`heading` properties).
- Commit your work on the lane branch with a conventional message ending with the attribution line the harness gives you. Do not push. Do not run `git add -A` blindly; stage only owned files.
