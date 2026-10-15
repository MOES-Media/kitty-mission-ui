# Pre-merge squad R1 findings (2026-10-15)

Three lens groups reviewed `feat/phase0-bootstrap-17` at 173a056 (diff `origin/main...HEAD`, merge-base 9c9d83c). They only reported.
- **Profiles:** architect-alphonso (boundary), reviewer-renata (contract and security), debugger-debbie (tests and gates).
- **Severity:** 1 to 5, where 5 blocks the merge. No finding is above 3.
- **Probes:** every finding was checked by its lens against the files, or by a live probe (stub curl and raw TCP, applied plants, single-file lint), before it was reported.

## Found clean (summary)

- **Charter boundaries.**
  - No I/O under `packages/*`: no-io covers `.svelte` scripts and templates.
  - I/O happens only in `crates/kitty-stub`, which binds loopback.
  - The Host, Origin and Forwarded guard is the outermost layer and covers the fallback and `/__stub/last-request`.
- **Layering.** The harness does not reach the public entry.
- **Decisions held.** Shared fixture data (DM 01M4V6BWK8JXK4B8TV09MP50AB) and stub isolation (DM 01M4V7AC1A0KJFNQ2JS347XEGS) both hold.
- **Recorded out-of-map edits are sound.**
- **Contract fidelity.**
  - Exactly 10 operationIds, with refusal maps that match upstream.
  - Correct problem+json status codes.
  - SSE `id:` lines only on scoped streams, never on `log-truncated`.
  - Generated fixtures are byte-checked and deterministic.
- **Security probes:**
  - Host: case, `[::1]`, port mismatch, bare, trailing dot, empty, repeated.
  - Origin: case, `null`, duplicate, trailing slash, port, `[::1]`.
  - `Forwarded` in any case.
  - A 20 MB body.
  - 150 headers (431).
  - Path traversal through query, path and fixture header.
  - Methods.
- **CI.** Permissions, SHA pins and `persist-credentials: false` are in place. `drift.mjs` and `remote.mjs` use `execFileSync` without a shell.
- **Supply chain.** Exact pins, a consistent lockfile, and the toolchain pinned to 1.98.1.
- **All 18 new plants** were applied and run against their gate's check. Each turns red with its token, and the clean runs never print a token.
- **CI wiring.** The rust job, svelte-check in typecheck, `.svelte` in the four lint gates, and the shell suite in unit-tests. `--no-bail` still exits 1 on any failing package.
- **Flakiness review.**
  - Rust binary tests bind port 0.
  - The heartbeat starts only after the replay.
  - The 60 s `beforeAll` cannot produce a false green.
- **Re-run.** The full `pnpm test` at 173a056 failed 6 of 2825 mission-ui tests at load 18. The 3 files involved (sk-artifact-screen.a11y, sk-pipeline-screen, sk-work-package-screen.events-7) passed 104/104 twice when run alone. These are load timeouts in a package this mission does not change (C-002).

## Findings

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| CODE-BOUNDARY-001 | 3 | `subscribe` has no channel for the declared stream refusals (400 `cursor_without_mission`, 409 `content_mismatch`, 404 unknown mission). #18 and #19 would have to change the port, which breaks SC-004. | Fix (operator: add now) |
| CODE-BOUNDARY-002 / CODE-CONTRACT-002 | 2 | `SubscriptionScope` lets a caller express a cursor without a missionId, which the contract always refuses. | Fix |
| CODE-CONTRACT-001 | 1 | An empty `missionId` is unscoped in the stub but scoped in the fixture adapter. | Fix (folded into 002) |
| CODE-BOUNDARY-003 | 2 | `createFixtureClient` and its fixture JSON ship in the production entry. There is no `exports` map, so deep imports reach `setConnectionState` and the harness. | Fix |
| CODE-BOUNDARY-004 | 2 | mission-shell does not declare its runtime dependency on `svelte`. | Fix |
| CODE-BOUNDARY-005 | 2 | E-46 is still in force although its sunset condition is met (lint-clean under all 3 configs). | Fix (operator: withdraw) |
| CODE-BOUNDARY-006 | 2 | The ESLint global ignores have no `target/**`, although the plan lists one. | Fix |
| CODE-BOUNDARY-007 | 2 | The dashboard crate sits at the app root, where it would collide with a #21 web frontend. | Fix |
| CODE-BOUNDARY-008 | 1 | Three out-of-map edits are unrecorded: `scripts/contract/cli.test.mjs` and `update.test.mjs` (WP03), and `scripts/perf-split.test.mjs` (WP02). | Fix (record) |
| CODE-BOUNDARY-009 | 1 | `src/client/index.ts` is a dead duplicate barrel, and the entry omits the option types. | Fix (with 003) |
| CODE-BOUNDARY-010 | 1 | Workspace-wide concerns live in product members: membership test in kitty-core, no `default-members`, `pnpm -r` scope. | Follow-up issue |
| CODE-BOUNDARY-011 | 1 | The fixture adapter ignores parameters and cannot select registry fixtures. | Known limitation for #18 |
| CODE-SEC-001 | 2 | The stub has no header-read timeout (slowloris), because axum drops hyper's timer. | Fix |
| CODE-SEC-002 | 2 | `/__stub/last-request` echoes `Authorization` and `Cookie` values verbatim. | Fix (redact the value, keep presence) |
| CODE-SEC-003 | 1 | A huge `--time-scale` panics the stream task. | Fix (reject at parse) |
| CODE-CONTRACT-003 | 1 | The 405 `Allow` header advertises HEAD, which is refused. | Fix |
| CODE-TEST-001 | 3 | The ESLint gate gives `.svelte` files neither the TypeScript rules nor the renderer rules, nor `noInlineConfig` or browser globals. | Fix |
| CODE-TEST-002 | 3 | The FR-009 coverage test does not name a read added to the contract, because literal counts fail first. | Fix |
| CODE-TEST-003 | 2 | The NFR-004 10-run identity tests replay prebuilt buffers in one process, so they cannot fail. | Fix |
| CODE-TEST-004 | 2 | The rust-test plant token `plant_test_rust` also appears in cargo's `Running` line. | Fix |
| CODE-TEST-005 | 2 | Nothing enforces the exact Rust toolchain pin. | Fix |
| CODE-TEST-006 | 2 | The README timing paragraph disagrees with `ci.yml`, and the unit-tests leg runs near its limit. | Fix README; verify on the first CI run |
| CODE-TEST-007 | 1 | A positive control checks a value the test just set; intent samples are untyped; some tokens are generic. | Follow-up issue |
| (known) | 1 | `remote.mjs` `fetchRef` leaks its temp directory when the fetch fails. Pre-existing; confirmed, not re-reported. | Follow-up issue |

## Operator decisions (2026-10-15)

- **CODE-BOUNDARY-001:** add the refusal channel in #17, so SC-004 holds for #18 and #19.
- **E-46:** withdraw it before the PR.
- **Scope:** fix severity 2 and up before the PR. Severity 1 items are folded in where they are cheap and touch the same files; the rest become follow-up issues.
