---
work_package_id: WP06
title: Permanent Svelte–Lit binding check and unit-tests gate wiring
dependencies:
- WP04
- WP05
requirement_refs:
- C-002
- FR-001
- FR-002
- FR-003
- SC-001
- SC-002
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
subtasks:
- T030
- T031
- T032
- T033
- T034
- T035
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/src/harness/
create_intent:
- packages/mission-shell/src/harness/BindingHarness.svelte
- packages/mission-shell/test/binding.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/src/harness/**
- packages/mission-shell/test/binding.test.ts
- gates/plants/unit-tests/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - Permanent Svelte–Lit binding check and unit-tests gate wiring (IC-06)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Build the permanent binding check (operator ruling `01M4V5KZP24BZS81CX5RD21NMG`). A real mission-ui screen (`sk-missions-screen`) is mounted in a Svelte 5 harness and proven, on every PR, to:
- receive its data as real values: a list as a list, and a non-default primitive as a property, not an attribute (FR-001);
- deliver **every** intent it declares to the shell with its typed detail (FR-002, SC-001).

Three planted defects prove the check catches mounting before registration, a broken intent path, and a deleted port entry (FR-003, SC-002). The root `pnpm test` changes to run every workspace package one at a time, so the unit-tests gate reaches the shell.

## Context

Read:
- `research.md`: R-06;
- `plan.md`: IC-06, Gates (the unit-tests row);
- `reviews/plan.squad.md`: F-01, F-11, R2-01, R2-12, R3-08;
- WP04's hand-off (which intent-binding path T021 chose: attribute `onsk-…` or the generated `use:intents` action).

Svelte facts (5.57, `set_custom_element_data`, `attributes.js:212-250`):
- For a **registered** element, Svelte sets every prop as a property when the element defines a setter.
- For an **unregistered** element, it sets object values as properties anyway, and only primitives fall back to `setAttribute`.
- So a list-only assertion cannot detect a mount-before-registration defect (F-01).
- `sk-missions-screen` declares `loadingMore` with `attribute: 'loading-more'` (`sk-missions-screen.ts:228`). Before registration, `loadingMore={true}` becomes the attribute `loadingmore`, which Lit never observes, so the property stays at its default `false` (R2-01).

The root `package.json` belongs to WP02. This WP makes one recorded out-of-map edit: `"test": "pnpm -r --workspace-concurrency=1 test"` (R2-12, R3-08). The `ciCommand` stays `pnpm test`.

**C-002:** never change a mission-ui element to make the binding work. A real binding defect is a finding to report.

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: WP04, WP05. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP06 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T030 The harness (`src/harness/BindingHarness.svelte`)

**Steps**:
1. Write a Svelte 5 component (runes) that takes props `items`, `status`, `loadingMore`, `onIntent: (name: string, detail: unknown) => void` and `register: boolean` (default `true`).
2. Registration: `import '@moes-media/mission-ui';` (the side-effect import) must run **before** the element mounts. Put it at module top level. WP06 T034's registration-order plant moves it after mount.
3. Render `<sk-missions-screen {items} {status} {loadingMore} …intent bindings…></sk-missions-screen>`.
4. Intent bindings: one handler per event that `sk-missions-screen` declares in `custom-elements.json` (`sk-open-mission`, `sk-search`, `sk-load-more`, `sk-filter-change`). Use the path WP04 chose. Each handler calls `onIntent('<event-name>', event.detail)`.
5. The harness must not hard-code lane, phase or artifact words (data-driven gate) and performs no I/O.
6. `items` come from WP05's fixture adapter or `contracts/fixtures/mission-status.fixtures.json`: a valid `MissionOverviewPage` fixture's `items`.

### T031 Data path: values, not text (FR-001, F-01, R2-01)

In `test/binding.test.ts`, run in the browser: `page.viewport` first, then mount the harness with Svelte's `mount()`. Assertions:
1. `el.items` is an `Array` (`Array.isArray`) and `toEqual(fixtureItems)`. The screen renders exactly N rows for N items; locate them through their accessible names or the screen's public parts. Never use private class names.
2. `el.loadingMore === true`, a **non-default primitive** that only arrives through the property.
3. **No stray attributes**: for every prop the harness passed (`items`, `status`, `loadingMore`), `el.hasAttribute(name.toLowerCase())` is false, unless that property reflects (check the element source and list any reflected one as an explicit exception in the test). Positive control in the same test: `el.setAttribute('loadingmore', 'x')` makes `hasAttribute` true, proving the assertion can see attributes.
4. `status` arrives as the property value given.

### T032 Intent path: every declared intent (FR-002, SC-001, F-11)

1. Read the declared events of `sk-missions-screen` from `custom-elements.json` in the test. That is the independent source. Assert the count equals 4.
2. Trigger `sk-open-mission` through real UI: click a row, or activate it with the keyboard. Assert `onIntent` received `('sk-open-mission', detail)` with `detail` `toEqual` the expected shape for that row.
3. For each remaining declared event, dispatch it from the element: `el.dispatchEvent(new CustomEvent(name, { detail: <sample>, bubbles: true, composed: true }))`. Assert `onIntent` was called exactly once with that name and detail.
4. Loop guard: assert the loop ran exactly `declared.length - 1` times.
5. Positive control for "no extra calls": after all events, the `onIntent` call count equals the declared count exactly.

### T033 Root `test` script (out-of-map, R2-12, R3-08)

Recorded out-of-map edit to the root `package.json`: `"test": "pnpm -r --workspace-concurrency=1 test"`. Running one package at a time keeps the repository's rule that timing ceilings never share the browser.

Verify:
- `pnpm test` output lists both mission-ui's and the shell's test files;
- mission-ui's `perf` project still runs on its own;
- `gates/plants/unit-tests/plant.json` keeps `ciCommand: "pnpm test"`.

### T034 Three unit-tests plants (FR-003, SC-002)

Append to `gates/plants/unit-tests/plant.json`:
1. **Registration order**: an `edits` overlay on `BindingHarness.svelte` that removes the top-level `import '@moes-media/mission-ui';` and instead imports it in `onMount` after the element is in the DOM. `loadingMore` then stays `false`, and a `loadingmore` attribute appears. `expectFailPattern`: a unique string in the T031 assertion message, for example `binding: loadingMore not set as property`.
2. **Intent-path break**: an `edits` overlay removing one intent binding (for example `sk-search`) from the harness. `expectFailPattern`: `binding: intent sk-search not delivered`.
3. **Port entry deleted** (F-03, coverage plant from WP05's test): an `edits` overlay on `packages/mission-shell/src/client/port.ts` and `fixture.ts` (WP05's files, overlaid only inside the plant) that removes `getDriftReport` from `CLIENT_OPERATIONS`, the interface and the adapter. The type-level guard stays satisfied, but the coverage test fails naming `getDriftReport`. `expectFailPattern`: `getDriftReport`.
   The overlay edits WP05-owned files only inside the proof run; nothing is committed to them.

Run `node scripts/gate-proof.mjs local --only unit-tests` and record each pattern red and the clean leg green, with timings. The unit-tests proof leg timeout was set to 16 by WP01; record the measured duration.

### T035 Exit checks and the SC-005 probe

1. Run every gate.
2. Run `git diff --exit-code <lane base> -- packages/mission-ui` and record the empty output (C-002, SC-005).
3. Revert checks:
   - temporarily delete the side-effect import, and see T031 fail;
   - temporarily remove one handler, and see T032 fail.

## Test strategy

Browser-mode binding tests and three unit-tests plants. `gate-proof local --only unit-tests` runs here. No visual baselines.

## Definition of Done

- **Harness:** mounts the real `sk-missions-screen` with registration first.
- **Data path:** the test asserts the list as a list (with the row count), `loadingMore === true` as a property, and no stray attributes (with a positive control).
- **Intent path:** the test covers every declared intent (4, read from the manifest). One is triggered through real UI and the others are dispatched. Counts are asserted with equality.
- **Root test script:** runs every workspace package one at a time, and the gate output lists the shell tests.
- **Plants:** three plants (registration order, intent break, port entry), each red on its pattern. The unit-tests proof-leg time is recorded.
- **Unchanged:** `packages/mission-ui` has no diff (probe recorded).

## Risks

- **Row selection:** use public, accessible names, not shadow-DOM internals.
- **Reflected properties:** if `status` reflects, exclude it from the stray-attribute check explicitly, with a comment and the element source line.
- **Plant ordering:** the registration-order plant must keep the module compiling.

## Reviewer guidance

- **Plants:** run the registration-order plant yourself and confirm it is red for the right assertion.
- **Event source:** check that the declared-event list is read from `custom-elements.json`, not hard-coded.
- **Positive control:** confirm the attribute check has one.

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file you do not own is changed ONLY where this prompt says so, as a **recorded out-of-map edit**: you commit it with a plain `git add <path>` and `git commit`, and list it in the hand-off with a one-line rationale. A change you need in a file you do not own, and that this prompt does not name, is a **change request** in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`, `contracts/fixtures/*.json` except `mission-status.changes.json`, `packages/mission-shell/src/generated/elements.d.ts`) are never edited by hand: regenerate them.

Shared-file owners (from `plan.md`, "Shared-file ownership"):

| File | Owning WP |
|---|---|
| `.github/workflows/ci.yml`, root `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.gitignore`, `gates/plants/rust/**` | WP01 |
| root `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `eslint.no-io.config.mjs`, `eslint.data-driven.config.mjs`, `gates/plants/typecheck/**`, `gates/plants/eslint/**`, `gates/plants/no-io/**` | WP02 |
| `scripts/contract/{generate,check,registry}.mjs` and their tests, `contracts/fixtures/**`, `gates/plants/contract/**` | WP03 |
| `gates/plants/manifest/**`, `scripts/typings.mjs` | WP04 |
| `gates/plants/unit-tests/**` | WP06 |
| `scripts/check-hygiene.mjs`, `scripts/hygiene/**`, `gates/plants/hygiene/**`, `scripts/contract/{common,drift}.mjs` | WP08 |
| `README.md`, `CHANGELOG.md` | WP09 |

**Gates this work package must pass before hand-off.** Each must exit 0, with the reporter's pass count above 0 and fail 0 where a reporter exists. Run them from the lane worktree root, after confirming `git rev-parse --show-toplevel` is that worktree.
- TypeScript and repository gates: `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene && pnpm test:scripts && pnpm test:terminology`, `pnpm contract:check && pnpm test:contract`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm test`, `pnpm build-storybook`.
- From WP01 on, the Rust gate, preceded by its two install steps: `rustup toolchain install` then `cargo fetch --locked`, then exactly:
  ```
  cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
  ```
- If WP01 is not in this lane's history yet, the Rust gate is not applicable; say so.
- `pnpm visual` and `node scripts/gate-proof.mjs local` are run only where this prompt's "Test strategy" says so.
- If a script name differs on the build base, use the name the base provides and say so.

**Red-first rule.** For every behaviour, plant and gate case:
1. Write the failing test, the plant or the negative case FIRST.
2. Run it and see it fail for the right reason. Record the failing line in the hand-off.
3. Only then implement.

Per test file, make one deliberate revert of the behaviour (a temporary local edit, never committed) that produces a named failing test, then restore it. List it in the hand-off as the revert check; the reviewer re-runs two of them.

**Test-quality rules (binding).**
1. Counts are asserted with equality, never "at least". Every loop over fixtures, routes, events or examples asserts it ran the expected N times, so an empty loop fails.
2. Every "absent", "refused" or "no event" assertion is paired with a positive control on the same fixture or target, where the thing IS present, accepted or emitted.
3. A test that compares against an oracle must read the oracle from an independent source (the vendored YAML, `changes.json`, `custom-elements.json`), never from the output under test.
4. Vitest browser-mode tests call `page.viewport` first.
5. Terminology rule: the banned synonym for "mission" (`scripts/terminology.mjs`) never appears in source, tests, fixtures or docs.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept and the pre-merge squad; the orchestrator owns that.
- Commit on your lane branch with a conventional message, for example `feat(mission-shell): ... (#17)`, ending with the attribution trailer the harness gives you.
- Stage owned files and the recorded out-of-map edits only. Never `git add -A`.
- The hand-off lists each commit hash, verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- **No delegation.** No sub-agents or forks; do this work package yourself.
- **No outward actions.** No push, no pull request, no issue comment.
- **No branch mechanics.** Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics. Never `git stash`.
- **Denied means stop.**
  - A DENIED command means stop and report. Never retry it another way.
  - Never pattern-kill processes. Nothing may be left running when you finish: stop every `kitty-stub` or dev server you start.
- **No absolute paths and no usernames** in any committed file (use `<repo>`); run `pnpm hygiene` before committing.
- **Charter boundaries.**
  - No I/O under `packages/*` (fetch, XHR, EventSource, WebSocket, Tauri APIs, storage, `location`, bare `window`). I/O lives only in `apps/*` and `crates/*`.
  - No mission-ui screen, element, story or generated file changes (C-002, SC-005). `git diff --exit-code <base> -- packages/mission-ui` must stay empty.
- **Exact pins.** Every new npm or Cargo dependency is pinned exactly: `x.y.z` in `package.json`, `=x.y.z` in `Cargo.toml` (NFR-003).
- **Supply-chain evidence.** Every new dependency gets the DIRECTIVE_051 evidence in the hand-off (see `research.md`, "Supply-chain controls").
- **Orchestrator-owned files.** Files under `kitty-specs/` belong to the orchestrator. Report decisions and friction in the hand-off and write nothing there.
- **No mission-state mutation.** Do not run `spec-kitty` commands that change mission state; the orchestrator moves tasks.

## Hand-off checklist (the report you write when you move to review)

1. **Commits:** each hash, verified with `git cat-file -t <hash>` (report the output), in the order made, with its one-line subject.
2. **Gates:** for every gate above, the command, its exit code and the reporter's pass count. A gate you did not run is listed, with the reason.
3. **Red-first evidence:** the failing line for every red-first test or plant, and the revert check per test file.
4. **Edits outside the owned files:** each out-of-map edit with a one-line rationale, and each change request.
5. **Supply chain:** evidence for any dependency added (S-1 to S-5).
6. **Measurements** this prompt asks for (timings, counts).
