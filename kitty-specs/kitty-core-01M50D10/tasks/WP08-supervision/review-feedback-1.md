# WP08 review, cycle 1: changes requested

Reviewed commits cf76d22..357ec97 on the lane branch. Verified locally: the canonical Rust gate is green, the gate-proof rust leg is green (planted exit 1), `tests/supervision.rs` passed 25/25 in every one of more than 20 runs of the unmodified code (including 3 runs with 24 busy loops and 1 with 48 busy loops), and no `kitty-fake-service` or `kitty-stub` process was left after any run. The code reads well: `pre_exec` makes only the three allowed calls, the signal discipline matches the data-model invariants, and the out-of-map edits (`[[bin]]` stanza, status types) are exactly the recorded ones. There is no `host` arm.

One blocking finding. The rest are non-blocking and can be carried.

## Blocking

**B1. Scenario 12 (leader exits, grandchild lives) does not reliably test the post-reap SIGKILL, and its state sequence changes from run to run (NFR-006, FS-07, anti-pattern items 2 and 4).**

Test: `a_grandchild_that_outlives_its_leader_is_killed_after_the_reap`.

The scenario uses `crashAfterMs: 50`, counted from the first contract GET. That 50 ms races the supervisor's post-match work: `try_wait()`, then the Linux ownership check, which scans all of `/proc`. When the suite runs in parallel, the leader often exits *during* the ownership check. The check then finds no owner (the leader's fds are closed), returns `NotOwned`, and `guard.stop()` sends SIGTERM to the group. That SIGTERM kills the grandchild, so the test passes without the post-reap SIGKILL ever being involved.

Evidence (unmodified code; I printed the test's sequence and the failure log, scratch copy only):
- 2 of 6 full runs: `Starting g1, Ready g1, Crashed g1, Backoff(500ms) g1, Starting g2`, with failure `service exited: exit status: 3` (the intended path);
- 4 of 6 full runs: `Starting g1, Starting g2 a1, Ready g2 a1`, with failure `listening socket not owned by the service`.

Revert check: I removed the post-reap `kill_group(pgid, SIGKILL)` in `ChildGuard::finish`. The test fails every time when run alone, but in the full parallel suite it failed only 8 of 20 runs. In 6 instrumented runs, every run that passed showed a SIGTERM to the grandchild's group from the stop path, and every run that failed showed none. The test asserts no sequence and calls no `report()`, so the 10-run determinism evidence never covered this scenario.

Fix (all inside WP08's files):
1. Make the leader exit *after* `Ready` deterministically. Either wait for `Ready g1` and then call `crash_now()` (the fork-child leader already watches the trigger in `serve()`), or raise `crashAfterMs` well above the readiness work (for example 300 ms, still under the 1 s real-time limit). If you drop the 50 ms value, record that as a deviation from the WP text.
2. Assert the exact sequence, `Starting g1 a0, Ready g1 a0, Crashed g1 a0, Backoff(500ms) g1 a0, Starting g2 a0, Ready g2 a0`, plus `failure_causes() == ["service exited: exit status: 3"]`, plus a positive control that the grandchild is alive at `Ready g1`.
3. Call `report()` in this scenario, and in every other scenario that asserts a full sequence, so the determinism digest covers them.
4. Re-run the post-reap SIGKILL revert against the full parallel suite, not only the single test, and record the result.

## Non-blocking (carry to pre-merge, or fold in with B1)

- **N1. Leader death during the ownership check is reported with the wrong cause** (`supervisor/mod.rs`, `await_ready`). The production side of B1: if the leader exits between `try_wait()` and the end of `group_owns_listener`, the attempt is classified `NotOwned` instead of `Exited`. Suggestion: when the check returns `Some(false)`, call `try_wait()` again and return `Exited` if the leader is gone. That costs one line.
- **N2. The readiness race has no test that kills a mutant.** On Linux, removing `biased;` from `race()`, removing the post-digest `try_wait()`, or removing both still passes all 25 scenarios (3 runs each). The ownership check masks both, and in the busy-port scenario the exit arrives before any answer anyway. Suggestion: a small deterministic test. Spawn a child that has already exited, then call `race()` with `std::future::ready(())`, looped about 20 times, and assert `Raced::Exited` every time. Without `biased`, this fails with high probability.
- **N3. The rig's pid-file kill path is redundant and less safe than the root match** (`Rig::drop`, `Cleanup`, `kill_if_fake`). Pids read from `launch-*.json` and the pid files are usually reaped long before the drop. If one of those pids is reused, `kill_if_fake` SIGKILLs any process whose command line contains `kitty-fake-service`: another lane's fake, or even a shell running `pgrep -f kitty-fake-service`. The risk is low with a 4M `pid_max`. But `kill_fakes_of(root)` already covers every fake of this scratch root, the grandchild included. Suggestion: drop the pid-file loop, or make `kill_if_fake` also require the exact root argument match.
- **N4. Port claim files are never released.** `<tmp>/kitty-core-test-ports/<port>` files accumulate: more than 4,300 after a few dozen runs. They are taken over only when their owner pid is dead, which self-heals but costs up to one 10,000-step sweep, and a claim whose pid was reused stays lost. If the directory belongs to another user, `create_new` fails with EACCES and `kill(pid, 0)` gives EPERM, so `unique_port` loops forever. Suggestion: remove this process's claims at exit (or after the scenario), and bound the loop with a clear panic message.
- **N5. Deviation 7: an unparseable pin maps to `Stopped + ServiceMissing(CannotExecute)`, after the service has been launched.** spec.md and data-model.md do not cover a broken *pin*: row 140's "unparseable" refers to the service's document. The WP06 prompt, however, says the facade maps a pin error to contract-mismatch. `ContractMismatch(Mismatch)` needs an expected digest, so WP08 cannot build it. Carry to WP09: `Core::start` should check `pin.digest()` before `spawn_supervisor` and publish contract-mismatch, which leaves the supervisor arm as an unreachable backstop. Optionally, the supervisor could also check the pin before the first launch, so a broken pin never starts a process.
- **N6. Deviation 11: discovery and canonicalisation run on every start, including restarts after a backoff.** The data-model table runs discovery at the initial start and on `retry()` only. Observable effect: a binary removed during a crash loop gives `Stopped + NotFound` at the next restart, instead of a spawn failure (`cannot-execute`). That is defensible, but it is drift. Either cache the located binary and canonical root in `Machine` (re-locate only on `retry()`), or record the deviation.
- **N7. `requests-<n>.log` is written by the fake and never read** (deviation 2). Remove it, or use it in a test.
- **N8. Small notes.**
  - `group_owns_listener` is a blocking full `/proc` scan on a tokio worker; it is fine at this scale but worth a comment.
  - A `None` result (`/proc` unreadable) fails open to `Ready`; the doc comment says so.
  - `failure_log()` is an additive `#[doc(hidden)]` diagnostic that is not in the contract seam; WP09 should not re-export it from `Core`. `SupervisorPanicked` is in the contract (`Core::stop`), so it is correct.
  - Spawn errors other than EACCES, ENOEXEC and ENOENT (for example EAGAIN) also become a permanent `Stopped + cannot-execute`; that matches table row 134 but could surprise a reader.

## Deviations judged acceptable

- 1 (`crash-now` trigger): improves determinism, `crashAfterMs` is still implemented and tested directly.
- 3 (`never-ready` with `give_up_at = 1`): the spec asks only for start failure, stop and `Crashed`.
- 4 (the `serve-503` cause depends on whether any 503 was seen): consistent with table row 137, and the test asserts the 503 cause strictly. It held under 2x CPU oversubscription.
- 5 (`alive-no-bind`): the second test matches the WP's sequence exactly (`[0.5 s]`, `Ready g4`).
- 6 (ports 20000–30000): sound reasoning about simultaneous open; see N4 for the claim lifecycle.
- 8 (a non-canonicalisable root publishes only `Stopped`): matches the data-model's initial-state rows.
- 9: see N8.
- 10: see N3.

## Anti-pattern checklist

1. Dead code: PASS. The `spawn_supervisor` seam and the production `Clock`/`Sleeper`/`PortPicker` implementations are consumed by WP09, as planned.
2. Synthetic-fixture test: FAIL (B1: scenario 12 passes without the post-reap SIGKILL in most full runs).
3. Silent empty return: PASS (`group_owns_listener` returns `None` fail-open and documents it; ignored kill results are documented).
4. FR coverage: FAIL until B1 is fixed (FS-07 behaviour inside FR-021); otherwise PASS.
5. Frozen surface: PASS (no change to gate plants, `workspace.rs`, `packages/**` or fixtures).
6. Locked decision: PASS (`127.0.0.1` only, no `host` arm, no new crates).
7. Shared-file ownership: PASS. `crates/kitty-core/Cargo.toml` (WP01) and `crates/kitty-core/src/status.rs` (WP09) are the recorded out-of-map edits; WP09 takes over `status.rs` and adds the `host` arm to the fake.
8. Production fragility: PASS (no panics or unwraps in production paths).
