# Pre-merge squad R2/R3: fix verification (2026-10-17)

**Reviewer:** reviewer-renata, independent of the fixers. Report only.
**Scope:** `feat/kitty-core-19` at 294d9df, checked against c38c1e0, where the R1 record was committed. The fixes came from these merges into the feature branch:
- `premerge/supervisor`: 993b759..1d78333, then 9268076 and a1505b7 (cross-target and visibility leftovers);
- `premerge/api`: 8b2393f..3af03a4.

**Method:**
- Every R1 finding marked "Fold" was checked against the files and with live probes, not against the commit messages.
- Each guard was run red in a scratch worktree (the fix reverted or mutated, the guarding test run, the worktree removed), or shown by reasoning to fail on revert.
- Every cargo and pnpm run went through the memory-capped `heavy` wrapper, one at a time. After each cargo run, no `kitty-fake-service` or `kitty-stub` process was left.
- Afterwards the working tree was clean.

## Result per R1 finding

| R1 ID | Result | Guard |
|---|---|---|
| SEC-001 / ARCH-008 | VERIFIED (with R2-NEW-001 at 544a96b) | `is_safe_target` refuses `.` and `..` segments (also as `%2e`), `\`, `%2f`, `%5c` and `//` in the path, and `#` or non-ASCII anywhere. Live probe through `forward()` against the stub: `/api/v1/missions/..`, `/api/v1/missions/../project`, `/api/v1/missions/%2e%2e/project` and `/api/v1/missions/%2e` are refused before any I/O. Query strings still pass (`?x=..`, `?x=/../a//b`, `?x=%2f%5c`, `?limit=10&cursor=a..b` all answer 200), and so does `...` as a segment. Red: dropping the call from `forward()` fails `forward_refuses_traversal_separator_and_non_ascii_targets` on `"/api/v1/missions/.."`. |
| SEC-004 | VERIFIED | `is_bare_file_name` is checked before the `PATH` search. Probe: `a/b`, `./x`, `/bin/sh`, `.`, `..` and the empty name give `NotFound`, and `sh` resolves (positive control). Red: disabling the check fails `a_binary_name_that_is_not_a_bare_file_name_is_not_found` ("parent escape: expected NotFound, found …/other/../bin/mission-status-api"). |
| CON-001 | VERIFIED (with R2-NEW-003 at 544a96b) | The LF of a CRLF is no longer counted against the next frame. Red: disabling the early return fails `a_frame_of_exactly_the_cap_parses_after_either_line_ending` with `TooLarge` on `\r\n\r\n`. |
| ARCH-001 | VERIFIED (with R2-NEW-002 at 544a96b) | `CoreConfig::new(root)` matches the README table row for row (discovery `from_process(None, DEFAULT_BINARY_NAME)`, embedded pin, `Timings::default()`, `RestartPolicy::default()`, `LoopbackPortPicker`, `MonotonicClock`, `TokioSleeper`, `runtime: None`, empty passthrough). `config_defaults.rs` is an external test crate and compiles `CoreConfig { timings, ..CoreConfig::new(root) }`. Removing `new` breaks that file's build. |
| ARCH-002 | VERIFIED | `#[non_exhaustive]` is on all eight enums. A compile probe from an external test crate that matches each one without a wildcard gives exactly 8 × E0004 ("marked as non-exhaustive"). README and CHANGELOG list the ten enums. |
| ARCH-004 | VERIFIED (with R2-NEW-005 at 544a96b) | `supervisor::{process, spawner, output}` are `pub(crate)`, and the `OutputCapture`/`OutputRing` re-export is gone. `IdField`, `Frame`, `FrameError`, `FrameReader`, `canonical_json` and `FailureLog` are `#[doc(hidden)]`. `cargo doc -p kitty-core --no-deps` has 0 warnings, and the generated `supervisor` and `sse` pages list none of these items. |
| ARCH-005 | VERIFIED (by reasoning and cross-target build) | On non-unix, `signal_group` calls `child.start_kill()` for both TERM and KILL, and `Drop` kills an unreaped leader. Without it, `sys::kill_group` is a no-op `Ok(())`: `stop()` would wait out the grace and `KILL_WAIT` and report `Stopped` with the service alive, which is the R1 bug. The README line on the Windows stop is present. Windows cannot be run here. |
| Cross-target | VERIFIED | `RUSTFLAGS=-Dwarnings cargo check -p kitty-core --frozen` is clean for both `x86_64-pc-windows-msvc` and `aarch64-apple-darwin`. `NotOwned`, `pgid()` and `foreign_listener` are behind `cfg(target_os = "linux")`. |
| ARCH-012 | PARTIAL at 294d9df; VERIFIED at 544a96b (see R3 re-check) | Lagged recovery (re-read `core.status()`) is in the README and the CHANGELOG. The missing `Last-Event-ID` is only in the CHANGELOG #21 notes; the README, where R1 placed the finding, has no `forward()` section. The advice to "pass the `streamCursor` you last saw" does not say that a cursor resumes only a `missionId`-scoped stream (the stub ignores it on an unscoped one). Both are documentation nits. |
| CON-003 | VERIFIED (with R2-NEW-004 at 544a96b) | The README platform limits say that `PR_SET_PDEATHSIG` reaches only the direct child, that the ownership check is Linux-only and fails open when `/proc/net/tcp` cannot be read (matches `group_owns_listener` returning `None` → Ready), and that the digest is not authentication. The Timeout paragraph is present but misworded. |
| SEC-002 | VERIFIED | A final answer other than a match now goes through `foreign_listener` first: a listener not owned by the launched group gives `NotOwned` and a retry on a new port. The 404 squatter probe (`a_foreign_listener_with_a_wrong_answer_is_retried_on_another_port`) passes: `Starting g1 a0`, `Starting g2 a1`, `Ready g2 a1`, cause `NotOwned`, no backoff. Red: replacing the call with `None` fails it with `["Starting g1 a0", "Stopped g1 a0 [mismatch]"]`, which is the R1 behaviour. |
| TEST-002 | VERIFIED | `assert_no_panics` keeps only panics on this test's thread or in this test's runtime. `panic_isolation.rs` passes 3/3, also with `--test-threads=1`, and `panic_probe.rs` passes. Red: an unfiltered list fails `its_neighbours_stay_green` (it names the probe's panic). Residual: a panic on an unnamed `std::thread` spawned by a synchronous test still counts for every test. |
| TEST-003a | VERIFIED (with R2-NEW-006 at 544a96b) | Removing `biased;` from `race` fails `a_child_that_has_exited_beats_a_ready_future` ("round 0: the ready future beat the exit"). `exit_beats_match` returning `None` fails `an_exited_child_beats_a_match`. |
| TEST-003b | VERIFIED | Removing `TransportFailure::Io(_)` from the keep-polling arm fails `a_connection_reset_during_readiness_keeps_polling` with `["Starting g1 a0", "Stopped g1 a0 [mismatch]"]`. In `reset-first` mode the fake resets with a zero-linger RST and logs each reset. |
| TEST-004 | VERIFIED | `supervised.rs` asserts `endpoint.generation() >= 1`. |
| TEST-001 | VERIFIED | Port claims are now an exclusive non-blocking `flock`, with an inode re-check after unlink. Claims are released at exit through `atexit`; no claim file was left after these runs. `claim_listener` hands the verifying listener to the squatter (`squatter_on`), so there is no unbind gap. `unique_port` reads `/proc/net/tcp{,6}` instead of binding a probe socket. `portModes` keys the fake's mode by port. The crash-after test waits for `service.pid`, which is written after the bind. Supervision binary with `--test-threads=32`: **20/20 passed** (10 idle, 10 under 24 `yes` loops on 24 cores, each 28/28 in 1.58 to 1.91 s). There were no failures to log. |
| TEST-006 | PARTIAL at 294d9df; VERIFIED at 544a96b (see R3 re-check) | `nothing_is_left_behind_by_the_scratch_directories` is renamed to `a_scratch_directory_is_removed_when_its_guard_drops`. No test in `contract.rs` or `contract_check.rs` was renamed between c38c1e0 and 294d9df, but R1 named two tests. The orchestrator should confirm which contract test R1 meant, or record why it stays. |

## Gates and proofs at 294d9df

| Check | Result |
|---|---|
| Rust gate (`fmt --check`, `clippy --workspace --all-targets -D warnings`, `cargo test --workspace --frozen`) | PASS, 46 s with the build |
| Contract gate (`pnpm contract:check && pnpm test:contract`) | PASS, 237/237, 53 s |
| `gate-proof local --only rust` | PASS (planted exit 1, 65 s) |
| `gate-proof local --only contract` | PASS (planted exit 1, 133 s) |
| `gate-proof coverage` | PASS |
| NFR-006, 10 `--nocapture` runs | 19 `SEQUENCE` lines per run, sorted and identical. sha256 `3fa6a1ad98f9d2bd1da31c315211137dfc7f43c16bcbf076106a11d3ab4547d8`. The new scenarios `foreign-404` and `reset-then-ready` are included. |
| NFR-001, `cargo test -p kitty-core` (built) | 8.2 s, twice, against a 60 s limit |
| `cargo doc -p kitty-core --no-deps` | 0 warnings |
| Cross-target `cargo check` (Windows MSVC, macOS aarch64), `-Dwarnings` | clean |
| `ci.yml` against `origin/main` | only `contract` `timeout: 19 → 21` |
| `pnpm hygiene` | 0 findings |

## New findings (found at 294d9df)

Each of these has a result in the R3 re-check below.

| ID | Sev | Finding | Suggested fix |
|---|---|---|---|
| R2-NEW-001 | 2 | `forward()` lets `;` path parameters through. `/api/v1/missions/..;/project` and `/api/v1/..;/actuator` are sent; the stub answered 404. A Servlet container such as Tomcat strips `;…` per segment before normalising, so `..;` acts as `..`. If the real service runs on one (its JVM hint is `JAVA_HOME`), the SEC-001 traversal stays open. `%3b`, `%00` and `%252e` also pass; they are not traversal on their own. | Refuse `;` and `%3b` in the path, and add both spellings to the refusal table. |
| R2-NEW-002 | 2 | `contracts/kitty-core-api.md` is the surface that the plan reviews of #20 and #21 check under SC-005. It was not updated. It has no `CoreConfig::new`, lists only `ReadOutcome` and `StreamOpenError` as `#[non_exhaustive]`, and its `forward` line does not state the new target refusals. | Bring the contract file in line with the README. |
| R2-NEW-003 | 1 | The CON-001 fix goes too far. Every LF after a CR is now uncounted, including the ones inside a frame, so a frame with CRLF line endings can hold about 1.5× the cap. Probe: 1,572,845 bytes of `x\r\n` lines plus one data line parsed as one frame against the 1,048,576 cap. Plan IC-05 says "all bytes since the last event boundary". Memory stays bounded. | Skip counting only the LF that follows the CR of a blank (boundary) line, or count it in the frame it ends. |
| R2-NEW-004 | 1 | README "Know what a timeout covers" says `TransportFailure::Timeout` "comes with status `None`". `TransportFailure` carries no status. The `status: None` belongs to `StreamEvent::Unavailable { reason: Timeout, .. }`. | Reword to name where the `None` status appears. |
| R2-NEW-005 | 1 | The `sse` module doc still links [`FrameReader`], which is now `#[doc(hidden)]`. The public page shows the literal text "[`FrameReader`]". rustdoc gives no warning, so the 0-warning gate does not catch it. | Drop the link brackets or reword the module doc. |
| R2-NEW-006 | 1 | Deleting the `exit_beats_match` call in `await_ready` survives the whole `kitty-core` suite. On Linux the mutant is close to equivalent, because `foreign_listener` calls `try_wait` again when `/proc` is readable. On macOS and Windows that call is the only guard, and it is untested. The helper itself is pinned. | Follow-up: a call-site test, or a note in the TEST-003 follow-ups. |

## R3 re-check (2026-10-17)

**Scope:**
- `feat/kitty-core-19` at 544a96b, against 294d9df;
- the `premerge/api` follow-ups 55125ce..8857175;
- the orchestrator's contract update d516cbd.

**Method:** as above. The guards were run red in a scratch worktree that was then removed, and every run went through the `heavy` wrapper. The working tree is clean apart from this record.

| ID | Result | Guard |
|---|---|---|
| R2-NEW-001 | VERIFIED | The path now refuses `;` and `%3b` (in any case). Live probe through `forward()` against the stub: `/api/v1/missions/..;/project`, `/api/v1/..;/actuator`, `/api/v1/missions/..%3b/project`, `/api/v1/missions/%3B` and `/api/v1/project;x` are refused before any I/O. Query controls `?a=b;c` and `?a=%3b` answer 200. Red: removing the two checks fails `forward_refuses_traversal_separator_and_non_ascii_targets` on `"/api/v1/missions/..;/project"`. |
| R2-NEW-002 | VERIFIED | `contracts/kitty-core-api.md` now has `CoreConfig::new` with the struct-update pattern, and says `CoreConfig` is not `#[non_exhaustive]`. Its twelve-enum list matches the code exactly: every `#[non_exhaustive]` enum in the crate, with `StartError` and `CheckOutcome` included. The `forward()` refusals match `is_safe_target`: `\`, `#` and non-ASCII on the whole target, and the other rules on the path only. The bare-name discovery rule matches `is_bare_file_name`. |
| R2-NEW-003 | VERIFIED | The LF is skipped only when `after_cr && since_boundary == 0`, which is the LF that completes a CRLF event boundary. The 1.5× probe (1,572,845 bytes of CRLF lines) now gives `TooLarge`. A frame of exactly the cap with CRLF still parses (2 frames). Red: dropping `since_boundary == 0` fails `lfs_inside_a_crlf_frame_count_toward_the_cap` (`([], None)`). Disabling the skip altogether still fails the exact-cap test on `\r\n\r\n` with `TooLarge`, so CON-001 stays guarded. |
| R2-NEW-004 | VERIFIED | README and CHANGELOG now say that `TransportFailure` carries no status. The README places `status: None` on `StreamEvent::Unavailable`, which matches `sse.rs`. |
| R2-NEW-005 | VERIFIED | The `sse` module doc no longer links `FrameReader`. `cargo doc -p kitty-core --no-deps` has 0 warnings. |
| R2-NEW-006 | VERIFIED | The readiness match now goes through `match_verdict(guard, owner_check)`, which runs `exit_beats_match` first. `the_exit_guard_alone_refuses_a_match_from_an_exited_child` runs it with the ownership check stubbed as "owned", as on macOS and Windows. Red: removing the `exit_beats_match` call from `match_verdict` fails it ("the exit did not win over the match"). |
| ARCH-012 | VERIFIED | The README now has a `forward()` resume paragraph: it never sends `Last-Event-ID`, a proxy puts the last `streamCursor` in the target, and that resumes only a stream scoped by `missionId`. The CHANGELOG #21 note says the same. |
| TEST-006 | VERIFIED | `json_is_parsed_before_yaml` is renamed to `valid_json_that_yaml_refuses_still_digests`. The test proves that a document only JSON can parse still digests, not the parse order, so the new name fits. A rename has no red run. |

**The zombie-based test.** `exited_guard` spawns `sh -c "exit 3"` and polls `/proc/<pid>/stat` until the state is `Z`, with a 5 s bound. The child cannot leave the zombie state until it is waited for, so `try_wait` then returns the exit deterministically, and `try_wait` itself reaps it. `ChildGuard`'s `Drop` aborts the drains and, as in production, sends the single post-reap group kill. The supervisor unit tests ran 50 times in a row, 50/50 passed, and no `sh` zombie or process was left afterwards.

**Gates at 544a96b:**
- Rust gate (fmt, clippy `-D warnings`, `cargo test --workspace`): PASS, 29 s, 27 binaries ok.
- Supervision binary with `--test-threads=32`: **10/10** passed (5 idle, 5 under 24 `yes` loops), 28/28 each.
- `gate-proof local --only rust`: PASS (planted exit 1, 75 s).
- `cargo doc`: 0 warnings.
- `pnpm hygiene`: 0 findings.
- The contract leg was not re-run: `git diff 294d9df 544a96b` touches nothing under `contracts/`, `scripts/`, `.github/` or `package.json`, so its inputs are unchanged since its pass at 294d9df.

## Verdict

**Ready for PR.** All 15 R1 Fold items are VERIFIED, and each has a guard. So are the six R2 findings (two of severity 2, four of severity 1). Every guard that can fail was run red. The gates and the rust proof leg are green at 544a96b, and there were no flakes in 30 supervision runs (20 at 294d9df, 10 at 544a96b, half of them under load). No new findings came out of the re-check.

**Carried to the PR:**
- the first CI run (timeouts per GATE-001, and the cross-target `cargo check` that remains an ARCH-006 follow-up);
- the R1 follow-ups.
