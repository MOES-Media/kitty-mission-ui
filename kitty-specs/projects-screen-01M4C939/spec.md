# Mission Specification: Projects screen

**Mission Branch**: `feat/projects-screen-9`
**Created**: 2026-10-08
**Status**: Draft (operator rulings on Q1-Q10 recorded 2026-10-08; drift register pending CP-1)
**Input**: GitHub issue spec-kitty/spec-kitty-mission-ui#9 ("Projects screen against the Mission Status contract"); the
Mission Status contract's `GET /project` (`getProject`, `Project`) as it stands in the final, unmerged contract slice
(spec-kitty PR #5881; the issue names the same slice as spec-kitty#5776); and the approved Kitty Desktop V2 prototype page
`01-projects.html`.

## Intent Summary

- **Primary actor**: a host (Kitty Desktop, or any browser host) that renders the Projects screen as the first screen of the
  app, and the person looking at it.
- **Trigger**: the app starts, or the person leaves a project. The host owns the recent-project list, calls `GET /project`
  once per recent entry, and passes the results in.
- **Desired outcome**: one screen, **Projects**, that takes a host-built list of recent entries (each carrying a contract
  `Project`, or a per-entry status when that project has no `Project` yet) plus a view state, emits `sk-*` intent events out,
  and is visible in every state of the state matrix as a Storybook story with an approved visual baseline, built without a
  live service. It also offers an "Open project" action and, ruled Q3, an optional separate dialog element.
- **Rules that always hold**: the screen performs no I/O (no fetch, XHR, WebSocket, Tauri API, browser storage, timer or
  clock). It is read-only: it never changes a project, and its notice says so. Every UI primitive the design library
  provides is rendered with that library element (elements over CSS). The prototype is the visual source of truth; only
  drift in the register and confirmed by the operator at CP-1 is allowed. The screen does no arithmetic on contract values and
  never decides what is healthy: it draws what `health` says. Nothing about the pipeline is hard-coded.
- **Canonical terms**: *Mission* (never "feature"); *project* (a spec-kitty repository the host can open; the contract
  `Project`); *entry* (the host's wrapper around one recent project, not a contract type); *health* (the contract's
  `ProjectHealth`, never a verdict the screen computes); *view state* (`loading`, `error`, `empty`, `ready`); *entry state*
  (`loading`, `error`, `unavailable`, or none when a `Project` is present); *tier* (expanded, collapsed, narrow, mobile; the
  shell owns the tier, the screen owns its own column collapse).
- **Out of scope**: see "Scope".

## Clarifications

### Operator rulings, 2026-10-08

The operator ruled on 2026-10-08 on the ten questions of `operator-questions.md`. Each ruling is binding on plan, tasks and review and is mirrored in `tracer-design-decisions.md`. The drift register DP-1 to DP-27 is NOT part of these rulings: it stays PROPOSED until CP-1.

- **Q1, ruled.** Where the screen sits: a NEW top-bar-only layout value on the shell's existing `layout` property (no sidebar, no rail, no hamburger, in every tier). The screen adds no property for it. (Option A.)
- **Q2, ruled as recommended.** Every row is openable unless the host marks it not openable (`openable`, default true); loading, error and unavailable entries are never openable. DP-3 is the drift.
- **Q3, ruled.** A separate, optional `sk-open-project-dialog` element with its own states and the `sk-browse-folder` event; the host does the real folder picking. (Option B.)
- **Q4, ruled as recommended.** `schemaVersion` is not shown (accessible description only); a null version hides its slot. The accessible-description passthrough is blocked by the library (spec-kitty-design#528): the prepared `description` is not yet wired, so the schema version does not reach assistive technology until the library forwards it.
- **Q5, ruled as recommended.** `healthy` is success; `schema_drift` is attention; an unknown value is neutral with its raw word.
- **Q6, ruled as recommended.** One generic failure sentence from `defaults/` with a retry; a separate entry state `unavailable` (no retry, not openable).
- **Q7, ruled as recommended.** Events: `sk-open-project` `{ key }`, `sk-request-open-project`, `sk-confirm-open-project` `{ location }`, `sk-browse-folder` `{ location }`, and `sk-retry-load` with the new targets `project` (with `key`), `projects` and `folders`.
- **Q8, ruled with the orchestrator's decision.** The contract is re-vendored ONCE, first, by this mission (its first work package), after spec-kitty PR #5881 merges. There are no stacked branches: the Drift and Ops missions start implementation from `main` after the re-vendor lands.
- **Q9, ruled.** The V2 prototype pages are current.
- **Q10, ruled as recommended.** The entry wrapper is `key`, `location`, `localOnly?`, `openable?`, and one of `project` or `state`; the whole-list `status` wins over entry states; an entry `state` wins over a present `project`.

### Orchestrator decisions (mechanical, across the three screens, 2026-10-08)

- Exception ranges never collide: this mission owns E-31..E-34 (an unused number stays unused); Drift owns E-35..E-39, Ops E-40..E-43.
- `sk-retry-load` `target` values are unique across screens. Taken: `work-package`, `detail` (#5) and #7's artifact targets. This mission keeps `project`, `projects`, `folders`; Drift uses `drift-report`, Ops `ops-page`. The union lives in `src/retry-types.ts`, which arrives on `main` with #7; where `main` still holds it elsewhere (today `logic/wp-retry.ts`) this mission extends it there, and the plan records which.
- `sk-open-mission` carries `{ missionId, slug }`, as shipped.

### Precedents that bind (from #4, #5 and #7)

Screens do no I/O: props in, verb-noun `sk-*` events out. Inputs are contract-shaped. `sk-retry-load` is one union keyed on
`target`, and this screen adds its own members (the union lives in `logic/wp-retry.ts` on `main` today and moves with #7; this
mission extends whichever file holds it when it builds). `ShellTierController` with `:state(shell-mobile)` handles shell-tier
needs. One shared pill ellipsis rule (full text in `title` and in the accessible name). The data-driven gate: nothing about
the pipeline is hard-coded. Numbered style exceptions, each with scope, rationale, a proof case and a spec-kitty-design
sunset (E-01 to E-30 exist across #4, #5 and #7; this mission proposes E-31 onward, which may be renumbered at CP-1 because
the Drift and Ops missions are specified in parallel and pick from the same range). Visual baselines are committed only in the
final work package. Drift from the prototype is a REJECT unless it is in the register confirmed at CP-1. Announcements follow
what is actually shown; focus is captured on every update; mismatched or late data counts as not loaded. Flat or library
panels as the row chrome allows; words-only wrapping.

## Contract Basis (Mission Status `1.0.0-SNAPSHOT`, after PR #5881)

One read: `GET /project` (`getProject`, returns `Project`). The read is side-effect-free, runs no drift scan, and "is safe to
call once per recent project". It is not free: it resolves each Mission's read directory through git queries that can include
network probes, so a row can take a while and one row can be slow while the others are ready. The response schema is closed
(`additionalProperties: false`); all seven members are required, five of them nullable.

| Region | Contract field | Notes the screen must respect |
|---|---|---|
| Row title | `Project.name` | the project slug, `minLength` 1 |
| Version | `Project.specKittyVersion` | string, up to 64 characters, pattern `^[0-9A-Za-z][0-9A-Za-z.+!_-]{0,63}$`, or null (file absent, unreadable, no version, or a value that fails the pattern). Strict: projected or null, never redacted. The product's own placeholder for a missing version never arrives. |
| Health badge | `Project.health` (`ProjectHealth`: `healthy`, `schema_drift`) | provisional (`x-provisional`). Rolls up the three non-compatible schema statuses; the range is the serving build's, so one project reads `healthy` or `schema_drift` depending on the build. Never depends on a drift finding (operator ruling OR-8). |
| Schema | `Project.schemaVersion` | integer or null, coerced as the command line coerces it. Not shown (Q4). |
| Branch | `Project.currentBranch` | string up to 255, pattern `^[A-Za-z0-9][A-Za-z0-9._/-]*$`, or null. Null does not separate a detached HEAD, no repository, an unreadable HEAD, an invalid name or a host path. A served name is user-authored text and can carry a handle. |
| Mission count | `Project.missionCount` | integer, 0 or more; defined as the number of overviews on `GET /missions`, nothing else. |
| Active ago | `Project.lastActivityAt` | date-time or null; the latest `MissionHead.lastActivityAt` over exactly the listed Missions, compared as instants and served as that Mission's own string (the offsets differ). Null when no Mission is listed or all have null activity. |
| Refusals | none of its own | `GET /project` documents only the shared `Problem` default response, so a failed read has no contract `code`. |
| Location, "local only", the recent list, the "valid project" test | not in the contract | `Project` "never carries a path, a worktree location or a credential". Host-supplied (see Scope and gaps G-1, G-2). |

Fixtures come from the contract's own examples: `Project.example` (healthy, `main`, three Missions), `Project.schema-drift`
(two Missions, an offset instant, branch `topic/example`), `Project.all-null` (no Mission, every nullable member null,
`schema_drift`). The contract pin: the vendored copy in this repo predates the five new `Project` properties, so the contract is
re-vendored once before any screen code (ruled Q8).

## Contract Gaps

Each prototype element below has no source in `GET /project`. Each is raised on spec-kitty#5528 or dropped; none is invented.

| # | Gap | Treatment |
|---|---|---|
| G-1 | Path and "local only" are host knowledge (`Project` never carries a path, by design). | Host entry fields `location` (opaque display text) and `localOnly`. |
| G-2 | There is no list-projects read and no "valid project" test; the host owns the recent list, calls `GET /project` once per entry, and owns whether a folder is a valid project. | The screen takes a list; the dialog (Q3) takes a host-supplied `valid` flag per folder. |
| G-3 | A failed project read has no refusal code, only the shared `Problem`. | One generic sentence from `defaults/` (Q6); the screen cannot say "not a spec-kitty project" or "service unreachable". |
| G-4 | `health` is the serving build's verdict, so a project can read `healthy` here and `schema_drift` elsewhere. | The badge only; no explanation, no advice. |
| G-5 | Why `schema_drift`: the three non-compatible statuses are rolled up; only `schemaVersion` survives. | The row does not guess and never derives a verdict from `schemaVersion`. |
| G-6 | Drift on the row: `health` never depends on a drift finding and `GET /project` runs no scan; a project with drift findings reads `healthy`. | No drift count on the row. |
| G-7 | Null `currentBranch` conflates five causes. | No branch segment; no "detached" claim. |
| G-8 | Prototype "v3.2.6rc4": the contract serves the bare string. | The "v" is a `defaults/` word; a prerelease suffix is shown as given. |
| G-9 | `health` is provisional; the other four additions are not but extend a closed response. | Fixtures are regenerated when the vocabulary is tagged. |
| G-10 | Cost: no staleness or timing in the contract. | A per-entry `loading` state is the only honest state. |
| G-11 | Prototype tooling: the Settings and Help `data-static-notice` buttons ("not connected in this prototype"), the toast, and the pre-filled read-only path field are prototype tooling, not product states. | Not built here; the top-bar actions are the host's, through the shell's `top-bar-actions` slot. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick a recent project at a glance (Priority: P1)

As a person starting the app, I see my recent projects, each with its name, recorded version, health, location, branch,
Mission count and how recently it was active, so I can choose the right one.

**Independent test**: render the three contract examples as entries; every row shows the six facts it has and no placeholder
for one it lacks.

1. **Given** three entries with contract `Project`s, **When** the screen is ready, **Then** three rows show name, version,
   health badge with its word, location, branch, Mission count and active-ago, in the order the host gave.
2. **Given** a `schema_drift` project, **Then** the badge carries the word "schema drift" and the attention tone; **Given** a
   `healthy` project, the success tone and the word "healthy".
3. **Given** an unknown `health` value, **Then** it renders as given with the neutral tone and the raw word.

### User Story 2 - Open a project (Priority: P1)

As a person, I activate a row to open that project, or "Open project" to pick a folder.

1. **Given** an openable row, **When** I activate it by pointer, Enter or Space, **Then** `sk-open-project` is emitted with the
   entry's host `key`.
2. **Given** a row the host marks not openable, **Then** it is plain, with no arrow and no link semantics.
3. **When** I activate "Open project", **Then** `sk-request-open-project` is emitted and the screen shows nothing else.

### User Story 3 - One slow or failed project does not hide the others (Priority: P1)

As a person with several projects, I see the ready ones while a slow one loads, and a failed one keeps its name and location
and offers a retry.

1. **Given** one entry loading, **Then** that row shows a busy indication inside the row while the others are ready.
2. **Given** one entry whose read failed, **Then** it keeps name and location (when the host has them), says it could not be
   read, and a retry emits `sk-retry-load` `{ target: 'project', key }`.
3. **Given** an entry the host knows is unavailable (for example its folder is gone), **Then** it is shown as unavailable,
   not as an error, and not openable.

### User Story 4 - Start from nothing (Priority: P1)

As a first-time person, with no recent projects I see an empty state whose call to action is "Open project".

### User Story 5 - Choose a folder in the page (Priority: P2, ruled Q3)

As a person on a browser host, I open a folder dialog, browse folders the host lists, see which is a valid project, and open
it; as a keyboard user, focus is trapped in the dialog and returns to where it was when the dialog closes.

### User Story 6 - Read it in every tier and with a keyboard (Priority: P2)

At 1100, 800 and 620 px the layout follows the prototype; every control is reachable and operable by keyboard; no status is
colour-only.

### User Story 7 - The screen follows the data (Priority: P2)

A health value, word or tone the screen has never seen renders from `defaults/` or the `labels` property with a raw fallback;
no project, branch or version literal exists in a component.

### Edge Cases

- 0, 1 and a very large `missionCount`: the plural comes from `defaults/`; the count is shown as given.
- `lastActivityAt` with an offset, in the future relative to `now`, or unparseable: relative text from `now`; the future
  case reads "just now" (the shared relative-time helper); unparseable input falls back to the ISO string as given.
- `now` omitted: the ISO string is shown as given (as on #4 and #5); the screen has no clock.
- A 64-character version, a 255-character branch, a very long name or location: words-only wrapping, the shared pill ellipsis
  rule on pills, full text in `title` and the accessible name; no horizontal page overflow.
- A branch name that looks like a handle (for example `topic/example`) is shown as served; the screen does not parse it.
- An entry key that repeats: the screen renders every entry; the first matching key receives the event payload as given
  (the host owns uniqueness; a test records the behaviour).
- An entry that carries both a `project` and an entry status: the `project` wins only when the status is absent;
  mismatched or late data counts as not loaded (precedent), so a status other than none takes precedence over a stale `project`.
- Fifty entries: plain DOM, no virtualization.
- The whole list is `loading` while individual entries also carry statuses: the whole-list state wins.
- The dialog is open while the list changes: the dialog is independent of the list.
- A `Project.name` equal to a vocabulary word (for example `healthy`): shown as a name; never read by the gates.

## State Matrix and Acceptance

One story and one visual baseline per row, in the dark theme at 1280 px in the shell, and at each tier the row names. "None"
means the prototype has no such state: the row is built from the nearest analogue named, and the drift is in the register for
confirmation at CP-1.

| ID | State | Prototype source | Pass condition (Given / When / Then) | Event asserted |
|---|---|---|---|---|
| PR-01 | Ready, three recent projects: name, version, health badge, location line, Mission count, active-ago, arrow on the openable row | `01-projects.html` default (`collection` of three rows) | Given three entries, Then all six facts show per row, in host order, with the toolbar count "3 projects" | none |
| PR-02 | Health `healthy`: success badge with the word | row 1 badge `healthy` | Then success tone and the word, never colour-only | none |
| PR-03 | Health `schema_drift`: attention badge with the word "schema drift" | row 2 badge `schema drift` | Then attention tone and the word from `defaults/` | none |
| PR-04 | Unknown `health` value | None; data-driven rule (#4) | Then neutral tone and the raw value as the word | none |
| PR-05 | All-null project (`Project.all-null`): no version, no branch, no activity, zero Missions | None; nearest the Missions "No activity" text (#4) | Then no version, no branch segment, the no-activity text, "0 Missions", and the `schema_drift` badge | none |
| PR-06 | Null `specKittyVersion` alone | None; as PR-05 | Then the version slot is hidden (ruled Q4) and no empty gap | none |
| PR-07 | Null `currentBranch` | None; row without the branch suffix | Then no branch segment and no "detached" claim | none |
| PR-08 | `lastActivityAt` against `now`: minutes, hours, yesterday, days; an offset instant | rows "active 2 hours ago", "active yesterday", "active 6 days ago" | Then relative text per the shared helper, offsets compared as instants | none |
| PR-09 | Mission count 0, 1 and large | "439 Missions", "57 Missions", "12 Missions" | Then the right plural (`defaults/`) for each | none |
| PR-10 | Location line and "local only" flag present, and absent | mono line `~/path · branch · local only` | Then the host text is shown verbatim when present; the line shows only the segments that exist | none |
| PR-11 | Openable row is a link with the arrow; a not-openable row is plain | row 1 `<a>`, rows 2 and 3 `<article>` | Then only openable rows are controls (ruled Q2) | activation emits `sk-open-project` `{ key }` |
| PR-12 | One row loading while others are ready | None; nearest the Missions loading panel look, inside the row | Then a busy indication inside that row only, and the live region does not announce a false "ready" | none |
| PR-13 | One row's read failed | None; nearest `02-missions.html?state=error` | Then name and location kept, one generic sentence, a retry control | retry emits `sk-retry-load` `{ target: 'project', key }` |
| PR-14 | One row unavailable (host test) | None; as PR-13 without a retry | Then name and location kept, "unavailable" in words, not openable | none |
| PR-15 | Empty: no recent projects | None; nearest `02-missions.html?state=empty` | Then a neutral empty form and the "Open project" call to action (the header button) | "Open project" emits `sk-request-open-project` |
| PR-16 | Whole list loading | None; nearest `02-missions.html?state=loading` | Then a busy indicator in the frame under the header, no rows, no count | none |
| PR-17 | Whole list error | None; nearest `02-missions.html?state=error` | Then an alert notice with host-neutral copy and a retry | retry emits `sk-retry-load` `{ target: 'projects' }` |
| PR-18 | Header: eyebrow "Local workspace", title, muted copy, "Open project" button | `projects-header` | Then the four parts as in the prototype; the muted sentence about navigation is kept (Q1) | button emits `sk-request-open-project` |
| PR-19 | Read-only notice at the foot of the list | `notice` | Then the `sk-notice` with the `defaults/` copy; present in every state that shows rows or the empty state | none |
| PR-20 | Dialog closed to open: title, folder field, folder list, hint, Cancel and Open (ruled Q3) | `project-dialog` | Then the dialog opens modal, with focus moved into it | none |
| PR-21 | Dialog folder rows: parent row, selected valid project with a "valid project" badge, ordinary folder | `folder-row` list | Then a real listbox; `aria-selected` follows the selection; the badge carries its word | selecting a row emits `sk-browse-folder` or `sk-select-folder` (Q3) |
| PR-22 | Dialog Open and Cancel | `data-confirm-project`, Cancel | Then Open emits the location of the selected valid folder; Cancel, Escape and a backdrop click close without confirming | `sk-confirm-open-project` `{ location }` |
| PR-23 | Dialog: folder list loading, empty folder, listing error, no valid selection (Open disabled) | None; nearest PR-16/17 | Then each is stated in words and Open is disabled with a reason | retry emits `sk-retry-load` `{ target: 'folders' }` (Q3) |
| PR-24 | Long texts: name, location, branch, 64-character version, large count | None; words-only and shared pill ellipsis (#4, #5) | Then no mid-word wrap, no page overflow, full text in `title` | none |
| PR-25 | Fifty rows | None | Then plain DOM, scrolls in the content region, tab order intact | none |
| PR-26 | Keyboard: header button, rows, retry controls, dialog | `showModal`, close on backdrop | Then documented tab order tagged like `tab-12`; Enter and Space activate; visible focus ring; the dialog traps focus and focus returns to the opener on close | none |
| PR-27 | Collapsed tier, about 1100 px | breakpoint 1100 px | Then the rows keep two columns; no sidebar to collapse (Q1) | none |
| PR-28 | Narrow tier, about 800 px | breakpoint 800 px | Then the page header stacks (button below the copy); content padding reduces | none |
| PR-29 | Mobile tier, about 620 px and below | breakpoint 620 px | Then each row is a single column and the side block aligns to the start (the prototype has no full-width header button rule; DP-27) | none |
| PR-30 | Redaction-like text in a name or branch (`[path]`, `[email]`) | None | Then shown verbatim, never parsed | none |
| PR-31 | Light-theme/forced-colours spot check | prototype `forced-colors` block | Then badges keep their words and focus rings stay visible | none |

Sum of rows: 31 (PR-01 to PR-31). The issue's matrix has 25 rows (PR-01 to PR-25); the added rows are the unavailable entry,
the dialog loading/empty/error/Open-disabled states, the redaction row and the forced-colours row, and the issue's single
header row PR-17 is split between PR-18 and the dialog rows.

### Event interaction checks

Every event bubbles, is composed, is declared once with `@fires` and is typed. Names are verb-noun (Q7).

| Check | Trigger | Asserted event and payload |
|---|---|---|
| EV-1 | Activate an openable row (pointer, Enter, Space) | `sk-open-project`, `{ key }` (the host's key; the screen never emits a path) |
| EV-2 | Activate a not-openable, loading or unavailable row | none (positive control: an openable row beside it does emit) |
| EV-3 | "Open project" (header or empty state) | `sk-request-open-project`, no payload |
| EV-4 | Retry on a failed row | `sk-retry-load`, `{ target: 'project', key }` |
| EV-5 | Retry on a failed list | `sk-retry-load`, `{ target: 'projects' }` |
| EV-6 | Dialog: Open on a valid selected folder | `sk-confirm-open-project`, `{ location }` (the host's string for the folder) |
| EV-7 | Dialog: Cancel, Escape, backdrop | none from the confirm path; the dialog closes itself (Q3) |
| EV-8 | Dialog: select or enter a folder | `sk-browse-folder`, `{ location }` (the host re-feeds the listing) (Q3) |
| EV-9 | Dialog: retry on a failed listing | `sk-retry-load`, `{ target: 'folders' }` (Q3) |
| EV-10 | Every state-only interaction (focus, scroll, hover) | none |

The existing `sk-retry-load` union is extended, not redeclared. An incoming event the screen does not own is not re-emitted.

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | Requirement | Priority | Status |
|----|-------|-------------|----------|--------|
| FR-001 | Element and public surface | One element `sk-projects-screen` taking `entries` (host wrappers, contract-shaped), `status` (`loading`, `error`, `empty`, `ready`), `now`, `labels` and `errorMessage`; no other property. | High | Open |
| FR-002 | Entry wrapper | Each entry is a host wrapper: `key` (host id), `location` (opaque display text), optional `localOnly`, optional `openable` (default true, ruled Q2), and either `project` (a contract `Project`) or `state` (`loading`, `error`, `unavailable`) when no `Project` exists yet. Contract fields keep the contract's names. | High | Open |
| FR-003 | Row | A row shows name, version, health badge, location, branch, Mission count and active-ago, hiding any part that is null or absent, with no placeholder invented. The accessible name is the row's visible text in its visual reading order, starting with the name: name, version, health, Mission count, active-ago, location and branch (amended at WP06, operator ruling 2026-10-08: the library row computes its name from its visible content, and nothing visible is hidden from assistive technology; the decorative arrow glyph is not text). | High | Open |
| FR-004 | Health | The health badge is an `sk-pill-tag` carrying the word and tone from `defaults/`; an unknown value renders as given with the neutral tone and the raw word. The screen never derives health from `schemaVersion`. | High | Open |
| FR-005 | Version and branch | The version shows the `defaults/` prefix word plus the string as served; the branch shows the served string; neither is parsed. Null hides the segment. | High | Open |
| FR-006 | Mission count | "N Missions" with the plural from `defaults/` (the existing `missionCountText`); the count is shown as given. | Medium | Open |
| FR-007 | Active ago | Relative text from the host `now` through the existing relative-time helper, a `labels` time hook when given, the ISO string when `now` is absent, and the no-activity text for null. | Medium | Open |
| FR-008 | Location line | The host `location` is shown verbatim in the mono style, with the branch and the "local only" segment appended only when present. | Medium | Open |
| FR-009 | Opening a row | An openable row is the screen's one link-like control and emits `sk-open-project` `{ key }` on pointer, Enter and Space; a not-openable, loading or unavailable row is plain (ruled Q2). | High | Open |
| FR-010 | Open action | The header "Open project" button emits `sk-request-open-project`; it is also the empty state's call to action. | High | Open |
| FR-011 | Entry states | Loading, error and unavailable entries keep name and location when the host gives them; error offers a retry emitting `sk-retry-load` `{ target: 'project', key }`; unavailable has no retry; wording is generic from `defaults/` (Q6). | High | Open |
| FR-012 | Whole-list states | `loading`, `error` and `empty` render in the frame under the header band, with the #4 panel look and host-neutral copy; `error` offers a retry emitting `sk-retry-load` `{ target: 'projects' }`. | High | Open |
| FR-013 | Header and toolbar | The header shows the eyebrow, title, muted copy and "Open project"; the toolbar shows "Recent projects" and the entry count ("N projects", plural from `defaults/`); the count is hidden while the whole list loads. | High | Open |
| FR-014 | Read-only notice | The foot of the list carries the `sk-notice` "This release is a read-only view. Kitty Desktop never changes the selected project." from `defaults/`; no write control exists anywhere. | High | Open |
| FR-015 | Shell placement | The screen sits in the shell with the new top-bar-only layout value (ruled Q1): a layout with no project navigation (top bar only), no hamburger and no sidebar, adding no property a later dynamic pipeline would have to change. | High | Open |
| FR-016 | Open-project dialog | A separate element `sk-open-project-dialog` (ruled Q3): a native modal `dialog` with the folder field, a listbox of folders, the hint, Cancel and Open. It takes `open`, `location`, `folders`, `selected`, `status` and `labels`; each folder has a host `location`, a `name`, a `kind` (`parent` or `folder`) and a host `valid` flag. It closes itself on Cancel, Escape and a backdrop click. | Medium | Open |
| FR-017 | Dialog events | Selecting a folder emits `sk-browse-folder` `{ location }`; Open emits `sk-confirm-open-project` `{ location }` and is disabled unless the selected folder is valid; Cancel emits nothing from the confirm path. | Medium | Open |
| FR-018 | Dialog focus | The dialog moves focus in on open, traps it while open, and returns it to the element that was active when it opened. The listbox follows the listbox pattern (roving focus, `aria-selected`). | High | Open |
| FR-019 | Data-driven vocabulary | Every health word and tone, the "no version", "no branch" and "no activity" texts, the plural words, the prefix word and the read-only copy come from `src/defaults/` or the `labels` property with a raw-value fallback. No per-project literal (`main`, `spec-kitty`) exists in a component. | High | Open |
| FR-020 | Responsive layout | The prototype's behaviour at 1100, 800 and 620 px: row single column at the 620 px effect, header stacks at the 800 px effect, the narrow content column (a 900 px maximum) centred. Container thresholds are derived from the shell's real content widths, not copied from viewport queries (#5 precedent). | High | Open |
| FR-021 | Keyboard and focus | Every control is reachable by Tab and operable by Enter and Space, with a visible focus ring and no trap outside the dialog; a documented focus order tagged like `tab-12`; focus is captured on every update that changes the shown content. | High | Open |
| FR-022 | Accessible semantics | A real list for the rows; a polite live region announcing loading, ready, empty and error changes as actually shown (never a false "ready"), and the same for the dialog's folder-listing states inside the dialog; the folder list is a real listbox; no status is colour-only. | High | Open |
| FR-023 | Skip link and landmarks | The skip link text "Skip to Projects" goes through the shell's `skip-link` slot; the screen is the shell's main landmark content. | Medium | Open |
| FR-024 | Logic helpers | Pure helpers in `logic/` build a row view-model from an entry (version word, health word and tone, branch word, Mission count word, activity text), free of vocabulary literals. | High | Open |
| FR-025 | Retry union | `sk-retry-load` gains the members `{ target: 'project', key }`, `{ target: 'projects' }` and (ruled Q3) `{ target: 'folders' }` in the one shared union; the event is declared once. | High | Open |
| FR-026 | Typed properties and events | Every public property and event is declared in the custom-elements manifest, typed from the generated contract types, the public surface frozen once the skeleton lands (surface-freeze test), `manifest:check` green. | High | Open |
| FR-027 | Contract re-vendor | The contract is re-vendored once, first, by this mission's first work package, as its own small change, after spec-kitty PR #5881 has merged (ruled Q8); types and fixtures are regenerated; the `contract` gate checks the pin. | High | Open |
| FR-028 | Contract-derived fixtures | Fixtures are generated from `Project.example`, `Project.schema-drift` and `Project.all-null`, plus named overlays: a row still loading, a row whose read failed, an unavailable row, a very long name and branch, a null version, an unknown health value, a 64-character version, fifty entries. Names, locations and branches are synthetic. | High | Open |
| FR-029 | Quality gates | ESLint (`data-driven`, `no-io`), Stylelint (token-only), typecheck, Storybook build, unit and interaction tests, `contract`, `manifest`, hygiene and gate-proof are green. | High | Open |
| FR-030 | Interaction tests | Tests assert every event of EV-1 to EV-10 with its exact payload and a positive control for each negative. | High | Open |
| FR-031 | State matrix as stories and baselines | Every row of PR-01 to PR-30 is a story; PR-31 is proven by the interaction test (forced-colours emulation plus light theme), not by a story; baselines are committed only in the final work package; a side-by-side visual review against the prototype per row and tier precedes approval. | High | Open |
| FR-032 | Elements over CSS and recorded gaps | Every library primitive is rendered with its element; project CSS is layout-only with `--sk-*` tokens; a missing primitive is recorded as a design-library gap; each local override is a numbered exception (E-31 onward, see below). | High | Open |
| FR-033 | Exports | The screen and the dialog are exported from `src/index.ts` and their defaults from `src/defaults/index.ts` with one line each, kept minimal because the Drift and Ops missions touch the same two files. | Medium | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Gates stay green | All gates of FR-029 pass with 0 findings on the pull request. | Quality | High | Open |
| NFR-002 | Visual stability | Every baseline gives 0 visual failures across 5 consecutive runs on an unchanged commit, at the tiers each row names. | Reliability | High | Open |
| NFR-003 | Keyboard reachability | 100% of interactive controls are reachable and operable by keyboard alone in every tier, in no more tab stops than controls shown. | Accessibility | High | Open |
| NFR-004 | Large text | At a root font size of 200% there is no horizontal overflow of the content area at 1100 px and 720 px. | Accessibility | Medium | Open |
| NFR-005 | No I/O | The `no-io` gate reports 0 violations: no fetch, XHR, WebSocket, Tauri API, browser storage, timer, `Date.now()`, clipboard or navigation in either element or its parts. | Security | High | Open |
| NFR-006 | Render responsiveness | With 50 entries the screen renders, and re-renders on a property change, in 200 ms or less in the interaction test environment. | Performance | Medium | Open |
| NFR-007 | Fixture hygiene | 0 fixture values contain an absolute filesystem path, a real e-mail address or the executing account's username; locations use a synthetic home-relative placeholder, and project names are synthetic (the prototype's sample names are not copied). | Security | High | Open |
| NFR-008 | Prototype fidelity | 0 unapproved visual differences from the prototype in the side-by-side review; any drift outside the confirmed register is a REJECT. | Quality | High | Open |
| NFR-009 | Data-driven gate | The `data-driven` gate reports 0 violations: `healthy` and `schema_drift` appear only in `defaults/` and the generated contract files; no view-type field is named like a health value. | Quality | High | Open |
| NFR-010 | Text never colour-only | 100% of statuses (health, entry state, valid project) carry a text form in the DOM. | Accessibility | High | Open |
| NFR-011 | Contract gate | The `contract` gate reports 0 findings with the re-vendored contract: pin equal, generated types and fixtures fresh; `contract:check --require-main` is green before merge. | Quality | High | Open |
| NFR-012 | Announcement accuracy | The live region text equals what is on screen after every update; a late or mismatched `project` for an entry counts as not loaded. | Accessibility | Medium | Open |

### Constraints

| ID | Title | Constraint | Priority | Status |
|----|-------|------------|----------|--------|
| C-001 | Screen contract | Data in as properties typed from the Mission Status contract; view state in as a property; intent out as `sk-*` CustomEvents that bubble and are composed; no I/O (charter, "The screen contract"). | High | Open |
| C-002 | Elements over CSS | Library primitives are rendered as `sk-*` elements (`sk-pill-tag`, `sk-button`, `sk-notice`, `sk-page-header`, `sk-form-input`); project CSS is layout-only with tokens (charter). | High | Open |
| C-003 | Read-only | No write of any kind; the notice stays true. | High | Open |
| C-004 | No new runtime dependency | None is added. | Medium | Open |
| C-005 | Pull request | One mission, pull request into `main`; the operator merges. The squad runs after the plan phase only (charter). | High | Open |
| C-006 | Contract pin | The contract is vendored from spec-kitty `main` once PR #5881 has merged; implementation does not start before that, and no stacked or provisional branch pin is used. | High | Open |
| C-007 | Shared touches serialise | The re-vendor, `src/defaults/index.ts`, `src/index.ts` and the shell (the new layout value) are the only files shared with the Drift and Ops missions. | Medium | Open |
| C-008 | No absolute paths or usernames | No committed file carries an absolute home path or an OS username. | High | Open |

### Key Entities *(include if the mission involves data)*

- **Project** (contract): `name`, `missionCount`, `specKittyVersion`, `schemaVersion`, `health`, `currentBranch`,
  `lastActivityAt`. Read-only input.
- **ProjectEntry** (host wrapper, not a contract type): `key`, `location`, `localOnly?`, `openable?`, and either `project` or
  `state`.
- **FolderEntry** (host wrapper, dialog only): `name`, `location`, `kind` (`parent`, `folder`), `valid`.
- **Events**: `sk-open-project`, `sk-request-open-project`, `sk-confirm-open-project`, `sk-browse-folder`, `sk-retry-load`
  (extended union).

## Visual Drift Register (PROPOSED: confirmed by the operator at CP-1)

Every prototype element against what the screen will show. Each item is PROPOSED drift until the operator confirms it; a
difference from the prototype that is in neither this register nor a CP-1 ruling is a REJECT item.

| ID | Prototype element | What the screen shows | Proposed ruling |
|----|-------------------|-----------------------|-----------------|
| DP-1 | Sample project names (`spec-kitty`, `team-kitty-saas`, `qa-pack`), samples of version and counts | Contract-example and synthetic fixture data; layout and word forms are the prototype's | confirm (samples are not product text) |
| DP-2 | Location line `~/dev/... · main · local only` as one mono line | Host `location`, then the branch and the "local only" segment only when present, in the same mono line and separators | keep (identical look) |
| DP-3 | Only row 1 is a link; rows 2 and 3 are inert `article`s | Every row is openable unless the host marks it not openable (Q2) | confirm (ruled Q2) |
| DP-4 | Version "v3.2.6rc4" | The `defaults/` prefix "v" plus the bare served string; hidden when null | confirm (G-8) |
| DP-5 | Health badge words `healthy`, `schema drift` | Words from `defaults/`; an unknown value as given, neutral | confirm per Q5 |
| DP-6 | No branch when unknown (not in the prototype) | The branch segment is dropped with its separator; no "detached" word | confirm (G-7) |
| DP-7 | Arrow "→" inside the muted side text of the openable row | The arrow stays on openable rows only, as `aria-hidden` text; the row's accessible name does not read it | keep (identical look) |
| DP-8 | `collection-row` chrome: border, radius, card background, hover, 82 px minimum height | The same look through a numbered exception (E-31) because the library has no collection-row element | confirm (exception) |
| DP-9 | Toolbar "3 projects" mono muted count | The host entry count, plural from `defaults/`, hidden while the whole list loads | keep |
| DP-10 | Notice `role="note"` info look | `sk-notice` with the info tone and the same copy | keep (library element) |
| DP-11 | Dialog `project-dialog` chrome and backdrop | A native `dialog` with the prototype's measures through a numbered exception (E-32) | confirm (exception) |
| DP-12 | Path field: read-only pre-filled input | A read-only `sk-form-input` showing the current host `location` (the host drives it; the field is not a typed path), or a labelled static text element if the library input has no `readonly` (spike S2) | confirm (Q3) |
| DP-13 | Folder rows as buttons in a `role="listbox"` | Raw `role="option"` buttons painted with tokens keyed on `aria-selected` (E-33) | confirm (exception) |
| DP-14 | "valid project" success badge on the selected folder | `sk-pill-tag` with the word from `defaults/`, shown for any folder the host flags valid, not only the selected one | confirm |
| DP-15 | Open button always enabled | Disabled unless the selected folder is valid, with the reason in text | confirm (Q3) |
| DP-16 | Cancel via a `form method="dialog"` submit | Same keyboard behaviour; the dialog closes itself | keep |
| DP-17 | Dialog close button (X icon) | A ghost icon `sk-button` with an accessible name | keep |
| DP-18 | Loading, empty, error views | #4's panel look, host-neutral copy | confirm (no prototype source) |
| DP-19 | Per-row loading, error, unavailable | New row forms, in the row's own box; no prototype source | confirm (no prototype source) |
| DP-20 | Top bar with brand, Settings and Help buttons | The shell's top bar; Settings and Help are the host's `top-bar-actions` slot | confirm (G-11) |
| DP-21 | Skip link "Skip to Projects" | Through the shell's `skip-link` slot | keep |
| DP-22 | Page padding and a 900 px narrow content column | Same measures with tokens; container thresholds derived from the shell | keep |
| DP-23 | Muted sentence "Navigation appears after a project is selected." | Kept as `defaults/` copy | keep |
| DP-24 | Toast live region used by the prototype's static buttons | Not built (prototype tooling) | confirm (G-11) |
| DP-25 | Breakpoint rules at 1100, 800, 620 px as viewport queries | The same effects, with container thresholds where the shell's content cell differs from the viewport | confirm per #5 precedent |
| DP-26 | Openable row is an `<a href>` link | A button-semantics control (no `href` exists: the host routes on `sk-open-project`), same look and arrow; the accessible role is button, not link | confirm (semantics drift; no look drift) |
| DP-27 | (none) The issue's PR-25 says the header button is full width at 620 px | The prototype's CSS has no such rule (only the header stacks at 800 px, `.page-header` column); the screen follows the prototype and the button keeps its size | confirm (issue and prototype disagree; prototype wins) |

## Proposed numbered exceptions (E-31 onward; may be renumbered at CP-1)

Each needs the operator's approval, a stylelint or ESLint proof case and a spec-kitty-design sunset issue to be opened at CP-1.

| Id | Item | Files (only) | Allowed | Sunset |
|---|---|---|---|---|
| E-31 | `collection-row` chrome (border, radius, card background, hover, `min-height: 82px`), token values only | `project-row-parts.ts` | `border`, `border-radius`, `background`, `min-height`, `:hover` rule | a design-library collection row element (spec-kitty-design#525, #526) |
| E-32 | Dialog chrome: `width: min(680px, ...)`, `max-height`, border, radius, backdrop colour and blur | `open-project-dialog-parts.ts` | listed properties; token colours only | a design-library modal dialog (spec-kitty-design#503) |
| E-33 | Folder option paint keyed on `aria-selected`, and the raw `role="option"` button allowance | `folder-list-parts.ts` | `background`, `color`; the forced-colours border | spec-kitty-design#527 (a listbox and option), for E-33 and E-33(c) |
| E-34 | Class-only allowance for any styles-only library family used by the row or the notice (as #5 E-17) | per file | class prefixes per file | n/a (library gap) |

## The dynamic-pipeline constraint

Nothing about the pipeline is hard-coded. `healthy` and `schema_drift` are not special words: the screen reads the word and
tone for a health value from `defaults/` or `labels`, and renders an unknown value as given. The screen never decides what is
healthy, never derives a verdict from `schemaVersion`, and never inspects a project name, a branch or a location. The
existing `data-driven` gate applies unchanged.

## Scope

**In**: the element `sk-projects-screen` and its private parts; the optional element `sk-open-project-dialog` (ruled Q3); every
region in the state matrix; `logic/` helpers; the `defaults/` copy file; fixtures from the three contract examples plus named
overlays; stories, visual baselines, interaction tests, manifest entry; the screen shown as shell content in `shellFrame`;
the contract re-vendor (ruled Q8); numbered exceptions and the drift register.

**Out**: any fetching, routing, URL handling, persistence of the recent list, folder browsing against a real file system,
native dialogs, and the time source (all host); writes of any kind; detecting whether a folder is a valid project; drift
counts or any other health signal on a row (G-6); the Drift and Ops screens; server-side anything (spec-kitty#5528); the
prototype's static tooling (G-11); a project switcher inside a project (not in the prototype or the issue).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every row PR-01 to PR-30 exists as a Storybook story with an approved visual baseline and passes its pass condition; PR-31 is proven by the interaction test (forced-colours emulation plus light theme), not by a story.
- **SC-002**: Every event EV-1 to EV-10 is asserted by an interaction test with its exact payload; 0 events are emitted that are not declared in the manifest.
- **SC-003**: An unknown `health` value and an entry in every entry state render with the `data-driven` gate green.
- **SC-004**: One loading or failed entry leaves 100% of the other rows visible and operable.
- **SC-005**: A keyboard-only user reaches and operates every control in every tier with a visible focus ring; 100% of controls.
- **SC-006**: All quality gates pass on the pull request with 0 findings and 0 visual failures across 5 consecutive runs.
- **SC-007**: A side-by-side review of each baseline against the prototype finds 0 differences outside the confirmed register.
- **SC-008**: A host renders the screen by passing only contract-shaped data, host entries, `now` and labels, with no change to the screen and no I/O performed by it.
- **SC-009**: Every statement the screen makes about a project (health, entry state, valid folder) is available as text to assistive technology; 0 statuses are colour-only.

## Assumptions

- The app shell, `defaults/`, the vendored contract tooling, the gates and the exception approach come from #4, #5 (merged into
  `main` at `ad94164`) and #7 (Artifact Viewer, specified; not yet in `main`). Any file #7 creates that this mission extends
  (the retry union, the exception table) is rebased on when it lands.
- The issue says the contract slice is spec-kitty#5776; the contract tree used here is the final one in PR #5881. They are the
  same slice; the re-vendor names whichever is on `main`.
- The screens are built against the contract and fixtures, not a live service; the read service is spec-kitty#5528.
- The host owns the recent list, its order, its keys and every path. The screen never sorts and never filters.
- `now` is passed by the host; without it, times are the ISO string as served.
- The prototype's values (names, versions, counts) are samples. No design-pause notice for the V2 pages was found in the design
  workspace; Q9 asks the operator to confirm they are current before the side-by-side.
- The drift register DP-1 to DP-27 is proposed here and not yet seen by the operator.
- Entry counts "N projects" count entries, including loading, error and unavailable ones.
- No Decision Moments were recorded for this specify phase; the binding inputs are the issue, the contract as read, the
  prototype and the precedents of #4, #5 and #7.

## Open Questions

None open. The ten questions of `operator-questions.md` were ruled on 2026-10-08 (see Clarifications). The drift register and the proposed exceptions remain for CP-1.
