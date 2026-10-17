//! The `Core` facade (IC-09): one supervised service per project, behind the surface of `contracts/kitty-core-api.md`.
//!
//! `Core` wraps the supervisor of IC-08. It implements the supervisor's [`StatusSink`] with a `watch` (the current
//! status) plus a `broadcast` of 64 (every transition), both updated under one publishing lock, so that a subscriber
//! gets "the current status, then every later one" without a gap or a duplicate (R4-04, R5-02). It gates the gated
//! reads on that status and never interprets what the service answers (C-003).

use std::fmt;
use std::sync::{Arc, Mutex, MutexGuard};

use tokio::runtime::Handle;
use tokio::sync::{broadcast, watch};

use crate::client::{ContractClient, ReadOutcome, Timings};
use crate::contract::{Actual, ContractPin, Digest, Mismatch};
use crate::discovery::{DefaultDiscovery, Discovery, DEFAULT_BINARY_NAME};
use crate::endpoint::ServiceEndpoint;
use crate::routes::ReadRequest;
use crate::sse::{ChangeStream, StreamOpenError, StreamScope};
use crate::status::{CoreStatus, DegradedReason, SupervisionState};
use crate::supervisor::{
    spawn_supervisor, Clock, LoopbackPortPicker, MonotonicClock, PortPicker, RestartPolicy,
    Sleeper, StatusSink, SupervisorConfig, SupervisorHandle, SupervisorPanicked, TokioSleeper,
};

/// How many transitions a slow subscriber can fall behind before it gets `Lagged` (NFR-004).
const TRANSITION_CAPACITY: usize = 64;

/// Everything `Core::start` needs. The defaults of each field are in `contracts/kitty-core-api.md`.
pub struct CoreConfig {
    /// Canonicalised at start (A-06).
    pub project_root: std::path::PathBuf,
    pub discovery: Arc<dyn Discovery>,
    pub contract: ContractPin,
    pub timings: Timings,
    pub policy: RestartPolicy,
    pub ports: Arc<dyn PortPicker>,
    pub clock: Arc<dyn Clock>,
    pub sleeper: Arc<dyn Sleeper>,
    /// `None`: the runtime the caller is in (`Handle::try_current()`, R4-02).
    pub runtime: Option<Handle>,
    /// Extra variable names passed to the child; empty by default (FS-11).
    pub env_passthrough: Vec<std::ffi::OsString>,
}

impl CoreConfig {
    /// The documented defaults for `project_root`: discovery from the process environment with the default binary
    /// name, the embedded contract pin, production timings and restart policy, the loopback port picker, the
    /// monotonic clock, the tokio sleeper, the caller's runtime and an empty passthrough. A host that needs another
    /// value writes `CoreConfig { field, ..CoreConfig::new(root) }`.
    pub fn new(project_root: impl Into<std::path::PathBuf>) -> Self {
        Self {
            project_root: project_root.into(),
            discovery: Arc::new(DefaultDiscovery::from_process(
                None,
                DEFAULT_BINARY_NAME.into(),
            )),
            contract: ContractPin::embedded(),
            timings: Timings::default(),
            policy: RestartPolicy::default(),
            ports: Arc::new(LoopbackPortPicker),
            clock: Arc::new(MonotonicClock),
            sleeper: Arc::new(TokioSleeper),
            runtime: None,
            env_passthrough: Vec::new(),
        }
    }
}

/// Why `Core::start` did not start.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum StartError {
    /// No runtime was configured and the caller is not inside one.
    NoRuntime,
}

impl fmt::Display for StartError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StartError::NoRuntime => f.write_str("no tokio runtime is configured or running"),
        }
    }
}

impl std::error::Error for StartError {}

/// The current status and a receiver of every later transition, taken together under the publishing lock.
pub struct Subscription {
    pub initial: CoreStatus,
    pub receiver: broadcast::Receiver<CoreStatus>,
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// The sink the supervisor publishes into: the single place where the status changes.
struct Hub {
    /// Held while the current status and the broadcast are updated, and while a subscriber reads both. The value is
    /// true until the supervisor's first publish has been seen.
    publishing: Mutex<bool>,
    current: watch::Sender<CoreStatus>,
    transitions: broadcast::Sender<CoreStatus>,
}

impl Hub {
    fn new(initial: CoreStatus) -> Arc<Self> {
        let (current, _) = watch::channel(initial);
        let (transitions, _) = broadcast::channel(TRANSITION_CAPACITY);
        Arc::new(Self {
            publishing: Mutex::new(true),
            current,
            transitions,
        })
    }

    fn status(&self) -> CoreStatus {
        self.current.borrow().clone()
    }

    fn subscribe(&self) -> Subscription {
        let _publishing = lock(&self.publishing);
        Subscription {
            initial: self.current.borrow().clone(),
            receiver: self.transitions.subscribe(),
        }
    }
}

impl StatusSink for Hub {
    fn publish(&self, status: CoreStatus) {
        let mut awaiting_first = lock(&self.publishing);
        // The supervisor's first status is the `Starting` that every subscription already starts from: it is not a
        // transition, and delivering it would show the subscriber the same status twice.
        let first = std::mem::replace(&mut *awaiting_first, false);
        if first && *self.current.borrow() == status {
            return;
        }
        self.current.send_replace(status.clone());
        // A send with no receivers is not an error worth reporting.
        let _ = self.transitions.send(status);
    }
}

/// Owns the supervisor. Dropping the last `Core` clone drops this: the supervisor task is aborted, its child guard
/// sends SIGKILL to the process group (no grace period; A-05) and `kill_on_drop` is the backstop.
struct HandleGuard {
    /// `None` when the service was never launched (a pin that cannot be read).
    supervisor: Option<SupervisorHandle>,
}

/// One supervised service of one project. Cheap to clone; every clone shares the same supervisor.
#[derive(Clone)]
pub struct Core {
    hub: Arc<Hub>,
    guard: Arc<HandleGuard>,
    timings: Timings,
}

impl fmt::Debug for Core {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Core")
            .field("status", &self.status())
            .finish()
    }
}

const _: fn() = || {
    fn assert_traits<T: Send + Sync + Clone + 'static>() {}
    assert_traits::<Core>();
};

fn starting() -> CoreStatus {
    CoreStatus {
        state: SupervisionState::Starting,
        degraded: DegradedReason::None,
        generation: 1,
        attempt: 0,
        left_initial_start: false,
    }
}

/// A pin that cannot be parsed: contract mismatch, final, with no service launched. There is no expected digest,
/// so the placeholder stands in and the cause is in `actual`.
fn unreadable_pin(detail: &str) -> CoreStatus {
    CoreStatus {
        state: SupervisionState::Stopped,
        degraded: DegradedReason::ContractMismatch(Mismatch {
            expected: Digest::unavailable(),
            actual: Actual::Unparseable {
                detail: format!("the pinned contract cannot be read: {detail}"),
            },
        }),
        generation: 1,
        attempt: 0,
        left_initial_start: true,
    }
}

/// What a gated call may do, decided from one snapshot of the status.
enum Gate {
    Ready(ServiceEndpoint),
    Mismatch(Mismatch),
    NotReady(CoreStatus),
}

impl Core {
    /// Starts supervising. Never panics: without a runtime it is `Err(NoRuntime)`.
    ///
    /// The pinned contract is checked before anything is launched: a pin that cannot be parsed publishes a contract
    /// mismatch and no process is spawned. Otherwise the supervisor publishes `Starting` (generation 1) as its first
    /// status, which is also `initial` of the returned subscription, so it is not delivered twice.
    pub fn start(config: CoreConfig) -> Result<(Core, Subscription), StartError> {
        let runtime = match config.runtime.clone() {
            Some(handle) => handle,
            None => Handle::try_current().map_err(|_| StartError::NoRuntime)?,
        };
        let timings = config.timings;
        if let Err(e) = config.contract.digest() {
            let hub = Hub::new(unreadable_pin(&e.detail));
            let subscription = hub.subscribe();
            let guard = Arc::new(HandleGuard { supervisor: None });
            return Ok((
                Core {
                    hub,
                    guard,
                    timings,
                },
                subscription,
            ));
        }
        let hub = Hub::new(starting());
        let subscription = hub.subscribe();
        let supervisor = spawn_supervisor(
            SupervisorConfig {
                project_root: config.project_root,
                discovery: config.discovery,
                contract: config.contract,
                timings,
                policy: config.policy,
                ports: config.ports,
                clock: config.clock,
                sleeper: config.sleeper,
                env_passthrough: config.env_passthrough,
            },
            hub.clone(),
            &runtime,
        );
        let guard = Arc::new(HandleGuard {
            supervisor: Some(supervisor),
        });
        Ok((
            Core {
                hub,
                guard,
                timings,
            },
            subscription,
        ))
    }

    /// The current status.
    pub fn status(&self) -> CoreStatus {
        self.hub.status()
    }

    /// The current status and a receiver of every later transition, atomically.
    pub fn subscribe(&self) -> Subscription {
        self.hub.subscribe()
    }

    /// Starts again, from `Stopped` only; in any other state it does nothing.
    pub fn retry(&self) {
        let Some(supervisor) = &self.guard.supervisor else {
            return;
        };
        if matches!(self.status().state, SupervisionState::Stopped) {
            supervisor.retry();
        }
    }

    /// SIGTERM to the group, the grace period, SIGKILL; resolves when the group is gone.
    pub async fn stop(&self) -> Result<(), SupervisorPanicked> {
        match &self.guard.supervisor {
            Some(supervisor) => supervisor.stop().await,
            None => Ok(()),
        }
    }

    /// The service's endpoint while it is `Ready`, valid until the next transition (see its generation).
    pub fn ready_endpoint(&self) -> Option<ServiceEndpoint> {
        match self.status().state {
            SupervisionState::Ready { endpoint } => Some(endpoint),
            _ => None,
        }
    }

    fn gate(&self) -> Gate {
        let status = self.status();
        match (&status.state, &status.degraded) {
            (SupervisionState::Ready { endpoint }, _) => Gate::Ready(*endpoint),
            (SupervisionState::Stopped, DegradedReason::ContractMismatch(mismatch)) => {
                Gate::Mismatch(mismatch.clone())
            }
            _ => Gate::NotReady(status),
        }
    }

    /// One read. Unless the service is `Ready`, the answer is `NotReady` or `ContractMismatch` and nothing is sent.
    pub async fn read(&self, req: &ReadRequest<'_>) -> ReadOutcome {
        match self.gate() {
            Gate::Ready(endpoint) => ContractClient::new(endpoint, &self.timings).read(req).await,
            Gate::Mismatch(mismatch) => ReadOutcome::ContractMismatch(mismatch),
            Gate::NotReady(status) => ReadOutcome::NotReady(status),
        }
    }

    /// Opens the change stream. Unless the service is `Ready`, it is refused with `NotReady` or `ContractMismatch`
    /// and nothing is sent.
    pub async fn open_stream(&self, scope: StreamScope) -> Result<ChangeStream, StreamOpenError> {
        match self.gate() {
            Gate::Ready(endpoint) => {
                ContractClient::new(endpoint, &self.timings)
                    .open_stream(scope)
                    .await
            }
            Gate::Mismatch(mismatch) => Err(StreamOpenError::ContractMismatch(mismatch)),
            Gate::NotReady(status) => Err(StreamOpenError::NotReady(status)),
        }
    }

    /// The newest bytes (at most 64 KiB) of the current or most recent child's output.
    pub fn captured_output(&self) -> Vec<u8> {
        match &self.guard.supervisor {
            Some(supervisor) => supervisor.captured_output(),
            None => Vec::new(),
        }
    }
}
