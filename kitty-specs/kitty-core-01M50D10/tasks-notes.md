# Tasks notes: kitty-core (mission-ui#19)

This file is the orchestrator-facing companion to the generated `tasks.md`. finalize-tasks regenerates `tasks.md` from `wps.yaml`, and it carries no prose.

- **Mission:** `kitty-core-01M50D10`. **Target branch:** `feat/kitty-core-19`.
- **Lanes** are based on `feat/kitty-core-19`. The coordination branch `kitty/mission-kitty-core-01M50D10` carries status and events only, and is never merged into the target (plan "Branches and merge order").
- **Ten work packages** follow the plan's implementation concerns IC-01 to IC-10, one each.
- **One pull request.** Work packages never push and never open pull requests. The mission lands as ONE pull request after accept and the pre-merge squad (R1 to R3).

## IC mapping

| WP | Plan concern | Title | Profile | Subtasks |
|---|---|---|---|---|
| WP01 | IC-01 | Dependencies, exact pins and the proven lock | implementer-ivan | T001–T004 |
| WP02 | IC-02 | The bundled contract document and its Gate: contract plant | node-norris | T005–T010 |
| WP03 | IC-03 | kitty-stub extensions | implementer-ivan | T011–T016 |
| WP04 | IC-04 | Contract client, read relay and forward() | implementer-ivan | T017–T023 |
| WP05 | IC-05 | Change-stream relay | implementer-ivan | T024–T029 |
| WP06 | IC-06 | Contract digest check | implementer-ivan | T030–T035 |
| WP07 | IC-07 | Discovery | implementer-ivan | T036–T038 |
| WP08 | IC-08 | Supervision | implementer-ivan | T039–T046 |
| WP09 | IC-09 | Core facade, degraded signal, host exit and the supervised stand-in | implementer-ivan | T047–T053 |
| WP10 | IC-10 | Documentation, budgets, SC-004 probe and timeouts | node-norris | T054–T057 |

## Dependency graph

```
WP01 ───────────────┐
WP02 ──► WP03 ──────┴─► WP04 ─┬─► WP05 ───────────────┐
  └───────────────────────────┼─► WP06 ─┐             ├─► WP09 ──► WP10
                              └─► WP07 ─┴─► WP08 ─────┘
```

- **Roots** (start in parallel): WP01 and WP02.
- **Then:** WP03 (after WP02), then WP04 (after WP01 and WP03).
- **After WP04, in parallel:** WP05, WP06 (also after WP02) and WP07.
- **Then:** WP08 (after WP06 and WP07), WP09 (after WP05 and WP08) and WP10 (last).

## Shared files and the recorded out-of-map edits

Ownership follows `plan.md`, "Shared-file ownership". Every out-of-map edit is serialised behind its owner by the dependency graph:

| File | Owner | Recorded out-of-map edits by | Ordering guarantee |
|---|---|---|---|
| `Cargo.lock` | WP01 | WP04 (dev edge `kitty-core` → `kitty-stub`, normally already present from WP01's manifest), WP09 (dev edge `kitty-stub` → `kitty-core`) (FS-01) | WP04 and WP09 after WP01 |
| `crates/kitty-core/Cargo.toml` | WP01 | WP08 (`[[bin]] kitty-fake-service`, together with its file; R6-03) | WP08 after WP01 |
| `crates/kitty-stub/Cargo.toml` | WP03 | WP09 (dev-dependency `kitty-core`) | WP09 after WP03 |
| `crates/kitty-core/src/lib.rs` | WP04 | WP09 (`pub use` re-exports only; the plant anchors stay) | WP09 after WP04 |
| `crates/kitty-core/src/{sse,contract,discovery,status,facade}.rs`, `src/supervisor/mod.rs` | WP05 to WP09 | WP04 creates them as empty stubs with an owner doc line (R6-04) | owners after WP04 |
| `crates/kitty-core/src/status.rs` | WP09 | WP08 (the status types `SupervisionState`, `DegradedReason`, `CoreStatus`, needed by the public `StatusSink`; A2) | WP08 after WP04; WP09 after WP08 |
| `crates/kitty-core/src/bin/kitty-fake-service.rs` | WP08 | WP09 (the `host` mode arm; A1) | WP09 after WP08 |
| `crates/kitty-core/tests/common/mod.rs` | WP04 | WP09 (only if a `Core` helper is needed) | WP09 after WP04 |
| `.github/workflows/ci.yml` | WP10 | — (timeout values only, decision `01M50HVPJ9CDBB7405T9K0645R`) | WP10 last |

## Plan clarifications made while slicing (no design change)

- **`Timings` lives in `crates/kitty-core/src/client.rs`** and is owned by WP04. WP04 is the first WP that needs `read_timeout`. WP05, WP08 and WP09 use it, and WP08 writes the default-values test (R5-09). The plan's data model lists `Timings` under Supervision. Only its file location is fixed here.
- **The bundle generator is a separate `generateBundleSource`,** not an entry in `generateJsonSources`, so that its own try/catch in `check.mjs` (`checkBundleFresh`) cannot mask the three #17 files (FS-02). Plan IC-02's first bullet ("an entry in `generateJsonSources`") is read through FS-02's ruling.
- **WP08 exports a public `StatusSink` trait and `spawn_supervisor` entry point,** both `#[doc(hidden)]`, and listed in `kitty-core-api.md` (A2). It also defines the status types in `status.rs`, as an out-of-map edit. WP09 implements the sink with `watch` plus `broadcast(64)`, adds `connection_state_hint`, and owns `status.rs`.
- **The facade module is `facade` (`src/facade.rs`), not `core`.** A crate-level `core` module would collide with the `core` crate in paths (A13).
- **The `host` fake mode and its test (`tests/host_exit.rs`) are WP09's** (A1). WP08's binary has no `host` arm, so it compiles at every WP08 commit.

## Plants

| WP | Gate | Plant | `expectFailPattern` |
|---|---|---|---|
| WP02 | `contract` | stale bundled document (`"version": "1.0.0-SNAPSHOT"` → `"1.0.0-PLANTED"` in the bundle) | `stale generated file: contracts/fixtures/mission-status.openapi.json differs` |

There is no other new plant. Rust tests are exempt (C-007). The three existing rust plants anchor on `crates/kitty-core/src/lib.rs`. WP04 and WP09 must keep `version()`'s `env!("CARGO_PKG_VERSION")` line and the single top-level `#[cfg(test)]`, and `gates/plants/rust/plant.json` is never edited.

## Exit checks that run gate-proof (wrap in `heavy`, foreground)

| WP | Leg | Purpose |
|---|---|---|
| WP02 | `heavy node scripts/gate-proof.mjs local --only contract` | 9 plants red, clean green; the local proxy for `max(21, 10 × T + 2)` |
| WP04 | `heavy node scripts/gate-proof.mjs local --only rust` | the 3 rust plants still red once `lib.rs` is restructured |
| WP08 | `heavy node scripts/gate-proof.mjs local --only rust` | the gate time T after the heaviest tests land (`4 × T + 2`) |
| WP10 | both legs on the integrated branch | final local proxies; the orchestrator re-derives from the PR's first CI run |

## Carried to the orchestrator

- **CI timeouts.** Re-derive both timeouts from the PR's first CI run: contract never below 21; rust `4 × T + 2` (A-04).
- **The probe base.** The local `main` ref in this checkout is stale. Every probe uses `origin/main` after a fetch (R6-01).
- **Merge order with #18 (R6-07).** Whichever is green first merges first. The other merges `main`, then re-runs WP10's T054 and T056.
- **The coordination worktree** (`.worktrees/kitty-core-01M50D10-coord`) has CLI-appended event lines that are not committed. Reconciling them is the orchestrator's job.

## Analyze remediation (analyze at `307ba66` BLOCKED: 1 high, 8 medium, 9 low)

| Id | Fold |
|---|---|
| A1 (high) | The `host` mode and supervision scenario 13 move to WP09 (`tests/host_exit.rs`; an out-of-map edit to WP08's binary). WP08's binary has no `host` arm. Plan IC-08 "Host exit", the ownership table and the API test-only surface are updated |
| A2 | Public `#[doc(hidden)]` `StatusSink` and `spawn_supervisor`, listed in `kitty-core-api.md` |
| A3 | A 300 ms start budget in every budget-exhaustion scenario (never-ready, serve-503, alive-no-bind). The IC-08 `Timings` table is updated |
| A4 | The `alive-no-bind` scenario: 3 scripted ports, a squatter on each, 3 distinct ports, the cause, no `Ready` during that start, and no crash-window slot (sleeper log `[0.5 s]`) |
| A5 | `fork-child` honours `crashAfterMs`, for the "leader exits, grandchild survives" scenario. Added to the contract's mode list |
| A6 | A stream-header case on the raw fake's log, with a positive control (WP05 T027) |
| A7 | The raw-TCP 404 `Problem` stream refusal (WP05 T028) |
| A8 | `retry()` scenarios in WP09 T051: a toggleable `Discovery`; `retry()` after `Crashing` clears the window; `retry()` outside `Stopped` is a no-op |
| A9 | The WP04 harness API (`StubSpec`, `Doc`, `RunningStub`, `raw_fake`, `Step`, `RequestHead`, `squatter`, `write_scenario`), with what WP05 and WP06 use |
| A10 | A project root that does not exist gives `Stopped + cannot-execute`, the OS error, and an empty sleeper log (WP08 scenario 14) |
| A11 | `heavy bash -c '<canonical string>'` in every WP gate block; the reviewer gate-proof line uses `heavy` |
| A12 | `BoxSleep = Pin<Box<dyn Future<Output = ()> + Send + 'static>>`, std only |
| A13 | The module is renamed to `facade` (`src/facade.rs`), and plan IC-09 is consistent |
| A14 | NFR-004 added to WP06 and WP08, C-002 to WP08, NFR-006 to WP09 and WP10, and FR-021 to WP09 (host exit) |
| A15 | Plan IC-02 and Gates now say `generateBundleSource` and `checkBundleFresh`. The decision count is 16 |
| A16 | `kitty-core-api.md`: `http` types come through hyper's re-exports (`pub use http`); #20 and #21 add an exact `http` pin (1.5.0 in the lock) if they name it directly |
| A17 | WP10 writes `## Evidence (#19): budgets, latency, determinism` (NFR-001, NFR-003, NFR-006) for the PR body; the orchestrator posts it |
| A18 | WP10 T055: `git diff -U0 "$base" -- .github/workflows/ci.yml \| grep '^[-+] ' \| grep -v 'timeout:'` must print nothing |

