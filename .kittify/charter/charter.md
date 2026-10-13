# Project Charter — kitty-mission-ui

<!--
Curated, display-only companion to the authoritative `.kittify/charter/charter.yaml`.
The interview answers in `.kittify/charter/interview/answers.yaml` carry the full policy text.
-->

## Purpose

One set of Spec Kitty mission screens, shipped as `@moes-media/mission-ui` (Lit web
components), and the host applications that render them: Kitty Desktop (Tauri 2, native
window) and Kitty Dashboard (a loopback web server, browser). Both hosts share one Svelte 5
shell and one Rust core that read spec-kitty's `mission-status-api` service. Storybook is the
visual source of truth; the screens implement the approved Kitty Desktop V2 interactive
prototype.

## The screen contract

- Data in as properties, typed from the spec-kitty Mission Status contract.
- View state in as a property: `loading`, `error`, `empty`, `ready`.
- User intents out as `sk-*` CustomEvents (`bubbles`, `composed`).
- Screens and pattern elements perform **no I/O**: no fetch, XHR, WebSocket, Tauri APIs or
  browser storage. Fetching, routing and refresh belong to the hosts.
- Screens are composed from pattern elements built on `@spec-kitty/elements` (atomic
  design); each element keeps a small, stable interface (deep modules).

## Hosts

- `packages/mission-shell` (Svelte 5) owns routing, layout and state, and maps `sk-*` events
  to intents. It depends only on a client port and performs no I/O, like every package under
  `packages/*`.
- I/O lives only in adapters under `apps/*` (Kitty Desktop, Kitty Dashboard) and `crates/*`
  (`kitty-core`: service discovery and supervision, contract client, change stream).
- Hosts read spec-kitty state only through published contracts and documented `--json` CLI
  verbs, never by parsing `kitty-specs/`, `.kittify/`, worktrees or event logs.

## Elements over CSS

- Every UI primitive that `@spec-kitty/elements` provides (card, notice, pill tag, nav pill,
  status indicator, button, …) is rendered with that `sk-*` element. Re-implementing it with
  hand-written CSS or copied `@spec-kitty/styles` classes is a review failure.
- Project CSS is limited to layout: positioning, grid, flex, gaps. It uses `--sk-*` tokens
  only; Stylelint rejects raw colour, font and size literals.
- A primitive the library lacks is recorded as a component gap for the design library, not
  hand-rolled. A temporary local stand-in needs an exception recorded in the PR.

## Stack

TypeScript (strict), Lit 3, Svelte 5, Storybook, Vite, pnpm workspaces. Rust (stable)
with a Cargo workspace: Tauri 2 for Kitty Desktop, axum for Kitty Dashboard.
`@spec-kitty/tokens`, `@spec-kitty/styles` and `@spec-kitty/elements` come from GitHub
Packages (private, rc).

## Quality gates (before merge)

Typecheck, ESLint, Stylelint, Storybook build, unit and interaction tests, visual regression
against the prototype, a current custom-elements manifest declaring every public property and
event, the no-I/O architectural gate over every package under `packages/*`, and the token-only
Stylelint rules (elements over CSS). Svelte code passes `svelte-check`; Rust code passes
`cargo fmt --check`, `clippy` with warnings as errors, and `cargo test`.

Every screen has a story per view state with synthetic fixtures; interaction tests assert
every emitted event and its payload. The shell is tested against a fixture adapter; the hosts
are tested against a local stub of the Mission Status contract, with one test per host
security rule.

## Review and governance

- Pull requests into `main`; the operator merges, agents never merge.
- Every work package is reviewed by a separate reviewer agent.
- An adversarial review squad runs **after the plan phase only**, not after specify.

## Distribution

Public repository in the MOES-Media org, licensed AGPL-3.0-or-later. Kitty Desktop
installers (Linux, macOS, Windows) and the Kitty Dashboard binary are attached to GitHub
Releases with the AGPL source offer. Neither bundles spec-kitty or its `mission-status-api`
service; both discover the installed service.

## Risk boundaries

- Every host server binds `127.0.0.1` only and enforces its own Host and Origin checks. The
  hosts never ask spec-kitty's service to loosen its loopback, Host or Origin protections.
- The desktop webview makes no network requests; credentials never reach a webview.
- Fixtures contain no real user data, no absolute filesystem paths and no OS usernames.
- No secrets or tokens are committed; installing `@spec-kitty/*` needs a `read:packages`
  token supplied by the environment.
- Quality and security standards are not relaxed without explicit operator approval.

## Amendments and exceptions

Charter changes go through a PR and need operator approval. Exceptions are documented in the
PR with scope, rationale and sunset criteria, and need operator approval.

## Doctrine gaps

The no-I/O screen rule, the view-state contract and prototype visual regression are
project-specific policy; no built-in directive covers them. Candidates for later doctrine
extraction.
