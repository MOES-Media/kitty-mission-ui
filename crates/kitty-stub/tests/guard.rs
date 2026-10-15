//! F-32: the stub applies the upstream service's request rules (Host, Origin, Forwarded) as one layer over every
//! route, `/__stub/last-request` included; and `/__stub/last-request` reports the previous `/api/v1` request (F-28).

mod common;

use axum::body::Body;
use axum::http::StatusCode;
use axum::Router;
use common::*;
use serde_json::json;

async fn status(
    router: Router,
    req: axum::http::request::Builder,
) -> (StatusCode, serde_json::Value) {
    let reply = send(router, req.body(Body::empty()).unwrap()).await;
    let body = if reply.body.is_empty() {
        serde_json::Value::Null
    } else {
        reply.json()
    };
    (reply.status, body)
}

#[tokio::test]
async fn the_bound_host_passes_on_both_loopback_names() {
    for host in ["127.0.0.1:4173", "localhost:4173"] {
        let (code, _) = status(stub(), get_as("/api/v1/project", host)).await;
        assert_eq!(code, StatusCode::OK, "{host}");
    }
}

#[tokio::test]
async fn a_foreign_or_missing_host_is_403() {
    for host in [
        "evil.test:4173",
        "127.0.0.1:9999",
        "localhost",
        "127.0.0.1",
        "[::1]:4173",
        "0.0.0.0:4173",
    ] {
        let (code, body) = status(stub(), get_as("/api/v1/project", host)).await;
        assert_eq!(code, StatusCode::FORBIDDEN, "{host}");
        assert_eq!(body, json!({"code": "host"}), "{host}");
    }
    let req = axum::http::Request::builder()
        .method("GET")
        .uri("/api/v1/project");
    let (code, body) = status(stub(), req).await;
    assert_eq!(
        (code, body),
        (StatusCode::FORBIDDEN, json!({"code": "host"}))
    );
}

#[tokio::test]
async fn origin_must_be_the_stubs_own_when_present() {
    for origin in ["http://127.0.0.1:4173", "http://localhost:4173"] {
        let (code, _) = status(stub(), get("/api/v1/project").header("origin", origin)).await;
        assert_eq!(code, StatusCode::OK, "{origin}");
    }
    for origin in [
        "http://evil.test",
        "http://127.0.0.1:9999",
        "https://127.0.0.1:4173",
        "null",
    ] {
        let (code, body) = status(stub(), get("/api/v1/project").header("origin", origin)).await;
        assert_eq!(code, StatusCode::FORBIDDEN, "{origin}");
        assert_eq!(body, json!({"code": "origin"}), "{origin}");
    }
}

#[tokio::test]
async fn forwarded_and_x_forwarded_headers_are_403() {
    let mut ran = 0;
    for name in [
        "forwarded",
        "x-forwarded-host",
        "x-forwarded-for",
        "x-forwarded-proto",
    ] {
        let (code, body) = status(stub(), get("/api/v1/project").header(name, "127.0.0.1")).await;
        assert_eq!(code, StatusCode::FORBIDDEN, "{name}");
        assert_eq!(body, json!({"code": "forwarded"}), "{name}");
        ran += 1;
    }
    assert_eq!(ran, 4);
    // Positive control: a header that merely resembles one is not refused.
    let (code, _) = status(stub(), get("/api/v1/project").header("x-forward-note", "1")).await;
    assert_eq!(code, StatusCode::OK);
}

#[tokio::test]
async fn the_guard_covers_last_request_and_unknown_paths() {
    let (code, body) = status(stub(), get_as("/__stub/last-request", "evil.test:4173")).await;
    assert_eq!(
        (code, body),
        (StatusCode::FORBIDDEN, json!({"code": "host"}))
    );
    let (code, body) = status(
        stub(),
        get("/__stub/last-request").header("forwarded", "for=x"),
    )
    .await;
    assert_eq!(
        (code, body),
        (StatusCode::FORBIDDEN, json!({"code": "forwarded"}))
    );
    let (code, body) = status(stub(), get_as("/nowhere", "evil.test:4173")).await;
    assert_eq!(
        (code, body),
        (StatusCode::FORBIDDEN, json!({"code": "host"}))
    );
    // Positive control: with the right Host the same route answers (404: nothing recorded yet).
    let (code, _) = status(stub(), get("/__stub/last-request")).await;
    assert_eq!(code, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn last_request_records_the_previous_api_call() {
    let router = stub();
    let (code, _) = status(router.clone(), get("/__stub/last-request")).await;
    assert_eq!(
        code,
        StatusCode::NOT_FOUND,
        "nothing recorded before the first /api/v1 request"
    );

    let req = get("/api/v1/missions/abc/artifacts?limit=5")
        .header("X-Trace-Id", "Trace-Value")
        .header("accept", "application/json");
    let (code, _) = status(router.clone(), req).await;
    assert_eq!(code, StatusCode::OK);

    let (code, body) = status(router.clone(), get("/__stub/last-request")).await;
    assert_eq!(code, StatusCode::OK);
    assert_eq!(
        body,
        json!({
            "method": "GET",
            "path": "/api/v1/missions/abc/artifacts",
            "headers": {"host": HOST, "x-trace-id": "Trace-Value", "accept": "application/json"}
        })
    );

    // A later request replaces the record; reading the record does not.
    let (code, _) = status(
        router.clone(),
        get("/api/v1/project").header("x-kitty-stub-example", "Project.example"),
    )
    .await;
    assert_eq!(code, StatusCode::OK);
    let (_, body) = status(router.clone(), get("/__stub/last-request")).await;
    let (_, again) = status(router, get("/__stub/last-request")).await;
    assert_eq!(body["path"], "/api/v1/project");
    assert_eq!(body["headers"]["x-kitty-stub-example"], "Project.example");
    assert_eq!(body, again);
}

/// CODE-SEC-002: credential headers are reported by name only; their values are replaced with `[redacted]`, so a
/// proxy test can assert that a credential was (or was not) forwarded without the stub echoing it back.
#[tokio::test]
async fn last_request_redacts_credential_values() {
    let router = stub();
    let req = get("/api/v1/project")
        .header("Authorization", "Bearer secret-token")
        .header("proxy-authorization", "Basic c2VjcmV0")
        .header("cookie", "session=secret")
        .header("cookie", "other=secret")
        .header("set-cookie", "id=secret")
        .header("x-trace-id", "kept");
    let (code, _) = status(router.clone(), req).await;
    assert_eq!(code, StatusCode::OK);
    let (code, body) = status(router, get("/__stub/last-request")).await;
    assert_eq!(code, StatusCode::OK);
    assert_eq!(
        body["headers"],
        json!({
            "host": HOST,
            "authorization": "[redacted]",
            "proxy-authorization": "[redacted]",
            "cookie": "[redacted]",
            "set-cookie": "[redacted]",
            "x-trace-id": "kept"
        })
    );
    assert!(!body.to_string().contains("secret"), "{body}");
}

/// A second Host or Origin header cannot smuggle a foreign value past the first one.
#[tokio::test]
async fn repeated_host_or_origin_headers_are_403() {
    let (code, body) = status(
        stub(),
        get("/api/v1/project").header("host", "evil.test:4173"),
    )
    .await;
    assert_eq!(
        (code, body),
        (StatusCode::FORBIDDEN, json!({"code": "host"}))
    );
    let req = get("/api/v1/project")
        .header("origin", "http://127.0.0.1:4173")
        .header("origin", "http://evil.test");
    let (code, body) = status(stub(), req).await;
    assert_eq!(
        (code, body),
        (StatusCode::FORBIDDEN, json!({"code": "origin"}))
    );
    // Positive control: one correct Host and one correct Origin pass.
    let (code, _) = status(
        stub(),
        get("/api/v1/project").header("origin", "http://127.0.0.1:4173"),
    )
    .await;
    assert_eq!(code, StatusCode::OK);
}
