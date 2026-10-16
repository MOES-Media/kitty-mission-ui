//! TEST-002: a panic fails the test it happened in, not every later test of the binary.
//!
//! `a_test_that_panics_on_purpose` panics (and is expected to). `its_neighbours_stay_green` waits until that panic is
//! recorded, then asserts no panics: it must pass. `a_panic_in_this_tests_own_task_is_still_caught` proves the check
//! still sees a panic in a task the asking test spawned.

mod common;

use std::time::{Duration, Instant};

use common::{assert_no_panics, recorded_panics, within};

#[test]
#[should_panic(expected = "deliberate panic of the isolation probe")]
fn a_test_that_panics_on_purpose() {
    // Installs the recording hook, as the first `assert_no_panics` of any test does.
    let _ = recorded_panics();
    panic!("deliberate panic of the isolation probe");
}

#[test]
fn its_neighbours_stay_green() {
    let _ = recorded_panics();
    let started = Instant::now();
    while !recorded_panics()
        .iter()
        .any(|r| r.message.contains("isolation probe"))
    {
        assert!(
            started.elapsed() < Duration::from_secs(10),
            "the probe never panicked"
        );
        std::thread::sleep(Duration::from_millis(2));
    }
    assert_no_panics();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_panic_in_this_tests_own_task_is_still_caught() {
    let task = tokio::spawn(async {
        panic!("deliberate panic in an own task");
    });
    assert!(within("the task ends", task)
        .await
        .expect_err("the task panicked")
        .is_panic());
    let caught = std::panic::catch_unwind(assert_no_panics).expect_err("the panic is seen");
    let text = caught.downcast_ref::<String>().cloned().unwrap_or_default();
    assert!(
        text.contains("deliberate panic in an own task"),
        "the first panic is named: {text}"
    );
}
