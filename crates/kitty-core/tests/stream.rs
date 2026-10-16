//! FR-007 to FR-010 (IC-05): the change stream against the in-process stub and the raw-TCP fake. Oracles are
//! `changes.json`, `examples.json` and `routes.json` read from disk, and the raw fake's request log.

mod common;

use std::time::{Duration, Instant};

use common::*;
use hyper::http::HeaderValue;
use kitty_core::client::{ContractClient, Timings, BODY_CAP};
use kitty_core::endpoint::ServiceEndpoint;
use kitty_core::sse::{
    ChangeStream, RawChange, StreamDiagnostic, StreamEvent, StreamOpenError, StreamScope,
    UnavailableReason, FRAME_CAP,
};
use kitty_stub::Selection;
use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::task::JoinHandle;

const SSE: &str = "text/event-stream";
const PROBLEM: &str = "application/problem+json";

fn client(endpoint: ServiceEndpoint) -> ContractClient {
    ContractClient::new(endpoint, &test_timings())
}

fn mission(cursor: Option<&str>) -> StreamScope {
    StreamScope::Mission {
        mission_id: MISSION_ID.to_owned(),
        cursor: cursor.map(str::to_owned),
    }
}

async fn open(client: &ContractClient, scope: StreamScope) -> ChangeStream {
    match within("open_stream", client.open_stream(scope)).await {
        Ok(stream) => stream,
        Err(refusal) => panic!("open_stream refused: {refusal:?}"),
    }
}

async fn next(stream: &mut ChangeStream) -> Option<StreamEvent> {
    within("next", stream.next()).await
}

async fn take(stream: &mut ChangeStream, n: usize) -> Vec<StreamEvent> {
    let mut items = Vec::new();
    for _ in 0..n {
        items.push(next(stream).await.expect("the stream still has an item"));
    }
    assert_eq!(items.len(), n);
    items
}

fn change(item: StreamEvent) -> RawChange {
    match item {
        StreamEvent::Change(change) => change,
        other => panic!("expected a change, got {other:?}"),
    }
}

/// After a terminal item the stream is fused: `None`, every time.
async fn assert_fused(stream: &mut ChangeStream) {
    for _ in 0..3 {
        assert_eq!(next(stream).await, None);
    }
}

/// The next item is `expected`, and then the stream is over.
async fn assert_terminal(stream: &mut ChangeStream, expected: StreamEvent) {
    assert_eq!(next(stream).await, Some(expected));
    assert_fused(stream).await;
}

fn unavailable(reason: UnavailableReason, status: Option<u16>, body: Option<&[u8]>) -> StreamEvent {
    StreamEvent::Unavailable {
        reason,
        status,
        body: body.map(|b| b.to_vec().into()),
    }
}

fn changes_items() -> Vec<Value> {
    let items = fixture_json("changes")["items"]
        .as_array()
        .cloned()
        .expect("changes.json has items");
    assert_eq!(items.len(), 5, "the oracle has five changes");
    items
}

/// A relayed change equals its `changes.json` item: event, cursor (`scopedId`, only when scoped) and data bytes.
fn assert_is_item(change: &RawChange, item: &Value, scoped: bool) {
    assert_eq!(Some(change.event.as_str()), item["event"].as_str());
    let expected_cursor = if scoped {
        item.get("scopedId").and_then(Value::as_str)
    } else {
        None
    };
    assert_eq!(change.cursor.as_deref(), expected_cursor);
    let parsed: Value = serde_json::from_slice(&change.data).expect("data is JSON");
    assert_eq!(parsed, item["data"]);
    assert_eq!(
        change.data.as_ref(),
        serde_json::to_vec(&item["data"]).expect("item serializes")
    );
}

fn sse_frame(event: &str, id: Option<&str>, data: &str) -> Vec<u8> {
    let mut frame = format!("event: {event}\n");
    if let Some(id) = id {
        frame.push_str(&format!("id: {id}\n"));
    }
    frame.push_str(&format!("data: {data}\n\n"));
    frame.into_bytes()
}

fn reply(status_line: &str, content_type: &str, body: &[u8]) -> Vec<u8> {
    let mut bytes = format!(
        "HTTP/1.1 {status_line}\r\ncontent-type: {content_type}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
        body.len()
    )
    .into_bytes();
    bytes.extend_from_slice(body);
    bytes
}

fn stream_script(then: Vec<Step>) -> Vec<Step> {
    let mut script = vec![Step::Write(http_stream_head(SSE))];
    script.extend(then);
    script
}

/// Opens `scope` on a fake with `script` and returns the guard with the stream.
async fn open_on_fake(script: Vec<Step>, scope: StreamScope) -> (RawFake, ChangeStream) {
    let fake = raw_fake(script).await;
    let stream = open(&client(fake.endpoint), scope).await;
    (fake, stream)
}

/// Reads a raw stream request until `needle` appeared or the harness deadline passed.
async fn raw_stream_until(port: u16, target: &str, needle: &[u8]) -> Vec<u8> {
    within("raw_stream_until", async {
        let mut stream = TcpStream::connect(("127.0.0.1", port))
            .await
            .expect("connects");
        let request = format!(
            "GET {target} HTTP/1.1\r\nHost: {}\r\nAccept: {SSE}\r\n\r\n",
            host_of(port)
        );
        stream.write_all(request.as_bytes()).await.expect("writes");
        let mut seen = Vec::new();
        let mut buf = [0u8; 4096];
        while !seen.windows(needle.len()).any(|w| w == needle) {
            let n = stream.read(&mut buf).await.expect("reads");
            assert!(n > 0, "the stream ended before the needle appeared");
            seen.extend_from_slice(&buf[..n]);
        }
        seen
    })
    .await
}

// ---- Against the stub (T027) --------------------------------------------------------------------------------------

#[tokio::test]
async fn scoped_stream_relays_changes_json_item_by_item() {
    let running = stub(StubSpec::default()).await;
    let mut stream = open(&client(running.endpoint), mission(None)).await;
    let items = changes_items();
    let got = take(&mut stream, items.len()).await;
    assert_eq!(got.len(), 5);
    let mut ran = 0;
    for (item, got) in items.iter().zip(got) {
        assert_is_item(&change(got), item, true);
        ran += 1;
    }
    assert_eq!(ran, 5);
    assert_no_panics();
}

#[tokio::test]
async fn unscoped_stream_has_no_cursors() {
    let running = stub(StubSpec::default()).await;
    let mut stream = open(&client(running.endpoint), StreamScope::All).await;
    let items = changes_items();
    let got = take(&mut stream, items.len()).await;
    let mut ran = 0;
    for (item, got) in items.iter().zip(got) {
        let got = change(got);
        assert_eq!(got.cursor, None);
        assert_is_item(&got, item, false);
        ran += 1;
    }
    assert_eq!(ran, 5);
    // Positive control: the same items carry a cursor when scoped (see the scoped test), so `None` here is the scope.
    assert!(items.iter().filter(|i| i.get("scopedId").is_some()).count() == 4);
    assert_no_panics();
}

#[tokio::test]
async fn log_truncated_is_its_own_kind_with_no_cursor() {
    let running = stub(StubSpec::default()).await;
    let mut stream = open(&client(running.endpoint), mission(None)).await;
    let got: Vec<RawChange> = take(&mut stream, 5).await.into_iter().map(change).collect();
    let truncated: Vec<&RawChange> = got.iter().filter(|c| c.event == "log-truncated").collect();
    assert_eq!(truncated.len(), 1);
    assert_eq!(truncated[0].cursor, None);
    // Positive control: the other four changes do carry a cursor.
    assert_eq!(got.iter().filter(|c| c.cursor.is_some()).count(), 4);
    assert_no_panics();
}

#[tokio::test]
async fn resume_relays_only_the_items_after_the_cursor_and_sends_stream_cursor() {
    let items = changes_items();
    let cursor = items[1]["scopedId"].as_str().expect("item 2 is scoped");
    let running = stub(StubSpec::default()).await;
    let mut stream = open(&client(running.endpoint), mission(Some(cursor))).await;
    let got = take(&mut stream, 3).await;
    let mut ran = 0;
    for (item, got) in items[2..].iter().zip(got) {
        assert_is_item(&change(got), item, true);
        ran += 1;
    }
    assert_eq!(ran, 3);
    // Nothing else is relayed: only heartbeats follow (see the heartbeat test for their existence).
    let more = tokio::time::timeout(Duration::from_millis(200), stream.next()).await;
    assert!(more.is_err(), "no fourth change: {more:?}");

    // The stub drops the query, so the raw fake's log is the oracle for the target.
    let (fake, _stream) =
        open_on_fake(stream_script(vec![Step::Stall]), mission(Some(cursor))).await;
    let encoded = cursor.replace(':', "%3A");
    assert_eq!(
        fake.requests()[0].target,
        format!("/api/v1/events?missionId={MISSION_ID}&streamCursor={encoded}")
    );
    // Positive control: without a cursor the target has no streamCursor.
    let (plain, _stream) = open_on_fake(stream_script(vec![Step::Stall]), mission(None)).await;
    assert_eq!(
        plain.requests()[0].target,
        format!("/api/v1/events?missionId={MISSION_ID}")
    );
    assert_no_panics();
}

#[tokio::test]
async fn heartbeats_are_never_relayed() {
    let running = stub(StubSpec::default()).await;
    let mut stream = open(&client(running.endpoint), mission(None)).await;
    take(&mut stream, 5).await;
    let silence = tokio::time::timeout(Duration::from_millis(250), stream.next()).await;
    assert!(silence.is_err(), "a heartbeat leaked: {silence:?}");
    // Positive control: heartbeats do arrive on the wire, every 50 ms.
    let wire = raw_stream_until(running.port, "/api/v1/events", b": heartbeat\n\n").await;
    assert!(wire.windows(12).any(|w| w == b": heartbeat\n"));
    assert_no_panics();
}

#[tokio::test]
async fn the_five_stream_refusals_are_one_refused_each() {
    let examples: Value = fixture_json("examples");
    let names: Vec<String> = examples
        .as_object()
        .expect("examples is an object")
        .keys()
        .filter(|k| k.starts_with("StreamRefusal."))
        .cloned()
        .collect();
    assert_eq!(names.len(), 5);
    let mut ran = 0;
    for name in &names {
        let expected = &examples[name.as_str()]["value"];
        let running = stub(StubSpec {
            selections: vec![("streamEvents".to_owned(), Selection::Example(name.clone()))],
            ..StubSpec::default()
        })
        .await;
        let mut stream = open(&client(running.endpoint), mission(None)).await;
        let status = expected["status"].as_u64().expect("refusal has a status") as u16;
        assert_terminal(
            &mut stream,
            StreamEvent::Refused {
                status,
                content_type: Some(HeaderValue::from_static(PROBLEM)),
                body: serde_json::to_vec(expected).expect("serializes").into(),
            },
        )
        .await;
        ran += 1;
    }
    assert_eq!(ran, 5);
    assert_no_panics();
}

#[tokio::test]
async fn a_404_problem_from_the_stub_is_one_refused() {
    let problem = json!({
        "type": "about:blank",
        "title": "Not found",
        "status": 404,
        "detail": "No such Mission."
    });
    let expected_body = serde_json::to_vec(&problem).expect("serializes");
    let patched = problem.clone();
    let running = stub(StubSpec {
        patch: Some(Box::new(move |values| {
            values
                .examples
                .as_object_mut()
                .expect("examples is an object")
                .insert(
                    "Problem.not-found".to_owned(),
                    json!({ "schema": "Problem", "value": patched }),
                );
        })),
        selections: vec![(
            "streamEvents".to_owned(),
            Selection::Example("Problem.not-found".to_owned()),
        )],
        ..StubSpec::default()
    })
    .await;
    let mut stream = open(&client(running.endpoint), mission(None)).await;
    assert_terminal(
        &mut stream,
        StreamEvent::Refused {
            status: 404,
            content_type: Some(HeaderValue::from_static(PROBLEM)),
            body: expected_body.into(),
        },
    )
    .await;
    assert_no_panics();
}

#[tokio::test]
async fn invalid_scopes_send_nothing() {
    let fake = raw_fake(stream_script(vec![Step::Stall])).await;
    let client = client(fake.endpoint);
    let cursor_only = StreamScope::Mission {
        mission_id: String::new(),
        cursor: Some("1:ab".to_owned()),
    };
    let empty = StreamScope::Mission {
        mission_id: String::new(),
        cursor: None,
    };
    let refusals = [
        (cursor_only, StreamOpenError::CursorWithoutMission),
        (empty, StreamOpenError::EmptyMission),
    ];
    let mut ran = 0;
    for (scope, expected) in refusals {
        let got = within("open_stream", client.open_stream(scope)).await.err();
        // `StreamOpenError` is `#[non_exhaustive]`: a match from outside needs the wildcard arm.
        match got {
            Some(StreamOpenError::CursorWithoutMission) => {
                assert_eq!(expected, StreamOpenError::CursorWithoutMission)
            }
            Some(StreamOpenError::EmptyMission) => {
                assert_eq!(expected, StreamOpenError::EmptyMission)
            }
            Some(_) | None => panic!("expected {expected:?}, got {got:?}"),
        }
        ran += 1;
    }
    assert_eq!(ran, 2);
    assert!(fake.requests().is_empty(), "nothing reached the fake");
    // Positive control: a valid scope sends exactly one request, and the log would have shown an earlier one.
    let _stream = open(&client, mission(None)).await;
    assert_eq!(fake.requests().len(), 1);
    assert_no_panics();
}

#[tokio::test]
async fn the_stream_request_carries_exactly_host_and_accept() {
    let (fake, _stream) =
        open_on_fake(stream_script(vec![Step::Stall]), mission(Some("1:ab"))).await;
    let log = fake.requests();
    assert_eq!(log.len(), 1);
    let head = &log[0];
    assert_eq!(head.method, "GET");
    assert_eq!(
        head.target,
        format!("/api/v1/events?missionId={MISSION_ID}&streamCursor=1%3Aab")
    );
    // Positive control: the entry has exactly the two expected headers.
    assert_eq!(head.headers.len(), 2);
    let mut headers = head.headers.clone();
    headers.sort();
    assert_eq!(
        headers,
        vec![
            ("accept".to_owned(), SSE.to_owned()),
            ("host".to_owned(), host_of(fake.port)),
        ]
    );
    for forbidden in [
        "origin",
        "forwarded",
        "authorization",
        "cookie",
        "last-event-id",
    ] {
        assert!(
            head.headers.iter().all(|(n, _)| n != forbidden),
            "{forbidden} was sent"
        );
    }
    assert!(head
        .headers
        .iter()
        .all(|(n, _)| !n.starts_with("x-forwarded-")));
    assert_no_panics();
}

// ---- Faults on the raw fake (T028) --------------------------------------------------------------------------------

#[tokio::test]
async fn a_503_at_open_is_unavailable_status_with_the_body() {
    let script = vec![Step::Write(reply(
        "503 Service Unavailable",
        "text/plain",
        b"down",
    ))];
    let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
    assert_terminal(
        &mut stream,
        unavailable(UnavailableReason::Status, Some(503), Some(b"down")),
    )
    .await;
    assert_no_panics();
}

#[tokio::test]
async fn declared_statuses_are_refused_and_every_other_status_is_unavailable() {
    let routes = fixture_json("routes");
    let stream_route = routes
        .as_array()
        .and_then(|r| r.iter().find(|e| e["operationId"] == "streamEvents"))
        .expect("routes.json has streamEvents");
    let declared: Vec<u16> = stream_route["refusals"]
        .as_object()
        .expect("refusals")
        .values()
        .flat_map(|v| v.as_array().expect("statuses").iter())
        .map(|s| s.as_u64().expect("status") as u16)
        .collect();
    assert_eq!(declared.len(), 3);
    let mut ran = 0;
    for status in [400u16, 404, 409, 403, 500, 302] {
        let body = br#"{"status":0}"#;
        let line = format!("{status} Whatever");
        let (_fake, mut stream) = open_on_fake(
            vec![Step::Write(reply(&line, PROBLEM, body))],
            mission(None),
        )
        .await;
        let expected = if declared.contains(&status) {
            StreamEvent::Refused {
                status,
                content_type: Some(HeaderValue::from_static(PROBLEM)),
                body: body.to_vec().into(),
            }
        } else {
            unavailable(UnavailableReason::Status, Some(status), Some(body))
        };
        assert_terminal(&mut stream, expected).await;
        ran += 1;
    }
    assert_eq!(ran, 6);
    assert_no_panics();
}

#[tokio::test]
async fn a_raw_404_problem_is_one_refused_with_the_raw_body() {
    let body = br#"{"type":"about:blank","title":"Not found","status":404}"#;
    let (_fake, mut stream) = open_on_fake(
        vec![Step::Write(reply("404 Not Found", PROBLEM, body))],
        mission(None),
    )
    .await;
    assert_terminal(
        &mut stream,
        StreamEvent::Refused {
            status: 404,
            content_type: Some(HeaderValue::from_static(PROBLEM)),
            body: body.to_vec().into(),
        },
    )
    .await;
    assert_no_panics();
}

#[tokio::test]
async fn a_drop_mid_stream_and_a_clean_eof_are_dropped() {
    let first = sse_frame("mission-lifecycle", Some("1:aa"), "{}");
    let mut ran = 0;
    for script in [
        stream_script(vec![Step::Write(first.clone()), Step::Drop]),
        stream_script(vec![Step::Write(first.clone())]),
    ] {
        let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
        let got = change(next(&mut stream).await.expect("the change comes first"));
        assert_eq!(got.event, "mission-lifecycle");
        assert_eq!(got.cursor.as_deref(), Some("1:aa"));
        assert_terminal(
            &mut stream,
            unavailable(UnavailableReason::Dropped, None, None),
        )
        .await;
        ran += 1;
    }
    assert_eq!(ran, 2);
    assert_no_panics();
}

#[tokio::test]
async fn heartbeats_keep_a_stream_alive_past_the_idle_limit_then_a_stall_is_idle() {
    let mut then = Vec::new();
    for _ in 0..6 {
        then.push(Step::Write(b": heartbeat\n\n".to_vec()));
        then.push(Step::Sleep(Duration::from_millis(100)));
    }
    then.push(Step::Stall);
    let (_fake, mut stream) = open_on_fake(stream_script(then), mission(None)).await;
    let started = Instant::now();
    assert_terminal(
        &mut stream,
        unavailable(
            UnavailableReason::Idle {
                limit: Duration::from_millis(300),
            },
            None,
            None,
        ),
    )
    .await;
    // The idle limit is 300 ms, yet the stream lived for the 500 ms of heartbeats and 300 ms more.
    assert!(
        started.elapsed() >= Duration::from_millis(700),
        "idle came after {:?}",
        started.elapsed()
    );
    assert_no_panics();
}

#[tokio::test]
async fn a_stream_with_no_byte_at_all_is_idle() {
    let (_fake, mut stream) = open_on_fake(stream_script(vec![Step::Stall]), mission(None)).await;
    let started = Instant::now();
    assert_terminal(
        &mut stream,
        unavailable(
            UnavailableReason::Idle {
                limit: Duration::from_millis(300),
            },
            None,
            None,
        ),
    )
    .await;
    assert!(started.elapsed() >= Duration::from_millis(250));
    assert_no_panics();
}

#[tokio::test]
async fn malformed_utf8_is_a_malformed_frame_after_the_changes_before_it() {
    let mut bad = b"data: \xff\n\n".to_vec();
    bad.extend(sse_frame("status-transition", None, "{}"));
    let script = stream_script(vec![
        Step::Write(sse_frame("log-truncated", None, "{}")),
        Step::Write(bad),
    ]);
    let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
    assert_eq!(
        change(next(&mut stream).await.expect("first")).event,
        "log-truncated"
    );
    // The valid frame after the bad line is never relayed.
    assert_terminal(
        &mut stream,
        unavailable(UnavailableReason::MalformedFrame, None, None),
    )
    .await;
    assert_no_panics();
}

#[tokio::test]
async fn data_that_is_not_one_json_value_is_malformed_data() {
    let mut ran = 0;
    for data in ["not json", "{} {}", "", "{\"a\":"] {
        let script = stream_script(vec![Step::Write(sse_frame(
            "status-transition",
            None,
            data,
        ))]);
        let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
        assert_terminal(
            &mut stream,
            unavailable(UnavailableReason::MalformedData, None, None),
        )
        .await;
        ran += 1;
    }
    assert_eq!(ran, 4);
    // Positive control: one JSON value of any shape is relayed, bytes unchanged.
    let script = stream_script(vec![Step::Write(sse_frame(
        "status-transition",
        None,
        " [1, 2] ",
    ))]);
    let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
    let got = change(next(&mut stream).await.expect("a change"));
    assert_eq!(got.data.as_ref(), b" [1, 2] ");
    assert_no_panics();
}

#[tokio::test]
async fn a_frame_over_1_mib_is_frame_too_large_and_nothing_partial_is_relayed() {
    let prefix = b"event: status-transition\ndata: ".to_vec();
    let mut over = prefix.clone();
    over.resize(FRAME_CAP + 1, b'a');
    let (_fake, mut stream) =
        open_on_fake(stream_script(vec![Step::Write(over)]), mission(None)).await;
    assert_terminal(
        &mut stream,
        unavailable(
            UnavailableReason::FrameTooLarge { limit: 1024 * 1024 },
            None,
            None,
        ),
    )
    .await;

    // Positive control: a frame of exactly the cap is relayed whole. Its data is a JSON string.
    let fill = FRAME_CAP - prefix.len() - 2 - 2;
    let mut exact = prefix;
    exact.push(b'"');
    exact.resize(exact.len() + fill, b'a');
    exact.extend_from_slice(b"\"\n\n");
    assert_eq!(exact.len(), FRAME_CAP);
    let (_fake, mut stream) =
        open_on_fake(stream_script(vec![Step::Write(exact)]), mission(None)).await;
    let got = change(next(&mut stream).await.expect("the exact-cap frame"));
    assert_eq!(got.data.len(), fill + 2);
    assert_no_panics();
}

#[tokio::test]
async fn an_unknown_event_is_a_diagnostic_and_the_stream_continues() {
    let mut chunk = sse_frame("weird", None, "{}");
    chunk.extend(sse_frame("other", Some("9:zz"), "not json"));
    chunk.extend(sse_frame("status-transition", Some("2:bb"), "{\"k\":1}"));
    let (_fake, mut stream) =
        open_on_fake(stream_script(vec![Step::Write(chunk)]), mission(None)).await;
    let got = take(&mut stream, 3).await;
    assert_eq!(
        got[0],
        StreamEvent::Diagnostic(StreamDiagnostic::UnknownEvent {
            event: "weird".to_owned()
        })
    );
    assert_eq!(
        got[1],
        StreamEvent::Diagnostic(StreamDiagnostic::UnknownEvent {
            event: "other".to_owned()
        })
    );
    let last = change(got[2].clone());
    assert_eq!(
        (last.event.as_str(), last.cursor.as_deref()),
        ("status-transition", Some("2:bb"))
    );
    assert_terminal(
        &mut stream,
        unavailable(UnavailableReason::Dropped, None, None),
    )
    .await;
    assert_no_panics();
}

#[tokio::test]
async fn a_200_that_is_not_an_event_stream_is_unavailable_status() {
    let no_type = b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\nconnection: close\r\n\r\nhi".to_vec();
    let mut ran = 0;
    for script in [
        vec![Step::Write(http_ok("text/plain", b"hi"))],
        vec![Step::Write(no_type)],
    ] {
        let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
        assert_terminal(
            &mut stream,
            unavailable(UnavailableReason::Status, Some(200), Some(b"hi")),
        )
        .await;
        ran += 1;
    }
    assert_eq!(ran, 2);
    // Positive control: parameters on the right type are fine.
    let head = b"HTTP/1.1 200 OK\r\ncontent-type: Text/Event-Stream; charset=utf-8\r\nconnection: close\r\n\r\n";
    let script = vec![
        Step::Write(head.to_vec()),
        Step::Write(sse_frame("log-truncated", None, "{}")),
    ];
    let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
    assert_eq!(
        change(next(&mut stream).await.expect("a change")).event,
        "log-truncated"
    );
    assert_no_panics();
}

#[tokio::test]
async fn terminal_bodies_are_bounded_by_the_deadline_and_the_cap() {
    let timings = Timings {
        read_timeout: Duration::from_millis(300),
        ..test_timings()
    };
    // A 409 that never ends.
    let head = b"HTTP/1.1 409 Conflict\r\ncontent-type: application/problem+json\r\nconnection: close\r\n\r\n";
    let fake = raw_fake(vec![
        Step::Write(head.to_vec()),
        Step::Write(b"{\"status\":".to_vec()),
        Step::Stall,
    ])
    .await;
    let started = Instant::now();
    let mut stream = open(&ContractClient::new(fake.endpoint, &timings), mission(None)).await;
    assert_terminal(
        &mut stream,
        unavailable(UnavailableReason::Timeout, Some(409), None),
    )
    .await;
    assert!(started.elapsed() < Duration::from_secs(1));

    // A 409 of 16 MiB + 1 is over the cap; the body is not returned.
    let big = vec![b'x'; BODY_CAP + 1];
    let (_fake, mut stream) = open_on_fake(
        vec![Step::Write(reply("409 Conflict", PROBLEM, &big))],
        mission(None),
    )
    .await;
    assert_terminal(
        &mut stream,
        unavailable(
            UnavailableReason::BodyTooLarge { limit: BODY_CAP },
            Some(409),
            None,
        ),
    )
    .await;

    // Positive control: exactly 16 MiB is still a refusal with its whole body.
    let exact = vec![b'x'; BODY_CAP];
    let (_fake, mut stream) = open_on_fake(
        vec![Step::Write(reply("409 Conflict", PROBLEM, &exact))],
        mission(None),
    )
    .await;
    match next(&mut stream).await {
        Some(StreamEvent::Refused {
            status: 409, body, ..
        }) => assert_eq!(body.len(), BODY_CAP),
        other => panic!(
            "expected the whole 16 MiB refusal, got a different item: {}",
            other.is_some()
        ),
    }
    assert_fused(&mut stream).await;
    assert_no_panics();
}

#[tokio::test]
async fn a_refused_connection_and_a_silent_server_are_unavailable() {
    let probe = std::net::TcpListener::bind("127.0.0.1:0").expect("binds");
    let port = probe.local_addr().expect("address").port();
    drop(probe);
    let mut stream = open(&client(ServiceEndpoint::loopback(port)), mission(None)).await;
    assert_terminal(
        &mut stream,
        unavailable(UnavailableReason::ConnectRefused, None, None),
    )
    .await;

    // A server that accepts and never answers: the head is bounded by `read_timeout`.
    let timings = Timings {
        read_timeout: Duration::from_millis(300),
        ..test_timings()
    };
    let fake = raw_fake(vec![Step::Stall]).await;
    let started = Instant::now();
    let mut stream = open(&ContractClient::new(fake.endpoint, &timings), mission(None)).await;
    assert_terminal(
        &mut stream,
        unavailable(UnavailableReason::Timeout, None, None),
    )
    .await;
    assert!(started.elapsed() >= Duration::from_millis(250));
    assert_eq!(fake.requests().len(), 1);
    assert_no_panics();
}

#[tokio::test]
async fn next_is_cancel_safe_and_a_dropped_stream_closes_the_connection() {
    let script = stream_script(vec![
        Step::Write(b"event: status-transition\nda".to_vec()),
        Step::Sleep(Duration::from_millis(200)),
        Step::Write(b"ta: {\"k\":1}\n\n".to_vec()),
        Step::Stall,
    ]);
    let (_fake, mut stream) = open_on_fake(script, mission(None)).await;
    // The first half reaches the reader while the future is alive; the future is then dropped.
    let cancelled = tokio::time::timeout(Duration::from_millis(60), stream.next()).await;
    assert!(cancelled.is_err());
    let got = change(
        next(&mut stream)
            .await
            .expect("the change survives the cancel"),
    );
    assert_eq!(got.event, "status-transition");
    assert_eq!(got.data.as_ref(), b"{\"k\":1}");

    // Dropping the stream closes the socket: the server side sees the end of the connection.
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("binds");
    let port = listener.local_addr().expect("address").port();
    let (closed_tx, closed_rx) = tokio::sync::oneshot::channel::<()>();
    let server: JoinHandle<()> = tokio::spawn(async move {
        let Ok((mut socket, _)) = listener.accept().await else {
            return;
        };
        let mut buf = [0u8; 1024];
        let _ = socket.read(&mut buf).await;
        let _ = socket.write_all(&http_stream_head(SSE)).await;
        loop {
            match socket.read(&mut buf).await {
                Ok(0) | Err(_) => break,
                Ok(_) => {}
            }
        }
        let _ = closed_tx.send(());
    });
    struct AbortOnDrop(JoinHandle<()>);
    impl Drop for AbortOnDrop {
        fn drop(&mut self) {
            self.0.abort();
        }
    }
    let _server = AbortOnDrop(server);
    let live = open(&client(ServiceEndpoint::loopback(port)), mission(None)).await;
    drop(live);
    within("the server sees the connection close", closed_rx)
        .await
        .expect("the server reports the close");
    assert_no_panics();
}
