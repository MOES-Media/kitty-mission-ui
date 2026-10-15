//! `kitty-stub`: a loopback HTTP and SSE stand-in for spec-kitty's Mission Status service, normative contract
//! `contracts/stub-http.md`.
//!
//! - Reads serve the route's default example, or a selected example or fixture whose schema fits the route
//!   (`X-Kitty-Stub-Fixture` wins over `X-Kitty-Stub-Example`); refusals are `application/problem+json` with the
//!   example's own status.
//! - `GET /api/v1/events` replays `changes.json` deterministically, then sends heartbeats.
//! - One guard layer applies the upstream service's Host, Origin and `Forwarded` rules to every route.
//! - `GET /__stub/last-request` reports the most recent `/api/v1` request.
//!
//! Every fixture file is read once, by [`Fixtures::load`], before the router exists. No request value is ever
//! used to build a filesystem path (F-38): handlers only look values up in memory.

use std::collections::BTreeMap;
use std::convert::Infallible;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use axum::body::{Body, Bytes};
use axum::extract::{Request, State};
use axum::http::header::{ALLOW, CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderMap, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, MethodRouter};
use axum::Router;
use http_body_util::channel::Channel;
use hyper_util::rt::{TokioIo, TokioTimer};
use hyper_util::service::TowerToHyperService;
use serde::Deserialize;
use serde_json::{json, Value};

/// The server URL prefix every contract path is relative to.
pub const API_PREFIX: &str = "/api/v1";
/// The test-support route; not part of the contract.
pub const LAST_REQUEST_PATH: &str = "/__stub/last-request";
const FIXTURE_HEADER: &str = "x-kitty-stub-fixture";
const EXAMPLE_HEADER: &str = "x-kitty-stub-example";
const JSON: &str = "application/json";
const PROBLEM_JSON: &str = "application/problem+json";
const HEARTBEAT: &[u8] = b": heartbeat\n\n";
/// Headers whose values `/__stub/last-request` never echoes (CODE-SEC-002): the name is kept, the value is replaced.
const REDACTED_HEADERS: [&str; 4] = [
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
];
const REDACTED: &str = "[redacted]";

/// One `routes.json` entry (data-model RouteEntry).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Route {
    operation_id: String,
    method: String,
    path: String,
    kind: String,
    response_schema: Option<String>,
    default_example: Option<String>,
    refusals: BTreeMap<String, Vec<u16>>,
}

/// One `examples.json` or `fixtures.json` entry.
#[derive(Debug, Clone, Deserialize)]
struct Entry {
    schema: String,
    value: Value,
}

/// `changes.json`: the `{ missionId, items }` envelope (data-model ChangeItem, A4).
#[derive(Debug, Clone, Deserialize)]
struct Changes {
    items: Vec<ChangeItem>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChangeItem {
    event: String,
    scoped_id: Option<String>,
    data: Value,
    delay_ms: u64,
}

/// One change, pre-rendered as the bytes written on a mission-scoped and on an unscoped stream.
#[derive(Debug)]
struct Frame {
    delay_ms: u64,
    scoped: Bytes,
    unscoped: Bytes,
}

/// The four fixture files, parsed and checked once at start-up.
#[derive(Debug)]
pub struct Fixtures {
    routes: Vec<Route>,
    examples: BTreeMap<String, Entry>,
    fixtures: BTreeMap<String, Entry>,
    frames: Vec<Frame>,
}

impl Fixtures {
    /// Reads `mission-status.{routes,examples,fixtures,changes}.json` from `dir`. This is the only file access.
    pub fn load(dir: &Path) -> Result<Self, String> {
        let read = |name: &str| -> Result<Value, String> {
            let path = dir.join(format!("mission-status.{name}.json"));
            let text =
                std::fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
            serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
        };
        Self::from_values(
            read("routes")?,
            read("examples")?,
            read("fixtures")?,
            read("changes")?,
        )
    }

    /// Builds the fixtures from already-parsed file contents (tests use this for synthetic variants).
    pub fn from_values(
        routes: Value,
        examples: Value,
        fixtures: Value,
        changes: Value,
    ) -> Result<Self, String> {
        let routes: Vec<Route> =
            serde_json::from_value(routes).map_err(|e| format!("routes: {e}"))?;
        let examples: BTreeMap<String, Entry> =
            serde_json::from_value(examples).map_err(|e| format!("examples: {e}"))?;
        let fixtures: BTreeMap<String, Entry> =
            serde_json::from_value(fixtures).map_err(|e| format!("fixtures: {e}"))?;
        let changes: Changes =
            serde_json::from_value(changes).map_err(|e| format!("changes: {e}"))?;
        // Axum refuses to route two templates of the same shape (a duplicate path, or `{missionId}` against `{id}` at
        // one position) by panicking when the router is built, so the conflict is caught here, at load.
        let mut shapes: BTreeMap<String, &str> = BTreeMap::new();
        for route in &routes {
            if route.method != "GET" {
                return Err(format!(
                    "{}: only GET routes are served, not {}",
                    route.operation_id, route.method
                ));
            }
            if route.kind != "read" && route.kind != "stream" {
                return Err(format!(
                    "{}: unknown kind {}",
                    route.operation_id, route.kind
                ));
            }
            axum_path(&route.path)?;
            if let Some(first) = shapes.insert(template_shape(&route.path), &route.path) {
                return Err(format!(
                    "{}: route template {} conflicts with {first}",
                    route.operation_id, route.path
                ));
            }
            if let Some(key) = &route.default_example {
                if !examples.contains_key(key) {
                    return Err(format!(
                        "{}: default example {key} does not exist",
                        route.operation_id
                    ));
                }
            }
        }
        let frames = changes
            .items
            .iter()
            .map(Frame::render)
            .collect::<Result<_, _>>()?;
        Ok(Fixtures {
            routes,
            examples,
            fixtures,
            frames,
        })
    }
}

impl Fixtures {
    /// CODE-SEC-003: a time scale is usable when it is finite, not negative, and every scaled scripted delay still fits
    /// in a `Duration` (checked on the largest delay), so a stream task can never panic on it.
    pub fn check_time_scale(&self, time_scale: f64) -> Result<(), String> {
        if !(time_scale.is_finite() && time_scale >= 0.0) {
            return Err("--time-scale must be a finite number >= 0".into());
        }
        let largest = self.frames.iter().map(|f| f.delay_ms).max().unwrap_or(0);
        scaled_delay(largest, time_scale).map(|_| ()).ok_or_else(|| {
            format!("--time-scale {time_scale} scales the {largest} ms delay beyond the longest duration")
        })
    }
}

/// `delay_ms × time_scale` as a `Duration`, or `None` when it is not representable.
fn scaled_delay(delay_ms: u64, time_scale: f64) -> Option<Duration> {
    Duration::try_from_secs_f64(delay_ms as f64 * time_scale / 1000.0).ok()
}

impl Frame {
    fn render(item: &ChangeItem) -> Result<Frame, String> {
        let data = serde_json::to_string(&item.data).map_err(|e| format!("changes: {e}"))?;
        let unscoped = format!("event: {}\ndata: {data}\n\n", item.event);
        let scoped = match &item.scoped_id {
            Some(id) => format!("event: {}\nid: {id}\ndata: {data}\n\n", item.event),
            None => unscoped.clone(),
        };
        Ok(Frame {
            delay_ms: item.delay_ms,
            scoped: Bytes::from(scoped),
            unscoped: Bytes::from(unscoped),
        })
    }
}

/// Runtime options; `port` is the port the listener is actually bound to (the guard checks against it).
#[derive(Debug, Clone)]
pub struct Options {
    pub port: u16,
    pub heartbeat: Duration,
    pub time_scale: f64,
}

struct Stub {
    fixtures: Fixtures,
    heartbeat: Duration,
    time_scale: f64,
    hosts: [String; 2],
    origins: [String; 2],
    last_request: Mutex<Option<Value>>,
}

/// The whole stub as an axum router: one route per `routes.json` entry, the test-support route, and the guard
/// layer over all of them (the fallback included).
pub fn app(fixtures: Fixtures, options: Options) -> Router {
    let port = options.port;
    let stub = Arc::new(Stub {
        fixtures,
        heartbeat: options.heartbeat,
        time_scale: options.time_scale,
        hosts: [format!("127.0.0.1:{port}"), format!("localhost:{port}")],
        origins: [
            format!("http://127.0.0.1:{port}"),
            format!("http://localhost:{port}"),
        ],
        last_request: Mutex::new(None),
    });
    let mut router = Router::new();
    for (index, route) in stub.fixtures.routes.iter().enumerate() {
        let path = axum_path(&route.path).expect("checked at load");
        router = router.route(&path, route_handler(index));
    }
    router
        .route(LAST_REQUEST_PATH, get_only(get(last_request)))
        .layer(middleware::from_fn_with_state(stub.clone(), record))
        .layer(middleware::from_fn_with_state(stub.clone(), guard))
        .with_state(stub)
}

/// Serves `router` on `listener`, one HTTP/1.1 connection per task, until the future is dropped or the listener fails
/// for good (the returned error; see [`accept_error_is_fatal`]).
///
/// `axum::serve` gives hyper no timer, so hyper's header-read timeout never fires and a client that sends half a
/// request header holds its connection forever (CODE-SEC-001). This loop serves through hyper directly with a Tokio
/// timer, so a connection whose request header is not complete within `header_read_timeout` is closed. The timeout
/// covers the request header only: an open event stream is not affected.
pub async fn run_server(
    listener: tokio::net::TcpListener,
    router: Router,
    header_read_timeout: Duration,
) -> Result<(), String> {
    let mut reports = ErrorReports::default();
    loop {
        let stream = match listener.accept().await {
            Ok((stream, _peer)) => stream,
            Err(e) => {
                // A dead listener never recovers, so serving on would only spin: stop and let the process exit
                // non-zero. Anything else (EMFILE, an aborted connection) is transient: report it (rate-limited),
                // back off briefly instead of spinning, and retry.
                if accept_error_is_fatal(&e) {
                    return Err(format!("accept: {e}"));
                }
                if reports.should_report(Instant::now()) {
                    eprintln!(
                        "kitty-stub: accept: {e} (retrying; {} similar suppressed so far)",
                        reports.suppressed()
                    );
                }
                tokio::time::sleep(Duration::from_millis(50)).await;
                continue;
            }
        };
        let service = TowerToHyperService::new(router.clone());
        tokio::spawn(async move {
            // A connection error (a reset, a malformed request, the header timeout) only ends that connection.
            let _ = hyper::server::conn::http1::Builder::new()
                .timer(TokioTimer::new())
                .header_read_timeout(header_read_timeout)
                .serve_connection(TokioIo::new(stream), service)
                .await;
        });
    }
}

/// An accept error that cannot clear by retrying: a bad or closed listener descriptor (`EBADF`, `EINVAL`) or a
/// listener that is not a connected-capable socket. Descriptor or memory exhaustion (`EMFILE`, `ENFILE`, `ENOMEM`)
/// and per-connection aborts are not fatal.
fn accept_error_is_fatal(e: &std::io::Error) -> bool {
    use std::io::ErrorKind;
    const EBADF: i32 = 9;
    const EINVAL: i32 = 22;
    matches!(e.raw_os_error(), Some(EBADF | EINVAL))
        || matches!(e.kind(), ErrorKind::InvalidInput | ErrorKind::NotConnected)
}

/// Rate limit for accept-error reports: the first is reported, then at most one per second.
#[derive(Debug, Default)]
struct ErrorReports {
    last: Option<Instant>,
    suppressed: u64,
}

impl ErrorReports {
    fn should_report(&mut self, now: Instant) -> bool {
        match self.last {
            Some(last) if now.duration_since(last) < Duration::from_secs(1) => {
                self.suppressed += 1;
                false
            }
            _ => {
                self.last = Some(now);
                true
            }
        }
    }

    /// How many reports the limiter has swallowed so far.
    fn suppressed(&self) -> u64 {
        self.suppressed
    }
}

/// The template with every `{param}` segment reduced to `{}`: two templates with the same shape cannot both be routed.
fn template_shape(template: &str) -> String {
    template
        .split('/')
        .map(|segment| {
            if segment.starts_with('{') && segment.ends_with('}') {
                "{}"
            } else {
                segment
            }
        })
        .collect::<Vec<_>>()
        .join("/")
}

/// `/api/v1` plus the contract's template. Axum 0.8 uses the same `{param}` syntax, so each segment is checked to
/// be a literal or a whole-segment `{name}` and the template is kept as it is.
fn axum_path(template: &str) -> Result<String, String> {
    let segments_ok = |rest: &str| {
        rest.split('/').all(|segment| {
            match segment.strip_prefix('{').and_then(|s| s.strip_suffix('}')) {
                Some(name) => !name.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric()),
                None => !segment.is_empty() && !segment.contains(['{', '}', '*', ':']),
            }
        })
    };
    match template.strip_prefix('/') {
        Some(rest) if segments_ok(rest) => Ok(format!("{API_PREFIX}{template}")),
        _ => Err(format!("unsupported path template {template}")),
    }
}

/// GET only: every other method, HEAD included (axum would route it to GET), is a 405 that advertises `GET` alone.
fn route_handler(index: usize) -> MethodRouter<Arc<Stub>> {
    get_only(get(
        move |State(stub): State<Arc<Stub>>, req: Request| async move {
            serve(&stub, index, req.headers(), req.uri().query())
        },
    ))
}

/// Refuses HEAD and every unrouted method with [`method_not_allowed`]. Axum's own 405 would advertise `GET,HEAD`, but
/// HEAD is refused (CODE-CONTRACT-003).
fn get_only(router: MethodRouter<Arc<Stub>>) -> MethodRouter<Arc<Stub>> {
    router.head(method_not_allowed).fallback(method_not_allowed)
}

async fn method_not_allowed() -> Response {
    (StatusCode::METHOD_NOT_ALLOWED, [(ALLOW, "GET")]).into_response()
}

fn body(status: StatusCode, content_type: &'static str, value: &Value) -> Response {
    let bytes = serde_json::to_vec(value).expect("a JSON value serialises");
    (status, [(CONTENT_TYPE, content_type)], bytes).into_response()
}

/// The selection rule shared by reads and the events route (stub-http.md "Reads", R2-06, R3-02, A5, A23).
fn serve(stub: &Stub, index: usize, headers: &HeaderMap, query: Option<&str>) -> Response {
    let route = &stub.fixtures.routes[index];
    let header = |name: &str| {
        headers
            .get(name)
            .map(|v| String::from_utf8_lossy(v.as_bytes()).into_owned())
    };
    let selected = if let Some(name) = header(FIXTURE_HEADER) {
        match stub.fixtures.fixtures.get(&name) {
            Some(entry) => entry,
            None => return body(StatusCode::NOT_FOUND, JSON, &json!({"code": "no-fixture"})),
        }
    } else if let Some(key) = header(EXAMPLE_HEADER) {
        match stub.fixtures.examples.get(&key) {
            Some(entry) => entry,
            None => return body(StatusCode::NOT_FOUND, JSON, &json!({"code": "no-example"})),
        }
    } else if route.kind == "stream" {
        return stream(stub, mission_scoped(query));
    } else {
        match route
            .default_example
            .as_ref()
            .and_then(|key| stub.fixtures.examples.get(key))
        {
            Some(entry) => entry,
            None => {
                let refusal = json!({"code": "no-example", "operationId": route.operation_id});
                return body(StatusCode::NOT_IMPLEMENTED, JSON, &refusal);
            }
        }
    };
    if route.response_schema.as_deref() == Some(selected.schema.as_str()) {
        return body(StatusCode::OK, JSON, &selected.value);
    }
    let own_status = selected.value.get("status").and_then(Value::as_u64);
    let allowed = route.refusals.get(&selected.schema);
    if let (Some(allowed), Some(status)) = (allowed, own_status) {
        if allowed.iter().any(|s| u64::from(*s) == status) {
            let status = StatusCode::from_u16(status as u16).expect("allowed statuses are valid");
            return body(status, PROBLEM_JSON, &selected.value);
        }
    }
    let mismatch = json!({"code": "schema-mismatch", "schema": selected.schema, "operationId": route.operation_id});
    body(StatusCode::BAD_REQUEST, JSON, &mismatch)
}

/// A request is mission-scoped when its query carries a non-empty `missionId`.
fn mission_scoped(query: Option<&str>) -> bool {
    query.unwrap_or("").split('&').any(|pair| {
        pair.split_once('=')
            .is_some_and(|(key, value)| key == "missionId" && !value.is_empty())
    })
}

/// `200 text/event-stream`: every change after its scaled delay, then a heartbeat every interval until the client
/// goes away (the send fails once the body is dropped).
fn stream(stub: &Stub, scoped: bool) -> Response {
    let (mut tx, rx) = Channel::<Bytes, Infallible>::new(8);
    let frames: Vec<(Duration, Bytes)> = stub
        .fixtures
        .frames
        .iter()
        .map(|f| {
            // `Fixtures::check_time_scale` rejects a scale that overflows; an unchecked caller waits "forever".
            let delay = scaled_delay(f.delay_ms, stub.time_scale).unwrap_or(Duration::MAX);
            (
                delay,
                if scoped {
                    f.scoped.clone()
                } else {
                    f.unscoped.clone()
                },
            )
        })
        .collect();
    let heartbeat = stub.heartbeat;
    tokio::spawn(async move {
        for (delay, frame) in frames {
            if !delay.is_zero() {
                tokio::time::sleep(delay).await;
            }
            if tx.send_data(frame).await.is_err() {
                return;
            }
        }
        loop {
            tokio::time::sleep(heartbeat).await;
            if tx.send_data(Bytes::from_static(HEARTBEAT)).await.is_err() {
                return;
            }
        }
    });
    let headers = [
        (CONTENT_TYPE, "text/event-stream"),
        (CACHE_CONTROL, "no-cache"),
    ];
    (StatusCode::OK, headers, Body::new(rx)).into_response()
}

/// F-32: the upstream service's request rules, applied as one layer to every route.
async fn guard(State(stub): State<Arc<Stub>>, req: Request, next: Next) -> Response {
    let headers = req.headers();
    // Exactly one Host, and at most one Origin: a repeated header cannot smuggle a second value past the first.
    let mut hosts = headers.get_all("host").iter();
    let host_ok = match (hosts.next(), hosts.next()) {
        (Some(h), None) => stub.hosts.iter().any(|ok| h == ok.as_str()),
        _ => false,
    };
    let mut origins = headers.get_all("origin").iter();
    let origin_ok = match (origins.next(), origins.next()) {
        (None, _) => true,
        (Some(o), None) => stub.origins.iter().any(|ok| o == ok.as_str()),
        (Some(_), Some(_)) => false,
    };
    let forwarded = headers
        .keys()
        .any(|name| name == "forwarded" || name.as_str().starts_with("x-forwarded-"));
    let rule = if !host_ok {
        "host"
    } else if !origin_ok {
        "origin"
    } else if forwarded {
        "forwarded"
    } else {
        return next.run(req).await;
    };
    body(StatusCode::FORBIDDEN, JSON, &json!({ "code": rule }))
}

/// F-28: remembers `{ method, path, headers }` of the most recent `/api/v1` request that passed the guard. Header
/// names are lower-case (the `http` crate normalises them); repeated headers are joined with `, `. Credential headers
/// ([`REDACTED_HEADERS`]) keep their name, but their value is reported as `[redacted]`.
async fn record(State(stub): State<Arc<Stub>>, req: Request, next: Next) -> Response {
    let path = req.uri().path();
    if path == API_PREFIX || path.starts_with(&format!("{API_PREFIX}/")) {
        let mut headers = serde_json::Map::new();
        for name in req.headers().keys() {
            if REDACTED_HEADERS.contains(&name.as_str()) {
                headers.insert(name.as_str().to_owned(), Value::from(REDACTED));
                continue;
            }
            let values: Vec<String> = req
                .headers()
                .get_all(name)
                .iter()
                .map(|v| String::from_utf8_lossy(v.as_bytes()).into_owned())
                .collect();
            headers.insert(name.as_str().to_owned(), Value::String(values.join(", ")));
        }
        let entry = json!({"method": req.method().as_str(), "path": path, "headers": headers});
        *stub.last_request.lock().expect("last-request lock") = Some(entry);
    }
    next.run(req).await
}

async fn last_request(State(stub): State<Arc<Stub>>) -> Response {
    let last = stub.last_request.lock().expect("last-request lock").clone();
    match last {
        Some(entry) => body(StatusCode::OK, JSON, &entry),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Error, ErrorKind};

    /// SO-CORR-007: descriptor exhaustion and per-connection aborts are worth retrying; a dead listener never recovers.
    #[test]
    fn accept_errors_are_retried_or_fatal_by_kind() {
        let retry = [
            Error::from_raw_os_error(24), // EMFILE
            Error::from_raw_os_error(23), // ENFILE
            Error::from_raw_os_error(12), // ENOMEM
            Error::from(ErrorKind::ConnectionAborted),
            Error::from(ErrorKind::ConnectionReset),
            Error::from(ErrorKind::Interrupted),
            Error::from(ErrorKind::WouldBlock),
            Error::from(ErrorKind::TimedOut),
        ];
        let fatal = [
            Error::from_raw_os_error(9),  // EBADF
            Error::from_raw_os_error(22), // EINVAL
            Error::from(ErrorKind::InvalidInput),
            Error::from(ErrorKind::NotConnected),
        ];
        let mut ran = 0;
        for e in &retry {
            assert!(!accept_error_is_fatal(e), "retry: {e:?}");
            ran += 1;
        }
        for e in &fatal {
            assert!(accept_error_is_fatal(e), "fatal: {e:?}");
            ran += 1;
        }
        assert_eq!(ran, retry.len() + fatal.len());
    }

    /// The first accept error is reported, then at most one per second.
    #[test]
    fn accept_error_reports_are_rate_limited() {
        let t0 = Instant::now();
        let mut limit = ErrorReports::default();
        assert!(limit.should_report(t0));
        assert!(!limit.should_report(t0 + Duration::from_millis(10)));
        assert!(!limit.should_report(t0 + Duration::from_millis(999)));
        assert!(limit.should_report(t0 + Duration::from_secs(1)));
        assert!(!limit.should_report(t0 + Duration::from_millis(1500)));
        assert!(limit.should_report(t0 + Duration::from_secs(2)));
        assert_eq!(limit.suppressed(), 3);
    }
}
