# Contract: `sk-mission-shell`

Screen contract (`@screen`), registered only in `packages/mission-ui/src/index.ts`. No I/O, nothing stored. The host owns
routing, data, persistence, theme, toast, page header and the projects picker. **Render it full-bleed: the tier follows the
window width** (read in one private function; Kitty Desktop panes would later swap it for a container query).

## Properties

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `layout` | `layout` | `ShellLayout` | `'project'` | unknown falls back to `project` |
| `current` | `current` | `string` | `''` | sidebar item id |
| `railCurrent` | `rail-current` | `string` | `''` | rail item id (mission layout) |
| `railItems` | none | `ShellNavItem[]` | `[]` | mission layout only |
| `navItems` | none | `ShellNavItem[]` | `[]` | sidebar navigation |
| `footerItem` | none | `ShellNavItem \| null` | `null` | project sidebar footer |
| `project` / `mission` | none | `ShellProject \| null` / `ShellMission \| null` | `null` | heads |
| `status` | `status` | `ViewState` | `'loading'` | the shell's own data; reflected |
| `errorMessage` | `error-message` | `string` | `''` | |
| `drawerOpen` | `drawer-open` | `boolean` | `false` | mobile only, semi-controlled, forced false elsewhere |
| `flyoutOpen` | `flyout-open` | `boolean` | `false` | collapsed tier only, semi-controlled, forced false elsewhere |
| `tier` | `tier` | `ShellTier` | computed | read-only, reflected, re-asserted in `willUpdate` |

Status: the frame renders identically in every status. The status renders in normal flow at the top of the content column in every tier (a status change may move the content): `loading` `sk-status-indicator pulsing`, `error` `sk-notice danger`
with Retry, `empty` `sk-notice info`. `aria-busy` only on that region, never on `main`.

## Slots
`default` (content, inside `<main id="content">` > focus target `div tabindex="-1"`; screens render no `<main>`),
`brand` (fallback "kitty desktop"), `top-bar-actions`, `skip-link` (per-screen text; fallback "Skip to content"),
`sidebar-section` (`sk-shell-tree` sections; shown in the expanded tier, the drawer and the flyout, not in the closed
collapsed column).

## Events (`bubbles`, `composed`, literal names, typed in `HTMLElementEventMap`)
| Event | Detail | Cancelable |
|---|---|---|
| `sk-navigate` | `{ id, href }` | no |
| `sk-tree-toggle` | `{ id, expanded }` | no |
| `sk-toggle-drawer` | `{ open, reason }` | yes; applied only if not prevented |
| `sk-toggle-flyout` | `{ open, reason }` | yes |
| `sk-shell-retry` | `{}` | no |

Library events (`sk-action-row-activate`) are stopped at the shell and tree boundary; only these cross.

## Behaviour
- Tiers: expanded 1100 and above (rail 3.5rem if mission, sidebar 15rem); collapsed 620 to 1099 (icon column 3.5rem, rail
  kept); mobile below 620 (hamburger; overlay drawer). Drawer is a native `<dialog>` modal with backdrop (an `sk-context-sidebar` fills it); the collapsed icon column is a local `<nav>`; the flyout is a
  grid-placed overlay over the content cell. Neither moves the content.
- Flyout (wrapped in `sk-context-sidebar`; closes on focus leaving it and its icon): activating the current section's icon, when `sidebar-section` content exists, opens it without emitting `sk-navigate`; Escape, outside
  `pointerdown`, choosing an item or leaving the tier close it; focus into the flyout then back to the icon, or to the
  content focus target after a navigation.
- Icon labels in the collapsed tier appear in a bubble on hover and focus (see `sk-shell-nav-item`).
- Landmarks differ per tier. Expanded: one banner, one `nav` "Global navigation" (mission), one complementary (`sk-context-sidebar label`) with one
  `nav`, exactly one `main`. Collapsed: banner, `nav` "Global navigation" (mission), the icon column as a `nav`, no complementary (the flyout, when open, is a complementary). Mobile: banner and `main`; the drawer is a labelled dialog with no landmark role of its own.
- Tab order: skip link, top bar (hamburger in mobile), rail, sidebar, content. The skip link focuses the content focus
  target.
- Current marking: only the deepest marked item has `aria-current="page"`, shell ancestors `"true"`.
