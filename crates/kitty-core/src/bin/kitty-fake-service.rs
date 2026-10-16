//! `kitty-fake-service`: the supervised stand-in every supervision scenario runs (IC-08). Test-only; never shipped.
//!
//! It takes exactly the two launch arguments, reads `<root>/kitty-fake-service.json`, picks its mode from the
//! launch index kept in `<root>/kitty-fake-service.count`, records how it was launched in `<root>/launch-<n>.json`
//! and serves `GET /api/v1/openapi.yaml` on `127.0.0.1:<port>`. Every request line is appended to
//! `<root>/requests.log` (and to `<root>/requests-<n>.log` for launch `n`). It never prints an absolute path to
//! stdout.
//!
//! A serving mode also exits with status 3 as soon as `<root>/crash-now` exists (it removes the file first). That
//! lets a test crash the service at an exact moment instead of racing a timer.
//!
//! Modes: `ready`, `crash-after`, `exit-at-start`, `never-ready`, `ignore-term`, `serve-modified`, `serve-503`,
//! `alive-no-bind`, `fork-child`. There is no `host` mode here: WP09 adds it.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};

/// The pinned bundle, served as it is (or with `info.version` changed in `serve-modified`).
static BUNDLE: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../contracts/fixtures/mission-status.openapi.json"
));

const ROOT_FLAG: &str = "--mission-status.project-root=";
const PORT_FLAG: &str = "--mission-status.port=";
const IDLE_FLAG: &str = "--idle-grandchild=";

/// Exit status of a service that crashes on purpose.
const CRASH_EXIT: i32 = 3;

fn main() {
    let code = run();
    std::process::exit(code);
}

fn run() -> i32 {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if let [only] = args.as_slice() {
        if let Some(root) = only.strip_prefix(IDLE_FLAG) {
            return idle_grandchild(Path::new(root));
        }
    }
    let [first, second] = args.as_slice() else {
        eprintln!("usage: kitty-fake-service {ROOT_FLAG}<dir> {PORT_FLAG}<n>");
        return 2;
    };
    let mut root = None;
    let mut port = None;
    for arg in [first, second] {
        if let Some(value) = arg.strip_prefix(ROOT_FLAG) {
            root = Some(PathBuf::from(value));
        } else if let Some(value) = arg.strip_prefix(PORT_FLAG) {
            port = value.parse::<u16>().ok();
        }
    }
    let (Some(root), Some(port)) = (root, port) else {
        eprintln!("usage: kitty-fake-service {ROOT_FLAG}<dir> {PORT_FLAG}<n>");
        return 2;
    };

    let Some(scenario) = read_json(&root.join("kitty-fake-service.json")) else {
        eprintln!("no readable scenario file");
        return 2;
    };
    let launches: Vec<String> = scenario["launches"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|m| m.as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default();
    let crash_after = scenario["crashAfterMs"].as_u64();
    if launches.is_empty() {
        eprintln!("the scenario lists no launches");
        return 2;
    }

    let count_path = root.join("kitty-fake-service.count");
    let n: usize = std::fs::read_to_string(&count_path)
        .ok()
        .and_then(|t| t.trim().parse().ok())
        .unwrap_or(0);
    if std::fs::write(&count_path, (n + 1).to_string()).is_err() {
        eprintln!("cannot write the launch count");
        return 2;
    }
    let mode = launches[n.min(launches.len() - 1)].clone();

    // The supervisor starts the service with stdin closed (null): a read must give end-of-file at once.
    let stdin_eof = matches!(std::io::stdin().read(&mut [0u8; 1]), Ok(0));
    let environment: serde_json::Map<String, Value> = std::env::vars_os()
        .map(|(k, v)| {
            (
                k.to_string_lossy().into_owned(),
                Value::String(v.to_string_lossy().into_owned()),
            )
        })
        .collect();
    let launch = json!({
        "n": n,
        "mode": mode,
        "pid": std::process::id(),
        "argv": args,
        "env": environment,
        "cwd": std::env::current_dir().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default(),
        "stdinEof": stdin_eof,
    });
    // Written under a temporary name and renamed, so a reader never sees half a record.
    let temporary = root.join(format!("launch-{n}.json.tmp"));
    if std::fs::write(&temporary, launch.to_string()).is_err()
        || std::fs::rename(&temporary, root.join(format!("launch-{n}.json"))).is_err()
    {
        eprintln!("cannot write the launch record");
        return 2;
    }
    println!("kitty-fake-service: mode {mode}, launch {n}, port {port}");
    let _ = std::io::stdout().flush();

    match mode.as_str() {
        "exit-at-start" => 1,
        "never-ready" | "alive-no-bind" => sleep_forever(),
        "ready" | "crash-after" | "serve-modified" | "serve-503" => {
            serve(&root, port, &mode, crash_after, n)
        }
        #[cfg(unix)]
        "ignore-term" => {
            // SAFETY: setting a signal disposition to "ignore" is async-signal-safe and has no other effect.
            unsafe { libc::signal(libc::SIGTERM, libc::SIG_IGN) };
            serve(&root, port, &mode, crash_after, n)
        }
        #[cfg(unix)]
        "fork-child" => {
            if let Err(e) = spawn_grandchild(&root) {
                eprintln!("cannot start the grandchild: {e}");
                return 2;
            }
            serve(&root, port, &mode, crash_after, n)
        }
        other => {
            eprintln!("unknown mode {other}");
            2
        }
    }
}

fn read_json(path: &Path) -> Option<Value> {
    serde_json::from_slice(&std::fs::read(path).ok()?).ok()
}

fn sleep_forever() -> i32 {
    loop {
        std::thread::sleep(Duration::from_secs(1));
    }
}

#[cfg(unix)]
fn spawn_grandchild(root: &Path) -> std::io::Result<()> {
    let me = std::env::current_exe()?;
    // Spawned without waiting; it stays in this process group and has no pipes, so it holds nothing of ours.
    Command::new(me)
        .arg(format!("{IDLE_FLAG}{}", root.display()))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
}

fn idle_grandchild(root: &Path) -> i32 {
    if std::fs::write(root.join("grandchild.pid"), std::process::id().to_string()).is_err() {
        return 2;
    }
    sleep_forever()
}

/// The document served for the contract path.
fn document(mode: &str) -> Vec<u8> {
    if mode != "serve-modified" {
        return BUNDLE.to_vec();
    }
    let Ok(mut value) = serde_json::from_slice::<Value>(BUNDLE) else {
        return BUNDLE.to_vec();
    };
    let version = value["info"]["version"].as_str().unwrap_or("").to_owned();
    value["info"]["version"] = Value::String(format!("{version}-modified"));
    serde_json::to_vec(&value).unwrap_or_else(|_| BUNDLE.to_vec())
}

fn serve(root: &Path, port: u16, mode: &str, crash_after: Option<u64>, launch: usize) -> i32 {
    let listener = match TcpListener::bind(("127.0.0.1", port)) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("cannot bind port {port}: {e}");
            return 1;
        }
    };
    if std::fs::write(root.join("service.pid"), std::process::id().to_string()).is_err() {
        eprintln!("cannot write the pid file");
        return 2;
    }
    watch_for_crash_request(root);
    let body = Arc::new(document(mode));
    let first_get = Arc::new(AtomicBool::new(true));
    let crashes = matches!(mode, "crash-after" | "fork-child");
    for stream in listener.incoming().flatten() {
        let root = root.to_path_buf();
        let body = body.clone();
        let first_get = first_get.clone();
        let mode = mode.to_owned();
        let crash_ms = if crashes { crash_after } else { None };
        std::thread::spawn(move || {
            handle(stream, &root, &mode, &body, &first_get, crash_ms, launch)
        });
    }
    0
}

/// Exits with [`CRASH_EXIT`] once `<root>/crash-now` exists.
fn watch_for_crash_request(root: &Path) {
    let trigger = root.join("crash-now");
    std::thread::spawn(move || loop {
        if trigger.exists() {
            let _ = std::fs::remove_file(&trigger);
            std::process::exit(CRASH_EXIT);
        }
        std::thread::sleep(Duration::from_millis(2));
    });
}

fn handle(
    mut stream: TcpStream,
    root: &Path,
    mode: &str,
    body: &[u8],
    first_get: &AtomicBool,
    crash_after_ms: Option<u64>,
    launch: usize,
) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let mut raw = Vec::new();
    let mut buf = [0u8; 1024];
    while !raw.windows(4).any(|w| w == b"\r\n\r\n") && raw.len() < 16 * 1024 {
        match stream.read(&mut buf) {
            Ok(0) | Err(_) => return,
            Ok(n) => raw.extend_from_slice(&buf[..n]),
        }
    }
    let text = String::from_utf8_lossy(&raw);
    let request_line = text.lines().next().unwrap_or("").to_owned();
    for name in ["requests.log".to_owned(), format!("requests-{launch}.log")] {
        if let Ok(mut log) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(root.join(name))
        {
            let _ = writeln!(log, "{request_line}");
        }
    }
    let target = request_line.split(' ').nth(1).unwrap_or("");
    let reply = if mode == "serve-503" {
        http(
            503,
            "Service Unavailable",
            "application/json",
            br#"{"code":"starting"}"#,
        )
    } else if target == "/api/v1/openapi.yaml" {
        http(200, "OK", "application/yaml", body)
    } else {
        http(
            404,
            "Not Found",
            "application/json",
            br#"{"code":"not-found"}"#,
        )
    };
    let _ = stream.write_all(&reply);
    let _ = stream.flush();
    let _ = stream.shutdown(std::net::Shutdown::Both);
    if target == "/api/v1/openapi.yaml" && first_get.swap(false, Ordering::SeqCst) {
        if let Some(ms) = crash_after_ms {
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(ms));
                std::process::exit(CRASH_EXIT);
            });
        }
    }
}

fn http(status: u16, reason: &str, content_type: &str, body: &[u8]) -> Vec<u8> {
    let mut reply = format!(
        "HTTP/1.1 {status} {reason}\r\ncontent-type: {content_type}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
        body.len()
    )
    .into_bytes();
    reply.extend_from_slice(body);
    reply
}
