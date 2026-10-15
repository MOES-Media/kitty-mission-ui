# Contract: `kitty-core` public Rust surface

This is the surface the desktop host (#20) and the dashboard host (#21) build on. SC-005 says they must start with 0 changes to it, and their plan reviews check that against this file.

The WP may adjust the spelling: the exact generic bounds, and `async fn` against returning `impl Future`. The semantics and the set of operations are fixed here.

```rust
// ---- Facade (one per project; SO-DES-013) ----
pub struct CoreConfig {
    pub project_root: PathBuf,
    pub discovery: Arc<dyn Discovery>,          // DefaultDiscovery::from_process(configured, binary_name) in production
    pub timings: Timings,                       // Timings::default() in production
    pub policy: RestartPolicy,                  // RestartPolicy::default(): 0.5 s ×2 cap 30 s, reset 60 s, give up 5 in 300 s
    pub ports: Arc<dyn PortPicker>,             // LoopbackPortPicker in production
    pub clock: Arc<dyn Clock>,                  // SystemClock in production; ManualClock in tests
    pub sleeper: Arc<dyn Sleeper>,              // TokioSleeper in production; RecordingSleeper in tests (backoff only)
}

pub struct Core { /* Arc-shared; Clone */ }
impl Core {
    pub fn start(config: CoreConfig) -> Core;                 // spawns the supervisor on the current tokio runtime; returns at once
    pub fn status(&self) -> CoreStatus;                       // current (watch)
    pub fn transitions(&self) -> broadcast::Receiver<CoreStatus>; // every transition in order; capacity 64; Lagged(n) on overflow
    pub fn retry(&self);                                      // only from Stopped: discovery runs again, crash history cleared
    pub async fn stop(&self);                                 // SIGTERM, grace, SIGKILL; resolves once the child is gone
    pub fn ready_endpoint(&self) -> Option<ServiceEndpoint>;  // Some only while Ready (for #21's pass-through proxy)
    pub async fn read(&self, req: &ReadRequest<'_>) -> ReadOutcome;           // NotReady / ContractMismatch with no I/O unless Ready
    pub async fn open_stream(&self, scope: StreamScope) -> ChangeStream;      // first item is terminal when not Ready
    pub fn captured_output(&self) -> Vec<u8>;                 // newest ≤ 64 KiB of the current child (diagnostics only)
}
impl Drop for Core { /* last clone: start_kill the child synchronously */ }

// ---- Lower level (usable without supervision; tests and the facade use it) ----
pub struct ContractClient { /* endpoint + timings */ }
impl ContractClient {
    pub fn new(endpoint: ServiceEndpoint, timings: &Timings) -> Self;
    pub async fn read(&self, req: &ReadRequest<'_>) -> ReadOutcome;           // never NotReady/ContractMismatch
    pub async fn open_stream(&self, scope: StreamScope) -> ChangeStream;
    pub async fn check_contract(&self) -> CheckOutcome;
}
pub fn pinned_digest() -> Digest;
pub fn digest_of(document: &[u8]) -> Result<Digest, ParseError>;
pub fn read_operations() -> impl Iterator<Item = &'static RouteEntry>;  // from the embedded routes.json

impl ChangeStream { pub async fn next(&mut self) -> Option<StreamEvent>; }  // see data-model "Change stream"

pub fn connection_state_hint(status: &CoreStatus, had_ready: bool) -> Option<&'static str>;
```

## Behavioural guarantees

- **Never panics** (NFR-005). Every failure is a value: `ReadOutcome`, `StreamEvent::{Refused, Unavailable}`, or `CoreStatus.degraded`.
- **Never interprets** (C-003).
  - It does no refetch, no reconnect, no cursor store and no `resync`.
  - It does not filter changes by kind. Only names outside the contract's three become a `Diagnostic`.
- **Loopback only** (FR-005). No public constructor accepts a host name or a non-`127.0.0.1` address.
- **Headers** (FR-004).
  - A read sends exactly `Host: 127.0.0.1:<port>` and `Accept: application/json, application/problem+json`.
  - A stream sends exactly `Host: 127.0.0.1:<port>` and `Accept: text/event-stream`.
  - Nothing else is sent: no `Origin`, no `Forwarded`, no `X-Forwarded-*`, no credentials, no `Last-Event-ID`.
- **Bounded memory** (NFR-004).
  - A body over 16 MiB is `Transport(BodyTooLarge)`.
  - A frame over 1 MiB is `Unavailable(FrameTooLarge)`.
  - Captured output is limited to 64 KiB per child.
  - The transition channel holds 64 items.
- **One child** per `Core`. Two hosts on one project start two children on two ports (decision `01M50D3XMBS9DD3AEWP1F66RRS`).
- **Runtime.** It needs a multi-thread tokio runtime (the desktop host and the dashboard host both have one). `Core::start` must be called inside it.

## Test-only surface

- **`kitty-fake-service`.** A `[[bin]]` in kitty-core, built only to be a supervised child in tests. It is never shipped by a host.
- **Its scenario file.** It reads `<project-root>/kitty-fake-service.json`: `{ "mode": "ready" | "crash-after" | "exit-at-start" | "never-ready" | "ignore-term" | "serve-modified" | "host", "crashAfterMs"?: number, "recordArgs"?: "<file in the same temp dir>" }`.
- **What it serves.** It binds `127.0.0.1:<--mission-status.port>` and exits 1 when the port is busy. It serves only `GET /api/v1/openapi.yaml`: the embedded bundle, or the bundle with `info.version` changed in `serve-modified` mode.
