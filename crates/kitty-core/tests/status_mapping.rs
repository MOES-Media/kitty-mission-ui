//! FR-024, FR-013, FR-016, FR-021, NFR-005, NFR-006: the `ConnectionState` hint, checked against `port.ts` on disk,
//! and the `Core` facade over the fake service.

mod common;

use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use common::{
    assert_no_panics, fixture_json, fixtures_dir, gone, live_fakes_of, project, strings, wait_gone,
    wait_no_fakes, within, CoreRig, FixedDiscovery, ToggleDiscovery, Watcher,
};
use kitty_core::contract::{digest_of, Actual, ContractPin, Mismatch};
use kitty_core::discovery::{MissingReason, ServiceMissing};
use kitty_core::endpoint::ServiceEndpoint;
use kitty_core::status::{connection_state_hint, CoreStatus, DegradedReason, SupervisionState};
use kitty_core::{Core, ReadOutcome, ReadRequest, StartError, StreamOpenError, StreamScope};

const FAKE: &str = env!("CARGO_BIN_EXE_kitty-fake-service");

// ---- The hint table -----------------------------------------------------------------------------------------------

fn missing() -> DegradedReason {
    DegradedReason::ServiceMissing(ServiceMissing {
        reason: MissingReason::NotFound,
        detail: "x".to_owned(),
    })
}

fn mismatch() -> DegradedReason {
    let digest = digest_of(b"{}").expect("a digest");
    DegradedReason::ContractMismatch(Mismatch {
        expected: digest,
        actual: Actual::Status { status: 500 },
    })
}

fn status(state: SupervisionState, left: bool, degraded: DegradedReason) -> CoreStatus {
    CoreStatus {
        state,
        degraded,
        generation: 1,
        attempt: 0,
        left_initial_start: left,
    }
}

fn states() -> Vec<(&'static str, SupervisionState)> {
    vec![
        ("Starting", SupervisionState::Starting),
        (
            "Ready",
            SupervisionState::Ready {
                endpoint: ServiceEndpoint::loopback(4001),
            },
        ),
        ("Crashed", SupervisionState::Crashed),
        (
            "Backoff",
            SupervisionState::Backoff {
                delay: Duration::from_millis(500),
            },
        ),
        ("Stopped", SupervisionState::Stopped),
    ]
}

/// The whole table of `data-model.md`, written out row by row: `(state, left_initial_start, degraded, hint)`. The
/// rows the data model calls impossible are `None`.
fn expected_table() -> Vec<(&'static str, bool, &'static str, Option<&'static str>)> {
    let c = Some("connecting");
    let r = Some("reconnecting");
    let k = Some("connected");
    let m = Some("degraded: service-missing");
    let x = Some("degraded: contract-mismatch");
    vec![
        // Starting, Crashed, Backoff: connecting before the flag, reconnecting after it, only without a reason.
        ("Starting", false, "none", c),
        ("Starting", false, "missing", None),
        ("Starting", false, "mismatch", None),
        ("Starting", true, "none", r),
        ("Starting", true, "missing", None),
        ("Starting", true, "mismatch", None),
        ("Crashed", false, "none", c),
        ("Crashed", false, "missing", None),
        ("Crashed", false, "mismatch", None),
        ("Crashed", true, "none", r),
        ("Crashed", true, "missing", None),
        ("Crashed", true, "mismatch", None),
        ("Backoff", false, "none", c),
        ("Backoff", false, "missing", None),
        ("Backoff", false, "mismatch", None),
        ("Backoff", true, "none", r),
        ("Backoff", true, "missing", None),
        ("Backoff", true, "mismatch", None),
        // Ready: connected whatever the flag, only without a reason.
        ("Ready", false, "none", k),
        ("Ready", false, "missing", None),
        ("Ready", false, "mismatch", None),
        ("Ready", true, "none", k),
        ("Ready", true, "missing", None),
        ("Ready", true, "mismatch", None),
        // Stopped: degraded by its reason; a host stop (no reason) is None; before the flag it cannot occur.
        ("Stopped", false, "none", None),
        ("Stopped", false, "missing", None),
        ("Stopped", false, "mismatch", None),
        ("Stopped", true, "none", None),
        ("Stopped", true, "missing", m),
        ("Stopped", true, "mismatch", x),
    ]
}

fn degraded_named(name: &str) -> DegradedReason {
    match name {
        "none" => DegradedReason::None,
        "missing" => missing(),
        "mismatch" => mismatch(),
        other => panic!("unknown reason {other}"),
    }
}

#[test]
fn the_hint_is_total_over_the_status_space() {
    let table = expected_table();
    assert_eq!(table.len(), 5 * 2 * 3, "the table covers the whole space");
    let mut ran = 0;
    let mut seen = BTreeSet::new();
    for (name, state) in states() {
        for left in [false, true] {
            for reason in ["none", "missing", "mismatch"] {
                let expected = table
                    .iter()
                    .filter(|row| row.0 == name && row.1 == left && row.2 == reason)
                    .collect::<Vec<_>>();
                assert_eq!(expected.len(), 1, "one row for {name} {left} {reason}");
                let got =
                    connection_state_hint(&status(state.clone(), left, degraded_named(reason)));
                assert_eq!(got, expected[0].3, "{name} left={left} degraded={reason}");
                seen.insert((name, left, reason));
                ran += 1;
            }
        }
    }
    assert_eq!(ran, 30);
    assert_eq!(seen.len(), 30);
    let some = table.iter().filter(|row| row.3.is_some()).count();
    assert_eq!(some, 10, "ten combinations map to a string");
}

/// The five strings between the brackets of `CONNECTION_STATES`, read from the port file on disk.
fn port_strings() -> BTreeSet<String> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../packages/mission-shell/src/client/port.ts");
    let text = std::fs::read_to_string(&path).expect("read port.ts");
    let start = text
        .find("export const CONNECTION_STATES = [")
        .expect("CONNECTION_STATES is declared");
    let rest = &text[start + "export const CONNECTION_STATES = [".len()..];
    let list = &rest[..rest.find(']').expect("the list closes")];
    let strings: Vec<String> = list
        .split(',')
        .map(|item| item.trim().trim_matches('\'').to_owned())
        .filter(|item| !item.is_empty())
        .collect();
    assert_eq!(strings.len(), 5, "port.ts lists five connection states");
    strings.into_iter().collect()
}

#[test]
fn the_hint_strings_are_exactly_the_port_strings() {
    let from_port = port_strings();
    assert_eq!(from_port.len(), 5);
    let mut produced = BTreeSet::new();
    let mut ran = 0;
    for (_, state) in states() {
        for left in [false, true] {
            for reason in ["none", "missing", "mismatch"] {
                if let Some(hint) =
                    connection_state_hint(&status(state.clone(), left, degraded_named(reason)))
                {
                    produced.insert(hint.to_owned());
                }
                ran += 1;
            }
        }
    }
    assert_eq!(ran, 30);
    assert_eq!(produced, from_port);
}

#[test]
fn a_crash_before_the_first_ready_is_still_connecting_and_a_retry_never_goes_back() {
    // FS-04: Crashed before the first Ready.
    let crashed = status(SupervisionState::Crashed, false, DegradedReason::None);
    assert_eq!(connection_state_hint(&crashed), Some("connecting"));
    // After the flag is set, a Starting after retry() is reconnecting, not connecting.
    let restarted = status(SupervisionState::Starting, true, DegradedReason::None);
    assert_eq!(connection_state_hint(&restarted), Some("reconnecting"));
}

// ---- Core over the fake service -----------------------------------------------------------------------------------

fn fixed() -> Arc<FixedDiscovery> {
    Arc::new(FixedDiscovery(PathBuf::from(FAKE)))
}

fn start(rig: &CoreRig) -> (Core, Watcher) {
    let (core, subscription) = Core::start(rig.config(fixed())).expect("the core starts");
    (core, Watcher::new(subscription))
}

fn get_project() -> ReadRequest<'static> {
    ReadRequest {
        operation_id: "getProject",
        path: &[],
        query: &[],
    }
}

/// The request line a `getProject` read must produce, from the route table on disk.
fn get_project_line() -> String {
    let routes = fixture_json("routes");
    let entry = routes
        .as_array()
        .expect("routes array")
        .iter()
        .find(|r| r["operationId"] == "getProject")
        .expect("getProject is declared")
        .clone();
    format!(
        "GET /api/v1{} HTTP/1.1",
        entry["path"].as_str().expect("path")
    )
}

const CONTRACT_LINE: &str = "GET /api/v1/openapi.yaml HTTP/1.1";

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn the_initial_status_and_every_transition_arrive_in_order_once() {
    let rig = CoreRig::new(&["ready"], None);
    let (core, mut watcher) = start(&rig);
    assert_eq!(watcher.sequence(), strings(&["Starting g1 a0"]));
    assert_eq!(
        connection_state_hint(&watcher.seen[0]),
        Some("connecting"),
        "the initial status is connecting"
    );
    within(
        "ready",
        watcher.wait_for_nth("the service is ready", "Ready", 1),
    )
    .await;
    // Exactly the initial status and the one transition: the supervisor's own first `Starting` is not delivered twice.
    assert_eq!(
        watcher.sequence(),
        strings(&["Starting g1 a0", "Ready g1 a0"])
    );
    assert!(
        watcher.try_next().is_err(),
        "nothing else was published on the way"
    );
    let endpoint = core.ready_endpoint().expect("ready has an endpoint");
    assert_eq!(endpoint.generation(), 1);
    let argv = rig.launch(0)["argv"].clone();
    assert_eq!(
        argv[1],
        format!("--mission-status.port={}", endpoint.port()),
        "the endpoint is the port the service was launched on"
    );
    assert_eq!(connection_state_hint(&core.status()), Some("connected"));

    within("stop", core.stop()).await.expect("stop succeeds");
    watcher.wait_for_nth("stopped", "Stopped", 1).await;
    assert_eq!(
        watcher.sequence(),
        strings(&["Starting g1 a0", "Ready g1 a0", "Stopped g1 a0"])
    );
    assert_eq!(core.ready_endpoint(), None);
    assert_eq!(connection_state_hint(&core.status()), None);
    let output = String::from_utf8(core.captured_output()).expect("UTF-8 output");
    assert!(output.contains("mode ready"), "captured output: {output:?}");
    wait_gone("the service", rig.launch_pid(0), Duration::from_secs(1)).await;
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn subscribe_gives_the_current_status_and_then_every_later_one() {
    let rig = CoreRig::new(&["ready"], None);
    let (core, mut first) = start(&rig);
    within("ready", first.wait_for_nth("ready", "Ready", 1)).await;
    let mut late = Watcher::new(core.subscribe());
    assert_eq!(late.sequence(), strings(&["Ready g1 a0"]));
    rig.crash_now();
    within("crash", late.wait_for_nth("crashed", "Crashed", 1)).await;
    // The late subscriber sees the current status once, then the next transition: no gap and no duplicate.
    assert_eq!(late.sequence(), strings(&["Ready g1 a0", "Crashed g1 a0"]));
    within("restart", first.wait_for_nth("restarted", "Ready", 2)).await;
    assert_eq!(
        first.sequence(),
        strings(&[
            "Starting g1 a0",
            "Ready g1 a0",
            "Crashed g1 a0",
            "Backoff(500ms) g1 a0",
            "Starting g2 a0",
            "Ready g2 a0",
        ])
    );
    assert_eq!(
        first
            .seen
            .iter()
            .map(connection_state_hint)
            .collect::<Vec<_>>(),
        vec![
            Some("connecting"),
            Some("connected"),
            Some("reconnecting"),
            Some("reconnecting"),
            Some("reconnecting"),
            Some("connected"),
        ]
    );
    within("stop", core.stop()).await.expect("stop succeeds");
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_slow_receiver_gets_lagged_and_can_ask_for_the_status() {
    let rig = CoreRig::new(&["ready"], None);
    let discovery = ToggleDiscovery::new(PathBuf::from(FAKE), false);
    let (core, subscription) = Core::start(rig.config(discovery.clone())).expect("starts");
    let mut slow = subscription.receiver;
    let mut fast = Watcher::new(core.subscribe());
    let stopped = |seen: &[CoreStatus]| {
        seen.iter()
            .filter(|s| matches!(s.state, SupervisionState::Stopped))
            .count()
    };
    within(
        "first stop",
        fast.wait_for("not found", |seen| stopped(seen) >= 1),
    )
    .await;
    // 70 retries, each failing discovery again, each publishing a `Stopped`: 71 messages for a capacity of 64.
    let mut sent = 0;
    for _ in 0..70 {
        core.retry();
        sent += 1;
    }
    assert_eq!(sent, 70);
    within(
        "all published",
        fast.wait_for("71 stopped statuses", |seen| stopped(seen) == 71),
    )
    .await;
    assert_eq!(discovery.calls(), 71);
    let lagged = slow.try_recv();
    assert_eq!(
        lagged,
        Err(tokio::sync::broadcast::error::TryRecvError::Lagged(71 - 64)),
        "the slow receiver is told how many it missed"
    );
    let current = core.status();
    assert!(matches!(current.state, SupervisionState::Stopped));
    assert_eq!(current, *fast.seen.last().expect("a last status"));
    // After the Lagged notice the receiver continues with the oldest message still in the channel: 64 of them.
    let mut remaining = 0;
    while slow.try_recv().is_ok() {
        remaining += 1;
    }
    assert_eq!(remaining, 64);
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_modified_contract_gives_contract_mismatch_and_sends_nothing_more() {
    let rig = CoreRig::new(&["serve-modified"], None);
    let (core, mut watcher) = start(&rig);
    within("mismatch", watcher.wait_for_nth("stopped", "Stopped", 1)).await;
    assert_eq!(
        watcher.sequence(),
        strings(&["Starting g1 a0", "Stopped g1 a0 [mismatch]"])
    );
    let status = core.status();
    let DegradedReason::ContractMismatch(mismatch) = status.degraded.clone() else {
        panic!("expected a contract mismatch, got {status:?}");
    };
    let bundle = std::fs::read(fixtures_dir().join("mission-status.openapi.json")).expect("bundle");
    assert_eq!(mismatch.expected, digest_of(&bundle).expect("digest"));
    assert!(matches!(mismatch.actual, Actual::Digest(d) if d != mismatch.expected));
    assert_eq!(
        connection_state_hint(&status),
        Some("degraded: contract-mismatch")
    );
    assert_eq!(core.ready_endpoint(), None);

    // A read is a contract mismatch, not a transport error.
    let read = within("read", core.read(&get_project())).await;
    assert_eq!(read, ReadOutcome::ContractMismatch(mismatch.clone()));
    // So is a stream.
    let stream = within("stream", core.open_stream(StreamScope::All)).await;
    match stream {
        Err(StreamOpenError::ContractMismatch(m)) => assert_eq!(m, mismatch),
        other => panic!("expected a contract mismatch, got {other:?}"),
    }
    // The only request the service ever saw is the contract fetch (and the log works: the fetch is in it).
    assert_eq!(rig.requests(), vec![CONTRACT_LINE.to_owned()]);
    // The group is gone.
    let pid = rig.launch_pid(0);
    wait_gone("the service", pid, Duration::from_secs(1)).await;
    wait_no_fakes("the fakes", &rig.root, Duration::from_secs(1)).await;
    assert_eq!(live_fakes_of(&rig.root), Vec::<i32>::new());
    within("stop", core.stop()).await.expect("stop succeeds");
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn reads_and_streams_before_ready_are_not_ready_and_send_nothing() {
    // `serve-503` binds and answers 503: the supervisor keeps polling, so the status stays `Starting`.
    let rig = CoreRig::new(&["serve-503"], None);
    let (core, watcher) = start(&rig);
    within("first poll", async {
        while rig.requests().is_empty() {
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
    })
    .await;
    let status = core.status();
    assert_eq!(project(&status), "Starting g1 a0");
    let read = within("read", core.read(&get_project())).await;
    assert_eq!(read, ReadOutcome::NotReady(status.clone()));
    let stream = within("stream", core.open_stream(StreamScope::All)).await;
    match stream {
        Err(StreamOpenError::NotReady(s)) => assert_eq!(s, status),
        other => panic!("expected NotReady, got {other:?}"),
    }
    // Everything the service saw is a poll of the contract document: the log works, and the read is not in it.
    let requests = rig.requests();
    assert!(!requests.is_empty());
    assert!(
        requests.iter().all(|line| line == CONTRACT_LINE),
        "requests: {requests:?}"
    );
    assert_eq!(watcher.sequence(), strings(&["Starting g1 a0"]));
    drop(core);
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn once_ready_a_read_is_sent_exactly_once() {
    let rig = CoreRig::new(&["ready"], None);
    let (core, mut watcher) = start(&rig);
    within("ready", watcher.wait_for_nth("ready", "Ready", 1)).await;
    assert_eq!(rig.requests(), vec![CONTRACT_LINE.to_owned()]);
    let read = within("read", core.read(&get_project())).await;
    // The fake serves only the contract document, so the relayed answer is its 404.
    match read {
        ReadOutcome::Answer { status, .. } => assert_eq!(status, 404),
        other => panic!("expected the relayed answer, got {other:?}"),
    }
    assert_eq!(
        rig.requests(),
        vec![CONTRACT_LINE.to_owned(), get_project_line()],
        "exactly one more request, for the read"
    );
    within("stop", core.stop()).await.expect("stop succeeds");
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn dropping_the_last_clone_kills_the_group_without_a_grace_period() {
    // A service that ignores SIGTERM and a long grace period: only an immediate SIGKILL ends it within a second.
    let mut rig = CoreRig::new(&["ignore-term"], None);
    rig.timings.stop_grace = Duration::from_secs(5);
    let (core, mut watcher) = start(&rig);
    within("ready", watcher.wait_for_nth("ready", "Ready", 1)).await;
    let pid = rig.launch_pid(0);
    let clone = core.clone();
    drop(clone);
    // A non-last clone does not touch the service.
    assert!(!gone(pid), "the service runs after a clone was dropped");
    assert_eq!(project(&core.status()), "Ready g1 a0");
    drop(core);
    wait_gone("the service", pid, Duration::from_secs(1)).await;
    wait_no_fakes("the fakes", &rig.root, Duration::from_secs(1)).await;
    assert_no_panics();
}

#[test]
fn starting_outside_a_runtime_is_an_error_not_a_panic() {
    let rig = CoreRig::new(&["ready"], None);
    let discovery = ToggleDiscovery::new(PathBuf::from(FAKE), false);
    let refused = Core::start(rig.config(discovery.clone()));
    assert!(matches!(refused, Err(StartError::NoRuntime)));
    assert_eq!(discovery.calls(), 0, "nothing ran");
    // Positive control: with a runtime handle in the config it starts, outside any runtime context.
    let runtime = tokio::runtime::Runtime::new().expect("runtime");
    let mut config = rig.config(discovery.clone());
    config.runtime = Some(runtime.handle().clone());
    let (core, subscription) = Core::start(config).expect("starts with a handle");
    let mut watcher = Watcher::new(subscription);
    runtime.block_on(async {
        within("not found", watcher.wait_for_nth("stopped", "Stopped", 1)).await
    });
    assert_eq!(
        watcher.sequence(),
        strings(&["Starting g1 a0", "Stopped g1 a0 [missing:NotFound]"])
    );
    assert_eq!(discovery.calls(), 1);
    drop(core);
    drop(runtime);
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn an_unreadable_pin_is_a_contract_mismatch_and_nothing_is_launched() {
    let rig = CoreRig::new(&["ready"], None);
    let broken = ContractPin::from_document(b"{: [unclosed".to_vec());
    assert!(
        broken.digest().is_err(),
        "positive control: the pin is broken"
    );
    let discovery = ToggleDiscovery::new(PathBuf::from(FAKE), true);
    let mut config = rig.config(discovery.clone());
    config.contract = broken;
    let (core, subscription) = Core::start(config).expect("starts");
    let mut watcher = Watcher::new(subscription);
    assert_eq!(
        watcher.sequence(),
        strings(&["Stopped g1 a0 [mismatch]"]),
        "the first and only status"
    );
    let status = core.status();
    assert!(status.left_initial_start);
    assert_eq!(
        connection_state_hint(&status),
        Some("degraded: contract-mismatch")
    );
    // Reads and streams answer with the mismatch.
    assert!(matches!(
        within("read", core.read(&get_project())).await,
        ReadOutcome::ContractMismatch(_)
    ));
    assert!(matches!(
        within("stream", core.open_stream(StreamScope::All)).await,
        Err(StreamOpenError::ContractMismatch(_))
    ));
    // retry() and stop() are harmless, and publish nothing.
    core.retry();
    within("stop", core.stop()).await.expect("stop succeeds");
    assert!(watcher.try_next().is_err());
    // Nothing was launched: discovery never ran, there is no launch record or count, and no process of this root.
    assert_eq!(discovery.calls(), 0);
    assert!(!rig.launch_exists(0));
    assert!(!rig.root.join("kitty-fake-service.count").exists());
    assert_eq!(live_fakes_of(&rig.root), Vec::<i32>::new());
    // Positive control: the same rig with the embedded pin launches the service.
    let (second, mut second_watcher) = start(&rig);
    within("ready", second_watcher.wait_for_nth("ready", "Ready", 1)).await;
    assert!(rig.launch_exists(0));
    assert_eq!(
        std::fs::read_to_string(rig.root.join("kitty-fake-service.count")).expect("count"),
        "1"
    );
    within("stop", second.stop()).await.expect("stop succeeds");
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn retry_runs_discovery_again_and_starts_the_next_generation() {
    let rig = CoreRig::new(&["ready"], None);
    let discovery = ToggleDiscovery::new(PathBuf::from(FAKE), false);
    let (core, subscription) = Core::start(rig.config(discovery.clone())).expect("starts");
    let mut watcher = Watcher::new(subscription);
    within("not found", watcher.wait_for_nth("stopped", "Stopped", 1)).await;
    assert_eq!(
        watcher.sequence(),
        strings(&["Starting g1 a0", "Stopped g1 a0 [missing:NotFound]"])
    );
    assert_eq!(
        connection_state_hint(&core.status()),
        Some("degraded: service-missing")
    );
    assert_eq!(discovery.calls(), 1);
    discovery.set_found(true);
    core.retry();
    within("ready", watcher.wait_for_nth("ready", "Ready", 1)).await;
    assert_eq!(discovery.calls(), 2, "discovery ran again");
    assert_eq!(
        watcher.sequence(),
        strings(&[
            "Starting g1 a0",
            "Stopped g1 a0 [missing:NotFound]",
            "Starting g2 a0",
            "Ready g2 a0",
        ])
    );
    // The port never goes back to `connecting`: Starting after a retry is `reconnecting`.
    assert_eq!(
        connection_state_hint(&watcher.seen[2]),
        Some("reconnecting")
    );
    assert_eq!(core.ready_endpoint().expect("endpoint").generation(), 2);
    within("stop", core.stop()).await.expect("stop succeeds");
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn retry_after_giving_up_starts_with_an_empty_crash_window() {
    let rig = CoreRig::new(&["ready"], None);
    let (core, mut watcher) = start(&rig);
    for nth in 1..=5 {
        within("ready", watcher.wait_for_nth("ready", "Ready", nth)).await;
        rig.crash_now();
    }
    within("gave up", watcher.wait_for_nth("stopped", "Stopped", 1)).await;
    assert_eq!(
        watcher.seen.last().map(project).as_deref(),
        Some("Stopped g5 a0 [missing:Crashing]")
    );
    assert_eq!(
        rig.sleeper.log(),
        vec![
            Duration::from_millis(500),
            Duration::from_secs(1),
            Duration::from_secs(2),
            Duration::from_secs(4)
        ]
    );
    core.retry();
    within("ready again", watcher.wait_for_nth("ready", "Ready", 6)).await;
    assert_eq!(
        watcher.seen[watcher.seen.len() - 2..]
            .iter()
            .map(project)
            .collect::<Vec<_>>(),
        strings(&["Starting g6 a0", "Ready g6 a0"])
    );
    // The next crash is the first of a fresh window: a 0.5 s backoff, not a give-up.
    rig.crash_now();
    within("backoff", watcher.wait_for_nth("backoff", "Backoff", 5)).await;
    within("restarted", watcher.wait_for_nth("ready", "Ready", 7)).await;
    let tail: Vec<String> = watcher.sequence().split_off(20);
    assert_eq!(
        tail,
        strings(&[
            "Starting g6 a0",
            "Ready g6 a0",
            "Crashed g6 a0",
            "Backoff(500ms) g6 a0",
            "Starting g7 a0",
            "Ready g7 a0",
        ])
    );
    assert_eq!(rig.sleeper.log().last(), Some(&Duration::from_millis(500)));
    assert_eq!(rig.sleeper.log().len(), 5);
    within("stop", core.stop()).await.expect("stop succeeds");
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn retry_outside_stopped_changes_nothing() {
    // While Ready.
    let rig = CoreRig::new(&["ready"], None);
    let (core, mut watcher) = start(&rig);
    within("ready", watcher.wait_for_nth("ready", "Ready", 1)).await;
    core.retry();
    // stop() is processed after the retry, in order: whatever the retry did is published before the Stopped.
    within("stop", core.stop()).await.expect("stop succeeds");
    watcher.wait_for_nth("stopped", "Stopped", 1).await;
    assert_eq!(
        watcher.sequence(),
        strings(&["Starting g1 a0", "Ready g1 a0", "Stopped g1 a0"])
    );
    assert_eq!(core.status().generation, 1);
    assert_eq!(rig.sleeper.log(), Vec::<Duration>::new());

    // While in Backoff: the delay is an hour of real time, so the state lasts until the test ends it.
    let mut rig = CoreRig::new(&["ready"], None);
    rig.real_sleeper = true;
    rig.policy.delays = [Duration::from_secs(3600); 4];
    let (core, mut watcher) = start(&rig);
    within("ready", watcher.wait_for_nth("ready", "Ready", 1)).await;
    rig.crash_now();
    within("backoff", watcher.wait_for_nth("backoff", "Backoff", 1)).await;
    core.retry();
    within("stop", core.stop()).await.expect("stop succeeds");
    watcher.wait_for_nth("stopped", "Stopped", 1).await;
    assert_eq!(
        watcher.sequence(),
        strings(&[
            "Starting g1 a0",
            "Ready g1 a0",
            "Crashed g1 a0",
            "Backoff(3600000ms) g1 a0",
            "Stopped g1 a0",
        ])
    );
    // Positive control: from Stopped a retry does start again.
    core.retry();
    within("restarted", watcher.wait_for_nth("ready", "Ready", 2)).await;
    assert_eq!(
        watcher.seen.last().map(project).as_deref(),
        Some("Ready g2 a0")
    );
    within("stop", core.stop()).await.expect("stop succeeds");
    assert_no_panics();
}
