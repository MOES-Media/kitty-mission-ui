//! Service discovery (IC-07): where the status service binary lives, behind a replaceable [`Discovery`] interface.
//!
//! The lookup order is the operator's decision, and an explicit choice never falls back:
//!
//! 1. a configured path, which must be absolute;
//! 2. otherwise the `KITTY_MISSION_STATUS_SERVICE` variable, which must be absolute and non-empty;
//! 3. otherwise a `PATH` search for the configured binary name over absolute entries only (relative and empty
//!    entries are skipped, since they would resolve against whatever the current directory happens to be);
//! 4. otherwise [`MissingReason::NotFound`].
//!
//! A candidate is *usable* when it is absolute and `std::fs::metadata` (which follows symlinks) reports a regular
//! file; on Unix at least one execute bit must also be set. Symlinks are followed for those checks only: the path
//! that is returned is the one that was given or built, not the link target. A dangling link is not found.
//!
//! The environment is read once, by [`EnvSnapshot::from_process`], and passed around explicitly, so tests never
//! change the process environment.
//!
//! Known limits, for #20: a GUI app launched by launchd on macOS receives a minimal `PATH`, so the host should
//! prefer the configured path there. Windows `PATHEXT` is not handled in #19; on non-Unix platforms being a regular
//! file is enough. `CannotExecute` and `Crashing` arise at spawn time (supervisor), not here.

use std::ffi::{OsStr, OsString};
use std::fmt;
use std::path::{Path, PathBuf};

/// The environment variable that names the service binary.
pub const SERVICE_VAR: &str = "KITTY_MISSION_STATUS_SERVICE";

/// The default binary name searched for on `PATH`.
pub const DEFAULT_BINARY_NAME: &str = "mission-status-api";

/// Why the service could not be located or run.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MissingReason {
    NotFound,
    CannotExecute,
    Crashing,
}

/// The service is missing; `detail` is safe to show (it never echoes a variable other than the candidate path).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServiceMissing {
    pub reason: MissingReason,
    pub detail: String,
}

impl fmt::Display for ServiceMissing {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}: {}", self.reason, self.detail)
    }
}

impl std::error::Error for ServiceMissing {}

/// Finds the service binary. Replaceable so that hosts and tests can supply their own.
pub trait Discovery: Send + Sync {
    fn locate(&self) -> Result<PathBuf, ServiceMissing>;
}

/// The two environment values discovery reads.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EnvSnapshot {
    pub service_var: Option<OsString>,
    pub path_var: Option<OsString>,
}

impl EnvSnapshot {
    /// The only place that reads the process environment.
    pub fn from_process() -> Self {
        Self {
            service_var: std::env::var_os(SERVICE_VAR),
            path_var: std::env::var_os("PATH"),
        }
    }
}

/// The operator's lookup order over an [`EnvSnapshot`].
#[derive(Debug, Clone)]
pub struct DefaultDiscovery {
    configured: Option<PathBuf>,
    env: EnvSnapshot,
    binary_name: OsString,
}

impl DefaultDiscovery {
    pub fn new(configured: Option<PathBuf>, env: EnvSnapshot, binary_name: OsString) -> Self {
        Self {
            configured,
            env,
            binary_name,
        }
    }

    /// Reads the process environment once.
    pub fn from_process(configured: Option<PathBuf>, binary_name: OsString) -> Self {
        Self::new(configured, EnvSnapshot::from_process(), binary_name)
    }
}

/// Absolute, a regular file after following symlinks, and (Unix) executable.
fn usable(path: &Path) -> bool {
    if !path.is_absolute() {
        return false;
    }
    let Ok(meta) = std::fs::metadata(path) else {
        return false;
    };
    if !meta.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        meta.permissions().mode() & 0o111 != 0
    }
    #[cfg(not(unix))]
    {
        true
    }
}

/// A bare file name: not empty, not `.` or `..`, not absolute and with no path separator (SEC-004).
fn is_bare_file_name(name: &OsStr) -> bool {
    let path = Path::new(name);
    !name.is_empty()
        && name != OsStr::new(".")
        && name != OsStr::new("..")
        && !path.is_absolute()
        && path.components().count() == 1
        && path.file_name() == Some(name)
}

fn not_found(detail: String) -> ServiceMissing {
    ServiceMissing {
        reason: MissingReason::NotFound,
        detail,
    }
}

/// An explicit choice: usable or `NotFound`, never a fallback.
fn explicit(source: &str, path: &Path) -> Result<PathBuf, ServiceMissing> {
    if usable(path) {
        Ok(path.to_path_buf())
    } else {
        Err(not_found(format!(
            "{source} {}: not absolute, missing, not a regular file or not executable",
            path.display()
        )))
    }
}

impl Discovery for DefaultDiscovery {
    fn locate(&self) -> Result<PathBuf, ServiceMissing> {
        if let Some(configured) = &self.configured {
            return explicit("configured path", configured);
        }
        if let Some(value) = self.env.service_var.as_deref().filter(|v| !v.is_empty()) {
            return explicit(SERVICE_VAR, Path::new(value));
        }
        if let Some(path_var) = &self.env.path_var {
            let name: &OsStr = &self.binary_name;
            if !is_bare_file_name(name) {
                return Err(not_found(
                    "the binary name must be a bare file name".to_owned(),
                ));
            }
            for entry in std::env::split_paths(path_var) {
                if !entry.is_absolute() {
                    continue; // relative and empty entries
                }
                let candidate = entry.join(name);
                if usable(&candidate) {
                    return Ok(candidate);
                }
            }
        }
        Err(not_found(format!(
            "{} not found on PATH",
            Path::new(&self.binary_name).display()
        )))
    }
}
