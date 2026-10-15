# Pre-merge squad R2/R3: fix verification (2026-10-15)

**Reviewer:** reviewer-renata, independent of both fixers. Report only.
**Scope:** `feat/phase0-bootstrap-17` at 648c884, checked against ab09776, where the R1 record was committed. The fixes came from two branches merged into the feature branch:
- `premerge/rust`: stub, hygiene and dashboard, 10 commits, by implementer-ivan;
- `premerge/ts`: port, exports and lint, 9 commits, by frontend-freddy.

The orchestrator added the out-of-map record, the README timings, the 21-plant count and the unit-tests proof timeout.

**Method:** every R1 finding marked "Fix" was checked against the files and live stub probes, not against the commit messages. Each guard was either run red (revert and run, or plant applied) or shown by reasoning to fail on revert. Afterwards the working tree was clean.

## Result per R1 finding

| R1 ID | Result | Guard |
|---|---|---|
| CODE-BOUNDARY-001 | VERIFIED | `Change` kind `refused` with `Refusal<'streamEvents'>` derived from the generated types. Exactly one refused change, delivered through the scheduler; unsubscribing cancels it. It matches the stub's `X-Kitty-Stub-Example` behaviour on `/events`. `subscribe`'s signature is unchanged, so SC-004 holds. Covered by type tests and runtime tests. |
| CODE-BOUNDARY-002 | VERIFIED | `SubscriptionScope` is a union, with `@ts-expect-error` cases that are type-checked by svelte-check. See R2-NEW-001. |
| CODE-CONTRACT-001 | VERIFIED | Only a non-empty `missionId` scopes the stream. A parity test covers the adapter; `events.rs` `an_empty_mission_id_is_unscoped` covers the stub. |
| CODE-BOUNDARY-003 / 009 | VERIFIED | The exports map is `.` and `./testing`. Deep imports give `ERR_PACKAGE_PATH_NOT_EXPORTED`, and no fixture JSON is reachable from `.`. The dead barrel is deleted. Pinned by `package.test.ts`. |
| CODE-BOUNDARY-004 | VERIFIED | `peerDependencies.svelte` is `5.57.1`, equal to the root pin. The lockfile is consistent. |
| CODE-BOUNDARY-005 | VERIFIED | E-46 is gone from all 3 ESLint configs, and the typings lint clean (rc 0 with `--no-ignore`). The self-tests now assert the file is linted. |
| CODE-BOUNDARY-006 | VERIFIED | A probe file under `target/` is reported as "File ignored". The self-test has positive controls. |
| CODE-BOUNDARY-007 | VERIFIED | The crate is at `apps/dashboard/server`. `workspace_members_live_at_the_expected_paths` would fail on the old path. See R2-NEW-003. |
| CODE-BOUNDARY-008 | VERIFIED | The three files are recorded in `tasks-notes.md`. |
| CODE-SEC-001 | VERIFIED | Live probes: a partial header, no bytes, and one byte every 300 ms are all cut at the timeout. SSE keeps streaming past it with heartbeats. The guard and fallback are still the outermost layer. Reverting `main.rs` to `axum::serve` makes the binary test fail ("still open after 5.11s"). `--header-timeout-ms` parsing exits 2 on 0, -5, `abc` and a missing value. |
| CODE-SEC-002 | VERIFIED | Credential header values come back as `"[redacted]"` and their names are kept. Covered by `guard.rs` `last_request_redacts_credential_values`. Non-standard headers such as `X-Api-Key` are still echoed; that is outside this finding. |
| CODE-SEC-003 | VERIFIED | 1e300, inf, NaN and -1 exit 2 with the usage line; 1e15 and -0 are accepted. The runtime path cannot panic. |
| CODE-CONTRACT-003 | VERIFIED | Every non-GET method answers 405 with `allow: GET`. `routes.rs` covers 3 paths × 7 methods. |
| CODE-TEST-001 | VERIFIED | A `.svelte` probe reports `svelte/prefer-const`, `no-explicit-any`, `no-floating-promises`, the effect of `noInlineConfig`, R1 and `sk/dispatch-custom-event`. The `PlantSvelteAny` plant fails with rc 1 and its token. svelte-check catches undefined globals. |
| CODE-TEST-002 | VERIFIED | The `getNewThing` plant fails 4 tests with "coverage: missing operation getNewThing", and the token is absent from the clean run. |
| CODE-TEST-003 | VERIFIED | Three separate stub processes at `--time-scale 0.02` stream identical bytes over HTTP/1.0, scoped and unscoped, with positive controls. |
| CODE-TEST-004 | VERIFIED | The token `test plant_test_rust ... FAILED` appears only on failure. The old token also matched cargo's `Running` line. |
| CODE-TEST-005 | VERIFIED | The planted `channel = "stable"` gives rc 1 with `[rust-toolchain-pin]`, and the clean runs never print the token. Edge cases (missing file, dotted key, duplicate) fail closed. |
| CODE-TEST-006 | VERIFIED (CI part pending) | Proof-leg timeouts in `ci.yml` against main: unit-tests 11 → 25, stylelint 6 → 9, data-driven 6 → 8, contract 6 → 12, rust 20 (new). They match the README; `gate-proof coverage` passes. The real unit-tests leg time is measured on the PR's first CI run. |

**Plant count.** A recount against 9c9d83c gives 21 new plants at HEAD: contract +2, data-driven +1, eslint +2, hygiene +3, manifest +1, no-io +1, rust +3, stylelint +1, typecheck +3, unit-tests +4. The figure was 18 at 173a056.

**C-002.** `git diff --exit-code origin/main -- packages/mission-ui` is empty.

**Commands the verifier ran:**
- `cargo test --workspace --frozen`, fmt and clippy;
- the shell suite (50/50);
- `pnpm test:scripts` (630/630);
- `pnpm hygiene` (0 findings);
- `pnpm lint`;
- `gate-proof coverage`.

**Separate full run.** The orchestrator ran the full `pnpm test` at 648c884 under the `heavy` wrapper: mission-ui 2825/2825 plus 24 perf, and mission-shell 50/50, in 1004 s.

## New findings and their fixes

| ID | Sev | Finding | Fix |
|---|---|---|---|
| R2-NEW-001 | 1 | `{ missionId: '', cursor }` type-checks, so the wording "unrepresentable" overstates it. The adapter refuses it at run time. | The `port.ts` doc comment and `client-port.md` now say that a cursor without a `missionId` key is a type error and that an empty `missionId` with a cursor is refused at run time. |
| R2-NEW-002 | 1 | The stub serves `/events?streamCursor=…` without a `missionId` as 200 unscoped, while the adapter refuses it. This is consistent with stub-http.md "Not provided", but `client-port.md` did not mention it. | One paragraph in `client-port.md`: the stub differs here, and tests that compare the adapter with the stub must not rely on this case. |
| R2-NEW-003 | 1 | The dashboard move is missing from the planning record. | `tasks-notes.md` gains a "Relocations made by the pre-merge squad" row. The historical WP artifacts keep the planned path. |

## Verdict

**Ready for PR.** Every R1 "Fix" finding is verified, and each one has a guard. The three new findings were severity 1 documentation nits and are fixed. There are no regressions.

**Carried to the PR:**
- the unit-tests proof-leg timeout (25 minutes) and the NFR-002 gate-job times, measured on the first CI run;
- the visual gate and `Gate: proof` (assemble) green on that run;
- follow-up issues for CODE-BOUNDARY-010, CODE-TEST-007 and the `remote.mjs` temp-directory leak;
- CODE-BOUNDARY-011 noted as a known limitation for #18.
