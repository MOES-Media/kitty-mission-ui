---
work_package_id: WP05
title: Shell drawer and flyout
dependencies:
- WP04
requirement_refs:
- FR-007
- FR-011
- FR-014
- FR-016
- NFR-004
- C-002
planning_base_branch: feat/app-shell
merge_target_branch: feat/app-shell
branch_strategy: Planning artifacts for this mission were generated on feat/app-shell. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/app-shell unless the human explicitly redirects the landing branch.
subtasks:
- T026
- T027
- T028
- T029
- T030
phase: Phase 3 - Shell
history:
- timestamp: '2026-10-01T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts
create_intent:
- packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts
- packages/mission-ui/test/sk-mission-shell-overlays.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts
- packages/mission-ui/test/sk-mission-shell-overlays.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP05 - Shell drawer and flyout

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole WP.

Do not spawn sub-agents or forks; do this WP yourself.

## Objective

Add the mobile overlay drawer (native `<dialog>`) and the collapsed-tier flyout with their cancelable events, forced-false rules, focus handling and tests. No stories and no baselines (WP06).

## Context

Read `contracts/sk-mission-shell.md` (Behaviour: flyout, tiers, landmarks), `data-model.md` (state diagrams, `DrawerReason`, `FlyoutReason`), `research.md` D-03 (the full R1 flyout and R2 drawer mechanics, close paths, G-11), D-05 (overlay tests), D-08 G-04/G-11; `spec.md` FR-007, FR-011, FR-014, FR-016, NFR-004, C-002.

## Ownership note (the one permitted seam edit)

You own `packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts` (new) and the overlay test. The overlay logic lives there as render functions plus a small controller. WP04 left in `packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts` two placeholders (`renderDrawerRegion()`, `renderFlyoutRegion()`), the hamburger stub `requestDrawer('hamburger')` and the hook `onTierChanged`. You make a minimal, recorded out-of-map edit in that file ONLY to call into `shell-overlays.ts` from those four places; record the one-line rationale in the commit message. Do not touch JSDoc or members (frozen); regenerate the manifest only if unavoidable.

## Subtasks

### T026 Drawer dialog
Native `<dialog>` opened with `showModal()` (bare, no-I/O safe) placed at the inline-start edge: `inset`, `margin: 0`, `padding: 0`, `width: var(--sk-layout-context-sidebar-width)`, `height: 100%`, `max-height: 100%` (the UA modal style caps it). An inner wrapper fills the dialog (dialog itself has no padding). Inside: a close `sk-button` (icon, first focusable), a local `<nav aria-label="Global navigation">` horizontal rail strip (mission layout), and an `sk-context-sidebar` filling the dialog through `::part(sidebar)` with `height: 100%` (so the UA Canvas background never shows) holding head, navigation and the slotted `sidebar-section` content. The dialog is the only role (labelled); no `nav` inside another landmark and no `aside` inside a region. The UA modal border WILL show: record it as G-11 and a design-review item; do not escalate (the operator reviews it at PR time).

### T027 Drawer behaviour and events
`sk-toggle-drawer { open, reason }` is cancelable and dispatched BEFORE applying; apply only if not prevented. Hamburger requests open (`'hamburger'`). Close paths: close button (`'close'`), Escape via the dialog `cancel` event (`'escape'`, `preventDefault()` the native close and route it through the same cancelable request), backdrop click detected as a click whose target is the dialog but not the inner wrapper (`'backdrop'`), a navigation (`'navigate'`, then focus the content focus target) and leaving the mobile tier (`'resize'`, from `onTierChanged`). Close, Escape and backdrop return focus to the hamburger. `drawerOpen` is forced `false` outside mobile in `willUpdate`; a host-set change inside mobile opens/closes the dialog (`'host'`) and moves focus the same way; `drawerOpen` is synced from the dialog `close` event so a native close cannot leave it stale. Library events (`sk-action-row-activate`) never cross the shell.

### T028 Flyout
In the collapsed tier, when `sidebar-section` content exists, activating the icon of the CURRENT destination opens the flyout: the default is cancelled and ONLY `sk-toggle-flyout { open: true, reason: 'activate' }` is dispatched (NO `sk-navigate`). The flyout is a grid item placed in the content column (`grid-column`, `grid-row`, `justify-self: start`, `width: var(--sk-layout-context-sidebar-width)`, `z-index`) wrapped in an `sk-context-sidebar` for the library surface, showing the section head plus the slotted tree (rendered only while open, so never duplicated). It never moves the content. Closing (each via the cancelable `sk-toggle-flyout`): choosing an item (after `sk-navigate`, reason `'navigate'`, focus to the content target), Escape (`'escape'`), a `pointerdown` outside the flyout and its icon (document listener added on open, removed on close AND on disconnect; use `event.composedPath()`), `focusout` leaving both the flyout and its icon (`'outside'`; Tab-out closes it, WCAG 2.4.11), leaving the collapsed tier (`'tier'`). Focus goes to the first focusable inside on open and back to the icon on close. `flyoutOpen` is semi-controlled, forced `false` outside collapsed. Other icons, and the current icon when no section content exists, navigate normally. The label bubble's Escape (WP02) must close the bubble before the flyout: arrange listener order so one Escape closes only the bubble first.

### T029 Tests (`packages/mission-ui/test/sk-mission-shell-overlays.test.ts`)
`page.viewport` first, reset in `afterEach`. Drawer: opens from hamburger with focus inside; Escape, close button, backdrop, navigation and resize-out each close it with the right `reason` and the right focus target; a prevented `sk-toggle-drawer` leaves it unchanged; host-set `drawerOpen` outside mobile is ignored; native `close` syncs `drawerOpen`; the dialog is labelled and the page behind is inert; no layout shift of the content (top edge and left edge of `main` unchanged while open). Flyout: icon opens it with no `sk-navigate` event (assert zero), content position unchanged, focus into then back to the icon; Escape, outside pointerdown via `composedPath()`, Tab-out, choosing an item, tier-leave each close it with the right reason; prevented `sk-toggle-flyout` leaves it open/closed unchanged; Escape with the bubble visible closes only the bubble; flyout listeners removed on disconnect (spy on `document.addEventListener`/`removeEventListener`); library events do not escape; with no `sidebar-section` content the icon navigates normally.

### T030 Visual check without baselines
There are no shell stories yet and adding a temporary one is forbidden. Write a Vitest browser test that renders the drawer open at 390 and the flyout open at 1024 in the dark theme and writes screenshots to the scratchpad directory (not committed, delete the test code before committing or keep it as an assertion-only test), then Read those images. Report in the hand-off whether the drawer shows a light UA panel or a visible UA border (expected: border visible, panel dark). If a light panel shows, STOP and report to the operator (narrow Stylelint allowance or library `sk-drawer`); do not work around it.

## Acceptance (all runnable)

1. `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io && pnpm hygiene` exits 0.
2. `pnpm test` exits 0 and lists `sk-mission-shell-overlays.test.ts` and `sk-mission-shell.test.ts` (WP04 tests still green).
3. `pnpm manifest:check` exits 0.
4. `grep -rn 'matchMedia' packages/mission-ui/src | grep -v 'sk-mission-shell.ts' | wc -l` prints `0` and `grep -rn 'window\.' packages/mission-ui/src/elements/sk-mission-shell | wc -l` prints `0`.
5. `git diff --stat HEAD~1 HEAD -- packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts` shows only the four seam call sites (state the count of changed lines in the hand-off).
6. `git status --short apps/storybook/tests/visual/__snapshots__` prints nothing and `ls packages/mission-ui/src/elements/sk-mission-shell/ | grep -c stories` prints `0`.
7. Planted raw button in the overlay file is caught: `printf '\nexport const plant = html`<button>x</button>`;\n' >> packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts; pnpm lint; rc=$?; git checkout -- packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts; test "$rc" -ne 0` exits 0 (run after committing).
8. Planted `window.*` is caught: `printf '\nexport const plant2 = () => window.innerWidth;\n' >> packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts; pnpm lint:no-io; rc=$?; git checkout -- packages/mission-ui/src/elements/sk-mission-shell/shell-overlays.ts; test "$rc" -ne 0` exits 0.
9. `git status --short` is empty after the final commit.

## Design-review items (Risk 5) touched

UA modal border shows on the drawer dialog (G-11, operator design-review item); overlay drawer chrome (G-04, G-11); flyout (R1) and icon column without a tree; native dialog stand-in for `sk-drawer`/`sk-flyout`. List them in the hand-off.

## Definition of Done

All acceptance commands exit 0; the T030 visual finding is stated; the seam edit is minimal and justified; hand-off lists commit hashes verified with `git cat-file -t`.

## Reviewer guidance

Check cancelable events apply nothing when prevented, no `sk-navigate` when the current icon opens the flyout, listener cleanup on disconnect, focus return targets, that the content never moves, and that nothing beyond the four seams changed in `sk-mission-shell.ts`.

## Branch Strategy

Planning branch and final merge target: `feat/app-shell`. Execution happens in the lane worktree allocated by `finalize-tasks` (see `lanes.json`); depends on: WP04. Serial chain: the lane is created from the parent lane's branch, so you start with the previous WP's commits present. Start with `spec-kitty agent action implement WP05 --agent claude --mission app-shell-01M3V82X` and enter the workspace it reports. Do not switch branches in the shared checkout.

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
