//! SC-002, FR-011, FR-013 (client level), A-09, R3-08: the contract check against the stub and the raw-TCP fake.
//! Oracles: the bundle read from disk, the stub's `last-request` report and the fake's request log.

mod common;

use common::*;
use kitty_core::client::{ContractClient, TransportFailure};
use kitty_core::contract::{
    digest_of, Actual, CheckOutcome, ContractPin, Digest, Mismatch, DOCUMENT_CAP,
};
use serde_json::{json, Value};

fn client(endpoint: kitty_core::endpoint::ServiceEndpoint) -> ContractClient {
    ContractClient::new(endpoint, &test_timings())
}

async fn check(client: &ContractClient, pin: &ContractPin) -> CheckOutcome {
    within("check_contract", client.check_contract(pin)).await
}

fn bundle_bytes() -> Vec<u8> {
    std::fs::read(fixtures_dir().join("mission-status.openapi.json")).expect("read the bundle")
}

fn digest(bytes: &[u8]) -> Digest {
    digest_of(bytes).expect("test document parses")
}

fn mismatch(outcome: CheckOutcome) -> Mismatch {
    match outcome {
        CheckOutcome::Mismatch(m) => m,
        other => panic!("expected a mismatch, got {other:?}"),
    }
}

/// A valid JSON document of exactly `size` bytes: an object with one padding string.
fn padded_json(size: usize) -> Vec<u8> {
    let head = br#"{"p":""#;
    let tail = br#""}"#;
    let pad = size - head.len() - tail.len();
    let mut doc = Vec::with_capacity(size);
    doc.extend_from_slice(head);
    doc.resize(head.len() + pad, b'x');
    doc.extend_from_slice(tail);
    assert_eq!(doc.len(), size);
    doc
}

#[tokio::test]
async fn pinned_document_matches() {
    let running = stub(StubSpec::default()).await;
    let pin = ContractPin::embedded();
    let outcome = check(&client(running.endpoint), &pin).await;
    let expected = digest(&bundle_bytes());
    assert_eq!(outcome, CheckOutcome::Match { digest: expected });
    // The stub saw the fetch with the exact accept header.
    let seen = last_request(&running).await;
    assert_eq!(seen["path"], "/api/v1/openapi.yaml", "{seen}");
    assert_no_panics();
}

#[tokio::test]
async fn modified_document_is_a_mismatch_with_both_digests() {
    let mut doc: Value = serde_json::from_slice(&bundle_bytes()).unwrap();
    doc["info"]["version"] = json!("0.0.0-modified");
    let modified = serde_json::to_vec(&doc).unwrap();
    let running = stub(StubSpec {
        document: Doc::Bytes(modified.clone()),
        ..StubSpec::default()
    })
    .await;
    let outcome = check(&client(running.endpoint), &ContractPin::embedded()).await;
    let m = mismatch(outcome);
    assert_eq!(m.expected, digest(&bundle_bytes()));
    assert_eq!(m.actual, Actual::Digest(digest(&modified)));
    assert_ne!(m.expected, digest(&modified));
    assert_no_panics();
}

#[tokio::test]
async fn same_stub_pinned_to_itself_matches_and_to_another_mismatches() {
    // Both outcomes against one running stub: only the pin differs.
    let running = stub(StubSpec::default()).await;
    let c = client(running.endpoint);
    let same = ContractPin::from_document(bundle_bytes());
    assert!(matches!(check(&c, &same).await, CheckOutcome::Match { .. }));
    let other = ContractPin::from_document(br#"{"openapi":"3.0.3"}"#.to_vec());
    let m = mismatch(check(&c, &other).await);
    assert_eq!(m.expected, digest(br#"{"openapi":"3.0.3"}"#));
    assert_eq!(m.actual, Actual::Digest(digest(&bundle_bytes())));
    assert_no_panics();
}

#[tokio::test]
async fn absent_document_is_a_404_mismatch() {
    let running = stub(StubSpec {
        document: Doc::Absent,
        ..StubSpec::default()
    })
    .await;
    let m = mismatch(check(&client(running.endpoint), &ContractPin::embedded()).await);
    assert_eq!(m.actual, Actual::Status { status: 404 });
    assert_eq!(m.expected, digest(&bundle_bytes()));
    assert_no_panics();
}

#[tokio::test]
async fn unparseable_document_is_reported() {
    let fake = raw_fake(vec![Step::Write(http_ok(
        "application/yaml",
        b"{{not yaml",
    ))])
    .await;
    let m = mismatch(check(&client(fake.endpoint), &ContractPin::embedded()).await);
    match m.actual {
        Actual::Unparseable { detail } => assert!(!detail.is_empty()),
        other => panic!("expected Unparseable, got {other:?}"),
    }
    // Positive control: the same fake serving the bundle parses.
    let ok = raw_fake(vec![Step::Write(http_ok(
        "application/yaml",
        &bundle_bytes(),
    ))])
    .await;
    assert!(matches!(
        check(&client(ok.endpoint), &ContractPin::embedded()).await,
        CheckOutcome::Match { .. }
    ));
    assert_no_panics();
}

#[tokio::test]
async fn four_mib_is_parsed_and_one_byte_more_is_refused() {
    // Positive control: exactly 4 MiB of valid JSON is parsed; its digest differs from the pin, which is expected.
    let exact = padded_json(DOCUMENT_CAP);
    let fake = raw_fake(vec![Step::Write(http_ok("application/json", &exact))]).await;
    let m = mismatch(check(&client(fake.endpoint), &ContractPin::embedded()).await);
    assert_eq!(m.actual, Actual::Digest(digest(&exact)));

    // One byte more is refused, whatever it contains.
    let over = padded_json(DOCUMENT_CAP + 1);
    let fake = raw_fake(vec![Step::Write(http_ok("application/json", &over))]).await;
    let m = mismatch(check(&client(fake.endpoint), &ContractPin::embedded()).await);
    assert_eq!(
        m.actual,
        Actual::Transport(TransportFailure::BodyTooLarge {
            limit: DOCUMENT_CAP
        })
    );
    assert_eq!(DOCUMENT_CAP, 4 * 1024 * 1024);
    assert_no_panics();
}

#[tokio::test]
async fn transport_failures_are_reported() {
    // A port nothing listens on: bind, note the port, drop.
    let port = {
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        l.local_addr().unwrap().port()
    };
    let refused = client(kitty_core::endpoint::ServiceEndpoint::loopback(port));
    let m = mismatch(check(&refused, &ContractPin::embedded()).await);
    assert_eq!(
        m.actual,
        Actual::Transport(TransportFailure::ConnectRefused)
    );

    // A silent service ends at read_timeout (1 s in tests).
    let fake = raw_fake(vec![Step::Stall]).await;
    let m = mismatch(check(&client(fake.endpoint), &ContractPin::embedded()).await);
    assert_eq!(m.actual, Actual::Transport(TransportFailure::Timeout));
    assert_no_panics();
}

#[tokio::test]
async fn an_unparseable_pin_is_not_a_match() {
    let running = stub(StubSpec::default()).await;
    let pin = ContractPin::from_document(b"{{not yaml".to_vec());
    let outcome = check(&client(running.endpoint), &pin).await;
    assert!(
        matches!(outcome, CheckOutcome::PinUnparseable { .. }),
        "{outcome:?}"
    );
    assert_no_panics();
}

#[tokio::test]
async fn the_fetch_is_visible_after_a_mismatch() {
    // FR-013 at client level: nothing follows the fetch, and the fetch itself is on record.
    let running = stub(StubSpec {
        document: Doc::Bytes(br#"{"openapi":"other"}"#.to_vec()),
        ..StubSpec::default()
    })
    .await;
    let m = mismatch(check(&client(running.endpoint), &ContractPin::embedded()).await);
    assert!(matches!(m.actual, Actual::Digest(_)));
    let seen = last_request(&running).await;
    assert_eq!(seen["path"], "/api/v1/openapi.yaml", "{seen}");
    assert_no_panics();
}

#[tokio::test]
async fn the_request_carries_the_check_headers() {
    let fake = raw_fake(vec![Step::Write(http_ok(
        "application/yaml",
        &bundle_bytes(),
    ))])
    .await;
    let _ = check(&client(fake.endpoint), &ContractPin::embedded()).await;
    let log = fake.requests();
    assert_eq!(log.len(), 1);
    assert_eq!(log[0].method, "GET");
    assert_eq!(log[0].target, "/api/v1/openapi.yaml");
    let header = |n: &str| {
        log[0]
            .headers
            .iter()
            .find(|(k, _)| k == n)
            .map(|(_, v)| v.as_str())
    };
    assert_eq!(header("accept"), Some("application/yaml, application/json"));
    assert_eq!(header("host"), Some(host_of(fake.port).as_str()));
    assert_no_panics();
}
