//! R2-08, F-31, R3-07: the real binary binds loopback only, announces the bound address from the listener, serves a
//! read, refuses connections on a non-loopback local address, and exits cleanly on SIGTERM. std only.

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
