# Contract: shell stories and visual baselines (FR-018, SC-006, SC-007)

## Where the stories live and how they mount

- The stories are `packages/mission-shell/src/stories/connection-banners.stories.ts` and `layouts.stories.ts`.
  mission-ui is byte-unchanged (C-002, SC-006).
- `apps/storybook/.storybook/main.ts` adds the glob `../../../packages/mission-shell/src/**/*.stories.ts` and the
  plugin `svelte({ configFile: false, preprocess: vitePreprocess() })` (research R-07).
- Each `render` mounts `MissionShell` with Svelte's `mount()` and returns the root `sk-mission-shell` element.
- A meta-level `beforeEach` returns a cleanup that unmounts that instance, so no shell outlives its story (R4-07).
- The stories import `createFixtureClient` from `../testing`. No ESLint boundary exemption is added (research R-08).
- The visual harness applies its usual checks:
  - the element is registered;
  - its `tier` matches the `vw-*` tag;
  - nested elements settle;
  - the fonts are loaded;
  - the screenshot is not blank;
  - there is one baseline per story.
- The harness, `scripts/visual.sh` and `playwright.config.ts` are unchanged; they are on the frozen list of research
  R-17.

## Story data (R2-12, R1-01)

- **Client.** `storyClient({ state, reads })` is story-local. `connection` reports a fixed state. `reads: 'fixture'`
  delegates to `createFixtureClient(...)`, and `reads: 'unavailable'` resolves every read as
  `{ ok: false, unavailable: 'contract-mismatch' }`.
- **Fixture.** The fixture is always created with `fixtures: { changes: { missionId: <the sequence id>, items: [] } }`,
  so no change replays during a story.
- **Refused story.** The `live-updates-off` story selects `examples: { streamEvents: 'StreamRefusal.content-mismatch' }`.
- **Time.** An immediate `ShellScheduler` and a fixed clock.
- **Hygiene.** No real user data, absolute paths or OS usernames.

## Catalogue (11 stories; the harness needs 4 or more per title)

| Title | Story id | Tags | Composition |
|---|---|---|---|
| Shell/Connection banners | `shell-connection-banners--connecting-1280` | `vw-1280` | project layout, Missions, `connecting` |
| | `shell-connection-banners--reconnecting-1280` | `vw-1280` | Missions with data, `reconnecting` past the grace period |
| | `shell-connection-banners--service-missing-1280` | `vw-1280` | Missions with data, `degraded: service-missing` |
| | `shell-connection-banners--contract-mismatch-1280` | `vw-1280` | Missions without data (`reads: 'unavailable'`, `error`), `degraded: contract-mismatch` |
| | `shell-connection-banners--live-updates-off-1280` | `vw-1280` | Missions with data, refused stream |
| Shell/Layouts | `shell-layouts--project-missions-1280` | `vw-1280` | project layout, Missions, no Refresh (desktop: "All projects" footer) |
| | `shell-layouts--project-ops-1280` | `vw-1280` | project layout, Ops, Refresh shown |
| | `shell-layouts--mission-pipeline-1280` | `vw-1280` | mission layout, Pipeline, no Refresh |
| | `shell-layouts--mission-artifact-1280` | `vw-1280` | mission layout, Artifact selected, Refresh shown |
| | `shell-layouts--picker-projects-1280` | `vw-1280` | picker layout, Projects (desktop, client null, recording host with entries) |
| | `shell-layouts--dashboard-project-1280` | `vw-1280` | project layout, Missions, `mode: 'dashboard'` (no "All projects", no Projects rail item) |

## Baselines and approval (research R-14)

- Candidates are produced only inside the pinned image (`heavy pnpm visual:update`) by IC-08a.
- Approval is at **CP-1**, recorded on `feat/mission-shell-18` in two files:
  - `design-review.md`;
  - `design-review.sha256`, in `sha256sum` format with repository-relative paths.
- IC-08b applies any amendment, regenerates, and re-proves P-6.
- `sha256sum -c kitty-specs/mission-shell-01M50D2J/design-review.sha256` is run by IC-08b's reviewer, IC-09 and the
  pre-merge squad.
- The set of `shell-*.png` files must equal the set listed. A commit or rebase that touches a `shell-*.png` after
  CP-1 reopens CP-1.
- **Baseline integrity** (R5-01). `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/`
  must pass, so no existing baseline is modified, deleted or renamed. Only `shell-*.png` may be added. This is an
  IC-08a and IC-08b exit check and part of IC-09's frozen-surface check, and the reviewer repeats it.

## Plants

- **P-5, storybook-build.** `packages/mission-shell/src/stories/plant-shell-storybook.stories.ts` imports
  `./plant-shell-storybook-missing`. Token: `plant-shell-storybook-missing`.
- **P-6, visual.** This plant moved from `sk-mission-sample` (decision `01M50HMCBJMREJ5XJASGE29X73`). It is an anchored
  edit in `packages/mission-shell/src/ui/ConnectionBanner.svelte`:
  - find `reconnecting: { tone: 'attention', announce: 'polite' },`;
  - replace with `reconnecting: { tone: 'danger', announce: 'polite' },`.

  The tone change is a guaranteed visible change (R5-12, R6-01). Token:
  `shell-connection-banners--reconnecting-1280-diff.png`. The plant keeps `prepare: pnpm storybook:build-only`.
  IC-08a proves it once locally (`heavy pnpm gate-proof leg --gate visual`), and IC-08b re-proves it after any
  amendment.
