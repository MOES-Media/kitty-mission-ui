# Contract: shell stories and visual baselines (FR-018, SC-006, SC-007)

## Where the stories live

- The stories are `packages/mission-shell/src/stories/connection-banners.stories.ts` and `layouts.stories.ts`.
  mission-ui is byte-unchanged (C-002, SC-006).
- `apps/storybook/.storybook/main.ts` lists them through a second glob and compiles Svelte through
  `@sveltejs/vite-plugin-svelte` (`research.md` R-07).
- Each story's `render` mounts `MissionShell` and returns its root `sk-mission-shell` element. The visual harness then
  applies its usual checks to that element:
  - it is registered;
  - its `tier` matches the `vw-*` tag;
  - nested elements settle;
  - the Inter font is loaded;
  - the screenshot is not blank;
  - there is a baseline per story.
- The harness, `scripts/visual.sh` and `playwright.config.ts` are unchanged.

## Catalogue (11 stories; the harness needs 4 or more per title)

| Title | Story id | Tags | Composition |
|---|---|---|---|
| Shell/Connection banners | `shell-connection-banners--connecting-1280` | `vw-1280` | project layout, Missions, `connecting` |
| | `shell-connection-banners--reconnecting-1280` | `vw-1280` | project layout, Missions with data, `reconnecting` past the grace period |
| | `shell-connection-banners--service-missing-1280` | `vw-1280` | project layout, Missions with data, `degraded: service-missing` |
| | `shell-connection-banners--contract-mismatch-1280` | `vw-1280` | project layout, Missions without data (`error`), `degraded: contract-mismatch` |
| | `shell-connection-banners--live-updates-off-1280` | `vw-1280` | project layout, Missions with data, refused stream |
| Shell/Layouts | `shell-layouts--project-missions-1280` | `vw-1280` | project layout, Missions, no Refresh (desktop: "All projects" footer) |
| | `shell-layouts--project-ops-1280` | `vw-1280` | project layout, Ops, Refresh shown |
| | `shell-layouts--mission-pipeline-1280` | `vw-1280` | mission layout, Pipeline, no Refresh |
| | `shell-layouts--mission-artifact-1280` | `vw-1280` | mission layout, Artifact selected, Refresh shown |
| | `shell-layouts--picker-projects-1280` | `vw-1280` | picker layout, Projects (desktop, client null, recorded host with entries) |
| | `shell-layouts--dashboard-project-1280` | `vw-1280` | project layout, Missions, `mode: 'dashboard'` (no "All projects", no Projects rail item) |

- Story data:
  - the fixture adapter's default examples, with a story-local `connection` of a fixed state (`research.md` R-08);
  - an immediate scheduler, so the reconnecting grace has passed when the shot is taken;
  - a fixed clock, so relative times are stable.
- No story contains real user data, an absolute path or an OS username (charter; hygiene gate).

## Baselines and approval

- Baselines are produced only inside the pinned Playwright image (`pnpm visual:update`, which runs `scripts/visual.sh`).
  Locally that is run as `heavy pnpm visual:update`, in the foreground.
- The eleven PNG files are approved at **CP-1** (`plan.md`, "Design review"), and their sha256 values are recorded in
  `kitty-specs/mission-shell-01M50D2J/design-review.md`.
- The baseline-parity test of the harness adds them to its count automatically.

## Plants

- **storybook-build.** `packages/mission-shell/src/stories/plant-shell-storybook.stories.ts`, which imports
  `./plant-shell-storybook-missing`. The build fails with the token `plant-shell-storybook-missing`. This proves the
  shell glob is built.
- **visual** (moved from `sk-mission-sample` by the operator's ruling on research R-12, option A): an anchored edit in `packages/mission-shell/src/ui/ConnectionBanner.svelte` that
  changes the banner's appearance (its gap token), with the token `shell-connection-banners--reconnecting-1280-diff.png`
  and `prepare: pnpm storybook:build-only`.
