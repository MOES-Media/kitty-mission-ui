---
work_package_id: WP04
title: Shell frame, tiers and status
dependencies:
- WP03
requirement_refs:
- FR-001
- FR-002
- FR-004
- FR-005
- FR-006
- FR-008
- FR-009
- FR-010
- FR-012
- FR-014
- FR-018
- FR-019
- NFR-003
- NFR-004
- NFR-005
- C-001
- C-002
- C-003
- C-005
planning_base_branch: feat/app-shell
merge_target_branch: feat/app-shell
branch_strategy: Planning artifacts for this mission were generated on feat/app-shell. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/app-shell unless the human explicitly redirects the landing branch.
subtasks:
- T019
- T020
- T021
- T022
- T023
- T024
- T025
phase: Phase 3 - Shell
history:
- timestamp: '2026-10-01T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/elements/sk-mission-shell/
create_intent:
- packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts
- packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts
- packages/mission-ui/src/elements/sk-mission-shell/fixtures.ts
- packages/mission-ui/test/sk-mission-shell.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts
- packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts
- packages/mission-ui/src/elements/sk-mission-shell/fixtures.ts
- packages/mission-ui/test/sk-mission-shell.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP04 - Shell frame, tiers and status

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole WP.

Do not spawn sub-agents or forks; do this WP yourself.

## Objective

Implement the shell frame: grid, top bar, local rail, sidebar heads, footer, icon column, status region, content focus target, skip link, `readTier()` driven tiers, current marks and per-tier landmarks, with fixtures for every later story and the frame/tier/status tests. No drawer and no flyout (WP05). NO stories (WP06) and no baselines.

## Context

Read `contracts/sk-mission-shell.md` (authoritative), `data-model.md`, `research.md` D-02 (tier mechanism, Stylelint allow-list: build layout from grid placement), D-03 (collapsed icon column, `sk-context-sidebar` `::part(sidebar)` padding, G-15), D-04 (focus target, skip link, status in NORMAL FLOW, current marking, landmarks), D-05 (tests list; fixtures matrix), D-08; `spec.md` FR-001 to FR-006, FR-008 to FR-010, FR-012, FR-018, FR-019, NFR-003 to NFR-005, C-001 to C-005. The skeleton from WP01 has the surface, `readTier()` and the placeholders `renderDrawerRegion()` / `renderFlyoutRegion()`: leave those two returning `nothing` (WP05 fills them). Do not change JSDoc or members; if you must, regenerate the manifest (WP01 froze it).

## Subtasks

### T019 Grid, top bar, rail
One structure in every tier: top bar then a body grid (rail, sidebar or icon column, content cell). Top bar is a `<header>` (banner) with `brand` slot (fallback "kitty desktop"), `top-bar-actions` slot, and in the mobile tier the hamburger `sk-button size="icon" variant="ghost"` labelled "Open navigation" (its click will request the drawer in WP05: wire it to a private `requestDrawer('hamburger')` stub that WP05 completes; no dialog yet). Top bar height 48 px equivalent via tokens only (no 52 px token exists: Risk 5). Rail: local `<nav aria-label="Global navigation">` column of `sk-shell-nav-item` (mission layout only, expanded and collapsed tiers) from `railItems`, `pinned` items in a bottom group, width `var(--sk-layout-personal-rail-width)`.

### T020 Sidebar (expanded) and icon column (collapsed)
Expanded (`>= 1100`): `sk-context-sidebar` with an `aria-label`: header = project or mission head (`sk-section-header`, name wrapping, tags as `sk-pill-tag`, eyebrow, back link `sk-button` for `mission.backItem`), default = one `<nav>` of `sk-shell-nav-item` for `navItems` followed by `<slot name="sidebar-section">`, footer = `footerItem` (project layout) and mission id/progress text (G-09: text only, no bar). Padding through `::part(sidebar)`. Collapsed (`620..1099`): a LOCAL icon column `<nav>` of `compact` `sk-shell-nav-item` (NOT `sk-context-sidebar`, G-15), width `var(--sk-layout-personal-rail-width)`, `overflow: visible` so bubbles are never clipped; no complementary landmark; sidebar sections not rendered here (the flyout shows them in WP05). Mobile: neither (drawer, WP05).

### T021 Current marking
`current` marks the sidebar item, `railCurrent` the rail item. Only the deepest marked item carries `aria-current="page"`: when a slotted `sk-shell-tree` has a selected leaf (detect via its `current` property or a `slotchange` read, no I/O), the sidebar item and the rail item get `'true'` and the leaf keeps `'page'`; otherwise the sidebar item is `'page'` and the rail item `'true'`. At most one `"page"` in the shell (test it).

### T022 Status region, content focus target, skip link
Status renders in NORMAL FLOW at the top of the content column, above `main`, in every tier: `loading` -> `sk-status-indicator pulsing`, `error` -> `sk-notice tone="danger"` with a Retry `sk-button` in `actions` that emits `sk-shell-retry`, `empty` -> `sk-notice tone="info"`, `ready` -> nothing. `aria-busy="true"` on that region only, never on `main`. The frame is otherwise identical in every status. Content cell: `<main id="content">` wrapping `<div tabindex="-1">` wrapping the default slot (exactly one `main`; screens render none). Skip link: first tab stop, `sk-button variant="primary" href="#content"`, text from the `skip-link` slot (fallback "Skip to content"), hidden until focused with layout-only CSS (`position: absolute; width: 0; height: 0; overflow: hidden`, restored on `:focus-within`); click handler `preventDefault()` then `.focus()` on the focus target div (fragment links cannot cross shadow roots, G-10). Stop `sk-action-row-activate` at the shell boundary; re-emit navigation from the nav items (`sk-navigate`) and tree events as-is.

### T023 Tier handling and no-shift
`change` listeners of both `MediaQueryList`s update `tier` via `readTier()`, then call `requestUpdate()`; add/remove them in `connected/disconnectedCallback`; `tier` stays output only (re-asserted in `willUpdate`). Define the hooks WP05 needs and nothing more: a private `onTierChanged(previous, next)` (empty body besides a comment) called before `requestUpdate()`. Content top edge must not move when the tier changes within one status (NFR-003): keep the top bar and status heights tier-independent. Landmarks per tier exactly as in the contract: expanded one banner, one `nav` "Global navigation" (mission), one complementary, one main; collapsed banner, "Global navigation" (mission), the icon column `nav`, no complementary, one main; mobile banner and main.

### T024 Fixtures for every state (`packages/mission-ui/src/elements/sk-mission-shell/fixtures.ts`)
Synthetic fixtures for the whole state matrix (research D-05) so WP06 writes stories without touching this file: project and mission `railItems`/`navItems`/`footerItem`/`project`/`mission`, a WP tree and an artifacts tree (`TreeNode[]`), a long-name set (long unbroken project, mission and tree names), a long tree (drawer scroll story), and per-export argument helpers for statuses. No real data, no absolute paths.

### T025 Tests (`packages/mission-ui/test/sk-mission-shell.test.ts`)
`page.viewport(w, h)` FIRST in each test (the default iframe is 414x896, mobile), reset in `afterEach`. Assert: tier at 619, 620, 1099, 1100 and 680; a host-set `tier` is overwritten; exactly one `main` and the per-tier landmark sets; one Tab-walk per tier counting stops equals items shown plus skip link and hamburger (SC-003/NFR-004), skip link is the first stop and focuses the content target; each status renders the right element in normal flow, `aria-busy` only on the region, retry emits `sk-shell-retry`; the `main` top edge is equal across tiers within the same status (NFR-003); at root font-size 200% the shell keeps its tier at 1100 and 620 and the content area has no horizontal overflow (NFR-005); current marking cases incl. a single `"page"`; `sk-navigate` and `sk-tree-toggle` pass through with payloads; `sk-action-row-activate` does not escape; project layout has no rail; unknown `layout` falls back to `project`.

## Acceptance (all runnable)

1. `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io && pnpm hygiene` exits 0.
2. `pnpm test` exits 0 and lists `sk-mission-shell.test.ts`.
3. `pnpm manifest:check` exits 0 (frozen surface kept).
4. `grep -rn 'matchMedia' packages/mission-ui/src | grep -v 'sk-mission-shell.ts' | wc -l` prints `0`; `ls packages/mission-ui/src/elements/sk-mission-shell/ | grep -c 'stories'` prints `0` (no shell stories yet).
5. `pnpm storybook:build-only` exits 0 (nothing new to baseline; `git status --short apps/storybook/tests/visual/__snapshots__` prints nothing).
6. Planted I/O is caught: `printf '\nexport const plant = () => window.innerWidth;\n' >> packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts; pnpm lint:no-io; rc=$?; git checkout -- packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts; test "$rc" -ne 0` exits 0 (run after committing).
7. Planted px media query is caught: `printf 'import { css } from "lit";\nexport const plant = css`@media (min-width: 1100px) { :host { display: block; } }`;\n' > packages/mission-ui/src/plant-media.ts; pnpm lint:styles; rc=$?; rm -f packages/mission-ui/src/plant-media.ts; test "$rc" -ne 0` exits 0.
8. `git status --short` is empty after the final commit.

## Design-review items (Risk 5) touched

48 px top bar (no 52 px token); no progress bar (G-09); edge-less local top bar and rail (no border or surface can be written locally); icon column without a tree (flyout is WP05); local icons (G-08); non-flush bordered rows in a 3.5rem column; yellow current edge (G-13); local grid, rail, icon column, skip link (G-01, G-02, G-03, G-07, G-10, G-15). List them in the hand-off.

## Definition of Done

All acceptance commands exit 0; fixtures cover every matrix state; the two WP05 placeholders and `onTierChanged` hook exist; hand-off lists commit hashes verified with `git cat-file -t`.

## Reviewer guidance

Check there is exactly one `main` per tier, status in normal flow (never an overlay), the skip link reaches the focus target, `readTier()` remains the only `matchMedia` user, no JSDoc/member drift, and that no story or baseline was added.

## Branch Strategy

Planning branch and final merge target: `feat/app-shell`. Execution happens in the lane worktree allocated by `finalize-tasks` (see `lanes.json`); depends on: WP03. Serial chain: the lane is created from the parent lane's branch, so you start with the previous WP's commits present. Start with `spec-kitty agent action implement WP04 --agent claude --mission app-shell-01M3V82X` and enter the workspace it reports. Do not switch branches in the shared checkout.

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
