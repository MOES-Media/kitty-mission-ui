# Changelog

All user-visible changes to this repository. Per-package notes live in `packages/mission-ui/CHANGELOG.md`.

## Unreleased

### Added

- **An application shell screen with a project and a mission layout that adapts from desktop to phone width**
  (`app-shell-01M3V82X`). `sk-mission-shell` brings the top bar, rail, sidebar and content column, three responsive
  tiers, an overlay drawer and a flyout, with 42 visual baselines; its design-library gaps are recorded in
  `packages/mission-ui/CHANGELOG.md`.
- **Contributors can build and preview mission screens in a Storybook workbench, set up in two commands** (`#1`).
  Before, the repository held only its charter. Now `pnpm install` and `pnpm storybook` open a workbench that renders
  elements with the real Spec Kitty design system (`@spec-kitty/tokens`, `styles`, `elements` 1.1.0-rc.10), with an
  API table per element.
- **A ready-made template for new screens** (`#1`). `sk-mission-sample` shows the screen contract: data in as
  properties, a `status` view state (ready, empty, loading, error) with one story each, typed `sk-*` events out, no
  network or storage calls, and visible text in design-system slots.
- **A clear message instead of an opaque 401 when the registry credential is missing or rejected** (`#1`).
  `pnpm install` and `pnpm preflight` name the missing `~/.npmrc` line (or, in CI, the `NPM_TOKEN` secret).
- **Every pull request is checked against the charter, one named check per rule** (`#1`). Typecheck, lint,
  design-token-only CSS, no I/O in screens, declared properties and events, secret and path hygiene, Storybook build,
  unit tests and screenshot comparison in a pinned Playwright container; `Gate: all` fails if any check fails or is
  skipped.
- **Proof that each check can actually fail** (`#1`). For every gate, CI plants a violation and confirms the gate
  rejects it while the clean run passes, using the same command the gate job runs; `pnpm gate-proof` does the same
  locally.
- **Contributor guide** (`#1`). `README.md` covers setup, the credential, the screen contract, every gate, adding an
  element, and the gates' known limitations.
