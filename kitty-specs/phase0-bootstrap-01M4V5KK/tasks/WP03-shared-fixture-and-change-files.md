---
work_package_id: WP03
title: Shared examples, fixtures, routes and change-sequence files
dependencies: []
requirement_refs:
- C-003
- FR-010
- FR-011
- NFR-004
- SC-003
- FR-006
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
subtasks:
- T014
- T015
- T016
- T017
- T018
- T019
history: []
agent_profile: node-norris
authoritative_surface: contracts/fixtures/
create_intent:
- contracts/fixtures/mission-status.examples.json
- contracts/fixtures/mission-status.fixtures.json
- contracts/fixtures/mission-status.routes.json
- contracts/fixtures/mission-status.changes.json
- scripts/contract/fixtures-json.test.mjs
- scripts/contract/routes-json.test.mjs
- scripts/contract/changes-json.test.mjs
execution_mode: code_change
model: ''
owned_files:
- scripts/contract/generate.mjs
- scripts/contract/check.mjs
- scripts/contract/registry.mjs
- scripts/contract/fixtures-json.test.mjs
- scripts/contract/routes-json.test.mjs
- scripts/contract/changes-json.test.mjs
- scripts/contract/check.test.mjs
- contracts/fixtures/**
- gates/plants/contract/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP03 - Shared examples, fixtures, routes and change-sequence files (IC-01)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Extend the existing contract generator and checker so that one contract-checked data set exists as language-neutral JSON under `contracts/fixtures/`:
- `examples.json`: every vendored example;
- `fixtures.json`: the registry's `valid` fixtures;
- `routes.json`: every operation, with its default example and refusal map;
- a hand-authored `changes.json`: the scripted change sequence.

The Rust stub (WP07) and the shell's fixture adapter (WP05) both read these files (decision `01M4V6BWK8JXK4B8TV09MP50AB`). `Gate: contract` proves they are current and valid against an independent oracle (FR-010, FR-011, C-003, NFR-004).

## Context

Read:
- `plan.md`: IC-01, Architecture, Gates.
- `data-model.md`: RouteEntry, ExampleEntry, FixtureEntry, ChangeItem.
- `contracts/fixtures-files.md`.
- `research.md`: R-03.
- `reviews/plan.squad.md`: F-04, F-21, R2-05, R2-06, R2-13, R3-01, R3-02, R3-06, R4-01, R4-02.

Repository facts:
- `scripts/contract/generate.mjs`: `loadExamples` already skips `_index.yaml`; `generateAll` writes `types.generated.ts` and `fixtures.generated.ts`, escaping U+FEFF and U+202E in the `.ts` output.
- `scripts/contract/registry.mjs`: `FIXTURES` maps a fixture name to `{ schema, kind: valid|host|relaxed }`.
- `scripts/contract/check.mjs` is `Gate: contract`. It is offline, checks hashes, the file set and staleness, and validates fixtures with Ajv.
- The vendored contract has 10 operations: 9 reads plus `streamEvents`, and 77 examples (78 files minus `_index.yaml`).
- Successes are `application/json`; every refusal is `application/problem+json` (16 uses).
- One refusal schema can cover several statuses (`ArtifactRefusal` six on `getArtifactContent`), and the example's own `status` field is authoritative ("the status follows from the code").

**C-002 and SC-005:** the regenerated `packages/mission-ui/src/contract/*.generated.ts` must stay byte-identical. Add JSON outputs only; do not touch the TypeScript emitters.

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: none. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP03 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T014 `routes.json` from the contract's own paths (R-03, R2-06, R3-01, R3-02)

**Steps** (red first in `routes-json.test.mjs`):
1. In `generate.mjs`, parse `openapi.yaml` `paths:` and each path file. For every operation emit `{ operationId, method, path, kind, responseSchema, defaultExample, refusals }`:
   - `kind`: `"stream"` for `streamEvents`, otherwise `"read"`.
   - `responseSchema`: the `$ref` schema name of the `200` `application/json` response, or `null` for `streamEvents` (its 200 is `text/event-stream`).
   - `refusals`: from every **numbered** response (`400`, `404`, `409`, …) whose content is `application/problem+json` (shared `$ref` responses resolved through `_shared/responses`), a map `{ <schemaName>: [<status>, …] }` with statuses as numbers, sorted numerically. The `default` Problem response is **not** a selectable refusal and never contributes (data-model RouteEntry; A2). Numbered responses whose `$ref` resolves to the shared `Problem` response count like any other (B4): `getMission`, `getWorkPackage` and `streamEvents` each get `Problem: [404]`. This applies to `streamEvents` too: its numbered problem+json responses give `{ Problem: [404], StreamRefusal: [400, 409] }` (A5, B4). Document the rule in a code comment.
   - `defaultExample`: from a reviewed `DEFAULT_EXAMPLES` map in `generate.mjs` (`operationId → "<Schema>.<name>"`), one entry per read. Choose the richest success example, for example `Project.populated`. For `streamEvents` the value is `null`. The generator fails if a map entry names an example that does not exist or whose schema is not the route's `responseSchema`.
2. Emit `contracts/fixtures/mission-status.routes.json`: a JSON array sorted by `operationId`, 2-space indent, trailing newline.
3. Tests:
   - the set of operationIds equals the set parsed independently from the YAML in the test (10, equality);
   - every read has a `defaultExample` of its `responseSchema`, unless `DEFAULT_EXAMPLES` marks it `null` explicitly; a synthetic map with one explicit `null` is accepted and yields `defaultExample: null`, and a read missing from the map makes generation fail (positive and negative control; A29);
   - no route's `refusals` contains a `default` entry, and every status in every `refusals` list is a number; a synthetic path with only a `default` Problem response yields `refusals: {}` (A2);
   - the **full** `refusals` map of every route is asserted against a hand-written expected map in the test (B4), including `streamEvents` = `{ Problem: [404], StreamRefusal: [400, 409] }` and `Problem: [404]` on `getMission` and `getWorkPackage`;
   - every `refusals` schema's content type in the YAML is `application/problem+json`;
   - `getArtifactContent` lists `ArtifactRefusal` with its six statuses;
   - a synthetic paths fixture with a refusal under `application/json` is NOT put into `refusals` (positive and negative control).

### T015 `examples.json`: every vendored example, from YAML (F-04, R2-13, F-21)

**Steps**:
1. Emit `contracts/fixtures/mission-status.examples.json`: an object keyed `<Schema>.<name>` (the file name without `.yaml`), sorted keys, each value `{ schema, value }`, parsed from the vendored YAML. `_index.yaml` is excluded, as `loadExamples` already does.
2. Escaping (F-21): the JSON emitter must escape U+FEFF and U+202E (and the other bidi controls U+202A–U+202E and U+2066–U+2069) as `\uXXXX`, like the `.ts` emitter. `JSON.stringify` writes them raw, so post-process the string. Test: the file contains no raw U+FEFF or U+202E byte, and `JSON.parse` round-trips the original values.
3. Test (`fixtures-json.test.mjs`): the key set has exactly 77 entries, and every value is deep-equal to an independent YAML parse of its file in the test. This is the independent oracle the stub's tests rely on (F-04).

### T016 `fixtures.json`: the `valid` registry fixtures

**Steps**:
1. Emit `contracts/fixtures/mission-status.fixtures.json`: keyed by registry name, `{ schema, value }`, **only `kind: 'valid'`** entries (host and relaxed fixtures carry non-contract fields and stay TypeScript-only). Values come from the same source objects the `.ts` emitter uses, with the same escaping.
2. Test:
   - the key set equals `Object.entries(FIXTURES).filter(kind==='valid')` (equality count);
   - every value validates against its schema with Ajv, with no relaxation;
   - a `host` fixture name is absent (with a positive control: a `valid` one is present).

### T017 The authored change sequence (FR-011, NFR-004, R2-05)

**Steps**:
1. Author `contracts/fixtures/mission-status.changes.json`: `{ "missionId": "<one ULID taken from an example>", "items": [ … ] }`. Each item is `{ event, scopedId, data, delayMs }`:
   - `event` is one of `status-transition`, `mission-lifecycle`, `log-truncated`;
   - `scopedId` is the `id:` line a **mission-scoped** stream carries: a StreamCursorString (`offset:sha256hex`), present on `status-transition` and `mission-lifecycle`, and **absent on `log-truncated`**. Unscoped streams carry no `id:` for any item; the stub and the adapter derive that rule.
   - Use at least 5 items, in this order: `mission-lifecycle` (mission created); `status-transition` ×2 (planned→claimed, claimed→in_progress); `log-truncated`; `status-transition` (after truncation, at a new offset).
   - Use `delayMs` 0 for the first item and 250 for the others.
   - `data` is shaped from the vendored event examples, rewritten to the one mission id and to cursors with strictly increasing offsets. Hashes are `sha256` of a fixed string, so they are reproducible.
2. In `check.mjs`, validate (`changes-json.test.mjs` red first):
   - each `data` against its event schema (`StatusTransitionEvent`, `MissionLifecycleEvent`, `LogTruncatedEvent`);
   - each kind is present at least once;
   - one mission id throughout;
   - `scopedId` offsets strictly increase;
   - no `scopedId` on `log-truncated`;
   - every `scopedId` matches the StreamCursorString pattern.
   Each invariant has a negative fixture that fails and a positive control that passes.

### T018 `Gate: contract` staleness, the oracle and two plants

**Steps**:
1. `check.mjs`: regenerate `examples.json`, `fixtures.json` and `routes.json` in memory and fail if any differs byte-for-byte from the committed file, naming the file. Run the T017 validation. Everything stays offline.
2. `gates/plants/contract/plant.json`: add two plants:
   - **stale JSON**: an `edits` overlay changing one value in `mission-status.examples.json`. `expectFailPattern`: `mission-status.examples.json` stale; use the exact message your checker prints.
   - **invalid change item**: an `edits` overlay adding a `scopedId` to the `log-truncated` item in `changes.json`. `expectFailPattern`: the invariant message.
3. Re-run `pnpm contract:generate` and confirm `git diff --exit-code -- packages/mission-ui` is empty (C-002).

### T019 Exit checks and timing

Run every gate, plus `node scripts/gate-proof.mjs local --only contract`, and record the contract proof-leg duration (it was 5:00 of 6 before this mission; WP01 raises the timeout to 10, and WP09 consolidates). Record the counts: routes 10, examples 77, valid fixtures N, change items N.

## Test strategy

Node `--test` files under `scripts/contract/` (picked up by the `test:contract` glob). Each oracle reads the YAML independently. Two contract plants. `pnpm visual` does not run.

## Definition of Done

- **JSON files:** the three generated files are byte-stable and staleness-checked by `Gate: contract`.
- **Routes:** `routes.json` covers all 10 operations, with `refusals` from problem+json responses grouped as schema → statuses, and a reviewed default example per read.
- **Examples:** `examples.json` has all 77 examples (no `_index`), checked against an independent YAML parse, with bidi and BOM characters escaped.
- **Fixtures:** `fixtures.json` holds only the `valid` registry fixtures.
- **Change sequence:** `changes.json` is authored and validated, with every invariant tested both ways.
- **Plants:** two new contract plants, each red on its pattern. The proof-leg time is recorded.
- **Unchanged:** mission-ui's generated `.ts` files are byte-identical.

## Risks

- **`default` responses:** they reference `_shared/responses/Problem.yaml`. They are excluded from `refusals` (A2); resolve shared `$ref`s on numbered responses before reading the media type.
- **Default example choice:** keep `DEFAULT_EXAMPLES` explicit and reviewed. Never take "the first file".
- **Cursor format:** check the StreamCursorString pattern in `_shared` or `mission-status` schemas, rather than guessing it.

## Reviewer guidance

- **Oracles:** confirm they parse the YAML independently and do not reuse the emitter.
- **Refusals:** confirm only problem+json responses are listed.
- **Change invariants:** confirm each one has a negative test.
- **Unchanged:** check that `packages/mission-ui` has no diff.

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file you do not own is changed ONLY where this prompt says so, as a **recorded out-of-map edit**: you commit it with a plain `git add <path>` and `git commit`, and list it in the hand-off with a one-line rationale. A change you need in a file you do not own, and that this prompt does not name, is a **change request** in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`, `contracts/fixtures/*.json` except `mission-status.changes.json`, `packages/mission-shell/src/generated/elements.d.ts`, and `packages/mission-shell/src/generated/intents.ts` if WP04 generates it) are never edited by hand: regenerate them.

Shared-file owners (from `plan.md`, "Shared-file ownership"):

| File | Owning WP |
|---|---|
| `.github/workflows/ci.yml`, root `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.gitignore`, `gates/plants/rust/**` | WP01 |
| root `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `eslint.no-io.config.mjs`, `eslint.data-driven.config.mjs`, `gates/plants/typecheck/**`, `gates/plants/eslint/**`, `gates/plants/no-io/**`, `gates/plants/stylelint/**`, `stylelint.config.mjs`, `gates/data-driven.selftest.ts` | WP02 |
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
