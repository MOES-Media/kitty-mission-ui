//! A-07: `Core` supervises the stub with the upstream launch options `--mission-status.port=<n>` and
//! `--mission-status.project-root=<dir>`; the fixtures directory defaults per contracts/stub-http-delta.md, and the
//! resolved path is never printed (FS-09).

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdout, Command, Output, Stdio};
use std::sync::mpsc;
use std::time::{Duration, Instant};

use serde_json::Value;

fn workspace_fixtures() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/fixtures")
}

/// Copies every `mission-status.*.json` file (the bundle included) into `<root>/.kitty-stub/fixtures`.
fn install_fixture_copy(root: &Path) -> PathBuf {
    let dir = root.join(".kitty-stub").join("fixtures");
    std::fs::create_dir_all(&dir).unwrap();
    for name in ["routes", "examples", "fixtures", "changes", "openapi"] {
        let file = format!("mission-status.{name}.json");
        std::fs::copy(workspace_fixtures().join(&file), dir.join(&file)).unwrap();
    }
    dir
}

const DEADLINE: Duration = Duration::from_secs(5);

/// A scratch directory under the system temp dir, removed when dropped (also when a test fails).
struct Scratch(PathBuf);

impl Scratch {
    fn new(tag: &str) -> Self {
        let dir = std::env::temp_dir().join(format!("kitty-stub-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        Scratch(dir)
    }

    fn path(&self) -> &Path {
        &self.0
    }

    fn text(&self) -> &str {
        self.0.to_str().unwrap()
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// A started stub. `Drop` kills and reaps it on every exit path, so a failing assertion leaves no process behind.
struct Running {
    child: Child,
    stdout: BufReader<ChildStdout>,
}

impl Drop for Running {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Running {
    /// Stops the stub and returns everything it wrote to stdout and stderr.
    fn finish(mut self) -> String {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let mut out = String::new();
        self.stdout.read_to_string(&mut out).unwrap();
        let mut err = String::new();
        self.child
            .stderr
            .take()
            .unwrap()
            .read_to_string(&mut err)
            .unwrap();
        format!("{out}{err}")
    }
}

/// Starts the stub and waits at most [`DEADLINE`] for its `listening` line.
fn spawn(args: &[String]) -> (Running, SocketAddr, String) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_kitty-stub"))
        .args(["--time-scale", "0"])
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("kitty-stub starts");
    let mut stdout = BufReader::new(child.stdout.take().unwrap());
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let mut line = String::new();
        let _ = stdout.read_line(&mut line);
        let _ = tx.send((line, stdout));
    });
    match rx.recv_timeout(DEADLINE) {
        Ok((line, stdout)) => {
            let running = Running { child, stdout };
            let addr = line
                .trim_end()
                .strip_prefix("listening ")
                .unwrap_or_else(|| panic!("{line:?}"))
                .to_owned();
            let parsed = addr.parse().expect("address parses");
            (running, parsed, line)
        }
        Err(_) => {
            let _ = child.kill();
            let _ = child.wait();
            panic!("no listening line within 5 s");
        }
    }
}

/// Runs the stub to its exit within [`DEADLINE`]; a stub still running then is killed and the test fails by name.
fn run_bounded(case: &str, args: &[&str], expected_code: i32) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_kitty-stub"))
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("kitty-stub starts");
    let drain = |mut pipe: Box<dyn Read + Send>| {
        std::thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = pipe.read_to_end(&mut bytes);
            bytes
        })
    };
    let out = drain(Box::new(child.stdout.take().unwrap()));
    let err = drain(Box::new(child.stderr.take().unwrap()));
    let start = Instant::now();
    let status = loop {
        if let Some(status) = child.try_wait().unwrap() {
            break status;
        }
        if start.elapsed() > DEADLINE {
            let _ = child.kill();
            let _ = child.wait();
            panic!("{case}: still running after 5 s (expected exit {expected_code})");
        }
        std::thread::sleep(Duration::from_millis(10));
    };
    Output {
        status,
        stdout: out.join().unwrap(),
        stderr: err.join().unwrap(),
    }
}

fn raw_get(addr: SocketAddr, path: &str) -> (String, Vec<u8>) {
    let mut s = TcpStream::connect_timeout(&addr, DEADLINE).unwrap();
    s.set_read_timeout(Some(DEADLINE)).unwrap();
    write!(
        s,
        "GET {path} HTTP/1.1\r\nHost: {addr}\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut all = Vec::new();
    s.read_to_end(&mut all).unwrap();
    let split = all.windows(4).position(|w| w == b"\r\n\r\n").unwrap() + 4;
    (
        String::from_utf8_lossy(&all[..split]).into_owned(),
        all[split..].to_vec(),
    )
}

fn args(list: &[&str]) -> Vec<String> {
    list.iter().map(|s| (*s).to_owned()).collect()
}

fn project_name(addr: SocketAddr) -> String {
    let (head, body) = raw_get(addr, "/api/v1/project");
    assert!(head.starts_with("HTTP/1.1 200 "), "{head}");
    serde_json::from_slice::<Value>(&body).unwrap()["name"]
        .as_str()
        .unwrap()
        .to_owned()
}

#[test]
fn the_upstream_options_alone_serve_the_workspace_fixtures_and_the_bundle() {
    let root = Scratch::new("flags-default");
    let (stub, addr, _) = spawn(&[
        "--mission-status.port=0".to_owned(),
        format!("--mission-status.project-root={}", root.text()),
    ]);
    assert_ne!(addr.port(), 0);
    assert_eq!(project_name(addr), "example-project");
    let (head, body) = raw_get(addr, "/api/v1/openapi.yaml");
    assert!(head.starts_with("HTTP/1.1 200 "), "{head}");
    assert_eq!(
        body,
        std::fs::read(workspace_fixtures().join("mission-status.openapi.json")).unwrap()
    );
    let output = stub.finish();
    assert!(!output.contains(root.text()), "{output}");
}

#[test]
fn a_project_copy_wins_over_the_workspace_fixtures() {
    let root = Scratch::new("flags-copy");
    let copy = install_fixture_copy(root.path());
    let path = copy.join("mission-status.examples.json");
    let text = std::fs::read_to_string(&path).unwrap();
    assert_eq!(text.matches("\"example-project\"").count(), 3);
    std::fs::write(
        &path,
        text.replace("\"example-project\"", "\"copied-project\""),
    )
    .unwrap();
    let (stub, addr, line) = spawn(&[
        "--mission-status.port=0".to_owned(),
        format!("--mission-status.project-root={}", root.text()),
    ]);
    assert_eq!(project_name(addr), "copied-project");
    let output = stub.finish();
    assert!(!format!("{line}{output}").contains(root.text()), "{output}");
    // Control: without the project root the workspace fixtures serve.
    let (control, addr, _) = spawn(&args(&["--mission-status.port=0"]));
    assert_eq!(project_name(addr), "example-project");
    control.finish();
    // An explicit --fixtures still wins over the project copy.
    let (explicit, addr, _) = spawn(&[
        "--fixtures".to_owned(),
        workspace_fixtures().display().to_string(),
        format!("--mission-status.project-root={}", root.text()),
    ]);
    assert_eq!(project_name(addr), "example-project");
    explicit.finish();
}

#[test]
fn a_project_root_without_a_copy_falls_back_to_the_workspace() {
    let root = Scratch::new("flags-nocopy");
    let (stub, addr, _) = spawn(&[format!("--mission-status.project-root={}", root.text())]);
    assert_eq!(project_name(addr), "example-project");
    stub.finish();
}

#[test]
fn both_port_spellings_together_are_a_usage_error_and_so_is_the_space_form() {
    let cases: [(&str, &[&str]); 3] = [
        ("both", &["--port", "0", "--mission-status.port=0"]),
        ("space form", &["--mission-status.port", "0"]),
        ("bad value", &["--mission-status.port=abc"]),
    ];
    let mut ran = 0;
    for (name, list) in cases {
        let out = run_bounded(name, list, 2);
        assert_eq!(out.status.code(), Some(2), "{name}: {out:?}");
        assert!(!String::from_utf8_lossy(&out.stdout).contains("listening"));
        assert!(
            String::from_utf8_lossy(&out.stderr).contains("usage: kitty-stub"),
            "{name}"
        );
        ran += 1;
    }
    assert_eq!(ran, 3);
}

#[test]
fn a_load_error_never_prints_the_directory() {
    let root = Scratch::new("flags-broken");
    let copy = install_fixture_copy(root.path());
    std::fs::remove_file(copy.join("mission-status.routes.json")).unwrap();
    let root_arg = format!("--mission-status.project-root={}", root.text());
    let out = run_bounded("broken project copy", &[root_arg.as_str()], 1);
    assert_eq!(out.status.code(), Some(1), "{out:?}");
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(stderr.contains("mission-status.routes.json"), "{stderr}");
    assert!(!stderr.contains(root.text()), "{stderr}");
}
