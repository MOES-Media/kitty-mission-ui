# WP03 review feedback, round 1

**Verdict: changes requested.** The test harness needs fixing; the production code does not. The route, the selection, the upstream options, the fixtures default, the load order, the unchanged signatures and the byte-identical #17 test files all check out. The Rust gate and `pnpm hygiene` exit 0.

Both findings below are in the new test files only (`tests/openapi.rs`, `tests/select.rs`, `tests/upstream_flags.rs`). Do not change `src/`.

## Issue 1 (medium): a regression in an exit-code test hangs the run instead of failing it

Several tests run the binary with `Command::output()`, which has no deadline. If a usage-error check regresses, the stub starts and listens forever, `output()` never returns, and the test run hangs. CI then fails only when the job budget runs out, and the failure names no test. This explains the implementer's report that the `select` and `upstream_flags` revert runs hung. It also means those two reverts never produced the named failing test that the red-first rule requires.

**Reproduced by the reviewer.** I changed `if port.is_some() && upstream_port.is_some()` to `if false && …` in a local edit that was never committed. Then `timeout 60 cargo test -p kitty-stub --test upstream_flags` hung in `both_port_spellings_together_are_a_usage_error_and_so_is_the_space_form`, and `timeout` ended it with rc=124.

The affected calls:
- `select.rs`: `a_bad_selection_is_a_usage_error_before_listening`, all 7 cases;
- `upstream_flags.rs`:
  - `both_port_spellings_together_are_a_usage_error_and_so_is_the_space_form`;
  - `a_load_error_never_prints_the_directory`;
- `openapi.rs`: `an_unreadable_explicit_openapi_file_exits_1_naming_only_the_base_name`.

There is a related unbounded wait in every `spawn()` helper. `BufReader::read_line` on stdout waits with no limit for a stub that neither prints `listening` nor exits.

**Fix.**
1. Add a bounded run helper to each of the three files. `tests/common/mod.rs` is frozen (NFR-008), so it cannot go there.
   - The helper spawns the command with stdout and stderr piped, and polls `child.try_wait()` every 10 ms until a deadline of about 5 s.
   - At the deadline it calls `kill()` and `wait()`, then panics with a message such as `"<case>: still running after 5 s (expected exit N)"`.
   - Otherwise it collects the output.
2. Use the helper in place of every `.output()` call listed above.
3. Read the `listening` line in `spawn()` on a helper thread that sends it over a channel, and use `recv_timeout(5 s)`. On a timeout, kill the child and panic.

The deadline is only an upper bound. A passing run still finishes in milliseconds, so the limit on real waiting time is still met.

4. After the fix, run the `select.rs` and `upstream_flags.rs` reverts again. Record the named failing test for each, not a hang.

## Issue 2 (medium): a failing assertion in `upstream_flags.rs` leaves a listening `kitty-stub` behind

In `upstream_flags.rs`, `Running` kills its child only in `finish()`. It has no `Drop`, and `std::process::Child` does not kill its process when dropped. A failing assertion between `spawn()` and `finish()`, such as one inside `project_name(addr)`, therefore leaves a stub listening on loopback after the test binary exits. That breaks the "no `kitty-stub` process left" rule on every failing run, locally and on CI runners.

**Reproduced by the reviewer.** I made a local revert so that `.kitty-stub/fixtures` was never chosen (`.filter(|_| false)`). `a_project_copy_wins_over_the_workspace_fixtures` then failed at line 145, and `pgrep -x kitty-stub` afterwards showed an orphaned `kitty-stub --time-scale 0 --mission-status.port=0 --mission-status.project-root=/tmp/kitty-stub-flags-copy-<pid>`. I killed it by PID.

`openapi.rs` and `select.rs` already have the right `impl Drop for Running` (kill, then wait).

**Fix.**
- Add `impl Drop for Running` to `upstream_flags.rs`, with the same kill-then-wait.
- In `finish()`, keep the output collection, but take the child's streams first so that `Drop` still runs safely. For example, hold the child in an `Option`, or make `finish()` do the kill and wait itself and leave `Drop` idempotent.

## Issue 3 (low, fix together with the above): scratch directories leak on failure

`scratch()` directories under the system temp dir are removed only at the end of a passing test. Several `/tmp/kitty-stub-flags-*-<pid>` and `/tmp/kitty-stub-openapi-explicit-<pid>` directories from earlier runs are still on this machine.

**Fix.** Wrap the directory in a small guard that removes it in `Drop`, in each of the three files. No new crate is needed.

## Note (no change required unless you agree): a default bundle that exists but cannot be read

`read_document` turns any error other than `NotFound` on the *default* bundle into exit 1. That covers a file without read permission ("permission denied") and a directory in its place ("is a directory"); the reviewer probed both. The message names only the base name.

This fails closed, and it matches how `Fixtures::load` treats an unreadable fixture file, so I accept it. However, the `main.rs` module documentation says the route answers 404 when the bundle does not exist, and says nothing about exit 1 for a bundle that exists but cannot be read. Add a few words to the module documentation, for example "a default that exists but cannot be read exits 1". A test is optional.

## Information for later work packages (no action in WP03)

A project copy at `<root>/.kitty-stub/fixtures` without `mission-status.openapi.json` makes `/api/v1/openapi.yaml` answer 404. The document does not fall back to the compiled-in bundle. This matches the contract, but WP09's supervised tests must put the bundle in any project copy they create, or kitty-core's digest check will fail.
