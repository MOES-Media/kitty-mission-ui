---
work_package_id: WP02
title: sk-shell-nav-item pattern element
dependencies:
- WP01
requirement_refs:
- FR-004
- FR-006
- FR-011
- FR-012
- FR-014
- FR-017
- FR-018
- NFR-004
planning_base_branch: feat/app-shell
merge_target_branch: feat/app-shell
branch_strategy: Planning artifacts for this mission were generated on feat/app-shell. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/app-shell unless the human explicitly redirects the landing branch.
subtasks:
- T008
- T009
- T010
- T011
- T012
- T013
phase: Phase 2 - Pattern elements
history:
- timestamp: '2026-10-01T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-shell-nav-item/
create_intent:
- packages/mission-ui/src/elements/sk-shell-nav-item/fixtures.ts
- packages/mission-ui/src/elements/sk-shell-nav-item/sk-shell-nav-item.stories.ts
- packages/mission-ui/test/sk-shell-nav-item.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-shell-nav-item/**
- packages/mission-ui/test/sk-shell-nav-item.test.ts
- apps/storybook/tests/visual/__snapshots__/mission-shell-nav-item--*.png
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - sk-shell-nav-item pattern element

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole WP.

Do not spawn sub-agents or forks; do this WP yourself.

## Objective

Make `sk-shell-nav-item` real: a non-flush `sk-action-row` in route mode with an icon marker, current marking, `sk-navigate`, an icon-only `compact` mode and the WCAG 1.4.13 label bubble (R3). Ship its 6 stories, 6 baselines and its behaviour tests. Pattern element: no `@screen`.

## Context

Read `contracts/sk-shell-nav-item.md` (authoritative), `data-model.md` (`CurrentMark`, `ShellIcon`, `ShellNavItem`), `research.md` D-03 (R3 bubble mechanics, compact mode CSS), D-04 (current marking, non-flush row, G-13, events), D-05 (tests, `page.viewport` first), D-08 G-05/G-12/G-13; `spec.md` FR-004, FR-006, FR-012, FR-017, FR-018, NFR-004. The skeleton (properties, JSDoc, `emitNavigate`) already exists from WP01: do not change JSDoc or public members; if you must, regenerate the manifest.

## Subtasks

### T008 Render the row and current marks
Inside `sk-shell-nav-item` render a non-flush `sk-action-row` in route mode with `href`, the icon (`renderIcon(icon)`) in the row's `marker` slot, `label` in its `title` slot. `current='page'` or `'true'` sets the row's `selected` and `aria-current` to the same value; `''` sets neither. Use `delegatesFocus` (`static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true }`); verify by a test that `element.focus()` focuses the row's anchor, with the fallback (focus through the shadow chain) only if delegation fails, recorded in the hand-off. Styles: layout properties only (Stylelint allow-list).

### T009 `sk-navigate`
Unmodified primary click or Enter: `preventDefault()` on the library event/click, `emitNavigate()` with `{ id: itemId, href }`. Modified clicks (ctrl, meta, shift, alt, non-primary button) emit nothing and are left to the browser. Stop `sk-action-row-activate` at this element so it never leaves. Events `bubbles: true, composed: true`.

### T010 Compact mode and label bubble
`compact`: label hidden by layout-only CSS on the title slot (`position: absolute; width: 0; height: 0; overflow: hidden`) so it stays the accessible name. Bubble: a local `sk-pill-tag` with `aria-hidden="true"` placed as a second grid column of the host (`overflow: visible`, `z-index`) so it floats without moving anything, shown on hover and on focus within; Escape (a document `keydown` listener added only while the bubble is shown, removed when hidden AND in `disconnectedCallback`) hides it until the next hover or focus; the pointer can enter it; it stays while hover or focus remains on item or bubble. The bubble must not be clipped by its parent: the collapsed column (WP04) sets `overflow: visible`; document that requirement in a code comment for WP04 and assert it in a story with a 3.5rem wide container. Record gap G-12 (sunset: library `sk-tooltip`) in a header comment.

### T011 Fixtures and the 6 stories
`packages/mission-ui/src/elements/sk-shell-nav-item/fixtures.ts` (synthetic, no real data) and `packages/mission-ui/src/elements/sk-shell-nav-item/sk-shell-nav-item.stories.ts` with title `Mission/Shell nav item`, `parameters.layout = 'fullscreen'` not needed (pattern), exports in this order so ids are stable: `CurrentPage`, `CurrentTrue`, `NotCurrent`, `CompactWithBubble` (the compact item inside a 3.5rem wide container, bubble hidden at rest; the bubble itself is asserted in this WP's tests and baselined by the shell story `LabelBubbleVisible1024` in WP06; add no public member and no `play`), `LongLabel`, `SameLabelDifferentId`. Ids must be `mission-shell-nav-item--current-page` etc.

### T012 Tests (`packages/mission-ui/test/sk-shell-nav-item.test.ts`)
Vitest browser mode, `import { page } from 'vitest/browser'`, call `page.viewport` first, reset in `afterEach`. Assert: `sk-navigate` payload `{ id, href }` on click and on Enter; no event for ctrl/meta/shift click; `aria-current` is `page`, `true` or absent per `current`; compact keeps the accessible name (query the row's accessible name) while the label is visually hidden; bubble shows on hover and on focus, Escape hides it, pointer can enter it (hover the bubble, still shown), hides when both leave; Escape listener removed on disconnect (count `keydown` listeners via a spy on `document.addEventListener`/`removeEventListener`); `sk-action-row-activate` does not escape; two items with the same label and different ids emit different ids.

### T013 Baselines
`pnpm visual:update` (pinned container). Read each of the six new PNGs and describe it. `git status --short` must show ONLY `mission-shell-nav-item--*.png` added; any other baseline changing is a bug to investigate, not to commit.

## Acceptance (all runnable)

1. `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io && pnpm hygiene` exits 0.
2. `pnpm test` exits 0 and its output lists `sk-shell-nav-item.test.ts`.
3. `pnpm manifest:check` exits 0 (and, if you regenerated, `git diff --stat packages/mission-ui/custom-elements.json` is explained in the hand-off).
4. `pnpm visual` exits 0, and `ls apps/storybook/tests/visual/__snapshots__/ | grep -c '^mission-shell-nav-item--'` prints `6`.
5. `pnpm storybook:build-only` exits 0 and `node -e "const i=require('./apps/storybook/storybook-static/index.json');const n=Object.values(i.entries).filter(e=>e.type==='story'&&e.title==='Mission/Shell nav item').length;if(n!==6)process.exit(1)"` exits 0.
6. Planted style violation is caught: `printf 'import { css } from "lit";\nexport const plant = css`:host { border: 1px solid red; }`;\n' > packages/mission-ui/src/plant-style.ts; pnpm lint:styles; rc=$?; rm -f packages/mission-ui/src/plant-style.ts; test "$rc" -ne 0` exits 0.
7. Planted raw button is caught: `printf 'import { html } from "lit";\nexport const plant = html`<button>x</button>`;\n' > packages/mission-ui/src/plant-button.ts; pnpm lint; rc=$?; rm -f packages/mission-ui/src/plant-button.ts; test "$rc" -ne 0` exits 0.
8. `git status --short` is empty after the final commit (no leftover plant file).

## Design-review items (Risk 5) touched

Non-flush bordered rows in a 3.5rem column (G-13 included: the yellow current edge is not reproducible, library selected look is used); label bubble built locally (G-12); local icons (G-08); delegatesFocus fallback if used. List them in the hand-off for the final PR.

## Definition of Done

All acceptance commands exit 0; 6 stories and 6 baselines exist and each PNG was Read and described; no JSDoc or member change (or a regenerated manifest that is explained); hand-off lists commit hashes verified with `git cat-file -t`.

## Reviewer guidance

Check bubble clipping in the 3.5rem story, Escape listener cleanup, that compact keeps the accessible name, that modified clicks emit nothing, and that the stories' ids match the contract.

## Branch Strategy

Planning branch and final merge target: `feat/app-shell`. Execution happens in the lane worktree allocated by `finalize-tasks` (see `lanes.json`); depends on: WP01. Serial chain: the lane is created from the parent lane's branch, so you start with the previous WP's commits present. Start with `spec-kitty agent action implement WP02 --agent claude --mission app-shell-01M3V82X` and enter the workspace it reports. Do not switch branches in the shared checkout.

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
