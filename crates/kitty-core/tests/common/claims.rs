//! Test ports below the ephemeral range, claimed through a directory (shared by the test harness and, through a
//! `#[path]` include, by the fake service's `host` mode).
//!
//! Ports picked by `bind(0)` come from the ephemeral range, which is where a client socket's local port comes from,
//! so a client that polls a port nobody has bound yet can connect to itself and occupy exactly the port the service
//! is about to bind. Scenarios that assert an exact sequence therefore draw from 20000..30000, which the OS never
//! hands to a client socket. Between test processes running side by side, a port is claimed by creating
//! `<tmp>/kitty-core-test-ports/<port>` exclusively with the owner's pid inside; a claim whose owner is gone is
//! stale and is taken over. Owners release their claims when they can.
#![allow(dead_code)]

use std::io::Write as _;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Mutex, MutexGuard};

use kitty_core::supervisor::PortPicker;

fn errno() -> i32 {
    std::io::Error::last_os_error().raw_os_error().unwrap_or(0)
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

/// Gives a claimed port back.
pub fn release_port(port: u16) {
    let _ = std::fs::remove_file(claim_dir().join(port.to_string()));
}

/// Claims a free port of 20000..30000 that is not in `exclude`, and returns it.
pub fn unique_port(exclude: &[u16]) -> u16 {
    static NEXT: AtomicU32 = AtomicU32::new(0);
    let claims = claim_dir();
    let me = std::process::id();
    let start = me.wrapping_mul(2_654_435_761) % 10_000;
    // One full sweep of the range is the most that is ever worth trying.
    for _ in 0..10_000 {
        let n = NEXT.fetch_add(1, Ordering::SeqCst);
        let port = (20_000 + (start + n) % 10_000) as u16;
        if exclude.contains(&port) {
            continue;
        }
        let claim = claims.join(port.to_string());
        let claimed = match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&claim)
        {
            Ok(mut file) => file.write_all(me.to_string().as_bytes()).is_ok(),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                let owner: Option<i32> = std::fs::read_to_string(&claim)
                    .ok()
                    .and_then(|t| t.trim().parse().ok());
                // An unreadable or empty claim may still be being written; only a dead owner is taken over.
                if let Some(pid) = owner {
                    // SAFETY: signal 0 delivers nothing.
                    if unsafe { libc::kill(pid, 0) } == -1 && errno() == libc::ESRCH {
                        let _ = std::fs::remove_file(&claim);
                    }
                }
                false
            }
            Err(e) => panic!("cannot claim test port {port} in {}: {e}", claims.display()),
        };
        if !claimed {
            continue;
        }
        if std::net::TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
        release_port(port);
    }
    panic!("no free test port in 20000..30000 after a full sweep");
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
