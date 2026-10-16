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
//! `alive-no-bind`, `fork-child`, `reset-first`, `host`.
//!
//! A scenario may also map ports to modes (`portModes`), which wins over the launch index.
//!
//! `reset-first` serves like `ready`, but accepts the first `resetFirst` connections (scenario file; default 2) and
//! resets each one with a TCP RST before reading the request, appending a line to `<root>/resets.log` for each.
//!
//! `host` (unix; added by WP09) is a host that dies: it runs `kitty_core::Core` on its own runtime with the project
//! root `<root>/inner`, supervising another copy of this binary (whose scenario the test wrote to `<root>/inner`),
//! and calls `std::process::exit(0)` without `stop()` once that service is `Ready` and `<root>/host-exit-now`
//! exists (it writes `<root>/host-ready` first, so the test can check the service is alive before the host dies).

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
#[cfg(unix)]
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

#[cfg(unix)]
#[path = "../../tests/common/claims.rs"]
mod claims;

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
    let resets = scenario["resetFirst"].as_u64().unwrap_or(2) as usize;
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
    // A mode keyed by port wins over the launch index: a launch that is stopped before it counted itself would
    // shift every later index.
    let mode = scenario["portModes"][port.to_string()]
        .as_str()
        .map_or_else(
            || launches[n.min(launches.len() - 1)].clone(),
            str::to_owned,
        );

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
        "ready" | "crash-after" | "serve-modified" | "serve-503" | "reset-first" => {
            serve(&root, port, &mode, crash_after, resets, n)
        }
        #[cfg(unix)]
        "ignore-term" => {
            // SAFETY: setting a signal disposition to "ignore" is async-signal-safe and has no other effect.
            unsafe { libc::signal(libc::SIGTERM, libc::SIG_IGN) };
            serve(&root, port, &mode, crash_after, resets, n)
        }
        #[cfg(unix)]
        "fork-child" => {
            if let Err(e) = spawn_grandchild(&root) {
                eprintln!("cannot start the grandchild: {e}");
                return 2;
            }
            serve(&root, port, &mode, crash_after, resets, n)
        }
        #[cfg(unix)]
        "host" => host(&root),
        other => {
            // One write: `eprintln!` may split a line into several writes, and the supervisor's two pipe drains can
            // interleave the pieces with the stdout line.
            let _ = std::io::stderr().write_all(format!("unknown mode {other}\n").as_bytes());
            2
        }
    }
}

/// The `host` mode: supervise a `ready` copy of this binary through `Core`, then exit without `stop()`.
#[cfg(unix)]
fn host(root: &Path) -> i32 {
    use kitty_core::discovery::{Discovery, ServiceMissing};
    use kitty_core::{
        ContractPin, Core, CoreConfig, MonotonicClock, RestartPolicy, SupervisionState, Timings,
        TokioSleeper,
    };

    struct Itself(PathBuf);
    impl Discovery for Itself {
        fn locate(&self) -> Result<PathBuf, ServiceMissing> {
            Ok(self.0.clone())
        }
    }

    let Ok(me) = std::env::current_exe() else {
        eprintln!("cannot find this executable");
        return 2;
    };
    let Ok(runtime) = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
    else {
        eprintln!("cannot build a runtime");
        return 2;
    };
    let config = CoreConfig {
        project_root: root.join("inner"),
        discovery: Arc::new(Itself(me)),
        contract: ContractPin::embedded(),
        timings: Timings {
            poll_interval: Duration::from_millis(10),
            start_timeout: Duration::from_secs(5),
            stop_grace: Duration::from_millis(300),
            read_timeout: Duration::from_secs(1),
            idle_limit: Duration::from_millis(300),
        },
        policy: RestartPolicy::default(),
        ports: Arc::new(claims::ClaimingPorts::default()),
        sleeper: Arc::new(TokioSleeper),
        clock: Arc::new(MonotonicClock),
        runtime: Some(runtime.handle().clone()),
        env_passthrough: Vec::new(),
    };
    let Ok((core, subscription)) = Core::start(config) else {
        eprintln!("cannot start the core");
        return 2;
    };
    let mut receiver = subscription.receiver;
    let mut state = subscription.initial.state;
    let ready = runtime.block_on(async {
        let waiting = async {
            loop {
                if matches!(state, SupervisionState::Ready { .. }) {
                    return true;
                }
                match receiver.recv().await {
                    Ok(status) => state = status.state,
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                        state = core.status().state;
                    }
                    Err(_) => return false,
                }
            }
        };
        tokio::time::timeout(Duration::from_secs(10), waiting)
            .await
            .unwrap_or(false)
    });
    if !ready {
        eprintln!("the supervised service did not become ready");
        return 2;
    }
    // Tell the test the service runs, and wait for its word: the test checks the service is alive before the host dies,
    // and the exit happens at an exact moment instead of after a guessed delay.
    if std::fs::write(root.join("host-ready"), "").is_err() {
        return 2;
    }
    let go = root.join("host-exit-now");
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    while !go.exists() {
        if std::time::Instant::now() >= deadline {
            eprintln!("no word to exit");
            return 2;
        }
        std::thread::sleep(Duration::from_millis(2));
    }
    // A host that dies: no stop(), no drop of the core. Its service must go with it.
    std::process::exit(0);
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

fn serve(
    root: &Path,
    port: u16,
    mode: &str,
    crash_after: Option<u64>,
    resets: usize,
    launch: usize,
) -> i32 {
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
    let mut reset = 0;
    for stream in listener.incoming().flatten() {
        if mode == "reset-first" && reset < resets {
            reset += 1;
            reset_connection(stream, root);
            continue;
        }
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

/// Closes `stream` with a TCP RST (a zero linger) instead of a FIN, and notes it in `<root>/resets.log`.
#[cfg(unix)]
fn reset_connection(stream: TcpStream, root: &Path) {
    use std::os::fd::AsRawFd as _;
    let linger = libc::linger {
        l_onoff: 1,
        l_linger: 0,
    };
    // SAFETY: a valid socket fd and a correctly sized `linger` that outlives the call.
    unsafe {
        libc::setsockopt(
            stream.as_raw_fd(),
            libc::SOL_SOCKET,
            libc::SO_LINGER,
            std::ptr::addr_of!(linger).cast(),
            std::mem::size_of::<libc::linger>() as libc::socklen_t,
        );
    }
    drop(stream);
    if let Ok(mut log) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(root.join("resets.log"))
    {
        let _ = writeln!(log, "reset");
    }
}

#[cfg(not(unix))]
fn reset_connection(stream: TcpStream, _root: &Path) {
    drop(stream);
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
