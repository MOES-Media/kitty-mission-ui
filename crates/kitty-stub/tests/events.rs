//! FR-011, NFR-004: `GET /api/v1/events` replays `changes.json` over SSE, with `id:` lines only on a mission-scoped
//! request, then heartbeats; the bytes are identical across runs. The oracle is `changes.json`, read independently.

mod common;

use axum::body::Body;
use axum::http::StatusCode;
use common::*;
use serde_json::Value;

struct Event {
    name: String,
    id: Option<String>,
    data: Value,
}

/// Parses SSE blocks up to the first heartbeat comment. Every non-comment block must be a well-formed event.
fn parse(stream: &str) -> Vec<Event> {
    let (events, rest) = stream
        .split_once(": heartbeat\n\n")
        .expect("stream reaches a heartbeat");
    assert_eq!(rest, "", "nothing after the first heartbeat was captured");
    events
        .split("\n\n")
        .filter(|block| !block.is_empty())
        .map(|block| {
            let mut name = None;
            let mut id = None;
            let mut data = None;
            for line in block.lines() {
                let (field, value) = line
                    .split_once(": ")
                    .unwrap_or_else(|| panic!("field line: {line:?}"));
                match field {
                    "event" => name = Some(value.to_string()),
                    "id" => id = Some(value.to_string()),
                    "data" => {
                        data = Some(serde_json::from_str(value).expect("data is one-line JSON"))
                    }
                    other => panic!("unexpected field {other}"),
                }
            }
            Event {
                name: name.expect("event line"),
                id,
                data: data.expect("data line"),
            }
        })
        .collect()
}

async fn capture(uri: &str) -> Reply {
    capture_until_heartbeat(stub(), get(uri).body(Body::empty()).unwrap()).await
}

fn items() -> Vec<Value> {
    oracle("changes")["items"]
        .as_array()
        .expect("changes.json items")
        .clone()
}

#[tokio::test]
async fn a_mission_scoped_stream_replays_changes_with_ids() {
    let reply = capture(&format!("/api/v1/events?missionId={MISSION_ID}")).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.content_type(), "text/event-stream");
    let events = parse(std::str::from_utf8(&reply.body).unwrap());
    let items = items();
    assert_eq!(events.len(), items.len());
    let mut ran = 0;
    let mut ids = 0;
    for (event, item) in events.iter().zip(&items) {
        assert_eq!(event.name, item["event"].as_str().unwrap());
        assert_eq!(event.id.as_deref(), item["scopedId"].as_str());
        assert_eq!(event.data, item["data"]);
        if item["event"] == "log-truncated" {
            assert_eq!(event.id, None, "R3-04: no id on log-truncated");
        }
        ids += event.id.is_some() as usize;
        ran += 1;
    }
    assert_eq!(ran, items.len());
    // Positive control for the id rule: the scoped stream does carry ids, on every item that has a scopedId.
    assert_eq!(
        ids,
        items.iter().filter(|i| i.get("scopedId").is_some()).count()
    );
    assert!(ids > 0);
    assert!(
        items.iter().any(|i| i["event"] == "log-truncated"),
        "the oracle covers log-truncated"
    );
}

#[tokio::test]
async fn an_unscoped_stream_carries_no_ids() {
    let reply = capture("/api/v1/events").await;
    assert_eq!(reply.status, StatusCode::OK);
    let text = std::str::from_utf8(&reply.body).unwrap();
    let events = parse(text);
    let items = items();
    assert_eq!(events.len(), items.len());
    let mut ran = 0;
    for (event, item) in events.iter().zip(&items) {
        assert_eq!(event.name, item["event"].as_str().unwrap());
        assert_eq!(event.id, None);
        assert_eq!(event.data, item["data"]);
        ran += 1;
    }
    assert_eq!(ran, items.len());
    assert!(!text.contains("\nid: ") && !text.starts_with("id: "));
}

#[tokio::test]
async fn the_stream_is_byte_identical_across_ten_runs() {
    for uri in ["/api/v1/events", "/api/v1/events?missionId=abc"] {
        let first = capture(uri).await;
        assert_eq!(first.status, StatusCode::OK, "{uri}");
        let first = first.body;
        assert_eq!(
            parse(std::str::from_utf8(&first).unwrap()).len(),
            items().len(),
            "{uri}"
        );
        let mut ran = 1;
        for _ in 1..10 {
            assert_eq!(capture(uri).await.body, first, "{uri}");
            ran += 1;
        }
        assert_eq!(ran, 10);
    }
}

#[tokio::test]
async fn a_selected_stream_refusal_is_problem_json_with_its_status() {
    let example = &oracle("examples")["StreamRefusal.cursor-without-mission"];
    let reply = send(
        stub(),
        get("/api/v1/events")
            .header(
                "x-kitty-stub-example",
                "StreamRefusal.cursor-without-mission",
            )
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(
        reply.status.as_u16() as u64,
        example["value"]["status"].as_u64().unwrap()
    );
    assert_eq!(reply.content_type(), "application/problem+json");
    assert_eq!(reply.json(), example["value"]);
}
