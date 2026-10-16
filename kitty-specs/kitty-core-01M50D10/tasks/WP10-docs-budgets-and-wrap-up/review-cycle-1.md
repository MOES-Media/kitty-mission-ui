---
affected_files: []
cycle_number: 1
mission_slug: kitty-core-01M50D10
reproduction_command:
reviewed_at: '2026-10-16T16:29:24Z'
reviewer_agent: claude
wp_id: WP10
---

# WP10 review, cycle 1: changes requested

Reviewed commits 0c514bd (README, CHANGELOG) and 2a6926f (ci.yml).

What I checked, and what passed:
- **SC-004 probe**, re-run against base 39a51a6: `packages/` and the four #17 fixtures are unchanged; the workspace members, the CI job list and `matrix.gate` are unchanged; the only `ci.yml` line that differs is the contract `timeout:` (19 to 21); `crates/kitty-core/tests/workspace.rs` and `gates/plants/rust/plant.json` are byte-identical.
- **Timeout arithmetic**: the contract plants go from 8 to 9, so the factor is 1 + 9 = 10. With T = 61.0 s (1.017 min), `ceil(10 × 1.017 + 2)` is 13, and `max(21, 13)` is 21. 21 is the floor written in the WP text, not an invented number. The rust value is `ceil(4 × 0.52 + 2)` = 5, which is kept.
- **Gates**: hygiene, test:scripts, terminology and gate-proof `coverage` are green. The kitty-core test total is 7.9 s locally, under the 60 s budget.
- **Docs hygiene**: no local paths, ids or emails in README or CHANGELOG.
- **Claims checked against the code**: the digest check before `Ready` (CHANGELOG claim 3a) is true. Also true: the ten `CoreConfig` fields, the lookup order and the absolute-only rules, the default binary name, discovery on every restart, the hint table, the broken-pin wording, the stub's exit codes and the `--port` / `--mission-status.port` conflict, the oversized refused-stream note for #21, and the 8-to-9 plant count.

Two statements are not true as written. Both are small text fixes.

## Blocking

**B1. README, "Platform limits": "A normal exit or `stop()` still ends it" (macOS) is wrong for the most likely host exit.**

On macOS there is no parent-death signal. The service ends only when:
- the host calls `stop().await`; or
- the supervisor task is dropped while the runtime is still alive, either because the last `Core` clone is dropped or because the runtime shuts down when `main` returns.

A host that leaves through `std::process::exit` runs neither, and the service keeps running. Tauri's app exit ends the process that way, so this is exactly the #20 case. Say so plainly. For example: "On macOS, call `stop().await` (or drop the last `Core` while the runtime is still running) before the host exits. A host that ends with `std::process::exit`, is killed, or crashes leaves the service running."

**B2. CHANGELOG, #20 note: "five such exits give `service-missing` with the reason `crashing`" miscounts the exits.**

A binary that the system kills before it is `Ready` is an exit before ready. The supervisor retries such an exit on a new port, up to 3 launches per start, and those retries take no crash-window slot (data-model transition table). Only a start whose attempts all failed counts as a crash, and the 5th crash gives up. So a quarantine-killed binary gives `service-missing` / `crashing` after **five failed starts**: up to 15 launches, with backoffs of 0.5, 1, 2 and 4 s in between. The detail names the last signal. Reword, for example: "...is killed by the system at every launch, so after five failed starts (up to fifteen launches, about 8 s of backoff) the status is `service-missing` with the reason `crashing`."

## Non-blocking (fold in with the fixes if convenient)

- **N1.** README, stub options: "otherwise the `contracts/fixtures` compiled into the binary". The stub compiles in the *path* of the workspace's `contracts/fixtures` (`CARGO_MANIFEST_DIR`), not the files themselves, so a stub binary copied elsewhere does not find them. Suggest: "otherwise the workspace's `contracts/fixtures`, whose path is fixed when the stub is built".
- **N2.** CHANGELOG, "Relay": "(reads never reject)" can be read as contradicting the next sentence, because `Core::read` does answer `NotReady` and `ContractMismatch`. Suggest: "(a non-2xx answer is relayed as it is, not turned into an error)".
- **N3 (deviation 1).** The `is_unavailable()` helper as a change request to the `contract.rs` owner is the right call. The README warning covers it until then.
- **N4 (deviation 4).** The local warm-cache timings are fine as the local proxy. The orchestrator re-derives both timeouts from the pull request's first CI run and must never set contract below 21.

## Anti-pattern checklist

Items 1 to 4 and 8 are N/A for a docs and timeout WP. 5 (frozen surface): PASS, from the probe above. 6 (locked decision): PASS, only `timeout:` changed. 7 (shared files): PASS, README, CHANGELOG and ci.yml are WP10's own files.
