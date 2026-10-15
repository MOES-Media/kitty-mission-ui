//! `kitty-stub --fixtures <dir> [--port <n>] [--heartbeat-ms <ms>] [--time-scale <f>] [--header-timeout-ms <ms>]`
//! (contracts/stub-http.md).
//!
//! Binds `127.0.0.1` only (no flag changes the address), prints `listening <addr>` from the bound listener as the
//! first stdout line, and exits on SIGINT or SIGTERM.

use std::io::Write;
use std::net::Ipv4Addr;
use std::path::PathBuf;
use std::process::ExitCode;
use std::time::Duration;

use kitty_stub::{app, run_server, Fixtures, Options};

const USAGE: &str =
    "usage: kitty-stub --fixtures <dir> [--port <n>] [--heartbeat-ms <ms>] [--time-scale <f>] \
                     [--header-timeout-ms <ms>]";

struct Args {
    fixtures: PathBuf,
    port: u16,
    heartbeat_ms: u64,
    time_scale: f64,
    header_timeout_ms: u64,
}

fn parse(mut args: impl Iterator<Item = String>) -> Result<Args, String> {
    let mut fixtures = None;
    let mut port = 0;
    let mut heartbeat_ms = 30_000;
    let mut time_scale = 1.0;
    let mut header_timeout_ms = 10_000;
    while let Some(flag) = args.next() {
        let mut value = || args.next().ok_or_else(|| format!("{flag} needs a value"));
        match flag.as_str() {
            "--fixtures" => fixtures = Some(PathBuf::from(value()?)),
            "--port" => port = value()?.parse().map_err(|e| format!("--port: {e}"))?,
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
    let fixtures = fixtures.ok_or("--fixtures is required")?;
    Ok(Args {
        fixtures,
        port,
        heartbeat_ms,
        time_scale,
        header_timeout_ms,
    })
}

#[tokio::main]
async fn main() -> ExitCode {
    let args = match parse(std::env::args().skip(1)) {
        Ok(args) => args,
        Err(e) => {
            eprintln!("kitty-stub: {e}\n{USAGE}");
            return ExitCode::from(2);
        }
    };
    let fixtures = match Fixtures::load(&args.fixtures) {
        Ok(fixtures) => fixtures,
        Err(e) => {
            eprintln!("kitty-stub: {e}");
            return ExitCode::FAILURE;
        }
    };
    // The overflow check needs the scripted delays, so it runs once the fixtures are loaded, before the stub listens.
    if let Err(e) = fixtures.check_time_scale(args.time_scale) {
        eprintln!("kitty-stub: {e}\n{USAGE}");
        return ExitCode::from(2);
    }
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
        () = server => Ok(()),
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
