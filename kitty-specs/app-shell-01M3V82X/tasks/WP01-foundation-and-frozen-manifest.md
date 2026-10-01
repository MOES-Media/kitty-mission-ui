---
work_package_id: WP01
title: Foundation and frozen manifest
dependencies: []
requirement_refs:
- FR-011
- FR-013
- NFR-001
- NFR-002
- C-004
planning_base_branch: feat/app-shell
merge_target_branch: feat/app-shell
branch_strategy: Planning artifacts for this mission were generated on feat/app-shell. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/app-shell unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-app-shell-01M3V82X
base_commit: 8d685bd326443dcd487b79185db2a4141e2385c3
created_at: '2026-10-01T08:48:11.839755+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
phase: Phase 1 - Foundation
history:
- timestamp: '2026-10-01T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/
create_intent:
- packages/mission-ui/src/shell-types.ts
- packages/mission-ui/src/shell-icons.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/shell-types.ts
- packages/mission-ui/src/shell-icons.ts
- packages/mission-ui/src/index.ts
- packages/mission-ui/custom-elements.json
- apps/storybook/tests/visual/stories.visual.spec.ts
- apps/storybook/.storybook/preview-head.html
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP01 - Foundation and frozen manifest

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

Do not spawn sub-agents or forks; do this WP yourself.

## Objective

Land everything later WPs build on: the shell types, the local icon set, three skeleton element classes that already carry the FULL public surface (so the manifest is frozen), their registrations, the visual-spec extension (`vw-<n>`, `tab-<n>`, mandatory tier assertion), the preview-head rule and the regenerated manifest. No behaviour yet; no stories; no baselines.

## Context

Read `plan.md` (IC-01, Architecture, Complexity Tracking), `data-model.md` (all types and events), `contracts/` (all three: properties, slots, events), `research.md` D-01, D-02, D-04 (icons, typed events), D-05 (visual spec), D-06 (manifest freeze), `spec.md` FR-011, FR-013, NFR-001, NFR-002, C-004. Look at `packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts` for the house style (JSDoc, `@screen`, status, event typing) and `scripts/check-manifest.mjs`, `scripts/manifest-screen.mjs` for what the manifest gate enforces.

## Ownership note (seed files)

Your `owned_files` list excludes the three element directories because later WPs own them: WP02 owns `packages/mission-ui/src/elements/sk-shell-nav-item/`, WP03 owns `packages/mission-ui/src/elements/sk-shell-tree/`, WP04 owns `packages/mission-ui/src/elements/sk-mission-shell/` (WP05 adds `shell-overlays.ts` there). You CREATE the skeleton files below as a one-time seed so the manifest can freeze; this is the recorded out-of-map exception. Create only: `packages/mission-ui/src/elements/sk-shell-nav-item/sk-shell-nav-item.ts`, `packages/mission-ui/src/elements/sk-shell-tree/sk-shell-tree.ts`, `packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts`, `packages/mission-ui/src/elements/sk-mission-shell/shell-parts.ts`. No fixtures, stories or tests.

## Subtasks

### T001 Types (`packages/mission-ui/src/shell-types.ts`)
Create every type in `data-model.md` exactly: `ShellLayout`, `ShellTier`, `ShellIcon`, `ShellNavItem`, `CurrentMark`, `ShellTag`, `ShellProject`, `ShellMission`, `TreeNode`, `ShellStatus` (= `ViewState` from `view-state.ts`), `DrawerReason`, `FlyoutReason`, plus event-detail interfaces `ShellNavigateDetail { id; href }`, `TreeToggleDetail { id; expanded }`, `ToggleDrawerDetail { open; reason }`, `ToggleFlyoutDetail { open; reason }`. Types only, no runtime code.

### T002 Icons (`packages/mission-ui/src/shell-icons.ts`)
Local inline SVG Lit templates, one per `ShellIcon` member (12), exported through `renderIcon(name: ShellIcon)`. Rules (research D-04): `viewBox` set, `stroke="currentColor"`, `fill="none"`, `stroke-width`, NO `width`/`height` attributes, decorative (`aria-hidden="true"`, `focusable="false"`). Draw from simple geometric paths (the prototype is outside the repo; do not copy absolute paths). Record in a header comment: gap G-08, sunset when the design library ships `sk-icon`.

### T003 Skeleton `sk-shell-nav-item` and `sk-shell-tree`
Implement the properties, attributes, defaults and JSDoc of `contracts/sk-shell-nav-item.md` and `contracts/sk-shell-tree.md` as Lit classes extending `LitElement`: `@property` decorators (house style, no `accessor`), `@fires sk-navigate` / `@fires sk-tree-toggle` JSDoc with detail types, `@slot` none, `@csspart` none unless the contract names one, and one literal `this.dispatchEvent(new CustomEvent('sk-navigate', { bubbles: true, composed: true, detail }))` inside a private method (`emitNavigate()`; `emitToggle()` for the tree) so the analyzer sees the event. `render()` returns a minimal placeholder (`html\`<slot></slot>\``). Add `declare global { interface HTMLElementEventMap { 'sk-navigate': CustomEvent<ShellNavigateDetail>; ... } }` and `HTMLElementTagNameMap` entries. Both are pattern elements: no `@screen`.

### T004 Skeleton `sk-mission-shell`
In `packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts`: class JSDoc with `@screen`, `@fires` for all five events (`sk-navigate`, `sk-tree-toggle`, `sk-toggle-drawer`, `sk-toggle-flyout`, `sk-shell-retry`), `@slot` for `default`, `brand`, `top-bar-actions`, `skip-link`, `sidebar-section`, and every property in `contracts/sk-mission-shell.md` with its attribute and default (`status` default `'loading'`, reflected; `tier` reflected, `attribute: 'tier'`, computed). Required plan decisions encoded now so they cannot drift:
- Tier source behind ONE private function `private readTier(): ShellTier` using bare `matchMedia('(min-width: 1100px)')` and `matchMedia('(min-width: 620px)')` (constants in TypeScript). Implement it for real (it is 6 lines) and assign `tier` in `connectedCallback` and re-assert it in `willUpdate` so a host-set stale `tier` is overwritten. Nothing else in the codebase may call `matchMedia`.
- Literal dispatch calls for all five events inside private stub methods (`emitNavigate`, `emitTreeToggle`, `emitToggleDrawer` and `emitToggleFlyout` with `cancelable: true`, `emitRetry`), each `bubbles: true, composed: true`.
- Two private placeholder methods WP05 will fill: `renderDrawerRegion()` and `renderFlyoutRegion()`, both returning `nothing` for now (WP05 makes the one permitted seam edit in this file).
- `render()` returns a placeholder wrapping `<slot></slot>`. `shell-parts.ts` exports an empty set of render-fragment function stubs (`renderTopBar`, `renderRail`, `renderSidebar`, `renderStatus`) that WP04 fills. Add the `HTMLElementEventMap`/`HTMLElementTagNameMap` typing for the five events.

### T005 Registration and exports (`packages/mission-ui/src/index.ts`)
Extend the guarded registration (`if (!customElements.get(...)) customElements.define(...)`) for `sk-mission-shell`, `sk-shell-nav-item`, `sk-shell-tree`; export the three classes and `export type` every type and event detail from `shell-types.ts`. This is the ONLY place elements are registered (no self-registration in element modules). You are the only WP that edits `index.ts`.

### T006 Visual spec extension and preview rule
`apps/storybook/tests/visual/stories.visual.spec.ts` (you are its only owner): read story tags from `index.json` entries (`entry.tags`). For a tag `vw-<n>` call `page.setViewportSize({ width: n, height: 800 })` BEFORE `page.goto`; for EVERY `vw-*` story assert, after the element is upgraded, that the story element's reflected `tier` attribute equals the expected tier for that width (n >= 1100 expanded, 620..1099 collapsed, below 620 mobile) with a message that names the story (the assertion is mandatory, never conditional on the story declaring it). For a tag `tab-<n>` press `Tab` n times after load and before the screenshot. Stories with neither tag behave exactly as today. Keep the existing anti-vacuity checks and the 1:1 baseline parity test; keep `MIN_STORIES_PER_COMPONENT = 4`.
`apps/storybook/.storybook/preview-head.html`: add exactly `sk-mission-shell { display: block; height: 800px; }` inside the existing `<style>`. Touch nothing else.

### T007 Regenerate manifest and prove the freeze
`pnpm manifest:generate`, commit `packages/mission-ui/custom-elements.json`. It must list all three tags, the five events, five slots, `@screen` on the shell with `status`. Then run every gate (acceptance below).

## Acceptance (all runnable)

1. `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io && pnpm hygiene` exits 0.
2. `pnpm manifest:generate && pnpm manifest:check && git diff --exit-code packages/mission-ui/custom-elements.json` exits 0 (committed manifest equals regenerated manifest).
3. `grep -c 'sk-mission-shell\|sk-shell-nav-item\|sk-shell-tree' packages/mission-ui/custom-elements.json` is at least 3, and `node -e "const m=require('./packages/mission-ui/custom-elements.json');const t=JSON.stringify(m);for(const e of ['sk-navigate','sk-tree-toggle','sk-toggle-drawer','sk-toggle-flyout','sk-shell-retry'])if(!t.includes(e))process.exit(1)"` exits 0.
4. `grep -rn 'matchMedia' packages/mission-ui/src | grep -v 'sk-mission-shell.ts' | wc -l` prints `0`, and `grep -c 'readTier' packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts` prints at least 3 (definition, connect, willUpdate).
5. `pnpm test` exits 0 (existing sample test still passes; no new tests required).
6. Tagless-story no-op proof: run `pnpm visual` before your spec change is staged (stash nothing; run it on the commit before) and again after; both exit 0 with the four `mission-sample--*` baselines unmodified: `git status --short apps/storybook/tests/visual/__snapshots__` prints nothing.
7. The `visual` plant still fails: `pnpm gate-proof` exits 0.
8. Manifest-freeze plant (run AFTER committing T001-T007): `sed -i 's/@slot brand/@slot brandx/' packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts; pnpm manifest:check; rc=$?; git checkout -- packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.ts; test "$rc" -ne 0` exits 0 (an unregenerated JSDoc change is caught). If the slot JSDoc is worded differently, adapt the sed to a literal line that exists and say so in the hand-off.
9. `git status --short` is empty after the final commit.

## Design-review items (Risk 5) touched

- Local inline icons, no library icon set (G-08, C-001): flag in the hand-off for the final PR list.
- Local grid/top-bar/rail/drawer/flyout stand-ins (G-01 to G-15): none rendered yet; you only create the skeleton that carries them.

## Definition of Done

All acceptance commands exit 0; `index.ts`, `custom-elements.json`, the visual spec and `preview-head.html` are changed by this WP and by no later WP except where WP06 regenerates the manifest; the hand-off lists the commit hashes (verify each with `git cat-file -t <hash>`), the exact frozen surface (properties, events, slots) and the design-review items above.

## Reviewer guidance

Check the skeleton JSDoc against the three contracts line by line (names, attributes, defaults, cancelable events), that `readTier()` is the only `matchMedia` user, that the visual-spec tier assertion cannot be skipped (try a `vw-` story whose element lacks `tier`: the spec must fail), and that tagless stories behave identically.

## Branch Strategy

Planning branch and final merge target: `feat/app-shell`. Execution happens in the lane worktree allocated by `finalize-tasks` (see `lanes.json`); depends on: none. Serial chain: the lane is created from the parent lane's branch, so you start with the previous WP's commits present. Start with `spec-kitty agent action implement WP01 --agent claude --mission app-shell-01M3V82X` and enter the workspace it reports. Do not switch branches in the shared checkout.

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
