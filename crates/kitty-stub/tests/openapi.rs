//! FR-014: `GET /api/v1/openapi.yaml` serves the contract bundle byte for byte under the same guard as every route
//! (contracts/stub-http-delta.md). In-process cases use the library; binary cases start the real stub.

mod common;

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::Duration;

use axum::body::{Body, Bytes};
use axum::http::Request;
use common::{fixtures_dir, get, get_as, oracle, send, stub, HOST};
use kitty_stub::{app, Fixtures};
use serde_json::{json, Value};

const BUNDLE: &str = "mission-status.openapi.json";

fn bundle_bytes() -> Vec<u8> {
    std::fs::read(fixtures_dir().join(BUNDLE)).expect("the committed bundle reads")
}

fn stub_with_document(doc: Vec<u8>) -> axum::Router {
    let fixtures = Fixtures::load(&fixtures_dir())
        .expect("fixtures load")
        .with_openapi_document(Bytes::from(doc));
    app(fixtures, common::options())
}

#[tokio::test]
async fn serves_the_exact_bundle_bytes_as_yaml() {
    let expected = bundle_bytes();
    assert!(expected.len() > 1000, "the oracle bundle is not trivial");
    let reply = send(
        stub_with_document(expected.clone()),
        get("/api/v1/openapi.yaml").body(Body::empty()).unwrap(),
    )
    .await;
    assert_eq!(reply.status, 200);
    assert_eq!(reply.content_type(), "application/yaml");
    assert_eq!(reply.body.to_vec(), expected);
}

#[tokio::test]
async fn the_route_sits_under_the_guard_and_is_get_only() {
    let doc = bundle_bytes();
    let mut ran = 0;
    // Positive control first: the same request with correct headers is served.
    let ok = send(
        stub_with_document(doc.clone()),
        get("/api/v1/openapi.yaml").body(Body::empty()).unwrap(),
    )
    .await;
    assert_eq!(ok.status, 200);
    let bad: Vec<(&str, Request<Body>)> = vec![
        (
            "host",
            get_as("/api/v1/openapi.yaml", "evil.test:4173")
                .body(Body::empty())
                .unwrap(),
        ),
        (
            "origin",
            get("/api/v1/openapi.yaml")
                .header("origin", "http://evil.test")
                .body(Body::empty())
                .unwrap(),
        ),
        (
            "forwarded",
            get("/api/v1/openapi.yaml")
                .header("forwarded", "for=1.2.3.4")
                .body(Body::empty())
                .unwrap(),
        ),
    ];
    for (rule, req) in bad {
        let reply = send(stub_with_document(doc.clone()), req).await;
        assert_eq!(reply.status, 403, "{rule}");
        assert_eq!(reply.json(), json!({ "code": rule }));
        ran += 1;
    }
    assert_eq!(ran, 3);
    let post = Request::builder()
        .method("POST")
        .uri("/api/v1/openapi.yaml")
        .header("host", HOST)
        .body(Body::empty())
        .unwrap();
    let reply = send(stub_with_document(doc), post).await;
    assert_eq!(reply.status, 405);
    assert_eq!(reply.headers.get("allow").unwrap(), "GET");
}

#[tokio::test]
async fn without_a_document_the_route_is_a_404_and_is_still_recorded() {
    let router = stub();
    let reply = send(
        router.clone(),
        get("/api/v1/openapi.yaml").body(Body::empty()).unwrap(),
    )
    .await;
    assert_eq!(reply.status, 404);
    assert_eq!(reply.json(), json!({ "code": "no-openapi-document" }));
    let last = send(
        router,
        get("/__stub/last-request").body(Body::empty()).unwrap(),
    )
    .await;
    assert_eq!(last.status, 200);
    assert_eq!(last.json()["path"], "/api/v1/openapi.yaml");
}

#[test]
fn a_routes_entry_for_the_document_path_is_a_load_conflict() {
    let load = |routes: Value| {
        Fixtures::from_values(
            routes,
            oracle("examples"),
            oracle("fixtures"),
            oracle("changes"),
        )
    };
    // Positive control: the committed routes load.
    assert!(load(oracle("routes")).is_ok());
    let mut routes = oracle("routes");
    routes.as_array_mut().unwrap().push(json!({
        "operationId": "shadow", "method": "GET", "path": "/openapi.yaml", "kind": "read",
        "responseSchema": "Project", "defaultExample": "Project.example", "refusals": {}
    }));
    let err = load(routes).expect_err("the path is reserved");
    assert!(
        err.contains("/openapi.yaml") && err.contains("conflicts"),
        "{err}"
    );
}

// ---- binary ----

struct Running(Child);

impl Drop for Running {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn command(args: &[&str]) -> Command {
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_kitty-stub"));
    cmd.args(["--port", "0", "--time-scale", "0"]).args(args);
    cmd
}

fn spawn(args: &[&str]) -> (Running, SocketAddr) {
    let mut child = command(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("kitty-stub starts");
    let stdout = child.stdout.take().expect("stdout piped");
    let running = Running(child);
    let mut line = String::new();
    BufReader::new(stdout)
        .read_line(&mut line)
        .expect("first line");
    let addr = line
        .trim_end()
        .strip_prefix("listening ")
        .unwrap_or_else(|| panic!("{line:?}"));
    (running, addr.parse().expect("address parses"))
}

/// One GET over a raw socket: the head as text, the body as bytes.
fn raw_get(addr: SocketAddr, path: &str) -> (String, Vec<u8>) {
    let mut s = TcpStream::connect_timeout(&addr, Duration::from_secs(5)).unwrap();
    s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
    write!(
        s,
        "GET {path} HTTP/1.1\r\nHost: {addr}\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut all = Vec::new();
    s.read_to_end(&mut all).unwrap();
    let split = all
        .windows(4)
        .position(|w| w == b"\r\n\r\n")
        .expect("head ends")
        + 4;
    (
        String::from_utf8_lossy(&all[..split]).into_owned(),
        all[split..].to_vec(),
    )
}

fn scratch(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("kitty-stub-{tag}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

/// A copy of the four `mission-status.*.json` files (no bundle) in `dir`.
fn copy_fixtures_without_bundle(dir: &Path) {
    for name in ["routes", "examples", "fixtures", "changes"] {
        let file = format!("mission-status.{name}.json");
        std::fs::copy(fixtures_dir().join(&file), dir.join(&file)).unwrap();
    }
}

#[test]
fn the_binary_serves_the_default_bundle_byte_for_byte() {
    let (_stub, addr) = spawn(&[]);
    let (head, body) = raw_get(addr, "/api/v1/openapi.yaml");
    assert!(head.starts_with("HTTP/1.1 200 "), "{head}");
    assert!(
        head.to_ascii_lowercase()
            .contains("content-type: application/yaml"),
        "{head}"
    );
    assert_eq!(body, bundle_bytes());
}

#[test]
fn an_explicit_openapi_file_is_served_instead() {
    let dir = scratch("openapi-explicit");
    let file = dir.join("custom.yaml");
    let modified = b"openapi: 3.1.0\ninfo: {title: custom, version: '0'}\n".to_vec();
    std::fs::write(&file, &modified).unwrap();
    let (_stub, addr) = spawn(&["--openapi", file.to_str().unwrap()]);
    let (head, body) = raw_get(addr, "/api/v1/openapi.yaml");
    assert!(head.starts_with("HTTP/1.1 200 "), "{head}");
    assert_eq!(body, modified);
    assert_ne!(body, bundle_bytes());
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn an_unreadable_explicit_openapi_file_exits_1_naming_only_the_base_name() {
    let dir = scratch("openapi-unreadable");
    let missing = dir.join("absent.yaml");
    let out = command(&["--openapi", missing.to_str().unwrap()])
        .output()
        .unwrap();
    assert_eq!(out.status.code(), Some(1), "{out:?}");
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(stderr.contains("absent.yaml"), "{stderr}");
    assert!(!stderr.contains(dir.to_str().unwrap()), "{stderr}");
    assert!(!String::from_utf8_lossy(&out.stdout).contains("listening"));
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn a_missing_default_document_serves_404_not_an_error() {
    let dir = scratch("openapi-default-missing");
    copy_fixtures_without_bundle(&dir);
    let (_stub, addr) = spawn(&["--fixtures", dir.to_str().unwrap()]);
    let (head, body) = raw_get(addr, "/api/v1/openapi.yaml");
    assert!(head.starts_with("HTTP/1.1 404 "), "{head}");
    assert_eq!(
        serde_json::from_slice::<Value>(&body).unwrap(),
        json!({"code": "no-openapi-document"})
    );
    // Positive control: the same stub serves reads.
    let (ok, _) = raw_get(addr, "/api/v1/project");
    assert!(ok.starts_with("HTTP/1.1 200 "), "{ok}");
    let _ = std::fs::remove_dir_all(&dir);
}
