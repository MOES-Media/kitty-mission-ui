---
work_package_id: WP08
title: 'IC-08a: Shell stories, Storybook integration and candidate baselines (before CP-1)'
dependencies:
- WP06
requirement_refs:
- FR-017
- FR-018
- NFR-005
- NFR-006
- C-002
- C-006
- SC-006
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-mission-shell-01M50D2J
base_commit: f29e375990907974aa99e55889f3fd5cc5474d73
created_at: '2026-10-16T15:56:45.496771+00:00'
subtasks:
- T038
- T039
- T040
- T041
- T042
- T043
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/src/stories/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/src/stories/**
- apps/storybook/.storybook/main.ts
- apps/storybook/package.json
- pnpm-lock.yaml
- gates/plants/storybook-build/**
- gates/plants/visual/**
role: implementer
tags: []
tracker_refs: []
---

# WP08 — IC-08a: Shell stories, Storybook integration and candidate baselines (before CP-1)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Bring the Svelte shell into the existing Storybook and visual gate. That means the second stories glob and the Svelte
plugin, a proven mount technique, the story-local `storyClient`, and the eleven stories of `contracts/stories.md`. Move
the visual plant to the reconnecting banner (P-6), add the storybook-build plant P-5, and commit the eleven
**candidate** baselines for CP-1. This WP stops at "candidate baselines committed"; CP-1 (orchestrator) and WP09
(finalisation) follow.

## Context

- **Plan**: IC-08a ("Stories, Storybook integration and candidate baselines"). It depends on IC-06 (WP06). CP-1
  ("Design review", orchestrator-owned, not a WP) follows it, and then IC-08b (WP09). Plan "Timeline risks" items 2 and 4:
  the Svelte-in-Storybook mount is unproven, so its spike gates this WP. Baselines and the P-6 proof need the pinned image
  on Linux x86_64 with podman, run under `heavy`, about 18 min per visual run, one at a time.
- **Contracts** (normative; never contradict them):
  - `contracts/stories.md`: where the stories live and how they mount, "Story data", the 11-row "Catalogue" (titles,
    ids, tags, compositions), "Baselines and approval", "Plants" (P-5, P-6).
  - `contracts/connection-presentation.md`: the five banner conditions and their story ids, the Refresh button and its
    layout stories, the P-6 anchor line.
  - `contracts/shell-api.md`: `ShellOptions` (`client`, `host`, `mode`, `route`, `scheduler`, `clock`, `copy`),
    `ShellScheduler`, `MissionShell` (props: `ShellOptions`), "Host prerequisites".
- **Research**:
  - R-07: the glob, the plugin `svelte({ configFile: false, preprocess: vitePreprocess() })`, and the harness
    constraint (the story's first element is a registered custom element that reflects `tier`). Mount options in
    order (a) → (b) → (c).
  - R-08: stories import `createFixtureClient` from `../testing` with **no boundary exemption** (R4-07). Also
    `storyClient` with settling (FS2-04), empty `changes` (R2-12), the refused example, the immediate scheduler and
    the fixed clock. `setConnectionState` stays internal (C-003).
  - R-12: the ruled P-6 (decision `01M50HMCBJMREJ5XJASGE29X73`, option A). Its exact anchor and token, and the local
    proof before hand-off.
  - R-14: CP-1. Candidates come only from `heavy pnpm visual:update` in the pinned image. The orchestrator records
    `design-review.md` and `design-review.sha256`; WP09 finalises.
  - R-16: no new package or version in `pnpm-lock.yaml`. `svelte` 5.57.1 and `@sveltejs/vite-plugin-svelte` 6.2.4
    are already locked (evidence table); the `packages:` section and `allowBuilds` stay unchanged.
  - R-17: the frozen surface, including the visual harness and the baseline rule R5-01.
- **Squad findings applied**: R4-07 and R3-06 (no exemption, `beforeEach` unmount, `configFile: false`); R2-12 (empty
  changes); FS2-03 (no `reads: 'unavailable'`); FS2-04 (`whenSettled()`); R5-12 and R6-01 (P-6 is a guaranteed visible
  tone change); R5-01 (baseline integrity).
- **Spec**: FR-018 (a story with an approved baseline for each banner state and layout composition, flagged for design
  review), FR-017 (plants), NFR-005 (visual gate within its 28-minute budget), NFR-006 (exact pins, 14 days or older),
  C-002 and SC-006 (mission-ui byte-unchanged), C-006 (hygiene).
- **What the dependency delivers** (WP06, IC-06): `src/ui/MissionShell.svelte` with exactly one root
  `<sk-mission-shell>`, and `src/ui/ConnectionBanner.svelte` with its tone and announce table one line per condition.
  That table includes the exact P-6 anchor line `reconnecting: { tone: 'attention', announce: 'polite' },`. WP06 also
  delivers the Refresh button on Artifact and Ops, and the `./shell` entry (`src/shell.ts`) exporting `MissionShell`,
  `mountShell`, `formatRoute`, `parseRoute` and the types. Earlier WPs deliver the controller (WP03), the host flows and
  dashboard mode (WP04), and the read scheduler (WP02).
- **Who consumes this WP**: CP-1 (the operator reviews the eleven candidate PNGs). Then WP09 finalises the baselines,
  re-proves P-6, and owns the `shell-*.png` files from then on. IC-09 (WP10) uses this WP's local leg times for the
  storybook-build and visual legs.

## Ownership

**Owned files** (stage only these, plus the recorded out-of-map edit):

- `packages/mission-shell/src/stories/**`
- `apps/storybook/.storybook/main.ts`
- `apps/storybook/package.json`
- `pnpm-lock.yaml`
- `gates/plants/storybook-build/**`
- `gates/plants/visual/**`

**Out-of-map edits**:

- `apps/storybook/tests/visual/__snapshots__/shell-*.png` (owned by WP09) — WP08 commits the eleven CANDIDATE baselines
  for CP-1; WP09 owns and finalises them after CP-1.

Commit them with a plain `git add apps/storybook/tests/visual/__snapshots__/shell-*.png` and list the edit in the final
report with the rationale above. Any other change you need in a file you do not own is a **change request** in the
final report (file, change, reason), not an edit.

**Do not touch**:

- The visual harness: `scripts/visual.sh`, `apps/storybook/playwright.config.ts`, and `apps/storybook/tests/visual/**`
  except adding `shell-*.png` files.
- **Any existing baseline** (R5-01). No `__snapshots__/*.png` other than the eleven new `shell-*.png` may be added,
  modified, deleted or renamed. If `visual:update` rewrites an existing PNG, restore it with
  `git checkout -- <path>` and report it as a stability finding.
- `packages/mission-ui/**` (C-002, SC-006): no screen, element, story, manifest or event change. A gap is solved in the
  shell stories or filed as a change request.
- The frozen surface (C-003; research R-17): `src/client/port.ts` and all of `src/client/**`, `src/contract/stream.ts`,
  `src/testing.ts`, `src/index.ts`, `src/harness/**`, `src/Shell.svelte`, `contracts/fixtures/*`, and the gate wiring.
  The gate wiring means the `ci.yml` structure, `scripts/gate-proof.mjs` and `scripts/gate-proof/**`, every plant's
  `ciCommand` and `prepare`, the root gate scripts, and `apps/storybook`'s `scripts`.
- `apps/storybook/.storybook/preview.ts` and `preview-head.html`; `src/ui/**` (WP06), `src/shell.ts` and
  `packages/mission-shell/package.json` (WP06), `eslint.config.mjs` (WP07), `test/**` (earlier WPs).

## Subtask T038: Storybook integration (glob, Svelte plugin, app dependencies)

**Purpose**: the existing `@storybook/web-components-vite` Storybook builds the shell's `.stories.ts` files and
compiles `.svelte` (research R-07). No second Storybook, no new package in the lockfile (R-16).

**Steps**:

1. In `apps/storybook/.storybook/main.ts`:
   - `stories` becomes
     `['../../../packages/mission-ui/src/**/*.stories.ts', '../../../packages/mission-shell/src/**/*.stories.ts']`.
     Keep the mission-ui glob first and unchanged.
   - `import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';`.
   - In `viteFinal`, append the plugin:
     `viteConfig.plugins = [...(viteConfig.plugins ?? []), svelte({ configFile: false, preprocess: vitePreprocess() })];`.
     `configFile: false` is required (R3-06: a stray `svelte.config.js` must not be picked up).
   - Keep the lit `dedupe`, `disableTelemetry` and the existing comments. Add a one-line comment on the plugin's
     purpose. Machine-specific values must not appear.
2. In `apps/storybook/package.json` `dependencies` (the app has no `devDependencies` block; keep one block), add,
   alphabetically:
   - `"@moes-media/mission-shell": "workspace:*"`;
   - `"@sveltejs/vite-plugin-svelte": "6.2.4"`;
   - `"svelte": "5.57.1"`.

   These are exact pins (NFR-006). Do not change `scripts` (R-17).
3. `pnpm-lock.yaml`: update **only** the `apps/storybook:` importer entry. Add the three dependencies with the same
   `specifier` and `version` strings the lockfile already resolves elsewhere:
   - mission-shell: `link:../../packages/mission-shell`;
   - `svelte`: the `packages/mission-shell` importer's version string;
   - the plugin: the root importer's version string.

   Either edit by hand or run `pnpm install --lockfile-only --offline`; then run `pnpm install --frozen-lockfile`. It
   must succeed with no network fetch of a new tarball.
4. Lockfile proof (R-16): `git diff "$base" -- pnpm-lock.yaml` shows changes inside the `apps/storybook:` importer
   block only. The `packages:` and `snapshots:` sections and `allowBuilds` are unchanged. Record the diff stat and a
   one-line confirmation in the final report. If pnpm wants to add or change any package entry, **stop** and report:
   that is a supply-chain decision outside this WP.
5. Supply-chain evidence (DIRECTIVE_051) in the final report: repeat the research R-16 table for the two npm packages
   (exact pin; published 2026-09-18 and 2026-01-09, 14 days or older; no install scripts; registry unchanged; no new
   transitive packages). Note that they were already locked.

**Files**: `apps/storybook/.storybook/main.ts`, `apps/storybook/package.json`, `pnpm-lock.yaml`.

**Validation**:

- `pnpm install --frozen-lockfile` exits 0.
- `pnpm --filter @moes-media/storybook-app typecheck` is clean (it covers `.storybook/**/*.ts`).
- `heavy pnpm build-storybook` still builds the mission-ui stories with unchanged ids (spot-check
  `storybook-static/index.json` before and after: no mission-ui entry added or removed).

## Subtask T039: Mount-technique spike (do this FIRST, before T040 and T041)

**Purpose**: prove that a Svelte-mounted `sk-mission-shell` satisfies the visual harness before building the
eleven stories on it (plan "Timeline risks" 2; research R-07). Record which option won.

**What the harness requires** (read `apps/storybook/tests/visual/stories.visual.spec.ts`; do not change it):

- The story element is `#storybook-root > *:first-child > *:first-child`. The web-components renderer puts what
  `render` returns inside a wrapper, so the returned node's first element must be `sk-mission-shell`.
- `customElements.whenDefined(<localName>)` resolves and `customElements.get(<localName>)` is defined.
- For a `vw-1280` story, the element's `tier` attribute is `expanded` (breakpoints 1100 and 720).
- Nested custom elements settle (R-05 bounds). Inter is loaded. The screenshot has 8 or more colours, and no
  `.sb-errordisplay` is visible.
- **At least 4 stories per title** in `index.json`. The module-level check throws for the whole run otherwise. A
  spike title with one story therefore breaks every visual run, even one filtered with `--grep`.
- One baseline per story, and no orphan PNG. So the spike story must use a **real catalogue id**, never a spike-only
  id.

**Steps**:

1. Create `packages/mission-shell/src/stories/connection-banners.stories.ts` with `title: 'Shell/Connection banners'`
   and its five catalogue exports. Use the names `Connecting1280`, `Reconnecting1280`, `ServiceMissing1280`,
   `ContractMismatch1280` and `LiveUpdatesOff1280`, so Storybook derives ids such as
   `shell-connection-banners--connecting-1280`, as mission-ui's `Empty1280` gives `-empty-1280`. Each export has
   `tags: ['vw-1280']`. For the spike they may all mount a minimal client:
   `createFixtureClient({ initialState: <state>, fixtures: { changes: { missionId, items: [] } } })` from `../testing`,
   with no data. T040 and T041 replace this.
2. Implement option **(a)**: in `render`, create a detached container `div` and call
   `mount(MissionShell, { target: container, props })` (`mount` and `unmount` from `svelte`). Keep the instance for
   cleanup and return `container.firstElementChild`. Import `MissionShell` from `../shell` (the public entry). Add the
   meta-level `beforeEach` cleanup now (T040 step 6).
3. `heavy pnpm build-storybook`. Then check that `storybook-static/index.json` lists the five ids exactly, with the
   `vw-1280` tag.
4. ONE visual run of the spike story only, in the pinned image:
   `heavy pnpm visual:update -- --grep shell-connection-banners--connecting-1280`. If pnpm does not pass the
   arguments through, run `heavy pnpm build-storybook` and then
   `heavy bash scripts/visual.sh --update -- --grep shell-connection-banners--connecting-1280`. The test must pass:
   registered, `tier="expanded"`, settled, fonts, not blank. Look at the written PNG. The final candidate set
   regenerates it in T043.
5. If (a) fails, try **(b)**: mount into a `DocumentFragment` and return the fragment (the wrapper's first element is
   then `sk-mission-shell`). If (b) fails too, use **(c)**: a story-only wrapper custom element, defined in
   `src/stories/` with `customElements.define`, that mirrors `sk-mission-shell`'s `tier` onto itself. (c) is a weaker
   proof because the harness then checks the wrapper. Say so in the final report.
6. Record in the final report: the winning option, the failure line of each option that lost, and the time of the
   spike visual run.

**Files**: `packages/mission-shell/src/stories/connection-banners.stories.ts` (and a wrapper module only under (c)).

**Validation**: the single-story visual run is green, and the final report names the option.

## Subtask T040: `storyClient({ state, startConnected })`, the story-local client

**Purpose**: deterministic story data that reaches each story's connection state with the screens filled when the
composition says "with data". The port stays frozen (C-003; research R-08; FS2-03, FS2-04).

**Steps**:

1. Create `packages/mission-shell/src/stories/story-client.ts` (story-local; not exported from any package entry).
   Import `createFixtureClient` from `../testing` by relative path. Import port types and `READ_OPS` from `../index`.
   **Add no ESLint boundary exemption** (R4-07). The boundary patterns do not match `../testing`, and `pnpm lint` must
   prove it.
2. Signature:
   `storyClient({ state, startConnected = false, examples }: { state: ConnectionState; startConnected?: boolean; examples?: ... })`.
   It returns a value that `satisfies MissionStatusClient` plus `whenSettled(): Promise<void>`.
3. Base fixture, always:
   `createFixtureClient({ examples, fixtures: { changes: { missionId: <the sequence id>, items: [] } }, scheduler: storyScheduler })`.
   Take `<the sequence id>` from the fixture's own `changes` envelope or the R-08 sequence; never invent a new id. No
   change replays during a story (R2-12). Do not use `setConnectionState` (internal, C-003).
4. **Reads delegate** to the base fixture for every operation in `READ_OPS`. Each wrapper calls the base method, adds the
   returned promise to a tracked set, and removes it when it settles (fulfilled or rejected). `whenSettled()` resolves
   once the tracked set is empty. `subscribe` delegates to the base unchanged (the refused stream comes from the
   `examples` selection).
5. **Connection** is the story client's own `{ get state, onChange(listener) }`, with a listener set and an
   unsubscribe:
   - Without `startConnected`: `state` from the start. The shell issues no read (FS-01), so the slots show `loading` or
     `error`.
   - With `startConnected`: it reports `connected` first. **The switch to `state` happens on the microtask after the
     last tracked read settles** (FS2-04). When the set becomes empty, schedule with `Promise.resolve().then(...)`.
     Then re-check that the set is still empty: a chained read (a page chain) may have been issued in between, in
     which case wait for the next empty. Then set `state` and notify each listener exactly once. Never switch twice.
     If the story was unmounted in the meantime, do nothing.
6. **Meta-level cleanup** (R4-07): in each stories file, a module-level `let mounted` holds the current Svelte
   instance. The meta `beforeEach` returns a cleanup that calls `unmount(mounted)` and clears it, so no shell outlives
   its story.
7. **Time**: export from a story-local module (for example `src/stories/story-support.ts`):
   - an immediate `ShellScheduler`: `setTimeout(fn)` runs `fn` on `Promise.resolve().then(...)` unless its handle was
     cleared, and `clearTimeout(handle)` marks it cleared. This satisfies the reconnecting 1 s grace with no real
     wait;
   - a fixed clock: `() => new Date('<one fixed ISO instant>')`, so relative times are stable.

   Do not call the global `setTimeout`, `queueMicrotask` or any I/O global. The shell ESLint block of IC-07 and no-io
   apply to `src/**`.
8. The refused story passes `examples: { streamEvents: 'StreamRefusal.content-mismatch' }`.
9. Hygiene (C-006): synthetic names only; no real user data, absolute paths or OS usernames.

**Files**: `packages/mission-shell/src/stories/story-client.ts`, `packages/mission-shell/src/stories/story-support.ts`
(names may differ; keep them under `src/stories/`).

**Validation**:

- `pnpm --filter @moes-media/mission-shell typecheck` (svelte-check, `--fail-on-warnings`) is clean, and
  `storyClient` satisfies the port with no cast.
- `pnpm lint` and `pnpm lint:no-io` are clean with the boundary block unchanged.
- The behaviour proof is visual (tests live outside `src/`, and `test/**` is not this WP's). In the T043 candidates,
  every "with data" story shows filled rows **and** its banner. If a candidate shows the banner over `loading`, the
  settle switch is wrong.

## Subtask T041: The eleven stories of `contracts/stories.md`

**Purpose**: one story per banner state and per layout composition, at the catalogue ids, ready for CP-1 (FR-018).

**Steps**:

1. `connection-banners.stories.ts`, `title: 'Shell/Connection banners'`, every story `tags: ['vw-1280']`:
   - `shell-connection-banners--connecting-1280`: project layout, route `/missions`, `storyClient({ state: 'connecting' })`
     from the start (no `startConnected`). No reads; the slots show `loading` (data-model "ConnectionPresentation").
   - `--reconnecting-1280`: Missions with data, `storyClient({ state: 'reconnecting', startConnected: true })`; the
     immediate scheduler fires the grace timer, so the banner shows.
   - `--service-missing-1280`: Missions with data, `state: 'degraded: service-missing'`, `startConnected: true`.
   - `--contract-mismatch-1280`: Missions **without data**, `state: 'degraded: contract-mismatch'` **from the start**
     (no `startConnected`). No reads are issued, and the no-value slots show `error` from the degraded gate.
   - `--live-updates-off-1280`: Missions with data, `state: 'connected'`, `startConnected: true`,
     `examples: { streamEvents: 'StreamRefusal.content-mismatch' }`.
2. `layouts.stories.ts`, `title: 'Shell/Layouts'`, every story `tags: ['vw-1280']`, `state: 'connected'`,
   `startConnected: true` unless noted:
   - `shell-layouts--project-missions-1280`: `/missions`, `mode: 'desktop'`, no Refresh, "All projects" footer.
   - `--project-ops-1280`: `/ops`, Refresh shown.
   - `--mission-pipeline-1280`: `/missions/{missionId}`, no Refresh.
   - `--mission-artifact-1280`: `/missions/{missionId}/artifacts/{encodeURIComponent(path)}`, Artifact selected,
     Refresh shown.
   - `--picker-projects-1280`: `mode: 'desktop'`, `client: null` (route `/projects`). The host is a story-local
     recording host whose `listRecentProjects` resolves synthetic `ProjectEntry` values.
   - `--dashboard-project-1280`: `/missions`, `mode: 'dashboard'`; no "All projects" and no Projects rail item.
3. Build routes with `formatRoute(...)` from `../shell` and take ids and paths from the fixture data (examples of the
   default routes). Do not hard-code ids the fixture does not contain, because an unknown route parses to Missions.
4. Use the port's own `ConnectionState` strings exactly (`CONNECTION_STATES` in `src/client/port.ts`: `connecting`,
   `connected`, `reconnecting`, `degraded: service-missing`, `degraded: contract-mismatch`). Never widen or cast them.
5. Export names give the ids exactly (`ProjectMissions1280` → `project-missions-1280`, and so on). After
   `heavy pnpm build-storybook`, assert by hand that `storybook-static/index.json` lists **exactly** the eleven ids:
   5 under `Shell/Connection banners` and 6 under `Shell/Layouts` (each title has 4 or more, as the harness needs).
   Each has the `vw-1280` tag. Do not add `autodocs` (a docs page would mount the shell once more per story).
6. Every story passes the immediate scheduler and the fixed clock (T040 step 7), and uses the meta `beforeEach`
   cleanup.

**Files**: `packages/mission-shell/src/stories/connection-banners.stories.ts`,
`packages/mission-shell/src/stories/layouts.stories.ts`.

**Validation**: `index.json` has the 11 ids exactly; `heavy pnpm build-storybook` is green, including its
`--storybook-static` hygiene scan; typecheck and lint are clean.

## Subtask T042: Plant P-5 (storybook-build)

**Purpose**: prove that the storybook-build gate builds the shell's story glob. A shell story that imports a missing
module must fail the build (FR-017; plan "Plants" P-5).

**Steps**:

1. Add the payload `gates/plants/storybook-build/plant-shell-storybook.stories.ts.plant`. Plant payloads never carry a
   lintable extension (hygiene `checkPlantFiles`). Model it on the existing `plant-storybook-missing.stories.ts.plant`:
   ```ts
   // Planted violation: a shell story importing a module that does not exist, so the Storybook build must fail.
   import './plant-shell-storybook-missing';

   export default { title: 'Plant/ShellStorybookMissing' };

   export const Default = { render: () => document.createElement('div') };
   ```
2. Append the plant to `gates/plants/storybook-build/plant.json`. Today the file holds a single object; `loadPlants`
   accepts an object or an array. Wrap it into a JSON array in the same format the multi-plant files use
   (`gates/plants/eslint/plant.json`). The existing object stays first and unchanged field for field (gate, ciCommand,
   token, overlay; R-17 retains every base plant). Then add:
   ```json
   {
     "gate": "storybook-build",
     "ciCommand": "pnpm build-storybook",
     "expectFailPattern": "plant-shell-storybook-missing",
     "overlays": [
       {
         "target": "packages/mission-shell/src/stories/plant-shell-storybook.stories.ts",
         "source": "plant-shell-storybook.stories.ts.plant"
       }
     ]
   }
   ```
   There is one distinct `ciCommand` per gate directory (the coverage check), and it is unchanged.
3. Token check (C5, failure-only): `plant-shell-storybook-missing` must not appear in the clean build output, and
   neither token contains the other.
4. Prove it: `heavy pnpm gate-proof leg --gate storybook-build` (foreground). Both plants must fail with their own
   token, and the clean run must be green. Record the local leg time.

**Files**: `gates/plants/storybook-build/plant.json`,
`gates/plants/storybook-build/plant-shell-storybook.stories.ts.plant`.

**Validation**: the leg passes, and `pnpm test:scripts` (gate-proof and hygiene tests) and `pnpm hygiene` are green.

## Subtask T043: Plant P-6 (visual, moved), the candidate baselines and the local proof

**Purpose**: the moved visual plant (decision `01M50HMCBJMREJ5XJASGE29X73`, option A; research R-12), the eleven
candidate baselines for CP-1 (R-14), and the baseline integrity check (R5-01).

**Steps**:

1. Replace the `sk-mission-sample` overlay in `gates/plants/visual/plant.json`, keeping its single-object format:
   ```json
   {
     "gate": "visual",
     "ciCommand": "bash scripts/visual.sh -- --repeat-each=5",
     "prepare": "pnpm storybook:build-only",
     "expectFailPattern": "shell-connection-banners--reconnecting-1280-diff.png",
     "overlays": [
       {
         "target": "packages/mission-shell/src/ui/ConnectionBanner.svelte",
         "edits": [
           {
             "find": "reconnecting: { tone: 'attention', announce: 'polite' },",
             "replace": "reconnecting: { tone: 'danger', announce: 'polite' },"
           }
         ]
       }
     ]
   }
   ```
   `ciCommand` and `prepare` are byte-identical to today (R-17). Confirm that the `find` string occurs **exactly once**
   in WP06's `ConnectionBanner.svelte`. If it does not, stop and raise a change request to WP06; do not edit `src/ui/**`.
2. **Produce the candidates** in the pinned image only (Linux x86_64 and podman): `heavy pnpm visual:update`. This
   comes before the leg proof, because the gate-proof clean run compares against baselines and fails while the eleven
   are missing. Never generate baselines with a host browser.
3. **R5-01**: `git status` shows exactly eleven new files `apps/storybook/tests/visual/__snapshots__/shell-*.png`,
   named as the eleven catalogue ids, and nothing else under `__snapshots__/`. Then
   `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/` passes (`$base` =
   `git merge-base HEAD main`). Restore any rewritten existing PNG (see "Do not touch").
4. Open each of the eleven PNGs and check it against its composition. The five banners each show their banner. The
   "with data" stories show filled rows. Contract-mismatch shows `error` slots. Refresh appears only on Ops and
   Artifact. The dashboard has no "All projects" and no Projects rail item. The picker shows the synthetic entries. A
   wrong candidate is fixed in the stories, never by editing a PNG.
5. **Stability**: `heavy pnpm visual -- --repeat-each=5` is green with the candidates (the gate's own repeat count),
   with every test passed and none failed. If it is flaky, fix the stories (settling, clock, scheduler), never the
   harness.
6. **Prove P-6**: `heavy pnpm gate-proof leg --gate visual`, in the foreground, about 40 minutes (two runs of about
   18 min). The clean run must be green and must not print the token. The planted run must fail and print
   `shell-connection-banners--reconnecting-1280-diff.png`. Record the leg time and the clean `Gate: visual` step time.
   NFR-005 holds the visual gate within 28 minutes; IC-09 uses both numbers.
7. Hygiene: the `build-storybook` hygiene scan of `storybook-static` is clean, and `pnpm hygiene` covers the new PNGs
   and sources.
8. Commit the stories, plants, config and the eleven PNGs (the PNGs as the recorded out-of-map edit). **Stop here**:
   the WP ends at "candidate baselines committed". Do not wait for the operator; CP-1 is the orchestrator's.

**Files**: `gates/plants/visual/plant.json`; `apps/storybook/tests/visual/__snapshots__/shell-*.png` (out-of-map).

**Validation**: steps 3, 5 and 6 pass, and the final report carries the leg times.

## Plants

- **P-5, storybook-build** (T042): overlay `source` `plant-shell-storybook.stories.ts.plant` → target
  `packages/mission-shell/src/stories/plant-shell-storybook.stories.ts`, importing `./plant-shell-storybook-missing`.
  Failure-only token: `plant-shell-storybook-missing`. It is appended; the base plant `plant-storybook-missing` is
  retained.
- **P-6, visual, moved** (T043): an anchored edit in `packages/mission-shell/src/ui/ConnectionBanner.svelte`.
  `reconnecting: { tone: 'attention', announce: 'polite' },` becomes
  `reconnecting: { tone: 'danger', announce: 'polite' },`. Failure-only token:
  `shell-connection-banners--reconnecting-1280-diff.png`. It replaces the `sk-mission-sample` gap plant; `ciCommand`
  and `prepare` are unchanged.

## Exit checks

- [ ] Spike done first; the winning mount option and each loser's failure line are recorded (T039).
- [ ] `pnpm install --frozen-lockfile` exits 0, and `git diff "$base" -- pnpm-lock.yaml` touches only the
      `apps/storybook:` importer. `packages:`, `snapshots:` and `allowBuilds` are unchanged (R-16).
- [ ] `pnpm typecheck` is clean (shell svelte-check and the storybook app's `tsc`).
- [ ] `pnpm lint` and `pnpm lint:no-io` are clean. The ESLint boundary block is unchanged and has no stories exemption.
- [ ] `heavy pnpm build-storybook` is green, including the `--storybook-static` hygiene scan. `index.json` lists
      exactly the eleven shell ids, each with `vw-1280`, and the mission-ui ids are unchanged.
- [ ] `heavy pnpm visual -- --repeat-each=5` is green with the candidates.
- [ ] `heavy pnpm gate-proof leg --gate storybook-build` passes (P-5 and the base plant). Local leg time recorded.
- [ ] `heavy pnpm gate-proof leg --gate visual` passes (P-6). Local leg time and clean gate-step time recorded.
- [ ] `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/` passes, and the
      only added PNGs are the eleven `shell-*.png` (R5-01).
- [ ] `git diff --exit-code "$base" -- packages/mission-ui` is empty (C-002, SC-006). The harness files
      (`scripts/visual.sh`, `playwright.config.ts`, `tests/visual/**` except `shell-*.png`) are unchanged.
- [ ] `pnpm hygiene`, `pnpm test:scripts` and `pnpm test:terminology` are green. Tracked files have no local paths
      or usernames (C-006).
- [ ] No file outside the owned files and the recorded out-of-map edit is changed (`git diff --name-only "$base"`).
- [ ] The out-of-map edit (`shell-*.png`, owned by WP09) is recorded in the final report with its rationale.
- [ ] Supply-chain evidence (R-16 table) is in the final report.
- [ ] Each subtask is marked: `spec-kitty agent tasks mark-status T038 --status done` (and T039, T040, T041, T042,
      T043).
- [ ] All `heavy` commands run in the foreground, one at a time, with nothing left running.

## Definition of Done

- **Integration**: Storybook builds the shell stories through the second glob and
  `svelte({ configFile: false, preprocess: vitePreprocess() })`. The app declares the three exact dependencies, and
  the lockfile gains no package.
- **Mount**: the spike's winning option is recorded. Every story's first element is the registered `sk-mission-shell`
  with `tier="expanded"` at 1280, or the (c) wrapper with the reason recorded. Every mount is unmounted by the meta
  `beforeEach` cleanup.
- **Story data**: `storyClient` delegates reads to `createFixtureClient` from `../testing` with no exemption, uses
  empty `changes`, tracks reads and exposes `whenSettled()`, and switches state on the microtask after the last read
  settles. The stories use the immediate scheduler and the fixed clock; the refused story selects
  `StreamRefusal.content-mismatch`.
- **Stories**: the eleven stories match `contracts/stories.md` id for id, with titles `Shell/Connection banners` (5)
  and `Shell/Layouts` (6), all tagged `vw-1280`.
- **Plants**: P-5 is appended and proven with the base plant retained. P-6 is moved, anchored exactly, and proven
  locally, with `ciCommand` and `prepare` unchanged.
- **Baselines**: eleven candidate `shell-*.png` from the pinned image, stable over 5 repeats, with R5-01 clean. They
  are committed as the recorded out-of-map edit, and the WP stops for CP-1.
- **Boundaries**: mission-ui, the harness, the frozen surface and every existing baseline are unchanged.

## Risks

- **Mount technique** (plan "Timeline risks" 2): Svelte may keep anchors in the detached container under (a). Prove it
  in the spike before writing ten more stories. Fall back in order (a) → (b) → (c).
- **The 4-per-title check**: any title with fewer than 4 stories (a spike title, the P-5 plant title in the visual
  run) makes the visual harness throw. The P-5 plant only exists in the storybook-build planted run, so it never meets
  the visual harness. A stray committed spike file would.
- **Orphan baselines**: a spike-only id written by `--update` leaves an orphan PNG and fails the parity test. Use
  catalogue ids only, and delete any stray PNG.
- **Settle timing**: a "with data" story switching state before its reads settle shows `loading` under the banner.
  Page chains can issue a read after an earlier one settled, so re-check on the microtask.
- **State strings**: a misspelt state (for example `degraded:service-missing` without the space) fails typecheck only
  if the value is typed as `ConnectionState`. Type every `state` argument; never cast.
- **Existing baselines churn** under `visual:update`: restore them; R5-01 must pass.
- **Lockfile drift**: a non-frozen install that resolves anew would add packages and break R-16. Stop and report.
- **P-6 anchor absent or duplicated** in WP06's file: a change request to WP06, not an edit here.
- **Visual cost**: about 0.6 min more per run (R-12). Record the measured step. If it nears 28 min (NFR-005), report
  it.
- **Memory**: Storybook builds and the pinned-image runs are heavy. Run them only under `heavy`, in the foreground, one
  at a time.

## Reviewer Guidance

- Diff `main.ts`: the mission-ui glob is unchanged and first, the shell glob is added, and the plugin call is exactly
  `svelte({ configFile: false, preprocess: vitePreprocess() })`.
- **Lockfile**: `git diff "$base" -- pnpm-lock.yaml` changes only the `apps/storybook:` importer. Check that the
  `packages:` section is unchanged, then run `pnpm install --frozen-lockfile`.
- `apps/storybook/package.json`: three exact pins, and `scripts` unchanged.
- **The spike record**: which option won and why. Under (c), confirm the wrapper mirrors `tier` and say that the
  registration check covers the wrapper.
- **`storyClient`**:
  - imports `../testing` (no exemption in `eslint.config.mjs`) and does not use `setConnectionState`;
  - wraps every `READ_OPS` read;
  - keeps `whenSettled()` and the microtask switch with its re-check;
  - empty `changes.items`;
  - no global timers.
- **Stories**: rebuild and compare `index.json` with the catalogue table, 11 ids exactly, `vw-1280` on each.
  Contract-mismatch has no `startConnected`, so no reads are issued.
- **Candidates**: open all eleven PNGs and check each composition (Refresh only on Ops and Artifact, banners visible,
  data filled where the composition says "with data").
- **Non-vacuity of P-6**: re-run `heavy pnpm gate-proof leg --gate visual` if time allows, or at minimum confirm in
  the implementer's log that the clean run passed without the token and the planted run printed it. Confirm that the
  `find` string occurs exactly once in `ConnectionBanner.svelte`.
- **P-5**: the base storybook-build plant is retained unchanged. The new token is failure-only, and the leg log shows
  both plants failing.
- **R5-01**: repeat the baseline diff. `git diff --name-only "$base" -- apps/storybook/tests/visual/__snapshots__/`
  lists only the eleven `shell-*.png`.
- **Mission-ui, the harness and the frozen surface**: `git diff "$base" -- packages/mission-ui scripts/visual.sh
  apps/storybook/playwright.config.ts` is empty, and so is `apps/storybook/tests/visual` apart from the PNGs.
- **Hygiene**: no local paths, usernames or real data in the stories, plants or `storybook-static`.
- The WP stopped at the candidate commit; it did not create `design-review.md` or `design-review.sha256`.

## Implementation command

`spec-kitty agent action implement WP08 --agent claude`
