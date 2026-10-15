# Plan-phase adversarial review: kitty-core (mission-ui#19)

**Mode**: the R1–R6 lenses as read-only delegates, run by the orchestrator, followed by one fix round by the plan author (architect-alphonso) on the condensed findings.

| Lens | Concern |
|---|---|
| R1 | correspondence (spec ↔ plan ↔ contracts) |
| R2 | correctness |
| R3 | security, safety and supply chain (DIRECTIVE_051) |
| R4 | architecture and seams |
| R5 | testability and non-vacuity |
| R6 | process, gates and branches |

**Scope.** The review covered:
- `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md` and `contracts/` at plan commit `740fa74`;
- the repository at `feat/kitty-core-19`;
- the #17 port contract in this checkout, `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md`, which is current after the merge of `origin/main`.

**Inputs to the fix round.** The orchestrator condensed the findings. Four operator rulings were relayed by the coordinator on 2026-10-15 and recorded as decisions:

| Decision | Finding | Ruling |
|---|---|---|
| `01M50M407F65T4SQA9TNWQYCQT` | R2-02 | restart policy |
| `01M50M42PBSJ806A432AP7M13S` | R2-08 | process group |
| `01M50M453N70QGMXHK8AJX1E1H` | R6-02 / R1-05 | rust budget |
| `01M50M47K1PNKP9KHCGGDBQZ0A` | R4-01 | supervised stand-in |

The orchestrator also issued decisions on R1-02, R1-03 / R3-05 / R2-07, R2-03, R4-07, R4-08, R4-09, R5-14 / R6-06 and R3-11.

**Verification.** Before folding, the plan author re-checked these load-bearing claims:

- **R1-01.** `contracts/fixtures/mission-status.examples.json` and `mission-status.fixtures.json` hold no entry with schema `Problem` (a Python scan of both files).
- **R2-02.** Under "give up at the 5th crash within 300 s", the backoff index never passes 4. Even with 59 s of `Ready` between crashes, five crashes land inside 300 s. Delays of 8, 16 and 30 s are unreachable.
- **R2-05 / R5-01.** #17's `stub-http.md` says `/__stub/last-request` reports `path` without the query string, so it cannot assert query encoding.
- **R2-10 / R3-11.**
  - `libyaml-rs` 0.3.0's README states that it is libyaml translated from C to unsafe Rust with c2rust, a fork of the archived `dtolnay/unsafe-libyaml`. That makes it a YAML 1.1 parser.
  - crates.io lists one owner (`ingydotnet`) for both `yaml_serde` and `libyaml-rs`.
  - A grep of the cached sources finds about 222 `unsafe` occurrences in `libyaml-rs` and about 60 in `yaml_serde`.
- **R3-10 / R4-10.** crates.io, re-checked 2026-10-15: online resolution would pick `want 0.3.2`, `cfg-if 1.0.5` and `generic-array 0.14.9` instead of the table's versions. `typenum` 1.20.1 is already the newest release.
- **R4-01.** `cargo tree --offline` resolves mutual dev-dependencies (kitty-core ⇄ kitty-stub), and `cargo check --offline --workspace --all-targets` compiles them in 6.6 s, in a scratch copy of the workspace. A Cargo `[[bin]]` cannot use dev-dependencies, so a `stub` mode inside `kitty-fake-service` would need `kitty-stub` as a normal dependency of kitty-core.
- **R5-11 / R6-05.** `ci.yml` gives `Gate: contract` `timeout-minutes: 5`.
- **R5-14 / R6-06.** `scripts/hygiene/gitattributes.test.mjs` enumerates exactly `examples`, `fixtures` and `routes` (plus `changes`).
- **R6-01.** `39a51a6` is an ancestor of `HEAD`, and `git merge-base HEAD origin/main` is `39a51a6`. The **local** `main` ref is stale at `9c9d83c`, though, so `git merge-base HEAD main` still predates #17. Every probe now uses `origin/main`.
- **R6-08.** In `specify_cli/decisions/service.py`, `_ledger_dir` resolves to `PRIMARY_METADATA` (the ledger lives on `feat/kitty-core-19`) and `_events_path` to `STATUS_STATE` (events live on the coordination branch). `spec-kitty doctor decisions` reports `clean`.

Duplicate findings across lenses are merged into one row, with every reporting id listed.

## Round 1: findings and dispositions

Dispositions follow the procedure's contract: accepted, changed, or deferred_with_rationale.

| Id | Lens | Finding | Verdict | Disposition |
|---|---|---|---|---|
| R1-01 | R1 | FR-009 asks for a 404 `Problem` stream refusal selected at stub start-up, but no `Problem` entry exists to select. | CONFIRMED (fixture scan) | changed: IC-05 builds the in-process stub with `from_values` plus one in-memory `Problem` example and `with_selections`. The raw-TCP 404 stays as a second case. Spec A-08. The wording in quickstart and stub-http-delta is fixed. |
| R1-02 | R1 | C-002 and SC-004 freeze "the shapes of `contracts/fixtures/*`", and the plan adds a file there. | CONFIRMED | accepted: spec A-01. The freeze covers the four #17 files; the generated bundle (decision `01M50HVKZ0D1C5HBMB1J1P99E1`) is not a shape change. |
| R1-03, R3-05, R2-07 | R1, R3, R2 | FR-021's "drop → SIGTERM, grace, SIGKILL" cannot run in `Drop`. Clone ownership and abort semantics are undefined. | CONFIRMED | changed: spec A-05. Dropping the last handle is an immediate kill. A `HandleGuard` count aborts the supervisor task, and `ChildGuard::drop` sends SIGKILL to the group. Only `stop()` is graceful, and hosts must `await stop()` (plan Architecture, IC-08, IC-09; data-model). |
| R1-04, R2-12 | R1, R2 | `open_stream` signals a refusal made before any I/O as an in-stream item, so "nothing was sent" cannot be told apart. | CONFIRMED | changed: `open_stream -> Result<ChangeStream, StreamOpenError>`. The test asserts that the fake's request log is empty (IC-05; API). |
| R1-05, R6-02 | R1, R6 | NFR-001 and SC-006 fix the rust proof leg at 5 minutes, but the #17 formula may require more. | CONFIRMED | accepted (operator, `01M50M453N70QGMXHK8AJX1E1H`): spec A-04. The proof leg follows the formula, and the 8-minute job stays hard. |
| R1-06, R2-16 | R1, R2 | Crash diagnostics are lost (output cleared on exit; no exit status in `crashing`). macOS quarantine is unmapped. | CONFIRMED | accepted: the most recent child's output is kept, and the `Crashing` detail carries the last exit status or signal. A quarantined binary killed by the OS maps to `crashing` (note for #20) (IC-08; data-model). |
| R1-07 | R1 | The SC-004 probe does not cover all of `packages/`. | CONFIRMED | accepted: `git diff --exit-code "$base" -- packages/` (IC-10; quickstart). |
| R1-08, R2-11, R2-15 | R1, R2 | The hint parameter has two names (`had_ready` and `first_contact_done`). The rule after a retry is undefined, `Timings` test values are scattered, and `tokio/test-util` is unused. | CONFIRMED | changed: one input, `CoreStatus.left_initial_start`, with an explicit table including the after-retry rule (data-model). One test `Timings` table (IC-08). `test-util` is dropped. |
| R2-01, R3-06 | R2, R3 | A readiness race: a squatter on the port can answer while the child exits, and the digest is treated as authentication. | CONFIRMED | accepted: a biased select in which the child's exit wins; `try_wait() == None` after the digest matches; "the digest is not a trust boundary" (Architecture, bundled-document); a squatter case in the busy-port test (IC-08). |
| R2-02 | R2 | The 30 s cap (and 8 and 16 s) is unreachable under the give-up rule. | CONFIRMED (arithmetic above) | accepted (operator, `01M50M407F65T4SQA9TNWQYCQT`): spec A-02 and A-03. The delays are 0.5, 1, 2, 4 s, then give up at the 5th crash in 5 min. The start timeout is per start, and `Clock` is a monotonic `Instant`. |
| R2-03 | R2 | Readiness polling semantics are undefined (refused, reset, 503, per-poll bounds, what happens to a timed-out child). | CONFIRMED | accepted (orchestrator): refused or reset means keep polling. A 503 while starting means keep polling within the budget. Any other first answer is final. Each poll is bounded by the budget left. A timed-out child goes through the full stop sequence before `Crashed` (IC-08; data-model). |
| R2-04 | R2 | Percent-encoding alone does not stop `.`, `..`, empty or control-character path values from changing the route. | CONFIRMED | accepted: these are refused before I/O as `Transport(InvalidParameter)`; query values stay encoded (IC-04; data-model). |
| R2-05, R5-01 | R2, R5 | FR-013 is tested only at client level, so the `Core` gate is not proven. FR-006's query encoding cannot be seen on `/__stub/last-request`. | CONFIRMED (stub-http.md) | accepted: a `Core`-level `serve-modified` scenario asserts `ContractMismatch` (not `ConnectRefused`) and a request log holding only the `openapi.yaml` fetch. The query encoding is asserted on the raw-TCP fake's log (IC-04, IC-06). |
| R2-06 | R2 | FrameReader edge cases are unspecified. | CONFIRMED | accepted: the cases are enumerated, each fed byte by byte and whole: split CRLF or BOM; the cap counting the pending line and comments; the meaning and order of `MalformedFrame`; bare `data`; multiple, empty or NUL `id`; no or non-SSE content type; clean EOF = `Dropped`; fused (IC-05; data-model). |
| R2-08 | R2 | Signalling only the pid leaves a forking service's children alive. | CONFIRMED | accepted (operator, `01M50M42PBSJ806A432AP7M13S`): `setpgid(0,0)` in `pre_exec`, SIGTERM and SIGKILL to `-pgid`, and a `fork-child` fake test (IC-08). |
| R2-09, R3-04 | R2, R3 | Signal-after-reap and pid-reuse risk. `pre_exec` behaviour on parent death is unnamed. | CONFIRMED | accepted: only the task that owns the `ChildGuard` signals, only while `child.id()` is `Some`, never after `wait()`. `pre_exec` makes only `setpgid`, `prctl` and `getppid` calls, and returns `Err(ESRCH)` on parent death, with no `_exit` (IC-08). |
| R2-10 | R2 | The canonical number form disagrees with JavaScript (`-0`, values above 2^53, two formatters). R-04 overstates YAML 1.2. | CONFIRMED (libyaml-rs README) | accepted: `f64` first; `-0` becomes `0`; ≤ 2^53 is written as an integer; one shortest round-trip formatter; tests for `-0` and 2^53 + 1 (bundled-document, IC-06). The R-04 claim is corrected (research). |
| R2-13 | R2 | Cancel-safety and `Send` bounds are unstated. | CONFIRMED | accepted: `next()` is cancel-safe; `ChangeStream: Send + 'static`; `Core: Send + Sync` (API). |
| R2-14, R3-09 | R2, R3 | Relative paths and relative or empty PATH entries can resolve against the working directory. Symlink behaviour is unstated. | CONFIRMED | accepted: the configured path and the environment value must be absolute; non-absolute PATH entries are skipped; symlinks are followed (documented); each case is tested; a launchd PATH note for #20 (IC-07; research R-11). |
| R2-17 | R2 | The port picker can return the same port again on a retry. | CONFIRMED | accepted: it excludes ports already tried within the start (IC-08). |
| R3-01 | R3 | The launch argv form does not match upstream's `--name=value`. The project root is not canonicalised. | CONFIRMED | changed: spec A-06. The argv is exactly the two `=` strings, the root is canonicalised or refused, and the test asserts the exact strings (IC-08; API). |
| R3-02 | R3 | The child inherits the host's full environment (tokens, proxies). | CONFIRMED | accepted: `env_clear()` plus the allowlist `PATH`, `HOME`, `LANG`, `LC_*` and `TMPDIR`. The fake records its environment, and the test asserts it. A Charter Check row is added. |
| R3-03 | R3 | The child inherits stdin and the working directory. | CONFIRMED | accepted: `stdin(Stdio::null())`, and `current_dir(<canonical root>)` (IC-08). |
| R3-07, R4-03 | R3, R4 | #21's proxy has no enforced pass-through, and a stale endpoint survives restarts. | CONFIRMED | accepted: `generation` on `CoreStatus` and `ServiceEndpoint`, valid until the next transition; `forward()` and `upstream_request_headers()` are exported; #21 uses pass-through, not `open_stream` (IC-04, IC-09; API; research R-14). |
| R3-08 | R3 | Caps can be bypassed: the SSE cap ignores pending lines and comments, `read_timeout` is per phase, and the contract fetch is uncapped. | CONFIRMED | accepted: the SSE cap counts all bytes since the last frame, with a no-newline test; `read_timeout` is a total deadline; the contract fetch is capped at 4 MiB (spec A-09), with a test (IC-04 to IC-06). |
| R3-10, R4-10 | R3, R4 | Online resolution differs from the evidenced lock (named: `want`, `cfg-if`, `typenum`). | CONFIRMED, except the `typenum` sub-claim, which is REFUTED: 1.20.1 is the newest release, so it does not differ | changed: IC-01 runs `--precise` on `want 0.3.1`, `cfg-if 1.0.4` and `generic-array 0.14.7` (online would pick 0.14.9, which the finding did not name), then compares the lock with research R-07. |
| R3-11 | R3 | The YAML parser is a c2rust, unsafe-heavy, single-owner dependency on the pinned path. | CONFIRMED (crates.io owners, README, grep) | accepted (orchestrator): `serde_json::from_slice` first, YAML only on failure, so the pinned bundle never reaches YAML. The owners, c2rust and `unsafe` facts are recorded in R-07. |
| R3-12 | R3 | The date comments on the pins are not in a checkable form. | CONFIRMED | accepted: a `# published YYYY-MM-DD` comment on each pin, a new style the reviewer checks (IC-01). |
| R4-01 | R4 | There is no supervised stand-in: `Core` is never proven against a real service-like binary, and #20 and #21 have no route. | CONFIRMED | accepted (operator, `01M50M47K1PNKP9KHCGGDBQZ0A`): spec A-07. The stub takes the upstream options and a fixtures default. `crates/kitty-stub/tests/supervised.rs` supervises the real stub through `Core`, with reads and a stream. The suggested `kitty-fake-service` `stub` mode was **not** used, with justification: bin targets cannot use dev-dependencies, so it would ship axum to the hosts. The route for #20 and #21 is documented in kitty-core-api.md. |
| R4-02 | R4 | `Core::start` panics outside a tokio runtime. | CONFIRMED | accepted: `CoreConfig.runtime: Option<Handle>`, else `Handle::try_current()`; it returns `Err(NoRuntime)` (API). |
| R4-04, R5-02 | R4, R5 | Subscribing can miss early transitions. The initial status is undefined. `SendError` handling is undefined. | CONFIRMED | accepted: `start` returns a pre-subscribed `Subscription`; `subscribe()` is atomic; the initial status is defined; `SendError` is ignored (data-model; API). |
| R4-05 | R4 | PDEATHSIG is tied to the forking thread. The signal choice and other platforms are unaddressed. | CONFIRMED | accepted: forks happen on a dedicated long-lived spawner thread; PDEATHSIG is SIGKILL (a dying host cannot run a grace period); Job Objects are named for #20; "exit on parent death" goes on #22's asks; every libc use is behind `cfg` (Architecture, IC-08, research R-06). |
| R4-06, R5-05 | R4, R5 | The host-exit test is vacuous: it does not run `Core`, has no grandchild pid, and is not proven red. | CONFIRMED | accepted: `host` mode runs `kitty_core::Core`; the grandchild writes its pid; the host exits through `std::process::exit`; the WP shows the test red with `prctl` removed; Unix-only modes are gated with `cfg` (IC-08; API). |
| R4-07 | R4 | A missing default document makes the stub exit, which breaks temp fixture directories. The load order is unpinned. | CONFIRMED | accepted (orchestrator): a missing default serves 404 `no-openapi-document`; only an unreadable explicit `--openapi` exits 1; the order is arguments, fixtures, selections, document, `listening` (spec A-07, stub-http-delta, IC-03). |
| R4-08 | R4 | The pinned contract cannot be injected. | CONFIRMED | accepted (orchestrator): `CoreConfig.contract: ContractPin`, defaulting to `ContractPin::embedded()` (API; data-model). |
| R4-09 | R4 | A hung but alive service stays `Ready`, with no liveness probe. | NOTED | deferred_with_rationale (orchestrator): no liveness probe in #19, because the contract defines no health endpoint. It is documented in the API and goes on #22's notes. |
| R4-11 | R4 | `http`, `hyper` and `tokio` types leak through the public surface. | NOTED | accepted as documentation: kitty-core-api.md "Leaking types". The hosts share the workspace pins. |
| R5-03 | R5 | NFR-005 "0 panics" has no observable check (panics in spawned tasks are silent). | CONFIRMED | accepted: a panic-hook counter in `tests/common` that every scenario asserts is 0; `stop()` surfaces a supervisor `JoinError` as `SupervisorPanicked`; `panic_probe.rs`, in its own binary, proves the counter catches a panic (IC-09). |
| R5-04 | R5 (with R2-15) | The fake's behaviour cannot differ per launch, so crash, then ready, then crash sequences cannot be scripted. The start point of `crashAfterMs` is undefined. | CONFIRMED | accepted: a `launches` list plus a launch counter file; `crashAfterMs` counts from the first `openapi.yaml` GET served (API; IC-08). |
| R5-06 | R5 | The cost of `digest_of(bundle)` in the dev profile (about 80 ms locally, reported) is not budgeted. | NOTED (not re-measured at plan time: no heavy runs allowed) | accepted: the IC-06 WP measures it first and records it; the 2 s test start timeout leaves at least 10× margin. |
| R5-07 | R5 | The 60 s total for kitty-core's tests is not measured on CI. | CONFIRMED | accepted: IC-10 sums kitty-core's `finished in` lines from the CI log; reviewers check that every real wait is ≤ 1 s against the `Timings` table. |
| R5-08 | R5 | NFR-006's "10 runs" is not specified. | CONFIRMED | accepted: the pure-policy test loops 10 times; process scenarios are run 10 times locally, recorded and repeated once by the reviewer (IC-08, IC-10). |
| R5-09 | R5 | The defaults and the idle reset have no tests. | CONFIRMED | accepted: tests for the defaults of `Timings` and `RestartPolicy`; heartbeats keep the stream alive, then a stall gives `Idle` (IC-05, IC-08). |
| R5-10 | R5 | The output ring and the 16 MiB cap have no tests. | CONFIRMED | accepted: a ring-buffer unit test (keeps the newest 64 KiB); 16 MiB + 1 gives `BodyTooLarge`, with nothing partial (IC-04, IC-08). |
| R5-11, R6-05 | R5, R6 | The contract leg timeout of 21 is computed from a pre-mission gate time. The contract job's own cap is not considered. | CONFIRMED (`ci.yml` contract `timeout-minutes: 5`) | accepted: re-derived from the PR's first CI run as `max(21, 10 × T + 2)`. The contract job's 5-minute cap is noted, with about 1 s added by the bundle (Gates, IC-02, IC-10). |
| R5-12 | R5 | The digest test does not use the real bundle across both parsers. | CONFIRMED | accepted: `digest_of(bundle) == digest_of(to_yaml(parse(bundle)))` (IC-06). |
| R5-13 | R5 | The supervision tests assert states but not delays. | CONFIRMED | accepted: the `RecordingSleeper` log is asserted alongside the states (IC-08). |
| R5-14, R6-06 | R5, R6 | The bundle's `.gitattributes` line is untested. | CONFIRMED (`gitattributes.test.mjs` lists three generated files) | deferred_with_rationale (orchestrator): `gitattributes.test.mjs` is unchanged, because extending it would extend `Gate: hygiene` (plant plus timeout) for one attribute line. Recorded in IC-02, with a reviewer diff check instead. |
| R5-15 | R5 | NFR-003's method for the 200 events is unstated. | CONFIRMED | accepted: the raw-TCP fake writes 200 frames 5 ms apart and records the flush `Instant`; the consumer records `next()`; p95 of the difference (IC-05). |
| R6-01 | R6 | The plan's base did not contain #17, so the SC-004 probe and the merge-base were wrong. | CONFIRMED | accepted: resolved by the coordinator's merge of `origin/main` (`00ff9f6`). Verification found the **local** `main` ref still stale at `9c9d83c`, so every probe now uses `git merge-base HEAD origin/main` after a fetch (plan Branch contract, IC-10; quickstart). |
| R6-03 | R6 | IC-01 declares a `[[bin]]` whose file does not exist yet, so the build would fail. | CONFIRMED | changed: the `[[bin]]` stanza moves to IC-08, which adds it together with its file (IC-01, IC-08, ownership table). |
| R6-04 | R6 | IC-07 and others edit `lib.rs` in parallel with IC-04. | CONFIRMED | changed: IC-04 pre-declares every module as an empty stub, so later ICs fill files and only IC-09 adds re-exports (ownership table). |
| R6-07 | R6 | The merge order with #18 is unrecorded. | NOTED | accepted: whichever is green first merges first. The other merges `main`, re-runs its SC-004 probe and timeout derivation, and resolves CHANGELOG and README (plan "Branches and merge order"). |
| R6-08 | R6 | The coordination branch and the decision ledger diverge (`decisions/index.json`). | CONFIRMED (spec-kitty source, `doctor decisions` clean) | accepted: the coordination branch carries status and events only and is never merged into `feat/kitty-core-19`; lanes are based on `feat/kitty-core-19`; the ledger lives on the primary branch by design; the coordination branch's `decisions/` is a stale copy no tool reads; nothing is hand-edited (plan "Branches and merge order", research R-13). |
| R6-09 | R6 | `bundle.test.mjs` could print the plant token and satisfy the plant vacuously. | CONFIRMED | accepted: the test never prints the token and never uses it as a test title (IC-02, Gates). |

## Tally

72 finding ids:

| Verdict | Count | Ids |
|---|---|---|
| CONFIRMED | 68 | — |
| NOTED | 4 | R4-09, R4-11, R5-06, R6-07 |
| REFUTED | 0 | One sub-claim is REFUTED: the `typenum` part of R3-10 / R4-10 |

## Result

- **Spec.** `spec.md` gained Amendments A-01 to A-09, dated 2026-10-15.
- **Decisions.** Four new decisions were recorded and resolved by the operator. `decision verify` is clean, and `doctor decisions` is clean.
- **Plants.** Unchanged: 1 new contract plant (stale bundle). The rust leg gains none.
- **Timeouts.** Contract `max(21, 10 × T + 2)`; rust `4 × T + 2`, both from the PR's first CI run.
- **Crates.** No new crates beyond the 14 in research R-07. The mutual dev-dependency and dropping `tokio/test-util` add none.
- **Still open for the operator.** One item: the local `main` ref is stale, which the coordinator may want to fast-forward. The probes no longer depend on it.
