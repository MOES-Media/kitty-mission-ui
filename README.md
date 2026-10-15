# kitty-mission-ui

Shared Spec Kitty mission screens (Lit web components) for the dashboard and Kitty Desktop.
Storybook is the workbench and the visual source of truth. The package is `@moes-media/mission-ui`.

## Setup

Prerequisites (one-time):

- Node 22.22.2, as pinned in `.nvmrc` (for example `nvm install` or `fnm use`).
- pnpm 11.18.0, installed directly (for example `npm install -g pnpm@11.18.0`). corepack is not used.
- A GitHub token that can read the `spec-kitty` organisation's GitHub Packages (`read:packages`, SSO authorised), see the
  next section.
- For the visual gate only: podman or docker.

### Credential

This repository is public, but the Spec Kitty design library it builds on is not: `@spec-kitty/tokens`,
`@spec-kitty/styles` and `@spec-kitty/elements` are installed from the spec-kitty organisation's GitHub Packages
registry (`.npmrc` maps the `@spec-kitty` scope to `https://npm.pkg.github.com`), and every install needs a read token.
The token must belong to an account that can read those packages; a token scoped to another organisation is not enough.
Add this line to your own user-level `~/.npmrc`, replacing `<token>` with your token:

```
//npm.pkg.github.com/:_authToken=<token>
```

- Do not use `NODE_AUTH_TOKEN` or `NPM_TOKEN` in your shell: pnpm ignores them for this scope.
- Never put the token in the repository `.npmrc` (it holds only the `@spec-kitty:registry` scope line), in a
  story, a fixture or any committed file. The hygiene gate fails on it.
- If the line is missing, `pnpm install` stops before resolving anything with a message that starts
  `Missing GitHub Packages credential for @spec-kitty/*` and names `~/.npmrc`.
- `pnpm preflight` runs the same offline check, then asks the registry. Exit codes: 9 credential missing,
  10 token rejected or expired (401), 11 token cannot read `@spec-kitty/elements` (403/404: needs `read:packages`
  and org access, SSO authorised), 12 registry unreachable. The token is never printed.
- CI reads the repository secret `NPM_TOKEN`. The workflow does not use the built-in `GITHUB_TOKEN`: that token is
  scoped to the repository's own organisation and cannot read the spec-kitty packages. `NPM_TOKEN` must be a
  personal access token (classic, `read:packages`, SSO authorised for the spec-kitty organisation) of an account
  with read access to the design-library packages; create it as a repository secret before the first CI run. Pull
  requests from forks and from Dependabot receive no secrets, so they fail `Gate: preflight` with the `NPM_TOKEN`
  message by design.

## Run the workbench

```bash
pnpm install
pnpm storybook
```

Storybook serves on port 6006. The four stories (`Ready`, `Empty`, `Loading`, `Error`) of the sample element are
under "Mission / Sample", plus an autodocs page.

## The screen contract

Every screen element in `packages/mission-ui/src/elements/` follows the charter:

- Data in as properties; a `status` property carries the view state `loading`, `error`, `empty` or `ready`. The Work Package
  screen adds `not-found` and `nothing-selected`, and a separate `detailStatus` for its detail regions.
- User intents out as `sk-*` CustomEvents with `bubbles` and `composed`, dispatched as
  `this.dispatchEvent(new CustomEvent('<string literal>', ...))` so the manifest can see them.
- No I/O: no fetch, XHR, WebSocket, Tauri API or browser storage. Hosts own fetching, routing and refresh.
- Every public property and event is declared in `packages/mission-ui/custom-elements.json`.

### Elements over CSS

- Every primitive `@spec-kitty/elements` provides (card, notice, pill tag, status indicator, button, ...) is rendered
  with its `sk-*` element. No raw `<button>`, `<input>`, `<select>`, `<textarea>`, no `class=`, no inline `style=`,
  no `styleMap` or `unsafeCSS` in element templates (ESLint).
- Project CSS is layout only (grid, flex, gaps) and uses `--sk-*` tokens. Stylelint rejects colour and font literals and
  any unit except `%` and `fr`.
- A primitive the library lacks is a component gap for the design library, not something to hand-roll. A temporary
  stand-in needs an exception recorded in the PR.
- Visible text of an `sk-*` element goes in its default slot. For `sk-button`, the `label` attribute is only the
  accessible name: `<sk-button label="Open">` alone renders a blank button. `sk-status-indicator` likewise colours
  its slotted text, so text placed in a sibling span loses its colour. Check the element's slots in the
  `@spec-kitty/elements` custom-elements manifest before using it.

## The Work Package screen

`sk-work-package-screen` shows one Work Package of a Mission: the header, facts, lane history, review summary and cycles,
the evidence and dependency chains, subtasks, owned files, workspace and links to the spec and prompt. A host passes
contract-shaped data only. Ten properties: `status` (`loading`, `error`, `empty`, `ready`, `not-found`,
`nothing-selected`), `detailStatus` (`loading`, `ready`, `error`, `not-found`), `detailRefusalCode`, `workPackage`,
`detail`, `mission`, `wpId`, `now`, `labels` (optional lane-word hooks) and `errorMessage`. Four events, each with
`bubbles` and `composed` true: `sk-select-work-package` (a dependency node), `sk-open-mission` (the Mission crumb or
"Return to Pipeline"), `sk-open-artifact` (the spec, prompt or a review cycle) and `sk-retry-load` (Retry, for the whole
screen or for a refused detail). The screen performs no I/O and draws every status and lane word from the tables in
`src/defaults/`. Its 56 stories are under `Screens/Work Package/` (five titles), with one visual baseline each. The
walkthrough is `kitty-specs/work-package-screen-01M44DSJ/quickstart.md`.

Lane words come in two kinds, and a host that rewords a lane sets both hooks of `labels`: `state` (a word and a tone) draws
the state badge, the dependency and subtask lane words and the cancellation badge, while `lane` (a word) draws the lane
history's "from" and "to" words. Setting one leaves the other kind on its defaults.

Retry ownership: the shell owns a whole-page failure (`sk-shell-retry`); a screen owns the failure of its own regions
(`sk-retry-load`). The `sk-retry-load` payload is a union keyed on `target`; this screen's members are `'work-package'` and
`'detail'`, and a later screen adds its own member to the union instead of declaring the event again.

## Running the tests

`pnpm test` runs two Vitest projects in the same Chromium setup, one after the other and never together: `unit` (every test file except `*.perf.test.ts`) and then `perf` (only `*.perf.test.ts`, with `fileParallelism: false`, so one file at a time). Run one project with `pnpm --filter @moes-media/mission-ui exec vitest run --project unit` (or `--project perf`).

A test that measures wall-clock time against a ceiling (`within 200 ms`, an NFR budget) belongs in a sibling `<name>.perf.test.ts`, so that it is not timed while other test files share the browser. The ceilings are not loosened by this. `scripts/perf-split.test.mjs` (part of `pnpm test:scripts`) fails when a file that calls `performance.now()` and asserts a ceiling is not a `*.perf.test.ts`, and when a `*.perf.test.ts` has none. Helpers that a unit file and its perf sibling both need live in `packages/mission-ui/test/support/`.

## The Projects screen

`sk-projects-screen` lists the projects a host knows about and reports which one to open. The optional widget
`sk-open-project-dialog` is a host-placed modal folder picker. The host does the real folder picking, listing and
routing; both elements only draw and report, and neither performs I/O. Every health and time word comes from
`src/defaults/`, and the host's order is the display order.

`sk-projects-screen`:

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `status` | `status` | `ViewState` | `loading` | an unknown value collapses to `empty` |
| `entries` | none | `ProjectEntry[]` | `[]` | `{ key, location, project }`, never sorted or filtered |
| `now` | `now` | `string \| null` | `null` | ISO instant for relative times |
| `labels` | none | `ProjectLabelHooks \| null` | `null` | optional `time` and `health` hooks |
| `errorMessage` | `error-message` | `string` | `''` | overrides the default list-error body |

| Event | Detail | When |
|---|---|---|
| `sk-open-project` | `{ key }` | an openable row is activated (click, Enter, Space) |
| `sk-request-open-project` | none | the header "Open project" button, which is also the empty state's action (one button, shown once) |
| `sk-retry-load` | `{ target: 'project', key }` or `{ target: 'projects' }` | retry of a failed row or a failed list |

`sk-open-project-dialog`:

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `open` | `open` | `boolean` | `false` | the element sets it false on Cancel, Escape and a backdrop click |
| `location` | `location` | `string` | `''` | shown in the read-only folder field |
| `folders` | none | `FolderEntry[]` | `[]` | host order |
| `selected` | none | `string \| null` | `null` | the `location` of the selected folder, controlled by the host |
| `status` | `status` | `ViewState` | `ready` | the folder listing |

| Event | Detail | When |
|---|---|---|
| `sk-browse-folder` | `{ location }` | a folder option is selected |
| `sk-confirm-open-project` | `{ location }` | Open, only when the selected folder is valid |
| `sk-retry-load` | `{ target: 'folders' }` | retry of a failed listing |

All events have `bubbles` and `composed` true. The `sk-retry-load` payload stays one union keyed on `target`; this
mission adds the members `'project'`, `'projects'` and `'folders'`.

The shell gains a third layout, `picker`: `sk-mission-shell layout="picker"` draws the skip link, the top bar and the
content slot only, with no sidebar, rail, hamburger or drawer at any tier, and ignores the navigation properties. Any
other unknown layout still falls back to `project`.

```html
<sk-mission-shell layout="picker" status="ready">
  <sk-projects-screen status="ready"></sk-projects-screen>
</sk-mission-shell>
<sk-open-project-dialog></sk-open-project-dialog>
```

```js
screen.entries = [{ key: 'a1', location: '<folder>', project: { name: 'example-app' /* the GET /project body */ } }];
screen.addEventListener('sk-open-project', (e) => route(e.detail.key));
screen.addEventListener('sk-request-open-project', () => (dialog.open = true));
```

Its stories are under `Screens/Projects/Screen`, `Screens/Projects/Tiers` and `Screens/Projects/Open project dialog`.
## The Artifact screen

`sk-artifact-screen` shows the artifacts of one Mission: the file tree (carried by the shell's own tree), one document in a
Rendered or Raw tab, and an inspector with the file facts, the Mission facts and the linked Work Packages. A host passes
contract-shaped data only. Thirteen properties: `status` (`loading`, `error`, `empty`, `ready`, `not-found`,
`nothing-selected`), `contentStatus` (`loading`, `ready`, `refused`, `error`), `listing`, `content`, `refusalCode`,
`selectedPath`, `mission`, `workPackages`, `view`, `now`, `labels`, `errorMessage` and `vocabulary`. Five events, each with
`bubbles` and `composed` true: `sk-select-artifact`, `sk-open-link`, `sk-select-work-package`, `sk-open-mission` and
`sk-retry-load` (target `'listing'` or `'content'`, a member added to the union in `src/retry-types.ts`). The screen performs no
I/O. Markdown is rendered by a closed-allow-list renderer over `markdown-it` (15.0.2, pinned, no raw HTML, no remote
image, no script URL; the lint rules R1 to R5 and the hostile corpus guard it); a document over the size or block budget
falls back to its escaped source with a notice. Its 45 stories are under `Document`, `Refusals and states`,
`Inspector and tree` and `Tiers and edge cases`, with one visual baseline each. The walkthrough and every ruling are in
`kitty-specs/artifact-viewer-screen-01M47VP5/`.

## The Drift screen

`sk-drift-screen` lists the findings of a Mission Status drift scan and shows the chosen finding in a detail pane: kicker,
title, explanation, authority panel, lane comparison table, suggested resolution with a Copy button, and facts. The screen
is read-only: it asks the host to scan again, to retry, to open a Mission or to copy a command, and does nothing else. A
host passes contract-shaped data only. Eleven properties: `status` (`loading`, `ready`, `empty`, `error`, `not-found`),
`report` (the contract's `DriftReport`), `selectedFinding` (host-owned; an incoming change is never re-emitted),
`missionId` (the scope of a scoped scan), `missions` (the host's Mission names, by id), `rescanning`, `copyResult`
(`copied` or `manual`, the host's answer to a copy), `refusalCode`, `now`, `labels` (optional label hooks: `kind`, `severity`, `authority`, `derivedSide`, `refusal`, `lane` and `time`) and
`errorMessage`. Six events, each with `bubbles` and `composed` true and `cancelable` false: `sk-select-finding`
(`{ missionId, kind, artifactPath }`), `sk-rescan-drift` (`{ missionId }`, `null` for the whole project), `sk-copy-command`
(`{ text, missionId, remedy }`; the host owns the clipboard), `sk-open-mission`, `sk-open-missions` and `sk-retry-load`.
The `sk-retry-load` payload is the shared union keyed on `target`; this screen's member is `'drift-report'`.

The screen performs no I/O and draws every kind, severity, authority and remedy word from `src/defaults/`. An unknown
kind, severity, authority, derived side or source code is drawn neutrally with its raw word; an unknown remedy shows no
command. Its 38 stories are under `Screens/Drift/` (four titles), one
visual baseline each: the 33 rows of the specification's state matrix, with DR-07a and DR-07b counted separately and DR-09
dropped, make 32, and six rows carry a second story. All of them sit in the project shell with `nav-drift` current and
`flush` set. The walkthrough is `kitty-specs/drift-screen-01M4C93T/quickstart.md`.

Exceptions to the layout-only rule, each recorded in `stylelint.config.mjs` with token values only: E-35 (the 420 px list
track and the one-column tier; sunset spec-kitty/spec-kitty-design#530), E-36 (the raw `role="option"` finding button, as in the prototype; sunset spec-kitty/spec-kitty-design#527), E-37 (the prototype's
type, colour and pill grants G-1 to G-10 (G-9: the busy Rescan start padding; G-10: the authority pill wraps, `white-space: normal` on that one pill's part) and the 44 px height of Rescan and Copy; sunsets spec-kitty/spec-kitty-design#531, spec-kitty/spec-kitty-design#509, spec-kitty/spec-kitty-design#526, spec-kitty/spec-kitty-design#529, spec-kitty/spec-kitty-design#516, spec-kitty/spec-kitty-design#532, spec-kitty/spec-kitty-design#523, spec-kitty/spec-kitty-design#535 and spec-kitty/spec-kitty-design#533 for the data-table family), E-38 (the command field wraps, a library
gap; sunset spec-kitty/spec-kitty-design#534) and E-39 (`overflow-wrap: anywhere` on slugs and facts; sunset spec-kitty/spec-kitty-design#535), plus the E-18 scope extension to `panel-parts.ts` (sunset spec-kitty/spec-kitty-design#516).

## The Ops screen

`sk-ops-screen` shows the invocation records (Ops) of a project, newest first, read only. A host passes contract-shaped data
only: `status` (`loading`, `error`, `empty`, `ready`), `project`, `items`, `pageInfo`, `totalCount`, `skippedCount`,
`profile`, `loadingMore`, `loadMoreError`, `refusalCode`, `labels` (optional word hooks) and `errorMessage`. Two events, each
with `bubbles` and `composed` true: `sk-load-more` (Load more, once per cursor) and `sk-retry-load` (Try again, or Refresh
from the newest after a refused cursor). The screen performs no I/O, never turns a value of a record into a link, and draws
every word from the tables in `src/defaults/`. Its exceptions are E-40, E-42 and E-43 (row paint and typography, words-only
wrapping, `overflow-wrap: anywhere` on the id and the evidence) and the grants Ops G-1 to Ops G-7 (the fact dividers, the badge
line height, the page badges, the state card, the profile wrap, the empty-look typography and the badge width cap; named "Ops G-n" so they are not
confused with other screens' grants). Its 37 stories are under `Screens/Ops/` (four titles), with
one visual baseline each; a node test (`scripts/ops-story-catalogue.test.mjs`) ties the stories to the specification's state
matrix and pins which baselines may be byte-identical.

## Host workspace

The repository also holds the ground for the two hosts, Kitty Desktop and Kitty Dashboard (Phase 0, issue `#17`): a
Svelte 5 shell over the screens, a Rust workspace, a local stub of the Mission Status service, one shared set of contract
data, and a scheduled upstream drift alert. Real host behaviour arrives in `#18` to `#21`; the real service in `#22`.

### Prerequisites

On top of the [Setup](#setup) prerequisites (Node 22.22.2, pnpm 11.18.0 and the registry credential):

- rustup. `rust-toolchain.toml` pins Rust **1.98.1** with the `rustfmt` and `clippy` components (minimal profile, never a
  floating channel). rustup installs that toolchain on first use, or explicitly with `rustup toolchain install` (with no
  arguments it reads `rust-toolchain.toml`).
- Nothing else: the stub and the placeholders need no system libraries, and there is no Tauri dependency yet (`#20`).

```bash
pnpm install
rustup toolchain install          # the toolchain pinned in rust-toolchain.toml
cargo fetch --locked              # the crates locked in Cargo.lock (the only network step of the Rust gate)
cargo build --workspace --locked
```

### Layout

| Path | What it is |
|---|---|
| `packages/mission-shell` | `@moes-media/mission-shell`, the Svelte 5 shell: the `MissionStatusClient` port, its fixture adapter, the generated element typings and the permanent binding check. No I/O ([its README](packages/mission-shell/README.md)). |
| `crates/kitty-core` | the shared Rust core, a skeleton for now (`#19`). Its `tests/workspace.rs` asserts the exact set of workspace members. |
| `crates/kitty-stub` | `kitty-stub`, the loopback HTTP and SSE stand-in for the Mission Status service. `publish = false`. |
| `apps/desktop/src-tauri` | the Kitty Desktop placeholder: a compile-only binary crate in Tauri's layout, so `#20` adds Tauri without moving files. |
| `apps/dashboard` | the Kitty Dashboard placeholder: a compile-only binary crate (`#21`). |
| `contracts/fixtures/` | the contract data that the shell's fixture adapter and the stub both read (below). |

`Cargo.toml` at the root is the workspace (`crates/*`, `apps/desktop/src-tauri`, `apps/dashboard`). Every dependency is
pinned exactly (`=x.y.z`) in `[workspace.dependencies]`, and `Cargo.lock` is committed. The hygiene gate's `cargo-pins`
check rejects a range in any `Cargo.toml`. I/O is allowed only under `apps/*` and `crates/*`, never under `packages/*`.

### Shared contract data

`contracts/fixtures/` holds four JSON files, derived only from the pinned contract under `contracts/spec-kitty/`:

| File | Source | Content |
|---|---|---|
| `mission-status.examples.json` | generated | every vendored example, keyed `<Schema>.<name>`, read straight from the YAML |
| `mission-status.fixtures.json` | generated | the `valid` fixtures of `scripts/contract/registry.mjs` |
| `mission-status.routes.json` | generated | one entry per contract operation: path, kind, success schema, default example and the allowed refusal statuses per schema |
| `mission-status.changes.json` | hand-authored | the scripted change sequence: a status transition, a lifecycle event and a log-truncated marker, in a fixed order, on one Mission |

Never edit the three generated files by hand: run `pnpm contract:generate`. `Gate: contract` fails when they are stale,
checks `examples.json` against an independent parse of the YAML, and validates every item of `changes.json` against the
contract.

### Run the stub

```bash
cargo run -p kitty-stub -- --fixtures contracts/fixtures --port 0
#   first line on stdout: listening 127.0.0.1:<port>
curl -s http://127.0.0.1:<port>/api/v1/project
curl -s -H 'X-Kitty-Stub-Example: Project.<name>' http://127.0.0.1:<port>/api/v1/project
curl -sN http://127.0.0.1:<port>/api/v1/events      # the scripted sequence, then heartbeats
curl -s http://127.0.0.1:<port>/__stub/last-request
```

- Options: `--fixtures <dir>` (required; the `contracts/fixtures` directory), `--port <n>` (0 picks a free port), `--heartbeat-ms <ms>` (default 30000), `--time-scale <f>` (scales the
  delays of the scripted sequence; 0 plays it at once) and `--header-timeout-ms <ms>` (default 10000). SIGINT or SIGTERM
  stops it.
- **Header-read timeout.** A connection that has not sent a complete request header within `--header-timeout-ms` is
  closed, so a half-sent header cannot hold a connection forever. It covers the header only; an open event stream is
  not cut. There is no connection cap.
- It binds `127.0.0.1` only; no option changes the address.
- **Host rule.** Like the real service, every route answers 403 with `{"code": ...}` when the `Host` header is not exactly
  one `127.0.0.1:<port>` or `localhost:<port>` (`host`), when an `Origin` is repeated or present and not the stub's own
  origin, `http://127.0.0.1:<port>` or `http://localhost:<port>` (`origin`),
  or when any `Forwarded` or `X-Forwarded-*` header is present (`forwarded`).
- **Selection headers.** A read serves its route's default example. `X-Kitty-Stub-Example: <Schema>.<name>` selects a
  vendored example and `X-Kitty-Stub-Fixture: <name>` a valid fixture (the fixture header wins when both are sent). A
  selection of the route's success schema is served `200 application/json`; one of the route's refusal schemas is served
  as `application/problem+json` with the example's own `status`, which must be one the route allows. Anything else is a
  400 `schema-mismatch`; an unknown name is a 404 (`no-example`, `no-fixture`), and a read with no default example is a
  501 `no-example`. Only `GET` is served: any other method, HEAD included, is a 405 with `Allow: GET`.
- `GET /api/v1/events` replays `changes.json`, byte for byte the same on every run. A stream scoped with `missionId`
  carries `id:` lines on status transitions and lifecycle events; an unscoped stream carries none, and a log-truncated
  marker never does.
- `GET /__stub/last-request` returns the method, path and headers of the most recent `/api/v1` request. The values of
  `authorization`, `proxy-authorization`, `cookie` and `set-cookie` are reported as `"[redacted]"`; the names are kept.

### Upstream drift alert

`.github/workflows/contract-drift.yml` runs once a day and on demand (`workflow_dispatch`). It is not a gate and never
runs on pull requests. It runs `node scripts/contract/drift.mjs` (also `pnpm contract:drift`), which fetches upstream
spec-kitty `main` with Node built-ins and the `git` binary, and compares each file below the pinned contract paths with its sha256 in
`contracts/spec-kitty/PIN.json`, reporting added, removed and changed files. Exit codes: 0 in sync, 1 drift (the files
are listed), 2 upstream unreachable (never reported as "no drift"), 3 any other error. Exit 1 to 3 turn the run red, so
GitHub notifies. It needs no install and no secret and has a read-only token.

GitHub disables scheduled workflows in a public repository after 60 days without repository activity. If the repository
goes quiet, re-enable the workflow from the Actions tab (or run it by hand), or the alert silently stops.

### The Rust gate

`Gate: rust` runs `rustup toolchain install` and `cargo fetch --locked` as separate steps, then the gate step, which
downloads nothing:

```bash
cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
```

There is no Cargo build cache in CI. Its three plants under `gates/plants/rust/` are an unformatted line
(`plant_fmt_rust`), a clippy `bool_comparison` (`plant_clippy_rust`) and a failing test (token
`test plant_test_rust ... FAILED`, a line cargo prints only when that test fails), each an anchored edit of, or a test
file in, `crates/kitty-core`, so none can be skipped by the compiler.

The existing gates reach the new code too: `typecheck` runs `svelte-check` over the shell, `eslint`, `stylelint`,
`no-io` and `data-driven` read `.svelte` files, `manifest` checks the generated element typings, `contract` checks the
shared JSON files, `unit-tests` runs every workspace package's tests, and `hygiene` checks Cargo pins and the action
pins, permissions and checkout credentials of every workflow. Each extension has its own plant: 18 new plants in all.

## Gates

One workflow, `.github/workflows/ci.yml`; the job ids are the gate ids and the check names are `Gate: <id>`. The list
below is the set of job ids in that file; do not trust a count written anywhere else. Every gate evaluates whole
packages, never only the changed files.

| Gate (CI job) | Local command | What it checks |
|---|---|---|
| `Gate: preflight` | `pnpm preflight` | the registry credential is present and accepted (CI: `node scripts/preflight.mjs --ci`) |
| `Gate: typecheck` | `pnpm typecheck` | strict TypeScript over every workspace package; `svelte-check` over `packages/mission-shell`, against the generated element typings |
| `Gate: eslint` | `pnpm lint` | elements-over-CSS template rules, Lit rules, no warnings allowed |
| `Gate: stylelint` | `pnpm lint:styles` | layout-only CSS, `--sk-*` tokens, no colour, font or size literals; the operator-approved exceptions E-04 and E-08 to E-16 are scoped to named element files in `stylelint.config.mjs`, token values only (each sunsets on a spec-kitty-design issue) |
| `Gate: no-io` | `pnpm lint:no-io` and `pnpm test:no-io` | no network, desktop-bridge or browser-storage I/O in `packages/*/src`; the self-test asserts one fixture per rule |
| `Gate: manifest` | `pnpm manifest:check` | `custom-elements.json` equals a fresh regeneration and declares every property and event |
| `Gate: hygiene` | `pnpm hygiene` and `pnpm test:scripts` | no token, no absolute user path (CLI state files included), no agent scratchpad path, no tooling-ledger id, no username of the running account, no e-mail address in the contract and fixture paths, pinned dependencies and actions, safe workflow triggers, baseline PNG checks; then the `node:test` suites of the gate scripts (hygiene, gate-proof, preflight, manifest-screen, settle, the stylelint exception scope proofs, the story-catalogue and visual-tag tests and the terminology scan: the word "feature" never appears in `packages/*/src` or the mission quickstart, the canonical term is "mission") |
| `Gate: contract` | `pnpm contract:check` and `pnpm test:contract` | the vendored Mission Status contract equals its pin, the generated types and fixtures are fresh, every fixture is a valid and coherent contract document (closed shapes), no event-stream identifier in `packages/*/src` |
| `Gate: data-driven` | `pnpm lint:data-driven` and `pnpm test:data-driven` | no phase name, status lane or other contract status word (`pending`, `complete`, `draft`, `discarded`) hard-coded in `packages/*/src` outside `src/defaults/`, `src/contract/`, stories, fixtures and `src/story-support/`; the selector list is `SELECTOR_ENTRIES` in `eslint.data-driven.config.mjs` (it reads the phase, lane, review, change-state, staleness, project health, artifact, Drift and Ops vocabularies from the vendored schemas), with a self-test over positive fixtures in `gates/fixtures/data-driven/` and inline `eslint-disable` comments ignored |
| `Gate: storybook-build` | `pnpm build-storybook` | the static Storybook builds (330 stories), then the output is scanned for tokens |
| `Gate: unit-tests` | `pnpm test` | every workspace package's `test`, one package at a time and without stopping at the first failing package (`pnpm -r --no-bail --workspace-concurrency=1 test`; any failure still fails the gate). mission-ui: Vitest browser-mode tests in two projects run one after the other, `unit` and then `perf` (the wall-clock ceiling tests, one file at a time; see below): one test per emitted event and payload, plus the host composition test (both screens rendered from contract-shaped data with no I/O). mission-shell: the binding check, the port coverage test and the fixture-client tests |
| `Gate: visual` | `pnpm visual` | screenshots of every story (330) against the committed baselines (330, one per story), inside the pinned Playwright container |
| `Gate: rust` | the canonical Rust command (see [The Rust gate](#the-rust-gate)) | `cargo fmt`, `clippy -D warnings` and `cargo test` over the Rust workspace, offline (`--frozen`) after separate toolchain-install and fetch steps |
| `Gate: proof (<gate>)` | `pnpm gate-proof` | one leg per gate: passes clean, fails with the plant (see below) |
| `Gate: proof` | (CI only) | checks coverage, assembles and schema-validates the proof record |
| `Gate: all` | (CI only) | fails unless every job above succeeded; skipped or cancelled counts as failed |

The operator marks `Gate: preflight` and `Gate: all` as required checks. The `preflight` job runs first and every
other job needs it.

### Visual baselines

Baselines live in `apps/storybook/tests/visual/__snapshots__/` and are produced and compared only inside the
digest-pinned Playwright image. `pnpm visual` builds Storybook then runs `scripts/visual.sh`, which FAILS (never
skips) if podman or docker cannot start the container. After an intentional visual change run `pnpm visual:update`
and review the PNG diff in the PR. CI repeats each screenshot 5 times to catch flakiness.

CI timeouts for the visual gate are derived from measured runs. The run on `main` at 293 stories (run 38148343620) took
973 s for the `visual` job and 2102 s for `proof (visual)`. Scaled to the 330 stories of the merged set (x 330/293) that is
about 1096 s for the job (973 x 330/293) and about 2367 s for the proof leg (2102 x 330/293). The 28-minute job timeout
leaves the job estimate at about 65% of the limit (1096 s of 1680 s), and the 60-minute proof leg timeout leaves its
estimate at about 66% (2367 s of 3600 s). `unit-tests` (150 s, 396 s in the same run) keeps its job timeout of 8 minutes. Its proof leg rises from 10 to 11 minutes for the merged suite: the pull request run 38151797285 took 435 s, which is 72.5% of the old 600 s limit and 66% of the new 660 s (435 / 660).

Proof-leg timeouts of the gates that issue `#17` extended start from the formula (1 + the plants in the leg) x the
measured gate time + 2 minutes, rounded up, and never drop below their value before that issue. The times are a local proxy
(`gate-proof local`), so they are re-measured on the first CI run of a pull request that changes a leg. The local proxy
raised only `contract`, from 10 to 12 minutes (7 plants, a 68 s gate run).

### Installs are frozen

CI installs with `pnpm install --frozen-lockfile`. The credential check is skipped only when pnpm runs with both
`--offline` and `--frozen-lockfile`, so an offline frozen install (which `pnpm gate-proof` uses inside its throwaway
worktrees, with `node_modules` symlinked) needs no token.

## Add an element

1. Copy `packages/mission-ui/src/elements/sk-mission-sample/` to a new folder and rename tag, class and files.
2. Keep the screen contract and elements-over-CSS rules above. The manifest gate requires a `status` property only
   for screens: modules under `packages/*/src/screens/`, or any element whose class JSDoc has a line `@screen`
   (the sample carries it). Reusable widgets under `src/elements/` need neither.
3. Register the tag in `packages/mission-ui/src/index.ts`
   (`if (!customElements.get('sk-new')) customElements.define('sk-new', SkNew)`) and export the class and its event
   detail types. Element modules must not use `@customElement`: they never self-register, so a test, story or other
   package can import them without a duplicate-definition error. Put `@element <tag>` and `@fires {CustomEvent<Detail>}
   <name>` in the class JSDoc so the manifest carries the tag and the typed events. Stories import `../../index.js`.
4. Write one story per view state with synthetic fixtures (no real data, no absolute paths, no usernames) tagged
   `autodocs`, and one test per emitted event asserting its payload.
5. Add a line under "Unreleased" in `packages/mission-ui/CHANGELOG.md` (and in the root `CHANGELOG.md` for any
   user-visible change).
6. Run `pnpm manifest:generate` and commit the regenerated `custom-elements.json`.
7. Run `pnpm visual:update` to create baselines and review the new PNGs.
8. Run the gates from the table before opening the PR.

## Verify the gates are not vacuous

A gate that never fails proves nothing. Each gate has a plant under `gates/plants/<gate>/`: a known violation stored
as a non-source file (`*.ts.plant`, `*.css.plant`, `*.json.plant`), an anchored `{find, replace}` edit of a real file
(fails if the anchor text is gone or no longer unique, never because the file changed elsewhere), or generated at run time, with a
unique token in the failure output.

```bash
pnpm gate-proof                          # every gate, in a throwaway git worktree of HEAD
node scripts/gate-proof.mjs local --only hygiene    # one gate
```

For each gate the harness checks coverage (the `Gate: <id>` job ids in `ci.yml`, the proof matrix and the plant
directories must agree; `Gate: all` must need every gate, `proof-leg` and `proof`; each plant's `ciCommand` must equal
the `run:` of the `id: gate` step of that job, which has no `if:`; the proof runs that same command), runs the gate clean (must pass, token absent), applies the plant, runs it again (must fail,
token present), restores and checks the tree is clean. The result is a `proof-record.json` and `PROOF.md` in
`proof-output/` (git-ignored).

In CI, evidence for SC-002 is the green `Gate: proof (<gate>)` legs and `Gate: proof` on the PR head, plus the
uploaded, sanitised `proof-record` artifact of that run (retained one day). A record committed to the repo, if any, is
a snapshot of its parent commit, not proof of the current head.

### The Mission Status contract

The screens are typed from a pinned copy of the spec-kitty Mission Status contract, vendored byte for byte under
`contracts/spec-kitty/` with a `PIN.json` record. `pnpm contract:generate` writes `types.generated.ts` and
`fixtures.generated.ts` under `packages/mission-ui/src/contract/`; never edit either by hand. `pnpm contract:update --sha
<sha>` re-pins (network), `pnpm contract:verify-remote` confirms the vendored bytes equal upstream (network). Fixtures
are valid contract documents; the only deviations are the two named relaxations in `scripts/contract/registry.mjs`.

The pin is a commit on spec-kitty `main` (`provenance: "main"` in `PIN.json`; the contract file is still versioned
`1.0.0-SNAPSHOT`). `pnpm contract:check --require-main` refuses a pin taken from a branch, and a pin from a local checkout
(`contract:update --from-repo`) is always a branch pin, so a main pin is taken over the network.

### Timed clean-clone check (NFR-001, SC-001)

The accepting reviewer, on a machine with the prerequisites done and a valid credential, starts a stopwatch at
`git clone <repo>`, runs `pnpm install` then `pnpm storybook`, and stops when the preview answers. It must take under 5
minutes and all four Sample stories must render. The measured time goes in the PR description.

## Known limitations

No lint gate is complete. These are documented, not gated; reviewers must catch them.

- **`data-driven`** (`eslint.data-driven.config.mjs`): a value assembled at run time (`'in_' + 'progress'`,
  `['in', 'progress'].join('_')`), a lane counts object aliased before a named read (`const c = m.statusLaneCounts;
  c.done`) or destructured under a name other than the eight lanes, the lifecycle value `active` and any other value
  outside the 14 phase and lane words and `pending`, `complete`, `draft`, `discarded`, a lone object key `plan`, `review`
  or `done`, `phases.at(-1)` and `phases.slice(i)` with a negative or non-literal argument (legitimate, not flagged),
  class-name fragments such as `is-blocked`, padded literals (`' blocked'`, `'blocked '`), vocabulary in `.d.ts` or JSON, and code under `packages/*/test` are not
  seen. A foreign-vocabulary behavioural test of each element is the backstop. Inline `eslint-disable` comments are
  ignored by this gate and by `no-io`.
- **`no-io`** (`eslint.no-io.config.mjs`): Lit template attributes that load URLs (`<img src=${url}>`, `<link href>`,
  `<iframe>`) and `@import` or `url()` inside `css` text are not analysed (stylelint owns CSS). `setAttribute` is only
  checked for a literal `src`, `href`, `srcdoc`, `action`, `formaction` or `data` name. Aliases of objects other than
  `navigator`, `document` and `Reflect`, and objects reached through helper functions or other modules, are not
  followed (no data-flow analysis). Computed keys and property descriptors, for example
  `Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')`, can reach a banned API unseen. Identifier rules
  assume no local shadowing of the banned names (shadowing is itself reported). Only `packages/*/src` is linted.
- **`manifest`** (`scripts/check-manifest.mjs`): events dispatched outside `packages/*/src` or from `.d.ts` files are
  not seen; `class X extends Event` or `extends CustomEvent` subclasses and Event factories in other packages are not
  followed; only `Event` and `CustomEvent` are policed (not `MessageEvent`, `KeyboardEvent`, ...); a `@fires` tag with
  no matching dispatch is accepted.
- **`eslint` and `stylelint`** (`eslint-rules/index.mjs`, `stylelint.config.mjs`): markup assembled from plain
  strings at run time (`document.createElement('button')`, `innerHTML = ...`), a second template library imported
  under another name, and CSS built from run-time strings are invisible to static rules. ESLint bans `unsafeCSS` and
  `styleMap` to close the CSS route at its source.
- **`terminology`** (`scripts/terminology.mjs`, run by `pnpm test:scripts` inside the `hygiene` gate): matches the whole
  word `feature` case-insensitively, line by line, in the source files of `packages/*/src` and in the mission
  `quickstart.md`. The plural, other documents (README, changelogs, mission artifacts) and text assembled at run time
  are not scanned.
- **`hygiene`** (`scripts/hygiene/rules.mjs`): the token and path rules work line by line, so a token split across
  lines is not matched, and a quoted value containing an escaped quote is only read up to the quote. Token-shaped
  values are matched by prefix and length, so a differently shaped credential is not recognised.
- **`hygiene` e-mail rule** (`scripts/hygiene/rules.mjs`): path scoped to `contracts/`, `packages/*/src/contract/`, and
  `fixtures.ts`, `*.fixtures.ts` and `*.stories.ts` under `packages/*/src`; an address anywhere else is not reported.
  `example.com`, `example.org`, `example.net` (and subdomains) and the `.invalid` top-level domain are allowed.
- **`contract`** (`scripts/contract/check.mjs`): the username leg of C6 detects only the username of the account that
  runs the gate (read at run time, skipped under 4 characters), not another person's login; the vendored YAML is not
  scanned for it. C1 compares `PIN.json` with the files, so editing both together passes C1; the comparison with
  upstream is `pnpm contract:verify-remote`, which needs the network and is not a CI gate. The producer's lane weights
  are the one value copied from spec-kitty (`PRODUCER_LANE_WEIGHTS`); `contract:verify-remote` re-verifies them.
- **No allow-list; CLI state files are scanned like everything else.** The spec-kitty CLI writes absolute paths into
  its own records (the charter's `source_path:` line, and the review `feedback_path` and retrospective `record_path`
  values in `kitty-specs/*/status.json` and `status.events.jsonl`). Hygiene exempts none of them: scrub such a value
  (for example to `~/...`) before committing. `pnpm hygiene --list-allowed` prints nothing.
- **`hygiene` private-workspace rules**: an agent scratchpad path (`/tmp/claude-<uid>/...`), a three-or-more-digit
  `SK-` tooling-ledger id (two-digit `SK-NN` finding codes pass), and the username of the account running the gate
  (whole word, case-insensitive, 4 characters or more; shared accounts such as `runner` and `root` are skipped) are
  reported in every tracked and untracked file. In CI the runner's own account name is not the one that leaks, so set
  `HYGIENE_FORBIDDEN_NAMES` (comma separated) to cover other names; without it CI checks only paths, scratchpads and
  ledger ids. A username glued to other letters (`<name>dev`) is not matched.

## Licence

`kitty-mission-ui`, including `@moes-media/mission-ui` and `@moes-media/storybook-app`, is free
software: you can redistribute it and modify it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or (at your option) any later version
(SPDX: `AGPL-3.0-or-later`). The full text is in [`LICENSE`](LICENSE).

The Spec Kitty design library (`@spec-kitty/elements`, `@spec-kitty/styles`, `@spec-kitty/tokens`) is a separate,
MIT-licensed dependency installed from spec-kitty's GitHub Packages registry; it is not part of this repository.
