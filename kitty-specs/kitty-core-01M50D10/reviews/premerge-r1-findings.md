# Pre-merge squad R1 findings (2026-10-16)

Three lens groups reviewed `feat/kitty-core-19` at 41ec1fc, using the diff `origin/main...HEAD` from merge-base 39a51a6. They only reported findings; none of them changed code.

**Lenses and profiles:**
- boundary, design and fitness for #20, #21 and #22 (architect-alphonso);
- contract fidelity, fail-closed behaviour and security (reviewer-renata);
- tests, gates and flakiness (debugger-debbie).

**Severity:** 1 to 5, where 5 blocks the merge. No finding is above 3.

**Probes:** each lens checked every finding against the files or with a live probe before reporting it. The probes were a compiled consumer crate, raw TCP and stub probes, a real `Core` supervising the fake service, mutants run against the full suite, and loaded runs.

## Found clean (summary)

- **Consumer fit.**
  - `Core` is `Send + Sync + Clone + 'static`, and `ChangeStream` is `Send + 'static`.
  - The futures of `read`, `open_stream`, `stop` and `forward` are `Send`. A Tauri command or channel task (#20) and an axum handler (#21) compile against them.
  - `forward()` returns the response head as soon as it arrives and streams the body. Dropping the body closes the upstream.
  - The connection-state hint covers every state and yields exactly the five `CONNECTION_STATES` of the TS port.
- **Hidden seams stay hidden.** `StatusSink`, `spawn_supervisor`, `SupervisorConfig` and `SupervisorHandle` are `#[doc(hidden)]`, also through the re-exports, and `failure_log()` is not on `Core`.
- **Loopback only.**
  - `0.0.0.0`, `[::1]`, `[::ffff:127.0.0.1]` and `127.0.0.2` are refused, and so is port 0.
  - The socket and `Host` are always `127.0.0.1:<port>`.
- **Request headers on the wire.** For read, forward, stream and contract check, the headers are exactly `host` plus `accept`.
- **Relay fidelity.**
  - Statuses 101 to 999 are relayed as received, and none is invented.
  - Non-UTF-8 bodies come through byte-identical.
  - A declared stream refusal produces exactly one `Refused`.
- **`ReadRequest::target` encoding.** Traversal, encoded, fullwidth and control-character values are encoded, or refused before any I/O.
- **SSE parser.** It handles CR-only line endings, the BOM, multi-line data, an `id` containing NUL, the idle timer, and the 1 MiB frame cap and 16 MiB body caps.
- **Contract digest.**
  - It refuses billion-laughs input, and deep nesting cannot overflow the stack.
  - Any result other than a match fails closed.
  - Readiness requires a match, then `try_wait`, then the ownership scan, in that order.
- **Process spawn.**
  - The environment is cleared and then filled from an allowlist, and stdin is null.
  - Output is capped at 64 KiB.
  - The service gets its own process group, with a parent-death signal from a long-lived thread.
  - No signal is sent to a pgid of 1 or less.
- **Test-rig kills.** They match only the exact scratch root.
- **Double `retry()`.** It cannot produce two live services.
- **Supply chain and CI.**
  - New crates are exactly pinned, and the lockfile only adds entries.
  - The `ci.yml` change touches only `timeout:`.
  - Tests use loopback only.
- **Gates.**
  - `gate-proof coverage` passes.
  - The contract leg turns red on all 9 plants, and the rust leg on all 3.
  - The NFR-006 sequence digests were identical across 30 loaded runs.
  - NFR-001 measured 10.8 s idle and 10 to 14 s under load, against a 60 s limit.

## Findings

| ID | Sev | Where | Finding | Call |
|---|---|---|---|---|
| ARCH-001 | 3 | `facade.rs` `CoreConfig` | It has no constructor. Any new field breaks both hosts and contradicts SC-005. | Fold: `CoreConfig::new(root)` |
| ARCH-002 | 3 | `status.rs`, `contract.rs`, `discovery.rs`, `client.rs`, `sse.rs` | Eight enums that hosts match on are exhaustive. #22's liveness work would break every host `match`. | Fold: `#[non_exhaustive]` |
| ARCH-003 | 3 | `supervisor/process.rs` | The child environment can only pass names through. A host launched from Finder cannot give the service `JAVA_HOME`. | Follow-up on #22, additive after ARCH-001 |
| ARCH-004 | 2 | `supervisor/{process,spawner,output}`, SSE frame types, `canonical_json` | Internals are public and documented. | Fold: `pub(crate)` or `#[doc(hidden)]` |
| ARCH-005 | 3 | `supervisor/process.rs` (non-unix) | On Windows, `stop()` signals nothing and reports `Stopped` while the service still runs. | Fold: stop the leader, plus a README line. Job Objects go to #20 |
| ARCH-006 | 3 | `ci.yml` | The macOS and Windows paths are never compiled. | Follow-up: a cross-target `cargo check` |
| ARCH-007 | 2 | `facade.rs`, `contract.rs` | A broken pin has an all-zero expected digest and shares `Actual::Unparseable`. | Follow-up: `Digest::is_unavailable()` |
| ARCH-008 / SEC-001 | 2 | `forward.rs` | Only the `/api/v1/` prefix is checked. `forward("/api/v1/missions/..")` reached getMission with `missionId=".."`, bypassing FR-006. | Fold: refuse dot segments, encoded separators, backslash, `//`, non-ASCII and `#` |
| ARCH-009 | 2 | `routes.rs` | #21 cannot reach the stream route or a route matcher. | Follow-up on #21 |
| ARCH-010 | 2 | `sse.rs`, `facade.rs` | A host cannot tell which service generation a stream is bound to. | Follow-up |
| ARCH-011 | 2 | `facade.rs`, `supervisor/mod.rs` | A supervisor panic leaves the status frozen. | Follow-up |
| ARCH-012 | 1 | README | `Lagged` handling and the missing `Last-Event-ID` are undocumented. | Fold with docs |
| ARCH-013 | 1 | `facade.rs`, `supervisor/mod.rs` | Two fast `retry()` calls can cause one extra start attempt. | Follow-up |
| SEC-002 | 2 | `supervisor/mod.rs` | A foreign listener on the chosen port can force a terminal contract-mismatch, because ownership is only checked after a match. | Fold |
| SEC-003 | 2 | `tests/common/mod.rs` | Test scratch directory names are predictable and `create_dir_all` accepts existing ones, a risk on a shared `/tmp`. | Follow-up |
| SEC-004 | 1 | `discovery.rs` | `binary_name` is not validated: absolute names and `..` resolve. | Fold |
| SEC-005 | 1 | `contract.rs` | A 4 MiB document of `[` takes about 11 s to reject in YAML, outside the start budget. | Follow-up |
| CON-001 | 1 | `sse.rs` | The frame cap counts one byte too many after a CRLF boundary. | Fold |
| CON-002 | 1 | `endpoint.rs` | `ServiceEndpoint::loopback(0)` accepts port 0. | Follow-up |
| CON-003 | 1 | README | It doesn't say that the parent-death signal reaches only the direct child, that the ownership check is Linux-only and fails open, or that the digest is not authentication. | Fold with docs |
| CON-004 | 1 | `Cargo.toml` | The test-only fake is a regular `[[bin]]` and is built in release. | Follow-up |
| TEST-001 | 3 | `tests/supervision.rs`, `tests/common` | The supervision binary flakes about 2 in 110 runs: `ECONNRESET` on a hand-started fake, and `AddrInUse` on the squatter. The cause is a gap between a port being verified free and actually bound. | Fold the mitigations; harden claims as a follow-up |
| TEST-002 | 3 | `tests/common/mod.rs` | One panic fails every later test with "panic(s) seen", which hides the real failure. | Fold |
| TEST-003 | 3 | `supervisor/mod.rs` | Seven branches survive a mutation: the biased `select!`, the post-digest `try_wait`, the `Io` arm during readiness, ready-reset wiring, the start-deadline check, `note_failure`, and `Retry` during a start. | Fold the first three; the rest are follow-ups |
| TEST-004 | 2 | `kitty-stub/tests/supervised.rs` | It asserts generation 1 while using ephemeral ports. | Fold |
| TEST-005 | 1 | `stream.rs`, `reads.rs`, `supervision.rs` | Wall-clock upper bounds, with 0.7 s or more of margin under load. | No change |
| TEST-006 | 1 | `contract.rs`, `supervision.rs` | Two test names claim more than the tests check. | Fold |
| GATE-001 | 1 | `ci.yml` | The timeouts are adequate on local evidence: rust is estimated at about 3 of 5 minutes, contract at about 6 of 21. | Re-derive from the first CI run |
