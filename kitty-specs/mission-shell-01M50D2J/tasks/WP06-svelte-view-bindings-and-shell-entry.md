---
work_package_id: WP06
title: Svelte view, intent bindings and the ./shell entry
dependencies:
- WP05
- WP07
requirement_refs:
- FR-001
- FR-003
- FR-011
- FR-014
- FR-015
- FR-016
- FR-017
- NFR-001
- C-005
- SC-003
- SC-005
- FR-007
- FR-010
- NFR-007
- C-001
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement
  this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless
  the human explicitly redirects the landing branch.
subtasks:
- T027
- T028
- T029
- T030
- T031
- T032
- T033
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/
create_intent:
- packages/mission-shell/src/shell.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/src/ui/**
- packages/mission-shell/src/shell.ts
- packages/mission-shell/package.json
- packages/mission-shell/test/package.test.ts
- packages/mission-shell/test/shell/**
role: implementer
tags: []
tracker_refs: []
---

# WP06 — Svelte view, intent bindings and the ./shell entry

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Build the view layer: `MissionShell.svelte` with its single `<sk-mission-shell>` root, thin per-screen bindings, one
table-driven intent binding, the connection banners and the Refresh button, all rendered from the controller's
snapshot. Publish it as the additive `./shell` entry with `mountShell`, and prove it on real elements in Chromium,
including plant P-7.

## Context

- **Plan**: IC-06 ("Svelte view, bindings and the `./shell` entry"). It depends on IC-03, IC-04, IC-05 and IC-07, and
  IC-08a (stories, WP08) builds on it. IC-08b (WP09) may amend `src/ui/**` after CP-1, by grant (plan "Shared-file
  ownership").
- **Read first** (authoritative; cite, never re-derive): `plan.md` IC-06, "Shared-file ownership", "Plants" and
  the issue-acceptance table (R1-03); `contracts/shell-api.md` (the `./shell` block, "Host prerequisites",
  "Subscriptions"); `contracts/intent-map.md` (40 rows, "via", "Rules"); `contracts/connection-presentation.md`
  (banners, timing, Refresh, shell copy); `contracts/refresh-policy.md` (the mounted NFR-001 bullet); `research.md`
  R-01, R-02, R-03, R-07, R-09, R-10, R-11, R-18; `data-model.md` "Destination", "ConnectionPresentation",
  "SessionState", "ShellOptions"; `reviews/plan.squad.md` R1-03, R5-06, R5-07, R5-10, FS-03, FS-06; decisions
  `01M50K4K059HSWKGA56KV7KNJC` (entries) and `01M50K4NSNYD9TEQ12T4J7KVHT` (P-7 in `test/shell`).
- **What the dependencies deliver**:
  - WP01: `src/core/routes.ts` (`ShellMode`, `Destination`, `formatRoute`, `parseRoute`, `normaliseRoute`,
    `routeHref`), `src/core/displayed.ts`, and the `unit` project with `test/setup/browser.ts` (NFR-007).
  - WP02: `ShellScheduler` (`src/core/scheduler.ts`), the fake scheduler and the `test/support/*` clients.
  - WP03: `createShellController` (`snapshot()`, store-contract `subscribe`, `intent`, `setRoute`,
    `setClient(client, route?)`, `refresh()`, `destroy()`, the `afterRender` option) and `src/core/connection.ts`.
  - WP04: `ShellHost` (`src/core/host.ts`), picker and dialog state, the dashboard guard and null-client error,
    refocus and `routeChanged`.
  - WP05: `INTENT_TABLE` (`src/intents/table.ts`, `{ via: H }` for nested elements) and `MissionUiIntents`.
  - WP07: the shell I/O and markup lint block and the layering block; this WP's markup passes them from the start.
- **Key decisions**:
  - The view holds no behaviour: every decision is the controller's. `ui/` renders the snapshot and forwards intents.
  - Runes live in `ui/` only (R-01). `core/`, `controller/` and `intents/` never import Svelte (P-8); the copy
    protocol's flush reaches the controller as the injected `afterRender` (FS-03).
  - One home per part of the banner (FS-06): `ConnectionBanner.svelte` owns the tone and announce table only; the
    condition and the copy come from the snapshot (WP03's `connection.ts`).
- **Consumers**: WP08 (stories rely on the single root), WP09 (CP-1 amendments; re-proves P-7), #20 and #21 (SC-005).

## Ownership

**Owned files** (stage only these, plus the recorded out-of-map edit):

- `packages/mission-shell/src/ui/**`
- `packages/mission-shell/src/shell.ts`
- `packages/mission-shell/package.json`
- `packages/mission-shell/test/package.test.ts`
- `packages/mission-shell/test/shell/**`

**Out-of-map edits**:

- `gates/plants/unit-tests/plant.json` (owned by WP02) — append plant P-7 (operator ruling 01M50K4NSNYD9TEQ12T4J7KVHT);
  existing entries untouched.

Commit it with a plain `git add` of that path and list it in the final report with the rationale above. Any other
change you need in a file you do not own (a missing controller hook, a snapshot field, a support client) is a **change
request** in the final report (file, change, reason), not an edit.

**Do not touch**:

- `src/Shell.svelte` (kept unchanged: two gate self-tests name it, R5-06), `src/index.ts` (port-only, ruling
  `01M50K4K059HSWKGA56KV7KNJC`), `src/testing.ts`.
- The rest of the frozen surface (C-003, R-17): `src/client/**`, `src/contract/stream.ts`, `src/harness/**`,
  `contracts/fixtures/*`, `packages/mission-ui/**`, and the gate wiring (`ci.yml` structure, gate scripts, plant
  `ciCommand`s and `prepare`s).
- Other WPs' files: `src/core/**`, `src/controller/**`, `src/intents/**`, `src/generated/**`, `src/stories/**`,
  `eslint.config.mjs`, `vitest.config.ts`, `test/setup/**`, `test/support/**`, `test/logic/**`, the READMEs,
  `kitty-specs/**`.

## Subtasks

### Subtask T027: `MissionShell.svelte`, the runes mirror and the `SCREENS` table

**Purpose**: the one component a host mounts. It owns the controller's lifetime, mirrors the snapshot into runes, and
renders exactly one root element so stories and hosts get `sk-mission-shell` itself (R-07).

**Steps**:

1. At the top of `src/ui/MissionShell.svelte`'s `<script lang="ts">`, the **first** import is the side-effect
   registration `import '@moes-media/mission-ui';` (contracts/shell-api.md "Host prerequisites": the shell relies on
   mission-ui's registration of the `sk-*` elements and declares no `@spec-kitty/elements` dependency). Every other
   import follows it.
2. Props are exactly `ShellOptions` (`contracts/shell-api.md`): `client`, `host`, `mode` (required), `route`,
   `scheduler`, `clock`, `copy`, read with `$props()`. Re-use the `ShellOptions` type; do not redeclare it. If WP03 or
   WP04 has not exported a `ShellOptions` type from a non-Svelte module, raise a change request; declaring it in `ui/`
   is the fallback and must then be noted.
3. Create the controller once, in the script body, with
   `createShellController({ ...options, afterRender: () => tick() })`, where `tick` is imported from `svelte` (FS-03,
   R-18 "Copy protocol"). The view is the only place that supplies a real `afterRender`.
4. `src/ui/shell-state.svelte.ts`: a small runes mirror. It takes the controller, holds `let snapshot = $state(...)`
   initialised from `controller.snapshot()`, and subscribes with `controller.subscribe((s) => { snapshot = s; })`.
   It exposes a getter and a `release()` that calls the unsubscribe. No logic, no derived business values: anything
   the screens need beyond pass-through is a change request to WP03.
5. **Prop changes from a Svelte host**: a `$effect` that reacts to `route` calls `controller.setRoute(route)` when it
   differs from the last host-set route; a `$effect` that reacts to `client` calls `controller.setClient(client)` when
   the reference changes. Neither runs on the initial render (the controller already took both at creation). This is
   how `<MissionShell {client} {route} />` keeps working (quickstart "A Svelte host can use").
6. Expose `setRoute(route)`, `setClient(client, route?)` from the component (Svelte 5 `export function`) so `mount.ts`
   (T031) can reach them without a second controller.
7. On teardown (`onDestroy` or an `$effect` cleanup) call `release()` and then `controller.destroy()`, exactly once.
8. **The template has exactly ONE root element**, `<sk-mission-shell>`, with no sibling text, comment-producing block
   or `{#if}` at the top level (R-07: the story harness reads the first element's `tier`). Its properties come from
   the snapshot: `layout` (`project`, `mission` or `picker`), `current`, `railCurrent`, `navItems`, `railItems`,
   `footerItem`, `project`, `mission`, `status`, `errorMessage`, `drawerOpen`, `flyoutOpen`. Set object properties as
   properties, not attributes (Svelte sets a property when the custom element defines it; check with a test that
   `navItems` arrives as an array).
9. Inside the root, in order: the `top-bar-actions` slot content (`RefreshButton`, T030), the `sidebar-section` trees
   (T028), the banner (`ConnectionBanner`, T030), then the hosted screen from the table below.
10. **The `SCREENS` lookup table**, in the script, one entry per line, keyed by `Destination['screen']`:

    ```ts
    const SCREENS = {
      missions: MissionsScreen,
      drift: DriftScreen,
      ops: OpsScreen,
      pipeline: PipelineScreen,
      'work-packages': WorkPackageScreen,
      artifacts: ArtifactScreen,
      projects: ProjectsScreen,
    } as const;
    ```

    The line `drift: DriftScreen,` must occur **exactly once** (P-7's anchor, T033). Render the current screen as a
    dynamic component (`{@const Screen = SCREENS[screen]}` then `<Screen … />`), keyed so a screen change remounts it.
11. The dashboard never renders `projects` (WP01 parses `/projects` to Missions there); add no second guard in the
    view. The mounted test (T032) proves it.

**Files**: `packages/mission-shell/src/ui/MissionShell.svelte`, `packages/mission-shell/src/ui/shell-state.svelte.ts`.

**Validation**:

- svelte-check is clean; `grep -c 'drift: DriftScreen,'` on the file prints `1`.
- A mounted test asserts one child, `sk-mission-shell`, on every layout (T032); `pnpm lint` is clean.

### Subtask T028: Thin screen bindings (`src/ui/screens/*.svelte`)

**Purpose**: one small component per screen that turns the snapshot slice into the element's properties, and the
sidebar trees and navigation items with `href`s. No decisions here: the controller already mapped results (FR-005).

**Steps**:

1. One file per screen: `MissionsScreen.svelte`, `DriftScreen.svelte`, `OpsScreen.svelte`, `PipelineScreen.svelte`,
   `WorkPackageScreen.svelte`, `ArtifactScreen.svelte`, `ProjectsScreen.svelte` (which also renders
   `sk-open-project-dialog` with the WP04 dialog state, desktop picker only). Each renders exactly one hosting element
   (`sk-missions-screen`, `sk-drift-screen`, …) and applies `use:bindIntents` (T029) to it.
2. Props come from the snapshot unchanged: contract values pass through as they are (the view types are supertypes;
   data-model intro). Pass `status`, refusal and auxiliary fields exactly as WP03 named them (`loadingMore`,
   `loadMoreError`, `rescanning`, `detailStatus`, `detailRefusalCode`, `contentStatus`, `copyResult`, `now`, …).
3. **Tolerate a foreign slice**: a binding reads its slice with optional access and the element's own defaults, and
   never throws when handed a snapshot for another destination. P-7 mounts `OpsScreen` on the Drift destination; the
   run must fail on the assertion message, not on a crash in a binding (T033).
4. **No selection** (R-03): `work-packages` without `wpId` renders the Work Package screen with
   `status = 'nothing-selected'` and the WP tree in the sidebar; `artifacts` without `path` renders the Artifact screen
   with `status = 'nothing-selected'` and the listing. Take `nothing-selected` from the snapshot; do not decide it here.
5. **Navigation items and trees** (R-02 `href`, R-18 "Trees"): every nav item, rail item, footer item and tree row
   gets `href: routeHref(destination)` from `src/core/routes.ts` (`'#'` + the canonical route). The elements call
   `preventDefault()` and emit `sk-navigate`; the shell never navigates its window. Trees are `sk-shell-tree` elements
   in the `sidebar-section` slot of `sk-mission-shell`; tree folder expansion comes from the session (artifacts tree,
   per Mission).
6. **Data-driven** (the `data-driven` gate): the WP tree leaf `meta` is the contract lane word **passed through** from
   `MissionDetail.workPackages[]`; no lane, phase, status or artifact-kind literal appears in any `ui/` file. Labels
   and ids come from data or from shell copy.
7. Desktop picker: `ProjectsScreen.svelte` and the dialog are rendered only for the `projects` destination (desktop,
   including `client: null`). The "All projects" footer item and the Projects rail item exist only in `mode:
   'desktop'` (take them from the snapshot; the mounted dashboard test asserts their absence, T032).
8. Layout-only CSS, if any, uses `--sk-*` tokens (C-005); prefer none in screen bindings.

**Files**: `packages/mission-shell/src/ui/screens/*.svelte` (plus small helpers under `src/ui/` if needed).

**Validation**:

- `pnpm lint:data-driven` and `pnpm lint` are clean over `src/ui/**`.
- `pnpm lint:styles` is clean.
- Routing tests (T032) assert the mounted screen, the layout and the current item for every destination, and the
  no-selection status for the two R-03 destinations.

### Subtask T029: `bindIntents`, a table-driven Svelte action

**Purpose**: bind every intent of one hosting element from `INTENT_TABLE`, once, so FR-003 has one implementation and
the `via` intents (nested pattern elements) are handled exactly once (contracts/intent-map.md "via X").

**Steps**:

1. `src/ui/bind-intents.ts` exports a Svelte action `bindIntents(node, { tag, controller })`. Type `tag` as
   `HostedTag` (WP05) and look up `INTENT_TABLE[tag]`.
2. For each event key of that entry whose value is a **handler** (not `{ via: … }`), add one listener on `node`. The
   listener calls `controller.intent(tag, event, (e as CustomEvent).detail)`. Do not call the handler directly: the
   controller dispatches through the table (WP05) and owns the dashboard guard (WP04).
3. Entries whose value is `{ via: H }` are **never** bound: they belong to nested elements (`sk-shell-nav-item`,
   `sk-shell-tree`, `sk-filter-toggle-group`, `sk-work-package-board`), whose bubbling, composed events reach the
   hosting element `H` and its own handler entry.
4. The action is applied **only to hosting elements**: the nine of the intent map (`sk-mission-shell`, the seven
   screens, `sk-open-project-dialog`). Never apply it to a nested element or twice to one element.
5. **Exactly once across nesting**: screen events bubble to the shell root, but each node listens only for the events
   its own tag declares. No `stopPropagation()`. If two hosting tags on one path ever declare the same event, the
   innermost declaring host wins (`event.composedPath()`); none does at this base (check `INTENT_TABLE`, note it).
6. `update(newParams)` re-binds when `tag` or `controller` changes; `destroy()` removes every listener. The action
   touches only `node` (no I/O global; WP07 block).

**Files**: `packages/mission-shell/src/ui/bind-intents.ts`.

**Validation**:

- `pnpm typecheck`: the listener's detail is typed through `MissionUiIntents[T][E]` (no `any` escape).
- The 40-case sweep and the via exactly-once cases (T032) pass; removing the `via` skip makes the exactly-once cases
  fail (check once locally; do not commit).

### Subtask T030: `ConnectionBanner.svelte` and `RefreshButton.svelte`

**Purpose**: the presentation of FR-011 and the button of FR-016, built from library elements only (C-005), with the
one-line-per-condition table that P-6 anchors on (FS-06).

**Steps**:

1. `src/ui/ConnectionBanner.svelte` renders, for the snapshot's current condition (WP03's `connection.ts`), one
   `sk-notice` with `tone` and `announce` attributes and the condition's title and body from the snapshot copy. No
   condition means nothing rendered.
2. It owns **only** the tone and announce table, one line per condition, with the values of
   `contracts/connection-presentation.md`:

   ```ts
   const PRESENTATION = {
     connecting: { tone: 'info', announce: 'polite' },
     reconnecting: { tone: 'attention', announce: 'polite' },
     'service-missing': { tone: 'danger', announce: 'assertive' },
     'contract-mismatch': { tone: 'danger', announce: 'assertive' },
     'live-updates-off': { tone: 'neutral', announce: 'polite' },
   } as const;
   ```

   Use the condition keys WP03 exported (rename the keys above to match them, never the values). The reconnecting
   line is **exactly** `reconnecting: { tone: 'attention', announce: 'polite' },`, occurring once: it is the anchor of
   visual plant P-6 (WP08). Type the table against WP03's condition union so a missing condition is a type error.
3. No copy, no timing and no state mapping in this file (FS-06): the 1 s grace timer, the refused flag and the copy
   (with the `copy` overrides) are WP03's. If you need a field the snapshot lacks, raise a change request.
4. Placement (connection-presentation.md "Banners"): in the `sk-mission-shell` content slot, above the hosted screen.
   Shell CSS is layout only: a flex column with a gap from a `--sk-space-*` token. No colours, no fonts, no borders.
5. `src/ui/RefreshButton.svelte`: `<sk-button variant="ghost" size="sm">Refresh</sk-button>` in the
   `top-bar-actions` slot (`slot="top-bar-actions"`), rendered only when the snapshot says Refresh is shown (Artifact
   and Ops destinations; FR-016, R-11). Its accessible name, through the button's `label`, is "Refresh artifacts" on
   Artifact and "Refresh Ops" on Ops (connection-presentation.md "Refresh button"). Pressing it calls
   `controller.refresh()` once.
6. No raw controls or resource-loading elements in either file (WP07's `shell-markup:` rule).

**Files**: `packages/mission-shell/src/ui/ConnectionBanner.svelte`, `packages/mission-shell/src/ui/RefreshButton.svelte`.

**Validation**:

- `grep -c "reconnecting: { tone: 'attention', announce: 'polite' }," packages/mission-shell/src/ui/ConnectionBanner.svelte`
  prints `1`.
- `pnpm lint`, `pnpm lint:styles` and `pnpm test:terminology` are clean (the button labels are shell copy).
- The banner and Refresh tests (T032) pass.

### Subtask T031: The `./shell` entry and `mountShell`

**Purpose**: publish the shell additively (ruling `01M50K4K059HSWKGA56KV7KNJC`): `.` stays port-only, `./testing` is
unchanged, and `./shell` carries exactly the surface of `contracts/shell-api.md` (SC-005).

**Steps**:

1. `src/ui/mount.ts` exports `mountShell(target: Element, options: ShellOptions)`. It mounts `MissionShell` with
   Svelte's `mount()` and returns `{ setRoute(route), setClient(client, route?), destroy() }`:
   - `setRoute` and `setClient` call the component's exported functions (T027 step 6), which call the one controller;
   - `destroy()` calls Svelte's `unmount()` (which runs the controller's `destroy`); a second `destroy()` is a no-op
     and throws nothing.
2. `src/shell.ts` only re-exports (declares nothing): `MissionShell` (`./ui/MissionShell.svelte`), `mountShell`
   (`./ui/mount`), `formatRoute`, `parseRoute` and the types `Destination`, `ShellMode` (`./core/routes`), `ShellHost`
   (`./core/host`), `ShellScheduler` (`./core/scheduler`), and `ShellOptions` (plus `ShellCopyOverrides` if named)
   from where WP03/WP04 declared it. Names and signatures match the contract block.
3. `package.json` `exports` becomes, additively,
   `{ ".": "./src/index.ts", "./testing": "./src/testing.ts", "./shell": "./src/shell.ts" }`. `main`,
   `dependencies`, `peerDependencies` and `scripts` are unchanged; no version is added (R-16).
4. `test/package.test.ts`: update the first test to expect exactly the three entries with those paths, and retitle it
   accordingly (the CODE-BOUNDARY-003 reference stays). The peer-dependency test is unchanged.
5. Add `test/shell/entry.test.ts`: import `* as shell from '../../src/shell'` and assert the runtime export names are
   exactly `['MissionShell', 'formatRoute', 'mountShell', 'parseRoute']` (sorted); import `* as port from
   '../../src/index'` and assert none of those names is present (`.` stays port-only). Type-level: a
   `satisfies`/assignability line per exported type so a renamed type fails `pnpm typecheck`.

**Files**: `packages/mission-shell/src/shell.ts`, `packages/mission-shell/src/ui/mount.ts`,
`packages/mission-shell/package.json`, `packages/mission-shell/test/package.test.ts`,
`packages/mission-shell/test/shell/entry.test.ts`.

**Validation**:

- `git diff -- packages/mission-shell/src/index.ts packages/mission-shell/src/testing.ts` is empty.
- The package and entry tests pass; `pnpm typecheck` is clean.
- `pnpm lint` passes the boundary rules (no deep import into internals from outside the package).

### Subtask T032: Chromium tests in `test/shell/`

**Purpose**: prove the view on real elements: routing on real screens (FR-001), every intent (FR-003, SC-001 on a
mount), the banners (FR-011, SC-003), Refresh (FR-016), the picker and the dashboard (FR-014, FR-015, R1-03), the
public mount surface's subscriptions (R5-07), NFR-001 on a mounted property, and the copy protocol (FS-03).

**Steps**:

0. **A9 on a mount**: after navigating to Pipeline `M`, the `sk-mission-shell` element's `mission.title` property
   equals the served Mission's `friendlyName`, or else its `slug` (US1-2). Re-selecting the current Ops destination
   through its navigation item issues exactly one `listOpsInvocations` read (US6-2), while re-selecting Pipeline
   issues none.
1. Files live in `test/shell/` and run under `unit` (Chromium) with WP01's `test/setup/browser.ts` (add no error
   handler of your own). Mount with `mountShell` into a fresh container and `destroy()` in `afterEach`. Clients:
   `createFixtureClient` (`../../src/testing`) and WP02's `test/support/*`; shell and fixture share **one** fake
   scheduler. Synthetic data only (C-006).
2. `routing.test.ts` (FR-001; P-7's file): for every destination (seven, `projects` on the desktop only), mount at its
   route and assert the mounted hosting element, the `layout`, and the `current` (and `rail-current`) item. The
   screen assertion carries the custom message:
   `expect(screenTag, \`mounted screen mismatch on ${destination.screen}\`).toBe(expectedTag)`.
   **No test title contains `mounted screen mismatch`**; use titles like `routing: drift`. Add the R-03 cases
   (`nothing-selected` on Work Packages and Artifacts) and a navigation through a real `sk-navigate` from a nav item.
3. `intents.test.ts` (FR-003, R5-10): the case list is **generated from `INTENT_TABLE`**: iterate its tags and event
   keys to build one case per `(tag, event)`. Assert the generated list has **40** cases and **23** distinct event
   names before running them (non-vacuity). Expectations live in a test-local table keyed `'<tag> <event>'`, with the
   effect from `contracts/intent-map.md` (navigation → the mounted screen and `routeChanged`; session → the element's
   property; read → a recorded port call; host → a recorded host call). A generated case with no expectation fails
   the test. Each case dispatches a real `CustomEvent(event, { detail, bubbles: true, composed: true })` **on a real
   element**: the hosting element for handler entries, the nested element (found in the hosting element's shadow root
   or slot) for `via` entries. Picker and dialog cases run on a desktop mount.
4. **Via exactly once**: for each `via` entry, spy on `controller.intent`-observable effects (a recording client or
   host call count, or a `routeChanged` count) and assert exactly **one** effect per dispatch, not two.
5. `banners.test.ts` (FR-011, SC-003, NFR-004): drive the fixture's connection state (its test hook, imported by
   relative path as WP03 does) through all five conditions and assert the `sk-notice`'s `tone` and `announce`
   attributes and its title against `contracts/connection-presentation.md`; `connected` shows no `sk-notice` in the
   same render. Timing with the fake scheduler: `reconnecting` shows nothing at 999 ms and the banner at 1000 ms; a
   degraded banner appears without advancing time. Zero thrown errors across the five (the setup file enforces it).
6. `refresh.test.ts` (FR-016): the Refresh `sk-button` exists, in `slot="top-bar-actions"`, only on Artifact and Ops,
   with labels "Refresh artifacts" and "Refresh Ops"; it is absent on the five other destinations. Clicking it issues
   exactly one re-read of the destination's own explicit-refresh keys (recording client) and none of others.
7. `modes.test.ts` (FR-014, FR-015, R1-03):
   - desktop with `client: null`: the `picker` layout, `sk-projects-screen` filled from a recording host's
     `listRecentProjects`; `sk-request-open-project`, `sk-browse-folder` and `sk-confirm-open-project` each reach the
     host once (positive control);
   - the **mounted dashboard** (with a fixture client, and once with `client: null`): no "All projects" footer item, no
     Projects rail item, no `sk-projects-screen` and no `sk-open-project-dialog` anywhere in the shell's tree
     (shadow roots included), and `/projects` lands on Missions; the null-client case shows "No project is open." and
     makes zero reads.
8. `mount.test.ts` (R5-07): a counting client wrapper (test-local) around two fixture clients `a` and `b`, and a
   recording host with `onWindowRefocus`. `mountShell(target, { client: a, host, mode: 'desktop' })`, then
   `setClient(b)`, then `destroy()`. Assert registrations and releases exactly: `subscribe` 1 + 1 and its
   unsubscribe 1 + 1; `connection.onChange` 1 + 1 and its release 1 + 1; `onWindowRefocus` 2 registrations and 2
   releases. A change delivered on `a` after `setClient(b)`, and on `b` after `destroy()`, records zero reads.
   `setClient(b, '/ops')` switches the route in the same step.
9. `latency.test.ts` (NFR-001): mount on Pipeline M with a deferred read; deliver a `status-transition` for M; resolve
   the re-read at t = 120 ms on the fake scheduler; after a `tick()`, assert the `sk-pipeline-screen` element's
   **property** holds the new value by t = 150. Positive control: before resolution the property holds the old value.
10. `copy.test.ts` (FS-03, R-18): a host whose `copyText` answers `'copied'` twice. Dispatch `sk-copy-command` on the
    real `sk-drift-screen` twice; record the element's `copyResult` property changes (a property setter spy or a
    polling read after each `tick()`), and assert the sequence `null, 'copied', null, 'copied'`: both answers reach
    the element.

**Files**: `packages/mission-shell/test/shell/*.test.ts`.

**Validation**:

- `heavy pnpm --filter @moes-media/mission-shell test` is green and lists every `test/shell/*.test.ts` under `unit`.
- `grep -rn 'mounted screen mismatch' packages/mission-shell/test` matches only the assertion message line.

### Subtask T033: Plant P-7 (unit-tests) and the gate self-tests

**Purpose**: prove that the Chromium shell tests run and catch a wrong mounted screen (FR-017; ruling
`01M50K4NSNYD9TEQ12T4J7KVHT`), and that keeping `Shell.svelte` leaves the no-io and data-driven self-tests green
(R5-06).

**Steps**:

1. Append P-7 to `gates/plants/unit-tests/plant.json` as the **10th** element (8 base entries, then WP02's P-1),
   leaving every existing entry byte-identical:

   ```json
   {
     "gate": "unit-tests",
     "ciCommand": "pnpm test",
     "expectFailPattern": "mounted screen mismatch on drift",
     "overlays": [
       {
         "target": "packages/mission-shell/src/ui/MissionShell.svelte",
         "edits": [
           { "find": "drift: DriftScreen,", "replace": "drift: OpsScreen," }
         ]
       }
     ]
   }
   ```

   Match the file's JSON formatting and keep it an array.
2. Check the `find` string occurs once (T027 step 10). Apply the overlay by hand once and run the shell tests: the
   run is red with `mounted screen mismatch on drift` (from the routing assertion, not a crash; T028 step 3). Revert,
   and confirm the clean output does not contain the token.
3. Run `heavy pnpm test:no-io` and `pnpm test:data-driven` (Node-only Vitest runs; both self-tests name the kept
   `src/Shell.svelte`).
4. Run `heavy pnpm gate-proof leg --gate unit-tests` in the foreground: the base run is green and every plant,
   including P-1 and P-7, turns red on its token. Record the local leg time in the final report (IC-09 sets the
   provisional matrix timeout from it).

**Files**: `gates/plants/unit-tests/plant.json` (out-of-map).

**Validation**: `node -e` JSON parse gives 10 entries, the first 9 equal to the WP base; the leg passes.

## Plants

- **P-7** (unit-tests): anchored edit in `packages/mission-shell/src/ui/MissionShell.svelte`, `drift: DriftScreen,` →
  `drift: OpsScreen,`. Failure-only token: `mounted screen mismatch on drift`, the custom assertion message in
  `test/shell/routing.test.ts` (no test title contains it). `ciCommand`: `pnpm test`. P-7 proves that the Chromium
  shell tests run (ruling `01M50K4NSNYD9TEQ12T4J7KVHT`). The other new checks of this WP carry in-test positive
  controls inside that proven project (research R-15).

## Exit checks

- [ ] `pnpm typecheck`, `pnpm lint` (with WP07's shell block over `src/ui/**`), `pnpm lint:no-io`,
      `pnpm lint:data-driven`, `pnpm lint:styles` and `pnpm test:terminology` are clean.
- [ ] `heavy pnpm --filter @moes-media/mission-shell test` is green (foreground, one at a time); `unit` runs every
      `test/shell/*.test.ts` and the updated `test/package.test.ts`, and `logic` is unchanged.
- [ ] `heavy pnpm test:no-io` and `pnpm test:data-driven` (Node only, no browser) are green.
- [ ] `heavy pnpm gate-proof leg --gate unit-tests` passes with P-1 and P-7; the **local leg time** is in the final
      report.
- [ ] `grep -c 'drift: DriftScreen,'` on `MissionShell.svelte` prints 1; the P-6 anchor line in
      `ConnectionBanner.svelte` occurs once.
- [ ] `plant.json` parses as an array of 10 entries; entries 1 to 9 are unchanged (`git diff` shows only the append).
- [ ] Hygiene: no local paths or usernames in any tracked file this WP touches (`pnpm hygiene`).
- [ ] `git diff --name-only` against the WP base lists only owned files and `gates/plants/unit-tests/plant.json`.
- [ ] `src/Shell.svelte`, `src/index.ts`, `src/testing.ts` and the rest of the frozen surface (R-17) are unchanged.
- [ ] The out-of-map edit is recorded in the final report, verbatim with its rationale.
- [ ] Each subtask marked: `spec-kitty agent tasks mark-status T027 --status done` (and T028 to T033).

## Definition of Done

- One `<sk-mission-shell>` root, mission-ui imported first, the runes mirror, `afterRender` awaiting `tick()`, and the
  `SCREENS` table with the unique P-7 anchor.
- Every destination mounts its screen, layout and current item; R-03 screens show `nothing-selected`; `href`s are
  `'#'` + route; tree `meta` passes contract words through.
- `bindIntents` binds handler entries on hosting elements only; the 40-case sweep, generated from `INTENT_TABLE`,
  passes on real elements; each `via` intent is handled exactly once.
- Banners are `sk-notice` with the contract's tone and announce (one table line per condition, the P-6 anchor exact);
  Refresh is a ghost sm `sk-button` in `top-bar-actions`, only on Artifact and Ops, with the contract labels.
- `./shell` exports exactly the contract surface; three `exports` entries; `.` and `./testing` unchanged.
- Desktop picker with `client: null` works; the mounted dashboard has no picker entry point; `mountShell` counts,
  NFR-001 by t = 150 and the double `copied` all pass.
- P-7 appended and proven; no-io and data-driven self-tests green; every exit check ticked.

## Risks

- **A second root** (a top-level `{#if}`, text or sibling) breaks the stories' first-element contract (R-07, WP08).
- **Double handling**: binding `via` entries or applying the action twice runs an intent twice; the exactly-once
  cases must count effects, not listener calls.
- **A hand-listed sweep** drifts from the table (R5-10): generate the cases and assert the counts.
- **P-7 failing for the wrong reason**: a binding that throws on a foreign slice fails the harness before the token
  prints (T028 step 3; T033 step 3).
- **Token leakage**: a test title or log line containing `mounted screen mismatch` makes the clean output match.
- **Reactive loops**: compare the `route` effect with the last host-set route and rely on WP04's no-echo rule.
- **Fake time and Svelte**: `tick()` is a microtask; advance the fake scheduler, then await `tick()`. Object props must
  arrive as properties (assert `navItems` is an array). Keep `tick` out of `core/` (P-8).

## Reviewer Guidance

- `MissionShell.svelte`: mission-ui imported first; one root; `SCREENS` one entry per line with `drift: DriftScreen,`
  once; `afterRender` awaits `tick()`; teardown releases the mirror and destroys the controller once.
- `ConnectionBanner.svelte` holds only the tone and announce table; the reconnecting line is byte-exact; no copy or
  timer logic in `ui/` (FS-06).
- `bind-intents.ts` skips `{ via }` entries; `use:bindIntents` appears only on the nine hosting elements.
- `src/shell.ts` re-exports exactly the contract names; the `package.json` diff is the one `./shell` line;
  `src/index.ts`, `src/testing.ts` and `src/Shell.svelte` have no diff.
- Non-vacuity: the sweep asserts 40 cases and 23 names first and fails on a case without an expectation; the
  dashboard no-picker test sits beside the desktop positive control; subscription counts cover registrations and
  releases; the NFR-001 test checks the old value first; the copy test records `null, 'copied', null, 'copied'`.
- P-7: unique anchor, token only in the assertion message; apply the overlay by hand once or re-run the leg; the
  leg time is reported. `plant.json` has 10 entries, the first 9 byte-identical.
- `pnpm lint`, `lint:data-driven` and `lint:styles` clean; CSS layout-only with `--sk-*`; synthetic test data only.

## Implementation command

`spec-kitty agent action implement WP06 --agent claude`
