# Changelog

All user-visible changes to this repository. Per-package notes live in `packages/mission-ui/CHANGELOG.md`.

## Unreleased

### Added

- **A Projects screen and a picker layout for the shell** (`#9`). `sk-projects-screen` lists a host's projects with their
  health, Mission count, branch and last activity, and reports which one to open; `sk-open-project-dialog` is an optional
  modal folder picker. The host passes contract-shaped `Project` data and performs the folder picking itself; the elements
  perform no I/O and emit `sk-open-project`, `sk-request-open-project`, `sk-browse-folder`, `sk-confirm-open-project` and
  `sk-retry-load`. `sk-mission-shell` gains the `picker` layout (top bar and content only). 36 new Storybook stories
  with one visual baseline each (210 in total); the visual job timeouts rise to 28 minutes (job) and 47 (proof leg),
  derived from run 37584109220.
- **The contract copy moves to Mission Status contract commit `805e122`, on spec-kitty `main`: `Project` carries seven members** (`#9`). `name`, `missionCount`, `specKittyVersion`, `schemaVersion`, `health` (new `ProjectHealth`), `currentBranch` and `lastActivityAt`, with two host fixtures (`projectUnknownHealth`, `projectLong`); the vendored copy also gains the drift and Op invocation paths. No screen changes and no visual baseline changes.
- **An Artifact screen: the documents of one Mission, drawn from the pinned Mission Status contract** (`#7`).
  `sk-artifact-screen` shows the Mission's artifact tree, one document as rendered markdown or raw source, and an inspector
  with the file facts, the Mission facts and the linked Work Packages. A host passes only contract-shaped data, the
  Mission, the view states, `now` and labels; the screen performs no I/O and emits five events (`sk-select-artifact`,
  `sk-open-link`, `sk-select-work-package`, `sk-open-mission`, `sk-retry-load`). Markdown goes through a closed allow-list
  renderer over `markdown-it` 15.0.2 (a new dependency) with lint rules and a hostile-input corpus that keep raw HTML,
  remote images and script URLs out. 45 new Storybook stories with one visual baseline each (255 in total).

- **A Drift screen: the findings of a drift scan and the detail of the chosen one, drawn from the pinned Mission Status
  contract** (`#10`). `sk-drift-screen` shows a header with the last scan and Rescan, a finding list, and a detail with the
  explanation, authority panel, lane comparison table, suggested resolution with Copy and facts, plus the loading, clean,
  truncated, rescanning, unreadable, not-found and nothing-chosen states. A host passes only contract-shaped data; the
  screen performs no I/O and emits six events (`sk-select-finding`, `sk-rescan-drift`, `sk-copy-command`, `sk-open-mission`,
  `sk-open-missions`, `sk-retry-load`). 38 new Storybook stories under `Screens/Drift/` with one visual baseline each, a
  story-catalogue test, and CI timeouts re-derived for the larger set. Layout exceptions E-35 to E-39 and an extension of
  E-18 are recorded in `stylelint.config.mjs`.
- **Drift contract wiring: view types, 17 fixtures, the `drift-vocabulary-open` relaxation and a 1000-finding generator** (`#10`).
  `pnpm contract:check` also validates the generated report of exactly 1000 findings; a plant removes the relaxation.
- **A Work Package screen: one Work Package of a Mission, drawn from the pinned Mission Status contract** (`#5`).
  `sk-work-package-screen` shows the header and facts, lane history, review summary and cycles, the evidence and dependency
  chains, subtasks, owned files, workspace and links to the spec, prompt and review files. A host passes only
  contract-shaped data, the Mission, `now` and optional lane-word hooks; the screen performs no I/O and emits four events
  (`sk-select-work-package`, `sk-open-mission`, `sk-open-artifact`, `sk-retry-load`). 56 new Storybook stories under
  `Screens/Work Package/` with one visual baseline each (174 in total), and CI timeouts re-derived for the larger set.
- **The vocabulary of the Work Package screen lives in one place, and `Gate: data-driven` guards it** (`#5`). Review,
  change-state, staleness, refusal and screen copy are in `src/defaults/` only, with small logic functions beside the
  Mission ones; the gate now also rejects the verdict, change-state and staleness words outside `src/defaults/`.
- **The contract copy moves to Mission Status contract commit `b61d1fa`, on spec-kitty `main`, with 48 new fixtures** (`#5`).
  The Work Package detail screen reads Work Package, review cycle, workspace and artifact-reference data. The pin is
  taken from `main` (`provenance: main`), `contract:check --require-main` passes and `contract:verify-remote` confirms the
  bytes. `Gate: contract` also checks Work Package coherence and actor handles.
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
- **Screens can run their content to the edges of the mission shell** (`#4`). `sk-mission-shell` gains a `flush`
  option and a public `--sk-mission-shell-content-padding` property, so a screen that needs edge-to-edge panels (the
  Pipeline's phase band and current-step sidebar) no longer undoes the shell's padding with negative margins.
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

### Changed

- **Hygiene has no allow-list and blocks private-workspace markers.** CLI-written paths in the charter and in the
  mission status files are scanned like any other file; agent scratchpad paths, tooling-ledger ids (`SK-` and three or
  more digits) and the running account's username (plus `HYGIENE_FORBIDDEN_NAMES`) are reported in every tracked file.

- **The repository is now `kitty-mission-ui`, licensed AGPL-3.0-or-later.** The packages are renamed
  `@spec-kitty/mission-ui` to `@moes-media/mission-ui` and `@spec-kitty/storybook-app` to `@moes-media/storybook-app`;
  every `package.json` declares `"license": "AGPL-3.0-or-later"`. The design library (`@spec-kitty/elements`,
  `@spec-kitty/styles`, `@spec-kitty/tokens`) keeps its scope and registry.

- **💥 The mission sample's open event is now `sk-open-mission`** (`#4`). Hosts that listened for `sk-mission-open`
  on `sk-mission-sample` must listen for `sk-open-mission`; it carries the same detail type as the Missions screen, so
  one listener serves both. New events follow the verb-noun form; the shell's older event names are unchanged.
