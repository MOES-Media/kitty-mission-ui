# Data Model: kitty-core

These are Rust types owned by `crates/kitty-core`. The exact public signatures are in `contracts/kitty-core-api.md`.

None of them appears in the TypeScript port. Adapters map them onto it (C-002, C-003). This document is revised for squad fix round 1 and the spec Amendments A-01 to A-09.

## Value objects

| Type | Fields | Invariants |
|---|---|---|
| `ServiceEndpoint` | `port: u16`, `generation: u64` | Always `127.0.0.1:<port>`. Built only by kitty-core: from the supervisor (Ready; generation ≥ 1) or `ServiceEndpoint::loopback(port)` (tests and lower-level use; generation 0, which is reserved for it, FS-12). `TryFrom<SocketAddr>` refuses any IP other than `127.0.0.1`, and refuses port 0, before any I/O (FR-005). An endpoint from the supervisor is valid only until the next status transition (R3-07). |
| `Digest` | 32 bytes; shown as 64 lowercase hex characters | SHA-256 of the canonical form (`contracts/bundled-document.md`). |
| `ContractPin` | `document: Cow<'static, [u8]>`, plus the digest computed once | `ContractPin::embedded()` is the generated bundle. Tests may build `ContractPin::from_document(..)` (R4-08). |
| `RouteEntry` | `operation_id`, `path_template`, `kind: Read \| Stream`, `refusals: BTreeMap<Schema, Vec<u16>>` | Parsed once from the embedded `routes.json`. |
| `ReadRequest` | `operation_id`, `path: [(name, value)]`, `query: [(name, value)]` | Refused with no I/O in four cases: an unknown or non-read operation is `Transport(UnknownOperation)`; a placeholder left unfilled is `Transport(MissingParameter)`; a path value that is empty, `.` or `..`, or that contains `/`, `\` or a control character is `Transport(InvalidParameter)` (R2-04). Other path values percent-encode everything except unreserved characters. Query values are encoded in the same way. |
| `StreamScope` | `All`, or `Mission { mission_id, cursor: Option<String> }` | An empty `mission_id` is refused before I/O: `StreamOpenError::CursorWithoutMission` when a cursor is present, `EmptyMission` otherwise. The cursor is sent as `streamCursor`. |

## Read relay

```
ReadOutcome =
  | Answer { status: u16, content_type: Option<HeaderValue>, body: Bytes }   // any HTTP answer, every status (FR-002, FR-003)
  | Transport(TransportFailure)                                             // no HTTP answer
  | NotReady(CoreStatus)                                                    // Core only: state ≠ Ready; no I/O
  | ContractMismatch(Mismatch)                                              // Core only: no I/O (FR-013)

TransportFailure = ConnectRefused | Timeout | BodyTooLarge { limit } | Io(String)
                 | UnknownOperation(String) | MissingParameter(String) | InvalidParameter(String)
```

- **Every status is an `Answer`.** That includes 503, the `default` Problem and undeclared codes.
- **No retries.** kitty-core never retries a read.
- **Deadline.** `read_timeout` is a total deadline, covering the connection, the headers and the body (R3-08).
- **Body cap.** A body over 16 MiB is `BodyTooLarge`, and nothing partial is returned.

## Change stream

```
open_stream(scope) -> Result<ChangeStream, StreamOpenError>      // R1-04, R2-12
StreamOpenError = NotReady(CoreStatus) | ContractMismatch(Mismatch) | CursorWithoutMission | EmptyMission

RawChange  { event: String, cursor: Option<String>, data: Bytes }
StreamEvent =
  | Change(RawChange)                                   // event ∈ {status-transition, mission-lifecycle, log-truncated}
  | Diagnostic(StreamDiagnostic::UnknownEvent { event })
  | Refused { status: u16, content_type: Option<HeaderValue>, body: Bytes }          // terminal (FR-009)
  | Unavailable { reason: UnavailableReason, status: Option<u16>, body: Option<Bytes> } // terminal (FR-010)

UnavailableReason = Status | ConnectRefused | Dropped | Idle { limit } | MalformedFrame | MalformedData
                  | FrameTooLarge { limit: 1 MiB }
                  | BodyTooLarge { limit: 16 MiB }   // a terminal (refused or Status) body over the cap (FS2-04)
                  | Timeout                          // a terminal body still incomplete at read_timeout (FS2-04)
```

**Rules.**
- **Order.** Any number of `Change` and `Diagnostic` items, then at most one terminal item, then `None` forever (the stream is fused).
- **Cancel safety.** `next()` is cancel-safe. `ChangeStream: Send + 'static` (R2-13).
- **Refused.** Only a status declared for `streamEvents` in `routes.json` `refusals` (400, 404, 409), before any event.
- **Unavailable.**
  - Any other non-200 is `Unavailable(Status)`.
  - So is a 200 with no `content-type`, or one other than `text/event-stream`.
  - A clean end of stream is `Dropped`.
- **Idle.** Every byte resets the idle timer, heartbeats included.
- **FrameTooLarge.** It counts every byte since the last event boundary (a blank line, whether or not it dispatched an event), including a pending line with no newline and comment lines (FS-13). Many heartbeats never trip it. Amended 2026-10-17 (pre-merge squad CON-001, R2-NEW-003): the LF that completes a CRLF event boundary is not counted against the next frame; an LF inside a frame still is.
- **MalformedFrame.** A line that is not valid UTF-8. The checks run in this order: the cap, then UTF-8, then field parsing (R2-06).
- **MalformedData.** Joined `data` that is not one JSON value.
- **Field handling, as in the SSE specification.**
  - A bare `data` line (no colon) adds empty data.
  - An empty `id:` clears the cursor.
  - Several `id:` lines in one frame: the last one wins.
  - An `id` containing NUL is ignored.
  - `retry:` and comments are never relayed.
  - A leading BOM is honoured only at the start of the stream.
- **No cursor store.** kitty-core keeps no cursor.
- **Terminal bodies (FS-14, FS2-04).** The body of `Refused` and of `Unavailable(Status)` is read under the 16 MiB cap and `read_timeout`. Over the cap it is `Unavailable(BodyTooLarge)`; past the deadline it is `Unavailable(Timeout)`. A declared refusal with such a body therefore becomes `Unavailable` (a note for #20 and #21).

## Contract check

```
CheckOutcome = Match { digest } | Mismatch(Mismatch)
Mismatch { expected: Digest, actual: Actual }
Actual = Digest(Digest) | Status { status: u16 } | Unparseable { detail: String } | Transport(TransportFailure)
```

- `expected` is the digest of `CoreConfig.contract`, which defaults to the embedded bundle.
- **Parse order.** `serde_json` first, then `yaml_serde` (R3-11).
- **Size cap.** The fetched document is capped at 4 MiB (A-09).
- **Fail closed.** Every outcome other than `Match` is a mismatch.
- **Not authentication.** The digest is not a trust boundary (R2-01).

## Discovery

```
trait Discovery: Send + Sync { fn locate(&self) -> Result<PathBuf, ServiceMissing>; }
ServiceMissing { reason: MissingReason, detail: String }
MissingReason = NotFound | CannotExecute | Crashing
DefaultDiscovery { configured: Option<PathBuf>, env: EnvSnapshot, binary_name: OsString }
EnvSnapshot { service_var: Option<OsString>, path_var: Option<OsString> }   // KITTY_MISSION_STATUS_SERVICE, PATH
```

The lookup runs in this order:

1. **Configured path.** It must be absolute and resolve, following symlinks, to an executable regular file. Otherwise the result is `NotFound`, with no fallback.
2. **Environment variable.** When `service_var` is set and non-empty, it follows the same rule, with no fallback.
3. **PATH search.** Only absolute entries are searched; the rest are skipped. The first executable regular file named `binary_name` wins.
4. **Nothing found** is `NotFound`.

`CannotExecute` comes from spawn or from a project root that cannot be canonicalised. `Crashing` comes from the policy. Its `detail` carries the last exit status or signal (R1-06).

## Supervision

```
SupervisionState = Starting | Ready { endpoint: ServiceEndpoint } | Crashed | Backoff { delay: Duration } | Stopped
DegradedReason   = None | ServiceMissing(ServiceMissing) | ContractMismatch(Mismatch)
CoreStatus       { state, degraded, generation: u64, attempt: u32, left_initial_start: bool }
Timings          { poll_interval: 50 ms, start_timeout: 10 s (per start), stop_grace: 5 s, read_timeout: 30 s, idle_limit: 90 s }
RestartPolicy    { delays: [0.5 s, 1 s, 2 s, 4 s], give_up: 5th crash within 300 s, reset_after_ready: 60 s }
PolicyState      { window: VecDeque<Instant>,   // crash timestamps within 300 s: give-up only (FS-03)
                   index: usize }               // consecutive crashes: selects the delay; 0 after 60 s of Ready; never clears the window
```

- **Initial status.** `Starting`, `generation 1`, degraded `None`, `attempt 0`, `left_initial_start = false` (R5-02, FS-12).
- **`left_initial_start`** becomes `true` at the first `Ready` or the first `Stopped` only, and never goes back (FS-04). `Crashed` and `Backoff` before the first `Ready` leave it `false`.
- **`generation`** starts at 1 and increments at each launch. Every launch, including a busy-port retry and a restart after backoff, publishes a `Starting` carrying the new generation (FS-12).

### State transitions

Every arrow is one `broadcast` message, in order. A send with no receivers is ignored.

| From | Event | To | Degraded |
|---|---|---|---|
| (initial) | discovery found a binary and the root canonicalised | `Starting` | None |
| (initial) | discovery `NotFound` | `Stopped` | ServiceMissing(not-found) |
| `Starting` | spawn fails, or the root cannot be canonicalised | `Stopped` | ServiceMissing(cannot-execute, OS error) |
| `Starting` | child exits before ready (wins a biased select), attempt < 3, budget left | `Starting` (port not yet tried, attempt + 1, generation + 1; published) | None |
| `Starting` | 503 before the first final answer, budget left | `Starting` (keep polling; no message) (A-10) | None |
| `Starting` | start budget spent while every answer was 503 | `Crashed` (after the full stop sequence; a start failure) (A-10) | None |
| `Starting` | Linux: the listening socket's inode is not one of the child group's fds, attempt < 3, budget left | `Starting` (group stopped; an untried port, attempt + 1, generation + 1; published; no crash-window slot, no backoff) (FS-06, FS2-02) | None |
| `Starting` | 200 + digest equal + `try_wait() == None` (+ the Linux socket check) | `Ready { endpoint }` | None |
| `Starting` | first final answer not 200, unparseable, or unequal digest | `Stopped` (group stopped) | ContractMismatch |
| `Starting` | start budget spent, or 3 exits before ready | `Crashed` (after the full stop sequence) | None |
| `Ready` | child exits | `Crashed` | None |
| `Crashed` | policy: fewer than 5 crashes in the window | `Backoff { delay = delays[min(index, 3)] }`, then index + 1 | None |
| `Crashed` | policy: the 5th crash in the window (300 s) | `Stopped` | ServiceMissing(crashing, cause of the last failure: "start budget spent on 503s", "listening socket not owned by the service", or the exit status or signal) (FS2-03) |
| `Backoff` | delay elapsed | `Starting` (generation + 1; published) | None |
| any but `Stopped` | `stop()` | `Stopped` (SIGTERM to the group, grace, SIGKILL to the group) | unchanged |
| any | last host handle dropped | (task aborted; SIGKILL to the group; no further message) | — |
| `Stopped` | `retry()` | `Starting` (discovery again; crash history cleared) | None |

Amended 2026-10-17 (pre-merge squad SEC-002): on Linux a final answer that is not a match is first checked against socket ownership. A listener that the launched group does not own is a busy-port retry on an untried port (cause `NotOwned`), not a `ContractMismatch`.

**Invariants.**
- A supervisor owns at most one child process group, and only one it started.
- Only the supervisor task signals, and only while `child.id()` is `Some` (R2-09). There are two exceptions after the leader is reaped. First, a single `kill(-pgid, SIGKILL)` immediately after the reap, to reach surviving members (FS-07). Second, the probe `kill(-pgid, 0)`, which delivers no signal and only reports whether the group still exists (ESRCH when it does not), so it is harmless even if the pid were reused (FS2-05).
- No process of the group outlives `stop()` or the drop of the last handle.
- Captured output is at most 64 KiB, newest kept. The most recent child's output is kept after it exits.

### `ConnectionState` hint (FR-024, R1-08)

`connection_state_hint(&CoreStatus) -> Option<&'static str>`

| `state` | `left_initial_start` | `degraded` | Hint |
|---|---|---|---|
| `Starting`, `Crashed`, `Backoff` | false (before the first `Ready` or `Stopped`) | None | `connecting` (FS-04, SO-DES-003) |
| `Starting` | true | None | `reconnecting` (including after a host `retry()`: the port never returns to `connecting`) |
| `Ready` | any | None | `connected` |
| `Crashed`, `Backoff` | true | None | `reconnecting` |
| `Stopped` | true | ServiceMissing(any) | `degraded: service-missing` |
| `Stopped` | true | ContractMismatch | `degraded: contract-mismatch` |
| `Stopped` | true | None (host stopped) | `None`, because the adapter is closing |

- **Total over the status space.** Combinations that cannot occur are `None`.
- **Test.** It enumerates the space and asserts that the five strings equal `CONNECTION_STATES` in `packages/mission-shell/src/client/port.ts`.

## Stub additions

| Item | Shape |
|---|---|
| `Fixtures::with_openapi_document(Bytes)` | The document served at `GET /api/v1/openapi.yaml`, byte for byte, as `application/yaml`. When it is absent, the route answers 404 `{"code":"no-openapi-document"}`. |
| `Fixtures::with_selections(Selections) -> Result` | `operationId → Example(<Schema.name>) \| Fixture(<name>)`. It is checked by the header rule. |
| CLI | `--openapi <file>` (missing default → 404; unreadable explicit file → exit 1). `--select` and `--select-fixture`. `--mission-status.port=<n>` and `--mission-status.project-root=<dir>`. The fixtures directory is `--fixtures`, else `<project-root>/.kitty-stub/fixtures`, else the compile-time workspace `contracts/fixtures` (FS-10). Load order: arguments, fixtures, selections, document, `listening`. |
