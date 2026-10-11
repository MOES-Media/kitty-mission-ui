# Changelog

## Unreleased

### Added

- `sk-drift-screen` (screen): the findings of a drift scan and the detail of the chosen one. Eleven properties (`status`,
  `report`, `selectedFinding`, `missionId`, `missions`, `rescanning`, `copyResult`, `refusalCode`, `now`, `labels`,
  `errorMessage`) and six events (`sk-select-finding`, `sk-rescan-drift`, `sk-copy-command`, `sk-open-mission`,
  `sk-open-missions`, `sk-retry-load`). Regions: header with last scan and Rescan, finding list, detail (kicker, title,
  explanation, authority panel, lane comparison table, suggested resolution with Copy, facts); `loading`, `empty`, `error`,
  `not-found` and nothing-chosen states, a truncation note, three responsive tiers. The host owns the clipboard and the
  selection. Every kind, severity, authority and remedy word is read from `src/defaults/` (`#10`).
- Drift logic (`src/logic`): the pure `drift-finding`, `drift-report`, `drift-keys`, `drift-announce` and `drift-retry` modules, and the
  `drift-copy` vocabulary in `src/defaults`; optional `LabelHooks` members (`kind`, `severity`, `authority`, `derivedSide`, `refusal`);
  `sk-retry-load` gains the member `{ target: 'drift-report' }` (`DriftRetryDetail`); the `data-driven` gate is extended to the Drift
  vocabulary (`#10`).
- `sk-work-package-screen` (screen): one Work Package of a Mission. Ten properties (`status`, `detailStatus`,
  `detailRefusalCode`, `workPackage`, `detail`, `mission`, `wpId`, `now`, `labels`, `errorMessage`) and four events
  (`sk-select-work-package`, `sk-open-mission`, `sk-open-artifact`, `sk-retry-load`). Regions: header, facts, lane history,
  review summary and cycles, cancellation, evidence and dependency chains, subtasks, owned files, workspace and artifact
  links; whole-screen and detail-only views (`loading`, `error`, `empty`, `not-found`, `nothing-selected`); three responsive
  tiers. Every lane, verdict and status word is read from `src/defaults/` (`#5`).
- `sk-work-package-screen` `labels`: a lane has two kinds of word. The `state` hook draws the state badge, the dependency and
  subtask lane words and the cancellation badge; the `lane` hook draws the lane history's "from" and "to" words. A host that
  rewords a lane sets both (`#5`).
- `ShellTierController` and `SHELL_MOBILE_STATE` are exported from the package entry (`@spec-kitty/mission-ui`) (`#5`).
- `ShellTierController` (`src/shell-tier.ts`): follows the enclosing `sk-mission-shell`'s public `tier` across shadow roots and
  sets the CSS custom state `:state(shell-mobile)` on its host while the tier is `mobile` (no attribute). The Work Package
  screen is its first consumer. Without `ElementInternals` custom states (or when `states.add` throws) it warns once per page and
  skips the state; the screen still renders (`#5`).
- `sk-work-package-screen` `mission` has the contract's field names (`missionId`, `slug`, `friendlyName`, `wpTotal`), so the
  Pipeline screen's Mission is assignable unchanged; `sk-retry-load` carries a union keyed on `target`
  (`'work-package'` or `'detail'`). A `wpId` that differs from `workPackage.wpId` in `ready` renders `loading`; a detail of
  another Mission counts as omitted (`#5`).
- Defaults and logic (`src/defaults`, `src/logic`): `review`, `files`, `refusals`, `staleness` and `wp-copy` vocabulary, and
  `resolveLists`, `joinHandles`, `resolveVerdict`, `resolveChangeState`, `filesView`, `stalenessView`, `historyView`,
  `retryDetail` and `resolveRefusal` for the Work Package screen (`#5`).
- Contract (`src/contract`): types and 70 generated fixtures from Mission Status contract commit `b61d1fa` on `main` (48
  new for the Work Package and its detail), the bulk generators `makeWorkPackageHistory`, `makeSubtasks` and
  `makeOwnedFiles`, and the widened view types `WorkPackageRecordView`, `HistoryEntryView`, `WorkPackageDetailView`,
  `SubtaskView` and `DependencyRefView` (`#5`).
- 56 new stories with visual baselines (`Screens/Work Package/`: 10 header and facts, 13 review and history, 19 chains,
  subtasks, workspace and links, 8 states, 6 tiers and edge cases; 174 stories in the workbench), one story per row of the
  state matrix plus six second variants (`#5`).
- `sk-missions-screen` (screen): the Missions list of a project. Header with the project name, the host `branch` and the
  Mission count; a search field; a status filter (`sk-filter-toggle-group`: All, Active, Planned, Done, Stale and
  Discarded); one row per Mission with its badges, lane summary, lifecycle and relative activity; a Load more row. Views
  `loading`, `error`, `empty` and a no-match panel. Four typed events: `sk-open-mission`, `sk-search`, `sk-load-more` and
  the group's own `sk-filter-change`. `now`, `branch` and the `stale` flag are host values.
- `sk-pipeline-screen` (screen): one Mission's pipeline. Breadcrumb, `sk-phase-bar`, the work-package board and a flat
  inspector with the current step, progress, target branch and blockers. Views `loading`, `error` and `empty`. Three typed
  events: `sk-open-missions`, `sk-view-artifacts` and `sk-select-work-package`. Phases and lanes are read from the data;
  no phase name, count or lane word is written in the screen.
- `sk-filter-toggle-group`, `sk-phase-bar` and `sk-work-package-board` (pattern elements, no `@screen`): a pressed-state
  button group (`sk-filter-change`), an ordered phase bar of any length, and a board of five lane columns whose cards emit
  `sk-select-work-package`. The board places blocked, reviewing and canceled work packages in Planned, Review and Done.
- 60 new stories with visual baselines (24 `Mission/Missions`, 22 `Mission/Pipeline`, 6 board, 4 filter group, 4 phase bar;
  118 stories in the workbench), one story per row of the state matrix.
- Gaps in the design library (G-01 to G-08, with their proposed APIs and sunsets) and the approved scoped exceptions E-01
  to E-16 are recorded in `research.md` and `contracts/gates.md` of mission `missions-and-pipeline-screens-01M40SKZ`;
  each local stand-in is deleted when the library ships the primitive.
- `src/defaults/` and `src/logic/`: the single vocabulary module (phase, lane, lifecycle and screen copy, every contract
  value that may appear in the UI) and the pure logic that reads it (lookup, board placement, lane summary, search,
  relative time, current step, row view, label hooks). No other source in the package may contain that vocabulary;
  the `data-driven` gate enforces it.
- `src/contract/`: the types generated from the pinned Mission Status contract (`types.generated.ts`), hand-written
  aliases and the three widened view types (`types.ts`), 22 generated synthetic fixtures (`fixtures.generated.ts`) and
  the large-page generator of `bulk.ts`. Nothing in the package hand-writes a contract type or a fixture.
- `sk-mission-shell` (screen): the application shell. A top bar, an optional global rail, a project or mission sidebar
  and the content column inside a `main` landmark, with its own `status` view state (loading, error, empty, ready) shown
  at the top of the content. The host owns routing, data and persistence; the shell owns layout and the responsive tier.
- Three responsive tiers, read from the window width and reflected on the `tier` attribute: expanded (1100px and up:
  rail, sidebar and content), collapsed (720 to 1099px: icon column with a flyout for the sidebar sections) and mobile
  (under 720px: a hamburger and an overlay drawer that also carries a one-row rail strip in the mission layout).
- `sk-shell-nav-item` and `sk-shell-tree` (pattern elements, no `@screen`): a vertical navigation row with icon,
  `aria-current` and a compact icon-only mode with a label bubble, and a tree of leaves and folders with
  `aria-expanded` / `aria-controls`. Both are slotted into the shell as `sidebar-section`.
- Five typed events, the only events that leave the shell: `sk-navigate`, `sk-tree-toggle`, `sk-toggle-drawer` and
  `sk-toggle-flyout` (both cancelable) and `sk-shell-retry`. Library events stop at the shell.
- 42 `Mission/Shell` stories (every tier at 1280, 1024, 800, 680, 390 and 320 wide, every status, focus, flyout and
  drawer states) with visual baselines. Each story tagged `vw-<n>` is asserted to render the tier its width belongs to
  before the screenshot is taken.
- `DriftReportView`, `DriftFindingView`, `DriftFindingKey`, `DriftMissionName` (types) and `makeDriftReport` (bulk generator, 1000
  findings by default) for the Drift screen (`#10`).

### Design library gaps

The shell keeps local stand-ins for things the design library does not offer yet. Each is a gap with a proposed library
API and a sunset (the local code is deleted when the library ships it); the full table with acceptance criteria is
`research.md` D-08 of mission `app-shell-01M3V82X`. Operator approval of each stand-in is pending and the issues for the
design library are filed by the orchestrator at pull-request time, not from this change.

| ID | Gap | Proposed library API | Sunset |
|---|---|---|---|
| G-01 | `sk-app-shell` has no project (sidebar-only) layout or icon-column mode | `layout` and `sidebar` attributes on `sk-app-shell` | local grid deleted |
| G-02 | no top-bar slot or banner landmark | `top-bar` slot in a `<header>` | local top bar removed |
| G-03 | tier breakpoints are container-based and fixed | configurable or window-based thresholds (1100, 720) | `matchMedia` tier code removed |
| G-04 | compact drawer is in-flow, not an overlay with backdrop | overlay drawer with focus trap, Escape, return focus | local dialog drawer removed |
| G-05 | no vertical nav item or tree with expanded state | `sk-nav-item`, `sk-tree` | `sk-shell-nav-item` and `sk-shell-tree` become wrappers or go |
| G-06 | `sk-button` forwards only `label` (no `aria-expanded`, `aria-controls`, `aria-current`) | attribute passthrough | state-in-name workaround removed |
| G-07 | `sk-personal-rail` flips to a row at 720px and cannot be overridden | `vertical` attribute or container-based flip | local rail removed |
| G-08 | no icon element or icon set | `sk-icon` | `shell-icons.ts` removed |
| G-09 | no progress element | `sk-progress` | text-only footer stand-in removed |
| G-10 | no skip-link element; fragment links do not cross shadow roots | `sk-skip-link target` | local skip link removed |
| G-11 | no overlay primitive; the native `<dialog>` UA border and colours cannot be reset | `sk-drawer`, `sk-flyout` | local dialog and flyout removed |
| G-12 | no label bubble meeting WCAG 1.4.13 | `sk-tooltip` | local bubble removed |
| G-13 | current-item marking cannot reproduce the approved yellow edge | `current` tone attribute on `sk-action-row` | baselines re-approved |
| G-14 | project CSS cannot set `overflow-wrap` | wrap behaviour in library head elements | only if a head primitive fails the long-name story |
| G-15 | `sk-context-sidebar` flips at 720px and its padding crowds a 3.5rem column | `compact` or icon-column mode | local icon column removed |

### Changed

- `sk-mission-sample` no longer self-registers (`src/index.ts` defines the tag once), composes `sk-notice` and
  `sk-section-header` through their slots, and exports `SkMissionRetryDetail` (typed events in
  `HTMLElementEventMap` and the manifest). Its open event is `sk-open-mission`, the same name and detail type
  (`SkOpenMissionDetail`) as the Missions screen's, so "open a Mission" has one event name (verb first, like
  `sk-open-missions`, `sk-select-work-package`, `sk-view-artifacts`, `sk-load-more`). The shell's own events
  (`sk-toggle-*`, `sk-tree-toggle`, `sk-mission-retry`, `sk-shell-retry`, `sk-navigate`) keep their names for now.

### Added

- `sk-mission-sample`: template element encoding the screen contract (`status` view state, data in as
  properties, `sk-open-mission` and `sk-mission-retry` events out, no I/O), with `Ready`, `Empty`, `Loading`
  and `Error` stories and Vitest browser-mode tests.
