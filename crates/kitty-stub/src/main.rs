//! `kitty-stub --fixtures <dir> [--port <n>] [--heartbeat-ms <ms>] [--time-scale <f>]` (contracts/stub-http.md).
//!
//! Binds `127.0.0.1` only (no flag changes the address), prints `listening <addr>` from the bound listener as the
//! first stdout line, and exits on SIGINT or SIGTERM.

use std::future::IntoFuture;
use std::io::Write;
use std::net::Ipv4Addr;
use std::path::PathBuf;
use std::process::ExitCode;
use std::time::Duration;

use kitty_stub::{app, Fixtures, Options};

const USAGE: &str =
    "usage: kitty-stub --fixtures <dir> [--port <n>] [--heartbeat-ms <ms>] [--time-scale <f>]";

struct Args {
    fixtures: PathBuf,
    port: u16,
    heartbeat_ms: u64,
    time_scale: f64,
}

fn parse(mut args: impl Iterator<Item = String>) -> Result<Args, String> {
    let mut fixtures = None;
    let mut port = 0;
    let mut heartbeat_ms = 30_000;
    let mut time_scale = 1.0;
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
            other => return Err(format!("unknown argument {other}")),
        }
    }
    if heartbeat_ms == 0 {
        return Err("--heartbeat-ms must be greater than 0".into());
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
    match run(args).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("kitty-stub: {e}");
            ExitCode::FAILURE
        }
    }
}

async fn run(args: Args) -> Result<(), String> {
    let fixtures = Fixtures::load(&args.fixtures)?;
    let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, args.port))
        .await
        .map_err(|e| format!("bind: {e}"))?;
    let addr = listener
        .local_addr()
        .map_err(|e| format!("local_addr: {e}"))?;
    let mut stdout = std::io::stdout().lock();
    writeln!(stdout, "listening {addr}")
        .and_then(|()| stdout.flush())
        .map_err(|e| format!("stdout: {e}"))?;
    drop(stdout);
    let options = Options {
        port: addr.port(),
        heartbeat: Duration::from_millis(args.heartbeat_ms),
        time_scale: args.time_scale,
    };
    let server = axum::serve(listener, app(fixtures, options));
    // An open SSE stream never ends on its own, so a signal stops the server outright rather than draining:
    // returning drops the listener, and the runtime's shutdown closes every connection.
    tokio::select! {
        result = server.into_future() => result.map_err(|e| format!("serve: {e}")),
        signal = shutdown_signal() => signal,
    }
}

#[cfg(unix)]
async fn shutdown_signal() -> Result<(), String> {
    use tokio::signal::unix::{signal, SignalKind};
    let mut term = signal(SignalKind::terminate()).map_err(|e| format!("SIGTERM handler: {e}"))?;
    let mut int = signal(SignalKind::interrupt()).map_err(|e| format!("SIGINT handler: {e}"))?;
    tokio::select! {
        _ = term.recv() => Ok(()),
        _ = int.recv() => Ok(()),
    }
}

#[cfg(not(unix))]
async fn shutdown_signal() -> Result<(), String> {
    tokio::signal::ctrl_c()
        .await
        .map_err(|e| format!("Ctrl-C handler: {e}"))
}
