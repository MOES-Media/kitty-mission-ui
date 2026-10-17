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
    pub env_passthrough: Vec<OsString>,         // extra variable names passed to the child; empty by default (FS-11)
}

impl CoreConfig {
    pub fn new(project_root: impl Into<PathBuf>) -> Self; // every default above; hosts write `CoreConfig { x, ..CoreConfig::new(root) }` (pre-merge ARCH-001). Not #[non_exhaustive].
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
        -> Result<http::Response<hyper::body::Incoming>, TransportFailure>;   // /api/v1/* only; FR-004/FR-005 enforced;
        // the path refuses `.`/`..` segments (also %2e forms), `//`, `%2f`, `%5c`, `;`/`%3b`, and the whole target refuses `\`, `#` and non-ASCII (pre-merge SEC-001)
}
pub fn upstream_request_headers(endpoint: &ServiceEndpoint, accept: HeaderValue) -> http::HeaderMap; // exactly Host + Accept
pub fn digest_of(document: &[u8]) -> Result<Digest, ParseError>;
pub fn read_operations() -> impl Iterator<Item = &'static RouteEntry>;

impl ChangeStream { pub async fn next(&mut self) -> Option<StreamEvent>; }  // cancel-safe; fused after the terminal item

pub fn connection_state_hint(status: &CoreStatus) -> Option<&'static str>;  // table in data-model.md

// ---- Supervisor seam (public for the facade and for tests; #[doc(hidden)]; A2) ----
#[doc(hidden)]
pub trait StatusSink: Send + Sync + 'static { fn publish(&self, status: CoreStatus); }
#[doc(hidden)]
pub fn spawn_supervisor(config: SupervisorConfig, sink: Arc<dyn StatusSink>, runtime: &tokio::runtime::Handle)
    -> SupervisorHandle;   // stop(), retry(), join(); the facade wraps it, and hosts use Core instead
pub type BoxSleep = std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + 'static>>;  // Sleeper::sleep returns it (A12)
```

The facade module is `kitty_core::facade`, not `core`: a crate-level module named `core` would collide with the `core` crate in paths (A13). Everything above is also re-exported at the crate root.

## Guarantees

- **`#[non_exhaustive]` enums** (B1; pre-merge ARCH-002). `ReadOutcome`, `StreamOpenError`, `StartError` and `CheckOutcome`, plus `SupervisionState`, `DegradedReason`, `Actual`, `MissingReason`, `TransportFailure`, `UnavailableReason`, `StreamEvent` and `StreamDiagnostic`, are `#[non_exhaustive]`, so a host's `match` needs a wildcard arm. The plain-data structs (`CoreStatus`, `Mismatch`, `ServiceMissing`) are not. The `Core`-only variants `NotReady` and `ContractMismatch` are added by the facade WP after the client and stream WPs.
- **Discovery binary name** (pre-merge SEC-004). The PATH search only accepts a bare file name: an absolute name, a separator, `.`, `..` or an empty name is `NotFound`.
- **No panics** (NFR-005). This holds outside a runtime as well: `start` returns `Err(NoRuntime)`.
- **Never interprets** (C-003). No refetch, no reconnect, no cursor store, no `resync`.
- **Loopback only** (FR-005).
- **Exact headers** (FR-004).
  - Reads send exactly `Host: 127.0.0.1:<port>` and `Accept: application/json, application/problem+json`.
  - Streams send exactly `Host` and `Accept: text/event-stream`.
  - `forward` sends exactly `Host` and the caller's `Accept`.
- **Launch** (A-06, R3-02, R3-03).
  - The argv is exactly `--mission-status.project-root=<canonical root>` and `--mission-status.port=<n>`.
  - The environment is cleared down to `PATH`, `HOME`, `LANG`, `LC_*` and `TMPDIR`, plus platform defaults behind `cfg` (`SystemRoot` on Windows) and the names in `env_passthrough` (FS-11).
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
- **`forward()` deadline (FS-08).** `read_timeout` bounds connecting and the response headers only. The response body belongs to the caller: kitty-core applies no cap and no deadline to it, so #21 can stream events through. #21 must apply its own limits.
- **Generations** (FS-12). Supervisor generations start at 1; generation 0 is reserved for `ServiceEndpoint::loopback()`.
- **No liveness probe** (R4-09). A hung service whose process stays alive stays `Ready` in #19. A liveness probe goes on #22's notes.

**Leaking types** (R4-11, A16).
- The surface exposes `http` types (`HeaderValue`, `HeaderMap`, `Response`), `hyper::body::Incoming` and `tokio` types (`broadcast::Receiver`, `runtime::Handle`).
- The `http` types are reached through hyper's re-exports (`hyper::http::…`), so kitty-core adds no direct `http` dependency.
- If #20 or #21 names `http` directly, it adds an exact `http` pin equal to the version in `Cargo.lock` (currently 1.5.0), in `[workspace.dependencies]`.
- A host shares the workspace pins of `hyper` and `tokio`, and a change to those pins is a change to this surface.

## How #20 and #21 get a supervised stand-in

Decision `01M50M47K1PNKP9KHCGGDBQZ0A` and amendment A-07 apply here.

- **The stand-in.** `kitty-stub` accepts the upstream launch options (`--mission-status.port=<n>`, `--mission-status.project-root=<dir>`). Pointed at by discovery, it behaves as a service that `Core` can supervise:
  - it serves the pinned bundle, so the digest matches;
  - it reads `<project-root>/.kitty-stub/fixtures` when that directory exists, and otherwise the workspace fixtures (FS-10).
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
{ "launches": ["ready" | "crash-after" | "exit-at-start" | "never-ready" | "ignore-term" | "serve-modified" | "serve-503" | "alive-no-bind" | "fork-child" | "host", ...],   // "host" is added by WP09 (A1)
  "crashAfterMs": 50 }
```

- **Launch index.** The fake picks `launches[min(n, len - 1)]`, where `n` is read from and incremented in `<root>/kitty-fake-service.count`. This is safe because the supervisor never runs two children at once.
- **`crashAfterMs`** counts from the first `openapi.yaml` GET served.
- **`serve-503`** binds and answers every request with 503 (FS2-01).
- **`alive-no-bind`** stays alive and never binds. The test runs a squatter on the chosen port (`cfg(target_os = "linux")`) (FS2-01).
- **`fork-child`** starts a grandchild that writes its pid to `<root>/grandchild.pid`, then serves as in `ready`. It honours `crashAfterMs`: the leader exits after that delay while the grandchild lives on, which is the "leader exits, grandchild survives" scenario (A5).
- **`host`** (added by WP09 as an out-of-map edit to WP08's binary; WP08's binary has no `host` arm, A1) runs `kitty_core::Core` on its own runtime, with its own project root, supervising a fake in `ready` mode. That supervised service (the host's direct child) writes its own pid to `<its root>/service.pid`. The host then calls `std::process::exit` without `stop()` (FS-15).
- **Platform.** `fork-child`, `host` and `ignore-term` are `cfg(unix)`. The parent-death assertion is `cfg(target_os = "linux")`.
