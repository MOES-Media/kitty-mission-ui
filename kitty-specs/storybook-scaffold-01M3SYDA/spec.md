# Mission Specification: Storybook scaffold

**Mission Branch**: `feat/storybook-scaffold`
**Created**: 2026-09-30
**Status**: Draft
**Input**: User description: "Storybook scaffold for spec-kitty-mission-ui: pnpm workspace, @spec-kitty/mission-ui package (Lit), Storybook wired to @spec-kitty/tokens|styles|elements 1.1.0-rc from GitHub Packages, and the charter's CI quality gates. No real screens yet."

## Intent Summary (confirmed 2026-09-30)

- **Primary actor**: a developer (human or agent) who builds Spec Kitty mission screens in this repository.
- **Trigger**: the repository holds only its charter, so no screen work can start.
- **Desired outcome**: a workspace with the `@spec-kitty/mission-ui` package, a component workbench that previews
  elements against the Spec Kitty design system, one sample element exercising every view state, and every
  charter quality gate running automatically on each pull request.
- **Rule that must always hold**: every quality gate is proven to fail on a planted violation. A gate that passes
  on an empty or trivial repository proves nothing.
- **Out of scope**: real V2 screens, the `dashboard-web` browser container, publishing packages, and types generated
  from the spec-kitty read contract.
- **Main exception**: without a package-registry credential, dependency installation fails fast with a message that
  names the missing credential.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview an element in the workbench (Priority: P1)

A developer clones the repository, provides their registry credential, installs dependencies with one command, and
starts the component workbench. The sample element appears in each of its four view states (ready, empty, loading,
error), styled by the Spec Kitty design system.

**Why this priority**: every later screen is built and reviewed in this workbench; without it no screen work can start.

**Independent Test**: on a clean clone with a valid credential, install and start the workbench, then open each of the
sample element's four stories and confirm it renders with design-system styling.

**Acceptance Scenarios**:

1. **Given** a clean clone and a valid registry credential, **When** the developer installs and starts the workbench,
   **Then** the sample element's four view-state stories are listed and each renders.
2. **Given** the workbench is running, **When** the developer opens the ready story, **Then** the element is rendered
   with design-system elements and tokens, not project-specific colours or fonts.
3. **Given** no registry credential, **When** the developer installs dependencies, **Then** installation stops with a
   message naming the missing credential and where to set it.

---

### User Story 2 - Every pull request is gated (Priority: P1)

A developer opens a pull request. Automated checks run every charter quality gate and report pass or fail per gate
before the operator considers merging.

**Why this priority**: the charter makes these gates the merge bar; the scaffold is only useful if the bar is enforced
from the first screen onward.

**Independent Test**: open a pull request that changes nothing functional and confirm every gate reports a result;
then open one that plants a violation for a gate and confirm that gate fails.

**Acceptance Scenarios**:

1. **Given** a pull request into `main`, **When** checks run, **Then** each charter gate reports its own named result.
2. **Given** a pull request that plants a violation for a gate, **When** checks run, **Then** that gate fails and names
   the violation.
3. **Given** the registry credential in CI is missing or cannot read the design packages, **When** checks run,
   **Then** the first check fails with a message saying so, before any other gate runs.

---

### User Story 3 - A new element starts from a working pattern (Priority: P2)

A developer adding the first real screen copies the sample element's pattern: properties in, view state in, `sk-*`
events out, stories per state, tests per event.

**Why this priority**: it shortens the first screen mission, but screens could still be built without it.

**Independent Test**: read the sample element and its stories and tests; confirm they cover every rule in the
charter's screen contract.

**Acceptance Scenarios**:

1. **Given** the sample element, **When** a developer inspects it, **Then** it takes its data as properties, takes a
   view-state property, emits at least one `sk-*` event, and performs no I/O.
2. **Given** the sample element's tests, **When** they run, **Then** they assert each emitted event and its payload.

### Edge Cases

- The design packages are pre-release (rc); a new rc may change element names or tokens. The workspace pins exact
  versions so an upstream rc cannot change a build silently.
- A gate that only inspects changed files would pass vacuously on newly added files; gates evaluate the full package.
- Visual baselines can drift across machines through font rendering; baselines are produced and compared in one
  defined environment.
- A contributor without access to the private design packages cannot install at all; the failure message says which
  access is missing.

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status | Delivery | No-op passable? |
|----|-------|------------|----------|--------|----------|-----------------|
| FR-001 | Workspace with mission-ui package | As a developer, I want one workspace containing the `@spec-kitty/mission-ui` package so that screens have a home. | High | Open | [build] | no |
| FR-002 | Design packages from the private registry | As a developer, I want `@spec-kitty/tokens`, `styles` and `elements` installed at exact pinned pre-release versions from the organisation's package registry so that builds are reproducible. | High | Open | [build] | no |
| FR-003 | Component workbench | As a developer, I want a component workbench that renders elements with the design system loaded so that I can preview and review them. | High | Open | [build] | no |
| FR-004 | Sample element with four view states | As a developer, I want one sample element with a story for each of ready, empty, loading and error so that every gate has real input. | High | Open | [build] | no |
| FR-005 | Sample element follows the screen contract | As a developer, I want the sample element to take data and view state as properties and emit an `sk-*` event, with no I/O, so that it is a correct template. | High | Open | [build] | no |
| FR-006 | Typecheck gate | As a reviewer, I want a strict typecheck to fail on a planted type error so that type mistakes cannot merge. | High | Open | [build] | no — proven by a planted type error |
| FR-007 | Lint gates | As a reviewer, I want script and style linting to fail on planted violations, including any raw colour, font or size value in project styles, so that the elements-over-CSS rule is enforced. | High | Open | [build] | no — proven by a planted raw colour |
| FR-008 | Workbench build gate | As a reviewer, I want the workbench build to run on every pull request and fail when a story is broken so that the preview never rots. | High | Open | [build] | no — proven by a planted broken story |
| FR-009 | Unit and interaction test gate | As a reviewer, I want tests that assert each emitted event and its payload to fail when an event is removed or its payload changed. | High | Open | [build] | no — proven by a planted payload change |
| FR-010 | Visual regression gate | As a reviewer, I want each story compared against an approved baseline and a visible change to fail the check so that visual drift is caught. | High | Open | [build] | no — proven by a planted visual change |
| FR-011 | Element manifest gate | As a reviewer, I want the published element manifest regenerated and compared on each pull request so that an undeclared property or event fails the check. | High | Open | [build] | no — proven by a planted undeclared event |
| FR-012 | No-I/O gate | As a reviewer, I want any network, desktop-bridge or browser-storage call inside the element packages to fail the check so that screens stay presentational. | High | Open | [build] | no — proven by a planted network call |
| FR-013 | Credential preflight | As a developer, I want a missing or unusable registry credential reported first, by name, locally and in CI, so that I do not debug an opaque authorisation error. | High | Open | [build] | no — proven by a run without the credential |
| FR-014 | Gates run on every pull request | As the operator, I want every gate from FR-006 to FR-013 to run automatically on each pull request into `main` and report a separately named result. | High | Open | [build] | no |
| FR-015 | Gate proof record | As the operator, I want a record showing each gate failing on its planted violation, with the real gate passing on the same commit and the tree left clean after restore, so that no gate is vacuous. | High | Open | [build] | no |
| FR-016 | Contributor documentation | As a developer, I want the README to explain setup, the credential, the workbench, each gate and how to add an element. | Medium | Open | [build] | no |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Setup time | A developer with a valid credential goes from clean clone to running workbench with at most 2 commands and in under 5 minutes on a typical broadband connection. | Usability | Medium | Open |
| NFR-002 | Check duration | The full set of pull-request checks completes in under 15 minutes. | Performance | Medium | Open |
| NFR-003 | Visual stability | Re-running the visual check on an unchanged commit produces 0 failures across 5 consecutive runs. | Reliability | High | Open |
| NFR-004 | Credential hygiene | 0 credentials, tokens or absolute user paths appear in committed files, committed baselines, the built workbench output or the gate proof record; the check fails on a planted token-shaped string. The only exceptions are CLI-written record paths: the charter file's `source_path` line and the `feedback_path` (review) and `record_path` (retrospective) values in the mission's `status.json` / `status.events.jsonl`, each allow-listed by file and line or key pattern. | Security | High | Open |
| NFR-005 | Reproducible install | Two installs from the same commit resolve identical dependency versions (lockfile unchanged). | Reliability | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Charter stack | TypeScript (strict), Lit 3, Storybook, Vite and pnpm workspaces, as the charter declares. | Technical | High | Open |
| C-002 | Registry credential | CI reads the design packages with the repository secret `NPM_TOKEN` (a `read:packages` token); the committed registry configuration carries only the scope mapping, never a token. | Security | High | Open |
| C-003 | Runners | CI runs on GitHub-hosted Ubuntu 24.04 runners; no dependency on exe.dev or Blacksmith infrastructure. | Technical | High | Open |
| C-004 | Private source | The repository stays private; nothing in this mission publishes a package. | Business | High | Open |
| C-005 | Elements over CSS | The sample element renders design-system primitives with `sk-*` elements; project styles are layout-only and token-only. | Technical | High | Open |
| C-006 | No real screens | This mission builds no V2 screen, host container or read-contract types. | Scope | High | Open |

### Key Entities

- **Sample element**: a minimal presentational element that exists to exercise the screen contract and every gate; it
  is replaced or removed once real screens exist.
- **Story**: one named rendering of an element in one view state with synthetic fixture data.
- **Visual baseline**: the approved image of a story that later renders are compared against.
- **Element manifest**: the machine-readable declaration of each element's public properties and events.
- **Gate**: one named automated check with a pass/fail result on each pull request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with a valid credential reaches a running workbench showing all 4 sample stories in under 5 minutes from a clean clone. — [build] · no-op passable: no
- **SC-002**: 100% of the 8 gates (FR-006 to FR-013) pass on a clean run without their planted violation and fail on the planted run with it, each with a failure message carrying a token unique to that violation, as evidenced by green proof checks on the pull request head plus the uploaded, sanitised record. — [build] · no-op passable: no
- **SC-003**: Every pull request into `main` shows a separately named result for each of the 8 gates. — [build] · no-op passable: no
- **SC-004**: 0 committed files contain a credential or an absolute user path, apart from the three allow-listed CLI-written record-path classes (charter `source_path`; status `feedback_path` and `record_path`). — [build] · no-op passable: no

## Assumptions

- The visual baseline for the sample element is its own approved rendering; comparison against the V2 prototype
  starts with the first real screen mission.
- `NPM_TOKEN` was set on 2026-09-30 by the operator; its value is unverified until the credential preflight (FR-013)
  runs in CI.
- `@spec-kitty/*` 1.1.0-rc.10 is the pinned starting version; later rc bumps are ordinary dependency updates.
