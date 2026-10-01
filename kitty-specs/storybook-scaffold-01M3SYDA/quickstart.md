# Quickstart: Storybook scaffold

Target: clean clone to running workbench with **two project commands** after the one-time prerequisites (NFR-001,
SC-001). The prerequisites below are not project commands but are counted in the timed check at the end. Paths are
repository-relative.

## Prerequisites (one-time)

- Node 22.22.2 (`.nvmrc`), for example `nvm install` or `fnm use`.
- pnpm 11.18.0, installed directly (for example `npm install -g pnpm@11.18.0`, or the standalone installer). **corepack is
  not used** (it is not installed with this Node); CI uses `pnpm/action-setup`.
- A GitHub token with `read:packages` and access to the `spec-kitty` organisation (SSO authorised), written to your own
  user-level `~/.npmrc` as `//npm.pkg.github.com/:_authToken=<token>`. **pnpm does not read `NODE_AUTH_TOKEN`** for this
  scope (verified). Never in the repository `.npmrc`, which holds only the scope line.
- For visual checks only: podman or docker.

## Run (the two commands)

```bash
pnpm install          # .pnpmfile.cjs stops here with a named message if the ~/.npmrc credential is missing
pnpm storybook        # opens the workbench; four stories under "Mission / Sample", plus an autodocs page
```

`pnpm preflight` runs the online credential check on demand (401 = token rejected or expired; 403/404 = needs
`read:packages` and org access).

## Gates locally

```bash
pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io
pnpm manifest:check && pnpm hygiene && pnpm test
pnpm visual                 # build-storybook, then visual.sh: runs in the pinned container; FAILS (never skips) if podman/docker cannot start
pnpm visual:update          # refresh baselines, same container; review the PNG diff in the PR
pnpm gate-proof             # plants each violation in a throwaway worktree (offline frozen install per worktree) and re-verifies coverage
```

That is 7 commands for the static and test gates plus `visual`, `visual:update` and `gate-proof`: 10 separate commands in
total, none of them needed for the two-command run above.

## Add an element

1. Copy `packages/mission-ui/src/elements/sk-mission-sample/` to a new folder and rename tag, class and files.
2. Keep the contract: data as properties, `status` view-state property, `sk-*` events via
   `dispatchEvent(new CustomEvent('<literal>', ...))` with `bubbles` and `composed`, no I/O, primitives rendered with `sk-*`
   elements (no raw `<button`, `<input`, `class=`), CSS layout-only with `--sk-*` tokens and no `px`/`rem`/`em`.
3. One story per view state with synthetic fixtures (`tags: ['autodocs']`); one test per emitted event and payload; add a
   `CHANGELOG.md` line.
4. `pnpm manifest:generate`, commit `custom-elements.json`; `pnpm visual:update` for new baselines.

## Verify the gates are not vacuous

Locally `pnpm gate-proof` checks coverage (the `Gate: <id>` jobs in `ci.yml` equal the matrix list equal `gates/plants/*`),
then, per gate, applies its plant in a throwaway `git worktree` (each worktree runs `pnpm install --offline --frozen-lockfile`, which needs a warm pnpm store but no credential; node_modules is never symlinked), expects the
gate to fail with the plant's unique token, restores, and checks `git status --porcelain` is empty. In CI each gate has
its own matrix leg `Gate: proof (<gate>)` (clean run passes without the token, planted run fails with it) and a final
`Gate: proof` assembles the record. Evidence is green proof checks on the PR head plus the uploaded, sanitised artifact;
a committed record, if any, is a snapshot of its parent commit.

## Accept checklist: timed clean-clone check (NFR-001, SC-001)

On a machine with the prerequisites done, in a fresh directory, start a stopwatch at `git clone <repo> x && cd x`, run
`pnpm install` then `pnpm storybook --ci`, and stop it when the preview URL answers. The time must be under 5 minutes
and the four Sample stories must each render. The accepting reviewer records the measured time in the PR description.
