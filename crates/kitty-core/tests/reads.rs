//! SC-001, FR-001 to FR-006: the read relay and `forward()` against an independent oracle (the route table read from
//! disk, a raw-TCP request written by the test, and the raw fake's request log).

mod common;

use std::collections::BTreeSet;
use std::net::SocketAddr;
use std::time::{Duration, Instant};

use common::*;
use http_body_util::BodyExt;
use hyper::http::HeaderValue;
use kitty_core::client::{ContractClient, ReadOutcome, Timings, TransportFailure, BODY_CAP};
use kitty_core::endpoint::{EndpointError, ServiceEndpoint};
use kitty_core::forward::upstream_request_headers;
use kitty_core::routes::ReadRequest;
use kitty_stub::Selection;

const READ_ACCEPT: &str = "application/json, application/problem+json";

fn client(endpoint: ServiceEndpoint) -> ContractClient {
    ContractClient::new(endpoint, &test_timings())
}

async fn read(client: &ContractClient, req: ReadRequest<'_>) -> ReadOutcome {
    within("read", client.read(&req)).await
}

fn answer(outcome: ReadOutcome) -> (u16, Option<HeaderValue>, Vec<u8>) {
    match outcome {
        ReadOutcome::Answer {
            status,
            content_type,
            body,
        } => (status, content_type, body.to_vec()),
        other => panic!("expected an answer, got {other:?}"),
    }
}

fn transport(outcome: ReadOutcome) -> TransportFailure {
    match outcome {
        ReadOutcome::Transport(failure) => failure,
        other => panic!("expected a transport failure, got {other:?}"),
    }
}

fn project_request() -> ReadRequest<'static> {
    ReadRequest {
        operation_id: "getProject",
        path: &[],
        query: &[],
    }
}

// ---- The harness's own smoke test --------------------------------------------------------------------------------

#[tokio::test]
async fn harness_smoke() {
    // The stub answers, and its last-request report names the request.
    let running = stub(StubSpec::default()).await;
    let reply = raw_get(running.port, "/api/v1/project", &host_of(running.port)).await;
    assert_eq!(reply.status, 200);
    assert_eq!(last_request(&running).await["path"], "/api/v1/project");
    let doc = raw_get(running.port, "/api/v1/openapi.yaml", &host_of(running.port)).await;
    assert_eq!(doc.status, 200);
    let absent = stub(StubSpec {
        document: Doc::Absent,
        ..StubSpec::default()
    })
    .await;
    let none = raw_get(absent.port, "/api/v1/openapi.yaml", &host_of(absent.port)).await;
    assert_eq!(none.status, 404);

    // The raw fake logs the head and replays its script on every connection.
    let fake = raw_fake(vec![Step::Write(http_ok("text/plain", b"hi"))]).await;
    for _ in 0..2 {
        let reply = raw_get(fake.port, "/x?a=b", &host_of(fake.port)).await;
        assert_eq!((reply.status, reply.body.as_slice()), (200, &b"hi"[..]));
    }
    let log = fake.requests();
    assert_eq!(log.len(), 2);
    assert_eq!(
        (log[0].method.as_str(), log[0].target.as_str()),
        ("GET", "/x?a=b")
    );
    assert_eq!(
        log[0].headers,
        vec![
            ("host".to_owned(), host_of(fake.port)),
            ("connection".to_owned(), "close".to_owned())
        ]
    );
    let dropped = raw_fake(vec![Step::Drop]).await;
    let outcome = read(&client(dropped.endpoint), project_request()).await;
    assert!(matches!(transport(outcome), TransportFailure::Io(_)));

    // The scratch directory is removed on drop, also when a failing test unwinds.
    let kept;
    {
        let dir = TempDir::new("smoke");
        kept = dir.path().to_path_buf();
        write_scenario(dir.path(), &["ready", "crash-after"], Some(50));
        let text = std::fs::read_to_string(dir.path().join("kitty-fake-service.json")).unwrap();
        let value: serde_json::Value = serde_json::from_str(&text).unwrap();
        assert_eq!(
            value["launches"],
            serde_json::json!(["ready", "crash-after"])
        );
        assert_eq!(value["crashAfterMs"], 50);
        assert!(kept.is_dir());
    }
    assert!(!kept.exists(), "TempDir removes itself on drop");

    // The squatter holds a port, answers, and frees the port when dropped.
    let probe = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = probe.local_addr().unwrap().port();
    drop(probe);
    let guard = squatter(port, Some(b"squat".to_vec()), None);
    let mut seen = Vec::new();
    {
        use tokio::io::AsyncReadExt;
        let mut stream = within(
            "squatter connect",
            tokio::net::TcpStream::connect(("127.0.0.1", port)),
        )
        .await
        .unwrap();
        let mut buf = [0u8; 5];
        within("squatter read", stream.read_exact(&mut buf))
            .await
            .unwrap();
        seen.extend_from_slice(&buf);
    }
    assert_eq!(seen, b"squat");
    assert!(
        std::net::TcpListener::bind(("127.0.0.1", port)).is_err(),
        "the squatter holds the port"
    );
    drop(guard);
    within("port is freed", async {
        while std::net::TcpListener::bind(("127.0.0.1", port)).is_err() {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await;
    assert_no_panics();
}

// ---- T023.1: every read against the independent oracle -------------------------------------------------------------

#[tokio::test]
async fn every_read_matches_a_raw_request() {
    let routes: serde_json::Value = {
        let path = fixtures_dir().join("mission-status.routes.json");
        serde_json::from_str(&std::fs::read_to_string(path).expect("routes.json on disk"))
            .expect("routes.json parses")
    };
    let running = stub(StubSpec::default()).await;
    let client = client(running.endpoint);
    let mut ran = 0;
    for entry in routes.as_array().expect("routes is an array") {
        if entry["kind"] != "read" {
            continue;
        }
        let operation = entry["operationId"].as_str().unwrap();
        let template = entry["path"].as_str().unwrap();
        let target = format!(
            "/api/v1{}",
            template
                .replace("{missionId}", MISSION_ID)
                .replace("{wpId}", "WP01")
        );
        assert!(!target.contains('{'), "{operation}: unfilled template");
        let oracle = raw_get(running.port, &target, &host_of(running.port)).await;
        let path = [("missionId", MISSION_ID), ("wpId", "WP01")];
        let relayed = read(
            &client,
            ReadRequest {
                operation_id: operation,
                path: &path,
                query: &[],
            },
        )
        .await;
        let (status, content_type, body) = answer(relayed);
        assert_eq!(status, oracle.status, "{operation}: status");
        assert_eq!(
            content_type.as_ref().map(|v| v.to_str().unwrap()),
            oracle.header("content-type"),
            "{operation}: content-type"
        );
        assert_eq!(body, oracle.body, "{operation}: body bytes");
        assert!(!body.is_empty(), "{operation}: body is not empty");
        ran += 1;
    }
    assert_eq!(ran, 9, "the nine reads of the route table");
    assert_no_panics();
}

// ---- T023.2: byte identity -------------------------------------------------------------------------------------------

#[tokio::test]
async fn the_body_is_relayed_byte_for_byte() {
    let body = br#"{"zeta":null,"alpha":[1, 2,3 ],"unknownField":{"b":null,"a":true}}  "#;
    let fake = raw_fake(vec![Step::Write(http_ok("application/json", body))]).await;
    let (status, content_type, relayed) =
        answer(read(&client(fake.endpoint), project_request()).await);
    assert_eq!(status, 200);
    assert_eq!(content_type.unwrap(), "application/json");
    assert_eq!(relayed, body.to_vec());
    assert_no_panics();
}

// ---- T023.3: refusals are answers, and nothing retries ---------------------------------------------------------------

#[tokio::test]
async fn refusals_are_relayed_once() {
    let running = stub(StubSpec {
        selections: vec![(
            "getArtifactContent".to_owned(),
            Selection::Example("ArtifactRefusal.not-found".to_owned()),
        )],
        ..StubSpec::default()
    })
    .await;
    let path = [("missionId", MISSION_ID)];
    let query = [("path", "tasks/none.md")];
    let (status, content_type, body) = answer(
        read(
            &client(running.endpoint),
            ReadRequest {
                operation_id: "getArtifactContent",
                path: &path,
                query: &query,
            },
        )
        .await,
    );
    let examples = fixture_json("examples");
    assert_eq!(status, 404);
    assert!(content_type
        .unwrap()
        .to_str()
        .unwrap()
        .starts_with("application/problem+json"));
    let relayed: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(relayed, examples["ArtifactRefusal.not-found"]["value"]);

    let unavailable = b"{\"title\":\"down\"}";
    let reply = format!(
        "HTTP/1.1 503 Service Unavailable\r\ncontent-type: application/problem+json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
        unavailable.len()
    );
    let mut script = reply.into_bytes();
    script.extend_from_slice(unavailable);
    let fake = raw_fake(vec![Step::Write(script)]).await;
    let (status, _, body) = answer(read(&client(fake.endpoint), project_request()).await);
    assert_eq!(status, 503);
    assert_eq!(body, unavailable.to_vec());
    assert_eq!(fake.requests().len(), 1, "a 503 is not retried");
    assert_no_panics();
}

// ---- T023.4: exact headers ------------------------------------------------------------------------------------------------

#[tokio::test]
async fn a_read_sends_exactly_host_and_accept() {
    let fake = raw_fake(vec![Step::Write(http_ok("application/json", b"{}"))]).await;
    answer(read(&client(fake.endpoint), project_request()).await);
    let log = fake.requests();
    assert_eq!(log.len(), 1);
    assert_eq!(log[0].method, "GET");
    let mut headers = log[0].headers.clone();
    headers.sort();
    assert_eq!(
        headers,
        vec![
            ("accept".to_owned(), READ_ACCEPT.to_owned()),
            ("host".to_owned(), format!("127.0.0.1:{}", fake.port)),
        ]
    );

    // Positive control: the stub's guard answers 403 to a wrong Host and 200 to the right one, so the exact Host
    // the client sends is what lets it through.
    let running = stub(StubSpec::default()).await;
    let wrong = raw_get(running.port, "/api/v1/project", "evil.example").await;
    assert_eq!(wrong.status, 403);
    let right = raw_get(running.port, "/api/v1/project", &host_of(running.port)).await;
    assert_eq!(right.status, 200);
    let (status, ..) = answer(read(&client(running.endpoint), project_request()).await);
    assert_eq!(status, 200);
    assert_no_panics();
}

// ---- T023.5: loopback only --------------------------------------------------------------------------------------------------

#[tokio::test]
async fn only_loopback_endpoints_exist_and_nothing_connects_for_a_refused_one() {
    let fake = raw_fake(vec![Step::Write(http_ok("application/json", b"{}"))]).await;
    let port = fake.port;
    let refused = [
        (format!("0.0.0.0:{port}"), EndpointError::NotLoopback),
        (format!("127.0.0.2:{port}"), EndpointError::NotLoopback),
        (format!("[::1]:{port}"), EndpointError::NotLoopback),
        (format!("192.0.2.1:{port}"), EndpointError::NotLoopback),
        ("127.0.0.1:0".to_owned(), EndpointError::ZeroPort),
    ];
    let mut ran = 0;
    for (text, expected) in refused {
        let addr: SocketAddr = text.parse().unwrap();
        assert_eq!(
            ServiceEndpoint::try_from(addr).err(),
            Some(expected),
            "{text}"
        );
        ran += 1;
    }
    assert_eq!(ran, 5);
    assert!(fake.requests().is_empty(), "no connection reached the fake");

    // Positive control: the accepted form does reach it.
    let accepted = ServiceEndpoint::try_from(SocketAddr::from(([127, 0, 0, 1], port))).unwrap();
    answer(read(&client(accepted), project_request()).await);
    assert_eq!(fake.requests().len(), 1);
    assert_no_panics();
}

// ---- T023.6: encoding and refusals before I/O ---------------------------------------------------------------------------------

#[tokio::test]
async fn query_values_are_encoded_and_unsafe_path_values_send_nothing() {
    let fake = raw_fake(vec![Step::Write(http_ok("application/json", b"{}"))]).await;
    let client = client(fake.endpoint);
    let path = [("missionId", MISSION_ID)];
    let query = [("path", "../../etc/passwd")];
    answer(
        read(
            &client,
            ReadRequest {
                operation_id: "getArtifactContent",
                path: &path,
                query: &query,
            },
        )
        .await,
    );
    let log = fake.requests();
    assert_eq!(log.len(), 1);
    assert_eq!(
        log[0].target,
        format!("/api/v1/missions/{MISSION_ID}/artifacts/content?path=..%2F..%2Fetc%2Fpasswd")
    );

    let bad_path = [("missionId", MISSION_ID), ("wpId", "WP01/../x")];
    let outcome = read(
        &client,
        ReadRequest {
            operation_id: "getWorkPackage",
            path: &bad_path,
            query: &[],
        },
    )
    .await;
    assert_eq!(
        transport(outcome),
        TransportFailure::InvalidParameter("wpId".to_owned())
    );
    let missing = read(
        &client,
        ReadRequest {
            operation_id: "getWorkPackage",
            path: &path,
            query: &[],
        },
    )
    .await;
    assert_eq!(
        transport(missing),
        TransportFailure::MissingParameter("wpId".to_owned())
    );
    let unknown = read(
        &client,
        ReadRequest {
            operation_id: "streamEvents",
            path: &[],
            query: &[],
        },
    )
    .await;
    assert_eq!(
        transport(unknown),
        TransportFailure::UnknownOperation("streamEvents".to_owned())
    );
    assert_eq!(fake.requests().len(), 1, "the three refusals sent nothing");
    assert_no_panics();
}

// ---- T023.7: limits ---------------------------------------------------------------------------------------------------------------

fn sized_reply(len: usize) -> Vec<Step> {
    let head = format!(
        "HTTP/1.1 200 OK\r\ncontent-type: application/octet-stream\r\ncontent-length: {len}\r\nconnection: close\r\n\r\n"
    );
    vec![Step::Write(head.into_bytes()), Step::Write(vec![b'x'; len])]
}

#[tokio::test]
async fn a_body_over_16_mib_is_refused_and_exactly_16_mib_is_relayed() {
    assert_eq!(BODY_CAP, 16 * 1024 * 1024);
    let over = raw_fake(sized_reply(BODY_CAP + 1)).await;
    let outcome = read(
        &ContractClient::new(over.endpoint, &long_timings()),
        project_request(),
    )
    .await;
    assert_eq!(
        transport(outcome),
        TransportFailure::BodyTooLarge { limit: BODY_CAP }
    );
    let exact = raw_fake(sized_reply(BODY_CAP)).await;
    let (status, _, body) = answer(
        read(
            &ContractClient::new(exact.endpoint, &long_timings()),
            project_request(),
        )
        .await,
    );
    assert_eq!((status, body.len()), (200, BODY_CAP));
    assert_no_panics();
}

/// Moving 16 MiB through a debug build takes longer than the 1 s test deadline; this test is about the cap.
fn long_timings() -> Timings {
    Timings {
        read_timeout: Duration::from_secs(8),
        ..test_timings()
    }
}

#[tokio::test]
async fn read_timeout_is_a_total_deadline() {
    // A stalled body: the head arrives, the body never does.
    let stalled = raw_fake(vec![
        Step::Write(b"HTTP/1.1 200 OK\r\ncontent-length: 100\r\n\r\n".to_vec()),
        Step::Stall,
    ])
    .await;
    let started = Instant::now();
    let outcome = read(&client(stalled.endpoint), project_request()).await;
    assert_eq!(transport(outcome), TransportFailure::Timeout);
    let waited = started.elapsed();
    assert!(
        waited >= Duration::from_millis(900) && waited < Duration::from_millis(2500),
        "{waited:?}"
    );

    // A dribbling body: no single gap reaches the timeout, but the total does.
    let mut script = vec![Step::Write(
        b"HTTP/1.1 200 OK\r\ncontent-length: 5\r\n\r\n".to_vec(),
    )];
    for _ in 0..5 {
        script.push(Step::Sleep(Duration::from_millis(400)));
        script.push(Step::Write(b"x".to_vec()));
    }
    let dribble = raw_fake(script).await;
    let outcome = read(&client(dribble.endpoint), project_request()).await;
    assert_eq!(transport(outcome), TransportFailure::Timeout);

    // Positive control: the same shape, finished inside the deadline, is an answer.
    let quick = raw_fake(vec![
        Step::Write(b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\n\r\n".to_vec()),
        Step::Sleep(Duration::from_millis(100)),
        Step::Write(b"ok".to_vec()),
    ])
    .await;
    let (status, _, body) = answer(read(&client(quick.endpoint), project_request()).await);
    assert_eq!((status, body), (200, b"ok".to_vec()));
    assert_no_panics();
}

#[tokio::test]
async fn a_closed_port_is_connect_refused() {
    let probe = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = probe.local_addr().unwrap().port();
    drop(probe);
    let outcome = read(&client(ServiceEndpoint::loopback(port)), project_request()).await;
    assert_eq!(transport(outcome), TransportFailure::ConnectRefused);
    assert_no_panics();
}

// ---- T023.8: forward() ----------------------------------------------------------------------------------------------------------

#[tokio::test]
async fn forward_streams_a_body_that_outlives_read_timeout() {
    let mut script = vec![Step::Write(http_stream_head("text/event-stream"))];
    for n in 0..5 {
        script.push(Step::Sleep(Duration::from_millis(300)));
        script.push(Step::Write(format!("data: frame-{n}\n\n").into_bytes()));
    }
    let fake = raw_fake(script).await;
    let client = client(fake.endpoint);
    let accept = HeaderValue::from_static("text/event-stream");
    let started = Instant::now();
    let response = within(
        "forward head",
        client.forward("/api/v1/events", accept.clone()),
    )
    .await
    .expect("head arrives");
    assert_eq!(response.status(), 200);
    let body = within("forward body", response.into_body().collect())
        .await
        .expect("body collects")
        .to_bytes();
    let elapsed = started.elapsed();
    let expected: String = (0..5).map(|n| format!("data: frame-{n}\n\n")).collect();
    assert_eq!(body.as_ref(), expected.as_bytes());
    assert!(
        elapsed > client_timeout() + Duration::from_millis(300),
        "the stream outlived read_timeout: {elapsed:?}"
    );

    let mut headers = fake.requests()[0].headers.clone();
    headers.sort();
    assert_eq!(
        headers,
        vec![
            ("accept".to_owned(), "text/event-stream".to_owned()),
            ("host".to_owned(), format!("127.0.0.1:{}", fake.port)),
        ]
    );
    assert_no_panics();
}

fn client_timeout() -> Duration {
    test_timings().read_timeout
}

#[tokio::test]
async fn forward_bounds_the_head_and_refuses_foreign_paths() {
    let silent = raw_fake(vec![Step::Stall]).await;
    let started = Instant::now();
    let result = within(
        "forward timeout",
        client(silent.endpoint).forward("/api/v1/project", HeaderValue::from_static("*/*")),
    )
    .await;
    assert_eq!(result.err(), Some(TransportFailure::Timeout));
    assert!(started.elapsed() >= Duration::from_millis(900));

    let fake = raw_fake(vec![Step::Write(http_ok("application/json", b"{}"))]).await;
    let client = client(fake.endpoint);
    let mut ran = 0;
    for path in [
        "/other",
        "/api/v1",
        "api/v1/project",
        "/api/v2/project",
        "http://127.0.0.1/api/v1/x",
        "",
    ] {
        let result = within(
            "forward refusal",
            client.forward(path, HeaderValue::from_static("*/*")),
        )
        .await;
        assert_eq!(
            result.err(),
            Some(TransportFailure::InvalidParameter(
                "path_and_query".to_owned()
            )),
            "{path:?}"
        );
        ran += 1;
    }
    assert_eq!(ran, 6);
    assert!(fake.requests().is_empty(), "refused paths sent nothing");
    // Positive control: a path under /api/v1/ goes through.
    let response = within(
        "forward ok",
        client.forward("/api/v1/project?x=1", HeaderValue::from_static("*/*")),
    )
    .await
    .expect("answered");
    assert_eq!(response.status(), 200);
    assert_eq!(fake.requests()[0].target, "/api/v1/project?x=1");
    assert_no_panics();
}

/// SEC-001 / ARCH-008: a target that could climb out of `/api/v1/` or smuggle a separator is refused before any
/// request goes out, whatever the spelling.
#[tokio::test]
async fn forward_refuses_traversal_separator_and_non_ascii_targets() {
    let fake = raw_fake(vec![Step::Write(http_ok("application/json", b"{}"))]).await;
    let client = client(fake.endpoint);
    let refused = [
        "/api/v1/missions/..",
        "/api/v1/missions/../x",
        "/api/v1/./project",
        "/api/v1/.",
        "/api/v1/missions/%2e%2e",
        "/api/v1/missions/%2E%2E",
        "/api/v1/missions/.%2e/x",
        "/api/v1/missions/%2e./x",
        "/api/v1/missions/..?x=1",
        "/api/v1/a\\b",
        "/api/v1/a%2fb",
        "/api/v1/a%2Fb",
        "/api/v1/a%5cb",
        "/api/v1/a%5Cb",
        "/api/v1//project",
        "/api/v1/project//x",
        "/api/v1/caf\u{e9}",
        "/api/v1/missions/..;/project",
        "/api/v1/..;/actuator",
        "/api/v1/project;jsessionid=1",
        "/api/v1/missions/%3b/x",
        "/api/v1/missions/..%3B/project",
        "/api/v1/project#frag",
        "/api/v1/project?x=\u{e9}",
    ];
    for path in refused {
        let result = within(
            "forward refusal",
            client.forward(path, HeaderValue::from_static("*/*")),
        )
        .await;
        assert_eq!(
            result.err(),
            Some(TransportFailure::InvalidParameter(
                "path_and_query".to_owned()
            )),
            "{path:?}"
        );
    }
    assert!(fake.requests().is_empty(), "refused paths sent nothing");
    // Positive controls: real contract paths, dots inside a segment, and a query string, all go through.
    let allowed = [
        "/api/v1/project",
        "/api/v1/missions/mission-01.v2",
        "/api/v1/missions/m-1/work-packages",
        "/api/v1/missions?limit=10&cursor=a..b",
        "/api/v1/project?x=1",
        "/api/v1/project?a=b;c=d",
        "/api/v1/project?a=%3b",
    ];
    for path in allowed {
        let fake = raw_fake(vec![Step::Write(http_ok("application/json", b"{}"))]).await;
        let response = within(
            "forward ok",
            self::client(fake.endpoint).forward(path, HeaderValue::from_static("*/*")),
        )
        .await
        .expect("answered");
        assert_eq!(response.status(), 200, "{path}");
        assert_eq!(fake.requests()[0].target, path);
    }
    assert_no_panics();
}

#[test]
fn upstream_headers_are_exactly_host_and_accept() {
    let headers = upstream_request_headers(
        &ServiceEndpoint::loopback(4173),
        HeaderValue::from_static("text/x"),
    );
    let names: BTreeSet<&str> = headers.keys().map(|k| k.as_str()).collect();
    assert_eq!(names, BTreeSet::from(["accept", "host"]));
    assert_eq!(headers["host"], "127.0.0.1:4173");
    assert_eq!(headers["accept"], "text/x");
    assert_no_panics();
}
