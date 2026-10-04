# Changelog

All user-visible changes to this repository. Per-package notes live in `packages/mission-ui/CHANGELOG.md`.

## Unreleased

### Added

- **A Missions screen and a Pipeline screen, built from the design library and the pinned Mission Status contract** (`#4`).
  The Missions screen lists a project's Missions with a status filter, search and Load more; the Pipeline screen shows one
  Mission's phase bar, its work packages on a five-column board and an inspector. A host passes only contract-shaped data,
  its branch, `now` and the optional `stale` and actor values; the screens perform no I/O. 60 new Storybook stories with
  visual baselines (118 in total), CI timeouts for the visual and unit-test gates derived from recorded runs, and a check
  that the word "feature" never appears in the screens' source (the term is "mission").
- **A new check keeps phase names, status lanes and status words out of the screens' source** (`#4`).
  `Gate: data-driven` fails when element-scope code hard-codes one of the five phase names, the nine status lanes or
  `pending`, `complete`, `draft`, `discarded`, so a later dynamic pipeline needs no screen change. Inline
  `eslint-disable` comments no longer silence it, nor the `no-io` gate.
- **The Mission screens are built against a pinned copy of the spec-kitty Mission Status contract, and a new check keeps
  it honest** (`#4`). The contract is vendored byte for byte, its types and 22 synthetic fixtures are generated from it,
  and `Gate: contract` fails when the copy drifts from its pin, a generated file is stale, or a fixture is not a valid,
  coherent contract document. Hygiene now also rejects e-mail addresses in the contract and fixture paths, and the
  `node:test` suites of the gate scripts run inside the hygiene gate.
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
