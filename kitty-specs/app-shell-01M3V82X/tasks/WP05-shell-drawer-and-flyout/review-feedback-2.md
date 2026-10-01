# WP05 review feedback (cycle 2) — REQUEST CHANGES

Feedback-1 item by item: Issue 1 FIXED. The strip is one non-wrapping row of compact icons (computed
`nowrap`, same top, increasing left). At 390x800 the section nav and the tree's first leaves are above the fold
in both layouts. The project layout has no strip. Drawer Escape yields to a shown bubble (test: one Escape closes
the bubble with zero `sk-toggle-drawer`, the next closes the drawer with reason `escape`). Accessible names are
kept (title slot text inside the anchor; the bubble is aria-hidden). Every acceptance command passes
(A1-A9, planted checks; 182/182; A5 vs 7c36cf2 is unchanged at 22+/14-).

**Issue 2 (blocking, low-medium): the label bubble of the last strip icon is clipped by the drawer.**
Headless probe at 390x800 (mission layout): hovering `rail-projects` puts its `sk-pill-tag` at x 225-296. The
clipping ancestors are `aside::part(sidebar)` (`overflow: auto`, right edge 237: the library scroll container)
and `dialog[data-drawer]` (`overflow: hidden`, right edge 240). Most of the bubble is cut off, so sighted users
cannot read the label of an unlabelled icon. This is the only visible label the icon has in the drawer
(WCAG 1.4.13 intent; R3). The last slot always ends at about the sidebar's inner edge, so any compact bubble
there clips.
The fix has no single obvious remedy. Choose one (or escalate):
  a. Strip items keep visible labels in the row (non-compact, icon above or beside a short label). There is
     then no bubble in the drawer.
  b. The bubble opens toward inline-start or below for items near the end edge. This changes the WP02
     element, which is outside WP05's write scope.
  c. Accept it as a design-review item next to G-11 (operator decision).
Whichever is chosen, add a test asserting each strip icon's label is fully visible, or is not needed,
inside the dialog box.
