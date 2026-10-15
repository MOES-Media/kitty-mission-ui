# Contract: `kitty-core` public Rust surface

This is the surface the desktop host (#20) and the dashboard host (#21) build on. SC-005 says they start with 0 changes to it, and their plan reviews check against this file.

The WP may adjust spelling, generic bounds and `async fn` against returning `impl Future`. The semantics and the set of operations are fixed. This version is revised for squad fix round 1.

```rust
// ---- Facade (one per project; SO-DES-013) ----
pub struct CoreConfig {
    pub project_root: PathBuf,                  // canonicalised at start (A-06)
    pub discovery: Arc<dyn Discovery>,          // DefaultDiscovery::from_process(configured, binary_name)
    pub contract: ContractPin,                  // ContractPin::embedded() (R4-08)
    pub timings: Timings,                       // Timings::default()
    pub policy: RestartPolicy,                  // RestartPolicy::default(): 0.5, 1, 2, 4 s; give up at the 5th crash in 300 s; reset after 60 s Ready
    pub ports: Arc<dyn PortPicker>,             // LoopbackPortPicker (never repeats a port within one start)
    pub clock: Arc<dyn Clock>,                  // MonotonicClock (Instant); ManualClock in tests
    pub sleeper: Arc<dyn Sleeper>,              // TokioSleeper; RecordingSleeper in tests (backoff only)
    pub runtime: Option<tokio::runtime::Handle>,// None → Handle::try_current() (R4-02)
}

pub struct Subscription { pub initial: CoreStatus, pub receiver: broadcast::Receiver<CoreStatus> }

pub struct Core { /* Clone; every clone holds one Arc<HandleGuard> */ }
impl Core {
    pub fn start(config: CoreConfig) -> Result<(Core, Subscription), StartError>; // StartError::NoRuntime; never panics
    pub fn status(&self) -> CoreStatus;
    pub fn subscribe(&self) -> Subscription;                  // atomic: current status + receiver under the publishing lock
    pub fn retry(&self);                                      // only from Stopped
    pub async fn stop(&self) -> Result<(), SupervisorPanicked>; // SIGTERM(group), grace, SIGKILL(group); resolves when the group is gone
    pub fn ready_endpoint(&self) -> Option<ServiceEndpoint>;  // Some only while Ready; valid until the next transition (generation)
    pub async fn read(&self, req: &ReadRequest<'_>) -> ReadOutcome;           // NotReady / ContractMismatch without I/O unless Ready
    pub async fn open_stream(&self, scope: StreamScope) -> Result<ChangeStream, StreamOpenError>;
    pub fn captured_output(&self) -> Vec<u8>;                 // newest ≤ 64 KiB of the current or most recent child
}
// Dropping the LAST Core clone drops the HandleGuard: the supervisor task is aborted, its ChildGuard sends SIGKILL to
// the process group (no grace period; A-05), and kill_on_drop is the backstop. Hosts must `stop().await` for a graceful exit.

// ---- Lower level ----
pub struct ContractClient { /* endpoint + timings */ }
impl ContractClient {
    pub fn new(endpoint: ServiceEndpoint, timings: &Timings) -> Self;
    pub async fn read(&self, req: &ReadRequest<'_>) -> ReadOutcome;
    pub async fn open_stream(&self, scope: StreamScope) -> Result<ChangeStream, StreamOpenError>;
    pub async fn check_contract(&self, pin: &ContractPin) -> CheckOutcome;
    pub async fn forward(&self, path_and_query: &str, accept: HeaderValue)
        -> Result<http::Response<hyper::body::Incoming>, TransportFailure>;   // /api/v1/* only; FR-004/FR-005 enforced
}
pub fn upstream_request_headers(endpoint: &ServiceEndpoint, accept: HeaderValue) -> http::HeaderMap; // exactly Host + Accept
pub fn digest_of(document: &[u8]) -> Result<Digest, ParseError>;
pub fn read_operations() -> impl Iterator<Item = &'static RouteEntry>;

impl ChangeStream { pub async fn next(&mut self) -> Option<StreamEvent>; }  // cancel-safe; fused after the terminal item

pub fn connection_state_hint(status: &CoreStatus) -> Option<&'static str>;  // table in data-model.md
```

## Guarantees

- **No panics** (NFR-005). This holds outside a runtime as well: `start` returns `Err(NoRuntime)`.
- **Never interprets** (C-003). No refetch, no reconnect, no cursor store, no `resync`.
- **Loopback only** (FR-005).
- **Exact headers** (FR-004).
  - Reads send exactly `Host: 127.0.0.1:<port>` and `Accept: application/json, application/problem+json`.
  - Streams send exactly `Host` and `Accept: text/event-stream`.
  - `forward` sends exactly `Host` and the caller's `Accept`.
- **Launch** (A-06, R3-02, R3-03).
  - The argv is exactly `--mission-status.project-root=<canonical root>` and `--mission-status.port=<n>`.
  - The environment is cleared down to `PATH`, `HOME`, `LANG`, `LC_*` and `TMPDIR`.
  - `stdin` is null, and the working directory is the canonical root.
  - The child runs in its own process group.
- **Bounded memory** (NFR-004).
  - Bodies: 16 MiB.
  - SSE: 1 MiB since the last frame.
  - Contract document: 4 MiB.
  - Output: 64 KiB.
  - Transition channel: 64.
- **Thread-safety** (R2-13). `Core: Send + Sync + Clone`, and `ChangeStream: Send + 'static`.
- **One child process group per `Core`.** Two hosts on one project start two groups.
- **No liveness probe** (R4-09). A hung service whose process stays alive stays `Ready` in #19. A liveness probe goes on #22's notes.

**Leaking types** (R4-11). The surface exposes `http` types (`HeaderValue`, `HeaderMap`, `Response`), `hyper::body::Incoming` and `tokio` types (`broadcast::Receiver`, `runtime::Handle`). A host shares the workspace pins of `http`, `hyper` and `tokio`, and a change to those pins is a change to this surface.

## How #20 and #21 get a supervised stand-in

Decision `01M50M47K1PNKP9KHCGGDBQZ0A` and amendment A-07 apply here.

- **The stand-in.** `kitty-stub` accepts the upstream launch options (`--mission-status.port=<n>`, `--mission-status.project-root=<dir>`). Pointed at by discovery, it behaves as a service that `Core` can supervise:
  - it serves the pinned bundle, so the digest matches;
  - it reads `<project-root>/fixtures` when that directory exists, and otherwise the workspace fixtures.
- **Manual use.** Build it with `cargo build -p kitty-stub`. Then set the host's configured service path, or `KITTY_MISSION_STATUS_SERVICE`, to the absolute path of `target/<profile>/kitty-stub`.
- **Automated tests.** Cargo gives a test `CARGO_BIN_EXE_kitty-stub` only inside the `kitty-stub` package. The proven pattern is `crates/kitty-stub/tests/supervised.rs`, which dev-depends on kitty-core and passes a `Discovery` that returns `env!("CARGO_BIN_EXE_kitty-stub")`.
  - A host can follow the same pattern for the parts of its adapter that are a library.
  - Or it can choose another route in its own plan (for example, a host-local stub binary target).
  - This is a decision for #20's and #21's plans; #19 changes nothing on that account.
- **#21's proxy** uses `forward()` (pass-through) for reads and for the stream, not `open_stream`. It re-reads `ready_endpoint()` on each status transition.

## Test-only surface: `kitty-fake-service`

`kitty-fake-service` is a `[[bin]]` of kitty-core (`test = false`, `doc = false`), never shipped.

**What it does.**
- It binds `127.0.0.1:<port from --mission-status.port=>` and exits 1 when that port is busy.
- It serves `GET /api/v1/openapi.yaml`: the embedded bundle, or a modified one in `serve-modified` mode.
- It appends each request line to `<root>/requests.log`.
- It writes its argv and environment to `<root>/launch-<n>.json`.

**Scenario file** (`<project-root>/kitty-fake-service.json`):

```json
{ "launches": ["ready" | "crash-after" | "exit-at-start" | "never-ready" | "ignore-term" | "serve-modified" | "fork-child" | "host", ...],
  "crashAfterMs": 50 }
```

- **Launch index.** The fake picks `launches[min(n, len - 1)]`, where `n` is read from and incremented in `<root>/kitty-fake-service.count`. This is safe because the supervisor never runs two children at once.
- **`crashAfterMs`** counts from the first `openapi.yaml` GET served.
- **`fork-child`** starts a grandchild that writes its pid to `<root>/grandchild.pid`.
- **`host`** runs `kitty_core::Core` on its own runtime, supervising another fake (whose grandchild writes its pid), then calls `std::process::exit` without `stop()`.
- **Platform.** `fork-child`, `host` and `ignore-term` are `cfg(unix)`. The parent-death assertion is `cfg(target_os = "linux")`.
