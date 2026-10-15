//! R2-08, F-31, R3-07: the real binary binds loopback only, announces the bound address from the listener, serves a
//! read, refuses connections on a non-loopback local address, and exits cleanly on SIGTERM. std only, plus serde_json
//! to read the `changes.json` oracle.

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{IpAddr, SocketAddr, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// Kills the child on every exit path, so no stub is left running.
struct Running(Child);

impl Drop for Running {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn start() -> (Running, SocketAddr) {
    start_with(&["--time-scale", "0"])
}

/// Starts the binary on an ephemeral port with a 50 ms heartbeat and the given extra arguments.
fn start_with(extra: &[&str]) -> (Running, SocketAddr) {
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/fixtures");
    let mut child = Command::new(env!("CARGO_BIN_EXE_kitty-stub"))
        .args(["--port", "0", "--heartbeat-ms", "50"])
        .args(extra)
        .arg("--fixtures")
        .arg(&fixtures)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("kitty-stub starts");
    let stdout = child.stdout.take().expect("stdout piped");
    let running = Running(child);
    let mut line = String::new();
    BufReader::new(stdout)
        .read_line(&mut line)
        .expect("first stdout line");
    let addr = line
        .trim_end()
        .strip_prefix("listening ")
        .unwrap_or_else(|| panic!("announcement: {line:?}"));
    assert!(addr.starts_with("127.0.0.1:"), "announced {addr}");
    let addr: SocketAddr = addr.parse().expect("announced address parses");
    assert_ne!(
        addr.port(),
        0,
        "the announcement carries the bound port, not the configured 0"
    );
    (running, addr)
}

fn http_get(addr: SocketAddr, path: &str, host: &str) -> String {
    let mut stream =
        TcpStream::connect_timeout(&addr, Duration::from_secs(5)).expect("connects on loopback");
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .unwrap();
    write!(
        stream,
        "GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut out = String::new();
    stream.read_to_string(&mut out).expect("response reads");
    out
}

#[test]
fn announces_loopback_and_serves_a_read() {
    let (_stub, addr) = start();
    let ok = http_get(addr, "/api/v1/project", &addr.to_string());
    assert!(ok.starts_with("HTTP/1.1 200 "), "{ok}");
    assert!(
        ok.to_ascii_lowercase()
            .contains("content-type: application/json"),
        "{ok}"
    );
    // Negative on the same socket: a foreign Host is refused.
    let refused = http_get(
        addr,
        "/api/v1/project",
        &format!("evil.test:{}", addr.port()),
    );
    assert!(refused.starts_with("HTTP/1.1 403 "), "{refused}");
    assert!(refused.ends_with("{\"code\":\"host\"}"), "{refused}");
}

/// The default-route local address, found without sending a packet: a UDP "connect" only selects a route.
fn default_route_ip() -> Option<IpAddr> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.0.2.1:9").ok()?;
    Some(socket.local_addr().ok()?.ip())
}

#[test]
fn refuses_connections_on_a_non_loopback_address() {
    let (_stub, addr) = start();
    // Positive control: the loopback address accepts.
    assert!(TcpStream::connect_timeout(&addr, Duration::from_secs(5)).is_ok());
    match default_route_ip() {
        Some(ip) if !ip.is_loopback() && !ip.is_unspecified() => {
            let other = SocketAddr::new(ip, addr.port());
            let result = TcpStream::connect_timeout(&other, Duration::from_secs(5));
            assert!(result.is_err(), "the stub must not accept on {other}");
        }
        other => eprintln!("SKIP non-loopback refusal: default-route address is {other:?} (loopback or unavailable)"),
    }
}

#[cfg(unix)]
#[test]
fn exits_cleanly_on_sigterm_with_a_stream_open() {
    let (mut stub, addr) = start();
    // Hold an SSE stream open so shutdown cannot wait on it forever.
    let mut stream = TcpStream::connect(addr).unwrap();
    write!(
        stream,
        "GET /api/v1/events HTTP/1.1\r\nHost: {addr}\r\n\r\n"
    )
    .unwrap();
    let mut first = [0u8; 12];
    stream.read_exact(&mut first).unwrap();
    assert_eq!(&first, b"HTTP/1.1 200");

    let status = Command::new("kill")
        .args(["-TERM", &stub.0.id().to_string()])
        .status()
        .expect("kill runs");
    assert!(status.success());
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if let Some(exit) = stub.0.try_wait().unwrap() {
            assert!(exit.success(), "exit status {exit:?}");
            break;
        }
        assert!(
            Instant::now() < deadline,
            "the stub did not exit within 10 s of SIGTERM"
        );
        std::thread::sleep(Duration::from_millis(20));
    }
}

/// CODE-SEC-001: a client that never finishes its request header is disconnected once the header-read timeout runs
/// out, instead of holding the connection forever (slowloris). The timeout is shortened for the test.
#[test]
fn closes_a_connection_whose_header_never_completes() {
    let (_stub, addr) = start_with(&["--time-scale", "0", "--header-timeout-ms", "300"]);
    // Positive control: a complete request on a fresh connection is still served.
    let ok = http_get(addr, "/api/v1/project", &addr.to_string());
    assert!(ok.starts_with("HTTP/1.1 200 "), "{ok}");

    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_secs(5)).unwrap();
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .unwrap();
    write!(
        stream,
        "GET /api/v1/project HTTP/1.1\r\nHost: {addr}\r\nX-Slow: "
    )
    .unwrap();
    let sent = Instant::now();
    let mut rest = Vec::new();
    // The server closes the socket: EOF (possibly after a 408) or a reset, not the 5 s read timeout.
    let result = stream.read_to_end(&mut rest);
    let waited = sent.elapsed();
    if let Err(e) = &result {
        assert!(
            !matches!(
                e.kind(),
                std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
            ),
            "the half-sent header was still open after {waited:?}"
        );
    }
    let text = String::from_utf8_lossy(&rest);
    assert!(
        rest.is_empty() || text.starts_with("HTTP/1.1 408 "),
        "no response but a timeout is expected: {text}"
    );
    assert!(
        waited < Duration::from_secs(3),
        "closed after {waited:?}, expected about 300 ms"
    );
}

/// CODE-SEC-003: a `--time-scale` that is not finite, is negative, or would push the largest scripted delay past what a
/// `Duration` can hold is a usage error (exit 2) before the stub listens, never a panic in a stream task later.
#[test]
fn rejects_an_unusable_time_scale_with_the_usage_exit() {
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/fixtures");
    for scale in [
        "NaN",
        "inf",
        "-inf",
        "-1",
        "-0.5",
        "1e300",
        "1.7976931348623157e308",
    ] {
        let mut child = Command::new(env!("CARGO_BIN_EXE_kitty-stub"))
            .args(["--port", "0", "--time-scale", scale, "--fixtures"])
            .arg(&fixtures)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("kitty-stub starts");
        let deadline = Instant::now() + Duration::from_secs(10);
        while child.try_wait().unwrap().is_none() {
            if Instant::now() >= deadline {
                let _ = child.kill();
                let _ = child.wait();
                panic!("--time-scale {scale} was accepted: the stub was still running after 10 s");
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        let out = child.wait_with_output().unwrap();
        assert_eq!(out.status.code(), Some(2), "--time-scale {scale}: {out:?}");
        assert!(
            out.stdout.is_empty(),
            "--time-scale {scale} must not listen"
        );
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(stderr.contains("--time-scale"), "{scale}: {stderr}");
        assert!(stderr.contains("usage: kitty-stub"), "{scale}: {stderr}");
    }
    // Positive control: a small positive scale starts and serves.
    let (_stub, addr) = start_with(&["--time-scale", "0.001"]);
    let ok = http_get(addr, "/api/v1/project", &addr.to_string());
    assert!(ok.starts_with("HTTP/1.1 200 "), "{ok}");
}

/// Reads `GET /api/v1/events<query>` from a running stub until the first heartbeat and returns the event bytes before
/// it (the heartbeat excluded). HTTP/1.0 keeps the body unchunked, so chunk boundaries (timing) cannot leak in.
fn capture_events(addr: SocketAddr, query: &str) -> Vec<u8> {
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_secs(5)).unwrap();
    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .unwrap();
    write!(
        stream,
        "GET /api/v1/events{query} HTTP/1.0\r\nHost: {addr}\r\n\r\n"
    )
    .unwrap();
    let mut bytes = Vec::new();
    let mut buf = [0u8; 4096];
    let heartbeat = b": heartbeat\n\n";
    let end = loop {
        let n = stream
            .read(&mut buf)
            .expect("the stream reaches a heartbeat");
        assert!(n > 0, "the stream closed before a heartbeat");
        bytes.extend_from_slice(&buf[..n]);
        if let Some(at) = bytes.windows(heartbeat.len()).position(|w| w == heartbeat) {
            break at;
        }
    };
    let text = String::from_utf8(bytes[..end].to_vec()).expect("UTF-8");
    let (head, body) = text.split_once("\r\n\r\n").expect("response head");
    assert!(
        head.starts_with("HTTP/1.0 200 ") || head.starts_with("HTTP/1.1 200 "),
        "{head}"
    );
    assert!(
        head.to_ascii_lowercase()
            .contains("content-type: text/event-stream"),
        "{head}"
    );
    body.as_bytes().to_vec()
}

/// The number of items in `changes.json`, read independently of the stub.
fn script_len() -> usize {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../contracts/fixtures/mission-status.changes.json");
    let changes: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    changes["items"]
        .as_array()
        .expect("changes.json items")
        .len()
}

/// CODE-TEST-003, NFR-004: three separate `kitty-stub` processes, playing the script with real (scaled) delays, write
/// byte-identical event streams, heartbeats excluded, both mission-scoped and unscoped. Unlike the in-process test,
/// each run builds its own router, fixtures and serialiser state in a fresh process, so nondeterminism that varies by
/// process (hash seeds, timing) shows up as a difference.
#[test]
fn separate_processes_stream_identical_bytes() {
    let stubs: Vec<_> = (0..3)
        .map(|_| start_with(&["--time-scale", "0.02"]))
        .collect();
    for query in ["?missionId=01JZAB3C4D5E6F7G8H9JKMNPQR", ""] {
        let captures: Vec<Vec<u8>> = stubs
            .iter()
            .map(|(_, addr)| capture_events(*addr, query))
            .collect();
        let first = &captures[0];
        let text = std::str::from_utf8(first).unwrap();
        // Positive control: the capture holds the whole script, not an empty or truncated prefix.
        assert_eq!(
            text.matches("event: ").count(),
            script_len(),
            "{query}: {text}"
        );
        assert_eq!(
            text.contains("\nid: "),
            !query.is_empty(),
            "{query}: id lines only when scoped"
        );
        for (i, other) in captures.iter().enumerate().skip(1) {
            assert_eq!(
                std::str::from_utf8(other).unwrap(),
                text,
                "{query}: process {i} differs from process 0"
            );
        }
    }
}

/// SO-CORR-003: conflicting route templates are refused while the fixtures load: a non-zero exit, a message naming the
/// templates, and no `listening` line (the router used to panic after the stub had already announced itself).
#[test]
fn conflicting_route_templates_exit_non_zero_without_listening() {
    let source = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/fixtures");
    let dir = std::env::temp_dir().join(format!("kitty-stub-conflict-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    for name in ["routes", "examples", "fixtures", "changes"] {
        let file = format!("mission-status.{name}.json");
        std::fs::copy(source.join(&file), dir.join(&file)).unwrap();
    }
    let path = dir.join("mission-status.routes.json");
    let mut routes: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
    let mut extra = routes
        .as_array()
        .unwrap()
        .iter()
        .find(|r| r["path"] == "/missions/{missionId}")
        .unwrap()
        .clone();
    extra["operationId"] = serde_json::json!("conflicting");
    extra["path"] = serde_json::json!("/missions/{id}");
    routes.as_array_mut().unwrap().push(extra);
    std::fs::write(&path, routes.to_string()).unwrap();

    let out = Command::new(env!("CARGO_BIN_EXE_kitty-stub"))
        .args(["--port", "0", "--fixtures"])
        .arg(&dir)
        .stdin(Stdio::null())
        .output()
        .expect("kitty-stub runs");
    let _ = std::fs::remove_dir_all(&dir);
    assert!(!out.status.success(), "{out:?}");
    assert!(
        !String::from_utf8_lossy(&out.stdout).contains("listening"),
        "must not announce: {out:?}"
    );
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(
        stderr.contains("/missions/{id}") && stderr.contains("/missions/{missionId}"),
        "{stderr}"
    );
}

/// SO-CORR-004: a SIGTERM that arrives right after the `listening` line must still be a clean exit. The handlers used to
/// be installed after the line was written, so a signal landing in that gap hit the default action (death by signal).
/// A pre-started shell sits blocked on a pipe and runs its `kill` builtin the instant the line has been read, so the
/// signal follows `listening` by microseconds, not by the cost of spawning a process. The race is a fraction of a
/// percent per round, so 8 threads run 50 rounds each (a fresh process per round): about 400 rounds in under 2 s, and
/// the parallel load widens the gap. Against the old ordering this failed on 3 of 4 runs.
#[cfg(unix)]
#[test]
fn sigterm_right_after_listening_is_a_clean_exit() {
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/fixtures");
    let round = |label: &str| {
        let mut child = Command::new(env!("CARGO_BIN_EXE_kitty-stub"))
            .args(["--port", "0", "--fixtures"])
            .arg(&fixtures)
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .expect("kitty-stub starts");
        let mut trigger = Command::new("sh")
            .args(["-c", "read _; kill -TERM \"$0\"", &child.id().to_string()])
            .stdin(Stdio::piped())
            .spawn()
            .expect("sh starts");
        let mut line = String::new();
        BufReader::new(child.stdout.take().unwrap())
            .read_line(&mut line)
            .expect("first stdout line");
        assert!(line.starts_with("listening "), "{label}: {line:?}");
        trigger.stdin.take().unwrap().write_all(b"go\n").unwrap();
        let deadline = Instant::now() + Duration::from_secs(10);
        let exit = loop {
            if let Some(exit) = child.try_wait().unwrap() {
                break exit;
            }
            if Instant::now() >= deadline {
                let _ = child.kill();
                let _ = child.wait();
                panic!("{label}: the stub did not exit within 10 s of SIGTERM");
            }
            std::thread::sleep(Duration::from_millis(2));
        };
        let _ = trigger.wait();
        assert!(exit.success(), "{label}: exit status {exit:?}");
    };
    let ran = std::sync::atomic::AtomicUsize::new(0);
    std::thread::scope(|scope| {
        for thread in 0..8 {
            let (round, ran) = (&round, &ran);
            scope.spawn(move || {
                for n in 0..50 {
                    round(&format!("thread {thread} round {n}"));
                    ran.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                }
            });
        }
    });
    assert_eq!(ran.into_inner(), 400);
}
