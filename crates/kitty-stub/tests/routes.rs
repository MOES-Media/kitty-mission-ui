//! FR-010: reads serve their default example, and every selectable example or fixture whose schema fits the route,
//! with refusals as `application/problem+json` and their own status (contracts/stub-http.md). The oracle is
//! `examples.json`, verified against the vendored YAML by the contract gate, read here independently of the stub.

mod common;

use axum::body::Body;
use axum::http::StatusCode;
use common::*;
use kitty_stub::{app, Fixtures};
use serde_json::{json, Value};

/// The documented size of the selectable set at the current pin (stub-http.md, B6).
const SELECTABLE: usize = 57;
/// Component-level (13) plus event (7) examples, which no route serves as a complete response.
const NOT_SELECTABLE: usize = 20;
const READS: usize = 9;

fn routes() -> Vec<Value> {
    oracle("routes")
        .as_array()
        .expect("routes.json is an array")
        .clone()
}

fn reads() -> Vec<Value> {
    routes()
        .into_iter()
        .filter(|r| r["kind"] == "read")
        .collect()
}

fn route(operation_id: &str) -> Value {
    routes()
        .into_iter()
        .find(|r| r["operationId"] == operation_id)
        .expect("route exists")
}

fn allowed(route: &Value, schema: &str, status: Option<u64>) -> bool {
    match (
        route["refusals"].get(schema).and_then(Value::as_array),
        status,
    ) {
        (Some(list), Some(status)) => list.iter().any(|s| s.as_u64() == Some(status)),
        _ => false,
    }
}

async fn select_example(path: &str, key: &str) -> Reply {
    send(
        stub(),
        get(path)
            .header("x-kitty-stub-example", key)
            .body(Body::empty())
            .unwrap(),
    )
    .await
}

#[tokio::test]
async fn every_read_serves_its_default_example() {
    let examples = oracle("examples");
    let mut ran = 0;
    for r in reads() {
        let reply = send(
            stub(),
            get(&concrete(r["path"].as_str().unwrap()))
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        let key = r["defaultExample"]
            .as_str()
            .expect("no null default at the current pin");
        assert_eq!(reply.status, StatusCode::OK, "{}", r["operationId"]);
        assert_eq!(
            reply.content_type(),
            "application/json",
            "{}",
            r["operationId"]
        );
        assert_eq!(reply.json(), examples[key]["value"], "{}", r["operationId"]);
        ran += 1;
    }
    assert_eq!(ran, READS);
}

/// B6/C6: each selectable example is selected exactly once, on a route where its schema fits and, for a refusal,
/// where its own status is allowed for that schema; the route is chosen by schema and status, not schema alone.
#[tokio::test]
async fn every_selectable_example_is_served_on_a_fitting_route() {
    let examples = oracle("examples");
    let examples = examples.as_object().unwrap();
    let routes = routes();
    let mut plan = Vec::new();
    let mut not_selectable = 0;
    for (key, entry) in examples {
        let schema = entry["schema"].as_str().unwrap();
        let status = entry["value"].get("status").and_then(Value::as_u64);
        let success = routes
            .iter()
            .find(|r| r["kind"] == "read" && r["responseSchema"] == schema);
        let refusal = routes.iter().find(|r| allowed(r, schema, status));
        match (success, refusal) {
            (Some(r), _) => plan.push((key.clone(), r.clone(), 200_u16, "application/json")),
            (None, Some(r)) => plan.push((
                key.clone(),
                r.clone(),
                status.unwrap() as u16,
                "application/problem+json",
            )),
            (None, None) => not_selectable += 1,
        }
    }
    assert_eq!(plan.len(), SELECTABLE);
    assert_eq!(not_selectable, NOT_SELECTABLE);
    assert_eq!(plan.len() + not_selectable, examples.len());

    let mut ran = 0;
    for (key, r, status, content_type) in &plan {
        let reply = select_example(&concrete(r["path"].as_str().unwrap()), key).await;
        assert_eq!(
            reply.status.as_u16(),
            *status,
            "{key} on {}",
            r["operationId"]
        );
        assert_eq!(reply.content_type(), *content_type, "{key}");
        assert_eq!(reply.json(), examples[key]["value"], "{key}");
        ran += 1;
    }
    assert_eq!(ran, SELECTABLE);
}

#[tokio::test]
async fn a_refusal_example_carries_its_own_status_as_problem_json() {
    // ArtifactRefusal covers six statuses on getArtifactContent; artifact-not-text is 415.
    let reply = select_example(
        &concrete(route("getArtifactContent")["path"].as_str().unwrap()),
        "ArtifactRefusal.artifact-not-text",
    )
    .await;
    assert_eq!(reply.status, StatusCode::UNSUPPORTED_MEDIA_TYPE);
    assert_eq!(reply.content_type(), "application/problem+json");
    assert_eq!(
        reply.json(),
        oracle("examples")["ArtifactRefusal.artifact-not-text"]["value"]
    );
}

#[tokio::test]
async fn a_disallowed_status_is_a_schema_mismatch() {
    // listArtifacts allows ArtifactRefusal with [404, 500] only; 415 belongs to getArtifactContent (C6).
    let reply = select_example(
        "/api/v1/missions/m/artifacts",
        "ArtifactRefusal.artifact-not-text",
    )
    .await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(
        reply.json(),
        json!({"code": "schema-mismatch", "schema": "ArtifactRefusal", "operationId": "listArtifacts"})
    );
    // Positive control: an allowed status of the same schema on the same route is served.
    let ok = select_example("/api/v1/missions/m/artifacts", "ArtifactRefusal.not-found").await;
    assert_eq!(ok.status, StatusCode::NOT_FOUND);
    assert_eq!(ok.content_type(), "application/problem+json");
}

#[tokio::test]
async fn an_event_example_on_a_read_is_a_schema_mismatch() {
    let reply = select_example("/api/v1/project", "StatusTransitionEvent.moved").await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(
        reply.json(),
        json!({"code": "schema-mismatch", "schema": "StatusTransitionEvent", "operationId": "getProject"})
    );
    // A component-level example (one MissionOverview row) is not a complete response either.
    let row = select_example("/api/v1/missions", "MissionOverview.populated").await;
    assert_eq!(row.status, StatusCode::BAD_REQUEST);
    assert_eq!(row.json()["schema"], "MissionOverview");
}

#[tokio::test]
async fn a_fixture_is_selected_by_name() {
    let fixtures = oracle("fixtures");
    let reply = send(
        stub(),
        get("/api/v1/project")
            .header("x-kitty-stub-fixture", "projectAllNull")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.content_type(), "application/json");
    assert_eq!(reply.json(), fixtures["projectAllNull"]["value"]);
    assert_ne!(
        reply.json(),
        oracle("examples")["Project.example"]["value"],
        "the fixture differs from the default"
    );

    let refusal = send(
        stub(),
        get("/api/v1/drift")
            .header("x-kitty-stub-fixture", "refusalScanUnreadable")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(
        refusal.status.as_u16(),
        fixtures["refusalScanUnreadable"]["value"]["status"]
            .as_u64()
            .unwrap() as u16
    );
    assert_eq!(refusal.content_type(), "application/problem+json");
    assert_eq!(refusal.json(), fixtures["refusalScanUnreadable"]["value"]);
}

#[tokio::test]
async fn the_fixture_header_wins_over_the_example_header() {
    let reply = send(
        stub(),
        get("/api/v1/project")
            .header("x-kitty-stub-example", "Project.example")
            .header("x-kitty-stub-fixture", "projectEmpty")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.json(), oracle("fixtures")["projectEmpty"]["value"]);
    assert_ne!(reply.json(), oracle("examples")["Project.example"]["value"]);
}

#[tokio::test]
async fn unknown_selection_keys_are_404() {
    let ex = select_example("/api/v1/project", "Project.nope").await;
    assert_eq!(ex.status, StatusCode::NOT_FOUND);
    assert_eq!(ex.json(), json!({"code": "no-example"}));
    let fx = send(
        stub(),
        get("/api/v1/project")
            .header("x-kitty-stub-fixture", "nope")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(fx.status, StatusCode::NOT_FOUND);
    assert_eq!(fx.json(), json!({"code": "no-fixture"}));
    // Positive control: a known key on the same route is served.
    assert_eq!(
        select_example("/api/v1/project", "Project.example")
            .await
            .status,
        StatusCode::OK
    );
}

#[tokio::test]
async fn a_null_default_example_is_501() {
    let mut routes = oracle("routes");
    let drift = routes
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|r| r["operationId"] == "getDriftReport")
        .unwrap();
    drift["defaultExample"] = Value::Null;
    let fixtures = Fixtures::from_values(
        routes,
        oracle("examples"),
        oracle("fixtures"),
        oracle("changes"),
    )
    .unwrap();
    let router = app(fixtures, options());
    let reply = send(
        router.clone(),
        get("/api/v1/drift").body(Body::empty()).unwrap(),
    )
    .await;
    assert_eq!(reply.status, StatusCode::NOT_IMPLEMENTED);
    assert_eq!(
        reply.json(),
        json!({"code": "no-example", "operationId": "getDriftReport"})
    );
    // Positive control: a route that kept its default still serves it.
    assert_eq!(
        send(router, get("/api/v1/project").body(Body::empty()).unwrap())
            .await
            .status,
        StatusCode::OK
    );
}

#[tokio::test]
async fn only_get_is_routed_and_unknown_paths_are_404() {
    for method in ["POST", "PUT", "DELETE", "PATCH", "HEAD"] {
        let req = get("/api/v1/project")
            .method(method)
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            send(stub(), req).await.status,
            StatusCode::METHOD_NOT_ALLOWED,
            "{method}"
        );
    }
    assert_eq!(
        send(stub(), get("/api/v1/nope").body(Body::empty()).unwrap())
            .await
            .status,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        send(stub(), get("/").body(Body::empty()).unwrap())
            .await
            .status,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        send(stub(), get("/api/v1/project").body(Body::empty()).unwrap())
            .await
            .status,
        StatusCode::OK
    );
}

/// F-38: no request value builds a filesystem path. Traversal in `ArtifactPath` and in `missionId` still serves the
/// in-memory fixture data, never a file.
#[tokio::test]
async fn traversal_values_serve_fixture_data_and_read_no_file() {
    let content = oracle("examples")["ArtifactContent.markdown"]["value"].clone();
    for uri in [
        "/api/v1/missions/m/artifacts/content?path=..%2F..%2Fetc%2Fpasswd",
        "/api/v1/missions/m/artifacts/content?path=../../etc/passwd",
        "/api/v1/missions/..%2F../artifacts/content?path=README.md",
    ] {
        let reply = send(stub(), get(uri).body(Body::empty()).unwrap()).await;
        assert_eq!(reply.status, StatusCode::OK, "{uri}");
        assert_eq!(reply.json(), content, "{uri}");
        assert!(
            !String::from_utf8_lossy(&reply.body).contains("root:"),
            "{uri}"
        );
    }
}

#[tokio::test]
async fn forbidden_bodies_are_exact() {
    let cases = [
        (get_as("/api/v1/project", "evil.test:4173"), "host"),
        (
            get("/api/v1/project").header("origin", "http://evil.test"),
            "origin",
        ),
        (
            get("/api/v1/project").header("forwarded", "for=192.0.2.1"),
            "forwarded",
        ),
    ];
    let mut ran = 0;
    for (req, code) in cases {
        let reply = send(stub(), req.body(Body::empty()).unwrap()).await;
        assert_eq!(reply.status, StatusCode::FORBIDDEN, "{code}");
        assert_eq!(reply.json(), json!({ "code": code }));
        ran += 1;
    }
    assert_eq!(ran, 3);
}

#[tokio::test]
async fn events_serve_an_allowed_stream_refusal_and_reject_anything_else() {
    let examples = oracle("examples");
    let ok = select_example("/api/v1/events", "StreamRefusal.content-mismatch").await;
    assert_eq!(ok.status, StatusCode::CONFLICT);
    assert_eq!(ok.content_type(), "application/problem+json");
    assert_eq!(
        ok.json(),
        examples["StreamRefusal.content-mismatch"]["value"]
    );

    let event = select_example("/api/v1/events", "LogTruncatedEvent.size-shrink").await;
    assert_eq!(event.status, StatusCode::BAD_REQUEST);
    assert_eq!(event.json()["code"], "schema-mismatch");
    assert_eq!(event.json()["operationId"], "streamEvents");

    // A status outside [400, 409]: no vendored StreamRefusal carries one, so a synthetic copy carries 500.
    let mut synthetic = examples.clone();
    let mut bad = synthetic["StreamRefusal.content-mismatch"].clone();
    bad["value"]["status"] = json!(500);
    synthetic
        .as_object_mut()
        .unwrap()
        .insert("StreamRefusal.synthetic-500".into(), bad);
    let router = app(
        Fixtures::from_values(
            oracle("routes"),
            synthetic,
            oracle("fixtures"),
            oracle("changes"),
        )
        .unwrap(),
        options(),
    );
    let req = get("/api/v1/events")
        .header("x-kitty-stub-example", "StreamRefusal.synthetic-500")
        .body(Body::empty())
        .unwrap();
    let reply = send(router, req).await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(
        reply.json(),
        json!({"code": "schema-mismatch", "schema": "StreamRefusal", "operationId": "streamEvents"})
    );
}
