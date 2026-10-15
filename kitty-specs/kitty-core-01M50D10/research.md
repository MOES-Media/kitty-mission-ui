# Research: kitty-core: shared Rust core

## Sources

- **Issues.** Issue 19 and the landing-review design notes on issues 19, 20 and 21, read with `gh issue view --comments`.
- **The #17 landing record.** `kitty-specs/phase0-bootstrap-01M4V5KK/reviews/landing-second-opinion.md`, together with its `contracts/stub-http.md` and `contracts/client-port.md`.
- **Repository files at the branch head `aff104a`.**
  - `Cargo.toml` and `Cargo.lock`;
  - `crates/kitty-stub/src/{lib,main}.rs` and its `tests/*`;
  - `crates/kitty-core/{src/lib.rs, tests/workspace.rs}`;
  - `gates/plants/{rust,contract}/plant.json`;
  - `.github/workflows/ci.yml`;
  - `scripts/contract/{generate,check,common,validate}.mjs`;
  - `scripts/hygiene/cargo-pins.mjs` and `scripts/terminology.mjs`;
  - `.gitattributes`.
- **The vendored contract.** `contracts/spec-kitty/mission-status/paths/events.yaml` and `openapi.yaml`.
- **Upstream crate sources.** The `[features]` tables of `hyper 1.11.1` and `hyper-util 0.1.21`, read in the local cargo registry.
- **crates.io API.** Version lists and publish dates, queried 2026-10-15. These were read-only metadata requests; no crate was downloaded.
- **CI timings.** `gh run view` for runs 38794142800 and 38756980500 on the #17 branch.
- **Offline trial.** A scratch copy of the workspace, outside the repository: `cargo tree --offline`, `cargo metadata --offline` and `cargo check --offline` with the planned dependency set. All three succeeded with toolchain 1.98.1, using only crates already in the local cache.

Each entry gives the Decision, the Rationale, and the Alternatives considered.

## R-01 — The hyper client layer (decision `01M50HVQZBYA7M58WD1ABFMF8K`, resolved A)

- **Decision (operator ruling, 2026-10-15).**
  - Use `hyper::client::conn::http1::handshake` over a `tokio::net::TcpStream` to `127.0.0.1:<port>`, wrapped in `hyper_util::rt::TokioIo`. There is one connection per request or stream, and the connection task is spawned and aborted with its owner.
  - Enable `hyper`'s `client` Cargo option at member level. `hyper-util` needs only its `tokio` option, which the workspace already enables.
- **Rationale.**
  - **Fewer crates.** It adds two lock entries (`want 0.3.1`, `try-lock 0.2.5`) instead of five.
  - **Exact headers.** It sets `Host` explicitly (FR-004), with no connector that could ever resolve a name. The address is a `SocketAddrV4` with an IP fixed to `127.0.0.1` (FR-005).
  - **No stale connections.** There is no pool, so nothing is left pointing at an old port after a restart on a new port. Loopback connection set-up costs microseconds.
  - **Fits the ruling.** It is still "hyper and hyper-util", as ruled in `01M50D3SCB6ZG0PDWCEBGVAG7T`.
- **Coverage of the ruled client options.** The ruling names `client`, `client-legacy`, `http1` and `tokio`. Against the current `Cargo.lock`:
  - `hyper/http1`: covered (`atomic-waker`, `futures-channel`, `futures-core`, `httparse` and `itoa` are present).
  - `hyper/client`: **not covered**. It adds `want` and `try-lock`.
  - `hyper-util/tokio`: covered.
  - `hyper-util/client`: **not covered**. It adds `tracing`, `tracing-core` and `once_cell` (`tracing` with no default features, so there is no `tracing-attributes` procedural macro).
  - `hyper-util/client-legacy`: beyond `client`, it needs `socket2`, `libc`, `futures-util` and `httparse`, which are all present.
- **Alternatives.**
  - The `client-legacy` pooled `Client<HttpConnector>`: rejected as the default for its three extra crates, its pooling hazard across port changes, and a connector that does more than loopback needs.
  - `reqwest`: rejected by the ruling.

## R-02 — The bundle: source, format and staleness (decision `01M50HVKZ0D1C5HBMB1J1P99E1`, resolved A)

- **Decision (operator ruling, 2026-10-15).**
  - `scripts/contract/generate.mjs` builds `contracts/fixtures/mission-status.openapi.json` with `new $RefParser().dereference(openapi.yaml, { dereference: { circular: false } })` and writes it with the existing `jsonText`, which escapes BOM and bidi characters (F-21).
  - It is one more entry of `generateJsonSources`, so `Gate: contract`'s existing `checkJsonFresh` compares it byte for byte.
  - kitty-core embeds it with `include_str!`. The stub serves it as its default document.
- **Plan-time evidence.**
  - Dereferencing the pinned `openapi.yaml` with `circular: false` succeeds. The contract holds only relative file references and no `#` fragments.
  - The result has no `$ref` left. It is 634,219 bytes as two-space JSON.
  - `info.version` (`"version": "1.0.0-SNAPSHOT"`) occurs exactly once, which makes it a valid plant anchor.
- **Rationale.**
  - It reuses the resolver the contract scripts already trust for validation (C-005).
  - It follows the established pattern of "generated JSON in `contracts/fixtures`, checked by `Gate: contract`".
  - The stub gets the document with no new parser. #21's tests get it for free.
  - The four existing fixture files are unchanged, so their shapes are untouched (SC-004).
- **Cost.**
  - `Gate: contract`'s checks are extended, so C-007 requires one plant: a stale bundle.
  - By the #17 formula, the contract proof leg rises from 19 to 21 minutes.
  - Whether a timeout value counts as frozen "gate wiring" is decision `01M50HVPJ9CDBB7405T9K0645R`.
- **Alternatives.**
  - **B: Rust only.** A kitty-core build script embeds the vendored YAML files, and a Rust inliner bundles them at run time.
    - It touches no Node code or contract gate, so it needs no plant and no timeout change.
    - But it is a second reference resolver (against C-005's "reuse, not duplicate").
    - The stub cannot depend on kitty-core without a dev-dependency cycle, so the stub binary would serve the document only when given `--openapi <file>`. That makes FR-014's "the stub serves the pinned bundle" weaker.
  - **YAML instead of JSON for the bundle file.** Rejected. It is 537 KB compact, and its digest is identical by construction (the canonical form ignores syntax). JSON matches the sibling files and `jsonText`.

## R-03 — The canonical form and digest

- **Decision.** `digest_of(bytes)` works in four steps:
  1. Parse the bytes with `serde_json::from_slice` into `serde_json::Value`. Only if that fails, parse them with `yaml_serde` (R3-11). The pinned JSON bundle never touches the YAML parser; a served YAML document does.
  2. Write the value canonically:
     - objects with keys sorted by UTF-8 byte order;
     - arrays in order;
     - strings with `serde_json`'s escaping;
     - numbers (R2-10): converted to `f64` first, as JavaScript does; `-0` becomes `0`; an integral value with magnitude ≤ 2^53 is written as a decimal integer; anything else is written by **one** shortest round-trip formatter (`serde_json`'s `f64` output);
     - `true`, `false` and `null` as is;
     - no whitespace.
  3. Hash the result with SHA-256.
  4. Write the hash as lowercase hex.
- **Rationale.**
  - The Node bundle passes through JavaScript numbers, so `1.0` becomes `1`, while a YAML document parsed in Rust keeps a float `1.0`. Integral normalisation makes the two forms agree.
  - Key sorting removes `preserve_order` from the picture.
  - Spec FR-011 fixes "parsed, references inlined, keys sorted, JSON form, SHA-256". This plan adds only the number rule, which the spec leaves open.
- **Tests.**
  - The same document gives the same digest in JSON flow, in YAML block style and with permuted keys.
  - `-0` and `0` agree, `2^53 + 1` and `2^53` agree (as in JavaScript), and `1.0` and `1` agree.
  - The real bundle and its YAML re-serialisation give the same digest (R5-12).
  - One changed scalar changes the digest.
  - Garbage input is a parse error.
- **Alternatives.**
  - Full RFC 8785 (JCS): rejected. Its ES6 number printing and UTF-16 key order would need more code, for no gain while both inputs go through one Rust path.
  - Hashing raw bytes: rejected by the ruling (`01M50D47J1Q1P03XASV69C4J5X`).

## R-04 — YAML parser (decision `01M50HVNACZ8T6XM1XKJ68TR8J`, resolved A)

- **Decision (operator ruling, 2026-10-15).** `yaml_serde =0.10.7`, the continuation of `serde_yaml` by the YAML Organization (repository `github.com/yaml/yaml-serde`), licensed MIT OR Apache-2.0. It brings `libyaml-rs 0.3.0` and `ryu 1.0.23`. None of the three has a build script or a procedural macro.
- **Candidates checked on crates.io (2026-10-15).**

  | Crate | State |
  |---|---|
  | `serde_yaml 0.9.34+deprecated` | archived and deprecated by its author |
  | `serde_yaml_ng 0.10.0` | last release 2024-05-26 |
  | `serde_norway 0.9.42` | last release 2024-12-21 |
  | `saphyr 0.2.2` | releases on 2026-10-12 and 2026-10-15, younger than 14 days |
  | `yaml_serde` | maintained: 0.10.7 published 2026-08-18 |

- **Rationale.**
  - The route the service answers is `openapi.yaml`, so the real service will most likely send YAML. JSON-only parsing would make every real service a contract-mismatch.
  - **Correction (R2-10).** The earlier claim that `yaml_serde` follows YAML 1.2 core resolution was too strong:
    - `libyaml-rs` is libyaml, a **YAML 1.1** parser;
    - `yaml_serde` keeps `serde_yaml` 0.9's own scalar resolution, which is close to 1.2 core for booleans and nulls but not identical (for example `0o`, `0x` and `.inf` handling);
    - the npm `yaml` package defaults to 1.2 core.

    That gap matters only for a served YAML document. The pinned side is JSON and parsed by `serde_json` (R3-11). Any difference then surfaces as contract-mismatch, which fails closed.
- **Alternative.** **B: JSON only now.** No crates, and fail-closed against real YAML until #22. This is cheaper for the gate budget, but it knowingly ships a check that the real service cannot pass.

## R-05 — SHA-256

- **Decision.** `sha2 =0.10.9`, published 2025-04-30, from the RustCrypto line that has been stable for years.
- **New lock entries.**

  | Crate | Version | Published |
  |---|---|---|
  | `digest` | 0.10.7 | 2023-05-19 |
  | `block-buffer` | 0.10.4 | 2023-03-09 |
  | `crypto-common` | 0.1.7 | 2025-11-12 |
  | `generic-array` | 0.14.7 | 2023-03-28 |
  | `typenum` | 1.20.1 | 2026-05-29 |
  | `version_check` | 0.9.5 | 2024-07-25 |
  | `cpufeatures` | 0.2.17 | 2025-01-25 |
  | `cfg-if` | 1.0.4 | 2025-10-15 |

  `generic-array` has a build script (`cargo metadata`: `custom-build`), which uses `version_check`.
- **Alternatives.**
  - `sha2 0.11.0`, published 2026-03-25: its tree needs `hybrid-array` and newer `digest`, `crypto-common` and `cpufeatures`, none of them in the local cache. It could not be proven offline at plan time. `0.11.1` was published 2026-10-12, which is too young.
  - A hand-written SHA-256: rejected, never roll your own.
  - `ring` or `aws-lc-rs`: rejected for heavy build scripts and C or assembly.

## R-06 — Process supervision on tokio

> **Superseded in part by fix round 1.** The process group, the spawner thread, PDEATHSIG = SIGKILL, the signal discipline and the immediate kill on drop are specified in plan IC-08 and IC-09 and in decision `01M50M42PBSJ806A432AP7M13S`. The text below is kept for history where it does not conflict.
>
> **Platform notes.**
> - **Windows (#20).** Job Objects are the equivalent of a process group plus PDEATHSIG.
> - **macOS.** It has no PDEATHSIG, so `kill_on_drop` and the group SIGKILL on drop cover every orderly exit.
> - **#22 asks upstream** for "exit on parent death", and for a liveness endpoint (R4-09).

- **Decision.**
  - **Spawn.** `tokio::process::Command` with `kill_on_drop(true)` and piped stdout and stderr, drained into a 64 KiB ring buffer per child.
  - **Stop.** `libc::kill(pid, SIGTERM)`; wait for the grace period; then `Child::start_kill()` (SIGKILL); then `wait()`.
  - **Parent death on Linux.** `pre_exec` calls `prctl(PR_SET_PDEATHSIG, SIGTERM)`, then re-checks `getppid()` against the parent's pid and exits at once if they differ.
- **Rationale.**
  - tokio offers only SIGKILL, and FR-021 needs SIGTERM first.
  - `libc 0.2.189` is already locked.
  - PDEATHSIG fires on the death of the forking **thread**. Spawning from the supervisor task's runtime worker, which lives as long as the runtime, avoids the `spawn_blocking` pitfall of short-lived threads.
- **Limits, documented.**
  - macOS and Windows have no PDEATHSIG. After a hard kill of the host (SIGKILL) a child can survive there; `kill_on_drop` and an explicit stop cover every orderly exit.
  - Windows has no SIGTERM, so stop there is an immediate kill. That is #20's multi-OS work.
- **Alternatives.**
  - `nix`: one new crate for two calls.
  - `command-group` or process groups: more surface than one child needs.

## R-07 — Supply-chain controls (DIRECTIVE_051)

New direct crates are `yaml_serde` and `sha2`. `percent-encoding` and `libc` are newly direct but already locked. `kitty-stub` is a dev-dependency inside the workspace.

**New `Cargo.lock` entries (14).** Every date is at least 14 days before 2026-10-15. The versions are those resolved by the offline trial.

| Crate | Version | Published | Build script | Proc macro | Pulled in by |
|---|---|---|---|---|---|
| yaml_serde | 0.10.7 | 2026-08-18 | no | no | kitty-core |
| libyaml-rs | 0.3.0 | 2026-03-11 | no | no | yaml_serde |
| ryu | 1.0.23 | 2026-02-08 | no | no | yaml_serde |
| sha2 | 0.10.9 | 2025-04-30 | no | no | kitty-core |
| digest | 0.10.7 | 2023-05-19 | no | no | sha2 |
| block-buffer | 0.10.4 | 2023-03-09 | no | no | digest |
| crypto-common | 0.1.7 | 2025-11-12 | no | no | digest |
| generic-array | 0.14.7 | 2023-03-28 | **yes** | no | block-buffer, crypto-common |
| typenum | 1.20.1 | 2026-05-29 | no | no | generic-array, crypto-common |
| version_check | 0.9.5 | 2024-07-25 | no | no | generic-array (build) |
| cpufeatures | 0.2.17 | 2025-01-25 | no | no | sha2 |
| cfg-if | 1.0.4 | 2025-10-15 | no | no | sha2 |
| want | 0.3.1 | 2023-06-14 | no | no | hyper (`client`) |
| try-lock | 0.2.5 | 2023-12-07 | no | no | want |

**Resolution notes (R3-10, R4-10; crates.io re-checked 2026-10-15).** Online resolution differs from this table on three entries, and IC-01 runs `--precise` on each:

| Crate | Online pick | Table | Command |
|---|---|---|---|
| `want` | 0.3.2 (2026-10-05, too young) | 0.3.1 | `cargo update -p want --precise 0.3.1` |
| `cfg-if` | 1.0.5 (2026-09-16) | 1.0.4 | `cargo update -p cfg-if --precise 1.0.4` |
| `generic-array` | 0.14.9 (2025-10-13) | 0.14.7 | `cargo update -p generic-array --precise 0.14.7` |

- `typenum` does **not** differ: 1.20.1 is the newest release and the table's version.
- IC-01 then compares the lock with this table.
- No new crate raises a shared crate's minimum:
  - `yaml_serde` needs serde 1.0.195 or later (1.0.229 is locked);
  - it also needs indexmap 2.2.1 or later (2.14.2 is locked) and itoa 1 (1.0.18 is locked);
  - there are no tokio or hyper requirements.
- So no workspace pin is bumped (SO-DES-015).

| Control | Result |
|---|---|
| S-1 Registry authenticity | crates.io only. There is no `[patch]`, git or out-of-workspace path dependency. The only path dependency is `kitty-stub`, a workspace member, as a dev-dependency (`cargo-pins` allows a local path with no version). The WP records each new crate's repository and owners from crates.io. |
| S-2 Freshness | Every new entry is at least 14 days old, with its date above and as a comment beside each direct pin (NFR-002). Transitive drift is blocked by `--precise` and by checking the lock against this table. |
| S-3 Lifecycle scripts | One new build script: `generic-array 0.14.7`. It probes the compiler version through `version_check` and does no I/O beyond `rustc` (the WP reads it and records that). No new procedural macro. The existing `serde_derive` and `tokio-macros` are unchanged. The WP re-derives both lists from `cargo metadata`. |
| S-4 Lockfile installs | `Cargo.lock` is committed. CI runs `cargo fetch --locked`, then `--frozen`, as today. |
| S-5 Incident and IoC posture | The WP runs `cargo install --locked cargo-audit@=<exact>` once on a developer machine, runs `cargo audit` and records the result and the tool version. Not in CI, as in #17. |

**Maintainers and `unsafe` (R3-11).** Owners are from the crates.io API; `unsafe` counts are a grep of the cached sources.

| Crate | Owners | Repository | Downloads | Facts |
|---|---|---|---|---|
| `yaml_serde` 0.10.7 | one: `ingydotnet` (YAML Organization) | `github.com/yaml/yaml-serde` | about 3.4 M | about 60 `unsafe` occurrences in `src` |
| `libyaml-rs` 0.3.0 | one: `ingydotnet` | `github.com/yaml/libyaml-rs` | about 3.4 M | libyaml **translated from C to unsafe Rust with c2rust**, a fork of the archived `dtolnay/unsafe-libyaml`; about 222 `unsafe` occurrences |
| `generic-array` 0.14.7 | `fizyk20`, `novacrazy` | `github.com/fizyk20/generic-array` | about 980 M | one build script |
| `typenum` 1.20.1 | `paholg` | `github.com/paholg/typenum` | about 990 M | — |

- **Mitigation.** The YAML path is reached only by a served document that is not JSON (R3-11). The served document is capped at 4 MiB (A-09). Its only consumer is the digest.
- **For the WP.** The WP records `cargo audit` for both crates.

**npm.** No change. `@apidevtools/json-schema-ref-parser 16.0.3` and `yaml 2.9.1` are already pinned dev-dependencies.

**Adversarial evidence.** The plan-phase R1–R6 squad challenged these decisions. Every finding has a verdict and a disposition in `reviews/plan.squad.md` (R3-10, R3-11, R3-12 and R4-10 for supply chain).

## R-08 — Testing without the stub binary, and the fake service

> **Fix round 1 (R4-01, decision `01M50M47K1PNKP9KHCGGDBQZ0A`).**
> - The stub also accepts the upstream launch options, and the real stub binary is supervised through `Core` in `crates/kitty-stub/tests/supervised.rs`, with kitty-core as a dev-dependency of kitty-stub.
> - **Verified at plan time.** `cargo tree` resolves the mutual dev-dependency graph, and `cargo check --offline --workspace --all-targets` compiles it in 6.6 s.
> - **Not chosen.** A `stub` mode inside `kitty-fake-service`. A binary target cannot use dev-dependencies, so it would need `kitty-stub` (and axum) as a normal dependency of kitty-core, shipping both to the hosts.
> - **Per-launch fake behaviour.** It uses a `launches` list and a launch counter file (R5-04).

- **Decision.**
  - kitty-core dev-depends on `kitty-stub` and runs it in-process: `Fixtures::load(contracts/fixtures)`, then `.with_openapi_document(..)` and `.with_selections(..)`, then `app(..)`, then `run_server` on `127.0.0.1:0` in a spawned task.
  - A `[[bin]] kitty-fake-service` in kitty-core (with `test = false` and `doc = false`) stands in for the service in supervision tests. It reads its scenario from `<project-root>/kitty-fake-service.json`.
  - A raw-TCP fake in `tests/common` writes byte-exact faults: 503, malformed SSE, an oversized frame, a stall, a mid-stream drop, and a body with `null`s, an unknown field and unsorted keys.
- **Rationale.**
  - Cargo gives an integration test `CARGO_BIN_EXE_*` only for binaries of its own package, and C-002 forbids a new member.
  - The stub never depends on kitty-core, so there is no cycle.
  - Reading the scenario from the project root keeps the launch arguments exactly the two upstream flags (FR-017).
- **Alternatives.**
  - Locating `target/debug/kitty-stub` by path: rejected, because it is not built by `cargo test -p kitty-core`.
  - A self-exec harness with `harness = false`: rejected for its custom runner.

## R-09 — Determinism and the time budget

> **Fix round 1.**
> - The test `Timings` table is in plan IC-08.
> - `tokio/test-util` is dropped, because nothing uses `pause`.
> - The rust proof leg follows the #17 formula (A-04, decision `01M50M453N70QGMXHK8AJX1E1H`).
> - The `Clock` is a monotonic `Instant` in production (decision `01M50M407F65T4SQA9TNWQYCQT`).

- **Decision.** Supervision separates two kinds of time:
  - **Policy time.** This is `Clock` plus `Sleeper`: the crash window, the 60 s reset and the backoff delays. Tests use a virtual clock that advances only by recorded sleeps, so the delays and states are exact and repeatable (NFR-006).
  - **I/O time.** This is real tokio timers with durations from `Timings`: readiness poll, start timeout, stop grace, read timeout and idle limit. Tests set them between 10 and 400 ms, so no wait exceeds 1 s (NFR-001).
- **Rationale.** `tokio::time::pause` advances on its own whenever the runtime is idle. While the test is waiting on a real child process, that would fire the start timeout spuriously.
- **Budget.**
  - The `Gate: rust` step measured 34 s and 20 s on the last two CI runs. The rust proof leg measured 35 s with 3 plants.
  - The #17 formula keeps the rust leg at 5 minutes only while the gate step is 45 s or less.
  - A local cold `cargo check --all-targets` of the full planned dependency set took 6.7 s.
  - IC-10 measures the real CI value. Decision `01M50HVPJ9CDBB7405T9K0645R` (resolved A) applies if it exceeds 45 s: the rust leg timeout is re-set by the formula.

## R-10 — Status delivery to hosts

- **Decision.**
  - `tokio::sync::watch` holds the current `CoreStatus`.
  - `tokio::sync::broadcast` with a capacity of 64 carries every transition, in order.
- **Rationale.**
  - FR-016 asks for each transition in order. A `watch` alone coalesces transitions.
  - A bounded `broadcast` never blocks the supervisor and never grows without limit (NFR-004). A lagging host gets `Lagged(n)` and reads `status()`.
- **Alternatives.**
  - An unbounded `mpsc`: rejected for unbounded memory.
  - A bounded `mpsc` with backpressure: rejected, because a slow UI would stall supervision.

## R-11 — Discovery details

> **Fix round 1 (R2-14, R3-09).**
> - The configured path and the environment value must be absolute.
> - PATH entries that are not absolute are skipped.
> - Symlinks are followed, and the target must be an executable regular file.
> - A macOS GUI app gets launchd's minimal PATH, so #20 should prefer the configured path.

- **Decision.**
  - **Configured path.** It must exist and be a file; otherwise the result is `not-found`, with detail and no fallback.
  - **Environment variable.** `KITTY_MISSION_STATUS_SERVICE` follows the same rule when set and non-empty, also with no fallback.
  - **PATH search.** It looks for `binary_name` (default `mission-status-api`), skipping entries that are not regular files or, on Unix, have no execute bit. Nothing found is `not-found`.
  - **Execution failures.** A failure to execute (EACCES, ENOEXEC) shows up at spawn as `cannot-execute`, with the OS error as detail.
- **Rationale.**
  - The operator's ruling `01M50D403EEYQYEPSSMAV732DF`: an explicit choice fails loudly.
  - Reading the environment through `EnvSnapshot` keeps tests free of process-global mutation.
- **Open for later.** The upstream install convention arrives with #22 as another `Discovery` implementation.

## R-12 — Stub start-up selection

- **Decision.**
  - `--select <operationId>=<Schema.name>` picks an example. `--select-fixture <operationId>=<fixture>` picks a fixture.
  - Both are repeatable. One selection per operation is allowed; a second one is a usage error.
  - They are validated with the header rule (schema fit and allowed status) before `listening`, and anything invalid exits with code 2.
  - A request header still wins. The selection replaces only the default example, and on `streamEvents` it serves the refusal instead of the stream.
- **Rationale.**
  - Two flags avoid ambiguity between example keys (`Schema.name`) and fixture names.
  - The rules equal the header rules, so the selectable set stays 57 of 77 examples.

## R-13 — The coordination branch and the decision ledger (R6-08)

- **Finding.** spec-kitty writes the decision **ledger** (`decisions/index.json`, `DM-*.md`) to the primary checkout. In `specify_cli/decisions/service.py`, `_ledger_dir` resolves to `PRIMARY_METADATA`. It writes decision **events** to the coordination worktree's `status.events.jsonl` (`_events_path` resolves to `STATUS_STATE`).
- **The stale copy.** The coordination branch's own `decisions/` folder is a leftover from mission creation that holds the five specify decisions. No tool reads it.
- **Check.** `spec-kitty doctor decisions` compares the event log with the primary index, and reports `clean`.
- **Rule.** Nobody hand-edits either side. The coordination branch is never merged into `feat/kitty-core-19`.

## R-14 — #21's pass-through (R3-07, R4-03)

- **Decision.** `forward(endpoint, path_and_query, accept)` enforces FR-004 and FR-005 and returns the response body untouched. `upstream_request_headers()` is exported.
- **For #21.** #21's proxy uses pass-through for reads and for the stream, not `open_stream`. It re-reads `ready_endpoint()` on each status transition, because an endpoint carries a `generation` and is valid only until the next transition.

## Adversarial challenge

Done: round 1 of the R1–R6 plan squad is recorded in `reviews/plan.squad.md`, with every finding verified and given a disposition.
