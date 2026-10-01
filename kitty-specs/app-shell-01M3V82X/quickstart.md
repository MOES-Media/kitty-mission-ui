# Quickstart: App shell

Prerequisites as in `README.md` (Node 22.22.2, pnpm 11.18.0, registry credential, podman or docker for the visual gate).

## Use the shell (host)

```ts
import '@spec-kitty/mission-ui';           // registers sk-mission-shell, sk-shell-nav-item, sk-shell-tree
```

```html
<sk-mission-shell layout="mission" current="pipeline" rail-current="missions" status="ready">
  <span slot="brand">kitty desktop</span>
  <span slot="skip-link">Skip to Pipeline</span>
  <sk-shell-tree slot="sidebar-section" ...></sk-shell-tree>      <!-- optional, per screen -->
  <div>screen content, including its own sk-page-header; no <main></div>
</sk-mission-shell>
```

Set `railItems`, `navItems`, `footerItem`, `project` or `mission` as properties; listen for `sk-navigate`,
`sk-tree-toggle`, `sk-toggle-drawer`, `sk-toggle-flyout` and `sk-shell-retry`; route in the host.

## Verify

```bash
pnpm storybook                         # Mission/Shell, Mission/Shell nav item, Mission/Shell tree
pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io
pnpm manifest:generate && pnpm manifest:check
pnpm test                              # events, drawer keyboard, tier on resize
pnpm visual:update                     # inside the pinned image; review the PNGs
pnpm visual                            # compare; CI repeats each screenshot 5 times
pnpm gate-proof                        # every gate still fails with its plant
```

Manual checks at 1280, 1024, 800, 680, 390 and 320: icon column with label bubbles (hover, focus, Escape); the current
section icon opens the flyout (Escape, outside click and choosing an item close it); at 390 the hamburger opens the overlay
drawer (close button, Escape and backdrop return focus to the hamburger); resize across 1100 and 720, and across 720 with
the drawer or flyout open (both close); Tab from the page start reaches the skip link first and it focuses the content.
