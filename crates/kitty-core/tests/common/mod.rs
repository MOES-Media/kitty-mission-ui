//! The shared harness of every kitty-core integration test (IC-04): the in-process stub, the raw-TCP fake with its
//! request log, the panic counter, scratch directories and the fake-service scenario writer.
//!
//! Rules this module keeps for its users: every wait here has a deadline, every spawned task is aborted when its
//! guard drops, and scratch directories are removed on drop, so a failing test leaves nothing behind.
#![allow(dead_code)]

use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, Once};
use std::time::Duration;

use kitty_core::client::Timings;
use kitty_core::endpoint::ServiceEndpoint;
use kitty_stub::{app, run_server, Fixtures, Options, Selection};
use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::task::{JoinHandle, JoinSet};

/// A wait that exceeds this fails the test by name instead of hanging.
pub const HARNESS_DEADLINE: Duration = Duration::from_secs(10);

/// A mission id the tests use where the value does not matter.
pub const MISSION_ID: &str = "01JZAB3C4D5E6F7G8H9JKMNPQR";

/// `Timings` for tests: the test column of plan IC-08.
pub fn test_timings() -> Timings {
    Timings {
        poll_interval: Duration::from_millis(10),
        start_timeout: Duration::from_secs(2),
        stop_grace: Duration::from_millis(300),
        read_timeout: Duration::from_secs(1),
        idle_limit: Duration::from_millis(300),
    }
}

/// Runs `fut` and fails with `what` if it takes longer than [`HARNESS_DEADLINE`].
pub async fn within<T>(what: &str, fut: impl Future<Output = T>) -> T {
    let _ = panic_counter();
    match tokio::time::timeout(HARNESS_DEADLINE, fut).await {
        Ok(value) => value,
        Err(_) => panic!("{what}: no result within {HARNESS_DEADLINE:?}"),
    }
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

// ---- Fixture files --------------------------------------------------------------------------------------------

pub fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/fixtures")
}

fn read_fixture_file(name: &str) -> Vec<u8> {
    let path = fixtures_dir().join(name);
    std::fs::read(&path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()))
}

/// One of the four fixture JSON files, parsed straight from disk.
pub fn fixture_json(name: &str) -> Value {
    let bytes = read_fixture_file(&format!("mission-status.{name}.json"));
    serde_json::from_slice(&bytes).unwrap_or_else(|e| panic!("{name} is JSON: {e}"))
}

// ---- The in-process stub --------------------------------------------------------------------------------------

pub struct FixtureValues {
    pub routes: Value,
    pub examples: Value,
    pub fixtures: Value,
    pub changes: Value,
}

pub enum Doc {
    /// The committed bundle, `contracts/fixtures/mission-status.openapi.json`.
    Pinned,
    Bytes(Vec<u8>),
    /// The stub answers 404 `no-openapi-document`.
    Absent,
}

/// A change applied to the fixture values before the stub is built.
pub type Patch = Box<dyn FnOnce(&mut FixtureValues)>;

pub struct StubSpec {
    pub patch: Option<Patch>,
    pub document: Doc,
    pub selections: Vec<(String, Selection)>,
    /// `port` is replaced by the bound port.
    pub options: Options,
}

impl Default for StubSpec {
    fn default() -> Self {
        Self {
            patch: None,
            document: Doc::Pinned,
            selections: Vec::new(),
            options: Options {
                port: 0,
                heartbeat: Duration::from_millis(50),
                time_scale: 0.0,
            },
        }
    }
}

pub struct RunningStub {
    pub port: u16,
    pub endpoint: ServiceEndpoint,
    task: JoinHandle<()>,
}

impl Drop for RunningStub {
    fn drop(&mut self) {
        self.task.abort();
    }
}

/// Starts the stub in this process on `127.0.0.1:0`.
pub async fn stub(spec: StubSpec) -> RunningStub {
    let _ = panic_counter();
    let mut values = FixtureValues {
        routes: fixture_json("routes"),
        examples: fixture_json("examples"),
        fixtures: fixture_json("fixtures"),
        changes: fixture_json("changes"),
    };
    if let Some(patch) = spec.patch {
        patch(&mut values);
    }
    let mut fixtures = Fixtures::from_values(
        values.routes,
        values.examples,
        values.fixtures,
        values.changes,
    )
    .expect("fixtures build");
    match spec.document {
        Doc::Pinned => {
            let bytes = read_fixture_file("mission-status.openapi.json");
            fixtures = fixtures.with_openapi_document(bytes.into());
        }
        Doc::Bytes(bytes) => fixtures = fixtures.with_openapi_document(bytes.into()),
        Doc::Absent => {}
    }
    let fixtures = fixtures
        .with_selections(spec.selections)
        .expect("selections apply");
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind stub");
    let port = listener.local_addr().expect("stub address").port();
    let mut options = spec.options;
    options.port = port;
    let router = app(fixtures, options);
    let task = tokio::spawn(async move {
        let _ = run_server(listener, router, Duration::from_secs(5)).await;
    });
    RunningStub {
        port,
        endpoint: ServiceEndpoint::loopback(port),
        task,
    }
}

/// `GET /__stub/last-request` as JSON.
pub async fn last_request(stub: &RunningStub) -> Value {
    let reply = raw_get(stub.port, "/__stub/last-request", &host_of(stub.port)).await;
    assert_eq!(reply.status, 200, "last-request answers 200");
    serde_json::from_slice(&reply.body).expect("last-request is JSON")
}

pub fn host_of(port: u16) -> String {
    format!("127.0.0.1:{port}")
}

// ---- A raw-TCP client (the oracle's own request writer) ----------------------------------------------------------

pub struct RawReply {
    pub status: u16,
    /// Lower-case names.
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl RawReply {
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(n, _)| n == name)
            .map(|(_, v)| v.as_str())
    }
}

/// One `GET` written by hand with exactly the given `Host` and `Connection: close`, read until the peer closes.
pub async fn raw_get(port: u16, target: &str, host: &str) -> RawReply {
    within("raw_get", async {
        let mut stream = TcpStream::connect(("127.0.0.1", port))
            .await
            .expect("raw_get connects");
        let request = format!("GET {target} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n");
        stream
            .write_all(request.as_bytes())
            .await
            .expect("raw_get writes");
        let mut raw = Vec::new();
        stream.read_to_end(&mut raw).await.expect("raw_get reads");
        parse_reply(&raw)
    })
    .await
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

fn parse_reply(raw: &[u8]) -> RawReply {
    let split = find(raw, b"\r\n\r\n").expect("reply has a head");
    let head = std::str::from_utf8(&raw[..split]).expect("head is UTF-8");
    let mut lines = head.split("\r\n");
    let status = lines
        .next()
        .and_then(|l| l.split(' ').nth(1))
        .and_then(|s| s.parse().ok())
        .expect("status line");
    let headers: Vec<(String, String)> = lines
        .filter_map(|l| l.split_once(':'))
        .map(|(n, v)| (n.trim().to_ascii_lowercase(), v.trim().to_owned()))
        .collect();
    let rest = &raw[split + 4..];
    let chunked = headers
        .iter()
        .any(|(n, v)| n == "transfer-encoding" && v.eq_ignore_ascii_case("chunked"));
    let body = if chunked {
        dechunk(rest)
    } else {
        rest.to_vec()
    };
    RawReply {
        status,
        headers,
        body,
    }
}

fn dechunk(mut rest: &[u8]) -> Vec<u8> {
    let mut body = Vec::new();
    loop {
        let eol = find(rest, b"\r\n").expect("chunk size line");
        let size = usize::from_str_radix(std::str::from_utf8(&rest[..eol]).unwrap().trim(), 16)
            .expect("chunk size");
        rest = &rest[eol + 2..];
        if size == 0 {
            return body;
        }
        body.extend_from_slice(&rest[..size]);
        rest = &rest[size + 2..];
    }
}

// ---- The raw-TCP fake -----------------------------------------------------------------------------------------

/// One step of a scripted reply. Every connection runs the whole script, in order, after its request head was read.
pub enum Step {
    Write(Vec<u8>),
    Sleep(Duration),
    /// Hold the connection open and silent until the fake is dropped.
    Stall,
    /// Close the connection at once.
    Drop,
    /// Write this chunk over and over until the peer goes away.
    Endless(Vec<u8>),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestHead {
    pub method: String,
    /// With the query.
    pub target: String,
    /// Lower-case names, in arrival order.
    pub headers: Vec<(String, String)>,
}

pub struct RawFake {
    pub port: u16,
    pub endpoint: ServiceEndpoint,
    pub log: Arc<Mutex<Vec<RequestHead>>>,
    task: JoinHandle<()>,
}

impl RawFake {
    pub fn requests(&self) -> Vec<RequestHead> {
        lock(&self.log).clone()
    }
}

impl Drop for RawFake {
    fn drop(&mut self) {
        // Aborting the accept loop drops its `JoinSet`, which aborts every connection task.
        self.task.abort();
    }
}

/// A complete `200` reply with a `Content-Length` body.
pub fn http_ok(content_type: &str, body: &[u8]) -> Vec<u8> {
    let mut reply = format!(
        "HTTP/1.1 200 OK\r\ncontent-type: {content_type}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
        body.len()
    )
    .into_bytes();
    reply.extend_from_slice(body);
    reply
}

/// A reply head with no length: the body runs until the connection closes.
pub fn http_stream_head(content_type: &str) -> Vec<u8> {
    format!("HTTP/1.1 200 OK\r\ncontent-type: {content_type}\r\nconnection: close\r\n\r\n")
        .into_bytes()
}

/// Listens on `127.0.0.1:0`; one scripted reply per connection; every request head goes to `log`.
pub async fn raw_fake(script: Vec<Step>) -> RawFake {
    let _ = panic_counter();
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind fake");
    let port = listener.local_addr().expect("fake address").port();
    let log = Arc::new(Mutex::new(Vec::new()));
    let script = Arc::new(script);
    let task_log = log.clone();
    let task = tokio::spawn(async move {
        let mut connections = JoinSet::new();
        loop {
            let Ok((stream, _)) = listener.accept().await else {
                return;
            };
            connections.spawn(serve_scripted(stream, script.clone(), task_log.clone()));
            while connections.try_join_next().is_some() {}
        }
    });
    RawFake {
        port,
        endpoint: ServiceEndpoint::loopback(port),
        log,
        task,
    }
}

async fn read_head(stream: &mut TcpStream) -> Option<RequestHead> {
    let mut raw = Vec::new();
    let mut buf = [0u8; 1024];
    // A peer that never finishes its head is dropped after the deadline.
    let read = tokio::time::timeout(HARNESS_DEADLINE, async {
        while find(&raw, b"\r\n\r\n").is_none() {
            let n = stream.read(&mut buf).await.ok()?;
            if n == 0 {
                return None;
            }
            raw.extend_from_slice(&buf[..n]);
        }
        Some(())
    })
    .await;
    read.ok()??;
    let split = find(&raw, b"\r\n\r\n")?;
    let head = String::from_utf8_lossy(&raw[..split]).into_owned();
    let mut lines = head.split("\r\n");
    let mut first = lines.next()?.split(' ');
    let method = first.next()?.to_owned();
    let target = first.next()?.to_owned();
    let headers = lines
        .filter_map(|l| l.split_once(':'))
        .map(|(n, v)| (n.trim().to_ascii_lowercase(), v.trim().to_owned()))
        .collect();
    Some(RequestHead {
        method,
        target,
        headers,
    })
}

async fn serve_scripted(
    mut stream: TcpStream,
    script: Arc<Vec<Step>>,
    log: Arc<Mutex<Vec<RequestHead>>>,
) {
    let Some(head) = read_head(&mut stream).await else {
        return;
    };
    lock(&log).push(head);
    for step in script.iter() {
        match step {
            Step::Write(bytes) => {
                if stream.write_all(bytes).await.is_err() {
                    return;
                }
            }
            Step::Sleep(d) => tokio::time::sleep(*d).await,
            Step::Stall => std::future::pending::<()>().await,
            Step::Drop => return,
            Step::Endless(chunk) => loop {
                if stream.write_all(chunk).await.is_err() {
                    return;
                }
                tokio::task::yield_now().await;
            },
        }
    }
    let _ = stream.shutdown().await;
}

// ---- The panic counter ----------------------------------------------------------------------------------------

/// Panics seen by this process since the hook was installed (NFR-005). The hook chains to the previous one.
pub fn panic_counter() -> &'static AtomicUsize {
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

/// Asserts that no panic was seen. Any panicking test in the same binary counts too.
pub fn assert_no_panics() {
    let seen = panic_counter().load(Ordering::SeqCst);
    assert_eq!(seen, 0, "{seen} panic(s) seen in this test process");
}

// ---- Scratch directories and scenario files ---------------------------------------------------------------------

/// A unique directory under the system temp directory, removed on drop (also while a failing test unwinds).
pub struct TempDir {
    path: PathBuf,
}

impl TempDir {
    pub fn new(label: &str) -> Self {
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        let unique = format!(
            "kitty-core-{label}-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::SeqCst)
        );
        let path = std::env::temp_dir().join(unique);
        std::fs::create_dir_all(&path).expect("create scratch directory");
        Self { path }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

/// Writes `<root>/kitty-fake-service.json`.
pub fn write_scenario(root: &Path, launches: &[&str], crash_after_ms: Option<u64>) {
    let mut scenario = json!({ "launches": launches });
    if let Some(ms) = crash_after_ms {
        scenario["crashAfterMs"] = json!(ms);
    }
    let text = serde_json::to_string_pretty(&scenario).expect("scenario serializes");
    std::fs::write(root.join("kitty-fake-service.json"), text).expect("write scenario");
}

/// Holds `port` on 127.0.0.1. Each connection is answered with `answer` (when given) after `hold` (when given), then
/// kept open until the guard drops. Dropping the guard aborts the task and frees the port.
pub struct SquatterGuard {
    task: JoinHandle<()>,
}

impl Drop for SquatterGuard {
    fn drop(&mut self) {
        self.task.abort();
    }
}

pub fn squatter(port: u16, answer: Option<Vec<u8>>, hold: Option<Duration>) -> SquatterGuard {
    let listener = std::net::TcpListener::bind(("127.0.0.1", port)).expect("squatter binds");
    listener.set_nonblocking(true).expect("non-blocking");
    let listener = TcpListener::from_std(listener).expect("tokio listener");
    let task = tokio::spawn(async move {
        let mut connections = JoinSet::new();
        loop {
            let Ok((mut stream, _)) = listener.accept().await else {
                return;
            };
            let answer = answer.clone();
            connections.spawn(async move {
                if let Some(hold) = hold {
                    tokio::time::sleep(hold).await;
                }
                if let Some(bytes) = answer {
                    let _ = stream.write_all(&bytes).await;
                }
                std::future::pending::<()>().await;
            });
        }
    });
    SquatterGuard { task }
}
