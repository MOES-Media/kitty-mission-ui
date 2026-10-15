# Data Model: kitty-core

These are Rust types, owned by `crates/kitty-core`. The exact public signatures are in `contracts/kitty-core-api.md`.

None of these types appears in the TypeScript port. Adapters map them onto it (C-002, C-003).

## Value objects

| Type | Fields | Invariants |
|---|---|---|
| `ServiceEndpoint` | `port: u16` | Always `127.0.0.1:<port>`. It can only be built by `ServiceEndpoint::loopback(port)`. `TryFrom<SocketAddr>` refuses any IP other than `127.0.0.1` (`EndpointError::NotLoopback`) before any I/O (FR-005). Port 0 is refused. |
| `Digest` | 32 bytes; shown as 64 lowercase hex characters | It is the SHA-256 of the canonical form (`contracts/bundled-document.md`). |
| `RouteEntry` | `operation_id`, `path_template`, `kind: Read \| Stream`, `refusals: BTreeMap<Schema, Vec<u16>>` | It is parsed once from the embedded `routes.json`. `path_template` placeholders are `{name}`. |
| `ReadRequest` | `operation_id: &str`, `path: [(name, value)]`, `query: [(name, value)]` | `operation_id` must be a `Read` route, or the result is `ReadOutcome::Transport(UnknownOperation)` with no I/O. Every placeholder must be filled, or the result is `Transport(MissingParameter)` with no I/O. Values are percent-encoded (FR-006). Query pairs keep the caller's order. |
| `StreamScope` | `All`, or `Mission { mission_id: String, cursor: Option<String> }` | A `Mission` with an empty `mission_id` is refused before I/O (`StreamOpenError::CursorWithoutMission` when a cursor is present, `EmptyMission` otherwise). The cursor is sent as `streamCursor`, never as `Last-Event-ID`. |

## Read relay

```
ReadOutcome =
  | Answer { status: u16, content_type: Option<HeaderValue>, body: Bytes }   // any HTTP answer, every status (FR-002, FR-003)
  | Transport(TransportFailure)                                             // no HTTP answer
  | NotReady(CoreStatus)                                                    // Core only: state ≠ ready; no I/O
  | ContractMismatch(Mismatch)                                              // Core only: no I/O (FR-013)

TransportFailure = ConnectRefused | Timeout | BodyTooLarge { limit: 16 MiB } | Io(String)
                 | UnknownOperation(String) | MissingParameter(String)
```

Rule: `Answer` is returned for **every** status, including 503, the `default` Problem and undeclared codes. Deciding refusal versus transport is the adapter's job, under the port's read error contract. kitty-core never retries a read.

## Change stream

```
RawChange  { event: String, cursor: Option<String>, data: Bytes }      // data = joined data-line bytes, unchanged
StreamEvent =
  | Change(RawChange)                                   // event ∈ {status-transition, mission-lifecycle, log-truncated}
  | Diagnostic(StreamDiagnostic::UnknownEvent { event }) // not a failure; the stream continues
  | Refused { status: u16, content_type: Option<HeaderValue>, body: Bytes }          // terminal (FR-009)
  | Unavailable { reason: UnavailableReason, status: Option<u16>, body: Option<Bytes> } // terminal (FR-010)

UnavailableReason = Status | ConnectRefused | Dropped | Idle { limit } | MalformedFrame | MalformedData
                  | FrameTooLarge { limit: 1 MiB } | NotReady(CoreStatus) | ContractMismatch(Mismatch)
```

**Rules.**
- A stream yields any number of `Change` and `Diagnostic` items, then at most one terminal item, then `None`. Dropping the `ChangeStream` closes the connection.
- **Refused.** It is reported only when the status is declared for `streamEvents` in `routes.json` `refusals` (400, 404 or 409), and only before any event.
- **Unavailable.** Any other non-200 at open is `Unavailable(Status)`.
- **Idle reset.** Every received byte resets the idle timer, heartbeats included. The default limit is 90 s.
- **Not relayed.** Heartbeats (comment lines), `retry:` and an empty dispatch are never relayed.
- **The cursor.** `cursor` is the `id:` line exactly as received. kitty-core stores none of them.

## Contract check

```
CheckOutcome = Match { digest } | Mismatch(Mismatch)
Mismatch { expected: Digest, actual: Actual }
Actual = Digest(Digest) | Status { status: u16 } | Unparseable { detail: String } | Transport(TransportFailure)
```

- `expected` is always `pinned_digest()`: the digest of the embedded bundle, computed once.
- Every outcome other than `Match` is a mismatch. Nothing is ever "assumed compatible" (FR-011).

## Discovery

```
trait Discovery: Send + Sync { fn locate(&self) -> Result<PathBuf, ServiceMissing>; }
ServiceMissing { reason: MissingReason, detail: String }
MissingReason = NotFound | CannotExecute | Crashing
DefaultDiscovery { configured: Option<PathBuf>, env: EnvSnapshot, binary_name: OsString }
EnvSnapshot { service_var: Option<OsString>, path_var: Option<OsString> }   // KITTY_MISSION_STATUS_SERVICE, PATH
```

The default lookup rules, in order (decision `01M50D403EEYQYEPSSMAV732DF`):

1. `configured` wins. It must be an existing regular file, or the result is `NotFound` with no fallback.
2. Otherwise, `service_var`, when it is set and non-empty, follows the same rule, also with no fallback.
3. Otherwise, the PATH is searched for `binary_name`: the first regular file that is executable on Unix.
4. Nothing found is `NotFound`.

`CannotExecute` comes from spawn, not from discovery. `Crashing` comes from the restart policy.

## Supervision

```
SupervisionState = Starting | Ready { endpoint: ServiceEndpoint } | Crashed | Backoff { delay: Duration } | Stopped
DegradedReason   = None | ServiceMissing(ServiceMissing) | ContractMismatch(Mismatch)
CoreStatus       { state: SupervisionState, degraded: DegradedReason, attempt: u32 }
Timings          { poll_interval: 50 ms, start_timeout: 10 s, stop_grace: 5 s, read_timeout: 30 s, idle_limit: 90 s }
RestartPolicy    { initial: 0.5 s, factor: 2, cap: 30 s, reset_after_ready: 60 s, give_up: 5 crashes within 300 s }
```

### State transitions

These follow the spec's lifecycle diagram. Every arrow is one `broadcast` message, in order.

| From | Event | To | Degraded |
|---|---|---|---|
| (initial) | discovery found a binary | `Starting` | None |
| (initial) | discovery `NotFound` | `Stopped` | ServiceMissing(not-found) |
| `Starting` | spawn fails (EACCES, ENOEXEC, ENOENT) | `Stopped` | ServiceMissing(cannot-execute, OS error) |
| `Starting` | child exits before ready, attempt < 3 | `Starting` (new port, attempt + 1) | None |
| `Starting` | digest equal | `Ready { endpoint }` | None |
| `Starting` | digest unequal, non-200 or unparseable | `Stopped` (child stopped) | ContractMismatch |
| `Starting` | start timeout, or 3 exits before ready | `Crashed` | None |
| `Ready` | child exits | `Crashed` | None |
| `Crashed` | policy: another try | `Backoff { delay }` | None |
| `Crashed` | policy: 5th crash within 300 s | `Stopped` | ServiceMissing(crashing) |
| `Backoff` | delay elapsed | `Starting` | None |
| `Starting`, `Ready`, `Backoff` | `stop()` or drop | `Stopped` (SIGTERM, grace, SIGKILL) | unchanged |
| `Stopped` | `retry()` | `Starting` (runs discovery again; crash history cleared) | None |

**Invariants.**
- A supervisor owns at most one child, and only one it started itself (decision `01M50D3XMBS9DD3AEWP1F66RRS`).
- No process outlives `stop()` or drop.
- The backoff delay for crash *n* is `min(0.5 s × 2^(n-1), 30 s)`, where *n* counts crashes since the last 60 s of uninterrupted `Ready`.
- Captured output is at most 64 KiB per child, newest kept, in memory only.

### `ConnectionState` hint (FR-024)

`connection_state_hint(&CoreStatus, first_contact_done: bool) -> Option<&'static str>`

| CoreStatus | Hint (port string) |
|---|---|
| `Starting` before any `Ready` | `connecting` |
| `Ready` | `connected` |
| `Crashed`, `Backoff`, or `Starting` after a `Ready` | `reconnecting` |
| `Stopped` + ServiceMissing(any reason) | `degraded: service-missing` |
| `Stopped` + ContractMismatch | `degraded: contract-mismatch` |
| `Stopped` + None (host asked to stop) | `None`: the adapter is closing, so no state is reported |

The hint table is total over the `CoreStatus` space. A test enumerates every combination, and also parses `CONNECTION_STATES` from `packages/mission-shell/src/client/port.ts` to assert that the five strings are exactly the port's strings.

This mapping is a hint for adapters. A stream drop while the service is `Ready` is still the adapter's own `reconnecting` (SO-DES-001).

## Stub additions

| Item | Shape |
|---|---|
| `Fixtures::with_openapi_document(Bytes)` | The document served at `GET /api/v1/openapi.yaml`, byte for byte, as `application/yaml`. When it is absent, the route answers 404 `{"code":"no-openapi-document"}`. |
| `Fixtures::with_selections(Selections)` | `operationId → Example(<Schema.name>) \| Fixture(<name>)`. It is validated by the header rule at build time, and an invalid selection is an `Err`. |
| CLI | `--openapi <file>` (default `<fixtures>/mission-status.openapi.json`), plus `--select op=Schema.name` and `--select-fixture op=name`, both repeatable. Invalid input exits 2 before `listening`. |
