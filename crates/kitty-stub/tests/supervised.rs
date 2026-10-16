//! Decision 01M50M47K1PNKP9KHCGGDBQZ0A, A-07: `kitty-core` supervises the real `kitty-stub` binary as a stand-in for
//! the Mission Status service. Cargo hands `CARGO_BIN_EXE_kitty-stub` only to this package's tests, so the proof
//! lives here, with `kitty-core` as a dev-dependency.
//!
//! The oracles (`examples.json`, `routes.json`, `changes.json`) are read from `contracts/fixtures/` on disk, never
//! from the stub.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Once};
use std::time::Duration;

use kitty_core::discovery::{Discovery, ServiceMissing};
use kitty_core::{
    ContractPin, Core, CoreConfig, LoopbackPortPicker, MonotonicClock, ReadOutcome, ReadRequest,
    RestartPolicy, StreamEvent, StreamScope, SupervisionState, Timings, TokioSleeper,
};
use serde_json::Value;

const STUB: &str = env!("CARGO_BIN_EXE_kitty-stub");
const MISSION_ID: &str = "01JZAB3C4D5E6F7G8H9JKMNPQR";
const DEADLINE: Duration = Duration::from_secs(15);

// ---- The panic counter (a deliberate copy of kitty-core's tests/common; it cannot be shared across packages) ------

fn panic_counter() -> &'static AtomicUsize {
    static COUNT: AtomicUsize = AtomicUsize::new(0);
    static INSTALL: Once = Once::new();
    INSTALL.call_once(|| {
        let previous = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            COUNT.fetch_add(1, Ordering::SeqCst);
            previous(info);
        }));
    });
    &COUNT
}

fn assert_no_panics() {
    let seen = panic_counter().load(Ordering::SeqCst);
    assert_eq!(seen, 0, "{seen} panic(s) seen in this test process");
}

// ---- Helpers -----------------------------------------------------------------------------------------------------

fn oracle(name: &str) -> Value {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../contracts/fixtures")
        .join(format!("mission-status.{name}.json"));
    let text =
        std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
    serde_json::from_str(&text).expect("fixture file is JSON")
}

struct StubDiscovery;

impl Discovery for StubDiscovery {
    fn locate(&self) -> Result<PathBuf, ServiceMissing> {
        Ok(PathBuf::from(STUB))
    }
}

/// A scratch project root with no `.kitty-stub/fixtures`, removed on drop.
struct Scratch(PathBuf);

impl Scratch {
    fn new() -> Self {
        let dir =
            std::env::temp_dir().join(format!("kitty-stub-supervised-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("create the scratch root");
        Scratch(std::fs::canonicalize(&dir).expect("canonical scratch root"))
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// The pids of the `kitty-stub` processes launched for exactly this project root (`--...project-root=<root>`).
#[cfg(target_os = "linux")]
fn live_stubs_of(root: &Path) -> Vec<i32> {
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
            String::from_utf8_lossy(arg)
                .strip_suffix(&needle)
                .is_some_and(|flag| flag.starts_with("--") && flag.ends_with('='))
        });
        let stub = cmdline
            .split(|b| *b == 0)
            .next()
            .is_some_and(|argv0| String::from_utf8_lossy(argv0).ends_with("kitty-stub"));
        if ours && stub {
            pids.push(pid);
        }
    }
    pids
}

fn config(root: &Scratch) -> CoreConfig {
    CoreConfig {
        project_root: root.0.clone(),
        discovery: Arc::new(StubDiscovery),
        contract: ContractPin::embedded(),
        timings: Timings {
            poll_interval: Duration::from_millis(10),
            start_timeout: Duration::from_secs(10),
            stop_grace: Duration::from_secs(2),
            read_timeout: Duration::from_secs(5),
            // The stub spaces its scripted changes 250 ms apart: an idle limit above that (FS-09).
            idle_limit: Duration::from_secs(2),
        },
        policy: RestartPolicy::default(),
        ports: Arc::new(LoopbackPortPicker),
        clock: Arc::new(MonotonicClock),
        sleeper: Arc::new(TokioSleeper),
        runtime: None,
        env_passthrough: Vec::new(),
    }
}

async fn within<T>(what: &str, fut: impl std::future::Future<Output = T>) -> T {
    let _ = panic_counter();
    match tokio::time::timeout(DEADLINE, fut).await {
        Ok(value) => value,
        Err(_) => panic!("{what}: no result within {DEADLINE:?}"),
    }
}

// ---- The scenario ------------------------------------------------------------------------------------------------

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn core_supervises_the_real_stub_end_to_end() {
    let scratch = Scratch::new();
    let (core, subscription) = Core::start(config(&scratch)).expect("the core starts");
    let mut receiver = subscription.receiver;
    let mut state = subscription.initial.state;

    // The state reaches Ready: the stub serves the pinned bundle, so the digest matches.
    within("ready", async {
        while !matches!(state, SupervisionState::Ready { .. }) {
            state = receiver.recv().await.expect("a status").state;
        }
    })
    .await;
    let endpoint = core.ready_endpoint().expect("a ready endpoint");
    // Ephemeral ports can be busy (a retry takes the next generation), so the generation is only known to be >= 1.
    assert!(
        endpoint.generation() >= 1,
        "generation {}",
        endpoint.generation()
    );
    #[cfg(target_os = "linux")]
    assert_eq!(
        live_stubs_of(&scratch.0).len(),
        1,
        "positive control: one stub of this root runs"
    );

    // One read through Core: 200 with the default example of getProject.
    let routes = oracle("routes");
    let route = routes
        .as_array()
        .expect("routes array")
        .iter()
        .find(|r| r["operationId"] == "getProject")
        .expect("getProject is declared");
    let key = route["defaultExample"].as_str().expect("a default example");
    let expected = oracle("examples")[key]["value"].clone();
    let outcome = within(
        "read",
        core.read(&ReadRequest {
            operation_id: "getProject",
            path: &[],
            query: &[],
        }),
    )
    .await;
    match outcome {
        ReadOutcome::Answer {
            status,
            content_type,
            body,
        } => {
            assert_eq!(status, 200);
            assert_eq!(
                content_type.as_ref().map(|v| v.to_str().expect("ASCII")),
                Some("application/json")
            );
            let served: Value = serde_json::from_slice(&body).expect("the body is JSON");
            assert_eq!(served, expected);
        }
        other => panic!("expected the stub's answer, got {other:?}"),
    }

    // A scoped stream through Core: the scripted changes, in order.
    let changes = oracle("changes");
    let items = changes["items"].as_array().expect("changes items");
    assert_eq!(items.len(), 5, "the stub scripts five changes");
    assert_eq!(changes["missionId"], MISSION_ID);
    let mut stream = within(
        "open",
        core.open_stream(StreamScope::Mission {
            mission_id: MISSION_ID.to_owned(),
            cursor: None,
        }),
    )
    .await
    .expect("the stream opens");
    let mut received = 0;
    for item in items {
        let event = within("next change", stream.next())
            .await
            .expect("the stream delivers");
        match event {
            StreamEvent::Change(change) => {
                assert_eq!(change.event, item["event"].as_str().expect("event"));
                assert_eq!(change.cursor.as_deref(), item["scopedId"].as_str());
                let data: Value = serde_json::from_slice(&change.data).expect("data is JSON");
                assert_eq!(data, item["data"]);
            }
            other => panic!("expected a change, got {other:?}"),
        }
        received += 1;
    }
    assert_eq!(received, 5);
    drop(stream);

    // stop() succeeds, and the stub is gone.
    within("stop", core.stop()).await.expect("stop succeeds");
    assert!(
        matches!(core.status().state, SupervisionState::Stopped),
        "stopped"
    );
    #[cfg(target_os = "linux")]
    assert_eq!(live_stubs_of(&scratch.0), Vec::<i32>::new());
    #[cfg(not(target_os = "linux"))]
    assert!(
        std::net::TcpStream::connect(("127.0.0.1", endpoint.port())).is_err(),
        "the stub no longer listens"
    );
    assert_no_panics();
}
