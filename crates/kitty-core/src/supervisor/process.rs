//! The launch of the service and the discipline for signalling its process group (FR-017, FR-021, A-05, A-06).
//!
//! # Signal discipline
//!
//! Only the task that owns the [`ChildGuard`] signals, and only while `child.id()` is `Some`, that is, while the
//! leader is neither reaped nor known to be gone. A pid that is still the id of an unreaped leader cannot have been
//! reused, so `kill(-pgid, ..)` reaches our group or nothing.
//!
//! Two exceptions apply after the leader has been reaped, and nothing else may signal after that:
//!
//! 1. **One** `kill(-pgid, SIGKILL)` immediately after the reap, to reach group members that are still alive
//!    (FS-07). POSIX does not reuse a process id while it is still the id of a process group that has members; if
//!    the group is empty the call fails with `ESRCH`. *Residual risk, recorded and not mitigated:* if the group is
//!    empty and the id was reused in the microseconds between the reap and the call, by a new process that is itself
//!    a group leader, that process would be hit. That needs pid wrap-around inside the window.
//! 2. The probe `kill(-pgid, 0)` (FS2-05). Signal 0 delivers nothing; it only reports whether the group still
//!    exists (`ESRCH` when it does not). It is harmless even if the id were reused.
//!
//! A pgid of 0 or 1 is never signalled, so `kill(-1, ..)` (every process we may signal) is impossible.

use std::ffi::OsString;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{ExitStatus, Stdio};
use std::sync::Arc;
use std::time::Duration;

use tokio::io::AsyncReadExt;
use tokio::process::{Child, Command};
use tokio::task::JoinHandle;

use super::output::OutputRing;

/// What a launch needs.
#[derive(Debug, Clone)]
pub struct LaunchSpec {
    pub binary: PathBuf,
    /// Canonical.
    pub root: PathBuf,
    pub port: u16,
    pub env_passthrough: Vec<OsString>,
}

/// Names the child always receives when the parent has them.
const ENV_ALLOWLIST: &[&str] = &[
    "PATH",
    "HOME",
    "LANG",
    "TMPDIR",
    #[cfg(windows)]
    "SystemRoot",
];

fn env_allowed(name: &std::ffi::OsStr, passthrough: &[OsString]) -> bool {
    if passthrough.iter().any(|p| p == name) {
        return true;
    }
    match name.to_str() {
        Some(n) => ENV_ALLOWLIST.contains(&n) || n.starts_with("LC_"),
        None => false,
    }
}

/// The environment the child receives: `env_clear()` plus this.
pub fn child_environment(passthrough: &[OsString]) -> Vec<(OsString, OsString)> {
    std::env::vars_os()
        .filter(|(name, _)| env_allowed(name, passthrough))
        .collect()
}

/// The two launch arguments, exactly (A-06).
pub fn launch_args(root: &Path, port: u16) -> [OsString; 2] {
    let mut root_arg = OsString::from("--mission-status.project-root=");
    root_arg.push(root.as_os_str());
    [
        root_arg,
        OsString::from(format!("--mission-status.port={port}")),
    ]
}

/// Builds the command. It is run by the spawner thread.
pub fn build_command(spec: &LaunchSpec) -> Command {
    let mut command = Command::new(&spec.binary);
    command
        .args(launch_args(&spec.root, spec.port))
        .env_clear()
        .envs(child_environment(&spec.env_passthrough))
        .current_dir(&spec.root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(unix)]
    {
        // SAFETY: the closure runs in the forked child before exec. It makes only the three calls below, which are
        // async-signal-safe (`setpgid`, `prctl`, `getppid`) and it neither allocates nor takes a lock nor calls
        // `_exit`. A failure is returned as an error, so `spawn` fails cleanly (R2-09, R3-04).
        let parent = unsafe { libc::getpid() };
        unsafe {
            command.pre_exec(move || {
                if libc::setpgid(0, 0) != 0 {
                    return Err(io::Error::last_os_error());
                }
                #[cfg(target_os = "linux")]
                if libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGKILL as libc::c_ulong) != 0 {
                    return Err(io::Error::last_os_error());
                }
                // The parent may have died between the fork and the prctl; PDEATHSIG would never fire then.
                if libc::getppid() != parent {
                    return Err(io::Error::from_raw_os_error(libc::ESRCH));
                }
                Ok(())
            });
        }
    }
    command
}

/// A human-readable cause for an exit.
pub fn describe_exit(status: &ExitStatus) -> String {
    format!("service exited: {status}")
}

#[cfg(unix)]
mod sys {
    use std::io;

    pub const TERM: i32 = libc::SIGTERM;
    pub const KILL: i32 = libc::SIGKILL;

    /// `kill(-pgid, sig)`. Refuses a pgid that could name every process.
    pub fn kill_group(pgid: i32, sig: i32) -> io::Result<()> {
        if pgid <= 1 {
            return Err(io::Error::from_raw_os_error(libc::EINVAL));
        }
        // SAFETY: plain syscall with integer arguments; `-pgid` addresses the group we created.
        if unsafe { libc::kill(-pgid, sig) } == 0 {
            Ok(())
        } else {
            Err(io::Error::last_os_error())
        }
    }

    /// Whether the group still exists. Signal 0 delivers nothing.
    pub fn group_exists(pgid: i32) -> bool {
        match kill_group(pgid, 0) {
            Ok(()) => true,
            Err(e) => e.raw_os_error() != Some(libc::ESRCH),
        }
    }
}

#[cfg(not(unix))]
mod sys {
    use std::io;

    pub const TERM: i32 = 15;
    pub const KILL: i32 = 9;

    pub fn kill_group(_pgid: i32, _sig: i32) -> io::Result<()> {
        Ok(())
    }

    pub fn group_exists(_pgid: i32) -> bool {
        false
    }
}

/// Whether the group has a member that is not a zombie (Linux), else what `kill(-pgid, 0)` says.
fn group_alive(pgid: i32) -> bool {
    if !sys::group_exists(pgid) {
        return false;
    }
    #[cfg(target_os = "linux")]
    if let Some(members) = procfs::group_members(pgid) {
        // Zombies stay in the group until their parent reaps them; they run nothing.
        return members.iter().any(|(_, state)| *state != 'Z');
    }
    true
}

const DRAIN_JOIN: Duration = Duration::from_millis(500);
const KILL_WAIT: Duration = Duration::from_secs(5);
const PROBE_STEP: Duration = Duration::from_millis(5);

/// A running child and the process group it leads. Owned only by the supervisor task.
pub struct ChildGuard {
    child: Child,
    pgid: i32,
    reaped: bool,
    post_reap_kill_sent: bool,
    drains: Vec<JoinHandle<()>>,
}

fn drain(
    mut pipe: impl tokio::io::AsyncRead + Unpin + Send + 'static,
    ring: Arc<OutputRing>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut buf = [0u8; 4096];
        loop {
            match pipe.read(&mut buf).await {
                Ok(0) | Err(_) => return,
                Ok(n) => ring.push(&buf[..n]),
            }
        }
    })
}

impl ChildGuard {
    /// Takes the child's pipes and drains them into `ring` so the child never blocks on a full pipe.
    pub fn new(mut child: Child, ring: Arc<OutputRing>) -> Self {
        let pgid = child
            .id()
            .and_then(|id| i32::try_from(id).ok())
            .unwrap_or(0);
        let mut drains = Vec::new();
        if let Some(out) = child.stdout.take() {
            drains.push(drain(out, ring.clone()));
        }
        if let Some(err) = child.stderr.take() {
            drains.push(drain(err, ring));
        }
        Self {
            child,
            pgid,
            reaped: false,
            post_reap_kill_sent: false,
            drains,
        }
    }

    pub fn pgid(&self) -> i32 {
        self.pgid
    }

    /// Waits for the leader to exit. Cancel-safe.
    pub async fn wait(&mut self) -> io::Result<ExitStatus> {
        let status = self.child.wait().await?;
        self.reaped = true;
        Ok(status)
    }

    /// Whether the leader has exited, reaping it if so.
    pub fn try_wait(&mut self) -> io::Result<Option<ExitStatus>> {
        let status = self.child.try_wait()?;
        if status.is_some() {
            self.reaped = true;
        }
        Ok(status)
    }

    /// A signal to the whole group, only while the leader has not been reaped.
    fn signal_group(&mut self, sig: i32) {
        if self.reaped || self.child.id().is_none() {
            return;
        }
        // Without process groups the only thing to stop is the leader itself, at once (ARCH-005).
        #[cfg(not(unix))]
        {
            let _ = sig;
            let _ = self.child.start_kill();
            return;
        }
        #[cfg(unix)]
        {
            // The group may already be empty; there is nothing to do about ESRCH.
            let _ = sys::kill_group(self.pgid, sig);
        }
    }

    async fn wait_bounded(&mut self, limit: Duration) -> bool {
        matches!(tokio::time::timeout(limit, self.wait()).await, Ok(Ok(_)))
    }

    /// The full stop sequence: SIGTERM to the group, `grace`, SIGKILL to the group, then the post-reap SIGKILL and
    /// the probe (see the module documentation). Returns when the group is gone, or after the bounded probe.
    pub async fn stop(&mut self, grace: Duration) {
        if !self.reaped {
            self.signal_group(sys::TERM);
            if !self.wait_bounded(grace).await {
                self.signal_group(sys::KILL);
                self.wait_bounded(KILL_WAIT).await;
            }
        }
        self.finish(grace).await;
    }

    /// After the leader has been reaped (by `stop()` or because it exited): the one SIGKILL to the group, the probe
    /// until the group is gone (bounded by `grace`) and the end of the output drains.
    pub async fn finish(&mut self, grace: Duration) {
        if self.reaped && !self.post_reap_kill_sent {
            self.post_reap_kill_sent = true;
            let _ = sys::kill_group(self.pgid, sys::KILL);
        }
        let deadline = tokio::time::Instant::now() + grace;
        while group_alive(self.pgid) && tokio::time::Instant::now() < deadline {
            tokio::time::sleep(PROBE_STEP).await;
        }
        for drain in &mut self.drains {
            if tokio::time::timeout(DRAIN_JOIN, &mut *drain).await.is_err() {
                drain.abort();
            }
        }
        self.drains.clear();
    }
}

impl Drop for ChildGuard {
    fn drop(&mut self) {
        // Synchronous, from the owning task's stack (a dropped host handle aborts that task). The same single
        // SIGKILL the stop sequence would send: before the reap while the leader is unreaped, after it once.
        let leader_unreaped = !self.reaped && self.child.id().is_some();
        if (leader_unreaped || self.reaped) && !self.post_reap_kill_sent {
            let _ = sys::kill_group(self.pgid, sys::KILL);
        }
        #[cfg(not(unix))]
        if leader_unreaped {
            let _ = self.child.start_kill();
        }
        for drain in &self.drains {
            drain.abort();
        }
    }
}

/// The Linux socket-ownership check (FS-06): reads `/proc`, `std` only.
#[cfg(target_os = "linux")]
pub mod procfs {
    use std::collections::HashSet;
    use std::fs;

    /// `(state, process group)` from the text of `/proc/<pid>/stat`. The command name is in parentheses and may
    /// contain anything, so the fields are counted from the last `)`.
    pub fn parse_stat(text: &str) -> Option<(char, i32)> {
        let rest = &text[text.rfind(')')? + 1..];
        let mut fields = rest.split_whitespace();
        let state = fields.next()?.chars().next()?;
        let _ppid = fields.next()?;
        let pgrp = fields.next()?.parse().ok()?;
        Some((state, pgrp))
    }

    /// The socket inodes of LISTEN sockets on `port` that serve `127.0.0.1`, from a `/proc/net/tcp` (or `tcp6`)
    /// table. Loopback and wildcard local addresses count.
    pub fn parse_listen_inodes(table: &str, port: u16) -> Vec<u64> {
        const LISTEN: &str = "0A";
        const ADDRESSES: [&str; 4] = [
            "0100007F",
            "00000000",
            "00000000000000000000000000000000",
            "0000000000000000FFFF00000100007F",
        ];
        let mut inodes = Vec::new();
        for line in table.lines().skip(1) {
            let fields: Vec<&str> = line.split_whitespace().collect();
            if fields.len() < 10 || fields[3] != LISTEN {
                continue;
            }
            let Some((address, local_port)) = fields[1].split_once(':') else {
                continue;
            };
            if u16::from_str_radix(local_port, 16) != Ok(port) || !ADDRESSES.contains(&address) {
                continue;
            }
            if let Ok(inode) = fields[9].parse() {
                inodes.push(inode);
            }
        }
        inodes
    }

    /// `(pid, state)` of every process whose process group is `pgid`. `None` when `/proc` cannot be read.
    pub fn group_members(pgid: i32) -> Option<Vec<(i32, char)>> {
        let mut members = Vec::new();
        for entry in fs::read_dir("/proc").ok()? {
            let Ok(entry) = entry else { continue };
            let Some(pid) = entry
                .file_name()
                .to_str()
                .and_then(|n| n.parse::<i32>().ok())
            else {
                continue;
            };
            // A process may exit while we scan.
            let Ok(stat) = fs::read_to_string(format!("/proc/{pid}/stat")) else {
                continue;
            };
            if let Some((state, group)) = parse_stat(&stat) {
                if group == pgid {
                    members.push((pid, state));
                }
            }
        }
        Some(members)
    }

    /// Whether the LISTEN socket on `127.0.0.1:<port>` belongs to a member of group `pgid`. `None` when the socket
    /// table cannot be read at all (then the check cannot run); a missing listener is `Some(false)`.
    pub fn group_owns_listener(pgid: i32, port: u16) -> Option<bool> {
        let mut inodes: HashSet<u64> = HashSet::new();
        let v4 = fs::read_to_string("/proc/net/tcp").ok()?;
        inodes.extend(parse_listen_inodes(&v4, port));
        if let Ok(v6) = fs::read_to_string("/proc/net/tcp6") {
            inodes.extend(parse_listen_inodes(&v6, port));
        }
        if inodes.is_empty() {
            return Some(false);
        }
        let members = group_members(pgid)?;
        for (pid, _) in members {
            let Ok(fds) = fs::read_dir(format!("/proc/{pid}/fd")) else {
                continue;
            };
            for fd in fds.flatten() {
                let Ok(target) = fs::read_link(fd.path()) else {
                    continue;
                };
                let Some(text) = target.to_str() else {
                    continue;
                };
                let inode = text
                    .strip_prefix("socket:[")
                    .and_then(|t| t.strip_suffix(']'))
                    .and_then(|t| t.parse::<u64>().ok());
                if let Some(inode) = inode {
                    if inodes.contains(&inode) {
                        return Some(true);
                    }
                }
            }
        }
        Some(false)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        // Captured from a Linux host: a 127.0.0.1 listener on 8080 (inode 41234), a wildcard listener on 9000, an
        // established connection on 8080 and a listener on another address.
        const SAMPLE: &str = "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode\n\
   0: 0100007F:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 41234 1 0000000000000000 100 0 0 10 0\n\
   1: 00000000:2328 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 41999 1 0000000000000000 100 0 0 10 0\n\
   2: 0100007F:1F90 0100007F:D2A4 01 00000000:00000000 00:00000000 00000000  1000        0 42000 1 0000000000000000 20 4 30 10 -1\n\
   3: 0200007F:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 43000 1 0000000000000000 100 0 0 10 0\n";

        #[test]
        fn listeners_on_the_port_are_found() {
            assert_eq!(parse_listen_inodes(SAMPLE, 8080), vec![41234]);
            assert_eq!(parse_listen_inodes(SAMPLE, 9000), vec![41999]);
        }

        #[test]
        fn established_sockets_and_other_addresses_and_ports_are_ignored() {
            assert_eq!(parse_listen_inodes(SAMPLE, 8081), Vec::<u64>::new());
            assert!(!parse_listen_inodes(SAMPLE, 8080).contains(&42000));
            assert!(!parse_listen_inodes(SAMPLE, 8080).contains(&43000));
        }

        #[test]
        fn stat_fields_are_counted_from_the_last_parenthesis() {
            assert_eq!(parse_stat("123 (cat) S 1 456 456 0 -1"), Some(('S', 456)));
            assert_eq!(
                parse_stat("77 (we ird) (x) Z 5 99 99 0 -1"),
                Some(('Z', 99))
            );
            assert_eq!(parse_stat("garbage"), None);
        }

        #[test]
        fn this_process_listener_is_not_owned_by_a_foreign_group() {
            let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).expect("bind");
            let port = listener.local_addr().expect("addr").port();
            // SAFETY: getpgrp has no arguments.
            let own_group = unsafe { libc::getpgrp() };
            assert_eq!(group_owns_listener(own_group, port), Some(true));
            assert_eq!(group_owns_listener(i32::MAX, port), Some(false));
        }
    }
}
