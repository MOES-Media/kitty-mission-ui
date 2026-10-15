# Quickstart: mission-shell (#18)

## Mount the shell in a host (#20, #21)

```ts
import { mountShell } from '@moes-media/mission-shell';

const shell = mountShell(document.querySelector('#app')!, {
  client: myAdapter,          // one MissionStatusClient per project; the adapter owns transport (SO-DES-001)
  mode: 'dashboard',          // or 'desktop'
  route: currentHashRoute(),  // e.g. '/missions'
  host: {
    openExternalLink: (href) => { /* native open */ },
    copyText: async (text) => 'copied',
    onWindowRefocus: (listener) => { /* add a visibility or focus listener */ return () => {}; },
    routeChanged: (route) => { /* push to the host's history */ },
  },
});
// Back or forward in the host: shell.setRoute(route). Project switch: shell.setClient(newClient). Teardown: shell.destroy().
```

A Svelte host can use `<MissionShell {client} {mode} {route} {host} />` directly. The full surface is
`contracts/shell-api.md`.

## Commands

The shell's checks run inside the existing gates. The gate commands are unchanged (canonical strings in `plan.md`,
Gates).

```bash
pnpm --filter @moes-media/mission-shell typecheck     # svelte-check, including the intent coverage type
pnpm lint                                             # includes the shell ESLint block (raw controls, clipboard, history)
heavy pnpm --filter @moes-media/mission-shell test    # Node project (core, controller, refresh policy) + Chromium project
heavy pnpm build-storybook                            # builds mission-ui and shell stories, then scans the output
heavy pnpm visual                                     # pinned image only; Linux x86_64 with podman or docker
heavy pnpm visual:update                              # candidate baselines for CP-1; never outside the pinned image
heavy pnpm gate-proof leg --gate unit-tests           # one proof leg: a clean run plus one run per plant
```

`heavy` runs one memory-capped command at a time. Browser tests, the Storybook build, visual runs and gate-proof legs
always go through it, in the foreground, one at a time.

## Check the frozen surface (SC-004, SC-006)

```bash
base="$(git merge-base HEAD main)"
git diff --exit-code "$base" -- \
  packages/mission-shell/src/client/port.ts packages/mission-shell/src/contract/stream.ts \
  pnpm-workspace.yaml Cargo.toml contracts/fixtures \
  scripts/gate-proof.mjs scripts/gate-proof packages/mission-ui
```

Then compare the gate wiring of `.github/workflows/ci.yml`, the plants' `ciCommand`s and the root gate scripts
against `$base`, with every `timeout-minutes` and matrix `timeout` value ignored. The procedure is in `plan.md` IC-09.
The wrap-up WP pastes both outputs into the PR body, and the reviewer repeats them.
