# Mission Specification: Missions and Pipeline screens

**Mission Branch**: `feat/missions-and-pipeline-screens-4`
**Created**: 2026-10-03
**Status**: Draft
**Input**: GitHub issue spec-kitty/spec-kitty-mission-ui#4 ("Missions and Pipeline screens"): its body, the operator's
two decision comments (which supersede the body where they differ), the Mission Status contract on spec-kitty `main`,
and the approved Kitty Desktop V2 prototype (Missions and Pipeline screens).

## Intent Summary

- **Primary actor**: a host (the local dashboard served by the Mission Status read service, or Kitty Desktop) that
  renders the first two content screens inside the app shell, and the user looking at them.
- **Trigger**: the app shell exists (`app-shell-01M3V82X`) but has no content. Missions (the project's Mission
  collection) and Pipeline (one Mission's phases and work-package board) are the first two screens that fill it.
- **Desired outcome**: two screens, **Missions** and **Pipeline**, each taking typed data in as properties and a view
  state (`loading`, `error`, `empty`, `ready`), each emitting `sk-*` intent events out, each visible in every state of the
  state matrix as a Storybook story with an approved visual baseline, built against the Mission Status contract
  without waiting for a live service.
- **Rules that always hold**: the screens perform no I/O (no fetch, XHR, WebSocket, Tauri API or browser storage);
  they emit intent and the host routes and loads. Every UI primitive that the design library provides is rendered
  with that library element (elements over CSS). The prototype is the visual source of truth; only the approved drift
  listed in the Clarifications is allowed. The screens do no arithmetic on contract values. The pipeline is
  data-driven (see FUTURE CONSTRAINT in the Clarifications).
- **Canonical terms**: *Mission* (never "feature"); *work package* (WP); *status lane* (one of the nine contract
  values); *column* or *lane group* (a board column, one or more status lanes); *view state* (`loading`, `error`,
  `empty`, `ready`); *tier* (expanded, collapsed, mobile, owned by the shell); *Mission phase* (a stage of the
  Mission workflow, not the glossary term phase and not a work package's phase label).
- **Out of scope**: data loading, caching, refresh and live (SSE) updates; routing; Work Package detail, Artifacts, Drift
  and Ops screens; the shell's own frame, sidebar content and top bar; the dynamic pipeline itself; the contract
  changes listed under Contract gaps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See and find the project's Missions (Priority: P1)

A user opens the project and sees the Missions screen: a header with the project, branch and Mission count; a search
box; six status filters; and one row per Mission showing its name, slug, Mission type, topology, a work-package lane
summary, its lifecycle status and when it was last active. Search and filters narrow the rows that were given to the
screen.

**Why this priority**: this is the entry point of every Mission-level journey; nothing else is reachable without it.

**Independent Test**: render the populated story, type a search, toggle each filter and read the rows, the badges and
the emitted events.

**Acceptance Scenarios**:

1. **Given** a populated project with mixed statuses and topologies and a Mission with a blocked work package,
   **When** the screen is `ready`, **Then** every Mission is a row with name, slug, type, topology, lane summary,
   lifecycle status and last activity, and the blocked Mission shows a blocked badge with its count.
2. **Given** the filter All, **When** the user activates Active, **Then** the filter toggles to pressed, only Missions
   whose lifecycle status is active remain, and `sk-filter-change` is emitted with the filter `active`.
3. **Given** the user types text in the search box, **When** the text changes, **Then** only Missions matching the
   text remain and `sk-search` is emitted with the query.
4. **Given** a row, **When** the user activates it by pointer or keyboard, **Then** `sk-open-mission` is emitted with
   the Mission identity and the screen itself does not navigate.

---

### User Story 2 - Page through a long list (Priority: P1)

A project has more Missions than one page. The user reaches the end of the loaded rows and finds a "Load more
Missions" row; activating it asks the host for the next page. Nothing loads by scrolling.

**Why this priority**: the contract answers in pages; without this a long project is silently truncated.

**Independent Test**: render a first page with a next page and a last page, activate the row and assert the event and
that the row disappears when no page follows.

**Acceptance Scenarios**:

1. **Given** a page with `hasNextPage` true, **When** the list renders, **Then** the last item of the list is a "Load
   more Missions" row.
2. **Given** that row, **When** the user activates it, **Then** `sk-load-more` is emitted with the page cursor given
   for the next page.
3. **Given** the last page (`hasNextPage` false), **When** the list renders, **Then** there is no "Load more Missions"
   row.
4. **Given** a search or filter that matches no loaded Mission while more pages exist, **When** the no-match state
   shows, **Then** it still offers "Load more Missions".

---

### User Story 3 - Read one Mission's pipeline (Priority: P1)

A user opens a Mission and sees the Pipeline screen: a breadcrumb back to Missions, a phase bar with the Mission's
phases and how far each has got, a board of work-package cards in columns, and a side panel with the current step,
Mission progress, blockers, the target branch and a way to view artifacts.

**Why this priority**: this is the Mission-level answer to "where are we".

**Independent Test**: render the implement-in-progress story and read the phase bar, columns, cards and side panel; activate
a card and the view-artifacts action and assert the events.

**Acceptance Scenarios**:

1. **Given** a Mission whose implement phase is in progress, **When** the screen is `ready`, **Then** the phase bar
   marks specify, plan and tasks complete, implement current and review pending, and the board shows five columns
   (Planned, In progress, Review, Approved, Done).
2. **Given** a card, **When** the user activates it, **Then** `sk-select-work-package` is emitted with the Mission and
   work-package identity.
3. **Given** the side panel, **When** the user activates "View artifacts", **Then** `sk-view-artifacts` is emitted
   with the Mission identity.
4. **Given** the breadcrumb, **When** the user activates "Missions", **Then** the screen emits a navigation intent to
   the Missions list and does not navigate.

---

### User Story 4 - See blocked, reviewing and canceled work (Priority: P2)

A work package that is blocked, being reviewed or canceled is not folded in silently: it sits in the column the
operator decided, carrying a badge or marker that says which it is.

**Why this priority**: it fixes the loss of information in the dashboard being replaced (spec-kitty#5530).

**Independent Test**: render the board with one blocked, one reviewing and one canceled work package and read their
columns and badges.

**Acceptance Scenarios**:

1. **Given** a blocked work package, **When** the board renders, **Then** its card is in Planned with a blocked badge.
2. **Given** a work package in review (`in_review`), **When** the board renders, **Then** its card is in Review with a
   reviewing marker.
3. **Given** a canceled work package, **When** the board renders, **Then** its card is in Done with a canceled badge.

---

### User Story 5 - The pipeline follows the data (Priority: P2)

A later Mission will shape the pipeline from the charter and doctrine packs. The phase bar shows whatever phases
arrive, in the order and number they arrive, labelled by the data, so it survives that change unmodified.

**Why this priority**: the operator's binding FUTURE CONSTRAINT; the screen must not block the dynamic pipeline.

**Independent Test**: render the phase bar with 3 phases and with 7 phases whose names the screen has never seen.

**Acceptance Scenarios**:

1. **Given** 3 phases with unknown names, **When** the bar renders, **Then** exactly 3 phases show, in array order,
   each labelled by the label hook or, absent a mapping, by its raw name.
2. **Given** 7 phases with unknown names, **When** the bar renders, **Then** exactly 7 phases show in array order and
   nothing is hidden, truncated or reordered.

---

### User Story 6 - Every state keeps the frame (Priority: P2)

A screen that is loading, empty, failed or shown at a narrow width stays inside the app shell with the frame
unchanged.

**Why this priority**: every screen shows these states; a screen that jumps or hides its frame is a defect.

**Independent Test**: one story per view state and tier, each inside the shell.

**Acceptance Scenarios**:

1. **Given** the view state `loading`, `error` or `empty`, **When** either screen renders, **Then** the state's own
   content replaces the screen content only and no list, board or search is shown (Missions `empty`: search and
   filters hidden).
2. **Given** the collapsed or mobile tier, **When** either screen renders inside the shell, **Then** its content
   stays usable in the content area and the shell, not the screen, owns the tier change.

### Edge Cases

- **Long names**: a very long Mission name, slug, work-package title or lane label wraps or truncates inside its row or
  card without overflowing the row, card, column or page, and the full text stays available to assistive technology.
- **Unknown lane value**: a work package whose `statusLane` is a string outside the nine known lanes is never dropped;
  it appears in the first group showing its raw lane value as its state label (resolved at plan, `research.md`).
- **`statusLane` null**: a work package with no events appears in the first group with a "not started" badge.
- **Zero work packages**: a Mission with `wpTotal` 0 (draft) shows five empty columns, every phase pending and
  blockers 0, in the `ready` state; it is not an error and not `empty`.
- **`blockedCount` above 0**: the side panel shows the count; the blocked work packages appear in Planned with the
  blocked badge; a Missions row shows a blocked badge with the count.
- **More pages and no match**: a search or filter that matches no loaded Mission while pages remain shows "No Missions
  match" and still offers "Load more Missions"; with no further page it offers nothing to load.
- **Draft Missions**: a Mission whose `lifecycleStatus` is `draft` carries a draft badge and appears only under All.
- **Absent or null optional data**: `missionType` null (no type badge), `lastActivityAt` null (a "no activity" label,
  resolved at plan), a work-package actor absent (nothing rendered, no placeholder), `stale` absent (not stale), `nextAction`
  null (the in-progress phase label is used), no work-package dependencies (no dependency text).
- **Several in-progress phases**: the contract can mark implement and review both in progress; the current-step label
  uses the first in-progress phase in array order (resolved at plan, `research.md`).
- **No in-progress phase**: all pending or all complete; the current-step line shows a neutral "No step in progress"
  (resolved at plan, `research.md`) and never an invented command.
- **Duplicate display names**: two Missions with the same name are told apart by slug and by identity in the event
  payload.
- **Unknown topology**: the contract value `unknown` is shown as a label, not hidden.
- **Search characters**: queries with regular-expression characters or leading/trailing whitespace behave as plain text
  (whitespace trimmed).
- **Large text**: at a root font size of 200% rows, cards and columns reflow without horizontal overflow caused by the
  screen.

## State Matrix and Acceptance

Each row is one Storybook story and one visual baseline: dark theme, synthetic fixtures, rendered inside the mission
shell. Each row also states its testable pass condition and the event and payload it asserts (an event column of "none"
means the test asserts that no event was emitted). Event names marked "proposed" were resolved at plan (`research.md`, `contracts/`).

### Missions

| ID | State | Prototype source | Given / When / Then (pass condition) | Event and payload asserted |
|---|---|---|---|---|
| MS-01 | Populated: mixed statuses, topologies, a blocked WP | `02-missions.html` | Given a `ready` page of Missions of mixed lifecycle statuses and topologies, one with `blockedCount` above 0; When rendered; Then header, search, six filters (All pressed), and every row with name, slug, type, topology, lane summary, lifecycle status, last activity show, and the blocked Mission shows a blocked badge with its count | Activating a row emits `sk-open-mission` with that Mission's `missionId` and `slug` |
| MS-02 | A filter active, one row per filter | `02-missions.html` | Given the populated list; When the user activates Active, Planned, Done, Stale or Discarded in turn (each its own story and baseline); Then exactly that filter is pressed and only matching Missions remain: Active = `lifecycleStatus` active, Planned = planned, Done = done, Discarded = discarded, Stale = Missions whose host `stale` boolean is true (absent = not stale); Draft Missions show only under All | `sk-filter-change` with `{ filter }` equal to `active`, `planned`, `done`, `stale` or `discarded`; All emits `all` (payload resolved at plan) |
| MS-02a | Filter All | `02-missions.html` | Given any other filter active; When the user activates All; Then every loaded Mission, drafts included, shows | `sk-filter-change` with `{ filter: 'all' }` |
| MS-03 | Search or filter matches nothing | `02-missions.html` | Given the populated list; When a search or filter matches no loaded Mission; Then "No Missions match" with the hint to try another status or clear the search shows in place of the rows, the search and filters stay visible, and "Load more Missions" is offered when `hasNextPage` is true and not offered when false | `sk-search` with `{ query }`; activating Load more emits `sk-load-more` with the page cursor |
| MS-04 | Empty project | `02-missions.html?state=empty` | Given view state `empty`; When rendered; Then "No Missions in this project" shows, and search and filters are hidden | none |
| MS-05 | Loading | `02-missions.html?state=loading` | Given view state `loading`; When rendered; Then a busy indicator labelled "Reading local Mission index" shows, the region is marked busy, and no rows, search or filters show | none |
| MS-06 | Error: index cannot be read | `02-missions.html?state=error` | Given view state `error`; When rendered; Then an alert notice "Mission index unavailable" shows and no rows are shown | none |
| MS-07 | Long list and paging | new: confirm | Given a first page with `hasNextPage` true and a `nextPageCursor`; When the list renders; Then a "Load more Missions" row ends the list; Given the last page; Then no such row; Given a long list; Then the list scrolls inside the content area and nothing loads by scrolling | `sk-load-more` with `{ cursor: <nextPageCursor> }`, asserted once per activation |
| MS-08 | Collapsed tier and mobile tier | new (shell tiers) | Given the collapsed (720 to 1099 px) and the mobile (below 720 px) widths; When rendered inside the shell; Then rows, filters and the search stay usable in the content area without horizontal overflow caused by the screen | none; row activation still emits `sk-open-mission` |

### Pipeline

| ID | State | Prototype source | Given / When / Then (pass condition) | Event and payload asserted |
|---|---|---|---|---|
| PL-01 | Implement in progress; review pending | `03-pipeline.html` | Given specify, plan and tasks complete, implement in progress, review pending; When rendered; Then breadcrumb, phase bar (done, done, done, current, pending), five columns Planned, In progress, Review, Approved, Done (each with its card count; Planned, In progress and Done, the canceled card, carry cards, Review and Approved show count 0 because the contract's derivation of `phases` forbids review pending next to a for_review, in_review, approved or done work package), cards (each with its subtask progress bar when `total` is above 0), and the side panel with the current step, progress, blockers 0, target branch and View artifacts show | Card activation emits `sk-select-work-package` with `missionId` and `wpId`; View artifacts emits `sk-view-artifacts` with `missionId`; breadcrumb emits `sk-open-missions` (resolved at plan) |
| PL-02 | Every phase pending (new Mission, no WPs) | new | Given every phase pending and no work packages; When rendered; Then all phases show pending, five empty columns show, blockers 0, progress as given, and the current step shows the neutral "No step in progress" | none |
| PL-03 | Every phase complete, all WPs done | new | Given every phase complete and all work packages done; When rendered; Then every phase shows complete, all cards are in Done, and the current step is the contract `nextAction` when non-null, else the neutral line | none |
| PL-04 | Blockers above 0, a blocked WP | new | Given `blockedCount` above 0; When rendered; Then the side panel shows the count (and only the count, no reasons) and the blocked work package is in Planned with a blocked badge | none |
| PL-05 | Loading | new | Given view state `loading`; When rendered; Then a busy indicator shows and no phase bar, board or side panel shows | none |
| PL-06 | Error | new | Given view state `error`; When rendered; Then an alert notice shows and no phase bar, board or side panel shows | none |
| PL-07 | Non-default phase list: 3 and 7 phases, unknown names | new: future-proofing | Given 3 phases and, in a second story, 7 phases whose names are not among the five contract names; When rendered; Then exactly that many phases show, in array order, labelled via the label hook or the raw name | none |
| PL-08 | Collapsed tier and mobile tier | new (shell tiers) | Given the collapsed and mobile widths; When rendered inside the shell; Then the phase bar, board and side panel stay usable (the board scrolls inside its own region, the panel does not overlap the board) without horizontal overflow of the page caused by the screen | none; card activation still emits `sk-select-work-package` |
| PL-09 | Board with a blocked, a reviewing and a canceled WP | new (operator comment) | Given one work package blocked, one `in_review`, one canceled; When rendered; Then the blocked one is in Planned with a blocked badge, the in-review one in Review with a reviewing marker, the canceled one in Done with a canceled badge | `sk-select-work-package` for each of the three with its own `wpId` |
| PL-11 | Card progress bar: partial, complete, total 0 | new (operator decision) | Given cards whose `subtaskProgress` is partial (for example 2 of 5), complete (for example 3 of 3) and `total` 0; When rendered; Then the first two show a progress bar exposing done and total as given, and the third shows no bar and no placeholder | none |
| PL-10 | Empty (row added at plan; built provisionally, confirmed or dropped at CP-1) | new | Given view state `empty`; When rendered; Then the frame and a neutral empty notice show with no phase bar or board | none |

All five columns populated with cards are demonstrated by PL-11 (one work package in each of the nine lanes); Done by PL-03 and Planned, Review and Done by PL-09 as well (amendment ruling P-8).

PL-10 was added at plan and is built provisionally; the operator confirms or drops it at checkpoint CP-1 (the Pipeline empty copy is among the copy defaults, ruling P-6). The charter requires a story per view state and the screen contract has four view states, but the issue's
matrix lists no Pipeline `empty` row.

### Event interaction checks

| Check | Trigger | Asserted event (bubbles, composed) and payload |
|---|---|---|
| EV-1 | Activate a Mission row (pointer, Enter, Space as for a link or button) | `sk-open-mission`, `{ missionId, slug }` |
| EV-2 | Toggle a filter | `sk-filter-change`, `{ filter }` |
| EV-3 | Edit the search text | `sk-search`, `{ query }` |
| EV-4 | Activate "Load more Missions" | `sk-load-more`, `{ cursor }` |
| EV-5 | Activate a work-package card | `sk-select-work-package`, `{ missionId, wpId }` |
| EV-6 | Activate "View artifacts" | `sk-view-artifacts`, `{ missionId }` |
| EV-7 | Activate the "Missions" breadcrumb | `sk-open-missions`, no payload (name resolved at plan) |

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status | Delivery | No-op passable? |
|----|-------|------------|----------|--------|----------|-----------------|
| FR-001 | Missions header | As a user, I want a page header with the project, the branch and the Mission count, so that I know which project I am looking at. The project name and Mission count come from the project data; the branch is a host-passed value (the project has no branch; each Mission carries its own target branch). | High | Open | [build] | no |
| FR-002 | Search | As a user, I want a labelled search box ("Search Missions") that filters the rows, so that I can find a Mission by name, slug, Mission type or topology. | High | Open | [build] | no |
| FR-003 | Six status filters as a toggle group | As a user, I want the filters All, Active, Planned, Done, Stale and Discarded as a keyboard-operable toggle group with exactly one pressed, so that I can narrow the list. Each maps one-to-one onto the lifecycle status of the same name; Stale maps onto the optional host `stale` boolean of a Mission (absent means not stale). | High | Open | [build] | no |
| FR-004 | Mission rows | As a user, I want each row to show the Mission name, slug, Mission type, topology, a work-package lane summary, the lifecycle status and the last activity, so that I can recognise the Mission at a glance. | High | Open | [build] | no |
| FR-005 | Row badges | As a user, I want a draft badge on draft Missions (shown only under All), a blocked badge with the count when `blockedCount` is above 0, a stale badge on stale Missions, and the lifecycle label "Discarded" (not "Abandoned") on discarded Missions, so that exceptional states are visible. | High | Open | [build] | no |
| FR-006 | Lane summary and label mapping | As a user, I want the row's lane summary formatted from the status-lane counts through the same lane-group and label mapping the board uses, with no arithmetic (no summing across lanes), so that the list and the board speak the same words. | Medium | Open | [build] | no |
| FR-007 | Open-Mission intent | As a host, I want activating a row to emit `sk-open-mission` with the Mission identity, so that I route to the Pipeline; the screen never navigates. | High | Open | [build] | no |
| FR-008 | Load more Missions | As a user, I want a "Load more Missions" row at the end of the list while a next page exists, emitting `sk-load-more` with the page cursor, with no infinite scroll, so that I can reach every Mission. | High | Open | [build] | no |
| FR-009 | Element-side filter and search | As a host, I want the screen to filter and search the Missions it was given and also emit `sk-filter-change` and `sk-search`, so that I can act on them; the contract has no server-side search or filter. The no-match state shows "No Missions match" and, while more pages exist, still offers "Load more Missions". | High | Open | [build] | no |
| FR-010 | Relative last-activity time | As a user, I want the last activity as a relative time ("2 hours ago"), computed from a host-passed `now` or through a label hook that falls back to the ISO timestamp, so that the screen needs no clock or locale I/O. | Medium | Open | [build] | no |
| FR-011 | Missions view states | As a user, I want the Missions screen to show `loading` (busy indicator, "Reading local Mission index"), `error` (alert, "Mission index unavailable"), `empty` ("No Missions in this project", search and filters hidden) and `ready`, so that I always know what the screen is doing. | High | Open | [build] | no |
| FR-012 | Pipeline breadcrumb and header | As a user, I want a breadcrumb "Missions / <Mission name>" and the page title "Pipeline" with the Mission's target branch, so that I can return to the list and see where the Mission lands. The "Missions" crumb emits a navigation intent (`sk-open-missions`, name resolved at plan). | High | Open | [build] | no |
| FR-013 | Data-driven phase bar | As a user, I want the phase bar to render the phases it receives, in array order and in whatever number, each showing complete, current (in progress) or pending, so that the bar survives a future pipeline built from the charter and doctrine packs. It never hard-codes the five names, their count or their order. | High | Open | [build] | no |
| FR-014 | Phase labels via one hook | As a host, I want phase labels produced by one label-mapping hook with a fallback to the raw phase name, with no branching over phase names in rendering, so that unknown phase names render. The screen's own phase type widens the phase name to a string. | High | Open | [build] | no |
| FR-015 | Board columns from a lane-group prop | As a host, I want the board columns to come in as a lane-group prop (a list of columns, each with a label and the status lanes it holds), defaulting to the operator's five: Planned (planned, blocked), In progress (claimed, in_progress), Review (for_review, in_review), Approved (approved), Done (done, canceled), so that a later pipeline can pass its own groups. | High | Open | [build] | no |
| FR-016 | State badges on the board | As a user, I want a blocked badge on blocked work packages, a reviewing marker on `in_review` work packages, a canceled badge on canceled work packages, and a "not started" badge on work packages with a null status lane (placed in the first group), so that no state is folded in silently. | High | Open | [build] | no |
| FR-017 | Work-package cards | As a user, I want each card to show the work-package id, its state, its title, a subtask progress bar, an optional actor (hidden when absent) and its dependencies (hidden when none), so that I can scan the board. The progress bar is rendered from the contract's `WorkPackageSummary.subtaskProgress` (`{ done, total }`), as given, and is hidden when `total` is 0 (operator decision after the specify phase). | High | Open | [build] | no |
| FR-018 | Select-work-package intent | As a host, I want activating a card to emit `sk-select-work-package` with the Mission and work-package identity, so that I route to the Work Package screen. | High | Open | [build] | no |
| FR-019 | Current step | As a user, I want the side panel's current step to show the contract `nextAction` text when it is non-null and otherwise "Current step: <label of the in-progress phase>", never an invented command string. | High | Open | [build] | no |
| FR-020 | Progress, blockers and target branch | As a user, I want the side panel to show Mission progress exactly as the contract's `MissionProgress` gives it (no arithmetic), the blockers as a count only from `blockedCount` (no reasons), and the Mission's target branch. | High | Open | [build] | no |
| FR-021 | View-artifacts intent | As a host, I want a "View artifacts" action in the side panel emitting `sk-view-artifacts` with the Mission identity, so that I route to the Artifacts screen. | High | Open | [build] | no |
| FR-022 | Pipeline view states | As a user, I want the Pipeline screen to show `loading`, `error`, `empty` and `ready` with the frame unchanged, so that failure and waiting never break the layout. | High | Open | [build] | no |
| FR-023 | Tiers via the shell | As a user, I want both screens to stay usable in the collapsed and mobile tiers while the shell, not the screen, owns the tier change (`app-shell-01M3V82X#FR-006`, `app-shell-01M3V82X#FR-007`). | Medium | Open | [build] | no |
| FR-024 | Keyboard and focus | As a keyboard user, I want the search, every filter, every row, "Load more Missions", the breadcrumb link, every card and "View artifacts" reachable and operable by keyboard with visible focus, and the filters operable as a toggle group, so that nothing needs a pointer. | High | Open | [build] | no |
| FR-025 | Accessible semantics | As a user of assistive technology, I want a labelled search, a labelled filter group exposing pressed state, busy exposed on `loading`, an alert on `error`, a labelled phase list exposing each phase's status, the board columns labelled with their counts, a labelled Mission progress indicator, and a labelled subtask progress indicator on each card that shows one (exposing done and total), so that the screens are usable without sight. | High | Open | [build] | no |
| FR-026 | Typed properties and events declared | As a developer, I want every public property and every emitted event of both screens declared in the custom-elements manifest, with properties typed from the Mission Status read contract, so that hosts get typed, discoverable interfaces. The public properties the plan names beyond the spec are part of the declared surface with their defaults (`contracts/*.md`): `missionsHref` (default `#/missions`) and `errorMessage` (default empty, overrides the default error body) on `sk-pipeline-screen`; `errorMessage` on `sk-missions-screen`; `label` on `sk-phase-bar`, `sk-work-package-board` and `sk-filter-toggle-group`; and `filter`, `query`, `loadingMore`, `pageInfo`, `project`, `laneGroups`, `labels` for behaviour described above. | High | Open | [build] | yes — paired with the interaction tests (FR-028), which fail when a screen emits an undeclared event |
| FR-027 | Quality gates | As a reviewer, I want the no-I/O architectural gate, ESLint, Stylelint (token-only), typecheck, the Storybook build, the unit and interaction tests and the manifest gate to pass with 0 findings. | High | Open | [build] | yes — paired with gate-proof runs against deliberate violations (a fetch call, a raw colour literal, a missing manifest event) |
| FR-028 | Interaction tests | As a reviewer, I want tests that assert every emitted event and its payload (EV-1 to EV-7) and that assert no event on state-only interactions. | High | Open | [build] | no |
| FR-029 | State matrix as stories and baselines | As a reviewer, I want every row of the state matrix (MS-01 to MS-08 with MS-02 once per filter, PL-01 to PL-09 and PL-11, and PL-10 if confirmed at CP-1) as a Storybook story with an approved visual baseline in the dark theme inside the shell, plus one story per view state of each screen. | High | Open | [build] | no |
| FR-030 | Contract-derived fixtures | As a reviewer, I want fixtures derived from the contract's own examples (the Mission overview pages, the Mission detail examples and the project example), extended only for states the examples lack (blocked, in-review and canceled work packages, null lane, stale, unknown phases), valid against the closed contract shapes and free of real paths and usernames. | High | Open | [build] | no |
| FR-031 | Elements over CSS and recorded gaps | As a maintainer, I want every UI primitive the design library provides rendered with that library's element, project CSS limited to layout with design tokens only, and any missing primitive recorded as a component gap for the design library instead of hand-rolled. | High | Open | [build] | no |
| FR-032 | Visual fidelity to the prototype | As the operator, I want each screen to match the approved prototype screen side by side, with only the approved drift (Clarifications, item 1), so that Storybook stays the visual source of truth. | High | Open | [build] | no |
| FR-033 | Shell progress percentage | As a user, I want the shell footer's progress and the Pipeline side panel to agree, so that `ShellMission.progress` gains an optional `percentage`, shown verbatim when present, with the 58 existing shell baselines unchanged. | Medium | Open | [build] | no |
| FR-034 | Result-count live region | As a user of assistive technology, I want a visually hidden polite live region on the Missions screen announcing the number of Missions shown after a filter or search change and after "Load more Missions", so that I learn the effect of a change I cannot see. | Medium | Open | [build] | yes — paired with an interaction/a11y test asserting the region's politeness, its text after each of the three changes and that it is visually hidden |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Gates stay green | Typecheck, ESLint, Stylelint, the no-I/O gate, the manifest gate, hygiene, the Storybook build and unit and interaction tests pass with 0 findings on the pull request. | Quality | High | Open |
| NFR-002 | Visual stability | Every baseline of the state matrix produces 0 visual failures across 5 consecutive runs on an unchanged commit, at the shell's widths (1280, 1024, 800, 680, 390 and 320 px where the row applies). | Reliability | High | Open |
| NFR-003 | Keyboard reachability | 100% of interactive controls of both screens are reachable and operable by keyboard alone in every tier, and a keyboard user reaches every control in no more tab stops than the controls shown. The work-package board's scroll region, when the board overflows, is itself a tab stop (the library's own contract and WCAG 2.1.1) and counts as a control. | Accessibility | High | Open |
| NFR-004 | Large text | At a root font size of 200%, neither screen causes horizontal overflow of the content area at 1100 px and 720 px. | Accessibility | Medium | Open |
| NFR-005 | No I/O | The no-I/O gate reports 0 violations; no fetch, XHR, WebSocket, Tauri API, browser storage or timer-based polling appears in the screens or their pattern elements. | Security | High | Open |
| NFR-006 | Filter and search responsiveness | With 500 loaded Missions, a search keystroke or filter toggle updates the rows in 200 ms or less in the interaction test environment. | Performance | Medium | Open |
| NFR-007 | Fixture hygiene | 0 fixture values contain an absolute filesystem path, a real e-mail address or the username of the account that executes the gate. Checked by the repository hygiene gate (tokens, absolute-path rules including `/home/<name>`, and a new path-scoped e-mail rule) and by gate `contract` (actors only from the `SYNTHETIC_ACTORS` allow-list; fixture string values scanned for the executing account's username). No gate detects an arbitrary login name in free text; that reach is stated, not claimed. | Security | High | Open |
| NFR-008 | Prototype fidelity | 0 unapproved visual differences from the prototype in the side-by-side review of each baseline; any unapproved difference is a REJECT. | Quality | High | Open |
| NFR-009 | Gate `data-driven` | A data-driven gate (`eslint.data-driven.config.mjs`, run as `pnpm lint:data-driven`) reports 0 violations on the screens, the pattern elements and their logic, fails on every planted violation of its selector set (self-test, negative cases, count guard, plant), ignores inline disable comments, and runs as its own CI job with a gate-proof leg. | Quality | High | Open |
| NFR-010 | Gate `contract` | A contract gate (`pnpm contract:check`, checks C1 to C7) reports 0 findings: the vendored contract equals its pin, the generated types and fixtures are fresh, every fixture is a document the contract can produce (its derivations recomputed), hygiene covers the contract set; it fails on each plant, and runs as its own CI job with a gate-proof leg. | Quality | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Screen contract | Data in as properties typed from the Mission Status read contract; view state in as a property (`loading`, `error`, `empty`, `ready`); user intent out as `sk-*` CustomEvents that bubble and are composed; no I/O (charter, "The screen contract"). | Technical | High | Open |
| C-002 | Contract basis and pin | Types are generated from the split Mission Status document, `contracts/mission-status/openapi.yaml` in spec-kitty, at a pinned `main` commit (resolved at specify time: `9f41e48fe0e8b00cd040690598e90c37d82ea4a2`; the plan re-verifies the pin). Mission-status contract `1.0.0` at spec-kitty `9f41e48` (the document's `info.version` reads `1.0.0` at that commit; it becomes `1.0.0-SNAPSHOT` on a later re-pin, once spec-kitty's release-tooling slice lands). Response schemas are closed: a shape change is a new contract version. | Technical | High | Open |
| C-003 | Provisional parts not consumed | The `x-provisional` parts of the contract (the event stream, its cursor and resume rules) are not consumed; neither screen consumes events. | Technical | High | Open |
| C-004 | No arithmetic | The screens do no arithmetic on contract values: progress is shown as given, lane summaries and counts are shown as given or by mapping, blockers are `blockedCount`. | Product | High | Open |
| C-005 | Elements over CSS | Charter, "Elements over CSS": every primitive the design library provides is rendered with its element; re-implementing it with hand-written CSS or copied style classes is a review failure; project CSS is layout only with `--sk-*` tokens; a missing primitive is a recorded component gap; a temporary stand-in needs a PR-recorded exception. | Technical | High | Open |
| C-006 | Prototype is the visual authority | The approved prototype (Missions and Pipeline screens) is the visual source of truth; only the approved drift is allowed: "Abandoned" to "Discarded", the Approved and Done columns, and the Planned, Stale and Discarded filters. Any other drift is a defect and a visual review REJECT. | Design | High | Open |
| C-007 | Data-driven pipeline | The phase bar and board never hard-code the five phase names, their count or order, or the board's columns; labels come through one hook with raw-name fallback; board groups come in as a prop. | Technical | High | Open |
| C-008 | Fixtures and risk boundaries | Fixtures are synthetic: no real user data, no absolute filesystem paths, no OS usernames, no secrets (charter, "Risk boundaries"). | Security | High | Open |
| C-009 | Terminology | The word "Mission" is used everywhere in the screens and the specification; "feature" is not used. | Product | Medium | Open |
| C-010 | Shell dependency | Both screens render inside the app shell delivered by `app-shell-01M3V82X`; the shell owns the top bar, rail, sidebar (including the Mission sidebar's own head and footer), tiers and skip link; these screens add content only. | Scope | High | Open |
| C-011 | Review and governance | Pull request into `main`; the operator merges; every work package is reviewed by a separate reviewer agent; the adversarial review squad runs after the plan phase only (charter). | Governance | High | Open |
| C-012 | No intent beyond the issue | No routing, data loading, caching, refresh, live updates or persistence in the screens; no Work Package detail, Artifacts, Drift or Ops screens. | Scope | High | Open |

### Key Entities *(include if the mission involves data)*

- **Project**: the project name and the number of Missions the service lists (`missionCount`); it has no branch. The
  header branch is a host-passed value.
- **Mission overview**: one row's data: identity (`missionId`, `slug`, `friendlyName`), `missionType` (may be null),
  `targetBranch`, `topology` (lanes, single_branch, coord, lanes_with_coord, unknown), `statusLaneCounts`, `wpTotal`,
  `blockedCount`, `progress`, `lifecycleStatus` (active, planned, done, draft, discarded), `lastActivityAt` (may be
  null), `nextAction` (may be null). Plus the optional host `stale` boolean (absent = not stale; not in the contract).
- **Mission overview page**: the Mission overviews of one page plus the page state (`hasNextPage`, `nextPageCursor`,
  `pageSize`); ordered by the service by creation time descending, then identity ascending; the screens do not re-sort.
- **Mission detail**: every overview field plus the Mission phases and a summary of each work package.
- **Mission phase**: a name, a status (pending, in_progress, complete) and a basis; today five names in fixed order,
  tomorrow any number of any names (the screen's own type widens the name to a string).
- **Work package summary**: `wpId`, `title`, `phaseLabel`, `statusLane` (nine values, or null when it has no events),
  `dependencies`, `readiness`, `readyToStart`, `subtaskProgress` (`{ done, total }`, drives the card progress bar), `lastTransitionAt`; plus the optional host-passed
  actor (hidden when absent; not in the contract summary).
- **Lane group (column)**: a label and the status lanes it holds; the board's columns come in as a list of these.
- **Mission progress**: `weightedPercentage`, `donePercentage`, `doneCount`, `semantics`; shown as given.
- **View state**: `loading`, `error`, `empty`, `ready`.
- **Subtask progress**: `done` and `total` of one work package (`SubtaskProgress`); the card's progress bar renders it and hides when `total` is 0.
- **Intent events**: `sk-open-mission`, `sk-filter-change`, `sk-search`, `sk-load-more`, `sk-select-work-package`,
  `sk-view-artifacts`, `sk-open-missions`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every row of the state matrix (MS-01 to MS-08 with MS-02 once per filter, PL-01 to PL-09 and PL-11, and PL-10 if confirmed at CP-1) exists as a Storybook story with an approved visual baseline, and each passes its Given/When/Then pass condition — [build] · no-op passable: no
- **SC-002**: Every one of the seven intent events is asserted by an interaction test with its exact payload, and 0 events are emitted that are not declared in the custom-elements manifest — [build] · no-op passable: no
- **SC-003**: A story and test with a pipeline of 3 phases and one of 7 phases, with names the screen has never seen, render exactly 3 and 7 phases in array order — [build] · no-op passable: no
- **SC-004**: The board with a blocked, a reviewing and a canceled work package places them in Planned, Review and Done with the blocked badge, the reviewing marker and the canceled badge, and the board shows all five columns — [build] · no-op passable: no
- **SC-005**: A keyboard-only user reaches and operates every control of both screens in every tier with visible focus; 100% of controls — [build] · no-op passable: no
- **SC-006**: All quality gates pass on the pull request with 0 findings and 0 visual failures across 5 consecutive runs — [build] · no-op passable: no
- **SC-007**: A side-by-side visual review of each baseline against the prototype finds 0 unapproved differences — [build] · no-op passable: no
- **SC-008**: A host can render both screens by passing only contract-shaped data, the host-passed branch, `now` and the optional `stale` and actor values, with no change to the screens and with no I/O performed by them — [build] · no-op passable: no

## Assumptions

- The app shell (`app-shell-01M3V82X`) provides the frame, the tiers (`app-shell-01M3V82X#FR-005`, `app-shell-01M3V82X#FR-006`, `app-shell-01M3V82X#FR-007`), the content focus target and skip link (`app-shell-01M3V82X#FR-019`); the screens fill its content slot.
- The screens are built against the contract and fixtures, not a live service (the read service is built in parallel, spec-kitty#5528).
- `nextAction` is marked provisional in the contract (its shape is an open decision on spec-kitty#5528). The operator's decision uses it when non-null; the screen shows it as opaque display text and never parses it. This is a recorded risk for the plan.
- "Mission progress" is the contract's weighted readiness figure (`weightedPercentage`), as the prototype's single figure; whether to also state its semantics in the label is a plan decision. The figure is shown as given; a presentation suffix ("%") is not arithmetic.
- The lane summary shows one segment per non-zero lane, labelled through the mapping, with no summing of lanes (so claimed and in progress are separate segments); resolved at plan.
- The column card count is the number of cards the column renders; it is not computed from contract values.
- A Mission that is stale and active shows its lifecycle badge and a stale badge, and appears under both Active and Stale (each filter maps one-to-one onto its source); the prototype shows a stale badge in place of the lifecycle badge for stale rows. Resolved at plan.
- The card progress bar is rendered from the contract's `WorkPackageSummary.subtaskProgress` (`{ done, total }`), hidden when `total` is 0 (operator decision, after the specify phase, which supersedes the earlier assumption that the bar has no contract source). It is shown as given, with no arithmetic by the screen (the value and maximum are handed to a native progress indicator). The prototype shows the bar on one card only; the operator's rule is data-driven, so every card with a non-zero `total` shows it regardless of lane (the plan records this in the drift list).
- The prototype's static note on the side panel ("Committed Mission state. The board is a read-only reduction of local artifacts.") is kept as static copy.
- The Mission screens have no retry control: the prototype has none and refresh belongs to the host.
- The "Load more Missions" row may show a busy state while the host loads a page (resolved at plan, `research.md` D-22); the host owns the loading.
- Event names other than `sk-load-more`, `sk-filter-change` and `sk-search` (named in the issue) and their payload shapes were proposed and are resolved at plan (`research.md`, `contracts/`): `sk-open-mission`, `sk-select-work-package`, `sk-view-artifacts` (names from the specify brief, payloads proposed) and `sk-open-missions` (name resolved at plan).
- The filter and search state is held by the screen and may also be set by the host; resolved at plan.
- Dark theme is the baseline theme (theme is owned by the design library).
- The design library may lack some primitives (for example a board column or a phase stepper); each is recorded as a component gap, not hand-rolled (FR-031).

## Clarifications (binding inputs, persisted verbatim-faithful)

These decisions were not recorded as Decision Moments: they are held here so that reviewers audit against them.
Where the issue body and the comments differ, the comments win.

1. **Issue body and both operator-decision comments** (spec-kitty/spec-kitty-mission-ui#4).
   - Filters: six, **All, Active, Planned, Done, Stale, Discarded**. Each maps one-to-one onto `lifecycleStatus`;
     Stale onto the optional host `stale` boolean (absent = not stale). "Abandoned" in the prototype becomes
     "Discarded" (approved drift).
   - Board: five columns, **Planned, In progress, Review, Approved, Done**, with blocked, reviewing and canceled badges.
     Planned = `planned` plus `blocked` (blocked badge). In progress = `claimed`, `in_progress`. Review = `for_review`
     plus `in_review` (reviewing marker). Approved = `approved`. Done = `done` plus `canceled` (canceled badge). The
     grouping is a lane-group prop. The Approved and Done columns are approved drift from the three-column prototype.
   - `MissionProgress` is shown as-is; the screen does no arithmetic.
   - Paging: a "Load more Missions" row emitting `sk-load-more` with the page cursor; no infinite scroll.
   - Stale: optional host `stale` boolean per Mission; absent = not stale. `staleness` is not on `MissionOverview`.
   - Search and filters: the element filters and searches the items it was given, and emits `sk-filter-change` and
     `sk-search` so the host can act. While more pages exist the no-match state still offers "Load more Missions". The
     contract has no server-side search or filter.
   - Work-package actor: optional, hidden when absent (`WorkPackageSummary` has no actor).
   - Current step: `nextAction` when the contract provides it (non-null); otherwise "Current step: <label of the
     in-progress phase>". An invented CLI command string is never rendered.
   - Draft Missions carry a draft badge and appear only under All.
   - Relative times use a host-passed `now`, or a label hook with an ISO fallback; screens do no I/O.
   - The header branch is a host prop; `Project` has no branch; `targetBranch` belongs to each Mission.
   - Work packages with `statusLane: null` go in the first group with a "not started" badge.
   - The phase bar's own prop type widens `name` to a string so that PL-07 is representable.
   - Blockers show the count only, from `blockedCount`; the contract carries no reasons.
   - The lane summary formats `statusLaneCounts` through the same lane-group and label mapping, no arithmetic.
   - State-matrix updates: MS-02 covers each of the six filters; PL-01 shows all five columns; new row PL-09 covers the
     board with a blocked, a reviewing and a canceled work package.
   - Approved drift from the prototype: Abandoned to Discarded; the Approved and Done columns; the Planned, Stale and
     Discarded filters.
2. **FUTURE CONSTRAINT (operator, binding).** A later Mission will adjust the pipeline dynamically based on the charter
   and the doctrine packs loaded. The phase bar renders `phases` in array order and count from data (never hard-coding
   the five names, count or order). Labels come through one mapping hook with a raw-name fallback (no switch over phase
   names). Board lanes and groups come in as a prop. The element's own prop types widen phase `name` to a string. A story
   and a test with 3 and 7 phases of unknown names (PL-07). The contract's `MissionPhase.name` is a closed five-value
   enum today; a dynamic pipeline needs a contract major version later (out of scope; to be raised on spec-kitty#5528
   when designed).
3. **Contract.** spec-kitty `contracts/mission-status/` on `main`; types are generated and consumed from the split
   `openapi.yaml` at a pinned `main` commit (resolved: `9f41e48fe0e8b00cd040690598e90c37d82ea4a2`); mission-status contract
   `1.0.0` at that commit (`1.0.0-SNAPSHOT` after a later re-pin); response schemas are closed (a shape change is a new contract version); the `x-provisional` parts
   (events stream, cursor and resume rules) are not consumed.
4. **Contract gaps** to be raised on spec-kitty#5528 by the orchestrator, not by this mission: see Contract gaps below.
5. **The prototype is the visual source of truth** (`02-missions.html`, `03-pipeline.html`, in the V2 prototype set;
   the earlier Stitch screens are stale and ignored). Only the approved drift is allowed; any other drift is a defect
   (visual review REJECT).
6. **Charter screen contract** (`.kittify/charter/charter.md`, "The screen contract" and "Elements over CSS", cited
   exactly): "Data in as properties, typed from the spec-kitty OpenAPI read contract."; "View state in as a property:
   `loading`, `error`, `empty`, `ready`."; "User intents out as `sk-*` CustomEvents (`bubbles`, `composed`)."; "Screens
   and pattern elements perform **no I/O**: no fetch, XHR, WebSocket, Tauri APIs or browser storage. Fetching, routing
   and refresh belong to the host containers."; "Screens are composed from pattern elements built on
   `@spec-kitty/elements` (atomic design); each element keeps a small, stable interface (deep modules)."; "Every UI
   primitive that `@spec-kitty/elements` provides (card, notice, pill tag, nav pill, status indicator, button, ...) is
   rendered with that `sk-*` element."; "A primitive the library lacks is recorded as a component gap for the design
   library, not hand-rolled. A temporary local stand-in needs an exception recorded in the PR."; and "Every screen has a
   story per view state with synthetic fixtures; interaction tests assert every emitted event and its payload." The
   charter's quality gates also require typecheck, ESLint, Stylelint, the Storybook build, unit and interaction tests,
   visual regression against the prototype, a current custom-elements manifest declaring every public property and event,
   and the no-I/O architectural gate.
7. **State matrix**: MS-01 to MS-08 and PL-01 to PL-09 as in the issue and comments (MS-02 per filter; PL-09 new; PL-11 added by the operator decision on the card progress bar); see the
   State Matrix and Acceptance section, which gives an acceptance row for every row.

7. **Plan amendment rulings P-1 to P-10 (orchestrator, 2026-10-03).** P-1 C-002 reworded. P-2 NFR-009, NFR-010, the
   e-mail rule and NFR-007's wording accepted. P-3 FR-033 added. P-4 NFR-003 counts the board's scroll region. P-5 built:
   FR-034 (result-count live region). P-6 deferred to checkpoint CP-1: the operator confirms DR-1 to DR-12 and the copy
   defaults after IC-03a is approved; until then they stay provisional approved drift. P-7 public properties declared
   (FR-026). P-8 PL-01 built from planned, claimed, in_progress and canceled work packages, review pending; PL-11 shows
   all five columns populated. P-9 the node:test suites of `scripts/hygiene`, `scripts/gate-proof` and
   `scripts/terminology.test.mjs` are wired into a CI gate, recorded as a charter exception (edits an accepted gate's
   command and plant). P-10 `linterOptions: { noInlineConfig: true }` in `eslint.no-io.config.mjs` with a plant proving
   an inline disable no longer silences it, recorded as an exception likewise.

## Contract gaps

To be raised on spec-kitty#5528 by the orchestrator (not by this mission). The screens work around each with a host
prop and do not wait.

1. **Per-Mission staleness on `MissionOverview`.** `MissionOverview` carries no staleness. The Stale filter works on an
   optional host `stale` boolean. (The contract's staleness schema is work-package-level and provisional.)
2. **Actor on `WorkPackageSummary`.** Only the full work-package resource carries an actor. The card shows an optional
   actor and hides it when absent.
3. **Project branch.** `Project` carries no branch; the header branch is a host prop.

Observations for the plan (not operator-decided gaps): `nextAction` is `x-provisional`; the contract's `phases` is fixed
at exactly five entries today (the data-driven pipeline needs a later major version); the document's `info.version`
reads `1.0.0` where the issue says `1.0.0-SNAPSHOT`.

## Out of Scope

- Data loading, caching, refresh and SSE live updates (host).
- Work Package detail, Artifacts, Drift and Ops screens.
- The dynamic pipeline itself, and the contract major version it needs.
- The shell's frame, Mission sidebar head and footer, top bar, rail and tiers (delivered by `app-shell-01M3V82X`).
- Server-side search or filtering; infinite scroll; any routing.
- Raising the contract gaps (the orchestrator does it on spec-kitty#5528).
