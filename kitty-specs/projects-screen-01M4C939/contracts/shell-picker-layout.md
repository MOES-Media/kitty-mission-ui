# Contract: the shell's `picker` layout

Additive. `ShellLayout = 'project' | 'mission' | 'picker'`.

| Aspect | `project` / `mission` (unchanged) | `picker` |
|---|---|---|
| Resolution | `mission` exactly, else `project` | `picker` exactly; any other unknown value still falls back to `project` |
| Skip link, top bar, brand, `top-bar-actions` slot | drawn | drawn |
| Hamburger | at the mobile tier | never |
| Sidebar, icon column, flyout, rail | per layout and tier | never |
| Drawer | at the mobile tier | never; `drawerOpen` and `flyoutOpen` forced false |
| Body grid | per layout and tier | one column, `minmax(0, 1fr)`, all tiers |
| `navItems`, `railItems`, `footerItem`, `project`, `mission`, `current`, `railCurrent` | used | ignored |
| `status`, `errorMessage`, content slot, `flush` | used | used |
| Reflected `tier` | yes | yes (so `ShellTierController` works) |

Tests (`sk-mission-shell.picker.test.ts`): at 1280, 1100, 800 and 620 px no `sk-context-sidebar`, `sk-personal-rail`, icon column, flyout or hamburger exists; a second shell with `layout="project"` still has them (positive control); an unknown value falls back to `project`; `tier` reflects. The existing shell tests are unchanged.
