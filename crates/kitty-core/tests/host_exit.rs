//! FR-021: no service process outlives a host that exits without `stop()`.
//!
//! The host is the `host` mode of `kitty-fake-service`: it runs `Core` on its own runtime with its own project root
//! (`<root>/inner`), supervising another copy of the fake in `ready` mode, and then exits through
//! `std::process::exit`. The service is the host's direct child and writes its own pid to `<root>/inner/service.pid`.
#![cfg(target_os = "linux")]

mod common;

use std::path::{Path, PathBuf};
use std::time::Duration;

use common::claims::{release_port, unique_port};
use common::{assert_no_panics, gone, kill_fakes_of, live_fakes_of, wait_gone, wait_no_fakes};
use common::{within, write_scenario, TempDir};

const FAKE: &str = env!("CARGO_BIN_EXE_kitty-fake-service");

/// Kills what this test started, by exact scratch root, and gives the ports back, whatever happens.
struct Cleanup {
    roots: Vec<PathBuf>,
    ports: Vec<u16>,
    host: Option<std::process::Child>,
}

impl Drop for Cleanup {
    fn drop(&mut self) {
        for root in &self.roots {
            kill_fakes_of(root);
        }
        if let Some(mut host) = self.host.take() {
            // The host was killed above when it still ran; this reaps it.
            let _ = host.wait();
        }
        for port in &self.ports {
            release_port(*port);
        }
    }
}

fn pid_file(path: &Path) -> Option<i32> {
    std::fs::read_to_string(path).ok()?.trim().parse().ok()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_service_does_not_outlive_a_host_that_exits_without_stop() {
    let dir = TempDir::new("host-exit");
    let root = std::fs::canonicalize(dir.path()).expect("canonical scratch directory");
    let inner = root.join("inner");
    std::fs::create_dir_all(&inner).expect("create the inner root");
    // Both scenario files before anything starts: the host's, and the service it supervises.
    write_scenario(&root, &["host"], None);
    write_scenario(&inner, &["ready"], None);

    let host_port = unique_port(&[]);
    let mut cleanup = Cleanup {
        roots: vec![root.clone(), inner.clone()],
        ports: vec![host_port],
        host: None,
    };
    cleanup.host = Some(
        std::process::Command::new(FAKE)
            .arg(format!("--mission-status.project-root={}", root.display()))
            .arg(format!("--mission-status.port={host_port}"))
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("start the host"),
    );

    // The host reports that its service is Ready; the service wrote its pid before it became ready.
    within("the host's service is ready", async {
        while !root.join("host-ready").exists() {
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
    })
    .await;
    let pid = pid_file(&inner.join("service.pid")).expect("the service wrote its pid");
    // Positive control: the service runs, as a process of the inner root, while its host is alive.
    assert!(!gone(pid), "the service runs before the host exits");
    assert_eq!(live_fakes_of(&inner), vec![pid]);
    let service_port: u16 = {
        let launch: serde_json::Value = serde_json::from_slice(
            &std::fs::read(inner.join("launch-0.json")).expect("the service's launch record"),
        )
        .expect("launch record is JSON");
        launch["argv"][1]
            .as_str()
            .and_then(|a| a.strip_prefix("--mission-status.port="))
            .and_then(|p| p.parse().ok())
            .expect("the service's port")
    };
    cleanup.ports.push(service_port);

    // Now the host dies, without stop() and without dropping anything.
    std::fs::write(root.join("host-exit-now"), "").expect("tell the host to exit");
    let host = cleanup.host.as_mut().expect("the host");
    let exit = within("the host exits", async {
        loop {
            if let Some(status) = host.try_wait().expect("try_wait") {
                return status;
            }
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
    })
    .await;
    assert!(exit.success(), "the host exited by itself: {exit:?}");

    wait_gone("the service of a dead host", pid, Duration::from_secs(1)).await;
    wait_no_fakes("the service's root", &inner, Duration::from_secs(1)).await;
    wait_no_fakes("the host's root", &root, Duration::from_secs(1)).await;
    assert_no_panics();
}
