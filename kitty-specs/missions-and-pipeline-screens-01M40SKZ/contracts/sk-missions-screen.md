# Contract: `sk-missions-screen`

Screen contract (`@screen`), registered only in `packages/mission-ui/src/index.ts`, file `src/elements/sk-missions-screen/sk-missions-screen.ts` with `fixtures.ts`, `mission-row-parts.ts` (private row fragment), `sk-missions-screen.stories.ts`. No I/O, nothing stored. Renders inside the `sk-mission-shell` content slot (the shell owns the frame, tiers, skip link and content scroll). The host owns loading, paging, routing and the clock.

## Properties

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `status` | `status` | `ViewState` | `'loading'` | reflected; unknown collapses to `empty` |
| `project` | none | `Project \| null` | `null` | header name and Mission count (contract `Project`) |
| `branch` | `branch` | `string` | `''` | host value, shown in the header (the project has no branch); empty omits it |
| `missions` | none | `MissionOverviewView[]` | `[]` | the loaded Missions in service order; `stale?` is a host field inside each object |
| `pageInfo` | none | `PageInfo \| null` | `null` | `hasNextPage`, `nextPageCursor`, `pageSize` of the last loaded page |
| `now` | `now` | `string \| null` | `null` | ISO instant for relative times; null shows the ISO timestamp as given (D-24) |
| `filter` | `filter` | `string` | `'all'` | semi-controlled: user input assigns it; a host assignment changes the view and emits nothing; an unknown id behaves as All |
| `query` | `query` | `string` | `''` | semi-controlled like `filter` |
| `loadingMore` | `loading-more` | `boolean` | `false` | host-owned: the Load more row is busy and inert while true |
| `laneGroups` | none | `LaneGroup[]` | `DEFAULT_LANE_GROUPS` | drives the lane summary order and words |
| `labels` | none | `LabelHooks \| null` | `null` | label and time hooks (D-06) |
| `errorMessage` | `error-message` | `string` | `''` | overrides the default error body; a host-facing property the spec does not name: amendment proposal P-7 |

## Slots and parts

None. The screen has no slots; it renders library elements and private fragments.

## Events (`bubbles`, `composed`, literal names, typed in `HTMLElementEventMap`)

| Event | Detail | When |
|---|---|---|
| `sk-open-mission` | `{ missionId, slug }` | a row is activated (pointer, Enter, Space); the screen never navigates |
| `sk-filter-change` | `{ filter }` | a different filter button is pressed (dispatched by `sk-filter-toggle-group`, crosses the screen); `filter` is `all`, `active`, `planned`, `done`, `stale` or `discarded` |
| `sk-search` | `{ query }` | the trimmed query changed through user input |
| `sk-load-more` | `{ cursor }` | Load more Missions activated while a next page exists and `loadingMore` is false |

No event is emitted by: a host-set property, pressing the already pressed filter, a whitespace-only query change, activating a busy Load more, any state change. Library `sk-action-row-activate` events are stopped at the screen.

## Rendering by `status`

| `status` | Content (the header always renders: eyebrow "Project", `h1` "Missions", supporting `<project.name> . <branch> . <missionCount> Missions` from what is present) |
|---|---|
| `loading` | region `aria-busy="true"`: `.sk-progress--indeterminate` labelled "Reading local Mission index" plus a paragraph; no search, filters or rows |
| `error` | `sk-notice tone="danger" announce="assertive"`, heading "Mission index unavailable", body from `errorMessage` or the default; no retry control (refresh belongs to the host) |
| `empty` | `.sk-empty-state` "No Missions in this project"; search and filters hidden |
| `ready` | toolbar (search, filters), then the list; when no `li` is visible, "No Missions match" with the hint, still offering Load more when a next page exists; the Load more row is the last `li` of the list |

## Structure (ready)

`sk-page-header` > toolbar (`sk-form-input type="search"` with a layout-hidden label "Search Missions"; `sk-filter-toggle-group` labelled "Mission status filter", six options from `FILTERS`) > `<ul>` of `<li>` (hidden when filtered out), each holding one `sk-action-row selectable` row (D-20) > the Load more `<li>` (`sk-button variant="secondary"`, `busy` while `loadingMore`) or the no-match panel. Rows render once, keyed by `missionId`; filter and query only toggle `li[hidden]` (D-23).

Row content: `title` the name, `reference` the slug, `tags` the type badge (omitted when null), the topology badge, the blocked badge (`<blockedCount> blocked`, only when above 0), the stale badge (only when `stale === true`); `supporting` the lane summary; `metadata` the lifecycle badge above one `data-time` span holding the activity text and a decorative arrow (`aria-hidden`, on every row, DR-6). Draft Missions carry the `draft` lifecycle badge and match only All; discarded show "Discarded".

## Behaviour

- Match rule, filter and search algorithm: `data-model.md` (plain text, trimmed, case-insensitive substring over name, slug, type, topology; no regular expression).
- A host that wants server-side search listens to `sk-search` and `sk-filter-change` and may later pass more `missions`; the screen only filters what it has.
- Result-count live region (FR-034, ruling P-5): a visually hidden element with `role="status"` and `aria-live="polite"` (layout-hidden like the search label; not a control, no tab stop) whose text is the number of visible Missions ("<n> Missions shown", singular for 1; word from `src/defaults/`) after a user filter change, a user search change and after a load-more page arrives (`missions` grows from a non-empty list); empty on first render, so nothing is announced on load; a host-set `filter` or `query` and a same-size or shorter `missions` announce nothing. It emits no event.
- Tab order: search, six filters, rows in order, Load more. Every control is one tab stop.
- Tier behaviour: the screen has no tier logic; at the collapsed and mobile tiers the shell narrows the content cell, the toolbar wraps (flex-wrap), rows reflow, nothing causes horizontal overflow (NFR-004 test at 200% root font).

## Stories (24, title `Mission/Missions`, each inside the shell, tags `vw-<n>`)

`Populated1280` (MS-01, on its last page: the prototype has no Load more row), `FilterActive1280`, `FilterPlanned1280`, `FilterDone1280`, `FilterStale1280`, `FilterDiscarded1280` (MS-02), `FilterAllWithDrafts1280` (MS-02a), `SearchNoMatchMorePages1280`, `FilterNoMatchLastPage1280` (MS-03), `Empty1280` (MS-04), `Loading1280` (MS-05), `Error1280` (MS-06), `PagedFirstPage1280`, `PagedLastPage1280`, `PagedLongList1280`, `PagedLoadingMore1280` (MS-07), `Collapsed1024`, `Collapsed800`, `Mobile680`, `Mobile390`, `Mobile320` (MS-08), `LongNames1280`, `SearchFocused1280` and `RowFocused1280` (`tab-<n>`, measured by the Tab-walk test).

## Tests (file `test/sk-missions-screen.test.ts`)

Every event and payload (EV-1 to EV-4), each asserted as exactly one event (`events.length` equal to 1), deep-equal detail, `bubbles` and `composed` true, incl. a duplicate-name pair told apart by slug and id; keyboard activation (Enter, Space); no-event assertions (the list above), each with a positive control in the same test (the same listener receives an event when a sibling action that does emit is performed); filters one by one against the fixtures (draft only under All; stale-and-active under both Active and Stale); search trim, case, regular-expression characters as text; no-match with and without a next page; Load more row absent on the last page, busy and inert while `loadingMore`; view states (header kept, no controls in loading, error and empty; `aria-busy`; alert); lane summary and badges through `defaults`; relative time with `now`, with a hook, with neither; null type, unknown topology, null activity; NFR-006 (500 Missions; the timing is the budget and the structural assertions are the proof, see below); hidden rows are `li[hidden]`; Tab-walk per tier; root font 200% at 1100 and 720 px.

**NFR-006 test (500 Missions).** The timing assertion is the budget (200 ms or less, measured with `performance.now()` around the user action and `await el.updateComplete`; the initial render is not measured); the structural assertions are the proof that the "hidden `li`" design is what is under test, because a re-render of the filtered subset (the rejected design) might also finish within 200 ms on a fast machine. Required, in the same test: 500 `li` exist before and after the action (counting the Mission rows, not the Load more row); the SAME `li` node references survive the action (identity of the first, middle and last, no re-creation); at least one and not all Mission `li` are `hidden` after the action (a filter or query that matches a strict subset, so an all-rows match cannot make the test measure nothing); the toggle case presses the real button of `sk-filter-toggle-group` and the search case types into the real inner `input` of `sk-form-input` (input events through the keystroke path), not a property assignment. A failing timing on a shared runner is investigated, not loosened.
