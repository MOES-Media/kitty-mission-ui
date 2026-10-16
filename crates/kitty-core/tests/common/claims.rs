//! Test ports below the ephemeral range, claimed through a directory (shared by the test harness and, through a
//! `#[path]` include, by the fake service's `host` mode).
//!
//! Ports picked by `bind(0)` come from the ephemeral range, which is where a client socket's local port comes from,
//! so a client that polls a port nobody has bound yet can connect to itself and occupy exactly the port the service
//! is about to bind. Scenarios that assert an exact sequence therefore draw from 20000..30000, which the OS never
//! hands to a client socket. Between test processes running side by side, a port is claimed by holding an exclusive
//! `flock` on `<tmp>/kitty-core-test-ports/<port>` (the owner's pid is written inside for humans). The kernel drops
//! the lock when its owner dies, so a dead owner's claim is free at once and needs no takeover; owners also remove
//! their claim files when they release a port and at process exit.
#![allow(dead_code)]

use std::fs::File;
use std::io::Write as _;
use std::net::TcpListener;
use std::os::fd::AsRawFd as _;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Mutex, MutexGuard, Once};

use kitty_core::supervisor::PortPicker;

/// The claims this process holds: the claim file's path and the open file that carries its lock. The kernel drops a
/// lock when its owner dies, so a claim never outlives its process and no takeover of a stale one is needed.
static HELD: Mutex<Vec<(PathBuf, File)>> = Mutex::new(Vec::new());

fn held() -> MutexGuard<'static, Vec<(PathBuf, File)>> {
    HELD.lock().unwrap_or_else(|p| p.into_inner())
}

/// The claim directory, checked to be ours so that a foreign one fails by name instead of looping.
fn claim_dir() -> PathBuf {
    use std::os::unix::fs::MetadataExt as _;
    let dir = std::env::temp_dir().join("kitty-core-test-ports");
    std::fs::create_dir_all(&dir).unwrap_or_else(|e| panic!("create {}: {e}", dir.display()));
    let meta = std::fs::metadata(&dir).unwrap_or_else(|e| panic!("stat {}: {e}", dir.display()));
    // SAFETY: geteuid has no arguments.
    let me = unsafe { libc::geteuid() };
    assert_eq!(
        meta.uid(),
        me,
        "{} belongs to another user; remove it or set TMPDIR",
        dir.display()
    );
    dir
}

/// The claim file of `port`.
pub fn claim_path(port: u16) -> PathBuf {
    claim_dir().join(port.to_string())
}

/// Removes the claim files this process still holds. Runs at process exit, so a finished test binary leaves none.
extern "C" fn release_at_exit() {
    if let Ok(mut claims) = HELD.try_lock() {
        for (path, _lock) in claims.drain(..) {
            let _ = std::fs::remove_file(path);
        }
    }
}

/// Gives a claimed port back (a no-op for a port this process does not hold).
pub fn release_port(port: u16) {
    let path = claim_dir().join(port.to_string());
    let mut claims = held();
    if let Some(at) = claims.iter().position(|(p, _)| *p == path) {
        // Unlinked while the lock is still held, so a racing claimer finds the inode gone (see `try_claim`).
        let _ = std::fs::remove_file(&path);
        claims.remove(at);
    }
}

/// Takes the claim file of `port`: an exclusive, non-blocking `flock` on `<claims>/<port>`. The lock is atomic, and
/// the kernel releases it when its owner dies, so a dead owner's claim is simply free. The file is checked to still
/// be the one at the path, because its owner unlinks it on release and a lock on an unlinked inode is worthless.
fn try_claim(claims: &std::path::Path, port: u16) -> bool {
    use std::os::unix::fs::MetadataExt as _;
    let path = claims.join(port.to_string());
    let Ok(mut file) = File::options()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&path)
    else {
        return false;
    };
    // SAFETY: flock on a descriptor this function owns.
    if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
        return false;
    }
    let same = match (file.metadata(), std::fs::metadata(&path)) {
        (Ok(open), Ok(named)) => open.ino() == named.ino() && open.dev() == named.dev(),
        _ => false,
    };
    if !same {
        return false;
    }
    // A claim file written by a harness that has no lock (pid inside, no flock) is honoured while its owner lives.
    let mut owner = String::new();
    let _ = std::io::Read::read_to_string(&mut file, &mut owner);
    if let Ok(pid) = owner.trim().parse::<i32>() {
        // SAFETY: signal 0 delivers nothing.
        if pid != std::process::id() as i32 && unsafe { libc::kill(pid, 0) } == 0 {
            return false;
        }
    }
    let _ = file.set_len(0);
    let _ = std::io::Seek::rewind(&mut file);
    let _ = file.write_all(std::process::id().to_string().as_bytes());
    static EXIT_HOOK: Once = Once::new();
    EXIT_HOOK.call_once(|| {
        // SAFETY: registers a plain function that touches only statics.
        unsafe { libc::atexit(release_at_exit) };
    });
    held().push((path, file));
    true
}

/// Claims a free port of 20000..30000 that is not in `exclude`, and returns it with the listener that proved it free.
/// The caller keeps the listener for as long as the port must stay taken (a squatter is built from it), so there is
/// no gap between "verified free" and "bound".
pub fn claim_listener(exclude: &[u16]) -> (u16, TcpListener) {
    static NEXT: AtomicU32 = AtomicU32::new(0);
    let claims = claim_dir();
    let start = std::process::id().wrapping_mul(2_654_435_761) % 10_000;
    // One full sweep of the range is the most that is ever worth trying.
    for _ in 0..10_000 {
        let n = NEXT.fetch_add(1, Ordering::SeqCst);
        let port = (20_000 + (start + n) % 10_000) as u16;
        if exclude.contains(&port) || !try_claim(&claims, port) {
            continue;
        }
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            return (port, listener);
        }
        release_port(port);
    }
    panic!("no free test port in 20000..30000 after a full sweep");
}

/// Claims a free port of 20000..30000 that is not in `exclude`, and returns it (the verifying listener is dropped).
pub fn unique_port(exclude: &[u16]) -> u16 {
    claim_listener(exclude).0
}

/// A [`PortPicker`] over [`unique_port`] that remembers what it handed out, so its owner can release the claims.
#[derive(Default)]
pub struct ClaimingPorts {
    picked: Mutex<Vec<u16>>,
}

impl ClaimingPorts {
    fn picked_guard(&self) -> MutexGuard<'_, Vec<u16>> {
        self.picked.lock().unwrap_or_else(|p| p.into_inner())
    }

    /// Every port handed out, in order.
    pub fn picked(&self) -> Vec<u16> {
        self.picked_guard().clone()
    }

    /// Gives every port handed out so far back.
    pub fn release_all(&self) {
        for port in self.picked_guard().drain(..) {
            release_port(port);
        }
    }
}

impl PortPicker for ClaimingPorts {
    fn pick(&self, exclude: &[u16]) -> std::io::Result<u16> {
        let port = unique_port(exclude);
        self.picked_guard().push(port);
        Ok(port)
    }
}
