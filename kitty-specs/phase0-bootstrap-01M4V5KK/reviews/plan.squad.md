# Plan-phase adversarial review: Phase 0 bootstrap (mission-ui#17)

**Mode**: four profile-loaded delegates in parallel, read-only. Each first ran `spec-kitty agent profile show` and `charter context --action plan`.

| Delegate | Lenses |
|---|---|
| `reviewer-renata` | R1 correspondence, R5 testability and non-vacuity |
| `architect-alphonso` | R2 correctness, R4 architecture |
| `researcher-robbie` | R3 security, safety and supply chain (DIRECTIVE_051) |
| `implementer-ivan` | R6 process and gates |

**Scope**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md` and `contracts/`, checked against the repository at `feat/phase0-bootstrap-17` (plan commits a431ade and 4b5e3bc) and the pinned contract.

**Verdicts**: every delegate returned READY-WITH-FIXES. None asked for re-architecture.

**Verification**: the orchestrator re-checked the load-bearing claims before fixing anything:

- Svelte 5.57.2 `set_custom_element_data` (`attributes.js:212-250`). An unregistered element still gets objects as properties; only primitives fall back to attributes.
- `check-hygiene.mjs:95-110`. Full `checkWorkflow` runs on `ci.yml` only.
- mission-ui `package.json` has `main` and no `exports`.
- `ci.yml` timeouts: `storybook-build` 5, `unit-tests` 8.
- 15 of 15 element modules declare `HTMLElementTagNameMap`.
- Several vendored examples per schema (`WorkPackage` ×10, `Project` ×3, …).

Duplicate findings across delegates are merged into one row, with every reporting lens listed.

## Round 1: findings and dispositions

Dispositions follow the procedure's contract: accepted, changed, or deferred_with_rationale.

| Id | Lens | Sev | Finding | Verified | Disposition |
|---|---|---|---|---|---|
| F-01 | R5, R2 | high | The binding check cannot see a registration-order failure. Svelte sets objects as properties even before registration, so a list-only assertion and its plant stay green. | CONFIRMED (Svelte source) | accepted: the test also asserts primitive props (a boolean `false`, the `status` string) arrive as properties. The registration-order plant mounts before the side-effect import, so the boolean arrives as the attribute `"false"` and the test fails (plan IC-06, research R-06). |
| F-02 | R5, R2 | high | No plant proves that a renamed or non-existent **event** fails type checking. Hyphenated `on…` attributes are the weak spot. | CONFIRMED | accepted: a typecheck plant renames an intent handler. The WP first proves whether svelte-check flags unknown hyphenated `on…` attributes. If it does not, the generator emits a typed `intents` action (`use:intents={{ 'sk-open-mission': fn }}`), keyed by the manifest's events, and the harness uses it (IC-04, R-05). |
| F-03 | R5, R2 | high | The FR-009 coverage test can be faked: `CLIENT_OPERATIONS` is not tied to the interface. | CONFIRMED | accepted: `CLIENT_OPERATIONS` is typed as a mapped type over `keyof MissionStatusClient` (minus `connection`) with `satisfies`, so a missing or extra key is a type error. The test also asserts the fixture adapter has exactly those methods. New unit-tests plant: delete one entry (client-port.md, IC-05). |
| F-04 | R5, R2 | high | The FR-010 oracle is circular (the stub compared with the file it serves), and "the vendored example" is undefined when a schema has several examples. | CONFIRMED | changed: the generator also emits `mission-status.examples.json` (every vendored example, keyed `<Schema>.<name>`, from YAML, with no overlays). The contract gate checks it against a fresh YAML parse, which is an independent oracle. Each route names an explicit `defaultExample` from a reviewed map in the generator. The stub serves any example by a request header and any fixture by another (stub-http.md, data-model.md, fixtures-files.md). |
| F-05 | R1 | medium | Connection-state spelling differs: the spec has `degraded: service-missing` (with a space), the plan has `degraded:service-missing`. | CONFIRMED | accepted: the plan uses the spec's exact strings (data-model.md, client-port.md). |
| F-06 | R2, R5 | medium | The stub's "byte-for-byte" claim is false: serde_json re-serialises compactly and sorts keys without `preserve_order`. | CONFIRMED | accepted: equality is JSON-value equality; `preserve_order` keeps the key order readable but is not contractual (stub-http.md). |
| F-07 | R5, R2, R3 | medium | Waiting for the 30-second heartbeat over 10 runs breaks the gate budget. | CONFIRMED | accepted: `--heartbeat-ms` and `--time-scale` are injectable; the tests use 50 ms and scale 0 (stub-http.md, IC-08). |
| F-08 | R5 | medium | FR-005 says "fails if any member is removed", but no check enforces it. | CONFIRMED | accepted: a workspace test runs `cargo metadata --frozen --no-deps` and asserts the four members; the `mission-shell` typecheck stands for the package (IC-02). |
| F-09 | R5, R3 | medium | NFR-003 for Cargo: `axum = "0.8"` is a caret range and no rule checks it. | CONFIRMED | accepted: `[workspace.dependencies]` use `=x.y.z`, enforced by a new hygiene check (`scripts/cargo-pins.mjs`, added to `test:scripts`) with a hygiene plant (R-01, IC-02). |
| F-10 | R2, R5 | high/med | The `@moes-media/mission-ui/contract` import path does not exist (mission-ui has no `exports`). | CONFIRMED | accepted: the shell imports `@moes-media/mission-ui/src/contract/types.generated` (no `exports` field, so deep imports resolve). mission-ui is unchanged (client-port.md). |
| F-11 | R5 | medium | SC-001 says 100% of intents, but the plan tests one; the intent half has no plant. | CONFIRMED | accepted: the test enumerates every event the hosted screen declares in `custom-elements.json`. One is triggered through real UI, the others are dispatched from the element, and each must reach its handler. A plant breaks the intent binding (IC-06). |
| F-12 | R5 | medium | The stub's "no example" (501) branch cannot be reached with real data. | CONFIRMED | accepted: a stub test with a synthetic routes file containing a null example (IC-08). |
| F-13 | R5 | medium | The drift test would run inside `Gate: contract`, and its offline behaviour is unspecified. | CONFIRMED | accepted: `drift.mjs` takes an injectable fetcher; tests use local trees for no-drift, drift, unreachable and error (R-08). |
| F-14 | R5 | medium | SC-005 ("mission-ui byte-unchanged") has no probe. | CONFIRMED | accepted: `git diff --exit-code origin/main -- packages/mission-ui` is a wrap-up step and a reviewer check (IC-09). |
| F-15 | R5, R2, R3, R6 | low/med | The rust gate command differs between plan and research/quickstart (`--locked`), but ci.yml and plant.json must match. | CONFIRMED | accepted: one canonical string, given in the plan's Gates table and used everywhere (see F-40). |
| F-16 | R5, R2, R6 | low | Wrong citation: 8 minutes is the `unit-tests` tier, not `storybook-build`. | CONFIRMED | accepted: spec NFR-002 and R-02 corrected. |
| F-17 | R5, R2 | low | R-05 says only some elements declare `HTMLElementTagNameMap`; all 15 do. | CONFIRMED | accepted: the rationale is now "Svelte types elements through `svelteHTML`, not `HTMLElementTagNameMap`". |
| F-18 | R5 | low | Spec edge case 5 (the toolchain-missing message) is unowned and not achievable as worded. | CONFIRMED | accepted: the spec edge case is reworded to "the README states the prerequisite and the pinned version; rustup installs the pin on first use" (IC-09). |
| F-19 | R5 | low | The no-io `.svelte` plant must not be satisfied by a parse error. | CONFIRMED | accepted: its `expectFailPattern` matches the no-io rule message, not the file name (IC-03). |
| F-20 | R5, R2, R6 | low | A Rust plant that adds an unreachable `.rs` file is vacuous. | CONFIRMED | accepted: Rust plants are anchored `edits` to compiled files, or `tests/plant_*.rs` (auto-discovered) (IC-02). |
| F-21 | R2 | low | The JSON emitter writes U+FEFF and U+202E raw; the .ts emitter escapes them. | CONFIRMED | accepted: the JSON emitter applies the same escaping (IC-01). |
| F-22 | R2 | low | "10 contract reads" is wrong: there are 9 reads plus `streamEvents`. | CONFIRMED | accepted: corrected in the plan. |
| F-23 | R2 | low | `drift.mjs` duplicates `verify-remote.mjs`, and exit 2 conflates errors with "unreachable". | CONFIRMED | accepted: extract one shared compare-with-pin function; exit codes 0 in sync, 1 drift, 2 unreachable, 3 other error (R-08). |
| F-24 | R2 | medium | No decision records that the stub is its own crate, and #16 and #17 say kitty-core. | CONFIRMED | accepted: decision `01M4V7AC1A0KJFNQ2JS347XEGS` recorded (operator alignment). |
| F-25 | R4 | medium | Port gaps (`includePrompt`, other query params, a resume cursor, an undefined `Result`) would force port changes in #19 to #21 (SC-004). | CONFIRMED | accepted: every method takes the operation's full path and query parameters from the generated `operations` types; `subscribe` takes `{ missionId?, cursor? }`; `Result` is defined concretely (client-port.md). |
| F-26 | R2 | medium | The stub cannot serve every example (#17 wording). | CONFIRMED | changed: resolved by F-04 (every example selectable). Narrowed by R3-06 to every example that is a complete response of a route. |
| F-27 | R3, R2, R6 | high | Hygiene does not check SHA pins, permissions or checkout credentials outside `ci.yml`, so the plan's IC-07 claim is false. | CONFIRMED (`check-hygiene.mjs:95-110`) | accepted: hygiene runs the action-pin, permissions and checkout-credentials checks on every workflow file (the gate-structure checks stay `ci.yml`-only), with a hygiene plant (IC-07). |
| F-28 | R4 | medium | #21's header assertions need to observe what the stub received. | CONFIRMED | accepted: the stub-local endpoint `GET /__stub/last-request` returns the method, path and headers of the last `/api/v1` request (stub-http.md). |
| F-29 | R3 | medium | Freshness is checked only for direct dependencies; transitive ones are not age-gated. | CONFIRMED | deferred_with_rationale: a repository-wide pnpm `minimumReleaseAge` would block the private `@spec-kitty/*` release-candidate updates and is a policy change. The WP records the transitive lockfile additions with publish dates as evidence, and a follow-up issue proposes `minimumReleaseAge` with an `@spec-kitty` exclusion. Cargo has no age gate; the WP records publish dates of new `Cargo.lock` entries. |
| F-30 | R3 | medium | `@wc-toolkit/svelte-types` is high-risk: one maintainer, five weeks old, a dependency released yesterday. | CONFIRMED | changed: the dependency is dropped. `scripts/typings.mjs` generates the typings from `custom-elements.json` itself; it is small, deterministic and has no `any` (R-05). |
| F-31 | R3 | medium | The loopback test can be faked if it binds an address itself. | CONFIRMED | accepted: the test runs the real binary (`CARGO_BIN_EXE_kitty-stub`), parses the announced address and asserts `127.0.0.1` (IC-08). |
| F-32 | R3 | medium | R-07 exempts the stub from Host/Origin checks, but the charter has no such exemption, and "never shipped" is not enforced. | CONFIRMED | changed: there is no exemption. The stub enforces the same rules as the upstream service: exact Host `127.0.0.1:<port>` or `localhost:<port>`; Origin absent or same-origin; 403 on `Forwarded`/`X-Forwarded-*`. That also makes it a faithful target for #21. `publish = false` is set in its Cargo.toml (R-07). |
| F-33 | R3 | medium | The drift workflow's permissions and untrusted-input handling are unspecified. | CONFIRMED | accepted: `permissions: contents: read`, `persist-credentials: false`, no install step and no secrets, no upstream data interpolated into `run:`, and the summary written through a file (R-08, F-41). |
| F-34 | R3 | low | The expected list of crates with build scripts is incomplete. | CONFIRMED | accepted: the WP enumerates them from `cargo metadata` instead of predicting (S-3). |
| F-35 | R3 | low | `cargo audit` is not installed and is an unpinned tool addition. | CONFIRMED | accepted: run once on a developer machine with `cargo install --locked cargo-audit@=<exact>`; version and result recorded in WP evidence; not in CI (S-5). |
| F-36 | R3 | low | `svelte-eslint-parser` is missing from the supply-chain package list. | CONFIRMED | accepted: added. |
| F-37 | R3 | low | The newest `@sveltejs/vite-plugin-svelte` needs vite 8; the repo pins vite 7.3.6. | CONFIRMED | accepted: R-01 now says "the newest version at least 14 days old whose peer ranges the existing pins satisfy". |
| F-38 | R3 | low | Stub path parameters could become a filesystem read (`ArtifactPath`). | CONFIRMED | accepted: no request value is ever used to build a filesystem path; a test sends `../` traversal (stub-http.md). |
| F-39 | R3 | low | Drift alert delivery: scheduled workflows in public repositories are disabled after 60 days of inactivity, and a summary alone notifies nobody. | CONFIRMED | accepted in part: the workflow fails (red) on drift or unreachable, so GitHub notifies, and the README documents the 60-day rule. Opening an issue automatically is deferred_with_rationale (it needs `issues: write`; revisit if missed alerts occur). |
| F-40 | R6 | high | The `rust` gate step downloads the toolchain and crates inside the gate step, which breaks NFR-001's every-step rule. | CONFIRMED | accepted: separate steps `rustup show` and `cargo fetch --locked` come first (also in the proof leg for `matrix.gate == 'rust'`); the gate is `cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen` (Gates table). |
| F-41 | R6 | medium | `contract-drift.yml` would need the credentialed install. | CONFIRMED | changed: `drift.mjs` imports only Node built-ins (through the extracted shared function, F-23). The workflow runs `node scripts/contract/drift.mjs` with no install and no secrets, and the WP verifies the import graph. |
| F-42 | R6 | medium | Proof-leg timeouts are tight (contract took 5:00 of 6). | CONFIRMED | accepted: matrix timeouts are raised from measured runs (contract 6→10, unit-tests 11→16; rust set to (1 + 3 plants) × the measured gate time + 2). The measurements are recorded in the WP (Gates). |
| F-43 | R6 | medium | There is no shared-file ownership table. | CONFIRMED | accepted: table added to the plan. |
| F-44 | R6 | low | `packages/mission-shell/tsconfig.json` is not listed (it must extend `tsconfig.base.json`). | CONFIRMED | accepted. |
| F-45 | R6 | low | The generated `elements.d.ts` falls under the typed-ESLint, no-io and data-driven scopes. | CONFIRMED | accepted: an exact-path ignore with a recorded exception, like E-05 for `types.generated.ts`, recorded in the PR (IC-04). |
| F-46 | R6 | low | `test:scripts` is a hand-written list, so new script tests would not run. | CONFIRMED | accepted: `typings.test.mjs` and `cargo-pins.test.mjs` are added to `test:scripts`; drift and contract tests are picked up by the `test:contract` glob. |
| F-47 | R6 | low | The charter says "squad after the plan phase only", but the plan also has a pre-merge squad. | REFUTED | none: "only" contrasts with "after specify" (charter line, review policy). Every prior UI mission ran a pre-merge squad; operator practice. |
| F-48 | R6 | low | The terminology gate does not scan `.svelte` or `.rs` files. | CONFIRMED | accepted: `.svelte` added to `SOURCE_EXTENSIONS`; the scan also covers `crates/**/*.rs` (IC-03). |

Raw findings after merging duplicates: 48. Confirmed 47, refuted 1. All 47 confirmed findings are dispositioned: accepted 41, changed 5 (F-04, F-26, F-30, F-32, F-41), deferred_with_rationale 1 (F-29). F-39 is accepted in part, and its deferred half is recorded in its row.

## Fix round 1 and verification

All dispositions were applied in commit ba4aa2b. The orchestrator spot-checked the result:

- one canonical `rust` gate string in the plan, research and quickstart;
- the connection-state strings match the spec;
- no `mission-ui/contract` import path remains;
- `@wc-toolkit` appears only as a rejected alternative;
- the ownership table is present;
- the byte-for-byte claim is gone;
- hygiene reports 0 findings.

## Round 2: fresh sweep

A fresh `reviewer-renata` instance re-read the changed files across all six lenses. It found 41 of 47 dispositions intact; R2-01 to R2-15 cover the rest and what the fixes introduced.

| Id | Lens | Sev | Finding | Verified | Disposition |
|---|---|---|---|---|---|
| R2-01 | R5 | high | The F-01 fix is still vacuous. Before registration, `loadingMore={false}` becomes the attribute `loadingmore`, which Lit does not observe (it declares `attribute: 'loading-more'`), so the property keeps its default `false`. `status` is an observed attribute and upgrades into the property. Both assertions pass either way. | CONFIRMED (`sk-missions-screen.ts:228`) | accepted: the harness passes `loadingMore={true}`, a non-default value that only arrives through the property. The test asserts the property is `true` **and** that the element carries no attribute named after any prop the harness passed (lower-cased), unless that prop reflects. Mounting before registration fails both assertions (R-06, IC-06). |
| R2-02 | R6 | medium | Since rustup 1.28, `rustup show` no longer installs the toolchain, so the download happens inside the gate step. | CONFIRMED (rustup 1.29.0 here) | accepted: the separate step is `rustup toolchain install`, which reads `rust-toolchain.toml` (R-02, plan Gates, quickstart). |
| R2-03 | R1 | medium | Spec NFR-001's network allowlist does not name the toolchain install. | CONFIRMED | accepted: NFR-001 now names the pinned toolchain install as a dependency-installation step in its own step. |
| R2-04 | R1 | medium | NFR-002's 8-minute cap contradicts the raised proof-leg timeouts. | CONFIRMED | accepted: NFR-002 covers gate jobs. Proof-leg timeouts follow the measured formula stated in the spec. |
| R2-05 | R2 | medium | `mission-lifecycle` with `cursor: null` contradicts the contract: mission-scoped streams carry `id:` for lifecycle events too. | CONFIRMED (`paths/events.yaml`) | accepted: `Change.cursor` is a string on mission-scoped streams for `status-transition` and `mission-lifecycle`, and null on unscoped streams and on every `log-truncated` (data-model, client-port, stub-http). |
| R2-06 | R2 | medium | The selection headers can make a read return a refusal or an event example as a `200`. | CONFIRMED | accepted: a selection is accepted only when its schema equals the route's success schema (served `200`) or one of the route's declared refusal schemas (served with that response's contract status). `routes.json` gains `refusals: { <status>: <schema> }`. Event examples cannot be selected on reads. Any other selection is a `400` with a stub-local code (stub-http, data-model). |
| R2-07 | R4 | medium | `drift.mjs` reimplements `remote.mjs` and the tree compare in `verify-remote.mjs`. | CONFIRMED | accepted: drift reuses `remote.mjs` (`git fetch --depth 1`, built-ins only, `CONTRACT_REMOTE_URL` override for tests) and the extracted tree compare. There is no HTTP listing (R-08, IC-07). |
| R2-08 | R3 | medium | The loopback test is still fakeable, because the binary prints its own announcement. | CONFIRMED | accepted: the announcement must come from `listener.local_addr()` (a review check), and the test also connects on the first non-loopback local address and expects a refusal (skipped, with the reason logged, when there is none) (R-07, IC-08). |
| R2-09 | R6 | low | The plan says 17 new plants; its table lists 16. | CONFIRMED | accepted: the count is corrected. |
| R2-10 | R6 | low | Squad row F-42 says 4 rust plants; the plan has 3. | CONFIRMED | accepted: the F-42 row is corrected below. |
| R2-11 | R6 | low | Ownership-table gaps: `Cargo.toml` `[workspace.dependencies]`, the `ci.yml` requesters, `eslint.data-driven.config.mjs`. | CONFIRMED | accepted: the table and the structure are completed. |
| R2-12 | R6 | low | The root `test` script only runs mission-ui. | CONFIRMED | accepted: the root `test` runs every workspace package's `test`, and `ciCommand` stays `pnpm test` (IC-06 owns it). |
| R2-13 | R2 | low | There are 77 examples; `_index.yaml` is not an example. | CONFIRMED | accepted: the count is 77, and `_index.yaml` is excluded explicitly, as `loadExamples` already does. |
| R2-14 | R6 | low | The stub-crate decision record has no rationale naming the human ruling. | CONFIRMED | accepted: the evidence is the operator's confirmation of the engineering alignment ("Confirmed, write the plan", 2026-10-13, plan interrogation), cited in F-24 and in the plan's Structure Decision. |
| R2-15 | R6 | low | The drift workflow runs on the runner's floating Node version. | CONFIRMED | accepted: a SHA-pinned `actions/setup-node` step with 22.22.2 (no credentials). |

Raw 15, confirmed 15, refuted 0.

## Fix round 2 and verification

All dispositions were applied in commit a1d1227. The orchestrator spot-checked the result:

- `rustup toolchain install` is the install step, in both the plan and research;
- `loadingMore={true}` and the no-stray-attribute assertion are present;
- the plan counts 16 plants and breaks them down per gate;
- hygiene reports 0 findings.

## Round 3: final sweep

A fresh `architect-alphonso` instance swept all six lenses. All 15 round-2 dispositions are reflected, but R2-06 and R2-07 introduced new defects (R3-01 to R3-03).

| Id | Lens | Sev | Finding | Verified | Disposition |
|---|---|---|---|---|---|
| R3-01 | R2 | high | Every contract refusal is `application/problem+json`. `Refusal<Op>` keyed on `application/json` resolves to `never`, the stub would serve refusals with the wrong media type, and `refusals` comes out empty on every route. | CONFIRMED (the vendored contract has 16 `application/problem+json` uses; successes are `application/json`) | accepted: `refusals` and `Refusal<Op>` derive from the `application/problem+json` responses, and the stub serves a refusal with that content type (data-model, client-port, stub-http). |
| R3-02 | R2 | medium | One refusal schema covers several statuses (`ArtifactRefusal` six, `StreamRefusal` two), so "that response's status" is ambiguous. | CONFIRMED (`ArtifactRefusal.yaml`: "the status follows from the code") | accepted: a served refusal uses the selected example's own `status` field. `refusals` maps each schema to its set of allowed statuses, and the stub rejects an example whose status is not in that set (stub-http, data-model). |
| R3-03 | R4 | medium | The reused tree compare reports at most two directory names, not files (FR-012 needs files). | CONFIRMED (`verify-remote.mjs` compares `rev-parse <commit>:<path>` per `UPSTREAM_PATHS` entry) | accepted: drift fetches with `remote.mjs`, hashes every fetched file with the `common.mjs` hash helpers, and compares per file with `PIN.json`'s per-file sha256, listing added, removed and changed files (R-08, IC-07). |
| R3-04 | R5 | medium | The stub's SSE output is checked only against itself, so a stub that streams nothing passes. | CONFIRMED | accepted: the test parses the captured stream and asserts that the event names, `id:` lines and `data` equal `changes.json` in order, for a scoped and an unscoped request. The 10-run byte-identity check is kept on top (stub-http, IC-08). |
| R3-05 | R2 | medium | `Params<Op>` makes the required `query.path` of `getArtifactContent` optional. | CONFIRMED | accepted: `Params<Op>` is the generated `operations[Op]['parameters']` (path and query) as is, so contract optionality is kept (client-port). |
| R3-06 | R1 | low | 25 of the 77 examples are component-level (not a complete response body of any route), so "every example selectable" (F-26) over-claims. | CONFIRMED | accepted: the F-26 claim is narrowed to "every example that is a complete response of a route". Component examples stay in `examples.json` for the shell's fixture adapter. FR-010 ("answers every read with its vendored example") is unaffected (stub-http). |
| R3-07 | R3, R6 | low | The non-loopback connection test needs interface enumeration, which `std` lacks, and no crate is listed. | CONFIRMED | accepted: std-only. A UDP socket "connect" to a documentation-range address reveals the default-route local IP without sending traffic; the test is skipped, with the reason logged, when that address is loopback or unavailable. No new crate (R-07). |
| R3-08 | R6 | low | `pnpm -r test` runs packages concurrently, against the repository's rule that timing ceilings never share the browser. | CONFIRMED | accepted: the root `test` is `pnpm -r --workspace-concurrency=1 test` (plan Gates, IC-06). |
| R3-09 | R6 | low | The plan's revision marker and this record's round-2 verification were stale. | CONFIRMED | accepted: both updated (this section; plan revision line). |

Raw 9, confirmed 9, refuted 0.

## Fix round 3 and verification

(pending)
