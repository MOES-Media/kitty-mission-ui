//! Shared helpers for the in-process tests: the router under test, request building, and the independent oracles
//! (`examples.json`, `routes.json`, `changes.json`) read straight from `contracts/fixtures/`, never from the stub.
#![allow(dead_code)]

use std::path::PathBuf;
use std::time::Duration;

use axum::body::{Body, Bytes};
use axum::http::{HeaderMap, Request, StatusCode};
use axum::Router;
use http_body_util::BodyExt;
use kitty_stub::{app, Fixtures, Options};
use serde_json::Value;
use tower::ServiceExt;

/// The port the in-process router believes it is bound to; the guard checks `Host` and `Origin` against it.
pub const PORT: u16 = 4173;
pub const HOST: &str = "127.0.0.1:4173";
pub const MISSION_ID: &str = "01JZAB3C4D5E6F7G8H9JKMNPQR";

pub fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/fixtures")
}

/// One of the four fixture files, parsed independently of the stub.
pub fn oracle(name: &str) -> Value {
    let path = fixtures_dir().join(format!("mission-status.{name}.json"));
    let text =
        std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
    serde_json::from_str(&text).expect("fixture file is JSON")
}

pub fn options() -> Options {
    Options {
        port: PORT,
        heartbeat: Duration::from_millis(50),
        time_scale: 0.0,
    }
}

pub fn stub() -> Router {
    app(
        Fixtures::load(&fixtures_dir()).expect("fixtures load"),
        options(),
    )
}

/// A request path for a route template: every `{param}` gets a plausible value.
pub fn concrete(template: &str) -> String {
    let path = template
        .replace("{missionId}", MISSION_ID)
        .replace("{wpId}", "WP01");
    assert!(!path.contains('{'), "unfilled parameter in {template}");
    format!("/api/v1{path}")
}

/// A GET with the correct Host header.
pub fn get(path: &str) -> axum::http::request::Builder {
    get_as(path, HOST)
}

/// A GET with exactly one, caller-chosen Host header.
pub fn get_as(path: &str, host: &str) -> axum::http::request::Builder {
    Request::builder()
        .method("GET")
        .uri(path)
        .header("host", host)
}

pub struct Reply {
    pub status: StatusCode,
    pub headers: HeaderMap,
    pub body: Bytes,
}

impl Reply {
    pub fn json(&self) -> Value {
        serde_json::from_slice(&self.body)
            .unwrap_or_else(|e| panic!("body is JSON ({e}): {:?}", self.body))
    }
    pub fn content_type(&self) -> &str {
        self.headers
            .get("content-type")
            .map(|v| v.to_str().unwrap())
            .unwrap_or("")
    }
}

/// Sends one request to the router and collects the whole (finite) body.
pub async fn send(router: Router, req: Request<Body>) -> Reply {
    let res = router.oneshot(req).await.expect("router is infallible");
    let status = res.status();
    let headers = res.headers().clone();
    let body = res
        .into_body()
        .collect()
        .await
        .expect("body collects")
        .to_bytes();
    Reply {
        status,
        headers,
        body,
    }
}

/// Sends a request whose body is an endless SSE stream and returns the status, headers and the bytes up to and
/// including the first `: heartbeat` comment.
pub async fn capture_until_heartbeat(router: Router, req: Request<Body>) -> Reply {
    let res = router.oneshot(req).await.expect("router is infallible");
    let status = res.status();
    let headers = res.headers().clone();
    let mut body = res.into_body();
    let mut bytes = Vec::new();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    loop {
        let frame = tokio::time::timeout_at(deadline, body.frame())
            .await
            .expect("first heartbeat within 10 s")
            .expect("stream stays open until the heartbeat")
            .expect("frame is not an error");
        if let Ok(data) = frame.into_data() {
            bytes.extend_from_slice(&data);
        }
        if bytes.windows(13).any(|w| w == b": heartbeat\n\n") {
            break;
        }
    }
    Reply {
        status,
        headers,
        body: Bytes::from(bytes),
    }
}
