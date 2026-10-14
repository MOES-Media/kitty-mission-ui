---
work_package_id: WP07
title: 'kitty-stub: loopback HTTP and SSE stub over the shared fixtures'
dependencies:
- WP01
- WP03
requirement_refs:
- FR-010
- FR-011
- NFR-003
- NFR-004
- SC-003
- NFR-001
- NFR-002
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-phase0-bootstrap-01M4V5KK
base_commit: 9522b49959b266274289388a8dc8698d6ed55ce7
created_at: '2026-10-14T00:06:07.092199+00:00'
subtasks:
- T036
- T037
- T038
- T039
- T040
- T041
- T042
history: []
agent_profile: implementer-ivan
authoritative_surface: crates/kitty-stub/
create_intent:
- crates/kitty-stub/Cargo.toml
- crates/kitty-stub/src/lib.rs
- crates/kitty-stub/src/main.rs
- crates/kitty-stub/tests/routes.rs
- crates/kitty-stub/tests/events.rs
- crates/kitty-stub/tests/guard.rs
- crates/kitty-stub/tests/binary.rs
execution_mode: code_change
model: ''
owned_files:
- crates/kitty-stub/**
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP07 - kitty-stub: loopback HTTP and SSE stub over the shared fixtures (IC-08)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Build `kitty-stub`, the loopback HTTP and SSE stand-in for spec-kitty's Mission Status service, exactly as specified in `contracts/stub-http.md`.
- **Reads:** it serves every read's default example, and any example or fixture whose schema fits the route, selected by header, with refusals as `application/problem+json` and their own status (FR-010).
- **Changes:** it plays `changes.json` deterministically over SSE (FR-011, NFR-004).
- **Safety:** it enforces the same Host, Origin and `Forwarded` rules as the upstream service, binds `127.0.0.1` only, and is never published (`publish = false`).
- **Tests:** its tests use independent oracles (`examples.json` as verified by the contract gate, and `changes.json`).

## Context

Read:
- `contracts/stub-http.md` (normative);
- `data-model.md`;
- `research.md`: R-07, and "Supply-chain controls" (S-1 to S-5, Cargo);
- `plan.md`: IC-08;
- `reviews/plan.squad.md`: F-06, F-07, F-09, F-12, F-28, F-31, F-32, F-34, F-35, F-38, R2-06, R2-08, R3-01, R3-02, R3-04, R3-07, R4-02, R4-03.

Facts:
- Root `Cargo.toml`, `Cargo.lock` and the workspace `members` belong to WP01. This WP makes recorded out-of-map edits to them:
  - add `"crates/kitty-stub"` to `members`;
  - add exact `=x.y.z` pins to `[workspace.dependencies]` for `axum`, `tokio` (features `rt-multi-thread`, `macros`, `net`, `time`, `signal`), `serde`, `serde_json` (feature `preserve_order`), and the test-only `tower` and `http-body-util`;
  - update `Cargo.lock`.
- Extend the WP01 members test (`crates/kitty-core/tests/workspace.rs`) expected set with `kitty-stub`. That file belongs to WP01, so it is a recorded out-of-map edit too.
- WP08's `cargo-pins` hygiene check will reject any non-`=` requirement.
- The stub reads `routes.json`, `examples.json`, `fixtures.json` and `changes.json` from `--fixtures <dir>` at startup.

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: WP01, WP03. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP07 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T036 Dependencies, exact pins and supply-chain evidence (F-09, F-34, F-35)

**Steps**:
1. Choose each crate version: the newest at least 14 days old. Record each version's crates.io publish date and the date the crate was first published (S-2).
2. Make the recorded out-of-map edits to the root `Cargo.toml` (`members` plus `[workspace.dependencies]` with `=x.y.z`) and to `Cargo.lock` (`cargo update -p <crate>` as needed, then `cargo fetch --locked`).
3. In `crates/kitty-stub/Cargo.toml`, use `x = { workspace = true }` only, plus `publish = false` set directly in this crate's `[package]` (do not also write `publish.workspace = true`; one key only, B16), and declare the `[[bin]] name = "kitty-stub"`.
4. Evidence for the hand-off:
   - **S-1:** crates.io only; no git, path or `[patch]` sources.
   - **S-3:** every crate in the resolved graph with a `build.rs` or proc-macro, enumerated with `cargo metadata --format-version 1 | <filter on targets kind custom-build/proc-macro>`, not predicted.
   - **S-4:** `--locked` and `--frozen` everywhere.
   - **S-5:** install `cargo-audit` once on the developer machine with `cargo install --locked cargo-audit@=<exact>`, run `cargo audit`, and record the version and output. It is not added to CI.

### T037 CLI, loopback bind and the announcement (R2-08)

**Steps**:
1. `main.rs` parses `--fixtures <dir>`, `--port <n>` (default 0), `--heartbeat-ms <n>` (default 30000) and `--time-scale <f>` (default 1.0) with std only (no clap).
2. Bind with `tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, port))`. There is no flag that changes the address.
3. Print the first stdout line from `listener.local_addr()?`, never from configuration: `listening 127.0.0.1:<port>`. Flush stdout.
4. Shut down gracefully on SIGINT and SIGTERM.

### T038 Host, Origin and `Forwarded` guard (F-32)

A tower or axum middleware layer in `lib.rs` applies to every route, including `/__stub/last-request`:
- `Host` must equal `127.0.0.1:<bound port>` or `localhost:<bound port>`, otherwise `403`;
- `Origin`, when present, must equal `http://127.0.0.1:<port>` or `http://localhost:<port>`, otherwise `403`;
- any `Forwarded` or `X-Forwarded-*` header gives `403`.

These rules mirror the upstream service (#5529 README). The `403` body is exactly as `contracts/stub-http.md` says: `{"code":"<rule>"}` with `<rule>` one of `host`, `origin`, `forwarded` (A8). Tests assert the exact body.

### T039 Reads: defaults, selection and refusals (FR-010, R2-06, R3-01, R3-02, R4-03, F-38)

**Steps**:
1. Load `routes.json` and build axum routes from each `path` template. `/missions/{missionId}` becomes axum's path syntax, generated from the data and not hand-written per route. Only `GET` is routed; other methods give `405`, and unknown paths give `404`.
2. With no selection header, serve `examples.json[defaultExample].value` with `200` and `content-type: application/json`.
3. `X-Kitty-Stub-Fixture: <name>` selects from `fixtures.json`, and `X-Kitty-Stub-Example: <Schema>.<name>` selects from `examples.json`. When both headers are present, the fixture header wins (stub-http.md; A23):
   - if the entry's schema equals the route's `responseSchema`, serve it with `200 application/json`;
   - if the entry's schema is a key of the route's `refusals` and the example's own `status` is in that schema's status list, serve it with that status and `application/problem+json`;
   - anything else (an event example, another schema, or a disallowed status) gives `400 {"code":"schema-mismatch","schema":"…","operationId":"…"}`;
   - an unknown key gives `404 {"code":"no-example"|"no-fixture",…}`.
4. A `null` `defaultExample` gives `501 {"code":"no-example","operationId":"…"}`.
5. Path and query parameter values are **never** used to build a filesystem path. All data is loaded at startup into memory (F-38).

### T040 Events: SSE replay (FR-011, NFR-004, R2-05, R4-02)

`GET /api/v1/events[?missionId=<id>]`:
1. If `X-Kitty-Stub-Example` names an example, apply the read selection rule against the `streamEvents` route's `refusals` (`{ Problem: [404], StreamRefusal: [400, 409] }`; no vendored `Problem` example exists, so in practice only `StreamRefusal` examples are selectable): a `StreamRefusal` example whose own `status` is in the list is served with that status and `application/problem+json` instead of the stream; anything else gives `400 schema-mismatch` (R4-02, A5).
2. Otherwise respond `200 text/event-stream`. For each `changes.json` item, after `delayMs × time-scale` milliseconds, write:
   - `event: <event>`;
   - `id: <scopedId>`, **only** when the request is mission-scoped (has `missionId`) and the item has a `scopedId`;
   - `data: <data as one-line JSON>`;
   - a blank line.
3. Then send `: heartbeat` every `--heartbeat-ms` until the client disconnects.
4. Nothing else varies by run, so the output is byte-identical across runs.

### T041 `/__stub/last-request` (F-28)

Record exactly `{ method, path, headers }` of the most recent `/api/v1/*` request (`path` without the query string; no `query` field; stub-http.md, A23) (a mutex in shared state; header names lower-cased, values as received). `GET /__stub/last-request` returns it as JSON, or `404` before any request. The guard applies to this route too. #21 uses it to assert what its proxy forwarded.

### T042 Tests (independent oracles)

- **`tests/routes.rs`** (router in-process with `tower::ServiceExt::oneshot`):
  - every read in `routes.json` (9) returns `200`, with a body JSON-value-equal to `examples.json[defaultExample].value`. `examples.json` is the oracle: the contract gate verified it against the YAML (F-04). The loop count is asserted.
  - **every selectable example (B6):** loop over every `examples.json` entry whose schema is some read route's `responseSchema` or a key of its `refusals` (plus the `StreamRefusal` entries on `/api/v1/events`), select it with `X-Kitty-Stub-Example` on a route where its schema fits **and**, for a refusal, its own `status` is in that route's allowed list for the schema (C6: `ArtifactRefusal` sits on two routes with different allowed statuses (`PageCursorRefusal` is `[400]` on both of its routes; D7), so choosing by schema alone sends, for example, `artifact-not-text` (415) to `listArtifacts` and gets `400`); each example is asserted exactly once, and assert the served status (200, or the example's own `status` with `application/problem+json`) and a JSON-value-equal body. The test derives the selectable set from `routes.json` and `examples.json`, then asserts its size equals the documented figure (57 at the current pin, stub-http.md) and that the loop ran exactly that many times;
  - a selected refusal example returns its own status and `application/problem+json`;
  - an event example on a read gives `400`;
  - a disallowed status gives `400`;
  - a fixture selection works;
  - unknown keys give `404`;
  - a synthetic `routes.json` with one null default gives `501` (F-12);
  - POST gives `405`, and an unknown path gives `404`;
  - `getArtifactContent` with an `ArtifactPath` query of `../../etc/passwd` (the parameter stub-http.md names) still serves fixture data or a 404 and touches no file; a `missionId` of `..%2F..` likewise (F-38, A23);
  - with both selection headers present, the fixture header wins (A23);
  - each `403` body equals `{"code":"host"}`, `{"code":"origin"}` or `{"code":"forwarded"}` exactly (A8);
  - on `/api/v1/events`, a `StreamRefusal` example with an allowed status is served with that status, and an event example or a status outside `[400, 409]` gives `400` (A5);
- **`tests/guard.rs`**:
  - a foreign Host, a foreign Origin, `Forwarded` and `X-Forwarded-Host` each give `403`, with a positive control: the correct Host passes;
  - the guard covers `/__stub/last-request`;
  - last-request records the headers of the previous call.
- **`tests/events.rs`**, run with `--time-scale 0 --heartbeat-ms 50` equivalents through the lib API, capturing up to the first heartbeat:
  - **scoped:** parse the stream, and the event names, `id:` lines and `data` equal the `changes.json` items in order, with `id:` absent on `log-truncated` (R3-04);
  - **unscoped:** no `id:` lines at all;
  - the byte-identical output across 10 runs (NFR-004);
  - a `StreamRefusal` selection returns problem+json with its status.
- **`tests/binary.rs`** (the real binary, `env!("CARGO_BIN_EXE_kitty-stub")`, F-31, R2-08, R3-07):
  - start the binary with `--port 0`, read the first line, and assert that it starts `listening 127.0.0.1:`;
  - `GET /api/v1/project` with the correct Host gives `200`;
  - non-loopback refusal: find the default-route local IP std-only, with `UdpSocket::bind("0.0.0.0:0")` then `connect("192.0.2.1:9")` then `local_addr()` (no packet is sent). If that IP is not loopback, a TCP connect to `<ip>:<port>` must be refused. Otherwise skip, printing the reason.
  - always kill the child process (with a drop guard).

Run the canonical Rust gate (with its install steps) and record the full `cargo test` output counts.

**Exit checks (B7, B13):**
1. NFR-001 negative proof, now that external crates exist: run `CARGO_HOME=$(mktemp -d) cargo test --workspace --frozen` **without** `cargo fetch --locked` and record that it fails because crates are not available offline. Positive control: in the same fresh `CARGO_HOME`, run `cargo fetch --locked`, then the same command, and record that it passes.
2. Cold Rust gate time: from a clean `target/` (`cargo clean`), time the canonical gate locally and record it; it must be ≤ 8 minutes (NFR-002 proxy; the orchestrator re-measures on the PR's first CI run). Also time `node scripts/gate-proof.mjs local --only rust` and record the rust leg (F-42).

## Test strategy

The four test files above and the canonical Rust gate. No plants are added here; the Rust plants live in WP01, and Cargo pin enforcement is WP08's hygiene plant.

## Definition of Done

- **Crate and pins:** `kitty-stub` builds in the workspace, is a workspace member (the members test is updated), and has `publish = false`. Every dependency is pinned `=x.y.z` with supply-chain evidence: S-1 to S-5, the `build.rs` and proc-macro list, and the `cargo audit` version and output.
- **Bind:** loopback only, with the announcement taken from `local_addr()` and proven by the real-binary test, including the non-loopback refusal or a recorded skip.
- **Guard:** mirrors upstream (Host, Origin, Forwarded) with tests.
- **Reads:** follow the selection and refusal rules exactly (problem+json with its own status, 400 on mismatch, 501 on null).
- **Events:** the SSE output equals `changes.json` (scoped and unscoped id rules) and is byte-identical across 10 runs. The heartbeat and time scale are injectable.
- **Other:** `/__stub/last-request` works. No filesystem path comes from a request. The Rust gate is green, and nothing is left running.
- **Every selectable example:** the exhaustive loop ran over the derived selectable set, whose size equals the documented 57 (B6).
- **Offline proof and timing:** the fresh-`CARGO_HOME` offline failure and its post-fetch positive control are recorded, and the cold Rust gate time (≤ 8 minutes) and the rust proof-leg time are recorded (B7, B13).

## Risks

- **axum path syntax:** `{param}` versus `:param` depends on the version. Generate routes from data.
- **SSE body:** test with `http-body-util` collecting frames until the heartbeat. Avoid timing-dependent sleeps.
- **Cold gate time:** adding axum and tokio raises it. The measurement is a DoD item (exit check 2).

## Reviewer guidance

- **Oracles:** the route test compares against `examples.json`, and the SSE test against `changes.json`.
- **Real binary:** run `tests/binary.rs` yourself.
- **Guard:** confirm it is applied as a layer, not per route.
- **Pins:** check every one is `=x.y.z`.
- **Filesystem:** there is no `std::fs` call in a request handler.

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file you do not own is changed ONLY where this prompt says so, as a **recorded out-of-map edit**: you commit it with a plain `git add <path>` and `git commit`, and list it in the hand-off with a one-line rationale. A change you need in a file you do not own, and that this prompt does not name, is a **change request** in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`, `contracts/fixtures/*.json` except `mission-status.changes.json`, `packages/mission-shell/src/generated/elements.d.ts`, and `packages/mission-shell/src/generated/intents.ts` if WP04 generates it) are never edited by hand: regenerate them.

Shared-file owners (from `plan.md`, "Shared-file ownership"):

| File | Owning WP |
|---|---|
| `.github/workflows/ci.yml`, root `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.gitignore`, `gates/plants/rust/**` | WP01 |
| root `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `eslint.no-io.config.mjs`, `eslint.data-driven.config.mjs`, `gates/plants/typecheck/**`, `gates/plants/eslint/**`, `gates/plants/no-io/**`, `gates/plants/data-driven/**`, `gates/plants/stylelint/**`, `stylelint.config.mjs`, `gates/data-driven.selftest.ts` | WP02 |
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

- `pnpm visual` and `node scripts/gate-proof.mjs local` are run only where this prompt's "Test strategy" says so.
- **Gate-proof clean-output rule (C5):** `scripts/gate-proof/lib.mjs` fails a leg when any plant's `expectFailPattern` appears in the **clean** run's output, and it matches a plant with one `output.includes` substring (C4). So every plant token must be a single substring that is printed only when that plant's violation fires: never a string the clean run prints (for example the name of an existing test, or an identifier clean tests print), and never a file name a parse error would also print. A planted test's own name is fine, because it only exists in the planted run (D8).
- **Plant payload convention (D3):** a `source` overlay's payload lives at `gates/plants/<gate>/<Name>.<ext>.plant` (for example `PlantDataDriven.svelte.plant`), never with a lintable extension: `checkPlantFiles` in `scripts/hygiene/rules.mjs` rejects those. `source` names that `.plant` file; `target` names the real path it is copied to.
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
