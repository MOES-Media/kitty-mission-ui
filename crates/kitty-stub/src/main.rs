//! `kitty-stub [--fixtures <dir>] [--port <n> | --mission-status.port=<n>] [--mission-status.project-root=<dir>]
//! [--heartbeat-ms <ms>] [--time-scale <f>] [--header-timeout-ms <ms>] [--openapi <file>]
//! [--select <operationId>=<Schema.name>]... [--select-fixture <operationId>=<fixture>]...`
//! (contracts/stub-http.md of #17, extended by this mission's contracts/stub-http-delta.md).
//!
//! Binds `127.0.0.1` only (no flag changes the address), prints `listening <addr>` from the bound listener as the
//! first stdout line, and exits on SIGINT or SIGTERM.
//!
//! The fixtures directory is the first of: `--fixtures`; `<project-root>/.kitty-stub/fixtures` when
//! `--mission-status.project-root` names a project that has one; the workspace's `contracts/fixtures`, compiled in.
//! The resolved path is never printed. The document served at `GET /api/v1/openapi.yaml` is `--openapi`, else
//! `<fixtures>/mission-status.openapi.json` when it exists (otherwise the route answers 404). An explicit
//! `--openapi` that cannot be read exits 1.
//!
//! Load order: arguments, fixtures, selections (exit 2 when one does not fit), the document, signal handlers, bind,
//! router, `listening`.

use std::io::Write;
use std::net::Ipv4Addr;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::Duration;

use axum::body::Bytes;
use kitty_stub::{app, run_server, Fixtures, Options, Selection};

const USAGE: &str = "usage: kitty-stub [--fixtures <dir>] [--port <n> | --mission-status.port=<n>] \
                  [--mission-status.project-root=<dir>] [--heartbeat-ms <ms>] [--time-scale <f>] \
                  [--header-timeout-ms <ms>] [--openapi <file>] [--select <operationId>=<Schema.name>]... \
                  [--select-fixture <operationId>=<fixture>]...";

/// The default fixtures directory: the workspace's, fixed when the stub is built.
const WORKSPACE_FIXTURES: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/fixtures");
const BUNDLE_FILE: &str = "mission-status.openapi.json";

struct Args {
    fixtures: PathBuf,
    openapi: Option<PathBuf>,
    selections: Vec<(String, Selection)>,
    port: u16,
    heartbeat_ms: u64,
    time_scale: f64,
    header_timeout_ms: u64,
}

fn parse(mut args: impl Iterator<Item = String>) -> Result<Args, String> {
    let mut fixtures = None;
    let mut project_root: Option<PathBuf> = None;
    let mut openapi = None;
    let mut selections = Vec::new();
    let mut port = None;
    let mut upstream_port = None;
    let mut heartbeat_ms = 30_000;
    let mut time_scale = 1.0;
    let mut header_timeout_ms = 10_000;
    while let Some(flag) = args.next() {
        if let Some(n) = flag.strip_prefix("--mission-status.port=") {
            upstream_port = Some(
                n.parse::<u16>()
                    .map_err(|e| format!("--mission-status.port: {e}"))?,
            );
            continue;
        }
        if let Some(dir) = flag.strip_prefix("--mission-status.project-root=") {
            if dir.is_empty() {
                return Err("--mission-status.project-root needs a directory".into());
            }
            project_root = Some(PathBuf::from(dir));
            continue;
        }
        let mut value = || args.next().ok_or_else(|| format!("{flag} needs a value"));
        match flag.as_str() {
            "--openapi" => openapi = Some(PathBuf::from(value()?)),
            "--select" => {
                let (op, name) = split_pair(&flag, &value()?)?;
                selections.push((op, Selection::Example(name)));
            }
            "--select-fixture" => {
                let (op, name) = split_pair(&flag, &value()?)?;
                selections.push((op, Selection::Fixture(name)));
            }
            "--fixtures" => fixtures = Some(PathBuf::from(value()?)),
            "--port" => port = Some(value()?.parse().map_err(|e| format!("--port: {e}"))?),
            "--heartbeat-ms" => {
                heartbeat_ms = value()?
                    .parse()
                    .map_err(|e| format!("--heartbeat-ms: {e}"))?
            }
            "--time-scale" => {
                time_scale = value()?.parse().map_err(|e| format!("--time-scale: {e}"))?
            }
            "--header-timeout-ms" => {
                header_timeout_ms = value()?
                    .parse()
                    .map_err(|e| format!("--header-timeout-ms: {e}"))?
            }
            other => return Err(format!("unknown argument {other}")),
        }
    }
    if heartbeat_ms == 0 {
        return Err("--heartbeat-ms must be greater than 0".into());
    }
    if header_timeout_ms == 0 {
        return Err("--header-timeout-ms must be greater than 0".into());
    }
    if !(time_scale >= 0.0 && f64::is_finite(time_scale)) {
        return Err("--time-scale must be a finite number >= 0".into());
    }
    if port.is_some() && upstream_port.is_some() {
        return Err("--port and --mission-status.port cannot be combined".into());
    }
    let fixtures = fixtures
        .or_else(|| {
            let copy = project_root?.join(".kitty-stub").join("fixtures");
            copy.is_dir().then_some(copy)
        })
        .unwrap_or_else(|| PathBuf::from(WORKSPACE_FIXTURES));
    Ok(Args {
        fixtures,
        openapi,
        selections,
        port: port.or(upstream_port).unwrap_or(0),
        heartbeat_ms,
        time_scale,
        header_timeout_ms,
    })
}

/// `op=name`, both halves non-empty.
fn split_pair(flag: &str, text: &str) -> Result<(String, String), String> {
    match text.split_once('=') {
        Some((op, name)) if !op.is_empty() && !name.is_empty() => {
            Ok((op.to_owned(), name.to_owned()))
        }
        _ => Err(format!("{flag} takes <operationId>=<name>")),
    }
}

/// A message with the fixtures directory removed, so no path reaches stderr (FS-09).
fn scrub(message: &str, dir: &Path) -> String {
    let dir = dir.display().to_string();
    message
        .replace(&format!("{dir}{}", std::path::MAIN_SEPARATOR), "")
        .replace(&dir, "")
}

/// The base name of a file, for messages.
fn base_name(path: &Path) -> String {
    path.file_name()
        .map_or_else(|| "(unnamed)".into(), |n| n.to_string_lossy().into_owned())
}

/// The explicit `--openapi` file (unreadable: an error), else the bundle in the fixtures directory (absent: `None`).
fn read_document(args: &Args) -> Result<Option<Bytes>, String> {
    if let Some(path) = &args.openapi {
        return std::fs::read(path)
            .map(|bytes| Some(Bytes::from(bytes)))
            .map_err(|e| {
                format!(
                    "cannot read --openapi file {}: {}",
                    base_name(path),
                    e.kind()
                )
            });
    }
    match std::fs::read(args.fixtures.join(BUNDLE_FILE)) {
        Ok(bytes) => Ok(Some(Bytes::from(bytes))),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("cannot read {BUNDLE_FILE}: {}", e.kind())),
    }
}

#[tokio::main]
async fn main() -> ExitCode {
    let mut args = match parse(std::env::args().skip(1)) {
        Ok(args) => args,
        Err(e) => {
            eprintln!("kitty-stub: {e}\n{USAGE}");
            return ExitCode::from(2);
        }
    };
    let fixtures = match Fixtures::load(&args.fixtures) {
        Ok(fixtures) => fixtures,
        Err(e) => {
            eprintln!("kitty-stub: {}", scrub(&e, &args.fixtures));
            return ExitCode::FAILURE;
        }
    };
    // The overflow check needs the scripted delays, so it runs once the fixtures are loaded, before the stub listens.
    if let Err(e) = fixtures.check_time_scale(args.time_scale) {
        eprintln!("kitty-stub: {e}\n{USAGE}");
        return ExitCode::from(2);
    }
    let fixtures = match fixtures.with_selections(std::mem::take(&mut args.selections)) {
        Ok(fixtures) => fixtures,
        Err(e) => {
            eprintln!("kitty-stub: {e}\n{USAGE}");
            return ExitCode::from(2);
        }
    };
    let fixtures = match read_document(&args) {
        Ok(Some(doc)) => fixtures.with_openapi_document(doc),
        Ok(None) => fixtures,
        Err(e) => {
            eprintln!("kitty-stub: {e}");
            return ExitCode::FAILURE;
        }
    };
    match run(args, fixtures).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("kitty-stub: {e}");
            ExitCode::FAILURE
        }
    }
}

async fn run(args: Args, fixtures: Fixtures) -> Result<(), String> {
    // The handlers exist before `listening` is written: a signal that follows the line closely is never lost to the
    // default action (death by signal).
    let mut shutdown = Shutdown::install()?;
    let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, args.port))
        .await
        .map_err(|e| format!("bind: {e}"))?;
    let addr = listener
        .local_addr()
        .map_err(|e| format!("local_addr: {e}"))?;
    let options = Options {
        port: addr.port(),
        heartbeat: Duration::from_millis(args.heartbeat_ms),
        time_scale: args.time_scale,
    };
    let header_timeout = Duration::from_millis(args.header_timeout_ms);
    // The router exists before the stub announces itself: nothing that can still fail runs after `listening`.
    let router = app(fixtures, options);
    let mut stdout = std::io::stdout().lock();
    writeln!(stdout, "listening {addr}")
        .and_then(|()| stdout.flush())
        .map_err(|e| format!("stdout: {e}"))?;
    drop(stdout);
    let server = run_server(listener, router, header_timeout);
    // An open SSE stream never ends on its own, so a signal stops the server outright rather than draining:
    // returning drops the listener, and the runtime's shutdown closes every connection.
    tokio::select! {
        served = server => served,
        () = shutdown.wait() => Ok(()),
    }
}

/// SIGINT and SIGTERM, registered up front.
#[cfg(unix)]
struct Shutdown {
    term: tokio::signal::unix::Signal,
    int: tokio::signal::unix::Signal,
}

#[cfg(unix)]
impl Shutdown {
    fn install() -> Result<Self, String> {
        use tokio::signal::unix::{signal, SignalKind};
        Ok(Shutdown {
            term: signal(SignalKind::terminate()).map_err(|e| format!("SIGTERM handler: {e}"))?,
            int: signal(SignalKind::interrupt()).map_err(|e| format!("SIGINT handler: {e}"))?,
        })
    }

    async fn wait(&mut self) {
        tokio::select! {
            _ = self.term.recv() => {}
            _ = self.int.recv() => {}
        }
    }
}

#[cfg(not(unix))]
struct Shutdown;

#[cfg(not(unix))]
impl Shutdown {
    fn install() -> Result<Self, String> {
        Ok(Shutdown)
    }

    async fn wait(&mut self) {
        let _ = tokio::signal::ctrl_c().await;
    }
}
