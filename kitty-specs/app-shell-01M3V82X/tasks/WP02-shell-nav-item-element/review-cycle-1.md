---
affected_files: []
cycle_number: 1
mission_slug: app-shell-01M3V82X
reproduction_command:
reviewed_at: '2026-10-01T09:49:22Z'
reviewer_agent: user
wp_id: WP02
---

# WP02 review feedback (cycle 1) — REJECT

Reviewed commit 6c2bc2f on `kitty/mission-app-shell-01M3V82X-lane-b`. All 8 acceptance commands pass
(typecheck/lint/lint:styles/lint:no-io/test:no-io/hygiene, test 43/43 incl. 25 nav-item tests, manifest:check,
visual 11/11 with 6 baselines, storybook build with 6 stories, both plants caught, tree clean). The bubble
(hover, focus, Escape, hoverable, persistent, listener removal on hide and disconnect) is correctly built and tested.
One blocking defect.

## Issue 1 (BLOCKING, FR-018): `current="true"` is announced as `aria-current="page"`

In route mode the library `sk-action-row` renders `<a aria-current="page">` whenever `selected` is set
(`@spec-kitty/elements` dist, row template). The element sets `selected` for both `'page'` and `'true'` and puts
`aria-current="true"` on the `sk-action-row` HOST, a generic node that is not the link. Measured in the built
Storybook (`mission-shell-nav-item--current-true`): host `aria-current="true"`, anchor `aria-current="page"`; the
only accessible object is the link, so an ancestor item is announced as "current page". In the shell (WP05/06) a
current leaf plus its sidebar and rail ancestors would expose three `aria-current="page"` links, contradicting FR-018
("only the deepest item carries `page`, ancestors `true`").

The test `current=true sets selected and aria-current=true` asserts the host attribute, which no assistive
technology reads, so it passes while the behaviour is wrong (synthetic assertion; checklist items 2 and 4 FAIL).

Remedy:
1. Change the test to assert the anchor's `aria-current` (the node AT exposes): `page` for `'page'`, `true` for
   `'true'`, absent for `''`; and that the host carries no `aria-current` duplicate.
2. Make it pass. The library offers no route-mode `aria-current="true"`, so this is a library gap. Record it in the
   header comment and in the hand-off as a new gap (next free G-number, e.g. G-16: "`sk-action-row` route mode only
   exposes `aria-current="page"`; proposal: a `current` passthrough"). The local mechanism is a decision for the
   orchestrator/operator, not for the implementer to pick silently — options seen: (a) after render, set
   `aria-current="true"` on the library anchor through its shadow root (reaches into library internals; must survive
   re-render); (b) for `'true'` do not set `selected` (no "page" on ancestors, but the ancestor loses the visual mark,
   breaking FR-004/FR-018 visual parity). Stop and report which you need if neither is authorised.

## Non-blocking (fix while there)

- Story caption is an `sk-pill-tag`, the same element as the bubble; in `compact-with-bubble` it sits under the icon
  and reads as a bubble. Keep an Inter-set caption but use a non-pill text element so the baseline cannot be mistaken
  for the bubble state (re-run `pnpm visual:update` in the container if changed).
- The test named "delegates focus" exercises the `focus()` override (the recorded fallback). Rename it so it says so.
- `SameLabelDifferentId` renders one item only; render both so the story shows what its name claims.
- Note for WP04 (no change here): the document Escape listener does not coordinate with the flyout
  ("Escape closes the bubble before the flyout", research D-03).

Verified fine: focus() lands on the anchor, Tab/Shift+Tab move in and out (no trap); document keydown listeners = 0
after Escape; `sk-action-row-activate` cannot fire in route mode and is stopped anyway; manifest unchanged; the
modified-click document swallow records `defaultPrevented` before cancelling, so it does not weaken the assertion;
the `ref` inline-size in stories and the `@spec-kitty/tokens` test import do not weaken any gate.
