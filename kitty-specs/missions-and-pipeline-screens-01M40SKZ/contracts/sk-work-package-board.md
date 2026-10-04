# Contract: `sk-work-package-board`

Pattern element (no `@screen`), file `src/elements/sk-work-package-board/sk-work-package-board.ts` with `card-parts.ts` (private card fragment) and `fixtures.ts`. Places work packages into the columns it is given and emits the selection intent. Adopts the library's `workflow-board`, `workflow-lane` and `progress` stylesheets (G-02, G-03; exception E-02).

## Properties

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `workPackages` | none | `WorkPackageView[]` | `[]` | in the service order; the board never sorts |
| `laneGroups` | none | `LaneGroup[]` | `DEFAULT_LANE_GROUPS` | columns; an empty array makes one synthetic column titled by `label` (nothing is dropped) |
| `missionId` | `mission-id` | `string` | `''` | echoed in the event payload |
| `labels` | none | `LabelHooks \| null` | `null` | `state` hook for card badges |
| `label` | `label` | `string` | `'Work Package board'` (from `BOARD_LABEL` in `defaults/pipeline-copy.ts`) | the board heading and the name of the scroll region; a host-facing property the spec does not name: amendment proposal P-7 |

## Slots and parts

None.

## Events

| Event | Detail | When |
|---|---|---|
| `sk-select-work-package` (`bubbles`, `composed`) | `{ missionId, wpId }` | a card is activated (pointer, Enter, Space); library `sk-action-row-activate` is stopped here |

## Placement and rendering

- Placement: `placeWorkPackages` (data-model.md): first matching group; null lane and unknown lane in the first group; input order within a column; a lane in two groups belongs to the first.
- Structure: `div.sk-workflow-board` > heading (`label`, `h2`, visually hidden: the prototype shows no board heading, so the heading only names the board and the scroll region for assistive technology) > `div.sk-workflow-board__scroller` > one `section.sk-workflow-lane` per group (`aria-labelledby` its `h3` title; a `div.sk-workflow-lane__header` holds the title and the count `span`, which carries `aria-label` "<n> work packages" from the rendered card count) > `ol.sk-workflow-lane__list` > `li` > card. An empty column renders its header and an empty list (no placeholder text).
- Scroll region: while the scroller really overflows horizontally (a `ResizeObserver` callback compares `scrollWidth` and `clientWidth`), it carries `role="region"`, `aria-labelledby` the heading and `tabindex="0"`; otherwise none of the three (library contract). The board scrolls inside its own region at narrow widths.
- Card (private fragment): `sk-action-row selectable layout="card" row-id=<wpId>`: `marker` slot: the work package id and the state `sk-pill-tag` (`PlacedCard.badge`: blocked, reviewing, canceled and "not started" are distinct badges, FR-016); `title`: the title; `reference` slot: the progress bar, a `div.sk-progress.sk-progress--narrow` holding the native `<progress class="sk-progress__bar" value=<done> max=<total> aria-label="Subtask progress, <done> of <total> done">` (text fallback `<done>/<total>`) and a visually hidden span with the same words (Chromium names a button from a nested progressbar by its value only, so the span is what puts the label into the card's accessible name), rendered only when `subtaskProgress.total > 0` AND the card's column has `LaneGroup.showsProgress` true (DR-1 as confirmed at CP-1: the default In progress column only; a card in any other column shows no bar even when `total` is above 0), handed to the element as given with no arithmetic (D-19); `tags` slot: "depends on <ids>" from `dependencies` as given (omitted when empty); `metadata` slot: the `actor` (omitted when absent, no placeholder) followed by the decorative trailing arrow, always present (`aria-hidden`; N-5, review finding F4: the card has both the actor and dependency row and the arrow). The words of the progress text live in `defaults/lanes.ts` (`SUBTASK_PROGRESS_TEXT`) because they hold the word `done`, which gate `data-driven` keeps in `src/defaults/`. Slot-to-position mapping (spike S3, G-08): a layout-only `::part(trigger)` grid override puts the id and pill, the title, the bar, then the actor and dependency row; the row is two columns (actor left, dependencies right) when the card is at least 200 px wide (a container query on the `li`), stacked otherwise; the gaps are margins of the slotted content so an empty library wrapper adds no row gap, and the empty `controls` wrapper is `display: none`.
- The card is one native button (via the library): its accessible name is its content including the progress label (a button's children are presentational).
- Long titles and ids wrap through the library; the column never overflows.
- Look (CP-1 N-4, N-5): lanes are flat with a small uppercase mono title, five lanes fit a 1280 px content cell without horizontal scrolling (the lane minimum is set by exception E-10; the scroller track is `minmax(auto, 1fr)` so the lane minimum is the floor, and the lane gap is the prototype's `--sk-space-5`), the card wraps short phrases whole (no mid-word break in "depends on WP03"), leaves the prototype's gap under the title and ends with the arrow. Met by exceptions E-09, E-10 and E-11 (`gates.md`); no property, slot or part is added.

## Stories (6, title `Mission/Work package board`, 800 px default)

`FiveColumns` (default groups, mixed lanes), `Badges` (blocked, in review, canceled, not started), `UnknownAndNullLane`, `CustomGroups` (3 columns, 2 custom lanes), `SubtaskProgress` (2 of 5, 3 of 3, total 0, in several lanes; the bar appears only in the In progress column, DR-1), `LongNames`.

## Tests (file `test/sk-work-package-board.test.ts`)

Placement for every default lane, null, unknown, a lane in two groups, custom groups, empty groups; column counts equal rendered cards (equality, five columns for the default groups); EV-5 payload per card (exactly one event, deep-equal detail, `bubbles` and `composed` true) incl. keyboard (Enter, Space); library event not leaking (with a positive control: the same listener on the board receives `sk-select-work-package`); badges per state; progress bar present iff `total > 0` and the card's column has `showsProgress` (a card with `total > 0` in another column shows none; a custom group without the field shows none), with value and max as given (2 of 5, 3 of 3) and the card's name containing the label; actor and dependencies hidden when absent; scroll region attributes present only while overflowing (narrow container); order preserved; a foreign vocabulary renders without any default label.
