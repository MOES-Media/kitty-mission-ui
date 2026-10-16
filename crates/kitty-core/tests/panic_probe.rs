//! NFR-005: the panic counter itself works. Every other test asserts the counter is 0, which proves nothing unless a
//! panic does move it. This binary has one test, so no other test's panic can reach the counter.

mod common;

use std::sync::atomic::Ordering;
use std::sync::Arc;

use common::{panic_counter, within, CoreRig};
use kitty_core::discovery::{Discovery, ServiceMissing};
use kitty_core::{Core, SupervisorPanicked};

struct PanickingDiscovery;

impl Discovery for PanickingDiscovery {
    fn locate(&self) -> Result<std::path::PathBuf, ServiceMissing> {
        panic!("deliberate panic inside the supervisor task");
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_panic_in_a_task_is_counted_and_a_panicked_supervisor_is_reported() {
    let counter = panic_counter();
    assert_eq!(counter.load(Ordering::SeqCst), 0, "nothing panicked yet");

    // A deliberate panic inside a spawned task moves the counter to exactly 1.
    let task = tokio::spawn(async {
        panic!("deliberate panic inside a spawned task");
    });
    let joined = within("the task ends", task).await;
    assert!(joined.expect_err("the task panicked").is_panic());
    assert_eq!(counter.load(Ordering::SeqCst), 1);

    // A supervisor task that panics: `stop()` reports it, and the counter saw it too.
    let rig = CoreRig::new(&["ready"], None);
    let (core, _subscription) =
        Core::start(rig.config(Arc::new(PanickingDiscovery))).expect("the core starts");
    let stopped = within("stop answers", core.stop()).await;
    assert_eq!(stopped, Err(SupervisorPanicked));
    assert_eq!(counter.load(Ordering::SeqCst), 2);
}
