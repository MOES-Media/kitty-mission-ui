//! Supervision scenarios (IC-08; FR-016 to FR-022, SC-003, NFR-005, NFR-006).
//!
//! Every scenario drives `spawn_supervisor` with a recording sink and the `kitty-fake-service` binary, and asserts the
//! exact state sequence, the generations, the `left_initial_start` flag and the `RecordingSleeper` log. No scenario
//! leaves a process behind: the rig kills, by pid, whatever a failing test left running.
#![cfg(unix)]

mod common;

use std::collections::{BTreeMap, VecDeque};
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

use common::{
    assert_no_panics, fixtures_dir, http_ok, squatter, test_timings, within, write_scenario,
    SquatterGuard, TempDir,
};
use kitty_core::client::Timings;
use kitty_core::contract::{digest_of, Actual, ContractPin};
use kitty_core::discovery::{
    DefaultDiscovery, Discovery, EnvSnapshot, MissingReason, ServiceMissing,
};
use kitty_core::status::{CoreStatus, DegradedReason, SupervisionState};
use kitty_core::supervisor::{
    spawn_supervisor, FailureLog, ManualClock, PortPicker, RecordingSleeper, RestartPolicy,
    StatusSink, SupervisorConfig, SupervisorHandle, CAUSE_BUDGET, CAUSE_BUDGET_503,
    CAUSE_NOT_OWNED,
};
use serde_json::Value;

const FAKE: &str = env!("CARGO_BIN_EXE_kitty-fake-service");

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

// ---- The recording sink ------------------------------------------------------------------------------------------

#[derive(Default)]
struct RecordingSink {
    statuses: Mutex<Vec<CoreStatus>>,
    failures: Mutex<Option<FailureLog>>,
}

impl StatusSink for RecordingSink {
    fn publish(&self, status: CoreStatus) {
        lock(&self.statuses).push(status);
    }
}

impl RecordingSink {
    fn all(&self) -> Vec<CoreStatus> {
        lock(&self.statuses).clone()
    }

    fn failure_causes(&self) -> Vec<String> {
        lock(&self.failures)
            .as_ref()
            .map(|log| lock(log).clone())
            .unwrap_or_default()
    }

    async fn wait_for(&self, what: &str, done: impl Fn(&[CoreStatus]) -> bool) -> Vec<CoreStatus> {
        let waited = tokio::time::timeout(common::HARNESS_DEADLINE, async {
            loop {
                let seen = self.all();
                if done(&seen) {
                    return seen;
                }
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
        })
        .await;
        match waited {
            Ok(seen) => seen,
            Err(_) => panic!(
                "{what}: no result within the deadline; seen {:?}; failures {:?}",
                sequence(&self.all()),
                self.failure_causes()
            ),
        }
    }

    async fn wait_for_state(&self, what: &str, state: &str, nth: usize) -> Vec<CoreStatus> {
        let state = state.to_owned();
        self.wait_for(what, move |seen| {
            seen.iter().filter(|s| kind(s) == state).count() >= nth
        })
        .await
    }
}

fn kind(s: &CoreStatus) -> &'static str {
    match s.state {
        SupervisionState::Starting => "Starting",
        SupervisionState::Ready { .. } => "Ready",
        SupervisionState::Crashed => "Crashed",
        SupervisionState::Backoff { .. } => "Backoff",
        SupervisionState::Stopped => "Stopped",
    }
}

/// `Starting g1 a0`, `Backoff(500ms) g1 a0`, `Stopped g5 a0 [missing:Crashing]`.
fn project(s: &CoreStatus) -> String {
    let state = match &s.state {
        SupervisionState::Backoff { delay } => format!("Backoff({}ms)", delay.as_millis()),
        _ => kind(s).to_owned(),
    };
    let degraded = match &s.degraded {
        DegradedReason::None => String::new(),
        DegradedReason::ServiceMissing(m) => format!(" [missing:{:?}]", m.reason),
        DegradedReason::ContractMismatch(_) => " [mismatch]".to_owned(),
    };
    format!("{state} g{} a{}{degraded}", s.generation, s.attempt)
}

fn sequence(seen: &[CoreStatus]) -> Vec<String> {
    seen.iter().map(project).collect()
}

fn strings(expected: &[&str]) -> Vec<String> {
    expected.iter().map(|s| (*s).to_owned()).collect()
}

/// Oracles for the flag and the generations, written independently of the supervisor.
fn assert_invariants(seen: &[CoreStatus]) {
    let mut left = false;
    let mut generation = 0u64;
    let mut checked = 0;
    for s in seen {
        if matches!(
            s.state,
            SupervisionState::Ready { .. } | SupervisionState::Stopped
        ) {
            left = true;
        }
        assert_eq!(
            s.left_initial_start,
            left,
            "left_initial_start of {}",
            project(s)
        );
        if matches!(s.state, SupervisionState::Starting) {
            generation += 1;
        }
        let expected = generation.max(1);
        assert_eq!(s.generation, expected, "generation of {}", project(s));
        checked += 1;
    }
    assert_eq!(checked, seen.len());
}

fn fnv(text: &str) -> u64 {
    text.bytes().fold(0xcbf2_9ce4_8422_2325, |h, b| {
        (h ^ u64::from(b)).wrapping_mul(0x0000_0100_0000_01b3)
    })
}

/// NFR-006: a stable digest of what a scenario did, printed for the determinism runs (`--nocapture`).
fn report(name: &str, seen: &[CoreStatus], sleeper: &[Duration]) {
    let text = format!("{:?}|{:?}", sequence(seen), sleeper);
    println!("SEQUENCE {name} {:016x} {text}", fnv(&text));
}

// ---- Ports -------------------------------------------------------------------------------------------------------

/// Hands out scripted ports first, then real free ones; records what each pick excluded.
struct ScriptedPorts {
    script: Mutex<VecDeque<u16>>,
    excludes: Mutex<Vec<Vec<u16>>>,
    picked: Mutex<Vec<u16>>,
}

impl ScriptedPorts {
    fn new(script: &[u16]) -> Arc<Self> {
        Arc::new(Self {
            script: Mutex::new(script.iter().copied().collect()),
            excludes: Mutex::new(Vec::new()),
            picked: Mutex::new(Vec::new()),
        })
    }

    fn excludes(&self) -> Vec<Vec<u16>> {
        lock(&self.excludes).clone()
    }

    /// Every port handed out, in order.
    fn picked(&self) -> Vec<u16> {
        lock(&self.picked).clone()
    }
}

impl PortPicker for ScriptedPorts {
    fn pick(&self, exclude: &[u16]) -> std::io::Result<u16> {
        lock(&self.excludes).push(exclude.to_vec());
        let scripted = lock(&self.script).pop_front();
        let port = match scripted {
            Some(port) => {
                assert!(!exclude.contains(&port), "the script repeats a tried port");
                port
            }
            None => unique_port(exclude),
        };
        lock(&self.picked).push(port);
        Ok(port)
    }
}

/// A free port that no other test is using, taken from below the ephemeral range.
///
/// Ports picked by `bind(0)` come from the ephemeral range, which is also where a client socket's local port comes
/// from. A client that polls a port which nobody has bound yet can then connect to itself (a TCP simultaneous open)
/// and occupy exactly the port the service is about to bind. That is a real, rare race of the loopback picker, and
/// the supervisor survives it with its busy-port retry; but a scenario that asserts an exact sequence must not
/// depend on it. So scenarios draw from 20000..30000, which the OS never hands to a client socket.
///
/// The choice must also hold between test processes that run side by side (two lanes, a reviewer re-running the
/// suite, the gate proof): a port is claimed by creating `<tmp>/kitty-core-test-ports/<port>` exclusively, with the
/// owner's pid inside. A claim whose owner is gone is stale and is taken over.
fn unique_port(exclude: &[u16]) -> u16 {
    use std::io::Write as _;
    use std::sync::atomic::{AtomicU32, Ordering};
    static NEXT: AtomicU32 = AtomicU32::new(0);
    let claims = claim_dir();
    let me = std::process::id();
    let start = me.wrapping_mul(2_654_435_761) % 10_000;
    // One full sweep of the range is the most that is ever worth trying.
    for _ in 0..10_000 {
        let n = NEXT.fetch_add(1, Ordering::SeqCst);
        let port = (20_000 + (start + n) % 10_000) as u16;
        if exclude.contains(&port) {
            continue;
        }
        let claim = claims.join(port.to_string());
        let claimed = match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&claim)
        {
            Ok(mut file) => file.write_all(me.to_string().as_bytes()).is_ok(),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                let owner: Option<i32> = std::fs::read_to_string(&claim)
                    .ok()
                    .and_then(|t| t.trim().parse().ok());
                // An unreadable or empty claim may still be being written; only a dead owner is taken over.
                if let Some(pid) = owner {
                    // SAFETY: signal 0 delivers nothing.
                    if unsafe { libc::kill(pid, 0) } == -1 && errno() == libc::ESRCH {
                        let _ = std::fs::remove_file(&claim);
                    }
                }
                false
            }
            Err(e) => panic!("cannot claim test port {port} in {}: {e}", claims.display()),
        };
        if !claimed {
            continue;
        }
        if std::net::TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
        release_port(port);
    }
    panic!("no free test port in 20000..30000 after a full sweep");
}

/// The claim directory, checked to be ours and writable so that a foreign one fails by name instead of looping.
fn claim_dir() -> PathBuf {
    use std::os::unix::fs::MetadataExt as _;
    let dir = std::env::temp_dir().join("kitty-core-test-ports");
    std::fs::create_dir_all(&dir).unwrap_or_else(|e| panic!("create {}: {e}", dir.display()));
    let meta = std::fs::metadata(&dir).unwrap_or_else(|e| panic!("stat {}: {e}", dir.display()));
    // SAFETY: geteuid has no arguments.
    let me = unsafe { libc::geteuid() };
    assert_eq!(
        meta.uid(),
        me,
        "{} belongs to another user; remove it or set TMPDIR",
        dir.display()
    );
    dir
}

/// Gives a claimed port back (its owner process wrote its pid into the claim, so only the owner removes it).
fn release_port(port: u16) {
    let _ = std::fs::remove_file(claim_dir().join(port.to_string()));
}

/// `n` distinct free loopback ports.
fn free_ports(n: usize) -> Vec<u16> {
    let mut ports: Vec<u16> = Vec::new();
    for _ in 0..n {
        let port = unique_port(&ports);
        ports.push(port);
    }
    ports
}

/// `squatter()` frees its port when the guard's task is aborted, and the abort is asynchronous. Waits briefly for a
/// bind of the port to succeed again.
async fn port_is_free_again(port: u16) {
    within("a squatted port is freed", async {
        while std::net::TcpListener::bind(("127.0.0.1", port)).is_err() {
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
    })
    .await;
}

fn pinned_document() -> Vec<u8> {
    std::fs::read(fixtures_dir().join("mission-status.openapi.json")).expect("read the bundle")
}

/// Rewrites the scenario of `root` with extra top-level fields.
fn write_scenario_with(root: &Path, launches: &[&str], extra: &[(&str, Value)]) {
    let mut scenario = serde_json::json!({ "launches": launches });
    for (key, value) in extra {
        scenario[*key] = value.clone();
    }
    std::fs::write(root.join("kitty-fake-service.json"), scenario.to_string())
        .expect("write the scenario");
}

// ---- Processes ---------------------------------------------------------------------------------------------------

fn errno() -> i32 {
    std::io::Error::last_os_error().raw_os_error().unwrap_or(0)
}

/// A direct child that its supervisor reaped is not a process any more: `kill(pid, 0)` gives ESRCH.
fn reaped(pid: i32) -> bool {
    // SAFETY: signal 0 delivers nothing.
    unsafe { libc::kill(pid, 0) == -1 && errno() == libc::ESRCH }
}

fn alive(pid: i32) -> bool {
    // SAFETY: signal 0 delivers nothing.
    unsafe { libc::kill(pid, 0) == 0 }
}

fn stat_of(pid: i32) -> Option<(char, i32)> {
    let text = std::fs::read_to_string(format!("/proc/{pid}/stat")).ok()?;
    let rest = &text[text.rfind(')')? + 1..];
    let mut fields = rest.split_whitespace();
    let state = fields.next()?.chars().next()?;
    fields.next()?;
    let pgrp = fields.next()?.parse().ok()?;
    Some((state, pgrp))
}

/// Gone, or a zombie waiting for its (foreign) parent to reap it: it runs nothing either way.
fn gone(pid: i32) -> bool {
    match stat_of(pid) {
        None => true,
        Some((state, _)) => state == 'Z',
    }
}

fn group_members(pgid: i32) -> Vec<i32> {
    let mut members = Vec::new();
    for entry in std::fs::read_dir("/proc").expect("/proc").flatten() {
        let Some(pid) = entry
            .file_name()
            .to_str()
            .and_then(|n| n.parse::<i32>().ok())
        else {
            continue;
        };
        if let Some((state, group)) = stat_of(pid) {
            if group == pgid && state != 'Z' {
                members.push(pid);
            }
        }
    }
    members
}

async fn wait_gone(what: &str, pid: i32, limit: Duration) {
    let started = Instant::now();
    loop {
        if gone(pid) {
            return;
        }
        assert!(
            started.elapsed() < limit,
            "{what}: pid {pid} still alive {limit:?} later"
        );
        tokio::time::sleep(Duration::from_millis(5)).await;
    }
}

/// Kills one pid that `live_fakes_of` just matched by its exact scratch root.
fn kill_if_fake(pid: i32) {
    if pid <= 1 {
        return;
    }
    let Ok(cmdline) = std::fs::read(format!("/proc/{pid}/cmdline")) else {
        return;
    };
    if String::from_utf8_lossy(&cmdline).contains("kitty-fake-service") {
        // SAFETY: one pid of a process this test started.
        unsafe { libc::kill(pid, libc::SIGKILL) };
    }
}

/// The pids of the `kitty-fake-service` processes whose command line names `root` as the whole value of a flag.
fn live_fakes_of(root: &Path) -> Vec<i32> {
    let needle = root.display().to_string();
    let mut pids = Vec::new();
    for entry in std::fs::read_dir("/proc").expect("/proc").flatten() {
        let Some(pid) = entry
            .file_name()
            .to_str()
            .and_then(|n| n.parse::<i32>().ok())
        else {
            continue;
        };
        let Ok(cmdline) = std::fs::read(format!("/proc/{pid}/cmdline")) else {
            continue;
        };
        let ours = cmdline.split(|b| *b == 0).any(|arg| {
            let arg = String::from_utf8_lossy(arg);
            arg.strip_suffix(&needle)
                .is_some_and(|flag| flag.starts_with("--") && flag.ends_with('='))
        });
        if ours && String::from_utf8_lossy(&cmdline).contains("kitty-fake-service") {
            pids.push(pid);
        }
    }
    pids
}

/// Fails by name unless no fake of this root is left within `limit`.
async fn wait_no_fakes(what: &str, root: &Path, limit: Duration) {
    let started = Instant::now();
    loop {
        let left = live_fakes_of(root);
        if left.is_empty() {
            return;
        }
        assert!(
            started.elapsed() < limit,
            "{what}: {left:?} still running {limit:?} later"
        );
        tokio::time::sleep(Duration::from_millis(5)).await;
    }
}

/// Kills, by pid, every `kitty-fake-service` whose command line names `root`: the processes this test's own
/// scratch directory started, including a grandchild that was spawned too late to be in a pid file.
fn kill_fakes_of(root: &Path) {
    for round in 0..2 {
        for pid in live_fakes_of(root) {
            kill_if_fake(pid);
        }
        if round == 0 {
            std::thread::sleep(Duration::from_millis(30));
        }
    }
}

// ---- The rig -----------------------------------------------------------------------------------------------------

struct FixedDiscovery(PathBuf);

impl Discovery for FixedDiscovery {
    fn locate(&self) -> Result<PathBuf, ServiceMissing> {
        Ok(self.0.clone())
    }
}

struct Rig {
    dir: TempDir,
    root: PathBuf,
    sink: Arc<RecordingSink>,
    clock: Arc<ManualClock>,
    sleeper: Arc<RecordingSleeper>,
    ports: Arc<ScriptedPorts>,
    timings: Timings,
    policy: RestartPolicy,
    discovery: Arc<dyn Discovery>,
    passthrough: Vec<OsString>,
    handle: Option<SupervisorHandle>,
}

impl Rig {
    fn new(launches: &[&str], crash_after_ms: Option<u64>) -> Self {
        let dir = TempDir::new("supervision");
        let root = std::fs::canonicalize(dir.path()).expect("canonical scratch directory");
        write_scenario(&root, launches, crash_after_ms);
        let clock = Arc::new(ManualClock::new());
        Rig {
            sleeper: Arc::new(RecordingSleeper::new(clock.clone())),
            clock,
            dir,
            root,
            sink: Arc::new(RecordingSink::default()),
            ports: ScriptedPorts::new(&[]),
            timings: test_timings(),
            policy: RestartPolicy::default(),
            discovery: Arc::new(FixedDiscovery(PathBuf::from(FAKE))),
            passthrough: Vec::new(),
            handle: None,
        }
    }

    fn config(&self) -> SupervisorConfig {
        SupervisorConfig {
            project_root: self.dir.path().to_path_buf(),
            discovery: self.discovery.clone(),
            contract: ContractPin::embedded(),
            timings: self.timings,
            policy: self.policy.clone(),
            ports: self.ports.clone(),
            clock: self.clock.clone(),
            sleeper: self.sleeper.clone(),
            env_passthrough: self.passthrough.clone(),
        }
    }

    fn go(&mut self) {
        let handle = spawn_supervisor(
            self.config(),
            self.sink.clone(),
            &tokio::runtime::Handle::current(),
        );
        *lock(&self.sink.failures) = Some(handle.failure_log());
        self.handle = Some(handle);
    }

    fn handle(&self) -> &SupervisorHandle {
        self.handle.as_ref().expect("the supervisor runs")
    }

    async fn stop(&self) {
        within("stop() resolves", self.handle().stop())
            .await
            .expect("the supervisor answers");
    }

    fn launch(&self, n: usize) -> Value {
        let path = self.root.join(format!("launch-{n}.json"));
        let text =
            std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("launch-{n}.json: {e}"));
        serde_json::from_str(&text).expect("launch record is JSON")
    }

    /// Launch `n`'s record, when the fake got far enough to write it (a fake stopped during its start has none).
    fn launch_record(&self, n: usize) -> Option<Value> {
        let text = std::fs::read_to_string(self.root.join(format!("launch-{n}.json"))).ok()?;
        serde_json::from_str(&text).ok()
    }

    fn launch_pid(&self, n: usize) -> i32 {
        self.launch(n)["pid"].as_i64().expect("pid") as i32
    }

    fn launch_port(&self, n: usize) -> u16 {
        let argv = self.launch(n)["argv"].clone();
        let port = argv[1]
            .as_str()
            .and_then(|a| a.strip_prefix("--mission-status.port="))
            .expect("port argument")
            .parse()
            .expect("port number");
        port
    }

    /// Asks the running fake to crash now (exit status 3), at an exact moment.
    fn crash_now(&self) {
        std::fs::write(self.root.join("crash-now"), "").expect("write the crash trigger");
    }

    fn launch_count(&self) -> usize {
        std::fs::read_dir(&self.root)
            .expect("read the scratch directory")
            .flatten()
            .filter(|e| {
                let name = e.file_name().to_string_lossy().into_owned();
                name.starts_with("launch-") && name.ends_with(".json")
            })
            .count()
    }

    fn requests(&self) -> Vec<String> {
        std::fs::read_to_string(self.root.join("requests.log"))
            .unwrap_or_default()
            .lines()
            .map(str::to_owned)
            .collect()
    }

    fn pid_file(&self, name: &str) -> Option<i32> {
        std::fs::read_to_string(self.root.join(name))
            .ok()?
            .trim()
            .parse()
            .ok()
    }

    async fn pid_file_appears(&self, name: &str) -> i32 {
        within(&format!("{name} is written"), async {
            loop {
                if let Some(pid) = self.pid_file(name) {
                    return pid;
                }
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
        })
        .await
    }
}

impl Drop for Rig {
    fn drop(&mut self) {
        // The handle first: it aborts the task, whose guard sends SIGKILL to the group.
        drop(self.handle.take());
        // Every fake of this scratch root, the grandchild included, found by its exact root argument.
        kill_fakes_of(&self.root);
        for port in self.ports.picked() {
            release_port(port);
        }
    }
}

fn ready_port(seen: &[CoreStatus]) -> u16 {
    seen.iter()
        .rev()
        .find_map(|s| match &s.state {
            SupervisionState::Ready { endpoint } => Some(endpoint.port()),
            _ => None,
        })
        .expect("a Ready status")
}

fn allowlisted_environment(passthrough: &[&str]) -> BTreeMap<String, String> {
    std::env::vars_os()
        .filter_map(|(k, v)| {
            let name = k.to_str()?.to_owned();
            let allowed = ["PATH", "HOME", "LANG", "TMPDIR"].contains(&name.as_str())
                || name.starts_with("LC_")
                || passthrough.contains(&name.as_str());
            allowed.then(|| (name, v.to_string_lossy().into_owned()))
        })
        .collect()
}

// ---- Scenarios ----------------------------------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn ready_launches_with_exact_argv_environment_and_null_stdin() {
    let mut rig = Rig::new(&["ready"], None);
    rig.passthrough = vec![OsString::from("CARGO_PKG_NAME")];
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the service becomes ready", "Ready", 1)
        .await;
    assert_eq!(sequence(&seen), strings(&["Starting g1 a0", "Ready g1 a0"]));
    let port = ready_port(&seen);

    let launch = rig.launch(0);
    assert_eq!(
        launch["argv"],
        serde_json::json!([
            format!("--mission-status.project-root={}", rig.root.display()),
            format!("--mission-status.port={port}")
        ]),
        "exactly the two launch arguments"
    );
    let env: BTreeMap<String, String> = launch["env"]
        .as_object()
        .expect("env object")
        .iter()
        .map(|(k, v)| (k.clone(), v.as_str().expect("string").to_owned()))
        .collect();
    assert_eq!(env, allowlisted_environment(&["CARGO_PKG_NAME"]));
    // Positive control: the test process has variables that must not reach the child.
    if std::env::var_os("CARGO_MANIFEST_DIR").is_some() {
        assert!(!env.contains_key("CARGO_MANIFEST_DIR"));
    }
    assert_eq!(launch["cwd"], rig.root.display().to_string());
    assert_eq!(launch["stdinEof"], true, "stdin is null");
    assert_eq!(
        rig.requests(),
        strings(&["GET /api/v1/openapi.yaml HTTP/1.1"])
    );

    rig.stop().await;
    let seen = rig.sink.all();
    assert_eq!(
        sequence(&seen),
        strings(&["Starting g1 a0", "Ready g1 a0", "Stopped g1 a0"])
    );
    assert_invariants(&seen);
    assert!(rig.sleeper.log().is_empty());
    let output = String::from_utf8(rig.handle().captured_output()).expect("UTF-8 output");
    assert!(output.contains("mode ready"), "captured output: {output:?}");
    report("ready", &seen, &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "current_thread")]
async fn a_current_thread_runtime_supervises_too() {
    let mut rig = Rig::new(&["ready"], None);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("ready on a current-thread runtime", "Ready", 1)
        .await;
    assert_eq!(sequence(&seen), strings(&["Starting g1 a0", "Ready g1 a0"]));
    rig.stop().await;
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_crash_after_ready_backs_off_and_restarts() {
    let mut rig = Rig::new(&["crash-after", "ready"], None);
    rig.go();
    rig.sink
        .wait_for_state("the first launch is ready", "Ready", 1)
        .await;
    rig.crash_now();
    let seen = rig
        .sink
        .wait_for_state("the restarted service becomes ready", "Ready", 2)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Ready g1 a0",
            "Crashed g1 a0",
            "Backoff(500ms) g1 a0",
            "Starting g2 a0",
            "Ready g2 a0",
        ])
    );
    assert_invariants(&seen);
    assert_eq!(rig.sleeper.log(), vec![Duration::from_millis(500)]);
    assert!(reaped(rig.launch_pid(0)), "the crashed service is gone");
    rig.stop().await;
    report("crash-then-ready", &rig.sink.all(), &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn five_crashes_give_up_with_the_last_exit_status() {
    let mut rig = Rig::new(&["crash-after"], None);
    rig.go();
    for nth in 1..=5 {
        rig.sink
            .wait_for_state(&format!("launch {nth} is ready"), "Ready", nth)
            .await;
        rig.crash_now();
    }
    let seen = rig
        .sink
        .wait_for_state("the supervisor gives up", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Ready g1 a0",
            "Crashed g1 a0",
            "Backoff(500ms) g1 a0",
            "Starting g2 a0",
            "Ready g2 a0",
            "Crashed g2 a0",
            "Backoff(1000ms) g2 a0",
            "Starting g3 a0",
            "Ready g3 a0",
            "Crashed g3 a0",
            "Backoff(2000ms) g3 a0",
            "Starting g4 a0",
            "Ready g4 a0",
            "Crashed g4 a0",
            "Backoff(4000ms) g4 a0",
            "Starting g5 a0",
            "Ready g5 a0",
            "Crashed g5 a0",
            "Stopped g5 a0 [missing:Crashing]",
        ])
    );
    assert_invariants(&seen);
    let last = seen.last().expect("a last status");
    match &last.degraded {
        DegradedReason::ServiceMissing(m) => {
            assert_eq!(m.reason, MissingReason::Crashing);
            assert_eq!(m.detail, "service exited: exit status: 3");
        }
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    assert_eq!(
        rig.sleeper.log(),
        vec![
            Duration::from_millis(500),
            Duration::from_secs(1),
            Duration::from_secs(2),
            Duration::from_secs(4)
        ]
    );
    assert_eq!(rig.launch_count(), 5);
    report("five-crashes", &seen, &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_busy_port_is_retried_on_another_port() {
    let squat = free_ports(1)[0];
    let guard: SquatterGuard = squatter(
        squat,
        Some(http_ok("application/yaml", &pinned_document())),
        Some(Duration::from_millis(200)),
    );
    let mut rig = Rig::new(&["ready"], None);
    rig.ports = ScriptedPorts::new(&[squat]);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("ready on the second port", "Ready", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&["Starting g1 a0", "Starting g2 a1", "Ready g2 a1"])
    );
    assert_invariants(&seen);
    assert_eq!(rig.launch_port(0), squat);
    assert_ne!(rig.launch_port(1), squat);
    assert_eq!(ready_port(&seen), rig.launch_port(1));
    assert_eq!(rig.ports.excludes(), vec![vec![], vec![squat]]);
    assert!(rig.sleeper.log().is_empty(), "no backoff for a busy port");
    assert!(reaped(rig.launch_pid(0)), "the first launch exited");
    rig.stop().await;
    report("busy-port", &rig.sink.all(), &rig.sleeper.log());
    drop(guard);
    port_is_free_again(squat).await;
    assert_no_panics();
}

#[cfg(target_os = "linux")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_socket_that_is_not_the_services_is_not_ready() {
    // Positive control for the oracle: one squatter on a port the service binds is a busy port, handled above. Here
    // the service never binds, three squatters answer at once with the pinned document, and every answer is refused.
    let ports = free_ports(3);
    let squatters: Vec<SquatterGuard> = ports
        .iter()
        .map(|p| {
            squatter(
                *p,
                Some(http_ok("application/yaml", &pinned_document())),
                None,
            )
        })
        .collect();
    let mut rig = Rig::new(&["alive-no-bind"], None);
    rig.policy.give_up_at = 1;
    rig.ports = ScriptedPorts::new(&ports);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the start fails", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Starting g2 a1",
            "Starting g3 a2",
            "Crashed g3 a0",
            "Stopped g3 a0 [missing:Crashing]",
        ])
    );
    assert!(!seen.iter().any(|s| kind(s) == "Ready"), "never Ready");
    match &seen.last().expect("last").degraded {
        DegradedReason::ServiceMissing(m) => assert_eq!(m.detail, CAUSE_NOT_OWNED),
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    assert_eq!(
        rig.ports.picked(),
        ports,
        "three distinct ports, in the scripted order"
    );
    // A service stopped while it was still starting has no record; one that has a record names its port.
    for (n, port) in ports.iter().enumerate() {
        if rig.launch_record(n).is_some() {
            assert_eq!(rig.launch_port(n), *port);
        }
    }
    assert!(
        rig.sleeper.log().is_empty(),
        "no backoff: the policy gave up"
    );
    wait_no_fakes(
        "every launch was stopped",
        &rig.root,
        Duration::from_secs(1),
    )
    .await;
    drop(squatters);
    for p in ports {
        port_is_free_again(p).await;
    }
    report("not-owned", &rig.sink.all(), &rig.sleeper.log());
    assert_no_panics();
}

/// SEC-002: a foreign listener that answers something other than the pinned document (here a bare 404) is not the
/// service speaking, so it must not become a terminal `ContractMismatch` that blames the service.
#[cfg(target_os = "linux")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_foreign_listener_with_a_wrong_answer_is_retried_on_another_port() {
    let squat = free_ports(1)[0];
    let guard = squatter(
        squat,
        Some(b"HTTP/1.1 404 Not Found\r\ncontent-length: 0\r\n\r\n".to_vec()),
        None,
    );
    let mut rig = Rig::new(&["alive-no-bind", "ready"], None);
    rig.ports = ScriptedPorts::new(&[squat]);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("ready on another port", "Ready", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&["Starting g1 a0", "Starting g2 a1", "Ready g2 a1"])
    );
    assert_invariants(&seen);
    assert_ne!(ready_port(&seen), squat);
    assert_eq!(rig.ports.excludes(), vec![vec![], vec![squat]]);
    assert!(
        rig.sleeper.log().is_empty(),
        "no backoff for a foreign listener"
    );
    assert_eq!(rig.sink.failure_causes(), vec![CAUSE_NOT_OWNED.to_owned()]);
    rig.stop().await;
    report("foreign-404", &rig.sink.all(), &rig.sleeper.log());
    drop(guard);
    port_is_free_again(squat).await;
    assert_no_panics();
}

/// TEST-003b: a connection reset during readiness is "no answer yet", not a final mismatch. The fake resets the first
/// three contract fetches; the supervisor keeps polling the same launch and reaches Ready on it.
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_connection_reset_during_readiness_keeps_polling() {
    let mut rig = Rig::new(&["reset-first"], None);
    write_scenario_with(&rig.root, &["reset-first"], &[("resetFirst", 3.into())]);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("ready after the resets", "Ready", 1)
        .await;
    assert_eq!(sequence(&seen), strings(&["Starting g1 a0", "Ready g1 a0"]));
    assert_invariants(&seen);
    let resets = std::fs::read_to_string(rig.root.join("resets.log")).unwrap_or_default();
    assert_eq!(resets.lines().count(), 3, "the fake reset three fetches");
    assert_eq!(rig.launch_count(), 1, "one launch served it all");
    assert_eq!(
        rig.requests().len(),
        1,
        "one fetch was served after the resets"
    );
    assert!(rig.sleeper.log().is_empty());
    rig.stop().await;
    report("reset-then-ready", &rig.sink.all(), &rig.sleeper.log());
    assert_no_panics();
}

#[cfg(target_os = "linux")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn ownership_mismatches_take_no_crash_slot_and_no_backoff() {
    let ports = free_ports(3);
    let squatters: Vec<SquatterGuard> = ports
        .iter()
        .map(|p| {
            squatter(
                *p,
                Some(http_ok("application/yaml", &pinned_document())),
                None,
            )
        })
        .collect();
    let mut rig = Rig::new(
        &["alive-no-bind", "alive-no-bind", "alive-no-bind", "ready"],
        None,
    );
    rig.ports = ScriptedPorts::new(&ports);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the second start is ready", "Ready", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Starting g2 a1",
            "Starting g3 a2",
            "Crashed g3 a0",
            "Backoff(500ms) g3 a0",
            "Starting g4 a0",
            "Ready g4 a0",
        ])
    );
    assert_invariants(&seen);
    assert_eq!(rig.ports.picked()[..3], ports[..]);
    for (n, port) in ports.iter().enumerate() {
        if rig.launch_record(n).is_some() {
            assert_eq!(rig.launch_port(n), *port);
        }
    }
    assert_eq!(rig.sleeper.log(), vec![Duration::from_millis(500)]);
    assert!(!ports.contains(&ready_port(&seen)));
    rig.stop().await;
    drop(squatters);
    for p in ports {
        port_is_free_again(p).await;
    }
    report("ownership", &rig.sink.all(), &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_start_budget_spent_on_503s_is_a_start_failure() {
    let mut rig = Rig::new(&["serve-503"], None);
    rig.timings.start_timeout = Duration::from_millis(300);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the supervisor gives up", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Crashed g1 a0",
            "Backoff(500ms) g1 a0",
            "Starting g2 a0",
            "Crashed g2 a0",
            "Backoff(1000ms) g2 a0",
            "Starting g3 a0",
            "Crashed g3 a0",
            "Backoff(2000ms) g3 a0",
            "Starting g4 a0",
            "Crashed g4 a0",
            "Backoff(4000ms) g4 a0",
            "Starting g5 a0",
            "Crashed g5 a0",
            "Stopped g5 a0 [missing:Crashing]",
        ])
    );
    assert_invariants(&seen);
    match &seen.last().expect("last").degraded {
        DegradedReason::ServiceMissing(m) => {
            assert_eq!(
                (m.reason, m.detail.as_str()),
                (MissingReason::Crashing, CAUSE_BUDGET_503)
            )
        }
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    assert_eq!(
        rig.sleeper.log(),
        vec![
            Duration::from_millis(500),
            Duration::from_secs(1),
            Duration::from_secs(2),
            Duration::from_secs(4)
        ]
    );
    let requests = rig.requests();
    assert!(!requests.is_empty(), "the 503s were really requested");
    assert!(requests
        .iter()
        .all(|r| r == "GET /api/v1/openapi.yaml HTTP/1.1"));
    wait_no_fakes(
        "every launch was stopped",
        &rig.root,
        Duration::from_secs(1),
    )
    .await;
    report("serve-503", &seen, &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_service_that_never_answers_is_stopped_and_counts_as_a_crash() {
    let mut rig = Rig::new(&["never-ready"], None);
    rig.timings.start_timeout = Duration::from_millis(300);
    // One crash is enough to give up: the scenario is the first start only, so a slow machine cannot change it.
    rig.policy.give_up_at = 1;
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the supervisor gives up", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Crashed g1 a0",
            "Stopped g1 a0 [missing:Crashing]"
        ])
    );
    assert_invariants(&seen);
    match &seen.last().expect("last").degraded {
        DegradedReason::ServiceMissing(m) => {
            assert_eq!(
                (m.reason, m.detail.as_str()),
                (MissingReason::Crashing, CAUSE_BUDGET)
            )
        }
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    assert_eq!(
        rig.sink.failure_causes(),
        vec![CAUSE_BUDGET.to_owned()],
        "positive control: a service was started and failed once"
    );
    wait_no_fakes(
        "the full stop sequence ended the silent service",
        &rig.root,
        Duration::from_secs(1),
    )
    .await;
    assert!(rig.sleeper.log().is_empty());
    report("never-ready", &seen, &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn three_exits_before_ready_are_one_start_failure_on_three_ports() {
    let mut rig = Rig::new(
        &["exit-at-start", "exit-at-start", "exit-at-start", "ready"],
        None,
    );
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the second start is ready", "Ready", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Starting g2 a1",
            "Starting g3 a2",
            "Crashed g3 a0",
            "Backoff(500ms) g3 a0",
            "Starting g4 a0",
            "Ready g4 a0",
        ])
    );
    assert_invariants(&seen);
    let tried: Vec<u16> = (0..3).map(|n| rig.launch_port(n)).collect();
    let distinct: std::collections::BTreeSet<u16> = tried.iter().copied().collect();
    assert_eq!(distinct.len(), 3, "three distinct ports: {tried:?}");
    assert_eq!(
        rig.ports.excludes()[..3].to_vec(),
        vec![vec![], vec![tried[0]], vec![tried[0], tried[1]]]
    );
    assert_eq!(rig.sleeper.log(), vec![Duration::from_millis(500)]);
    rig.stop().await;
    report("exit-at-start", &rig.sink.all(), &rig.sleeper.log());

    // The same start with a policy that gives up at once shows the cause and keeps the output.
    let mut rig = Rig::new(&["exit-at-start"], None);
    rig.policy.give_up_at = 1;
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the supervisor gives up", "Stopped", 1)
        .await;
    match &seen.last().expect("last").degraded {
        DegradedReason::ServiceMissing(m) => {
            assert_eq!(
                (m.reason, m.detail.as_str()),
                (MissingReason::Crashing, "service exited: exit status: 1")
            )
        }
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    let output = String::from_utf8(rig.handle().captured_output()).expect("UTF-8 output");
    assert!(
        output.contains("mode exit-at-start"),
        "the most recent child's output is kept after it exits: {output:?}"
    );
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn output_from_both_pipes_is_captured() {
    let mut rig = Rig::new(&["bogus-mode"], None);
    rig.policy.give_up_at = 1;
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the supervisor gives up", "Stopped", 1)
        .await;
    match &seen.last().expect("last").degraded {
        DegradedReason::ServiceMissing(m) => assert_eq!(m.detail, "service exited: exit status: 2"),
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    let output = String::from_utf8(rig.handle().captured_output()).expect("UTF-8 output");
    assert!(output.contains("mode bogus-mode"), "stdout: {output:?}");
    assert!(
        output.contains("unknown mode bogus-mode"),
        "stderr: {output:?}"
    );
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_modified_contract_stops_the_service_with_both_digests() {
    let mut rig = Rig::new(&["serve-modified"], None);
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("the mismatch is published", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&["Starting g1 a0", "Stopped g1 a0 [mismatch]"])
    );
    assert_invariants(&seen);
    let bundle = pinned_document();
    let expected = digest_of(&bundle).expect("bundle digest");
    let mut modified: Value = serde_json::from_slice(&bundle).expect("bundle JSON");
    let version = modified["info"]["version"]
        .as_str()
        .expect("version")
        .to_owned();
    modified["info"]["version"] = Value::String(format!("{version}-modified"));
    let modified_digest =
        digest_of(&serde_json::to_vec(&modified).expect("serialize")).expect("digest");
    assert_ne!(
        expected, modified_digest,
        "positive control: the change moves the digest"
    );
    match &seen.last().expect("last").degraded {
        DegradedReason::ContractMismatch(m) => {
            assert_eq!(m.expected, expected);
            assert_eq!(m.actual, Actual::Digest(modified_digest));
        }
        other => panic!("expected ContractMismatch, got {other:?}"),
    }
    let pid = rig.launch_pid(0);
    assert!(reaped(pid), "the service is gone");
    wait_gone("the group", pid, Duration::from_secs(1)).await;
    assert!(
        group_members(pid).is_empty(),
        "no member of the group is left"
    );
    assert_eq!(
        rig.requests(),
        strings(&["GET /api/v1/openapi.yaml HTTP/1.1"])
    );
    assert!(
        rig.sleeper.log().is_empty(),
        "a mismatch is never restarted"
    );
    report("serve-modified", &seen, &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn retry_from_stopped_starts_again_with_a_clean_history() {
    let mut rig = Rig::new(&["serve-modified", "ready"], None);
    rig.go();
    rig.sink
        .wait_for_state("the mismatch is published", "Stopped", 1)
        .await;
    rig.handle().retry();
    let seen = rig
        .sink
        .wait_for_state("the retry becomes ready", "Ready", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Stopped g1 a0 [mismatch]",
            "Starting g2 a0",
            "Ready g2 a0",
        ])
    );
    assert_invariants(&seen);
    assert!(rig.sleeper.log().is_empty());
    rig.stop().await;
    report("retry", &rig.sink.all(), &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn stop_ends_a_ready_service_within_the_grace_period() {
    let mut rig = Rig::new(&["ready"], None);
    // A long grace period: a service that obeys SIGTERM must be gone long before it ends, even on a busy machine.
    rig.timings.stop_grace = Duration::from_secs(3);
    rig.go();
    rig.sink.wait_for_state("ready", "Ready", 1).await;
    let pid = rig.launch_pid(0);
    assert!(alive(pid), "positive control: it runs");
    let started = Instant::now();
    rig.stop().await;
    let took = started.elapsed();
    assert!(took < rig.timings.stop_grace, "stop took {took:?}");
    assert!(reaped(pid));
    let seen = rig.sink.all();
    assert_eq!(kind(seen.last().expect("last")), "Stopped");
    assert_eq!(seen.last().expect("last").degraded, DegradedReason::None);
    // A second stop on a stopped supervisor answers and publishes nothing.
    rig.stop().await;
    assert_eq!(rig.sink.all().len(), seen.len());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_service_that_ignores_sigterm_is_killed_after_the_grace_period() {
    let mut rig = Rig::new(&["ignore-term"], None);
    rig.go();
    rig.sink.wait_for_state("ready", "Ready", 1).await;
    let pid = rig.launch_pid(0);
    let started = Instant::now();
    rig.stop().await;
    let took = started.elapsed();
    assert!(
        took >= rig.timings.stop_grace,
        "SIGTERM was ignored, so stop waited for the whole grace period: {took:?}"
    );
    assert!(
        took < rig.timings.stop_grace + Duration::from_secs(1),
        "stop took {took:?}"
    );
    assert!(reaped(pid), "kill(pid, 0) gives ESRCH");
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn stop_during_the_start_ends_the_service() {
    let mut rig = Rig::new(&["never-ready"], None);
    rig.go();
    rig.sink.wait_for_state("starting", "Starting", 1).await;
    let pid = rig.pid_file_or_launch(0).await;
    rig.stop().await;
    assert!(reaped(pid));
    let seen = rig.sink.all();
    assert_eq!(
        sequence(&seen),
        strings(&["Starting g1 a0", "Stopped g1 a0"])
    );
    assert_invariants(&seen);
    report("stop-during-start", &rig.sink.all(), &rig.sleeper.log());
    assert_no_panics();
}

impl Rig {
    /// The pid of launch `n`, once its record exists.
    async fn pid_file_or_launch(&self, n: usize) -> i32 {
        let path = self.root.join(format!("launch-{n}.json"));
        within("the launch record is written", async {
            while !path.exists() {
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
        })
        .await;
        // The record is written in one call; a partial read retries.
        within("the launch record parses", async {
            loop {
                if let Ok(text) = std::fs::read_to_string(&path) {
                    if let Ok(v) = serde_json::from_str::<Value>(&text) {
                        return v["pid"].as_i64().expect("pid") as i32;
                    }
                }
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
        })
        .await
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn stop_takes_the_whole_process_group() {
    let mut rig = Rig::new(&["fork-child"], None);
    rig.go();
    rig.sink.wait_for_state("ready", "Ready", 1).await;
    let service = rig.launch_pid(0);
    let grandchild = rig.pid_file_appears("grandchild.pid").await;
    assert_ne!(service, grandchild);
    assert!(
        alive(service) && alive(grandchild),
        "positive control: both run"
    );
    assert_eq!(
        stat_of(grandchild).map(|(_, group)| group),
        Some(service),
        "the grandchild is in the service's own process group"
    );
    assert_ne!(
        stat_of(service).map(|(_, group)| group),
        // SAFETY: getpgrp has no arguments.
        Some(unsafe { libc::getpgrp() }),
        "the service is not in the test's group"
    );
    rig.stop().await;
    assert!(reaped(service));
    wait_gone("the grandchild", grandchild, Duration::from_secs(1)).await;
    assert!(group_members(service).is_empty());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_grandchild_that_outlives_its_leader_is_killed_after_the_reap() {
    // The leader is crashed by the trigger file only after `Ready`, so the order of events does not depend on how
    // fast the machine is: the leader exits and is reaped while the grandchild sleeps on in the same group.
    let mut rig = Rig::new(&["fork-child", "ready"], None);
    rig.go();
    rig.sink
        .wait_for_state("the first launch is ready", "Ready", 1)
        .await;
    let leader = rig.launch_pid(0);
    let grandchild = rig.pid_file_appears("grandchild.pid").await;
    assert_ne!(leader, grandchild);
    // Positive control: at `Ready` the grandchild is a live member of the leader's group.
    assert!(
        alive(grandchild) && !gone(grandchild),
        "the grandchild runs"
    );
    assert_eq!(stat_of(grandchild).map(|(_, group)| group), Some(leader));
    rig.crash_now();
    // Only the post-reap SIGKILL can reach the grandchild now: nothing else signals a group whose leader is gone.
    wait_gone(
        "the grandchild of an exited leader",
        grandchild,
        Duration::from_secs(1),
    )
    .await;
    let seen = rig
        .sink
        .wait_for_state("the second launch is ready", "Ready", 2)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&[
            "Starting g1 a0",
            "Ready g1 a0",
            "Crashed g1 a0",
            "Backoff(500ms) g1 a0",
            "Starting g2 a0",
            "Ready g2 a0",
        ])
    );
    assert_invariants(&seen);
    assert_eq!(
        rig.sink.failure_causes(),
        vec!["service exited: exit status: 3".to_owned()]
    );
    assert!(reaped(leader), "the leader was reaped");
    assert!(group_members(leader).is_empty());
    assert_eq!(rig.sleeper.log(), vec![Duration::from_millis(500)]);
    report("grandchild-outlives-leader", &seen, &rig.sleeper.log());
    rig.stop().await;
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn dropping_the_handle_kills_the_group_without_a_grace_period() {
    let mut rig = Rig::new(&["fork-child"], None);
    rig.go();
    rig.sink.wait_for_state("ready", "Ready", 1).await;
    let service = rig.launch_pid(0);
    let grandchild = rig.pid_file_appears("grandchild.pid").await;
    assert!(alive(service) && alive(grandchild));
    drop(rig.handle.take());
    wait_gone("the service", service, Duration::from_secs(1)).await;
    wait_gone("the grandchild", grandchild, Duration::from_secs(1)).await;
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_project_root_that_does_not_exist_is_cannot_execute() {
    let dir = TempDir::new("supervision-missing-root");
    let mut rig = Rig::new(&["ready"], None);
    let missing_root = dir.path().join("does-not-exist");
    let mut config = rig.config();
    config.project_root = missing_root;
    let handle = spawn_supervisor(config, rig.sink.clone(), &tokio::runtime::Handle::current());
    let seen = rig
        .sink
        .wait_for_state("the start is refused", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&["Stopped g1 a0 [missing:CannotExecute]"])
    );
    match &seen[0].degraded {
        DegradedReason::ServiceMissing(m) => {
            assert!(
                m.detail.contains("No such file or directory"),
                "{}",
                m.detail
            )
        }
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    assert_invariants(&seen);
    assert!(rig.sleeper.log().is_empty());
    assert_eq!(rig.launch_count(), 0, "no process was started");
    // Positive control: the same rig, with its real root, does start one.
    rig.go();
    rig.sink.wait_for_state("ready", "Ready", 1).await;
    assert_eq!(rig.launch_count(), 1);
    rig.stop().await;
    drop(handle);
    report("missing-root", &rig.sink.all(), &rig.sleeper.log());
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_missing_or_unrunnable_binary_is_stopped_without_a_retry_loop() {
    // Not found, from discovery.
    let mut rig = Rig::new(&["ready"], None);
    let nowhere = rig.root.join("no-such-service");
    rig.discovery = Arc::new(DefaultDiscovery::new(
        Some(nowhere),
        EnvSnapshot::default(),
        OsString::from("mission-status-api"),
    ));
    rig.go();
    let seen = rig.sink.wait_for_state("not found", "Stopped", 1).await;
    assert_eq!(
        sequence(&seen),
        strings(&["Stopped g1 a0 [missing:NotFound]"])
    );
    assert_invariants(&seen);
    assert!(rig.sleeper.log().is_empty());
    report("not-found", &rig.sink.all(), &rig.sleeper.log());
    assert_eq!(rig.launch_count(), 0);

    // A file that is not executable: the OS refuses, with its own error text.
    use std::os::unix::fs::PermissionsExt;
    let mut rig = Rig::new(&["ready"], None);
    let plain = rig.root.join("plain-file");
    std::fs::write(&plain, "not a program").expect("write");
    std::fs::set_permissions(&plain, std::fs::Permissions::from_mode(0o644)).expect("chmod");
    rig.discovery = Arc::new(FixedDiscovery(plain));
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("cannot execute", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&["Starting g1 a0", "Stopped g1 a0 [missing:CannotExecute]"])
    );
    match &seen[1].degraded {
        DegradedReason::ServiceMissing(m) => {
            assert!(m.detail.contains("Permission denied"), "{}", m.detail)
        }
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    assert!(rig.sleeper.log().is_empty());
    report("not-executable", &rig.sink.all(), &rig.sleeper.log());

    // A path that vanished between discovery and the launch (ENOENT).
    let mut rig = Rig::new(&["ready"], None);
    let vanished = rig.root.join("vanished-service");
    rig.discovery = Arc::new(FixedDiscovery(vanished));
    rig.go();
    let seen = rig
        .sink
        .wait_for_state("cannot execute", "Stopped", 1)
        .await;
    assert_eq!(
        sequence(&seen),
        strings(&["Starting g1 a0", "Stopped g1 a0 [missing:CannotExecute]"])
    );
    match &seen[1].degraded {
        DegradedReason::ServiceMissing(m) => {
            assert!(
                m.detail.contains("No such file or directory"),
                "{}",
                m.detail
            )
        }
        other => panic!("expected ServiceMissing, got {other:?}"),
    }
    assert!(rig.sleeper.log().is_empty());
    report("vanished", &rig.sink.all(), &rig.sleeper.log());
    assert_eq!(rig.launch_count(), 0);
    assert_no_panics();
}

// ---- A dying host takes the service with it (PDEATHSIG) -------------------------------------------------------------

const HOST_ROOT_VAR: &str = "KITTY_SUPERVISION_TEST_HOST_ROOT";

/// Not a test of its own: the child process of `a_dying_host_takes_its_service_with_it`. Without the variable it
/// returns at once. With it, it supervises a `ready` service on its own runtime and then exits the process through
/// `std::process::exit`, with no `stop()`.
#[test]
fn host_process_for_the_parent_death_test() {
    let Some(root) = std::env::var_os(HOST_ROOT_VAR) else {
        return;
    };
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .expect("runtime");
    let sink = Arc::new(RecordingSink::default());
    let clock = Arc::new(ManualClock::new());
    let config = SupervisorConfig {
        project_root: PathBuf::from(root),
        discovery: Arc::new(FixedDiscovery(PathBuf::from(FAKE))),
        contract: ContractPin::embedded(),
        timings: test_timings(),
        policy: RestartPolicy::default(),
        ports: ScriptedPorts::new(&[]),
        sleeper: Arc::new(RecordingSleeper::new(clock.clone())),
        clock,
        env_passthrough: Vec::new(),
    };
    let handle = spawn_supervisor(config, sink.clone(), runtime.handle());
    runtime.block_on(sink.wait_for_state("the hosted service is ready", "Ready", 1));
    // No stop(), no drop of the handle: a host that dies.
    std::mem::forget(handle);
    std::process::exit(0);
}

#[cfg(target_os = "linux")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_dying_host_takes_its_service_with_it() {
    let dir = TempDir::new("supervision-host");
    let root = std::fs::canonicalize(dir.path()).expect("canonical");
    write_scenario(&root, &["ready"], None);
    let mut host = std::process::Command::new(std::env::current_exe().expect("test binary"))
        .args([
            "--exact",
            "host_process_for_the_parent_death_test",
            "--nocapture",
            "--test-threads=1",
        ])
        .env(HOST_ROOT_VAR, &root)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .expect("start the host process");
    let outcome = within("the host process exits", async {
        loop {
            if let Some(status) = host.try_wait().expect("try_wait") {
                return status;
            }
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
    })
    .await;
    let pid: i32 = std::fs::read_to_string(root.join("service.pid"))
        .expect("the hosted service wrote its pid")
        .trim()
        .parse()
        .expect("pid");
    struct Cleanup(PathBuf);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            kill_fakes_of(&self.0);
        }
    }
    let _cleanup = Cleanup(root.clone());
    assert!(outcome.success(), "the host exited by itself: {outcome:?}");
    wait_gone(
        "the service of a host that died",
        pid,
        Duration::from_secs(1),
    )
    .await;
    assert_no_panics();
}

#[test]
fn nothing_is_left_behind_by_the_scratch_directories() {
    let path;
    {
        let dir = TempDir::new("supervision-scratch");
        path = dir.path().to_path_buf();
        assert!(Path::new(&path).exists());
    }
    assert!(!path.exists());
}

// ---- The fake itself ------------------------------------------------------------------------------------------------

/// Kills and reaps a fake that a test started by hand, whatever happens to the test.
struct HandStarted {
    child: std::process::Child,
    root: PathBuf,
}

impl Drop for HandStarted {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        kill_fakes_of(&self.root);
    }
}

#[test]
fn the_fakes_crash_after_mode_counts_its_delay_from_the_first_contract_fetch() {
    use std::io::{Read, Write};
    let dir = TempDir::new("supervision-fake");
    let root = std::fs::canonicalize(dir.path()).expect("canonical");
    write_scenario(&root, &["crash-after"], Some(150));
    let port = unique_port(&[]);
    struct Release(u16);
    impl Drop for Release {
        fn drop(&mut self) {
            release_port(self.0);
        }
    }
    let _release = Release(port);
    let child = std::process::Command::new(FAKE)
        .arg(format!("--mission-status.project-root={}", root.display()))
        .arg(format!("--mission-status.port={port}"))
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .expect("start the fake");
    let mut fake = HandStarted {
        child,
        root: root.clone(),
    };
    let give_up = Instant::now() + Duration::from_secs(5);
    let mut stream = loop {
        match std::net::TcpStream::connect(("127.0.0.1", port)) {
            Ok(stream) => break stream,
            Err(e) => {
                assert!(Instant::now() < give_up, "the fake never listened: {e}");
                std::thread::sleep(Duration::from_millis(5));
            }
        }
    };
    // Positive control: the timer does not run before the first fetch, so a fake that was only connected to
    // is still alive well after the delay.
    std::thread::sleep(Duration::from_millis(400));
    assert!(
        fake.child.try_wait().expect("try_wait").is_none(),
        "the fake exited before any fetch"
    );
    let fetched = Instant::now();
    stream
        .write_all(b"GET /api/v1/openapi.yaml HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n")
        .expect("write the request");
    let mut reply = Vec::new();
    stream.read_to_end(&mut reply).expect("read the reply");
    assert!(
        reply.starts_with(b"HTTP/1.1 200 OK"),
        "the document is served"
    );
    let status = loop {
        if let Some(status) = fake.child.try_wait().expect("try_wait") {
            break status;
        }
        assert!(
            fetched.elapsed() < Duration::from_secs(5),
            "the fake never crashed"
        );
        std::thread::sleep(Duration::from_millis(2));
    };
    assert!(
        fetched.elapsed() >= Duration::from_millis(150),
        "crashed after {:?}",
        fetched.elapsed()
    );
    assert_eq!(status.code(), Some(3));
    assert_no_panics();
}
