# Mission Specification: mission-shell: shared Svelte 5 shell over the MissionStatusClient port

**Mission Branch**: `feat/mission-shell-18`
**Created**: 2026-10-15
**Status**: Specified (operator ruled on the three open questions on 2026-10-15; see Clarifications)
**Input**: GitHub issue moes-media/kitty-mission-ui#18 ("M2 mission-shell: shared Svelte 5 shell over the MissionStatusClient port"), mission 2 of 6 under the Phase 0 epic #16. It builds on mission `phase0-bootstrap-01M4V5KK` (#17, PR #32), which delivered the workspace, the `mission-shell` package, the `MissionStatusClient` port, the fixture adapter and the stub. It also takes in the carry-over comment on #18 and the landing-review design notes on #19, #20 and #21.

## Intent Summary

The mission screens in `@moes-media/mission-ui` exist, and #17 proved that a Svelte component can host them. But nothing yet lets a user move between them, keeps them current, or explains what is wrong when the Mission Status service is not there. This mission builds the **shell**, the shared Svelte layer that Kitty Desktop (#20) and Kitty Dashboard (#21) both mount. The shell:

- routes between the screens inside the project, mission and picker layouts of the `sk-mission-shell` element;
- reads each screen's data through the `MissionStatusClient` port and turns each result into the screen's properties and view state;
- maps every `sk-*` intent a hosted screen emits to a navigation, a read, a change of shell state or a host action;
- owns the **refresh policy**, which decides which changes on the stream trigger which re-reads;
- shows a banner for every connection state other than `connected`;
- defines what the dashboard does with the intents that only make sense on the desktop.

- **Primary actors:** the end user of Kitty Desktop or Kitty Dashboard; the developers of #20 and #21, who mount the shell with their adapter; and the CI gates.
- **Trigger:** a host mounts the shell with a `MissionStatusClient` and a host interface, or the user acts on a screen, or the client reports a change or a new connection state.
- **Outcome:** the user can reach every screen, sees current data without reloading, and always knows when the data may be out of date or unavailable. Each host only has to supply transport and native actions.
- **Rules that always hold:**
  - the shell performs no I/O;
  - neither the port nor any mission-ui screen changes;
  - the shell decides *what* to re-read, and the adapters decide *how* data travels.
- **Out of scope:**
  - adapters and transport (#20, #21);
  - supervision, discovery and the digest check (#19);
  - the real service (#22);
  - any write path.

## Clarifications

### Operator rulings, 2026-10-15

The operator chose the recommended option for each question; the decision moments are resolved.

- **Dashboard and desktop-only intents** (decision `01M50D473W8G8W763Y116F3DE9`, option A). The dashboard has no picker. It opens straight into its one project, and the picker and the open-project dialog are never mounted there. A stray desktop-only intent (`sk-request-open-project`, `sk-browse-folder`, `sk-confirm-open-project`) is ignored and never throws. No new UI is added for it.
- **Explicit refresh triggers** (decision `01M50D491TSVP2DCY0HF9F940W`, option A). Artifact and Ops are re-read on navigation, when the host signals that the window became visible or focused again, and from a shell-owned Refresh button in the `top-bar-actions` slot of the `sk-mission-shell` element. The button is flagged for design review.
- **Visual verification** (decision `01M50D4B5MVFZEQNG9XV20BK6K`, option A). Storybook stories cover every connection-banner state and each layout composition, with approved baselines in the existing visual gate. The new UI is flagged for design review, because the banners and the Refresh button are not in the prototype.

### Binding decisions (from the operator and the #17 landing review, PR #32)

- **Ownership (SO-DES-001).**
  - The shell owns the refresh policy: which changes trigger which re-reads.
  - Adapters own transport: reconnect, backoff, cursor bookkeeping and the mapping to `ConnectionState`.
  - `kitty-core` (#19) relays raw changes and does not map them to re-reads. On the desktop, raw changes and the connection state reach the webview over the Tauri Channel (#20).
- **Port additions landing in #17 before this mission starts.**
  - `ConnectionState` gains `connecting`, the initial state before first contact. That makes five states: `connecting`, `connected`, `reconnecting`, `degraded: service-missing` and `degraded: contract-mismatch`.
  - `Change` gains an in-band kind, `{ kind: 'resync'; cursor: null; reason: 'reconnected' }`. An adapter emits it after each reconnect, before any later event. It means "re-read everything".
  - `refused` is already a `Change` kind: a refused subscription delivers exactly one `refused` change and nothing after it.
- **SC-004 of #17 applies to this mission (carry-over comment on #18).** The mission starts and ends with 0 changes to:
  - the port types: `MissionStatusClient`, `Result`, `Refusal`, `ConnectionState`, `Change`, `SubscriptionScope`, `CLIENT_OPERATIONS` and `CONNECTION_STATES`;
  - the workspace members;
  - the gate wiring;
  - the shapes in `contracts/fixtures/*`.

  See C-003.
- **One client per project (SO-DES-013).** The port carries no project identity. Switching to another project means a new client instance and a remount of the shell.
- **Fixture adapter limitation (CODE-BOUNDARY-011).** The fixture adapter ignores read parameters and fixes one example per operation when the client is created. A test that needs different data per `missionId` injects tables through `options.examples` or `options.fixtures`. A per-parameter selector would be an additive option of the fixture adapter, not a port change.
- **Upstream facts (contract `paths/events.yaml`).**
  - The stream carries only WP status transitions, seven mission lifecycle types and log-truncated markers. Artifacts, drift and ops invocations are never announced on it.
  - An unscoped stream carries every Mission, never replays, and cannot resume.
  - `listMissions` has no server-side search or filter. The Missions screen filters the rows it is given (its FR-009).
  - Drift "Rescan" is a second `GET /drift`. The 200 response is sent with `no-store`.

### Amendments

- **2026-10-15, FR-005 (decision `01M50K4DBT2VCW6DD4JQAGEMB4`, operator ruling on plan squad finding R1-02).** An `unavailable` result on a resource that already holds data keeps that data and the screen's view state. Only a resource without data goes to `error`. A refusal always applies.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Move between every screen (Priority: P1)

A user opens a project and lands on the Missions screen inside the project layout. They open a Mission and see its Pipeline inside the mission layout. From there they open a work package, then an artifact, and go back to the Missions list, then on to Drift and Ops. Every screen is reachable, and every step is driven by the screens' own intents or by the shell's navigation.

**Why this priority**: without routing the hosts render one screen at most. Everything else in the mission rests on it.

**Independent Test**: mount the shell over the fixture adapter. Drive each navigation intent from a real screen, and assert which screen is mounted, the layout of `sk-mission-shell` and the current navigation item.

**Acceptance Scenarios**:

1. **Given** the shell mounted with a client, **When** it starts, **Then** it shows the project layout with Missions current.
2. **Given** the Missions screen, **When** the user activates a row (`sk-open-mission`), **Then** the shell shows the mission layout with that Mission's Pipeline, and the Mission's title in the mission head.
3. **Given** the Pipeline screen, **When** the user selects a work package (`sk-select-work-package`), **Then** the Work Package screen shows that WP.
4. **Given** the Work Package screen, **When** the user opens an artifact (`sk-open-artifact`), **Then** the Artifact screen shows that Mission with that artifact selected.
5. **Given** any screen in the mission layout, **When** the user activates a navigation item or tree row (`sk-navigate`), **Then** the shell shows that item's destination and marks it current.
6. **Given** any destination, **When** the shell serialises it to its route and parses the route back, **Then** the same destination results (round trip).
7. **Given** a route that names no known destination, **When** the shell is asked to show it, **Then** it shows Missions and does not throw.

---

### User Story 2 - Screens show their data and view state (Priority: P1)

A user sees each screen in the right view state: `loading` while its data is being read, `ready` with the data, `empty` when the contract answers with nothing, and `error` with the screen's own refusal wording when the read fails. A retry on the screen reads again. Paging, search and filters behave as the screens' specifications expect.

**Why this priority**: the screens are data-in and intents-out by charter. The shell is the only thing that turns port results into their properties.

**Independent Test**: for each screen, drive the fixture adapter with a success example, an empty example and every declared refusal example. Assert the properties and view state the screen receives.

**Acceptance Scenarios**:

1. **Given** a screen whose read is in flight, **When** it renders, **Then** its view state is `loading`.
2. **Given** a read that resolves `{ ok: true }` with data, **When** it completes, **Then** the screen receives the value unchanged as its data properties, with view state `ready` (or `empty` where the screen defines empty for that data).
3. **Given** a read that resolves with a declared refusal, **When** it completes, **Then** the screen receives the refusal's code through its refusal property (where it has one) and view state `error`.
4. **Given** a read that resolves `unavailable`, **When** it completes, **Then** the screen shows `error`. The connection banner explains the cause (User Story 4).
5. **Given** a screen in `error`, **When** the user retries (`sk-retry-load` or `sk-shell-retry`), **Then** the shell reads again exactly the target the intent names.
6. **Given** the Missions screen with more pages, **When** the user asks for more (`sk-load-more`), **Then** the shell reads the next page with that cursor and appends it, and `loadingMore` is true while the read runs. The Ops screen behaves the same way.
7. **Given** a search or filter on the Missions screen, **When** the user leaves the screen and comes back in the same session, **Then** the query and the filter are what they were.

---

### User Story 3 - Data stays current from the change stream (Priority: P1)

A user watches a Mission's Pipeline while an agent moves a work package to another lane. The board updates without any action from the user. A user on the Missions list sees a new Mission appear when it is created. Views that are not on screen are not re-read.

**Why this priority**: it is the epic acceptance item "the shell refetches only the affected resources", and the reason the hosts exist.

**Independent Test**: mount the shell over the fixture adapter on a given destination. Replay the scripted change sequence of `contracts/fixtures/mission-status.changes.json`, plus a `resync`, with a fake scheduler. Record every read the shell issues and compare the recording with the refresh-policy table below.

**Acceptance Scenarios**:

1. **Given** the Pipeline of Mission M on screen, **When** a `status-transition` for M arrives, **Then** the shell re-reads M's detail, and the board shows the new lane.
2. **Given** the Work Package screen of WP W of Mission M, **When** a `status-transition` for W arrives, **Then** the shell re-reads W and its detail.
3. **Given** the Missions list on screen, **When** a `mission-lifecycle` event arrives for any Mission, **Then** the shell re-reads the pages of the list it has loaded.
4. **Given** any Mission M view on screen, **When** a `log-truncated` change for M arrives, **Then** the shell re-reads every displayed resource of M, and shows no error.
5. **Given** any destination, **When** a `resync` change arrives, **Then** the shell re-reads every displayed resource, explicit-refresh views included.
6. **Given** the Artifact, Drift or Ops screen on screen, **When** a `status-transition` or `mission-lifecycle` change arrives, **Then** the shell does not re-read that screen's data.
7. **Given** Mission M's views not on screen, **When** changes for M arrive, **Then** the shell issues 0 reads for them. The next navigation to them reads fresh data.
8. **Given** two re-reads of the same resource where the earlier one resolves last, **When** both complete, **Then** the screen shows the result of the later-issued read.

---

### User Story 4 - The user always knows the connection state (Priority: P1)

A user starts a host before the service is reachable. They see that the app is connecting. If the service binary is missing, or speaks another contract, they see an explicit banner that says so, and the app keeps working as far as it can. If the connection drops, they see that the data may be out of date until it is restored, and then the data is refreshed.

**Why this priority**: epic acceptance requires both hosts to start in degraded mode with a clear message and never crash. The shell is where that message is shown.

**Independent Test**: force each of the five connection states through the fixture adapter's internal test hook. Assert the banner, the screens' view state and the absence of errors. Then assert the refresh after a return to `connected`.

**Acceptance Scenarios**:

1. **Given** the state `connecting`, **When** the shell renders, **Then** the screens show `loading`, an informational connecting notice is shown, and the shell issues no reads until the state first becomes `connected`.
2. **Given** `connecting` changes to `connected`, **When** that happens, **Then** the shell reads the data of the current destination.
3. **Given** the state `reconnecting` for at least the grace period of NFR-004, **When** the shell renders, **Then** a warning banner says the data may be out of date, and every screen keeps its last data.
4. **Given** the state `degraded: service-missing`, **When** the shell renders, **Then** a danger banner says the Mission Status service could not be found or started. Screens with data keep it, and screens without data show `error`. Nothing throws.
5. **Given** the state `degraded: contract-mismatch`, **When** the shell renders, **Then** a danger banner says the service speaks a different contract version than this app. The rest behaves as in scenario 4.
6. **Given** any non-`connected` state returns to `connected`, followed by a `resync` change, **When** that happens, **Then** the banner disappears and every displayed resource is re-read.
7. **Given** a `refused` change on the shell's subscription, **When** it arrives, **Then** the shell shows a notice that live updates are off and keeps serving reads. Nothing throws.

---

### User Story 5 - Host actions and desktop-only intents (Priority: P2)

A user copies a suggested drift repair command. They follow an external link in an artifact, and it opens outside the app. On the desktop they pick a recent project or browse for a project folder. Each of these needs the host, not the shell, because each is I/O. On the dashboard, which serves exactly one project and cannot browse folders, there is no picker, and the desktop-only intents are ignored (operator ruling, 2026-10-15).

**Why this priority**: the drift, artifact and projects screens emit these intents today, but they only matter once a host exists. Leaving them unmapped would make those screens dead ends.

**Independent Test**: mount the shell with a recording host interface, then with one that lacks each optional member. Trigger each intent and assert the host call, or the documented fallback.

**Acceptance Scenarios**:

1. **Given** the Drift screen, **When** the user copies a command (`sk-copy-command`), **Then** the shell asks the host to copy exactly the `text` of the intent, and passes the host's answer (`copied` or `manual`) to the screen as `copyResult`. A host with no copy capability yields `manual`.
2. **Given** the Artifact screen, **When** the user activates an external link (`sk-open-link`), **Then** the shell re-checks that the scheme is `http`, `https` or `mailto` and hands the link to the host's open-link capability. The shell never navigates its own window. Any other scheme, or a host without the capability, results in no action.
3. **Given** the desktop host with no project open, **When** the shell is mounted without a client, **Then** it shows the picker layout with the Projects screen, filled from the host's recent-project entries.
4. **Given** the Projects screen on the desktop, **When** the user opens a project (`sk-open-project`) or confirms a folder (`sk-confirm-open-project`), **Then** the shell asks the host to open that project. Opening it remounts the shell with a new client (SO-DES-013).
5. **Given** the open-project dialog on the desktop, **When** the user browses (`sk-browse-folder`), **Then** the shell asks the host for that location's folders and passes them to the dialog.
6. **Given** the shell mounted as the dashboard mounts it, **When** it starts, **Then** it opens straight into the project layout, and neither the Projects screen nor the open-project dialog is ever mounted.
7. **Given** the dashboard, **When** a desktop-only intent (`sk-request-open-project`, `sk-browse-folder`, `sk-confirm-open-project`) reaches the shell, **Then** the shell ignores it: no host call, no state change, nothing thrown.

---

### User Story 6 - Explicit refresh of views the stream does not cover (Priority: P2)

A user reads an artifact or the Ops list while files change on disk. The change stream never announces those changes, so the views are refreshed explicitly. Rescan on the Drift screen is one such trigger already. Artifact and Ops are also refreshed when the window becomes visible or focused again, and from a Refresh button in the top bar (operator ruling, 2026-10-15).

**Why this priority**: without it, artifact, drift and ops data would be read once and could silently grow stale.

**Independent Test**: on each of the three destinations, fire each trigger and assert exactly one re-read of that destination's data and none of any other.

**Acceptance Scenarios**:

1. **Given** the Drift screen, **When** the user presses Rescan (`sk-rescan-drift`), **Then** the shell re-reads the drift report for the intent's scope, `rescanning` is true until the read completes, and the old report stays visible meanwhile.
2. **Given** the Artifact, Drift or Ops screen, **When** the user navigates to it, including re-selecting it, **Then** the shell reads its data fresh.
3. **Given** the Artifact or Ops screen, **When** the host signals that the window became visible or focused again, **Then** the shell re-reads that destination's data once.
4. **Given** the Artifact or Ops screen, **When** the user presses the shell's Refresh button in the top bar, **Then** the shell re-reads that destination's data once.
5. **Given** any other destination, **When** the shell renders, **Then** the Refresh button is not shown, and a visibility or focus signal causes no read.

---

### Edge Cases

- **A change for a Mission the shell has never read.** It produces no read. Missions-list pages are re-read only when the list is on screen.
- **A burst of changes.** Five `status-transition` changes for the same Mission within the coalescing window produce one read and at most one trailing read (NFR-002), not five.
- **A `log-truncated` change for another Mission** than the one on screen: no read of the displayed Mission. If the Missions list is on screen, its pages are re-read.
- **`resync` while a read is in flight.** The in-flight result is superseded by the read the `resync` issues (User Story 3, scenario 8).
- **A `resync` with nothing on screen** except the picker: no reads through the port.
- **`getMission` refused with 404** (an unknown or deleted Mission, for example after `log-truncated` or a stale route): the mission views show `error` with the screen's refusal wording. The user can go back to Missions.
- **A load-more cursor refused with 400 `invalid_page_cursor`** (for example after a `resync` reset the list): the shell drops its loaded pages and reads the first page again.
- **A route with an unknown Mission id** at start-up: the mission layout opens, and the 404 handling above applies.
- **The connection state flaps** between `connected` and `reconnecting` faster than the grace period: no banner flashes (NFR-004).
- **The state changes to degraded while a read is in flight.** The read's `unavailable` result is handled like any other result. The banner, not a dialog, carries the explanation.
- **An external link with an uppercase or mixed-case scheme**, or one that only starts with `http` (for example `httpx:`): the shell compares the scheme case-insensitively and exactly. Only `http:`, `https:` and `mailto:` pass.
- **Unsubscribe on unmount.** The shell unsubscribes from changes and from connection-state notifications. A change delivered after unmount causes no read and no error.
- **The host interface lacks a member.** Every member is optional, and each has a defined fallback (FR-012). A missing member never throws.
- **A hosted screen gains a new intent** in mission-ui. The intent-coverage check fails and names the intent until the shell maps it (FR-004).

## Requirements *(mandatory)*

### Refresh policy (the rule FR-007 to FR-009 implement)

| Change | Re-read when on screen | Never re-read |
|---|---|---|
| `status-transition` (Mission M, WP W) | M's detail (Pipeline, mission head); W and W's detail (Work Package screen); the loaded pages of the Missions list (lane summary) | artifacts, drift report, ops invocations, the project |
| `mission-lifecycle` (Mission M) | the loaded pages of the Missions list; M's detail | artifacts, drift report, ops invocations, the project |
| `log-truncated` (Mission M) | every displayed resource of M; the loaded pages of the Missions list | resources of other Missions |
| `resync` | every displayed resource, including the project, the artifacts, the drift report and ops invocations | nothing |
| `refused` | nothing (FR-010) | everything |

"Displayed" means the resource feeds the destination on screen or the shell chrome (the project head, the mission head). The shell keeps no cache of resources that are not displayed. Navigation always reads fresh.

### Functional Requirements

| ID | Title | User Story | Priority | Status | Delivery | No-op passable? |
|----|-------|------------|----------|--------|----------|-----------------|
| FR-001 | Destinations and layouts | As a user, I want the shell to show each destination in its layout (project layout: Missions, Drift, Ops; mission layout: Pipeline, Work Packages, Artifacts; picker layout: Projects, desktop only), with the matching navigation item marked current, so that every screen is reachable inside the `sk-mission-shell` element. | High | Open | [build] | no — the test navigates to each destination and asserts the mounted screen, the layout and the current item |
| FR-002 | Routes | As a host developer, I want every destination to have a route string that the shell can produce and parse back to the same destination, and that a host can set from outside, with an unknown route falling back to Missions, so that a host can offer deep links and back and forward without the shell touching browser navigation. | High | Open | [build] | no — a round-trip test over every destination, and one unknown route, must pass |
| FR-003 | Intents to actions | As a user, I want every intent of a hosted screen to have its effect: a navigation, a read, a change of shell state (search, filter, selection, tree expansion, drawer, flyout) or a host action, so that no control on a screen is a dead end. | High | Open | [build] | no — each intent is triggered on a real screen and its effect asserted |
| FR-004 | Intent coverage check | As the operator, I want a check that reads the declared events of every hosted element from the mission-ui custom-elements manifest, and fails, naming the intent, when one has no mapping in the shell, so that a new screen intent cannot go unhandled. The template element `sk-mission-sample` and its `sk-mission-retry` are excluded by name. | High | Open | [build] | no — removing one mapping must fail the check and name the intent (planted defect) |
| FR-005 | Results to view state (amended 2026-10-15; see Amendments) | As a user, I want each read's result turned into the screen's properties and view state: in flight is `loading`; success is `ready` or `empty` with the value passed unchanged; a refusal is `error` with its code; unavailable is `error`, so that every screen shows what the contract said. | High | Open | [build] | no — each screen is driven with a success, an empty and every declared refusal example |
| FR-006 | Retry, paging, search and filter state | As a user, I want retries to re-read exactly the target they name, load-more to append the next page with `loadingMore` set while it runs, and search, filter and selection to survive leaving and re-entering a destination within the session, so that the screens behave as their specifications expect. | High | Open | [build] | no — each behaviour is asserted on the fixture adapter |
| FR-007 | Subscription | As a host developer, I want the shell to hold exactly one unscoped change subscription per client from mount to unmount, and to unsubscribe from changes and connection-state notifications on unmount, so that one stream serves every view and nothing leaks after a project switch. | High | Open | [build] | no — the test counts subscribe and unsubscribe calls across mount, project switch and unmount |
| FR-008 | Refresh policy | As a user, I want each change to trigger exactly the re-reads of the refresh-policy table above, and only for resources on screen, so that the views stay current without needless reads. | High | Open | [build] | no — replaying the scripted sequence plus a `resync` must produce exactly the expected recording of reads |
| FR-009 | Latest read wins | As a user, I want a screen to show only the result of the most recently issued read of its resource, whatever order the reads complete in, so that a slow earlier read never overwrites newer data. | High | Open | [build] | no — the test resolves two reads out of order and asserts the later-issued value is shown |
| FR-010 | Refused stream | As a user, I want a `refused` change to show a notice that live updates are off, while reads keep working, so that a refused stream never breaks the app. | Medium | Open | [build] | no — the fixture adapter's selected stream refusal must yield the notice and no thrown error |
| FR-011 | Connection presentation | As a user, I want a defined presentation for each of the five connection states: `connecting` shows loading and an informational notice, and no reads are issued before the first `connected`; `reconnecting` shows a warning banner and keeps the last data; each degraded state shows its own danger banner, keeps any data and puts screens without data in `error`; `connected` shows no banner. The banners are built from design-library elements and announced to assistive technology. | High | Open | [build] | no — each state is forced and its presentation asserted (5 of 5) |
| FR-012 | Host interface | As a host developer, I want the shell to take, besides the client, one host interface whose members are all optional: copy text (answers `copied` or `manual`); open an external link; list recent projects; open a project; list a location's folders; signal that the window became visible or focused again; receive route changes. Each member has a defined fallback when absent (copy yields `manual`, the others do nothing), so that each host supplies only what it can, and the port stays unchanged. | High | Open | [build] | no — the test mounts with a recording host interface and with an empty one, and asserts the calls and the fallbacks |
| FR-013 | Copy and external links | As a user, I want Copy on the Drift screen to copy exactly the shown command through the host and report `copied` or `manual`, and external links to open through the host only when their scheme is exactly `http`, `https` or `mailto` (case-insensitive), so that the screens' contract obligations hold. | High | Open | [build] | no — on one fixture, an `https:` link must produce exactly one host call (positive control), while a `javascript:` link and an `httpx:` link produce none |
| FR-014 | Desktop projects picker | As a desktop user, I want the picker layout with the Projects screen and the open-project dialog, filled from the host's entries and folder listings, with open and confirm passed to the host, so that I can open another project (a new client, a remounted shell). | Medium | Open | [build] | no — the test drives open, browse and confirm against a recording host interface |
| FR-015 | Dashboard and desktop-only intents | As a dashboard user, I want the shell to open straight into the project layout with no picker, never mounting the Projects screen or the open-project dialog, and to ignore the desktop-only intents (`sk-request-open-project`, `sk-browse-folder`, `sk-confirm-open-project`) without a host call or a thrown error, so that the dashboard has no dead or broken controls (operator ruling, 2026-10-15). | Medium | Open | [build] | no — on one fixture, the desktop mounting must show the picker and pass each intent to the recording host interface (positive control), while the dashboard mounting shows no picker and makes 0 host calls for the same intents |
| FR-016 | Explicit refresh | As a user, I want Artifact, Drift and Ops data read fresh on navigation, and Drift re-read on Rescan with `rescanning` set and the old report kept. I also want Artifact and Ops re-read when the host signals that the window became visible or focused again, and when I press a shell-owned Refresh button in the `top-bar-actions` slot of the `sk-mission-shell` element, shown only on those two destinations and flagged for design review. Together these let me bring views the stream does not cover up to date (operator ruling, 2026-10-15). | Medium | Open | [build] | no — each trigger must cause exactly one re-read of its destination and none of others, and the button must be absent elsewhere |
| FR-017 | Gate extensions carry plants | As the operator, I want every gate this mission extends or adds (at least the intent-coverage check and the refresh-policy test) to carry a planted-defect proof in the existing gate-proof mechanism, so that each new check is shown to fail when it should. | High | Open | [build] | no — each plant must turn its proof red |
| FR-018 | Stories and visual baselines | As a reviewer, I want a Storybook story with an approved visual baseline in the existing visual gate for every connection-banner state (connecting, reconnecting, degraded: service-missing, degraded: contract-mismatch, live updates off) and for each layout composition (project, mission, picker; with and without the Refresh button), all flagged for design review, so that the shell's new UI is reviewed visually like the screens (operator ruling, 2026-10-15). | Medium | Open | [build] | no — a planted change to a banner's appearance must fail the visual gate |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Change to read latency | With the fixture adapter and an injected scheduler, the shell issues the re-read of an affected displayed resource within 100 ms of the change being delivered, and the screen property holds the new value within 150 ms of it. This is the shell's share of the epic's 250 ms p95 change-to-render target, which #22 measures end to end. | Performance | High | Open |
| NFR-002 | Coalescing | For any burst of changes that affect the same resource and arrive within a 100 ms window, the shell issues at most 2 reads of that resource: one in flight and one trailing. Verified with a burst of 5 changes. | Performance | High | Open |
| NFR-003 | No needless reads | 0 reads are issued for resources not displayed, across the full scripted sequence replayed on each destination. The same recording must show at least one read of each affected displayed resource (the positive control of SC-002), so a shell that reads nothing cannot pass. | Performance | High | Open |
| NFR-004 | Banner timing | A degraded banner appears within 100 ms of the state change. A `reconnecting` banner appears only when the state has lasted at least 1 s, so a shorter drop shows no banner. The banner disappears within 100 ms of `connected`. | Usability | Medium | Open |
| NFR-005 | Gate budget and stability | The shell's tests run inside the existing `unit-tests` gate within its 8-minute budget on the standard runner. The new stories and baselines keep the `visual` gate within its existing 28-minute budget. All existing gates pass with 0 findings on the mission's pull request. | Quality | High | Open |
| NFR-006 | Pins | 100% of new dependencies are pinned to an exact version, and every new dependency version was published at least 14 days before it is added. | Maintainability | High | Open |
| NFR-007 | Robustness | Across every connection state, every declared refusal example and every change kind, the shell throws 0 uncaught errors (asserted by the test harness failing on any uncaught error or unhandled rejection). | Reliability | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | No I/O in packages | The shell performs no I/O. That includes `location`, history and bare `window`, the clipboard, storage and network APIs. Everything that needs I/O goes through the host interface or the port, and the no-io gate keeps covering `packages/mission-shell` unchanged (charter, "Hosts"). | Technical | High | Open |
| C-002 | Screens unchanged | No mission-ui screen, element, story, manifest entry or event is changed to suit the shell. A gap is solved in the shell or filed as an issue against the screens. | Technical | High | Open |
| C-003 | Frozen port and bootstrap surface (SC-004 of #17) | 0 changes to the port types (`MissionStatusClient`, `Result`, `Refusal`, `ConnectionState`, `Change`, `SubscriptionScope`, `CLIENT_OPERATIONS`, `CONNECTION_STATES`), the workspace members, the gate wiring and the shapes in `contracts/fixtures/*`, as merged by #17 including `connecting`, `resync` and `refused`. Additive options of the fixture adapter are allowed. A needed port change stops the mission and goes back to the operator. | Technical | High | Open |
| C-004 | Ownership boundary | The shell decides which re-reads a change triggers. It does no reconnecting, backoff or cursor bookkeeping, and it never maps transport errors to connection states (SO-DES-001). | Technical | High | Open |
| C-005 | Elements over CSS | Banners, notices and the Refresh button use `@spec-kitty/elements` (`sk-*`) primitives. Shell CSS is layout only, with `--sk-*` tokens (charter, "Elements over CSS"). | Technical | High | Open |
| C-006 | Hygiene | No local paths, OS usernames, secrets or tokens in any tracked file (hygiene gate). | Security | High | Open |
| C-007 | Gates offline, plants required | Merge gates stay offline. Every gate the mission extends or adds has a planted-defect proof (FR-017). | Technical | High | Open |
| C-008 | Scope boundary | Adapters and transport (#20, #21), supervision, discovery and the digest check (#19), the real service (#22), any write path and new screen work are out of scope. | Business | High | Open |

### Key Entities *(include if the mission involves data)*

- **Destination**: a place the user can be, made of a layout plus a screen plus its identifiers (Mission id, WP id, artifact path). It has exactly one route string.
- **Route**: the string form of a destination. It round-trips, and the host can read and set it.
- **Displayed resource**: a port read, with its parameters, whose result feeds the destination on screen or the shell chrome. Only displayed resources are re-read.
- **Refresh policy**: the table that maps a change kind and its Mission and WP to the displayed resources to re-read.
- **Connection presentation**: the banner or notice, and the screen behaviour, for each of the five connection states.
- **Host interface**: the shell's second dependency besides the client. Its members are all optional, and it covers the native actions the shell cannot perform (copy, open link, recent projects, open project, folder listing, visibility or focus, route sync).
- **Session state**: per-destination search, filter, selection, tree expansion, drawer and flyout, held in memory for the life of the mounted shell.

## Domain Language

| Canonical term | Meaning | Avoid |
|---|---|---|
| shell | `@moes-media/mission-shell`, the Svelte layer this mission builds. It is not the `sk-mission-shell` element; say "the `sk-mission-shell` element" for the layout chrome of mission-ui. | app, frame |
| host | Kitty Desktop or Kitty Dashboard: an application that mounts the shell and does I/O. | container, wrapper |
| client | an instance of the `MissionStatusClient` port. There is one per project. | API client, SDK |
| adapter | the implementation of the client in a host (Tauri, HTTP) or for tests (fixture). It owns transport. | driver, connector |
| host interface | the optional native actions a host gives the shell. It is not part of the port. | port, bridge API |
| intent | an `sk-*` event a screen emits. | action, callback |
| destination | a layout plus a screen plus its identifiers. | page, view (in requirements) |
| re-read | reading a resource again through the port because of a change, a trigger or a retry. | refetch (used in the epic; same meaning), reload |
| refresh policy | the shell's rule for which changes cause which re-reads. | sync logic |
| resync | the `Change` kind an adapter emits after a reconnect; it means "re-read everything displayed". | reset, reload |
| explicit refresh | a re-read not caused by the stream (navigation, Rescan, or an operator-ruled trigger). | polling |
| mission | a spec-kitty Mission. The repository's terminology rule bans the f-word synonym. | the banned synonym |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the intents declared by the hosted elements have a mapping, and the coverage check shows 0 unmapped. — [build] · no-op passable: no
- **SC-002**: Replaying the scripted change sequence plus a `resync` on each destination re-reads every affected displayed resource at least once and issues 0 other reads. This is the epic item "the shell refetches only the affected resources". — [build] · no-op passable: no
- **SC-003**: Each of the 5 connection states produces its defined presentation, and 0 of them throws (5 of 5). — [build] · no-op passable: no
- **SC-004**: The mission's pull request changes 0 lines of the frozen port and bootstrap surface of C-003, checked by a diff against the #17 merge on the pull request. — [ratchet] · no-op passable: yes — paired with SC-001 to SC-003 on the same pull request, so a do-nothing change cannot satisfy all of them
- **SC-005**: #20 and #21 can mount the shell with only their adapter and host interface, with 0 changes to the shell's public surface. This is checked when those missions' plans are reviewed. — [build] · no-op passable: no
- **SC-006**: The pull request passes every existing gate with 0 findings, and mission-ui's sources, stories and manifest are byte-unchanged. — [ratchet] · no-op passable: yes — paired with SC-001 on the same pull request
- **SC-007**: Every connection-banner state and every layout composition has a story with an approved baseline in the visual gate, and the design-review flag is recorded on the pull request. — [build] · no-op passable: no

## Assumptions

- The port additions (`connecting`, `resync`) are in #17's merge before this mission's plan is reviewed. The orchestrator rebases this branch onto `main` after #17 merges. If they are missing, the mission waits and does not add them itself (C-003).
- The shell holds one **unscoped** subscription. Re-reads after a reconnect come from `resync`, and resuming a scoped stream belongs to the adapters. The shell never passes a cursor.
- The Missions screen's optional `stale` flag has no contract source, so the shell omits it, and no Mission shows as stale. A source for it is a later decision.
- The shell's clock (the screens' `now` property) is injectable for tests and defaults to the system clock. Reading the clock is not I/O.
- The Work Packages navigation item, with no WP selected, shows the Mission's board through the Pipeline screen or the first WP. The plan chooses which, within the existing screens.
- Banner wording is shell default copy. A host may override the degraded explanations, for example the desktop's note about an unsigned or quarantined service binary from the epic's risks. Where it lives is a plan decision.
- The shell is tested against the fixture adapter, in browser mode, inside the existing `unit-tests` gate. Per-`missionId` data uses injected tables, or an additive selector option of the fixture adapter.
- NFR thresholds (the 100 ms window, the 1 s grace period) are defaults the operator may adjust at plan review without reopening the spec.

## Open Questions

None open. The three questions raised at specify were ruled by the operator on 2026-10-15. Each took the recommended option, and each decision moment is resolved:

1. **Dashboard and desktop-only intents** (decision `01M50D473W8G8W763Y116F3DE9`). Ruling: option A, no picker on the dashboard, and stray desktop-only intents are ignored. Applied in User Story 5 and FR-015.
2. **Explicit refresh triggers** (decision `01M50D491TSVP2DCY0HF9F940W`). Ruling: option A, host-signalled visibility or focus plus a shell-owned Refresh button in `top-bar-actions`, flagged for design review. Applied in User Story 6, FR-012, FR-016 and C-005.
3. **Visual verification of shell-owned UI** (decision `01M50D4B5MVFZEQNG9XV20BK6K`). Ruling: option A, Storybook stories with approved baselines in the existing visual gate, flagged for design review. Applied in FR-018, NFR-005 and SC-007.
