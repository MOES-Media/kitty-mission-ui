---
work_package_id: WP05
title: MissionStatusClient port and fixture adapter
dependencies:
- WP02
- WP03
requirement_refs:
- C-001
- FR-008
- FR-009
- FR-011
- NFR-004
- SC-003
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
subtasks:
- T025
- T026
- T027
- T028
- T029
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/src/client/
create_intent:
- packages/mission-shell/src/client/port.ts
- packages/mission-shell/src/client/fixture.ts
- packages/mission-shell/src/client/index.ts
- packages/mission-shell/test/port-coverage.test.ts
- packages/mission-shell/test/fixture-client.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/src/client/**
- packages/mission-shell/test/port-coverage.test.ts
- packages/mission-shell/test/fixture-client.test.ts
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP05 - MissionStatusClient port and fixture adapter (IC-05)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Implement the transport-free `MissionStatusClient` port and its in-memory fixture adapter, as specified in `contracts/client-port.md`. The port covers every read of the pinned contract, a change subscription and a closed four-value connection state (FR-008). A coverage test fails, naming the read, when the contract has a read the port lacks; the operation table is tied to the interface at the type level (FR-009). The fixture adapter replays `changes.json` deterministically (FR-011, NFR-004). No I/O (C-001).

## Context

Read:
- `contracts/client-port.md` (normative);
- `data-model.md`: ConnectionState, Change, ChangeItem;
- `plan.md`: IC-05;
- `reviews/plan.squad.md`: F-03, F-05, F-10, F-25, R2-05, R3-01, R3-05.

Facts:
- **Contract types** come from the deep import `@moes-media/mission-ui/src/contract/types.generated` (`paths`, `operations`, `components`). mission-ui has no `exports` field, so deep imports resolve (F-10). Never add an `exports` field to mission-ui (C-002).
- **Connection-state strings** are exactly: `'connected' | 'reconnecting' | 'degraded: service-missing' | 'degraded: contract-mismatch'` (with a space after the colon, F-05).
- **Media types:** refusals are `application/problem+json` (R3-01).
- **Cursors:** `Change.cursor` is a string on mission-scoped streams for `status-transition` and `mission-lifecycle`, and null on unscoped streams and on every `log-truncated` (R2-05).
- **Parameters:** `Params<Op>` is `operations[Op]['parameters']` exactly as generated, so required query parameters stay required (R3-05).
- **Data:** the JSON files come from WP03 under `contracts/fixtures/`. Import them with a JSON import (`import routes from '../../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' }`, or the repository's established equivalent). Check that `vite` `server.fs.allow` and the tsconfig `resolveJsonModule` setting allow it. If the shell's `tsconfig.json` or `vitest.config.ts` (owned by WP02) need a setting, make it a recorded out-of-map edit.
- **Unit tests** run in the browser (Vitest browser mode, from WP02's config).

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: WP02, WP03. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP05 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T025 Port types (`src/client/port.ts`)

**Steps**:
1. Define, following `contracts/client-port.md`:
   - `ReadOp`, the union of the 9 read operationIds;
   - `Params<Op> = operations[Op]['parameters']`;
   - `Success<Op>`, the `200` `application/json` body;
   - `Refusal<Op>`, the union of `application/problem+json` bodies of the operation's non-200 responses;
   - `Result<Op> = { ok: true; value: Success<Op> } | { ok: false; status: number; refusal: Refusal<Op> }`;
   - `ConnectionState` (the exact four strings);
   - `Change`, discriminated by `kind`, with `data` typed per kind from `components['schemas']` and `cursor: string | null`;
   - `SubscribeScope = { missionId?: string; cursor?: string }`;
   - `MissionStatusClient` (9 read methods named like their operationIds, `subscribe(listener, scope?)` returning an unsubscribe function, and `connection: { readonly state; onChange(listener) }`).
2. Type tests: a `// @ts-expect-error` block (checked by `svelte-check` or `tsc`) proving that:
   - `getArtifactContent` without `query.path` is an error;
   - `'degraded:service-missing'` (no space) is not a `ConnectionState`;
   - `Refusal<'getProject'>` is not `never`.
   Each `@ts-expect-error` has a positive twin that compiles.

### T026 `CLIENT_OPERATIONS` tied to the interface (F-03)

```ts
type ClientMethod = Exclude<keyof MissionStatusClient, 'connection'>;
export const CLIENT_OPERATIONS = {
  getProject: 'getProject', listMissions: 'listMissions', /* … 9 reads … */ subscribe: 'streamEvents',
} as const satisfies { readonly [K in ClientMethod]: string };
```
A missing method or an extra key is a compile error. Add a type test (`@ts-expect-error`) showing that an object missing one key does not satisfy the type, with a positive twin.

### T027 The fixture adapter (`src/client/fixture.ts`)

**Steps**:
1. `createFixtureClient(options?)`. The options are:
   - `{ examples?: Record<operationId, exampleKey>; fixtures?: …; scheduler?: Scheduler; initialState?: ConnectionState }`;
   - `Scheduler = { setTimeout(fn, ms): unknown; clearTimeout(h): void }`, defaulting to the global timers. Timers are not I/O, but check the no-io rule list.
2. Reads resolve to `{ ok: true, value }`, using each route's `defaultExample` from `routes.json`, unless `options.examples` selects another example. A selected refusal example resolves to `{ ok: false, status: <example's own status>, refusal }` (R3-02). Selecting an example whose schema is neither the route's success schema nor one of its `refusals` schemas throws a clear error.
3. `subscribe(listener, scope)` replays `changes.json` items through the scheduler using `delayMs`, mapping each item to a `Change`:
   - `kind = event`;
   - `cursor = scope?.missionId ? (item.scopedId ?? null) : null`;
   - for `log-truncated`, `cursor` is always null.
   The function returns an unsubscribe that cancels pending timers.
4. `connection.state` starts at `initialState ?? 'connected'`. A test-only `setConnectionState(state)` is exported from the fixture module, and `onChange` notifies listeners.
5. No I/O: imported JSON plus the injected scheduler only. Run `pnpm lint:no-io`.

### T028 Port coverage test (FR-009)

In `test/port-coverage.test.ts`:
- `Object.values(CLIENT_OPERATIONS)` as a sorted array equals the operationIds of `routes.json` (equality, 10 entries). On a mismatch, the message names each missing or extra operationId.
- The keys of the object `createFixtureClient()` returns (minus `connection`) equal `Object.keys(CLIENT_OPERATIONS)` (equality).
- A negative control builds a copy of the routes with one extra synthetic operation and asserts the comparison helper reports exactly that name.
- WP06 adds the gate plant that deletes an entry together with its method. Leave the comparison in a reusable helper.

### T029 Fixture-client behaviour tests

In `test/fixture-client.test.ts`, using a fake scheduler with manual advance:
- every read returns its default example: `toEqual` against `examples.json[defaultExample].value`, which is independent of the adapter's own lookup code path;
- a selected refusal returns `ok: false` with the example's own status;
- a mismatched selection throws;
- a scoped subscription yields exactly `changes.items.length` changes, with kinds and cursors following the R2-05 rule (`log-truncated` cursor null, others equal to `scopedId`);
- an unscoped subscription yields all cursors null;
- unsubscribe stops further changes (positive control: before unsubscribe a change arrives);
- determinism: run the full replay 10 times and serialise; all 10 strings are identical (NFR-004);
- the connection state changes notify exactly once per change, and the four states are all assignable.

## Test strategy

Browser-mode Vitest in the shell, plus type tests. `pnpm test` does not reach the shell until WP06 changes the root `test` script, so run `pnpm --filter @moes-media/mission-shell test` here and record it. `pnpm visual` does not run.

## Definition of Done

- **Port:** `MissionStatusClient`, `Params`, `Result`, `Refusal` (problem+json), `ConnectionState` (the exact spec strings) and `Change` (the correct cursor rule) match `contracts/client-port.md`.
- **Operation table:** `CLIENT_OPERATIONS` is tied to the interface by `satisfies`, with a type test.
- **Fixture adapter:** deterministic, with an injectable scheduler; it serves default and selected examples and refusals with their own status.
- **Tests:** coverage, behaviour and determinism tests are green, each with negative or positive controls. The shell test run is recorded.
- **Boundaries:** no I/O (the no-io gate is green), and no mission-ui change.

## Risks

- **JSON import:** the import path across packages may need `server.fs.allow`. Record any config change as an out-of-map edit.
- **Generated types:** they may expose `operations` under a different export name. Read `types.generated.ts` before writing types.

## Reviewer guidance

- **Type tests:** each `@ts-expect-error` has a positive twin.
- **Coverage test:** it compares against `routes.json`, not against itself.
- **Cursor rule:** it matches the contract.
- **Determinism:** the 10-run test serialises the full output.

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
