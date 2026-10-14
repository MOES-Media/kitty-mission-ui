# Tasks notes: Phase 0 bootstrap (mission-ui#17)

This file is the orchestrator-facing companion to the generated `tasks.md`. finalize-tasks regenerates `tasks.md` from `wps.yaml`, and it carries no prose.

- Mission `phase0-bootstrap-01M4V5KK`, target branch `feat/phase0-bootstrap-17`.
- Nine work packages follow the plan's implementation concerns IC-01 to IC-09.
- Work packages never push and never open pull requests. The mission lands as ONE pull request after accept and the pre-merge squad (R1 to R3).

## IC mapping

| WP | Plan concern | Title | Profile |
|---|---|---|---|
| WP01 | IC-02 | Rust workspace, toolchain pin and Gate: rust | implementer-ivan |
| WP02 | IC-03 | mission-shell package and Svelte tooling in the gates | frontend-freddy |
| WP03 | IC-01 | Shared examples, fixtures, routes and change-sequence files | node-norris |
| WP04 | IC-04 | Svelte element typings generated from custom-elements.json | node-norris |
| WP05 | IC-05 | MissionStatusClient port and fixture adapter | frontend-freddy |
| WP06 | IC-06 | Permanent Svelte–Lit binding check and unit-tests gate wiring | frontend-freddy |
| WP07 | IC-08 | kitty-stub: loopback HTTP and SSE stub | implementer-ivan |
| WP08 | IC-07 | Workflow and Cargo hygiene, and the scheduled drift alert | node-norris |
| WP09 | IC-09 | Documentation, proof-leg timings and wrap-up evidence | node-norris |

## Dependency graph

```
WP01 ─┬────────────────────────────► WP07 ─┐
      └──────────────┐                     │
WP02 ─┬─► WP04 ─┐    ├─► WP08 ─────────────┼─► WP09
      │         ├─► WP06 ──────────────────┘
      └─► WP05 ─┘    (WP05 also needs WP03)
WP03 ─┬─► WP05
      └─► WP07
```

- **Roots** (start in parallel): WP01, WP02 and WP03.
- **Second wave:** WP04 (after WP02), WP05 (after WP02 and WP03), WP07 (after WP01 and WP03) and WP08 (after WP01 and WP02).
- **WP06** follows WP04 and WP05.
- **WP09** follows WP06, WP07 and WP08, and so transitively everything.

## Shared files and the recorded out-of-map edits

Ownership follows `plan.md`, "Shared-file ownership". Sequencing replaces parallel edits; every out-of-map edit is serialised behind its owner:

| File | Owner | Recorded out-of-map edits by | Ordering guarantee |
|---|---|---|---|
| root `package.json` | WP02 | WP04 (`manifest:check`, `test:scripts`), WP06 (root `test`) | WP04 after WP02; WP06 after WP04 |
| `gates/plants/typecheck/plant.json` | WP02 | WP04 (two plants) | WP04 after WP02 |
| root `Cargo.toml`, `Cargo.lock`, `crates/kitty-core/tests/workspace.rs` | WP01 | WP07 (members, `[workspace.dependencies]`, lock, expected member) | WP07 after WP01 |
| `.github/workflows/ci.yml` | WP01 | WP09 (measured proof-leg timeouts) | WP09 last |
| shell `tsconfig.json` / `vitest.config.ts` | WP02 | WP05 (JSON import settings, if needed) | WP05 after WP02 |
| `packages/mission-shell/src/index.ts` | WP02 | WP05 (export the port and the fixture client, A9) | WP05 after WP02 |

WP02 pre-adds two things so that WP08 needs no edits to files it does not own, and WP04 needs only its two recorded edits above (root `package.json`, typecheck `plant.json`) (B11):
- the `contract:drift` script;
- the generated-typings lint ignore.

WP08's cargo-pins test lives in `scripts/hygiene/`, which `test:scripts` already runs as a directory.

## Squad obligations carried into the WPs (`reviews/plan.squad.md`, "Carried to tasks")

| Obligation | WP |
|---|---|
| 18 plants: rust 3, typecheck 3 (1 + 2), eslint 1, stylelint 1, no-io 1, data-driven 1, unit-tests 3, manifest 1, contract 2, hygiene 2 | WP01, WP02, WP04, WP06, WP03, WP08; counted by WP09 |
| R2-01 binding: a non-default primitive plus no stray attributes | WP06 T031 |
| F-11: every declared intent | WP06 T032 |
| Supply-chain evidence S-1 to S-5, F-29 transitive dates, F-34, F-35 | WP02 T008, WP07 T036; consolidated by WP09 T052 |
| F-42 proof-leg timings | WP01 (starting values), WP02, WP03, WP04, WP06, WP07, WP08 (measurements), WP09 T049 |
| F-14 / SC-005 `git diff` probe | WP06 T035, WP09 T051 |
| F-29 follow-up issue (pnpm `minimumReleaseAge` with an `@spec-kitty` exclusion) | filed by the orchestrator; listed by WP09 T052 |

## Implementation-time change requests

| Change | WP | Why |
|---|---|---|
| Root `test` script becomes `pnpm -r --no-bail --workspace-concurrency=1 test` (recorded out-of-map edit, approved by the orchestrator; commit f9c7006) | WP06 | Without `--no-bail`, a mission-ui browser timeout on a loaded machine stopped `pnpm -r` before the shell suite ran, so the unit-tests plant tokens never appeared. A failure in any package still exits non-zero (`ERR_PNPM_RECURSIVE_FAIL`, verified on pnpm 11.18.0). |
