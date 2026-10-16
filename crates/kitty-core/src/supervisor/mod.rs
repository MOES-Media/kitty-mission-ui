//! Supervision of one service process group per project (IC-08; FR-016 to FR-022, amended by A-02, A-03, A-05, A-06
//! and A-10).
//!
//! One task owns the state machine of `data-model.md` (Supervision) and the only `ChildGuard`. It publishes every
//! transition through a [`StatusSink`]; the facade (WP09) implements the sink with `watch` plus `broadcast`.
//!
//! A *start* is up to [`MAX_ATTEMPTS`] launches under **one** `start_timeout` budget (A-03). A launch that dies
//! before it is ready, or whose listening socket is not the service's own, is retried on a port not yet tried; such a
//! retry takes no slot in the crash window and no backoff (FS2-02). A start that fails (the budget spent, or every
//! attempt used) is a crash. A contract mismatch is final.

pub(crate) mod output;
pub mod policy;
pub mod ports;
pub(crate) mod process;
pub(crate) mod spawner;

use std::future::Future;
use std::io;
use std::process::ExitStatus;
use std::sync::Arc;
use std::time::Duration;

use tokio::runtime::Handle;
use tokio::sync::{mpsc, oneshot};
use tokio::task::JoinHandle;
use tokio::time::Instant;

use crate::client::{ContractClient, Timings, TransportFailure};
use crate::contract::{Actual, CheckOutcome, ContractPin, Mismatch};
use crate::discovery::{Discovery, MissingReason, ServiceMissing};
use crate::endpoint::ServiceEndpoint;
use crate::status::{CoreStatus, DegradedReason, SupervisionState};

use output::OutputCapture;
pub use policy::{
    BoxSleep, Clock, Decision, ManualClock, MonotonicClock, PolicyState, RecordingSleeper,
    RestartPolicy, Sleeper, TokioSleeper,
};
pub use ports::{LoopbackPortPicker, PortPicker};
use process::{build_command, describe_exit, ChildGuard, LaunchSpec};

/// Launches per start: the first one and two retries on untried ports.
pub const MAX_ATTEMPTS: u32 = 3;

/// The cause of a start failure whose listening socket was not the service's own.
pub const CAUSE_NOT_OWNED: &str = "listening socket not owned by the service";
/// The cause of a start failure whose budget went on 503 answers.
pub const CAUSE_BUDGET_503: &str = "start budget spent on 503s";
/// The cause of a start failure whose budget ran out without a final answer.
pub const CAUSE_BUDGET: &str = "start budget spent before the service answered";

/// Receives every status transition, in order. A sink must not block. Public so the facade and tests can drive the
/// supervisor; hosts use `Core` instead.
#[doc(hidden)]
pub trait StatusSink: Send + Sync + 'static {
    fn publish(&self, status: CoreStatus);
}

/// Everything the supervisor needs.
#[doc(hidden)]
#[derive(Clone)]
pub struct SupervisorConfig {
    pub project_root: std::path::PathBuf,
    pub discovery: Arc<dyn Discovery>,
    pub contract: ContractPin,
    pub timings: Timings,
    pub policy: RestartPolicy,
    pub ports: Arc<dyn PortPicker>,
    pub clock: Arc<dyn Clock>,
    pub sleeper: Arc<dyn Sleeper>,
    pub env_passthrough: Vec<std::ffi::OsString>,
}

/// The supervisor task ended abnormally.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SupervisorPanicked;

impl std::fmt::Display for SupervisorPanicked {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("the supervisor task ended abnormally")
    }
}

impl std::error::Error for SupervisorPanicked {}

type Ack = Option<oneshot::Sender<()>>;

enum Cmd {
    Stop(Ack),
    Quit(Ack),
    Retry,
}

fn ack(ack: Ack) {
    if let Some(tx) = ack {
        // The asker may have gone; nobody is left to tell.
        let _ = tx.send(());
    }
}

/// Controls a running supervisor. Dropping it aborts the task, and the task's guard then sends SIGKILL to the
/// process group (no grace period; A-05).
#[doc(hidden)]
pub struct SupervisorHandle {
    commands: mpsc::UnboundedSender<Cmd>,
    task: Option<JoinHandle<()>>,
    capture: Arc<OutputCapture>,
    failures: FailureLog,
}

/// The cause of every launch that did not reach `Ready` and of every crash, oldest first. For diagnostics: a test
/// that fails on an unexpected sequence prints it.
#[doc(hidden)]
pub type FailureLog = Arc<std::sync::Mutex<Vec<String>>>;

impl SupervisorHandle {
    /// SIGTERM to the group, the grace period, SIGKILL; resolves when the group is gone and `Stopped` is published.
    pub async fn stop(&self) -> Result<(), SupervisorPanicked> {
        let (tx, rx) = oneshot::channel();
        self.commands
            .send(Cmd::Stop(Some(tx)))
            .map_err(|_| SupervisorPanicked)?;
        rx.await.map_err(|_| SupervisorPanicked)
    }

    /// Starts again after `Stopped`; ignored in any other state.
    pub fn retry(&self) {
        // A closed channel means the task is gone; there is nothing to retry.
        let _ = self.commands.send(Cmd::Retry);
    }

    /// Stops the group if it runs, ends the task and waits for it.
    pub async fn join(mut self) -> Result<(), SupervisorPanicked> {
        let (tx, rx) = oneshot::channel();
        let _ = self.commands.send(Cmd::Quit(Some(tx)));
        let acked = rx.await;
        let task = self.task.take();
        if let Some(task) = task {
            task.await.map_err(|_| SupervisorPanicked)?;
        }
        acked.map_err(|_| SupervisorPanicked)
    }

    /// The newest bytes of the current or most recent child's output (at most 64 KiB).
    pub fn captured_output(&self) -> Vec<u8> {
        self.capture.snapshot()
    }

    /// The causes of every failed launch and crash so far.
    pub fn failure_log(&self) -> FailureLog {
        self.failures.clone()
    }
}

impl Drop for SupervisorHandle {
    fn drop(&mut self) {
        if let Some(task) = self.task.take() {
            task.abort();
        }
    }
}

/// Starts the supervisor task on `runtime`. The first status it publishes is `Starting` (generation 1), or `Stopped`
/// when the service cannot be located or run.
#[doc(hidden)]
pub fn spawn_supervisor(
    config: SupervisorConfig,
    sink: Arc<dyn StatusSink>,
    runtime: &Handle,
) -> SupervisorHandle {
    let (commands, rx) = mpsc::unbounded_channel();
    let capture = Arc::new(OutputCapture::new());
    let failures = FailureLog::default();
    let machine = Machine {
        failures: failures.clone(),
        policy: PolicyState::new(config.policy.clone()),
        cfg: config,
        sink,
        rx,
        runtime: runtime.clone(),
        capture: capture.clone(),
        generation: 1,
        published_any: false,
        left_initial_start: false,
    };
    let task = runtime.spawn(machine.run());
    SupervisorHandle {
        commands,
        task: Some(task),
        capture,
        failures,
    }
}

enum Raced<T> {
    Exited(io::Result<ExitStatus>),
    Cmd(Cmd),
    Done(T),
}

/// Runs `fut`, but lets the child's exit win (`biased`) and hands back any stop or quit command.
async fn race<T>(
    guard: &mut ChildGuard,
    rx: &mut mpsc::UnboundedReceiver<Cmd>,
    fut: impl Future<Output = T>,
) -> Raced<T> {
    tokio::pin!(fut);
    loop {
        tokio::select! {
            biased;
            exit = guard.wait() => return Raced::Exited(exit),
            cmd = rx.recv() => match cmd {
                Some(Cmd::Retry) => continue,
                Some(cmd) => return Raced::Cmd(cmd),
                None => return Raced::Cmd(Cmd::Quit(None)),
            },
            done = &mut fut => return Raced::Done(done),
        }
    }
}

/// Like [`race`], without a child.
async fn race_commands<T>(
    rx: &mut mpsc::UnboundedReceiver<Cmd>,
    fut: impl Future<Output = T>,
) -> Raced<T> {
    tokio::pin!(fut);
    loop {
        tokio::select! {
            biased;
            cmd = rx.recv() => match cmd {
                Some(Cmd::Retry) => continue,
                Some(cmd) => return Raced::Cmd(cmd),
                None => return Raced::Cmd(Cmd::Quit(None)),
            },
            done = &mut fut => return Raced::Done(done),
        }
    }
}

fn exit_cause(exit: &io::Result<ExitStatus>) -> String {
    match exit {
        Ok(status) => describe_exit(status),
        Err(e) => format!("waiting for the service failed: {e}"),
    }
}

fn missing(reason: MissingReason, detail: String) -> ServiceMissing {
    ServiceMissing { reason, detail }
}

/// How one launch ended.
enum Attempt {
    Ready,
    Mismatch(Mismatch),
    PinUnparseable(String),
    Exited(String),
    /// Only the Linux ownership check can tell (it reads `/proc`).
    #[cfg(target_os = "linux")]
    NotOwned,
    BudgetSpent {
        saw_503: bool,
    },
    Cmd(Cmd),
}

/// How a start ended. A guard is only held by `Ready`; every other outcome has stopped the group.
enum StartOutcome {
    Ready { guard: ChildGuard },
    Failed(String),
    Mismatch(Mismatch),
    Missing(ServiceMissing),
    Cmd(Cmd),
}

enum Flow {
    Continue,
    Exit,
}

struct Machine {
    cfg: SupervisorConfig,
    sink: Arc<dyn StatusSink>,
    rx: mpsc::UnboundedReceiver<Cmd>,
    runtime: Handle,
    capture: Arc<OutputCapture>,
    failures: FailureLog,
    policy: PolicyState,
    generation: u64,
    published_any: bool,
    left_initial_start: bool,
}

impl Machine {
    fn publish(&mut self, state: SupervisionState, degraded: DegradedReason, attempt: u32) {
        if matches!(
            state,
            SupervisionState::Ready { .. } | SupervisionState::Stopped
        ) {
            self.left_initial_start = true;
        }
        self.published_any = true;
        self.sink.publish(CoreStatus {
            state,
            degraded,
            generation: self.generation,
            attempt,
            left_initial_start: self.left_initial_start,
        });
    }

    /// Every launch publishes a `Starting` with the next generation; the very first one is generation 1.
    fn publish_starting(&mut self, attempt: u32) {
        if self.published_any {
            self.generation += 1;
        }
        self.publish(SupervisionState::Starting, DegradedReason::None, attempt);
    }

    fn note_failure(&self, cause: &str) {
        self.failures
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .push(cause.to_owned());
    }

    fn publish_stopped(&mut self, degraded: DegradedReason) {
        self.publish(SupervisionState::Stopped, degraded, 0);
    }

    async fn run(mut self) {
        loop {
            let flow = match self.start().await {
                StartOutcome::Ready { guard } => self.supervise(guard).await,
                StartOutcome::Failed(cause) => self.crashed(cause, None).await,
                StartOutcome::Mismatch(mismatch) => {
                    self.publish_stopped(DegradedReason::ContractMismatch(mismatch));
                    self.stopped().await
                }
                StartOutcome::Missing(m) => {
                    self.publish_stopped(DegradedReason::ServiceMissing(m));
                    self.stopped().await
                }
                StartOutcome::Cmd(cmd) => self.commanded(cmd).await,
            };
            if matches!(flow, Flow::Exit) {
                return;
            }
        }
    }

    /// A stop or quit command arrived while the group was already stopped by the caller.
    async fn commanded(&mut self, cmd: Cmd) -> Flow {
        match cmd {
            Cmd::Stop(a) => {
                self.publish_stopped(DegradedReason::None);
                ack(a);
                self.stopped().await
            }
            Cmd::Quit(a) => {
                self.publish_stopped(DegradedReason::None);
                ack(a);
                Flow::Exit
            }
            Cmd::Retry => Flow::Continue,
        }
    }

    /// `Stopped`: wait for `retry()`. A retry clears the crash history and runs discovery again.
    async fn stopped(&mut self) -> Flow {
        loop {
            match self.rx.recv().await {
                Some(Cmd::Retry) => {
                    self.policy.reset();
                    return Flow::Continue;
                }
                Some(Cmd::Stop(a)) => ack(a),
                Some(Cmd::Quit(a)) => {
                    ack(a);
                    return Flow::Exit;
                }
                None => return Flow::Exit,
            }
        }
    }

    /// `Ready` until the child exits or a command arrives.
    async fn supervise(&mut self, mut guard: ChildGuard) -> Flow {
        let grace = self.cfg.timings.stop_grace;
        let ready_at = self.cfg.clock.now();
        let raced = race(&mut guard, &mut self.rx, std::future::pending::<()>()).await;
        match raced {
            Raced::Exited(exit) => {
                guard.finish(grace).await;
                let ready_for = self.cfg.clock.now().saturating_duration_since(ready_at);
                self.crashed(exit_cause(&exit), Some(ready_for)).await
            }
            Raced::Cmd(cmd) => {
                guard.stop(grace).await;
                self.commanded(cmd).await
            }
            // `pending()` never completes.
            Raced::Done(()) => Flow::Continue,
        }
    }

    /// `Crashed`, then the policy: a backoff and a new start, or the give-up.
    async fn crashed(&mut self, cause: String, ready_for: Option<Duration>) -> Flow {
        self.note_failure(&cause);
        self.publish(SupervisionState::Crashed, DegradedReason::None, 0);
        if let Some(d) = ready_for {
            self.policy.on_ready_for(d);
        }
        match self.policy.on_crash(self.cfg.clock.now()) {
            Decision::GiveUp => {
                self.publish_stopped(DegradedReason::ServiceMissing(missing(
                    MissingReason::Crashing,
                    cause,
                )));
                self.stopped().await
            }
            Decision::Backoff(delay) => {
                self.publish(SupervisionState::Backoff { delay }, DegradedReason::None, 0);
                let sleep = self.cfg.sleeper.sleep(delay);
                match race_commands(&mut self.rx, sleep).await {
                    Raced::Done(()) => Flow::Continue,
                    Raced::Cmd(cmd) => self.commanded(cmd).await,
                    // No child here.
                    Raced::Exited(_) => Flow::Continue,
                }
            }
        }
    }

    /// One start: discovery, the canonical root, then up to [`MAX_ATTEMPTS`] launches under one budget.
    async fn start(&mut self) -> StartOutcome {
        let binary = match self.cfg.discovery.locate() {
            Ok(path) => path,
            Err(missing) => return StartOutcome::Missing(missing),
        };
        let root = match std::fs::canonicalize(&self.cfg.project_root) {
            Ok(root) => root,
            Err(e) => {
                return StartOutcome::Missing(missing(
                    MissingReason::CannotExecute,
                    format!("cannot resolve the project root: {e}"),
                ))
            }
        };
        let grace = self.cfg.timings.stop_grace;
        let deadline = Instant::now() + self.cfg.timings.start_timeout;
        let mut tried: Vec<u16> = Vec::new();
        let mut cause = String::new();
        for attempt in 0..MAX_ATTEMPTS {
            self.publish_starting(attempt);
            let port = match self.cfg.ports.pick(&tried) {
                Ok(port) => port,
                Err(e) => return StartOutcome::Failed(format!("no port could be chosen: {e}")),
            };
            tried.push(port);
            let spec = LaunchSpec {
                binary: binary.clone(),
                root: root.clone(),
                port,
                env_passthrough: self.cfg.env_passthrough.clone(),
            };
            let ring = self.capture.begin_child();
            let child = match spawner::spawn_child(&self.runtime, build_command(&spec)).await {
                Ok(child) => child,
                Err(e) => {
                    return StartOutcome::Missing(missing(
                        MissingReason::CannotExecute,
                        format!("cannot start the service: {e}"),
                    ))
                }
            };
            let mut guard = ChildGuard::new(child, ring);
            let outcome = self.await_ready(&mut guard, port, attempt, deadline).await;
            let retryable = match outcome {
                Attempt::Ready => return StartOutcome::Ready { guard },
                Attempt::Mismatch(mismatch) => {
                    guard.stop(grace).await;
                    return StartOutcome::Mismatch(mismatch);
                }
                Attempt::PinUnparseable(detail) => {
                    guard.stop(grace).await;
                    return StartOutcome::Missing(missing(
                        MissingReason::CannotExecute,
                        format!("the pinned contract cannot be read: {detail}"),
                    ));
                }
                Attempt::Cmd(cmd) => {
                    guard.stop(grace).await;
                    return StartOutcome::Cmd(cmd);
                }
                Attempt::Exited(c) => {
                    guard.finish(grace).await;
                    cause = c;
                    true
                }
                #[cfg(target_os = "linux")]
                Attempt::NotOwned => {
                    guard.stop(grace).await;
                    cause = CAUSE_NOT_OWNED.to_owned();
                    true
                }
                Attempt::BudgetSpent { saw_503 } => {
                    guard.stop(grace).await;
                    cause = if saw_503 {
                        CAUSE_BUDGET_503
                    } else {
                        CAUSE_BUDGET
                    }
                    .to_owned();
                    false
                }
            };
            if retryable {
                self.note_failure(&cause);
            }
            if !retryable || Instant::now() >= deadline {
                return StartOutcome::Failed(cause);
            }
        }
        StartOutcome::Failed(cause)
    }

    /// Polls the new port until the service is ready, has exited, or the budget is spent.
    async fn await_ready(
        &mut self,
        guard: &mut ChildGuard,
        port: u16,
        attempt: u32,
        deadline: Instant,
    ) -> Attempt {
        let endpoint = ServiceEndpoint::supervised(port, self.generation);
        let timings = self.cfg.timings;
        let mut saw_503 = false;
        loop {
            let now = Instant::now();
            if now >= deadline {
                return Attempt::BudgetSpent { saw_503 };
            }
            let left = deadline - now;
            let bounded = Timings {
                read_timeout: left.min(timings.read_timeout),
                ..timings
            };
            let client = ContractClient::new(endpoint, &bounded);
            let polled = race(
                guard,
                &mut self.rx,
                client.check_contract(&self.cfg.contract),
            )
            .await;
            let outcome = match polled {
                Raced::Exited(exit) => return Attempt::Exited(exit_cause(&exit)),
                Raced::Cmd(cmd) => return Attempt::Cmd(cmd),
                Raced::Done(outcome) => outcome,
            };
            match outcome {
                CheckOutcome::Match { .. } => {
                    if let Some(refused) = match_verdict(guard, |g| owner_check(g, port)) {
                        return refused;
                    }
                    self.publish(
                        SupervisionState::Ready { endpoint },
                        DegradedReason::None,
                        attempt,
                    );
                    return Attempt::Ready;
                }
                CheckOutcome::Mismatch(mismatch) => match &mismatch.actual {
                    // No HTTP answer yet: keep polling (a refused or reset connection, or a poll cut short).
                    Actual::Transport(
                        TransportFailure::ConnectRefused
                        | TransportFailure::Io(_)
                        | TransportFailure::Timeout,
                    ) => {}
                    // Not yet ready (A-10).
                    Actual::Status { status: 503 } => saw_503 = true,
                    _ => {
                        // A final answer only blames the service when the service gave it: a foreign listener on the
                        // picked port is retried on another port instead (an unreadable /proc keeps the mismatch).
                        #[cfg(target_os = "linux")]
                        if let Some(refused) = foreign_listener(guard, port) {
                            return refused;
                        }
                        return Attempt::Mismatch(mismatch);
                    }
                },
                CheckOutcome::PinUnparseable { detail } => return Attempt::PinUnparseable(detail),
            }
            let pause = timings.poll_interval;
            match race(guard, &mut self.rx, tokio::time::sleep(pause)).await {
                Raced::Exited(exit) => return Attempt::Exited(exit_cause(&exit)),
                Raced::Cmd(cmd) => return Attempt::Cmd(cmd),
                Raced::Done(()) => {}
            }
        }
    }
}

/// The Linux ownership check; elsewhere there is none and the match stands.
fn owner_check(guard: &mut ChildGuard, port: u16) -> Option<Attempt> {
    #[cfg(target_os = "linux")]
    {
        foreign_listener(guard, port)
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (guard, port);
        None
    }
}

/// What a contract match is worth: the exit wins over it (a squatter may have answered for a service that already
/// died), then `owner_check` may refuse it. `None` means the match stands. `owner_check` is a parameter so that a test
/// can run the exit guard alone, as it is on targets without the ownership check.
fn match_verdict(
    guard: &mut ChildGuard,
    owner_check: impl FnOnce(&mut ChildGuard) -> Option<Attempt>,
) -> Option<Attempt> {
    if let Some(exited) = exit_beats_match(guard) {
        return Some(exited);
    }
    owner_check(guard)
}

/// `Some(Attempt::Exited)` when the leader has exited: an answer from the port then came from a squatter (or from a
/// service that died right after answering), and the exit wins over it.
fn exit_beats_match(guard: &mut ChildGuard) -> Option<Attempt> {
    match guard.try_wait() {
        Ok(Some(status)) => Some(Attempt::Exited(describe_exit(&status))),
        Ok(None) => None,
        Err(e) => Some(Attempt::Exited(format!(
            "waiting for the service failed: {e}"
        ))),
    }
}

/// `Some` when `port` is answered by a socket that is not the launched group's: [`Attempt::NotOwned`], or
/// [`Attempt::Exited`] when the leader died meanwhile. `None` when the group owns the listener or the check cannot tell.
#[cfg(target_os = "linux")]
fn foreign_listener(guard: &mut ChildGuard, port: u16) -> Option<Attempt> {
    if process::procfs::group_owns_listener(guard.pgid(), port) != Some(false) {
        return None;
    }
    // The scan reads every process and takes a while; a leader that died meanwhile has no fds left, so "not owned"
    // would name the wrong cause.
    Some(match guard.try_wait() {
        Ok(Some(status)) => Attempt::Exited(describe_exit(&status)),
        Ok(None) => Attempt::NotOwned,
        Err(e) => Attempt::Exited(format!("waiting for the service failed: {e}")),
    })
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;

    /// A guard over a child that has already exited with status 3 and has not been reaped yet.
    async fn exited_guard() -> ChildGuard {
        let mut command = tokio::process::Command::new("sh");
        command.args(["-c", "exit 3"]);
        let child = spawner::spawn_child(&Handle::current(), command)
            .await
            .expect("sh starts");
        let pid = child.id().expect("a pid");
        // The leader is a zombie once its state is `Z`; nothing has waited for it.
        let stat = format!("/proc/{pid}/stat");
        let started = std::time::Instant::now();
        loop {
            let zombie = std::fs::read_to_string(&stat)
                .ok()
                .and_then(|t| {
                    t.rfind(')')
                        .map(|i| t[i + 1..].trim_start().starts_with('Z'))
                })
                .unwrap_or(false);
            if zombie {
                break;
            }
            assert!(
                started.elapsed() < Duration::from_secs(5),
                "sh did not exit"
            );
            tokio::time::sleep(Duration::from_millis(2)).await;
        }
        ChildGuard::new(child, OutputCapture::new().begin_child())
    }

    /// WP08 N2: when the child has exited and the awaited future is ready as well, the exit must win every time.
    /// Without `biased;` the two ready branches are picked at random, so twenty rounds expose it.
    #[tokio::test]
    async fn a_child_that_has_exited_beats_a_ready_future() {
        let mut guard = exited_guard().await;
        let (_commands, mut rx) = mpsc::unbounded_channel();
        for round in 0..20 {
            match race(&mut guard, &mut rx, std::future::ready(())).await {
                Raced::Exited(Ok(status)) => assert_eq!(status.code(), Some(3), "round {round}"),
                Raced::Exited(Err(e)) => panic!("round {round}: wait failed: {e}"),
                Raced::Cmd(_) => panic!("round {round}: a command won"),
                Raced::Done(()) => panic!("round {round}: the ready future beat the exit"),
            }
        }
    }

    /// R2-NEW-006: `match_verdict` itself, with the ownership check replaced by "owned", as on macOS and Windows. A
    /// real exited child (a zombie, waited for by nothing) is deterministic: only the exit guard can refuse the match,
    /// so removing the `exit_beats_match` call from `match_verdict` makes this fail.
    #[tokio::test]
    async fn the_exit_guard_alone_refuses_a_match_from_an_exited_child() {
        let mut guard = exited_guard().await;
        match match_verdict(&mut guard, |_| None) {
            Some(Attempt::Exited(cause)) => assert_eq!(cause, "service exited: exit status: 3"),
            _ => panic!("the exit did not win over the match"),
        }
    }

    /// The exit wins over a contract match (a squatter may have answered for a service that already died).
    #[tokio::test]
    async fn an_exited_child_beats_a_match() {
        let mut guard = exited_guard().await;
        match exit_beats_match(&mut guard) {
            Some(Attempt::Exited(cause)) => assert_eq!(cause, "service exited: exit status: 3"),
            _ => panic!("the exit did not win over the match"),
        }
    }
}
