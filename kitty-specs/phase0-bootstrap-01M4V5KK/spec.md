# Mission Specification: Phase 0 bootstrap: binding check, workspace and CI, port and stub

**Mission Branch**: `feat/phase0-bootstrap-17`
**Created**: 2026-10-13
**Status**: Specified (intent confirmed by the operator 2026-10-13; binding-check permanence ruled, see Clarifications)
**Input**: GitHub issue moes-media/kitty-mission-ui#17 ("M1 Bootstrap: Svelte–Lit binding check, workspace and CI, port and stub"), part of the Phase 0 epic #16, under the charter as amended by PR #27.

## Intent Summary

The mission screens in `@moes-media/mission-ui` exist, but nothing hosts them. Phase 0 builds two hosts, Kitty Desktop and Kitty Dashboard, on a shared Svelte 5 shell and a shared Rust core that read spec-kitty's Mission Status service. That service is not released yet, so the hosts are built against a local stand-in first.

This mission removes the three unknowns that every later Phase 0 mission (#18 to #21) depends on:

1. **Binding.** The shell can drive the Lit screens safely: data arrives as real values, and every user intent reaches the shell. A permanent check keeps it that way.
2. **Workspace.** Rust and Svelte code can live in this repository, inside its existing offline quality gates.
3. **Data.** The hosts have one contract-shaped client interface, and a local stub that serves the contract's examples and plays a scripted sequence of live changes.

- **Primary actors:** the developers and agents implementing #18 to #21, and the CI gates that judge their pull requests.
- **Trigger:** a later mission starts host work and needs a working shell binding, a workspace that builds and checks, and data to render.
- **Outcome:** a later mission can start without first solving binding, tooling or data-source problems.
- **Rules that always hold:**
  - nothing under `packages/*` performs I/O;
  - no mission-ui screen changes to suit a host;
  - merge gates stay offline.
- **Out of scope:** real host behaviour (#18 to #21) and the real service (#22).

## Clarifications

### Operator rulings, 2026-10-13

- **Binding check permanence** (decision `01M4V5KZP24BZS81CX5RD21NMG`). The Svelte–Lit binding check is a **permanent automated check**, not a one-off spike. It keeps guarding the binding as the screens and Svelte evolve.
- **Upstream facts the mission builds on** (from epic #16):
  - The contract is vendored under `contracts/spec-kitty/` and pinned in `PIN.json` at `1.0.0-SNAPSHOT`.
  - The upstream change stream carries only WP status transitions, mission lifecycle events and log-truncated markers.
  - The contract's `info.version` never changes while it is a SNAPSHOT.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A shell drives a real screen (Priority: P1)

A developer starting the shared shell (#18) mounts a mission-ui screen inside it, hands the screen its data and reacts to what the user does. The binding works the first time, and it keeps working after later screen or framework upgrades.

**Why this priority**: every later host mission sits on this binding. If it silently degrades, screens render empty or ignore clicks.

**Independent Test**: one automated check mounts a real screen in the shell and verifies the data path and the intent path.

**Acceptance Scenarios**:

1. **Given** a mission-ui screen mounted in the shell, **When** the shell passes it a list of missions, **Then** the screen receives the list as a list, not as text, and renders it.
2. **Given** that screen, **When** the user triggers one of its intents, **Then** the shell's handler receives that intent with its typed detail.
3. **Given** a screen whose declared property or event was renamed, **When** shell code still uses the old name, **Then** type checking fails before merge.
4. **Given** a future framework or screen change that breaks either path, **When** the permanent check runs, **Then** it fails.

### User Story 2 - A pull request with Rust and Svelte code is judged like any other (Priority: P1)

A developer opens a pull request that changes the Rust core or the shell. The same gate structure that judges screen work judges it, offline, within the usual time limits.

**Why this priority**: without it, missions #18 to #21 cannot merge under the charter.

**Independent Test**: a PR containing a deliberately broken Rust file, an unformatted file, a Svelte type error or I/O inside the shell is refused by the matching gate. Each gate's planted defect is proven by the existing gate-proof mechanism.

**Acceptance Scenarios**:

1. **Given** a clean checkout with the toolchains installed, **When** the workspace is built, **Then** the Rust workspace and the shell package build without errors.
2. **Given** a PR with a formatting, lint or test failure in Rust code, **When** CI runs, **Then** the matching gate fails and the aggregate result is red.
3. **Given** a PR in which the shell performs I/O, **When** CI runs, **Then** the no-io gate fails.
4. **Given** a PR that touches only screens, **When** CI runs, **Then** the existing mission-ui gates behave as before.

### User Story 3 - Hosts get contract-shaped data before the service exists (Priority: P1)

A developer building the Rust core (#19) or a host (#20, #21) needs data for every screen, and a stream of live changes. The real service doesn't exist yet. The developer points the client interface at the local stub and gets every contract example plus a scripted, repeatable change sequence.

**Why this priority**: it unblocks #18 to #21 before spec-kitty ships its service.

**Independent Test**: start the stub, request every contract read, subscribe to changes, and compare the result with the vendored examples and the script.

**Acceptance Scenarios**:

1. **Given** the stub running, **When** any read in the pinned contract is requested, **Then** the stub answers with that operation's vendored example.
2. **Given** a subscriber, **When** the scripted sequence plays, **Then** it delivers a status transition, a lifecycle event and a log-truncated marker in a fixed order, identical on every run.
3. **Given** the pinned contract gains a read the client interface lacks, **When** tests run, **Then** a test fails and names the missing read.
4. **Given** the client interface, **When** a host inspects its connection state, **Then** the state is one of `connected`, `reconnecting`, `degraded: service-missing` or `degraded: contract-mismatch`.

### User Story 4 - Upstream contract drift is noticed without blocking merges (Priority: P2)

The operator wants to know when spec-kitty's upstream contract moves away from the pinned copy, without merges depending on the network.

**Why this priority**: the SNAPSHOT contract will change while #957 and #5533 land. Noticing early limits rework, but it must not make the gates flaky.

**Independent Test**: run the scheduled workflow against a deliberately modified pin and see a report. Confirm it is not part of the merge-required set.

**Acceptance Scenarios**:

1. **Given** the upstream contract equals the pin, **When** the scheduled workflow runs, **Then** it reports no drift.
2. **Given** the upstream contract differs from the pin, **When** the scheduled workflow runs, **Then** it reports the drift and names the differing files.
3. **Given** any pull request, **When** merge gates run, **Then** none of their checks contacts the upstream repository (dependency installation from lockfiles is unchanged).

### Edge Cases

- A screen is mounted before the mission-ui elements are registered: data would arrive as text. The binding check must cover registration order.
- An intent's name contains hyphens (every `sk-*` intent): the binding must deliver it unchanged.
- The stub is asked for a read with no vendored example: it must answer with a clear "no example" error, never with invented data.
- The scripted sequence includes a log-truncated marker: subscribers must see it as its own kind, not as a status change.
- A developer's machine lacks the Rust toolchain: the README states the prerequisite (rustup) and the pinned version; with rustup present, the pinned toolchain is installed on first use.
- Fork pull requests cannot read the private design-library registry, so they still fail preflight (C-005).
- The upstream repository is unreachable during the scheduled drift run: the run reports "unreachable" and does not report "no drift".

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status | Delivery | No-op passable? |
|----|-------|------------|----------|--------|----------|-----------------|
| FR-001 | Data reaches screens as values | As a shell developer, I want any mission-ui screen hosted in the shell to receive its data as real values (lists, objects), never as text, so that screens render what the host passes. | High | Open | [build] | no — the check passes a list and asserts the screen received a list and rendered its entries |
| FR-002 | Intents reach the shell | As a shell developer, I want every `sk-*` intent a hosted screen emits to reach the shell's handler with its typed detail, so that user actions drive the host. | High | Open | [build] | no — the check triggers a real intent and asserts the handler saw its detail |
| FR-003 | Permanent binding check | As the operator, I want FR-001 and FR-002 verified by a permanent automated check on a real mission-ui screen, run on every pull request, so that a screen or framework change cannot silently break the binding. | High | Open | [build] | no — a planted binding break must make the check fail (gate proof) |
| FR-004 | Typed shell usage | As a shell developer, I want shell code type-checked against every screen's declared properties and events, generated from the screens' published declaration, so that a renamed property or event fails before merge. | High | Open | [build] | no — a planted use of a non-existent property must fail the type check |
| FR-005 | Workspace builds | As a host developer, I want the repository to hold a Rust workspace (the shared core plus placeholder desktop and dashboard members) and the `mission-shell` package, all building from a clean checkout, so that #18 to #21 start from a working tree. | High | Open | [build] | no — the build must produce each member, and fails if any member is removed |
| FR-006 | New gates in the gate structure | As the operator, I want every new check (Rust format, lint and tests; Svelte type check; declaration typings) to run on every pull request inside the existing gate structure, each with a planted-defect proof, so that host code is judged like screen code. | High | Open | [build] | no — each new gate's planted defect must turn its proof red |
| FR-007 | No-io covers the shell | As the operator, I want the no-io gate to cover `mission-shell`, and mission-ui to keep passing its no-io and data-driven gates unchanged, so that the charter's rule holds for every package. | High | Open | [build] | no — I/O planted in the shell must fail the gate; mission-ui must still pass |
| FR-008 | Client interface | As a host developer, I want one client interface covering every read in the pinned contract, a change subscription, and a connection state with exactly the values `connected`, `reconnecting`, `degraded: service-missing` and `degraded: contract-mismatch`, so that hosts and the shell never depend on a transport. | High | Open | [build] | no — the coverage test (FR-009) and a state-enumeration test must pass against the real interface |
| FR-009 | Contract coverage test | As the operator, I want a test that fails, naming the read, when the pinned contract contains a read the client interface lacks, so that the interface cannot fall behind the contract. | High | Open | [build] | no — removing one read from the interface must make the test fail and name it |
| FR-010 | Stub serves examples | As a host developer, I want a local stub that answers every read in the pinned contract with that operation's vendored example, and a clear error for a read without an example, so that every screen has data before the service exists. | High | Open | [build] | no — the test compares each response with the vendored example file |
| FR-011 | Scripted change sequence | As a host developer, I want the stub to play a scripted change sequence containing at least one status transition, one lifecycle event and one log-truncated marker, in a fixed order, so that live-update behaviour can be built and tested. | High | Open | [build] | no — the test asserts the exact sequence and kinds received |
| FR-012 | Scheduled drift alert | As the operator, I want a scheduled workflow, outside the merge-required set, that compares the upstream contract with the pin and reports drift by file, reusing the existing contract scripts, so that I learn of upstream changes without making merges depend on the network. | Medium | Open | [build] | no — a run against a modified pin must report the modified files |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Offline merge gates | The checks of 0 merge-required gates contact the upstream spec-kitty repository or any service. Dependency installation is the only network use, as today, and it runs in its own steps before the check step: the existing pnpm install from the committed lockfile, the install of the Rust toolchain pinned in the repository, and the fetch of the crates locked in the committed lockfile. Verified by inspecting every step of every job the aggregate gate depends on. | Reliability | High | Open |
| NFR-002 | Gate time budget | Every new or extended gate job finishes within the repository's existing gate timeout range (at most 8 minutes, the `unit-tests` tier) on the standard runner without a build cache. Gate-proof legs, which re-run a gate once per planted defect, are instead bounded by (1 + the total number of plants in that leg, existing and new) × the measured gate time + 2 minutes. **Verification (A3):** work packages never push, so they record local `gate-proof local` timings as a proxy and set starting timeouts from them. The orchestrator verifies the gate-job times and the proof-leg times on the mission pull request's first CI run, and sets the final proof-leg timeouts from those measured times. Every new action is pinned to a full commit SHA. | Performance | High | Open |
| NFR-003 | Exact pins | 100% of new toolchains and dependencies are pinned to an exact version (no ranges, no floating channels). | Maintainability | High | Open |
| NFR-004 | Deterministic stub | The scripted change sequence is byte-identical across 10 consecutive runs. | Reliability | High | Open |
| NFR-005 | Gates stay green | All existing gates (typecheck, ESLint, Stylelint, no-io, data-driven, contract, manifest, hygiene, terminology, Storybook build, unit and interaction tests, visual, gate-proof) pass with 0 findings on the mission's pull request. | Quality | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | No I/O in packages | Nothing under `packages/*` performs I/O; I/O lives only in adapters under `apps/*` and `crates/*` (charter, "Hosts"). | Technical | High | Open |
| C-002 | Screens unchanged | No mission-ui screen, element or story is changed to suit a host. A binding problem is solved in the shell, or reported as an issue against the screens. | Technical | High | Open |
| C-003 | Pinned contract only | The contract is read only from the vendored, pinned copy. The existing contract scripts (update, check, verify-remote) are reused, not duplicated. | Technical | High | Open |
| C-004 | Hygiene | No local paths, OS usernames, secrets or tokens in tracked files (hygiene gate). | Security | High | Open |
| C-005 | Fork PRs | Fork pull requests still cannot build, because of the private design-library registry. No workaround is in scope. | Business | Medium | Open |
| C-006 | Scope boundary | Real shell routing, the full Rust core, the host apps and the real service are out of scope (#18 to #22). Placeholder desktop and dashboard members only need to build. | Business | High | Open |

### Key Entities *(include if the mission involves data)*

- **Client interface**: the single port hosts and the shell read through. Its operations mirror the contract's reads (project, missions, mission, work package, work-package detail, artifacts, artifact content, drift, ops invocations), plus a change subscription and a connection state.
- **Connection state**: one of `connected`, `reconnecting`, `degraded: service-missing`, `degraded: contract-mismatch`.
- **Change**: an item on the change stream. Its kind is a WP status transition, a mission lifecycle event, or a log-truncated marker. Each change has a cursor.
- **Contract pin**: the vendored contract plus `PIN.json` (upstream commit, version, per-file digests). It is the only source of contract truth.
- **Scripted sequence**: the fixed, ordered list of changes the stub plays.

## Domain Language

| Canonical term | Meaning | Avoid |
|---|---|---|
| mission | A spec-kitty mission. The repository's terminology rule bans the f-word synonym. | the banned synonym |
| host | Kitty Desktop or Kitty Dashboard: an application that renders the screens and does I/O. | container, wrapper |
| shell | `mission-shell`, the shared Svelte layer between the screens and a host's client adapter. | app, frame |
| client interface | The transport-free port the shell reads through. | API client, SDK |
| stub | The local stand-in serving contract examples and scripted changes. | mock server, fake service |
| intent | A `sk-*` event a screen emits. | action, callback |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A real mission-ui screen hosted in the shell renders host-supplied data, and delivers 100% of its declared intents to the shell, in the permanent check. — [build] · no-op passable: no
- **SC-002**: Each of the new gates (Rust format, Rust lint, Rust tests, Svelte check, declaration typings, no-io over the shell) rejects its planted defect: 6 of 6 proofs red-on-plant. — [build] · no-op passable: no
- **SC-003**: 100% of the reads in the pinned contract are covered by the client interface and answered by the stub with their vendored example. — [build] · no-op passable: no
- **SC-004**: A later mission (#18 or #19) can begin implementation with 0 changes to the workspace, gates or client interface delivered here. This is checked when that mission's plan is reviewed. — [build] · no-op passable: no
- **SC-005**: The mission's pull request passes every existing gate with 0 findings, and mission-ui's screens are byte-unchanged. — [ratchet] · no-op passable: yes — paired with SC-002 on the same pull request, so a do-nothing change cannot satisfy both

## Assumptions

- Rust stable and the Svelte 5 toolchain can be pinned to exact versions that support the repository's Node and pnpm pins. The plan picks the versions.
- The vendored `examples/` cover every read the screens need. Where an example is missing, the stub answers "no example". This mission does not author new examples.
- Placeholder desktop and dashboard members only need to compile. Their real content arrives in #20 and #21.
- The existing gate-proof mechanism can be extended to the new gates without changing how existing proofs work.
- CI runs the new Rust jobs on Linux only. The multi-OS matrix arrives with installers in #20.

## Open Questions

None. The binding-check permanence question was ruled on 2026-10-13. Tool and version choices belong to the plan.
