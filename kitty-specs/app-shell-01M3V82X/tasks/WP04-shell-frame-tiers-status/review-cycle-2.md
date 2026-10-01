---
affected_files: []
cycle_number: 2
mission_slug: app-shell-01M3V82X
reproduction_command:
reviewed_at: '2026-10-01T10:24:21Z'
reviewer_agent: user
wp_id: WP04
---

# WP04 review feedback, cycle 2: changes requested

Rework 4106303 passes every acceptance command (1 to 8, including the two planted checks; `pnpm test` 140/140). In a headless repro without manual `requestUpdate()`, the visible `aria-current="page"` count is exactly 1 in these cases: append a tree with a leaf, change `tree.current`, change `shell.current`, collapse with a leaf (the icon item is the page and is drawn selected), re-expand, remove the tree, and change the tree's `slot` attribute. The rail fixture now matches the prototype. One blocking issue remains.

**Issue 1 (BLOCKING, FR-003/FR-004/FR-018): an expanded tree with no selected leaf leaves 0 page marks.**
At 1100 px and wider, if an `sk-shell-tree` is slotted in `sidebar-section` and its `current` is `''`, `resolveMarking` still treats the leaf as deepest. The sidebar item therefore gets `'true'`, which per G-16 has no visual state and no `aria-current`, so nothing is marked. That is FR-003's "work package tree without a selected item" variant. The test asserting `pageMarks(el) === 0` after `tree.current = ''` locks the defect in.

Operator ruling: reflect the tree's selection. Required change:
- `sk-shell-tree`: give the existing `current` property `reflect: true`. This is the only change allowed in the WP03 file. Regenerate the manifest (`pnpm manifest:generate`). The only manifest difference may be `reflects: true` on the existing `current` attribute, and `pnpm manifest:check` must stay green. No other change to the public surface.
- `sk-mission-shell`: observe the `current` attribute of slotted `sk-shell-tree` elements with a `MutationObserver`. Set it up and re-target it on `slotchange` of the `sidebar-section` slot, and disconnect it in `disconnectedCallback`. No `window` or `document` access. On a mutation, call `requestUpdate()`.
- Marking rule: a tree is shown (`isSidebarTreeShown()`) AND a shown tree's `current` is non-empty means the leaf belongs to the tree and the sidebar and rail ancestors get `'true'`. Otherwise the matching shell item (sidebar, else rail) is `'page'`.
- Tests:
  - Replace the `pageMarks === 0` assertion with one asserting exactly 1 (the sidebar item) when the slotted tree has no selected leaf.
  - Test the transitions empty -> leaf -> empty by setting the tree's `current` **property** with no manual `requestUpdate()`. Assert exactly one page mark each time, on the leaf, then on the sidebar item.
  - Test observer cleanup: after the shell is disconnected, changing `tree.current` must not update the shell. For example, the shell's sidebar item mark is unchanged and no update is scheduled. Reconnecting must catch up.

**Issue 2 (LOW): label the tier-at-200% assertion.**
In the "long content (NFR-005)" block, the new `expect(el.tier)` line needs a one-line comment saying it is a regression guard, not NFR-005 evidence. The tier is a window-width media query in CSS px and cannot move with root font size.

Re-run all acceptance commands including the two planted checks (6 and 7) before handing back.
