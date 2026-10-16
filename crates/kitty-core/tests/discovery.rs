//! FR-023, US6 (IC-07): where the status service binary is found. The operator's order is a configured absolute path,
//! then `KITTY_MISSION_STATUS_SERVICE`, then absolute PATH entries; an explicit choice never falls back.
//!
//! Every no-fallback and every skip case below keeps a valid fallback candidate in place, so a missing rule would
//! make the case return that candidate instead of passing for the wrong reason. The environment is an explicit
//! `EnvSnapshot`; no test touches the process environment.

mod common;

use std::ffi::OsString;
use std::path::{Path, PathBuf};

use common::*;
use kitty_core::discovery::{
    DefaultDiscovery, Discovery, EnvSnapshot, MissingReason, ServiceMissing,
};

const NAME: &str = "mission-status-api";

/// An executable (on Unix) regular file named `name` inside `dir`.
fn make_exe(dir: &Path, name: &str) -> PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, b"#!/bin/sh\n").expect("write file");
    set_mode(&path, 0o755);
    path
}

fn make_plain(dir: &Path, name: &str) -> PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, b"data").expect("write file");
    set_mode(&path, 0o644);
    path
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: u32) {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(mode)).expect("set mode");
}

#[cfg(not(unix))]
fn set_mode(_path: &Path, _mode: u32) {}

/// A relative spelling of `absolute` that resolves to it from the current directory (Unix only).
#[cfg(unix)]
fn relative_to_cwd(absolute: &Path) -> PathBuf {
    let cwd = std::env::current_dir().expect("cwd");
    let mut relative = PathBuf::new();
    for _ in 1..cwd.components().count() {
        relative.push("..");
    }
    relative.push(absolute.strip_prefix("/").expect("absolute path"));
    assert!(relative.is_relative());
    assert!(
        cwd.join(&relative).is_file(),
        "the relative spelling resolves"
    );
    relative
}

fn join_paths(entries: &[&Path]) -> OsString {
    std::env::join_paths(entries).expect("join paths")
}

fn env(service: Option<&Path>, path_entries: Option<OsString>) -> EnvSnapshot {
    EnvSnapshot {
        service_var: service.map(|p| p.as_os_str().to_owned()),
        path_var: path_entries,
    }
}

fn locate(configured: Option<&Path>, env: EnvSnapshot) -> Result<PathBuf, ServiceMissing> {
    let _ = panic_counter();
    DefaultDiscovery::new(configured.map(Path::to_path_buf), env, OsString::from(NAME)).locate()
}

fn expect_missing(result: Result<PathBuf, ServiceMissing>, what: &str) -> ServiceMissing {
    match result {
        Ok(found) => panic!("{what}: expected NotFound, found {}", found.display()),
        Err(missing) => {
            assert_eq!(missing.reason, MissingReason::NotFound, "{what}");
            missing
        }
    }
}

/// A directory holding a valid PATH candidate, shared by the no-fallback cases.
struct Fallbacks {
    _dir: TempDir,
    service: PathBuf,
    path_dir: PathBuf,
    path_bin: PathBuf,
}

fn fallbacks() -> Fallbacks {
    let dir = TempDir::new("disc-fallback");
    let service = make_exe(dir.path(), "from-env");
    let path_dir = dir.path().join("bin");
    std::fs::create_dir(&path_dir).expect("mkdir");
    let path_bin = make_exe(&path_dir, NAME);
    Fallbacks {
        _dir: dir,
        service,
        path_dir,
        path_bin,
    }
}

#[test]
fn configured_valid_path_wins_over_env_and_path() {
    let fb = fallbacks();
    let scratch = TempDir::new("disc-configured");
    let configured = make_exe(scratch.path(), "configured");
    let snapshot = env(Some(&fb.service), Some(join_paths(&[&fb.path_dir])));
    assert_eq!(
        locate(Some(&configured), snapshot.clone()).unwrap(),
        configured
    );
    // Positive control: the same environment alone resolves to the variable, so the winner above was the config.
    assert_eq!(locate(None, snapshot).unwrap(), fb.service);
}

#[test]
fn configured_relative_path_is_not_found_without_fallback() {
    let fb = fallbacks();
    let snapshot = env(Some(&fb.service), Some(join_paths(&[&fb.path_dir])));
    // On Unix the relative spelling really resolves to an executable, so honouring it would succeed.
    let target = TempDir::new("disc-rel-cfg");
    #[cfg(unix)]
    let relative = relative_to_cwd(&make_exe(target.path(), "x"));
    #[cfg(not(unix))]
    let relative = {
        let _ = &target;
        PathBuf::from("relative/bin")
    };
    let missing = expect_missing(locate(Some(&relative), snapshot), "relative");
    assert!(
        missing.detail.contains("configured path"),
        "{}",
        missing.detail
    );
}

#[test]
fn configured_missing_directory_and_non_executable_are_each_not_found() {
    let fb = fallbacks();
    let scratch = TempDir::new("disc-bad-configured");
    let dir = scratch.path().join("a-directory");
    std::fs::create_dir(&dir).expect("mkdir");
    let plain = make_plain(scratch.path(), "plain");
    let absent = scratch.path().join("absent");
    let snapshot = env(Some(&fb.service), Some(join_paths(&[&fb.path_dir])));
    let mut ran = 0;
    for (bad, what) in [(&absent, "missing"), (&dir, "directory")] {
        expect_missing(locate(Some(bad), snapshot.clone()), what);
        ran += 1;
    }
    #[cfg(unix)]
    {
        expect_missing(locate(Some(&plain), snapshot.clone()), "non-executable");
        ran += 1;
    }
    #[cfg(not(unix))]
    let _ = plain;
    assert_eq!(
        ran,
        if cfg!(unix) { 3 } else { 2 },
        "every bad configured case ran"
    );
}

#[test]
fn env_valid_value_is_used_when_nothing_is_configured() {
    let fb = fallbacks();
    let snapshot = env(Some(&fb.service), Some(join_paths(&[&fb.path_dir])));
    assert_eq!(locate(None, snapshot).unwrap(), fb.service);
    // Positive control: without the variable, PATH is what answers.
    let path_only = env(None, Some(join_paths(&[&fb.path_dir])));
    assert_eq!(locate(None, path_only).unwrap(), fb.path_bin);
}

#[test]
fn env_relative_missing_or_non_executable_is_not_found_without_fallback() {
    let fb = fallbacks();
    let scratch = TempDir::new("disc-bad-env");
    let plain = make_plain(scratch.path(), "plain");
    let absent = scratch.path().join("absent");
    let path = Some(join_paths(&[&fb.path_dir]));
    #[cfg(unix)]
    let rel_value = relative_to_cwd(&make_exe(scratch.path(), "rel-env")).into_os_string();
    #[cfg(not(unix))]
    let rel_value = OsString::from("relative/bin");
    let relative = EnvSnapshot {
        service_var: Some(rel_value),
        path_var: path.clone(),
    };
    expect_missing(locate(None, relative), "relative env");
    expect_missing(
        locate(None, env(Some(&absent), path.clone())),
        "missing env",
    );
    #[cfg(unix)]
    expect_missing(locate(None, env(Some(&plain), path)), "non-executable env");
    #[cfg(not(unix))]
    let _ = (plain, path);
}

#[test]
fn empty_env_value_counts_as_unset() {
    let fb = fallbacks();
    let snapshot = EnvSnapshot {
        service_var: Some(OsString::new()),
        path_var: Some(join_paths(&[&fb.path_dir])),
    };
    assert_eq!(locate(None, snapshot).unwrap(), fb.path_bin);
}

#[cfg(unix)]
#[test]
fn path_skips_relative_and_empty_entries_and_a_later_absolute_entry_wins() {
    let fb = fallbacks();
    // A relative entry that resolves, from the current directory, to a directory holding a valid binary. If
    // relative entries were honoured it would win; the empty entry (meaning "current directory" to a shell) must
    // not win either, so the current directory holds a binary too only through the relative route.
    let hit = TempDir::new("disc-rel");
    let hit_bin = make_exe(hit.path(), NAME);
    let cwd = std::env::current_dir().expect("cwd");
    let depth = cwd.components().count() - 1;
    let mut relative = PathBuf::new();
    for _ in 0..depth {
        relative.push("..");
    }
    relative.push(hit.path().strip_prefix("/").expect("absolute temp dir"));
    assert!(relative.is_relative());
    assert!(
        cwd.join(&relative).join(NAME).is_file(),
        "the relative entry would resolve"
    );

    let mut raw = OsString::new();
    raw.push(relative.as_os_str());
    raw.push(":"); // an empty entry between two separators
    raw.push(":");
    raw.push(fb.path_dir.as_os_str());
    assert_eq!(locate(None, env(None, Some(raw))).unwrap(), fb.path_bin);
    // Positive control: the same directory as an absolute entry is accepted.
    let absolute = env(None, Some(join_paths(&[hit.path(), &fb.path_dir])));
    assert_eq!(locate(None, absolute).unwrap(), hit_bin);
}

#[test]
fn path_empty_entry_alone_finds_nothing_even_if_cwd_holds_the_binary() {
    // The empty entry is the only entry; there is no later candidate, so skipping it must yield NotFound.
    let snapshot = EnvSnapshot {
        service_var: None,
        path_var: Some(OsString::new()),
    };
    let missing = expect_missing(locate(None, snapshot), "empty path");
    assert!(
        missing.detail.contains("not found on PATH"),
        "{}",
        missing.detail
    );
}

#[cfg(unix)]
#[test]
fn path_skips_a_non_executable_candidate_and_the_next_wins() {
    let first = TempDir::new("disc-first");
    make_plain(first.path(), NAME);
    let fb = fallbacks();
    let snapshot = env(None, Some(join_paths(&[first.path(), &fb.path_dir])));
    assert_eq!(locate(None, snapshot).unwrap(), fb.path_bin);
    // Positive control: the first directory alone, once executable, is the winner.
    set_mode(&first.path().join(NAME), 0o755);
    let snapshot = env(None, Some(join_paths(&[first.path(), &fb.path_dir])));
    assert_eq!(locate(None, snapshot).unwrap(), first.path().join(NAME));
}

#[cfg(unix)]
#[test]
fn path_skips_a_directory_named_like_the_binary() {
    let first = TempDir::new("disc-dirhit");
    std::fs::create_dir(first.path().join(NAME)).expect("mkdir");
    let fb = fallbacks();
    let snapshot = env(None, Some(join_paths(&[first.path(), &fb.path_dir])));
    assert_eq!(locate(None, snapshot).unwrap(), fb.path_bin);
}

#[cfg(unix)]
#[test]
fn symlink_to_an_executable_is_accepted_and_the_link_is_returned() {
    let fb = fallbacks();
    let scratch = TempDir::new("disc-link");
    let target = make_exe(scratch.path(), "target");
    let link = scratch.path().join("link");
    std::os::unix::fs::symlink(&target, &link).expect("symlink");
    let snapshot = env(Some(&fb.service), Some(join_paths(&[&fb.path_dir])));
    assert_eq!(locate(Some(&link), snapshot).unwrap(), link);
}

#[cfg(unix)]
#[test]
fn symlink_to_a_non_executable_file_is_refused() {
    let fb = fallbacks();
    let scratch = TempDir::new("disc-link-plain");
    let target = make_plain(scratch.path(), "target");
    let link = scratch.path().join("link");
    std::os::unix::fs::symlink(&target, &link).expect("symlink");
    let snapshot = env(Some(&fb.service), Some(join_paths(&[&fb.path_dir])));
    expect_missing(locate(Some(&link), snapshot), "link to plain");
}

#[cfg(unix)]
#[test]
fn dangling_symlink_is_not_found_without_fallback() {
    let fb = fallbacks();
    let scratch = TempDir::new("disc-dangling");
    let link = scratch.path().join("dangling");
    std::os::unix::fs::symlink(scratch.path().join("gone"), &link).expect("symlink");
    let snapshot = env(Some(&fb.service), Some(join_paths(&[&fb.path_dir])));
    expect_missing(locate(Some(&link), snapshot.clone()), "dangling configured");
    expect_missing(
        locate(None, env(Some(&link), snapshot.path_var)),
        "dangling env",
    );
}

#[test]
fn nothing_anywhere_is_not_found_on_path() {
    let empty = TempDir::new("disc-empty");
    let snapshot = env(None, Some(join_paths(&[empty.path()])));
    let missing = expect_missing(locate(None, snapshot), "nothing");
    assert!(
        missing.detail.contains("not found on PATH"),
        "{}",
        missing.detail
    );
    let unset = expect_missing(locate(None, env(None, None)), "no PATH at all");
    assert!(
        unset.detail.contains("not found on PATH"),
        "{}",
        unset.detail
    );
}

/// SEC-004: a binary name is a bare file name. An absolute name, one with a separator, `.` and `..` are refused even
/// when joining them to a PATH entry would reach a real executable.
#[test]
fn a_binary_name_that_is_not_a_bare_file_name_is_not_found() {
    let dir = TempDir::new("disc-binary-name");
    let bin = dir.path().join("bin");
    let other = dir.path().join("other");
    std::fs::create_dir(&bin).expect("mkdir");
    std::fs::create_dir(&other).expect("mkdir");
    let target = make_exe(&bin, NAME);
    let snapshot = env(None, Some(join_paths(&[&other])));
    let escaping = format!("../bin/{NAME}");
    let nested = format!("bin/{NAME}");
    let absolute = target.as_os_str().to_owned();
    let bad: [(&str, OsString); 6] = [
        ("parent escape", OsString::from(escaping)),
        ("path separator", OsString::from(nested)),
        ("absolute", absolute),
        ("dot", OsString::from(".")),
        ("dot dot", OsString::from("..")),
        ("empty", OsString::new()),
    ];
    for (what, name) in bad {
        let result = DefaultDiscovery::new(None, snapshot.clone(), name).locate();
        expect_missing(result, what);
    }
    // Positive control: the same layout with a bare name finds the executable.
    let good = env(None, Some(join_paths(&[&bin])));
    let found = DefaultDiscovery::new(None, good, OsString::from(NAME))
        .locate()
        .expect("bare name is found");
    assert_eq!(found, target);
}

#[test]
fn details_do_not_echo_the_path_variable() {
    let empty = TempDir::new("disc-secret-dir-xyzzy");
    let snapshot = env(None, Some(join_paths(&[empty.path()])));
    let missing = expect_missing(locate(None, snapshot), "detail");
    assert!(!missing.detail.contains("xyzzy"), "{}", missing.detail);
}

#[test]
fn an_injected_discovery_is_used_unchanged() {
    struct Fixed(Result<PathBuf, ServiceMissing>);
    impl Discovery for Fixed {
        fn locate(&self) -> Result<PathBuf, ServiceMissing> {
            self.0.clone()
        }
    }
    let boxed: Box<dyn Discovery> = Box::new(Fixed(Ok(PathBuf::from("/injected"))));
    assert_eq!(boxed.locate().unwrap(), PathBuf::from("/injected"));
    let crashing = ServiceMissing {
        reason: MissingReason::Crashing,
        detail: "injected".to_owned(),
    };
    let boxed: Box<dyn Discovery> = Box::new(Fixed(Err(crashing.clone())));
    assert_eq!(boxed.locate().unwrap_err(), crashing);
    // NFR-005: no panic was seen in this process (the counter is process-wide, so it also flags failing siblings).
    assert_no_panics();
}
