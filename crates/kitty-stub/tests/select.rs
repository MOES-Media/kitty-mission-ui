//! FR-015: a scenario chosen at start-up (`--select`, `--select-fixture`, `Fixtures::with_selections`) is validated by
//! the header rule and served when the request carries no selection header (contracts/stub-http-delta.md).

mod common;

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::Duration;

use axum::body::Body;
use common::{fixtures_dir, get, oracle, send};
use kitty_stub::{app, Fixtures, Selection};
use serde_json::json;

const CONTENT: &str = "/api/v1/missions/01JZAB3C4D5E6F7G8H9JKMNPQR/artifacts/content";

fn loaded() -> Fixtures {
    Fixtures::load(&fixtures_dir()).expect("fixtures load")
}

fn example(name: &str) -> Selection {
    Selection::Example(name.to_owned())
}

fn selected(op: &str, sel: Selection) -> axum::Router {
    let fixtures = loaded()
        .with_selections(vec![(op.to_owned(), sel)])
        .expect("valid selection");
    app(fixtures, common::options())
}

#[tokio::test]
async fn each_stream_refusal_is_served_with_its_own_status_and_no_headers() {
    let examples = oracle("examples");
    let names: Vec<&String> = examples
        .as_object()
        .unwrap()
        .keys()
        .filter(|k| k.starts_with("StreamRefusal."))
        .collect();
    assert_eq!(names.len(), 5);
    let mut ran = 0;
    for name in names {
        let expected = &examples[name.as_str()]["value"];
        let reply = send(
            selected("streamEvents", example(name)),
            get("/api/v1/events").body(Body::empty()).unwrap(),
        )
        .await;
        assert_eq!(
            u64::from(reply.status.as_u16()),
            expected["status"].as_u64().unwrap(),
            "{name}"
        );
        assert_eq!(reply.content_type(), "application/problem+json", "{name}");
        assert_eq!(&reply.json(), expected, "{name}");
        ran += 1;
    }
    assert_eq!(ran, 5);
}

#[tokio::test]
async fn an_artifact_refusal_selection_is_a_404_problem_and_a_header_overrides_it() {
    let router = selected("getArtifactContent", example("ArtifactRefusal.not-found"));
    let reply = send(router.clone(), get(CONTENT).body(Body::empty()).unwrap()).await;
    assert_eq!(reply.status, 404);
    assert_eq!(reply.content_type(), "application/problem+json");
    // The example header wins over the start-up selection.
    let by_example = send(
        router.clone(),
        get(CONTENT)
            .header("x-kitty-stub-example", "ArtifactContent.markdown")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(by_example.status, 200);
    assert_eq!(
        by_example.json(),
        oracle("examples")["ArtifactContent.markdown"]["value"]
    );
    // So does the fixture header.
    let by_fixture = send(
        router.clone(),
        get(CONTENT)
            .header("x-kitty-stub-fixture", "contentCsv")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(by_fixture.status, 200);
    assert_eq!(by_fixture.json(), oracle("fixtures")["contentCsv"]["value"]);
    // A selection on one operation leaves the others on their defaults.
    let other = send(router, get("/api/v1/project").body(Body::empty()).unwrap()).await;
    assert_eq!(other.status, 200);
}

#[tokio::test]
async fn a_fixture_selection_serves_the_fixture() {
    let router = selected(
        "getArtifactContent",
        Selection::Fixture("contentCsv".into()),
    );
    let reply = send(router, get(CONTENT).body(Body::empty()).unwrap()).await;
    assert_eq!(reply.status, 200);
    assert_eq!(reply.json(), oracle("fixtures")["contentCsv"]["value"]);
}

#[test]
fn the_library_refuses_the_same_four_cases() {
    let sel = |op: &str, s: Selection| loaded().with_selections(vec![(op.to_owned(), s)]);
    // Positive control.
    assert!(sel("getArtifactContent", example("ArtifactRefusal.not-found")).is_ok());
    let cases: Vec<(&str, Result<Fixtures, String>)> = vec![
        (
            "unknown op",
            sel("noSuchOperation", example("ArtifactRefusal.not-found")),
        ),
        (
            "unknown entry",
            sel("getArtifactContent", example("ArtifactRefusal.nope")),
        ),
        (
            "unknown fixture",
            sel("getArtifactContent", Selection::Fixture("nope".into())),
        ),
        (
            "schema mismatch",
            sel("getArtifactContent", example("StreamRefusal.misaligned")),
        ),
        (
            "duplicate",
            loaded().with_selections(vec![
                (
                    "getArtifactContent".into(),
                    example("ArtifactRefusal.not-found"),
                ),
                (
                    "getArtifactContent".into(),
                    example("ArtifactContent.markdown"),
                ),
            ]),
        ),
    ];
    let mut ran = 0;
    for (name, result) in cases {
        assert!(result.is_err(), "{name} must be refused");
        ran += 1;
    }
    assert_eq!(ran, 5);
}

#[test]
fn a_refusal_whose_status_is_not_allowed_is_refused() {
    let mut examples = oracle("examples");
    examples["ArtifactRefusal.teapot"] = json!({
        "schema": "ArtifactRefusal",
        "value": {"type": "about:blank", "title": "teapot", "status": 418, "code": "teapot"}
    });
    let build = |name: &str| {
        Fixtures::from_values(
            oracle("routes"),
            examples.clone(),
            oracle("fixtures"),
            oracle("changes"),
        )
        .unwrap()
        .with_selections(vec![("getArtifactContent".into(), example(name))])
    };
    assert!(build("ArtifactRefusal.not-found").is_ok());
    assert!(build("ArtifactRefusal.teapot").is_err());
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
    cmd.args(["--port", "0", "--time-scale", "0", "--fixtures"])
        .arg(fixtures_dir())
        .args(args);
    cmd
}

fn spawn(args: &[&str]) -> (Running, SocketAddr) {
    let mut child = command(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("starts");
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

fn raw_get(addr: SocketAddr, path: &str) -> String {
    let mut s = TcpStream::connect_timeout(&addr, Duration::from_secs(5)).unwrap();
    s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
    write!(
        s,
        "GET {path} HTTP/1.1\r\nHost: {addr}\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut out = String::new();
    s.read_to_string(&mut out).unwrap();
    out
}

#[test]
fn the_binary_serves_start_up_selections() {
    let (_stub, addr) = spawn(&[
        "--select",
        "getArtifactContent=ArtifactRefusal.not-found",
        "--select",
        "streamEvents=StreamRefusal.misaligned",
    ]);
    let artifact = raw_get(addr, CONTENT);
    assert!(artifact.starts_with("HTTP/1.1 404 "), "{artifact}");
    assert!(
        artifact
            .to_ascii_lowercase()
            .contains("content-type: application/problem+json"),
        "{artifact}"
    );
    let events = raw_get(addr, "/api/v1/events");
    assert!(events.starts_with("HTTP/1.1 400 "), "{events}");
    let (_fixture_stub, addr) = spawn(&["--select-fixture", "getArtifactContent=contentCsv"]);
    let csv = raw_get(addr, CONTENT);
    assert!(csv.starts_with("HTTP/1.1 200 "), "{csv}");
    assert!(csv.contains("notes/table.csv"), "{csv}");
}

#[test]
fn a_bad_selection_is_a_usage_error_before_listening() {
    let cases: [(&str, &[&str]); 7] = [
        (
            "unknown op",
            &["--select", "noSuchOperation=ArtifactRefusal.not-found"],
        ),
        (
            "unknown entry",
            &["--select", "getArtifactContent=ArtifactRefusal.nope"],
        ),
        (
            "unknown fixture",
            &["--select-fixture", "getArtifactContent=nope"],
        ),
        (
            "schema mismatch",
            &["--select", "getArtifactContent=StreamRefusal.misaligned"],
        ),
        (
            "duplicate",
            &[
                "--select",
                "getArtifactContent=ArtifactRefusal.not-found",
                "--select-fixture",
                "getArtifactContent=contentCsv",
            ],
        ),
        ("malformed", &["--select", "getArtifactContent"]),
        ("empty name", &["--select-fixture", "getArtifactContent="]),
    ];
    let mut ran = 0;
    for (name, args) in cases {
        let out = command(args).output().unwrap();
        assert_eq!(out.status.code(), Some(2), "{name}: {out:?}");
        let stdout = String::from_utf8_lossy(&out.stdout);
        assert!(!stdout.contains("listening"), "{name}: {stdout}");
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(stderr.contains("usage: kitty-stub"), "{name}: {stderr}");
        ran += 1;
    }
    assert_eq!(ran, 7);
    // Positive control: a valid selection starts.
    let (_ok, _addr) = spawn(&["--select", "getArtifactContent=ArtifactRefusal.not-found"]);
}
