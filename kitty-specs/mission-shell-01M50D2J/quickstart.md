# Quickstart: mission-shell (#18)

## Mount the shell in a host (#20, #21)

First meet the host prerequisites in `contracts/shell-api.md`: tokens CSS and fonts, `data-theme`, and a Svelte-capable
bundler.

```ts
import { mountShell } from '@moes-media/mission-shell/shell';   // '.' stays port-only

const shell = mountShell(document.querySelector('#app')!, {
  client: myAdapter,          // one MissionStatusClient per project; the adapter owns transport (SO-DES-001)
  mode: 'dashboard',          // or 'desktop'
  route: currentHashRoute(),  // e.g. '/missions'
  host: {
    openExternalLink: (href) => { /* re-validate the scheme, never navigate the window, show the destination first */ },
    copyText: async (text) => 'copied',
    onWindowRefocus: (listener) => { /* add a visibility or focus listener */ return () => {}; },
    routeChanged: (route) => { /* push to the host's history */ },
  },
});
// Back or forward: shell.setRoute(route). Project switch: shell.setClient(newClient, '/missions'). Teardown: shell.destroy().
```

A Svelte host can use `<MissionShell {client} {mode} {route} {host} />`, also from `./shell`.

## Commands

The gate commands are unchanged (canonical strings in `plan.md`, Gates).

```bash
pnpm --filter @moes-media/mission-shell typecheck     # svelte-check, including the intent coverage check types
pnpm lint                                             # includes the shell blocks (I/O globals, elements, layering)
heavy pnpm --filter @moes-media/mission-shell test    # 'logic' (Node, browser disabled) + 'unit' (Chromium)
heavy pnpm build-storybook                            # mission-ui and shell stories, then the hygiene scan
heavy pnpm visual:update                              # candidate baselines for CP-1; pinned image only
heavy pnpm gate-proof leg --gate visual               # proves P-6 once (IC-08a), and again after any CP-1 amendment
```

`heavy` runs one memory-capped command at a time, in the foreground. Browser tests, the Storybook build, visual runs and
gate-proof legs always go through it.

## Check the frozen surface (SC-004, SC-006; research R-17)

```bash
base="$(git merge-base HEAD main)"
git merge-base --is-ancestor 39a51a6 "$base"         # the base contains #17 (PR #32's squash commit)
git diff --exit-code "$base" -- \
  packages/mission-shell/src/client/port.ts packages/mission-shell/src/contract/stream.ts \
  pnpm-workspace.yaml contracts/fixtures packages/mission-ui \
  scripts/gate-proof.mjs scripts/gate-proof scripts/visual.sh \
  apps/storybook/playwright.config.ts apps/storybook/tests/visual/stories.visual.spec.ts \
  eslint.no-io.config.mjs eslint-rules/svelte.mjs gates/no-io.selftest.ts \
  scripts/check-hygiene.mjs scripts/hygiene
git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/   # only shell-*.png added
sha256sum -c kitty-specs/mission-shell-01M50D2J/design-review.sha256
```

Then IC-09 compares the following at the base and at HEAD with a `yaml` and JSON parse:
- `ci.yml`: the job ids, `needs`, the `id: gate` commands, the matrix gate list and images, and `all.needs`;
- every job's `timeout-minutes`, which must be equal;
- the matrix `timeout`s, which may only rise;
- the `[workspace]` table of `Cargo.toml`;
- every plant's `ciCommand` and `prepare`, and that every base plant is retained, except the moved visual plant;
- the root, package and `apps/storybook` gate scripts.

The outputs go into the PR body, and the reviewer repeats them.
