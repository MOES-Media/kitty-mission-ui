//! NFR-003 evidence (IC-05): the time from a change's last byte being flushed by the service to `next()` returning
//! it. This is a measurement, not a gate, so it is `#[ignore]`. Run it with
//! `cargo test -p kitty-core --test latency -- --ignored --nocapture`.

mod common;

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use common::*;
use kitty_core::client::ContractClient;
use kitty_core::sse::{StreamEvent, StreamScope};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::task::JoinHandle;

const FRAMES: usize = 200;
const SPACING: Duration = Duration::from_millis(5);

struct AbortOnDrop(JoinHandle<()>);

impl Drop for AbortOnDrop {
    fn drop(&mut self) {
        self.0.abort();
    }
}

fn percentile(sorted: &[Duration], p: f64) -> Duration {
    let rank = ((sorted.len() as f64) * p).ceil() as usize;
    sorted[rank.clamp(1, sorted.len()) - 1]
}

#[tokio::test]
#[ignore = "NFR-003 measurement, not a gate"]
async fn change_relay_latency() {
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("binds");
    let port = listener.local_addr().expect("address").port();
    let flushed: Arc<Mutex<Vec<Instant>>> = Arc::new(Mutex::new(Vec::new()));
    let server_flushed = flushed.clone();
    let server = AbortOnDrop(tokio::spawn(async move {
        let Ok((mut socket, _)) = listener.accept().await else {
            return;
        };
        let mut buf = [0u8; 1024];
        let _ = socket.read(&mut buf).await;
        if socket
            .write_all(&http_stream_head("text/event-stream"))
            .await
            .is_err()
        {
            return;
        }
        for i in 0..FRAMES {
            let frame = format!("event: status-transition\nid: {i}:ab\ndata: {{\"n\":{i}}}\n\n");
            if socket.write_all(frame.as_bytes()).await.is_err() || socket.flush().await.is_err() {
                return;
            }
            // Right after the flush, with no await in between.
            server_flushed
                .lock()
                .unwrap_or_else(|p| p.into_inner())
                .push(Instant::now());
            tokio::time::sleep(SPACING).await;
        }
        std::future::pending::<()>().await;
    }));

    let client = ContractClient::new(
        kitty_core::endpoint::ServiceEndpoint::loopback(port),
        &test_timings(),
    );
    let scope = StreamScope::Mission {
        mission_id: MISSION_ID.to_owned(),
        cursor: None,
    };
    let mut stream = within("open", client.open_stream(scope))
        .await
        .expect("a valid scope");
    let mut latencies = Vec::with_capacity(FRAMES);
    for i in 0..FRAMES {
        let item = within("next", stream.next()).await;
        let received = Instant::now();
        match item {
            Some(StreamEvent::Change(change)) => {
                assert_eq!(
                    change.cursor,
                    Some(format!("{i}:ab")),
                    "changes arrive in order"
                );
            }
            other => panic!("expected change {i}, got {other:?}"),
        }
        let stamps = flushed.lock().unwrap_or_else(|p| p.into_inner());
        let sent = *stamps
            .get(i)
            .expect("the flush instant of this change was recorded");
        latencies.push(received.saturating_duration_since(sent));
    }
    drop(server);
    assert_eq!(latencies.len(), FRAMES);
    latencies.sort();
    let p50 = percentile(&latencies, 0.50);
    let p95 = percentile(&latencies, 0.95);
    let max = *latencies.last().expect("200 samples");
    println!(
        "NFR-003 latency over {FRAMES} changes ({}): p50 = {p50:?}, p95 = {p95:?}, max = {max:?}",
        if cfg!(debug_assertions) {
            "debug"
        } else {
            "release"
        }
    );
    assert_no_panics();
}
