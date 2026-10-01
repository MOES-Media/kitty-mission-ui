# WP05 review feedback (cycle 1) — REQUEST CHANGES

All nine acceptance commands pass (A1-A9 incl. both plants; A5 against 7c36cf2: 22+/14-), 180/180 tests,
stylelint covers the adopted overlay sheet (planted `border` fails lint:styles). Behaviour, events,
focus, listener cleanup, Escape/bubble ordering and aria-current are correct. One blocking issue.

**Issue 1 (blocking, medium): the drawer's rail strip is a vertical stack, not the horizontal strip T026,
research D-03 R2 and the prototype require.**
`[data-drawer-strip] sk-shell-nav-item { flex: 1 1 100% }` puts each labelled rail item on its own row.
At 390x800 (mission layout) the four rail cards take ~280px of the drawer, pushing the section nav and the
tree below the fold. T026: "a local `<nav aria-label="Global navigation">` horizontal rail strip";
prototype.css @620px: the rail becomes a row of 48px icon links. WP06 would bake this into baselines.
Remedy (all in shell-overlays.ts + its test):
1. Render the strip items `compact` (icon-only, as `renderRail` does: `?compact=${true}`) in a single
   non-wrapping row (`flex-wrap: nowrap`; items `flex: 0 0 auto`, or `1 1 0` to share the width).
2. Compact items show the WP02 label bubble: make drawer Escape yield to it like the flyout does — in
   `onDialogKeydown`/`onDialogCancel`, if `this.bubbleShown()` then `preventDefault()` the native close
   and return without `setDrawer`, so one Escape closes only the bubble.
3. Tests: strip items are laid out in one row (same `top`, increasing `left`); Escape with a strip bubble
   visible closes only the bubble, the next Escape closes the drawer (reason `escape`).
4. Re-render the 390 drawer screenshot (both layouts) and Read it.

**Non-blocking notes (no change required in this WP):**
- Tier-forced closes (`resize`/`tier`) dispatch a cancelable event whose `preventDefault()` is ignored.
  This follows the forced-false invariant (contract + data-model); the contract's "applied only if not
  prevented" needs a one-line carve-out in contracts/sk-mission-shell.md (orchestrator, planning artifact).
- Head/footer renderers duplicated from shell-parts.ts (private there); shell-parts.ts is outside the
  write scope. Candidate fold at mission level: export them from shell-parts and import here.
- Inside the modal drawer the library `sk-context-sidebar` contributes a labelled complementary with navs
  inside it; the dialog itself has no landmark role (contract-compliant). Record with G-11 as a
  design-review item.
