//! The spawner thread.
//!
//! `PR_SET_PDEATHSIG` fires when the *thread* that forked the child exits, not when the process does. A tokio worker
//! or blocking-pool thread can exit while the process lives on, which would kill a healthy service. So every child is
//! forked from one dedicated, long-lived thread: it starts lazily on the first spawn, it is owned by a process-wide
//! handle and it never exits before the process does (R3-01).

use std::io;
use std::sync::mpsc::{channel, Sender};
use std::sync::OnceLock;

use tokio::process::{Child, Command};
use tokio::runtime::Handle;
use tokio::sync::oneshot;

struct Request {
    command: Command,
    runtime: Handle,
    reply: oneshot::Sender<io::Result<Child>>,
}

fn spawner() -> io::Result<&'static Sender<Request>> {
    static SPAWNER: OnceLock<Result<Sender<Request>, String>> = OnceLock::new();
    let started = SPAWNER.get_or_init(|| {
        let (tx, rx) = channel::<Request>();
        std::thread::Builder::new()
            .name("kitty-core-spawner".into())
            .spawn(move || {
                // `rx` lives as long as the sender in the static, that is, as long as the process.
                for request in rx {
                    let Request {
                        mut command,
                        runtime,
                        reply,
                    } = request;
                    let _entered = runtime.enter();
                    let spawned = command.spawn();
                    // A requester that went away has nobody to tell; the child it never received is dropped here
                    // and `kill_on_drop` plus the guard-less SIGKILL of the drop reach it.
                    let _ = reply.send(spawned);
                }
            })
            .map(|_| tx)
            .map_err(|e| e.to_string())
    });
    match started {
        Ok(tx) => Ok(tx),
        Err(e) => Err(io::Error::other(format!(
            "cannot start the spawner thread: {e}"
        ))),
    }
}

/// Spawns `command` on the spawner thread, inside `runtime`'s context, and returns the child.
pub async fn spawn_child(runtime: &Handle, command: Command) -> io::Result<Child> {
    let (reply, answer) = oneshot::channel();
    spawner()?
        .send(Request {
            command,
            runtime: runtime.clone(),
            reply,
        })
        .map_err(|_| io::Error::other("the spawner thread is gone"))?;
    match answer.await {
        Ok(result) => result,
        Err(_) => Err(io::Error::other("the spawner thread dropped the request")),
    }
}
