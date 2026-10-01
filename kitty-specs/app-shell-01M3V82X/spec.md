# Mission Specification: App shell with all its states

**Mission Branch**: `feat/app-shell`
**Created**: 2026-10-01
**Status**: Draft
**Input**: GitHub issue spec-kitty/spec-kitty-mission-ui#2 ("App shell with all its states"), its research comment
(Researcher Robbie), and the operator's decisions in discovery.

## Intent Summary (confirmed 2026-10-01)

- **Primary actor**: a developer building Spec Kitty mission screens for the dashboard and Kitty Desktop.
- **Trigger**: every screen needs the same frame (top bar, navigation rail, context sidebar); only a sample element
  exists today.
- **Desired outcome**: one shared shell element in the mission screen package, every state of it visible as a
  workbench story with an approved visual baseline, ready for later screen missions to drop their content into.
- **Rules that always hold**: the shell performs no I/O; it emits navigation intent and the host routes. Elements over
  CSS. No desktop collapse/expand button. No third sidebar. The sidebar is never stacked above the content.
- **Canonical terms**: *project layout* (top bar + one context sidebar, no rail: Missions, Drift, Ops), *mission
  layout* (top bar + global icon rail + mission sidebar: Pipeline, Work Packages, Artifacts), *tier* (expanded,
  collapsed, mobile: the width-driven responsive states).
- **Out of scope**: the Projects picker (it opens outside the shell), screen contents, routing, persistence, toast,
  status strip, Settings/Help, and theme switching (owned by the design library).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mission screens share one frame (Priority: P1)

A developer opens the workbench and finds the shell in the mission layout: top bar, global icon rail and mission
sidebar, with the current destination marked. Dropping a screen's content into the shell gives it the same frame in
every host.

**Why this priority**: the three mission screens (Pipeline, Work Packages, Artifacts) cannot be built until their
frame exists.

**Independent Test**: open the mission-layout stories; each shows the rail, the mission sidebar with its head and
navigation, the content slot, and the correct destination marked as current.

**Acceptance Scenarios**:

1. **Given** the mission layout with Pipeline current, **When** the story renders at 1280 px, **Then** the rail, the
   mission sidebar and the content area are side by side and Pipeline is marked current.
2. **Given** the Work Packages destination, **When** a work package is selected, **Then** the sidebar shows the work
   package tree with that item marked; with none selected, no item is marked.
3. **Given** the Artifacts destination, **When** a nested folder is expanded or collapsed, **Then** the tree shows
   that state and the shell emits the corresponding event.
4. **Given** any destination, **When** the user activates another navigation item, **Then** the shell emits a
   navigation event naming the target and does not navigate itself.

---

### User Story 2 - Project screens share one frame (Priority: P1)

A developer finds the shell in the project layout: top bar and one context sidebar with the project head and its
navigation (Missions, Drift, Ops), no rail.

**Why this priority**: Missions, Drift and Ops are the first screens after the picker; they need the frame too.

**Independent Test**: open the project-layout stories with each destination current.

**Acceptance Scenarios**:

1. **Given** the project layout with Missions current at 1280 px, **When** it renders, **Then** there is no rail, one
   sidebar, and Missions is marked current.
2. **Given** Drift or Ops current, **When** it renders, **Then** that item is marked and nothing else changes.

---

### User Story 3 - The frame adapts to the window width (Priority: P1)

A user narrows the window. Above 1100 px the full layout shows. Between 720 and 1099 px the sidebar shrinks to an
icon column on its own (the mission layout keeps the global rail beside it). Below 720 px the rail and sidebar move
into a drawer opened from a hamburger in the top bar.

**Why this priority**: the operator ruled out stacking the sidebar above the content and ruled out a desktop
collapse button, so width-driven tiers are the only way the frame stays readable.

**Independent Test**: render each layout at 1280, 1024, 800 and 390 px and compare against the approved baselines;
open and close the mobile drawer by pointer and keyboard.

**Acceptance Scenarios**:

1. **Given** a width of 1024 px, **When** the shell renders, **Then** the sidebar is an icon column with labelled
   icons, the content keeps the remaining width, and nothing is stacked.
2. **Given** a width of 390 px, **When** the shell renders, **Then** only the top bar with a hamburger and the content
   are visible.
3. **Given** the mobile tier, **When** the user activates the hamburger, **Then** the drawer opens with the
   navigation, focus moves into it, and the shell emits a drawer event; **When** the user presses Escape or dismisses
   it, **Then** it closes and focus returns to the hamburger.
4. **Given** any tier, **When** the window is resized across a breakpoint, **Then** the shell switches tier without
   any user control.
5. **Given** the collapsed tier on a screen with a sidebar tree, **When** the user activates the current section's icon,
   **Then** a flyout with that section's head and tree opens beside the icon column; choosing an item, Escape or a click
   outside closes it and focus returns to the icon.
6. **Given** the collapsed tier, **When** an icon is hovered or keyboard-focused, **Then** its label shows in a bubble that
   Escape dismisses and the pointer can enter.

---

### User Story 4 - Loading, empty and error states keep the frame (Priority: P2)

A screen's content is loading, empty or failed, or the shell's own data (project or mission summary) is unavailable.

**Why this priority**: every screen will show these states; the shell must not jump around while they show.

**Independent Test**: stories for content loading/empty/error with an unchanged frame, and the shell's own status
states.

**Acceptance Scenarios**:

1. **Given** content in a loading, empty or error state, **When** the shell renders, **Then** the frame is identical
   to the ready state.
2. **Given** the shell's own data is unavailable, **When** its status is error, **Then** the frame shows an error
   notice with a retry action that emits a retry event.

### Edge Cases

- A project or mission name too long for the sidebar head or the collapsed icon column (the name wraps inside the sidebar head and the flyout; the collapsed icon column shows no name, and its labels are available to assistive technology and in the label bubble).
- A work package or artifact tree long enough to scroll inside the sidebar without scrolling the content.
- Resizing while the mobile drawer is open (crossing into the collapsed tier closes the drawer).
- Keyboard-only use in every tier, including reaching the skip link first.
- Two navigation items with the same label in different groups (current marking must be unambiguous).

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | Project layout | As a developer, I want a project layout of top bar plus one context sidebar (project head, navigation: Missions, Drift, Ops) and no rail, so that project screens share one frame. | High | Open |
| FR-002 | Mission layout | As a developer, I want a mission layout of top bar plus global icon rail plus mission sidebar (mission head, navigation: Pipeline, Work Packages, Artifacts), so that mission screens share one frame. | High | Open |
| FR-003 | Sidebar content variants | As a developer, I want the mission sidebar to show navigation only, navigation plus a work package tree (with or without a selected item), or navigation plus an artifact tree (folder expanded or collapsed), as in the prototype. | High | Open |
| FR-004 | Current destination | As a user, I want the current destination marked visually and to assistive technology, so that I always know where I am. | High | Open |
| FR-005 | Expanded tier | As a user, I want the full layout at window widths of 1100 px and above. | High | Open |
| FR-006 | Collapsed tier | As a user, I want the sidebar to shrink automatically to a labelled icon column between 720 and 1099 px (the mission layout keeps the global rail beside it), so that content stays readable without any control. | High | Open |
| FR-007 | Mobile tier | As a user, I want the rail and sidebar in a drawer opened from a hamburger in the top bar below 720 px as an overlay with a backdrop (the content never moves), closed by Escape, the backdrop, a close action or a navigation, with focus moving into the drawer and back to the hamburger. | High | Open |
| FR-008 | Top bar | As a host, I want the shell to own the top bar (brand, the mobile hamburger, and a place for my own actions), with no Settings or Help built in. | High | Open |
| FR-009 | Content area | As a developer, I want the screen's content placed into the shell, and content loading, empty and error states to leave the frame unchanged. | High | Open |
| FR-010 | Shell status | As a host, I want a shell status (loading, error, empty, ready) for when the shell's own data is unavailable, shown at the top edge of the content column in every tier (never only inside a sidebar head that a tier hides), with a retry action on error. | Medium | Open |
| FR-011 | Intent events | As a host, I want navigation, drawer, flyout and retry intent emitted as typed events (not performed by the shell), declared in the element manifest. | High | Open |
| FR-012 | Accessible structure | As a user of assistive technology, I want a banner, labelled navigation regions, labelled complementary regions, exactly one main region, a skip link, and visible focus in every tier. | High | Open |
| FR-013 | State matrix as stories | As a reviewer, I want every shell state (both layouts, every destination and sidebar variant, every tier, drawer open and closed, flyout open, label bubble, content and shell status states, skip link focused) as a workbench story with an approved visual baseline. | High | Open |
| FR-014 | Behaviour tests | As a reviewer, I want tests asserting every emitted event and its payload, the drawer's keyboard behaviour, and the tier switching on resize. | High | Open |
| FR-015 | Design library gaps | As the design library owner, I want every place where the library's shell element cannot express a required layout recorded as an issue, and those parts built from existing library primitives meanwhile. | Medium | Open |
| FR-016 | Collapsed-tier flyout | As a user in the collapsed tier, I want activating the icon of the current section (Work Packages or Artifacts) to open a flyout with that section's head and tree as an overlay next to the icon column, closed by choosing an item, Escape or a click outside, with focus moving into the flyout and back to the icon; this is not a collapse button. | High | Open |
| FR-017 | Icon label bubbles | As a user of the collapsed tier, I want each icon to show its label in a bubble on hover and on keyboard focus that can be dismissed with Escape, can be hovered and stays until dismissed or the pointer and focus leave (WCAG 1.4.13). | High | Open |
| FR-018 | Section current marking | As a user in the mission layout, I want both the rail item and the sidebar item of the current destination marked, with only the deepest item (the selected leaf, else the sidebar item) carrying `aria-current="page"` and its ancestors `aria-current="true"`. | High | Open |
| FR-019 | Content focus target and skip link text | As a keyboard user, I want the skip link (with per-screen text supplied by the host) to move focus to a shell-owned focus target wrapping the content in every tier, and focus after a navigation from the drawer or flyout to land there. | High | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Gates stay green | All existing quality gates (typecheck, lint, design-token CSS, no I/O, manifest, hygiene, workbench build, unit tests, visual, gate proof) pass with 0 findings. | Quality | High | Open |
| NFR-002 | Visual stability | Visual baselines at 1280, 1024, 800, 680, 390 and 320 px produce 0 failures across 5 consecutive runs on an unchanged commit. | Reliability | High | Open |
| NFR-003 | No layout shift on tier change | Crossing a breakpoint changes only the shell regions defined for that tier; within the same shell status, the content area's top edge is unchanged by the crossing (status changes may move content). | Usability | Medium | Open |
| NFR-004 | Keyboard reachability | 100% of interactive shell controls are reachable and operable by keyboard alone in every tier. | Accessibility | High | Open |
| NFR-005 | Large text | At a root font size of 200%, the shell keeps its tier at 1100 px and 720 px and its content area has no horizontal overflow caused by the shell. | Accessibility | Medium | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Prototype is the design authority | The approved interactive prototype defines the layouts; anything new (collapsed icon column, mobile drawer, icons for project navigation) uses existing design-library elements and tokens and is flagged for design review. | Design | High | Open |
| C-002 | No desktop toggle, no persistence | There is no user-facing collapse/expand control on desktop and the shell stores nothing; tiers are width-driven only. | Product | High | Open |
| C-003 | Picker outside the shell | The Projects picker does not use the shell. | Scope | High | Open |
| C-004 | Screen contract | Data in as properties, a status view state, intent out as events, no I/O; elements over CSS (charter). | Technical | High | Open |
| C-005 | Theme | Theme (dark/light) is owned by the design library; the shell does not switch or store it. | Scope | High | Open |

### Key Entities

- **Layout**: project or mission; decides which regions the shell shows.
- **Tier**: expanded, collapsed or mobile; decided by the window width alone.
- **Navigation item**: label, icon, target destination, current flag; grouped per region (rail, project navigation,
  mission navigation).
- **Sidebar section**: the head (project or mission summary) and optional trees (work packages, artifacts).
- **Shell status**: loading, error, empty, ready for the shell's own data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every row of the state matrix (about 20 states across both layouts, three tiers and the drawer) exists as a
  workbench story with an approved baseline.
- **SC-002**: A later screen mission can render its content inside the shell with no change to the shell.
- **SC-003**: A keyboard-only user reaches every navigation item in each tier in no more tab stops than items shown
  plus the skip link and hamburger.
- **SC-004**: All quality checks pass on the pull request with 0 visual failures across 5 repeats.

## Assumptions

- The global icon rail's items are those of the prototype's mission screens.
- The design library ships no icon set, so icons are local inline SVGs from the prototype's own drawings and the gap is recorded (FR-015).
- Toast, status strip, Settings and Help are host or later concerns.
- Breakpoints are measured on the window width (1100 px and 720 px).
