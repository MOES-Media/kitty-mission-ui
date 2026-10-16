# Changelog

All user-visible changes to this repository. Per-package notes live in `packages/mission-ui/CHANGELOG.md`.

## Unreleased

### Added

- **Kitty core: the shared host core that finds, supervises and reads from the Mission Status service** (`#19`). Before,
  `crates/kitty-core` was a skeleton, so each host would have had to start the service and talk to it on its own. Now
  Kitty Desktop (#20) and Kitty Dashboard (#21) get one tested core.
  - **Discovery.** A configured absolute path, then `KITTY_MISSION_STATUS_SERVICE`, then a `PATH` search for
    `mission-status-api` over absolute entries. An explicit choice that is invalid never falls back. Discovery runs at
    the first start, on `retry()` and at every restart after a crash.
  - **Supervision.** One service process group per `Core`, started with only the two upstream launch options and a
    cleared environment. A crashed service restarts after 0.5, 1, 2 and 4 s; the 5th crash within 300 s stops it.
    On Linux the service dies with its parent. Dropping the last `Core` clone kills the group; `stop().await` stops it
    gracefully.
  - **The digest check.** Before a service counts as `Ready`, its contract document must hash to the pinned digest.
    A mismatch stops the service and answers every read and stream with `ContractMismatch`, without sending a request.
  - **Relay.** `Core::read` and `Core::open_stream` return the service's answer unchanged (a non-2xx answer is relayed as it is, not turned into an error; before `Ready`, or on a mismatch, a read returns `NotReady` or `ContractMismatch` instead), and
    `forward()` passes a request through for the dashboard. Relay latency measured here: p50 138 us, p95 157 us in a
    debug build, and p50 34 us, p95 48 us in a release build.
  - **Host API.** `CoreConfig::new(project_root)` fills all ten fields with the documented defaults, and a host overrides one with `CoreConfig { x, ..CoreConfig::new(root) }`. `CoreConfig` has no `Default` and is not `#[non_exhaustive]`. `ReadOutcome`,
    `StreamOpenError`, `SupervisionState`, `DegradedReason`, `Actual`, `MissingReason`, `TransportFailure`,
    `UnavailableReason`, `StreamEvent` and `StreamDiagnostic` are `#[non_exhaustive]`, so a host's `match` needs a `_ =>` arm. `StreamOpenError` is not `Copy`.
    `connection_state_hint` maps a status to the five `ConnectionState` strings of the shell's port. A pin that cannot
    be parsed gives `Stopped` with `ContractMismatch`, an all-zero `expected` digest that a host must not show or
    compare, and an `Unparseable` `actual`.
  - **Stub extensions.** `kitty-stub` accepts `--openapi`, `--select`, `--select-fixture` and the service's own launch
    options `--mission-status.port` and `--mission-status.project-root`, and reads `<project-root>/.kitty-stub/fixtures`
    by default, so Kitty core can supervise it as a stand-in for the service.
  - **A generated contract bundle.** `contracts/fixtures/mission-status.openapi.json`, written by
    `pnpm contract:generate` and checked by `Gate: contract`. One new planted defect (a stale bundle) proves the check.
  - **Proof-leg timeouts.** The `contract` proof leg rises from 19 to 21 minutes, by the formula for the larger plant
    set. The `rust` leg stays at 5. Both are re-derived from the pull request's first CI run.

  Notes for #20, #21 and #22:
  - **#20.** Windows needs Job Objects and `PATHEXT` handling, which Kitty core does not have. A GUI app started by
    launchd on macOS gets a minimal `PATH`, so configure a service path. macOS has no parent-death signal, so a
    host that exits with `std::process::exit` (as Tauri's app exit does) leaves the service running, so call
    `stop().await` before exiting. A macOS-quarantined binary that the system kills at every launch is retried on a
    new port, up to three launches per start, without using a crash slot. After five failed starts (up to fifteen
    launches, 7.5 s of backoff in total) the status is `service-missing` with the reason `crashing`.
  - **#21.** `forward()` sends exactly a `Host` and the caller's `Accept` header, and puts no cap and no deadline on the
    response body: apply your own limits. `forward()` does not send `Last-Event-ID`, so to resume a stream, put the `streamCursor` you last saw in the request target. It resumes only a stream scoped by `missionId`. A refused stream whose body is over 16 MiB or never ends arrives as
    `Unavailable`, not `Refused`.
  - **Limits that hold for every host.** `PR_SET_PDEATHSIG` reaches only the direct child, so grandchildren of the
    service can survive a hard host death. The socket-ownership check is Linux-only and fails open when `/proc/net/tcp`
    cannot be read. The contract digest is not authentication. `TransportFailure::Timeout` also covers connect and
    head timeouts; `TransportFailure` carries no status. On `Lagged` from `Subscription.receiver`, re-read `core.status()`.
  - **#22.** The service needs a liveness endpoint, because a hung service whose process stays alive stays `Ready`. It
    should exit when its parent dies, identify its project and pid, run in its own session (`setsid`), accept
    `JAVA_HOME` through `env_passthrough`, and say whether its contract document is bundled or unbundled.

- **Phase 0 bootstrap: Kitty Desktop and Kitty Dashboard can now be built on one shared shell, one client interface and
  a local stand-in for the Mission Status service** (`#17`). Before, the repository held only the Lit screens, with no
  host to run them in and no way to exercise them against service data. Now the hosts (#20, #21) and the next missions
  (#18, #19) start from a settled interface and a stub they can test against.
  - `@moes-media/mission-shell` (Svelte 5.57.1, no I/O): the transport-free `MissionStatusClient` port with one method
    per contract read (reads never reject), a change subscription with in-band `refused` and `resync` changes and a
    documented lifecycle, and five connection states starting at `connecting`; an in-memory fixture
    adapter with an injectable scheduler, on its own `@moes-media/mission-shell/testing` entry; element typings generated from `custom-elements.json` by `scripts/typings.mjs`; and a permanent binding
    check that mounts the real `sk-missions-screen` and proves data arrives as properties and every declared intent
    reaches the shell.
  - A Rust workspace pinned to Rust 1.98.1 (`rust-toolchain.toml`): `crates/kitty-core`, `crates/kitty-stub` and
    compile-only placeholders for Kitty Desktop (`apps/desktop/src-tauri`) and Kitty Dashboard
    (`apps/dashboard/server`), with exact `=x.y.z` pins and a committed `Cargo.lock`, judged by a new `Gate: rust`
    (format, clippy with `-D warnings`, tests; offline after separate install and fetch steps).
  - `kitty-stub`: a loopback-only HTTP and SSE stand-in that serves every vendored example and fixture, applies the
    service's Host, Origin and forwarding-header rules, replays a scripted change sequence identically on every run, and
    resumes a Mission's stream deterministically from a cursor.
  - Shared contract data in `contracts/fixtures/`: generated examples, fixtures and routes, plus the hand-authored change
    sequence, all checked by `Gate: contract`.
  - The existing gates reach the new code: `svelte-check` in `typecheck`, Svelte files in `eslint`, `stylelint`,
    `no-io` and `data-driven`, stale typings in `manifest`, and `unit-tests` running every workspace package. `hygiene`
    gains a Cargo exact-pin check and checks the action pins, permissions and checkout credentials of every workflow.
    24 new planted-defect proofs; the proof-leg timeouts come from the pull request's first CI run.
  - A scheduled `Contract drift` workflow (daily and on demand, not a gate, no secrets) reports upstream contract files
    that differ from `PIN.json`.
  - mission-ui's screens, stories and baselines are unchanged.
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
  `sk-open-missions`, `sk-retry-load`). 38 new Storybook stories under `Screens/Drift/` with one visual baseline each (293 in
  total), a story-catalogue test, and CI timeouts re-derived for the larger set (the proof leg rises to 55 minutes). Layout exceptions E-35 to E-39 and an extension of
  E-18 are recorded in `stylelint.config.mjs`.
- **Drift contract wiring: view types, 17 fixtures, the `drift-vocabulary-open` relaxation and a 1000-finding generator** (`#10`).
  `pnpm contract:check` also validates the generated report of exactly 1000 findings; a plant removes the relaxation.
- **An Ops screen: the project's invocation records, newest first, read only** (`#11`). `sk-ops-screen` shows the page header,
  the source notice, the count badge, one row per record (outcome, profile, action, actor, times in UTC, evidence, Mission,
  Work Package, mode) and Load more, with loading, empty and error looks. A host passes contract-shaped data only; the screen
  performs no I/O, never links a value of a record, and emits two events (`sk-load-more`, `sk-retry-load`). Exceptions E-40,
  E-42 and E-43, and the grants Ops G-1 to Ops G-7. 37 new Storybook stories under `Screens/Ops/` with one visual baseline each
  (330 in total). CI timeouts rise for the larger set: `proof (visual)` from 55 to 60 minutes, and the `unit-tests` proof leg from 10 to 11.
- **`Gate: eslint` refuses an aliased lit `css` import** (`#11`). `import { css as x }` hid the template from postcss-lit and
  so from every Stylelint rule.
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
