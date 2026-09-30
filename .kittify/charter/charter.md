# Project Charter — spec-kitty-mission-ui

<!--
Curated, display-only companion to the authoritative `.kittify/charter/charter.yaml`.
The interview answers in `.kittify/charter/interview/answers.yaml` carry the full policy text.
-->

## Purpose

One set of Spec Kitty mission screens, shipped as `@spec-kitty/mission-ui` (Lit web
components), rendered identically by the `spec-kitty dashboard` in a browser and by Kitty
Desktop in a native window. Storybook is the visual source of truth; the screens implement
the approved Kitty Desktop V2 interactive prototype.

## The screen contract

- Data in as properties, typed from the spec-kitty OpenAPI read contract.
- View state in as a property: `loading`, `error`, `empty`, `ready`.
- User intents out as `sk-*` CustomEvents (`bubbles`, `composed`).
- Screens and pattern elements perform **no I/O**: no fetch, XHR, WebSocket, Tauri APIs or
  browser storage. Fetching, routing and refresh belong to the host containers.
- Screens are composed from pattern elements built on `@spec-kitty/elements` (atomic
  design); each element keeps a small, stable interface (deep modules).

## Stack

TypeScript (strict), Lit 3, Storybook, Vite, pnpm workspaces. `@spec-kitty/tokens`,
`@spec-kitty/styles` and `@spec-kitty/elements` come from GitHub Packages (private, rc).

## Quality gates (before merge)

Typecheck, ESLint, Stylelint, Storybook build, unit and interaction tests, visual regression
against the prototype, a current custom-elements manifest declaring every public property and
event, and the no-I/O architectural gate.

Every screen has a story per view state with synthetic fixtures; interaction tests assert
every emitted event and its payload.

## Review and governance

- Pull requests into `main`; the operator merges, agents never merge.
- Every work package is reviewed by a separate reviewer agent.
- An adversarial review squad runs **after the plan phase only**, not after specify.

## Distribution

Private repository in the spec-kitty org; the source stays private. `@spec-kitty/mission-ui`
and `@spec-kitty/dashboard-web` publish to GitHub Packages, and the `dashboard-web` dist is
attached to a GitHub Release. The built bundle becomes public once vendored into spec-kitty.

## Risk boundaries

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
